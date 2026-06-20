---
name: wasm-jit-richards-analysis
description: "Why the JS->wasm JIT is perf-NEUTRAL on octane-richards (jit ~= interpreter) while deltablue gets ~1.6-2x, and what a real richards 2x would require. Dispatch+allocation bound, not property/arith bound."
metadata:
  type: project
---

INVESTIGATED 2026-06-18 (firefox/js/src/wasm/WasmJS.cpp JIT). Goal was "make richards 2x
like deltablue." Outcome: richards is architecturally JIT-NEUTRAL; a 2x is NOT reachable
with contained IC/store changes. Deep diagnosis below.

## DECISIVE MEASURED VERDICT (2026-06-19): layered JIT CANNOT hit richards 2x
User ultimatum: richards 2x-or-higher or the ENTIRE jit is thrown away; existing code is worthless;
don't waste time on non-2x optimizations. Max-of-3 richards: default=78, STRUCTCF=43 (2x REGRESSION --
structured CF is HARMFUL, abandon), FIELDPROMO=80 (neutral), INTUNBOX=80 (neutral, newly built + correct),
FP+INTUNBOX=79, interp ceiling ~96. EVERY layered rewrite is neutral or harmful. ROOT CAUSE (proven, final):
on SpiderMonkey's BOXED object model, per-op work = shape-guard + boxed-slot-load + unbox = the interpreter's
own per-op work; the JIT only saves bytecode-dispatch but pays it back in NaN-box manipulation + frame memory
traffic + call_indirect dispatch -> nets ~interp, never 2x. richards has LOW field-read redundancy so caching
(field promo) is neutral. CONCLUSION: 2x is UNREACHABLE without changing OBJECT STORAGE.
THE ONLY 2x PATH = type-specialized UNBOXED OBJECT REPRESENTATION: compile richards' monomorphic object types
(Tcb/Packet/TaskState) as FLAT STRUCTS in linear memory with raw unboxed fields accessed by DIRECT CONSTANT
OFFSET (no shape guard, no boxed slot, no unbox) + devirtualize task.run() via a type-tag switch. Bypasses the
boxed model entirely. Ground-up rewrite of how the JIT represents objects (multi-session). De-risk by first
building a richards-SPECIALIZED prototype to PROVE 2x is reachable before generalizing. STRUCTCF/FIELDPROMO/
INTUNBOX polish is now confirmed wasted effort -- do NOT pursue.

## PROOF 2x IS REACHABLE -- richards-specialized unboxed prototype (2026-06-19)
De-risk experiment (user-approved): ported richards to C with FLAT UNBOXED STRUCTS (Packet/Task/Tcb/
Scheduler), direct-offset field access, type-tag switch dispatch, bump-arena alloc -- the ideal a
type-specializing JIT would emit. Compiled to a 2457-byte standalone wasm, run on node V8 (--no-liftoff,
TurboFan -- the SAME backend the JIT targets). Scratchpad files: richards.c, richbench.mjs/richbench2.mjs.
CHECKSUM=232200928 (=2322*100000+928) -> faithful. RESULT: ~100 us/iter vs SM-interp 41670 us/iter =
~320-500x FASTER. Verified REAL (not dead-code-elided): time scales linearly with K, and a cross-wasm-boundary
JS-loop (un-elidable) gives ~80 us/iter. CONCLUSION: 2x is reachable with ENORMOUS headroom -- the JIT needs to
capture only ~2/320 ~= 0.7% of the unboxed representation's win. The boxed object model is the ENTIRE
bottleneck; unboxed flat-struct representation + direct-offset fields + devirt dispatch is PROVEN as THE lever.
Current boxed JIT captures ~0% of this headroom (45862 us/iter ~= interp). NEXT: build unboxed flat-struct
object representation into the JIT (intercept monomorphic-type allocation -> flat struct; field access ->
direct offset load/store, no shape guard/unbox; task.run() -> type-tag switch). To measure interp/JIT us/iter:
scratchpad rich_stub.js + rich_timer.js via `node embed-js/run.cjs rich_stub.js
embed-xul/bench/octane/richards.js rich_timer.js` (GECKO_NOWASMJIT=1 = interp arm).

## CONCLUSIVE: existing JIT (even maxed) CANNOT reach interp, let alone 2x (2026-06-19)
Drilled into WHY with GECKO_DEBUG_JIT on the richards us/iter harness. Findings (all in WasmJS.cpp):
1. schedule() (richards.js:188, the HOT driver loop, thousands of iters) only compiles under STRUCTCF
   (useStruct); with default flags it EMIT-FAILs at WJStackSafe (failLine 7574) -> richards' driver runs
   in the INTERPRETER, calling compiled methods through the bridge. This is why all JIT flags were neutral.
2. isHeldOrSuspended() (309, called EVERY iteration) has `||` -> EMIT-FAILs (modeVS=0) unless SHORTCIRCUIT;
   and WJCallInlinable rejects `||`/`&&`/`??` callees AND callees >60 bytecodes / >8 nfixed -- which excludes
   run()/task.run()/scheduler methods. So schedule's hot calls go through the per-call BRIDGE (call_indirect
   + frame marshalling), which is SLOWER than the interpreter's own call path.
3. Bridge calls are the first tax; raised WJCallInlinable limits (env GECKO_WJVS_INLMAXLEN/INLMAXFIXED) +
   bumped register file (kWJVSMaxStack 48->160) + INLINEDEPTH=8 -> deep poly inlining DID fire (run inlines
   all 3 task types, depth 0-3). But richards us/iter only went 62192->57050 -- STILL WORSE THAN INTERP (41670).
CONCLUSION: even fully inlined + operand-unboxed (structcf+shortcircuit+inline d8+intunbox+fieldpromo+
bumped registers+raised inline limits), compiled richards = 57050 us/iter = 1.4x SLOWER than interp, 570x off
the C ceiling (100 us). The per-op TAX -- shape-guard + boxed-slot-load + unbox PER property access, plus
frame-memory traffic for args/locals -- DOMINATES and makes compiled code slower than the tight C++ interp loop.
Inlining (removing call overhead) and operand unboxing do NOT remove this tax. PROVEN: incremental extension of
the boxed JIT is a DEAD END for richards. The ONLY path is emitting C-like code: flat unboxed structs, NO shape
guards (type-specialized), register-resident state. That is a NEW compilation backend, not an extension.
(Reverted the constant bumps to defaults after measuring; INLMAXLEN/INLMAXFIXED stay env-tunable. INTUNBOX
repr=3 i32 path built + correct + gated GECKO_WJVS_INTUNBOX but neutral, as expected.)

## REAL BOTTLENECK = HELPER CALLS (wasm->C++ boundary), not guards/boxing (2026-06-19, cont.)
Tax breakdown via C variants (scratchpad/richards_tax.c, -DGUARD/-DBOX): ideal=140us, +GUARD=208 (1.5x),
+BOX=148 (1.05x, negligible!). So guards+boxing only ~1.5x -- they do NOT explain the 400x gap. With
GECKO_DEBUG_JIT on the us/iter harness, the maxed JIT's cost is 6.6 MILLION helper calls (wasm->C++ boundary
crossings): Call x845K, SetProp x463K, Ne x463K. Each helper spills/reloads + crosses the boundary.
FIXES BUILT THIS SESSION (all gated, t_jit + richards correct):
1. INLINE-RECORD chicken-egg (the big one): schedule() is the OUTERMOST hot loop so it compiles FIRST,
   before its callees' inline records exist, and never recompiled to pick them up -> its calls were forever
   bridge calls. Fixed: WJRecordInlineCallee now fires as soon as the callee fn is known (right after
   `JSScript* cs = fun->baseScript()` in the call-resolve), BEFORE the standalone-compile/table/arity checks
   -- inlining inlines BYTECODE (WJCallInlinable inspects the script), doesn't need the callee tabled. Now
   schedule inlines run() (verified via INLINE_LOG: caller=L188 callees=324).
