---
name: wasm-jit-modevs-getprop-poly-length
description: "The big DeltaBlue win: N-way polymorphic Mode VS GetProp + inline .length (string+dense-array). Took octane DeltaBlue from 1.35x to ~2.5x over the interpreter."
metadata:
  type: project
---

LANDED 2026-06-18 in firefox/js/src/wasm/WasmJS.cpp (WJVSGetProp). Two changes to
Mode VS GetProp, the dominant Mode VS helper-call boundary tax on DeltaBlue:

## 1. N-way polymorphic shape guard (was monomorphic)
Mode VS GetProp guarded ONE receiver shape (way 0); DeltaBlue's constraint-subclass
receivers are polymorphic, so it thrashed way 0 and fell to the wjhelp WHJ_GETPROP
helper on every shape flip. Rewrote WJVSGetProp as an N-way (kWJICWays=4) receiver-
shape chain reusing the SHARED poly IC arrays (gWJICTableX / gWJProtoHolderX /
gWJProtoHolderShapeX) + the existing poly fill policy in WJFillIC (just set
gWJSitePoly[site]=true -- the fill already self-heals up to 4 shapes for op==GetProp).
Each way handles own fixed/dynamic slot + a prototype-chain data property (holder
shape guard). Inner miss -> helper. This was the SAME machinery Mode V GetProp
already used; Mode VS just hadn't been wired to it.

## 2. Inline .length (string + dense array)
`arr.length` compiles to JSOp::GetProp name="length"; array length is a CUSTOM data
property (isDataProperty()==false) so the slot IC always bailed (ownacc) to the
helper. DeltaBlue's OrderedCollection.size() = this.elms.length in hot loops.
Added (mirroring Mode V): detect name==names().length -> gWJSiteLen[site]=true;
emit STRING-length (JSString header off 4, immovable) + dense-array length
(i32.load[ i32.load[recv+12]/*elements_*/ - 4 ], boxed int32, >=2^31 -> helper),
shape-guarded for arrays (WJFillIC caches array shape for gWJSiteLen sites).

## Measured (octane DeltaBlue, within-binary A/B, off~86 baseline)
- off (no JIT)            = 86    1.00x
- monoprop (mono GetProp) = 116   1.35x   (the OLD behavior)
- nolen (poly, no length) = 184   ~2.1x   (poly alone)
- jit (poly + length)     = 225   ~2.5x   (FULL)
N=9 medians for poly-alone gave jit=202 (2.35x) vs monoprop 116 (1.35x).
Correctness: DeltaBlue self-validates (Octane); x6 clean ok=6 oob=0 crash=0.

## A/B gates (within one binary)
GECKO_WJVS_NOPOLYPROP=1 -> monomorphic GetProp (1 way + rewrite-way-0 fill).
GECKO_WJVS_NOLEN=1      -> .length falls to helper (no inline).
GECKO_WJVS_NOPOLYCALL=1 -> see [[wasm-jit-polymorphic-call-ic]] (call dispatch, perf-neutral).

## Next levers toward 5-10x (per helper histogram after this: Ne, SetElem dominate)
- SetElem/SetProp inline OBJECT values (currently number-only, to avoid the GC
  post-write barrier) -- DeltaBlue stores objects into arrays constantly.
- Ne/Eq fast path for null + object-identity operands (currently number-only).
- Running a per-sub-benchmark JIT-on/off sweep to pick the easiest 5-10x target
  (numeric benches in Mode V are already 8-28x per [[gecko-wasm-js-wasm-jit]]).
See [[gecko-wasm-js-wasm-jit]], [[wasm-jit-modevs-reentry-crash]].
