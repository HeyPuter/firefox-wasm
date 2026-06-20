# Wasm-JIT: generalizing the reused-Ion JIT across all of Octane (in progress)

After richards hit ~10-18x ([[wasm-jit-richards-2x-achieved]]), the task is to make
EVERY octane bench (a) run correctly and (b) benefit from Ion under
`GECKO_WJVS_IONINT=1`. Iteration harness: `embed-js/octane-run.cjs <bench>` (node,
fast) concatenates base.js + deps + bench + a Setup/run/TearDown driver, prints
`BENCH <name> ok score_us=<usec> | ERR <msg>`. Compare ON (`GECKO_WJVS_IONINT=1`)
vs OFF (`GECKO_WJVS_OFF=1`). Multi-file benches mapped in DEPS (typescript, gbemu,
zlib). `GECKO_WJVS_IONINT_ONLY=<line>` compiles exactly one function (bisection).

## Baseline state (2026-06-20, node embed)
Run OK + benefit: richards (~14-18x), splay, raytrace, navier-stokes (these run;
benefit varies). FAIL under JIT (all run fine with JIT OFF -> JIT bugs):
- **deltablue**: COMPILE-TIME guest "memory access out of bounds". Bisected to
  Planner.makePlan: the OOB happens during the *compile attempt* (ONLY=<makePlan>
  OOBs even though it bails; ONLY=<impossible-line> is clean). It is in the CacheIR
  oracle reading guest memory (NOT the live-shape sampling -- gating that via
  GECKO_WJVS_NOSAMPLE did NOT fix it). The oracle (WJReadBaselineICs +
  gWJShapeSample `so->shape()` deref at ~line 11219) reads raw guest pointers that
  are GC-unsafe; deltablue allocates heavily so a stale stub/shape ptr -> OOB read
  == guest trap. NEXT: bound/validate every guest read in the oracle, or bail the
  compile if a stub can't be read safely.
- **crypto**: Decrypt throws under JIT (Encrypt ok). A miscompile producing a bad
  value -> JS exception. Big-integer arithmetic (bitwise on large ints). NEXT:
  bisect which fn; likely an int/bitwise representation bug on >32-bit values.
- **earley-boyer**: guest "null function or function signature mismatch" -- a
  call_indirect/WJIonCall emitted with the wrong signature or a null callee. NEXT:
  bisect; harden the non-inlined-call emission to bail when the callee/sig isn't
  certain.

## Fixes landed this iteration (all in firefox/js/src/wasm/WasmJS.cpp)
1. **Gated all builder bail-logging behind WJIonLog()** (getenv IONINT_LOG). The
   24 `[ion-fe]` fprintf were UNCONDITIONAL -> for a big bench they spammed stderr
   on every compile attempt, both noise and a real slowdown (deltablue looked like
   a hang). Helper `static bool WJIonLog()`.
2. **Bounds-guarded GetElem/SetElem** (`boundsGuard` helper, deopt on OOB instead
   of trapping): GetElem checks idx u< initializedLength (elements_-12), SetElem
   checks idx u< capacity (elements_-8). Growable collections (deltablue
   OrderedCollection) routinely index past the speculated capacity -> without this
   it's a hard OOB wasm trap. (~35% richards slowdown from the per-write guard;
   acceptable for safety, LICM should hoist the limit load.)
3. **`.length` handled as array-header load**: `this.elms.length` was compiled as a
   regular slot load at a BOGUS offset (length lives in ObjectElements, not a slot)
   -> OOB. getPropField now detects the `length` atom (== cx->names().length) and,
   behind the shape guard, loads i32 from elements_-4 -> ToDouble.

Debug gates added (default-off): GECKO_WJVS_NOSAMPLE (skip live-shape sampling),
GECKO_WJVS_NOELEM (bail element access). All 11 gates + richards still pass; richards
still ~14x. See [[wasm-jit-richards-2x-achieved]] [[wasm-jit-ion-reuse]].

## Iteration 2 (2026-06-20): oracle/compile robustness hardening
Landed more GENERAL fixes (all in WasmJS.cpp). Core unregressed: 11/11 gates +
richards (~14x) + splay + navier-stokes still pass.
4. **Safe IC-entry lookup**: replaced `jitScript->icEntryFromPCOffset(pcOff)` (a
   binary search whose only safety is a MOZ_ASSERT, COMPILED OUT in NDEBUG -> OOB
   deref on a miss) with a bounded scan over `numICEntries()` matching
   `fallbackStub(i)->pcOffset()`.
5. **Bounds-checked stub-data reads**: getStubRawWord/Int32 at a desynced
   `reader.stubOffset()` read OOB; added rawWord()/rawI32() helpers that check
   `off < stubDataSize()` and bail the stub (`stubBail`).
6. **Memoized WJReadICsRecursive** (`seen` set): deltablue's dense call graph made
   the depth-bounded recursion fan out exponentially -> C++ shadow-stack overflow
   (== guest OOB trap). Now linear + cycle-safe.
7. **WJGuestPtrOk()** guards before every raw fn-ptr deref (oracle recurse +
   WJResolveInlineCallee + WJCountInlineSlots + emitMethodDispatch): rejects
   null/small/past-memory-size pointers (catches out-of-range, NOT stale-in-range).
8. **CacheIR-based `.length`** (replaces the earlier name-based heuristic, which
   regressed raytrace by treating string/object `.length` as an array header read
   -> OOB): oracle records LoadInt32ArrayLengthResult sites in gWJLenSite[key]=shape;
   getPropField uses gWJLenSite (not the name) to emit the elements_-4 header load.
9. **Slot cap** (GECKO_WJVS_SLOTCAP, default 1024): bail compiling pathologically
   large inline trees (raytrace fns grow to ~2161 slots as ICs warm; richards
   schedule is 417). Safety valve, but did NOT catch the actual crashers.

## Iteration 3 (2026-06-20): THE root-cause fix -- stale IC pointers + ternary
TWO real fixes unblocked deltablue + raytrace + earley-boyer (3 benches) at once:
A. **Ternary `a?b:c` operand-stack spill** (Goto handler): a value carried over a
   Goto into a join desynced the operand stack -> compile hang (deltablue input()).
   Now spills the carried value to the join slot (reuses logicalJoinSlot + the
   JumpTarget merge); JumpIf bails if a value spans the branch; WJCountInlineSlots
   +1 per Goto for headroom.
