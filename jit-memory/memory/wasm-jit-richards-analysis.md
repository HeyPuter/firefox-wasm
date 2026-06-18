---
name: wasm-jit-richards-analysis
description: "Why the JS->wasm JIT is perf-NEUTRAL on octane-richards (jit ~= interpreter) while deltablue gets ~1.6-2x, and what a real richards 2x would require. Dispatch+allocation bound, not property/arith bound."
metadata:
  type: project
---

INVESTIGATED 2026-06-18 (firefox/js/src/wasm/WasmJS.cpp JIT). Goal was "make richards 2x
like deltablue." Outcome: richards is architecturally JIT-NEUTRAL; a 2x is NOT reachable
with contained IC/store changes. Deep diagnosis below.

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

## REWRITE ATTEMPT 2026-06-18: short-circuit + value-conditions + compile-trigger (the layers)
Pursued the representation/codegen rewrite. Each layer fixed revealed the next; all landed CORRECT
but NEUTRAL, confirming the architecture caps richards.
1. SCHEDULE (:188), the HOT OUTER LOOP, is NEVER COMPILED. Confirmed via [wj-compile]/[wj-enter]
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
