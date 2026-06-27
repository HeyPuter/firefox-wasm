# gecko-wasm



# BUILD INSTRUCTIONS

need packages installed
- libpulse-dev
- node + pnpm (for the gecko.js bundle)

- emsdk install 6.0.1
- emsdk activate 6.0.1
- rustup target add wasm32-unknown-emscripten
- make firefox
- make vendor
- make            # builds the gecko.js package





Mozilla's Gecko engine (Firefox/SpiderMonkey) ported to browser **WebAssembly**
(emscripten, `wasm32-unknown-emscripten`): single-process, no e10s, no JIT
(Portable Baseline Interpreter), WISP networking, rendering web content to a
`<canvas>`. `firefox/` is a fork of `mozilla-firefox/firefox` carrying the
in-tree port patches; **`gecko.js/`** is the embeddable package (the engine
artifacts + an ESM API), consumed by the `embed-demo/` and `chrome-demo/` Vite
demos. (The old `embed-xul/` + `embed-chrome/` stub dirs have been removed.)

---

## What the build scripts already do

| script | does |
|---|---|
| `make build` | configure + compile the whole engine → `obj-full-emscripten/dist/bin/libxul.so`, then relink libxul/libnss3/libgkcodecs as `-r` relocatable objects (`gecko.js/build/relink-engine-r.sh`; an emscripten 6.0.1 wasm-ld `-shared` workaround, run between two `mach build` passes). |
| `make libxul` (default `make`) | build the engine (if needed) then the gecko.js package: stage a MINIMAL GRE + emcc-link `gecko.js/build/embed-xul.cpp` + `libxul` → `gecko.js/wasm/gecko.{js,wasm,data,worker.js}`, then the rspack ESM bundle → `gecko.js/dist/`. |
| `make embed-demo` / `make chrome-demo` | build the library, then run its Vite demo (serves with COOP/COEP — required for `SharedArrayBuffer` / cross-origin isolation — and a WISP proxy at `/wisp/`). `make run` is an alias for `embed-demo`. |

Everything below is **NOT** done by those scripts — it's environment/toolchain
setup you must do once per machine, plus the regeneration of a few build inputs
that are intentionally gitignored.

---

## 1. Prerequisites (exact versions this was built with)

- **emsdk** — `emcc` **6.0.1** (clang 23), which bundles **binaryen v130** (accepts
  the wasm features `rustc` 1.95 / LLVM 22 emits — no separate binaryen needed).
  `em_config` reads `$EMSDK` (defaulting to `/usr/lib/emsdk`) and uses the bundled
  binaryen at `$EMSDK/upstream`; override with `EM_BINARYEN_ROOT` if ever needed.
- **Rust** `rustc` **1.95.0**, with:
  - `rustup target add wasm32-unknown-emscripten`
  - `rustup component add rust-src` (needed for `-Z build-std`, see step 2)
- **Node + pnpm** (`pnpm@9.12.0`, via corepack) — for the gecko.js rspack bundle
  and the Vite demos.
- **Playwright** — only for the dev/test harness in `llm_tests/`; reuses a Chromium
  from `~/src/puter/node_modules/playwright`.
- **`@mercuryworkshop/wisp-js`** — runtime networking; the demos run a WISP proxy
  on the Vite dev server (`/wisp/`).

> The build is path-independent: `em_config` derives its paths from `$EMSDK` +
> `PATH`, `mozconfig.full.emscripten` derives the objdir and FreeType include from
> `$topsrcdir`, and `gecko.js/build/` locates the objdir relative to itself — so
> nothing needs editing wherever you clone. libclang defaults to mach bootstrap's
> copy (`$MOZBUILD_STATE_PATH/clang/lib`); export `LIBCLANG_PATH` to use a
> distro/CI libclang instead.

## 2. Rust std dependency vendoring (gitignored — regenerate)

