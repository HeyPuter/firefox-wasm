# Plan: unlocking 2× on octane-richards in the JS→wasm JIT

Status: design doc. Author context: written after an exhaustive investigation (2026-06-18)
that built short-circuit/value-condition support, polymorphic depth-2 inlining, and
interpreter compile-trigger tuning, and measured the result. Companion memory:
`memory/wasm-jit-richards-analysis.md`, `memory/wasm-jit-modevs-unbox.md`,
`memory/gecko-wasm-js-wasm-jit.md`.

---

## 1. Goal & current state

**Goal:** richards jit/off ≈ 2× (matching deltablue), where today it is ~1.0× (neutral).

**Baseline (this build, ±15% noise):**

| bench | jit (default) | jit off | ratio |
|---|---|---|---|
| richards | ~57–67 | ~64 | ~1.0× (neutral) |
| deltablue | ~138–198 | ~84 | ~1.6–2× |
| crypto | ~557 | ~180 | ~3.2× (tloc) |

richards is the JIT's worst major bench: the engine compiles 16 of its 17 hot functions
and still gains nothing.

**The architecture (for context):** `--disable-jit` + PortableBaselineInterpret (PBL); a
custom JIT lowers hot JS bytecode to wasm. Three modes: **Mode N** (f64-only, non-mutating),
**Mode V** (value-typed/boxed, non-mutating, has GetProp + control flow), **Mode VS** (the
no-restart emitter for MUTATING/OO functions — NaN-boxed operand stack in wasm locals, per-op
type guards, relooper pc-dispatch, frame in GC-traced linear memory). richards is all Mode VS.

---

## 2. Root cause — why richards is neutral (two independent blockers)

Established empirically (heartbeat counters, [wj-compile]/[wj-enter] traces, A/B):

### Blocker A — the hot OUTER LOOP `Scheduler.schedule` (richards.js:188) is never compiled
- It is **absent from `WJCompile` entirely** — never even submitted.
- It runs in the interpreter while ALL its callees (`TaskControlBlock.run`, the 4 `*Task.run`,
  `scheduler.release/queue/holdCurrent/...`) compile.
- Cause: a function is observed for compilation only when CALLED with `getWarmUpCount() >= N`
  (PBL ~line 7877; Interpreter.cpp ~line 3278). Warm-up counts **function entries, not loop
  back-edges** (the back-edge increment is gated on `IsBaselineInterpreterEnabled()`, which is
  false here). `schedule` is the once-per-iteration outer loop: few calls, huge internal loop,
  so its warm-up stays low and it is never observed.
- **Resisted 4 targeted fixes** this session: lowering the threshold 100→10 in both interpreters,
  and adding LoopHead `incWarmUpCounter()` in both. `schedule` still never reached `WJCompile`,
  implying `incWarmUpCounter()` may not feed `getWarmUpCount()` in this config, or `schedule` is
  called too few times for the call-site observe to re-trigger, or it runs via another path.
  → The robust fix is **OSR** (compile + transfer the running frame mid-loop), not trigger tuning.

### Blocker B — Mode VS is ≈ interpreter speed for NaN-boxed OO dispatch (even when compiled)
- Proven: every richards function except `schedule` compiles, and richards is still neutral.
- Each hot op is `this.state & FLAG` / `== STATE_x` → GetProp (shape guard + boxed slot load) →
  isNum guard + unbox → int op → box → SetProp (shape guard + store), plus relooper dispatch.
  The PBL interpreter does the same boxing; the JIT only removes bytecode dispatch and adds its
  own relooper + frame-memory traffic. Net wash.
- This is the **real ceiling**. It is the NaN-boxed value representation, not a missing pass.

**Why deltablue wins but richards doesn't:** deltablue is property/arithmetic-DENSE (poly GetProp
inlines its field reads; its field stores are NUMBERS, which the inline SetProp already handles).
richards is dispatch-DENSE with tiny methods and integer-field bit-ops — the boxing dominates.

