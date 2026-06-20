# Wasm-JIT richards 2x ACHIEVED (~18x, 2026-06-19)

The reused-Ion JS→wasm JIT now compiles the FULL richards hot path (schedule +
deeply-inlined task.run dispatch + addTo) correctly with OptimizeMIR (GVN/LICM/...)
ON, and runs **~18x faster than the PBL interpreter** on richards in the node
embed (`embed-js/`): interpreter ~48,000 µs/run vs opt-JIT ~2,540 µs/run, 0 deopts,
counts correct (richards_runs=12 / queueCount=2322 holdCount=928). The 2x-or-thrown-
away ultimatum is decisively met. Default path: `GECKO_WJVS_IONINT=1` (PBL→Ion, no
Mode V/VS). Measure: `node embed-js/run.cjs /tmp/richtime.js` (warm 40, time 200);
correctness `node embed-js/run.cjs embed-js/t_richards.js` -> richards_runs=12.

## The chain of bugs fixed this session (each was a hard blocker)
All in `firefox/js/src/wasm/WasmJS.cpp`, the `WJIonBuildMIR` builder + backend.

1. **Or/And operand-stack underflow (COMPILE HANG).** JSOp::Or/And PEEK the
   condition (SpiderMonkey leaves it on the stack; the fall-through path has an
   explicit JSOp::Pop). The builder `pop()`ed it -> the following Pop underflowed
   the operand-stack vector to size_t(-1) -> the builder hung. Fix: re-`push(v)`
   on the fall-through after stashing to the logical slot.
2. **boxForStore treated every Int32 as an object pointer.** An i32 in the builder
   is ALWAYS a numeric (bitwise/ToInt32) result; objects flow as boxed i64. The old
   `boxObj(i32)` stored a bogus object Value into numeric fields -> read back as
   NaN/garbage. Fix: boxForStore(Int32) makes an int32-tagged NUMBER Value.
3. **Int-field write/read representation mismatch.** vty1 fields are read as the
   low32 int payload; a compiled write must store an int-tagged Value (boxForStoreInt)
   not a double Value. The SetProp vty must come from the SAME source as the read
   (`gWJFieldVty[(shape<<32)|off]`), NOT gWJPropByName (which disagreed).
4. **Method-load resolved as same-named field.** "queue" is a METHOD on Scheduler
   but a FIELD on TaskControlBlock. getPropField mis-resolved `this.scheduler.queue`
   as the TCB.queue field (wrong shape guard -> deopt -> corrupted stateful schedule).
   Fix: detect the method-call idiom (next op == Swap) BEFORE getPropField.
5. **JSOp::Null as i32 0.** Made it a boxed i64 null (kWJTagNull<<32) so a slot
   holding a field load on one path and null on another merges to a uniform i64
   phi instead of MIRType::Value (no wasm local). asObjPtr still extracts low32==0.
6. **SetElem didn't bump initializedLength/length.** `new Array(n)` then filled
   -> raw element slots written but JS reads saw holes (undefined). Fix: grow the
   ObjectElements header (initializedLength at elements_-12, length at elements_-4)
   to max(cur, idx+1) via a branch-free select.
7. **MTruncateToInt32 emitted trapping i32.trunc_f64_s.** JS ToInt32 must never
   trap. Fix: emit saturating `MiscOp::I32TruncSatF64S`.
8. **THE big one — malformed loop-header phis under OptimizeMIR (the deep-graph
   miscompile).** schedule's 502-block inline tree had loop-header slot phis
   merging Double (the `konst(0.0)` slot init) with Value/i64 (in-loop writes).
   `setBackedgeWasm`'s `entryType==exitType` MOZ_ASSERT is COMPILED OUT in the
   NDEBUG embed build, so a malformed mixed-type phi silently formed; the linear
   NOOPT backend tolerated it but OptimizeMIR's always-on passes miscompiled it
   (loop ran once -> queueCount=1). Fix: **UNIFORM i64 SLOTS** — every local slot
   holds a NaN-boxed i64 Value:
   - slot-zero init = `MConstant::NewInt64(0)` (boxed double 0.0 is bit-identical
     to i64 0); inline-frame arg/local init via boxForStore.
   - every SetLocal/SetArg/SetRval/logical-slot/inline-arg store goes through
     boxForStore; GetLocal/GetArg push the i64 with boxedVty=2 (unbox lazily).
   - direct-mode args (gates) boxed too (Int32->boxObj, Double->boxForStore).
   - **asInt32 of an i64 must be ToInt32(asNumber)** (trunc of the unboxed number),
     NOT low32 — low32 of a double-boxed number is garbage (this broke `it & 7` /
     `acc | 0` on number locals; caught by t_jit gate 729016).

## How it was root-caused (reusable technique)
The crash/hang/miscompile were all found by adding gated diagnostics to the builder:
op-trace, frame-enter trace, a per-block MIR-structure dump (`graph.numBlocks()`,
loop headers, preds/succs), tagging the two deopt-return sites with distinct codes
(5.0 dispatch sentinel vs 6.0 shape guard) read back in WasmJitRunCall, recording
expShape/actShape/guardOff/line/pc of the failing guard, and a `GECKO_WJVS_IONINT_ONLY=<line>`
knob to compile exactly one function. The decisive one: an ACTIVE backedge
type-mismatch check (the disabled MOZ_ASSERT, re-implemented as an fprintf) printed
"entryT=6 exitT=17" -> instantly identified the malformed loop phi. All removed after.

## Remaining knobs / safety (kept in tree, gated)
GECKO_WJVS_NOOPT (skip OptimizeMIR), GECKO_WJVS_IONINT_ONLY, GECKO_WJVS_NOMOVE
(non-movable loads), GECKO_WJVS_IONINT_LOG. Builder safety guards retained:
op-count guard (2M), inline-frame guard (20k), zero-bytecode-length guard.

## Not yet done
Browser octane richards A/B (embed-xul/bench/_t_rich_ab.cjs, needs the heavy
libxul/gecko.wasm build) for the canonical OCTSCORE — node proof is decisive but
the browser score is the user's historical metric. See [[wasm-jit-ion-reuse]].