2. OBJSET (GECKO_WJVS_OBJSET): inline object-pointer stores. Was crashing (missing putWholeCell) -- the
   barrier method is `inline` in gc/StoreBuffer-inl.h which WasmJS.cpp didn't include; added the include.
   SetProp helpers 463K->148.
3. NULLCMP (GECKO_WJVS_NONULLCMP to disable, default ON): inline Eq/Ne/StrictEq/StrictNe for
   object/null/undefined operands (was helper-only; only number==number was inlined). Sound: both operands
   must be obj/null/undef else helper. Uses Op::SelectNumeric. Ne helpers 463K->0.
RESULT: total helpers 6.6M->2.7M; richards 57050->50943 us/iter (default JIT 45862->43645). Still > interp
(41670). REMAINING DOMINANT TAX = Call helper x864K = the per-iteration isHeldOrSuspended() bridge (it has
`||` so WJCallInlinable rejects it; even compiled-via-shortcircuit it's a bridge CALL not a fast call_indirect).
NEXT LEVER: inline isHeldOrSuspended (needs ||/short-circuit support in the inline body emitter, or make it a
fast call_indirect target). NOTE config: GECKO_WJVS_OBJSET=1 INLMAXLEN=400 INLMAXFIXED=32 STRUCTCF=1 INLINE=1
INLINEDEPTH=8 INTUNBOX=1 FIELDPROMO=1 SHORTCIRCUIT=1. Caveat: timing math suggests helpers alone may not
explain all of the 50ms/iter (vs 0.14ms C) -- frame-memory/per-op overhead may also contribute; re-measure
after Call-helper elimination.

## DEFINITIVE ROOT CAUSE = PER-OP CODE BLOAT (~300 instr/op), proven by wasm dump (2026-06-19)
Dumped the JIT's generated wasm via GECKO_WJ_DUMP=<lineno> (writes /tmp/wjdump-<lineno>.wasm; disasm with
emsdk wasm-dis). markAsHeld (richards:305 = `this.state = this.state | STATE_HELD`, THREE logical ops) =
2542 bytes / 1754 WAT lines / ~900 instructions. Histogram: 156 local.get, 153 i32.const, 63 i32.load,
49 i64.load, 50 if, 14 return, 13 call, 33 i64.store -- and only ONE i32.or of real work. Anatomy:
PER-CALL: SP-overflow check + frame-pointer setup, a FRAME ZERO-INIT loop (zeroes 13 slots to undefined
every call), the RELOOPER loop+pc-dispatch wrapper (gone under STRUCTCF), and 220+ declared locals (the
operand register file x3 reprs) for a 3-op method. PER-OP: each GetProp = isObject guard + shape-word load +
IC-TABLE load(expected shape) + compare + if/else + slot load + NaN-box unpack; each SetProp = guard +
IC-table load + store + barrier branch; each arith = number-check if + op + NaN-box repack; each wrapped in
fast/slow if/else with a return-deopt. ~300 wasm instr per JS op vs ~1 in the C prototype = the 300x gap.
KEY: tax breakdown (helpers ~12%, wasm->wasm call fix only 4%) proved NO single boundary dominates -- it's the
pervasive per-op scaffolding, stacked multiplicatively. So incremental boundary-elimination plateaus at ~interp
(confirmed: best full config ~48750 us/iter vs interp 41670).
THE FIX = LEAN EMISSION via SPECIALIZED RECOMPILE that BAKES runtime-known facts as constants. The IC-table
loads exist only because the JIT compiles before knowing shapes/offsets; but the warm-recompile trigger
(runs==64) already exists, and at that point shapes/offsets ARE known. A specialized recompile emits, for
this.field: ONE hoisted `this.shape==<baked const> else deopt`, then `i32.load(this + <baked off>)` raw
(unboxed when field type known) -- ~20 instr -> ~2. Plus default STRUCTCF (kill relooper) + skip frame
zero-init for non-escaping frames + size the local file to actual need.
FOUNDATION BUILT (this session, compiles + default correct): gWJShapeRec, a (script,pcOff)->{shape,off} map
(struct WJShapeRec near gWJInlineCallee ~line 4293), populated in WJFillIC for own-monomorphic non-poly
GetProp/SetProp sites (right after shapeCell(useWay)=recvShape, ~line 8553). Site indices aren't stable across
recompiles so this is keyed by (script,pcOff) like gWJInlineCallee. NEXT (the consumer, not yet built):
(1) a specialized-recompile flag (extend the runs==64 trigger), (2) in WJVSGetProp/WJVSSetProp, when
gWJShapeRec has the site's (script,pcOff), emit ONE entry shape-guard on `this` (hoisted, deopt on miss) then
direct baked-offset load/store skipping the IC chain, (3) unbox by field type, (4) default STRUCTCF + frame-init
elision. This is the bold rewrite; foundation is in, consumer is the bulk.
ALSO FIXED THIS SESSION (kept, gated/correct): inline-record chicken-egg (schedule now inlines run), OBJSET
(StoreBuffer-inl.h include; SetProp helper 463K->148), NULLCMP (Ne 463K->0, default on), wasm->wasm call on
inline-miss (Call helper avoided but only 4% -- confirming bloat not boundary is the cost).

## BAKING BUILT + measured: code -40%, speed 0 -> the cost is EXECUTED semantics not lookups (2026-06-19)
Built lean-emission BAKING (gated GECKO_WJVS_BAKE, default off, correct): gWJShapeRec (script,pcOff)->{shape,off}
populated at WJFillIC for own GetProp/SetProp (NOT excluding poly -- VS GetProp sites are flagged poly even when
monomorphic; bug found+fixed). Consumer: baked direct-field paths in WJVSGetProp + WJVSSetProp -- shape+off as
CONSTANTS, one shape-compare (no IC-table load) then direct i64.load/store, barrier only for obj values.
Triggered at the warm recompile (runs==64, extended to fire for WJBake() not just hasCall). RESULTS:
markAsHeld 882 instr (raw) -> 872 (structcf) -> 525 (structcf+bake): baking cut 40% of the INSTRUCTION COUNT.
BUT richards speed UNCHANGED: FULL 42450 vs FULL+BAKE 41665 us/iter. So the 40% of instructions baking removed
(IC-table loads) were CHEAP -- TurboFan already cached/folded them; removing them in source = 0 runtime change.
PROBES: GECKO_WJVS_NOINIT (skip frame zero-init) = 42607 ~= 42450 -> frame-init NOT a cost. GECKO_WJVS_NOGUARD
(skip shape guards, unsound) CRASHES richards (poly sites need guards) -> can't isolate guard cost cheaply; only
a SOUND hoist could. C tax-breakdown (richards_tax.c): guards +1.5x, box +1.05x -- small.
SYNTHESIS after exhaustive incremental work: EVERY lever (boundary/helper elimination, wasm->wasm calls, baking,
frame-init skip, structcf, inlining, unboxing) plateaus at INTERP PARITY (~42000 us/iter, was 1.4x worse).
None reaches the 2x bar (~20800) let alone the C ceiling (140). The residual ~300x vs C is the EXECUTED per-op
semantics that TurboFan cannot eliminate (guard branches + NaN box/unbox + frame-memory loads for this/args/
locals + operand-register management), stacked on a 272KB inlined monolith. Baking proved instruction-COUNT is
not the metric (cheap instrs); the EXECUTED semantic ops are. The ONLY thing that removes those is the C model:
typed values in wasm locals/params, no frame memory, no boxing, small functions w/ a real calling convention
(typed params, no operand spill). That is the ground-up rewrite the C prototype embodies -- incremental JIT
work provably caps at interp parity. Next lever to TEST empirically (only sound way to measure guard cost):
hoist the this-shape guard to entry + bare this.field loads; if it (like baking) yields ~0, guards are also
cheap and the cost is frame-memory + boxing -> confirming the full C-model rewrite is mandatory.