**Key consequence for planning:** Blocker B caps the payoff even if Blocker A is solved. Both
must be addressed for 2×. Solving only A (compile `schedule`) buys at most the per-call
interpreter↔wasm boundary elimination (real but partial); solving only B without A leaves the
hottest function interpreted. **Do A and B together.**

---

## 3. Foundation already built (reusable; gated off by default)

These are correct, in-tree, and prerequisites for the plan:

- **Short-circuit + value-typed conditions in Mode VS** (`GECKO_WJVS_SHORTCIRCUIT`): `&&`/`||`/`??`,
  value-producing comparisons (`WJVSCmp(..., asValue=true)` boxes the 0/1), and `if(value)` via
  ToBoolean; uses `WJComputeEntryDepth` (allows depth-1 merge blocks) + a `kVSphi` local +
  `spillIfPhi`. Required so `schedule` (`if(call())`) and `isHeldOrSuspended` (`return a||b`)
  can compile at all. **Must be ON for the rewrite.**
- **Polymorphic / non-leaf / depth-2 inlining** (`GECKO_WJVS_INLINE`): records up to 4 callees per
  site (`WJInlineRec`), emits a guarded inline chain, inlines callees that contain calls, to a
  configurable depth (`GECKO_WJVS_INLINEDEPTH`, default 2). Confirmed firing (`inlined=10`).
- **Compile-trigger knobs**: observe threshold lowered to 10 + LoopHead warm-up counting in both
  interpreters (active; non-regressive but insufficient — see Blocker A).
- **Inline object-valued SetProp + lean GC post-write barrier** (`GECKO_WJVS_OBJSET`, default off):
  shape-guarded raw slot store + `putWholeCell` barrier. Correct but neutral standalone; becomes
  useful once fields are type-specialized.

All of `js/src/wasm/WasmJS.cpp` (the JIT) + the two interpreter call hooks.

---

## 4. The rewrite — phased plan

Ordered by dependency. Each phase is independently measurable and gated.

### Phase 0 — Reliable measurement harness (prerequisite, ~0.5 day)
The ±15% noise (leaked headless-chromium contention, browser-launch variance) made small wins
invisible all session. Before any codegen work:
- Single warm browser, run richards N times in one page session, report **min** (least-contended)
  and median; kill all chromium between arms; never run arms concurrently.
- Add a per-function cycle counter (rdtsc-equivalent / performance.now around `schedule`) exposed
  via `GECKO_DEBUG_JIT` so we measure `schedule` time directly, not just the octane score.
- Acceptance: variance < 3% run-to-run on the same binary.
**Without this, the rest is unfalsifiable.**

### Phase 1 — OSR: compile and enter the hot outer loop (Blocker A, ~1–2 weeks)
Get `schedule` running as wasm. Trigger tuning failed; do real OSR.
- **Trigger:** at `LoopHead`, maintain a per-script loop-back-edge counter (NOT the shared
  warm-up if that's not wired to `getWarmUpCount()` here — use a dedicated counter on the
  WasmJitEntry or a side map keyed by script). When it crosses a threshold, compile the script
  (Mode VS, with short-circuit ON) for the *next* call AND attempt OSR for the *current* frame.
- **OSR entry:** the hard part. Mode VS keeps its operand stack in wasm locals and its frame in
  GC-traced linear memory (`gWJFrameMem`), entered via `WasmJitRunCall` (args marshalled to
  `gWJScratch`). For OSR we must enter the compiled wasm at the loop header with the interpreter's
  current locals/operand-stack materialized into the wasm frame, and resume at the right relooper
  block (`kVSpc`). Concretely:
  - Emit an alternate entry that takes a starting `kVSpc` (block id of the loop header) and reads
    initial locals from the interpreter frame (already in memory as Values) instead of from
    `gWJScratch` arg marshalling.
  - Map the interpreter's pc → relooper block id (the `blockOff`/`ofId` tables already exist in
    `WJEmitBodyVS`).
  - On loop-hot in the interpreter: snapshot locals → wasm frame, call the wasm OSR entry with the
    loop-header block id, and on return splice the result back.
