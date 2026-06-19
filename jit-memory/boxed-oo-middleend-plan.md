# Plan: the real perf unlock for boxed-OO — an optimizing middle-end for the JS→wasm JIT

Status: design doc, 2026-06-18. Written after executing `richards-2x-rewrite-plan.md` to its
decision point: all five phases built + validated (gated), and **every JIT config still ≤ interpreter
on richards** (full stack ~0.73×). This doc is the larger effort the previous plan scoped OUT.
Companion: `richards-2x-rewrite-plan.md` §8 (empirical results), `memory/wasm-jit-richards-analysis.md`,
`memory/wasm-jit-modevs-unbox.md`, `memory/gecko-wasm-js-wasm-jit.md`.

---

## 1. The diagnosis: why the current JIT can't win on boxed OO

The current JIT is a **transliterator**, not an optimizing compiler. `WJEmitBodyN/V/VS` walk JS
bytecode and emit a fixed wasm template **per op** — every `this.f` emits a full isObject guard +
N-way shape-guard chain + boxed slot load; every arithmetic op emits an isNum guard + unbox + op +
rebox; control flow goes through a relooper `if(pc==i)` dispatch. There is **no IR, no SSA, no value
numbering, no loop-invariant motion, no alias analysis, no real register allocator** (the operand
stack lives in wasm locals, but that is allocation by stack-slot, not by value lifetime).

The key misconception to kill up front: **the win is NOT "store object slots unboxed in memory."**
Modern SpiderMonkey itself stores every `NativeObject` slot as a NaN-boxed `Value`; Ion is fast
because it **hoists the box/unbox/guard out of the hot region** with GVN + LICM + alias analysis +
register allocation, not because the bytes in the heap are raw. We cannot change `NativeObject`
layout anyway (GC, Shapes, self-hosted code, the interpreter, and other realms all read slots as
`Value`). So the lever is the **same one Ion uses: an optimizing middle-end** that removes the
redundant per-op work, keeping fields unboxed **in wasm registers across a region** while they stay
boxed in memory.

Why the host wasm engine (V8) doesn't already do this for us: V8 optimizes the wasm we hand it, but
our emitted code defeats it — the guard chains read/write linear memory (opaque side effects), the
dispatch is a data-dependent `br`/`if(pc==i)` ladder, and calls are `call_indirect` through a shared
table (opaque). V8 will not do **JS-semantic** GVN ("these two `this.f` loads return the same Value
because the shape guard already proved the layout and nothing aliasing wrote in between") — that
reasoning requires JS/shape knowledge V8 doesn't have. We must do it before emitting wasm.

Measured consequence (this session, clean A/B): richards every config ≤ 1.0× (full stack 0.73×);
raytrace typed-field 0.93×; the only real wins (crypto ~3×, numeric kernels) come from `TYPEDLOC`,
which already does a tiny slice of this (keeping *numeric locals* unboxed for a whole function).
Generalizing that slice to **object fields, across loops, with guard elimination** is this plan.

---

## 2. The architecture: an SSA IR between bytecode and wasm

Insert a middle layer. Pipeline becomes:

```
JS bytecode ──▶ [build SSA IR] ──▶ [optimize: GVN, LICM, guard-elim, scalar-repl] ──▶ [lower to wasm] ──▶ host
```

- **IR**: a small typed SSA graph. Nodes for: Constant, GetArg/GetLocal (becomes SSA values via
  phi), GuardShape(obj, shape), LoadSlot(obj, offset), StoreSlot(obj, offset, val), Unbox(v)→f64/i32,
  Box(f64/i32)→Value, arithmetic/bitwise, Compare, Call, GuardIsNum, Phi, Branch/Region (sea-of-nodes
  or block-based CFG — block-based is simpler to lower to the existing relooper). Effects are modeled
  explicitly (a memory-effect edge or an effect token) so the optimizer knows what a Call/Store can
  clobber.
- **Types**: each SSA value carries a lattice type (Int32, Double, Number, Object{shape?}, String,
  Boolean, Null/Undef, Value⊤). Seeded from IC feedback (the existing `gWJICTable`, `gWJSiteFieldNum`
  scaffolding, call ICs) and from constants/op semantics.
- **Lowering**: reuse the *existing* wasm emission helpers (`WJSIsObj`, slot-load emit, `WJVUnboxNG`,
  `WJVRebox`, the relooper dispatch, `WJVSCallHelper`, `call_indirect`) as the IR's lowering targets.
  The GC-traced frame (`gWJFrameMem`) and spill protocol stay; the IR just decides *which* values live
  in wasm locals vs frame and *which* guards/boxes survive.

This is deliberately incremental: Phase A reproduces today's output through the IR (no opts) so we can
A/B the IR layer alone for parity, then turn on one optimization at a time behind a gate.

---

## 3. Phases (dependency-ordered)

### Phase A — IR + lowering parity (foundation, ~4–6 weeks). HIGH effort, LOW risk.
Build the SSA IR, an IR-builder from bytecode (the abstract-interpretation of the operand stack the
emitters already do, but producing nodes instead of wasm), and a lowering pass that emits the **same
wasm** the current Mode VS emitter does. Gate `GECKO_WJVS_IR`. **Acceptance: bit-for-bit-equivalent
perf + correctness** vs the current emitter on all benches. This phase buys nothing on its own — it is
the substrate every real optimization needs, and the chance to get the abstractions right (effects,
types, deopt points) before optimizing. Do not skip the parity gate; an IR that's 5% slower at parity
will mask the optimization wins.

> **STATUS — LANDED 2026-06-18 (first increment, gated `GECKO_WJVS_IR`, default OFF).**
> Implemented in `firefox/js/src/wasm/WasmJS.cpp`:
> - **IR data model**: `WJTy` type lattice (Int32/Double/Number/Boolean/Null/Undef/String/Object/Value),
>   `WJIROp`, `WJIRNode` (op, source pc, up to 3 SSA operand value-ids, result value-id, aux, type),
>   `WJIRValue` (defining node + type), `WJIRRegion`. `WJIRClassify` gives the per-op stack effect +
>   result type; `WJIRBuild` abstract-interprets one straight-line region's operand stack into the SSA
>   value graph (handles Dup/Swap/tee specially; tolerant — stops graph tracking at an unmodeled op).
> - **Integration**: `WJEmitBodyVS`'s per-block loop buffers each straight-line op into the current
>   region (`irRegion`) and flushes (`WJIRLowerRegion`) at the next control-flow op / block boundary.
>   A shadow operand depth (`irDepth`) feeds the loop-top overflow backstop so **exactly the same set of
>   functions compile** as the non-IR path.
> - **Lowering (Phase A)**: `WJIRLowerRegion` builds the graph (substrate for B–D), then emits each op
>   via the same `WJEmitOpVS` the per-op path calls → **byte-identical output**. No optimization yet.
>
> **Parity — PROVEN bit-for-bit** (not just measured). Added a gated per-function module hash
> (`GECKO_WJ_HASH`, FNV-1a over the emitted module bytes); harness `embed-xul/bench/_t_ir_hash.cjs`
> diffs IR-on vs IR-off:
> - richards (20 fns, 17 Mode VS), deltablue (50 fns, 24 VS), navier-stokes (5 fns, 3 VS):
>   **every compiled function bit-for-bit identical** with the IR on vs off.
> - crypto: 8 hash diffs, all *same-length*, several on `modeVS=0` functions the IR never touches —
>   **reproduced exactly by an IR-off-vs-IR-off baseline run**, i.e. pre-existing IC-site-address
>   bake-in nondeterminism (the `gWJICTable`/`gWJSites` addresses assigned by compile order), not the IR.
> - Correctness: no crash / NaN / OOB with `GECKO_WJVS_IR=1` across richards, deltablue, crypto,
>   raytrace, navier-stokes, splay, earley-boyer, pdfjs, box2d. Perf A/B (clean, no debug logging)
>   scatters symmetrically around 1.0× within octane's ±15–30% run-to-run noise, consistent with the
>   proven byte-identity.
>
> **Scope of this increment.** Lowering delegates per op (parity-by-construction), so the value graph
> is built but not yet *consumed* — the lowerer is not yet node-aware. Phase B is where the lowerer
> starts skipping graph nodes (redundant `GuardShape`/`LoadSlot`/`Box`/`Unbox`) instead of delegating.
> The graph is currently block-local (no cross-block phis yet) and field names aren't recorded on
> `GetProp` nodes (needs script access in the builder) — both are Phase B prerequisites, called out here.
> Diagnostic: heartbeat line `phaseA ir-regions=N ir-nodes=M`.

### Phase B — redundant guard + load elimination via GVN (the first real win, ~2–3 weeks).
Global value numbering over the IR: two `GuardShape(o, S)` on the same `o` with no intervening effect
that could change `o`'s shape collapse to one; two `LoadSlot(o, off)` with no intervening clobbering
store/call collapse to one; `Box(Unbox(v))`/`Unbox(Box(x))` cancel. This is **exactly** what kills
richards' per-iteration cost: `isHeldOrSuspended` re-guards `this`'s shape on every `this.state`
read; the `*Task.run` bodies read `this.v1`/`this.state` repeatedly. Needs a conservative **alias
model**: a Call or a StoreSlot to an unknown object clobbers all loads (kill everything); a StoreSlot
to a *different known shape/offset* doesn't. Start maximally conservative (any call/store kills the
load+guard cache) and refine. **This is the within/cross-block CSE that Phase 2b could only do
trivially without an IR.** Gate `GECKO_WJVS_GVN`.

