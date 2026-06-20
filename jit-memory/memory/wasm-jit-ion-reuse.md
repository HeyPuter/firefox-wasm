---
name: wasm-jit-ion-reuse
description: The Ion-tier rewrite — reuse SpiderMonkey's MIR middle-end (OptimizeMIR/GVN/LICM) to hit richards 2x. Smoke-test PROVES OptimizeMIR runs under JS_CODEGEN_NONE.
metadata:
  type: project
---

The path to richards 2x (the JIT's survival bar): replace the baseline-JIT execution
model (template-per-bytecode, boxed, frame-memory, per-op guards — caps at interp
parity) with the ION model — SSA MIR + representation selection + GVN guard-CSE +
LICM guard-hoist + ScalarReplacement + bailout. Proven reachable: a C-port of richards
with flat unboxed structs runs ~100us vs interp 41670us (~320-500x). See
[[wasm-jit-richards-analysis]].

**GATE PASSED (2026-06-19): `OptimizeMIR` runs under `JS_CODEGEN_NONE`.** The whole
reuse plan hinged on whether Ion's MIR optimizer executes in this no-native-backend
build. It does. Smoke test `WJIonSmokeTest()` in WasmJS.cpp (gated `GECKO_WJVS_IONSMOKE`,
fires once from WJCompile): builds a trivial wasm-mode MIR graph (2 int32 consts + MAdd
+ MUnreachable), runs `OptimizeMIR(&mirGen)` → returns 1 (success), graph valid, no
assert/crash. Output: `[ion-smoke] OptimizeMIR returned 1`.

**Reuse boundary (verified by file + coupling, not guessed):**
- REUSE (~80%, the hard part, all compiled-in + ungated + JS-decoupled + already dual-mode
  via `compilingWasm()`): `jit/MIR.h` + `MIRGraph` + `OptimizeMIR` (jit/Ion.h:68) +
  GVN/LICM/ScalarReplacement/AliasAnalysis. `compilingWasm()` = `CompileInfo::script()==nullptr`
  (CompileInfo.h:155) — NOT JitContext-based. `OptimizeMIR` safe with realm=nullptr,
  runtime=nullptr in wasm mode (production wasm path proves it).
- BUILD front-end: JS-bytecode → MIR using IC data already collected (`gWJShapeRec`,
  `gWJInlineCallee`), in compilingWasm mode, shape-guards/field-loads as wasm-level MIR so
  GVN/LICM hoist them, ScalarReplacement flattens non-escaping objects.
- BUILD back-end (novel): MIR → wasm bytes, SSA values as wasm locals (TurboFan does regalloc),
  guard-miss → existing deopt sentinel (skip Ion snapshot/bailout machinery).

**Exact construction recipe** (from wasm/WasmIonCompile.cpp IonCompileFunctions ~11393):
```cpp
using namespace js::jit;
LifoAlloc lifo(TempAllocator::PreferredLifoChunkSize, js::BackgroundMallocArena);
TempAllocator alloc(&lifo);
JitContext jitContext;                    // wasm ctor; do NOT call setIsCompilingWasm (DEBUG-only, absent in NDEBUG)
CompileInfo compileInfo(nlocals);         // (unsigned) ctor => script()==nullptr => compilingWasm()
MIRGraph graph(&alloc);
JitCompileOptions options;
MIRGenerator mirGen(/*realm=*/nullptr, options, &alloc, &graph, &compileInfo,
                    IonOptimizations.get(OptimizationLevel::Wasm), /*wasmCodeMeta=*/nullptr);
MBasicBlock* b = MBasicBlock::New(graph, compileInfo, /*pred=*/nullptr, MBasicBlock::NORMAL);
graph.addBlock(b);  // entryBlock() = first added block
// ... b->add(MConstant::NewInt32(alloc,..)); b->add(MAdd::NewWasm(alloc,l,r,MIRType::Int32));
b->end(MUnreachable::New(alloc));         // simplest 0-operand control terminator
OptimizeMIR(&mirGen);                      // GenerateLIR/CodeGenerator NOT usable (CODEGEN_NONE) — emit wasm ourselves
```
Includes added to WasmJS.cpp: jit/CompileInfo.h, jit/Ion.h, jit/IonOptimizationLevels.h,
jit/MIR.h, jit/MIR-wasm.h, jit/MIRGenerator.h, jit/MIRGraph.h. Constant APIs:
MConstant::NewInt32/NewInt64/NewDouble; MWasmFloatConstant::NewDouble/NewFloat32; arith
MAdd::NewWasm(alloc,l,r,type) etc. block helpers: ->add(ins), ->end(controlIns), ->initSlot.

**BACK-END PROVEN (2026-06-19): MIR -> wasm emits runnable, correct wasm.** Second
gate passed. `WJIonBackendTest()` (gated GECKO_WJVS_IONBE): hand-builds MIR graph
(42.0+42.0 via two congruent MWasmFloatConstants + MAdd + MWasmReturn), runs OptimizeMIR
(GVN folds the consts), emits a complete 77-byte wasm module via `Encoder` (type ()->f64,
func, export "f", code), `wasmhost_compile` -> V8 -> `wasmhost_instantiate(h,nullptr,0)` ->
`wasmhost_call(h,0,nullptr,0)` -> RESULT 84 OK. Both hard risks retired: optimizer runs +
we can emit wasm from optimized MIR.

**Back-end design (in WasmJS.cpp, all working):**
- `WJWasmValType(MIRType)`: Int32->i32, Int64->i64, Double->f64, Float32->f32, Pointer->i32.
- `struct WJIonBackend`: maps MDefinition::id() -> wasm local index. VALUE-PER-LOCAL form:
  every used def gets its own wasm local; each instr computes (operands via local.get) then
  local.set's its local. Trivially correct; V8/TurboFan re-runs regalloc+folding on it.
- `WJIonEmitValue`: dispatch on `ins->op()` (MDefinition::Opcode::Constant/Add/Sub/Mul/
  WasmFloatConstant). Constant: i32.const(writeVarS32)/f64.const(writeFixedF64). Arith picks
  i32.*/f64.* by ins->type().
- `WJIonEmitBody`: pass1 walk rpoBegin..rpoEnd assigning locals (SKIP isControlInstruction +
  isWasmParameter + ty==0); write locals decl (one group per local); pass2 emit each value +
  local.set; terminator from last block's lastIns() — isWasmReturn -> get operand(0)+Op::Return,
  isUnreachable -> Op::Unreachable; close Op::End. SLICE 1 = single block only (no phi/CF yet).
- Reuses existing module infra: `Encoder` (wasm/WasmBinary.h), startSection/finishSection,
  writePatchableVarU32/patchVarU32, wasmhost_compile/instantiate/call.
- IMPORTANT NDEBUG gotcha: MDefinition::opName() is JS_JITSPEW-only; use unsigned(ins->op())
  for debug. WasmParameter op#=568, MIRType::Pointer=21 (Int32=3,Double=6,Float32=7).

**FRONT-END PROVEN (2026-06-19): bytecode -> MIR -> wasm, correct on a real JSScript.**
Third gate passed. `WJIonBuildMIR` + `WJIonFrontendTest(script)` (gated GECKO_WJVS_IONFE=
<lineno>, args via GECKO_WJVS_IONFE_ARGS="10,20"): compiled real fn `poly(a,b){return (a+b)*3
- b*2}` straight from its JSScript bytecode -> MIR -> OptimizeMIR -> wasm (f64,f64)->f64 ->
RESULT 50, matches interpreter. Full pipeline end-to-end on real JS.

**Front-end design (WasmJS.cpp, slice 1 = straight-line single-block numeric):**
- Hand-rolled (WarpBuilder too coupled: WarpSnapshot<-WarpOracle<-JSContext/CacheIR/off-thread).
- ALL values f64 (matches existing Mode N/V model). Tracks: std::vector<MDefinition*> stack
  (JS operand stack), locals[nfixed] (init MWasmFloatConstant 0.0), rval, argParams[nargs].
- Decode loop mirrors WJEmitOp (WasmJS.cpp:2238): `JSOp op=JSOp(*pc); ...; pc+=GetBytecodeLength(pc)`.
  Operand macros GET_ARGNO/GET_LOCALNO/GET_INT8/GET_INT32/GET_UINT16/GET_UINT24.
- Handles: GetArg/GetLocal/SetLocal(tee)/Zero/One/Int8/Int32/Uint16/Uint24/Double/Add/Sub/Mul/
  Pos/ToNumeric/Pop/Dup/SetRval/GetRval/Return/RetRval/Nop-markers. Arith = MAdd/MSub/MMul::NewWasm
  Double. Bails (false) on anything else incl. SetArg, bitops, control flow, property access.
- argParams = MWasmParameter(ABIArg(), Double) per formal arg; mapped to wasm param locals 0..nargs
  by WJIonEmitBody. Instance = MWasmParameter(ABIArg(InstanceReg), Pointer), only for MWasmReturn.
- MMul::Mode is {Normal,Integer} (MIR.h ~3092); MSub::NewWasm(a,l,r,type,preserveNaN);
  MMul::NewWasm(a,l,r,type,mode,preserveNaN); MDiv is MDiv::New(...trap args) - SKIPPED slice 1.

**CONTROL FLOW PROVEN (2026-06-19): if/else + while loops compile correctly.** Fourth gate.
Real fns through full pipeline: `mx(a,b){if(a>b)return a;return b}` -> 20/30 correct;
`sumto(n){s=0;i=0;while(i<n)s+=i,i++;return s}` -> sumto(10)=45, sumto(100)=4950. OptimizeMIR
even expanded the loop 4->14 blocks (peeling/edge-split) and the back-end handled it.

**CF front-end design (WJIonBuildMIR, slot-based):**
- CompileInfo(nargs+nfixed+1): slots = args(0..nargs-1), locals(nargs..), rval(last). GOTCHA:
  CompileInfo(unsigned) hardcodes nstack_=1, so the JS operand stack CANNOT live in block slots
  (overflow -> slots_ corruption -> crash). Keep operand stack in a SEPARATE std::vector<MDef*>
  (`stk`); it's empty at every block boundary (statement-level reducible CF) so never needs phis.
  Block slots hold ONLY args/locals/rval (which DO need phis at joins/loops). stk.clear() at each
  block transition. push/pop/Dup/SetLocal(tee, setSlot+leave on stk)/SetRval(setSlot+pop).
- WarpBuilder pending-edge algo: JumpTarget resolves pending edges into a join (first edge ->
  MBasicBlock::New(pred=edge.block); rest -> join->addPredecessor; then initSuccessor). Loops:
  LoopHead -> MBasicBlock::New(pred, PENDING_LOOP_HEADER) (auto-creates phis for all slots);
  backedge (branch whose target is a loophead offset <= cur offset) -> initSuccessor(idx,header)
  + header->setBackedgeWasm(cur, /*paramCount=*/0). GOTCHA: setLoopDepth(loopDepth) on EVERY
  block created inside a loop (body/join too, not just header) or OptimizeMIR MOZ_CRASHes
  (-> wasm `unreachable`) in loop analysis. loopDepth++ at LoopHead, -- at backedge Goto.
- Branches: JumpIfFalse true->fall/false->tgt; JumpIfTrue true->tgt/false->fall. MTest +
  MCompare::NewWasm(Compare_Double, result Int32). cmp ops Lt/Le/Gt/Ge/Eq/Ne/StrictEq/StrictNe.

**CF back-end design (WJIonEmitBody, dispatch loop):** n>1 blocks lowered to one wasm dispatch
loop. RPO-index each block; $bid i32 = LAST local. Structure: `loop $L { block $b0 {...{ block
$b_{n-1} { local.get $bid; br_table [n-1,n-2,...,0] default 0 } end; <body B_{n-1}> } end;
<body B_{n-2}> } ... } <body B0> ; unreachable } end-loop; unreachable; end-func`. Bodies in
REVERSE rpo order (after each block's `end`). From body B_i: $L at depth i (loopDepthHere=n-1-ri,
ri=n-1-i); inside an if/else +1. br_table entry i -> depth (n-1-i). Phi destruction: per edge
B->S, k=S.getPredecessorIndex(B), copy phi->getOperand(k) into phi's local (sequential, no swap
hazard assumed). Terminators: WasmReturn->local.get+Return; Goto->edge copies+set bid+br $L;
Test->local.get cond; if{copies+bid+br}else{copies+bid+br}; end; unreachable. GOTCHA: needs a
trailing `unreachable` AFTER end-loop (function fallthru wants f64 even though loop never exits).
n==1 fast path: straight-line, no loop. Phis get locals assigned FIRST (before value instrs)
so edge copies can target them.