## THE REWRITE = REUSE ION'S MIR MIDDLE-END, emit wasm instead of native (2026-06-19 checkpoint)
Current JIT is architecturally a BASELINE JIT (template-per-bytecode, IC-guided, boxed values, frame in linear
memory, per-op shape guards) -> caps at interp parity (the measured ceiling). The 2x win needs the ION tier:
SSA + representation selection + guard CSE/hoist + scalar replacement. Ion's code is IN THE TREE and largely
reusable.
REUSE (compiled-in, ungated, JS-decoupled, ~16-21K lines = the crown jewels that produce the richards win):
- jit/MIR.h (9.6K) + MIRGraph + MDefinition node types = the SSA IR.
- jit/ValueNumbering.cpp (GVN = guard CSE), LICM.cpp (guard hoist), ScalarReplacement.cpp (escape analysis ->
  flat structs for non-escaping richards Tcb/Packet/Task), AliasAnalysis.cpp. These reference NO CacheIR/
  WarpSnapshot/JSScript -- operate purely on MIRGraph. Driven by OptimizeMIR(MIRGenerator*) in jit/Ion.cpp:956
  which is UNGATED (no codegen #ifdef) and ALREADY DUAL-MODE (~13 mir->compilingWasm() branches that skip the
  JS-only passes AND the snapshot/bailout machinery).
PRECEDENT: wasm/WasmIonCompile.cpp's WasmFunctionCompiler builds MIR from non-JS bytecode with its own builder
+ helper methods (binary/add/mul/etc.) and runs OptimizeMIR -> proves the middle-end is front-end-agnostic.
BUILD (the two ends):
1. Front-end: JS-bytecode -> MIR. NOT WarpBuilder (13K, needs CacheIR/Warp/Oracle/full runtime). A focused
   builder modeled on WasmFunctionCompiler, feeding MIR using MY existing IC data (gWJShapeRec shapes/offsets,
   gWJInlineCallee call targets). Encode JS semantics as wasm-level MIR ops: shape guard = MWasmLoad(shape)+
   MCompare+MTest; field = MWasmLoad at const offset; so GVN/LICM hoist the redundant shape-load+compare and
   scalar-replace non-escaping objects. Build in COMPILINGWASM MODE (pass wasm CodeMetadata) -> avoids JS
   coupling, values are wasm-typed (Int32/Double/Pointer).
2. Back-end: MIR -> wasm bytes (NOVEL; Ion has MIR->LIR->native, wasm has wasm->MIR->native, none do MIR->wasm).
   Walk optimized MIRGraph, emit each SSA value as a wasm local (V8/TurboFan does register allocation), CFG from
   MIRGraph blocks (reuse my structured-CF emitter), guard-miss MTest -> my existing deopt sentinel (return 1.0,
   re-run PBL) -> SKIP Ion snapshots/bailout entirely. Reuse my wasm-emission machinery in WasmJS.cpp.
EXACT SETUP RECIPE (from WasmIonCompile.cpp:11384-11463 + jit/MIRGenerator.h:40):
  LifoAlloc lifo(TempAllocator::PreferredLifoChunkSize); TempAllocator alloc(&lifo); JitContext jitContext;
  CompileInfo compileInfo(nlocals);  // wasm ctor: explicit CompileInfo(unsigned nlocals), CompileInfo.h:128
  MIRGraph graph(&alloc);
  JitCompileOptions options;
  MIRGenerator mirGen(nullptr/*CompileRealm*/, options, &alloc, &graph, &compileInfo,
                      IonOptimizations.get(OptimizationLevel::Wasm), &codeMeta /*wasm CodeMetadata -> compilingWasm()*/);
  // build minimal/real graph (MBasicBlock entry, MConstant, MWasmReturn), then:
  OptimizeMIR(&mirGen);   // runs GVN/LICM/ScalarReplacement/AliasAnalysis in wasm mode
BUILD CONFIG NOTE: the embed is JS_CODEGEN_NONE (no native backend, expected). Middle-end source is compiled in
(jit unified objects jit3/jit14/jit9 are 1MB+; MIR/ValueNumbering/Ion in unified TUs jit6/jit9/jit14) and is
ungated, so it should LINK + RUN (pure MIRGraph transforms, no MacroAssembler). FIRST EXECUTABLE STEP next
session: a smoke-test that does the recipe above + a trivial graph + OptimizeMIR, wired into the embed (env-gated
fn in WasmJS.cpp), to confirm it runs under CODEGEN_NONE (vs assert/crash). If it runs -> build front-end then
back-end. If it asserts -> lift MIR.cpp/MIRGraph.cpp/ValueNumbering.cpp/LICM.cpp/ScalarReplacement.cpp/
AliasAnalysis.cpp into a codegen-independent TU (no assembler deps -> mechanical). The jit headers must be
#includable from WasmJS.cpp's TU (Unified_cpp_js_src_wasm4) -- watch include order.

## Measured (clean sequential, browsers killed between runs, _t_crashprobe.cjs)
- richards: jit ~= off ~= 51-65 (NEUTRAL; the JIT neither helps nor hurts). Noisy +-15%.
- deltablue: jit/off ~= 1.6x (138 vs 84) -- REAL win.
- Both are OO with polymorphic dispatch. The difference is the WORK MIX, not OO-ness.

## Why deltablue wins and richards doesn't (the key asymmetry)
deltablue is property/arith-DENSE: lots of `.length`, field reads (poly GetProp IC inlines
them, see [[wasm-jit-modevs-getprop-poly-length]]) and NUMBER-valued field stores (the inline
SetProp fast path already handles numbers). So per call it does real inlinable work -> the JIT
beats the interpreter. richards is DISPATCH-bound: the hot chain is
`Scheduler.schedule -> currentTcb.run() -> this.task.run(packet) -> scheduler.release/queue/...`,
each method tiny (a few ops). `this.task.run` is 4-WAY MEGAMORPHIC (Idle/Worker/Handler/Device).
Per-call compute is trivial; the CALL BOUNDARY + dispatch + allocation dominate.

## Heartbeat diagnostics at steady state (GECKO_DEBUG_JIT; lower the WJMaybeLogDeopts gate
## to fire on a short single-bench run -- it is wall-clock gated at 1s and the timed octane
## run is brief). For richards:
- runs ModeV(fast)=0  ModeVS(slow)=ALL. Every compiled fn is Mode VS (mutating/OO). Expected.
- Steady state: ~0 deopts, megamorphic-misses=0, helpers mostly DRAINED (ICs filled). So NOT
  helper-bound, NOT deopt-bound, NOT megamorphic-call-miss-bound. The 4-way call IC + poly
  GetProp absorb the dispatch shape variety.
- inlined=0 even though inlinable(leaf)=4: the inliner (GECKO_WJVS_INLINE, default OFF) only
  inlines small straight-line/simple-CF MONOMORPHIC LEAF callees. richards' hot calls are
  non-leaf (run->task.run->scheduler.*) and/or megamorphic (task.run) -> out of reach. Enabling
  GECKO_WJVS_INLINE measured NO change on richards (still ~62).
- 6-7 functions FAIL to compile (run interpreter); the 10 that compile run slow Mode VS. Net neutral.

CONCLUSION: Mode VS generated wasm for richards is ~as fast as the PBL threaded interpreter.
The per-op type-guard/boxed-stack overhead + relooper pc-dispatch + call marshalling roughly
cancels the interpreter-dispatch savings, and richards has little inlinable straight-line
arithmetic to amortize them.

