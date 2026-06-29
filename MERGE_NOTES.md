# Merge notes — 2026-06-29

Merging the latest MercuryWorkshop changes into both repos. **NOT merging upstream
mozilla-central** — only the MercuryWorkshop forks (`origin`).

The two repos are independent: `firefox/` is gitignored in the outer `firefox-wasm`
repo (no submodule). Each is merged separately.

## Repo 1 — firefox fork (`/home/claude/firefox-wasm/firefox`, branch `main`)
origin = github.com/MercuryWorkshop/firefox.git. State before merge: **ahead 10, behind 10**.

### Incoming (origin/main, 10 commits, tip 2026-06-29 `e874c4dd3a`)
- `emscripten 6.0.1` toolchain bump (binaryen v117→v130)
- `wasm interpreter` — NEW files `WasmInterp*.{h,cpp,-inl.h}` (decode/jit/obj/run)
- `simd` — NEW `WasmInterpSimdScalar.{h,cpp}`
- `wasm->wasm jit`, `jspi swap`, `kill spectremask`, `fix mozbuild`, misc fixes
- Touches the JS→wasm JIT files only minimally:
  - `WasmJitBackend.cpp` +30: adds `WJElideSpectreMaskIndex` MIR pass + its call in `WJEmitBody`
  - `WasmJitRuntime.cpp` +1: `if (e.directIdx <= 0) e.directIdx = -1;` in `WasmJitObserveCall`
  - These are in DIFFERENT regions than the local JIT work → near-conflict-free.

### Local (ahead 10 + uncommitted): the JS→wasm JIT optimization line
- 10 commits: "jetstream maxxing", "ubo paperclipping", "ehabi, ubo", … (the whole
  JIT backend/runtime/warp evolution: ~7900 insertions across the 4 WasmJit files).
- **Uncommitted (this session): 12 new MIR-op coverage handlers** so the JIT only
  bails where Ion bails (benefits out-of-domain scripts):
  - Default-on, validated (octane + ubo + typescript + acorn, tiny-nursery sound):
    MegamorphicLoadSlotByValue, MegamorphicHasProp, NumberParseInt, ObjectToIterator,
    GuardStringToIndex, GuardValue, GuardSpecificAtom, ObjectStaticProto,
    GuardIndexIsNotDenseElement, MegamorphicSetElement, CallSetArrayLength,
    GuardMultipleShapes. New helper kinds WJH_HASPROP..WJH_INSHAPELIST (48–56).
  - Opt-in (default-bail; correct in isolation but each unblocks a LATENT downstream
    ubo miscompile when it lets a fn compile fully — gated pending root-cause):
    IsCallable (`GECKO_WJ_ISCALL`), HomeObject/HomeObjectSuperBase (`GECKO_WJ_HOMEOBJ`).
  - Per-op bisect gates: `GECKO_WJ_NO_{MLSBV,MHP,PARSEINT,OBJITER,STRIDX,GVAL,GATOM,OSPROTO,GINDE,MSE,CSAL,GMS}`.

## Repo 2 — outer firefox-wasm (`/home/claude/firefox-wasm`, branch `master`)
origin = github.com/MercuryWorkshop/firefox-wasm. State before merge: **behind 9** (no local commits).

### Incoming (origin/master, 9 commits, tip 2026-06-26 `34ad167`)
- `emscripten 6.0.1` + `emsdk updates` + `em_config` (BINARYEN_ROOT now = emsdk-bundled v130)
- build `rewrite`, `sccache and fix`, `disable wasm-opt`, chrome-demo/embed-demo/embed-chrome refresh
- Only one of my locally-modified files overlaps: `embed-js/wasm-host-bridge.js`.

### Local mods (uncommitted, tracked): embed-js harness customizations
- `embed-js/{build.sh,fastjit.sh,embed.cpp,embed.js,run.cjs,octane-run.cjs,wasm-host-bridge.js}`
- Plus many untracked harness/repro/doc files (jetstream/, realapp/, ubo-run.js, jittest-run.cjs, …).

