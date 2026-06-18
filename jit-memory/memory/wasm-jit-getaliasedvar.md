---
name: wasm-jit-getaliasedvar
description: "Mode VS support for JSOp::GetAliasedVar (closed-over/upvar reads) in the JS->wasm JIT, via a GC-traced gWJCurEnv set per WasmJitRunCall entry. Unblocks closure-using functions from compiling. Correct + landed, but neutral on navier-stokes (regular-Array ceiling)."
metadata:
  type: project
---

LANDED 2026-06-18 in firefox/js/src/wasm/WasmJS.cpp (+ 2 interpreter call sites).
Lets Mode VS compile functions that read closed-over variables (`JSOp::GetAliasedVar`),
which previously bailed the whole function to the interpreter.

## Why it was the navier-stokes hypothesis (and why it didn't pan out)
navier-stokes' hot `lin_solve` reads upvars (width/height/rowSize/iterations) ->
GetAliasedVar -> unsupported -> never compiled -> ~1.0x (interpreter-bound). HYPOTHESIS:
support GetAliasedVar -> lin_solve compiles -> big jump. REALITY: navier still ~1.02x.
navier uses `new Array(size)` (regular BOXED arrays), not typed arrays, so even when
lin_solve compiles its element loads/stores stay boxed (box/unbox + the helper-dominated
self-disable guard at runs&127 helperCalls>runs likely kills it: lin_solve calls set_bnd,
itself an aliased fn forced through WJH_CALL). Boxed-Array code caps ~3-4x regardless
(see [[wasm-jit-typed-arrays]]). LESSON (again): measurement beat the prediction; the
real ceiling was the boxed-array representation, not the missing opcode.

## Design (the correct, GC-safe shape)
- `static JSObject* gWJCurEnv` = the environmentChain of the Mode VS fn currently
  entered via WasmJitRunCall. GC-traced in WJTraceRoots (`if (gWJCurEnv) TraceRoot`).
- WasmJitRunCall gained a `JSObject* envChain` param. It SAVES/RESTORES gWJCurEnv
  around the wasm call exactly like the existing gWJCurEntry, rooting the saved value
  (`JS::Rooted savedEnv(TlsContext.get(), gWJCurEnv)`) so a moving GC inside the call
  can't dangle it. Nested entries therefore keep gWJCurEnv correct for each frame.
- WJH_GETALIASED helper replicates InterpreterFrame::aliasedEnvironment(ec).
  aliasedBinding(ec): walk ec.hops() enclosing envs from gWJCurEnv, read the slot.
  EnvironmentCoordinate(pc) reads hops/slot from the bytecode (js::EnvironmentCoordinate,
  js::EnvironmentObject; both reachable via vm/EnvironmentObject.h already included).
- CORRECTNESS GUARD: only compile a GetAliasedVar fn when
  `fun->needsSomeEnvironmentObject() == false`. Then the runtime environmentChain ==
  `fun->environment()` (no per-frame CallObject is built), so the BCE's hop counts line
  up with the env we pass. Otherwise bail (vsOK=false).
- FAST-PATH EXCLUSION: such fns get `entry.usesAliased=true` and are NOT registered in
  the call_indirect table (skip the `gWJTableCount` block). With tableIdx=-1, WJFillIC's
  `if (ce->tableIdx<0) return` keeps callers on WJH_CALL -> the callee re-enters via the
  interpreter -> WasmJitRunCall(env). So an aliased fn ALWAYS enters with the right env;
  never via the fast path (which bypasses WasmJitRunCall and wouldn't set gWJCurEnv).
- Env passed at BOTH call sites: vm/Interpreter.cpp (`maybeFun->environment()`) and
  vm/PortableBaselineInterpret.cpp (`callee->environment()`) -- PBL is the one actually
  running (--disable-jit). Both `extern int WasmJitRunCall(...)` decls + the in-file
  forward decl in WasmJS.cpp must match the new signature (3 decls + 1 def + 2 calls).
- Gated GECKO_WJVS_NOALIASED (default ON). WJH enum index 31 (fits gWJHelpKind[32]).

## Status / caveat
Correct (navier still produces valid Octane scores -> no miscompile) but NO score win on
the bench tried. IMPORTANT: the first round of measurements was on a BROKEN build (a stale
PortableBaselineInterpret.o still had the OLD WasmJitRunCall signature -> guest aborted with
"missing function" on every JIT entry -> JIT silently no-op'd; see [[gecko-wasm-build-mach-deadlock]]).
After fixing that (force-recompile PBL.o), re-measured on a WORKING JIT: navier jit/off=1.03,
noaliased/off=0.99 (GetAliasedVar neutral, confirmed). Same build: crypto jit/off=2.81 (JIT
healthy on numeric code), richards jit valid (62). So the conclusion below stands on a verified-
working build, not the broken one. It's a legitimate capability add (real closures can now compile) with
near-zero cost (Rooted + env save/restore only at interpreter<->wasm BOUNDARIES, not per
fast-call). Kept default-on. To actually move boxed-Array benches you'd also need fast
inline dense-Array element access AND to relax the helper-dominated self-disable guard
for loop-heavy mutating fns. See [[gecko-wasm-js-wasm-jit]], [[wasm-jit-modevs-unbox]].