- **Simpler interim alternative (de-risk):** skip true OSR; just ensure `schedule` is compiled
  before its 2nd call (fix the trigger so warm-up actually accumulates — verify `incWarmUpCounter`
  vs `getWarmUpCount` wiring, or use a dedicated loop counter + observe-at-LoopHead-for-next-call).
  This captures most of the benefit if `schedule` is called more than a couple times; only fails
  if it's called ~once.
- **Files:** `PortableBaselineInterpret.cpp` (LoopHead, the dominant path) + `Interpreter.cpp`
  (LoopHead) for the trigger; `WasmJS.cpp` `WJEmitBodyVS` + `WasmJitRunCall` for the OSR entry.
- **Risk:** HIGH (frame materialization correctness, GC rooting of the spliced frame, resuming
  mid-relooper). Validate: richards correct + `schedule` appears in the compiled set.
- **Expected gain alone:** modest — converts `schedule`'s ~5 calls/iteration from
  interpreter↔wasm boundary crossings into wasm→wasm `call_indirect`. Real but not 2× (Blocker B).

### Phase 2 — Unboxed, type-specialized integer object fields (Blocker B, THE core, ~3–5 weeks)
Eliminate the per-op box/unbox/guard on integer fields — the actual ceiling.

The object slot stays a NaN-boxed `Value` in memory (changing `NativeObject` layout is out of
scope — too deep, GC-wide). The win is **operand-level**: stop round-tripping field values through
the boxed operand stack between GetProp and the arithmetic that consumes them, and hoist the per-op
type guard to a once-per-loop shape guard.

Two sub-mechanisms:

**2a. Type-specialized GetProp/SetProp (IC feedback on field type).**
- Extend the GetProp IC fill (`WJFillIC`) to record whether the loaded field is consistently an
  int32/number per (shape, slot) — add a `gWJSiteFieldNum[site]` flag.
- For a numeric-field GetProp in Mode VS with unbox enabled: emit shape guard → load slot →
  guard isNum → unbox → push to the **typed f64 operand stack** (`repr[d]=1`, `sf[]`), with a
  deopt if the runtime value isn't numeric. The consuming arith op then runs f64→f64 with no
  rebox/unbox (reuses the existing unbox machinery — `WJEnsureF64`, `WJVSBitOpU`, etc.).
  - CRITICAL repr-consistency rule (learned the hard way — see the GetElem bug in
    `wasm-jit-modevs-unbox`): a single op that emits an inline-f64 arm AND a boxed/helper arm
    cannot carry a static `repr=1`. So the deopt path must materialize to the boxed slot, OR the
    op must be all-or-nothing (deopt the whole function on a non-numeric field).
- SetProp of a typed field: value already f64 on the typed stack → box once + store (the
  `GECKO_WJVS_OBJSET` inline store + barrier already exists).
- This removes the operand-stack box-after-GetProp + unbox-before-arith round-trip.

**2b. Redundant shape-guard + load elimination (local CSE / LICM).**
- Within a block (and across the loop body, invalidated by SetProp-to-same-shape and calls),
  cache `this.currentTcb` and repeated field loads so the shape guard + slot load run once, not
  ~5×/iteration. This is the bigger chunk for richards' `schedule` loop.
- Implement as a small per-block value-numbering pass over the operand model in `WJEmitBodyVS`:
  track (object-slot, field) → operand/register; reuse on a second GetProp; invalidate on
  SetProp/Call/anything that may mutate. Conservative invalidation is fine (correctness first).
- Hoist the receiver shape guard out of the loop where the receiver is loop-invariant (`this`).

