---
name: gecko-wasm-source-patches
description: In-tree firefox/ source edits that make the emscripten wasm build work (gecko-wasm project)
metadata: 
  node_type: memory
  type: project
  originSessionId: 25bae837-7e1b-44e6-b09e-b7d23c56f641
---

Edits inside `firefox/` (vs upstream mozilla-central) for the emscripten wasm build
of the gecko-wasm project. Build-system: teaches moz.configure an EMSCRIPTEN target.

Build system (target wiring):
- `python/mozbuild/mozbuild/configure/constants.py`: added `EMSCRIPTEN` to OS +
  Kernel enums; `"EMSCRIPTEN": "__EMSCRIPTEN__"` in kernel_preprocessor_checks.
- `build/moz.configure/init.configure`: split_triplet maps `*-emscripten` →
  OS/kernel `EMSCRIPTEN` (gated by allow_wasi == project=="js" — MUST broaden for
  full-Gecko Phase 2). Added `target_is_emscripten` helper.
- `build/moz.configure/libraries.configure`: moz_use_pthreads excludes emscripten.
- `build/moz.configure/flags.configure`: emscripten joins WASI for rpath-link skip,
  -pie skip, and `-mthread-model single`.
- `build/moz.configure/toolchain.configure`: emscripten joins WASI to skip security
  hardening cflags (fixes __stack_chk_* undefined).
- `build/moz.configure/lto-pgo.configure` (RELEASE/`--enable-lto` only): two
  `elif target.os == "EMSCRIPTEN":` branches emit the ThinLTO import tuning as
  `-Wl,-mllvm,-import-instr-limit=10` / `-import-hot-multiplier=30` instead of the
  clang default `-Wl,-plugin-opt=...` (wasm-ld rejects `-plugin-opt=` as "unknown
  argument"; it DOES accept `-mllvm`). Plain `--enable-lto` resolves to `thin` (not
  `cross`) for emscripten, so rust_lto="" and rustc's LLVM-21 bitcode is NOT
  cross-LTO'd with emcc's LLVM-19 -- no bitcode-version mismatch.

Source ports (correctness, not stubs):
- `mfbt/Assertions.h`: wasm MOZ_CrashSequence → `__builtin_trap()` (upstream wrote
  to address 0, which on wasm corrupts memory + recurses instead of crashing).
