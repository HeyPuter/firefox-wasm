---
name: gecko-wasm-runtime-frontier
description: "After libxul builds to wasm: the static-link recipe that works, and the xptcall problem that's the central remaining blocker for running Gecko on wasm"
metadata:
  node_type: memory
  type: project
  originSessionId: 25bae837-7e1b-44e6-b09e-b7d23c56f641
---

Full Gecko engine BUILDS green to wasm (see [[gecko-wasm-toolchain]] Phase 2). The
runtime bring-up frontier, established by an empirical static-link probe in
`embed-xul/` (build-embed-full.sh):

STATIC LINK WORKS and is the right model (the default firefox.wasm+libxul.so split
is NOT runnable — firefox.wasm imports only ~20 syscalls). Recipe:
- `MOZ_FOLD_LIBS` enabled for EMSCRIPTEN (toolkit/moz.configure) folds NSPR into
  libxul and NSS into libnss3 — eliminates inter-lib duplicate symbols
  (libVersionPoint, __cxa_pure_virtual) that wasm-ld can't tolerate (no
  --allow-multiple-definition).
- Strip libxul.so first: 3.7GB (87% DWARF) → 477MB via `llvm-strip --strip-debug`.
- Link: `em++ embed.o libxul.stripped.so libnss3.stripped.so <emscripten settings>`
  with INITIAL_MEMORY≥512MB. Link only libnss3 (NOT nssutil3/ssl3 — they dup
  *_Util/PORT_*/DER_*). Output: **gecko.wasm ≈ 174MB** (real loadable size).