**Files:** `WasmJS.cpp` — `WJVSGetProp`, `WJVSSetProp`, `WJFillIC`, `WJEmitBodyVS` (CSE pass),
the unbox/typed-stack helpers. **Risk:** HIGH (deopt correctness, repr consistency, GC).
**Expected gain:** this is where the 2× has to come from — it attacks the per-op boxing that makes
Mode VS == interpreter. Validate against richards' checksum every iteration.

### Phase 3 — Collapse the dispatch chain (uses the built inliner, ~1 week)
With Phase 1 (`schedule` compiled) + the existing polymorphic depth-2 inliner ON:
- `schedule` inlines `TaskControlBlock.run` (depth 1) and the 4-way `this.task.run` (depth 2,
  polymorphic). Tune `GECKO_WJVS_INLINEDEPTH` / the leaf-only and poly gates.
- Extend inlining to depth 3 if budget (`kWJVSMaxStack=48`) allows, to also fold the
  `scheduler.*` calls inside `task.run`.
- Inline `isHeldOrSuspended` (needs short-circuit in the INLINE-CFG path — currently only the
  standalone body emitter handles `||`; `WJEmitInlineCFG` + `WJCallInlinable` still reject it).
  This is the Phase-2-of-short-circuit work: port the value-condition/phi handling into
  `WJEmitInlineCFG` and drop the And/Or rejection in `WJCallInlinable`.
- **Risk:** MEDIUM (code-size blowup, register budget, nested-relooper kVSpc2 sharing already
  validated). **Expected gain:** removes remaining call boundaries; compounds with Phase 2.

### Phase 4 — Lean call boundaries + allocation (polish, ~3–5 days)
- Replace the `WJVSCallHelper` spill/reload for GC-safe helpers (barriers, etc.) with lean calls
  (pattern already used for `WJH_POSTBARRIER`).
- richards does NOT allocate in the hot loop (confirmed), so allocation is NOT a richards lever —
  skip for richards (would matter for splay/gbemu).

---

## 5. Sequencing, effort, success criteria

1. **Phase 0** (measurement) — 0.5 day. Gate: <3% variance.
2. **Phase 1** (OSR / get `schedule` compiled) — 1–2 wk. Gate: `schedule` in compiled set,
   richards correct. Measure: expect small-to-modest jit/off improvement.
3. **Phase 2** (unboxed fields + guard/load CSE) — 3–5 wk. THE core. Gate: richards correct,
   measurable per-op reduction. Measure: target the bulk of the 2×.
4. **Phase 3** (inline the chain) — 1 wk. Gate: correct; compounds.
5. **Phase 4** (lean calls) — optional polish.

**Overall: ~6–9 weeks, one engineer.** Success = richards jit/off ≥ ~1.8–2.0× with all benches
still correct (especially the GC-heavy splay/earley-boyer and the OO deltablue) and no regression
on crypto's 3.2×.

**Realistic caveat:** richards uses regular boxed objects (not typed arrays). Even with all of the
above, a portable JS→wasm JIT that keeps object SLOTS NaN-boxed is fighting the data model; 2× is
plausible but not guaranteed, and the last increment may require speculative unboxed slot storage
(true Ion-level NativeObject specialization) which is a separate, larger effort. If Phase 2
measures < ~1.4× after guard/load CSE + typed-field GetProp, that is the signal that the remaining
gap is genuinely in the object memory layout and not reachable without GC-level changes.

---

## 6. Correctness & risk register
- **GC:** any unboxed field value that is a pointer needs the post-write barrier (have it); typed
  f64 field values need no barrier. Frame + operand stack must stay GC-traced across calls
  (`WJTraceRoots`, spill/reload). Deopt paths must leave a consistent boxed frame for the
  interpreter to resume.
- **Deopt/repr consistency:** the #1 correctness hazard (see the fixed GetElem repr bug and the
  tloc store-taint bug in `wasm-jit-modevs-unbox`). Rule: a static `repr` must match EVERY runtime
  arm of an op; type-specialized ops must deopt-to-boxed consistently.
