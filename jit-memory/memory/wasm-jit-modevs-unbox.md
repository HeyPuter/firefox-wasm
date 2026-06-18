---
name: wasm-jit-modevs-unbox
description: "Unboxed f64 operand stack in Mode VS (GECKO_WJVS_UNBOX): numeric kernels in mutating functions run near Mode V speed inside the no-restart emitter. Crypto ~1.77x -> ~2.9x."
metadata:
  type: project
---

BUILT 2026-06-18 in firefox/js/src/wasm/WasmJS.cpp. The key lever for NUMERIC
octane benchmarks.

## TWO CORRECTNESS BUGS -> BOTH FIXED 2026-06-18 (unbox + tloc now correct on 11 benches)
Earlier finding (NaN/crash on OO code) was REAL and is now ROOT-CAUSED + FIXED. Two distinct bugs:

### Bug 1: GetElem result repr mismatch (broke UNBOX alone; richards->NaN)
WJVSGetElem's pushF64 lambda set `c.repr[resD]=1` at COMPILE time (result lives unboxed in
sf[resD]). But the op emits THREE runtime arms: typed-array (writes sf[], unboxed), dense-Array
(writes the BOXED slot objS), and helper (boxed). Only the typed-array arm matched the static
repr=1. Regular dense arrays (richards `taskTable[id]`) take the dense arm at runtime -> value in
boxed s[resD], but the compiler emitted later ops reading the stale sf[resD] -> garbage/NaN.
This is why UNBOX-alone (no typedloc) already broke richards, and why UNBOXMASK=0 (all typed
arith disabled) STILL broke it -- GetElem's repr=1 isn't one of the gated arith categories.
FIX: GetElem ALWAYS boxes its result (remove the `if(c.unbox)` keep-unboxed branch; use the
box-into-objS path the non-unbox build already used). Cost: a typed-array element read gets
reboxed then re-unboxed by the next arith op -- acceptable (element box/unbox is the irreducible
cost anyway, and crypto's win is from typed LOCALS not GetElem). A single op emitting both an
inline-f64 arm AND a boxed helper arm canNOT carry a static repr=1; the static repr must match
EVERY runtime arm. (Same discipline already applied to WJVSCmp/Return via WJMaterializeAll.)

### Bug 2: slot analysis ignored STORES (crashed tloc; richards renderer crash)
WJAnalyzeNumericSlots typed a slot if its READS were all numeric, but modeled SetLocal/SetArg as
no-ops -- so it never checked what was STORED. Packet.addTo: `var peek; while((peek=next.link)!=null)
next=peek;`. peek holds OBJECTS (next.link) but is only read via `next=peek` (a copy, never a
tainting use) -> classified numeric -> its object value ToNumber'd to NaN on store -> `next=peek`
then `next.link` derefs a number-as-object -> hard renderer crash. FIX: in SetLocal/SetArg, taint
the destination slot when the stored value (top of abstract stack) is NOT provably numeric (-1):
`if (st.empty() || st.back() != -1) taint(dst);`. Do NOT retag st.back()=dst -- leaving the
original provenance lets downstream uses still taint the TRUE source slot (e.g. `tmp=obj; tmp.foo`
must taint obj). am3's typed locals are assigned arithmetic results (-1) so they stay typed ->
crypto unaffected (563). The soundness invariant is now BOTH: every USE numeric AND every DEF numeric.

### Validation (all correct under tloc=UNBOX+TYPEDLOC, no NaN/crash):
richards=62 crypto=563 deltablue=181 raytrace=195 splay=556 navier-stokes=284 earley-boyer=437
regexp=127 box2d=301 code-load=5029 (+ heavyweight mandreel/zlib/pdfjs/typescript/gbemu in progress).
Diagnostic knob added: GECKO_WJVS_UNBOXMASK (bitmask, default -1=all on; bit0 lit, bit1 sub/mul/div,
bit2 bitop, bit3 inc/dec, bit4 add, bit5 pop) -- falls a category through to boxed for bisection.
Probe tools: embed-xul/bench/_t_crashprobe.cjs (per-bench crash/NaN) and _t_tlocdump.cjs (typedloc
GECKO_DEBUG_JIT slot dump). The DEFAULT jit (no unbox) was already correct; crypto jit/off=2.81.

## The problem it solves
Mode V (fast unboxed f64) only compiles NON-mutating functions (restart-based
deopt double-executes writes). Real numeric kernels WRITE arrays (crypto am3
`w_array[j++]=...`, navier-stokes/raytrace grid stores) -> classified mutating ->
forced into Mode VS, which keeps the operand stack as NaN-boxed i64 and does a
per-op type-guard + unbox + rebox (~5 branches per JS arith op). That's why the
numeric-benchmark sweep showed JIT ratio ~1.0 (raytrace/richards even <1, slower
than the PBL interpreter) and crypto only 1.77x.

## Design (gated GECKO_WJVS_UNBOX, default off)
A dual-representation operand stack. Per operand-stack depth d, repr[d]: F64 ->
value is an unboxed double in parallel local sf[d]=kVSsBaseF+d; Boxed -> NaN-boxed
i64 in s[d]=kVSsBase+d (the old behavior). Numeric ops flow f64->f64 with NO
guard/box. KEY INSIGHT: arithmetic/bitwise operand coercion IS ToNumber, so
ensureF64 (isNum?unbox : ToNumber-helper) is semantically EXACT, not lossy. Once a
value is f64, feeding the next op is free.
- WJEnsureF64(d): boxed -> f64 via isNum?unbox:WJH_TONUMBER (slow path spills+reloads
  the whole stack; f64 bystanders are numbers, survive in wasm locals, need no trace).
- Typed ops: Sub/Mul/Div, BitOr/And/Xor/Lsh/Rsh/Ursh, Inc/Dec, numeric literals
  (Int8..Int32/Double/Zero/One push f64 directly). Add only when BOTH already F64
  (else string-concat risk -> boxed path).
- WJMaterialize/WJMaterializeAll: box live F64 entries before ANY non-typed op
  (GetProp/SetElem/Call/SetLocal/etc.) and before the direct-stack ops in
  WJEmitBodyVS (compares -> WJVSCmp, Return). repr cleared at block starts
  (WJStackSafe => empty stack at block boundaries, so nothing crosses blocks).
- Locals: added kWJVSMaxStack f64 locals (kVSsBaseF = kVSsBase + kWJVSMaxStack);
  declared for ALL Mode VS fns (stable indices) but unused when unbox off.

## CRITICAL correctness gotcha (caused a renderer crash on first try)
Compares (WJIsCmp) and Return are emitted DIRECTLY in WJEmitBodyVS, NOT through
WJEmitOpVS -> they read operand slots s[] directly. Must WJMaterializeAll before
them or they read stale boxed slots while the real value is in sf[]. Same for the
inline-CFG emitter's WJVSCmp. (WJMaterializeAll needs a forward decl -- it's
defined just above WJEmitOpVS but used earlier in WJEmitInlineCFG.)