The wasm build compiles the Rust **standard library from source** via
`-Z build-std` (enabled, emscripten-gated, in the committed
`config/makefiles/rust.mk` patch). That pulls std's own dependency tree
(`dlmalloc`, `wasi`, `unwinding`, `addr2line`, `hashbrown`, the per-target
backends — 40 registry crates from rust-src's `library/Cargo.lock`) which must
be **vendored into `firefox/third_party/rust/`**. These are gitignored
(toolchain inputs, not Firefox source — distinct from the 7 crates we patched,
which *are* committed).

A plain `cargo vendor` of std's workspace does **not** work (std uses the
`rustc-std-workspace-*` shims), so use the bundled `vendor-std-deps.py`: it reads
std's `Cargo.lock` and vendors each dependency directly (locate-or-download the
`.crate`, verify it against the lock checksum, extract, write
`.cargo-checksum.json`).

```sh
python3 vendor-std-deps.py             # idempotent; downloads any missing std-dep crates
python3 vendor-std-deps.py --dry-run   # just report present/missing, no changes
```

It **skips** crates already present — including Gecko's own unsuffixed `<name>/`
when the version matches — so it never touches the committed, patched crates
(`libc`, `socket2`, `uniffi_core`, `mls-rs-core`, `mtu`, `pkcs11-bindings`,
`glean-core`). On a complete tree, `--dry-run` reports `present=40 missing=0`
(verified). If `mach build` later errors with a cargo checksum / "failed to
verify" message, this vendoring is incomplete — re-run the script.

## 3. Build

From the repo root, `make` drives the whole pipeline (firefox → vendor → engine →
gecko.js bundle):

```sh
make            # = make libxul: engine (obj-full-emscripten/dist/bin/libxul.so) + the
                #   gecko.js package (gecko.js/dist/). ~25–50 min for a cold engine build.
make build      # rebuild just the engine (e.g. after editing firefox/ sources), incl. the -r relink
make configure  # force a reconfigure (after a mozconfig / moz.build / moz.configure change)
```

`make build` runs `mach build` twice with `gecko.js/build/relink-engine-r.sh` in
between: emscripten 6.0.1's wasm-ld SIGSEGVs on the `-shared` libxul link, so the
engine libs are relinked as `-r` relocatable objects (which the embedder
static-links into one module) and a second `mach build` finishes the resource tiers.

## 4. Run

```sh
make embed-demo   # build the library + serve the basic embed demo (Vite, COOP/COEP + WISP at /wisp/)
make chrome-demo  # same, for the full Firefox front-end demo
# open the printed http://127.0.0.1:<port>/ in a browser (must be cross-origin isolated)
```

`make run` is an alias for `make embed-demo`. Consume the built package directly with
`import { Gecko } from 'gecko.js'` — `new Gecko({ canvas, wispUrl }); await g.init();
g.load(url)` (GPU via `env.GECKO_GPU`, content-WebGL passthrough via
`env.GECKO_GL_PASSTHROUGH`).

---

## Notes

- All **in-tree engine patches** (build-system wasm target, the 7 Rust crate
  fixes, headless gfx backend, libevent emscripten config, etc.) are **committed
  in `firefox/`** — applied automatically on clone; you don't reapply them.
- `firefox/` is the Gecko engine fork (`MercuryWorkshop/firefox`) — not committed
  here; **`make firefox`** shallow-clones it (depth 1) at the pinned commit
  (`FIREFOX_REF` in the `Makefile`). `make` runs the whole pipeline
  (firefox → vendor → build → gecko.js bundle).
- Gitignored & regenerable (not published): `obj-*-emscripten/` build trees, the
  std-vendor crates (step 2), and the build outputs (`gecko.js/wasm/gecko.*`,
  `gecko.js/dist/`, `gecko.js/build/lib*.stripped.so` + `gre-stage/`, logs).
- Dev/verifier scripts live in `llm_tests/` (legacy, embed-xul-era). Each runs its
  own inline server rooted at its directory, so to run one it needs build outputs
  (`index.html`, `gecko.*`) staged alongside it.
```
