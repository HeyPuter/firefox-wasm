# ubo-bench — uBlock Origin compile hot-loop benchmark

A self-contained benchmark of uBlock Origin's **static network filter compile +
load** path — the interpreted hot loop that pegs the gecko-wasm Gecko main
thread for ~60–90 s when uBlock activates (diagnosis: it's *not* a loop, it's
this heavy interpreted work running on the single shared thread; see the
`gecko-wasm-ublock-perf` memory). Use it to drive JS→WASM JIT optimization.

## What it does

Mirrors uBlock's real code (vendored under `ubo-src/`, uBlock 1.71.0):

- **compile** — `µb.compileFilters()` (storage.js): `sfp.AstFilterParser.parse()`
  every line + `StaticNetFilteringEngine` `FilterCompiler.compile()` → compiled-list string.
- **load** — `snfe.fromCompiled()` + `snfe.freeze()`: builds the bidi/hostname tries.

Cosmetic/scriptlet filters are **parsed** (the parser is shared and hot) but not
compiled — those engines are browser-API-bound and out of scope. WASM tries are
disabled (`vAPI.canWASM=false`) so everything is pure JS the JIT can lower —
this matches the interpreted reality (the trie *insert* logic is JS regardless).

`easylist.txt` = ~64k network + ~24k cosmetic filters, a realistic per-list load.

## Run it

In the gecko-wasm `js` shell (the JIT target — run from this dir):

```sh
js bench-shell.js                                          # easylist.txt, 5 iters
js bench-shell.js easylist.txt 8
js bench-shell.js easylist.txt,easyprivacy.txt,filters.min.txt 5
```

Inside the embedded engine (geckoEval, real chrome runtime):

```sh
node run-geckoeval.cjs easylist.txt 5
```

Native baseline (host node / V8):

```sh
node run-node.mjs easylist.txt 5
```

Each prints per-run `compile` / `load` / `total` ms. Run 0 is cold; runs 1+ are
steady-state (JIT warmed). For V8 baseline expect ~220 ms compile + ~60 ms load.

## Rebuild the bundle

```sh
./build.sh          # needs esbuild on PATH or ESBUILD=/path/to/esbuild
```

Produces `build/compile-bundle.iife.js` (globalThis.uboBench, for the shell /
geckoEval / browser) and `build/compile-bundle.mjs` (ESM, for node). Unminified
with `--keep-names` so function names survive in profiles.

## Files

- `driver.mjs` — the benchmark (entry for both bundles); `runOnce`/`bench`/`compileList`/`loadCompiled`.
- `shim.mjs` — minimal globals (`vAPI`, `self`, `CSS`) the SNFE graph needs.
- `bench-shell.js` / `run-node.mjs` / `run-geckoeval.cjs` — runners.
- `ubo-src/` — vendored uBlock js/ + lib/ (the real source being bundled).
- `data/` — real filter lists (easylist, easyprivacy, filters.min).

## Profiling tips

`uboBench.compileList(raw)` and `uboBench.loadCompiled([compiled])` are exposed
separately so you can isolate the parser+compiler from the trie build. The
hottest functions live in `ubo-src/js/static-filtering-parser.js` (char-scanning
state machine), `static-net-filtering.js` (`FilterCompiler`, tokenizer) and
`biditrie.js` (typed-array trie ops) — all branchy/string/typed-array heavy.