## Measured (CONTROLLED interleaved A/B; crypto absolute score is LOAD-NOISY,
## swings 305-560, so only same-run ratios are trustworthy):
- operand-stack unbox ALONE is ~NEUTRAL on crypto: unbox=489 vs jit=494 (0.99).
  (My earlier "2.9x" was a load artifact -- jit had been measured under high load.)
  Reason: am3 immediately STORES arith results to locals, which re-boxes them, so
  unboxing only the operand stack is cancelled by the SetLocal box.
- unbox is still worth keeping: regression-free, RECOVERS navier-stokes 0.88->1.03
  and raytrace ~1.0 (JIT was SLOWER than the PBL interpreter), slightly helps
  deltablue 2.41->2.48. And it's the FOUNDATION for typed locals.

## TYPED (unboxed) LOCALS -- GECKO_WJVS_TYPEDLOC (requires UNBOX). THE actual win.
Numeric-only arg/local slots (WJAnalyzeNumericSlots) live unboxed as f64 in
lf[s]=kVSsBaseLF+s for the whole function -- never boxed in the frame. Prologue
seeds them (typed args: isNum?unbox:ToNumber from the frame; typed locals: NaN =
ToNumber(undefined)). GetLocal/GetArg push F64 from lf[]; SetLocal/SetArg (tee)
coerce+store to lf[]. The frame copies go stale but are safe (numbers need no GC
trace; a stale slot only over-retains). SOUNDNESS: a slot is typed iff it is
consumed ONLY numerically AND never used as an object (prop/elem receiver, call
callee/this) NOR escapes with identity (return, prop/elem value, call arg) --
because then it's only ever observed via ToNumber, so coerce-at-store is exact.
Analysis bails to 0 on any unmodeled op (safe). am3 returns `c`, so c is tainted
(boxed); l,h,m,xl,xh,i,j,n type. CRASH gotcha was: compares/Return read the stack
directly in WJEmitBodyVS -> must WJMaterializeAll first (already fixed for unbox).