- `js/src/gc/Memory.cpp`: all `__wasi__` guards extended to `|| __EMSCRIPTEN__`
  (posix_memalign/free page mapping; emscripten can't mmap+partial-munmap).
- `js/src/util/NativeStack.cpp`: emscripten GetNativeStackBaseImpl uses
  `emscripten_stack_get_base()`.
- `js/src/vm/JSONPrinter.{h,cpp}`: `__EMSCRIPTEN__` added to size_t-overload guard.
- `js/src/irregexp/imported/regexp-bytecodes-inl.h`: SplitNames result `{}`-init
  (clang 19 constexpr).
- `mozglue/misc/PerfStats.h`: AtomicAddDouble CAS-loop (no atomic<double>::fetch_add
  in emcc 3.1.56 libc++).

Phase 2 (full engine, mozconfig.full.emscripten — WIP) additional edits:
- `build/moz.configure/init.configure`: allow_wasi=True always (wasm triples for any
  project, not just js).
- `config/external/nspr/pr/moz.build`: EMSCRIPTEN OS_TARGET branch (Linux-like, no asm).
- `config/external/nspr/prcpucfg.h`: `__EMSCRIPTEN__` → include md/_linux.cfg.
- `nsprpub/pr/include/md/_linux.cfg`: `__wasm32__` data-model branch (ILP32 LE).
- `nsprpub/pr/include/md/_linux.h`: `_PR_SI_ARCHITECTURE "wasm32"`.
- `nsprpub/pr/src/pthreads/ptio.c`: under `#ifdef LINUX`, an `#ifdef __EMSCRIPTEN__`
  branch declares `extern ssize_t sendfile(int,int,off_t*,size_t);` instead of
  `#include <sys/sendfile.h>` (emscripten trims that musl header but its libc still
  has sendfile()). Only emscripten-relevant includer; no sendfile64. See
  [[gecko-wasm-toolchain]] (replaces the dropped emscripten-shims/ approach).
- `toolkit/moz.configure`: EMSCRIPTEN → toolkit `cairo-headless` (MOZ_WIDGET_TOOLKIT
  = headless; widget/ builds only the offscreen widget/headless backend, no GTK).
Phase 2 full mozconfig opts: --enable-application=browser, --disable-jit,
--disable-shared-memory, --without-wasm-sandboxed-libraries,
--with-libclang-path=~/.mozbuild/clang/lib, lots of --disable-*. Build with intl (ICU).

Phase 2 additional walls fixed (full build, after headless toolkit):
- `ipc/chromium/src/base/platform_thread.h`: emscripten `PlatformThreadId = pid_t`.
- `config/makefiles/rust.mk`: cargo `--frozen` → `--offline`.
- `third_party/rust/uniffi_core/src/ffi/rustfuture/mod.rs`: wasm-single-threaded cfg
  gates → plain wasm32 (+ updated `.cargo-checksum.json`).
- `ipc/chromium/src/third_party/libevent/emscripten/` config + libeventcommon.mozbuild
  branch (poll/select only; no epoll/sendfile). NOTE: buffer.c may still pick linux
  config — verify include path / backend regen.
- `config/external/icu/data/icu_data.S`: __EMSCRIPTEN__ added to __wasi__ .section branches.
- `xpcom/build/BinaryPath.h`: emscripten synthetic path.

MILESTONE: the ENTIRE Gecko engine now compiles to wasm32-emscripten (all C++ +
all Rust crates). Key SYSTEMIC fix: bindgen was dropping every extern "C" function
for wasm — `build/moz.configure/bindgen.configure` basic_bindgen_cflags EMSCRIPTEN
branch needs `--target=wasm32-unknown-emscripten` AND `-fvisibility=default`
(bindgen skips hidden-visibility functions). Plus per-crate fixes (all + checksums):
uniffi_core, mls-rs-core, mtu, socket2, libc(in6_pktinfo), pkcs11-bindings(allowlist
CK_.*); rust.mk --frozen→--offline; pixman PIXMAN_NO_TLS; cairo PDF excluded for
headless; icu_data.S wasm .section; BinaryPath/platform_thread/UniquePtrExtensions
(DuplicateFileHandle) emscripten cases; headless GfxInfo (widget/headless/GfxInfo.*
+ components.conf).

CURRENT FRONTIER (next major sub-phase): the GRAPHICS PLATFORM backend. headless
toolkit has no gfxPlatform (#error in gfx/thebes/gfxPlatform.cpp) and no FreeType
font backend. Plan: enable MOZ_ENABLE_FREETYPE + FT backend sources for headless in
gfx/2d/moz.build (emscripten PROVIDES FreeType as a port — headers in its sysroot,
link with -sUSE_FREETYPE); create a headless gfxPlatform (model gfxAndroidPlatform,
~510 lines) + a bundled font + software DrawTarget; fix style crate PlatformThreadHandle.
Then the ~100MB+ libxul LINK, runtime bring-up, WISP networking, RenderDocument→canvas.
All edits UNCOMMITTED in firefox/. Full state + exact frontier in
/home/velzie/src/gecko-wasm/PROGRESS.md.

GPU under headless (2026-06-15): `gfx/thebes/gfxPlatform.cpp` InitCompositorAccelerationPrefs wraps the `if (IsHeadless()) feature.ForceDisable(HW_COMPOSITING ...)` block in `#ifndef __EMSCRIPTEN__` — on emscripten MOZ_HEADLESS only means no native window, not no GPU (WebGL2 via GLContextProviderEmscripten), so headless must NOT force software WebRender. Needed for the full-chrome build (sets MOZ_HEADLESS=1) to composite on the GPU. Detail in [[gecko-wasm-gpu-integration]].

Cross-origin isolation / SharedArrayBuffer (2026-06-15): content reported `crossOriginIsolated:false` and `SharedArrayBuffer is not defined` EVEN for sites with valid COOP/COEP (works in real Firefox). Root cause: `docshell/base/BrowsingContext.cpp` `BrowsingContext::CrossOriginIsolated()` hard-requires `XRE_IsContentProcess() && remoteType startsWith WITH_COOP_COEP_REMOTE_TYPE_PREFIX` -- i.e. it detects COI by "am I in the dedicated webCOOP+COEP CONTENT PROCESS?". Our embedder is SINGLE-PROCESS (e10s/Fission off), so that's never true and COI is always false. NOT a security/header issue. FIX: under `#if defined(__EMSCRIPTEN__)`, drop the content-process check and key COI off just the pref + `Top()->GetOpenerPolicy() == OPENER_POLICY_SAME_ORIGIN_EMBEDDER_POLICY_REQUIRE_CORP` (the combined value encodes COOP:same-origin AND COEP:require-corp; it IS computed in-process by DocumentLoadListener since our single process is the parent). Non-isolated docs still report false. The downstream SAB gate (GlobalObject.cpp JSProto_SharedArrayBuffer -> `IsSharedMemoryAllowedInternal` -> `CrossOriginIsolated()`) then exposes SharedArrayBuffer. VERIFIED: wasm-sab-test.html in content -> crossOriginIsolated=true, typeof SharedArrayBuffer=function, SAB_OK Atomics=43. server.cjs already sends COOP same-origin + COEP require-corp + CORP cross-origin. (Pref `dom.postMessage.sharedArrayBuffer.bypassCOOP_COEP.insecure.enabled` would force SAB on but leaves self.crossOriginIsolated=false, so the proper fix is the BrowsingContext patch.) BrowsingContext.cpp is in Unified_cpp_docshell_base0.o.

Stub: `pthread_setname_np` no-op in embed/embed.cpp. See [[gecko-wasm-toolchain]].
