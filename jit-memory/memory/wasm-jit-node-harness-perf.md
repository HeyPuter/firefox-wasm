---
name: wasm-jit-node-harness-perf
description: "SpiderMonkey-only node harness (embed-js/) for ~20s JIT iteration, the --no-liftoff measurement-noise fix, and the empirical TurboFan-era octane perf picture (JIT wins numeric/property, loses call/alloc). TYPEDFIELD shipped default-on."
metadata:
  node_type: memory
  type: project
  originSessionId: bb3f6b71-628c-4bff-8084-c9e63c53d30d
---

**Node fast-iteration harness for the JS→wasm JIT, built 2026-06-19** (`firefox-wasm/embed-js/`, see
its README). Links `libjs_static.a` ONLY (no libxul) into an 11 MB wasm that runs in plain `node` —
~20s edit→result vs the ~7min full-Gecko + headless-browser loop. Setup: `obj-js-emscripten/` built
from `mozconfig.js.emscripten` (which I edited to add `--enable-portable-baseline-interp[-force]`, REQUIRED
so the JIT's PBL hooks + Phase F resume compile). Workflow: edit `WasmJS.cpp` → `bash embed-js/fastjit.sh`
(-O0 recompile of just the WasmJS unified TU + re-archive libjs + relink, ~18s) → `node embed-js/octane.cjs
<bench>`. `fastjit.sh` -O0 only de-optimizes the C++ COMPILER, not the emitted wasm, so it's valid for
correctness AND for measuring the JIT's emitted-code perf (PBL stays -O after a `make -C obj-js-emscripten/
js/src`). Key files: `embed.cpp` (raw-JSAPI embedder; needs `js::DisableExtraThreads()` since the build has
no -pthread, and `JS_SetGCParameter(JSGC_MAX_BYTES,0xffffffff)` so splay doesn't OOM), `rust-stubs.c`
(encoding_rs + mozjemalloc-arena C shims — the JS-only objdir builds no Rust lib), `octane.cjs`/`octane-ab.cjs`/
`measure.sh`, `t_jit.js` (deterministic checksum correctness test, catches miscompiles/bad resumes).

**CRITICAL measurement methodology (`--no-liftoff`).** The JIT-emitted wasm runs on host V8, which tiers
Liftoff→TurboFan DURING octane's 1-second measure window → 20-50% run-to-run variance that makes micro-opts
unmeasurable. FIX: the octane runners pass `node --no-liftoff` (TurboFan-only = production steady state) and
take max-of-N (max = least-jitter run). Without this, ALL perf measurements are noise. Also pass
`--stack-size=8000` (node's default V8 host stack is smaller than chromium's; the deopt self-resume recurses
across the wasm↔host-wasm boundary and overflows it under FDEOPT — a harness detail, not an engine bug).

**Empirical TurboFan-era octane picture (the important result).** Clean ratios jit/off: crypto ×3.3,
deltablue ×1.19, navier ×1.06, earley ×1.06, raytrace ×0.98, splay ×0.97, richards ×0.87. The JIT WINS on
numeric/property-dense code, LOSES on call/allocation-dense code. Under TurboFan the edge is SMALLER than
the noisy Liftoff numbers suggested (TurboFan optimizes the PBL interpreter's wasm too). Every load/guard
micro-opt (Phase B GVN, shape-guard hoist, frame-init unroll/memory.fill) measured at/below noise — the
middle-end's load/guard lever is largely spent for octane. SHIPPED win: **TYPEDFIELD + TYPEDELEM default-ON**
(`WJVSTypedField()`, opt out `GECKO_WJVS_TYPEDFIELD=0`): a GetProp/GetElem result consumed numerically (via
bounded forward scan `WJFieldNumConsumed`, generalizing past the immediate-next-op) goes straight to the
typed f64 operand stack, skipping box-then-unbox → crypto +16%, splay +6%, rest within noise. SHIPPED win #2: **Math intrinsic inlining default-ON** (`WJMathInlineEnabled()`, opt out
`GECKO_WJVS_NOMATH=1`): a 1-arg (or 2-arg min/max) Call whose callee is a recognized `Math.*` native
(sqrt/floor/ceil/abs/trunc/min/max) is emitted as the wasm `f64.*` op, guarded by callee identity +
numeric args, generic call on miss. Detection: observe path (WJFillIC) matches the callee against the
global Math.* fns (looked up once) and records {op,fnLow} in `gWJMathRec` keyed by (script,pcOff); a
recompile (triggered by a new `hasMathCall` flag, even with inlining off) reads it at emit and bakes the
fn ptr as the guard constant. Result: **+17% on Math-heavy loops** (micro-test), NEUTRAL on octane
(Math.sqrt too sparse there — raytrace/navier within ±1%). Kept default-on as it aligns with the JIT's
numeric strength and doesn't regress octane. **BOUNDED OPTIMIZATION SPACE EXHAUSTED (measured, 2026-06-19).** After shipping TYPEDFIELD+Math, every
other bounded lever was measured (--no-liftoff, controlled gate-toggles) and is negative/neutral, so all
stay OFF: `GECKO_WJVS_OBJSET` (inline obj-store+barrier: splay -4%), `GECKO_WJVS_LEANINIT` (frame-init
unroll/memory.fill: noise), `GECKO_WJVS_INLINE` (method inlining: regresses richards 83 vs 86),
`GECKO_WJVS_SHORTCIRCUIT` (compile &&/||/?? as Mode VS: deltablue -21%, crypto -6% — those fns are faster
left in Mode V). EMIT-FAIL is common (5-17 fns/bench) but mostly CORRECT fallback: `IsConstructing`
(constructors = the alloc lever), `And`/`Or` (better in Mode V), `bailOp=-` modeVS=1 (elusive internal
WJEmitBodyVS path, NOT maxStack/frameSize/K/entryDepth/per-op — chased, not worth it). CONCLUSION: the JIT
is well-tuned; the realistic ceiling for bounded work is the shipped state (crypto 3.4x, deltablue 1.45x,
Math +17% heavy). The ONLY remaining real lever is ALLOCATION — a major 4-component feature (plan
§8.3/§8.3a: Construct-path JIT hook [the `WasmJitRunCall` hook is Call-path only, NOT New/Construct] +
Mode-VS New + InitProp add-property IC + inline nursery bump-alloc), GC-critical, targeting the benches
the JIT LOSES (richards/splay) for ~neutral payoff. Per plan §8 the numeric/typed-array strength is the
real product lever and is already captured; only build allocation if the product workload is alloc-bound.
See [[wasm-jit-middleend-phasea]], [[wasm-jit-richards-analysis]], plan doc §8.1/§8.2/§8.3.

**ALLOCATION FEATURE INVESTIGATED TO CONCLUSION (2026-06-19), all gated default OFF.** Built validation
infra (--enable-gczeal on obj-js-emscripten; gated JS::SetGCZeal in embed.cpp via GECKO_GCZEAL=<mode>,<freq>)
+ component A (NewObject/InitProp Mode-VS via helpers, GECKO_WJVS_INLINEALLOC) + component C (inline
add-property IC for InitProp, GECKO_WJVS_INITINLINE). Component C is GC-VALIDATED: barrier-flag-gated fast
path (load JS::shadow::Zone::needsMarkingBarrier_ @offset 8; ==0 & obj.shape==fromShape & isNumber(val) ->
inline fixed-slot store + shape-set; else barriered helper) passes VerifierPre (mode 4) clean, object-valued
fields pass Alloc-zeal (mode 2, forced tenuring) clean; fast path confirmed running (1 helper call vs ~9000).
BUT measured NEUTRAL + the JIT LOSES to the interpreter on small-object alloc (200k literal loop: off 2.2s,
helperInitProp 3.23s, inline 3.26s) -- NewObject is still a helper hop (component D unbuilt) and dominates,
and the interpreter's NewObject+InitProp is tighter C++. Even D won't beat the interp -> allocation is
empirically LOW-ROI. The plan's levers are now ALL built-or-disproven; shipped TYPEDFIELD/Math are the
realistic ceiling. See plan §8.3c/§8.3f/§8.4.

**TYPEDLOC CORRECTNESS FIX (2026-06-19): typed ARGS now default OFF.** A full-suite regression check (the
LARGER benches, not the usual core set) caught a JIT MISCOMPILE: octane-**typescript** failed
(`TypeError: this.checker is null`) JIT-on, passed JIT-off. PRE-EXISTING (fails with my TYPEDFIELD/Math wins
off too -> exonerated). Bisected via a debug env `GECKO_WJVS_TLDROP=<bits>` (force an op-class to not-number
in one build): tainting all ENTRY ARGS fixes it; no body-op class does. ROOT CAUSE: a slot is typed from how
it is USED, but an ARG's value comes from the CALLER and need not be a number; entry ToNumber-coercion is
EAGER (once) vs the interpreter's per-use, so a typed arg differs on truthiness (`if(x)`: ToNumber(obj)=NaN is
FALSY, object is TRUTHY -> wrong branch -> property never set -> the null symptom), copy `y=x`, (strict)eq,
and throw/valueOf order. LOCALS are sound (a typed local's value is a PROVEN number: every def is the numeric
sentinel). FIX in `WJAnalyzeNumericSlots`: mask off all arg bits `[0,nargs)` unless `GECKO_WJVS_TYPEDARGS=1`
(experiment gate). typescript now PASSES (1750), t_jit + core suite correct. Perf cost is small/within
host-jitter (crypto ~unchanged, deltablue ~-8%). Also kept: `JSOp::Add` typed numeric only if BOTH operands
provably numeric (`+` is string concat otherwise) + the analysis is now a fixpoint. zlib's "fail" is unrelated
(needs the shell `read()` builtin the embedder lacks). NOW SHIPPED in the full gecko.wasm
(`mach build` MOZCONFIG=mozconfig.full.emscripten, 72s incremental, then `embed-xul/restrip-relink-web.sh`
-> gecko.wasm 253MB link rc=0). See plan §8.5.

**FULL OCTANE SUITE CORRECTNESS-VALIDATED (2026-06-19).** After the typed-args fix, swept ALL octane benches
in the node harness (`node embed-js/octane.cjs <b>`): richards, deltablue, crypto, raytrace, navier-stokes,
splay, earley-boyer, typescript, regexp, code-load, box2d, pdfjs, gbemu, mandreel ALL PASS (produce a score,
no miscompile). Only zlib "fails" and that's the known harness gap (needs the shell `read()` builtin the
minimal embedder lacks, not a JIT bug). The typed-args miscompile was the ONLY one; the sweep confirms no
others. Lesson reinforced: widen test coverage to the big real-world-ish benches (mandreel/gbemu/pdfjs/box2d)
-- they exercise JIT paths the small core set doesn't, and that's how the typed-args bug was caught.
`GECKO_NOWASMJIT=1` fully disables the JIT (line ~8254) for jit-off A/B; `embed-js/octane-ab.cjs` computes
the jit-on/off ratio (default A=jit-on, B=GECKO_NOWASMJIT=1).