MEASURED: crypto tloc=579 vs jit(boxed)=509, tloc/jit=1.14 (+14%), and tloc is
MUCH more stable (566-583 vs 465-522). crypto x4 correct (ok=4 oob=0 crash=0).
With jit/off~2.6, tloc/off ~= 3.0x over the interpreter (was 1.77x at session start).

## DEFINITIVE: crypto tloc/off = 3.16x (interleaved N=5, tloc 559 / off 177).
typedloc engages on am3 (crypto.js:108): typed=9/14 (i,x,j,n,xl,xh,l,h,m). NOT
typed: w/this_array/w_array (objUsed objects) and `c` (the carry -- an ARG that is
RETURNED, so the conservative analysis taints it; it round-trips boxed each iter).
am3's inner loop is pure wasm (helper histogram shows the ~1100 Call/SetElem helpers
are all in SETUP fns, not the millions-of-iterations inner loop).

## KEY FINDING: ~5x on a full octane benchmark is NOT realistically reachable with
## this architecture. am3 inner-loop instruction budget (~146 wasm instrs/iter):
- ~63 array access: 3 GetElem + 1 SetElem, each = shape guard + bounds check +
  element load + box/unbox of the NaN-boxed Value element. IRREDUCIBLE for regular
  JS Arrays (crypto uses `new Array()`, not Float64Array) -- the element is a Value
  in memory, must be unboxed/boxed; bounds vary per iter.
- ~60 f64 arith (already unboxed via typed locals -- this part IS optimal).
- ~13 `c` carry box/unbox (arg-returned, can't type without interprocedural info).
- ~10 relooper dispatch (block{loop{if(pc==i)}} double-dispatch per iter).
Removing ALL of dispatch + c-box + shape-guard LICM only yields ~146->~111 = ~1.3x
=> crypto ~4.2x at best. The element box/unbox + bounds (~30/iter) are irreducible
without TYPED-ARRAY specialization (storing dense int/double arrays unboxed), which
crypto's data model doesn't use. The summary's "8-28x" was for pure-numeric
NON-mutating microbench fns (no array writes); real benchmarks are dominated by
boxed-Value array access + guards, capping a portable JS->wasm JIT at ~3-4x.

## Honest verified state (session end): poly GetProp+length -> deltablue 2.5x;
## unbox+typedloc -> crypto 3.16x; navier/raytrace regressions fixed. A clean 5-10x
## needs Ion-level type-specialized array storage + LICM + BCE + structured loops --
## a much larger effort, and even then capped by the data model on these benches.
See [[wasm-jit-modevs-getprop-poly-length]], [[gecko-wasm-js-wasm-jit]].