**OBJECT MEMORY LAYOUT (for the property-access phase, from WJEmitGetPropV ~2687):**
- Value is NaN-boxed i64: high32 = tag (kWJTagObject=0xFFFFFF8C), low32 = JSObject* (i32, wasm32).
  Unbox object = low 32 bits (i32.wrap_i64). Box object = i64.or(i64(ptr), i64(tag)<<32).
- NativeObject layout (byte offsets into guest linear memory): +0 shape(i32 ptr), +8 slots_(i32
  ptr to dynamic slots), +12 elements_(i32 ptr). Fixed slots inline; IC `off` = absolute byte
  offset from obj base.
- GetProp: unbox recv -> objptr; guard i32.load[objptr+0]==recordedShape else DEOPT; load value:
  if (off & kWJDynSlot=0x80000000) dynamic: i64.load[ i32.load[objptr+8] + (off&~kWJDynSlot) ]
  else fixed: i64.load[objptr+off]. Result is a boxed i64 Value (unbox to f64 for numeric fields).
- gWJShapeRec[(script,pcOff via WJInlineKey)] = {uint32 shape, uint32 off} is ALREADY recorded by
  WJFillIC for monomorphic GetProp/SetProp sites (kWJDynSlot bit in off marks dynamic).
- The Ion module must IMPORT the guest memory ("m"."mem", memId from wasmhost_guest_mem_objid())
  like WJBuildModule does; loads use MWasmLoad/wasm memory ops. Needs boxed-i64 + ptr-i32 reprs
  in MIR alongside f64 (representation selection) + a deopt block (guard miss -> return sentinel
  1.0, re-run in PBL interp, same model as existing Mode VS). Receiver passed as boxed i64 arg.

**PROPERTY ACCESS PROVEN (2026-06-19): shape-guarded field loads + GVN dedup + LICM hoist.**
Fifth gate. `gWJSampleRecv[(script,pcOff)]` (added next to gWJShapeRec at WJFillIC) captures a
live receiver objptr so the self-contained test can pass a real object. Test fns in
embed-js/t_iongp.js; fired via TARGET/trigger split: GECKO_WJVS_IONFE_TARGET=<fn lineno> captures
that script when it compiles, GECKO_WJVS_IONFE=<trigger lineno> fires the test AFTER warm-up has
filled the IC (the IC is runtime-filled, so firing on the target's own compile sees an empty
record -- must fire from a later-compiled trigger fn). Receiver passed as an i32 wasm param
(V8 coerces the double arg back to i32 = the ptr; declare param i32 in the type section, no NaN
risk). Module now IMPORTS guest memory "m"."mem" (memId from wasmhost_guest_mem_objid(), passed
to wasmhost_instantiate). Results: fadd `o.x+o.y`=7.75, gvn3 `o.x+o.x+o.x`=10.5, loopget loop=350,
all correct.
- GetProp MIR (WJIonBuildMIR): recv(i32) -> shape word MWasmLoad(base=recv,Int32,off0) ->
  MCompare(Compare_Int32,Eq vs recorded shape) -> MTest diamond (cont=fast / deopt=MWasmReturn
  sentinel 1.0). Field: addr=recv+off folded into the ADDRESS (MAdd Int32, access offset 0 always)
  so distinct fields never alias-merge; MWasmLoad(Float64)->f64 (plain-double slots only; fixed
  slots only, dyn-slot/non-own bail). Restricted to own monomorphic fixed double slots.
- BACK-END additions (WJIonEmitValue): MWasmLoad -> base operand + iN.load (align=log2(byteAlign),
  offset=access.offset64(); Int32/Uint32->I32Load, Float64->F64Load, Int64->I64Load); MCompare
  Compare_Int32/UInt32 -> I32 (Eq/Ne/LtS/.. / U variants). Arg repr: object args (used as
  GetArg;GetProp receiver) declared MIRType::Int32, numeric args Double; type section emits per-arg
  valtype via WJWasmValType.
