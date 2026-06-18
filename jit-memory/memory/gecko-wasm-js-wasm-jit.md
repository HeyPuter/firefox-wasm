---
name: gecko-wasm-js-wasm-jit
description: "JS->WebAssembly JIT for the wasm SpiderMonkey (no native JIT). Lowers hot JS functions to wasm, instantiates on the host engine via the wasmhost bridge, calls back in. WORKS+verified: M1-3 numeric/loops/bitwise (8-28x); Full-JIT A (Value i64 convention via shared guest-memory import) + B (inline shape-guarded GetProp) + C (Mode V control flow: property LOOP 8.5x) + D (SetProp + dense arrays 16-18x) + E/F (calls + GetGName: recursion + global + higher-order, correct) + G (FAST calls via shared-table call_indirect: fib 18.6x, global calls 19.6x, higher-order 17.7x -- native, no bridge hop), all inline/native over the shared heap. Remaining: GetName/Callee/global-lexical."
metadata: 
  node_type: memory
  type: project
  originSessionId: d2f741b0-a9a8-4dd9-b382-40d7988d83d6
---

GOAL (2026-06-16): a real JS->WASM JIT for the wasm32-emscripten SpiderMonkey (which runs
`--disable-jit` + PBL because native JITs emit machine code the wasm sandbox can't run).
Idea: lower hot JS to WASM BYTECODE at runtime, instantiate on the HOST engine (real native
JIT) via the existing [[gecko-wasm-wasm-passthrough]] bridge, and call it -- boundary paid
once per call, amortized over the function body. JS bytecode is a stack machine like wasm.

## MILESTONE 1 -- WORKS + VERIFIED (2026-06-16): straight-line numeric functions
Verified: `f(a,b){return a*b+a-b}` and `g(a){var x;return x+a}` get compiled to wasm and run
on the host (`engaged=true`; g flips NaN->5 after warmup since M1 zero-inits locals; f's 100k
correctness checks pass). Bench: embed-xul/bench/jittest.html + _t_jit.cjs (mirror mode;
reads document.title via geckoEval; captures [wasmjit] console lines).

### Where it lives (all in libxul; NO moz.build change -> make-rebuildable)
- **js/src/wasm/WasmJS.cpp** (the compiler + cache, in `Unified_cpp_js_src_wasm4.o`):
  reuses SpiderMonkey's own `Encoder` (wasm/WasmBinary.h) + `Op::`/`SectionId`/`TypeCode`
  (wasm/WasmConstants.h) to emit a module exporting one func "f": (f64^nargs)->f64. `WJEmitBody`
  walks `script->code()..codeEnd()` (JSOp + GET_ARGNO/GET_LOCALNO/GET_INT8/GET_INT32 +
  GetBytecodeLength from vm/BytecodeUtil.h), mapping the JS operand stack 1:1 onto wasm: GetArg
  ->local.get, GetLocal->local.get(nargs+i), SetLocal->local.tee, Zero/One/Int8/Int32/Double->
  f64.const, Add/Sub/Mul/Div/Neg->f64.*, Inc/Dec->const1+add/sub, Return/SetRval->local.set(rval
  local = nargs+nfixed), RetRval/JumpTarget->nop; ANY other op -> bail (false). `WJBuildModule`
  writes header+Type+Function+Export+Code sections (startSection/finishSection auto-size;
  writePatchableVarU32/patchVarU32 for the body length). `WJCompile`: wasmhost_compile(bytes)->
  handle, wasmhost_instantiate(handle,nullptr,0), store. Cache: std::unordered_map<JSScript*,
  Entry> (source of truth) + a 4096-slot direct-mapped JSScript*->Entry* cache `gWJCache` so the
  hot per-call check is ~2 loads (map element ptrs are stable across rehash). Exposed:
  `js::wasm::WasmJitObserveCall(JSScript*)` (counts calls; at threshold 8 compiles; returns true
  once compiled) and `WasmJitRunCall(JSScript*, const JS::Value* argv, uint32_t argc, uint64_t*
  retBits)` (argv[i]=arg i; if compiled + all args isNumber, wasmhost_call -> NumberValue bits).
- **THE HOOKING (the hard part).** There is NO single per-call chokepoint: `js::RunScript` is
  outermost-only; PBL AND `js::Interpret` both INLINE-push frames for inner JS->JS calls and
  bypass `InternalCallOrConstruct`. Functions run in EITHER tier, so BOTH must be hooked:
  - **PBL** (js/src/vm/PortableBaselineInterpret.cpp): in the Call fastpath, after the
    `argc < nargs` check, `if (!constructing && WasmJitObserveCall(calleeScript.get())) break;`
    -> misses the fastpath -> routes to `INVOKE_IC(Call)` -> the `CACHEOP_CASE(CallScriptedFunction)`
    scripted branch, where (before the recursive PortableBaselineInterpret) `WasmJitRunCall(script,
    args+1, argc, &wbits)` runs wasm into `retValue` (args[0]=this so pass args+1).
  - **C++ interpreter** (js/src/vm/Interpreter.cpp js::Interpret CASE(Call...)): right after
    `IsFunctionObject(args.calleev(), &maybeFun)` -- BEFORE the `{fun,funScript}` ReservedRooted
    block -- run wasm + `args.rval().set(Value::fromRawBits(wbits)); REGS.sp = args.spAfterCall();
    ADVANCE_AND_DISPATCH(JSOpLength_Call);`. MUST be in this outer scope: you CANNOT
    ADVANCE_AND_DISPATCH (computed goto) out of the inner block (crosses ReservedRooted dtors ->
    "cannot jump from this indirect goto" compile error). Only a trivial local (uint64_t) may be
    live across the dispatch.
  - extern decls of the two functions guarded by `#if __EMSCRIPTEN__` in both .cpp files; the
    out-of-line `js::wasm::Foo` defs in WasmJS.cpp need a matching `namespace js{namespace wasm{
    extern ...}}` decl in that same file or you get "does not match any declaration".

### BUILD (mach deadlocks here -> [[gecko-wasm-build-mach-deadlock]]): edit WasmJS.cpp /
PortableBaselineInterpret.cpp / Interpreter.cpp -> `make -C obj-full-emscripten/js/src` (rc=0)
-> `make -C obj-full-emscripten/toolkit/library` (relink libxul ~3-4min) -> `bash
embed-xul/restrip-relink-web.sh`. Verify: `grep -ac WasmJitObserveCall obj-full-emscripten/dist/bin/libxul.so`.

## MILESTONE 2 -- WORKS + VERIFIED (2026-06-16): control flow / LOOPS -> ~28x speedup
Replaced WJEmitBody with `WJEmitOp` (one straight-line op) + `WJEmitBodyCF` (control flow).
Reducible JS control flow is emitted as a relooper-style DISPATCHER: find basic-block starts
(offset 0, every jump target via GET_JUMP_OFFSET, the offset after each branch/return);
assign block ids; emit `block $exit { loop $loop { for each block i: if (pc==i){ <ops>;
<terminator> } } }` with an i32 `pc` local (2nd local group; locals = (nfixed+1) f64 + 1 i32).
Terminators set `pc` to the successor block id and `br 1` ($loop, re-dispatch), or `br 2`
($exit) on return. `if (pc==i)` then-blocks are void; depths are uniform (loop=1, exit=2).
Comparisons (Lt/Le/Gt/Ge/Eq/Ne/StrictEq/StrictNe -> f64.lt/le/gt/ge/eq/ne) are only emitted
when IMMEDIATELY followed by JumpIfFalse/JumpIfTrue (the i32 result is consumed by that
branch's wasm `if`, keeping the rest of the body pure-f64); else bail. SAFETY: any malformed
wasm is rejected by the host's WebAssembly.Module validation -> wasmhost_compile returns -1
-> graceful interpreter fallback (no crash/miscompile). VERIFIED: `for`/`while` loops compile
+ correct (sum(1000)=499500, poly while-loop matches ref); bench 20000x sum(2000) (40M iters)
2407ms (interp) -> **83.9ms (wasm-jit), ~28x**. ops added for loops: Uint16/Uint24 (consts),
Nop/NopIsAssignOp/NopDestructuring (markers; `+=` emits NopIsAssignOp). Remaining-unsupported
real ops seen: BitOr (bitwise -- needs f64<->i32 ToInt32 via i64.trunc_sat_f64_s+i32.wrap;
common in real code, do next), FunctionThis, GetIntrinsic, Uninitialized (let/TDZ).

## A/B benchmark + toggle (2026-06-16)
`GECKO_NOWASMJIT` env disables the JIT (WasmJitObserveCall checks getenv once; getenv DOES
see ENV on the Gecko worker here, confirmed). Set via index.html's generic `?env.FOO=bar`
knob -> `?mirror=1&env.GECKO_NOWASMJIT=1`. Clean A/B on ONE build (bench/jittest.html +
_t_jitab.cjs, 40M-iter numeric loop): JIT ON loopms=90.0 (engaged=true) vs JIT OFF
loopms=2316.7 (engaged=false) = **~26x**, identical correct results. Debug printfs REMOVED.

## MILESTONE 3 -- bitwise/shift ops (2026-06-16): correct + 8.3x on a hash kernel
Added BitOr/BitAnd/BitXor/Lsh/Rsh/Ursh/BitNot. JS bitwise = ToInt32(operands) -> i32 op ->
back to f64. `WJToInt32(e)` = `MiscOp::I64TruncSatF64S` (the saturating trunc avoids the trap
i32.trunc_f64_s takes on NaN/Inf) + `Op::I32WrapI64`; result via `Op::F64ConvertI32S` (or
`F64ConvertI32U` for Ursh). Two-operand ops need a scratch f64 local (can't reach the deeper
stack operand): `local.set scratch (=b); ToInt32(a); local.get scratch; ToInt32(b); i32.op;
f64.convert`. Locals now (nfixed + rval + scratch) f64 + 1 i32 pc; rval=nargs+nfixed,
scratch=+1, pc=+2. `writeOp(MiscOp::X)` works (Opcode has an implicit MiscOp ctor that emits
the 0xFC prefix). VERIFIED: hash(500)=1099344439 == ref (32-bit `|0` exact); 20000x hash(2000)
6975ms (off) -> 842ms (on) = 8.3x (ToInt32 conversions cost vs pure arith's 28x). i32 shift
amount is auto-masked mod 32 by wasm = JS semantics.

## BROADER BENCHMARK (honest) + the per-call tax
microjs A/B (bench/_t_microab.cjs): call/object/string kernels are NEUTRAL-to-SLIGHTLY-
NEGATIVE with the JIT on (calls_fib 0.93x, props 0.97x, strings 0.90x, total 0.94x = ~6%
SLOWER). Cause: those functions can't compile (calls/property-access/strings unsupported ->
bail to Failed), so they only pay the per-call tier-up tax (the WasmJitObserveCall cache
lookup + the Interpret/PBL-hook guards, ~15-25ns on EVERY scripted call) with no benefit.
This is the classic "check every call" tax -- a real JIT swaps the function entry pointer
after compiling so there's no recurring check, which isn't available here (no native code ptr).
NET: huge win on numeric-loop/bitwise code, small loss on call/object/string code. To make it
a broad net win: (1) cut the tax (per-script "don't bother" flag so the hook skips Failed
scripts with ~0 work -- needs a JSScript/JitScript bit), and (2) coverage for CALLS (the
documented #1 interpreter cost, calls_fib; self-recursion like fib needs callee resolution via
GetGName/Callee + a wasm self-call or call-back-to-host) and PROPERTY access (objects; large --
shapes/ICs). Could also gate the JIT to numeric-heavy realms.

## TAX FIX (warmup-gate) + real-site findings (2026-06-16)
Cut the per-call tax: the interpreter hooks now only call WasmJitObserveCall when
`script->getWarmUpCount() >= 10` (a cheap inline check) -- so the millions of cold/non-loop
calls on a real page skip the cross-TU observe/compile machinery entirely; only genuinely-hot
(loop) scripts pay. Removed the redundant `seen` counter. Loop wins preserved (sum 26x, hash
8.5x, correct). Real-site A/B (bench/_t_siteab.cjs, _t_discordab.cjs, _t_discdiag*.cjs):
- Wikipedia United_States load: JIT ON 4610ms vs OFF 4347ms (~6% slower -- residual tax; load
  is parse/layout/DOM-bound, no numeric loops to win).
- discord.com/login: BENCHMARKING MISTAKE -- I first measured it in MIRROR mode, where the
  mirror loop re-serializes discord's huge DOM + re-encodes every image/CSS every ~200ms tick;
  that serialization saturates the single-threaded engine so a geckoEval poll didn't run for
  244s. The 244s is mirror-mode serialization tax, NOT discord load/JS, and was IDENTICAL JIT
  on (243970ms) vs off (244205ms) -> JIT-independent. The real signal: geckoRender (document ->
  INTERACTIVE) returned at ~2822ms -- discord's document loads in ~3s. LESSON: do NOT use mirror
  mode (?mirror=1) to benchmark real-site load/JS -- the DOM-serialize+image-encode per tick
  dwarfs everything on a big DOM. Use canvas/software mode. (discord full React hydration is
  still interpreter-slow, but that's not the 244s and not JIT-addressable.)
CONCLUSION (honest): this JIT is a big win for NUMERIC-COMPUTE-heavy JS (loops/arith/bitwise:
8-28x) but does NOT move real-world SPA JS (objects/strings/calls/DOM dominate; e.g. discord).
Moving real sites needs property-access + call coverage = a far larger effort (shapes/ICs, the
calling convention), OR accept it as a targeted numeric-kernel accelerator.

## FULL-JIT MILESTONE A -- WORKS + VERIFIED (2026-06-16): Value-based foundation
Pivot toward a "full" (not numeric-only) JIT. KEYSTONE INSIGHT: the whole GC heap lives in the
guest wasm linear memory, so a host-JIT module that IMPORTS the guest memory can deref a
JSObject* (= a wasm32 offset) INLINE -- shape guards + slot loads with NO boundary crossing
(Baseline-IC-in-wasm). Foundation built + verified; numeric perf UNCHANGED (sum 87ms vs 2368ms
=27x, hash 842 vs 6953 =8.3x, engaged=true, correct).
- **Calling convention** is now NaN-boxed JS::Value bits (i64), passed via a fixed guest-heap
  scratch buffer `gWJScratch[72]` (a C++ global => stable wasm32 addr), NOT as f64 args. f64
  args route through JS numbers in the bridge and CANONICALIZE any object/string-tagged NaN
  (corrupting the box) -- so only the scratch POINTER (exact int) + a deopt FLAG (0.0/1.0) cross
  as f64; all Values cross as i64 in shared memory. WasmJitRunCall writes argv[i].asRawBits() to
  gWJScratch[i], calls f(ptr), reads result from gWJScratch[64].
- **Module shape**: imports guest memory `(import "m" "mem" (memory ...))`; exports `f:(f64
  scratchPtr)->f64 deopt`. Section order Type,Import,Function,Export,Code. NUNBOX32 (wasm32):
  Value tag in HIGH 32 bits, payload low 32. isNumber = (bits>>32) <= 0xFFFFFF81; int32 tag =
  0xFFFFFF81; toInt32 = i32.wrap; toDouble = f64.reinterpret_i64; obj ptr = low32. Box double =
  i64.reinterpret_f64 (NaN -> canonical 0x7FF8...0). Object layout (wasm32, all in lin mem):
  shape_@obj+0 (i32), slots_@+8, elements_@+12, fixed slot i @ obj+16+i*8 (Value=8B), dynamic
  slot @ slots_+(i-nfixed)*8; dense elem i @ elements_+i*8, initializedLength @ elements_-12.
- **Wasm prologue** unboxes each arg from gWJScratch[i]: guard isNumber (else `f64.const 1;
  return` => deopt=1 so interpreter re-runs), then int32->f64.convert or f64.reinterpret. Body
  is the SAME f64 dispatcher (Milestone 2/3, 28x preserved). Epilogue boxes the f64 rval to i64
  + stores to gWJScratch[64], returns deopt=0. Local 0 is the f64 ptr param so all arg/local
  indices shift by argBase=1; +1 i64 unbox-temp local.
- **Bridge** (embed-xul/wasm-host-bridge.js): new `wasmhost_guest_mem_objid()` registers
  emscripten's `wasmMemory` into __whObj (returns obj id 0) so the JIT module can import it;
  `wasmhost_guest_mem_shared()` -> emit shared (flags 0x03, min 1, max 65536) vs non-shared
  (0x00, min 0) memory-import limits. whSyncMem is a no-op for the JIT module (it shares the
  guest ArrayBuffer, no mirror). TWO BUGS FIXED: (1) `writeBytes(p,n)` ALREADY writes a varU32
  length prefix -- do NOT precede import names with writeVarU32(len) (double-prefix => host
  "compile failed: expected 109 bytes" where 109=0x6d='m'). (2) whSyncMem deref'd
  `globalThis.__whObjMirror[id]` but __whObjMirror is undefined when no mirror was ever set (our
  case) => "Cannot read properties of undefined (reading '0')"; guard with `__whObjMirror &&`.
- Bridge-JS-only changes still need the emcc relink (restrip-relink-web.sh) since the js-library
  is baked into the glue at link time; NO C++ rebuild for those.
## FULL-JIT MILESTONE B -- WORKS + VERIFIED (2026-06-16): inline property access (GetProp)
The thesis payoff. `getsum(o){return o.x+o.y+o.z}` compiles to wasm that reads o.x/o.y/o.z
INLINE from the shared guest heap (shape guard + slot load, NO boundary crossing) and is
CORRECT (1M-call loop, pacc===15000000 exact) AND a net win: propms 600 (JIT) vs 823 (interp)
= ~1.37x even for a trivial 3-prop body (bigger/looping bodies will amortize the boundary far
more). Numeric perf unchanged (sum 80ms, hash 843ms). All in WasmJS.cpp.
- **Two emitters now.** WJCompile scans the bytecode: any JSOp::GetProp -> Mode V (Value-typed),
  else Mode N (the fast f64 numeric/loop emitter, unchanged). WJBuildModule takes useModeV and
  picks WJEmitBodyV vs WJEmitBodyCF. Both share the same module shape (memory import + scratch
  convention). Mode V is STRAIGHT-LINE ONLY for now (bails on any jump/control-flow op).
- **Mode V (WJEmitBodyV)**: operand stack carries i64 Values. args/locals are i64 wasm locals;
  prologue copies gWJScratch[i] -> arg local UNGUARDED (objects pass through). Constants box to
  Int32Value/DoubleValue bits (i64.const, compile-time). Arithmetic (Add/Sub/Mul/Div/Neg/Inc/
  Dec) pops 2 i64 into tmpA/tmpB, WJVUnbox each (guard isNumber via (bits>>32)<=INT32_TAG, else
  f64.const 1;return = deopt; int32->convert_s, double->reinterpret), f64 op, WJVRebox (NaN->
  canonical, else reinterpret). rval local is i64 (= the Value); Return/RetRval store it to
  gWJScratch[result] + return deopt 0. Locals layout: i64 group (nargs+nfixed+rval+tmpA+tmpB),
  1 f64 tmpF, 1 i32 tmpAddr; arg/local indices shift by argBase=1 (local 0 = f64 ptr param).
- **Inline GetProp IC**: each site gets a global id + entry {shape,offset} in `gWJICTable`
  (uint32[2*site]). Emitted: pop obj->tmpA; guard isObject ((bits>>32)==0xFFFFFF8C else deopt);
  tmpAddr=low32(obj); if (i32.load[obj+0]==i32.load[icAddr+0]) { i64.load[obj + i32.load
  [icAddr+4]] } else { store site->gWJMissSite, store objBits->gWJMissObj, deopt }. Cache is
  RUNTIME-FILLED with NO wasm->C++ import: WasmJitRunCall sets gWJMissSite=NoMiss before the
  call; on deopt, if gWJMissSite!=NoMiss it calls WJFillIC(site) which reconstructs the missed
  object (Value::fromRawBits(gWJMissObj).toObject()), gets the name (gWJSites[site]={script,
  pcOff} -> script->offsetToPC -> getName), NativeObject::lookupPure(NameToId(name)); if a
  fixed-slot data property, stores {shape, 16+slot*8}. So a monomorphic site misses+deopts ONCE
  (interpreter runs that call), then every later call loads inline. Dynamic-slot props left
  unfilled (always deopt -> interp; correct, not yet inlined). GC: cached shape* could ABA if a
  shape is freed+addr reused (prototype risk; shape-identity => same layout otherwise, so the
  guard is sound). Needs includes vm/NativeObject.h + vm/PropertyInfo.h (NameToId from
  StringType.h, already incl). New globals: kWJTagObject=0xFFFFFF8C, gWJICTable[2*4096],
  gWJMissSite/gWJMissObj, gWJSites[4096]+gWJSiteCount.
## FULL-JIT MILESTONE C -- WORKS + VERIFIED (2026-06-16): Mode V + control flow -> 8.5x on a
## property LOOP. The headline full-JIT result.
Replaced the straight-line WJEmitBodyV with WJEmitBodyVCF: the SAME relooper dispatcher as
WJEmitBodyCF (block/loop/if(pc==i), basic-block discovery, terminators) but with an i64-Value
operand stack + inline GetProp. Factored out helpers: WJEmitGetPropV (the IC, consumes obj i64
off the stack), WJEmitOpV (one leaf Value op), WJVCmp (pop 2 -> WJVUnbox both -> f64 cmp; only
when followed by JumpIfFalse/JumpIfTrue, same rule as Mode N). Return/RetRval = LocalSet rval +
Br 2 to $exit (like CF); epilogue stores the i64 rval to gWJScratch[result] + deopt 0. Locals:
i64 group (nargs+nfixed+rval+tmpA+tmpB) + 1 f64 tmpF + 2 i32 (tmpAddr,pc); LoopHead added as a
no-op in WJEmitOpV. WJBuildModule Mode V branch -> WJEmitBodyVCF.
VERIFIED: `vsum(o,n){var s=0;for(i<n)s+=o.x+o.y+o.z;return s}` -- the WHOLE 5M-iteration loop
runs in ONE wasm call with 3 inline GetProps/iter; vr===75000000 (correct), vsumms 115ms (JIT)
vs 973ms (interp) = **~8.5x**. Contrast Milestone B's trivial getsum (1.37x): there the per-call
boundary dominated; here it's paid ONCE for the whole loop, so the inline-heap-read property
access wins big -- same lesson as the 28x numeric loop. Numeric perf unchanged (sum 84, hash
845). Bench: jittest.html getsum/vsum kernels + jitv.html (vsum-only, fast A/B); _t_vab.cjs.
THE FULL-JIT THESIS IS PROVEN END-TO-END: host-JITed wasm dereferences guest GC objects inline
(shape guard + slot load over the shared imported memory), and on looping object code it's a
large net win -- the property-access coverage that the old numeric-only JIT lacked for real code.

## FULL-JIT MILESTONE D -- WORKS + VERIFIED (2026-06-16): arrays (GetElem/SetElem) + SetProp
All in Mode V (WJEmitBodyVCF). New leaf helpers in WasmJS.cpp: WJEmitGetElemV, WJEmitSetElemV,
WJEmitSetPropV; wired into WJEmitOpV (GetElem/SetElem/StrictSetElem/SetProp/StrictSetProp; NOT
InitProp -- it transitions the shape, inline-store would corrupt). Mode V scan + WJFillIC updated.
- **Dense GetElem** `a[i]`: pop [obj,index]; isObject guard; shape guard (a stable array shape
  guarantees the dense layout/class -- array length lives in ObjectElements, not the shape, so
  it's stable); tmpIdx = i32.trunc_sat_s(unbox(index)); elements_ = i32.load[obj+12]; bounds
  `index u< initializedLength` (i32.load[elements-12]; UNSIGNED compare catches negatives);
  value = i64.load[elements + index*8]. oob/miss/non-number-index -> deopt. **16x** (asum loop
  34 vs 554ms), correct.
- **Dense SetElem** `a[i]=v`: same guards + value-must-be-a-number guard (barrier-free store; GC
  post-write-barrier needed for object values, so those deopt) + in-bounds (no append) -> i64.
  store[elements+i*8]=v; pushes v. **18x** (aset loop 30 vs 540ms), correct.
- **SetProp** `o.x=v`: GetProp IC shape-guard + number-value guard + i64.store[obj+offset]=v;
  pushes v. Reuses the {shape,offset} IC entry; WJFillIC caches via lookupPure (existing data
  prop, fixed slot) -- a NEW property (no entry) always deopts so the interpreter does the add.
  1.58x on a trivial fn (boundary-bound like getsum; correct: object mutated right, 2M stores).
- IC table entries now also used by element sites (offset field=0, shape-only guard). WJFillIC
  branches on JSOp(*pc): GetElem/SetElem -> require obj->is<ArrayObject>(), cache shape;
  GetProp/SetProp -> lookupPure fixed-slot. Needs vm/ArrayObject.h. New i64 local tmpC (3rd
  operand for SetElem value) + i32 tmpIdx; Mode V CF locals = (nargs+nfixed+4) i64, 1 f64, 3 i32.
THE FULL JIT NOW COVERS: numeric (M1-3), control flow, properties (GetProp/SetProp), dense arrays
(GetElem/SetElem) -- all inline over the shared heap. Looping object/array code wins 8-18x.

## FULL-JIT MILESTONE E -- WORKS + VERIFIED (2026-06-16): JSOp::Call (function calls)
Calls dispatch through the host bridge with NO scratch stack (the key insight: each frame's
PROLOGUE copies its args into wasm locals immediately, so gWJScratch is a transient handoff that
nested/recursive calls reuse). VERIFIED correct: applyloop(sq,1000) x3000 = 3M bridge-dispatched
calls, r===332833500 exact; ~1.25x (485 vs 608ms) -- modest because the bridge dispatch (host
wasm -> JS shim -> C++ wasmjit_invoke -> JS wasmhost_call -> callee wasm) is heavy vs a tiny x*x
leaf; bigger callee bodies amortize it, and the real value is functions CONTAINING calls now JIT
at all (instead of bailing). Mechanism (WasmJS.cpp + wasm-host-bridge.js):
- A Mode V module with calls gains a 2nd type (i32,i32)->f64 + a function import "m"."call"
  (function index 0; the body becomes function index 1, export adjusts). hasCall is detected in
  WJCompile; WJBuildModule emits the import; instantiate passes callbackIds=[-2, memId] (order
  matches: function import first). The bridge special-cases id===-2 -> binds a shim
  `function(site,argc){return Module._wasmjit_invoke(site,argc)}`.
- WJEmitCallV (stack [callee,this,arg0..argN-1]): marshal args in REVERSE into gWJScratch[i]
  (pop-to-tmpA, store), drop `this`, pop callee, guard low32(callee)==gWJCallFn[site]; on hit
  `i32.const site; i32.const argc; call 0` (wasmjit_invoke), propagate a callee deopt
  (f64.ne 0 -> return 1), else result = i64.load gWJScratch[result]; on miss record site+callee
  bits, deopt. Per-site arrays gWJCallFn/Handle/Nargs/Argc[kWJMaxSites].
- wasmjit_invoke(site,argc) [EMSCRIPTEN_KEEPALIVE, placed near wasmhost_invoke_import since the
  macro isn't defined earlier in the TU]: validates argc==gWJCallNargs, wasmhost_call(handle, 0,
  &scratchPtr, 1) -> callee reads its args from gWJScratch + writes result to gWJScratch[result].
- WJFillIC Call branch: compile the callee (WJEntryFor+WJCompile, fwd-declared before WJFillIC),
  cache {handle,nargs,fn}; arity-mismatch -> don't cache (keeps deopting). Also added Mode V
  constant ops Undefined/Null/True/False (needed for the `this`=undefined push at call sites).
- LIMIT: a callee referenced via JSOp::GetGName (global function, e.g. recursive `fib` or a
  top-level helper) does NOT compile (GetGName unsupported) -> such calls stay in the interpreter.
  Recursion is blocked by GetGName, NOT by the call mechanism (which handles reentrancy fine).
  To unlock fib/most real calls: add GetGName (inline global-slot IC) + Callee. `this`-using
  callees also won't compile (drop-this is then safe). Truthy-branch (JumpIfFalse on a non-cmp
  Value) fails wasm validation -> graceful interpreter fallback (only cmp+branch is JIT'd).

## FULL-JIT MILESTONE F -- WORKS + VERIFIED (2026-06-16): GetGName -> recursion + global calls
Inline GetGName (read a global var/function by name) unlocks the two canonical call patterns:
RECURSION (fib references itself via GetGName) and GLOBAL-FUNCTION calls (sqsum calls global sq).
VERIFIED correct: fib(28)===317811 computed by the JIT, RECURSING through the bridge (proves the
call mechanism handles arbitrary nesting/recursion via the gWJScratch reuse); sqsum->sq 3M calls
exact. Perf modest+honest: fib ~1.1x (185 vs 203ms -- tiny body, dominated by ~635K bridge
dispatches), global-call loop ~1.4x (512 vs 717ms). (A "Stack:" console line appears in BOTH ON
and OFF -> pre-existing engine log, not the JIT.)
- WJEmitGetGNameV (WasmJS.cpp): the resolved holder (global object) address lives in a MUTABLE IC
  cell gWJGNameHolder[site] (NOT baked) so a GC move self-heals via refill. Emits: holder =
  i32.load[holderCell]; if holder==0 (unfilled) -> miss; shape guard (i32.load[holder+0] ==
  cached@icAddr); load slot -- FIXED (off<kWJDynSlot: i64.load[holder+off]) or DYNAMIC (high bit
  set: slots_=i32.load[holder+8]; i64.load[slots_ + (off & ~kWJDynSlot)]). off stored in
  gWJICTable[2*site+1], shape in [2*site]; kWJDynSlot=0x80000000 flags dynamic (globals usually
  use dynamic slots). The unfilled holder==0 guard is ESSENTIAL: without it, shape@0 (==0) would
  match cached 0 -> false hit -> load from addr 0. WJFillIC GetGName branch: cx=TlsContext.get();
  g=cx->global() (Handle<GlobalObject*> -> NativeObject*); g->lookupPure(NameToId(getName(pc)));
  data prop -> store {holder=g, shape, fixed-or-dynamic off}. Miss records only gWJMissSite (no
  object). Mode V scan + WJEmitOpV updated for JSOp::GetGName.
- LIMIT: only GetGName (global object var/function). NOT global-LEXICAL (let/const/class globals --
  those are on a separate lexical env, lookupPure on cx->global() won't find them -> deopt), NOT
  GetName (scope-chain lookup), NOT Callee (named function expressions). Those deopt to interp.
## FULL-JIT MILESTONE G -- WORKS + VERIFIED (2026-06-16): FAST calls via call_indirect (18-20x)
Replaced the slow bridge-dispatch call path (Milestone E/F: host wasm->JS shim->C++->JS->callee,
~1.1-1.4x) with NATIVE cross-module calls via a shared funcref TABLE + call_indirect. HUGE win:
fib(28) 11ms vs 204ms = **18.6x** (recursion, native!), sqsum->sq (GetGName) 37.6 vs 738 =
**19.6x**, applyloop->sq (GetArg callee) 34.4 vs 608 = **17.7x**. All correct. This is THE fast
call path the user wanted -- and it's MORE general than inlining (handles recursion, any callee).
Mechanism:
- Bridge (wasm-host-bridge.js): wasmhost_jit_table() creates ONE shared WebAssembly.Table
  ({element:'anyfunc', initial:4096}) + returns its obj id; wasmhost_jit_table_set(handle,idx)
  does table.set(idx, reg[handle].fns[0]). The table-IMPORT binding is already handled by the
  bridge's generic non-function import path (binds __whObj[id]) -- no instantiate change.
- WJCompile: every compiled function (Mode N or V) is added to the shared table at gWJTableCount++
  (stored in WasmJitEntry.tableIdx); so any function can be a call_indirect target. hasCall
  modules IMPORT the table `(import "m" "tbl" (table 0 funcref))` (kind 0x01, elemtype 0x70, min
  0). NO function import anymore (f is back to index 0). All "f" share type 0 = (f64)->f64 (the
  call_indirect signature; both Mode N and V use the scratch-ptr convention since Milestone A).
- WJEmitCallV: marshal args to gWJScratch (reverse) + drop this + guard callee==gWJCallFn[site];
  on hit push scratchPtr (f64.const) + table index (i32 from gWJCallHandle[site], repurposed as
  the table idx) + `call_indirect typeidx=0 tableidx=0` (0x11 0x00 0x00); propagate a callee
  deopt; result = gWJScratch[result]. The callee reads its args from gWJScratch + writes its
  result there (same protocol; gWJScratch reuse across recursion is safe -- prologue consumes
  args immediately). WJFillIC Call branch caches ce->tableIdx (requires it >=0, i.e. the callee
  made it into the table) + arity match. wasmjit_invoke + the bridge -2 shim are now DEAD (left
  in, never invoked). call_indirect traps on null/type-mismatch, but the fn-guard + fill ensure a
  valid same-type slot, so no trap (ABA on the fn ptr is the only residual prototype risk).
THE CALL PATH IS NOW FAST. The full JIT JITs numeric/loops/bitwise (8-28x), control flow,
properties get/set, dense arrays get/set (16-18x), and calls incl. recursion + global + higher-
order (18-20x) -- all inline/native over the shared heap.

## FULL-JIT MILESTONE H -- WORKS + VERIFIED (2026-06-16): SOLIDITY hardening (correctness + GC)
Two real-correctness fixes so the JIT is solid, not just fast:
- **Uninitialized locals**: Mode N/V read an unread `var x` as the wasm-default 0 -- WRONG (JS:
  undefined). Now the prologue inits the nfixed JS locals (+ rval): Mode N to NaN (undefined->
  ToNumber==NaN, so numeric bodies match JS), Mode V to UndefinedValue bits (correct; arith on
  it deopts, which is right). VERIFIED: jittest.html `g(a){var x;return x+a}`; g(5)===NaN now
  (was 5 with the bug) -- chk(gWarm!==gWarm) passes => ok=true. (This RETIRED the old
  engaged-detector that relied on the bug; engaged is now timing-based: sumloopms<500.)
- **GC safety (ABA)**: the inline caches hold raw shape/holder/JSFunction pointers a major GC can
  move/free. Added an ADDITIVE finalize callback (JS_AddFinalizeCallback, js/GCAPI.h -- does NOT
  replace Gecko's) `WJFinalizeCB`: on JSFINALIZE_COLLECTION_END clear gWJICTable + gWJCallFn +
  gWJGNameHolder (+ gWJMissSite) so every site re-resolves with live pointers (one miss+refill
  per site). Cached shapes/holders are TENURED (stable across frequent minor GCs); a cached fn
  that gets promoted just guard-misses+refills. Registered once lazily in WJCompile via
  TlsContext.get(). Also: the JSScript*-keyed cache can ABA if a finalized script's address is
  reused -> WasmJitEntry.bcLen (script->length()) is checked in WJEntryFor (WJValidateEntry); a
  mismatch resets the entry to Cold so the different script recompiles. VERIFIED non-breaking:
  all benches still correct + fast after (calls allocate -> trigger GCs -> callback fires; fib
  still 11ms/correct). Residual prototype risk: same-length script ABA, same-address shape/fn
  ABA within one GC epoch (rare). Bridge still leaks compiled host modules (no free).
## FULL-JIT MILESTONE I -- WORKS + VERIFIED (2026-06-16): `this` + method calls (14.7x)
`this` is a frame-local `.this` binding initialized at function entry by `FunctionThis; SetLocal
.this; Pop`, then read via GetLocal; a method CALL `a.b(c)` is emitted `eval a; Dup; GetProp b;
Swap; eval c; Call`. Added to Mode V: JSOp::FunctionThis (push the marshalled receiver from
gWJScratch[kWJThisSlot=65], isObject-guarded -- undefined/primitive `this` needs sloppy boxing so
it deopts), JSOp::Dup (local.tee+get), JSOp::Swap (2 temps). WJEmitCallV now MARSHALS the receiver
into gWJScratch[65] (instead of dropping `this`); WasmJitRunCall gained a `thisBits` param and the
two interpreter hooks pass it (Interpreter.cpp args.thisv().asRawBits(); PBL args[0].asRawBits()).
Mode-V scan triggers on FunctionThis too. VERIFIED: own-property method `o.dot()` (this.x*this.x+
this.y*this.y) in a 3M loop = 100.6ms (JIT) vs 1483.6ms (interp) = **14.7x**, correct (dot=25,
r=75000000); call/recursion regression clean (fib still 11ms). The whole loop runs as wasm with
inline this.x/this.y reads + native call_indirect to the method.
## FULL-JIT MILESTONE J -- (2026-06-16): proto-chain GetProp + dynamic slots + deopt-guard
- **Prototype GetProp** (the common OO method pattern `p.method` where method is on the proto):
  WJEmitGetPropV now branches own-vs-proto. cache adds gWJProtoHolder[site] (holder/prototype
  addr; 0=own) + gWJProtoHolderShape[site]. wasm: guard receiver shape; if gWJProtoHolder==0 load
  from the receiver (own), else guard the HOLDER's shape + load from the holder (a receiver-shape
  guard fixes the proto, the holder-shape guard fixes the slot). WJFillIC: lookupPure(recv) for
  own, else walk staticPrototype() up to 8 levels for a data prop -> cache {recvShape, holder,
  holderShape, slot}. SetProp stays own+fixed only (a non-own SetProp is a define/setter -> deopt).
- **Dynamic slots** in GetProp (emitSlotLoad): off encodes kWJDynSlot (high bit) for dynamic ->
  load via slots_(@base+8); needed because function .prototype methods often sit in dynamic slots.
- **Deopt-guard** (anti-regression): WasmJitEntry += runs/deopts; WasmJitRunCall self-disables a
  function (state=Failed) once deopts>=64 && runs<deopts/4, so a function the JIT can't accelerate
  (chronic deopt) stops paying the per-call tax -- the JIT is never a NET LOSS. (Removed the unused
  `seen` field.)
CORRECTNESS verified (ok=true) for own + proto methods. PERF CAVEAT: this machine is the user's
desktop -- `helium` browser (~87% CPU) + 2 python3 (~28% ea) keep loadavg ~10-12, so tight A/B
ratios are CONTENTION NOISE, not signal. Own-method jimeth measured 14.7x when the box was idle
but 12x slower under load; proto jiproto measured ON<OFF (faster, working) but noisy. DO NOT trust
A/B numbers unless loadavg is low (check /proc/loadavg + `ps -eo pcpu --sort=-pcpu`); the user's
apps dominate. Octane: navier-stokes ~equal on/off (still partly method/this-bound + noisy),
crypto never completes (RSA too heavy, no crash). Octane reports via document.title (added) since
the POST-to-bench-server path through WISP is unreliable.

## MODE VS -- no-restart JIT for MUTATING functions (2026-06-17) -- Stage 1 WORKS+VERIFIED
The old mutation-gate refused SetProp/SetElem because deopt-by-RESTART re-runs the whole
function -> double-executes heap writes (the Richards holdCount bug). Mode VS fixes this for
mutating functions by NEVER restarting: a guard/type miss calls a C++ helper (`wjhelp`) that
completes the op in place and the wasm continues. KEY GC HAZARD (the crux): SpiderMonkey's GC
cannot see object pointers in host-wasm JIT frames, so a helper that allocates+GCs could move
objects out from under the running JIT. SOLUTION: Mode VS keeps the WHOLE frame (args, locals,
rval, operand stack) in a GC-TRACED guest-memory frame stack `gWJFrameMem` (slot i @ fb+i*8;
`gWJFrameSP` is the top, in slots) so a moving GC updates the pointers in place. All in WasmJS.cpp:
- `wjhelp(kindF, siteF)` [EMSCRIPTEN_KEEPALIVE, near wasmjit_invoke]: reads operands from
  gWJHelpA/B/C, does the op via engine fns (js::AddValues/SubValues/.../LessThan/LooselyEqual/
  StrictlyEqual, JS::ToObject+GetProperty/SetProperty), writes result to gWJScratch[kWJResultSlot],
  returns 0.0 ok / 1.0 threw. Fills the IC (WJFillIC) so the next call goes inline. Bound as wasm
  import function 0 via bridge id===-3 (`function(kind,site){return Module._wjhelp(kind,site)}`).
- `WJTraceRoots` (JS_AddExtraGCRootsTracer, registered once in WJCompile): JS::TraceRoot each
  gWJFrameMem[0..gWJFrameSP) + gWJScratch[0..72) + gWJHelp* as Values. Frame slots are init'd to
  Undefined on entry so tracing is always safe (no GC during prologue/no-alloc fast path).
- Emitter WJEmitBodyVS/WJEmitOpVS/WJVSBinArith/WJVSUnary/WJVSCmp/WJVSGetProp/WJVSSetProp: operand
  stack is FRAME MEMORY at compile-time-static depths (WJStackSafe guarantees empty at block
  bounds). Prologue: basesp=gWJFrameSP; overflow (basesp+frameSize>kWJFrameSlots=8192) -> return
  1.0 deopt (PRE-bump = sound restart); fb=frameAddr+basesp*8; bump SP; init frame=Undefined; copy
  args from gWJScratch. Epilogue restores gWJFrameSP. Arith/cmp: if both operands numbers -> inline
  f64 (reuses WJVUnboxNG/WJVRebox); else store to gWJHelp* + call wjhelp. GetProp/SetProp: own
  fixed-slot inline (shape-guarded; SetProp also number-guarded); else wjhelp.
- Module: Mode VS imports wjhelp:(f64,f64)->f64 as func 0 (body shifts to func index 1); type 0 =
  (f64)->f64 body, type 1 = helper. WJBuildModule got a `modeVS` param. NOT added to the shared
  call_indirect table (a restart-based caller call_indirect'ing a throwing mutating callee would
  double-mutate; Mode VS runs only via WasmJitRunCall, which propagates exceptions w/o restart).
- WasmJitRunCall now returns int: 0=not run (interp), 1=ran ok, 2=ran+THREW. Wasm return code 2.0 =
  exception (helper threw); both hooks (Interpreter.cpp `goto error`; PBL `ctx.error=Error; return
  IC_ERROR_SENTINEL()`) propagate WITHOUT restart. 1.0 = restart (Mode N/V miss OR Mode VS frame
  overflow, both pre-mutation -> sound). extern decl bool->int in 3 files.
- Gate (WJCompile): a function with SetProp/StrictSetProp AND only WJModeVSSupported() ops ->
  modeVS=true (compile). Other mutations (SetElem/InitProp/SetGName/etc) or unsupported ops -> not
  compiled (interpreter, mutation once). Non-mutating funcs unchanged (Mode N/V, restart-deopt).
VERIFIED (bench/jisetp.html + _t_setp.cjs): `bump(o,n){for(i<n)o.x=o.x+1;return o.x}` read-modify-
write -- JIT ON cr=100000/Tx=5000000 (EXACTLY ONCE, no double-exec) bumpms 64.8 vs OFF 8550 = ~132x.
STAGE 1 scope: mutating, CALL-FREE, `this`-FREE funcs with SetProp + arith/cmp/GetProp/control flow.

## MODE VS Stage 2 -- WORKS+VERIFIED (2026-06-17): `this` + GetElem/SetElem + CALLS
Added FunctionThis (WJVSFunctionThis: strict=push thisv; sloppy object=push; sloppy primitive=helper
WJH_FUNCTIONTHIS BoxNonStrictThis), GetElem/SetElem (WJVSGetElem/SetElem: dense inline shape+bounds
guarded, number index via unbox+I32TruncSatF64S NOT int32-tag [loop counters arrive reboxed as
doubles -- the int32-only guard was the bug that made jiarr 1.6x SLOWER until fixed], else WJH_GETELEM/
SETELEM via ToPropertyKey+GetProperty / SetObjectElement), Swap, and CALLS (WJVSCall: marshal args+this
to gWJScratch + callee to gWJHelpA; cached callee -> call_indirect (a Mode VS callee allocates its
frame ABOVE the caller's on the shared gWJFrameMem -> both GC-traced, nesting is automatic); deopt 2=
callee threw -> propagate (WJVSReturnVal restores frame SP, returns 2); deopt 1=callee didn't mutate
(Mode VS overflow at entry / Mode N/V miss) -> generic WJH_CALL (js::Call, re-marshal first since the
call_indirect callee may have clobbered gWJScratch); miss -> WJH_CALL. WJH_CALL fills the call IC.).
- WasmJitEntry += `bool modeVS`. Mode VS functions ARE in the shared call_indirect table now, BUT
  WJFillIC's Call branch refuses to cache a Mode VS callee for a NON-Mode-VS caller (`if (ce->modeVS
  && !callerEntry->modeVS) return;`) -- a restart-based Mode N/V caller would double-mutate on restart
  AND its untraced wasm frame would break GC-rooting; such calls deopt to the interpreter, which routes
  the Mode VS callee through WasmJitRunCall (no untraced JIT frame above the helper's GC).
- WJBuildModule modeVS+hasCall imports the table too: [wjhelp, mem, tbl]; instantiate importIds
  [-3,memId,tableId]. Gate: SetElem/StrictSetElem now mutates=true+VS-supported; Mode VS keeps hasCall.
- ***CRITICAL FIX (the GC-rooting was silently dead until raytrace):*** WJTraceRoots, as an
  internal-linkage (anon-namespace `static`) function whose ONLY reference is its address passed to
  JS_AddExtraGCRootsTracer, got GOT-indirected in this PIC/emscripten build and resolved as an
  UNRESOLVED `env` IMPORT -> "missing function: ...WJTraceRoots" ABORT the first time a GC actually
  called it (raytrace/navier allocate heavily; SETP/arr/mut never GC'd so it looked fine). `__attribute__
  ((used))` did NOT fix it. FIX: make it a DEFINED EXPORT like wjhelp -- `extern "C" EMSCRIPTEN_KEEPALIVE
  void WJTraceRoots(...)` + add `_WJTraceRoots` to EXPORTED_FUNCTIONS in build-embed-full.sh + cast at
  the registration `JS_AddExtraGCRootsTracer(cx, (JSTraceDataOp)WJTraceRoots, nullptr)`. Verify the env
  import is gone: `strings gecko.wasm | grep -c 'env,_ZN.*WJTraceRoots'` == 0. (Any C++ function pointer
  the engine calls back from JIT code needs this treatment in this build.)
VERIFIED: jiarr.html (a[i]=a[i]+1 dense r/m/w) JIT ON 89.5ms vs OFF 843 = ~9.4x, A0/B50 exactly-once.
jimut.html (this.sum+=x via this.add() method calls) sum=499500/dsum=200000 EXACT. Octane OO subset
(richards,deltablue,raytrace,navier-stokes) COMPLETES, no crash/abort, SCORE 226, 13 compiled / 61
failed (was 8/66 -- Mode VS picks up the mutating OO fns); GC-rooting exercised by raytrace/navier GCs.
No regression: fib ~117x, vsum 158ms (Mode V), SETP 132x (Mode VS). Perf is MIXED (Mode VS frame-memory
is slower per-op than Mode V; proto-method GetProp still helper-routed) -- correctness+coverage first.
## MODE VS Stage 3 -- WORKS+VERIFIED (2026-06-17): prototype-method GetProp inline + dynamic slots
WJVSGetProp now inlines proto-chain + dynamic-slot reads (ported emitSlotLoad from Mode V's
WJEmitGetPropV: off & kWJDynSlot -> slots_(@base+8); receiver-shape-guard -> if gWJProtoHolder[site]==0
load from receiver else holder-shape-guard + load from holder; any miss -> WJH_GETPROP). WJFillIC GetProp
branch ENABLES proto+dyn caching ONLY for Mode VS GetProp sites (`bool vsGet = ownerE->modeVS && op==
GetProp`): own data prop (fixed OR dyn via encodeOff) else walk staticPrototype() up to 8 levels for a
data prop -> cache {RECEIVER shape, holder addr in gWJProtoHolder[site], holder shape in
gWJProtoHolderShape[site], encoded off}. Mode V + ALL SetProp stay OWN-FIXED-only (Mode V's proto path
was the one gated off for a past miscompile; SetProp inline-stores fixed slots only). GC-safe: a major GC
clears gWJICTable/gWJProtoHolder/gWJProtoHolderShape (WJFinalizeCB) so the cleared shape=0 guard misses ->
helper refills; the prototype object is kept alive by the normal graph, we only cache its (tenured) addr.
VERIFIED: jiproto2.html (a Mode VS method run(){this.acc = this.acc + this.step(i)} -- mutates + calls a
PROTO method in a 2M loop) JIT ON 92.1ms vs OFF 5078.7 = ~55x, acc=50005000 EXACT. Octane OO subset still
correct (SCORE 229, 13 compiled / 61 failed, no crash). HONEST: the 55x microbench gain did NOT move
octane Richards/DeltaBlue much (Richards 117, DeltaBlue 101) -- the remaining bottleneck is NOT proto
lookups but (a) the 61 FAILED functions (Richards/DeltaBlue hot fns use ops Mode VS lacks: GetGName,
bitwise-in-VS, New/constructors, etc.) and (b) Mode-V(non-mutating)->Mode-VS(mutating) calls deopt to the
interpreter (caps mixed call trees).

## MODE VS Stage 4 -- WORKS+VERIFIED (2026-06-17): diagnostic + constants + GetGName + bitwise; 8->29
Added a GECKO_DEBUG_JIT DIAGNOSTIC: gWJVSBlock[256] counts, per MUTATING function that fails Mode VS,
the FIRST op it can't handle; WJMaybeLogDeopts prints the top via js::CodeName ("VS-blocked-by <op> xN").
Drove the next steps data-first. Added to Mode VS: constants Null/Undefined/True/False/Double (were
silently absent); GetGName (plain WJH_GETGNAME helper, no inline cache -- the helper resolves global
LEXICAL env [lookupPure+getSlot, TDZ->ReportRuntimeLexicalError] THEN global OBJECT [GetProperty], matching
the interpreter since GetNameOperation is static/uncallable; #include vm/EnvironmentObject.h); bitwise
BitOr/And/Xor/Lsh/Rsh/Ursh/BitNot (numbers->inline WJSToInt32=unbox;I32TruncSatF64S;I32WrapI64 then i32 op
then F64ConvertI32S/U+rebox; else wjhelp js::BitOr/.../UrshValues/BitNot; wasm shifts mask count mod 32).
RESULT: compiled functions 8 -> ~29; octane OO completes correct, SCORE ~223.
*** KEY HONEST FINDING: coverage 8->29 did NOT move the octane SCORE (flat ~223-232). The ceiling is NOT
compile count -- it is (1) Mode-V(restart) callers calling Mode-VS(no-restart) callees DEOPT to the
interpreter (WJFillIC refuses to cache a Mode-VS callee for a non-Mode-VS caller), so the hot driver loops
run interpreted even though leaf methods compile; (2) Mode VS frame-memory is slower per-op than Mode V.
Adding ops won't move octane until the call chain stays in wasm. ***
Remaining VS-block blockers: IsConstructing x8 (CONSTRUCTORS `new X()` -- Richards/DeltaBlue are
constructor-heavy), And x1-3 (&& short-circuit; And/Or/Coalesce bail in block discovery), String x1,
BindUnqualifiedGName x1, Not x1.
NEXT LEVERS (impact order): (A) PERF CEILING -- compile hasCall (non-mutating) functions as Mode VS too
so call_indirect to Mode-VS callees stays in wasm (today deopts); risk: slows pure-call fib -- MEASURE.
This is what will actually move octane. (B) constructors (IsConstructing + New). (C) && short-circuit.
All SetProp/SetElem/this/calls/proto-methods/constants/GetGName/bitwise SOUND+verified; no regressions
(fib ~117x). Test pages: jisetp/jiarr/jimut/jiproto2.html + _t_page.cjs (PAGE/MARK env).

## MODE VS Stage 5 -- WORKS+VERIFIED (2026-06-17): ADAPTIVE Mode VS for deopters -> deopts 1844->341
GOAL (2026-06-17 /goal): octane with very low deopts + failed compiles. Added deopt-source diagnostics
(gWJDeoptOp[op] histogram in WasmJitRunCall's deopt path via gWJSites[gWJMissSite] op; gWJDeoptType for
non-number; gWJFailOp[op] for Mode N/V compile bails via gWJBailOp set in WJEmitOp/WJEmitOpV defaults +
the And/Or/Coalesce bails; logged in WJMaybeLogDeopts as "deopt-at/MV-blocked-by/VS-blocked-by"). FOUND:
the deopts are POLYMORPHIC IC misses -- GetProp x1219 + Call/CallIgnoresRv x561 (sites seeing multiple
shapes/callees; the monomorphic IC misses+deopt-restarts every call). Type deopts negligible (x62).
FIX (the big lever): ADAPTIVE recompile -- WasmJitEntry += vsCapable (all ops WJModeVSSupported, set in
WJCompile) + forceVS. In WasmJitRunCall's deopt path: if e->deopts >= 8 && e->vsCapable && !e->modeVS,
set forceVS + state=Cold (handle/tableIdx=-1) -> the next WasmJitObserveCall recompiles it as no-restart
Mode VS, where a poly miss calls the HELPER instead of deopt-restarting (and it is GC-traced). WJCompile
gate: non-mutating + forceVS + vsOK -> modeVS. fib does NOT deopt -> never triggers -> stays fast Mode V
(no frame-memory regression). ALSO routed Null/Undefined/True/False to Mode V (Mode N is f64-only -> would
lose the bool/null type; do NOT add them to Mode N). RESULT (octane 4-subset, GECKO_DEBUG_JIT): deopts
1844 -> 341 (GetProp 1219->115, Call 561->202; remaining ~ the <=N warmup transient before recompile +
non-vsCapable fns); compiled 32->44, failed 42->30 (chronic deopters now recompile to VS = Compiled
instead of the deopt-guard disabling them = Failed); SCORE ~228 -> 245 (DeltaBlue 99->149!). Threshold
tuned 24->8 (genuine poly sites deopt every call so hit 8 fast; monomorphic multi-site fns deopt ~once
per site, stay under). Remaining failed blockers: IsConstructing x7 (CONSTRUCTORS new X()), And/Or x7
(short-circuit -- needs relooper value-across-branch; in Mode VS frame model depth is consistent at the
join so feasible), Nop-structural x8 (WJStackSafe bails: ternaries/complex), TableSwitch, String, Not.
NEXT: lower transient further; constructors (IsConstructing+New); And/Or short-circuit (also makes those
fns vsCapable -> recompilable -> fewer ongoing deopts).

## MODE VS Stage 6 (2026-06-17) -- /goal "octane very low deopts+failed"; LATENT CRASH blocks it
DEOPT SOURCE (diagnostic gWJDeoptOp histogram): the deopts are POLYMORPHIC IC misses -- deopt-at GetProp
~1219, Call+CallIgnoresRv ~561, type(non-number) ~62. The monomorphic IC misses+deopt-restarts on every
shape/callee change. Adaptive Mode VS recompile (Stage 5) cut these to ~341 by converting deopters to
no-restart VS (helper on miss). FAILED-compile diagnostic (gWJFailOp via gWJBailOp in WJEmitOp/WJEmitOpV
defaults + And/Or/Coalesce bails): MV-blocked-by Nop(structural: WJStackSafe/ternary) ~8, IsConstructing
~3, And/Or ~4, TableSwitch/String/Not; VS-blocked-by IsConstructing ~4, And ~3, String, Not.
*** BLOCKER: aggressive recompile of CALL-HEAVY functions to Mode VS CRASHES/HANGS deltablue (a flaky
latent miscompile -- "*** PAGE CRASH ***"). BISECTED: recompiling forceVS only for !hasCall functions
COMPLETES octane reliably; recompiling hasCall functions (consec>=6, threshold<=8, or even threshold-24
on some runs) crashes deltablue. NOT the cause (ruled out by test): frame-depth OOB (fixed: frameSize +8
headroom + `c.depth >= kWJVSMaxStack` bail), VS->VS call_indirect (made VS non-targets -> still crashed),
JIT-reentry recursion depth (added gWJCallDepth guard -> still crashed; AND the guard itself LEAKS on a
wasm trap that unwinds past the decrement -> degrades everything to interpreter -> stall; REMOVED it).
The crash is in WJVSCall / the VS body of a recompiled non-mutating call-heavy function (mutating VS
call-fns like jiproto2 work; the difference is untested patterns: VS calling a VS callee via the helper,
deep polymorphic-call recursion). Needs an INTERACTIVE debugger / minimal repro (stack trace) -- could
not pin down remotely. ***
CURRENT STABLE CONFIG (committed): adaptive recompile forceVS only for vsOK && !hasCall (call-free);
threshold e->deopts>=24 (total); VS funcs ARE call_indirect targets w/ the Mode-V-caller refuse guard;
NO depth guard. Octane COMPLETES reliably (SCORE ~204-243 load-dependent, all 4 subtests, no crash).
Deopts NOT measured for this config (heartbeat is timing-flaky: fires 10s after the 1st JIT call; under
high machine load the 14s octane run starts slow + the heartbeat misses the window -> "heartbeats=0").
Logically deopts stay ~high here (the deopting functions are mostly hasCall -> not recompiled). So this
is STABLE but does NOT meet "very low deopts".
TO MEET THE GOAL, two paths: (A) FIX the VS-call-recompile crash (needs a debugger -- get the wasm trap
/ which function / which op; then recompiling call-heavy deopters to VS cuts deopts to ~341 + transient).
(B) GC-SAFE ALTERNATIVE w/o recompile: add a POLYMORPHIC (2-4 way) inline cache to Mode V GetProp (cuts
the ~1219 GetProp deopts; inline shape checks, NO helper -> no GC hazard, no VS recompile -> no crash) +
a polymorphic call cache for the ~561 Call deopts. This is the cleanest safe path but is a real feature
(expand gWJICTable to N shapes/site, N shape-checks in WJEmitGetPropV, WJFillIC cycles slots). Also: the
heartbeat fired reliably only at low load -- measure deopts when /proc/loadavg is low.

## MODE VS Stage 7 (2026-06-17): the aggressive-recompile crash ROOT CAUSE (user supplied the trace)
THE HARNESS GAP: my playwright capture only got "*** PAGE CRASH ***" -- the renderer died before the
console flushed, and the key messages were on the WORKER thread. FIX the capture: print EACH console/
worker/pageerror line IMMEDIATELY (not buffered), capture p.on('worker') console, and Promise.race the
p.evaluate with a 2s timeout so a dead renderer doesn't hang the poll (see bench/_t_crash.cjs). The user
pasted the real messages -- TWO bugs:
1. INVALID WASM (compile-failed spam): "i32.wrap_i64 expected i64, found i32.trunc_sat_f64_s of type i32".
   BUG in WJSToInt32 (Mode VS bitwise ToInt32): emitted MiscOp::I32TruncSatF64S (f64->i32) then
   Op::I32WrapI64 (expects i64) = type error. FIX: use MiscOp::I64TruncSatF64S (f64->i64) then I32WrapI64
   (matches Mode N's WJToInt32). FIXED + verified: no more compile-failed spam. (The GetElem/SetElem index
   path correctly uses I32TruncSatF64S ALONE -- no wrap -- so it was fine.)
2. THE CRASH (hard renderer death): "RuntimeError: memory access out of bounds" in js::jit::TraceJitFrames
   (JitActivation::trace) during js::Nursery::doCollection. gecko's GC walks the JIT-activation frames on
   a nursery collection and reads OOB. ROOT CAUSE (analysis): a Mode VS function calling via WJH_CALL re-
   enters gecko (my host wasm on V8 -> wjhelp C++ -> js::Call -> guest PBL), creating a NESTED gecko<->
   host-wasm activation boundary. Aggressive recompile (call-heavy fns -> VS) builds DEEP chains of these
   re-entrant boundaries; a nursery GC mid-chain makes gecko's TraceJitFrames walk the interleaved frames
   and hit OOB. Shallow configs (threshold-24 / call-free recompile) keep few such frames live during a GC
   -> no OOB. The depth-guard (gWJCallDepth, in WasmJitRunCall) did NOT fix it -- it only counts WasmJit-
   RunCall re-entries, not call_indirect, and the OOB is frame-tracing, not pure stack depth. NOT fixable
   by remote reasoning -- needs a native debugger on gecko's wasm-frame GC tracing (or making the wjhelp
   re-entry establish a clean activation boundary the GC can walk).
STABLE CONFIG (committed, octane COMPLETES reliably, SCORE ~207-245): adaptive recompile forceVS only for
vsOK && !hasCall (call-free); + the WJSToInt32 fix; + depth-guard 24 (defense-in-depth). Bitwise now
compiles. Does NOT meet "very low deopts" (the call-heavy deopting fns stay Mode V -> their GetProp/Call
deopts remain), because the low-deopt path (recompile them to VS) hits the GC TraceJitFrames OOB.
TWO PATHS TO THE GOAL (both real work): (A) fix the GC/TraceJitFrames OOB with a debugger -> aggressive
recompile then cuts deopts to ~341. (B) CRASH-FREE: add a polymorphic (2-4 way) inline cache to Mode V
GetProp (+ a poly call cache) -- inline shape checks, NO WJH_CALL re-entry -> no GC-OOB; cuts the ~1219
GetProp (+~561 Call) polymorphic-miss deopts WITHOUT recompiling to VS. Path B is the safest next step.

## TIERING root-cause + config (2026-06-17): both warmup thresholds = 100
getWarmUpCount() is incremented ONLY by the C++ interpreter js::Interpret (vm/Interpreter.cpp
~2037, CASE(LoopHead), gated by jit::IsBaselineInterpreterEnabled) + the disabled JIT entry.
PBL (PortableBaselineInterpret.cpp) NEVER increments it. A fn runs in js::Interpret only for its
first ~N calls (N = portableBaselineInterpreterWarmUpThreshold), then tiers to PBL where it spends
~all its time -- so the counter FREEZES at ~N (no higher native tier to count toward under
--disable-jit). Consequence: a wasm-JIT threshold ABOVE N is unreachable (silently disables the
JIT). FIX/config the user chose: set BOTH to 100 -- jit/JitOptions.cpp SET_DEFAULT(portableBaseline
InterpreterWarmUpThreshold, 100) (BOTH the FORCE-branch `0` at ~147 and the ENABLE-branch `10` at
~216; SET_DEFAULT is `var = ...` so the later 216 wins -- change both to be safe) AND the two wasm
hooks `getWarmUpCount() >= 100` (Interpreter.cpp ~3278, PortableBaselineInterpret.cpp ~7829). Now
js::Interpret runs the first 100 calls (climbing warmup to 100), THEN the wasm JIT engages -- and
PBL is functionally bypassed (transient at the 100 boundary). Penalty is minimal: js::Interpret is
the FAST tier for the <=100-call range (forcing PBL early even regressed a microbench per the
in-tree comment), so fns called 11-100x just stay there instead of paying a wasm compile. VERIFIED:
fib still 12.4ms (~JIT on), octane subset correct (Richards=106 DeltaBlue=109 RayTrace=357
NavierStokes=500 SCORE=213). To raise the wasm bar HIGHER than the PBL threshold you'd need an own
counter (getWarmUpCount can't exceed the PBL threshold); per-call own counters miss single-call big
loops (the loop-edge warmup catches those).

## DEBUG: GECKO_DEBUG_JIT deopt heartbeat (2026-06-17)
WasmJS.cpp: env GECKO_DEBUG_JIT=1 makes WasmJitRunCall emit a stderr line every ~10s:
`[wasm-jit] +N deopts in last Ss (total deopts=D runs=R, C compiled / F failed)`. Cumulative
globals gWJTotalDeopts/gWJTotalRuns (incremented at the deopt site + on success); WJMaybeLogDeopts()
gated on getenv("GECKO_DEBUG_JIT") (cached static) FIRST so the hot path pays one branch when off;
uses mozilla::TimeStamp::Now() (#include "mozilla/TimeStamp.h"); iterates gWasmJitMap for the
compiled/failed counts. Fires only when WasmJitRunCall is called (i.e. there's JIT activity).
Set via index.html's `?env.GECKO_DEBUG_JIT=1` knob; stderr -> emscripten printErr -> index.html
log() -> console.log, so playwright p.on('console') sees `[err] [wasm-jit] ...`. VERIFIED live on
octane: `+1883 deopts in last 12s (total deopts=1883 runs=743349, 8 compiled / 66 failed)` -- note
deopt rate ~0.25% (healthy) and 8 compiled / 66 FAILED: on OO octane code most hot fns are declined
by the mutation-gate (SetProp/SetElem disabled for deopt-rerun soundness), so the JIT's real-code
coverage is the numeric ones. The log is now the tool to SEE coverage/health on real workloads.
Runner: embed-xul/bench/_t_deoptlog.cjs (loads octane via geckoRender, captures [wasm-jit] lines).

REMAINING (coverage): GetName (scope-chain)/Callee/global-lexical; bitwise inside Mode V (Mode N
only); typed arrays; strings; New/construct; megamorphic/polymorphic IC (only monomorphic now).
OLD-NOTE (superseded, kept for the scratch-reuse rationale): JSOp::Call needs NO scratch stack:
gWJScratch is a transient handoff -- each call's PROLOGUE copies args into wasm locals immediately,
so nested/recursive calls can reuse it. Plan: a function import wasmjit_invoke(site,argc) bound
via the callbackId path; at a Call site guard the callee==cached JSFunction, marshal args to
gWJScratch, call the import (re-enters C++ -> wasmhost_call the callee's handle -> result in
gWJScratch[result]); deopt-fill compiles+caches the callee. Or inline small monomorphic leaf
callees (resolve GetGName in the global at compile time). Also still: Mode V zero-inits locals
(should be undefined); cached shape* ABA risk (prototype).

## KNOWN LIMITS + NEXT
- Straight-line only: NO control flow yet (comparisons/Lt../JumpIfFalse/Goto/LoopHead all bail).
  The real speedup needs loops compiled into the wasm body (Milestone 2 -> structured control
  flow from the reducible JS CFG: wasm block/loop/if/br_if). M1 boundary tax dominates trivial
  funcs (~675ns/call), so M1 alone is ~neutral; loops are where it wins.
- Zero-inits JS locals (should be undefined/NaN) -- only correct for funcs that init before read.
- Numeric f64 only (args + result); non-number args deopt to interpreter (correct). No objects/
  strings/calls/closures. GC: JSScript* keyed cache can go stale if a script is finalized + the
  ptr reused (fine for benches; harden later). Debug printfs ("[wasmjit] ...") are still in --
  REMOVE before benchmarking (they spam + skew timing).
- Common unsupported ops seen on real scripts: 200, 227, 179, 76, 8 (resolve names via
  searchfox JSOp ordinal). Target the hottest for coverage.

## STAGE 8 -- the deopt goal is MET: 0 steady-state deopts (root cause was array.length)
The `/goal` "octane runs with very low deopts" is achieved: octane (richards,deltablue,raytrace,
navier-stokes,crypto,earley-boyer) shows ONE warmup window (+628 deopts) then **+0 deopts in every
subsequent window** (27s/19s/4s/4s) -- steady-state ZERO. OCTSCORE ~208-215, DeltaBlue 75->119/123,
no crash. The earlier "deltablue deopts 1370/window" was pure WARMUP that the single-subtest run
caught before the bench finished (deltablue alone completes in ~1 heartbeat).

THE KEY NON-OBVIOUS FINDING (took a long diagnostic hunt): the dominant deopt source was NOT
polymorphism and NOT megamorphism -- it was **`array.length`**. deltablue's OrderedCollection reads
`this.elms.length` in a hot loop; a dense array's `length` is a CUSTOM data property, so
`PropertyInfo::isDataProperty()` returns FALSE -> the GetProp IC fill bailed (`ownacc` reason) ->
the site deopted on EVERY call forever (745737 fill-bails, 100% of them `.length`). Diagnosis path:
added counters in WJFillIC -- `megamorphic-misses` (all N IC ways full+no match: was 0 -> NOT >N
shapes), then `getprop-fill-bail: notnative/ownacc/protoacc/protononnative/notfound` (ownacc
dominated), then compared the id to `cx->names().length` (100% match). FIX: inline array-length
load in WJEmitGetPropV for `.length` sites (gWJSiteLen[site], set at emit when
`script->getName(pc)==cx->names().length`): shape-guard (WJFillIC caches the shape ONLY for
`obj->is<ArrayObject>()`), then load `len = i32.load[ i32.load[obj+12]/*elements_*/ - 4 ]` (the
ObjectElements header: flags@-16, initLen@-12, capacity@-8, length@-4 relative to elements_), guard
`len >= 0` (signed; >=2^31 would be a double Value -> deopt), box INT32 via
`i64.extend_i32_u(len) | (kWJTagInt32<<32)`. SOUND: only cached array shapes match -> only arrays
take the inline load; non-array `.length` (string/function) deopts (rare).

ALSO shipped this stage (all in firefox/js/src/wasm/WasmJS.cpp):
- **N-way polymorphic GetProp IC** (kWJICWays=4). Way 0 = existing gWJICTable/gWJProtoHolder/
  gWJProtoHolderShape (shared w/ SetProp/GetElem/Mode-VS-GetProp); ways 1..N-1 = gWJICTableX/
  gWJProtoHolderX/gWJProtoHolderShapeX laid out [(way-1)*kWJMaxSites+site]. gWJSitePoly[site] marks
  N-way (only Mode V GetProp emits the extra ways + gets the N-way fill). Emit: a loop of
  `if(shape==way[w].shape){entryLoad(w)}else{...}` chains (each If is i64-typed; innermost else =
  emitMiss/Return = stack-polymorphic). WJFillIC picks the matching/empty way, else evicts way 0
  (counts gWJMegaMiss). VERIFIED sound incl. eviction by bench/jipoly.html (4 shapes fit ok4=true,
  5th shape forces eviction ok5=true). NOTE: deltablue turned out NOT to need this (it was
  array.length, megamorphic-misses=0) -- but it's correct + helps genuine OO polymorphism.
- Diagnostics (GECKO_DEBUG_JIT, 4s heartbeat now): `megamorphic-misses`, `getprop-fill-bail`
  reasons, and a top-deopting-SITE dump (site#, op, poly/len/proto flags, waysfilled, script@pcOff)
  -- the per-site dump revealed the deopts were spread thin (~4/site = warmup fills), confirming
  steady-state 0.

REMAINING for "very low FAILED compiles" (the other half of the goal, NOT yet met -- 36 failed on
the 4-subset, 113 on the 6-subset): a genuine LONG TAIL of language features, each a separate
risky change to a shared emitter, much of it bounded by octane's inherently un-JIT-able content
(strings/regex/try-catch). Real op blockers (non-"Nop"): **And/Or/Coalesce** (Mode V relooper bails
in pass-1, line ~3385 -- HARD: short-circuit logicals keep a value across a block boundary, but the
relooper requires empty operand stack at boundaries / WJStackSafe; would need phi-locals). Mode VS:
IsConstructing (x11, constructors -- can't know `new` from the bridge), String, Mod (no f64.rem;
needs a helper), ToPropertyKey, StrictConstantEq, Not, GetAliasedVar, BindUnqualifiedGName, Unpick.
Structural ("Nop" in the histogram = gWJBailOp reset to Nop at WJCompile:4972 + only specific-op
bails overwrite it, so "Nop" = non-op reject): too-many-blocks (K>1024, line 3407), WJStackSafe
fail (3408), bad/blockless jump target. No single cheap fix; hot fns already compile.

## STAGE 9 -- And/Or/Coalesce + Not + JumpIf-on-value in Mode V (DONE, verified 36/36)
Implemented the highest-value failed-compile gap: short-circuit logicals + boolean conditions in
the Mode V relooper (WJEmitBodyVCF). All in firefox/js/src/wasm/WasmJS.cpp. Verified by
bench/jilogic.html = 36/36 (&&, ||, ??, !, if(a&&b), nested chains, across number/bool/object/null/
undefined/NaN/string), octane steady-state deopts still 0, OCTSCORE 205-256, no crash. No more
`MV-blocked-by And/Or/Coalesce`.
- **WJVToBool(e, srcLocal, tmpF, tmpTag)**: ToBoolean on a boxed i64 Value -> i32 0/1. isDouble =
  (tag u<= JSVAL_TAG_CLEAR 0xFFFFFF80): truthy=(d==d)&(d!=0). Else tag==OBJECT->1; INT32/BOOLEAN->
  low32!=0; UNDEFINED/NULL->0; ELSE (string/symbol/bigint/magic) -> DEOPT (f64.const 1.0; return --
  safe, Mode V is non-mutating + restarts). New tag consts kWJTagClear/Boolean/Undefined/Null.
- **WJVIsNullish(e, srcLocal, tmpTag)**: tag==UNDEFINED || NULL -> i32. For Coalesce.
- **WJComputeEntryDepth(script,isStart,len,&entryDepth)**: forward worklist dataflow giving the
  operand-stack depth at each block ENTRY (replaces the depth-must-be-0 WJStackSafe for Mode V
  ONLY; Mode N/VS still use WJStackSafe). And/Or/Coalesce PRESERVE the tested value -> a depth-1
  boundary. BAILS on: depth>1 at any boundary (one phi local only), inconsistent join depths,
  underflow, and -- crucial soundness fix -- a JumpIfFalse/JumpIfTrue whose POST depth != 0 (a value
  lurking under the condition; a `br` silently discards extra stack so that'd be a stale-phi
  MISCOMPILE, not a validation error). KEY SAFETY NET: a wrong depth model -> invalid wasm -> host
  rejects -> interpreter (graceful), NOT a miscompile; only WJVToBool value-bugs miscompile (tested).
- **Relooper (WJEmitBodyVCF)**: added i64 local tmpPhi=rvalLocal+8 (a 4th local group). A block
  entered at depth 1 reloads tmpPhi at entry; any Goto/fall-through edge INTO a depth-1 block spills
  the stack top (`local.set tmpPhi`) via the spillIfPhi lambda. And/Or/Coalesce: `local.set tmpPhi`
  (both successors reload it), compute WJVToBool/WJVIsNullish, `if(cond) pc=A else pc=B` (And:
  A=fall,B=tgt; Or: A=tgt,B=fall; Coalesce[cond=nullish]: A=fall,B=tgt), br. JumpIf-on-VALUE (not
  cmp-preceded, tracked via prevCmp): local.set tmpA; WJVToBool; then the existing branch. Single
  phi local works because &&/||/?? chains always leave exactly 1 value (depth stays 1); deeper
  (logical as a call arg, depth>1) bails.
- **Not (`!x`)** in WJEmitOpV: local.set tmpA; WJVToBool; i32.eqz; box BOOLEAN. Needed a forward
  decl of WJVToBool before WJEmitOpV (WJEmitOpV is defined earlier in the file).
ALSO DONE this session (same WJEmitOpV, all verified by jilogic.html 62/62, octane steady-state 0
deopts, OCTSCORE ~249-262, no crash):
- **StrictConstantEq/Ne** (`x === null/undefined/true/5`, `!==`): WJVStrictConst(e,pc,tmpA,tmpTag,
  isEq). Decodes the uint16 ConstantCompareOperand (include vm/ConstantCompareOperand.h):
  Null/Undefined -> tag check; Boolean -> tag==BOOLEAN & low32==b; Int32(k) -> (tag==INT32 &
  low32==k) | (isDouble & reinterpret(val)==(double)k) [so 5===5.0]. Inverts for Ne, boxes boolean.
- **Not** (`!x`): WJVToBool + i32.eqz + box boolean.
- **Mode V bitwise** BitOr/BitAnd/BitXor/Lsh/Rsh + BitNot: WJVUnbox(L)->f64, WJToInt32 (trunc_sat+
  wrap, same as Mode N), i32 op, box INT32 via i64.extend_i32_u | (kWJTagInt32<<32). NON-number
  operands deopt (WJVUnbox guards). Ursh SKIPPED (uint32 result may exceed int32 -> would need
  double boxing).
ALSO DONE (jilogic.html now 81/81, octane steady-state 0 deopts, OCTSCORE ~259, DeltaBlue 124,
no crash):
- **TypeofEq** (`typeof x ==/!= "type"`): WJVTypeofEq(e,pc,tmpA,tmpTag). Decodes the uint8
  TypeofEqOperand (include vm/TypeofEqOperand.h; low 4 bits=JSType, 0x80=Ne). Tag-only types
  (undefined/string/number[=INT32 or tag<=CLEAR]/boolean/symbol/bigint) -> pure tag check. object/
  function -> BAIL (return false; callability probe = shape->base->clasp flags, fiddly + miscompile-
  risky if wrong, and the validator can't catch a semantic typeof bug) -- bailing keeps the fn in
  the interpreter (sound, no perpetual deopt). New tag consts kWJTagString/Symbol/BigInt.
- **Mod (Mode V, integer)**: WJVModInt(e,tmpA,tmpB). Both operands INT32 + divisor!=0 -> i32.rem_s
  -> box INT32 (sign + INT32_MIN%-1=0 match JS; rem_s only traps on /0 which we guard). Non-int32
  operand OR zero divisor -> DEOPT (return 1.0); a hot double-% fn self-disables via the deopt-count
  guard (deopts>=64 && runs<deopts/4). Ursh still skipped (uint32 boxing).
STILL REMAINING (genuine diminishing returns / large / risky -- recommended STOP point for the
op-by-op grind):
- TypeofEq `=== "object"/"function"`: needs an object-callability probe (read clasp flags) -- the
  one octane TypeofEq bail is this; risky (semantic miscompile not caught by the wasm validator).
- **Mod for PURE-NUMERIC fns**: those go to Mode N (WJEmitOp), which still lacks Mod; the one octane
  Mod bail is Mode N. Adding it needs an f64 integer-range detection path + 2 f64 scratch locals
  (Mode N has only `scratchLocal`). Marginal (1 fn).
- **Arguments** (1 fn): materialize an arguments object.

## STAGE 13 -- WHY octane OO (richards/deltablue) doesn't WIN: the Mode VS transliteration ceiling
DEFINITIVE profiling (added counters: gWJRunsV/gWJRunsVS, gWJHelpKind[], gWJForceVS, gWJHelpCalls,
per-fn helperCalls; all GECKO_DEBUG_JIT heartbeat): for richards+deltablue, **runs ModeV(fast)=0,
ModeVS(slow)=~400k** -- 100% of hot runs are in slow Mode VS. Because the hot OO functions MUTATE
(this.x=...), which REQUIRES Mode VS (GC-traced frame). Clean ON/OFF: deltablue ~127-131 vs ~129-136,
richards ~96-106 vs ~109-112 -> NEUTRAL within noise (not the win the user wants). The numeric 7x
(jinum.html: 308ms ON vs 2137ms OFF) proves the engine CAN win big -- only when Mode N/V applies
(unboxed f64 in wasm LOCALS, loop stays in-wasm, no guards/helpers).
ROOT CAUSE: Mode VS is a TRANSLITERATION of the interpreter -- operand stack in frame MEMORY
(mandatory: GC must trace live object ptrs), values BOXED, memory round-trip + type guard per op =
the SAME work as PBL minus dispatch plus boundary tax ~= interpreter. No tuning breaks this.
WHAT I TRIED THIS ROUND (all measured): inline GetGName in Mode VS (WJVSGetGName + WJH_GETGNAME now
calls WJFillIC to warm the cache) -- REAL: helper-calls 3.4M->3.6k, GetGName helpers gone, KEEP IT.
Helper breakdown was GetGName 30% / Eq 23% (non-numeric ===) / SetProp 22% (object stores need a GC
write barrier -> helper) / Call 10% (polymorphic). Disable-guard: a Mode VS fn with >helperCalls/run
gets state=Failed -> interpreter (gWJCurEntry attributes helpers; K=1, checked every 128 runs) --
mild help, KEEP. forceVS-gate-on-warmup (runs>=32): REVERTED, it HURT (deltablue 131->108: without
forceVS, polymorphic fns thrash deopt+restart; VS is the right destination, just slow).
THE ONE REAL FIX (not yet done -- the genuine next compiler effort): make Mode VS FAST = operand
stack + locals in wasm LOCALS (registers), UNBOXED where the type is statically known, with live
OBJECT slots SPILLED to the GC-traced frame ONLY at safepoints (WJVSCallHelper + WJVSCall -- the only
allocation/GC points; between them no GC -> locals safe). Classic GC-safe register allocator with
stack maps. Touches ~25 WJVS* emit fns + the store pattern (WJSAddr+WJSStoreEnd -> local.set, since
locals aren't addressable). GC-SAFETY-CRITICAL: a spill/reload bug = silent heap corruption (the wasm
validator can't catch it) -> must GC-stress-test (jistr2-style mutating loop). This is what turns
"interpreter-speed work in wasm" into a real OO speedup. Bench helpers added: jinum.html (numeric
ON/OFF, 7x), jistr/jistr2 (strings). Current build state: inline GetGName + disable-guard K=1 +
counters; octane 0 steady-state deopts, no crash, OO neutral, numeric 7x.
JIT IS NOW OPT-IN (changed this session): OFF by default; enable via env GECKO_WASMJIT=1, which
index.html maps from the URL `?jit=1`. (Was: on-by-default, GECKO_NOWASMJIT to disable -- that
inverted flag is GONE.) Check is WasmJitObserveCall (WasmJS.cpp ~5550). Bench runners must add
`&jit=1` to the index.html URL to exercise the JIT (e.g. _t_one.cjs adds it unless NOJIT is set;
_t_octc/_t_page/_t_deoptlog/_t_crash were NOT updated -> they now run JIT-OFF unless you add &jit=1).
FULL DESIGN DOC for the rewrite (slot->local map, safepoint spill/reload protocol, soundness
invariant, phasing, GC-stress acid test, rollback): embed-xul/MODE_VS_REGALLOC.md. User decided
(this session) to SCOPE it now + BUILD it next session -- start from that doc, do NOT rush it
inline (a spill/reload bug = silent heap corruption the validator won't catch).
- "Nop" in the histogram = structural rejects (not real ops). Mode VS gaps unchanged (And/Or NOT
  ported to VS; IsConstructing, String, Instanceof, GetAliasedVar, BindUnqualifiedGName, ...).
The octane failed-COUNT rises on longer runs only because they reach deeper into earley-boyer's
inherently-interpreter-only functions (strings/regex/recursion) -- bucket 1/2, not "unimplemented".

## STAGE 10 -- string LITERALS (JSOp::String) done; the small-op tier is now exhausted
- **JSOp::String** in WJEmitOpV (Mode V): push a string-literal Value. Only ATOMS
  (`s->isAtom()`, immovable + script-rooted) are baked as a constant pointer
  `(kWJTagString<<32)|low32(JSString*)`; a non-atom (lazy, could move under compacting GC ->
  dangling untraced wasm local) BAILS. Verified jilogic.html 88/88 (ternary/if returning literals,
  `typeof ... === "string"`). String is GONE from MV-blocked-by. The string flows as an opaque i64
  (return/pass/store); any string OPERATION (=== content-compare, +, .length, charCodeAt) is a
  different op that deopts/bails -> still correct via the interpreter.
FINAL Mode V op coverage now spans: arithmetic, bitwise (signed + ~), compare, logical (And/Or/
Coalesce/Not), constants incl. string LITERALS, typeof (tag types), StrictConstantEq/Ne, integer
Mod, GetProp/SetProp/GetElem/SetElem, calls, GetGName. octane: 0 steady-state deopts, OCTSCORE
~243-262 (load-dependent), DeltaBlue ~112-124, no crash, jilogic 88/88.
TRUE REMAINING FRONTIER (each a distinct, larger/riskier project -- NOT small ops):
- **string OPERATIONS** (concat needs allocation->GC->hard in untraced Mode V; .length inlinable
  like array length; ===/charCodeAt/methods). The big one.
- typeof `=== "object"/"function"` (callability probe; semantic-miscompile risk).
- Arguments object; Mode-N Mod (pure-numeric fns; Mode N scratch-limited); Mode VS op parity.

## STAGE 11 -- string .length (the SOUND, non-allocating string ops are now done)
- **String `.length`** in WJEmitGetPropV: a `.length` site (gWJSiteLen) now dispatches on the
  receiver tag FIRST -- if STRING, read the length inline from the JSString header (offset 4 on
  wasm32, `i32.load[strptr+4]`, box INT32; string length always fits int32). A
  `static_assert(JSString::offsetOfLength()==4)` makes a wrong offset a BUILD failure, not a silent
  miscompile (the wasm validator can't catch a field-offset bug). Non-string receivers fall to the
  existing isObject + N-way array-length path. So one `function len(x){return x.length}` handles
  BOTH strings and arrays (jilogic.html 94/94, array path verified un-regressed). No allocation, GC-
  safe (reads an immovable field of a live string).
## STAGE 12 -- string OPERATIONS now JIT-accelerate in Mode VS (concat/compare/.length, GC-safe)
KEY CORRECTION to my earlier claim: I thought concat needed a fundamental Mode V redesign. WRONG.
Mode VS is ALREADY GC-traced (frame in gWJFrameMem) and its Add/StrictEq/Lt helpers are
js::AddValues/StrictlyEqual/... which implement FULL JS string semantics (concat allocates safely
because the frame is traced + WJTraceRoots). The adaptive forceVS path (consecDeopts>=6) already
routes call-free non-mutating fns to Mode VS. The ONLY thing missing: `JSOp::String` was absent from
**WJModeVSSupported** (the vsCapable scan), so any string fn failed the scan -> vsCapable=false ->
forceVS never fired -> it silently ran in the INTERPRETER (correct, but not JIT'd). Diagnosed via
two new GECKO_DEBUG_JIT counters: `forceVS-recompiles` and `VS-string-ops` (wjhelp calls with a
STRING operand) -- both were 0 for string fns.
FIX (one-liner-ish): add `case JSOp::String` to WJModeVSSupported AND to WJEmitOpVS (push the atom
Value onto the VS frame slot; atom-only since the baked constant pointer must be immovable, same as
Mode V). RESULT: jilogic.html scat() (concat-in-loop) now -> forceVS=1, **VS-string-ops=1,616,616**
(1.6M string ops ran JIT'd in Mode VS), jilogic 97/97. jistr.html 15/15 (concat / === / !== / < /
multi-concat / string+number / dynamic non-atom content compare). jistr2.html GC-STRESS (3M concats
in a loop, fresh string per iter -> forces GCs while VS holds string Values in its frame): exact
total 236730000, NO crash -> GC-SAFE confirmed. octane unchanged: 0 steady-state deopts, OCTSCORE
258, DeltaBlue 124, forceVS-recompiles=619, no crash.
WARMUP NOTE (re-confirmed): LOOPLESS fns called from a top-level loop never warm up (warmup only
bumps via LoopHead) -> never JIT. String test fns need an INTERNAL loop to JIT. octane string fns
mostly have CALLS (string methods) -> blocked from VS by the !hasCall gate -> VS-string-ops=0 there.
REMAINING string frontier (the genuinely deep work): (1) CALL-HEAVY string fns can't go to VS (the
!hasCall gate, due to the TraceJitFrames re-entry crash) -> need that crash fixed first; (2) native
String METHODS (substring/charCodeAt/indexOf/...) are C++ native calls the JIT doesn't accelerate
(they deopt -> interpreter, correct). Sound non-allocating Mode V string ops: literals + .length
(Stages 10-11). Allocating string ops (concat/compare): now JIT'd via Mode VS for CALL-FREE fns.

## MODE_VS_REGALLOC Phase 1 -- WORKS+VERIFIED (2026-06-17): operand stack in wasm LOCALS
Implemented embed-xul/MODE_VS_REGALLOC.md Phase 1. The Mode VS operand stack now lives in wasm i64
LOCALS (registers) between safepoints instead of frame memory; args/locals/rval stay in the GC-traced
gWJFrameMem. All in firefox/js/src/wasm/WasmJS.cpp:
- New helpers: kVSsBase=9 (i64 locals s[0..48) for operand-stack depth d -> local kVSsBase+d; declared
  as a 4th local group of kWJVSMaxStack i64). WJVSUseLocals() reads env GECKO_WJVS_FRAME (set=revert to
  all-frame operand stack, for A/B + instant rollback). WJVSIsStack(c,slot)=slot>=stackBaseS &&
  useLocals. WJSLoad(e,c,slot)=local.get for stack slots / frame i64.load else. WJSStorePre/WJSStorePost
  (stack: nothing/local.set; frame: WJSAddr/i64.store). Renamed WJSLoadSlot->WJSLoad(e,c,..) everywhere.
- SPILL/RELOAD at the ONLY safepoints (wjhelp import + call_indirect): WJVSSpillRange/WJVSReloadRange(e,c,n)
  copy s[0..n)<->gWJFrameMem (gWJFrameSP already covers the whole frame, set in prologue, so no SP
  republish). KEY OPTIMIZATION (bystander-only spill): n = depth - (operands this op consumes), because
  the consumed operands are already in gWJHelpA/B/C (arith/cmp/get/set) or gWJScratch (call args+this),
  which WJTraceRoots ALSO traces -> GC updates the moved pointers there. The un-spilled operand/free
  frame slots are traced too but are init'd to Undefined and only ever written with valid Values, so
  tracing a stale-but-valid slot only over-retains, never dangles. At a statement-level call (bystanders
  =0) this spills ~0 slots vs spill-all -- this RECOVERED a ~10% DeltaBlue regression that conservative
  spill-all caused. SOUNDNESS for calls: a call_indirect callee returning deopt 1.0 (Mode N/V type-miss
  or Mode VS entry-overflow) is ALWAYS pre-allocation -> no GC happened -> the un-reloaded arg LOCALS are
  still valid, so the deopt-1 generic-WJH_CALL re-marshal reads them safely.
- WJVSCallHelper gained (c, spillN); ~13 call sites pass depth-operandCount; call_indirect site spills
  depth-argc-2.
RESULT: correct + GC-safe (jistr2 GC-stress exact, jisetp/jiproto2/jimut/jiarr/jilogic 97/97 all pass;
locals identical to GECKO_WJVS_FRAME=1). WINS on tight loops: jiarr ~2x (165 vs 338ms), jisetp 1.2x
(119 vs 144ms), jiproto2 1.08x. *** OCTANE richards/deltablue: NEUTRAL (locals ~70 ~= frame ~71 ~= off
~72). Phase 1 alone does NOT move octane OO. ***

## PRE-EXISTING minor-GC root-tracing HOLE -- FOUND + FIXED (2026-06-17)
NEW acid tests bench/jivsr.html + jivsr2.html (object Value held on the operand stack ACROSS a heavily-
allocating call -> forces a MINOR/nursery GC that moves a fresh nursery object) CRASHED ("memory access
out of bounds") on BOTH the locals AND the GECKO_WJVS_FRAME baseline -> NOT a regalloc regression; a
pre-existing Mode VS GC bug. ROOT CAUSE (confirmed in gc/RootMarking.cpp ~351): WJTraceRoots is
registered via JS_AddExtraGCRootsTracer, and traceRuntimeCommon traces those embedder roots only
`if (!JS::RuntimeHeapIsMinorCollecting())` ("pointers into the nursery should be in the store buffer").
The wasm i64.store into gWJFrameMem emits NO store-buffer post-barrier, so nursery objects in a Mode VS
frame go STALE on minor-GC tenuring. Existing tests escaped it by only holding TENURED objects (octane's
hot objects are tenured -> octane never crashed). FIX: call WJTraceRoots from GCRuntime::
traceRuntimeForMinorGC (gc/RootMarking.cpp, `#ifdef __EMSCRIPTEN__ extern "C" void WJTraceRoots(...);`
after traceRuntimeCommon). TraceRoot forwards moved nursery pointers on minor GC. VERIFIED: jivsr/jivsr2
ok=true total exact on both paths; no regression (full suite still green); octane still neutral
(soundness fix is perf-free). This also hardens Mode V/N callers' future ability to keep object Values
live across calls. (Mode V/N's UNTRACED wasm-locals operand stack is a SEPARATE still-latent hole --
only bites if a Mode V fn dereferences a held object AFTER a call that GC'd; jivsr's run() passes node
by value and doesn't, so it's safe there.)

## DECISIVE PROFILING (2026-06-17): octane OO bottleneck is the per-call BOUNDARY, not per-op work
GECKO_DEBUG_JIT heartbeat on octane richards,deltablue (bench/_t_octdiag.cjs): runs ModeVS=216582,
ModeV=0 in the hot phase; helper-calls only ~3656 TOTAL (helper-kind SetProp 1390 / Eq 1232 / Ne 589 /
Call 292) = ~1.7% of runs. gWJRunsVS is incremented in WasmJitRunCall (WasmJS.cpp:5856) = the
INTERPRETER->wasm entry, so 216582 Mode VS runs == 216582 interpreter->host-wasm BOUNDARY crossings (the
heavy bridge: host wasm->JS shim->C++ wasmhost_call->JS->wasm). THE BOTTLENECK IS THAT BOUNDARY: the hot
OO call chain does NOT stay in wasm -- Mode V/N (restart) drivers can't call Mode VS (no-restart) callees
via call_indirect (WJFillIC refuse-guard; restart would double-mutate + untraced caller frame), so every
hot method invocation re-enters from the interpreter. CONSEQUENCES:
- The doc's Phase 2 (numeric unboxing) will NOT move octane richards/deltablue: numeric per-op work is
  not the hot path (Mode VS hot ops are object SetProp + non-numeric Eq/Ne + the boundary; numeric is
  already handled by Mode N/V which is `runs=0` here). Unboxing helps numeric microbenches only.
- Inlining the SetProp/Eq/Ne/Call helpers gives <2% (helpers are 1.7% of runs).
- THE REAL LEVER (unchanged from STAGE 4/5/7): keep the hot call chain IN WASM (call_indirect between
  JIT'd fns, no interpreter round-trip per call). Blocked by the js::jit::TraceJitFrames "memory access
  out of bounds" during nursery GC when call-heavy fns are recompiled to Mode VS (STAGE 7) -- needs a
  native debugger on gecko's JIT-activation frame tracing. The minor-GC fix above is a prerequisite step
  for any in-wasm-chain work but does not by itself crack the TraceJitFrames crash.

## BENCH INFRA on THIS machine (2026-06-17): no /home/velzie path
playwright is NOT installed and /home/velzie/* does not exist. Use playwright-core (npm i in
embed-xul/bench) + system chromium executablePath:"/usr/bin/chromium". Local runners added:
_t_octc_local.cjs (octane ON/OFF), _t_oct3.cjs (3-way locals/frame/off, REPS env), _t_pl.cjs
(PAGE/MARK/QS/NOJIT single-page), _t_octdiag.cjs (octane + [wasm-jit] heartbeat capture). In THIS source
the JIT is ON by default (GECKO_NOWASMJIT=1 disables); ?env.GECKO_WJVS_FRAME=1 reverts the operand stack
to frame memory. Build (mach deadlocks): make -C obj-full-emscripten/js/src ; .../js/src/build ;
.../toolkit/library ; bash embed-xul/restrip-relink-web.sh. Errors -> /tmp/b1..b4.log.

## TraceJitFrames CRASH -- ROOT-CAUSED + FIXED (2026-06-17); was NOT undebuggable
The STAGE 6/7 "needs a native debugger" crash (recompiling call-heavy fns to Mode VS -> "memory access
out of bounds" in js::jit::TraceJitFrames during nursery GC) was cracked here with printf instrumentation
+ worker-console capture (NO gdb). Method: env gate (GECKO_WJVS_HASCALL) to reproduce; playwright
p.on('worker') captured the full stack (minorGC->Nursery::doCollection->traceRuntimeCommon->
TraceActivations->JitActivation::trace->TraceJitFrames); instrumented TraceJitFrames (env WJDBG_TJF) to
print each frame + a post-trace marker -> OOB is INSIDE TraceJitExitFrame on the TOPMOST Exit frame; all
frames are PBL BaselineJS/BaselineStub, hasWasmExitFP=0.
ROOT CAUSE: PortableBaselineInterpret.cpp CallScriptedFunction IC pushed the callee token + a
MakeFrameDescriptorForJitCall(BaselineStub,argc) onto the PBL stack BEFORE the `#if EMSCRIPTEN
WasmJitRunCall` diversion. On the wasm path no BaselineFrame is built atop that descriptor -> a half-pushed
ORPHAN call frame sits on the PBL stack while the host wasm re-enters gecko (wjhelp->js::Call->nested PBL,
which allocates). A nursery GC mid-re-entry walks the chain, misparses at the orphan descriptor, reads a
bogus Exit-frame footer -> OOB. Deep call-heavy VS-recompile chains hit it; shallow configs rarely do.
FIX (one move): push the callee token + descriptor ONLY on the actual recursion `else` branch (after
WasmJitRunCall returns 0), not before the diversion. sp is scratch below the frame (PREDICT_RETURN returns
retValue; the bytecode Call op owns the real operand stack), so the wasm path not advancing sp is fine.
JitFrames.cpp instrumentation was removed after the fix.

## KEEP-CALL-CHAIN-IN-WASM enabled by default (2026-06-17): DeltaBlue win
With the crash fixed + the minor-GC frame-tracing fix, call-heavy chronically-deopting fns now recompile
to Mode VS by DEFAULT (WJVSHasCallRecompile() default true; GECKO_WJVS_NOHASCALL=1 reverts; gate at
WasmJS.cpp ~5529: `entry.forceVS && vsOK && (!hasCall || WJVSHasCallRecompile())`). So the hot OO call
chain stays in wasm (call_indirect between VS fns) instead of re-entering the interpreter (WasmJitRunCall)
per call. CORRECTNESS+STABILITY verified: jivsr/jivsr2/jistr2/jisetp/jiproto2/jimut/jiarr 19/19,
jilogic 97/97, and octane 4-subset (richards,deltablue,raytrace,navier-stokes) COMPLETES no crash. PERF:
CONFIRMED via TIGHT on/off PAIRS at matched load (bench/_t_ab3.cjs: fresh page per run, on then off
back-to-back, 6 pairs): DeltaBlue on=118/121/117 vs off=87/82/87 -> ~1.35-1.48x, ROCK-STEADY within each
pair. (Cross-run the SAME interpreter-only "off" DeltaBlue swings 82<->135 with machine load, so ONLY
within-pair ratios are trustworthy -- never compare scores across separate runs/builds.) This IS the
octane OO jit-off->jit-on jump the user wanted, for DeltaBlue. Richards stays ~NEUTRAL (49-58 on vs 56-59
off) -- its hot fns differ; NEXT: profile why (still interpreter-entry-bound? more polymorphic? not all
recompiled to VS?). Phase 2 numeric-unboxing remains LOW-value for octane (the bottleneck was the per-call
boundary, now addressed for VS-recompilable call-heavy fns). Bench infra note: a `node ... &` launched
INSIDE a Bash tool call gets ORPHANED and keeps running (hogging CPU + the bench port -> skews/hangs later
runs); always launch long benches via the tool's own run_in_background, and pkill -9 -f _t_ stragglers
before measuring. Use stdbuf -oL ... | stdbuf -oL grep for live incremental bench output. (Beware: `pkill -f _t_ab`
matches `_t_ab3.cjs` too -- killed my own measurement once.)

## NEXT-LEVER ANALYSIS (2026-06-17): unboxing WON'T move deltablue/richards; INLINING will
User wants ~5-10x (1.4x not worth the complexity). Read the actual HOT deltablue fns (the ones recompiled
to Mode VS: deltablue.js:63/75/117/163/554/591): they are TINY method-call/property/array-access shims --
`at(i){return this.elms[i]}`, `add(e){this.elms.push(e)}`, `removeFirst(){this.elms.pop()}`,
`weakestOf(s1,s2){return this.weaker(s1,s2)?s1:s2}`, `Variable.addConstraint(c){this.constraints.add(c)}`,
`incrementalAdd(c){...while(o)o=o.satisfy(mark)}`. ALMOST NO numeric arithmetic. => the doc's Phase 2
(numeric UNBOXING) barely helps deltablue/richards (it helps the NUMERIC subtests raytrace/navier, and
Mode N/V already does 7x on pure numeric). The OO bottleneck is PER-CALL OVERHEAD on 1-2-op bodies:
call_indirect marshals args->gWJScratch, callee prologue inits its frame + copies args back, result via
gWJScratch -- ~15-20 mem ops wrapping a 2-op getter. THE LEVER IS METHOD INLINING (speculative: inline the
IC-observed monomorphic callee, guard the receiver shape, deopt on mismatch) -- turns `coll.at(i)` into an
inline GetProp+GetElem, eliminating the call. Native-method calls (Array.push/pop) can't be JIT-inlined
(C++ natives -> WJH_CALL -> interpreter), so `add`/`removeFirst` stay slow; but `at`/`weakestOf`/`satisfy`
chains (scripted) can. Inlining is the hardest feature (compile-time/IC callee resolution, nested-body
emission with arg/local remapping in the caller's frame, deopt-across-inline) -- a real multi-session build.
Also shipped this session: per-call frame RIGHT-SIZING (frameSize uses script->nslots()-nfixed, not the
fixed kWJVSMaxStack=48; the prologue zero-inits the whole frame every call -> big trim for tiny methods now
that the chain stays in wasm). Verified green (acid suite + jilogic 97/97); jiproto2 144->97ms.
ROADMAP for 5-10x: (1) speculative method inlining [OO subtests], (2) cheaper calling convention / leaner
prologue [all calls], (3) numeric unboxing + typed field loads [numeric subtests], (4) br_table dispatch.
FULL inlining design doc: embed-xul/METHOD_INLINING.md (eligibility, sub-context emission with fbLocal/
sOffset, recompile-after-warmup trigger, GC-safety, fallback, phasing, test plan).
DIAGNOSTIC shipped (WJCallInlinable + heartbeat "call-sites filled=N inlinable(leaf)=M", GECKO_DEBUG_JIT):
octane shows ~142/596 (~24%) of filled call sites are small straight-line LEAVES (no calls/jumps, VS-
supported ops) -> directly inlinable in Phase A; the dynamically-hottest (getters, OrderedCollection.at)
are in this set. WJCallInlinable(cs) is the reusable eligibility predicate for emission. Current build is
GREEN with: Phase1 regalloc + minor-GC fix + crash fix + hasCall-recompile-default + frame-right-size +
this diagnostic. Inline EMISSION: BUILT but BUGGY (gated off via GECKO_WJVS_INLINE, default off -> default build is the
verified non-inline one). Design implemented in WasmJS.cpp WJVSCall: at a recompile (wantInline, triggered
in WasmJitRunCall once a modeVS+hasCall fn hits runs==64; resets runs/helperCalls/deopts so the helper-
dominated disable doesn't fire), if (script,pcOff) has a recorded monomorphic callee (gWJInlineCallee,
populated in WJFillIC, cleared in WJFinalizeCB for GC-safety) that is a small straight-line leaf
(WJCallInlinable), emit its body inline: a sub-context c2 places the callee's locals/rval/operand-stack in
the caller's s[] REGISTER file at an offset (c2.localBaseS=c.stackBaseS+c.depth, c2.depth=c.depth+nfixed+1),
GetArg/FunctionThis (c2.inlined) read the caller's arg/this operand slots in place, locals init'd to
Undefined, Return->caller result slot; guarded by `low32(callee)==baked inlineCalleeLow32` with marshal+
WJH_CALL fallback on miss. STATUS: the 0-local-callee version was CORRECT (jiinline ok=true) but did not
fire (real methods have a `.this` local -> nfixed>=1). The register-resident-locals version (nfixed>0)
INLINES (getter `return this.x_`) but the renderer DIES on the first inlined call -- a wasm TRAP, no
heartbeat/console flush (so an OOB/unreachable, not a hang). NOT yet root-caused. Default build unaffected
(jisetp exact). DEBUG NEXT with the same method that cracked TraceJitFrames: GECKO_WJVS_INLINE=1 +
WJDBG-style printf in the inline emit / a wasm trap stack via p.on('worker'); suspect a slot-mapping or
spill-range index in the locals-in-registers path. Bench: bench/jiinline.html (getter-in-loop, exact sum).
