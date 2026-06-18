---
name: wasm-jit-modevs-reentry-crash
description: "Pre-existing intermittent OOB crash (~1/6 on octane DeltaBlue) in the DEFAULT JS->wasm JIT build, root-caused to the Mode VS wasm->gecko re-entry path; fix in PortableBaselineInterpret.cpp."
metadata:
  type: project
---

DISCOVERED 2026-06-18 while chasing an "inline OOB": the intermittent `RuntimeError:
memory access out of bounds` (~1/6 runs, crashes the renderer) on octane DeltaBlue is
PRE-EXISTING in the DEFAULT JIT build (no inlining) — it is NOT caused by method inlining.
It explains the chronically flaky DeltaBlue A/B runs.

## Root cause
A call-heavy function recompiled to Mode VS (the no-restart, GC-traced emitter) runs as
host wasm. When it makes a generic call it invokes the `wjhelp` import (WHJ_CALL) which
calls `JS::Call`, RE-ENTERING gecko and spinning up a NEW `PortableBaselineInterpret`. That
re-entrant interpreter builds its software stack starting at
`cx->portableBaselineStack().top` (see Stack ctor, ~line 207). At the `WasmJitRunCall` call
site in `PortableBaselineInterpret.cpp` (CallScriptedFunction CACHEOP, ~line 2417) the wasm
path did NOT establish an exit frame / lower `pbStack.top` below the freshly-pushed args
(the isNative path right above DOES: it pushes a CallNative exit frame + sets top=sp). So
re-entry's stack overlapped the live outer frame -> intermittent heap corruption -> OOB,
and the JIT exit-frame chain was inconsistent for `TraceJitFrames`/`TraceJitExitFrame`
during a GC. Same FAMILY as the earlier "orphan BaselineStub frame" crash; that fix (move
the BaselineStub push into the recursion-only branch) was incomplete.

## Confirmation
`GECKO_WJVS_NOHASCALL=1` (keeps call-heavy fns OUT of Mode VS -> no wjhelp re-entry) =
12/12 clean. Default = crashes. Bisect runner: embed-xul/bench/_t_inlcrash.cjs
(OCT=deltablue ITERS=N QS=..., relaunches the browser per iter so it survives a crash;
reports `RESULT ok/oob/crash`). NOTE: pipe output to a FILE (`> f.log 2>&1`), never `| tail`
(buffers); and a leading `pkill ...` returning nonzero ABORTS the bash chain (errexit).

## Fix (PortableBaselineInterpret.cpp, the wasm branch of the call CACHEOP)
Mirror the isNative path: around `WasmJitRunCall`, PUSHNATIVE argc + BaselineStub descriptor
+ fake-ret + saved-fp + `ExitFrameType::CallNative`, set `ctx.stack.fp = sp`,
`setJSExitFP`, `pbStack.top = sp`; then fully restore (fp, top, jsExitFP, POPNNATIVE(5))
so BOTH wjr paths (use-result / fall-to-recursion) see a pristine stack. The
descriptor+exit-frame PAIR is what keeps it from being the orphan-frame crash.
A partial fix (only setting pbStack.top=sp) cut the rate ~1/6 -> ~1/12 but did not eliminate
it; the full exit-frame is needed.

CONFIRMED 2026-06-18: with the full exit-frame fix, DeltaBlue x18 = ok=18 oob=0 crash=0
(default crashed ~1/6, partial-fix ~1/12). The pre-existing crash is resolved; the default
JIT build is now stable on DeltaBlue. This also unblocks method inlining (same re-entry
path) and reliable A/B measurement.

See [[gecko-wasm-js-wasm-jit]] for the JIT overview.
