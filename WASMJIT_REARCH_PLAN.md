# Re-architecting the JS→wasm JIT: WarpBuilder front-end reuse + a first-class MIR→wasm backend

**Status:** design / proposal. Companion to `WASMJIT_ION_GAP.md` (the gap analysis). This
document records the architectural discussion and lays out a full, phased implementation
plan with a gate ladder.

**One-line thesis:** the current JIT hand-rolls the *bytecode→MIR front-end* (the subtle,
bug-prone, incomplete part) and bolts the *MIR→wasm back-end* into application code. The
correct long-term shape is the inverse emphasis: **reuse SpiderMonkey's `WarpBuilder`
front-end wholesale** (we can legitimately feed it a real `JSScript`), and **promote the
MIR→wasm emitter to a first-class in-tree backend module** (at the MIR level — *not* a new
`JS_CODEGEN` arch). This kills the §1/§5/§6/§8 problems from the gap analysis in one move,
at the cost of one concentrated, mostly-mechanical backend-engineering project.

---

## 0. Where we are (recap)

The JIT lives in `firefox/js/src/wasm/WasmJS.cpp` (the `WJ*` / "reused-Ion" path, default
`GECKO_WJVS_IONINT=1`). It builds Ion MIR by hand in `compilingWasm()` mode from JS
bytecode, runs `OptimizeMIR`, then emits wasm bytes by hand. The host engine (V8) compiles
that wasm to native code. This build is `JS_CODEGEN_NONE`: there is **no native codegen of
any kind** in-process (`MacroAssembler`/`Lowering`/`CodeGenerator` are `MOZ_CRASH()` stubs
in `jit/none/`; both wasm compilers report unavailable).

Measured state (node octane, `IONINT=1`): **3/6 sub-benches ≥2×** — richards ~15–20×,
navier ~3.5×, deltablue ~2.1× (borderline); raytrace ~1.0×, splay ~1.4×, earley ~0.9× (all
correct). The 40-iteration conclusion in the memory docs: this architecture wins big on
inlinable numeric/dispatch code, and the laggards are bounded by per-operation overhead
(boxing + poly diamonds + call boundary) and an unbounded opcode-coverage grind — both
**properties of the hand-rolled front-end**, not of Ion's middle-end.

### Current code footprint (measured)

| Component | Lines | Character |
|---|---|---|
| Front-end `WJIonBuildMIR` / `buildFrame` (bytecode→MIR + inliner + dispatch + boxing + CSE) | ~2,740 (WasmJS.cpp 9970–12710) | stateful, subtle, **incomplete**, ~all documented bugs live here |
| Back-end `WJIonEmitValue` (MIR node → wasm) | ~500 (9099–9599), ~20 node kinds | mechanical, ~25 lines/node (many <10) |
| Back-end `WJIonEmitBody` (CFG linearization via `br_table` dispatch loop) | ~370 (9599–9970) | mostly node-agnostic |
| Oracle `WJReadBaselineICs` (hand-decodes CacheIR) | ~rest | feeds the front-end |

For reference: the engine defines **625 MIR node kinds** (`jit/MIROps.yaml`); the current
file names only **19** — octane's working set is small with a long tail.

---

## 1. What can and cannot be reused (verified verdicts)

These were checked against the source in this tree, not assumed.

