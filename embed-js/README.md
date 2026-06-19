# embed-js — SpiderMonkey-only node harness for fast JS→wasm JIT iteration

Links **`libjs_static.a` only** (no libxul/Gecko) into an 11 MB wasm that runs in plain
`node` — for iterating on the JS→wasm JIT (`firefox/js/src/wasm/WasmJS.cpp`) without the
~7-min full-Gecko + headless-browser loop.

## One-time setup
SpiderMonkey JS-only build with PBL enabled (already done; `obj-js-emscripten/`):
```
# mozconfig.js.emscripten has --enable-portable-baseline-interp[-force] (needed for the
# JIT's PBL hooks + Phase F deopt-resume). Then:
cd firefox && ./mach configure   # MOZCONFIG=../mozconfig.js.emscripten, EM_CONFIG, EMSDK
make -C obj-js-emscripten -j8     # ~15 min; produces libjs_static.a
bash embed-js/build.sh            # link the embedder (full -O)
```

## Fast iteration loop (~21s edit→result)
```
# edit firefox/js/src/wasm/WasmJS.cpp, then:
bash embed-js/fastjit.sh          # recompile JIT TU at -O0 + re-archive libjs + relink (~18s)
node embed-js/octane.cjs richards # ~3s   (or t_jit.js for the deterministic correctness test)
```
`fastjit.sh` uses `-O0` for the C++ compiler only — the JIT's *emitted wasm* is identical, so
it's valid for correctness work. For trustworthy **perf** numbers, do a full
`make -C obj-js-emscripten/js/src` (`-O`) rebuild first.

## Running things
```
node embed-js/run.cjs <file.js> [more.js]      # eval JS file(s) in the embedder
node embed-js/octane.cjs <bench> [bench2 ...]   # run octane bench(es), print OCTSCORE
N=5 node embed-js/octane-ab.cjs [benches]       # A/B JIT-on vs off, min/median, ratio
node embed-js/run.cjs embed-js/t_jit.js         # deterministic JIT/Phase-F correctness check
```
JIT gates are env vars forwarded to the wasm's getenv, e.g.:
```
GECKO_NOWASMJIT=1                # JIT off
GECKO_WJVS_NOUNBOX=1             # boxed Mode VS path
GECKO_WJVS_GVN=1                 # Phase B GVN load-CSE
GECKO_WJVS_FDEOPT=1              # Phase F forced deopt-resume (needs NOUNBOX)
GECKO_DEBUG_JIT=1                # [wj-compile]/[wasm-jit]/resume-fired diagnostics
OCT_VERBOSE=1                    # show full bench stdout
# A/B a gate:   AENV='GECKO_WJVS_NOUNBOX=1 GECKO_WJVS_GVN=1' node embed-js/octane-ab.cjs richards
```

## Files
- `embed.cpp` — minimal raw-JSAPI embedder (JS_Init, context, global, eval). `print` + a
  `console`/`performance` shim; single-threaded (`js::DisableExtraThreads`); GC max raised.
- `build.sh` — compile embed.cpp + link vs libjs_static.a + mozglue/mfbt objects +
  `rust-stubs.c` + `wasm-host-bridge.js`. Full `-O`.
- `fastjit.sh` — `-O0` fast recompile of the WasmJS.cpp unified TU + re-archive + relink.
- `run.cjs` — node runner; forwards `GECKO_*` env to the wasm getenv.
- `octane.cjs` / `octane-ab.cjs` — octane runner / A/B (one subprocess per bench, clean arms).
- `octane-driver.js` — in-engine driver; `RunSuites` runs synchronously (no `window`).
- `rust-stubs.c` — C shims for encoding_rs / mozjemalloc-arena symbols (no Rust lib in the
  JS-only objdir) + `pthread_setname_np`.
- `t_jit.js` — deterministic OO workload + checksum (catches miscompiles/bad resumes).
- `wasm-host-bridge.js` — guest→host WebAssembly bridge (copied from embed-xul).

## Notes
- Octane scores differ from the browser (node's V8 hosts the JIT-emitted wasm differently);
  use them for **A/B within this harness**, not cross-engine absolute comparison.
- `embed.wasm`/`embed.js`/`*.o` are build artifacts (gitignore-able).
- The JS-only build (`mozconfig.js.emscripten`) has no `-pthread` and no Rust staticlib; both
  are worked around here (single-threaded; `rust-stubs.c`). It is NOT the shippable build —
  it exists purely for fast JIT iteration. The real artifact is still the full
  `obj-full-emscripten` / `embed-xul/gecko.wasm`.