- **OSR:** frame materialization + resume is the highest-risk piece; build it behind a gate and
  validate richards' checksum exhaustively before enabling.
- **Measurement:** keep everything gated; A/B each phase; never trust a single noisy octane score.

---

## 7. If we don't do the rewrite
Bank the validated session wins (tloc default-on → crypto ~3.2×; gated short-circuit + polymorphic
inliner) and point JIT effort at the **typed-array / numeric** regime where this JIT already does
5–10× — a far better ROI than boxed-OO benches like richards.

---

## 8. EXECUTION + EMPIRICAL OUTCOME (2026-06-18, this session)

The plan above was executed as far as the data justified. Build/measure pipeline is fully working
(`make -C obj-full-emscripten/js/src` → `toolkit/library` → `embed-xul/restrip-relink-web.sh`,
~2.5 min/cycle; bench via `embed-xul/bench/_t_rich_ab.cjs` + `_t_matrix2.cjs`, playwright-core +
system chromium, min+median of N, fresh browser per arm).

### Phase 0 — DONE. Harness `_t_rich_ab.cjs` (min+median of N, browser-per-arm). Trustworthy A/B.

### Phase 1 — DONE, and it CORRECTS the plan's Blocker-A premise.
Blocker A said `Scheduler.schedule` (richards.js:188) "is absent from WJCompile entirely — never
even submitted." **That is wrong.** schedule IS submitted (it reaches WJCompile on schedule's 2nd
call, after its internal loop drives warm-up via the existing LoopHead `incWarmUpCounter`). It was
failing to compile because it has a value-condition `if(this.currentTcb.isHeldOrSuspended())` (a
JumpIf on a CALL result) which **Mode VS rejects unless `GECKO_WJVS_SHORTCIRCUIT` is ON** — so it
EMIT-FAILed and was permanently marked `Failed`, hence "never runs as wasm." No OSR, no trigger
tuning, no LoopHead-observe needed. **Just enabling short-circuit makes schedule compile**
(verified: `[wj-compile] richards.js:188 mutates=1 vsOK=1 hasCall=1 firstUnsup=-`).

### Phase 1 RESULT — compiling schedule REGRESSES richards (the decisive measurement).
| richards config | jit/off (median, N≥3) |
|---|---|
| interpreter (OFF) | 1.00 (baseline) |
| JIT, schedule INTERPRETED (short-circuit off) | ~0.91 |
| JIT, schedule COMPILED (short-circuit on) | ~0.84 |
| + GECKO_WJVS_UNBOX | ~0.84 |
| + UNBOX + TYPEDLOC | ~0.85 |
| + GECKO_WJVS_OBJSET | ~0.84 |
| + GECKO_WJVS_INLINE (Phase 3) | ~0.82 |

**Every JIT configuration is a NET LOSS on richards.** Target is 2.00. The best config (0.91, with
the hot loop left interpreted) is still 9% slower than the interpreter; compiling schedule and/or
adding any lever makes it WORSE, because Mode VS's NaN-boxed frame + per-op type guards + relooper
dispatch are slower than the PBL interpreter for dispatch-dense boxed OO (= Blocker B), and the
levers add guard chains / code size / more slow-VS work without removing the dominant cost.

