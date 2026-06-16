# Stubs

Anything stubbed, faked, disabled, or short-circuited to make the wasm build/run
progress gets recorded here, so we never lose track of what's not actually real.

Format: `- [area] what was stubbed — why — where (file:line) — how to un-stub`

## Active stubs
- [embedder] `pthread_setname_np` — no-op stub in `embed/embed.cpp`. The
  single-threaded emscripten libc doesn't provide it but SpiderMonkey's threading
  code references it. Thread naming is meaningless single-threaded. Un-stub: if we
  ever enable real pthreads, drop the stub (emscripten -pthread libc provides it).
- [xpcom] `BinaryPath::Get` (xpcom/build/BinaryPath.h) returns synthetic "/firefox"
  on emscripten — wasm has no executable path. Un-stub: derive resource/greprefix
  dirs from the emscripten virtual FS layout once embedding FS is set up.
- [embedder/render] RESOLVED — the render path now does a REAL `LoadURI` (no DOM
  injection). The earlier data: NS_ERROR_CONTENT_BLOCKED was the e10s parent-process
  document-channel block (ParentProcessDocumentChannel::RedirectToRealChannel);
  fixed by `MOZ_FORCE_DISABLE_E10S=1` (set via emscripten ENV in a preRun callback).
  embed-xul.cpp xul_render: LoadURI(uri, {triggeringPrincipal=SystemPrincipal}) ->
  SpinEventLoopUntil(current-doc-URI matches AND readyState COMPLETE) ->
  PresShell::RenderDocument -> BGRA. Still runtime-tweaked (not stubs of the render):
  jsonview content-sniffer removed (catMan->DeleteCategoryEntry), stylo-threads=1
  (sequential; parallel stylo also works now via build-std), data_uri.block_toplevel
  =false.
- [necko/WISP] emscripten SOCKFS sockets routed over WISP instead of raw TCP-over-
  WebSocket: wisp-bridge.js replaces the global `WebSocket` (main thread) with a shim
  that opens a WISP stream (multiplexed over one real WISP WebSocket) per SOCKFS
  socket. Not a stub of behavior — it IS the networking backend (per GOAL.md). Only
  active when `WISP.install(Module, wispUrl)` is called (index.html preRun when
  ?wisp= is set). Without it, no network (data: only). DNS: synthetic emscripten IPs
  are mapped back to hostnames via DNS.lookup_addr in the shim.
- [telemetry/glean] glean's dispatcher made SYNCHRONOUS on emscripten
  (third_party/rust/glean-core/src/dispatcher/mod.rs): launch() runs tasks inline,
  Dispatcher::new() doesn't spawn the worker thread, flush_init/block_on_queue[_timeout]
  skip the worker handshake (all `#[cfg(target_os = "emscripten")]`). The prebuilt
  single-threaded emscripten Rust std can't spawn threads ("current thread handle
  already set"); glean's dispatcher was the one Rust thread spawned on the render
  path (stylo is already sequential via layout.css.stylo-threads=1). Telemetry isn't
  uploaded in this embedding anyway. NOTE: edits to a vendored crate require updating
  third_party/rust/glean-core/.cargo-checksum.json (sha256 of the file). Un-stub:
  build std with +atomics (-Zbuild-std) so Rust threads work, then revert.
- [profiler] `profiler_register_page` / `profiler_capture_backtrace` /
  `profiler_capture_backtrace_into` (tools/profiler/core/platform.cpp) changed from
  `MOZ_RELEASE_ASSERT(CorePS::Exists())` to an early-return guard (matching the
  existing `profiler_unregister_page` pattern). The minimal embedding skips XRE
  startup so the profiler is never `profiler_init`'d (CorePS never created); these
  are called unconditionally from the render path (WindowGlobalChild ctor,
  PresShell::Init). Calling profiler_init instead HANGS on emscripten (likely
  SharedLibraryInfo::Initialize/PlatformInit). Un-stub: if we ever want profiling,
  make profiler_init work on emscripten (skip the hanging steps) and revert these.

- [toolchain/WISP] `_emscripten_lookup_name__proxy: 'sync'` added in the emscripten
  sysroot's `src/library.js` (the synthetic-DNS forward lookup). emscripten's
  `$DNS.address_map` (hostname <-> 172.29.x.x synthetic IP) is per-thread JS state;
  getaddrinfo runs on Gecko's DNS-resolver pthread (populating that worker's map),
  but the proxied socket syscalls + the WISP WebSocket shim run on the main thread,
  so the shim's reverse `DNS.lookup_addr` missed -> WISP CONNECT went to the raw
  172.29.x.x IP and the connection failed. Proxying the forward lookup to main makes
  both forward and reverse use main's map. NOTE: lives in the user's emsdk, not the
  repo (like the sendfile.h restore) -- re-apply if emsdk is reinstalled.
