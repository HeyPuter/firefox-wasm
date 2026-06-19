---
name: wasm-jit-middleend-phasea
description: "boxed-OO middle-end progress: Phase A (SSA IR, parity proven), Phase B (GVN load-CSE, correct/neutral), Phase F (deopt-resume MECHANISM PROVEN but blocked on JitScript provisioning). All gated, default OFF. Gates GECKO_WJVS_IR / _GVN / _FDEOPT."
metadata: 
  node_type: memory
  type: project
  originSessionId: bb3f6b71-628c-4bff-8084-c9e63c53d30d
---

The JS→wasm JIT now has the **Phase A SSA IR substrate** from `jit-memory/boxed-oo-middleend-plan.md`,
landed 2026-06-18 in `firefox/js/src/wasm/WasmJS.cpp`. Gate `GECKO_WJVS_IR` (default OFF).

What exists: `WJTy` lattice, `WJIROp`/`WJIRNode`/`WJIRValue`/`WJIRRegion`, `WJIRClassify` (per-op
stack effect + result type), `WJIRBuild` (abstract-interprets one straight-line region into a
block-local SSA value graph), `WJIRLowerRegion`. `WJEmitBodyVS`'s per-block loop buffers straight-line
ops into `irRegion` and flushes at each control-flow op / block boundary; `irDepth` shadows operand
depth so the overflow backstop bails at the same op as the non-IR path (same set of functions compile).

**Phase A lowering is delegating**: `WJIRLowerRegion` emits each op via the same `WJEmitOpVS` the
per-op path calls → byte-identical wasm (parity by construction). The value graph is *built* but not
yet *consumed*; the lowerer is not node-aware. That is Phase B's job.

Parity proven, not just measured: added `GECKO_WJ_HASH` (FNV-1a of emitted module bytes per fn) +
`embed-xul/bench/_t_ir_hash.cjs`. richards/deltablue/navier-stokes are bit-for-bit identical IR-on vs
off; crypto's only diffs are same-length IC-site-address bake-in nondeterminism (reproduced by an
IR-off-vs-IR-off baseline; some are on modeVS=0 fns the IR never touches). Diagnostic heartbeat:
`phaseA ir-regions=N ir-nodes=M`.

**Phase B LANDED 2026-06-18** (gate `GECKO_WJVS_GVN`, default OFF, boxed path / requires
`GECKO_WJVS_NOUNBOX`). Redundant-load elimination over the IR: `WJIRBuild` now value-numbers frame
loads (`slotCur[]`/`thisVal`) and hash-conses `GetProp` results (a redundant `(receiverVN, field)`
load gets the same VN so chained `a.b.c` reuses compose). `WJIRClobbers` = Call/SetProp/SetElem/
GetElem/arith clear the cache; a data-property `GetProp` is NON-clobbering (so repeats compose —
sound only for side-effect-free data props, same assumption as `kVScse`). Reused results are cached
in `kWJGvnSlots` GC-TRACED frame slots (above the operand stack; frame only enlarged when GVN active,
so default build is byte-unchanged). `WJIRLowerRegion` is node-aware when a region has reuse: a reused
GetProp copies its cache slot into the receiver-top slot instead of re-emitting guard+load+helper.
Diagnostic: `phaseB gvn-hits=K`.

**Phase B empirical finding**: correct (octane self-validates; no crash/wrong-score on 7 benches) but
fires RARELY — raytrace=3, crypto=1 (same sites `kVScse` caught), deltablue=0, richards~0; perf within
noise. Within-block clobber-free repeated reads are rare because the hot code is call-dense (calls
clobber + end the region). The redundancy that matters is cross-block / loop-invariant → the real
lever is **Phase C (LICM)**, which needs **Phase F (deopt)** for sound guard hoisting. Within-block GVN
sits at the `kVScse` ceiling. Making GVN default-on needs a no-getter/data-property guard or Phase F.