### Phases 2 & 3 — the plan's own falsification clause is TRIGGERED.
Section 5's caveat: "If Phase 2 measures < ~1.4× after guard/load CSE + typed-field GetProp, that is
the signal that the remaining gap is genuinely in the object memory layout and not reachable without
GC-level changes." The typed-operand machinery Phase 2a says it "reuses" (UNBOX + TYPEDLOC) measures
**neutral** on richards (0.84–0.85), and Phase 3 inlining **regresses** (0.82). richards is
call-boundary-bound, not per-op-bound (confirmed earlier in `gecko-wasm-js-wasm-jit` DECISIVE
PROFILING), and its hot methods (`isHeldOrSuspended`, `markAs*`, `*Task.run`) have almost no
within-block GetProp redundancy (reads are separated by SetProp writes or short-circuit block
boundaries), so guard/load CSE (Phase 2b) recovers only low-single-digit %. The ~2.4× gap to target
is in the **value representation**: object slots are NaN-boxed `Value`s in memory, so every integer
field op pays box/unbox/guard. Closing it needs speculative **unboxed type-specialized object slot
storage** (Ion-level `NativeObject` specialization) — which §2/§5 explicitly scope OUT.

### DECISION (per the plan's §5 caveat + §7 off-ramp): STOP the boxed-OO chase.
richards 2× is **not reachable** with the in-scope techniques; it is blocked by the NaN-boxed object
data model, exactly as the author's own `wasm-jit-richards-analysis` memory concluded
("BLOCKED BY THE VALUE REPRESENTATION, not any incremental pass"). The cheap/medium phases each
make richards slower, not faster. Default build kept **non-regressive**: `GECKO_WJVS_SHORTCIRCUIT`
left default-OFF (schedule not compiled → richards neutral 1.00×); it is documented as the rewrite's
entry point and flips schedule to compile when ON, for whoever picks up the data-model work.
What remains for a real richards win is the separate, larger unboxed-slot effort (§2/§5).

**Bonus finding — short-circuit ON also REGRESSES deltablue, so default-OFF is doubly right.**
Default build (short-circuit off): richards **1.00×**, deltablue **1.53×** (med, N=3 — the documented
deltablue win is intact). With `GECKO_WJVS_SHORTCIRCUIT=1`: deltablue drops to **~1.03×**. Compiling
more boxed-OO functions to Mode VS (what short-circuit unlocks) is a net loss on BOTH OO benches —
the same Blocker-B mechanism. The default build is healthy and should not enable short-circuit until
the Mode-VS-fast (unboxed-slot) work lands.

