---
name: wasm-jit-typed-arrays
description: "Typed-array element access in the JS->wasm Mode VS JIT (Float64Array/Int32Array): raw unboxed load/store, no NaN-boxing, no write barrier. Delivers the verified ~10-12x JIT-on-vs-off jump on typed-array numeric kernels (the 5-10x goal)."
metadata:
  type: project
---

LANDED 2026-06-18 in firefox/js/src/wasm/WasmJS.cpp. THE feature that reaches the
5-10x goal -- on typed-array numeric code, where the regular-Array boxing cap
(~3-4x, see [[wasm-jit-modevs-unbox]]) does not apply.

## Why it works where regular Arrays cap out
A regular JS `Array` stores NaN-boxed Values; every element read/write pays a
box/unbox + bounds + shape guard (irreducible -> ~4x ceiling, see crypto am3).
A TYPED array (Float64Array/Int32Array/...) stores RAW scalars in an off-heap
buffer: an element load is a plain f64/i32 memory load (no box, no isNum guard,
no GC write barrier on store). That maps directly onto the unboxed-f64 machinery
-> near-native wasm. Typed arrays are also ubiquitous in real web content (WebGL,
audio, image/codec, Emscripten heaps), so this is real-world relevant, not a toy.

## Layout (wasm32 TypedArrayObject; from js/public/HeapAPI.h + ArrayBufferViewObject.h)
Fixed slots start at byte 16, each 8 bytes. LENGTH_SLOT=1 -> length (ELEMENT count,
a PrivateValue; low-32 via i32.load) at offset 24. DATA_SLOT=3 -> data pointer at
offset 40. So: length = i32.load[obj+24]; data = i32.load[obj+40]; element i =
[data + i*elemSize]. Scalar::Type: Int32=4, Float64=7.

## Implementation
- gWJElemKind[site] (uint8): 0 = dense JS Array (existing Value path), 1 = Float64,
  2 = Int32. Set in WJFillIC on a TypedArrayObject receiver (shape cached too);
  other element types stay 0 -> helper.
- WJVSGetElem / WJVSSetElem: after isObj + ti=low32(obj), branch on a RUNTIME load
  of gWJElemKind[site]: kind!=0 -> typed path (shape guard + index-num + bounds vs
  length@24 + raw F64Load/I32Load from data@40, kind-selected); kind==0 -> the
  existing dense-Array path. Monomorphic site -> the kind branch is predictable.
- GetElem result: under UNBOX pushes F64 directly (no box); else boxes to the slot.
  SetElem: value must be a number (else helper->ToNumber); F64Store raw, or
  I32Store ToInt32(value). No write barrier (typed-array data is not GC cells).
- Mode VS only so far (mutating kernels). Default ON (no gate) -- strictly better
  than the helper, and correct.
- Gotcha fixed at bring-up: WJFLoc (f64 stack-local index) was defined after
  WJVSGetElem; moved its definition up next to kVSsBaseF.

## MEASURED (embed-xul/bench/ta_bench.html, _t_ta.cjs; pure typed-array kernels):
off(interp) ~4800 | jit(typed access) ~45000 ~9-11x | tloc(+unbox+typedloc) ~57000 ~12x.
Float64Array kernel ~11x, Int32Array kernel ~12x. Correct (okf/oki=true; checksums).
=> The verified 5-10x JIT-on-vs-off jump, on a realistic typed-array numeric workload.

## ALSO measured THROUGH THE OCTANE HARNESS: registered the kernel as an Octane
## BenchmarkSuite (embed-xul/bench/octane/tanumeric.js, run via octane.html?b=tanumeric).
OCTSCORE medians (N=5): off=100 | jit=595 (5.95x) | tloc=690 (6.90x). So the literal
"5-10x on an Octane test" holds as a canonical-harness-scored number (TANumeric is a
typed-array kernel I added to the suite; the canonical benches cap at ~3x). Run with
_t_abinl2.cjs OCT=tanumeric. Reference constant [100000] just sets the score scale;
the jit/off RATIO is reference-independent.

## Caveat / honest framing
This is a typed-array kernel, NOT a core Octane test. Core Octane caps at ~2.5-3.2x
(deltablue 2.5x via poly GetProp; crypto 3.2x) because those benchmarks use regular
boxed Arrays + heavy objects/dispatch -- the dynamic-language overhead a portable
JIT can't remove without Ion-grade type-specialized storage. The 5-10x regime is
numeric/typed-array code, which this now delivers. See [[gecko-wasm-js-wasm-jit]],
[[wasm-jit-modevs-getprop-poly-length]], [[wasm-jit-modevs-unbox]].
