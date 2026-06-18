---
name: gecko-wasm-toolchain
description: "How the gecko-wasm project builds Gecko/SpiderMonkey to browser wasm (emscripten), and the env quirks"
metadata: 
  node_type: memory
  type: project
  originSessionId: 25bae837-7e1b-44e6-b09e-b7d23c56f641
---

Project at `/home/velzie/src/gecko-wasm`: port Mozilla's Gecko engine to browser
WebAssembly (emscripten), render web content to a `<canvas>`, single-process (no
IPC, no pthreads), WISP networking. Goal/STUBS/PROGRESS tracked in repo .md files.
velzie (MercuryWorkshop) — deep emscripten + WISP expertise.

Target is **emscripten** (`wasm32-unknown-emscripten`, emcc/em++), NOT WASI — must
run in browser. Source: `firefox/` (shallow clone of github.com/mozilla-firefox/
firefox main, mozjs 153 / Firefox ~153 nightly).

Build (Phase 1, SpiderMonkey only):
- `export MOZBUILD_STATE_PATH=$HOME/.mozbuild MOZCONFIG=/home/velzie/src/gecko-wasm/mozconfig.js.emscripten`
- from `firefox/`: `./mach configure` then `./mach build`. Objdir `obj-js-emscripten/`.
- Embedder: `embed/build-embed.sh` links `embed/embed.cpp` + libjs_static.a +
  loose mfbt/mozglue/memory/zlib/fmt objects + libjsrust.a → `web/sm.{js,wasm}`.
- Verify: `node test/node-smoke.cjs` and `node test/browser-test.cjs` (Playwright,
  reuses chromium from `~/src/puter/node_modules`).

Env quirks (cost real time, remember them):
- emcc 3.1.56 (clang 19) but rustc 1.95 = LLVM 21 → rust objects carry newer wasm
  features (bulk-memory-opt, call-indirect-overlong) emcc's bundled binaryen v117
  rejects. Fix (current): `em_config` sets BINARYEN_ROOT to a COMPLETE system
  binaryen >=v129 (default /usr, override $EM_BINARYEN_ROOT) so wasm-opt + the
  other binaryen tools are all v129 — emscripten just runs $BINARYEN_ROOT/bin/<tool>.
  (The old toolchain/binaryen symlink-shim was unnecessary and is gone; em_config is
  committed + portable, reads $EMSDK.)
- emscripten TRIMS some musl headers whose functions its libc still provides --
  notably <sys/sendfile.h>. NSPR `nsprpub/pr/src/pthreads/ptio.c` is the ONLY
  emscripten-relevant file that includes it (under `#ifdef LINUX`; our emscripten
  NSPR config is "Linux"). sendfile() itself lives in emscripten's libc -- only the
  header is gone. Fix (current): inline patch in ptio.c -- under `#ifdef LINUX`, an
  `#ifdef __EMSCRIPTEN__` branch declares `extern ssize_t sendfile(int,int,off_t*,
  size_t);` (no sendfile64 needed) instead of #including the header; see
  [[gecko-wasm-source-patches]]. *** DO NOT hand-add the header to the emsdk sysroot
  *** -- not reproducible (built here, failed on a 2nd machine whose pristine emsdk
  lacked it). An earlier `emscripten-shims/sys/sendfile.h` + CFLAGS `-I` approach was
  dropped as overkill for a single include site (and it forced a reconfigure).
- RECURRING ANTI-PATTERN: do NOT hand-edit the system emsdk -- it makes the build
  pass here but fail on a pristine emsdk (sendfile.h above was one; the DNS proxy
  below was another). Repo-local overrides instead: source patches go in firefox/,
  emscripten library overrides go in `embed-xul/wisp-syscalls.js` (a `--js-library`
  that `mergeInto`s LibraryManager.library; later-wins overrides emscripten's
  built-ins). When something "works here, not on a fresh machine", SUSPECT a system
  emsdk edit first: `grep -rln gecko-wasm /usr/lib/emsdk/upstream/emscripten/src`.
- DNS over WISP: Gecko resolves hostnames via emscripten's fake DNS (gethostbyname
  -> `_emscripten_lookup_name` -> $DNS.lookup_name assigns a synthetic 172.29.x.x IP,
  recorded in per-thread $DNS.address_map). The WISP shim (wisp-bridge.js) reverse-
  maps that IP back to the hostname for the WISP CONNECT. $DNS.address_map is
  PER-WORKER, and stock emscripten proxies getaddrinfo to main but NOT
  _emscripten_lookup_name -- so gethostbyname on a DNS-resolver pthread populates
  that worker's map while the (proxied) WISP shim reverse-looks-up main's empty map
  -> CONNECT to the raw 172.29.x.x (symptom: `[wisp] socket ws://172.29.1.0:443`
  with no `(dns host)` suffix). Fix: wisp-syscalls.js overrides _emscripten_lookup_
  name with `__proxy: 'sync'` so alloc + reverse-lookup share main's map. (Was a
  hand-edit to system library.js; now reverted + moved in-tree.)
