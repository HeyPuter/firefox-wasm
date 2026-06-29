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
  ubo/                    ubo-run.js (uBlock filter-compile; reads ../ubo-bench)
  main.ts                 the unified runner (orchestrator + __exec child mode)
```

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