| Ion component | Reusable? | Evidence / reason |
|---|---|---|
| `MIR.h` / `MIRGraph` / `OptimizeMIR` | **Yes (already)** | runs under `JS_CODEGEN_NONE`; smoke-tested |
| GVN, LICM, **RangeAnalysis, EffectiveAddressAnalysis, WasmBCE, Sink, AliasAnalysis, reordering** | **Yes (already run)** | all enabled at `OptimizationLevel::Wasm` (`initWasmOptimizationInfo`); "only GVN+LICM" was wrong — see `WASMJIT_ION_GAP.md` §0a. They mostly find nothing because our graph starves them (one `WasmHeap` alias tag, boxed values, hand-rolled guards) |
| ScalarReplacement | runs but **no-op today** | keys on JS-tier `MNewObject`/`MStoreFixedSlot`; **comes alive** if the graph is built by WarpBuilder (§3) |
| `inlineInterpreted` auto-inliner | off in wasm mode | comes back via WarpBuilder (JS-tier compile) |
| **`WarpBuilder` front-end** (bytecode→MIR) | **Yes, if fed a real `JSScript`** | codegen-free (no `MacroAssembler` refs → runs under `CODEGEN_NONE`); produces complete, typed, bailout-shaped JS-tier MIR. "Too coupled" was about the *current wasm-mode setup*, not a wall |
| `WarpOracle` (builds the IC snapshot) | **Yes** | needs `cx` + main thread + Baseline `JitScript`/ICs — we have all of these |
| CacheIR transpiler **decode layer** (`WarpCacheIRBase`, `readStubWord`/`*StubField`) | **Yes** | JSContext-free; can replace the ad-hoc `CacheIRReader` in `WJReadBaselineICs` |
| CacheIR transpiler **MIR output** | only via WarpBuilder | emits JS-tier nodes + resume points; only meaningful inside a WarpBuilder compile |
| **MIR→native backend** (`GenerateLIR`/`CodeGenerator`/`MacroAssembler`) | **No** | emits *native code, not wasm bytecode* (wrong target) **and** is `MOZ_CRASH()`-stubbed here. No MIR→wasm-bytecode emitter exists anywhere but our own |
| `Bailouts.cpp` / `JitFrames.cpp` frame reconstruction | **No** | native-coupled; we replace it with resume-to-PBL (§4) |

**Key facts (file:line):**
- `compilingWasm()` is *defined* as `CompileInfo::script()==nullptr` (`jit/CompileInfo.h:155`).
  So feeding WarpBuilder a real script necessarily flips `compilingWasm()` to **false** —
  you get the full JS pipeline, not the wasm subset.
- `MResumePoint` carries the per-slot operand mapping (`getOperand`/`numOperands`,
  `jit/MIR.h`) — the exact value→interpreter-slot state needed for resume-at-pc deopt.
- WarpBuilder / transpiler / oracle contain **zero** `MacroAssembler`/`CodeGenerator`
  references → they instantiate and run fine under `JS_CODEGEN_NONE`.

---

## 2. The two architectural decisions

### Decision A — reuse the WarpBuilder front-end (feed it a real JSScript)

We *can* give WarpBuilder a real `JSScript`; the reason the project didn't is a **cost
trade, not an impossibility**. Doing so flips `compilingWasm()` to false and yields
complete, properly-typed, bailout-shaped JS-tier MIR for the whole function.

**What it buys** (each is a standing problem in `WASMJIT_ION_GAP.md`):

| Current pain | Resolved by WarpBuilder |
|---|---|
| §8 unbounded opcode-coverage grind | full JS coverage for free |
| §1 uniform-i64 boxed slots (the overhead ceiling) | WarpBuilder MIR is properly typed (unboxed where CacheIR/TI proves a type; `MBox`/`MUnbox` only at real boundaries) |
| §5 ScalarReplacement dead | **alive** (keys on `MNewObject`/`MStoreFixedSlot` that WarpBuilder emits) → non-escaping allocations vanish (helps splay/raytrace) |
| §6 hand-rolled inliner, 4-way cap, no cost model | Ion's real `inlineInterpreted` + dispatch + budget |
| §2 deopt-by-restart (unsound for stateful fns) | `MResumePoint` hands you the exact state map at every pc |

**What it costs** — concentrated in the backend and the deopt mechanism (see §4–§7).

### Decision B — make the backend a first-class in-tree MIR→wasm module, NOT a `JS_CODEGEN` arch

The instinct "stop bolting hacks into WasmJS.cpp, make it first-class" is correct. The
*form* "new `JS_CODEGEN_WASM` arch" is the wrong level. A `JS_CODEGEN_*` type means
implementing `Lowering-*` + register allocation + `CodeGenerator-*` + `MacroAssembler-*` —
a layer built around three assumptions wasm violates:

1. **Physical registers.** LSRA allocates a finite register file; wasm has *infinite
   locals* and **V8 re-allocates anyway**. Running LSRA produces assignments you throw away.
2. **Flat code + arbitrary `jump(Label)`.** `MacroAssembler`/`CodeGenerator` emit a linear
   stream branching to labels; wasm has **only structured `block`/`loop`/`if`/`br`**. A
   label-based assembler fights the target — you need a relooper/stackifier regardless.
3. **A huge, native-shaped `MacroAssembler` surface** (thousands of methods) — most of it
   impedance-mismatch glue if retargeted to wasm.

So the LIR/regalloc/MacroAssembler layer is the *least* wasm-suited part of Ion. The right
level is **MIR** — emit wasm directly from optimized MIR, SSA-values-as-locals, host does
regalloc. The current emitter is already at this level; its sin is packaging.

**Therefore:**
- **Keep `JS_CODEGEN_NONE`** — it is *accurate*: this build has no native codegen. The
  JS→wasm JIT emits *guest* wasm for the host; it is an additional backend that **coexists**
  with `NONE`, not a replacement arch. Modeling it as a mutually-exclusive `JS_CODEGEN`
  choice would be wrong.
- **Add a real module** `jit/WasmBytecodeBackend.{h,cpp}` (or `wasm/WasmFromMIR.cpp`): a
  first-class consumer of optimized MIR, parallel to `GenerateLIR`+`CodeGenerator` but
  emitting wasm bytes. Gate with an explicit flag (e.g. `ENABLE_JS_TO_WASM_JIT`) and an
  explicit "wasm-bytecode backend" mode signal instead of overloading `script()==nullptr`.

**The one capability upside of "proper backend" (not just cleanup):** a real
**relooper/stackifier** replacing the uniform `br_table` dispatch loop. The dispatch loop
is correct but flattens all control flow into one giant switch, which V8 optimizes worse
than natural `if`/`loop`/`block`. Structured-CF reconstruction (the well-trodden
Emscripten/Binaryen problem) plausibly yields a measurable host-side perf win on top of the
maintainability gain.

**The counterargument, and why it loses:** the *only* thing the MacroAssembler route would
buy is reusing `CodeGenerator.cpp`'s per-node lowering knowledge (every `MStringLength`,
`MConcat`, IC stub, …) for "free" completeness. But you'd pay it back many times over
implementing a register-mapping, structured-CF-emitting `MacroAssembler`. The MIR-level node
switch is more hand-lowering, but each node is a handful of lines and bails-to-PBL on the
long tail. Net less code, right abstraction.

---

## 3. Target architecture (end state)

```
hot JS function (warmed Baseline ICs)
        │  main thread, live JSContext
        ▼
WarpOracle::createSnapshot ───────────────► WarpSnapshot (JSContext-free)
        │                                        │
        ▼                                        ▼
   (reused, unchanged)                   WarpBuilder + WarpCacheIRTranspiler
                                                 │  real JSScript ⇒ compilingWasm()==false
                                                 ▼
                                         JS-tier MIR (typed, bailout-shaped,
                                         resume points, JS-tier nodes)
                                                 │
                                                 ▼
                                         OptimizeMIR  (FULL JS pipeline:
                                         GVN/LICM/RangeAnalysis/ScalarReplacement/
                                         ApplyTypes/EAA/…)
                                                 │
                                                 ▼
                  ┌──────────────  jit/WasmBytecodeBackend  ──────────────┐
                  │  • relooper/stackifier: MIR CFG → structured wasm     │
                  │  • node lowering: ~60–100 JS-tier nodes → wasm bytes  │
                  │  • GC-constant pool: Shape*/JSObject* → traced table  │
                  │  • resume-point lowering: guard miss → spill→PBL@pc   │
                  │  • allocation: surviving MNewObject → helper/bump     │
                  │  • unlowered node → bail (compile fails → stay PBL)   │
                  └───────────────────────────────────────────────────────┘
                                                 │
                                                 ▼
                                  wasm module bytes ──► host (V8) ──► native
```

