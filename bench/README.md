# bench/ — unified harness for the wasm SpiderMonkey JIT

Everything needed to build the standalone wasm SpiderMonkey embed and run the
benchmark suites against it, in one place. Replaces the scattered
`embed-js/{run,octane-run,jittest-run}.cjs`, the `*-driver.js` files, and the
`realapp`/`ubo` shell scripts.

## Layout
```
bench/
  spidermonkey.js/        the wasm SpiderMonkey embed (no libxul)
    embed.cpp             embedder main (loads + runs JS files passed as argv)
    wasm-host-bridge.js   emscripten --js-library: host<->wasm JIT bridge
    rust-stubs.c          stubs for rust symbols libjs_static.a references
    build.sh              link embed.cpp + libjs_static.a -> build/embed.{js,wasm}  (~15s)
    fastjit.sh            recompile firefox/js/src/wasm/WasmJit*.cpp + relink     (~55s)
    build/                artifacts: embed.js, embed.wasm  (+ CJS package.json)
  octane/                 Octane base.js + bench files + octane-driver.js
  jetstream/              JetStream2 bench files + jetstream-driver.js
  realapp/                acorn / marked libs + bench harnesses (real-app diff)
  ubo/                    ubo-run.js + build/ + data/ (self-contained uBlock filter-compile)
  microbenches/           focused JIT-path probes (one codegen path each) + micro-driver.js
  disas/                  codegen CHECK tests (FileCheck-style WAT assertions)
  jittest/                jsshell wrapper + exclude list for SpiderMonkey's jit-test suite
  wasm/                   in-process wasm-interpreter (GECKO_WASM_INTERP) test suite
  main.ts                 the unified runner (orchestrator + __exec child mode)
```

### wasm interpreter tests
`node bench/main.ts wasm [names...]` runs the in-process wasm-interpreter
(`GECKO_WASM_INTERP`) suite — each `bench/wasm/*.cjs` builds wasm and runs it through
the embed, self-reporting + exiting nonzero on failure:
- `difftest` — 19 hand-written .wat modules (arith/loops/mem/i64/float/bulk/simd/…),
  run under the interpreter vs host passthrough, checked against expected values;
- `atomictest` — the full atomic opcode set (load/store/rmw/cmpxchg/fence);
- `tramptest` — emscripten `addFunction`/`convertJsFunctionToWasm` trampolines via
  `call_indirect` (incl. callbacks that re-enter wasm);
- `emtest` — a real C program compiled with `emcc` (malloc/call_indirect/ctors);
- `rusttest` — a real Rust→wasm module (auto-builds via `rustc`; SKIPs if the
  `wasm32-unknown-unknown` target isn't installed);
- `geckodecode.js` — manual: decode the full 247MB `gecko.wasm` at engine scale.

`.wat`→`.wasm` uses `wat2wasm` if installed, else binaryen's `wasm-as` (ships with the
emsdk). Honors `EMSDK`.

### jit-test suite (SpiderMonkey's own correctness tests)
`node bench/main.ts jittest [filters...]` runs the in-tree `js/src/jit-test` suite
against the wasm embed. `jit_test.py` drives `bench/jittest/jsshell` (-> `node main.ts
__jsshell ...`, which forwards argv verbatim). It validates BOTH **correctness**
(expected pass / expected-throw matching) AND **stay-in-JIT** — the suite's
`do { f(); } while (!inWasmJit())` warmups only terminate once `f` is wasm-JIT-compiled.
```
node bench/main.ts jittest access-formals       # one test (substring match)
node bench/main.ts jittest ion/dce               # an area
node bench/main.ts jittest                        # whole suite (slow)
WJ_JOBS=8 WJ_TIMEOUT=40 node bench/main.ts jittest arguments   # tune parallelism/timeout
```
`bench/jittest/jit-test-exclude.txt` skips subsystems the minimal embed can't support
(Debugger, asm.js, Ion-recovery introspection, …). Tests needing absent shell builtins
(`createIsHTMLDDA`, etc.) fail as embed limitations, not JIT bugs — add them there.