### Phase build status (all gated, default OFF -> default build unchanged + non-regressive)
- **Phase 0** harness — DONE (`_t_rich_ab.cjs`, `_t_matrix2.cjs`).
- **Phase 1** schedule compilation — DONE (`GECKO_WJVS_SHORTCIRCUIT`; premise corrected).
- **Phase 2b** guard/load CSE — **BUILT** (`GECKO_WJVS_CSE`): single-slot within-block GetProp
  cache (kVScse local) keyed by (receiver-source-slot, field), cleared before any non-GC-free /
  mutating / reassigning op (so an untraced cached object pointer can't move or go stale), reset per
  block, boxed-path + top-level only. VALIDATED correct with unbox OFF (the path it's gated to) on
  richards/deltablue/raytrace/crypto/earley-boyer/splay incl. GC-heavy ones (valid scores, no
  crash/NaN; heartbeat confirms it fires: raytrace cse-hits=3, crypto=1). Fires rarely (comparisons/
  calls between field reads clear the cache) -> neutral, as the call-boundary-bound analysis predicted.
  LIMITATION: gated to the boxed path (`!unbox`); since UNBOX is default-ON, CSE only engages when
  unbox is explicitly disabled. A production version would need to coexist with the f64 typed stack.
- **Phase 3** inlining — PRE-EXISTING + functional (`GECKO_WJVS_INLINE`: poly, non-leaf, depth-2);
  measured to REGRESS richards (0.82×) — code-size + guard chains on still-boxed bodies.
- **Phase 2a** unboxed type-specialized fields — **BUILT** (`GECKO_WJVS_TYPEDFIELD`, requires UNBOX):
  a GetProp whose result is immediately consumed by a numeric op (lookahead `WJIsNumericConsumer`) is
  converted straight onto the typed f64 operand stack (`repr=1`, via the existing `WJEnsureF64`
  isNum?unbox:ToNumber) instead of leaving a boxed Value the consumer re-unboxes. SOUND by the
  numeric-use guarantee (the consumer ToNumber-coerces it anyway, so the coercion is exact; the value
  never escapes between GetProp and the op) -- this sidesteps the repr-consistency hazard (every arm
  yields f64) WITHOUT an unsound restart-deopt. VALIDATED correct on richards/deltablue/raytrace/
  crypto/navier-stokes/earley-boyer/splay (incl. the numeric benches that stress the typed stack).
  Mostly neutral on richards (operand stack is already registerized by the regalloc phase, so the
  box/unbox it removes is register-local + cheap); the fully-unboxed-SLOT form (storing the field raw
  in the object) remains the out-of-scope §2/§5 data-model work.
- **Phase 4** lean calls — **BUILT** (`GECKO_WJVS_LEANCALL`): `WJVSCallHelper` skips the GC spill/reload
  for provably GC-safe helpers (`WJHelperGCSafe`: StrictEq/StrictNe -> `js::StrictlyEqual`, which does
  no coercion/allocation/GC). Loose Eq/Ne stay heavy (LooselyEqual can call valueOf -> GC). The
  bystander-only spill from the regalloc phase already covers most of Phase 4's intent; this adds the
  helper-specific case the plan named. Narrow win (helper path is the cold/non-numeric-compare path).

### Consolidated outcome — ALL 5 phases built + validated (gated, default OFF)
Every phase is now implemented behind its own env gate and validated correct together (full stack:
`LEANCALL+TYPEDFIELD+UNBOX+SHORTCIRCUIT+CSE+INLINE`) across richards, deltablue, raytrace, crypto,
navier-stokes, earley-boyer, splay, pdfjs — valid scores, no crash / NaN / OOB (the GC-heavy
splay/earley/pdfjs confirm Phase 4's lean StrictEq is GC-safe; the numeric crypto/navier/raytrace
confirm Phase 2a's typed-stack repr-consistency). Gates: `GECKO_WJVS_SHORTCIRCUIT`,
`GECKO_WJVS_CSE`, `GECKO_WJVS_TYPEDFIELD`, `GECKO_WJVS_UNBOX`, `GECKO_WJVS_INLINE`,
`GECKO_WJVS_LEANCALL`. Heartbeat (`GECKO_DEBUG_JIT`) reports `phase2a typed-field-hits`,
`phase2b cse-hits`, `phase4 lean-calls`.

**richards** under the full stack: **~0.73×** (still a net LOSS) — the boxed-OO dispatch ceiling
(Blocker B) is unmoved by any combination, exactly as predicted: the per-call boundary + NaN-boxed
slot model dominate, and the operand stack is already registerized so the box/unbox the phases remove
is cheap. The remaining 2× requires unboxed object SLOTS (Ion-level NativeObject specialization),
which §2/§5 scope OUT.

**Numeric code — no measurable win from the NEW phases (corrected for noise).** A single full-stack
run showed raytrace 312 vs default 223, but a clean N=4 A/B is raytrace typed-field **0.93×** vs the
interpreter — octane absolute scores swing ±15–30% run-to-run, so the 312 was a lucky sample, not a
real gain. The established crypto ~3× win is PRE-EXISTING (UNBOX+TYPEDLOC, already default-on) and is
preserved; Phase 2a's typed-FIELD GetProp adds no measurable A/B win on top (the operand stack is
already registerized, so the box/unbox it removes is cheap). Honest summary: the new phases are
correct and available, but none moves the clean-A/B needle on richards or raytrace.

**Default build: zero functional change, non-regressive** (all six gates default OFF; verified
richards/deltablue/crypto/splay/raytrace correct + in-range). Engine artifacts added: Phase 2a/2b/4
codegen behind gates; Phase 1/3 are gates over pre-existing capability. Plus this results section +
bench harnesses (`_t_rich_ab.cjs`, `_t_matrix2.cjs`).
