# WasmJS.cpp JS→wasm JIT vs. Ion — gap analysis & roadmap

**What this is.** `firefox/js/src/wasm/WasmJS.cpp` carries a from-scratch JS→wasm-bytecode
JIT (the `WJ*` / "reused-Ion" path, default `GECKO_WJVS_IONINT=1`). It compiles hot JS
functions to WebAssembly that runs on the host engine, because this build has no native
JIT backend (`JS_CODEGEN_NONE`). The clever part: it **reuses Ion's MIR middle-end**
(`OptimizeMIR` + GVN/LICM/AliasAnalysis) by building MIR in `compilingWasm()` mode, but
it **hand-rolls the front-end (bytecode→MIR, `WJIonBuildMIR`/`buildFrame`, WasmJS.cpp:9970)
and the back-end (MIR→wasm bytes, `WJIonEmitBody`/`WJIonEmitValue`)** because Ion's own
backend (`GenerateLIR`/`CodeGenerator`/regalloc) cannot run under `JS_CODEGEN_NONE`.

Current measured state (node octane, `IONINT=1`): **3/6 sub-benches ≥2×** — richards
~15–20×, navier ~3.5×, deltablue ~2.1× (borderline); raytrace ~1.0×, splay ~1.4×,
earley ~0.9× (all correct, none ≥2×). The ceiling is now well understood and documented
across `jit-memory/memory/wasm-jit-ion-reuse.md` and `wasm-jit-octane-generalize.md`
(40 iterations). This document consolidates **what real Ion does that this JIT does not**,
and the refactors/features to close each gap.

---

## 0. The reuse boundary (what we already get for free vs. what we built)

| Ion piece | Status here |
|---|---|
| `MIR.h` / `MIRGraph` / SSA substrate | **REUSED** (ungated, JS-decoupled, dual-mode via `compilingWasm()`) |
| `OptimizeMIR` driver | **REUSED** — proven to run under `JS_CODEGEN_NONE` |
| GVN (incl. some load CSE) | **REUSED** — but can't CSE `MWasmLoad` (no `congruentTo`); we front-end-CSE instead |
| LICM | **REUSED** — but blocked by coarse aliasing (see §4) |
| AliasAnalysis | **REUSED** — but only the single `AliasSet::WasmHeap` tag is used |
| Bytecode→MIR front-end | **HAND-ROLLED** (`WarpBuilder` too JS/CacheIR/off-thread-coupled to reuse) |
| MIR→native back-end (LIR, regalloc, codegen) | **NOT AVAILABLE** — replaced by a hand-rolled MIR→wasm emitter; V8/TurboFan does the real regalloc on our wasm |
| RangeAnalysis, EffectiveAddressAnalysis, WasmBCE, Sink, reordering, AlignmentMaskAnalysis | **REUSED — already run** at `OptimizationLevel::Wasm` (see §0a) but mostly find nothing to do on our graph |
| ScalarReplacement (alloc sinking) | runs but **no-op** — recognizes only JS-tier nodes, ignores `MWasmLoad/Store` (§5) |
| `inlineInterpreted` auto-inliner | **OFF in wasm mode** — replaced by our own `buildFrame` recursive inliner (§6) |
| Apply-Types / branch pruning / FoldLoadsWithUnbox / iterator-index opt | **OFF in wasm mode** (`!compilingWasm`) — JS-tier, can't reuse |
| Snapshots / Bailouts / resume | **NOT USED** — replaced by deopt-by-restart sentinel (§2) |

Everything below is either a pass we don't get, a backend capability we lack, or a
front-end coverage/representation gap.

### 0a. Correction: which `OptimizeMIR` passes actually run (verified against `jit/Ion.cpp`)