**Code-size projection** (vs. current ~3,600 lines of reused-Ion path):

- **Delete** ~2,740 lines (`buildFrame` front-end: bytecode→MIR, inliner, dispatch,
  `asNumber`/`asInt32`/`asObjPtr` boxing layer, `fieldCache` CSE, slot management).
- **Reuse for $0**: WarpBuilder + WarpOracle + transpiler + full OptimizeMIR (upstream).
- **Grow the backend**: ~870 → ~1,800–2,500 lines (node lowering ~1,000–1,500; resume-point
  lowering ~200–400; GC pool ~100; relooper ~300–500). Net ≈ **~2,700 lines, and complete**.

Roughly neutral-to-lower in raw lines; decisively lower in the *complexity that hurts*
(the deleted front-end is the bug factory) and it **flattens the growth curve**: front-end
growth → zero; coverage paid once per *node kind* (shared across many opcodes), in the
local, independently-testable backend.

---

## 4. The genuinely-new subsystems (where the real work is)

The "handful of lines per node" intuition holds for ~70% of nodes (arith/load/store/
compare/convert). The cost concentrates in four places:

### 4.1 Resume-point lowering (replaces deopt-by-restart)
- Every effectful MIR node carries an `MResumePoint` whose operands are the live abstract
  state, indexed to interpreter slots via the `CompileInfo` layout.
- On a guard miss, emit wasm that **spills each live operand to the PBL frame at the resume
  pc** and transfers to the Portable Baseline Interpreter via the existing `WJH_RESUME`
  mechanism (the Mode-VS path already proved cross-frame self-resume; see
  `wasm-jit-middleend-phaseA` memory). There is no native Baseline here, so we resume into
  **PBL**, whose resume pc is a bytecode offset it can re-enter.
- This is ~200–400 lines and is the correctness keystone. **It is owed regardless** — even
  the current architecture needs it to escape unsound restart-deopt (`WASMJIT_ION_GAP.md`
  §2). WarpBuilder simply hands you the state map for free instead of making you
  reconstruct it.

### 4.2 GC-constant pool (Shape*/JSObject* materialization)
- JS-tier nodes embed raw GC pointers (`MGuardShape` holds a `Shape*`; `MConstant::NewObject`
  holds a `JSObject*`). wasm bytecode cannot embed a relocatable GC pointer.
- Intern every such constant into a `gWJConstPool[]` array, **traced + updated by
  `WJTraceRoots`**; emit a runtime `load pool[i]` instead of a baked constant. Generalizes
  the existing recorded-shape / `GLOBALLOAD` fixes (which already do ad-hoc versions).
- ~100 lines, but touches every guard/object-constant lowering site.

### 4.3 Relooper / structured-CF reconstruction
- Replace the `br_table` dispatch loop with a Stackify/Relooper pass: MIR RPO + dominator
  tree → nested `block`/`loop`/`if` + `br`/`br_if`. Standard algorithm (Emscripten Relooper
  / Binaryen Stackify / Ramsey-Norman "Beyond Relooper").
- ~300–500 lines. Pure perf/quality (host optimizes structured wasm better); the dispatch
  loop remains a correct fallback.

### 4.4 Allocation lowering
- ScalarReplacement removes non-escaping `MNewObject`s (free). Survivors lower to an
  allocation helper (reuse `WJH_CONSTRUCT`) or, later, an inline bump-allocator fast path
  (read nursery pos/limit; `pos+size<=limit ? bump+init-shape : helper`). Integrate with
  the §4.2 pool and the GC-safe object spill already landed (generalize cont 40).

---

## 5. Implementation plan (phased, gated)

Mirror the project's proven methodology: each phase is a **gated smoke test** (like the
existing `IONSMOKE`/`IONBE`/`IONFE` ladder), default-off, with the 11 `embed-js/t_*.js`
correctness gates + richards ratio kept green throughout. Build the new backend **beside**
the working `WJIonBuildMIR` path; do not delete the old front-end until the new path passes
the full octane suite.