Harness: `embed-xul/bench/_t_gvn.cjs` (boxed-path A/B + gvn-hits). See [[wasm-jit-richards-analysis]],
[[wasm-jit-modevs-getprop-poly-length]], and the plan doc §3 Phase A/B STATUS blocks.

**Phase F (deopt/resume): MECHANISM PROVEN, blocked on JitScript provisioning, 2026-06-18** (gate
`GECKO_WJVS_FDEOPT=N`, default −1/off; default build clean; FDEOPT=1 now non-destructive). Single-frame
resume: a Mode VS body bails (writes resume pc to `gWJScratch[kWJResumePcSlot]`, returns deopt code 3);
`WasmJitRunCall` centralizes resume via `WasmJitResumeViaPBL` (fresh PBL activation at `code+pcOff` with
fixed-slot locals injected via new `osrLocals` param on `PortableBaselineInterpret`), returns 1 so all
callers are transparent. PROVEN: a forced-bailed LEAF (richards.js:527 Packet.addTo) resumes and runs to
completion = PBIResult::Ok with correct frame/pc/locals/stack/this/realm/env; all 6 benches run to correct
scores with the safe gate. WASM IS DEBUGGABLE via the trap's DWARF stack trace (no native gdb; engine is
wasm) — capture full RuntimeError.stack + console. 8 bugs fixed: stale Interpreter.cpp decl; icEntry desync
(→bail only at JumpTarget/LoopHead); missing JitScript→table-OOB; GC of resume locals (→stage to
gWJScratch); realm not entered (→AutoRealm, ContextChecks::check assert); LOCAL ORDER REVERSED (valueSlot(i)
=frame-(i+1) so sp[i]=unaliasedLocal(nfixed-1-i) → inject at sp[nfixed-1-i]; was the silent wrong-result
bug); AutoKeepJitScripts lifetime; JITSCRIPT CREATION FROM JIT CONTEXT corrupts the zone IC LifoAlloc (later
AttachBaselineCacheIRStub traps; confirmed by bisection). JITSCRIPT PROVISIONING SOLVED: create the
JitScript at compile time in WJCompile via the normal path — `cx->zone()->ensureJitZoneExists(cx)` then
`script->ensureHasJitScript()` INSIDE `AutoRealm(cx, script)` (createJitScript asserts cx->check(script));
skipping realm or jit-zone-init corrupts the IC LifoAlloc. RESULT: richards GECKO_WJVS_FDEOPT=1 → CORRECT
score (60) with 112 clean mid-execution resumes; raytrace/navier/splay correct; no crashes on any bench.
CROSS-FRAME / NON-LEAF SOLVED via SELF-RESUME: instead of propagating a bail up the wasm call chain, the
bailing fn calls wjhelp(WJH_RESUME) which finishes its body in PBL (WasmJitResumeViaPBL) from the recorded
pc + its own frame (args/locals from gWJFrameMem[basesp..]) + this (saved to a dedicated frame slot at the
prologue so nested calls clobbering gWJScratch[kWJThisSlot] don't matter), writes result to
gWJScratch[kWJResultSlot], returns 0 = a NORMAL result -> call_indirect OR C++ caller is oblivious;
removed the deopt-code-3 path in WasmJitRunCall. PROVEN: richards FDEOPT=1 → correct score (60) with
richards.js:324 TaskControlBlock.run (NON-LEAF, calls this.task.run) bailing while invoked via
call_indirect and self-resuming correctly; no crash on any bench. SINGLE-FRAME + CROSS-FRAME both work.
Restrictions (fdeoptOK scan): no SetArg/aliased/lexical-env-push, boxed path, nfixed<=32, compile-
provisioned JitScript. OPEN (perf only): forcing a bail per call every iteration is pathologically slow
(deltablue thousands of resumes → timeout, no crash); real use must bail RARELY (genuine speculation
failure) for a perf-positive opt. Harness `embed-xul/bench/_t_fdbg.cjs`. See plan doc §3 Phase F STATUS.