An earlier draft of this doc said "only GVN + LICM fire." **That is wrong.** At
`OptimizationLevel::Wasm` (`IonOptimizationLevels.h`, `initWasmOptimizationInfo`), the
flags `gvn_, licm_, rangeAnalysis_, reordering_, eaa_, ama_, scalarReplacement_` are all
**true**, and `OptimizeMIR` actually executes: FoldEmptyBlocks, FoldTests, AliasAnalysis,
**GVN**, **LICM**, **RangeAnalysis** (Beta/analyze/range-assertions), Sink,
RemoveUnnecessaryBitops, FoldLinearArithConstants, **EffectiveAddressAnalysis** (wasm-only),
**WasmBCE** (wasm bounds-check elimination, wasm-only), DCE, **ReorderInstructions**,
MakeLoopsContiguous, AlignmentMaskAnalysis, plus TrackWasmRefTypes/OptimizeWasmCasts and
loop unrolling (pref-gated).

The catch — and the actual lever: most of these **find nothing to do**, not because
they're gated off, but because (a) our heap accesses all carry the single
`AliasSet::WasmHeap` tag, so AliasAnalysis can't separate them (§4); (b) our graph is
`MWasm*` nodes, so the JS-tier passes (ScalarReplacement, EliminateRedundantChecks/
ShapeGuards/GCBarriers) match nothing; and (c) our speculative array guards are
hand-rolled compare+`MTest`+`MWasmReturn` diamonds, which RangeAnalysis/WasmBCE don't
recognize as bounds checks. So **there is no flag to flip to "turn on" RangeAnalysis or
bounds-check elimination — they already run.** The only way to benefit is to *feed them
MIR they recognize* (real alias ids, integer-typed index/length nodes, recognizable
check nodes). This reframes §4 and §7 from "enable passes" to "emit better MIR."

The JS-tier passes that are hard-gated on `!compilingWasm()` (Apply-Types, prune branches,
FoldLoadsWithUnbox, resume-point cleanups, AddKeepAlive) **cannot** be re-enabled — they
depend on JSScript/resume-point/`MUnbox` machinery that doesn't exist in wasm mode.

### 0b. Can more of Ion be reused than is reused today?

Investigated directly against the source. Three verdicts:

- **MIR→wasm back-end — no, hand-writing is unavoidable.** The only MIR-consuming backend
  in the tree (`GenerateLIR`→`CodeGenerator::generateWasm`→`MacroAssembler`,
  `WasmIonCompile.cpp:11467`) emits **native machine code, not wasm bytecode** — wrong
  target — and under `JS_CODEGEN_NONE` those classes are `MOZ_CRASH()` stubs (`jit/none/*.h`)
  anyway. No MIR→wasm-bytecode emitter exists anywhere but our own (`WasmJS.cpp:9042+`).