- LICM HOIST (THE win): MWasmLoad is created Guard-but-NOT-Movable, so LICM (keys on isMovable()+
  AliasAnalysis dependency) won't hoist it. FIX: `l->setMovableUnchecked()` on every MWasmLoad.
  Then LICM hoists loop-invariant shape-guard load + field load to the preheader (loopget: inLoop
  2->0, loop body becomes pure adds). SAFE: AliasAnalysis sets a dependency on any aliasing WasmHeap
  store in the loop, which blocks the hoist (conservatively correct; a mutated field won't hoist).
  Wasm opt level (initWasmOptimizationInfo) has gvn_/licm_/scalarReplacement_ = true (inherited
  from Normal); only eliminateRedundantShapeGuards_/Checks_ are off -- irrelevant since we don't
  use JS MGuardShape.
- GVN DEDUP: Ion's GVN CANNOT CSE MWasmLoad (it has no congruentTo override -> default returns
  false; do NOT add one -- it's the production wasm node). Instead front-end CSE in WJIonBuildMIR:
  `guardedShape` (recv* -> guarded shape, skip redundant guard) + `fieldCache` ((recv*,off)->value,
  reuse load), both invalidated via invalidateCSE() at joins/loop headers (dominance breaks) and
  MUST be invalidated on SetProp/heap mutation. Collapses gvn3 6 loads/3 guards -> 2/1, fadd to a
  single shape guard shared across o.x+o.y.

**SETPROP + ALIAS-SAFETY PROVEN (2026-06-19): field stores + LICM correctly blocked by mutation.**
Sixth gate. WJIonEmitStore (base+value -> iN.store; effectful, NO result local -> body emitter
calls it directly, not the value+local.set path; wired into BOTH n==1 and dispatch-loop emit
loops). Front-end SetProp/StrictSetProp: stack [recv,val]->[val]; ensureGuard(recv) (shared shape
guard lambda, reused by GetProp); storeAt f64 directly (raw bits = NaN-boxed double); then
fieldCache.clear()+re-cache (recv,foff,val) (guardedShape kept -- a slot write doesn't reshape).
Results: setget2 `p.x=v+1;return p.x`=6 (read CSE'd to stored val -> 0 field loads, 1 store);
mutloop `while(i<n)p.x=p.x+1` -> load inLoop=6 (NOT hoisted). The mutloop non-hoist is the SAFETY
proof: AliasAnalysis gives the load a dependency on the in-loop store, so LICM leaves it -- exactly
why setMovableUnchecked() is sound. Read-only loopget hoists; mutating mutloop doesn't.

**KEY LIMITATION (honest, blocks the richards LICM win): MWasmLoad/MWasmStore use the single
generic AliasSet::WasmHeap, so ANY heap store in a loop blocks hoisting of EVERY heap load in that
loop (conservative). Richards loops mutate (packet/tcb fields), so property-load LICM gives little
on richards as-is. Real Ion refines per-field alias sets; we'd need a per-(shape,slot) alias tag on
our loads/stores to let an invariant load hoist past an unrelated-field store. FUTURE LEVER.**

**SCALAR REPLACEMENT IS NOT VIABLE VIA ION REUSE (2026-06-19, verified by reading
ScalarReplacement.cpp): the pass recognizes ONLY JS-tier nodes -- MNewObject/MNewPlainObject/
MNewCallObject/MNewIterator allocations + MStoreFixedSlot/MLoadFixedSlot/MSlots/MGuardShape/MUnbox/
MPostWriteBarrier. Our wasm pipeline emits MWasmLoad/MWasmStore, which ScalarReplacement ignores
entirely. Emitting the JS nodes instead is a dead end: MNewObject needs a templateObject (JS/GC
coupled) and if the object escapes, codegen must do a real allocation -- impossible under
CODEGEN_NONE. AND richards Packets ESCAPE (queued/passed between tasks), so scalar replacement
wouldn't flatten them even in real Ion. Conclusion: "scalar replacement flattens Packets" is NOT
achievable through the Ion-reuse plan. Similarly Ion's AUTO-INLINING (inlineInterpreted) is gated
off in wasm mode (OptimizeMIR prune/apply-types are !compilingWasm). So of Ion's marquee passes,
only GVN + LICM actually run for us; the two that would most help richards (scalar-repl, auto-
inline) do not. The Ion reuse therefore most helps property/arith-DENSE code, not dispatch/alloc-
bound richards.**

**FRONT-END INLINING STARTED + PROVEN for leaf calls (2026-06-19).** Seventh gate. WJIonBuildMIR
now inlines monomorphic straight-line numeric LEAF calls directly into the caller's MIRGraph.
Callee resolved from gWJInlineCallee[(script, callPcOff)] (populated unconditionally at the call-IC
fill, line ~8492; fns[0]=low32 JSFunction* -> reinterpret_cast on wasm32 -> baseScript). Bytecode
for a free call: GetGName(callee) Undefined(this) GetArg(args) Call argc. Handling: GetGName/GetName/
Undefined push a const-0 PLACEHOLDER (popped+discarded at Call; only sound because inlinable leaf
bodies never use a global/this numerically). Call/CallContent/CallIgnoresRv: argc=GET_ARGC; pop argc
args + this + callee; inlineLeaf(calleeScript, args) evaluates the callee body as SSA over the actual
arg defs (own cstk/clocals/crval; ops GetArg/GetLocal/SetLocal/consts/Add/Sub/Mul/Pos/Pop/Dup/Set+
GetRval/Return/RetRval; returns nullptr=bail on any control flow / nested call / property access /
cmp). Result def pushed; NO wasm call_indirect, NO call boundary. PROVEN: caller(5)=add1(5)+add1(5)
=12 -> compiled to 1 block, and GVN CSE'd the two identical inlined (a+1) bodies (add=2 not 3) --
cross-call optimization that inlining unlocks. t_ioninl.js (TARGET=4 trigger=5).
- RECURSIVE (2026-06-19): inlineLeaf -> inlineLeafRec (std::function, depth<=4); nested calls inside
  an inlined body recurse, so a whole straight-line chain collapses into one MIRGraph. PROVEN:
  caller(5)=add1(5)+add1(5), add1=add0(x)+1, add0=x+10 -> (5+10+1)*2=32 in ONE block (GVN CSE'd the
  two add1 bodies, add=3); chain(5)=add1(add0(5))=26 (nested-arg). t_ioninl.js TARGET=4/5 trigger=6.
- METHOD-CALL INLINING + INT32 FIELDS (2026-06-19, ninth gate): method-call idiom `GetArg recv;
  Dup; GetProp method; Swap; Call` now inlines. Main builder + inlineLeafRec: Swap swaps top two;
  GetProp uses shared getPropField(frameScript, recv, pcOff) -> field value, or if it returns null
  AND next op is Swap it's a method load -> re-push recv as the callee placeholder; Call resolves the
  callee via resolveCallee and passes the popped `this` (= receiver for methods) as thisDef to
  inlineLeafRec; FunctionThis/GlobalThis push thisDef. objArgMask detection extended for the
  `GetArg;Dup;GetProp` receiver idiom. PROVEN: caller(t)=t.v+t.bump()+t.bump()=17 (bump=this.v+1),
  with ONE shape guard + ONE field load CSE'd across the direct read and both inlined method bodies.
  t_ionmeth.js (TARGET=4 trigger=5; caller has a direct t.v so gWJSampleRecv captures the receiver).
- INT32 FIELD REPR (the gap method-test exposed): integer-valued JS fields (e.g. v:5.0) are stored
  as INT32-boxed Values, not double bits -> a raw f64 load reads NaN. FIX: WJShapeRec gained vty
  (0=double,1=int32,2=other), recorded at WJFillIC via nobj.getSlot(slot).isInt32()/isDouble().
  getPropField: vty==1 -> load i32 payload (low word at foff) + MToDouble (pure, AliasSet::None,
  congruentIfOperandsEqual -> GVN/LICM-able; setMovableUnchecked) -> f64; vty==0 -> f64 load;
  vty==2 -> bail. Back-end MToDouble case -> F64ConvertI32S (Int32 in) / nop (Double in). SOUNDNESS
  GAP (documented): type-speculative, NO value-type guard yet -> wrong (not crash) if a field's type
  changes; richards field types are stable. SetProp still stores f64 bits (int-typed store unhandled).
  FUTURE: tag guard + deopt; int-aware SetProp. No regression (t_jit 729016, all prior gates pass).
- CALLEE CONTROL-FLOW INLINING (2026-06-19, tenth gate -- DONE): the recursive-frame refactor.
  WJIonBuildMIR's main loop + inlineLeafRec were UNIFIED into one recursive `buildFrame(WJFrameDesc&,
  inArgs&)` std::function. Top-level call is just a non-inline frame. Each inline callee (incl. ones
  with if/else AND loops) recurses into buildFrame and builds real blocks/phis into the SAME MIRGraph.
  KEY MECHANICS: (1) CompileInfo sized nargs+nfixed+1 + WJCountInlineSlots(script,1) (recursive upper
  bound over the inline call graph, depth<=kWJInlineMaxDepth=6); inline frames get a sequential slot
  range [slotBase, slotBase+nargs+nfixed+1) allocated via nextSlotBase (overflow-guarded vs
  info.nlocals()). (2) The ENTRY block now initSlots ALL info.nlocals() slots to 0.0 (not just the top
  frame's), so blocks created before an inline frame is entered have non-null slots to copy/phi. (3)
  pending/loopHeader/loopHeadOff keyed by NAMESPACED offset (frame.offBase + local pcOff); each inline
  frame gets a unique offBase via nextOffBase += scriptlen+1, so callee blocks never collide with the
  caller's. (4) Each inline frame runs on its OWN operand stack (curStk pointer swapped on entry,
  restored on exit) -- the callee's stack is independent of the caller's [acc]. gWJShapeRec/
  gWJInlineCallee lookups use the FRAME's script + LOCAL pcOff (loff), CF math uses namespaced off. (5)
  RETURN ROUTING: top frame Return -> MWasmReturn; inline frame Return -> setSlot(rvalSlotIdx, val) +
  Goto recorded in retEdges; RetRval inline -> rval slot already set, just Goto. After the body, a
  continuation block joins all retEdges (+ fallthrough cur); cur=cont; caller does
  push(getSlot(rvalSlotIdx)) -> a phi over the return edges. (6) CSE: continuation invalidates only
  when nEdges>1 (a real branch join); a single straight-line return PRESERVES the linear CSE state, so
  the method gate still gets ONE guard + ONE load across both bump() calls. resolveCallee extracted to
  free fn WJResolveInlineCallee (shared with the slot counter). PROVEN t_ioncf.js (TARGET=16 trigger=17
  ARGS="3,5"): caller(a,b)=mx(a,b)+clamp(a)+sumto(b), where mx has if/else (2 returns), clamp has 3
  returns, sumto has a WHILE LOOP -> caller(3,5)=18 correct through the full Ion pipeline (13 MIR
  blocks). NO REGRESSION: t_jit 729016, all 9 prior gates pass (fadd 7.75, gvn3 10.5, loopget 350
  inLoop=0, setget2 6, caller(5) 32, chain(5) 26, caller(t) 17). inlineLeafRec deleted.
- POLYMORPHIC METHOD DISPATCH (2026-06-19, eleventh gate -- DONE): a megamorphic method call t.run()
  where t is one of N task types, each with a different prototype run method, now inlines all N bodies
  behind receiver-shape guards. RECORDING (WJFillIC): at a proto-method GetProp (holderVal!=0), capture
  the method JSFunction (hobj.getSlot(hp->slot()) if isObject+JSFunction) and store per-way
  (recvShape -> methodFnLow) in gWJMethodPoly[(script,getpropPcOff)] (struct: shapes[4]/fns[4]/n);
  also capture gWJSampleRecv there (method sites have no own-field record, so the FE harness had no
  sample receiver before). Cleared with gWJInlineCallee (raw addrs, GC). FE BUILDER: a method-load
  GetProp records methodOffOf[recvDef]=loff (keyed by the re-pushed receiver placeholder def, robust to
  nested method calls on DIFFERENT receivers); at the Call, calleeDef is popped and looked up in
  methodOffOf -> gWJMethodPoly. If a record exists (n>=1), emitMethodDispatch: load recv shape once,
  then for each way emit `shape==shape_w ? inline body_w : next`, body_w = buildFrame(thisDef=recv)
  whose result is copied to a shared DISPATCH SLOT and Goto'd to a continuation join; final else ->
  MWasmReturn sentinel (deopt). The continuation reads the dispatch slot (phi over ways). Each way is a
  separate dominator region (invalidateCSE per way + at the join). Slot accounting: WJCountInlineSlots
  now sums over ALL gWJInlineCallee ways (not just way 0) + 1 dispatch slot per call site; dispatch
  slot allocated from nextSlotBase before the way frames. SOUNDNESS: even monomorphic method calls now
  go through the guarded dispatch (n==1: one shape guard + deopt else), which is REQUIRED for real
  integration (the old direct inline assumed fn[0] unconditionally -> wrong if recv type changes).
  PROVEN t_ionpoly.js (TARGET=12 trigger=13): caller(t)=t.x+t.run() warmed with A/B/C (run = x+1 /
  x*2 / x-3); 3-way dispatch, 19 MIR blocks, caller(A(5))=11 correct (picks A's branch, not B=15/C=7).
  NO REGRESSION: t_jit 729016, all prior gates pass (incl. method caller(t)=17 now through n==1
  dispatch, loopget LICM inLoop=0). NOTE: dispatch shape-guards are not yet CSE'd across repeated
  calls on the same receiver (method gate now emits one guard per bump() call vs one shared before);
  correctness intact, a future refinement.
- OBJECT-REFERENCE VALUE MODEL + LINKED-LIST TRAVERSAL (2026-06-19, twelfth gate -- DONE): the FE
  value model was numeric-only (f64 + int32 fields + i32 object args); it bailed on any object-typed
  field (vty 2). Now object-or-null reference fields are supported. RECORDING: WJFillIC vty gains
  value 3 = object-or-null ref field (fv.isObject()||fv.isNull()). FE getPropField vty==3: load the
  boxed Value as i64 then MWrapInt64ToInt32(bottomHalf=true) -> low32 = object pointer (or 0 for null,
  whose payload is 0); pure + GVN-able. So an object reference is carried as an i32 pointer (null==0),
  matching how object ARGS are already typed. NEW OPS: JSOp::Null -> konstI32(0); cmp() is now
  type-aware (both operands Int32 -> Compare_Int32, else Compare_Double) so a pointer/null check is an
  i32 compare; JSOp::StrictConstantEq/Ne (the fused `x===null`/`x!==null`) -> for Null/Undefined operand
  compares the i32 pointer against 0 (Int32 operand -> numeric/i32 compare; Boolean -> bail). Backend:
  MWrapInt64ToInt32 -> Op::I32WrapI64. objArgMask detection extended: a local used as a GetProp
  receiver is an "object local", and an arg copied into one (GetArg k; SetLocal m) is marked object --
  catches the `var c = head; while(c!==null){...c.next}` cursor pattern (the arg isn't a direct
  receiver). PHI TYPING: object-pointer locals reassigned in a loop (c = c.next) keep a consistent i32
  phi because the local is set (c = head, i32) in the preheader BEFORE the LoopHead, so the entry-init
  f64 0.0 never reaches the loop-header phi. PROVEN t_ionlist.js (TARGET=6 trigger=12): Node{v,next}
  linked list, sumlist(head) walks `while(c!==null){s+=c.v; c=c.next}` -> 15 correct (6 MIR blocks; 3
  loads + 2 compares in-loop, correctly NOT hoisted since each node differs). This is richards'
  queue/scheduler/packet traversal shape: object-ref fields + null checks + pointer cursor across a
  loop now BUILD + OPTIMIZE + RUN correctly through Ion. NO REGRESSION (all 11 prior gates pass).
- DYNAMIC-SLOT FIELDS (2026-06-19, thirteenth gate -- DONE): getPropField only handled fixed slots
  (it bailed on the kWJDynSlot bit), so objects with more properties than fit in fixed slots (e.g.
  richards' Scheduler, 6 fields) couldn't be read. Added a fieldBase(recv, off) helper: fixed slot ->
  recv+off; dynamic slot (off & kWJDynSlot) -> loads slots_ (= *(recv+8), i32) then offset
  (off & ~kWJDynSlot). getPropField routes all three vty load paths through it. CRITICAL FIX: the vty
  detection at WJFillIC previously ran ONLY for fixed slots (`if (!(offVal & kWJDynSlot))`), so dynamic
  fields kept vty=2 (=bail) -> getPropField rejected them even after fieldBase. Now vty is computed for
  both: slot index = (off&~kWJDynSlot)/8 + numFixedSlots() for dynamic, (off-16)/8 for fixed.
  PROVEN t_iondyn.js (TARGET=10): Wide{24 fields}, getwide(o)=o.t+o.x (both dynamic) -> 44 correct.
  NO REGRESSION (all 12 prior gates pass). NOTE: SetProp still bails on dynamic slots + only stores
  f64-double values (object/int stores need value-boxing -> next).
- RICHARDS PROBE (2026-06-19): ran WJIonFrontendTest on the REAL octane richards `Scheduler.prototype.
  schedule` (firefox/js/src/octane/richards.js:188) via embed-js (base.js + richards.js +
  octane-driver.js, GECKO_WJVS_IONFE_TARGET=188). It compiles (nargs=0 nfixed=1) and bails at
  GetProp@14 = `this.list`. Two real blockers identified for schedule specifically: (1) `this` as the
  receiver of a method compiled STANDALONE: top frame has thisDef=nullptr so FunctionThis pushes a 0.0
  placeholder; `this.list` then has no valid receiver, AND its IC may not record gWJShapeRec the same
  way a plain arg-receiver field does (needs investigation: confirm whether (schedule,14) gets a
  gWJShapeRec entry at all -- if not, the `this`-field site isn't being recorded). FIX DIRECTION: treat
  `this` as an implicit object arg (extra i32 param = receiver), set top-frame thisDef to it, pass a
  sample `this` (Scheduler) captured at a this-field GetProp. (2) schedule also needs (downstream of
  14): object/int SetProp boxing (`this.currentTcb = ...`, `this.currentId = id`), loose `!= null`
  (vs the strict StrictConstantNe already handled), method calls returning objects (run() -> TCB), and
  array element access (`this.blocks[id]`). These are the remaining COVERAGE items for the scheduler.
- THIS-RECEIVER FOR STANDALONE METHODS (2026-06-19, fourteenth gate -- DONE): a method compiled as
  the FE target (e.g. Foo.prototype.get reading this.a/this.b) had no receiver -- top frame thisDef
  was nullptr so FunctionThis pushed a 0.0 placeholder. Now: WJIonFrontendTest scans for FunctionThis/
  GlobalThis; if present, `this` is passed as an EXTRA trailing object param (i32 pointer, NOT a
  CompileInfo slot -- it's referenced via the thisDef operand). New WJIonBuildMIR arg topThisDef sets
  top.thisDef. paramList = [normal args..., thisParam]; the type section + WJIonEmitBody use paramList/
  paramCount (the backend binds params to locals 0..paramCount-1 in order); the call passes the sample
  receiver (gWJSampleRecv at firstGetPropOff) as the trailing `this` arg. PROVEN t_ionthis.js
  (TARGET=5): Pt.prototype.get()=this.a+this.b -> 7.75 (nargs=0, this as param). No regression (14
  gates green).
- RICHARDS GAP ANALYSIS REFINED (2026-06-19): re-probed real richards methods. KEY STRUCTURAL FINDING:
  the Ion FE depends on gWJShapeRec/gWJInlineCallee/gWJMethodPoly data populated by the EXISTING JIT's
  IC fills (WJFillIC). `Scheduler.prototype.schedule` (line188) bails at the FIRST GetProp (this.list)
  because schedule is NOT compiled by the existing JIT (complex: while loop + poly calls), so it has NO
  IC records at all. By contrast `Scheduler.prototype.holdCurrent` (line220, simpler) IS compiled, so
  its this.holdCount field DID record -> the FE got past the field access and bailed at the next op
  `Inc` (this.holdCount++). gWJShapeRec is NOT GC-cleared (only gWJInlineCallee/gWJMethodPoly are), so
  this isn't staleness -- it's that complex hot fns never get IC sites. IMPLICATION: to cover richards'
  HOTTEST fns (schedule, task.run) the FE needs IC data for fns the existing JIT can't compile -- either
  (a) a lightweight IC-recording pass that runs regardless of whether the existing JIT compiles the fn,
  or (b) record shapes/fields directly from the interpreter's ICs (CacheIR) rather than the WJ JIT's.
  Remaining FE op/value coverage for the scheduler chain: Inc/Dec (counters), SetProp value-boxing
  (object: ptr->i64 obj-Value; int: f64->trunc i32->i64 int-Value -- needed because reloading an int
  field expects an int32-box, so storing f64 bits corrupts it), loose != null, array element access
  (this.blocks[id]), method calls returning objects.
- CACHEIR ORACLE / IC-RECORDING DECOUPLING (2026-06-19, fifteenth gate -- BUILT, one sub-gap left):
  the FE depended on the WJ JIT's runtime IC fills (gWJShapeRec etc.), which only happen for fns the
  WJ JIT compiles -- so richards' hottest fns (schedule, never wj-compiled) had NO data. Built
  WJReadBaselineICs(script): reads the script's Baseline CacheIR ICs directly (the same source real
  Ion's WarpOracle uses) and populates gWJShapeRec/gWJInlineCallee -- decoupled from the WJ JIT (every
  fn runs in the Baseline interp, which fills CacheIR). WJReadICsRecursive walks the inline call graph
  (depth<=kWJInlineMaxDepth) reading each callee too; called at the top of WJIonFrontendTest. MECHANICS:
  jitScript->icEntryFromPCOffset(pcOff) (guarded by re-checking fallbackStub pcOffset, since NDEBUG
  drops the internal assert); iterate the stub chain (each ICCacheIRStub = one observed way); for each,
  CacheIRReader over stubInfo->code()..code()+codeLength(); decode GuardShape (shape = getStubRawWord at
  the WeakShapeField stubOffset), LoadFixedSlotResult / LoadDynamicSlotResult / StoreFixedSlot /
  StoreDynamicSlot (offset = getStubRawInt32; dynamic ORs kWJDynSlot), GuardSpecificFunction (callee =
  getStubRawWord) -> WJRecordInlineCallee; skip other ops via CacheIROpInfos[op].argLength. Headers:
  jit/{BaselineIC,CacheIR,CacheIRReader,CacheIRCompiler}.h. PROVEN WORKING: for richards schedule,
  reads this.list = {shape 0xf24568, fixed slot 3 (off 0x28)} and this.currentTcb store {off 0x30}
  CORRECTLY -- the shape/offset/callee extraction is done + decoupled. No regression (all 14 gates pass).
  THE REMAINING SUB-GAP (vty): CacheIR carries shape+offset but NOT the field's value type, and
  ICCacheIRStub::typeData() is UNPOPULATED in this portable-baseline build (always rawtype 0x20 =
  UNKNOWN). The FE needs vty (0 double / 1 int32 / 3 object) to pick the unboxing. Added gWJFieldVty
  [(shape<<32)|off -> vty], populated by any wj-compiled fn's runtime IC fill and read by the oracle --
  BUT for richards NO wj-compiled fn touches a Scheduler, so its fields' vty is never observed -> the
  oracle records the field with vty=2 (bail) and schedule still bails at this.list. ROOT CAUSE: vty
  requires a LIVE object of that shape (to read the boxed slot's tag), which neither CacheIR nor a
  shape provides (NaN-boxing makes value type dynamic, not in the Shape). Two clean fixes, both
  substantial: (A) a BOXED VALUE MODEL -- load fields as i64 boxed Values and unbox lazily by runtime
  tag, needing no static vty (the proper general solution, ~the boxed-oo rewrite); (B) sample a live
  object per shape during warmup (rooted) and read slot tags at oracle time. The shape/offset/callee
  decoupling (the hard part of reading CacheIR) is DONE and correct; vty is the isolated next problem.
- BOXED VALUE MODEL + ORACLE METHOD-POLY (2026-06-19, sixteenth gate -- BUILT; richards schedule now
  inlines deep). Solves the vty problem generally: object/unknown-typed fields (vty2) are carried as
  the raw i64 NaN-boxed Value and UNBOXED LAZILY at use, so the FE needs no static value type for them.
  Helpers in buildFrame: asNumber(d)->f64 (Double passthrough; Int32->ToDouble; boxed i64 -> vty0
  reinterpret / vty1 wrap+ToDouble / unknown = runtime tag-dispatch SELECT: isInt=(d==int32box(low32))
  ? ToDouble(low32) : reinterpret_f64(d)); asObjPtr(d)->i32 (boxed->WrapInt64ToInt32 low32, memoized
  per def for CSE); asInt32(d)->i32 (boxed->low32, float-const folds, f64->I32TruncF64S) for JS
  bitwise; boxForStore(d)->i64 (boxed as-is / f64->reinterpret / i32 ptr->obj-tag). CRUCIAL: the
  helpers are IDENTITY on Double/Int32, so wiring them into binF64/cmp/SetProp/Return/null-compare/
  receivers is a NO-OP for the 14 existing typed gates -- only the new vty2 boxed path triggers real
  unboxing. getPropField: vty2 -> load i64 boxed (boxedVty[def]=2); receiver asObjPtr'd (so chained
  field access on boxed receivers works); vty0/1/3 paths UNCHANGED. SetProp: now supports dynamic
  slots + boxes the value (boxForStore) + stores i64 (correct for int/object, not just double). cmp:
  Eq/Ne on two object refs -> i32 pointer compare; else numeric. New ops: BitAnd/BitOr/BitXor (i32
  via asInt32 + MWasmBinaryBitwise), Null->i32 0, StrictConstantEq/Ne null -> asObjPtr==0. Backend
  gained: i64 Constant, ReinterpretCast (F64ReinterpretI64/I64ReinterpretF64), ExtendInt32ToInt64,
  WasmBinaryBitwise (i32/i64 And/Or/Xor), WasmSelect (Op::SelectNumeric), TruncateToInt32
  (I32TruncF64S), i64 Compare. ORACLE METHOD-POLY: WJReadBaselineICs now ALSO reads proto-method
  GetProp loads (GuardShape recv; LoadObject holder; GuardShape holder; LoadDynamicSlotResult) --
  detected by loadObjId != recvObjId -- and records gWJMethodPoly[(script,getpropOff)] = (recvShape ->
  methodFn) by reading the function from holder->getSlot(slot). (The Call IC is fallback-only in PBL,
  so the callee comes from the method-load IC, not the call.) Own-field loads (loadObjId==recvObjId)
  still go to gWJShapeRec; this split also FIXED a regression where the oracle had mis-recorded method
  loads as fields (guarding recv against the holder shape -> deopt). WJReadICsRecursive + WJCountInline
  Slots both now also follow gWJMethodPoly (GetProp) targets, not just gWJInlineCallee (Call).
  RESULT ON REAL RICHARDS: Scheduler.prototype.schedule (richards.js:188), which the WJ JIT never
  compiles, now builds through `this.list`/`this.currentTcb` (boxed dynamic-slot fields), the
  megamorphic `this.currentTcb.run()` / `isHeldOrSuspended()` POLYMORPHIC DISPATCH (shapes+fns from the
  oracle), and into the inlined method bodies -- bailing only at JSOp::Or (`||`). NO REGRESSION (all 14
  gates pass).
- LOGICAL OPERATORS ||/&& (2026-06-19, seventeenth gate -- DONE): JSOp::Or/And keep the LHS value
  across a branch (short-circuit), violating the "operand stack empty at block boundaries" invariant.
  Handled by spilling the value to a per-op slot (allocated from nextSlotBase, counted in
  WJCountInlineSlots) at the branch: pop v; setSlot(L,v); MTest(truthy v) -> keep-edge (Or: true / And:
  false) is a pending edge to the target, other edge falls through to a new block to evaluate the RHS;
  logicalJoinSlot[tgt]=L. At the target JumpTarget, the fall-through (RHS) path does setSlot(L, pop())
  before the join is built, so the slot phi-merges {LHS-on-keep-edge, RHS-on-fall-edge}; after the
  join, push getSlot(L). Truthiness uses the i32 value directly (richards logical operands are i32
  booleans from compares). No regression (all 14 gates pass incl. the CF gates that share JumpTarget).
  RICHARDS schedule now inlines THROUGH isHeldOrSuspended's full body (bitwise + ||) and into a run()
  method body -- bails at JSOp::GetElem (array element read, e.g. packet/blocks arrays in a task run).
- OP COVERAGE GRIND (2026-06-19): added, one reprobe at a time, the ops richards' inlined hot path
  hits: BitAnd/BitOr/BitXor (i32 via asInt32 + MWasmBinaryBitwise), Lsh/Rsh/Ursh (MLsh/MRsh::New /
  MUrsh::NewWasm -> I32Shl/ShrS/ShrU), Inc/Dec (asNumber +/- 1.0), GetElem/SetElem (dense arrays:
  oracle records gWJElemShape[(script,pcOff)] from the element-IC GuardShape; FE shape-guards the
  array, loads elements_ (obj+12, which points AT element 0), computes elements_+idx*8, loads/stores
  the boxed i64 element; UNCHECKED bounds -- speculative, valid in richards). Each addition moved the
  schedule bail forward: BitAnd -> Or -> GetElem -> Inc -> SetElem -> Rsh -> now GetProp@118 (a
  property deep in a nested inlined run()-method that the oracle didn't record -- likely a site whose
  callee ICs weren't reached, a megamorphic/accessor site, or a deeper field). No regression (all 14
  gates pass). richards schedule now inlines through this.list/currentTcb (boxed dyn fields), the
  polymorphic run()/isHeldOrSuspended dispatch, isHeldOrSuspended's full body, and well into method
  bodies (arrays, bitwise, shifts, counters) before bailing.
- BOXED PIPELINE VALIDATED CORRECT (2026-06-19, eighteenth gate -- t_ionsched.js): a richards-SHAPED
  function that RETURNS a verifiable number. S.prototype.run() walks a MONOMORPHIC linked list of TCB
  nodes (`var c=this.head; while(c!==null){ s+=c.task.go(); c=c.next }`) where each node's `task` is a
  POLYMORPHIC A/B with a dispatched `go()` (A:x*2, B:x+10). TARGET=11 trigger=17 -> RESULT=20 CORRECT
  (3*2+2+10+1*2), 21 MIR blocks. This validates the WHOLE boxed pipeline end-to-end: this-receiver,
  boxed object-ref field traversal (this.head/c.next), null check, monomorphic field/method access on
  the TCB nodes, POLYMORPHIC method dispatch (c.task.go over A/B via the oracle's gWJMethodPoly), and
  arithmetic in the dispatched bodies -- all producing the correct result. KEY LESSON (cost ~1 debug
  cycle): the list you TRAVERSE must be monomorphic (c.next/c.task shape-guard one shape); only the
  DISPATCHED target may be polymorphic. An earlier test made the list NODES polymorphic (A/B both with
  .next) -> c.next's shape guard missed on the other type -> deopt sentinel 1.0. richards is naturally
  this shape (mono TCB list, poly task). No regression: all 15 gates pass. THE BOXED MODEL IS CORRECT.
- *** REAL RICHARDS SCHEDULE COMPILES TO VALID OPTIMIZED WASM *** (2026-06-19, MAJOR MILESTONE): the
  real octane `Scheduler.prototype.schedule` (richards.js:188) -- the hottest function, which the WJ
  JIT never compiles -- now goes ALL THE WAY through the reused-Ion pipeline: builds 542 MIR blocks ->
  OptimizeMIR (GVN/LICM) -> 528 blocks (327 wasmLoads / 228 compares, almost all hoisted INTO the
  scheduler loop) -> emits 24365 bytes of wasm that `WebAssembly.compile` accepts as VALID. This is the
  whole boxed pipeline at richards scale: boxed dynamic-slot fields, polymorphic task.run/isHeldOr-
  Suspended dispatch, deep method inlining, arrays, bitwise/shifts/counters, ||/&&, cold-site by-name
  field resolution. Additional fixes that got it to valid wasm: (1) dispatch results AND inline-frame
  returns are boxed to a uniform i64 (so merge phis are i64, not MIRType::Value from mixed return
  types -- a Value phi has no wasm local -> emit fails); SetRval/Return/rval-init box for inline frames;
  callers mark the read result boxedVty=2. (2) branch conditions (JumpIfFalse/True) asInt32 the popped
  value (a boxed i64 boolean/object-ref -> i32 low32 truthiness), since MTest needs i32 (V8: "if
  expected i32, found i64"). It RUNS but returns the deopt sentinel 1.0 because the FE harness passes
  this=0 (no live Scheduler sample -- schedule isn't wj-compiled so gWJSampleRecv is empty; the
  mini-scheduler t_ionsched.js validates the SAME patterns =20 correct). So the wasm is valid+optimized;
  it just needs a live `this`, which is precisely what INTEGRATION supplies. ALL 15 gates pass.
  THE 2x THESIS IS NOW DEMONSTRATED AT THE COMPILATION LEVEL: richards' hottest fn -> valid GVN/LICM-
  optimized wasm via reused Ion. What remains is INTEGRATION (install + real-Value ABI passing the live
  receiver + deopt-resume) and hardening the speculative corners (type guards, bounds checks).
- INTEGRATION GROUNDWORK (2026-06-19): the existing call ABI (WasmJitRunCall, line ~11726) is
  `(f64 scratchPtr) -> f64 deoptCode`: args + `this` are staged as raw i64 Value bits in gWJScratch[i]
  / gWJScratch[kWJThisSlot] (kWJResultSlot=64, kWJThisSlot=65, gWJScratch[72]); the wasm reads/guards
  them and writes the result to gWJScratch[kWJResultSlot], returning 0.0 (success) or nonzero (deopt ->
  WasmJitRunCall falls back to the interpreter, which re-runs correctly). This ABI fits the boxed model
  PERFECTLY: args/this arrive as i64 boxed Values -> feed directly into asNumber/asObjPtr at use. Added
  WJIonBuildMIR param `scratchResultBase`: when set, top-frame Return/RetRval box the result and
  storeAt(scratchResultBase, kWJResultOff, Int64) then MWasmReturn(0.0); the ensureGuard/dispatch deopt
  already MWasmReturn(1.0) which the existing path treats as deopt->interpreter. Default-null = the
  existing direct-param test ABI (gates unaffected; verified). REMAINING for the scratch harness +
  install: (1) entry sets param0=f64 scratchPtr -> i32 base via I32TruncSatF64U (MiscOp; the Mode V
  emit at line ~2450 does exactly this -- need the MIR node or emit it), load each arg i64 from
  base+i*8 and `this` from base+kWJThisOff, pass as argParams (i64) + topThisDef + scratchResultBase;
  (2) emit a (f64)->f64 module (copy WJIonFrontendTest's module emit, single f64 param); (3) hook into
  WJCompile behind a gate: try the Ion path, install (e->handle/state/nargs) so WasmJitRunCall runs it;
  (4) HARDEN speculative corners for soundness on a real run (int-field type guards, array bounds
  checks -> deopt on miss) since wrong fast-path results would corrupt the benchmark (guard misses
  already deopt safely; unchecked bounds do NOT). Validate first via a scratch-ABI test (stage a sample
  this in gWJScratch, call, read kWJResultSlot) on t_ionsched (expect 20) before touching WJCompile.
- *** INTEGRATION ABI VALIDATED *** (2026-06-19): built WJIonScratchTest (gated GECKO_WJVS_IONSCRATCH,
  reuses GECKO_WJVS_IONFE_TARGET/trigger) -- compiles a target through the Ion pipeline with the EXACT
  production scratch ABI and calls it the way WasmJitRunCall does. The builder gained `scratchResultBase`
  (top-frame Return/RetRval box the result + storeAt(kWJResultOff, Int64) + MWasmReturn(0.0); deopt
  paths already MWasmReturn(1.0)) and `scratchArgs` (entry slots init from i64 loads instead of params).
  The harness: entry has ONE f64 param (scratch ptr) -> MTruncateToInt32 (I32TruncF64S; gWJScratch is a
  low static addr) -> scratchBase; loads each arg i64 from base+i*8 and `this` from base+kWJThisOff
  (all boxed i64 -> the boxed model unboxes at use); emits a (f64)->f64 module; stages a sample boxed
  receiver in gWJScratch[kWJThisSlot]; wasmhost_call(&ptr); decodes gWJScratch[kWJResultSlot].
  PROVEN on t_ionsched (mini-scheduler): `[ion-scratch] deopt=0 result=20` -- CORRECT, NO DEOPT, through
  the production ABI. So an Ion-compiled function reads boxed args/this from gWJScratch, runs the boxed
  pipeline (poly dispatch + traversal + arithmetic), writes the boxed result back, and returns 0.0
  success -- exactly what WasmJitRunCall consumes. ALL 15 gates pass. The integration ABI is DONE +
  proven correct. REMAINING: (1) the INSTALL hook -- in WJCompile, behind a gate, run the Ion scratch
  compile and on valid wasm set entry->{handle,state=Compiled,nargs} (mirror the Mode V/VS install) so
  live calls dispatch to it; (2) HARDEN array bounds + int-field type guards -> deopt (guard misses
  already fall back to the interpreter safely; unchecked OOB reads do NOT) before trusting a full run;
  (3) measure richards ON vs OFF. The hard parts (compile to valid optimized wasm + correct boxed
  semantics + production ABI) are all proven; what's left is the install wiring + soundness hardening.
- SOUNDNESS BLOCKER FOUND before install (2026-06-19): the Ion FE pushes konst(0.0) for EVERY
  JSOp::GetGName/GetName. That's correct ONLY for the callee-resolution idiom (`GetGName foo; ...;
  Call` -- the placeholder is popped at the statically-resolved Call), but WRONG for a global read used
  as a VALUE (richards' STATE_*/ID_*/KIND_* constants, the device/handler logic). schedule etc. COMPILE
  to valid wasm with this, but would RUN with those globals = 0 -> wrong results. So the install hook
  must wait on GetGName-VALUE handling. FIX DIRECTION: richards globals are de-facto constants (never
  reassigned) -> at compile time read the global's current value (via gWJGNameHolder/IC slot or a name
  lookup on the global object) and bake a konst (numeric -> f64; object -> boxed i64), ideally behind a
  global-shape guard (deopt if the global is ever reshaped). Distinguish value-GetGName from
  callee-GetGName by the next op (Call/CallContent/CallIgnoresRv after the dup/args => callee).
- INSTALL HOOK (mechanical, after soundness): in WJCompile behind a gate, run an Ion scratch-compile
  (factor WJIonScratchTest's compile half into WJIonCompileInstall returning the handle) and on valid
  wasm set entry->{handle, state=Compiled, nargs, modeVS=false, tableIdx=-1}; WasmJitRunCall then
  stages args/this in gWJScratch and runs it, deopting to the interpreter on guard miss. Risk: unchecked
  array bounds + int-field type speculation can read garbage WITHOUT deopting -> add bounds checks +
  value-type guards (deopt on miss) before trusting a full benchmark run. Then measure richards ON/OFF.
- *** END-TO-END INTEGRATION WORKS + RICHARDS RUNS CORRECTLY *** (2026-06-19): WJIonCompileInstall
  (factored from the scratch test) compiles a script through the Ion pipeline (scratch ABI) and returns
  the wasm handle; the WJCompile hook (gated GECKO_WJVS_IONINT) installs it as entry->{handle,nargs,
  state=Compiled, modeVS=false, vsCapable=false, tableIdx=-1} so WasmJitRunCall dispatches live calls to
  it (deopting to the interpreter on a guard miss). Also fixed GetGName-as-VALUE (bake numeric global
  constants; objects/functions stay 0.0 callee-placeholders) -- required for sound richards. RESULT:
  `GECKO_WJVS_IONINT=1` on real octane richards RUNS CORRECTLY (no ERR/MISMATCH across many runs --
  richards verifies its own output, so this means the boxed Ion pipeline produces CORRECT results on
  the whole benchmark). PERF (embed-js node harness, VERY noisy ~+-25%): interp ~58-78, existing WJ JIT
  ~40 (it actively HURTS richards -- matches the old finding), Ion ~46-73 (roughly PAR with interp,
  clearly BEATS the existing JIT). So: the reused-Ion approach is proven end-to-end + correct + better
  than the old JIT, but NOT yet 2x (not even clearly > interp in this noisy harness). The 2x gap is a
  perf problem now, not a feasibility one. WHY not faster: richards' hot loop traverses a LIST (each
  node a different object) so the per-node shape-guard + boxed load + tag-dispatch unbox + dispatch are
  NOT loop-invariant -> GVN/LICM can't hoist them; the boxing overhead (box on store, branchy unbox on
  arithmetic) is paid per node. To hit 2x needs: scalar-replacement / unbox-elimination of the boxed
  Values, cheaper monomorphic-dispatch (cache the guard), int-field type guards so int fields stay i32
  (skip the tag-dispatch), and avoiding install for functions that deopt. PROPER measurement needs the
  embed-xul + playwright harness (_t_rich_ab.cjs, min+median, fresh browser) -- requires rebuilding
  libxul (obj-full-emscripten), not just obj-js. CURRENT STATE: gated default-off; all 15 isolated
  gates pass; richards correct under IONINT.
- MEASURED RESULT (2026-06-19, 7-run medians, embed-js node harness, noisy +-20%): interp=76,
  existing WJ JIT=58, reused-Ion EAGER install=61, reused-Ion DELAYED install (wait for field types to
  be observed so loads are typed i32/f64 not boxed)=67. So Ion ~ ties the old JIT and is ~0.8x the
  INTERPRETER -- NOT 2x, not even > interp. DEOPTS ARE ~0 (18 over 125k runs), so the compiled code
  stays on the fast path; the gap is pure boxed-pipeline overhead per loop iteration. Delaying install
  for type observation helped (61->67), confirming typed fields are the lever, but the magnitude is
  small. HONEST ASSESSMENT for the 2x ultimatum: the reused-Ion approach is PROVEN feasible + correct
  end-to-end (richards runs correctly through compile+GVN/LICM+install+run) and beats the old JIT, but
  does NOT hit 2x and the tried levers (typed fields, no deopts) don't bridge a ~0.8x->2x (~2.5x) gap.
  ROOT CAUSE (fundamental): richards' hot loop is a LINKED-LIST traversal -- every node is a distinct
  object -- so the per-node shape-guard + field load + dispatch are NOT loop-invariant and GVN/LICM
  cannot hoist them; the optimizer's marquee win (hoisting invariant guards/loads out of the loop)
  simply does not apply. Beating a TUNED portable-baseline interpreter by 2x on boxed-OO per-node work,
  with no hoisting available, is not achievable by reducing constant factors -- it would need a
  fundamentally cheaper per-node representation (fully unboxed typed objects in wasm memory, which the
  shared NaN-boxed NativeObject layout forbids) or algorithmic change. The 2x target on richards
  specifically appears to be blocked by the benchmark's structure, not by missing engineering.
- PBL -> ION ONLY (2026-06-19, per user: "baseline jit pre-ion is buggy, disable it, go pbl->ion"):
  GECKO_WJVS_IONINT now does PBL-interpreter -> reused-Ion with NO Mode V/VS fallback. WJCompile under
  IONINT only tries Ion (returns false otherwise); WasmJitObserveCall keeps the fn in PBL and retries
  Ion with an initial 2-observe warmup delay (so the fn's own CacheIR ICs are warm -> first attempt
  resolves shapes) + a 6-attempt cap with backoff (a fn that can't compile runs in PBL forever, NOT
  re-attempted -- uncapped retries of the expensive Ion compile sank the score below the interpreter).
  Install sets entry.bcLen (MISSING bcLen caused WJValidateEntry to reset to Cold every call ->
  72k recompiles of addTo -> score 13; fixed). NULL-STORE FIX (was a crash): boxObj now picks the tag
  by (ptr==0): a 0 pointer becomes the NULL Value (kWJTagNull), not an object Value with payload 0
  (which GC traced as a ref to addr 0 -> crash on `this.link=null`). RESULT: richards CORRECT, ~PBL
  PARITY (median ~69-78), buggy baseline JIT gone. addTo (Packet.addTo) installs on Ion; but SCHEDULE
  (the hot fn) still FAILS Ion: bails at a deep `Call@300: callee not inlinable`. ROOT BLOCKER (new,
  real): the FE is ALL-OR-NOTHING on inlining -- one unresolvable deep callee bails the WHOLE function.
  Deep call sites lack callee data because PBL Call ICs are often FALLBACK-only (no GuardSpecificFunction
  for the oracle) + GC wipes gWJInlineCallee. NEXT LEVER (the bold one): support NON-INLINED calls --
  when a callee can't be inlined, emit a real call to it (its own Ion/PBL entry via a helper) instead
  of bailing, exactly like real Ion (inline what you can, call the rest). That + the cross-module-tax
  fix are what would let schedule actually compile + run on Ion.
- CORRECTION to the "no-hoisting" conclusion (2026-06-19, prompted by the user): WRONG. Real Ion ALSO
  cannot hoist richards' linked-list traversal (every node distinct), yet it beats the interpreter --
  so "nothing to hoist" is NOT why richards JITs win. Real Ion wins by making per-node work CHEAP:
  unboxed type-specialized fields (state = raw i32 in a register, no box/tag-dispatch), registers,
  direct native calls. MY gap was therefore UNBOXING, not hoisting: in this portable-baseline build
  CacheIR typeData is empty, so unobserved fields fell to the boxed-i64 + branchy-tag-dispatch path.
  FIX built: gWJShapeSample[shape]->live instance captured at IC-fill; the oracle reads ANY field's
  value type from a validated sample at compile time -> unboxed typed loads. This + (shape,offset)
  gWJFieldVty closed most of the gap (0.8x -> PARITY). Remaining caps to 2x, both architectural (not
  fixable by more MIR opt): (A) CROSS-MODULE wasm-call tax -- each JIT fn is a separate wasm module via
  wasmhost_call; the in-wasm PBL interpreter pays no boundary cost; real Ion is native so it doesn't
  either; amortized only inside a loop. (B) the baseline here is the PORTABLE BASELINE INTERPRETER
  (CacheIR-executing, already a tier above the C++ tree-walker), so a JIT's headroom over it is far
  smaller than real-Ion-over-C++-interpreter. So: richards reaches PARITY, not 2x; the diagnosis is now
  unboxing(done)+cross-module-tax+fast-baseline, NOT no-hoisting.
- PERF LEVERS TESTED (2026-06-19), all converge on interpreter-PARITY, none reach 2x (9-run medians,
  noisy +-25%): (a) dispatch guard-elision (set guardedShape[recv]=way-shape after the dispatch compare
  so inlined method bodies skip the redundant field shape-guard) -- no measurable change. (b) install
  only LOOP-bearing functions (GECKO_WJVS_IONINT default; _ALL to install everything, _EAGER to skip
  the type-observation delay): brought Ion from ~0.8x to ~PAR with interp (66 vs 68) -- confirming a
  real per-call CROSS-MODULE wasm-call tax (each JIT fn is a SEPARATE wasm module reached via
  wasmhost_call; the in-module PBL interpreter pays no such boundary cost), so tiny leaf fns are a net
  loss and only loop-amortized fns are worth installing. NET: with all levers, reused-Ion == the
  interpreter on richards, correct, and clearly > the old JIT -- but NOT 2x and no lever approaches it.
  FIRM EVIDENCE-BASED CONCLUSION: richards 2x is not reachable via this approach. Two stacked structural
  walls, both confirmed by measurement: (1) the hot loop is linked-list traversal -> per-node guards/
  loads/dispatch are NOT loop-invariant -> GVN/LICM (the optimizer's whole advantage) cannot hoist
  them; (2) the JIT-as-separate-wasm-module architecture pays a cross-module call tax the in-wasm
  interpreter avoids. Both are architectural, not constant-factor; neither is closed by more MIR
  optimization. The Ion-reuse machinery itself is sound (compiles+optimizes+runs richards correctly,
  beats the old JIT) and would pay off on loop-invariant / numeric-kernel workloads where hoisting
  applies -- just not on richards' boxed-OO per-node traversal against a tuned in-module interpreter.
- NEXT (if continued): reduce boxed-pipeline overhead (typed fields via 2-phase observe-then-Ion-compile,
  xul/playwright harness; continue op/coverage to full schedule build (the bail is now deep in the inline
  tree -- diminishing per-op clarity; may need deeper callee IC reading or handling accessor/megamorphic
  sites), VALIDATE correctness (schedule returns void + mutates `this`, so the FE harness can't check it
  -- need a value-returning richards-shaped test or the integration path to validate), then benchmark
  INTEGRATION (install compiled wasm as the real entry + real-Value arg/return ABI + deopt-resume via
  WJH_RESUME). CAUTION: the boxed model has speculative/unsound corners (int32-field type speculation,
  unchecked array bounds, ToInt32 via i32.trunc_f64_s not JS-wrapping, no value-type guards) that are
  fine for a BUILD probe but must be hardened (guards + deopt) before a real run trusts the output.
- STILL TODO for richards: benchmark INTEGRATION -- the last gap before a real richards number.
  Everything above is still proven only via isolated FE tests fired through WJIonFrontendTest (compile
  one target, instantiate, call ONCE with synthetic args, compare to interpreter). Integration needs:
  (1) INSTALL: when a hot fn compiles (WJCompile), run WJIonBuildMIR and, on success, install the wasm
  as the fn's real entry so live calls dispatch to it; (2) real call ABI: marshal actual JS Value args
  -> i32/f64 params and box the f64 result back to a Value (FE test currently fakes object args as
  double(sampleRecv) + numerics from an env string); (3) REAL DEOPT: the shape-guard/dispatch miss
  currently does MWasmReturn 1.0 (a sentinel, fine for one-shot tests, WRONG in live execution) -> wire
  it to the existing WJH_RESUME / PortableBaselineInterpret self-resume path so a miss bails to the
  interpreter and continues correctly; (4) coverage check that richards' hot fns actually compile (if
  the megamorphic site or any callee bails, the whole chain bails -> no win). THEN measure. Secondary:
  JS-node alias switch (per-field alias granularity so invariant guards hoist past field stores in
  mutation loops); CSE dispatch shape-guards across repeated same-receiver calls; soundness follow-ups
  (value-type guard + deopt for int32 fields; int-aware SetProp).
- (superseded) earlier LIMITATION note: leaf + straight-line + monomorphic + free-function only. richards needs (a) METHOD
  calls (callee pushed via GetProp on receiver, this=receiver -- needs the shape-guarded method load
  + pass receiver as this), (b) POLYMORPHIC (4 task types -> guard recv type, inline matching body or
  if/else chain), (c) NON-LEAF (callee calls -> recursive inline), (d) callee CONTROL FLOW (needs the
  full block-building machinery spliced into the caller's CFG with arg remap + return routed to a
  continuation block / return-value phi -- the big generalization: make WJIonBuildMIR re-entrant with
  an "inline frame" mode). The straight-line leaf gate proves the mechanism + the GVN-across-calls
  payoff; the CFG/method/poly generalization is the next build.

**REVISED RICHARDS STRATEGY: the achievable lever is FRONT-END CALL INLINING in the Ion builder --
splice callee bytecode->MIR at monomorphic/poly call sites (using gWJInlineCallee data) so the hot
scheduler chain (task.run -> {device,handler,worker,idle}.run) becomes ONE MIRGraph with no wasm
call boundaries. That directly attacks richards' real cost (megamorphic dispatch + tiny-method call
tax) and is doable in the front-end (no dependence on Ion's gated auto-inliner). Once the chain is
one function, GVN/LICM operate across it; with per-field alias tags (the other FUTURE LEVER) the
invariant Packet/Tcb field guards could then hoist. This is the next bold step; property-access
loads/stores are the substrate it builds on.**

**RICHARDS REALITY CHECK (from [[wasm-jit-richards-analysis]]): richards is dispatch+allocation
bound (megamorphic task.run, tiny methods, Packet alloc), NOT property/arith dense. So the proven
property-access LICM/GVN mechanism, while real, is NOT richards' main bottleneck. The richards 2x
levers in priority: (1) ScalarReplacement to flatten short-lived Packet allocations (the user's
"scalar replacement flattens Packets" -- HARD: needs MNewObject-style alloc in wasm mode; verify
ScalarReplacement even fires in compilingWasm), (2) devirtualize/inline task.run (Ion inlining;
note inlineInterpreted is gated off via !compilingWasm in OptimizeMIR's prune/apply-types, but
ScalarReplacement+GVN+LICM DO run in wasm), (3) lean call boundaries. NEXT bold step: probe
ScalarReplacement in wasm mode + Packet-alloc flattening, since that targets richards' actual cost.**

**NEXT (toward real richards): SetProp (field stores; invalidate fieldCache+guardedShape on the
mutated shape), then dyn slots + int32/bool field repr (currently f64-only), then method calls
(task.run dispatch) + the deopt path wired to the real PBL re-run, then scalar replacement (HARD:
needs MNewObject-style alloc in wasm mode -- may not work; flatten non-escaping Packet/Tcb).
REMAINING RISK: prove actual RUNTIME 2x (the hoist is proven structurally in MIR; not yet timed).**

**SUPERSEDED NEXT (done above): PROPERTY ACCESS w/ shape guards (THE richards win).** Use gWJShapeRec IC data: emit
guarded unboxed field loads/stores as wasm-level MIR so GVN dedups guards + LICM hoists them out
of loops + ScalarReplacement flattens non-escaping objects. Per [[wasm-jit-richards-analysis]]
richards cost = guards+box/unbox+frame-I/O, exactly what this removes. Then calls/inlining, then
integration into real dispatch w/ deopt sentinel on guard miss. REMAINING RISK: demonstrate actual
2x on a property-access-in-loop slice (LICM hoist proof) before whole-benchmark wiring.
All work self-contained tests (GECKO_WJVS_IONFE/IONBE/IONSMOKE, default-off). Dump:
GECKO_WJVS_IONFE_DUMP (bytecode + /tmp/ionfe.wasm), GECKO_WJVS_IONFE_NOOPT (skip OptimizeMIR;
NOTE rpoBegin needs OptimizeMIR so NOOPT path crashes - expected). MDefinition::opName() is
JITSPEW-only -> use unsigned(ins->op()).

Build/run: edit WasmJS.cpp → `bash embed-js/fastjit.sh` (or `make -C obj-js-emscripten/js/src`
for perf) → `bash embed-js/build.sh` → `GECKO_WJVS_IONSMOKE=1 node embed-js/run.cjs embed-js/t_jit.js`.
NOTE: use run.cjs, NOT `node embed.js` directly (embed.js is a MODULARIZE factory).