## Object-valued SetProp: investigated + implemented (gated GECKO_WJVS_OBJSET, default OFF)
HYPOTHESIS: richards stores OBJECT pointers into properties constantly (link/queue/task refs);
the inline SetProp fast path is MONOMORPHIC and NUMBER-ONLY (WJSIsNum guard) -- it inlines only
number stores to skip the GC post-write barrier; object stores fall to the generic
js::SetProperty helper. So richards' writes are helper-bound while deltablue's number stores
inline. FIX BUILT: keep the inline shape-guarded raw slot store (the slot IC caches OWN
FIXED-slot writable data props only -- WJFillIC line ~6552 `prop->slot()<nfixed` -- so a raw
i64 store is correct for ANY Value), and for non-number values emit a LEAN (no spill/reload,
no exc-check) WJH_POSTBARRIER call doing the standard generational barrier:
`if (obj->isTenured() && val.isGCThing()) if (sb=val.toGCThing()->storeBuffer()) sb->putWholeCell(obj)`
(mirrors NativeObject::elementsRangePostWriteBarrier). CORRECT (validated: richards/splay/earley/
deltablue/crypto all valid scores, no NaN/crash -- richards heavily exercises it). But MEASURED
NEUTRAL on richards AND splay. Likely because their hot SetProp sites are POLYMORPHIC (multiple
receiver shapes) and miss the monomorphic IC -> still take the full helper; and the call
boundary/dispatch/alloc dominate anyway. Kept gated default-OFF (no GC-barrier risk in default
path) until a POLY SetProp IC makes it actually fire. WJH enum index 32 (safe: gWJHelpKind[kind++]
is guarded `kind<32`, so it is just unhistogrammed).

## BUILT 2026-06-18: polymorphic + non-leaf + depth-2 inlining (gated GECKO_WJVS_INLINE, off)
The "substantial task" was built and is CORRECT, but EMPIRICALLY confirms richards' 2x is NOT
reachable via inlining. Three extensions to the existing leaf-only monomorphic inliner:
1. NON-LEAF (default; GECKO_WJVS_LEAFONLY to revert): WJCallInlinable now ALLOWS Call/CallContent/
   CallIgnoresRv (rejects only New/SuperCall/SpreadCall). An inlined callee may contain calls; the
   inner call emits via WJEmitOpVS->WJVSCall in the sub-context as a NORMAL call. WJStackSafe already
   models call stack effects via js::StackUses/StackDefs.
2. POLYMORPHIC (default; GECKO_WJVS_NOPOLYINLINE to revert): gWJInlineCallee records up to 4 callees
   per (script,pcOff) (WJInlineRec struct + WJRecordInlineCallee dedup). WJVSCall emits a guarded
   if/else-if chain of inline bodies (one per callee, guard low32(callee)==fn_i), final else = generic
   call. Refactored the single-callee body into an `emitBody` lambda looped over candidates.
3. DEPTH (GECKO_WJVS_INLINEDEPTH, default 2): replaced the `!c.inlined` recursion guard with a
   `c.inlineDepth < N` counter. NEEDED because richards' megamorphic `this.task.run` is reached one
   level BELOW the monomorphic `currentTcb.run()` -- depth 1 inlines TCB.run, depth 2 inlines task.run
   (poly, 4 task types). Nested WJEmitInlineCFG relooppers SHARE kVSpc2 safely (each fully controls it
   during its own loop; the outer rewrites it before its own branch -- verified correct).
RESULT (all gated off by default, validated no NaN/crash on richards):
- richards poly depth-2 inline ~= 63 vs baseline ~= 60 -> NEUTRAL. Collapsing schedule->TCB.run->
  task.run removes 2 call frames/iter but the scheduler.* calls INSIDE task.run remain (depth-3), and
  Packet allocation + boxed property access dominate. Inlining is not the bottleneck.
- deltablue under inline measured LOWER (~108 vs ~140-197) but confounded by browser-contention noise;
  inlining may also bloat hot property-dense functions (code size / register pressure). NOT default-on.
CONCLUSION: the inliner is a correct, general capability (kept gated GECKO_WJVS_INLINE=off) but does
NOT move richards. richards is allocation- and boxed-work-bound; no inlining depth fixes that. The 2x
is genuinely out of reach without typed/unboxed object storage + faster allocation. NOTE on measurement:
richards swings +-15% and leaked headless-chromium from prior runs skews sequential A/Bs -- pkill -9
chromium between runs and prefer interleaved low-contention measurement; small (<10%) wins are at the noise floor.

## DEFINITIVE root cause (confirmed 2026-06-18 with inline log + count-based heartbeat)
- richards does NO allocation in the hot scheduler loop: all `new Packet`/`new *Task`/`new
  TaskControlBlock` are in runRichards SETUP (richards.js:51-62, 126-157), called once. The
  earlier "allocation-bound" guess was WRONG.
- Inlining DOES fire: with GECKO_WJVS_INLINE=1 the heartbeat shows `inlined=10 polyways=6`
  (the polymorphic depth-2 inliner collapses schedule->TCB.run->task.run incl. the 4-way
  megamorphic task.run). Score STILL ~55-62 == interpreter. So calls are NOT the bottleneck.
- Steady state: 100% Mode VS, ICs warm, ~0 deopts, megamiss=0, helpers drained.
=> The bottleneck is the per-op NaN-BOXED VALUE WORK on integer object fields: every
`this.state & FLAG` / `== STATE_x` is GetProp(shape guard + boxed slot load) -> isNum guard +
unbox -> int op -> box -> SetProp(shape guard + store). The PBL interpreter does the same
boxing; Mode VS only removes bytecode dispatch (and adds its own relooper dispatch + frame-
memory traffic), so it is ~interpreter-speed on boxed integer OO. The relooper dispatch is a
linear `if(kVSpc==i)` chain (WJEmitBodyVS ~6289) -- O(K) per block transition -- but the host
wasm engine likely lowers a dense int if-chain to a jump table anyway, so a br_table rewrite is
uncertain ROI for a large/risky restructure.

## CONCLUSION: a real richards 2x is BLOCKED BY THE VALUE REPRESENTATION, not any incremental
## pass. It requires UNBOXED type-specialized object fields (store int fields as raw i32 in the
## object slot, guard-on-shape, operate raw) OR scalar-replacement/loop-invariant CSE of the hot
## property loads + guard elimination. That is Ion-scale work (shape-based type inference +
## unboxed slot layout + guard hoisting + reg alloc), NOT deliverable as incremental build-cycle
## changes, and even then partly capped by the boxed-Value object model. Inlining (built this
## session, gated GECKO_WJVS_INLINE) is correct + general but does not move richards.
## MEASUREMENT CAVEAT: richards swings +-15% and is the noise floor for validating <1.2x wins.

## CORRECTION 2026-06-18 (later session): point #1 below is WRONG. schedule DOES compile.
schedule (:188) reaches WJCompile fine (on its 2nd call, after its internal loop drives warm-up via
the existing LoopHead incWarmUpCounter -- the trigger was never the problem). It was EMIT-FAILing and
getting permanently marked Failed because it has a value-condition `if(this.currentTcb.isHeldOrSuspended())`
(JumpIf on a CALL result) that Mode VS rejects unless GECKO_WJVS_SHORTCIRCUIT is ON. Turn short-circuit
ON and `[wj-compile] richards.js:188 mutates=1 vsOK=1 hasCall=1 firstUnsup=-` -- it compiles, no OSR
needed. BUT compiling schedule REGRESSES richards (jit/off ~0.84x vs ~0.91-1.0x with it interpreted):
Mode VS is slower than the PBL interpreter for the dispatch-dense boxed loop. Worse, short-circuit ON
also REGRESSES deltablue (1.53x -> ~1.03x) by compiling more boxed-OO fns to slow Mode VS. So
short-circuit is kept DEFAULT OFF (non-regressive: richards 1.0x, deltablue 1.53x). Full A/B matrix +
the corrected analysis are in jit-memory/richards-2x-rewrite-plan.md §8. Bottom line UNCHANGED and now
QUANTIFIED: every JIT config is a net loss on richards (0.82-0.91x); 2x is blocked by the NaN-boxed
object data model (needs out-of-scope unboxed-slot storage), exactly as this memory concludes.