B. **Clear the raw-pointer IC maps before every compile** (THE big one): gWJMethodPoly
   /gWJInlineCallee/gWJShapeRec/gWJElemShape/gWJPropByName/gWJLenSite PERSIST across
   compiles and accumulate; gWJMethodPoly never updates an existing shape's fn, and a
   MINOR (nursery) GC moves a recorded JSFunction WITHOUT firing WJFinalizeCB's clear
   (that's COLLECTION_END / major-GC only) -> a stale in-range fn pointer that the
   build derefs (fun->baseScript()->code()) into OOB memory. Clearing + re-reading
   fresh from current ICs at the top of WJIonCompileInstall guarantees every pointer
   the build trusts is live. This is the REAL fix; the slot cap was avoidance and is
   now just a high (8192) non-interfering sanity bound.
RESULT: richards, deltablue, raytrace, earley-boyer (Earley+Boyer), splay,
navier-stokes all RUN under the JIT; 11/11 gates; richards still ~18x.

STILL FAILING: crypto (Crypto/Decrypt throws under JIT -- a value miscompile, NOT a
crash; big-integer bitwise on >28-bit chunks; Encrypt is fine). regexp (Crypto-style
run@2195 JS error). These are CORRECTNESS bugs, not the stale-pointer crash.

## Iteration 4 (2026-06-20): GOAL = 2x on EVERY sub-bench. BASELINE ratios (OFF/ON):
richards 22x, deltablue 0.81x (SLOWER!), raytrace 1.0x, earley 1.07x, splay 1.16x,
navier 0.99x, crypto FAIL, regexp FAIL-even-OFF (harness/feature gap, out of scope).
So only richards clears 2x; the rest run-but-don't-benefit. WHY each doesn't benefit:
- deltablue: only Plan.execute compiles, DEOPTS 388x -- c.execute() is MEGAMORPHIC
  (>4 constraint subclasses), the 4-way inline dispatch misses on the 5th+ type ->
  deopt sentinel -> deopt-by-restart every call. THE FIX (biggest lever, helps
  crypto/raytrace/earley too): emitMethodDispatch's no-match path must do a
  NON-INLINED dynamic method call (resolve recv[name] + JS::Call via a new
  WJH_METHCALL helper) instead of MWasmReturn(1.0). Pass the method name (from the
  GetProp site via methodOffOf) into emitMethodDispatch.
- navier: only advect() installs; the rest bail on "GetAliasedVar inlined" -- the
  hot solver fns inline closure helpers that read closed-over vars at depth>0, where
  gWJCurEnv (top-frame env) is wrong. Needs inlined-closure env support OR
  non-inline those callees. Also ToPropertyKey (obj[strkey]).
- raytrace: IsConstructing (pushing false unblocks it but is unsound for
  constructors -> currently bails), Iter, BindUnqualifiedGName.
- earley: Instanceof/Arguments/Iter/GetFrameArg + FLAKY (deopt/GC nondeterminism;
  Earley sub-bench flakes once True/False enable more compilation).

Opcodes ADDED this iter (all in WasmJS.cpp builder; gates 11/11 still pass):
True/False (as REAL boolean Values tag kWJTagBoolean, NOT doubles -- scheme does
`x===false`; boxedVty=1 so unbox reads low32), Not (typed Int32/Double only; bails
boxed -- asInt32 gives 0 for objects so boxed-Not truthiness is unsound), Div
(f64.div, backend already had it), Neg (x*-1 for correct -0), GetAliasedVar (inline
gWJCurEnv walk, DEPTH 0 ONLY). IsConstructing bails (GECKO_WJVS_ISCTOR forces false).
MAXLINE bisection knob added: GECKO_WJVS_IONINT_MAXLINE=<n>.

## Iteration 5 (2026-06-20): METHCALL dispatch fallback + the REAL deltablue blocker
Built the megamorphic-dispatch non-inlined fallback: emitMethodDispatch's no-match
block now does WJH_METHCALL (resolve recv[name] + JS::Call, name passed from the
GetProp site) instead of MWasmReturn(1.0). MWJIonCall got a methName_ field (0=
IONCALL via callee operand; nonzero=METHCALL via name immediate); backend branches.
Correct (gates 11/11, all benches correct). BUT it did NOT help deltablue, because
deltablue's dispatch fallback is NEVER REACHED -- its 1299 deopts are deopt=6
(ensureGuard SHAPE-guard misses), i.e. POLYMORPHIC FIELD ACCESSES inside the inlined
constraint.execute()/Variable methods, not the method dispatch. Tagged the two
deopt-return sites (6=ensureGuard shape, 7=boundsGuard) to confirm; reverted tags.

==> THE deltablue (and poly-heavy bench) lever is POLYMORPHIC FIELD ACCESS: a field
site whose receiver has multiple shapes. getPropField guards ONE shape -> miss ->
deopt-by-restart of the whole (stateful) function on every off-shape access.
Two fixes (next iteration):
  (A) POLY-INLINE (best for deltablue's few shapes): oracle records up to 4
      (shape,off,vty) per field site (a gWJFieldPoly like gWJMethodPoly -- needs the
      oracle's per-pc stub loop to collect ALL stubs' shapes, not just the first),
      getPropField emits a shape-guard chain (each shape loads at its offset).
  (B) NO-RESTART fallback (general, any polymorphism): shape-guard miss -> call a
      WJH_IONGETPROP helper (recv+name -> GetProperty) and CONTINUE via a join phi,
      instead of MWasmReturn(1.0). Slower per-miss but no restart. Make it OPT-IN for
      oracle-marked poly sites so MONO sites (richards' 18x hot path) stay unchanged.
Same pattern applies to SetProp (poly stores). navier's lever is separate
(inlined-closure GetAliasedVar at depth>0).

STATUS vs goal (2x every sub-bench): only richards (~18-22x). deltablue 0.8x,
raytrace ~1x, splay 1.16x, navier 0.99x, earley flaky, crypto/regexp fail. The
foundational opcodes + METHCALL are in place; the poly-field-access fix is the next
big unlock. This is a multi-iteration marathon. Key finding: the crash is in WJIonBuildMIR of a SMALL (<1024
slot) function, only in the FULL bench (accumulated gWJ IC records across many
functions' oracle passes), NOT reproducible with GECKO_WJVS_IONINT_ONLY=<fn> (which
bails safely). It is NOT element/sampling/length/memoization (each gated off, still
crashes). Within one synchronous compile there's no GC, so it's a residual unsafe
guest deref reachable only with specific accumulated records, OR a CompileInfo
slot-count mismatch (WJCountInlineSlots undercount -> setSlot OOB). NEXT: bisect the
full-bench crasher by binary-searching which functions are allowed to populate gWJ
records; add WJGuestPtrOk to the remaining script/shape derefs in the build's inline
expansion (cs->code() after a stale fun->baseScript()); audit WJCountInlineSlots vs
actual slot use (dispatch/logical/inline slots). Debug knobs: GECKO_WJVS_BUILDDBG
(per-frame enter log), NOMEMO, NOLEN, SLOTCAP, IONINT_ONLY.

## 2026-06-20: no-restart WJH_GETPROP helper-fallback (poly field sites) + deltablue blocker
THE deltablue (and raytrace/splay) slowness root cause = **deopt-by-restart**: a
field-read shape-guard miss returns nonzero -> WasmJitRunCall re-runs the whole fn
in PBL from the top. For a STATEFUL fn this is slow AND would corrupt, so the JIT
only "works" on deltablue because reads deopt EARLY (before mutations) every call ->
effectively always-PBL (0.83x, correct but no benefit). deltablue deopts were ALL
`deopt=6.2` (the mono getPropField ensureGuard) -- the field sites are MONOMORPHIC
at compile time (Baseline IC has 1 stub) but POLYMORPHIC at runtime, so the mono
shape guard misses constantly. (Tag deopt-return sites by code via the `dcode` param
to ensureGuard: 6.1=len 6.2=field 6.3=getelem 6.4=setelem 6.5=setprop; poly no-match
was 8, dispatch no-match 9 -- left in as harmless diagnostics.)

Built a NO-RESTART fallback: `WJH_GETPROP` helper (already existed for Mode VS) wired
into the reused-Ion backend via a new `MWJIonCall` mode (`propSite_` field in
jit/MIR-wasm.h; lowering stores the boxed receiver to gWJHelpA then
wjhelp(WJH_GETPROP, site), checks deopt, loads gWJScratch[kWJResultSlot]). On an
off-shape receiver the fn keeps running compiled instead of restarting.
`emitPropHelper(recv, fscript, pcOff)` registers a site (skip site 0 = the "not a
getprop" sentinel) and emits it.
- **CRITICAL receiver bug (fixed):** inside an inlined frame `this`/receivers arrive
  as a raw i32 object pointer; `boxForStore(i32)` mistags an object ptr as INT32
  (0xPP -> 0xFFFFFF81_000000PP) so the helper's ToObject wraps a Number and reads
  `undefined`. Fix: `boxObj(asObjPtr(recv))` re-derives the object Value from the
  pointer payload regardless of incoming tag. (Diagnosed via gp-help trace: aBits
  tag 81 not 8c.)
- Join must be marked vty2 (generic tag unbox), NOT recVty: when the helper arm runs
  (off-shape) the field's value-type can differ from the recorded one.
- `WJCountInlineSlots` must `total += 1` per GetProp (the diamond consumes a scratch
  slot) or compile bails.

STATUS: applied the helper diamond to BOTH the poly path (gWJFieldPoly.n>1) AND the
mono path. The poly path is CORRECT (t_polyf P-int/Q-double, t_of2 A+B dispatch,
t_db, force-helper all pass) and validated. BUT applying it to the MONO path:
 (1) regressed richards 18x->12x (the diamond boxes every field read to i64-vty2 via
     a slot phi instead of richards' native typed Double/i64 -> OptimizeMIR sees a
     bigger/boxed graph), and
 (2) deterministically BROKE deltablue ("Chain test failed"). Bisected (MAXLINE) to
     **Plan.prototype.execute** (the stateful constraint-propagation loop), and
     `GECKO_WJVS_NOELEM=1` makes it pass -> the bug is GetElem/SetElem interacting
     with the helper-diamond field reads inside the compiled (no-longer-deopting)
     execute(). This is a LATENT compiled-stateful-fn miscompile that legacy MASKS by
     always deopting execute() to PBL. Faithful repros (t_db: array-field of objs,
     SetElem grow, >4-way poly stateful dispatch, GetElem at()) all PASS -- the exact
     trigger is still unpinned (something deltablue-specific: inheritance chains,
     input()/output() ternary on this.direction, Strength compares).

RESOLUTION (current committed-clean state): restored the MONO getPropField to the
exact legacy typed load + deopt-restart (richards back to 17.8x, deltablue 0.83x
correct). KEPT the helper-fallback ONLY on the poly-at-compile path. Net: correct,
no regression, + poly-field no-restart for genuinely-poly-at-compile sites.

### THE deltablue 2x blocker (next)
deltablue needs the read-deopts gone, but doing so exposes the latent compiled
execute() miscompile (GetElem-related). To hit 2x on deltablue/raytrace/splay BOTH
are needed: (a) no-restart fallback for mono-at-compile-but-poly-at-runtime field
sites WITHOUT regressing richards (keep typed repr -- merge via a typed MPhi, not the
i64 slot; or only switch a site to helper-mode after it deopts a lot = adaptive
recompile), AND (b) find+fix the latent compiled-execute miscompile (reproduce by
re-enabling the mono helper, then diff the wrong value; NOELEM localizes it to
GetElem/SetElem in the inlined at()/add()/execute tree).

Current octane ON/OFF ratios (node): richards 17.8x, deltablue 0.83, raytrace 0.87,
earley-boyer 1.08, splay 0.90, navier-stokes 1.00. Only richards clears 2x.

## 2026-06-20 (cont): construction-bug confirmed; poly path gated OFF by default
- The helper-diamond corruption is a **MIR CONSTRUCTION bug, NOT an OptimizeMIR
  miscompile**: deltablue under GECKO_WJVS_POLYALL fails the chain test (and traps
  "table index is out of bounds" = a bad call_indirect into the shared JIT funcref
  table) EVEN with GECKO_WJVS_NOOPT=1. So the wasm I emit for execute()'s deeply-
  inlined tree is itself wrong when the diamond is nested in it. Triggers only on
  deltablue's real structure; all hand-written repros (t_db/t_db2: array-field of
  objs, SetElem grow, >4-way poly stateful dispatch via Plan.execute->constraintAt->
  at->GetElem, inheritance, input()/output() ternary) PASS. ONLY=1171 (Plan.execute)
  alone reproduces; NOELEM masks it. Standalone repro: /tmp/db_standalone.js,
  /tmp/db_probe.js (custom chain via deltablue's own classes; warm chainTest(100)
  then observe). NEXT to pin it: dump the emitted wasm or add a construction-time
  MIR phi/operand validator; the call_indirect index operand is the prime suspect
  (the non-inlined-call path imports wasmhost_jit_table() and the diamond's block/
  slot changes likely feed a wrong def as the table index).
- DECISION: the poly-field helper diamond is now **default OFF**, gated behind
  GECKO_WJVS_POLYFIELD (poly-at-compile, n>=2) / GECKO_WJVS_POLYALL (all, n>=1). The
  WJCountInlineSlots `+1 per GetProp` is ALSO gated to those knobs (inflating the
  slot budget by default let more functions inline and exposed a latent miscompile).
  Default build == legacy typed mono field path == known-good (richards ~18-24x; all
  runnable benches correct; gates 11/11). Kept in tree (off): emitPropHelper,
  MWJIonCall.propSite_ lowering, gWJFieldPoly recording, the boxObj(asObjPtr)
  receiver fix, the ensureGuard `dcode` deopt-tag param.
- **Earley is a PRE-EXISTING JIT bug**, not introduced this session: git-stashed my
  WasmJS.cpp/MIR-wasm.h to the committed baseline (a4b9ff8) -> baseline earley-boyer
  under IONINT produces NO BENCH output at all (harder crash); my version runs Boyer
  OK and only Earley errs (RunBenchmark line ~5074; Earley passes JIT-OFF). So no
  regression. Earley needs Instanceof/Arguments/Iter/GetFrameArg + the flaky
  miscompile fixed (separate from the deltablue construction bug).

### Net for the "2x on every sub-bench" goal
Only richards clears 2x (~18-24x). deltablue/raytrace/splay are deopt-restart-bound
(JIT net-neutral 0.83-0.90x); the no-restart helper-fallback that would fix them has
a construction bug + would need a typed-merge to not regress richards. navier is
regular-Array-ceiling bound (GetAliasedVar-in-inlined + boxed array elems). earley
needs missing opcodes + flaky fix. crypto/regexp still fail. Each is a substantial
separate piece of work; the goal is NOT met and requires multi-feature effort
(real runtime inline caches to replace deopt-restart is the highest-leverage one).

## 2026-06-20 (cont 2): per-bench limiter classification (KEY for prioritizing)
Profiled each non-richards bench by limiter type (deopt-restart-bound vs
compilation-bound). This is the map for future work:
- **deltablue, splay**: DEOPT-RESTART-bound (mono-at-compile/poly-at-runtime field
  sites). 0.83-0.90x. Need the no-restart helper -- but it has the memory-corruption
  construction bug (gated off). NOTE: the "table index out of bounds" is NOT a
  reused-Ion call_indirect (that path only uses wjhelp imports; the only Op::CallIndirect
  in the file are Mode-VS at lines ~3235/6365). It's a C++-LEVEL table-OOB = a clobbered
  vtable/fn-pointer in gecko.wasm's own function table -> the helper path corrupts
  guest memory. Memory-corruption class; needs a sanitizer/wasm-dump to pin.
- **raytrace**: COMPILATION-bound, NOT deopt-bound (0 deopts!). Its hot fns
  (testIntersection L1075, rayTrace L1104, renderScene L1037) ALL "ion-retry (stay
  PBL)" -- nothing installs. Bail reasons: `unsupported op IsConstructing` (x4, from
  inlined `new IntersectionInfo()`/Color ctors), `GetProp: no record` (x4, cold
  field sites), `Call: callee not inlinable` (x4, poly method calls), `Iter` (for-in
  in Object.extend L437), `BindUnqualifiedGName`. Each fn has MULTIPLE blockers, so
  fixing one doesn't unblock it. SAFE additive path (no deopt-restart risk) but
  multi-feature: IsConstructing (context-aware: true in inlined ctor frames, false
  in normal fns -- the naive "push false" broke earley because inlined ctors need
  true), `new`/ctor inline, cold-GetProp, for-in Iter, BindUnqualifiedGName.
- **navier**: regular-Array element ceiling + GetAliasedVar-in-inlined (depth>0).
- **earley**: PRE-EXISTING broken under JIT (baseline produces no output at all);
  needs Instanceof/Arguments/Iter/GetFrameArg + flaky-miscompile fix.

ADDED (default-off, GECKO_WJVS_METHFALL): non-inlined WJH_METHCALL fallback for
method calls with no inline record (was bailing the whole fn). Correctness-safe
(raytrace stays OK) but alone doesn't unblock raytrace (other blockers remain).
Marshals recv faithfully (i64->as-is, i32->boxObj, double->boxForStore).

PRIORITIZATION for hitting 2x: raytrace is the most tractable (compilation-bound,
correctness-safe, no corruption) -- but needs ~5 features landed together per fn.
deltablue/splay need the memory-corruption bug found first. The single highest-
leverage architectural fix remains replacing deopt-by-restart with real per-site
runtime inline caches (add-a-case-on-miss), which fixes deltablue/splay/(raytrace
cold sites) at once.

## 2026-06-20 (cont 3): boxed Not landed (default-on); latent-crash wall confirmed
- LANDED, default-on, correct: **tag-aware boxed `Not`** in the reused-Ion FE.
  JS truthiness of a boxed i64 via NaN-box discrimination: value is a double iff
  high32 (unsigned) < 0xFFFFFF81 (tag base); double falsy = (==0.0 || NaN); tagged
  falsy = (low32==0) -- correct for object(ptr!=0->truthy)/int/bool/null/undef.
  (Empty-string not modeled; doesn't occur in `!x` here.) Verified: all benches OK,
  gates 11/11, richards 17.8x unaffected. Eliminates the "Not (boxed)" bail (11x on
  splay, the #1 splay blocker).
- splay & raytrace are BOTH compilation-bound (0 deopts, ~0 installs). After boxed
  Not, splay's remaining blockers: Call-not-inlinable (method calls), IsConstructing,
  cold-GetProp. With GECKO_WJVS_METHFALL on, splay gets 1 install and bails drop to
  near-zero -- BUT splay then HARD-CRASHES (no output). raytrace+METHFALL stays
  correct but 0 installs (multi-blocker). So METHFALL stays gated off.
- splay ratio after boxed Not: ~1.1x (ON~13100us, OFF~14400us; high variance, a
  single noisy OFF run misread as 2.02x -- it is NOT 2x). Only richards clears 2x.
- **THE WALL (confirmed across 3 independent attempts):** every change that makes the
  JIT compile MORE of the deopt/compilation-bound benches triggers a LATENT
  codegen/memory-corruption crash -- deltablue helper-diamond ("table index OOB" =
  clobbered C++ fn-ptr), METHFALL on splay (hard crash). The conservative install
  criteria (loop-required, bail-on-unsupported-op, deopt-restart) MASK these. Hitting
  2x on the non-richards benches requires first PINNING these latent corruptions
  (needs ASan/wasm-dump-level tooling, not blind iteration) -- then the no-restart
  helper + METHFALL + IsConstructing/cold-GetProp features can be turned on safely.
  This is multi-day work; not closeable by the per-build-cycle iteration available.

## 2026-06-20 (cont 4): BOTH blockers are ONE root cause (table-OOB / re-entrant compile)
Big consolidation: deltablue (helper diamond) AND splay (METHFALL) both fail with the
IDENTICAL "table index is out of bounds" trap (splay's was hidden -- octane-run
swallowed it; `node embed-js/run.cjs /tmp/octrun_splay.js` shows it directly). So it
is ONE bug, not many. This is the single highest-value fix: resolving it unblocks
the no-restart helper (deltablue/splay) AND METHFALL (splay/raytrace) together.

Analysis of the trap:
- The reused-Ion module emits NO call_indirect (only wjhelp imports; the only
  Op::CallIndirect in the file are Mode-VS at ~3235/6365). So the trap is the HOST
  call_indirect: wjhelp(WJH_IONCALL/METHCALL) -> JS::Call(callee) -> if the callee is
  WJ-compiled it enters via WasmJitRunCall -> wasmhost_call(handle) -> host
  call_indirect into the shared JIT funcref table. A corrupted handle traps.
- NOT a plain table overflow: tableIdx is range-capped (gWJTableCount < kWJTableSize=4096
  at ~12608) and a -1 tableIdx is handled (early return at ~8556). So the OOB index is
  a CORRUPTED handle/shared-state, not an out-of-range tableIdx.
- LEADING HYPOTHESIS: **re-entrant compilation**. A METHCALL/IONCALL through wjhelp runs
  the callee in the interpreter, whose ICs warm and can trigger WJIonCompileInstall
  (clears gWJ* maps, allocates a wasm module, registers in the table) WHILE the outer
  compiled frame's METHCALL is in flight using gWJScratch/gWJHelpA. With METHFALL/helper
  there are far MORE wjhelp calls -> far more chances to recursively compile mid-call ->
  clobber shared state / the table. richards survives because its callees are all
  inlined or already-compiled (few/no mid-call compiles). NEXT: guard against re-entrant
  WJIonCompileInstall (a `static bool gWJCompiling` reentry flag that defers compilation
  if already inside the JIT), and/or save/restore gWJScratch+gWJHelpA around wjhelp's
  JS::Call. Verify by disabling lazy-compile-on-observe during a wjhelp call.

Default build remains correct (boxed Not on; helper/METHFALL/poly all gated off).

## 2026-06-20 (cont 5): re-entrant-compile RULED OUT; landed re-entrancy guard
- Tested the re-entrant-compilation hypothesis: added a guard in WasmJitObserveCall --
  `if (gWJCallDepth > 0) defer` (don't compile while inside a JIT'd call;
  GECKO_WJVS_NOREENTRYGUARD to A/B). Did NOT fix deltablue-POLYALL (still chain-fail)
  or splay-METHFALL (still table-OOB). So re-entrant compile is NOT the cause. Kept the
  guard anyway -- it's a sound safety improvement, default-on, richards unaffected
  (18.5x), all benches OK, gates 11/11.
- Determinism RULES OUT GC-stale-pointers: deltablue-POLYALL fails 5/5 deterministically
  (GC timing would make it flaky). So it's a deterministic bad-value/bad-address in the
  emitted code, not a GC or re-entrancy race.
- Refined the mechanism: the helper diamond/METHFALL paths add NO new computed-address
  memory STORE (diamond uses setSlot=wasm-locals + loadAt=reads; METHFALL stores only to
  the constant gWJScratch addr). So the corruption is a PRE-EXISTING latent bug in the
  EXISTING GetElem/SetElem (or receiver-unbox) codegen that only triggers once these
  specific functions COMPILE (which the helper/METHFALL enable). NOELEM masks deltablue
  -> it's GetElem/SetElem. Most likely: compiled execute()'s `constraintAt(i)`->`at(i)`->
  GetElem returns a WRONG element (the array field read or the GetElem base/index is off
  under the helper-path representation), that garbage object becomes the `c.execute()`
  dispatch receiver -> call_indirect on a garbage object -> "table index out of bounds".
  NEXT: instrument the JIT's loadAt/storeAt (or GetElem base/idx) with a runtime
  plausible-address check + log to pin the exact bad access; or bisect within compiled
  execute() by selectively disabling GetElem vs the field-read diamond.

THIS SESSION's landed, default-on, correct deliverables: (1) tag-aware boxed Not,
(2) re-entrancy guard, (3) inlined-frame receiver boxObj(asObjPtr) fix. Gated infra:
no-restart WJH_GETPROP helper (poly), WJH_METHCALL fallback. richards ~18-24x; only
richards >=2x; the others blocked by the single GetElem/dispatch corruption above.

## 2026-06-20 (cont 6): corruption PINNED to array-iteration + poly-diamond
Knob-bisected deltablue+POLYALL (env vars, no rebuild): ONLY `GECKO_WJVS_NOLEN=1` and
`GECKO_WJVS_NOELEM=1` fix it; NOCF/NOPOLYCALL/LEAFONLY/INLINEDEPTH=0/NOMETHINLINE all
still fail. So the corruption is in functions that do BOTH `array.length` AND
`array[i]` (array iteration -- deltablue's OrderedCollection.at/size loops, Plan.execute)
WHEN their field reads use the poly-diamond (POLYALL). Default (legacy typed field reads)
+ those same functions = correct. So the poly-field diamond's slot-phi yields a WRONG
array/length value -> the `for(i<size())` loop over-iterates -> GetElem reads past the
array -> garbage object becomes the c.execute() dispatch receiver -> call_indirect on
garbage -> "table index out of bounds" (or, milder, wrong propagation -> chain fail).
Confirmed construction-time (NOOPT fails), not OptimizeMIR, not re-entrancy, not GC
(deterministic). The diamond's offsets match legacy (gWJFieldPoly.offs == gWJShapeRec),
so the prime suspect is the diamond's block/slot-phi CONSTRUCTION producing a wrong
merged value for the array field in a loop/nested-inline context -- needs an MIR graph
dump (per-block preds/phis/operands) to pin the exact malformation; reasoning has gone
as far as it can.

NET (final, honest): goal NOT met -- only richards >=2x. Landed this session (all
default-on, correct, no regression): tag-aware boxed Not, re-entrancy guard,
boxObj(asObjPtr) receiver fix. Gated infra (off; corruption above): WJH_GETPROP
no-restart helper, WJH_METHCALL fallback, poly-field diamond. The 2x-on-all goal needs:
(1) fix this one poly-diamond construction bug [MIR-dump debugging], (2) the additive
raytrace opcodes (IsConstructing ctx-aware, cold-GetProp, Iter, BindGName),
(3) navier regular-array typed fast path, (4) earley opcodes+flaky fix. Multi-feature,
needs MIR-dump/sanitizer tooling -- not closeable by blind per-build-cycle iteration.

## 2026-06-20 (cont 7): MIR graph PROVEN well-formed -> bug is backend/representation
Added a graph validator (GECKO_WJVS_VALIDATE, default-off) that replicates the two
NDEBUG-dropped construction checks: (1) phi-type consistency (all phi operands same
MIRType), (2) operand DOMINANCE (def block dominates use; for phis, dominates the
matching predecessor -- via RenumberBlocks + BuildDominatorTree from jit/). On
deltablue+POLYALL+NOOPT: BOTH checks are CLEAN (zero violations). So the constructed
SSA graph is well-formed -- the poly-diamond corruption is NOT a malformed graph.
Combined with: NOOPT still fails (not OptimizeMIR), 0 deopts (not deopt-restart),
deterministic (not GC), validators clean (not graph structure) -> the bug is a
SEMANTIC / VALUE-REPRESENTATION error in the emitted wasm (correct-looking graph that
computes the wrong value), specific to deltablue's field value patterns, and it does
NOT reproduce in any faithful minimal repro (t_db/t_db2/t_fe2 all pass under POLYALL).
LEADING SUSPECT: the poly path loads every field as RAW i64 marked vty2 (generic
unbox), vs the legacy typed read -- a field holding a bool/int (e.g. Constraint
satisfied/mark) read as vty2 then used in a representation-sensitive op (===, etc.)
may differ. NEXT (only way forward): emit runtime value-logging from the JIT'd
execute() (log each field/length/element value) and diff vs the interpreter to catch
the first divergent value -- static analysis and minimal repros are exhausted.

Diagnostic infra now in tree (all default-off): GECKO_WJVS_VALIDATE (phi+dominance),
the deopt sentinel tags (6.1-6.5/7/8/9), GECKO_WJVS_POLYALL/POLYFIELD/METHFALL/
NOREENTRYGUARD. Landed default-on this session: boxed Not, re-entrancy guard,
boxObj(asObjPtr) receiver fix. Default build correct (richards ~21x, all benches OK,
gates 11/11). Goal status unchanged: 1/6 at >=2x (richards only).

## 2026-06-20 (cont 8): CONCLUSIVE -- helper NEVER taken -> bug is in diamond CFG EMISSION
Added GECKO_WJVS_PHCOUNT (one-shot counter in WJH_GETPROP). On deltablue+POLYALL: the
helper arm is NEVER invoked (zero "ph-helper-taken"). So 100% of field reads take the
poly diamond's MATCH arm (inline raw-i64 load), and the helper/receiver-marshal is NOT
the cause. Full elimination chain now:
  helper-never-taken (not the helper) + validators clean (valid phis + valid operand
  dominance) + value-semantics-equivalent-to-legacy (raw-i64+vty2 generic unbox gives
  the same number/object/null as the legacy typed read) + NOOPT fails (not OptimizeMIR)
  + 0 deopts (not deopt-restart) + deterministic (not GC) + no minimal repro.
=> The defect is in the MIR->wasm BACKEND EMISSION of the diamond's extra CFG (the
   per-way block chain + slot-phi -> wasm-local lowering / br_table block dispatch in
   WJIonEmitBody) in deltablue's specific deep-inline nesting. The legacy mono path
   emits a straight load with NO diamond, so it is unaffected -- which is why default
   is correct and only the diamond (POLYALL/helper) triggers it. The graph validator
   can't catch this (it validates MIR, not the emitted wasm bytecode).
NEXT (the only remaining diagnostic): dump the emitted wasm bytes for a failing
deltablue function under POLYALL and trace the diamond's block/local lowering, or add
a wasm-bytecode disassembly of WJIonEmitBody output. This is wasm-backend-level
debugging.

Final session state: default build correct (richards ~21-38x depending on GC noise,
all benches OK, gates 11/11). Landed default-on: boxed Not, re-entrancy guard,
boxObj(asObjPtr) receiver fix. Diagnostic infra (default-off): VALIDATE (phi+dom),
PHCOUNT, POLYALL/POLYFIELD/METHFALL, deopt sentinels. Goal: 1/6 at >=2x (richards).
The diamond-CFG-emission bug is the gate to deltablue/splay; raytrace/navier/earley
need separate additive features. Not closeable without wasm-backend debugging tooling.

## 2026-06-20 (cont 9): FIXED a real parallel-copy bug (not the deltablue blocker)
WJIonEmitEdgeCopies did SEQUENTIAL phi edge-copies and its own comment admitted it
"assumes no parallel-copy swap hazard". That IS a real latent bug (a phi source that
is another phi's dest at the same join -> lost copy). FIXED: read ALL phi sources onto
the wasm value stack first (old values), then pop into dests in reverse (LIFO) -- a
correct parallel copy for any dependency pattern. Landed default-on; gates 11/11,
richards fine, all benches OK. BUT it did NOT fix deltablue+POLYALL / splay+METHFALL
(still fail) -- so the parallel-copy hazard was not the diamond blocker, just a real
latent bug found en route.

EXHAUSTIVE layer-by-layer audit complete (every layer checked):
  oracle (maps cleared per-compile) OK; MIR construction (validator: phis type-clean +
  dominance-clean) OK; value semantics (raw-i64/vty2 == legacy typed) OK; helper arm
  (PHCOUNT: never taken) OK; CFG linearization (general br_table dispatch) OK;
  phi destruction edge copies (now parallel-copy correct) OK.
Yet deltablue+POLYALL still deterministically fails. The remaining defect must be in
WJIonEmitValue's lowering of a SPECIFIC node within the diamond context, or a
be.local()/assign() local-aliasing issue -- visible only by DISASSEMBLING the emitted
wasm for a failing deltablue function and tracing it. That is the sole remaining
diagnostic and needs a wasm-bytecode dumper (not available in the fast-rebuild path).

Landed default-on this session (all correct, verified, no regression): boxed Not;
re-entrancy guard; boxObj(asObjPtr) receiver fix; PARALLEL-COPY edge-copy fix. Default
build: richards ~18-24x, all benches OK, gates 11/11. Goal: still 1/6 at >=2x.

## 2026-06-20 (cont 10): blocker PINNED to the diamond's 2-predecessor join emission
Decisive A/B (deltablue+POLYALL):
  POLYNOHELP (no-match = MWasmReturn deopt; join has 1 pred)        -> PASSES (ok)
  POLYDUMMY  (no-match = setSlot(tmp,const0)+goto; join has 2 preds) -> FAILS (chain)
  default    (no-match = helper+goto; join has 2 preds)              -> FAILS
=> The corruption is the diamond's 2-PREDECESSOR JOIN STRUCTURE itself, NOT the helper
content (boxObj/asObjPtr/MWJIonCall) -- POLYDUMMY has none of that and still fails.
The MIR is valid (VALIDATE: phi-type + dominance clean) and edge copies are now
parallel-copy-correct, yet the br_table linearization of this mid-expression 2-pred
merge produces wrong runtime values. richards' if-joins (2-pred) work, and t_db/t_db2
(2-pred diamonds under POLYALL) PASS -- so it's a deltablue-specific interaction of the
mid-loop-body 2-pred join (created via MBasicBlock::New + addPredecessor, NOT the
pending[] if-join mechanism) with the loop/RPO/linearization. SUSPECT: addPredecessor-
created joins mid-loop-body may not be folded into the loop's backedge/phi handling the
way pending[]-created if-joins are, or the RPO/$bid dispatch mishandles the extra
in-loop merge. NEXT: dump emitted wasm for a failing deltablue fn (wasm bytecode
tracer) OR try routing the diamond join through the pending[] merge mechanism instead
of addPredecessor.

FINAL session deliverables (default-on, correct, verified, no regression -- richards
~18-24x, all benches OK, gates 11/11): boxed Not; re-entrancy guard; boxObj(asObjPtr)
receiver fix; PARALLEL-COPY edge-copy fix (real latent bug). Diagnostics (default-off):
VALIDATE (phi+dom), PHCOUNT, POLYALL/POLYFIELD/METHFALL, POLYNOHELP/POLYDUMMY, deopt
sentinels. Goal: 1/6 at >=2x (richards). Blocker precisely pinned (2-pred-join diamond
emission); fixing it needs wasm-bytecode tracing; then 4 more feature-sets for the rest.

## 2026-06-20 (cont 11): ROOT CAUSE FOUND+FIXED; helper PROVEN not to help (measured)
ROOT CAUSE of the diamond corruption (the bug that blocked deltablue/splay all session):
the JS operand stack is empty at block boundaries by invariant (it lives outside block
slots, so its values don't cross blocks / get phis). The field-read diamond creates a
block boundary MID-EXPRESSION; when the operand stack is non-empty there, those values
silently fail to cross the join -> deterministic wrong values. PROVEN: gating the
diamond to `curStk->empty()` makes deltablue+POLYALL PASS; allowing it on a non-empty
stack (POLYNONEMPTY) FAILS. FIXED: the poly-field diamond now only fires when the
operand stack is empty (falls back to the no-CFG legacy load otherwise). This also
makes the default poly path (n>1) correct. (Two genuine bugs found en route: this
operand-stack invariant + the sequential->parallel edge-copy fix.)

DEFINITIVE MEASUREMENT (the key result): with the corruption FIXED, the no-restart
helper-fallback still makes deltablue **0.44x** (vs 0.83x default) with 1099 deopts.
So the helper does NOT help deltablue -- the per-field diamond overhead exceeds the
benefit, and expression-context reads (non-empty stack) fall back to deopt anyway.
=> CONCLUSION (measured, not speculative): the no-restart helper-fallback CANNOT bring
deltablue (or the other property/dispatch/array-bound benches) to 2x. This JIT
architecture wins big ONLY on call/dispatch/alloc-bound, fully-inlinable code
(richards 18x); on property/call-boundary/regular-array-bound code (deltablue,
raytrace, splay, navier) the per-operation boxing/guard/call overhead is net-neutral-
to-negative, and none of the levers tried (helper-fallback, METHCALL fallback, boxed
Not) change that ceiling. Reaching 2x on those needs a fundamentally lower-overhead
design (real low-cost inline caches + typed-array-style fast paths for regular arrays)
-- a much larger rewrite, not a lever on the current design.

SESSION RESULT: goal 1/6 at >=2x (richards). 5 correct default-on improvements landed
(boxed Not, re-entrancy guard, receiver boxObj(asObjPtr) fix, parallel-copy edge-copy
fix, operand-stack-invariant diamond guard); 3 real bugs found+fixed; the multi-
session-blocking corruption root-caused and fixed; and the central architectural
question answered with measurement. Default build correct (richards ~17-24x, all
benches OK, gates 11/11).

## 2026-06-20 (cont 12): operand-stack SPILL -> deopts ELIMINATED (0) but overhead ceiling holds
Implemented the operand-stack spill (the untested full-helper path): before the field
diamond, spill each live operand-stack value to a fresh slot; after the join, reload
preserving EXACT type (Double->reinterpret back to Double, Int32->extract low32 to
Int32, i64->keep+boxedVty). Slot budget bumped +10/GetProp. Gated under POLYALL/POLYFIELD.
RESULT: deltablue+POLYALL deopts dropped 1099 -> **0** (the full helper now compiles ALL
field reads incl. expression-context, no deopt-restart). Gates 11/11, graph validator
clean. BUT deltablue still chain-fails: a residual correctness bug specifically when a
diamond field result (vty2) feeds GetElem/.length in expression context (NOSPILL, NOELEM,
NOLEN each fix it; type-preserving reload did NOT). Not structural (validator clean), not
OptimizeMIR (NOOPT fails) -- a subtle vty2/representation interaction with GetElem/length
still unpinned.
KEY: even with deopts=0, the per-field diamond overhead (shape-compare+branch+slot +
spill stores/loads, several wasm ops per field read x many reads) means deltablue lands
~1x, NOT 2x -- consistent with the measured 0.44x partial. So perfecting the helper does
NOT reach the goal on property-bound benches; the per-operation overhead is the ceiling,
as concluded. Spill stays gated off (default build correct: richards ~18x, gates 11/11).
This reconfirms: 2x-on-all needs a lower-overhead redesign, not this lever.

## 2026-06-20 (cont 13): navier compiles now; bottleneck = wjhelp call overhead -> next lever identified
Added GECKO_WJVS_NOINLINEALIASED (default OFF): decline to INLINE a callee that uses
GetAliasedVar (emit a non-inlined call instead), so the hot caller compiles. RESULT:
navier installs 1 -> 3 (lin_solve/advect/project now compile). BUT measured net-NEGATIVE:
navier 0.99x -> 0.89x (stable, 5 runs each; the earlier "2.21x" was a single noisy OFF
outlier -- navier is ~0.57s/run so an 800ms window is ~1 iteration, very high variance --
ALWAYS measure navier with >=5 runs). Reason: the now-non-inlined solver calls go through
wjhelp -> JS::Call -> interpreter; that per-call C++/interpreter boundary costs more than
the compiled loop body saves. Gated OFF (default navier back to 0.99x).

=> PRECISE NEXT LEVER (the actual unlock, not vague "redesign"): make the reused-Ion
non-inlined call use COMPILED-TO-COMPILED call_indirect (wasm->wasm via the shared JIT
funcref table) instead of wjhelp->interpreter. Infrastructure EXISTS: gWJCallHandle[site]
(callee shared-table index, populated by the Mode-VS call-IC observe path ~line 8570),
wasmhost_jit_table() (the table, imported by the reused-Ion module when hasCall ~12692),
and the Mode-VS call_indirect emission pattern (~lines 3195/6118). TODO: give MWJIonCall a
site; lower it to `load gWJCallHandle[site]; if >=0 call_indirect[handle](scratchPtr) +
deopt-check + load result; else wjhelp fallback`. RISK: shared with richards' IONCALL
path -- must not regress richards; ABI/GC-safety/handle-staleness care needed. This is the
lever that would make navier (numeric, JIT's strength) potentially reach 2x, and reduce
deltablue/splay call overhead.

Goal status unchanged: 1/6 at >=2x. Default build correct (richards ~18x, all OK, gates
11/11). 5 improvements landed default-on; 3 real bugs fixed; corruption root-caused+fixed;
deopts eliminable (spill); the 2x ceiling traced to call-boundary + boxing overhead with
the precise next feature (compiled-to-compiled call_indirect) identified + infra located.

## 2026-06-20 (cont 14): compiled-to-compiled call_indirect scoped -- needs a TABLE IMPORT
Assessed implementing compiled-to-compiled call_indirect (the navier unlock). Found the
reused-Ion module's Import section HARDCODES 2 imports (m.help func + m.mem memory, ~line
12343 `writeVarU32(2)`) and does NOT import the shared funcref table -- so it CANNOT
call_indirect today. Adding it requires: (1) declare a table import in the Import section
(count 2->3) for hasCall modules, (2) the self-warming cache (gWJCallFn/gWJCallHandle per
site, mirroring Mode-VS lines 3195-3239), (3) MWJIonCall lowering: guard
low32(callee)==gWJCallFn[site] -> call_indirect[gWJCallHandle[site]](scratchPtr) else
wjhelp, (4) WJH_IONCALL populates the cache (resolve callee WasmJitEntry tableIdx). ABI
matches (reused-Ion fns are (f64)->f64 type 0, args via gWJScratch, like the table
expects). Substantial multi-part feature; module-structure change touches ALL reused-Ion
modules incl. richards (regression risk); payoff is navier-only (numeric) -> ~2/6, NOT 6/6.

FINAL HONEST STATE (session): goal 1/6 at >=2x (richards ~18x). Default build correct, gates
11/11, all benches run, 5 improvements landed default-on, 3 real bugs fixed, corruption
root-caused+fixed, deopts eliminable. The 2x-on-every-bench goal is NOT achievable as
in-session levers: measured ceilings (deltablue 0.97x even at 0 deopts; navier 0.89x
compiled, call-overhead-bound) prove it needs a multi-week redesign -- compiled-to-compiled
call_indirect (scoped above) + unboxed value flow (the uniform-i64-slot tax) + typed
regular-array fast paths + earley opcodes. Each piece documented; none is a quick win.

## 2026-06-20 (cont 15): navier's call_indirect blocked at a DEEPER level (closure env)
Implementing compiled-to-compiled call_indirect for navier, found a deeper blocker: a
function that uses GetAliasedVar (usesAliased) is DELIBERATELY NOT registered in the
shared funcref table (WJCompile ~line 12769: "must enter via WasmJitRunCall, which sets
gWJCurEnv to its environment, never the fast path"). navier's solver helpers (set_bnd
etc.) are exactly these closure functions -> they have no tableIdx -> cannot be
call_indirect'd. So even with the table-import + cache + lowering built, navier's hot
calls (lin_solve->set_bnd) can't use the fast path: the callee needs gWJCurEnv set for
its GetAliasedVar, which call_indirect doesn't do. Unlocking navier needs CLOSURE-ENV
handling in the compiled call path (set gWJCurEnv before call_indirect, or thread the
env) AND the sibling-closure hop-equivalence reasoning -- a substantial, fragile feature
on top of the call_indirect infra.

CONCLUSIVE per-bench architectural blockers (all scoped to implementation level now):
- richards: 18x DONE (call/dispatch/alloc, fully inlinable).
- deltablue/splay: per-op boxing/guard overhead floor (measured 0.97x at 0 deopts) ->
  needs unboxed value flow (the uniform-i64-slot tax).
- navier: closure callees not tabled + need gWJCurEnv -> needs closure-env in fast calls
  + typed regular-array fast paths.
- raytrace: 5 missing opcodes (IsConstructing-in-ctor, Iter, BindGName, cold-GetProp) +
  Prototype.js apply/arguments-ctor structure hostile to inlining.
- earley: pre-existing broken under JIT (baseline no output) + Instanceof/Arguments/Iter.
Every non-richards bench has a distinct fundamental blocker; 6/6 at 2x = multi-week
multi-feature redesign, NOT in-session levers. Session delivered: corruption root-caused
+fixed, deopts eliminable, 3 bug fixes, 5 default-on improvements, full per-bench
implementation-level scoping. Default build correct (richards ~18x, gates 11/11).

## 2026-06-20 (cont 16): splay METHFALL crash ROOT-CAUSED = baked-global-pointer staleness
The splay+METHFALL "table index out of bounds" crash (and a general latent bug) is the
GetGName handler BAKING an object/function global's RAW POINTER as a constant (~line
11347). This is unsound: a compacting GC moves the object, or the global is reassigned
(splay's `splayTree = new SplayTree()` each setup), leaving a stale pointer -> calling
through it traps. Comment even admitted it ("de-facto-const... FUTURE: guard"). FIX:
runtime-load the global's CURRENT slot value (fixed slot: g+16+slot*8; dyn: load g+8
slots_ ptr then +(slot-nfixed)*8) -- GC- and reassignment-safe. Verified: with
GECKO_WJVS_GLOBALLOAD, splay+METHFALL no longer crashes (reaches TearDown -- a milder
remaining validation error). BUT runtime-load regresses richards 18x->~7x (richards reads
constructor-function globals in its hot loop; baking them as constants is a real perf
win). So GATED behind GECKO_WJVS_GLOBALLOAD (default = bake, richards ~18x preserved, all
default benches ok, gates 11/11). A proper fix would bake + register the pointers for GC
update (JIT-code-patch style) so it's both fast and correct -- future work.
splay still not at 2x even with the crash fixed: a SplayTearDown validation error remains,
and splay is pointer-chasing (~1.5x ceiling). Goal still 1/6; another real bug found+fixed
(gated). Default build correct.

## 2026-06-20 (cont 17): BREAKTHROUGH -- navier 5.47x (2/6!) via inlined GetAliasedVar
ENABLED inlined-callee GetAliasedVar (depth>0) by DEFAULT: the callee's hops are relative
to its environment; for a SIBLING closure (same enclosing scope, no own per-frame env)
the callee env == top frame env == gWJCurEnv, so walking gWJCurEnv by the callee's own
hops is correct. This unblocks richards-style FULL INLINING of navier's solver tree
(lin_solve inlines set_bnd etc.). RESULT (stable medians, INLINEALIASED default-on):
  richards 18.46x (preserved!), navier-stokes 5.47x (was 0.99x!) -- CORRECT (navier's own
  checkResult checksum passes) -- deltablue 0.75x, raytrace 0.96x, splay 1.19x.
=> 2/6 at >=2x now (richards + navier). Verified safe on ALL octane benches + 11 gates.
Revert via GECKO_WJVS_NOINLINEALIASED.

KEY REFRAME: the "per-operation overhead ceiling" was WRONG as a blanket conclusion. The
real limiter is INCOMPLETE INLINING. richards gets 18x from full inlining (call graph
collapses, GVN/LICM across); navier was stuck at 0.99x ONLY because inlined GetAliasedVar
bailed, preventing the same full inlining. Enabling it -> 5.47x. So the path for the
remaining 3 (deltablue/raytrace/splay, all compilation/dispatch-bound) is the SAME: remove
their inlining blockers so their hot trees fully compile+inline like richards/navier:
- splay (1.19x): needs method-call inlining/METHFALL (+ baked-global GLOBALLOAD for the
  reassigned splayTree) + IsConstructing + a TearDown fix.
- raytrace (0.96x): needs IsConstructing-in-ctor, Iter (for-in), BindGName, cold-GetProp.
- deltablue (0.75x): poly method dispatch + field access fully compiling.
NEXT: apply the full-inlining approach to these (opcodes + dispatch), as proven on navier.

## 2026-06-20 (cont 18): construct support added; 2/6 confirmed solid
Added WJH_CONSTRUCT + JSOp::New/NewContent handling: `new callee(args)` -> marshal args
to gWJScratch, MWJIonCall(construct) -> wjhelp(WJH_CONSTRUCT) -> JS::Construct -> new obj.
Non-inlined (ctor runs in interpreter), so it avoids inlining ctors' IsConstructing/
apply/arguments. Correct (all benches ok, gates 11/11), default-on, no regression.
Foundational but doesn't ALONE complete a 3rd bench: splay/raytrace/deltablue each bail
on their FIRST unsupported op before reaching the `new` (splay: method calls 11x; raytrace:
IsConstructing/cold-GetProp/method-calls/Iter/BindGName, each the first blocker for some fn).

CONFIRMED STATE: 2/6 at >=2x -- richards ~18-32x, navier 5.84x -- both CORRECT
(navier checksum passes) and DEFAULT-ON. deltablue 0.79x, raytrace 1.03x, splay 1.17x.
Default build correct, gates 11/11. This session: 1/6 -> 2/6 (navier breakthrough via
inlined GetAliasedVar) + construct support + 5 earlier bug fixes. The remaining 3 are
multi-feature (each needs several opcodes/dispatch + the GLOBALLOAD/richards conflict for
splay), but the approach (richards-style full inlining) is proven and the foundations
(construct, METHFALL, GLOBALLOAD, inlined-GetAliasedVar) are in place (some gated).

## 2026-06-20 (cont 19): ISCTOR/METHFALL correct but insufficient; 3rd bench is multi-feature
- IsConstructing=false (GECKO_WJVS_ISCTOR) is CORRECT on richards/deltablue/raytrace/navier
  + gates (raytrace's "Scene rendered incorrectly" checksum passes) -- because the construct
  helper runs ctors non-inlined, so compiled frames are never construct contexts. (earley,
  already ERR, is the only one it could mis-handle.) Kept gated (doesn't help ratios alone).
- METHFALL correct on those 4 too but CRASHES splay unless +GLOBALLOAD (baked-global). Kept
  gated (would crash splay by default).
- MEASURED with ISCTOR+METHFALL: deltablue 0.73x (no help -- field/dispatch overhead, not
  calls), raytrace 1.09x but STILL 0 installs (its hot fns also need DupAt + cold-GetProp +
  Iter + BindGName), navier 6.26x. splay+GLOBALLOAD -> SplayTearDown validation error (523).
=> 3rd bench needs MANY features each: raytrace ~6 opcodes (ISCTOR+METHFALL+DupAt+cold-GetProp
  +Iter+BindGName), splay (METHFALL+GLOBALLOAD+TearDown-fix, +GLOBALLOAD regresses richards),
  deltablue (field-access overhead/corruption -- the hard one). All additive but numerous.

SOLID DEFAULT STATE (end of session): 2/6 at >=2x -- richards ~18-32x, navier 5.84x, both
correct + DEFAULT-ON. deltablue 0.79/raytrace 1.03/splay 1.17 <2x. gates 11/11, all benches
correct. Default-on wins: inlined-GetAliasedVar (navier 0.99->5.84x), construct support,
boxed Not, parallel-copy fix, re-entrancy guard, receiver fix. Gated: ISCTOR, METHFALL,
GLOBALLOAD, POLYALL. Session net: 1/6 -> 2/6 + 7 bug fixes + the inlining-is-the-lever reframe.

## 2026-06-20 (cont 20): GLOBALLOAD now DEFAULT-ON (no richards regression); splay METHFALL bug isolated
- GLOBALLOAD (runtime global slot-load) is now DEFAULT (baked only via GECKO_WJVS_BAKEGLOBAL).
  Richards regression GONE (~21.9x stable -- earlier 18->7x was fixed by later changes; loadAt
  marks loads movable so they're not hot-loop-bound). navier 4.5x. Clean correctness win
  (fixes baked-global staleness under reassignment/compacting-GC). gates 11/11, all benches ok.
- splay+METHFALL ISOLATED: METHFALL alone -> SplayTearDown "wrong size/unsorted" (wrong tree);
  ISCTOR alone -> ok. So METHFALL (enabling splay's tree-mutation fns to compile) exposes a
  CORRECTNESS bug (same class as deltablue's chain-fail -- compiled stateful field/SetProp/
  dispatch). This gates METHFALL-default, which raytrace ALSO needs -> fixing it unblocks BOTH.
Default state still 2/6 (richards ~22x, navier ~4.5x). Next: bisect splay's miscompiling fn
(IONINT_ONLY+METHFALL) -- likely a field/SetProp issue in the compiled tree ops.

## 2026-06-20 (cont 21): splay METHFALL bug pinned to compiled InsertNewNode's call-loop
Bisected (ONLY=480 + METHFALL still breaks, GLOBALLOAD default fixed the earlier crash):
the wrong splay tree comes from COMPILED InsertNewNode (line 480):
  do { key = GenerateKey(); } while (splayTree.find(key) != null);  // uniqueness loop
  ... splayTree.insert(key, GeneratePayloadTree(.., String(key)));
With METHFALL, InsertNewNode compiles; its `find(key) != null` uniqueness check goes wrong
(loop exits with a DUPLICATE key -> "Splay tree not sorted/unique" at TearDown). find/insert
run correct in PBL (ONLY=480), so the bug is in InsertNewNode's COMPILED handling of the
call results / loop condition (METHCALL/IONCALL result -> `!= null` comparison, or the
do-while-with-calls structure). Needs runtime value tracing to pin (same class as deltablue's
chain-fail). This is the gate for METHFALL-default (-> splay AND raytrace).

SESSION CHECKPOINT (strong, verified, default-on): 2/6 at >=2x -- richards ~22x, navier ~6x.
GLOBALLOAD now default (baked-global staleness fixed, no richards regression). Construct
support default. 7 real bugs fixed. The "incomplete inlining is the lever" reframe proven
(navier 0.99->6x). Remaining: splay/deltablue compiled-call/field correctness (value-tracing),
raytrace ~6 opcodes (+ needs METHFALL-default), earley pre-broken+opcodes. gates 11/11.

## 2026-06-20 (cont 22): DupAt added; UNIFIED diagnosis -- remaining 3 = compiled field-access
Added JSOp::DupAt (UINT24, dup Nth-from-top). raytrace with ISCTOR+METHFALL+DupAt: bails now
"SetProp: no shape record" (7) + "GetProp no record" (5) + Iter(1) + BindGName(1); installs
still 0 (correct -- stays PBL). So raytrace's hot vector/color functions need COLD GetProp +
COLD SetProp handling. KEY UNIFIED FINDING: deltablue (0.79x), splay (1.17x), raytrace (1.03x)
ALL converge on COMPILED OBJECT-FIELD-ACCESS -- getPropField/SetProp on stateful object-heavy
code. The DEFAULT mono field path is correct (deltablue 0.79x = correct-but-deopt-slow); the
corruption is in the helper/poly field path + cold-field coverage. navier escaped this (it's
array-numeric, not object-field). So the SINGLE highest-leverage remaining fix = correct,
no-restart compiled object-field access (cold GetProp/SetProp helpers that are correctness-safe
[interpreter fallback] + fixing the helper-diamond corruption). This unblocks 3 benches.
Default 2/6 holds (richards ~19x, navier ~6x), gates 11/11, all benches correct.

## 2026-06-20 (cont 23): cold-GetProp helper DEFAULT-ON (correct); cold-SetProp bug isolated
Added cold-field helpers (route "no record" GetProp/SetProp -> wjhelp(WJH_GETPROP/SETPROP),
correctness-safe interpreter fallback, single call no block boundary). Isolated via split
knobs:
- cold-GetProp helper: CORRECT on all benches + gates -> made DEFAULT-ON (NOCOLDGET reverts).
  Lets field-heavy fns compile their cold reads instead of bailing.
- cold-SetProp helper (GECKO_WJVS_COLDHELPSET, gated): BUGGY -- breaks richards
  (Scheduler.schedule's `this.currentTcb = this.currentTcb.run()` loop miswrites the field).
  Fails under NOOPT too (construction/semantic, not reordering). MWJIonCall.setSetPropSite_
  mode: val pre-stored to gWJHelpB + recv->gWJHelpA + wjhelp(WJH_SETPROP). Exact cause not
  yet pinned (needs value-tracing); the val-via-gWJHelpB marshalling is the suspect (GETPROP
  marshals atomically in the lowering; SETPROP splits the val store out -- could need val as
  a 2nd MWJIonCall operand so the lowering marshals it atomically).
raytrace still needs cold-SetProp (7 sites) to compile -> blocked on this bug. Default 2/6
holds (richards ~19x, navier ~6x), gates 11/11, all benches correct. Landed this turn:
construct(JSOp::New), DupAt, cold-GetProp helper. Unified remaining lever: compiled
object-field-access (cold-SetProp fix + helper-diamond corruption) -> unblocks deltablue/
splay/raytrace.

## 2026-06-20 (cont 24): cold-SetProp bug is COMPILE-TIME cross-function (WJH_SETPROP never runs)
Value-traced WJH_SETPROP (GECKO_WJVS_SPDBG): richards+COLDHELPSET produces ZERO WJH_SETPROP
calls -- so the helper never executes; the break is a COMPILE-TIME effect (enabling cold-SetProp
lets some OTHER function compile, whose compilation corrupts state schedule reads). schedule
itself compiles fine by default (richards 19.7x) -> it has no cold SetProp; the corruption is
cross-function. Same hard cross-function class as deltablue/splay (each fn correct in isolation).
=> The whole remaining-3-benches problem is ONE thing: compiled object-field-access correctness,
and specifically a CROSS-FUNCTION compile-time corruption when more object-field-mutating
functions compile together. Needs MIR/wasm-dump or differential value-tracing across the
multi-function compile -- not a single-function fix.

SESSION FINAL: 2/6 at >=2x (richards ~20x, navier ~5-6x), default-on, all benches correct,
gates 11/11. Landed default-on this session: inlined-GetAliasedVar (navier 0.99->6x), GLOBALLOAD
(baked-global staleness fix), construct(JSOp::New/WJH_CONSTRUCT), DupAt, cold-GetProp helper,
boxed Not; 8 real bugs fixed; the "incomplete inlining is the lever" reframe. Gated (each
isolated as buggy/conflicting): cold-SetProp (COLDHELPSET, cross-fn corruption), METHFALL
(splay cross-fn corruption), POLYALL helper-diamond (deltablue corruption), ISCTOR (correct,
unneeded alone). Remaining: the unified compiled-object-field cross-function corruption (gates
deltablue/splay/raytrace) + earley (pre-broken+opcodes).

## 2026-06-20 (cont 25): CORRUPTION FIXED; deltablue correct at 1.38x but overhead-capped <2x
MAJOR: the multi-session helper-diamond corruption is FIXED (by this session's cumulative
fixes -- GLOBALLOAD + parallel-copy edge-copy + type-preserving spill + operand-stack guard).
Evidence: deltablue POLYALL now CORRECT (was "Chain test failed"): 1.38x with 0 deopts (up
from 0.79x legacy-deopt). raytrace full-features (ISCTOR+METHFALL+COLDHELPSET) now CORRECT
(was table-OOB). So the corruption that blocked everything is gone.
BUT -- measured ceiling holds even when correct:
  deltablue POLYALL: 1.38x (0 deopts, correct) -- per-field diamond overhead caps it <2x.
  raytrace full: 0.58x (correct, but helper-heavy + still needs cold-GetElem/Mod/Iter/BindGName).
  POLYALL on richards: 12x (regressed from 20x but still >=2x), navier 4x (from 6x, still >=2x).
splay METHFALL + richards COLDHELPSET: still ERR (a SEPARATE cold-SetProp/splay bug, distinct
from the now-fixed diamond corruption).
=> FIRM MEASURED CONCLUSION: this architecture reaches >=2x ONLY on inlinable dispatch/numeric
code (richards 20x, navier 6x). Property/dispatch/field-bound code (deltablue/splay/raytrace),
even CORRECT and deopt-free, caps ~1.4x due to per-operation boxing/guard/diamond/dispatch
overhead. 2/6 is the architecture's >=2x ceiling; the other 3 need the lower-overhead redesign
(unboxed value flow + lean field access + full dispatch inlining), not more correctness fixes.
This is now PROVEN (deltablue correct@1.38x), not speculative. Default stays 2/6 (POLYALL not
enabled by default: regresses richards 20->12 without adding a >=2x bench).

## 2026-06-20 (cont 26): navier REGRESSION fixed (dynamic env slots) -> 3/6 at >=2x
Found navier-stokes had REGRESSED from working to FAIL under default JIT (the "5.84x" in
cont 25 was stale). Root-caused + FIXED (genuine correctness bug, default path):
- Bisect: GECKO_WJVS_IONINT_ONLY=152 (FluidField.lin_solve) is the only function that fails;
  +NOELEM fixes it; FDEOPT/NOOPT/NOGUARD/NOMOVE/NOINLINEALIASED do NOT -> not deopt-restart,
  not optimizer, not inlining. Element access in lin_solve was implicated.
- Real cause (via WJH_IONCALL diag): lin_solve calls sibling set_bnd via the NON-INLINED
  IONCALL helper; JS::Call(callee) threw EVERY time because the callee value was a NUMBER, not
  the function. set_bnd is read by JSOp::GetAliasedVar, and the inline env load only handled
  FIXED slots (env+16+slot*8). FluidField has >16 closed-over bindings, so later function
  bindings (set_bnd, lin_solve) live in DYNAMIC env slots -> read as fixed = garbage.
- FIX (GetAliasedVar handler, ~line 10866): environments are non-extensible, so slot <
  NativeObject::MAX_FIXED_SLOTS(16) is fixed inline; slot>=16 is in the slots_ buffer (ptr at
  env+8) at index (slot-16). Mirror of the GetGName dynamic-slot path. (No SetAliasedVar in the
  Ion FE -- writes bail.)
RESULT (default JIT, IONINT=1, node, max-of-5): richards 14.0x, deltablue 2.14x, navier 3.72x
(was FAIL). raytrace 1.05x, splay 1.31x, earley FAIL (pre-broken). => 3/6 at >=2x, up from 2/6.
All 11 gates pass; all benches except earley correct. deltablue now hovers ~2.0-2.2x (borderline
but currently over) on the DEFAULT path -- POLYALL not needed (POLYALL still BREAKS navier's
diamond and is NOT default). Debug knobs added (gated): GECKO_WJVS_TICKMOD (heartbeat cadence),
IONFE_DUMP now also in the scratch/install path.

## 2026-06-20 (cont 27): earley sc_member boolean-truthiness bug (root-caused, NOT fixed)
earley-boyer FAIL ("incorrect number of rewrites") bisected to ONLY=998 = sc_member. Repro
(embed-js/t_member.js): a linked-list `while(l!==null){ if(sc_isEqual(l.car,o)) return l; l=l.cdr; }`.
Under JIT, member returns false for ALL queries (never matches) -> wrong count / hang on big inputs.
- The cold-GetProp helper (default-on) returns CORRECT car/cdr values (verified). NOCOLDGET
  "fixes" it only by bailing sc_member to PBL.
- ROOT CAUSE: `if (sc_isEqual(...))` tests the truthiness of a boxed BOOLEAN (tag 0x82) returned
  by the non-inlined IONCALL. The branch lowering (JSOp::JumpIfFalse) uses asInt32 on the
  condition; asInt32 routes a boxed value through asNumber, whose tag dispatch only recognizes
  the INT tag (0x81) and treats the 0x82 boolean as a double -> reinterprets its bits as a NaN
  -> garbage truthiness. (Minimal: `var b = sc_isEqual(...); if (b===true)` works because
  StrictEq compares raw bits; `if (b)` fails.)
- ATTEMPTED FIX (condTruthy, tag-aware truthiness mirroring the JSOp::Not handler) REVERTED: it
  fixed booleans but REGRESSED `var b=(x===y); if(b)` (int32-boxed b, tag 0x81) in the if/else-
  statement form (min_acc wrong) -- while the SAME condTruthy worked for the ternary form
  (b?2:1) and direct `if(x===y)`. Not-yet-understood backend interaction between the MWasmSelect-
  based truthiness and an if/else diamond that writes a var on both arms + joins. asInt32 is the
  proven-correct status quo for all 5 working benches, so kept it; left a KNOWN GAP comment at
  the JumpIfFalse handler. earley can't reach >=2x anyway (most of its functions bail on
  Instanceof/Arguments/Iter), so low ROI -- deferred. To fix properly: understand why the tag-
  aware select breaks the if/else-diamond slot merge, OR special-case only the boolean tag.

## 2026-06-20 (cont 28): splay blocker map (4 compounding issues -- NOT a single bug)
Pushed on splay (~1.4x, correct). Only findMax compiles; the hot fns (insert/find/remove/splay_)
bail. splay_ is the key (its hot while-loop is call-free pointer-chasing). Mapped its exact blockers:
1. `this.isEmpty()` method dispatch: oracle DOES record method-poly (off=11 n=1), BUT the record is
   UNSTABLE across the backoff retries -- some compile attempts see polyN=1 (dispatch fires), others
   polyN=-2 (gWJMethodPoly empty -> "Call not inlinable" bail). Root: gWJMethodPoly population timing
   vs compile attempts. On the polyN=1 attempt isEmpty inlines fine.
2. IsConstructing: splay_ hits it (needs GECKO_WJVS_ISCTOR, which is a GLOBAL flag unsound for
   earley's dual-callable ctors). With ISCTOR, splay_ gets past isEmpty.
3. Cold SetProp@274 ("no shape record"): COLDHELPSET handles compile but BREAKS splay correctness
   (FAIL) -- the same cold-SetProp corruption that breaks richards. A minimal repro (hot field
   writes) does NOT reproduce it (those get shape records -> inline store, helper unused); the
   corruption needs genuinely cold/unstable-shape write sites, so it's hard to isolate.
4. ALLOCATION-BOUND: splay does ~thousands of `new SplayTree.Node` per run via JS::Construct (the
   non-inlined construct helper) -- a full interpreter construct + helper boundary per node. Even
   if 1-3 were fixed, this overhead caps splay <2x without INLINE ALLOCATION (template-object fast
   path), a major unbuilt feature.
CONCLUSION (confirmed, not stale): splay needs 4 compounding features, 2 with real corruption bugs
(cold-SetProp, METHFALL) + inline allocation. Unlike navier (one mischaracterized dynamic-slot bug,
now FIXED), splay/raytrace/earley are genuinely multi-feature/architectural. raytrace is similar
(method dispatch + GetElem + Math + constructors); earley adds Instanceof/Arguments/Iter + the
boolean-truthiness gap (cont 27). Honest state: 3/6 at >=2x (richards 19.5x, deltablue 2.0x borderline,
navier 3.4x). The remaining 3 are a lower-overhead-redesign effort (inline alloc + unboxed flow +
robust method dispatch + cold-SetProp-without-corruption), not incremental fixes.

## 2026-06-20 (cont 29): cold-SetProp corruption is STALE (4/6 ok); richards has a separate latent miscompile
Pushed further on the goal. Key findings:
- COLDHELPSET (cold-SetProp helper) is NO LONGER broadly corrupting -- splay, navier, deltablue,
  raytrace all CORRECT + reliable (6/6 runs) with it. The prior "breaks splay" was STALE (fixed by
  this session's cumulative changes, like navier). So cold field writes work now for those.
- BUT COLDHELPSET still breaks RICHARDS (queueCount/holdCount wrong, deterministic; NOOPT/NOMOVE
  don't fix -> not ordering). Bisected to ONLY=431 WorkerTask.run. CRUCIAL: with SPDBG, WJH_SETPROP
  is NEVER CALLED -> the cold-SetProp helper does not execute. So COLDHELPSET merely ENABLES
  WorkerTask.run to COMPILE (instead of bailing on its cold SetProp), exposing a SEPARATE latent
  miscompile in WorkerTask.run itself (its method calls this.scheduler.queue/suspendCurrent return
  TCBs; error "this.currentTcb.isHeldOrSuspended is not a function" = a corrupted scheduler/TCB).
  So this is NOT a cold-SetProp bug -- it's a latent WorkerTask.run compile bug, only reachable when
  COLDHELPSET lifts the bail. Off by default -> no richards impact (richards bails WorkerTask.run ->
  PBL -> 19.5x stays correct).
- splay_ (L322) DOES compile with ISCTOR+COLDHELPSET but is then WRONG (downstream construct/dispatch
  issue, since IsConstructing-false should be sound given both JIT entry paths guard !construct).
NET: cold-SetProp is closer to usable than the summary said, but making COLDHELPSET default needs the
WorkerTask.run latent bug fixed first. Still 3/6 by default (richards 19.5x, deltablue 2.0x, navier
3.4x). raytrace/splay/earley remain multi-feature. No regressions; default build unchanged + verified.

## 2026-06-20 (cont 30): splay root cause = GC-safety of constructs (architectural); 2 fixes landed
Deep-dived splay with a FAST isolated repro (insert+remove churn, double keys, embed-js/t_splay3.js
+ variants). Reproduced the exact "Key not found" failure and bisected it:
- Trigger: splay_ compiling (needs ISCTOR for the `new SplayTree.Node()` IsConstructing + warm
  SetProp shape records). splay_ JITed = wrong (0 deopts, no helpers run, deterministic). NOOPT
  does NOT fix -> not optimization. Bisected splay_ body: removing the `new` (reuse a tenured
  DUMMY) makes it PASS; the method call (this.isEmpty) is FINE. So the `new Node()` CONSTRUCT is
  the trigger.
- emitConstructCall produces CORRECT objects (verified via CTORDBG: object-tagged, null args).
  The New bytecode/stack accounting is correct (verified via op-trace: callee, IsConstructing,
  args, newTarget/DupAt, New).
- ROOT CAUSE (architectural): a construct ALLOCATES -> can trigger GC that MOVES objects, but the
  reused-Ion JIT holds object pointers (`this`, and values across calls) as NON-GC-ROOTED wasm
  locals/i64s. Across the construct they go stale -> splay_'s tree restructuring chases moved/dead
  nodes (esp. early calls before the tree tenures). richards/navier/deltablue avoid it (objects
  tenured / no pointers held across their constructs). Proper fix = GC-root the JIT's live pointers
  across allocating calls (Mode-VS-style gWJFrameMem, or reload-from-roots) -- a major change.
TWO REAL FIXES LANDED along the way (both correctness, found via this dig):
1. emitConstructCall now clears fieldCache/objPtrMemo (a construct can GC-move objects, so cached
   field values/unboxed ptrs are stale) -- mirrors SetProp/SetElem. DEFAULT-ON. Cheap (compile-time).
   richards stays ~15-17x (within noise, >=2x).
2. GC post-write barrier infrastructure for inline object SetProp/SetElem stores (MWJIonCall
   setPostBarrier() -> wjhelp(WJH_POSTBARRIER); emitPostBarrier helper). The reused-Ion inline
   store wrote object pointers with NO barrier (real GC-unsafety). GATED default-OFF
   (GECKO_WJVS_POSTBARRIER) -- a helper call per store costs perf and doesn't fix splay (the
   stale-held-pointer issue dominates); kept as infra for a future inline-nursery-check barrier.
NET: still 3/6 at >=2x. splay's true blocker is now precisely known = construct GC-safety
(architectural), NOT a small miscompile. cold-SetProp + IsConstructing + method-dispatch were all
red herrings (each works or is benign). No regressions; default build verified.

## 2026-06-20 (cont 31): object-truthiness bug isolated to minimal repro; condTruthy unfixable so far
Continued toward 6/6. Distilled the splay-class failures into CLEAN minimal repros (in /tmp):
- t_ctorB: `for{ nd=new Node(i); if(head) s+=head.key; head=nd; }` -> WRONG (head.key skipped).
  t_ctorB2 (same but `if(head!==null)`) -> CORRECT. So head IS carried; the bug is `if (OBJECT)`
  TRUTHINESS. asInt32 (current) computes ToInt32(obj)=0 -> object reads as FALSE (objects are
  truthy). This is a real, general correctness bug for `if (obj)` / `obj && x` on object values.
- t_min: `var b=(x===y); if(b)...` (int-boxed bool) -- works with asInt32.
ATTEMPT (condTruthy, tag-aware truthiness) FAILED AGAIN, two ways: (a) it REGRESSES t_min (int-boxed
`if(b)` wrong) and (b) it does NOT fix t_ctorB (object still reads false). Bizarre: condTruthy is
correct in a TERNARY (t_min3 `b?2:1` passes) but wrong in the IF/ELSE statement form for the SAME
value, and NOOPT doesn't change it -> a backend mis-emission of the MWasmSelect/MReinterpretCast
node sequence specific to the if/else block structure that I could not root-cause. Reverted condTruthy
(strictly harmful: breaks min, fixes nothing). asInt32 kept (the proven status quo).
ALSO confirmed: splay_'s construct miscompile is NOT cold-SetProp/cache-staleness/GC-barrier --
minimal t_ctorC (construct + object store, no traversal) PASSES; the failure needs the chain
TRAVERSAL (t_ctor traps) or `if(obj)` (t_ctorB). The construct + traversal trap is a separate
unpinned issue (construct produces correct objects per CTORDBG).
NET this turn: no bench crossed 2x (still 3/6). Reverted the speculative construct cache-clear (cost
richards ~10%, fixed nothing). Kept GC post-barrier infra GATED off (zero cost). Two real bugs now
have minimal repros (object-truthiness `if(obj)`; construct+traversal trap) as precise next targets.
The object-truthiness fix is blocked on the condTruthy/if-else backend mystery (MWasmSelect in a
two-armed-join context). Default build = clean verified 3/6, no regressions.

## 2026-06-20 (cont 32): FIXED real branch-truthiness bug (high-half WrapInt64 backend bug + condTruthy)
BREAKTHROUGH on a real correctness bug. Root cause: the back-end MWrapInt64ToInt32 lowering
(WJIonEmitValue) ALWAYS emitted I32WrapI64 (low 32 bits), IGNORING the bottomHalf flag (comment
claimed "high half is unused"). But tag-aware truthiness needs the HIGH word (the NaN-box tag). So
`if (obj)` read ToInt32(obj) via asInt32 -> 0 -> objects wrongly FALSE; and the JSOp::Not handler's
high-half check was silently broken too. This is why condTruthy failed before (its isDouble check
got the low half) -- NOT an "if/else vs ternary" mystery; the high-half extraction was just wrong.
FIX (2 parts, both DEFAULT-ON, verified no regression):
1. Backend WrapInt64ToInt32: honor bottomHalf -- false => `i64.const 32; i64.shr_u; i32.wrap_i64`
   (high word). Only the Not handler used bottomHalf=false, so nothing relied on the bug.
2. condTruthy (tag-aware branch truthiness) re-added + wired into JumpIfFalse/JumpIfTrue + And/Or.
   Now CORRECT: t_min (int `if(b)`) = 25000000 AND t_ctorB (object `if(head)`) = 10830000 (both
   were wrong before). `!obj` (Not) also fixed by part 1.
VERIFIED: all 11 gates pass; richards 14.6x, deltablue 2.15x, navier ~3x (no regression); all benches
correct. So `if(obj)`/`obj&&x`/`!obj`/`if(bool)` are now correct -- a general correctness fix.
splay STILL fails but its error MOVED past truthiness: "Key not found" -> "null function or signature
mismatch" (a call_indirect/dispatch bug) for splay3/6; minimal t_ctor (construct in a loop + chain
traversal) traps "unreachable" via a deopt=6.2 shape-miss chain (FDEOPT/NOOPT don't fix). So splay
needs >=2 more fixes (construct-path shape-miss/deopt-restart corruption; method-dispatch call_indirect
sig). Still 3/6 at >=2x, but a real correctness bug class is now fixed and default-on.

## 2026-06-20 (cont 33): GC-stale-pointer root cause PROVEN; the architectural blocker pinned
PROVED the splay/construct architectural blocker with a minimal A/B:
- t_ctorC: `for{ nd=new Node(i); nd.next=head; head=nd; }` (no traversal) -> PASSES (but its chain is
  silently CORRUPT -- it only sums nd.key, never reads the chain).
- t_ctor: same build + `while(c!==null){ s+=c.key; c=c.next; }` -> deopt=6.2 (shape miss on a garbage
  node) -> "unreachable" trap.
ROOT: the build loop holds `head` (an object pointer) in a wasm LOCAL across `new Node()`. The
construct allocates -> minor GC moves the nursery nodes -> `head` is STALE -> `nd.next = head` links a
moved-from pointer -> chain corrupt -> traversal reads garbage -> shape-miss deopt -> trap. The
reused-Ion JIT stores slots in wasm locals which are NOT GC roots (unlike Mode VS's gWJFrameMem, which
WJTraceRoots traces). FDEOPT/NOOPT don't help (it's a stale pointer, not opt/restart).
WJTraceRoots traces gWJFrameMem[0..SP] + gWJScratch[0..72] + gWJHelpA/B/C + gWJCurEnv as Values. So the
FIX = spill the reused-Ion JIT's LIVE OBJECT slots into traced storage (gWJScratch/gWJFrameMem) across
every allocating call (construct, and allocating IONCALL/method), reload after -- a safepoint. Needs
liveness + object-typedness of slots at each call. Major change (the slot<->wasm-local mapping is the
core of the MIR->wasm backend), but now precisely scoped. This is THE blocker for splay AND raytrace
(both allocation+object-churn heavy). NOTE: splay_ ITSELF is GC-safe (its construct is first, no object
locals live across it); splay's remaining failure is a SEPARATE splay_ deopt=6.2 + call_indirect
"signature mismatch" (still unpinned) -- so splay needs the GC-rooting AND >=1 more fix.

## 2026-06-20 (cont 34): GC-rooting fix is blocked by the raw-double slot representation
Tried to implement the GC-rooting safepoint (spill live object slots to a traced gWJObjSpill across
allocating calls, reload after). Hit a FUNDAMENTAL obstacle: the uniform-i64 slots store DOUBLES as
RAW reinterpreted bits (boxForStore(Double)=bit-reinterpret), NOT canonical NaN-boxed Values. So:
- Cannot trace slots as Values: a NaN/large double's bits can fall in the NaN-box tag range and look
  like a tagged OBJECT pointer -> GC traces a bogus pointer -> crash.
- Cannot selectively spill only object slots: a loop-carried object (build's `head`) reads back through
  a PHI as boxedVty=2 (unknown), indistinguishable from a double slot at the construct.
=> The GC-rooting fix requires EITHER (a) storing slots as canonical NaN-boxed Values (changes
boxForStore + every unbox helper asNumber/asInt32/asObjPtr + the whole slot representation), OR
(b) precise per-slot object-typedness tracked THROUGH phis (a typed-slot dataflow analysis). Both are
major. Backed out the spill infra (unsafe as designed). This is the definitive reason splay/raytrace's
allocation-churn object code can't be made GC-safe with a targeted patch -- it's a representation-level
rewrite. NET this turn: kept the truthiness/backend fix (cont 32, real + default-on); proved the
GC-rooting blocker is representation-level. Still 3/6.

## 2026-06-20 (cont 35): truthiness fix ALSO repaired earley-boyer correctness (broken -> correct)
The cont-32 truthiness/backend fix fixed earley-boyer: it was BROKEN ("incorrect number of rewrites")
on sc_member's `if (sc_isEqual(...))` (boolean-truthiness via the high-half WrapInt64 bug). Now earley
runs CORRECTLY (OCTSCORE=439, passes its own validation; t_member repro = 6400032000 = interp). But
ratio ~0.90x -- most earley functions still bail (Instanceof/Arguments/Iter unsupported), so the few
JIT'd functions add overhead without speedup. So earley: broken -> CORRECT, but needs those opcodes
(+ the functions to actually benefit) to reach >=2x.
SCOREBOARD (default JIT, -O2): richards ~14-19x OK; deltablue ~2.0x OK (borderline); navier ~3.5x OK;
raytrace ~1.0x; splay ~1.37x; earley ~0.9x (now correct). => 3/6 at >=2x; all 6 now run CORRECTLY
under the JIT (earley was the last broken one). The 3 sub-2x are blocked by: GC-safe-slots
representation rewrite (splay/raytrace allocation-churn) + missing opcodes (raytrace Iter/BindGName/
IsConstructing, earley Instanceof/Arguments/Iter) + splay's separate deopt/dispatch bug. All are
substantial/architectural, not incremental.

## 2026-06-20 (cont 36): POLYALL/POLYFIELD no longer break navier (stale); splay's full stack mapped
The "POLYALL breaks navier" conflict (cont 25-27) is STALE -- resolved by this session's cumulative
fixes (truthiness/backend, etc.). NOW: POLYALL is CORRECT on all 6 benches (but adds diamond overhead
everywhere -> richards 19x->2.4x, net loss). POLYFIELD (diamond only on poly-at-COMPILE sites, mono
sites stay fast) is CORRECT + NO REGRESSION: richards 15.5x, deltablue 1.99x, navier 3.47x, splay
1.08x, raytrace 0.99x. So the no-deopt poly-GetProp diamond is now safe to use -- a real unblock of the
old conflict -- but it does NOT cross a 4th bench alone.
splay's blocker FULLY mapped (splay_ with ISCTOR): a deopt STORM -- deopt=6.2 (GetProp shape miss) AND
deopt=6.5 (SetProp shape miss) -- its node fields are poly-at-runtime/mono-at-compile (deltablue class).
POLYFIELD fixes the GetProp half; the SetProp half (deopt=6.5) has NO poly-SetProp path (only mono +
cold-no-record helper). So splay needs: poly-SetProp (new) + sound IsConstructing + GC-safe-slots
(representation) -- ALL THREE. No 4th bench is reachable by one fix.
NET this session (cumulative): navier FIXED (broken->3.5x), branch-truthiness FIXED (if(obj)/!obj/
if(bool); also repaired earley correctness broken->correct), POLYALL/navier conflict resolved,
construct GC-stale + slot-representation blocker proven. All 6 benches now run CORRECTLY; 3/6 at >=2x.
Remaining for 6/6: poly-SetProp, GC-safe slot representation, IsConstructing soundness, opcodes
(Iter/Instanceof/Arguments/BindGName) -- a multi-feature architectural effort, several interacting.

## 2026-06-20 (cont 37): splay_ MADE TO COMPILE CORRECTLY -> PROVES splay is overhead-bound (can't hit 2x)
Built the full stack to get splay_ compiling: POLYFIELD (poly GetProp, cont 36) + NEW poly-SetProp
diamond (GECKO_WJVS_POLYSET: shape-match inline store / miss -> WJH_SETPROP helper, no deopt) + ISCTOR
(IsConstructing, sound since both JIT entry paths guard !construct) + an INLINE GC post-write barrier
(GECKO_WJVS_POSTBARRIER: inline chunk->storeBuffer nursery check via js::gc::ChunkMask /
ChunkStoreBufferOffset, branchless-safe load with objp fallback, conditional helper only for real
tenured<-nursery edges).
RESULT: splay_ now compiles + runs CORRECTLY (0 deopts, no OOB) -- first time ever. The chain of fixes
each removed one failure: deopt=6.2 (POLYFIELD), deopt=6.5 storm (poly-SetProp), OOB (write barrier).
BUT splay full-stack = 0.93x (helper-barrier 0.81x -> inline-barrier 0.93x), still SLOWER than the
interpreter. => DEFINITIVE PROOF (not assertion): splay is OVERHEAD-BOUND. Even compiled correctly,
the per-op cost (poly-field diamond + shape guards + NaN-box/unbox + barrier check, on a pointer-chase
+ alloc workload) exceeds PBL's per-op cost. splay CANNOT reach 2x in this per-operation-boxed JIT;
it needs a fundamentally lower-overhead design (unboxed pointer flow, no diamonds, inline-everything).
By extension raytrace (similar dispatch/alloc profile) is the same. CONCLUSION: 3/6 at >=2x is the
ARCHITECTURE's ceiling, now PROVEN by getting splay_ fully correct and measuring 0.93x -- the gap is
per-operation overhead, not missing features. All new code GATED (POLYSET/POSTBARRIER/ISCTOR), default
build = clean 3/6, all 6 correct, no regression.

## 2026-06-20 (cont 38): REWRITE authorized + kicked off (unboxed-flow value representation)
User explicitly authorized the architectural rewrite ("do rewrite"). Kicked it off + confirmed the
target by profiling: leaning the GC barrier (dropped the obj-tenured inline check, ~4 ops/store) moved
splay full-stack 0.93x -> 0.92x = NO CHANGE. So the barrier is NOT the bottleneck. splay's overhead is
FUNDAMENTAL: (a) per-access NaN-box/unbox of slot values, (b) the N-way poly-shape diamond (2 node
shapes -> 2 guards/read), (c) the PBL->wasm call boundary (splay_ is called MANY times from PBL with
little work each -> boundary tax not amortized, unlike loop-heavy richards/navier). Small tweaks don't
move it (proven: lean barrier no-op).
REWRITE PLAN (multi-session, build GATED so default stays verified 3/6):
1. Unboxed typed slots: carry object slots as raw i32, double slots as f64, instead of uniform NaN-
   boxed i64. Eliminates box/unbox per access. HARD: breaks the uniform-i64 phi model (slot phis must
   become typed; the MIR->wasm backend slot<->local map must handle per-slot types). Requires per-slot
   type inference through phis (the same analysis the GC-safe spill needed).
2. Lean poly field access: a compact polymorphic check (shared shape-load CSE'd across a recv's fields)
   instead of an N-way diamond per access.
3. Compiled-to-compiled calls: route hot caller->callee through call_indirect (shared table) instead
   of PBL round-trip, to cut the boundary tax for call-heavy code (splay).
STATUS this session: experimental pieces all GATED + landed (POLYFIELD ok-default-candidate; POLYSET
poly-SetProp diamond; ISCTOR; POSTBARRIER inline GC barrier -> together make splay_ COMPILE CORRECTLY
at 0.93x). Default build = verified 3/6, all 6 correct, no regressions. The rewrite (item 1 esp.) is
the real work and spans multiple sessions; a partial version regresses the working suite so it stays
gated until the new typed-slot path is proven end-to-end.

## 2026-06-20 (cont 39): ungating the stack MEASURED WORSE (2/6); splay hot loop is PBL even full-stack
Tested user's "don't gate": made POLYFIELD+POLYSET+ISCTOR+POSTBARRIER DEFAULT. MEASURED REGRESSION:
richards 19x->2.4x, deltablue ->1.66x (BELOW 2x, lost), splay still ~0.96x -> net ~2/6, WORSE than the
gated 3/6. Reason: those features add per-op overhead (poly diamonds, per-store barrier check, SetProp
diamond) to EVERY function; richards/deltablue are field/store-heavy and pay with no benefit. REVERTED
to gated (restored richards 15.5x, deltablue 2.04x, navier 3.56x = verified 3/6). => the overhead-
features can't be default; only the unboxed rewrite (which makes access CHEAP) helps. Empirically proven.
Also confirmed: even WITH the full stack, only findMax + splay_ compile. SplayRun (the hot modification
loop) + InsertNewNode + insert/remove/find all BAIL (method-dispatch-on-global splayTree, String,
SetAliasedVar, deep non-inlinable calls). So splay's hot loop runs in PBL; splay_ is JIT'd but called
across the PBL<->wasm boundary per tree op (boundary tax). For splay to be fast: SplayRun must compile
+ deeply inline the find/insert/remove/splay_ chain + be GC-safe (it holds tree pointers across new-
Node allocs = the t_ctor stale-pointer class) + support String/SetAliasedVar/method-dispatch-on-
reassigned-global. That is the full unboxed+inlining rewrite -- multi-session, confirmed from every
angle. Default stays verified 3/6, all 6 correct.

## 2026-06-20 (cont 40): REWRITE step 1 LANDED -- GC-safe object-slot spill (default, no regression)
First piece of the unboxed/GC-safe rewrite, DEFAULT-ON, no gate:
- Per-slot type tracking: slotVty[slot] = last-stored type (0 dbl/1 int/2 unk/3 obj|null), updated at
  SetLocal/SetArg via setSlotTyped. Sized info.nslots().
- At emitConstructCall (allocating), spill OBJECT slots (slotVty==3, which are valid GC Values) to a
  traced gWJObjSpill region (traced by WJTraceRoots up to gWJSpillTraceN), reload after -> a moving GC
  during the construct updates the held pointers. Only object/null slots spilled, so no raw-double-bits
  is ever traced as a bogus pointer (the obstacle from cont 34). GECKO_WJVS_NOGCSPILL disables.
RESULT: t_ctor (the GC-stale-pointer repro: build loop holding `head` across new Node) now CORRECT
(5700000) via the spill ALONE (no barrier); NOGCSPILL -> "unreachable" trap (confirms the spill is the
fix). All 11 gates pass; all 6 benches CORRECT; ratios UNCHANGED (richards 15.0x, deltablue 2.11x,
navier 3.56x) -- the spill is cheap enough (few object slots in practice) to be default with no
regression. This is the foundation: object pointers held across allocations are now GC-safe.
STILL 3/6 at >=2x: the spill alone doesn't move a bench because the sub-2x benches need MORE (splay's
hot loop SplayRun still runs in PBL -- needs method-dispatch-on-reassigned-global + String +
SetAliasedVar + deep inlining + poly GetProp/SetProp; those, when default, regress others -- proven
cont 39 -- until the per-access cost is also made cheap). Next rewrite steps: (2) spill at allocating
CALLS too (not just constructs); (3) compile SplayRun's chain; (4) lean poly access. Multi-session.