- libxul.so is a `--relocatable` wasm object, so undefined symbols are deferred to
  this final link (the green `mach build` doesn't catch them). Two headless build
  gaps surfaced here and were fixed in moz.build (compiled for headless):
  widget/nsNativeTheme.cpp, uriloader/exthandler/unix/{nsMIMEInfoUnix,nsGNOMERegistry}.cpp.

REMAINING undefined symbols (366, with -sERROR_ON_UNDEFINED_SYMBOLS=0 they're imports):
- 64 media codecs (aom/ogg/opus/vorbis/vpx/dav1d) — in libgkcodecs/media .so's;
  only for <video>/<audio>, skip for first HTML render.
- freebl (FREEBL_GetVector) → link libfreebl3.so. Misc: pthread_setname_np stub,
  sem_timedwait, sendfile, Skia cairo-ft glue, do_CreateNativeThemeDoNotUseDirectly.
- **THE CRUX — XPCOM xptcall**: `NS_InvokeByIndex` + 247 `nsXPTCStubBase::StubN`.
  Gecko implements these as per-CPU hand-written assembly in
  xpcom/reflect/xptcall/md/unix/ (xptcinvoke_*/xptcstubs_*), selected by OS_ARCH/
  TARGET_CPU; NO wasm backend exists. It's the generic runtime-index/runtime-
  signature C++ virtual-call machinery XPCOM uses for QueryInterface, do_GetService,
  and all JS<->C++ scriptable calls — unavoidable for engine init. Must write
  xptcinvoke_wasm.cpp + xptcstubs_wasm.cpp. Wasm `call_indirect` enforces exact type
  signatures, so the native register-marshaling trick doesn't port; likely approach
  is a libffi-style trampoline using emscripten's untyped JS->wasm-table calls
  (JS can invoke wasmTable.get(idx)(...coercedArgs)) to marshal nsXPTCVariant arrays.
  This is THE central remaining problem of running Gecko on wasm.

NEXT after xptcall: emscripten FS setup (greprefs.js — build emits it to dist/bin —,
chrome/omni resources, a font under <procdir>/fonts/, prefs), NS_InitXPCOM, then
Phase 4 (PresShell::RenderDocument -> Moz2D DrawTarget -> canvas) and Phase 3 (WISP).

RUNTIME BRING-UP UPDATE (2026-06-13): the 174MB module RUNS in node (all global
ctors + main). embed-xul/ has the recipe: static link libxul.stripped.so + glue
objects (mfbt/mozglue/memory/fmt, MOZ_GLUE_IN_PROGRAM) + libnss3 + libgkcodecs,
-sNODERAWFS to read real dist/bin, xul_init() called from JS. NS_InitXPCOM was
driven DEEP: NSPR linker init -> nsThreadManager -> nsComponentManagerImpl::Init
-> nsLayoutModuleInitialize. Fixes en route (all small platform gaps):
  - NSPR _PR_InitLinker dlopen(0)->abort: NO_DLOPEN_NULL for emscripten in
    md/_linux.h. CAUTION: fold intermediates (libnspr4/libnss3) and the
    Unified_c_external_nspr_pr*.o don't reliably relink/recompile on `mach build`
    after a header edit — rm the .o / dist/bin/lib{nspr4,nss3,xul}.so to force it.
  - PlatformThread::CurrentId() fell off end -> added __EMSCRIPTEN__ branch
    (pthread_self()) in ipc/chromium/src/base/platform_thread_posix.cc.
  - ogg_set_mem_functions missing -> link libgkcodecs.
xptcall NOT hit through component-manager/layout-module init (no-chrome path holds).
**THREADING FORK (current blocker):** mozilla::ipc::IOThread::Startup() does
`new IOThreadParent()` (: base::Thread) = a real OS thread; our build is single-
threaded (--disable-shared-memory, no -pthread). Gecko needs threads pervasively
(IO/timer threads, stylo+worker pools, sync cross-thread dispatch), so single-
threaded is impractical. RESOLVED with emscripten pthreads. MILESTONE (2026-06-14): **NS_InitXPCOM returns
NS_OK in wasm** — the engine initializes (component/service/thread managers with
real worker threads, prefs, nsLayoutModuleInitialize, intl). xptcall NEVER hit
through init (no-chrome path holds; trapping stubs uncalled). Key config:
`-pthread` in CFLAGS/CXXFLAGS/LDFLAGS BUT KEEP `--disable-shared-memory` (the JS
SharedArrayBuffer feature; enabling it broke the ArrayBuffer-union WebIDL codegen).
Browser needs COOP/COEP (validated). pthread fixes: PlatformThread::CurrentId
(pthread_self), NSPR NO_DLOPEN_NULL, link libgkcodecs, NEW
intl/locale/headless/OSPreferences_headless.cpp. BUILD-SYSTEM TRAP: a reconfigure
can partially re-run WebIDL codegen (UnionTypes.h fresh, per-binding .cpp stale ->
incomplete-type errors); recover by `rm -rf obj/dom/bindings && mach configure && build`.
NEXT: keep runtime alive (don't NS_ShutdownXPCOM — it trips a Rust-std/emscripten
pthread "thread handle already set" abort), then Phase 4 (docshell + LoadURI +
PresShell::RenderDocument -> DrawTarget -> canvas). Browser harness ready in embed-xul/.

PHASE 4 ATTEMPT (2026-06-14) — KEY FINDING: xul_render (createWindowlessBrowser ->
LoadURI(data:text/html) -> SpinEventLoopUntil -> PresShell::RenderDocument -> Moz2D
SKIA DrawTarget) compiles+links, init OK, but CRASHES creating the docshell at
PermissionManager::GetAsyncShutdownBarrier (getService(nsIAsyncShutdownService) =
JS-implemented) -> C++->JS via the TRAPPING xptcall stub -> "null function or
function signature mismatch". So RENDERING REQUIRES REAL xptcall (the docshell/
permission/observer path pulls in JS services); the no-chrome path only avoided it
for bare NS_InitXPCOM. So the two gating items for a paint are BOTH needed now:
(1) REAL xptcall = libffi-style: NS_InvokeByIndex via untyped JS wasmTable.get(idx)
(...coercedArgs); the C++->JS stubs (nsXPTCStubBase / nsXPCWrappedJS vtable) via
emscripten addFunction(jsShim, sigFromXPTInfo) packing nsXPTCMiniVariant -> CallMethod.
(2) build-std +atomics (vendor ~13 std deps) for the background Rust thread.
Browser also needs Asyncify/PROXY_TO_PTHREAD (SpinEventLoopUntil blocks; Atomics.wait
throws on the browser main thread — validate render in NODE first).

XPTCALL SOLVED (2026-06-14): real wasm xptcall WORKS. Synthetic per-interface vtable
(cached) with addFunction'd JS shims (sig computed from XPT method info) for C++->JS,
wasmTable.get(fp).apply for JS->C++ (NS_InvokeByIndex). See xptc{stubs,invoke}_wasm.cpp
+ xptcall.cpp guard + flags (-sALLOW_TABLE_GROWTH,-sWASM_BIGINT,export _malloc/
_WasmXPTCStubDispatch,addFunction). VERIFIED in node: render blew PAST the
PermissionManager->AsyncShutdown(JS svc) trap and ran deep into the real load:
CreateWindowlessBrowser -> nsDocShell::SetupNewViewer -> nsDocumentViewer::Init ->
nsGlobalWindowOuter::SetNewDocument -> nsGlobalWindowInner::InitDocumentDependentState
-> WindowGlobalChild::Create -> WindowGlobalChild ctor -> profiler_register_page.
NEW BLOCKER (now critical path): the Rust-thread-spawn abort "current thread handle
already set during thread spawn" fires HERE (main thread, no worker.js line this time).
The prebuilt wasm32-emscripten std is single-threaded: thread-locals are shared statics,
so the FIRST thread::spawn sees main's CURRENT handle already set -> abort. stylo-threads=1
didn't help (different thread). Robust fix = -Zbuild-std +atomics (vendoring blocker).
Cheaper bet to try first: find+disable the specific spawn (profiler_register_page path?
glean/FOG dispatcher? both are Rust). Note we never call XRE startup (NS_InitXPCOM
directly), so profiler_init may be skipped and profiler_register_page lazily inits.

RUST-THREAD ROOT CAUSE FOUND (2026-06-14): wrapped pthread_create (embedder
-Wl,--wrap=pthread_create + EM_ASM console stack) to log every spawn. C++/NSPR
threads (PR_CreateThread: Watchdog/TimerThread/PermissionManager/nsHtml5) spawn FINE.
The ONE aborting Rust thread is **glean** (telemetry/FOG): glean_core::dispatcher::
Dispatcher::new -> glean_core::thread::spawn -> std::thread -> Rust thread_start ->
"current thread handle already set" (the prebuilt single-threaded emscripten Rust std
shares the thread-handle TLS as a global; main already set it, so the worker aborts).
stylo is already sequential (stylo-threads=1). So glean is the only Rust thread on the
render path. FIX (instead of build-std): patched vendored third_party/rust/glean-core/
src/dispatcher/mod.rs to be SYNCHRONOUS on emscripten -- launch() runs tasks inline,
new() doesn't spawn the worker (worker=None), flush_init/block_on_queue[_timeout] skip
the worker handshake (cfg(target_os="emscripten")). MUST update .cargo-checksum.json
(sha256 of the edited file) or cargo rejects the vendored edit. Dep lints are
--cap-lints allow so cfg'd-out unused vars don't fail. If OTHER Rust threads appear
later (parallel stylo, WebRender), build-std +atomics is still the eventual robust fix.

DEFINITIVE (2026-06-14): the RENDER PIPELINE RUNS END-TO-END. With fonts staged in
dist/bin/fonts (FindFonts searches NS_XPCOM_CURRENT_PROCESS_DIR/fonts = the GRE dir),
the omnijar null-check, base::TimeTicks::Now (compile time_posix.cc for EMSCRIPTEN in
ipc/chromium/moz.build), and the wait-for-data-doc spin fix, xul_render reaches
PresShell::RenderDocument(rv=0) and returns a BGRA buffer. (data: URLs must avoid '#'
= URL fragment, or be percent-encoded.) BUT actual PIXELS are blocked by the
single-threaded Rust std: the data: doc load drives WebRender, whose rayon pool
(gfx/webrender_bindings wr_thread_pool_new) spawns threads -> "current thread handle
already set" abort. Making it a no-op/phantom pool (spawn_handler returns Ok w/o
spawning) avoids the abort but DEADLOCKS (WR submits work, waits forever for a worker).
A raw-pthread spawn (bypassing std::thread's eager set_current) WON'T work either:
single-threaded std's thread-locals are shared globals, so rayon's per-worker TLS
(worker index, etc.) would corrupt across workers. CONCLUSION: WebRender + parallel
stylo genuinely need real per-thread TLS -> build-std with +atomics is REQUIRED
(no shortcut). The render pipeline is otherwise proven functional. NEXT: build-std
(rust.mk has the commented block; the blocker is vendoring std's deps with versions
that conflict with gecko's vendored crates). For a software-only first paint without
build-std, would need to fully disable WebRender/the compositor (modern Gecko is
WR-only; invasive). The WR wr_thread_pool_new emscripten branch currently = phantom
pool (hangs); revert it when build-std lands so WR spawns real workers.

BUILD-STD +ATOMICS WORKS (2026-06-14): enabled in config/makefiles/rust.mk gated on
`findstring emscripten,$(RUST_TARGET)`: `-Zbuild-std=std,panic_abort` + RUSTC_BOOTSTRAP=1
+ `RUSTFLAGS += -Ctarget-feature=+atomics,+bulk-memory,+mutable-globals`. mach doesn't
rebuild on rust.mk edits -> touch toolkit/library/rust/shared/lib.rs. VENDORING was the
work: cargo --offline + vendored-sources (firefox/third_party/rust) needs EVERY package
in rust-src's library/Cargo.lock present (even other-target deps), at std's pinned
versions which differ from gecko's. Solution: download each from static.crates.io (or
cargo cache), extract into third_party/rust/<name>-<version>/ (version-suffixed dirs
coexist with gecko's name-only; cargo matches by Cargo.toml not dir name), generate
.cargo-checksum.json (package = lockfile checksum = sha256 of .crate; files = sha256 of
each file). ~29 std deps vendored (cfg-if/libc/hashbrown/rustc-demangle at std versions +
object/addr2line/gimli/miniz_oxide/adler2/memchr/foldhash/dlmalloc/cc/unwinding + the
platform stubs windows-*/wasi-*/sgx/efi/hermit/vex/moto/rand/getopts/shlex). RESULT:
std + ALL gecko Rust recompiled with atomics in ~8.5min, 0 errors -> libxul relinked.
Reverted the WR phantom-pool hack so WR spawns real rayon workers. (glean drop-tasks +
stylo-threads=1 left in place, harmless; can revert now that threads work.) Testing
whether real Rust threads finally let the data: doc paint.

POST-BUILD-STD STATE (2026-06-14): with real Rust threads, the render runs FAR:
xul_init/NS_InitXPCOM OK, gfxPlatform + WebRender spawn REAL rayon/render/compositor
threads (no abort!), CreateWindowlessBrowser OK, LoadURI(data:) rv=0. Hit the
emscripten main-thread-block deadlock (SpinEventLoopUntil blocks) -> FIXED with
-sPROXY_TO_PTHREAD (run main()=the render on a dedicated pthread = Gecko's main thread;
emscripten runtime main thread stays free for proxied calls). Restructured embed-xul.cpp
so main() does xul_init+xul_render+writes render-main.bgra (run-node.cjs just waits for
the RENDER_RESULT marker). Also switched CreateWindowlessBrowser(true->false) (content,
not chrome). REMAINING BLOCKER (new, deep): the data: doc load does NOT complete --
SpinEventLoopUntil sits at spin=0 readyState=4 isData=0 uri=about:blank forever (the
initial about:blank never swaps to the data: doc; the pthread blocks in
NS_ProcessNextEvent, periodic spin log never advances -> the event loop is waiting on
something that never fires). The load logs failed chrome-resource loads (devtools
jsonview Sniffer.sys.mjs, sessionstore SessionStoreFunctions.sys.mjs) + "Failed to
launch socket subprocess" (single-process). Disabling devtools.jsonview/sessionstore
via greprefs did NOT unblock it. So the stall is deeper: likely the content load waits
on a thread/service that isn't progressing (necko? the socket process? a JSWindowActor?
content-process expectations in a single-process windowless content browser). This is
the NEXT frontier -- a focused doc-load/event-loop investigation (instrument what
NS_ProcessNextEvent waits on; try a simpler load path or about:blank-with-injected-DOM;
check if the load needs e10s/content-process that we lack). build-std (the hard part)
is DONE; this is a distinct problem.

*** FIRST PAINT ACHIEVED (2026-06-14) *** Gecko renders HTML to a BGRA pixel buffer
in wasm, verified in node + eyeballed as PNG: a blue 400x300 + red 200x150 box on
white, EXACT colors (rgb(0,102,204)/rgb(204,0,0)) and areas (120000+30000 non-white px).
The data: channel load is blocked (NS_ERROR_CONTENT_BLOCKED, deep in nsContentSecurity
Manager - unresolved), so the WORKING render path BYPASSES the load via DOM injection:
  1. appShell->CreateWindowlessBrowser(false=content, 0).
  2. docShell QI nsIBaseWindow -> SetPositionAndSize(0,0,W,H,eRepaint)+SetVisibility(true)
     (else the PuppetWidget is 0x0 and there's no viewport).
  3. doc = docShell->GetPresShell()->GetDocument() (the initial about:blank, ready at spin 0).
  4. body = doc->GetBody(); nsContentUtils::ParseFragmentHTML(html16, body, nsGkAtoms::body,
     kNameSpaceID_XHTML, false, true) -- SetInnerHTML now needs TrustedTypes, ParseFragmentHTML
     doesn't. html = body's INNER content (no <html>/<body> wrapper).
  5. *** if (!ps->DidInitialize()) ps->Initialize(); *** -- CRUCIAL: the initial about:blank
     PresShell was never Initialize()d (no load triggered it) so it had NO frame tree
     (rootFrame=0). Initialize() builds root+body+div frames and reflows at the viewport size.
  6. doc->FlushPendingNotifications(FlushType::Layout); ps->UnsuppressPainting();
  7. Factory::CreateDrawTargetForData(SKIA, buf, W,H, W*4, B8G8R8A8) -> gfxContext ->
     ps->RenderDocument(nsRect(0,0,W*60,H*60), {}, NS_RGB(255,255,255), ctx).
  8. buf is BGRA8 W*H*4. Fonts staged in dist/bin/fonts (Liberation) for the font-list init.
PROXY_TO_PTHREAD=1 + build-std atomics are what make the whole thing run (main() does the
render on a pthread; runtime main thread free for proxying). Verified in NODE.

*** REAL LOAD WORKS (2026-06-14, no DOM-injection hack) *** The data: channel-load block
(NS_ERROR_CONTENT_BLOCKED) was NOT the content-security-manager (all its checks pass) nor a
content policy (blockReason=0). Traced via MOZ_LOG=DocumentChannel:5 to
ParentProcessDocumentChannel::RedirectToRealChannel: `if (XRE_IsE10sParentProcess() &&
!nsDocShell::CanLoadInParentProcess(uri)) return NS_ERROR_CONTENT_BLOCKED`. e10s was "on"
(XRE_IsE10sParentProcess true) so web content (data:/http -- CanLoadInParentProcess only
allows about:/moz-extension/mail) can't load in the parent, but we have NO content process.
FIX: set env MOZ_FORCE_DISABLE_E10S=1 -> BrowserTabsRemoteAutostart()=false ->
XRE_IsE10sParentProcess()=false -> the check is skipped -> the parent loads content directly
(true single-process). With this, LoadURI(data:text/html,...) loads for REAL: doc swaps to
data:, readyState 1->3->4, RenderDocument paints the boxes (150000 px). NO ParseFragmentHTML.
HOW TO SET ENV on emscripten: ENV={} is empty by default (NOT from process.env). Export ENV
(-sEXPORTED_RUNTIME_METHODS+=ENV) and set it in createGecko preRun: [(m)=>{m.ENV['MOZ_FORCE_
DISABLE_E10S']='1'; m.ENV['MOZ_LOG']=...}] BEFORE main()/NS_InitXPCOM (preRun runs on the
runtime main thread before the pthread main is dispatched). This also makes MOZ_LOG work
(invaluable: MOZ_LOG=DocumentChannel:5 etc.). NEXT (new goal): take a URL param + an
address-bar + <canvas> web page (Playwright); WISP for http; remove the debug CSMLOG/
DocShellCP prints in nsContentSecurityManager.cpp/nsDocShell.cpp before finalizing.

*** ADDRESS-BAR BROWSER + WISP TRANSPORT (2026-06-14) *** Mini-browser works in real
Chromium (Playwright browser-test.cjs, exit 0): an address bar drives a real LoadURI ->
render -> <canvas> for data: URLs (150000 px, screenshot.png). On-demand render via a
shared XulCmd struct (state@0,w@4,h@8,result@12,len@16,url@20): JS writes URL + Atomics-
signals the render pthread, polls state, reads BGRA from the heap (re-fetch HEAPU8 after
growth), BGRA->RGBA to canvas. TARGET=web build preloads gre-stage@/gre; GRE_DIR=/gre +
MOZ_FORCE_DISABLE_E10S=1 set via ENV in preRun.
WISP NETWORKING (per GOAL.md): bridge at emscripten SOCKFS, NO libxul change. SOCKFS turns
each TCP socket into `new WebSocket(ws://addr:port)`; wisp-bridge.js replaces the global
WebSocket (main thread) with a shim backed by a WISP stream (multiplexed over ONE real WISP
WebSocket). Works because libxul's socket syscalls are in emscripten's proxiedFunctionTable
-> they run on the runtime main thread where the WebSocket lives (PROXY_TO_PTHREAD keeps it
free); TLS (NSS) rides on the raw TCP stream so all of Necko is unchanged. WISP v1 frame =
[type:u8][streamID:u32 LE][payload]; CONNECT=[streamType:u8][port:u16 LE][host]. Verified:
Step1 wisp-test.cjs (client fetches HTTP via wisp-server-node, node) PASS; Step2 socktest.c
+ socktest-test.cjs (tiny wasm does socket/connect/poll/recv over WISP in Chromium) PASS.

*** NSS-STATIC-SOFTOKEN = CURRENT FRONTIER (2026-06-14) *** Step3 (Gecko loads real http://
over WISP) reaches nsHttpHandler::NewProxiedChannel -> net_EnsurePSMInit ->
EnsureNSSInitializedChromeOrContent -> nsNSSComponent::InitializeNSS ->
InitializeNSSWithFallbacks(empty profile) -> NSS_NoDB_Init -> TRAPS (unreachable, the inlined
MOZ_CRASH). Root cause: wasm has no dlopen, so NSS can't load softoken/freebl as separate
PKCS#11 .so modules (FREEBL_GetVector was undefined in the link). This fires BEFORE WISP is
used (channel creation), so the WISP transport below is already proven (Step2). FIX (user-
approved, building now): NSS has static targets pk11wrap_static -> softokn_static ->
freebl_static (all define NSS_STATIC_SOFTOKEN; freebl_static = FREEBL_NO_DEPEND, direct, no
loader stub). Edited security/nss/lib/nss/nss.gyp: `nss3_deps` now deps `pk11wrap_static`
instead of `pk11wrap`, so the static softoken chain folds into libnss3 and pk11load.c calls
NSC_GetInterface directly (no dlopen). Only libnss3 rebuilds (pk11wrap is NSS, not libxul) ->
re-strip libnss3.stripped.so + relink embedder. May also need libmozsqlite3.stripped.so in
the embedder link (softoken sdb refs sqlite3) and freebl RNG entropy (/dev/urandom exists in
emscripten FS).
*** STEP 3 PASSES (2026-06-14): REAL http:// URL FETCHED OVER WISP + RENDERED *** The single
gyp edit (nss3_deps -> pk11wrap_static) worked: libnss3.so grew 20->27.75MB (static softoken
+freebl folded in), NSS_NoDB_Init now succeeds, the http channel opens a socket over WISP, the
origin server logs `GET /` (request tunneled through WISP), Gecko renders -> canvas 150000 px
(gecko-net-test.cjs -> WISP_RENDER_OK, wisp-render.png). LINK GOTCHAS: (1) `llvm-strip
--strip-debug` CORRUPTS the bigger libnss3.so ("invalid relocation offset") -> link the
UNSTRIPPED libnss3.so (27MB; cp it to embed-xul/libnss3.stripped.so). (2) do NOT also link
libmozsqlite3 -- softokn_static bundles a static sqlite (use_system_sqlite resolved to the
private sqlite here) -> duplicate sqlite3_*. (3) freebl RNG entropy + plain-http need no
cert verification, so it just works; NS_BINDING_ABORTED(0x804b0003) on the initial about:blank
documentchannel is benign (replaced by the real nav). NEXT: https (TLS now possible -- needs
root-cert trust + WISP egress to the internet); address-bar typing a real URL (geckoRender
already handles it). Debug cleanup still pending in libxul (CSMLOG nsContentSecurityManager.cpp
+ DocShellCP nsDocShell.cpp -- needs a libxul rebuild). Embedder --wrap=pthread_create diag +
RenderLoadListener spam already removed this session.