- [toolchain] Restored `sys/sendfile.h` into the emscripten sysroot
  (`/usr/lib/emsdk/upstream/emscripten/cache/sysroot/include/sys/sendfile.h`).
  emcc trims this standard musl header but musl provides `sendfile()`; NSPR's
  Linux I/O path (`nsprpub/pr/src/pthreads/ptio.c`) includes it. Not a stub of
  behavior, just a missing-header restore. NOTE: this lives in the user's emsdk,
  not the repo — re-apply if emsdk is reinstalled.

## Disabled features (full-engine build; not stubs of behavior, just turned off)
- [js] `--disable-ctypes` (mozconfig.full.emscripten). js-ctypes is a JS->native
  library FFI (needs libffi/dlopen); meaningless in wasm and emscripten ships no
  ffi.h. Un-disable: only if a JS API we need pulls in ctypes (none for rendering).
- [security/NSS] NSS command-line tools (certutil, pk12util) not built for
  emscripten — `gyp_vars["build_nss_cmds"]=0` in security/moz.build, gated in
  security/nss/nss.gyp (+ `build_nss_cmds%` default in coreconf/config.gypi). They
  are standalone dev/test executables, unused by the engine, and wasm-ld rejects
  the duplicate symbols between each tool's objects and the shared NSS libs.
  NSS itself (libnss3/ssl3/smime3/...) still builds. Un-disable: not needed.
- [netwerk] `moz-icon:` protocol + `nsIconURI.h` excluded for headless
  (netwerk/base/nsNetUtil.cpp, mirroring the existing XP_IOS exclusion). The OS
  file-icon channel (image/decoders/icon/<platform>) has no headless impl and the
  dir isn't in DIRS for headless. Un-disable: only if we add an icon channel.

## Non-stub source fixes (real ports, not stubs — kept here for visibility)
- NSS static softoken (security/nss/lib/nss/nss.gyp): `nss3_deps` now depends on
  `pk11wrap_static` (instead of `pk11wrap`), pulling the static softoken chain
  (pk11wrap_static -> softokn_static -> freebl_static, all defining
  NSS_STATIC_SOFTOKEN). wasm has no dlopen, so softoken can't be loaded as a separate
  PKCS#11 .so; the static chain makes pk11load.c call NSC_GetInterface directly and
  links freebl in (FREEBL_NO_DEPEND). Folded into libnss3, so libxul is unaffected.
  Needed because http(s) channel creation forces NSS_NoDB_Init via net_EnsurePSMInit.
- FreeType: build Gecko's in-tree FreeType 2.14.3 (`tree_freetype` enabled for
  EMSCRIPTEN in toolkit/moz.configure) instead of emscripten's bundled 2.6.0 port,
  which lacks FT_Done_MM_Var / variable-font / COLRv1 APIs the font code uses.
- protobuf `PROTOBUF_CONSTINIT` suppressed for emscripten (port_def.inc): its
  libc++ std::string default ctor isn't constant-initializable; falls back to a
  normal global constructor (correctness-neutral).
- libevent emscripten event-config.h: EVENT__SIZEOF_OFF_T / _TIME_T set to 8
  (emscripten/musl are time64 + 64-bit off_t; the generic 32-bit branch assumed 4).
- Headless toolkit widget gaps filled to behave like a real toolkit: nsLookAndFeel
  (widget/headless/nsLookAndFeel.h alias + HeadlessLookAndFeelGTK.cpp built for
  headless), Theme scrollbar (ScrollbarDrawingAndroid), do_CreateNativeThemeDoNot
  UseDirectly (widget/Theme.cpp: ANDROID -> ANDROID||MOZ_WIDGET_HEADLESS, returns
  the non-native in-content Theme since headless has no native theme),
  nsLayoutUtils system font,
  nsMediaFeatures -moz-platform (Linux), GeckoChildProcessHost ProcessLauncher
  (LinuxProcessLauncher), process_util_posix kFDDir/kSystemDefaultMaxFds, and
  nsXREDirProvider user-data dir (direct $HOME, Android-style). Single-process so
  the child-launch paths never run at runtime.

## Non-stub source fixes (Phase 1, SpiderMonkey)
- `mfbt/Assertions.h`: wasm `MOZ_CrashSequence` now `__builtin_trap()` instead of
  writing to address 0 (the upstream "unsupported arch" fallback, which silently
  corrupts wasm linear memory at addr 0 instead of trapping).
- `js/src/gc/Memory.cpp`: `__wasi__` low-level page-mapping guards extended to
  `__EMSCRIPTEN__` (posix_memalign/free instead of mmap+partial-munmap, which
  emscripten can't do).
- `js/src/util/NativeStack.cpp`: emscripten `GetNativeStackBaseImpl` uses
  `emscripten_stack_get_base()` (pthread-based discovery returns 0 single-threaded).
- Embedder calls `js::DisableExtraThreads()` (no helper-thread pool without pthreads).