## REWRITE ATTEMPT 2026-06-18: short-circuit + value-conditions + compile-trigger (the layers)
Pursued the representation/codegen rewrite. Each layer fixed revealed the next; all landed CORRECT
but NEUTRAL, confirming the architecture caps richards.
1. SCHEDULE (:188), the HOT OUTER LOOP, is NEVER COMPILED. [** SEE CORRECTION ABOVE: this is WRONG --
   it compiles once short-circuit is ON; the trigger was never the issue. **] Confirmed via
   [wj-compile]/[wj-enter]
   debug prints: it never even reaches WJCompile. Cause: the JIT compile trigger observes a callee
   only when called with getWarmUpCount() >= 100 (PBL line ~7877; Interpreter.cpp ~3278). PBL's
   warmUpCount counts FUNCTION ENTRIES, not loop back-edges. schedule is the once-per-iteration outer
   loop -> called few times -> warmup stays low -> never observed, while its frequently-called callees
   (TCB.run, task.run, scheduler.*) all compile. Lowering the threshold 100->10 compiled MORE helpers
   (addTask:179, isHeldOrSuspended:309) but STILL not schedule (called < 10 times). The proper fix is
   OSR / counting loop back-edges toward warmup so loop-heavy outer functions get compiled -- a real
   but nontrivial PBL change, and likely still neutral (see #3).
2. VALUE-TYPED BRANCH CONDITIONS + SHORT-CIRCUIT (built, gated GECKO_WJVS_SHORTCIRCUIT, default off):
   Mode VS only handled `cmp; JumpIf` (cmp result on the wasm stack) and BAILED on `if(value)` (e.g.
   `if(currentTcb.isHeldOrSuspended())` -- a JumpIf on a CALL result) and on &&/||/?? . Ported Mode V's
   logic into WJEmitBodyVS: WJComputeEntryDepth (replaces WJStackSafe's depth-0 rule, allows depth-1
   merge blocks), a kVSphi local, spillIfPhi, And/Or/Coalesce handling, value-producing comparisons
   (WJVSCmp asValue -> boxes the 0/1 into a boolean Value), and ToBoolean for value-typed JumpIf
   conditions. Added And/Or/Coalesce to WJModeVSSupported. This is what would let schedule (value
   if-condition) and isHeldOrSuspended (returns `a||b`) compile -- but schedule is gated earlier by #1.
3. Even with EVERYTHING compiled, richards stays ~neutral: Mode VS (NaN-boxed operand stack + per-op
   type guards + relooper dispatch) is ~PBL-interpreter speed for boxed-integer OO dispatch. Proven:
   all 16 richards functions EXCEPT schedule compile, and richards is still ~60-67 == interpreter.
Also lowered the compile-observe threshold 100->10 (PBL) AND added loop-back-edge warm-up counting
at PBL's LoopHead (`frame->script()->incWarmUpCounter()`) -- ACTIVE in the default build, validated
non-regressive (richards=52-67 crypto=557 deltablue=198, all correct).
4. NEITHER PBL change got schedule compiled (:188 still absent from WJCompile). Conclusion: schedule
   (and runRichards) run in the C++ INTERPRETER (Interpreter.cpp), NOT PBL -- so PBL-tier changes
   (threshold, LoopHead warm-up) never reach it. Interpreter.cpp has its OWN observe hook (line ~3278,
   still threshold 100, no loop-warmup). To get the hot outer loop compiled you must ALSO patch
   Interpreter.cpp (lower its threshold + add LoopHead warm-up), OR add OSR. UNTESTED whether compiling
   schedule helps (it MIGHT: it would convert schedule's ~5 calls/iteration from interpreter->wasm
   boundary crossings (WasmJitRunCall marshal/enter/exit) into cheap wasm->wasm call_indirect -- a
   DIFFERENT cost than the per-op Mode-VS-≈-interpreter neutrality). That boundary-elimination is the
   one remaining untested upside; everything else points to architectural neutrality.
5. PATCHED BOTH interpreters (PBL + Interpreter.cpp: threshold 100->10 AND LoopHead warm-up via
   incWarmUpCounter under !IsBaselineInterpreterEnabled / __EMSCRIPTEN__) -- schedule (:188) STILL
   never reaches WJCompile (absent from [wj-enter]). WasmJitObserveCall(schedule) is never invoked
   despite loop-warm-up. RESISTS 4 targeted interpreter-tier fixes (incWarmUpCounter may not feed
   getWarmUpCount() here, or schedule is called too few times for the call-site observe to retrigger,
   or another path). Default build stays CORRECT + non-regressive with all changes (richards 52-57,
   crypto 557, deltablue 198). FINAL: richards 2x is blocked by (a) the hot outer loop never being
   submitted for compilation (interpreter-tiering; needs real OSR / deeper trigger fix) AND (b) Mode
   VS being ~interpreter speed for NaN-boxed OO even when compiled. Both deep; (b) caps the payoff
   even if (a) is solved.

## What a REAL richards 2x needs (a major multi-part effort, likely still alloc-capped)
1. POLYMORPHIC SetProp IC (N-way, like GetProp) + object-store inlining -> object writes inline.
2. POLYMORPHIC INLINING of `this.task.run` (inline all 4 task.run bodies guarded by callee id)
   and non-leaf monomorphic inlining (collapse schedule->TCB.run) -> remove the call boundary.
3. LEAN call boundaries generally (the WJVSCallHelper spill/reload + wasm<->C++ crossing is the
   floor cost; the lean WJH_POSTBARRIER call shows the pattern).
4. Cheaper relooper dispatch for branchy code.
5. richards allocates Packets constantly (`new Packet`); allocation goes through the runtime for
   BOTH jit and interpreter and is not accelerated -> a hard cap on the reachable speedup.
See [[wasm-jit-modevs-unbox]], [[gecko-wasm-js-wasm-jit]], [[wasm-jit-modevs-getprop-poly-length]].

## RE-CONFIRMED 2026-06-19 (fresh independent investigation, cleaner quantification)
Asked again to "deliver 2x on richards." Re-investigated from scratch with the node harness
(`--no-liftoff`, max-of-8) and reached the IDENTICAL conclusion as the 2026-06-18 sessions, now
crisply quantified:
- **jit-off (pure PBL) = 102; JIT default (hybrid) = 81-83; everything-Mode-VS = 56.** The JIT
  LOSES at every config. 2x (~200) is ~2.5x the best JIT score on a workload where the JIT is
  underwater.
- ISOLATED the two costs: (a) boundary thrash -- compiling only SOME hot fns makes the loop cross
  wasm<->interpreter every iteration; (b) Mode-VS codegen overhead. Fixing (a) alone moved
  everything-VS 43->56, but it's STILL 1.8x slower than PBL with ZERO boundaries -> (b) dominates.
- DISASSEMBLED (added `GECKO_WJ_DUMP=<lineno>` -> /tmp/wjdump-*.wasm, then `wasm-dis`): a 7-line
  method (`TaskControlBlock.run`) emits **9,507 bytes / 5,195 lines of wat**. Per-op cost = NaN-box
  tag-checks + box/unbox + frame-memory i64.load/store + relooper pc-dispatch + per-access shape
  guards. GC=0.2% (NOT alloc-bound -- the steady-state loop allocates nothing; confirms the earlier
  correction). Operand stack IS in wasm locals (good); the boxing/guards are the cost.
- SHIPPED a real (gated) improvement: non-mutating `&&`/`||`/`??` functions (e.g. isHeldOrSuspended)
  now ROUTE to Mode VS instead of EMIT-FAILing in Mode V (new `hasSC` -> modeVS branch in WJCompile,
  active when GECKO_WJVS_SHORTCIRCUIT=1). Lets the whole hot chain compile (43->56). Plus value-branch
  root-causing: `schedule` fails at `WJStackSafe` (line ~2346, JumpIf on a non-cmp value); the
  scEnabled path uses WJComputeEntryDepth instead. Added `gWJVSFailLine` structural-bail diagnostic.
- VERDICT (3rd independent confirmation): **2x on richards is blocked by the NaN-boxed value model.**
  The ONLY path is lever #1 = a type-aware operand stack that keeps OBJECT POINTERS unboxed (extend
  `WJVSCtx::repr[d]` with a 3rd state = i32 object ptr + parallel local array; teach GetProp/SetProp/
  Call receiver paths to consume it) + structured CF (replace the relooper). This is the Phase D
  middle-end -- pervasive, high-risk to the 14 passing benches, days of work, and even the plan's §8
  honest ceiling is only "plausibly 1.5-2.5x" with the FULL middle-end. Published analysis artifact.

