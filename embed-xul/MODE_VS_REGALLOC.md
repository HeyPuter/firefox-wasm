# Mode VS register-allocated operand stack — design

Goal: make Mode VS (the mode mutating-OO code uses: richards/deltablue) faster than
the PBL interpreter, instead of ≈ it. This is THE change that gives a noticeable
octane OO win. All JS→wasm JIT code lives in `firefox/js/src/wasm/WasmJS.cpp`.

## Why this is the fix (established by profiling — see memory STAGE 13)
- Profiled richards+deltablue: `runs ModeV(fast)=0, ModeVS(slow)=~400k`. 100% of hot
  runs are Mode VS, because the hot functions MUTATE (`this.x=...`), which requires
  Mode VS for GC safety.
- Mode VS keeps its operand stack in frame MEMORY (`gWJFrameMem`, so the GC can trace
  live object pointers), values BOXED, with a memory round-trip + type guard per op.
  That's the interpreter's work transliterated to wasm: ≈ interpreter speed.
- The 7× numeric win (jinum.html) comes from Mode N/V: unboxed f64 in wasm LOCALS
  (registers), no guards, loop stays in-wasm. Mode VS can't use that path today.

## The design: operand stack in wasm locals, GC-spill at safepoints

### Representation
- Operand-stack slot at static depth `d` (the emitter tracks `c.depth`) → wasm i64
  local `sBase + d`. Allocate `kWJVSMaxStack` (48) i64 locals `s[0..48)`.
- Phase 1: KEEP args/locals/rval in the GC-traced frame (`gWJFrameMem`). Only the
  operand stack moves to locals. (Operand stack is touched every op → most of the win;
  lower risk. Phase 3 can move locals too.)
- Between safepoints the operand stack is in registers (fast). The frame's operand-
  stack region is STALE then — but the GC never reads it then (no GC between
  safepoints), so that's fine.

### Safepoints (the ONLY ops that can allocate → GC)
`WJVSCallHelper` (wjhelp import) and `WJVSCall` (`call_indirect`). NOTHING else the
emitter produces allocates (i64 loads/stores, arithmetic, shape guards, compares).
Inline fast paths (GetProp hit, SetProp-of-number, arith) are NOT safepoints.

At each safepoint, wrap the call:
1. SPILL: for `d` in `[0, c.depth)`: `gWJFrameMem[stackBaseS + d] = s[d]` (i64.store).
2. Publish: set `gWJFrameSP` to cover `stackBaseS + c.depth` so `WJTraceRoots` traces
   the spilled operand stack. (Args/locals/rval already covered + traced.)
3. Do the helper/call (may GC; GC updates moved object pointers IN the frame slots).
4. RELOAD: for `d` in `[0, newDepth)`: `s[d] = gWJFrameMem[stackBaseS + d]` (picks up
   moved pointers). `newDepth` = depth after the op's stack effect.

Centralize: make `WJVSCallHelper`/`WJVSCall` (and their result-push) do the
spill/reload, so every safepoint is covered by construction. Operands passed to
helpers via `gWJHelpA/B/C` are already GC-rooted (WJTraceRoots traces them) — keep that.

### Soundness invariant (the proof obligation)
At any program point where a GC can occur, every live object Value is in the GC-traced
frame (`gWJFrameMem[0..gWJFrameSP)` ∪ `gWJHelpA/B/C` ∪ `gWJScratch[...]`). Between such
points, values may be in wasm locals (untraced) but NO GC can occur there.
- Only import calls + `call_indirect` allocate ⇒ safepoints = exactly those sites.
- Spill-before + reload-after wraps every safepoint ⇒ invariant holds.
- START CONSERVATIVE: spill ALL live slots `[0, depth)` at every safepoint (don't try
  to compute a minimal live set first). Optimize later only after it's verified.

### The store-pattern change (the bulk of the mechanical work)
Today: `WJSAddr(slot); <value>; WJSStoreEnd()` (frame store) and `WJSLoadSlot(slot)`
(frame load). For OPERAND-STACK slots these become register ops; locals aren't
addressable so the `[addr,value]` pattern can't stand. Introduce an operand-stack
abstraction and rewrite the ~25 `WJVS*` ops in terms of it:
- `WJVSpush(emitValue)`: emit value-producing wasm, then `local.set s[c.depth]; c.depth++`.
- `WJVSpeek(d)`: `local.get s[d]`.
- `WJVSpop()`: `c.depth--` (value now in `s[c.depth]`).
- GetLocal/GetArg: `local.get` from FRAME (arg/local), then push to `s[depth]`.
- SetLocal/SetArg: pop `s`, store to FRAME slot.
Keep the existing `WJS*` frame helpers for args/locals/rval (Phase 1).

### Phasing
- Phase 1: operand stack → locals; args/locals/rval stay frame; spill/reload at
  helper+call. Verify GC-safe, measure. (Expected: removes the per-op memory round-
  trip; dispatch-elimination becomes a net win → OO faster than interpreter.)
- Phase 2 (bigger win): TYPE-SPECIALIZE. Track a static type per operand slot
  (int32 / double / object / unknown). Keep numeric slots UNBOXED (f64 in a parallel
  local), skipping box/unbox/guard across consecutive numeric ops. This is the real
  optimizing layer.
- Phase 3: move args/locals to locals too (spill at safepoints like the stack).

### Test plan (GC-safety is the critical risk)
- `jistr2.html` (mutating string loop, heavy alloc) — exact total, no crash.
- NEW `jivsr.html`: a mutating-OO loop that (a) reads+writes object fields, (b) holds
  object Values on the operand stack ACROSS a call that allocates heavily (force
  nursery GC + tenuring/compaction), (c) checks exact results — the GC-safety acid test.
- octane deltablue/richards self-validate; run ON/OFF for perf (low machine load —
  the heartbeat/score are noisy above loadavg ~8).
- Validator catches STRUCTURAL bugs (graceful compile-fail). It does NOT catch a
  spill/reload SEMANTIC bug → that's silent heap corruption; the acid test is the guard.

### Rollback / safety
- Add the local-based path ALONGSIDE the frame `WJS*` helpers, behind a flag, so you
  can A/B (frame vs register) and revert instantly if the acid test fails.
- The existing `!hasCall` forceVS gate + the helper-dominated disable-guard limit blast
  radius during bring-up.

## Current build state (the baseline this builds on)
Inline GetGName in Mode VS (WJVSGetGName + WJH_GETGNAME→WJFillIC) eliminated ~1M helper
crossings (helper-calls 3.4M→3.6k). Disable-guard (helper-dominated VS fn → interpreter,
K=1). Diagnostic counters on the GECKO_DEBUG_JIT heartbeat: runs ModeV/ModeVS,
forceVS-recompiles, helper-calls, helper-kind histogram, per-fn helperCalls. octane: 0
steady-state deopts, no crash, OO neutral, numeric 7×. jilogic 97/97, jistr 15/15,
jistr2 exact.