> **STATUS — LANDED 2026-06-18 (first increment, gated `GECKO_WJVS_GVN`, default OFF, boxed path).**
> Implemented in `WasmJS.cpp`:
> - **Value numbering** folded into `WJIRBuild`: frame loads (`GetArg`/`GetLocal`/`GetRval`/
>   `FunctionThis`) are value-numbered via `slotCur[]`/`thisVal`, and `GetProp` results are
>   **hash-consed** — a redundant `(receiverVN, field)` load gets the *same* result VN, so chained
>   reads (`a.b.c … a.b.c`) compose (the inner `a.b` VN matches downstream).
> - **Alias/clobber model** (`WJIRClobbers`): Call / SetProp / SetElem / GetElem / arith clear the
>   available-load set. A data-property `GetProp` is treated as **non-clobbering** so repeated reads
>   compose — SOUND ONLY for side-effect-free data properties (same assumption as the `kVScse` path).
> - **GC-traced cache slots**: reused load results are captured into `kWJGvnSlots` frame slots above
>   the operand stack (traced by `WJTraceRoots`, init'd to Undefined). A moving GC updates a cached
>   object pointer in place — this is what makes holding a cached pointer across later ops safe, the
>   hazard that limited `kVScse`. Frame is only enlarged when GVN is active (`gvnSlots`), so the
>   default build's frame layout/prologue is byte-unchanged.
> - **Node-aware lowering** (`WJIRLowerRegion`): a region with no reuse keeps the byte-identical
>   delegating path; a region with reuse lowers node-by-node, a reused `GetProp` copying its cache
>   slot into the receiver-top slot (net-0 depth) instead of re-emitting the guard chain + load +
>   helper. Diagnostic: `phaseB gvn-hits=K`.
>
> **EMPIRICAL FINDING (the important result).** GVN is correct (octane self-validates internally; no
> crash/NaN/wrong-score with GVN on across richards, deltablue, raytrace, crypto, splay, earley-boyer,
> box2d) and it fires — but **rarely**: raytrace=3, crypto=1 hits (the *same* sites the old `kVScse`
> caught), **deltablue=0**, richards ~0. Perf is within octane's ±15–30% noise on every bench (no
> measurable win). Root cause, now confirmed with data: **within-block, clobber-free repeated property
> reads are rare** in this workload — the hot code is call-dense (every method call clobbers the load
> cache and ends the straight-line region), so the redundancy that matters is **cross-block /
> loop-invariant**, not within-block. This empirically validates the plan's sequencing: the real lever
> is **Phase C (LICM — hoist loop-invariant guards/loads out of the loop)**, which requires **Phase F
> (deopt)** for sound guard hoisting. Pure within-block GVN, however cleanly built, sits at the
> `kVScse` ceiling. **Soundness caveat for default-on**: the non-clobbering-GetProp assumption is
> unsound for accessor properties with side effects (a reused getter wouldn't re-run); making this
> default-on needs a no-getter/data-property guard or the Phase F deopt path. The infrastructure
> (IR + VN + hash-consing + alias model + GC-traced cache + node-aware lowering) is the substrate
> Phase C builds on.

### Phase C — LICM + loop-invariant guard hoisting (~3–4 weeks). Needs Phase F (deopt).
Hoist loop-invariant `GuardShape(this, S)` and invariant field loads out of the loop preheader. For
richards' `schedule` loop, `this` (the scheduler) is loop-invariant → its shape guard runs once, not
per iteration. Hoisting a *guard* changes semantics on failure (the guard must still fire correctly
if the shape ever differs), so a hoisted guard that fails must **bail the whole loop to the
interpreter** at the right bytecode pc — i.e. this depends on Phase F. Without sound bailout, LICM of
guards is unsound. Gate `GECKO_WJVS_LICM`.

### Phase D — scalar replacement / field register promotion (the unboxing win, ~3–5 weeks).
For a field proven (by GVN + alias analysis) to be loaded/stored only through one object across a
region with no aliasing escape, promote it to an **unboxed wasm local** (f64/i32) for the region:
load+unbox once at entry, operate raw, box+store back before any Call/loop-exit/safepoint. This is
`TYPEDLOC` generalized from numeric *locals* to object *fields*. richards' `this.state` bit-ops and
`holdCount++/queueCount++` become raw i32 ops. GC-correctness: while promoted, the field's
authoritative value is in a register, not memory — the store-back must happen before any GC/Call, and
if the promoted value is a *pointer* it must be in a stack-map'd slot (see §5). Start with
**numeric-only** promoted fields (no pointer/GC issue) — that covers richards' integer fields.
Gate `GECKO_WJVS_SCALARREPL`.

> **PHASE D INCREMENT SHIPPED (TYPEDFIELD/TYPEDELEM), default ON 2026-06-19.** A field/element read
> whose value is consumed NUMERICALLY (now via a bounded forward scan `WJFieldNumConsumed`, not just the
> immediately-next op — so `this.x * w.x` types BOTH reads) is emitted straight onto the typed f64 operand
> stack (repr=1), skipping box-then-unbox. Sound on the UNBOX path (the consumer ToNumber-coerces anyway).
> Measured (node harness, `--no-liftoff` TurboFan steady state, max-of-N): **crypto +16%, splay +6%**,
> richards/navier/deltablue within noise, raytrace −3%. Opt out with `GECKO_WJVS_TYPEDFIELD=0`. This is
> the per-read slice of Phase D; full register-promotion across read-modify-write (`holdCount++`) is still
> future work.

### Phase E — calling-convention + inlining that compose with the IR (~3–4 weeks).
(a) **Leaner calls**: replace the `gWJScratch` marshal/`call_indirect`/result-reload (~15–20 mem ops
wrapping a 2-op getter — the measured OO bottleneck) with passing args as actual wasm params where the
callee arity is known, or a register-window convention. (b) **Inlining + cleanup**: the existing
`GECKO_WJVS_INLINE` regresses today because it inlines boxed bodies *and adds guard chains*. In the IR
world, inline → then GVN/LICM/DCE the merged graph → the inlined `this.task.run` dispatch and its
inner `scheduler.*` calls collapse, guards dedup, and the per-call boundary vanishes. Inlining is only
worth it *after* B/C/D exist to clean up after it. Port short-circuit (`&&`/`||`) into the inline path
(the plan's old Phase 3 leftover) as part of this.

> **PHASE E INCREMENT SHIPPED (Math intrinsics), default ON 2026-06-19.** A `Math.*` native call
> (sqrt/floor/ceil/abs/trunc/min/max) is replaced by the wasm `f64.*` op — eliminating the
> wasm→C++→native call-boundary hop. Callee-identity guarded (baked fn ptr) with the generic call as
> fallback; the Math native is matched at observe-time (vs the global `Math.*` fns) and recorded by
> (script,pcOff), then emitted at a recompile (new `hasMathCall` flag triggers the recompile even with
> general inlining off). Measured **+17% on Math-dominated loops**, neutral on octane (Math too sparse
> there). Opt out `GECKO_WJVS_NOMATH=1`. This is the cleanest slice of Phase E (an intrinsic call →
> inline op); the general leaner-call/inline-cleanup work remains (the existing `GECKO_WJVS_INLINE` still
> regresses richards, confirmed clean: inline=83 vs jit=86 vs off=100).

### Phase F — deopt / bailout infrastructure (cross-cutting prerequisite for C/D, ~3–5 weeks). HIGH risk.
Speculative opts (hoisted guards, promoted fields, inlined specialized callees) must be able to
**bail to the interpreter mid-execution at a precise bytecode pc with a consistent interpreter state**
— without double-executing side effects (the no-restart Mode VS rule). This means: at each potential
bailout point, the IR records how to reconstruct the interpreter's locals/operand-stack/pc from the
current wasm state (a "snapshot"/"resume map", à la Ion's snapshots/Recover), materialize promoted/
unboxed values back to boxed frame slots, set the pc, and hand control to the interpreter. This is the
single hardest, most correctness-critical piece (a bad snapshot = silent wrong results or heap
corruption the wasm validator can't catch). It is also what makes B–E *aggressive* instead of
conservative. Build it behind a gate with an exhaustive differential tester (run JIT-with-bailouts vs
interpreter on randomized inputs, compare every observable) before enabling C/D.

> **STATUS — DEOPT-RESUME WORKING incl. CROSS-FRAME / NON-LEAF, 2026-06-18 (gated `GECKO_WJVS_FDEOPT`,
> default −1/off; default build verified clean).** With safe compile-time JitScript provisioning + the
> self-resume model (see blocker 9 below), richards runs `GECKO_WJVS_FDEOPT=1` to a CORRECT score with
> mid-execution bailouts that each resume cleanly in the interpreter — including a NON-LEAF function
> bailing while invoked via `call_indirect` and returning correctly to its wasm caller. No crash on any
> bench (deltablue/earley only *time out* from the brutal forced-every-call cadence). The
> JitScript-provisioning blocker is SOLVED: create it at compile (`WJCompile`) via the normal path —
> enter the script's realm (`createJitScript` asserts `cx->check(script)`) + `ensureJitZoneExists` first;
> doing either wrong corrupts the IC `LifoAlloc`. Built end-to-end plumbing for resume:
> - **Return protocol**: a Mode VS body bails by writing the resume bytecode offset to
>   `gWJScratch[kWJResumePcSlot]`, restoring `gWJFrameSP`, and returning deopt code `3.0`.
> - **Bailout emission** (`WJEmitBodyVS`, gated `GECKO_WJVS_FDEOPT=N`): forced bail at the top of block
>   N, restricted to `JumpTarget`/`LoopHead` boundaries (so the first resumed op resyncs the IC-entry
>   pointer), empty operand stack, boxed path, no-SetArg, no-aliased, `nfixed≤32`. This is the test
>   harness that drives the bailout before a real speculative opt does.
> - **Resume** (`WasmJitResumeViaPBL` in PortableBaselineInterpret.cpp, modeled on
>   `PortableBaselineTrampoline`): a fresh PBL activation entered at `code+pcOff` with fixed-slot locals
>   injected (new `osrLocals` param on `PortableBaselineInterpret`). `WasmJitRunCall` centralizes it
>   (calls it on deopt 3, returns `1`), so PBL *and* `js::Interpret` callers need no resume logic.
> - **GC-staging**: resume locals are copied frame→`gWJScratch` (always GC-traced) before
>   `ensureHasJitScript` (which can GC).
>
> **Blockers found + fixed (in order)**: (1) stale `Interpreter.cpp` extern decl → missing-symbol abort;
> (2) `icEntry` desync entering mid-pc → restricted to `JumpTarget`/`LoopHead`; (3) resumed script had no
> `JitScript` → null `icScript` → `call_indirect` table-OOB → `ensureHasJitScript`; (4) GC of untraced
> resume locals → stage to `gWJScratch`. **(5) ARCHITECTURAL, partially handled**: Mode VS functions call
> each other via `call_indirect` (fast in-wasm path) — a callee bailing returns `3.0` to its *wasm*
> caller, which can't interpret code 3 → trap. Single-frame resume only works for functions entered via
> `WasmJitRunCall`; **a deep bailout needs cross-frame unwinding of the whole wasm call chain** (every
> Mode VS call site must itself bail when its callee resume-bails). Not implemented.
>
> **Debugging note (correcting an earlier dead-end): the wasm IS debuggable via the trap's stack
> trace.** `RuntimeError.stack` carries DWARF function names (`-gdwarf-4`); capturing it untruncated
> (and the full console for `MOZ_CRASH` messages) localizes the abort precisely. There is no native
> binary to gdb (the engine is wasm32-emscripten); the stack trace + targeted `fprintf` + in-code
> bisection are the tools. This drove out every blocker below.
>
> **THE RESUME MECHANISM IS PROVEN SOUND.** With the locals fix, a forced-bailed LEAF function
> (`richards.js:527` `Packet.addTo`) resumes in PBL at the block's pc and runs to completion returning
> `PBIResult::Ok` — correct frame/pc/locals/operand-stack/`this`/realm/env reconstruction. The safe
> configuration (below) runs all of richards/deltablue/raytrace/splay/navier-stokes/crypto to **correct
> scores with no crash**.
>
> **Eight blockers found + fixed (in order)**: (1) stale `Interpreter.cpp` extern decl → missing-symbol
> abort (fixed by centralizing resume so all callers stay 6-param); (2) `icEntry` desync entering mid-pc
> → restrict bailout to `JumpTarget`/`LoopHead` (their first op resyncs `icEntry` from its embedded IC
> index); (3) resumed script had no `JitScript` → null `icScript` → `call_indirect` table-OOB; (4) GC of
> untraced resume locals during JitScript work → stage locals into the always-traced `gWJScratch`;
> (5) `WasmJitResumeViaPBL` didn't enter the function's realm → frame-realm assert (`ContextChecks::check`)
> in exception unwinding → `AutoRealm`; (6) **local order reversed**: `valueSlot(i)=(Value*)frame-(i+1)`
> but PBL sets `sp=frame; sp-=nfixed`, so `sp[i]` maps to `unaliasedLocal(nfixed-1-i)` — inject at
> `sp[nfixed-1-i]` (this was the silent wrong-result bug); (7) `AutoKeepJitScripts` scoped too narrowly
> (must outlive the PBL run); (8) **creating a `JitScript` from the wasm-JIT context (compile OR resume)
> corrupts the zone IC `LifoAlloc`** → a *later* unrelated `AttachBaselineCacheIRStub` traps with memory
> OOB. CONFIRMED by bisection: removing all JitScript creation removes the crash.
>
> **JITSCRIPT PROVISIONING — SOLVED.** Resume runs the body tail in PBL, which needs IC entries (a
> `JitScript`). wasm-JIT'd functions generally don't have one (observed/compiled at warmup 10 via the
> `js::Interpret` path, before/independent of PBL tiering). The fix: create it at compile time in
> `WJCompile` via the SAME path normal tiering uses — `cx->zone()->ensureJitZoneExists(cx)` then
> `script->ensureHasJitScript()` **inside `AutoRealm(cx, script)`** (createJitScript asserts the script
> is in cx's realm). Skipping the realm or the jit-zone init corrupts the IC `LifoAlloc` (blocker 8).
> With this, the bailout's `hasJitScript()` gate passes and the proven resume runs — richards: 112 clean
> resumes, correct score.
>
> **BLOCKER (9) CROSS-FRAME / NON-LEAF — SOLVED via SELF-RESUME, 2026-06-18.** Instead of propagating a
> bail *up* the wasm call chain (which would double-execute callers' side effects), the bailing function
> **resumes itself**: it calls `wjhelp(WJH_RESUME)`, which finishes the body in PBL (`WasmJitResumeViaPBL`)
> from the recorded pc + the fn's own frame (args/locals read from `gWJFrameMem[basesp..]`) + `this`
> (saved to a dedicated frame slot at the prologue, so it survives nested calls clobbering
> `gWJScratch[kWJThisSlot]`), writes the result to `gWJScratch[kWJResultSlot]`, and returns `0` — a
> NORMAL result. So whoever called the bailing fn — C++ `WasmJitRunCall` **or** a wasm `call_indirect`
> caller — is oblivious. This also REMOVED the deopt-code-3 special path in `WasmJitRunCall` (everything
> converges on the normal return). **PROVEN**: richards `FDEOPT=1` runs to a CORRECT score (60) with a
> NON-LEAF function (`richards.js:324` `TaskControlBlock.run`, which calls `this.task.run(packet)`)
> bailing mid-execution while invoked via `call_indirect`, self-resuming, and returning correctly to its
> wasm caller (`[resume-fired] nonleaf=2`). No crash. Single-frame leaf AND cross-frame non-leaf resume
> both work. Restrictions remaining in the `fdeoptOK` scan: no SetArg / aliased-var / lexical-env-push,
> boxed path, nfixed≤32, has a (compile-provisioned) JitScript.
>
> **splay FDEOPT crash — FIXED 2026-06-18.** Root cause: when deopt-resume was reached via the
> `js::Interpret → WasmJitRunCall` entry path (an `InterpreterActivation`), `WasmJitResumeViaPBL` pushed
> PBL frames WITHOUT an enclosing `JitActivation`, so a nursery GC mid-resume mis-traced the frames →
> `ReportBadValueTypeAndCrash`/`unreachable`. Fix: `WasmJitResumeViaPBL` now establishes a
> `mozilla::Maybe<jit::JitActivation>` iff `!cx->activation()->isJit()` (the PBL entry path already has
> one; the js::Interpret path didn't). Proven load-bearing in the new node harness (see below): with the
> guard removed, splay traps `unreachable` via the js::Interpret path; with it, splay + the full core set
> (richards/deltablue/crypto/raytrace/navier/splay/earley) all run correctly under FDEOPT=1, no crash.
>
> **Reproduced + fixed in the NODE harness (`embed-js/`, 2026-06-18).** Built a SpiderMonkey-only 11 MB
> wasm that runs in node (~20s edit→test vs ~7min browser) — see `embed-js/README.md`. The full-build-only
> js::Interpret path is reachable in node via `JIT_OPTION_portableBaselineInterpreter=0` (disables the
> PBL-FORCE default → top-level runs in js::Interpret), which is how the splay crash was reproduced and
> the fix verified without the browser. NOTE: under FDEOPT (force-all-deopt) the self-resume recurses
> across the wasm↔host-wasm boundary; node's default V8 host stack is smaller than chromium's, so the
> octane runners spawn `node --stack-size=8000` (a harness detail, not an engine bug — deep recursion
> only under the brutal force-everything test knob; real deopt is rare).
>
> **OPEN (perf, not correctness): forcing a bailout on every call every iteration is pathologically slow**
> (deltablue: thousands of resumes → timeout, no crash) — fine for the correctness harness, but real use
> must bail *rarely* (only on a genuine speculation failure), and a resume should be cheaper than a full
> PBL re-entry. This is the remaining work to make deopt drive a *perf-positive* speculative optimization.
>
> **Tree state**: all gated behind `GECKO_WJVS_FDEOPT` (default −1/off); default build verified clean
> (richards 53/62). Even FDEOPT=1 is now non-destructive (the `hasJitScript` gate makes it a no-op on
> these benches). Files: `WJEmitBodyVS` bailout + `fdeoptOK` scan, `WasmJitRunCall` deopt-3 staging,
> `WasmJitResumeViaPBL` + `PortableBaselineInterpret` `osrLocals` injection. Harness:
> `embed-xul/bench/_t_fdbg.cjs` (crash-visible: full trap stack + console).

---

## 4. The deopt problem is the crux (read this twice)

Every speculative optimization trades a guard for speed and needs a sound exit when the guard fails.
The current JIT mostly avoids this: Mode N/V *restart* (sound only because they're side-effect-free),
and Mode VS *never bails* (it calls a helper to finish the op in place). Neither supports "bail out of
the middle of an optimized loop after some mutations have happened." Phase F provides exactly that.
Get it right and B–E can hoist/promote/speculate freely; get it wrong and the whole thing is unsound.
Concretely you need, per bailout site: the live bytecode pc, the map {interpreter slot → current wasm
value + how to box it}, and a guarantee that re-entering the interpreter at that pc reproduces the
exact remaining computation without re-running anything already done. This is ~the Ion snapshot
mechanism, ported to the wasm/`gWJFrameMem` world.

---

## 5. GC correctness

- Boxed slots in `gWJFrameMem` are already traced (`WJTraceRoots`, minor+major). Unchanged.
- **Promoted pointer fields** (Phase D) held unboxed in wasm locals are invisible to GC. Rule: only
  promote **numeric** fields initially (no GC edge). To promote pointer fields later you need a
  stack-map: at each safepoint, a description of which wasm locals hold live pointers so the tracer can
  mark/update them — a real stack-map facility this JIT doesn't have yet. Defer pointer promotion.
- Hoisted loads (Phase B/C) of pointer values held across a Call must be spilled to the traced frame
  before the Call (the existing bystander-spill protocol) or re-loaded after. The alias/effect model
  must treat "value crosses a safepoint" as requiring a traced home.

---

## 6. Effort, sequencing, and the 80/20

Full effort: **~5–7 months, one engineer** (A:4–6w, F:3–5w, B:2–3w, C:3–4w, D:3–5w, E:3–4w, plus
hardening). Sequence: **A → F → B → C → D → E**. F before B/C/D because they need bailout; B before
C/D because GVN's alias model is the substrate for LICM/scalar-repl.

If 5–7 months is too much, the **highest-ROI subset** is **A + B** (IR + GVN guard/load elimination,
no deopt needed — GVN that only removes *provably* redundant guards is sound without bailout because
it never removes a guard that could fail differently). That alone should take richards from per-op
guard spam toward "guard once per object per region," and is the single change most likely to move
richards off the interpreter floor. Estimate A+B ≈ 6–9 weeks for a first measurable boxed-OO win.

---

## 7. Success criteria & measurement

- Parity gate (Phase A): IR build within ±2% of the current emitter on all benches (use
  `_t_rich_ab.cjs`, min+median, browser-per-arm; never trust single octane scores — this session was
  bitten by a noisy raytrace 312 that clean A/B showed was 0.93×).
- Per-phase gate: each optimization is default-OFF, A/B'd in isolation, and correctness-checked on the
  full octane set incl. GC-heavy (splay/earley/pdfjs) and numeric (crypto/navier) before stacking.
- Target: richards jit/off ≥ 1.5× as the first real milestone (not 2× — see §8), deltablue ≥ 2×,
  no regression on crypto's ~3×.

---

## 8. Honest ceiling

This is a host-wasm JIT: even a perfect middle-end runs *its output* on V8's wasm, adding a layer
native Ion doesn't pay (no inline machine code, `call_indirect` not direct calls, relooper vs real
branches, a GC it can't see into). Expect to land **meaningfully above interpreter** on boxed OO
(plausibly 1.5–2.5× on deltablue/richards) but probably **short of native Ion's 5–10×**. The honest
question to answer *before* committing 6 months: is boxed-OO throughput worth it for the product's
actual workload, or is the existing 3–10× on numeric/typed-array code (a far smaller lever away) the
better investment? The previous plan's §7 off-ramp still stands; this doc is what to do if the answer
is "yes, we need boxed-OO."

> **§8.1 EMPIRICAL VALIDATION OF THE CEILING (node harness, 2026-06-19).** A SpiderMonkey-only node
> harness (`embed-js/`, ~20s edit→result vs ~7min browser) now makes octane measurable directly.
> CRITICAL methodology finding: the JIT-emitted wasm modules run on host V8, which tiers Liftoff→TurboFan
> *during* octane's 1-second measure window → ~20-50% run-to-run variance that made every prior
> measurement noise. Fix: run node with `--no-liftoff` (TurboFan-only = production steady state) + take
> max-of-N. THEN the picture is stable AND sobering: under TurboFan the JIT's edge SHRINKS vs the Liftoff
> numbers (the host compiler optimizes the PBL interpreter's wasm too). Clean ratios (jit/off):
> **crypto ×3.3, deltablue ×1.19, navier ×1.06, earley ×1.06, raytrace ×0.98, splay ×0.97, richards
> ×0.87.** The JIT WINS on numeric/property-dense code, LOSES on call/allocation-dense code (richards =
> tiny megamorphic methods + Packet alloc; raytrace/splay = `new`-per-op). The losing benches are
> allocation-bound: their CONSTRUCTORS aren't even Mode-VS-capable (`InitProp`/`InitElem` → `vsOK=false`)
> and object allocation goes through a helper. Every load/guard micro-opt (Phase B GVN, shape-guard
> hoisting, frame-init unroll) measured at or below the noise floor — confirming §1/§8: the middle-end's
> load/guard lever is largely spent for this workload. The one clear win was TYPEDFIELD/TYPEDELEM
> (per-read field/elem unboxing, +16% crypto). **The remaining real lever is ALLOCATION** (inline nursery
> bump-alloc + JIT-able constructors), which is the bold next step — but it targets benches the JIT
> currently LOSES, so the realistic outcome is bringing them to ~neutral, not a multiplier. This
> empirically answers §8: for octane, the boxed-OO middle-end's ceiling on the wins is modest; the
> numeric/typed-array strength (crypto ×3.3) is where the host-wasm JIT genuinely shines.
>
> **§8.2 SHIPPED RESULT (default-on, 2026-06-19).** With TYPEDFIELD/TYPEDELEM + Math intrinsics enabled
> by default, the shipped suite (jit/off, TurboFan, max-of-5): **crypto ×3.40, deltablue ×1.50, navier
> ×1.10, raytrace ×1.06, earley ×1.04, richards ×0.89, splay ×0.85**. CONTROLLED gate-toggles (same
> binary, N=8) are the trustworthy signal: TYPEDFIELD is **+9% crypto, +6% splay**, ~neutral elsewhere
> (deltablue −3%, within noise). deltablue's ~1.45× is the JIT's poly-GetProp baseline, NOT a TYPEDFIELD
> effect (the earlier "1.19" was a low-variance sample — deltablue swings 1.2–1.5×). Tried-and-rejected (measured negative/neutral, left
> OFF): `GECKO_WJVS_OBJSET` (inline object-store+barrier: splay −4%, deltablue/raytrace −1%),
> `GECKO_WJVS_LEANINIT` (frame-init unroll/memory.fill: noise), `GECKO_WJVS_INLINE` (method inlining
> still regresses richards: 83 vs 86), `GECKO_WJVS_SHORTCIRCUIT` (compiles `&&`/`||`/`??` functions as
> Mode VS instead of letting them stay Mode V — measured crypto −6%, **deltablue −21%**, splay +4%: the
> short-circuit branches are slower through the Mode-VS relooper than those functions are in Mode V, so
> the `And`/`Or`/`Coalesce` EMIT-FAILs are correctly left to fall back). richards/splay (call/alloc-bound)
> remain <1× — the allocation lever (needs the §8.3/§8.3a 4 components) is the identified unbuilt step.
> NOTE: EMIT-FAIL is common (5-17 fns/bench) but mostly correct fallback — `IsConstructing`
> (constructors = the alloc lever), `And`/`Or` (better in Mode V, above), `Mod`/`Lambda`/etc (rare).

> **§8.3 ALLOCATION LEVER — implementation design (next bold step, GC-critical, gate
> `GECKO_WJVS_INLINEALLOC` default-off).** The benches the JIT loses on (richards/splay/raytrace) are
> `new X(...)`-per-iteration. Today a function containing `JSOp::New` OR `InitProp`/`InitElem` is not
> Mode-VS-eligible (`WJModeVSSupported(New)`=false; InitProp/InitElem set `vsOK=false`) -> it runs in
> Mode V/interpreter, and the allocation itself is a C++ helper hop. Three components, build in order,
> each with a correct helper fallback so correctness never depends on the fast path (octane self-
> validates, so any miscompile shows instantly):
> 1. **InitProp/InitElem in Mode VS** = an add-property IC: guard the receiver from-shape (cached),
>    store the value at the cached slot, set the to-shape (the shape transition is the only extra step
>    vs the existing inline SetProp). Cache {fromShape,toShape,slot} per site (filled at observe like
>    GetProp ICs). Miss -> WJH_INITPROP helper. Makes constructor bodies Mode-VS-able.
> 2. **JSOp::New in Mode VS**: a construct call. Simplest correct first cut: route New to a WJH_NEW
>    helper (correct boundary hop) so `new`-containing functions become Mode VS; measure whether the
>    rest of the function benefits before optimizing the alloc.
> 3. **Inline nursery allocation** (the actual win): at a monomorphic `new X` site with cached `this`
>    shape + slot count, bump-allocate inline -- read cx->nursery position_/currentEnd_ (in SpiderMonkey
>    linear memory, reachable from the JIT module), check fit, write the object header (shape) + init
>    slots to Undefined, bump position_. Nursery-full -> helper. No GC post-barrier for a fresh nursery
>    object's own slots. THE risk: a wrong header/size = heap corruption the validator can't catch --
>    gate it, test every increment with t_jit.js + full octane, keep the helper fallback on every path.
>    Realistic payoff: richards/splay ~0.87x toward ~1.0x (also dispatch-bound), not a multiplier -- weigh
>    against just accepting the interpreter for alloc-bound code (per §8 the numeric strength is the real
>    product lever).
>
> **§8.3a PREREQUISITE found 2026-06-19**: the `WasmJitRunCall`/`WasmJitObserveCall` JIT hooks exist
> ONLY in the interpreter/PBL `Call` paths (Interpreter.cpp ~3294, PBL ~2460), NOT in `New`/`SuperCall`
> (which go through `ConstructFromStack`->`InternalConstruct` with no hook). So a Mode-VS constructor is
> never invoked via the JIT on `new X` today — it runs interpreted. The allocation lever therefore needs
> a 4th component BEFORE the other three pay off: a JIT hook on the Construct path (provide/observe the
> constructor as a JIT entry, handle construct's `this`-creation + return-value rule). This makes the
> feature a major cross-cutting effort (Interpreter Construct + WasmJS Mode-VS New/InitProp + GC inline
> alloc), reinforcing §8's conclusion: for octane, the numeric strength is the better lever; the
> allocation work is only worth it for an allocation-bound product workload.

> **§8.3b GC-BARRIER WALL + the safe recipe (found 2026-06-19).** Inline `InitProp` (component 3) must
> transition the object's shape, and `JSObject::setShape`->`setHeaderPtr` (Cell.h:835) does a
> `PreWriteBarrier(oldShape)` — the incremental-GC pre-barrier that marks the old shape before it's
> overwritten. Omitting it = a use-after-free during incremental GC that octane self-validation will NOT
> catch (incremental GC is timing-rare in short runs) — the worst kind of latent bug. The standard JIT
> way to inline this safely (what Ion does): emit a **barrier-flag check** first. The fast path (the
> common case — no incremental GC marking in progress) needs NO barrier; only when marking is active does
> the old shape need marking. So inline InitProp =
> `if (zone->needsIncrementalBarrier()) { WJH_INITPROP helper (correct+barriered) } else { guard
> obj.shape==fromShape; hit: i64.store val at fixed-slot offset + i32.store toShape at obj+0; miss:
> helper }`. Bake the zone's barrier-flag address; FIXED slots only (dynamic-slot adds need
> `growSlotsForNewSlot`, a C++ call -> helper). Same flag-gated pattern covers the inline nursery
> bump-alloc's post-barrier concerns. This converts §8.3 from "GC-risky handwave" to a concrete, safe,
> standard recipe — but it is still a careful multi-component build (Construct hook + Mode-VS New +
> flag-gated InitProp IC + nursery alloc), each gated + helper-fallback + tested with incremental-GC
> forced on (`JS_GC_ZEAL` / a forced-marking mode) since normal octane won't exercise the barrier path.

> **§8.3c COMPONENT A BUILT + VERIFIED (helper-based, 2026-06-19), gate `GECKO_WJVS_INLINEALLOC`
> default-off.** NewObject/NewInit/InitProp are now Mode-VS-eligible: `WJModeVSSupported` + the vsOK scan
> accept them under the gate; `WJVSNewObject`/`WJVSInitProp` emit calls to new correct helpers
> `WJH_NEWOBJECT` (NewObjectOperation) / `WJH_INITPROP` (DefineDataProperty, leaves obj). VERIFIED: an
> object-literal function `mk(a,b){return {x:a,y:b,z:a+b}}` compiles Mode VS (vsOK=1, no EMIT-FAIL) and
> the result is bit-identical across gate-on / gate-off / jit-off. This is the plumbing foundation — it is
> NOT yet a perf win (each InitProp is a helper hop, slower than the interpreter's inline), so it stays
> default-off until component C (the §8.3b barrier-flag-gated inline add-property IC) replaces the helper.
> Remaining: B (Construct-path JIT hook so constructors are invoked via JIT — §8.3a), C (inline InitProp
> IC — §8.3b), D (inline nursery alloc). Component A is the safe, tested base for them.

> **§8.3d COMPONENT C/D BLOCKED ON VALIDATION (found 2026-06-19).** Baseline's `emitAddAndStoreSlotShared`
> (BaselineCacheIRCompiler.cpp:933) is the canonical reference for inline InitProp: it stores the new
> shape via `storeObjShape(..., EmitPreBarrier)` (pre-barrier on the OLD shape, gated on incremental
> marking), stores the value (no pre-barrier — fresh init), then `emitPostBarrierSlot` on the VALUE (for
> a tenured-obj->nursery-val edge; a no-op when obj is itself nursery-fresh, the common InitProp case).
> So inline InitProp = correct design (§8.3b), but the shape PRE-barrier is GC-correctness-critical and
> CANNOT BE VALIDATED in this harness: `JS_GC_ZEAL` is not compiled into the release `obj-js-emscripten`
> build, so incremental marking (the only path that exercises the pre-barrier) can't be forced; octane
> never triggers it. Writing the barrier inline without a way to test the marking path risks a latent
> use-after-free. REQUIRED NEXT STEP before C/D: rebuild `obj-js-emscripten` with `--enable-gczeal`, add
> a gated `JS_SetGCZeal(cx, <incremental-marking mode>, 1)` to embed.cpp, and validate the object-literal
> micro-test under forced incremental marking. Until then, component A (helper-based, verified, §8.3c)
> is the safe boundary. Component B (Construct-path JIT hook, §8.3a) is independently buildable but only
> pays off once C makes InitProp inline (and only helps constructor benches richards/raytrace, ~neutral).

> **§8.4 NAVIER UNDERPERFORMANCE INVESTIGATED (2026-06-19).** navier-stokes is only ~1.10x (low for a
> numeric bench). Cause: its hot solver fns (lin_solve/diffuse/advect/project) read closed-over grid
> arrays via GetAliasedVar, are NON-mutating, so the compile decision routes them to Mode V -- which
> can't emit GetAliasedVar -> EMIT-FAIL -> they run in the INTERPRETER. Tried routing non-mutating
> aliased-var fns to Mode VS (gate GECKO_WJVS_ALIASEDVS, which DOES emit GetAliasedVar): navier +3%
> only, and richards -4% (JIT'ing a call-bound closure loses to the interpreter). Net negative ->
> default OFF. CONFIRMS the wasm-jit-getaliasedvar "regular-Array ceiling": navier's real bottleneck is
> the boxed regular-Array-of-doubles element access (each dens[IX(i,j)] is a boxed Value load + unbox),
> not the un-JIT'd solver. The navier lever would be raw-f64 dense-double-Array access (treat an
> all-double regular Array like a Float64Array) -- a speculative array-element-type optimization, a
> separate big feature with the same GC/deopt concerns as the others.

> **§8.3e VALIDATION INFRA BUILT + barrier flag located (2026-06-19) — component C now safely writable.**
> Added `--enable-gczeal` to mozconfig.js.emscripten, rebuilt obj-js-emscripten (JS_GC_ZEAL defined), and
> added a gated `JS::SetGCZeal(cx, mode, freq)` to embed.cpp (`GECKO_GCZEAL=<mode>[,<freq>]`). Mode 4 =
> VerifierPre = the pre-write-barrier verifier (catches a MISSING shape pre-barrier — the exact component-C
> risk). VERIFIED: baseline passes `GECKO_GCZEAL=4,200` clean. The barrier-needed flag is
> `JS::shadow::Zone::needsMarkingBarrier_` (a `mozilla::Atomic<uint32_t>` at offset 8 in shadow::Zone =
> sizeof(runtime_)+sizeof(barrierTracer_) on wasm32; barrier needed iff `& Incremental(1)`); for octane's
> single main zone, bake `uintptr(JS::shadow::Zone::from(cx->zone())) + 8` at compile.
> COMPONENT C RECIPE (next): (1) IC arrays per InitProp site — gWJICTable[2*site]=fromShape,
> [2*site+1]=slotByteOffset (16+slot*8 fixed, |kWJDynSlot dyn), + new gWJInitToShape[site]. (2) WJH_INITPROP
> fills them: read obj.shape (fromShape) BEFORE DefineDataProperty, after read obj.shape (toShape) +
> obj->shape()->lookup(name).slot() -> offset; only fill for non-dictionary + FIXED slot (else leave 0 ->
> always-miss helper). (3) WJVSInitProp inline: load baked barrier-flag; if nonzero -> WJH_INITPROP
> helper (barriered). else: i32.load[ti+0]==fromShape ? (i64.store val at ti+offset; i32.store toShape at
> ti+0) : helper. No value post-barrier needed when obj is nursery-fresh (the InitProp case); VerifierPre
> + GECKO_GCZEAL=2 (Alloc, forces tenuring) validates both paths. VALIDATE every increment with
> GECKO_GCZEAL=4,50 + GECKO_GCZEAL=2 on the object-literal test before trusting it.

> **§8.3f COMPONENT C BUILT + GC-VALIDATED + measured (2026-06-19) — feature is NewObject-bottlenecked.**
> Implemented the inline add-property IC for InitProp (gates GECKO_WJVS_INLINEALLOC + GECKO_WJVS_INITINLINE,
> default off): WJH_INITPROP fills {fromShape, fixedSlotOffset, toShape} for native non-dictionary
> fixed-slot adds; WJVSInitProp emits barrier-flag-gated fast path = (i32.load[zone.needsMarkingBarrier_]
> ==0) & (obj.shape==fromShape) & isNumber(val) -> i64.store val at slot + i32.store toShape; any miss ->
> the correct barriered helper. GC-VALIDATED with the verifiers (the whole point of the --enable-gczeal
> build): number-field literal passes VerifierPre (mode 4, pre-barrier) clean; object-VALUED field passes
> Alloc-zeal (mode 2, forced tenuring) clean (object values route to the helper -> post-barrier safe).
> Fast path CONFIRMED running: 1 InitProp helper call (the IC fill) vs ~9000 total on the literal test.
> BUT measured NEUTRAL: on a 200k-iter object-literal loop, jit-off=2.2s, helper-InitProp(A)=3.23s,
> inline-InitProp(C)=3.26s. Two findings: (1) C doesn't beat A because BOTH still pay a WHJ_NEWOBJECT
> helper hop per object -- NewObject (component D, inline nursery bump-alloc) is the real bottleneck, not
> InitProp; (2) the JIT LOSES to the interpreter on small-object allocation (3.2s vs 2.2s) -- the
> interpreter's NewObject+InitProp is tight C++; the wasm JIT's per-object frame setup + helper hop is
> dearer. So even completing D (the MOST GC-critical piece: nursery position_/capacity_ bump + post-
> barrier) is unlikely to beat the interpreter on alloc-bound code. This EMPIRICALLY confirms §8: the
> allocation lever is low-ROI. Component C is a correct, GC-validated, default-off artifact and the
> reusable proof that the barrier-flag-gated inline-IC pattern works; component D is not worth building
> for octane. Net: the allocation investigation is COMPLETE -- the feature cannot beat the interpreter on
> the benches it targets.

> **§8.5 CORRECTNESS BUG in TYPEDLOC found via full-suite regression check (2026-06-19).** Running the
> LARGER octane benches (not in the usual core set) surfaced a JIT MISCOMPILE: **typescript** fails
> (`TypeError: this.checker is null`) with the JIT on but PASSES jit-off. Bisected: it's the typed-locals
> path -- `GECKO_WJVS_NOTYPEDLOC=1` makes it PASS; `GECKO_WJVS_NOUNBOX=1` too. IMPORTANT: it FAILS with my
> shipped wins OFF (`GECKO_WJVS_TYPEDFIELD=0 GECKO_WJVS_NOMATH=1`) -> TYPEDFIELD/Math are EXONERATED; this
> is a PRE-EXISTING `WJAnalyzeNumericSlots` unsoundness (typescript just wasn't in the tested set). zlib
> "fails" too but only because zlib.js needs the shell `read()` builtin the minimal embedder lacks (not a
> JIT bug). FIXED one real cause: `JSOp::Add` was marked always-numeric (-1), but `+` is STRING
> concatenation when an operand is a string, so a local assigned a string `a+b` got typed f64 and
> corrupted. Fix: Add is numeric only if BOTH operands are provably numeric (NUM const/arith or an
> untainted slot), else not-provably-number; + the analysis is now a FIXPOINT (taint grows monotonically,
> re-run until stable) so a slot tainted after its use across a back-edge is caught. (Sub/Mul/Div/Mod/Pow/
> bitwise stay -1: they ToNumber both operands -> always Number.) VERIFIED crypto-safe (`c += num` stays
> typed: c untainted-slot + Mul=-1 -> both numeric) and core suite all correct. BUT typescript STILL fails
> (symptom is this.checker == NULL, not NaN -> likely a corrupted CONDITION local skipping the branch that
> sets checker -- a deeper typed-locals trigger, NOT Add-string). The Add fix is a strict soundness
> improvement (kept, default path).
>
> **§8.5 RESOLVED (2026-06-19): the trigger is typed ARGS, now default OFF.** A category-bisection (debug env
> `GECKO_WJVS_TLDROP=<bits>` forcing each op-class to not-number in one build) was conclusive: tainting ALL
> ENTRY ARGS (`bit4=16`) makes typescript PASS (1783); no body-op class (arith/unary/Add/const) does. ROOT
> CAUSE: a slot is typed from how it is USED, but an arg's VALUE comes from the caller and need not be a
> number. The entry seed coerces (`isNum?unbox:ToNumber`), but typing an arg f64 is only observationally
> equivalent if EVERY use ToNumbers it -- and even that is not enough: entry ToNumber is EAGER (once at
> entry) vs the interpreter's per-use, so it differs on (a) truthiness (`if(x)`: ToNumber(obj)=NaN is FALSY
> but the object is TRUTHY -> wrong branch -> property never set -> `this.checker` stays null, exactly the
> symptom), (b) a copy `y=x` (boxes the f64, losing the object), (c) (strict)equality (identity), and
> (d) throw/valueOf side-effect order, plus across-block uses the straight-line provenance can't see.
> Tainting args on the modeled unsound uses (truthiness/copy/eq via a `taintIfArg` helper) was NOT enough
> (some remaining use/eager-eval gap), so the SOUND fix is: **type LOCALS ONLY by default** (a typed local's
> value is a PROVEN number -- every def is -1 -- so boxing-back, NaN-falsiness, copies are all correct).
> `WJAnalyzeNumericSlots` masks off all arg bits `[0,nargs)` unless `GECKO_WJVS_TYPEDARGS=1` (kept as an
> experiment gate; the `taintIfArg` partial-soundness logic stays active for that path). RESULT: typescript
> PASSES by default (1750), t_jit correct, full core suite correct. Perf cost of args-OFF is SMALL and
> within host-jitter on most benches (crypto early max-of-5 577 vs 576; deltablue gives up ~8% 111 vs 121)
> -- correctness wins decisively. The Add-string fix + fixpoint from the first §8.5 paragraph are also kept.
> FOLLOW-UP for a full build: this lands a correctness fix; rebuild gecko.wasm to ship it.