## Toolchain + build verification
Machine had **emsdk 3.1.56**; the merged code expects **emscripten 6.0.1** (binaryen v130).
Steps taken:
1. `git -C /home/claude/emsdk pull` (the meta-repo was too old to know 6.0.1), then
   `make emsdk EMSDK=/home/claude/emsdk` → installed + activated 6.0.1 + applied the
   WasmFS WISP-socket patch (`patch-emsdk-wasmfs.mjs`).
2. **Build-config fix (committed):** the merged in-process wasm interpreter has
   `ENABLE_WASM_SIMD` auto-on for wasm32 and uses `wasm_simd128.h` v128 intrinsics;
   emscripten also requires `-msimd128` to accept the new `-msse2` mozglue `SIMD.cpp`
   path (`mozglue/misc/moz.build`). Neither mozconfig set it → added `-msimd128` to
   `CFLAGS`/`CXXFLAGS` in `mozconfig.js.emscripten` + `mozconfig.full.emscripten`
   (the scalar interp TU opts back out via `-mno-simd128`).

### js-embed (obj-js-emscripten) — VERIFIED WORKING
Rebuilt obj-js via `mach build` (MOZCONFIG=mozconfig.js.emscripten) + `embed-js/build.sh`
on emsdk 6.0.1. libjs_static.a + embed.wasm link cleanly. Octane all correct, no ERR:
richards JIT 2256 / PBL 55 (~41x), navier 9376, splay 1741, raytrace 1897, crypto 1344,
deltablue 645, earley 1598; ubo result correct (net=64250). The merged `WasmJit*` (my 12
new ops + incoming SpectreMaskIndex pass) and the resolved `wasm-host-bridge.js`
(addFunction/directIdx path) all work.

### Known non-blocking lint
`config/check_spidermonkey_style.py` (the `misc`-tier `spidermonkey_checks` stub) fails on
include-ordering + "vanilla header includes an -inl.h" in the INCOMING merge files
(`WasmInterp.h`, `WasmJS.cpp`, `vm/BytecodeUtil.cpp` — all MercuryWorkshop's new code, so
origin/main fails its own lint). This is a developer style lint, NOT a compile/link error;
libjs_static.a and libxul.so still build. Left as-is to avoid diverging from origin.

### full browser (obj-full-emscripten / libxul.so) — ENGINE BUILT
Old libxul.so was 2026-06-19 (emsdk 3.1.56); the toolchain bump forced a full rebuild.
Flow (`make build EMSDK=/home/claude/emsdk`):
1. 1st `mach build`: compiled the whole engine clean (0 errors), then the EXPECTED
   `wasm-ld` SIGSEGV on the libxul.so `-shared` link (masked by `|| true`).
2. `relink-engine-r.sh`: relinked libxul/libnss3/libgkcodecs as `-r` relocatable
   objects → produced a valid 3.7GB `libxul.so` (WebAssembly module, `\0asm`).
3. 2nd `mach build`: SHOULD skip the link and finish — but re-attempted the `-shared`
   link and SIGSEGV'd, clobbering the good libxul.so.

**Build-infra quirk + workaround:** the 2nd `mach build` re-links because the link
rule's prereqs end up newer than libxul.so — `relink-engine-r.sh` relinks libnss3/
libgkcodecs AFTER libxul, and the generated `libxul.so.symbols` (version-script list,
irrelevant to the `-r` link) regenerates newer. Fix applied manually: re-ran the relink,
then `touch`ed the `.symbols.stub`/`.symbols` chain and `dist/bin/libxul.so` LAST so it
is newest; the 2nd `mach build` then skipped the link and finished in 14s, 0 errors.
(A durable fix would `touch` libxul.so at the end of relink-engine-r.sh; left unmodified
to avoid diverging from origin — noted for follow-up.)

### runnable bundle (`make libxul` → libxul.js/wasm/gecko.wasm)
In progress at session end: pnpm install + build-lib.sh staged the gre, embed-xul.cpp
compiled, final static link of embed-xul + libxul (-r) + glue → gecko.{js,wasm}. See
the session log / watcher for the artifact.