## PROTOTYPED + DISPROVEN lever #1 (operand unboxing) 2026-06-19 -- the key empirical result
Built the leading "unboxed value" hypothesis as a working, correct prototype (gated GECKO_WJVS_PTRUNBOX,
default OFF): extended `WJVSCtx::repr[d]` with a 3rd state (==2 = unboxed i32 object ptr in a parallel
local block kVSsBaseP). `FunctionThis` produces it (sloppy `this` is ALWAYS an object -> cache its wrapped
i32 ptr; the boxed Value stays live in s[d] so all other consumers + materialize are unaffected -> a NO-OP
materialize for repr=2). `WJVSGetProp` consumes it (receiver repr==2 -> skip the per-access load+isObject+
i32.wrap, straight to the shape-guard ways). VALIDATED correct (t_jit + benches, both gates).
RESULT (max-of-8/12, the noise-filtering methodology): **NEUTRAL everywhere** -- richards 81->81,
deltablue 126->125, crypto 584->616 (median overlap; the higher max is an outlier). Single-run "gains"
(richards 68->78) were pure noise.
WHY NEUTRAL (the important correction to the cost model): the operand stack ALREADY lives in wasm LOCALS
(registers), not linear memory (WJSLoad of a stack slot is a LocalGet, see WJVSIsStack). So the box/unbox/
tag-check PTRUNBOX removes are CHEAP REGISTER OPS TurboFan already handles -- NOT the bottleneck. The real
cost is the **shape-guard MEMORY loads + slot MEMORY loads** (per property access) + the relooper pc-dispatch
+ raw op count, none of which operand-unboxing touches. => lever #1 (operand unboxing) is DISPROVEN for this
workload. Remaining levers: GUARD HOISTING/GVN (shape-guard the receiver once per loop, not per access --
but GVN was already measured neutral) and RELOOPER->structured-CF. Default build kept byte-identical
(conditional 9th local group only when PTRUNBOX on). Net: richards 2x conclusively not reachable via operand
representation; it needs redundant-memory-access elimination (guard/load hoisting) + structured CF, i.e. the
full Ion-scale middle-end, whose own ceiling barely reaches 2x.

## COMPLETE LEVER MATRIX + "compound" hypothesis DISPROVEN (2026-06-19, exhaustive)
Measured EVERY lever and combination (max-of-8, --no-liftoff). richards: PBL(off)=102, default(hybrid)=80-83.
- PTRUNBOX (unboxed obj-ptr operands): 81  NEUTRAL
- PTRUNBOX + this-shape-guard-load HOISTING (built: kVSthisShape caches this.shape, reused across a
  region's guards, invalidated at blocks + non-pure ops): 82  NEUTRAL (the "levers compound" hypothesis
  is FALSE -- combined still neutral; richards' this.field accesses are block-separated + comparison-
  separated so the hoist rarely fires)
- NOUNBOX+GVN (guard/load elim): 84  NEUTRAL
- INLINE (removes calls + their scratch-memory marshaling), depth 2-3: 82-85  NEUTRAL -> CALL OVERHEAD
  is NOT the cost either
