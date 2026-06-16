# gecko-wasm

Mozilla's Gecko engine (Firefox/SpiderMonkey) ported to browser **WebAssembly**
(emscripten, `wasm32-unknown-emscripten`): single-process, no e10s, no JIT
(Portable Baseline Interpreter), WISP networking, rendering web content to a
`<canvas>`. `firefox/` is a fork of `mozilla-firefox/firefox` carrying the
in-tree port patches; the repo root holds the embedder + build harness.

---

## What the build scripts already do

| script | does |
|---|---|
| `firefox/mach configure && mach build` | configure + compile the whole engine → `obj-full-emscripten/dist/bin/libxul.so` (~3.7 GB at `-O0`). Incremental C++/Rust-only: `mach build binaries`. |
| `embed-xul/stage-gre.sh` | rsync the GRE runtime resources (`greprefs.js`, chrome, defaults, …) into `embed-xul/gre-stage/` for `--preload-file`. |
| `embed-xul/restrip-relink-web.sh` | copy `libxul.so` → `libxul.stripped.so`, then relink the web embedder. |
| `embed-xul/build-embed-full.sh` | compile `embed-xul.cpp` + link `libxul` + the `MOZ_GLUE_IN_PROGRAM` loose objects + preload the GRE → `embed-xul/gecko.{js,wasm,data}`. |
| `embed-xul/server.cjs` | dev HTTP server: serves `index.html` + `gecko.*` with COOP/COEP (required for `SharedArrayBuffer`/cross-origin isolation) and proxies WISP. |

Everything below is **NOT** done by those scripts — it's environment/toolchain
setup you must do once per machine, plus the regeneration of a few build inputs
that are intentionally gitignored.

---

## 1. Prerequisites (exact versions this was built with)

- **emsdk** at `/usr/lib/emsdk` — `emcc` **3.1.56** (clang 19), bundled `node` 20.18.0.
  (`em_config` hardcodes these paths.)
- **binaryen `wasm-opt` v129** at `/usr/bin/wasm-opt`. emsdk bundles binaryen
  v117, which **rejects** the newer wasm features (bulk-memory-opt,
  call-indirect-overlong) that `rustc` 1.95 / LLVM 21 emits — so a newer
  `wasm-opt` must shadow it (see the shim in step 2).
- **Rust** `rustc` **1.95.0** (LLVM 21), with:
  - `rustup target add wasm32-unknown-emscripten`
  - `rustup component add rust-src` (needed for `-Z build-std`, see step 3)
- **Node + Playwright** — only for the dev/test harness in `llm_tests/`. Those
  scripts reuse a Chromium from `~/src/puter/node_modules/playwright`.
- **`wisp-server-node`** — runtime networking; `server.cjs` `require()`s it
  (vendored under `embed-xul/node_modules/`).

> The absolute paths above (`/usr/lib/emsdk`, the repo path) are baked into
> `em_config` and some scripts. If yours differ, edit `em_config` and the
> `DISTBIN`/`STRIP` constants in `embed-xul/restrip-relink-web.sh`.

## 2. Binaryen shim (gitignored — recreate)

`em_config`'s `BINARYEN_ROOT` points at `toolchain/binaryen`, a directory of
symlinks: every emsdk LLVM tool, with `wasm-opt` overridden to the system v129.
It's machine-specific (symlinks into your emsdk) so it's **gitignored** — recreate it:

```sh
cd <repo>
mkdir -p toolchain/binaryen/bin
ln -sf /usr/lib/emsdk/upstream/bin/* toolchain/binaryen/bin/ 2>/dev/null  # LLVM tools
ln -sf /usr/bin/wasm-opt toolchain/binaryen/bin/wasm-opt                  # override → v129
```

## 3. Rust std dependency vendoring (gitignored — regenerate)

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

## 4. Build

```sh
cd firefox
export MOZBUILD_STATE_PATH="$HOME/.mozbuild"
export EM_CONFIG="$(cd .. && pwd)/em_config"
export MOZCONFIG="$(cd .. && pwd)/mozconfig.full.emscripten"

./mach configure          # first build, and after any mozconfig / moz.build / moz.configure change
./mach build              # full engine → obj-full-emscripten/dist/bin/libxul.so  (~25–50 min, 12 cores)
#   incremental (C/C++/Rust only, much faster): ./mach build binaries
```

Then build the web embedder (from the repo root):

```sh
bash embed-xul/stage-gre.sh           # only needed after the GRE resources change
bash embed-xul/restrip-relink-web.sh  # libxul.so → stripped → gecko.{js,wasm,data}
```

## 5. Run

```sh
node embed-xul/server.cjs             # serves on a local port with COOP/COEP + WISP
# open http://127.0.0.1:<port>/ in Chromium (must be cross-origin isolated)
```

For the full Firefox front-end build, use `embed-chrome/` (its own `server.cjs`
+ `index.html`) the same way.

---

## Notes

- All **in-tree engine patches** (build-system wasm target, the 7 Rust crate
  fixes, headless gfx backend, libevent emscripten config, etc.) are **committed
  in `firefox/`** — applied automatically on clone; you don't reapply them.
- Gitignored & regenerable (not published): `obj-*-emscripten/` build trees, the
  `toolchain/binaryen` shim (step 2), the std-vendor crates (step 3), and the
  build outputs (`gecko.*`, `lib*.stripped.so`, `gre-stage/`, logs, render dumps).
- Dev/verifier scripts live in `llm_tests/` (mirroring `embed-xul/` /
  `embed-chrome/`). Each runs its own inline server rooted at its directory, so
  to run one it needs the build outputs (`index.html`, `gecko.*`) alongside it.
```