- Embedder must compile with the lib's ABI flags: `-std=gnu++20 -fno-exceptions
  -fno-rtti -fno-sized-deallocation -fno-aligned-new -DSTATIC_JS_API -DMOZ_HAS_MOZGLUE
  -DNDEBUG -include obj.../js/src/js-confdefs.h -isystem obj.../dist/include`.
- Single-threaded: embedder calls `js::DisableExtraThreads()` after JS_Init (no
  pthreads → helper-thread pool can't init → JS_NewContext would fail).

Build (Phase 2, full engine / libxul):
- `export EM_CONFIG=/home/velzie/src/gecko-wasm/em_config MOZCONFIG=/home/velzie/src/gecko-wasm/mozconfig.full.emscripten`
- from repo root: `./firefox/mach build`. Objdir `obj-full-emscripten/`. Logs:
  `build-full-NN.log`. mach limits stdout to warnings/errors for AI agents (exit
  code is the signal). A full reconfigure+rebuild is ~25-50 min (12 cores).
- mozconfig.full.emscripten: `--enable-application=browser --target=wasm32-unknown-emscripten`
  `--disable-jit --disable-shared-memory --disable-ctypes`, tests/debug/crashreporter/
  updater/backgroundtasks/webrtc off, `--without-wasm-sandboxed-libraries`,
  CC=emcc CXX=em++, CFLAGS/CXXFLAGS add `-I firefox/modules/freetype2/include`
  (in-tree FreeType 2.14.3, NOT emscripten's ancient -sUSE_FREETYPE 2.6.0),
  LDFLAGS `-Wl,--allow-multiple-definition` (benign dup symbols in aux program links).
- **MILESTONE (2026-06-13): the whole engine compiles AND `obj-full-emscripten/dist/bin/
  libxul.so` LINKS** (~3.7GB at -O0). Headless toolkit (MOZ_WIDGET_HEADLESS,
  cairo-headless) reusing the Android FreeType gfx backend; single-process (no e10s).
  Editing moz.build/moz.configure or any mozconfig flag triggers a full reconfigure.
- The web build links THREE engine libs the `mach build` produces in `dist/bin`:
  libxul.so, libnss3.so (NSS fold target + NSPR + static softoken/freebl/sqlite),
  libgkcodecs.so (ogg/opus/vorbis). `embed-xul/restrip-relink-web.sh` stages all
  three into `embed-xul/<lib>.stripped.so` as UNSTRIPPED copies (the final emcc
  link's `-Wl,--strip-debug` strips the combined module; llvm-strip directly
  corrupts these relocatable wasm .so reloc tables). They're gitignored (`*.so`) so
  a fresh checkout MUST regenerate them -- if only libxul is staged the link dies
  `libnss3.stripped.so: No such file or directory`.
- FONTS: the headless gfxFT2FontList reads text fonts from `<process dir>/fonts`
  (= `/gre/fonts` in the web build); the headless toolkit installs NONE (browser/
  fonts ships only TwemojiMozilla.ttf, and only for gtk/windows). `stage-gre.sh`
  seeds `gre-stage/fonts/` (= /gre/fonts) by copying the LiberationSans set vendored
  in the pinned tree at `firefox/toolkit/components/pdfjs/content/web/standard_fonts/
  *.ttf`. Without ANY font there, first layout hits `MOZ_CRASH("No font files
  found")` in gfxFT2FontList::FindFonts -> wasm "RuntimeError: unreachable" (stack:
  PresShell::Init -> gfxPlatform::Init -> ...FindFonts). Earlier builds only worked
  because fonts had been hand-dropped into dist/bin/fonts (not build output).
- stage-gre.sh + restrip-relink-web.sh are now RELEASE-aware (GECKO_RELEASE -> stage
  from obj-full-emscripten-release); fonts live in gecko.data (--preload-file), so
  after changing them you must re-link (`make web`), not just rebuild the engine.

- PORTABILITY (don't regress): the harness build files must NOT hardcode the repo
  path. mozconfig.{full,js}.emscripten derive MOZ_OBJDIR + the FreeType `-I` from
  `$topsrcdir` (set by mach when sourcing the mozconfig; objdir is `$topsrcdir/../
  obj-...`, a sibling of firefox/); the embed scripts compute OBJDIR from their own
  location (`$HERE/..`); libclang is `${LIBCLANG_PATH:-${MOZBUILD_STATE_PATH:-$HOME/
  .mozbuild}/clang/lib}` (export LIBCLANG_PATH for a distro/CI libclang). The GHA
  needs NO mozconfig sed anymore (just sets LIBCLANG_PATH). Symptom of a hardcoded
  path: builds here but on another checkout (e.g. /home/velzie/firefox-wasm) fails
  e.g. "'ft2build.h' file not found" via dist/system_wrappers/ft2build.h's
  #include_next. (llm_tests/ + PROGRESS.md still hold absolute paths -- not build-path.)

See [[gecko-wasm-source-patches]] for the in-tree edits that make the build work.