### disassembler + codegen tests
`GECKO_WJ_WASMDUMP=<line>` makes the JIT dump the wasm it emitted for the function on
that source line (`/tmp/wbjit_<line>.wasm`) at compile time — non-perturbing. `main.ts`
wraps this with `wasm-dis` (binaryen):
```
node bench/main.ts disas <file.js> --fn NAME       # print the WAT the JIT emitted for NAME
node bench/main.ts disas <file.js> --line N --grep 'f64\.'   # filter WAT lines
```
The function must get hot (call-count trigger), so the file must call it many times.

`bench/disas/*.js` are FileCheck-style codegen regression tests — a file that drives one
function hot, with directives in leading comments:
```
// FN: fma                  function to disassemble (required)
// CHECK-COMPILES           assert it compiled (didn't bail to PBL)
// CHECK: f64.add           WAT must contain (regex)
// CHECK-NOT: call $fimport  WAT must NOT contain (e.g. no helper hop)
// CHECK-COUNT-2: f64.mul   exactly N matches
```
`node bench/main.ts disastest [names]` runs them and exits nonzero on any failure — so a
codegen regression (an op that starts bailing, or a fast path that turns into a helper
call) is caught mechanically.

### microbenches/
Small single-purpose benches that each isolate ONE JIT codegen path, in the same
`class Benchmark { setup?(); runIteration(); result() }` shape as JetStream. `result()`
returns a checksum so `micro --ab` DIFFs the JIT-vs-PBL result for correctness (no
fragile hardcoded constants) alongside the perf ratio + bail survey: `prop-mono`
(fixed-slot IC), `prop-poly` (shape-list IC), `array-dense` (StoreElementHole/bounds),
`int-arith` (fallible overflow), `float-arith` (unboxed double), `mathfn` (Math.* /
MMathFunction), `call-poly` (call IC), `alloc` (inline nursery alloc), `string-ops`
(charCodeAt/rope/compare), `try-catch` (deopt-in-error). Add one by dropping a
`Benchmark`-class file in.

## Build
```
bash bench/spidermonkey.js/fastjit.sh     # after editing WasmJit*.cpp (recompile+relink)
bash bench/spidermonkey.js/build.sh       # embedder-only relink (faster)
```
Both honor `EMSDK` (default `/home/claude/emsdk`, emscripten 6.0.1) and read the
engine objects from `obj-js-emscripten/` + the JIT source from `firefox/js/src/wasm/`.

## Run  (`node bench/main.ts <suite> [names...] [flags]`)
```
node bench/main.ts octane                       # default octane set, JIT
node bench/main.ts octane richards splay --ab   # JIT vs PBL ratio, specific benches
node bench/main.ts jetstream --ab --bails       # JetStream2 + per-op bail survey
node bench/main.ts jetstream cdjs --iters 20     # one bench, 20 timed iters
node bench/main.ts micro --ab --bails            # JIT-path probes: ratio + sum-diff + bails
node bench/main.ts micro mathfn float-arith       # specific probes
node bench/main.ts ubo --ab                      # uBlock filter-compile (cwd=repo root)
node bench/main.ts realapp acorn                 # parse acorn, DIFF jit-vs-pbl result
node bench/main.ts list                          # known bench names
```
Flags: `--pbl` (JIT off baseline), `--ab` (run both, print ratio), `--bails`
(collect unsupported-op survey from stderr), `--iters N` / `--warm N`
(JetStream/realapp), `--gczeal N`, `--nursery-mb N`, `--timeout S`. Any `GECKO_*`
env var is forwarded to the embed (e.g. `GECKO_WJ_DEOPTHIST=1`, `GECKO_NOWASMJIT=1`).

Each bench runs in its own `node __exec` child (fresh embed) so a crash/leak in one
cannot perturb another — run them serial and clean.
