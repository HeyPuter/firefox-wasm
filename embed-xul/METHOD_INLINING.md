# Speculative method inlining for Mode VS — design

Goal: get octane OO (richards/deltablue) toward 5-10x. EMPIRICAL basis: the hot
deltablue fns are tiny method-call/property/array shims (`at(i){return this.elms[i]}`,
`weakestOf(s1,s2){return this.weaker(s1,s2)?s1:s2}`, `incrementalAdd` = a loop of
`c.satisfy(mark)`); almost no arithmetic. With the call chain already in wasm (DeltaBlue
~1.4x), the remaining cost is PER-CALL OVERHEAD on 1-2-op bodies: `call_indirect` marshals
args->gWJScratch, the callee prologue inits its frame + copies args back, result returns
via gWJScratch — ~15-20 mem ops wrapping a 2-op getter. Inlining turns `coll.at(i)` into an
inline GetProp+GetElem, removing the call entirely. THIS is the OO lever (NOT numeric
unboxing — that helps raytrace/navier, not deltablue/richards).

## The chicken-and-egg + the recompile trigger
A method call's callee is resolved at RUNTIME (the receiver's shape -> the method), via the
IC (gWJCallFn[site], filled by WJFillIC on first miss). The caller is compiled BEFORE that.
So inlining is SPECULATIVE and needs a RECOMPILE after the ICs warm:
- WasmJitEntry += `bool wantInline`. In WasmJitRunCall's success path, once a modeVS+hasCall
  fn has run >= K times (ICs warm) and !triggeredInline, set wantInline=true, state=Cold,
  handle/tableIdx=-1 (one-shot; guard against thrash with a `triggeredInline` bit).
- The recompile (WJCompile) passes wantInline into the emitter; WJVSCall consults the now-
  filled IC to decide whether to inline each site.

## Eligibility (inline callee C at site S in caller F) — ALL must hold
- Site S is MONOMORPHIC: gWJCallFn[S] set and the site never went megamorphic.
- C is a scripted JS function with a JitScript + bytecode (not a native — Array.push/pop
  etc. are C++ natives, NOT inlinable; they stay WJH_CALL -> interpreter).
- C is a LEAF: no JSOp::Call/New in C (start single-level; nested inlining later).
- C is STRAIGHT-LINE: no jump opcodes (no relooper merge into the caller's CFG; getters/
  `at`/`weakestOf`-with-ternary... NOTE ternary HAS control flow -> exclude v1; handle
  straight-line returns only first).
- C is SMALL: bytecode length < kInlineMaxLen (~50).
- arity matches: GET_ARGC(S) == C->nargs (no under/overflow handling in v1).
- Every op in C is WJModeVSSupported AND not itself a call/jump.
- Inlining keeps caller+C within budgets: caller.depth + C.maxStack < kWJVSMaxStack (s[]
  locals), caller.frameSize + C.frameSize < kWJFrameSlots.

## Inline emission (the core)
At S the caller has [callee, this, arg0..argN-1] on its operand stack (depth D), already
marshalled to gWJScratch by marshal(). Replace the `call_indirect` (guard-HIT) branch with:
1. basesp2 = gWJFrameSP; if basesp2 + C.frameSize > kWJFrameSlots -> FALL BACK to
   call_indirect (C is in the table) — inline is an optimization, not the only path.
2. fb2 = frameAddr + basesp2*8 (a SEPARATE i32 local kVSfb2, so the caller's kVSfb is
   untouched); gWJFrameSP += C.frameSize; init C's frame [0,C.frameSize) to Undefined;
   copy args: C.frame[i] = gWJScratch[i] for i in [0,C.nargs); C.this from gWJScratch[this].
3. Emit C's body with a SUB-CONTEXT c2: c2.script=C, c2.fbLocal=kVSfb2, c2.sOffset=D
   (so C's operand-stack slot k uses wasm local s[D+k], NOT clobbering the caller's s[0..D)),
   c2.localBaseS/rvalS/stackBaseS laid out within fb2's frame. Emit C's ops via the existing
   WJEmitOpVS (it already takes c2); Return/RetRval store c2.rval and BREAK to "after inline".
4. gWJFrameSP = basesp2 (restore). Result (c2.rval) -> caller's calleeS slot (the call result).
5. caller depth -= argc+1 (same as a normal call).
WJVSCtx gains `fbLocal` (default kVSfb) and `sOffset` (default 0); WJSAddr uses c.fbLocal,
WJVSLocalFor adds c.sOffset. Add locals kVSfb2, kVSbasesp2 (declare 7 i32 not 5).

## GC-safety
C's frame [basesp2, basesp2+C.frameSize) is in gWJFrameMem, covered by gWJFrameSP (bumped in
step 2), init'd to Undefined -> WJTraceRoots (major+minor, both fixed) traces it. C's operand
stack in s[D+k] locals: spilled at C's own safepoints (helpers) like any Mode VS operand —
but C is a LEAF (no calls) and its only safepoints are wjhelp arith/getprop helpers, which
already spill/reload via the bystander mechanism (sOffset-aware). No new GC hazard: identical
to a normal nested VS frame, just emitted inline instead of via call_indirect.

## Fallback / soundness
- The receiver/callee guard (`low32(callee)==gWJCallFn[S]`) is UNCHANGED; on miss -> generic
  WJH_CALL (interpreter), exactly as today. So inlining only changes the guard-HIT path.
- Frame-overflow in step 1 -> call_indirect fallback (C is still in the shared table).
- A deopt INSIDE the inlined C (e.g. a GetProp shape miss) calls C's helper (no restart;
  Mode VS), same as a non-inlined VS callee. An exception propagates (return 2.0) after
  restoring gWJFrameSP — must restore to the CALLER's basesp, not basesp2 (the epilogue
  already restores caller basesp on the EXC path; inline EXC must unwind both).
- Validator catches structural wasm errors -> graceful compile-fail -> non-inlined module.
  But a SEMANTIC inline bug (wrong slot map) silently corrupts -> MUST test like regalloc.

## Phasing
- Phase A: straight-line LEAF callees, monomorphic, arity-match, recompile-triggered. Verify
  on a getter-in-loop micro (NEW jiinline.html: `o.get()` in a loop, exact sum) + GC-stress
  (object getter across an allocating call) + octane self-validation. Measure deltablue
  matched-pair A/B.
- Phase B: callees with simple control flow (ternary -> the `weakestOf`/`stronger` pattern):
  inline C's relooper blocks into the caller's CFG (or emit C as an inner block with its own
  mini-dispatch). Harder.
- Phase C: multi-level (inline a callee that itself calls an inlinable leaf), depth-bounded.

## Test plan (semantic bugs are silent — same risk class as MODE_VS_REGALLOC)
- jiinline.html: getter `Pt.prototype.x=function(){return this.x_}` summed in a 5M loop;
  exact total; and a version holding an object across the inlined call + heavy alloc (GC).
- octane richards/deltablue self-validate (wrong result -> octane error, not silent).
- A/B via bench/_t_ab3.cjs matched pairs at low load (scores are load-noisy; only within-pair
  ratios are trustworthy).
- Gate behind env GECKO_WJVS_INLINE during bring-up so the default build stays the verified
  non-inlining one; flip default once the acid tests + octane pass.

## Honest ceiling
deltablue `add`/`removeFirst` bottom out in native Array.push/pop (C++ -> interpreter, NOT
inlinable), so deltablue won't go fully 10x. But `at`/strength/`satisfy` (scripted) chains
should jump substantially. richards is mostly scripted method dispatch -> better inlining
target. Numeric subtests (raytrace/navier) want unboxing instead (separate track).