- **WarpBuilder front-end — reusable, but only by switching to a JS-tier compile (a
  deliberate cost trade, NOT a hard wall).** It needs a real `JSScript` + main-thread
  `JSContext` + `WarpOracle` snapshot — all of which we have — and it's codegen-free (runs
  under `CODEGEN_NONE`). Feeding it a real script flips `compilingWasm()` to false
  (`CompileInfo.h:155`), so you get the *full* JS pipeline (typed MIR, working
  ScalarReplacement, real inlining, full coverage) at the cost of a larger JS-tier-MIR→wasm
  backend + resume-point lowering + a GC-constant pool. This is a genuine alternative
  architecture — **see `WASMJIT_REARCH_PLAN.md`** for the full plan. (Earlier drafts called
  this "genuinely blocked"; that was wrong — it's a trade.)
- **Two things *can* be reused more:**
  1. **The CacheIR *decode* layer** (`WarpCacheIRBase` + the `readStubWord`/`*StubField`
     accessors in `WarpCacheIRTranspiler.cpp:131–211`) is JSContext-free and off-thread-safe;
     `WJReadBaselineICs` could adopt it to replace its ad-hoc `CacheIRReader` hand-decode,
     for more robust/complete IC reading. **But not the transpiler's MIR output** — it emits
     JS-tier nodes (`MGuardShape` holding a raw `Shape*`, `MLoadFixedSlot`, …) plus resume
     points (`resumeAfter`→`MResumePoint`, needs real bytecode), neither of which exists
     under `compilingWasm()`; consuming it would force hand-lowering ~30–50 boxed JS-tier
     nodes to wasm — *more* work than today. Reuse boundary = **decode, not emit**.
  2. **The already-running optimization passes** (§0a) — the highest-value "reuse" is to
     stop starving GVN/LICM/AliasAnalysis/RangeAnalysis/EAA and feed them MIR they bite on
     (§1 unboxed/typed values, §4 real alias ids). This is reuse we're *paying for and not
     collecting*.

---

## 1. Value representation — uniform NaN-boxed i64 slots (the "boxing tax")

**Ion:** representation selection assigns each SSA value a concrete machine type (Int32,
Double, Object pointer, etc.); values flow unboxed in registers; boxing happens only at
type-uncertain boundaries.

**Here:** every local/arg/rval **slot** is a uniform NaN-boxed `i64` Value (forced by the
richards loop-phi bug — `setBackedgeWasm`'s `entryType==exitType` assert is compiled out
in NDEBUG, so mixed-type loop phis silently miscompiled; see richards-2x doc bug #8). The
operand stack carries typed defs (f64/i32/i64) but anything that crosses a block boundary
or a phi is boxed to i64 and lazily unboxed at use (`asNumber`/`asInt32`/`asObjPtr`).
Doubles are stored as **raw reinterpreted bits**, not canonical NaN-boxed Values.

**Why it matters.** This is *the* measured ceiling for property/pointer-bound code
(deltablue/splay/raytrace cap ~1.4× even when fully correct and deopt-free — proven in
generalize cont 37). Box/unbox per access + slot phis being i64 also defeats Ion's typed
optimizations and blocks GC-safe rooting (§3, the raw-double-bits ambiguity).

**Refactor (large, the headline rewrite).** Move to **per-slot typed flow**:
- Track `slotVty[slot]` (0 dbl / 1 int / 2 unk / 3 obj|null) through SetLocal/SetArg —
  *partially done already* (`setSlotTyped`, generalize cont 40).
- Make slot phis typed: f64 slots → f64 wasm locals, object slots → i32 locals, only
  genuinely-polymorphic slots stay i64-boxed. This requires a **per-slot type inference
  pass through phis** before backend local assignment (a fixpoint over the block graph,
  meet at join/loop-header phis; bail/widen-to-boxed on conflict).
- The MIR→wasm backend's slot↔local map (`WJIonBackend`) must key on (slot, type).

**Advice.** This is the single highest-leverage change but also the riskiest — it touches
the slot model that *every* feature stands on. Do it gated end-to-end, keep the uniform-i64
path as the fallback for conflict slots, and gate-compare richards (must not regress) at
every step. The typed-slot inference is the same analysis the GC-safe spill needs (§3), so
build it once and share it.

---

## 2. Deoptimization — restart-from-top vs. snapshot/bailout/resume

**Ion:** every speculative guard has a **snapshot** of the abstract interpreter state; on
miss it **bailouts** — reconstructs the exact baseline/interpreter frame at the guard's pc
and resumes there. Side effects already committed are fine because resume is mid-function.

**Here:** a guard miss does `MWasmReturn(sentinel 1.0)`; `WasmJitRunCall` (WasmJS.cpp
~11726) sees nonzero and **re-runs the whole function in the PBL interpreter from the top**.

**Why it matters.**
- **Unsound for stateful functions** unless the guard is hit *before* any side effect —
  the JIT only "works" on deltablue because reads deopt early every call (≈always-PBL,
  0.83×). A genuinely poly stateful loop can't be compiled this way without corruption.
- **No OSR**: we can only enter via a whole-function call (`WasmJitRunCall`); we cannot
  enter a long-running loop that's already executing in the interpreter. Ion does OSR into
  hot loop headers. Functions that are entered once and loop forever never get JIT'd.

**Feature: resume-at-pc deopt** (instead of restart). The Mode-VS path already proved
cross-frame self-resume works (`WJH_RESUME`, see `wasm-jit-middleend-phaseA` memory:
bailing fn calls `wjhelp(WJH_RESUME)` → PBL at the resume pc → returns the normal result).
Port that model to the reused-Ion path: at each guard, record the JS pc + a mapping of live
SSA values back to interpreter stack/local slots, and on miss hand control to PBL at that
pc with that state, rather than restarting.

**Advice.** Full snapshot/bailout reuse is *not* viable (it's wired to the native
backend). The tractable path is the existing `WJH_RESUME` exit-frame mechanism + a
**per-guard live-value→interp-slot map** emitted as side-tables. Start with leaf functions
(no resume needed past the guard), then non-leaf. The deeper prize (OSR) needs an interp
loop-back-edge hook that checks "is this loop JIT-compiled? if so, transfer state and jump
in" — significant, defer until restart-deopt is sound.

---

## 3. GC integration — rooting, safepoints, write barriers

**Ion:** emits **safepoints** at every GC-possible call recording which registers/stack
slots hold live GC pointers; the GC traces and *updates* them across a moving collection.
Stores of GC pointers emit **post-write barriers**.

**Here:** object pointers live in **wasm locals, which are not GC roots**. Across an
allocating call (`new`, allocating method/IONCALL) a minor GC can move a nursery object
and the held pointer goes stale → chain corruption (proven minimal repro `t_ctor`,
generalize cont 33). Inline object stores write raw pointers with **no write barrier**
(`WJH_POSTBARRIER` infra exists but is gated off — a helper-per-store costs too much).

**Partial fix already landed (cont 40):** `gWJObjSpill` — spill object-typed slots
(`slotVty==3`) to a traced region across `emitConstructCall`, reload after. Default-on,
fixed `t_ctor`. But it only covers constructs, not all allocating calls, and depends on
per-slot typedness (§1) to know which slots are objects.

**Refactor.**
1. Extend the spill safepoint to **all allocating calls** (method/IONCALL/cold helpers),
   not just `emitConstructCall`.
2. The spill needs precise per-slot object-typedness *through phis* — blocked on §1's
   typed-slot analysis. With raw-double-bits in i64 slots you cannot trace a slot as a
   Value (a NaN/large double looks like a tagged object pointer) — this is exactly why
   the general spill was backed out in cont 34.
3. Inline post-write barrier (the gated `GECKO_WJVS_POSTBARRIER` does the chunk
   storeBuffer nursery check branchlessly) should become default *once* it's cheap enough
   — only emit it on real tenured←nursery edges.

**Advice.** Sequence this *after* §1 (typed slots make object-slot identification exact
and remove the double-bits ambiguity). Until then, the spill is a correct stopgap for the
common case (few object slots live across a construct).

---

## 4. Alias analysis — single `WasmHeap` tag defeats LICM/GVN on the heap

**Ion:** refined alias sets per field/element class (per shape+slot, per typed-array kind,
elements vs. slots vs. fixed). An invariant load hoists past an unrelated-field store.

**Here:** all `MWasmLoad/MWasmStore` use one generic `AliasSet::WasmHeap`. So **any** heap
store in a loop blocks hoisting of **every** heap load in that loop (conservatively
correct but useless on mutating loops). Richards loops mutate packet/tcb fields → property
LICM gives little. GVN can't CSE `MWasmLoad` at all (no `congruentTo` override — and we
must not add one, it's the production wasm node), so we hand-roll front-end CSE
(`fieldCache`/`guardedShape`, invalidated at joins/loop-headers/mutations).

**This is the clearest case of "more Ion reuse" available.** AliasAnalysis, GVN, and LICM
*already run* (§0a) — they're just starved of information because every load/store carries
the same `WasmHeap` tag. **Feature: per-(shape,slot) alias tags** on our wasm loads/stores
so the already-running AliasAnalysis lets a loop-invariant field load hoist past a store to
a *different* field. The infrastructure (distinct `AliasSet` numbers keyed by (shape,offset)
→ small-int interning) is additive to the backend; the front-end already knows shape+offset
at every site.

**Advice.** The cleanest medium-size win, and it activates dormant reuse rather than adding
a new mechanism. Intern (shape,slot)→aliasId at compile time; map typed-array element
classes and dense-elements to their own ids. Verify with the existing `loopget`/`mutloop`
gates (read-only hoists, mutating doesn't) extended to multi-field cases. (Note: GVN still
can't CSE `MWasmLoad` directly — no `congruentTo`, and we must not add one — so keep the
front-end `fieldCache` CSE; alias ids help the *hoisting* and *store-aliasing*, not load
value-numbering.)

---

## 5. Scalar Replacement (allocation sinking) — structurally unavailable

**Ion:** `ScalarReplacement` removes non-escaping allocations, flattening object fields
into SSA values.

**Here:** **DEAD by construction.** The pass recognizes only JS-tier nodes (`MNewObject`,
`MStoreFixedSlot`, `MGuardShape`, `MUnbox`, …); our pipeline emits `MWasmLoad/MWasmStore`,
which it ignores. Emitting the JS nodes instead is a dead end — `MNewObject` needs a GC
template object and, if the object escapes, codegen must do a real allocation, impossible
under `JS_CODEGEN_NONE`. (And richards Packets *escape* anyway, so even real Ion wouldn't
sink them.)

**Implication.** Object-allocation elimination is **not reachable via Ion reuse**. The only
allocation lever available is **inline allocation fast-paths** (template-object bump
allocation in compiled code with a nursery-full → helper fallback) — a major from-scratch
feature, not a pass reuse. Splay is allocation-bound (thousands of `new Node` via the
non-inlined construct helper); without inline alloc it caps <2× regardless (cont 28).

**Advice.** Treat scalar replacement as out of scope. If allocation becomes the priority
(splay/raytrace), build a **bump-allocator inline path**: read nursery position/limit,
emit `pos+size<=limit ? bump+init-shape : helper`, and integrate with the §3 barrier/spill.
Large; only worth it after §1–§3.

---

## 6. Inlining — hand-rolled, no auto-inline heuristics, leaf/CF limits

**Ion:** `inlineInterpreted` chooses inline targets by a cost/benefit heuristic using TI
and call-site counts; handles polymorphic dispatch via dispatch+fallback; respects an
inlining budget.

**Here:** `inlineInterpreted` is **gated off in wasm mode**. We hand-roll a recursive
inliner (`buildFrame`, depth ≤ `kWJInlineMaxDepth`=6) driven by the CacheIR oracle's
recorded callees (`gWJInlineCallee`/`gWJMethodPoly`). This is actually the JIT's
*strength* — richards' 18× comes from collapsing its whole call graph and GVN/LICM-ing
across it. But:
- **No cost model**: it inlines whatever the oracle recorded up to depth 6; pathological
  trees hit the slot cap (`GECKO_WJVS_SLOTCAP`) and bail the whole function.
- **Polymorphic dispatch capped at 4 ways**; a 5th runtime shape → deopt sentinel →
  restart every call (deltablue's megamorphic `c.execute()`, cont 4). Real Ion falls back
  to a (non-inlined) IC, not a whole-function deopt.
- **Non-inlined calls go through `wjhelp` → JS::Call → interpreter** (the call boundary
  tax — navier cont 13). The fast alternative (compiled→compiled `call_indirect` via the
  shared funcref table) is scoped but unbuilt, and blocked for closure callees (cont
  14–15) which aren't tabled because they need `gWJCurEnv` set.

**Features.**
1. **Megamorphic fallback that doesn't restart**: the no-match dispatch arm should call a
   `WJH_METHCALL` helper and *continue* (this exists as `METHFALL`, gated — but it exposes
   the cross-function corruption / boundary cost). With resume-deopt (§2) it becomes sound.
2. **Compiled-to-compiled `call_indirect`** (navier unlock, cont 14): add a table import to
   the Import section (currently hardcoded to 2 imports), a per-site `gWJCallHandle` cache,
   and `MWJIonCall` lowering that guards the callee identity then `call_indirect`s, else
   falls back to `wjhelp`. Must thread `gWJCurEnv` for closure callees.
3. **A simple inline cost model** (bytecode-length × call-site-hotness budget) to replace
   the depth-6 + slot-cap heuristic, so big functions inline their hot core instead of
   bailing entirely.

**Advice.** §6.2 (compiled→compiled calls) is the concrete next lever for numeric
call-bound code (navier) and reduces the boundary tax everywhere. Do it after §2 so the
non-inlined fallback is sound, and after §1 so the ABI passes typed values cheaply.

---

## 7. Passes that run but don't bite (use them, don't enable them)

Per §0a, these passes **already execute** in wasm mode — the work is to emit MIR they
recognize, not to turn them on.

- **Range Analysis (runs) + bounds checks.** RangeAnalysis executes and derives integer
  ranges. But our array access is either unchecked-speculative or a *hand-rolled*
  `boundsGuard` (compare + `MTest` + `MWasmReturn` deopt diamond, ~35% richards hit before
  LICM), which RangeAnalysis/WasmBCE don't recognize as a bounds check. The trapping
  `MWasmBoundsCheck` node that WasmBCE *does* eliminate has wasm-trap semantics, which
  don't match JS "OOB index → `undefined`", so we can't swap it in directly. **Lever:**
  emit the index as an integer-typed MIR value (so RangeAnalysis can narrow it) and make
  the limit load LICM-hoistable via §4 alias ids; full check-elimination needs a
  deopt-flavored check node RangeAnalysis can reason about.
- **Effective-address analysis (runs, wasm-only).** EAA already folds `base+index*scale+
  disp` patterns into `MEffectiveAddress` for integer address arithmetic. **Lever:** keep
  address math integer-typed `MAdd`/`MLsh` (not boxed) so EAA can match it.
- **Sink / reordering / FoldLinearArithConstants (run).** Benefit automatically once
  values are unboxed (§1) and typed.
- **Apply-Types / branch pruning / FoldLoadsWithUnbox** — hard-gated `!compilingWasm()`;
  **cannot** be reused (JS resume-point / `MUnbox` dependencies). Don't pursue.
- **Type-stability guards.** Speculative typed field reads currently have **no value-type
  guard** (richards-2x doc: "type-speculative, wrong-not-crash if a field's type changes").
  Ion guards the observed type and bails on change. **Feature:** emit a tag guard + deopt
  on typed field reads (cheap; needed for soundness on type-unstable fields).

---

## 8. Front-end opcode / language coverage gaps

`buildFrame` currently handles (WasmJS.cpp 11191–12700): arithmetic/bitwise/compare,
locals/args/rval, `Get/SetProp`, `Get/SetElem` (dense), `GetGName`/`GetAliasedVar` (read,
fixed+dynamic env slots), `GetElem`/`.length`, calls (inline + `WJH_METHCALL`/`IONCALL`
fallback), `New`/`NewArray`/`NewObject`/`InitProp` (construct via `WJH_CONSTRUCT`),
control flow (`If`/`Else`/`while`, `&&`/`||`, ternary), `Not`, `Dup`/`DupAt`/`Swap`/`Pop`,
`True`/`False`/`Null`/`Undefined`/consts. **Bails (whole-function) on:**

| Missing op / feature | Needed by | Note |
|---|---|---|
| `JSOp::Iter` / for-in | raytrace (Object.extend), earley | iterator protocol; non-trivial |
| `JSOp::Instanceof` | earley | proto-chain walk + IC |
| `JSOp::Arguments` / `GetFrameArg` | earley, Prototype.js | arguments object materialization |
| `JSOp::BindUnqualifiedGName` | raytrace, splay | global binding resolution |
| `IsConstructing` | raytrace/splay ctors | sound only as `false` in non-ctor frames (gated `ISCTOR`); ctors run non-inlined so it's benign — make context-aware |
| `SetAliasedVar` | navier, splay | closure var **writes** (only reads handled) |
| `ToPropertyKey` (`obj[strkey]`) | navier | string/computed keys |
| String ops / `JSOp::*` string fast paths | regexp, earley, splay (`String(key)`) | minimal string support |
| RegExp | regexp (fails even JIT-off — harness gap) | out of scope |
| cold `GetProp`/`SetProp` (no IC record) | raytrace/splay/earley | `WJH_GETPROP` cold helper is default-on; cold `SetProp` (`COLDHELPSET`) gated — has a cross-function latent bug |
| poly `SetProp` | splay, deltablue | `POLYSET` diamond exists, gated (overhead) |

**Advice.** These are *additive* (a missing-op bail is correctness-safe — it just stays in
PBL). Prioritize by bench: raytrace needs ~5 together (`IsConstructing`-ctx + `Iter` +
`BindGName` + cold-GetProp + method dispatch) — no single one unblocks it, so land them as
a batch behind one gate and measure. Each new op should round-trip through a tiny
`embed-js/t_*.js` gate (the established pattern) before enabling.

---

## 9. Backend / codegen gaps

- **No register allocation of our own** — we emit value-per-local wasm and let
  V8/TurboFan re-run regalloc + folding. This is *fine and deliberate* (we can't run LIR
  under `CODEGEN_NONE`), but it means we can't do Ion-quality scheduling/spilling; we
  depend on the host engine. No action needed unless we ever target a non-optimizing host.
- **No Float32 specialization, no SIMD, no Int64/BigInt path** — all numerics are f64
  (matching Mode N/V). BigInt-heavy code (crypto's big-integer bitwise on >32-bit chunks)
  miscompiles (generalize baseline). **Feature:** an i64/BigInt representation for the
  bitwise-on-large-ints case; Float32 specialization is low priority.
- **Module structure is rigid** — Import section hardcodes 2 imports (help func + memory);
  adding the funcref table import (§6.2) is a structural change touching *every* reused-Ion
  module (richards regression risk). Refactor the module emitter to compute its import
  list dynamically.

---

## Prioritized roadmap

The memory docs' firm, *measured* conclusion: this architecture already wins big on
**inlinable dispatch/numeric** code (richards 18×, navier 5×) and the 3 laggards are
**per-operation-overhead-bound** (boxing + poly diamonds + call boundary), not
missing-feature-bound. So the ordering is:

1. **§1 Typed (unboxed) slot flow** — *the* ceiling-breaker for deltablue/splay/raytrace;
   prerequisite for §3 and cheap §6.2 ABI. Highest leverage, highest risk; gate end-to-end.
2. **§4 Per-(shape,slot) alias tags** — cleanest medium win; real LICM on mutating loops.
3. **§2 Resume-at-pc deopt** (port `WJH_RESUME`) — makes poly/megamorphic fallbacks sound,
   unlocks `METHFALL`/cold-SetProp by default; later enables OSR.
4. **§6.2 Compiled-to-compiled `call_indirect`** — cuts the call boundary tax (navier→2×,
   splay/deltablue calls). Needs §2 (sound fallback) + dynamic module imports (§9).
5. **§3 General GC-safe spill + inline barrier** — correctness for allocation-churn code;
   needs §1's typed slots.
6. **§8 Opcode batches per bench** (raytrace first: IsConstructing-ctx/Iter/BindGName/
   cold-GetProp) — additive, safe, but multi-op-per-function.
7. **§7 value-type guards** (soundness) and **range/bounds-check elimination** (perf).
8. **Inline allocation fast path** (§5) — only if splay/raytrace allocation remains the
   bottleneck after the above.

Out of scope / not reachable via Ion reuse: scalar replacement (§5 pass), native
register allocation (§9), full snapshot/bailout (§2 — use the resume helper instead).

**Cross-cutting advice.** Keep the gate discipline that's worked for 40 iterations:
every change lands gated, the 11 `embed-js/t_*.js` correctness gates + richards ratio must
stay green, and A/B via `GECKO_WJVS_*` knobs. The decisive debugging technique remains
re-implementing the NDEBUG-dropped MIR asserts as `fprintf`s (the `VALIDATE` phi/dominance
checker, the backedge type-mismatch print that found the richards loop-phi bug) plus
`IONINT_ONLY=<line>` single-function bisection and differential value-tracing vs. the
interpreter.