### Phase 0 — front-end runs under CODEGEN_NONE (de-risk the premise)
- **Gate `WB_SMOKE`:** on a single warmed function, call `WarpOracle::createSnapshot` →
  construct a non-wasm `MIRGenerator` (real `CompileInfo` with the script) → `WarpBuilder`
  → confirm it produces a valid MIR graph and `OptimizeMIR` runs without touching
  `MacroAssembler` (the front-end is codegen-free, but *prove* it — instantiation may pull
  a native dependency we haven't seen).
- **Exit criterion:** `OptimizeMIR` returns success on real WarpBuilt MIR; dump
  `graph.numBlocks()`/node histogram. No `MOZ_CRASH`.
- **Risk it retires:** "WarpBuilder/oracle silently needs the native backend at runtime."

### Phase 1 — scaffold the backend module + straight-line numeric
- Create `jit/WasmBytecodeBackend.{h,cpp}` with `EmitWasmFromMIR(MIRGenerator&, Encoder&)`.
  Move the node-lowering switch + value-per-local scheme out of WasmJS.cpp into it.
- Lower the easy node set: `MConstant`(int/double), `MAdd/MSub/MMul/MDiv`, `MCompare`,
  `MWasm*` arithmetic, `MReturn`/`MWasmReturn`, parameters.
- **Gate `WB_BE1`:** compile a straight-line numeric function (no property access, no CF,
  no resume points) through WarpBuilder → `EmitWasmFromMIR` → run on V8.
- **Exit criterion:** `poly(a,b)=(a+b)*3-b*2` etc. return correct values (parity with the
  existing `IONFE` numeric gate).

### Phase 2 — structured control flow (relooper)
- Implement the relooper (RPO + dominators → structured wasm). Keep the `br_table` dispatch
  loop as a fallback path behind a knob.
- **Gate `WB_CF`:** `if/else`, `while`, ternary, `&&`/`||` functions.
- **Exit criterion:** `mx`, `sumto`, loop kernels correct; emitted wasm uses `loop`/`if`
  (verify via a bytes dump) not a giant dispatch switch.

### Phase 3 — property/array/call nodes + GC-constant pool
- Lower the JS-tier property family from WarpBuilder/transpiler output: `MGuardShape`,
  `MSlots`, `MLoadFixedSlot`, `MLoadDynamicSlot`, `MStoreFixedSlot`, `MStoreDynamicSlot`,
  `MElements`, `MInitializedLength`, `MArrayLength`, `MLoadElement`, `MStoreElement`,
  `MGuardSpecificFunction`, plus `MBox`/`MUnbox`, `MToDouble`, `MTypeOf`.
- Build the `gWJConstPool[]` traced table (§4.2); route every embedded `Shape*`/`JSObject*`
  through it.
- Guards whose miss path is a pure read (no side effect yet) can use the existing deopt
  sentinel; **defer real resume to Phase 4**.
- **Gate `WB_PROP`:** the existing property/array gates (`fadd`, `gvn3`, `loopget`,
  `setget2`, `mutloop`, dense-array kernels) through the new path.
- **Exit criterion:** all property/array gates pass; per-(shape,slot) **alias ids** wired in
  so AliasAnalysis/LICM actually hoist (the §4 win from the gap analysis lands here for free
  because the passes already run).

### Phase 4 — resume-point lowering (sound deopt)
- Implement §4.1: map each `MResumePoint` operand → PBL frame slot; emit spill + `WJH_RESUME`
  at guard-miss. Start with leaf functions (no resume needed past the guard), then non-leaf.
- **Gate `WB_RESUME`:** a stateful function whose guard misses mid-execution (the deltablue
  poly-field shape that restart-deopt corrupts).
- **Exit criterion:** mid-execution guard miss resumes correctly in PBL with no restart and
  no corruption; deltablue’s poly field sites no longer restart.

### Phase 5 — calls, inlining, allocation
- Lower `MCall`/inlined-call boundaries (Ion's `inlineInterpreted` already inlined what it
  chose; the backend just lowers the residual calls). Route non-inlined calls through the
  compiled→compiled `call_indirect` path (gap analysis §6.2) or `wjhelp` fallback.
- Allocation (§4.4): ScalarReplacement removes the non-escaping ones; lower survivors.
- **Gate `WB_CALL`:** richards (call/dispatch/alloc heavy) and navier (numeric/closure)
  end-to-end.
- **Exit criterion:** richards ≥ its current ~18× and navier ≥ ~3.5× through the new path
  (no regression vs. the hand-rolled path).

### Phase 6 — full octane + cutover
- Run all six benches; lower remaining nodes the long tail needs (strings, iterators,
  `Instanceof`, `Arguments`, …) — each is now a *backend* node-lowering addition, with
  bail-to-PBL on anything still unlowered.
- **Gate `WB_OCTANE`:** all 6 correct; measure ratios. Target: ≥ current 3/6, with
  raytrace/splay/earley improved by the now-free coverage + ScalarReplacement + sound deopt.
- **Cutover:** once the new path matches-or-beats the hand-rolled path on the full suite,
  flip the default and **delete `WJIonBuildMIR`/`buildFrame`** (~2,740 lines) and the
  bespoke oracle MIR-feeding. Keep `WJReadBaselineICs`'s decode only if WarpOracle doesn't
  already cover it (it should — prefer the oracle).

---

## 6. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| WarpBuilder/oracle pulls a native dependency at runtime under CODEGEN_NONE | low (front-end is codegen-free by grep) | **Phase 0 gate** proves it before any backend work |
| Resume-point lowering is subtle (state map / PBL frame layout mismatches) | medium-high | start leaf-only; differential value-trace vs. interpreter; reuse the proven `WJH_RESUME` exit-frame |
| GC-constant pool misses a pointer kind → stale-pointer crash under moving GC | medium | central interning (one code path for *all* embedded GC ptrs); trace via `WJTraceRoots`; the deterministic-crash repro `t_ctor` style tests |
| Backend long tail (625 node kinds) balloons | low | bail-to-PBL on unlowered nodes (already the model); only lower what octane hits; coverage is incremental |
| Relooper bugs (structured CF) | medium | keep `br_table` dispatch loop as a correct fallback behind a knob; validate with the CF gates |
| Big-bang: no working bench until backend+resume+pool cohere | inherent | phased gates deliver a *runnable* path at Phase 1 (numeric), each phase adds a bench class; old path stays default until Phase 6 cutover |
| Perf regression vs. hand-rolled on richards (the one bench that's great today) | medium | Phase 5 gate explicitly requires no richards regression before proceeding |

---

## 7. Decision summary

1. **Reuse WarpBuilder** by feeding it a real `JSScript` (legitimate — we have cx + main
   thread + warmed ICs; it's codegen-free). This deletes the ~2,740-line hand-rolled
   front-end and resolves `WASMJIT_ION_GAP.md` §1/§5/§6/§8 in one move.
2. **Promote the MIR→wasm emitter to a first-class in-tree backend module** at the **MIR
   level** — keep `JS_CODEGEN_NONE` (accurate), add `jit/WasmBytecodeBackend` with an
   explicit mode flag. **Do not** build a `JS_CODEGEN_WASM` arch / `MacroAssembler` impl —
   wrong abstraction (register allocation wasted, label-CF fights structured wasm, huge
   surface).
3. **Add a relooper** for structured-CF emission (perf upside over the `br_table` loop).
4. **Resume-point lowering** is the correctness keystone and is owed regardless of route.
5. Net code: roughly neutral-to-lower, **complete instead of incomplete**, with the bug-
   prone front-end gone and growth concentrated in the local, testable backend.

The hand-rolled path is the "small surface, incremental, working-today" choice and should
stay the default until the new path passes Phase 6. This plan is the principled destination
the 40-iteration memory log keeps pointing at ("the 2x-on-every-bench goal needs a lower-
overhead redesign"): WarpBuilder's typed MIR + working ScalarReplacement + full coverage +
sound resume *is* that redesign, and the in-tree MIR→wasm backend is its proper home.