- short-circuit / +GVN / +INLINE (compile the whole loop): 57-58  WORSE (relooper loop penalty)
RESIDUAL: the persistent ~20% loss (80 vs 102) survives unboxing+guards+inlining, so it is the ONE thing
all those configs share: the **PBL->wasm call boundary** (schedule runs in PBL, calls wasm methods every
iteration via the host bridge = wasm->JS->wasm). The only way to remove it is to compile `schedule` too so
schedule->method is wasm->wasm call_indirect -- but compiling schedule via the RELOOPER costs more than the
boundary saves (->57). So the boundary can only be removed via STRUCTURED CF (compile schedule's loop without
the relooper penalty), and even then the ceiling is ~PBL PARITY (~100, +25% over today's 80), NOT 2x.
FINAL: richards 2x is impossible for this architecture (no per-op codegen advantage on object-dispatch code;
the JIT's only edge is unboxing numerics, of which richards has none). Best reachable = ~parity via structured
CF + boundary elimination. All experiments gated default-OFF, default build byte-identical, t_jit + 14 benches
correct. Architectural requirements to even reach the ~2x ceiling: typed-SSA + type specialization + LICM/GVN
on a real CFG + structured CF + a register-args calling convention -- i.e. an Ion/Warp-class optimizing JIT.

## STRUCTURED CF BUILD STARTED (2026-06-19) -- the big change, foundation done
Reframed: the WINNING config (structured-CF + full-inline) is UNTESTED and could reach the plan's ~1.5-2x
ceiling, because it removes ALL the JIT's current overheads at once: relooper pc-dispatch (TurboFan can't
recognize the loop), the PBL<->wasm boundary (compile the driver loop -> wasm->wasm call_indirect), and call
marshaling (inline). Every config measured so far had at least one of these. KEY ENABLER: operands live in
wasm LOCALS (WJVSIsStack -> LocalGet), so control flow is "pure" -- a reducible CFG can be emitted as real
nested wasm loop/block/if while REUSING the existing per-block body emission; only the skeleton + terminator
targets change. BUILT + VALIDATED the foundation: `WJAnalyzeCFG` (gated GECKO_WJVS_STRUCTCF, struct WJCFG)
computes per-block successors (from terminators), DFS reverse-postorder, back-edges (rpoIndex[v]<=rpoIndex[u]),
loop headers, over reachable blocks. Bugs found+fixed: (1) `auto& [b,ci]=stk.back()` dangled after push_back
realloc (UB -> nondeterministic post.size()); use value copies + in-place increment. (2) bytecode has
unreachable trailing blocks after Return/RetRval -- don't bail on post<K, structure only the reachable set.
VALIDATED on richards: addTo(527, while-loop) -> reducible=1 loopHeaders=1; isHeldOrSuspended/tcb.run ->
reducible=1 loopHeaders=0 (correct). Default build BYTE-IDENTICAL (analysis only runs under STRUCTCF+DEBUG).
NEXT (the big remaining piece): the structured EMITTER -- emit nested loop(for headers)/block(for forward
merges)/if from WJCFG in RPO, reuse WJEmitOpVS for block-body ops, remap terminators (Goto/JumpIf/Return/
fallthrough) from "set kVSpc; br $dispatch" to direct `br` at the structured label depth; integrate operand
spill/reload (entryDepth/phi for value-branches), deopt (WJH_RESUME), unbox materialize at branches. Then
combine with the inliner (depth 4) to inline the whole hot tree into schedule and measure -- THE untested
2x-candidate config. Gate it; relooper stays the fallback for irreducible/unsupported CFGs.

## STRUCTURED EMITTER BUILT, has a SYSTEMATIC OOB bug (2026-06-19) -- in-progress
Built the full structured emitter (gated GECKO_WJVS_STRUCTCF): WJCFG analysis (successors/RPO/back-edges/
dominators[Cooper-Harvey-Kennedy]/merge-nodes/loop-spans) + a Ramsey-style recursive emitter (emitNode/
withBlocks/codeForNode) emitting nested wasm loop(headers)/block(merge nodes)/if, reusing WJEmitOpVS for
block bodies, remapping terminators to structured `br` via a scope-label stack ($fnexit outermost, loop
scopes for back-edges, block scopes for merges). Value-branches handled (ToBool, no phi). useStruct gate:
reducible + no &&/||/?? + !inlined + !deopt. Skips the WJStackSafe/entryDepth check (structured handles CF).
STATUS: COMPILES, default BYTE-IDENTICAL + correct (gate off). BUT every structured richards function throws
"memory access out of bounds" at runtime -- a SYSTEMATIC miscompile (even a single function via
GECKO_WJVS_STRUCT_ONLY=<lineno> OOBs; even no-call funcs via GECKO_WJVS_STRUCT_NOCALL). t_jit "passing" was
a false positive (its fns fell back to relooper). So the emitter is NOT yet correct. DEBUG LEADS: the OOB
(not a validation error) = a wrong FRAME SLOT address at runtime, so the bug is operand-depth/frame-slot
tracking, not wasm-stack balance. Suspects: (1) emitBlockBody resets c.depth=0 per block but maybe a block
is entered with a live operand; (2) the cmp-leaves-i32-on-wasm-stack across the emitBlockBody-return /
emitNode-emits-`if` boundary may interact wrongly with a loop/block scope opened BETWEEN them (for a loop-
header cmp-branch, `loop` is emitted, THEN cond+cmp, THEN `if` -- the i32 lives across the loop-open, fine,
but verify); (3) operand-stack-in-locals (WJVSUseLocals) vs the structured block reentry; (4) the epilogue/SP
interaction. NEXT: add per-op operand-depth assertions or dump the emitted wat for ONE structured function
(GECKO_WJ_DUMP) and inspect the frame offsets. Debug helpers in place: GECKO_WJVS_STRUCT_ONLY/_NOCALL,
[wj-struct] log. The CFG analysis + dominators are correct + reusable; the emitter skeleton is the part to fix.

## DEBUGGED: 1 bug FIXED, acyclic WORKS, 1 loop bug LOCALIZED (2026-06-19)
Isolated repros in scratchpad (s1=straight-line, s2=if/else, s3/s4=loops, sf/sf2=loop+arith). Findings:
- ACYCLIC structured CF is CORRECT: s1 (o.s=o.x) and s2 (if/else o.s=o.x/o.y) match the relooper exactly.
  So block bodies, merges (Ramsey block scopes), value-branches (ToBool), and `if/else` all emit correctly.
- BUG #1 FIXED (was the systematic OOB/nondeterminism): `WJAnalyzeCFG` assigned rpoIndex with `for i<g.K`
  but g.rpo only has post.size() (reachable) entries -> read g.rpo[K-1..] OUT OF BOUNDS -> garbage rpoIndex
  -> wrong back-edge detection -> miscompiled loops nondeterministically. Fix: loop `i < g.rpo.size()`.
  After the fix the CFG is correct (s4: blk0->blk1[loop hdr]->{blk2->blk1 back-edge, blk3 exit}, idoms right).
- BUG #2 OPEN (loops still NaN after #1): LOOPS miscompile while ACYCLIC works. wat trace of s4's loop body
  back-edge: just before `(br $label$13)` it does `(i64.store (i32.add fb (i32.const 16)) $10)` -- a store to
  frame slot 2 (fb+16) that shouldn't happen in a `o.s=o.s+1` loop body. The SetProp leaves its rhs value on
  the operand stack + a trailing Pop; the operand stack is NOT cleanly empty at the back-edge, so a stale
  operand (loaded from a global at 449808) gets written to a frame slot, and the NaN is an uninitialized/
  Undefined frame slot read as f64. ROOT-CAUSE LEAD: emitBlockBody does not handle the operand-stack
  discipline at the back-edge the way the relooper does (the relooper resets per-block + the Goto handling).
  Likely fix: at a T_GOTO back-edge, the operand stack must be empty (depth 0); ensure Pop/SetProp-value are
  consumed, or assert depth==0 at terminators and bail (fall back) otherwise. NEXT: trace s4 frame slots /
  c.depth at the back-edge; the relooper's per-block depth=entryD(0) + its terminator handling is the
  reference. Acyclic correctness proves the core; only the loop back-edge operand handling remains.

## STRUCTURED CF COMPLETED + DISPROVEN as the 2x path (2026-06-19) -- KEY NEGATIVE RESULT
Fixed BOTH bugs and the structured emitter is now CORRECT for simple CFGs (all 7 isolated repros
s1-s5/sf/sf2 -- straight-line, if/else, merges, single loops, value-branches -- match the relooper exactly):
- BUG #1 (fixed earlier): rpoIndex OOB write.
- BUG #2 (fixed): brDepth did not count the wasm `if`/`else` nesting level. A `br` inside an if-arm was
  off by one -> loop back-edges/exits targeted the wrong scope (loop continued instead of returning ->
  function fell out returning undefined -> NaN). Fix: push a sentinel scope (-2) around the if-arms so
  brDepth includes the if nesting. (Acyclic worked by luck: the merge block-end immediately follows the
  if-end, so the off-by-one was harmless there; loops are not forgiving.)
- BUT on the REAL octane suite (GECKO_WJVS_STRUCTCF=1): deltablue FAILS (miscompile on a complex CFG --
  nested loops/switch my emitter still mishandles), crypto is PATHOLOGICAL (87s vs ~10s, ~8x SLOWER),
  richards is WORSE (45 vs 68). So structured CF, even when correct, produces SLOWER code than the
  relooper AND has remaining miscompiles on complex CFGs.
=> CONCLUSION: the relooper pc-dispatch is NOT the richards bottleneck. TurboFan optimizes the relooper's
`loop{if(pc==i)}` fine; my structured nesting (deep merge-block scopes) is worse, and complex CFGs
(deltablue/crypto nested loops) miscompile or go pathological. The "structured CF + inline = 2x" hypothesis
is DISPROVEN -- structured CF hurts, it doesn't help. This is the LAST untested lever; combined with the
exhaustive lever matrix (operand-unbox/guard-GVN/inline/frame-init all neutral, skip-dispatch regresses
deltablue), richards 2x is comprehensively unreachable on this host-wasm JIT: its only edge is unboxing
NUMERICS (none in richards), and every CF/codegen lever is neutral-or-worse. StructCF kept gated DEFAULT-OFF
(correct for simple CFGs, a reusable experiment; relooper is the better lowering). Default build verified
byte-identical + correct (richards 68, deltablue 120, crypto 566, t_jit OK).

## STRUCTURED CF NOW FULLY CORRECT, ROBUSTLY DISPROVEN (2026-06-19, final)
The earlier deltablue-FAIL + crypto-87s were a THIRD bug, now fixed: TERNARY `?:` (and any value-crossing
merge) leaves a result value on the operand stack across a join (entryDepth==1, a phi); the structured
emitter resets depth per block and has no phi -> miscompiled/pathological. Fix: exclude functions with any
entryDepth==1 block (via WJComputeEntryDepth) from useStruct -> they fall back to the relooper. (Value-
branches if(call()) are fine: the value is consumed AT the branch, depth 0 after.) RESULT with the emitter
now CORRECT (deltablue passes, crypto normal): structured CF is GENUINELY SLOWER on OO benches -- deltablue
68 vs 120, richards 34 vs 68, crypto neutral 591 vs 566. So it is NOT a bug, it is the relooper being the
better lowering: TurboFan optimizes `loop{if(pc==i)}` well, and the structured nesting + per-block direct
WJEmitOpVS (no IR/CSE/GVN buffering the relooper path uses) is worse. DEFINITIVE: the relooper is NOT the
richards bottleneck; structured CF hurts. Combined with the full lever matrix, richards 2x is unreachable on
this host-wasm JIT. The ONLY thing that could win on boxed-object dispatch is unboxed object-field storage /
Ion-class type specialization -- requires changing SpiderMonkey's shared object model, out of scope for a
host-wasm JIT layered on it. StructCF + CFG-analysis kept gated/reusable; default JIT intact.

## SCALAR REPLACEMENT (field promotion) BUILT + PROVEN, NEUTRAL on richards (2026-06-19) -- corrects the theory
Built the OTHER proposed lever: FIELDPROMO (GECKO_WJVS_FIELDPROMO), a multi-entry field read-cache --
a GetProp on a known receiver slot reuses a cached wasm local instead of re-emitting shape-guard+slot-load;
invalidated at stores/calls/alloc; works under unbox+inlined; within-block (kVSfcBase i64 local block,
fcRecv/fcField in WJVSCtx). PROVEN CORRECT + EFFECTIVE on redundant reads: synthetic `var a=o.box;var b=o.box;
var c=o.box` -> i32.load count 160->56 (3.5x fewer), correct. BUT on richards: NEUTRAL (84 vs 80). REASON
(corrects the earlier "scalar replacement beats boxed dispatch" theory): richards has NO REDUNDANCY to
eliminate -- it reads each object field ~once per iteration (any repeat has an intervening write/call =
barrier), so there is nothing to cache. Numeric fields are already handled by TYPEDFIELD (f64 stack, repr=1,
skipped by the cache). So richards' cost is NOT redundant field access -- it is that each NECESSARY boxed
access costs the same shape-guard+slot-load as the interpreter, plus host-wasm overhead, with no redundancy
to exploit. fp+inline+shortcircuit (the inlined-monolith) = 60 (the inline is slow regardless; promotion
doesn't rescue it). => BOTH proposed architectures (structured CF AND scalar replacement) are now BUILT and
empirically refuted on richards (slower / neutral, for different confirmed reasons). richards' per-op work is
identical to the interpreter and irreducible; the JIT cannot beat it. FIELDPROMO is kept gated default-OFF
(a correct, reusable win for REDUNDANCY-heavy property code -- not richards). Default JIT byte-identical+correct.
FINAL richards deliverable: skip-dispatch +12% (toward the interpreter ceiling); beating the interpreter is
impossible on this architecture for this workload.

## REFRAME (2026-06-19): user says perf is only visible AFTER the FULL Ion-lite rewrite, all flags COMBINED
User: "dont worry about measuring individual performance, you will only see it after the massive rewrites...
and only after all of these flags are combined." So the individual-neutral results are expected; the win
needs the COMPLETE integrated middle-end. Stopped per-flag measuring; now building the pieces to be CORRECT
+ COMPOSABLE, combine, measure only at the end. PROGRESS (all gated, default byte-identical + correct):
- STRUCTURED CF (GECKO_WJVS_STRUCTCF): correct for reducible CFGs (excludes ternary/&&-||/inline).
- FIELD PROMOTION / scalar replacement (GECKO_WJVS_FIELDPROMO): multi-entry field read-cache, NOW FUNCTIONAL
  for `this.field` (added FunctionThis receiver tracking via kWJThisRecvSentinel) with PRECISE per-field
  store invalidation (SetProp F invalidates only field F; calls/SetElem/alloc clear all). Proven: this.box
  across stores 163->59 loads; redundant object reads 160->56. Cross-block in structured CF (save/restore
  cache per branch arm, clear at loop headers + merges).
- PTRUNBOX (unboxed obj-ptr operands) + CFG/dominators (Cooper-Harvey-Kennedy) -- reusable substrate.
- MILESTONE: the FULL combination (STRUCTCF+FIELDPROMO+INLINE+SHORTCIRCUIT+depth4) runs ALL 8 tested benches
  CORRECTLY (richards/deltablue/crypto/raytrace/navier/splay/earley/regexp, no FAIL) -- the pieces COMPOSE.
SOUNDNESS CAVEAT to resolve before any default-on: field promo's precise invalidation assumes the inline
GetProp/SetProp fast path doesn't GC (true) and a miss deopts (true), BUT boxed ARITHMETIC on non-numbers
can GC (valueOf) and move a cached object pointer -> stale. Sound for numeric-arith code (richards) + the
tested benches pass, but general default-on needs an arith barrier when operands aren't provably numeric
(repr!=1), OR GC-traced cache slots (like GVN's kWJGvnSlots). REMAINING for the win: full typed-SSA unboxing
(lean per-op wasm) + guard hoisting + receiver value-identity across inlined frames (so this.state in
inlined isHeldOrSuspended and inlined run share the cache). Multi-session Ion-lite build; pieces composing.

## FIELD PROMO EXTENDED to numeric fields + cross-block correctness (2026-06-19, continuing)
- Added F64 field caching: numeric fields (repr=1, e.g. richards this.state consumed by &/==) are now
  cached in a parallel f64 local block (kVSfcBaseF, kWJFieldPromoN f64 locals) -- previously skipped
  (only boxed repr=0 cached). f64 cache is GC-SAFE (numbers, no pointers). fcRepr[i] tracks i64-vs-f64.
- FIXED a miscompile: the structured-CF branch save/restore saved fcRecv/fcField but NOT fcRepr ->
  stale repr on a HIT after a branch -> wrong reuse. Now saves all three. Full combo correct again.
- WHERE THE REDUNDANCY LIVES IN RICHARDS (and why it's not captured yet): isHeldOrSuspended reads
  this.state TWICE but across the `||` short-circuit branch -> needs CROSS-BLOCK promo, but `||`
  EXCLUDES the fn from structured CF (only structured does cross-block; relooper field-promo is
  within-block). And the bigger win -- this.state read in isHeld AND in run on the SAME tcb -- needs
  CROSS-FRAME receiver identity (the inlined frames' `this` are distinct slots; must value-number them
  to the same object). So the remaining REQUIRED pieces (all needed combined, per the user):
  (1) value-crossing-merge (phi) support in structured CF so &&/||/?? fns structure + get cross-block promo;
  (2) operand VALUE-NUMBERING with inline propagation so inlined this.field on the same receiver shares the
      cache (the cross-frame redundancy -- the main richards opportunity);
  (3) typed-SSA lean unboxing (raw i32 ptrs/ints, no explicit NaN-box wasm) so per-op wasm is cheaper than
      the interpreter -- the thing that lets the call-free inlined monolith actually BEAT the interpreter.
  All gated, default byte-identical+correct. The full combination already runs all benches correctly;
  these 3 are what make the perf appear (per user: only visible after the full rewrite, all flags combined).

## THE REMAINING BOLD REWRITE = UNBOXED VALUE REPRESENTATION (the difference-maker, 2026-06-19)
User goal: bold LARGE rewrites for richards, no micro-tuning, ignore other benches. The large rewrites DONE
+ composing correctly: structured CF, scalar replacement (field promo boxed+f64), PTRUNBOX, CFG/dominators.
The ONE large rewrite that actually beats the interpreter (not yet built): UNBOXED VALUE REPRESENTATION.
WHY it's the lever: every hot value is a NaN-boxed i64 manipulated by EXPLICIT wasm tag ops (i64.shr/and/eq/
wrap/or) -> a 7-line method = ~9500 bytes -> the compiled code does MORE per op than the interpreter's
inlined-C++ Value ops. richards = object pointers + small int flags. Representing them as RAW i32 (no tag
manipulation) through the hot path makes the per-op wasm LEANER than the interpreter -> the inlined +
structured + field-promoted monolith does LESS work per op -> beats the interpreter. This is the only thing
that does (every other lever caps at interp). SCOPE: a new operand representation repr==3 = raw i32 (int or
obj-ptr), parallel i32 local block (like kVSsBaseF for f64), every op produces/consumes/boxes/unboxes it,
deopt on type mismatch (richards-shaped: ints + ptrs, bail on anything else -- fine since other benches don't
matter). As big as the existing f64-unbox path. Combined with the DONE pieces (inline call-free + structured
loop + field promo) this is the full richards Ion-lite. NEXT-SESSION START POINT: add WJIntUnbox gate +
kVSsBaseI32 local block + repr==3 in WJVSCtx; route int ops (BitAnd/Or/Xor/cmp/Inc/Dec on int operands) +
GetProp-of-int-field + object-ptr operands through i32; materialize(box) at branches/calls/stores; deopt
guard on non-int/non-ptr. The CFG/structured/field-promo infra is all in place + gated + composing.
