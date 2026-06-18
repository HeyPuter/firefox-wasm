---
name: wasm-jit-polymorphic-call-ic
description: "N-way polymorphic call IC in the JS->wasm Mode VS JIT: implemented + correct + engaged on DeltaBlue, but performance-neutral (bottleneck is property-access helpers, not call dispatch)."
metadata:
  type: project
---

BUILT 2026-06-18 in firefox/js/src/wasm/WasmJS.cpp: an N-way (kWJCallWays=4)
polymorphic call inline cache. Before, each call site cached ONE callee
(gWJCallFn[site]); a polymorphic site (deltablue's constraint subclasses
dispatching the same method on many shapes) rewrote way 0 every miss and mostly
fell through to the generic WHJ_CALL helper.

## Implementation
- Data: gWJCallFnX / gWJCallHandleX (extra ways, laid out [(way-1)*kWJMaxSites+site]),
  gWJCallWaysFilled[site]. Way 0 reuses gWJCallFn/gWJCallHandle.
- Emit (WJVSCall non-inline path): load callee low32 -> kVSti2; selected handle
  kVSti init -1; unrolled chain of `kVSti = (low32==fn_w) ? handle_w : kVSti`
  via Op::SelectNumeric (0x1b, NOT Op::Select which doesn't exist); then
  `if (kVSti != -1) { spill; call_indirect(kVSti); reload; deopt-check } else { generic }`.
  One call_indirect shared across ways (table index from the local). -1 sentinel
  works because real table indices are >= 0.
- Fill (WJFillIC Call branch): add callee to next free way (skip if already
  cached), up to kWJCallWays; all-full -> gWJCallMegaMiss++ (stays on helper).
- A/B gate GECKO_WJVS_NOPOLYCALL=1 reverts to 1 emitted way + monomorphic
  rewrite-way-0 fill (the pre-poly baseline), for within-binary A/B.
- Diagnostics: GECKO_DEBUG_JIT call-sites line now prints `polyways=N megamiss=N`.

## Result: correct + engaged, but NO speedup on DeltaBlue
Correctness: octane DeltaBlue x8 clean (ok=8 oob=0 crash=0; octane self-validates).
Engaged: DeltaBlue shows `polyways=11 megamiss=0` (11 sites grew a 2nd+ callee, none
exceeded 4 ways). Within-binary A/B (N=9 medians, off stable at 86):
  poly(jit)=114 (1.33x over off)   mono=117 (1.36x)   -> TIED within load noise.
So poly call dispatch does NOT move DeltaBlue. Same conclusion as method inlining
([[wasm-jit-modevs-reentry-crash]] era work): the call-dispatch mechanism is not the
bottleneck. The generic WHJ_CALL helper already reaches the compiled callee (via
JS::Call -> WasmJitRunCall); the poly IC only saves marshalling overhead on those
sites, a small fraction of total time.

## Where the time actually is (the real 5-10x lever)
DeltaBlue is dominated by the Mode VS helper-call BOUNDARY TAX: GetProp / SetProp /
SetElem / GetElem each cross into the `wjhelp` C++ helper. The next high-value work
is Mode VS INLINE property/element access (inline the shape-guard + slot load/store
in wasm so the hot GetProp/SetProp/SetElem stop calling helpers), not call dispatch
and not method inlining. See [[gecko-wasm-js-wasm-jit]].
