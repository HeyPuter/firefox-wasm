# Gecko → WebAssembly: Progress

Goal (see GOAL.md): Run Mozilla's Gecko engine in the browser, compiled to WASM.
Enter an address → web content renders into a `<canvas>`. No browser UI/shell.
Single-process (no IPC, avoid pthreads where possible, JSPI allowed). WISP for
networking. Light embedding (webkit-style). Verify with Playwright. Stubs → STUBS.md.

## *** MILESTONE (2026-06-14): COMPLEX REAL SITE (Hacker News) RENDERS OVER WISP ***
news.ycombinator.com fetched over WISP and rendered to the canvas in Chromium
(gecko-extern-test.cjs -> EXTERN_OK; site-news_ycombinator_com_.png shows the orange
header + numbered story list + points/by/comments). Multiple subresources loaded over
WISP (HTML + news.css + hn.js + y18.svg + s.gif + triangle.svg, each "load stop"
status=0), RenderDocument rv=0, 460514/480000 non-white px. So: HTTPS + WISP + CSS + JS
+ images + a working storage stack all together on a real content site. Unblocked by the
AutoSQLiteLifetime fix (below).

## STORAGE-STACK FRONTIER (2026-06-14): complex sites need profile + IndexedDB/cookies
Climbing from example.com to content sites (Hacker News): real sites pull in browser
storage. Findings + tooling:
- Profile: register a throwaway ProfD/ProfLD (embed-xul.cpp xul_init creates /profile,
  Sets the dir-service keys). Required: places History MOZ_RELEASE_ASSERTs a profile.
- profile-do-change: storage services (QuotaManager->IndexedDB, cookies) only init on
  the "profile-do-change" observer notification. MUST fire it LAST in xul_init (after
  the synchronous setup like the jsonview category edit) -- firing it mid-init deadlocks
  (a storage observer's background work blocks the next sync step). Fired last, init
  completes.
- *** STORAGE WORKS (2026-06-14): the root cause was mozStorage's sqlite was never
  initialized. *** The cookie crash (CookiePersistentStorage::TryInitDB wasm "memory
  access out of bounds") was a null-deref: mStorageService was NULL because
  do_GetService("@mozilla.org/storage/service;1") failed -- mozStorage Service::
  initialize() returned early with SQLITE_MISUSE. ROOT CAUSE: AutoSQLiteLifetime
  (toolkit/xre) is what calls sqlite3_config()+sqlite3_initialize() for mozStorage, and
  it's normally constructed by XREMain -- which this minimal embedding SKIPS. So
  AutoSQLiteLifetime::Init() never ran and its static sResult stayed at its default
  SQLITE_MISUSE(21) -> storage service null -> every DB open null-derefs. FIX (embedder,
  no libxul change): `new mozilla::AutoSQLiteLifetime()` in xul_init after NS_InitXPCOM.
  Result: config(MALLOC)=0, initialize=0, storage service non-null, the unix sqlite VFS
  is present, cookies.sqlite OpenUnsharedDatabase rv=0, render completes. This unblocks
  the WHOLE storage stack (cookies, IndexedDB/QuotaManager, places History) -- all of
  which go through mozStorage/sqlite. (sqlite is the static one bundled in libnss3 via
  softokn_static; it has the unix VFS, version 3.53.2.)
  NOTE: this is a general embedding requirement -- any non-XRE Gecko embedding must
  construct AutoSQLiteLifetime (or otherwise run sqlite3_initialize) for storage.
  Diagnosing this also required browser crash-visibility: see cdp-capture.cjs below.
### CRASH VISIBILITY IN PLAYWRIGHT (cdp-capture.cjs)
emscripten pthread (Web Worker) crashes are logged with worker-local console.error,
which Playwright's page.on('console') does NOT surface, and a worker crash can abort the
whole renderer before any async relay. SOLUTION (DevTools-equivalent, NO engine-JS
hacks): cdp-capture.cjs connects a raw CDP client to the browser endpoint
(--remote-debugging-port), Target.setAutoAttach with flatten + PROPAGATED to each child
session (auto-attach is NOT hierarchical -> must re-enable on every target to reach
nested pthread workers), waitForDebuggerOnStart:true + runIfWaitingForDebugger so early
crashes aren't missed, and relays Runtime.consoleAPICalled + Runtime.exceptionThrown +
Log.entryAdded from page AND all 20 worker targets. gecko-extern-test.cjs uses it. (node
still gives the cleanest stack for a hard crash, but this captures worker console/excs
in-browser.)

## *** MILESTONE (2026-06-14): REAL EXTERNAL WEBSITE OVER HTTPS+WISP -> CANVAS ***
http://example.com fetched over WISP (local wisp-server-node proxying to the real
internet) and rendered to the canvas in Chromium (gecko-extern-test.cjs -> EXTERN_OK;
example-com.png shows the "Example Domain" heading + paragraph + "Learn more" link +
light-gray bg, with real text/font + CSS layout). Notably it auto-UPGRADED http->https
and did real TLS via the static NSS softoken/freebl -- so HTTPS works. Two fixes beyond
the localhost case:
- DNS reverse-map across threads: emscripten's getaddrinfo (wasm/musl) calls the JS
  helper `_emscripten_lookup_name` -> `$DNS.lookup_name` (synthetic 172.29.x.x IP) on
  Gecko's DNS-resolver pthread, but the WISP shim does the reverse `DNS.lookup_addr` on
  the main thread (where socket syscalls are proxied) -> per-thread JS map mismatch ->
  CONNECT went to the raw 172.29.x.x. FIX: add `_emscripten_lookup_name__proxy:'sync'`
  in emscripten's src/library.js so the forward lookup runs on main too (STUBS.md).
- IPv4 only: `network.dns.disableIPv6=true` in xul_init (SOCKFS's ws://addr:port URL
  regex can't encode an IPv6 literal's colons).

## *** MILESTONE (2026-06-14): ADDRESS BAR → RENDER → CANVAS, IN A REAL BROWSER ***
The mini-browser works end-to-end in Chromium (Playwright `browser-test.cjs`, exit 0):
type a URL in an address bar → Gecko does a REAL `LoadURI` (no DOM injection) → spins to
readyState COMPLETE → `PresShell::RenderDocument` → BGRA blit to a `<canvas>`. Verified
150000/480000 non-white px for the blue+red boxes (screenshot.png shows them). The render
is driven on-demand from JS via a shared `XulCmd` struct: JS writes the URL + Atomics-
signals the render pthread, polls `state`, then reads the pixel buffer from the wasm heap.
KEY FIX for the real load: `MOZ_FORCE_DISABLE_E10S=1` (via emscripten `ENV`, set in a
preRun callback) — otherwise `ParentProcessDocumentChannel::RedirectToRealChannel` blocks
web (data:/http) content in the parent process. The render thread is the PROXY_TO_PTHREAD
main; the runtime main thread stays free to service proxied calls.

### *** WISP NETWORKING (2026-06-14): real http:// URLs over WISP ***
Per GOAL.md, real URLs are fetched by Necko over the WISP protocol (official
`wisp-server-node`). The bridge plugs in at emscripten's SOCKFS layer — no libxul change:
- `wisp-client.cjs` / `wisp-bridge.js`: a WISP v1 client (multiplexes TCP streams over one
  WebSocket; frame = [type:u8][streamID:u32 LE][payload]). The bridge replaces the global
  `WebSocket` (main thread) with a shim so every SOCKFS socket becomes a WISP stream over a
  single WISP WebSocket. Works because libxul's socket syscalls are in emscripten's
  `proxiedFunctionTable` → they run on the runtime main thread where the WebSocket lives,
  and TLS (NSS) rides on top of the raw TCP stream, so all of Necko works unchanged.
- Verified in stages (Playwright + a real `wisp-server-node` + a local origin):
  Step 1 `wisp-test.cjs` — client fetches HTTP through WISP (node). PASS. Step 2 `socktest.c`
  + `socktest-test.cjs` — a tiny wasm program does socket()/connect()/poll()/recv() over WISP
  in Chromium (validates the SOCKFS→WISP transport + the proxied-syscall threading). PASS.
  Step 3 `gecko-net-test.cjs` — Gecko loads `http://127.0.0.1/` over WISP and renders it.
  `WISP.install(Module, wispUrl)` from index.html's preRun when `?wisp=ws://…`.
- STEP 3 PASSES (2026-06-14): Gecko fetches a real `http://127.0.0.1/` URL over WISP and
  renders it to the canvas in Chromium (gecko-net-test.cjs -> WISP_RENDER_OK, exit 0;
  wisp-render.png shows the boxes; the origin server logged `GET /` proving the request
  tunneled through WISP; canvas 150000/480000 non-white px). Fix that unblocked it: NSS
  static softoken. The HTTP channel forced `net_EnsurePSMInit` -> `NSS_NoDB_Init` which
  TRAPPED because wasm has no dlopen for the softoken/freebl PKCS#11 modules. FIX: route
  `nss3_deps` through `pk11wrap_static` (security/nss/lib/nss/nss.gyp) -> pulls
  softokn_static + freebl_static (NSS_STATIC_SOFTOKEN, FREEBL_NO_DEPEND) folded into libnss3,
  so `NSC_GetInterface` is linked directly (no dlopen). Only NSS rebuilt (not libxul).
  GOTCHA: `llvm-strip --strip-debug` corrupts the larger libnss3.so ("invalid relocation
  offset") -> link the UNSTRIPPED libnss3.so (27MB). And do NOT also link libmozsqlite3
  (libnss3 now bundles a static sqlite via softokn_static -> duplicate sqlite3_*).
  NEXT: https (TLS now possible via softoken/freebl; needs root-cert trust + a WISP path to
  the internet) and the address-bar UI typing a real URL (geckoRender already works for it).

## *** MILESTONE (2026-06-14): GECKO RENDERS HTML TO PIXELS IN WASM ***
The real Gecko engine, compiled to WebAssembly, lays out and paints an HTML document
to a BGRA pixel buffer. Verified in node: a blue 400x300 box + red 200x150 box on
white, with EXACT colors (rgb(0,102,204), rgb(204,0,0)) and areas (120000 + 30000
non-white px), eyeballed as a PNG. The full chain works: build-std+atomics (real Rust
threads), real wasm xptcall (C++<->JS XPCOM), NS_InitXPCOM, gfxPlatform + WebRender,
windowless browser, DOM injection (ParseFragmentHTML) + PresShell::Initialize + reflow
-> PresShell::RenderDocument -> Moz2D SKIA DrawTarget -> pixels. PROXY_TO_PTHREAD runs
the render on a pthread so the runtime main thread stays free. See embed-xul/ +
gecko-wasm-runtime-frontier memory for the exact recipe. Remaining: browser/Playwright
verification, real text (Skia cairo-ft is linked), the data: channel-load block, WISP.

## Environment
- 12 cores, 31GB RAM, 221GB free disk.
- emscripten 3.1.56 (`/usr/lib/emsdk`), clang 22, rustc 1.95 (wasm32 targets incl.
  wasm32-wasip1/threads, wasm32-unknown-emscripten), node 25, depot_tools, ninja.
- Source: official git mirror `https://github.com/mozilla-firefox/firefox.git`.

## Target: emscripten (browser wasm), NOT WASI
Hard constraint from the user: it must run in the **browser**, so the wasm target is
**emscripten** (`wasm32-unknown-emscripten`, `emcc`/`em++`) — not WASI. WASI targets
server runtimes (wasmtime); we will not use it even via a browser polyfill.
Emscripten emulates a Linux-like POSIX env (emulated FS, pthreads via SharedArrayBuffer,
sockets-over-WebSocket, setjmp/longjmp, C++ exceptions, GL→WebGL, JSPI), which is much
closer to what Gecko expects than bare WASI. Mozilla's in-tree WASI support for `js/src`
is a useful *template* for how a wasm cross-target is wired, but the actual target is
emscripten.

## Strategy (why this order)
Full Gecko→WASM is enormous. We climb in *verifiable* increments, de-risking the
toolchain before the mountain:

1. **Phase 1 — Toolchain proof: SpiderMonkey → emscripten wasm.** Build `js/src` with
   emcc/em++ targeting wasm32-unknown-emscripten, run in browser via Playwright, eval
   `1+1` → `2`. Mozilla only ships a *WASI* js wasm target upstream, so we adapt that
   target wiring to emit emscripten. Proves the build system can target browser wasm on
   this machine. SpiderMonkey is a required Gecko component, so this is not throwaway.
2. **Phase 2 — Minimal ENGINE build (NOT the Firefox app).** webkit-style embedding:
   build libxul (the engine: DOM/style/layout/gfx/parser/necko/xpcom/js — all required
   & coupled) but NOT `--enable-application=browser` (that's the Firefox UI/telemetry/
   updater = "browser stuff" to avoid). Drop non-rendering subsystems (profiler, a11y,
   webspeech, etc.) — minimal philosophy: stub/disable, don't port. Single process,
   no e10s/IPC. [Earlier mistake: used `--enable-application=browser`; correcting.]
3. **Phase 3 — Networking via WISP.** Replace Necko's socket backend (or emscripten's
   socket shim) with a WISP client so TCP flows over a WebSocket to the official WISP
   node server.
4. **Phase 4 — Render to canvas (software).** Use the EXISTING offscreen
   `widget/headless/HeadlessWidget` (no new widget backend). Paint via
   `PresShell::RenderDocument` → Moz2D `DrawTarget` (RAM buffer) → blit to `<canvas>`.
   Same path as `canvas.drawWindow()`/printing; no GPU compositor needed for first paint.
5. **Phase 5 — Embedding + address bar.** Thin embedder (like Phase 1's embed.cpp,
   scaled): create docshell+HeadlessWidget, load a URL, pump the event loop,
   RenderDocument→canvas. Tiny web page: input box → canvas. No browser chrome.

## Status
- [x] Phase 0: environment audit, strategy, repo reachability confirmed.
- [x] **Phase 1: SpiderMonkey → emscripten wasm. DONE + browser-verified.**
      8/8 JS self-tests pass in Chromium via Playwright (`web/index.html`,
      `test/browser-test.cjs`, screenshot `web/phase1.png`). Engine evaluates
      closures, classes, spread, reduce, JSON, Promise, recursion.
- [x] **Phase 2: full-engine wasm build — `mach build` GREEN end-to-end (build-43).**
      The entire Gecko engine — DOM/layout/style/gfx/parser/Necko/XPCOM/SpiderMonkey +
      all Rust crates + NSPR/NSS/ICU/in-tree FreeType — compiles AND links to wasm.
      Artifacts in `obj-full-emscripten/dist/bin/`: `libxul.so` (3.7GB at -O0; it's a
      `--relocatable` wasm object — 87% is DWARF, `llvm-strip --strip-debug` → 477MB,
      real CODE ~40MB), `firefox.wasm` (6.8MB main module that dyn-loads libxul),
      `pingsender.wasm`. plugin-container/xpcshell disabled for emscripten (not needed).
      SIZE: a proper `-O2`/`-g0`/wasm-opt final link (or static-linking an embedder)
      will shrink the loadable module far below 477MB. wasm32 has a 4GB ceiling.
- [ ] Phase 2b: runtime bring-up — load + init libxul in browser (see tasks).
      DECIDED (build-43 analysis): the default `firefox.wasm`(6.8MB)+`libxul.so` split is
      NOT a runnable emscripten pair — firefox.wasm imports only ~20 wasi/emscripten
      syscalls (no libxul symbols), and libxul.so is a `--relocatable` object with no
      `dylink` section (not a finalized SIDE_MODULE). So emscripten dynamic linking
      isn't wired. PLAN: STATIC-link one wasm module = a minimal embedder (like Phase 1's
      embed/embed.cpp) + libxul.so (relocatable) + NSPR(libnspr4/plc4/plds4) +
      libnss/mozsqlite + mozglue + memory + emscripten glue, with `-O2 -g0` + wasm-opt
      (strips the 3.6GB DWARF → loadable). Then emscripten FS: bundle `greprefs.js`
      (build produces it in dist/bin), the chrome/omni resources, a font under
      `<procdir>/fonts/`, and a prefs file; call NS_InitXPCOM; Playwright smoke test.
      Build the embedder with libxul's ABI flags (see [[gecko-wasm-toolchain]] Phase 1
      notes: -std=gnu++20 -fno-exceptions -fno-rtti -DSTATIC_JS_API etc. + the libxul
      js-confdefs/dist/include includes).
      GOTCHA (already diagnosed): a static link of embedder + libxul.so + the separate
      NSPR/NSS .so objects hits the SAME duplicate symbols that failed plugin-container/
      xpcshell — `libVersionPoint` (libplc4.so vs libplds4.so) and `__cxa_pure_virtual`
      (libxul.so vs libpure_virtual.a) — and wasm-ld has NO --allow-multiple-definition.
      FIX OPTIONS: (a) `MOZ_FOLD_LIBS` to fold NSPR/NSS into a single libxul (no separate
      .so's → no inter-lib dup) — preferred; or (b) in the embedder link, omit
      libpure_virtual.a (libxul already defines __cxa_pure_virtual) and link only one of
      libplc4/libplds4 or localize/strip the duplicate `libVersionPoint`. The firefox.wasm
      artifact is a dead end (6.8MB, imports only ~20 syscalls, no libxul symbols; the
      .so split is not wired for emscripten dynamic linking).
      STATUS (build-44): `MOZ_FOLD_LIBS` enabled for EMSCRIPTEN (toolkit/moz.configure
      fold_libs += EMSCRIPTEN); `mach build` still GREEN, but the fold's effect on the
      wasm build is UNVERIFIED — separate libnspr4/plc4/plds4/libnss3 .so's still sit in
      dist/bin (some stale, build-43) and `llvm-nm` on the 3.7GB libxul timed out, so
      it's unconfirmed whether libxul absorbed NSPR/NSS. NEXT, EMPIRICAL: write
      embed-xul.cpp (start trivial: main(){return 0;}, then NS_InitXPCOM) + a
      build-embed-full.sh (template embed/build-embed.sh) linking libxul.so + needed
      libs + emscripten glue with -g0 -O2 + wasm-opt; the link errors (undefined /
      duplicate symbols) will definitively show what to link and whether fold worked. If
      dups persist, prune per the FIX OPTIONS above. May need a clobber for fold to apply.
      PROBE RESULT (embed-xul/, 2026-06-13): the static link WORKS. With
      MOZ_FOLD_LIBS, NSPR is folded into libxul (no PR_* undefined, no dup
      libVersionPoint) and NSS folds into libnss3 (link ONLY libnss3, not
      nssutil3/ssl3 — those dup the *_Util/PORT_*/DER_* symbols). Link recipe
      (embed-xul/build-embed-full.sh): em++ embed-xul.o + libxul.stripped.so (strip
      the 3.7GB→477MB first) + libnss3.stripped.so + emscripten settings
      (INITIAL_MEMORY=512MB; static data ~51MB). Output: **gecko.wasm = 174MB**
      (the real loadable size!) + gecko.js. With -sERROR_ON_UNDEFINED_SYMBOLS=0 the
      link succeeds; 366 symbols remain as imports, categorized:
        * 64 media codecs (aom/ogg/opus/vorbis/vpx/dav1d) — in libgkcodecs/media
          .so's; only for <video>/<audio>. Link them or -sERROR_ON_UNDEFINED later.
        * 1 freebl (FREEBL_GetVector) — link libfreebl3.so.
        * misc: pthread_setname_np (stub like Phase 1), sem_timedwait, sendfile,
          Skia cairo-ft glue (SkInitCairoFT/SkCreateTypefaceFromCairoFTFont),
          do_CreateNativeThemeDoNotUseDirectly.
        * **THE CRUX: XPCOM xptcall** — NS_InvokeByIndex + 247 nsXPTCStubBase::StubN.
          xpcom/reflect/xptcall/md/unix/ has per-CPU asm impls (xptcinvoke_*/
          xptcstubs_*) selected by OS_ARCH/TARGET_CPU; NONE matches wasm32-emscripten,
          so they're undefined. This is the generic runtime-index/runtime-signature
          C++ virtual-call machinery XPCOM uses everywhere (QI, do_GetService, JS<->C++
          scriptable calls). MUST be implemented for wasm. LIKELY APPROACH: a
          libffi-style trampoline using emscripten's untyped JS->wasm-table calls
          (JS can call wasmTable.get(idx)(...args) with coerced numeric args) to
          marshal the nsXPTCVariant array; xptcstubs via a JS shim that captures args
          by arity and calls PrepareAndDispatch. (Gecko has no in-tree libffi xptcall
          backend; write xptcinvoke_wasm.cpp + xptcstubs_wasm.cpp under md/, wire into
          md/unix/moz.build for OS_ARCH==EMSCRIPTEN.) This is the central remaining
          engineering problem of Gecko-on-wasm.
      RUNS (2026-06-13): the 174MB module INSTANTIATES + runs in node — ALL libxul
      global constructors execute, main() runs, clean exit. Fixes that got here:
      (1) trapping wasm xptcall md backend (xpcom/reflect/xptcall/md/unix/
      xptcinvoke_wasm.cpp + xptcstubs_wasm.cpp, wired for OS_ARCH==EMSCRIPTEN) defines
      NS_InvokeByIndex + 247 Stub#/5 Sentinel# as abort-traps (resolved 248 undefineds).
      (2) link the LOOSE GLUE objects (MOZ_GLUE_IN_PROGRAM: mfbt, mozglue/misc+
      baseprofiler+build, memory/build+mozalloc, third_party/fmt) — libxul references
      them (e.g. mozilla::detail::MutexImpl) as imports; without them they become
      trapping weak stubs (a static Mutex ctor in xpcom/base aborted before main).
      embed-xul/build-embed-full.sh has the full recipe. xptcall NOT hit during ctors
      (good sign for the no-chrome bet). Remaining 113 undefined = media codecs +
      sem_timedwait + a few; harmless unless those code paths run (madvise warns only).
- [~] Phase 2b cont.: NS_InitXPCOM smoke test RUNNING (embed-xul/, node + -sNODERAWFS so
      the wasm reads the real dist/bin; xul_init() called from JS via ccall). Progression
      (each trap = a small platform gap, fixed in turn):
        1. NSPR _PR_InitLinker did dlopen(0)->abort. FIX: NO_DLOPEN_NULL for emscripten
           in nsprpub/pr/include/md/_linux.h (gated ANDROID before). GOTCHA: the fold
           intermediates (libnspr4/libnss3) didn't relink from the fixed nspr objects on
           a plain `mach build` — had to `rm dist/bin/lib{nspr4,nss3,xul}.so` to force it.
           libnss3 bundles NSPR (fold), so it MUST be rebuilt too or it carries a stale
           aborting prlink. (Header-dep tracking for the nspr objects also flaky: had to
           rm the Unified_c_external_nspr_pr*.o to recompile.)
        2. nsThreadManager::Init -> nsThread::InitCurrentThread -> PlatformThread::CurrentId()
           fell off the end (no emscripten branch) -> trap. FIX: added __EMSCRIPTEN__ ->
           return (PlatformThreadId)(intptr_t)pthread_self() in
           ipc/chromium/src/base/platform_thread_posix.cc.
        3. NS_InitXPCOM called ogg_set_mem_functions (codec registration) -> missing-fn
           stub. FIX: link embed-xul/libgkcodecs.stripped.so (ogg/opus/vorbis/theora).
        4. **FRONTIER: nsComponentManagerImpl::Init -> nsLayoutModuleInitialize ->
           mozilla::ipc::IOThread::Startup() traps** — it does `new IOThreadParent()`
           (: base::Thread) which starts a REAL OS thread; we built single-threaded
           (--disable-shared-memory, no -pthread). DECISION (pre-authorized by user:
           "fall back to pthreads if too hard"): single-threaded Gecko is impractical
           (IO thread, timer thread, stylo/worker pools, sync cross-thread dispatch),
           so NEXT = rebuild with emscripten pthreads (-pthread / -sUSE_PTHREADS, re-
           enable shared memory; browser needs SharedArrayBuffer + COOP/COEP). Big
           reconfigure+rebuild. Link recipe so far in embed-xul/build-embed-full.sh
           (libxul + glue objects + libnss3 + libgkcodecs, INITIAL_MEMORY=512MB).
      NOTE: xptcall NOT hit yet through component-manager/layout-module init — the
      no-chrome path is holding, so the trapping xptcall stubs may suffice for a while.
### Browser test infra (real Chromium via Playwright, no node-exec of the wasm)
Set up under embed-xul/ (validated independently of the engine build):
- `server.cjs`: static server sending COOP/COEP (+ CORP) so the page is
  cross-origin-isolated -> SharedArrayBuffer -> emscripten pthreads work.
- `index.html`: loads gecko.js, shows crossOriginIsolated, calls xul_init("/gre")
  via ccall, displays NS_InitXPCOM rv + a <canvas> (for Phase 4), sets
  #status[data-ready] for the test to poll.
- `browser-test.cjs`: Playwright (reuses /home/velzie/src/puter/node_modules
  + chromium-1217) — serve, launch headless Chromium (--no-sandbox), navigate,
  capture console, assert #status, screenshot.png. Run: `node embed-xul/browser-test.cjs`.
- `stage-gre.sh`: rsync GRE resources (greprefs.js, manifests, chrome, defaults)
  from dist/bin into embed-xul/gre-stage/, EXCLUDING the big binaries; web build
  --preload-file's it to /gre.
- `build-embed-full.sh` now takes TARGET=node|web (web = -sENVIRONMENT=web,worker
  + --preload-file gre-stage@/gre + pthread pool; node = -sNODERAWFS).
- VALIDATED: a minimal coi-check.html in Chromium via the server reports
  crossOriginIsolated=true, SharedArrayBuffer present, growable shared
  WebAssembly.Memory OK. So browser pthreads are viable.
WEB FLOW once the -pthread libxul build finishes: strip libxul/libnss3/libgkcodecs
-> bash stage-gre.sh -> TARGET=web bash build-embed-full.sh -> node browser-test.cjs.
GRE staging verified: embed-xul/gre-stage = 36MB (greprefs.js + chrome.manifest +
components + modules + res + defaults; = dist/bin minus binaries, matches what the
node run used). Fonts staged into gre-stage/fonts/ (LiberationSans proportional +
DejaVu) so Phase-4 layout has glyphs (Gecko's gfxFT2FontList scans <procdir>/fonts).

### THREAD-CORRECTNESS audit (single-threaded assumptions to revisit under -pthread)
Done while the -pthread build ran. Status:
- gfx/cairo/libpixman/src/moz.build: `PIXMAN_NO_TLS` set for EMSCRIPTEN — was for
  single-threaded; under -pthread pixman needs TLS for thread-safety. NOT a compile
  error (build completes), but a latent race -> REMOVE/gate for the threaded build
  next cycle. (moz.build edits need a reconfigure, so can't slip into the running build.)
- third_party/rust/uniffi_core .../rustfuture/mod.rs: wasm32 = futures-not-Send cfg;
  under real threads futures may cross threads (need Send) -> revisit (likely compiles).
- servo/.../global_style_data.rs PlatformThreadHandle: already RawPthread/pthread_t
  for emscripten -> CORRECT under pthreads. NSPR built with -D_PR_PTHREADS -> CORRECT.
WISP server (Phase 3): not bundled locally; npm-installable (MercuryWorkshop official
node impl) when networking is needed — deferred (after render).
### MILESTONE (2026-06-14): NS_InitXPCOM SUCCEEDS in wasm — the engine initializes
With emscripten pthreads (-pthread, --disable-shared-memory kept), `NS_InitXPCOM`
returns **NS_OK** in the browser-wasm engine: component manager, service manager,
thread manager (real pthread/worker threads), prefs, nsLayoutModuleInitialize,
intl/locale all come up. **xptcall was NEVER hit** through the whole init — the
trapping NS_InvokeByIndex/Stub# stubs were never called — confirming the no-chrome,
C++-driven path sidesteps the JS<->C++ XPCOM reflection bridge. embed-xul/embed-xul.cpp
(xul_init) reports "*** XPCOM INITIALIZED ***".
Threading-fork fixes that got here (all this session):
  - mozconfig: -pthread in CFLAGS/CXXFLAGS/LDFLAGS (Web Workers + shared wasm mem);
    KEEP --disable-shared-memory (the JS SharedArrayBuffer feature; enabling it broke
    the ArrayBuffer-union WebIDL codegen).
  - PlatformThread::CurrentId() emscripten branch (pthread_self).
  - NSPR _PR_InitLinker NO_DLOPEN_NULL (md/_linux.h) + force-relink of the fold
    intermediates (libnspr4/libnss3) from the fixed objects.
  - link libgkcodecs (ogg/opus codec mem-fn registration at startup).
  - intl/locale/headless/OSPreferences_headless.cpp (NEW) + moz.build dir — the OS
    locale prefs class had no headless impl (returns no OS locales -> en-US default).
  - CAUTION learned: a mozconfig/reconfigure can PARTIALLY re-run the WebIDL codegen
    (regenerating UnionTypes.h but not per-binding .cpp -> incomplete-type errors).
    Recovery: nuke obj/dom/bindings + `mach configure` + build = clean consistent regen.
    (Don't `find -delete` only top-level; .deps/*.stub markers must go too, or use the
    dir nuke.) The FasterMake backend won't regen deleted outputs unless the .deps
    .stub markers are removed.
KNOWN ISSUES (post-init, for Phase 4):
  - NS_ShutdownXPCOM spawns a Rust std::thread that aborts "current thread handle
    already set during thread spawn" (emscripten pthread worker-reuse vs Rust-std TLS).
    Avoided by not shutting down (embedding stays up). May resurface with stylo/worker
    threads during render -> investigate then.
  - "Failed to launch socket subprocess" — benign (single-process; no child to spawn).
  - undefined (stubbed) nsBaseFilePicker symbols — file picker base, unused at runtime.
- [x] **BROWSER-VERIFIED (Playwright/real Chromium): NS_InitXPCOM succeeds.** Web build
      (TARGET=web: -sENVIRONMENT=web,worker, --preload-file gre-stage@/gre, pthread
      pool=20) served with COOP/COEP -> crossOriginIsolated=true -> SharedArrayBuffer ->
      pthreads. embed-xul/browser-test.cjs prints BROWSER_OK, data-ready=1, rv=0x0;
      screenshot.png saved. Artifacts: gecko.wasm 240MB, gecko.data 99MB (GRE FS),
      gecko.js + gecko.worker.js. (stage-gre.sh uses rsync -aL to deref dist/bin's
      symlinks, else file_packager fails.) THE ENGINE BOOTS IN A BROWSER.
### Rust-threads-on-shared-memory: root cause + path (task #7)
The "current thread handle already set during thread spawn" abort = the PREBUILT
wasm32-unknown-emscripten Rust std is SINGLE-THREADED (no atomics), so std's
thread-locals/atomics are shared statics. Under our -pthread (shared mem) build,
that's unsafe (races) and the std thread-current static collides across pthreads.
CORRECT fix = rebuild std + all crates with `+atomics` via `-Zbuild-std`
(config/makefiles/rust.mk has the block, commented out). BLOCKED: -Zbuild-std needs
std's OWN deps vendored at exact versions (cfg-if 1.0.4, libc 0.2.178, hashbrown
0.16.1, compiler_builtins, unwinding, addr2line, ... ~13 crates) which differ from
gecko's vendored versions / aren't vendored. That's a separate vendoring task
(download from crates.io + .cargo-checksum.json + multi-version vendor layout).
INTERIM ATTEMPT: set `layout.css.stylo-threads=1` (greprefs + embedder) -> stylo
sequential. RESULT: the abort STILL fires, so it's NOT stylo — some OTHER Rust
thread spawns after init (a `pipe2` precedes it; possibly a networking/IPC Rust
thread). KEY: the abort is on a BACKGROUND WORKER and is NON-FATAL to the main
thread — xul_init still returns NS_OK and the browser test passes (BROWSER_OK,
rv=0x0). So the main-thread render path may work despite it. DECISION: proceed to
Phase 4 render on this base; only invest in build-std vendoring (~13 std deps,
multi-version vendor layout — can't `cargo vendor --sync` without losing our
patched crates) if the render is actually blocked by the dead worker.
### Phase 4 first render attempt (embed-xul.cpp xul_render) — KEY FINDING
Wrote xul_render: createWindowlessBrowser(true) -> LoadURI(data:text/html,...) ->
SpinEventLoopUntil(readyState complete) -> PresShell::RenderDocument -> Moz2D
software DrawTarget (SKIA, B8G8R8A8) -> BGRA buffer to JS. Compiles + links.
RESULT (node): xul_init OK, then xul_render created the windowless browser and
LoadURI ran, but CRASHED with "null function or function signature mismatch" at
mozilla::PermissionManager::GetAsyncShutdownBarrier <- PermissionManager::Init <-
GetInstance <- AutoplayPolicy::GetSiteAutoplayPermission (triggered creating the
docshell/document). GetAsyncShutdownBarrier does getService(nsIAsyncShutdownService)
which is **JS-IMPLEMENTED** (toolkit AsyncShutdown.sys.mjs) -> C++->JS XPCOM call ->
our TRAPPING xptcall stub -> wasm call_indirect signature mismatch.
=> RENDERING REQUIRES REAL xptcall after all (the docshell/permission path pulls in
JS-implemented services), unlike bare NS_InitXPCOM. The no-chrome path reduced but
did not eliminate JS<->C++. So Phase 4 is GATED on implementing real xptcall
(libffi-style JS trampoline, user-approved: NS_InvokeByIndex via untyped JS
wasmTable.get(idx)(...args), stubs via emscripten addFunction with per-method sigs;
see md/unix/xptc{invoke,stubs}_wasm.cpp which currently just trap). The background
Rust-thread abort (build-std issue) also still fires. Both are substantial.

### REAL wasm xptcall IMPLEMENTED (2026-06-14) — built, validating
Replaced the trapping stubs with a libffi-style implementation:
- xptcstubs_wasm.cpp (C++->JS): NS_GetXPTCallStub builds a SYNTHETIC per-interface
  vtable (cached by nsXPTInterfaceInfo*). Slot 0/1/2 = real C++ QI/AddRef/Release;
  slot >=3 = emscripten addFunction(jsShim, sig). sig computed from XPT method info
  to match clang's call_indirect type exactly: ret 'i', 'this' 'i', then per param
  out/complex->'i', i64/u64->'j', float->'f', double->'d', else 'i'; insert 'i' for
  implicit JSContext at IndexOfJSContext, append 'i' for WantsOptArgc. Shim packs
  args into 8-byte slots -> WasmXPTCStubDispatch rebuilds nsXPTCMiniVariant[] (native
  PrepareAndDispatch logic) -> mOuter->CallMethod. Object {void** vtable; mOuter; mEntry}.
- xptcinvoke_wasm.cpp (JS->C++): NS_InvokeByIndex reads vtable[methodIndex] (a wasm
  table index), marshals nsXPTCVariant[] -> buf+sig (IsIndirect->&val ptr else scalar),
  EM_JS WasmInvoke does wasmTable.get(fp).apply(null,[that,...args]).
- xptcall.cpp: the 3 EXPORT_XPCOM_API entry points guarded #ifndef __EMSCRIPTEN__.
- flags: -sALLOW_TABLE_GROWTH, -sWASM_BIGINT, EXPORTED_FUNCTIONS+=_malloc,
  _WasmXPTCStubDispatch, RUNTIME_METHODS+=addFunction,removeFunction.
Built green (libxul relinked, stripped 477MB). KEY RISK: the computed sig must
byte-match clang's call_indirect type at each call site or it traps the same way
("signature mismatch"); the stack names the offending method so the sig rule can be
fixed. Validating against the PermissionManager->AsyncShutdown path in node.
### Render path after xptcall (2026-06-14) — profiler blocker resolved
With xptcall working, render runs deep: CreateWindowlessBrowser -> nsDocShell::
SetupNewViewer -> nsDocumentViewer::Init -> nsGlobalWindowOuter::SetNewDocument ->
WindowGlobalChild::Create -> WindowGlobalChild ctor -> profiler_register_page, which
did MOZ_RELEASE_ASSERT(CorePS::Exists()) -> unreachable, because we skip XRE startup
so the profiler was never profiler_init'd.
- Tried calling profiler_init(&stackTop) in xul_init (forward-declared the global
  gecko ::profiler_init since GeckoProfiler.h gates it on MOZ_GECKO_PROFILER which
  the embedder TU lacks). RESULT: profiler_init HANGS on emscripten (render stuck
  between "GRE dir" and "calling NS_InitXPCOM" forever). Likely SharedLibraryInfo::
  Initialize (dl_iterate_phdr) or AsyncSignalControlThread (GECKO_PROFILER_ASYNC_
  POSIX_SIGNAL_CONTROL is gated on GP_OS_linux, likely defined for emscripten). So
  do NOT profiler_init on emscripten.
- FIX (applied): patch tools/profiler/core/platform.cpp profiler_register_page to
  `if (!CorePS::Exists()) return;` (exactly matching the existing profiler_unregister_
  page guard) instead of asserting. Profiler stays uninitialized/no-op; page reg is
  skipped. Reverted the embedder profiler_init call. (29 other CorePS hard-asserts
  exist but are on profiler-active paths we don't hit; patch more if they fire.)
- Also added readyState-transition + periodic logging to xul_render's SpinEventLoopUntil
  (cap 500k) to tell a stalled load from a slow one.
### Render-path headless gaps being filled (2026-06-14) — marching toward first paint
With xptcall + profiler guards, render advances through real layout init. Each gap
fixed (the Rust-thread "current thread handle already set" worker abort keeps printing
but stays NON-FATAL to main — main proceeds each time):
1. profiler_register_page / capture_backtrace asserts -> guarded (see above).
2. do_CreateNativeThemeDoNotUseDirectly missing -> widget/Theme.cpp ANDROID ->
   ANDROID||MOZ_WIDGET_HEADLESS (non-native Theme). (PresShell::Init->EnsureTheme.)
3. gfxPlatform::PopulateScreenInfo crash (null nsIScreenManager): headless never
   registered @mozilla.org/gfx/parent/screenmanager;1 (nsScreenManagerSelector ->
   do_GetService returns null -> null-deref). FIX: add ScreenManager::GetAddRefed
   Singleton registration to widget/headless/components.conf (mirroring gtk).
4. SkInitCairoFT / SkCreateTypefaceFromCairoFTFont undefined (gfxPlatform::Init calls
   SkInitCairoFT unconditionally; text needs SkCreateTypeface): SkFontHost_cairo.cpp +
   SkFontHost_FreeType_common.cpp only compiled for gtk/android. FIX: add 'headless'
   to those toolkit blocks in gfx/skia/moz.build (+ cairo include + CAIRO_FT_CFLAGS).
Test HTML switched to no-text colored boxes to verify layout+paint pipeline without
the font path first. NEXT after these: reach PresShell::RenderDocument -> pixels.
### Render PIPELINE RUNS END-TO-END (2026-06-14) — chasing the last gaps to pixels
After xptcall + the headless gaps, xul_render now runs the WHOLE path without
crashing: CreateWindowlessBrowser -> docshell -> LoadURI(data:) -> SpinEventLoopUntil
-> PresShell::RenderDocument(rv=0) -> BGRA buffer returned to JS. Remaining gaps found
while getting actual pixels:
5. glean Rust thread (FORCE-recompile needed: cargo fingerprints vendored crates by
   package checksum, so a source edit alone is ignored -- delete the rlib+.fingerprint
   AND touch gkrust lib.rs, else it silently uses the stale rlib). First tried running
   tasks inline -> with_glean() panic (global Glean is None pre-init); fix = DROP tasks.
6. MOZ_CRASH("No font files found"): FindFonts searches NS_XPCOM_CURRENT_PROCESS_DIR/
   fonts; node target had no dist/bin/fonts. FIX: copy gre-stage fonts -> dist/bin/fonts
   (NS_XPCOM_CURRENT_PROCESS_DIR resolves to the GRE dir we pass = dist/bin).
7. data: URL truncation: '#' is the URL fragment delimiter -> the unencoded HTML was cut
   at the first '#' (id selectors / hex colors). Use rgb() + inline styles (or percent-
   encode the html when building the data: URL -- TODO for the real embedding API).
8. ALL-WHITE render: we were rendering the initial about:blank (readyState COMPLETE at
   spin=0) BEFORE the async data: load swapped in the real doc. FIX: spin until the
   current document URI startsWith "data:" AND readyState==COMPLETE.
9. base::TimeTicks::Now() undefined (called by SoftwareVsyncSource once the loop pumps):
   emscripten TARGET_KERNEL matches no time_*.cc block. FIX: compile src/base/time_posix.cc
   for OS_TARGET==EMSCRIPTEN in ipc/chromium/moz.build (gettimeofday + clock_gettime).
### build-std +atomics (2026-06-14) — the real fix for Rust threads (IN PROGRESS)
The render pipeline runs end-to-end but actual pixels are blocked by the prebuilt
single-threaded Rust std (WebRender/stylo need real per-thread TLS; no shortcut). User
approved tackling build-std. Approach:
- rust.mk: gated on `findstring emscripten,$(RUST_TARGET)`, added
  `-Zbuild-std=std,panic_abort` + `RUSTC_BOOTSTRAP=1` +
  `RUSTFLAGS += -Ctarget-feature=+atomics,+bulk-memory,+mutable-globals`.
- mach does NOT rebuild on a rust.mk edit -> touch toolkit/library/rust/shared/lib.rs.
- VENDORING: build-std resolves std's own deps from rust-src's library/Cargo.lock,
  which pin DIFFERENT versions than gecko's vendored crates (cfg-if 1.0.4 vs 1.0.0,
  libc 0.2.178 vs 0.2.183, hashbrown 0.16.1 vs 0.17.1, rustc-demangle 0.1.27 vs
  0.1.21) + backtrace deps gecko may lack (object/addr2line/gimli/miniz_oxide/adler2/
  memchr/foldhash/dlmalloc/cc/unwinding). cargo --offline + vendored-sources (dir =
  firefox/third_party/rust) needs them all present. FIX: download each from
  static.crates.io (network OK) or cargo cache, extract into third_party/rust/
  <name>-<version>/ (version-suffixed dirs coexist with gecko's name-only dirs;
  cargo matches by Cargo.toml, not dir name), and GENERATE .cargo-checksum.json
  (package = sha256 of the .crate, files = sha256 of each file). cargo reports
  missing deps one at a time at resolution (~6s) -> batch-vendored the likely set.
  compiler-builtins/core/alloc/std/panic_abort are path deps inside rust-src (not
  vendored). Platform deps (windows-*/wasi-*/sgx/efi/hermit/vex/moto) not needed.
- [ ] Phase 4: render. Plan: after NS_InitXPCOM, set stylo-threads=1; create a
      docshell (or minimal content viewer), load a **data: URL** (data:text/html,...
      — no network, so no WISP needed yet), pump the event loop until loaded, then
      PresShell::RenderDocument -> Moz2D DrawTarget (RAM) -> read pixels -> the
      <canvas> in embed-xul/index.html. Event-loop pumping on the wasm main thread
      may need emscripten main-loop / Asyncify/JSPI (browser can't block-spin).
- [ ] Phase 3: WISP networking.
- [ ] Phase 4: render to canvas.
- [ ] Phase 5: embedding + address bar UI.

## Build setup (Phase 1)
- Source: `firefox/` (shallow clone of mozilla-firefox/firefox `main`, rev 74aa8fda9f).
- mozconfig: `mozconfig.js.emscripten` (CC=emcc, CXX=em++, --target=wasm32-unknown-emscripten,
  --enable-project=js, --disable-jit/shared-js/shared-memory, --without-intl-api).
- Objdir: `obj-js-emscripten/`. Build/configure logs in `firefox/artifacts/`.
- To configure/build:
  `export MOZBUILD_STATE_PATH=$HOME/.mozbuild MOZCONFIG=/home/velzie/src/gecko-wasm/mozconfig.js.emscripten`
  then `./mach configure` / `./mach build` from `firefox/`.

### Build-system patches to support emscripten target (vs upstream)
- `python/mozbuild/mozbuild/configure/constants.py`: added `EMSCRIPTEN` to OS + Kernel
  enums and `"EMSCRIPTEN": "__EMSCRIPTEN__"` to kernel_preprocessor_checks.
- `build/moz.configure/init.configure`: `split_triplet` now maps `*-emscripten` →
  canonical OS/kernel `EMSCRIPTEN` (gated by allow_wasi, i.e. project==js for now).

### Source patches for wasm/emscripten (vs upstream)
- `js/src/irregexp/imported/regexp-bytecodes-inl.h`: `SplitNames` result array
  value-initialized (`result{}`) — clang 19 (emcc 3.1.56) rejects returning a
  default-init zero-length `std::array` from constexpr. Correctness-neutral.
- `js/src/vm/JSONPrinter.{h,cpp}`: added `__EMSCRIPTEN__` to the size_t-overload
  guard (alongside darwin/openbsd/wasi) — wasm32 size_t is `unsigned long`,
  distinct from uint32_t/uint64_t, so the bare overloads were ambiguous.
- `mozglue/misc/PerfStats.h`: `AtomicAddDouble` helper — `std::atomic<double>::`
  `fetch_add` (C++20 P0020) is missing from emcc 3.1.56's libc++; use a CAS loop
  under `__EMSCRIPTEN__`, native fetch_add elsewhere. Telemetry-only.

## Log
- Phase 0 done. Confirmed toolchain present. Shallow-cloned firefox git (5.7G).
- Phase 1: taught moz.configure an `EMSCRIPTEN` target; built SpiderMonkey to
  browser wasm with emcc, single-threaded (no pthreads/IPC). Custom JSAPI embedder
  (`embed/embed.cpp`, linked by `embed/build-embed.sh` → `web/sm.{js,wasm}`).
  Issues solved along the way (all documented in STUBS.md / patches above):
  irregexp constexpr (clang 19), JSONPrinter size_t overload, atomic<double>
  fetch_add, single-threaded flag wiring, pthread_setname_np stub,
  binaryen v117→v129 shim (rustc LLVM21 feature skew), MOZ_CRASH wasm trap,
  GC page-mapping via posix_memalign, emscripten stack base, DisableExtraThreads.
  Verified in Chromium via Playwright: 8/8 pass. **Phase 1 done.**
- Next: Phase 2 — extend the emscripten target beyond project==js to the full
  engine; collapse e10s to single process; minimal headless build.

## Phase 2 map (full-engine emscripten configure) — discovered walls
Config: `mozconfig.full.emscripten` (--enable-application=browser, emcc). Done so far:
- Allowed wasm triples for any project (init.configure allow_wasi=True).
- `--with-libclang-path=~/.mozbuild/clang/lib` (full build needs bindgen).
- Must build WITH intl (ICU) — `--without-intl-api` unsupported for browser.
- `--without-wasm-sandboxed-libraries` (RLBox compiles libs with wasm32-wasi; emcc
  rejects that target and it's pointless when the whole engine is wasm).
- NSPR `pr/moz.build`: added EMSCRIPTEN branch (Linux-like, no thread asm).
- **Full-engine configure now COMPLETES for wasm32-emscripten** (784 backend files).
- Full `./mach build` started; NSPR compile walls hit + fixed:
  - `nsprpub/pr/include/md/_linux.cfg`: added `__wasm32__` data-model branch (ILP32 LE).
  - `nsprpub/pr/include/md/_linux.h`: `_PR_SI_ARCHITECTURE "wasm32"`.
  (emscripten uses NSPR's Linux md path via `LINUX` define from nspr moz.build.)
  Grinding remaining walls (NSPR .c sources, NSS, gfx, widget, …) is the long part.
- Headless widget toolkit (`toolkit/moz.configure`: EMSCRIPTEN → cairo-headless) →
  GTK/X11/Wayland no longer compiled; widget/headless is the sole backend.
- With that, the C++ side compiled deep into libxul — reached `nsBrowserApp.cpp`
  (the app) and `gkrust` (the Rust megacrate). Remaining compile walls fixed:
  - `xpcom/build/BinaryPath.h`: emscripten case (synthetic path — see STUBS.md).
  - `toolkit/library/rust/Cargo.toml`: enable uniffi_core `wasm-unstable-single-threaded`
    for wasm (futures aren't Send single-threaded).
### Honest status & realistic scope (read this first on resume)
Phase 1 (JS engine in browser wasm) is DONE and browser-verified — the hardest
unknown (does the mozilla build system → browser wasm toolchain work at all) is
proven. Phase 2 (full libxul) is the bulk of a browser-engine port and is a
multi-session effort. Current Phase-2 state: full configure works; ~most of
libxul's C++ compiles; we're inside the Rust megacrate. Each `mach build` cycle to
the next wall is several minutes; walls are numerous and span subsystems. Realistic
remaining: finish libxul compile (gecko-profiler bindgen, ICU data, more), the
~100MB+ libxul LINK (emscripten settings + missing symbols), runtime bring-up,
then Phases 3-5 (WISP networking, compositor→canvas, embedding). This is many more
sessions, not hours.

### Current exact frontier (next actions on resume)
1. `gecko-profiler` Rust crate: 69 "cannot find type mozilla::MarkerTiming /
   bindings::gecko_profiler_*" errors. `MOZ_GECKO_PROFILER` is not set for our
   config and the crate's bindgen produces an empty bindings module. The crate's
   bindgen cflags lack a wasm `--target`/`__EMSCRIPTEN__`, so it host-parses. Needs:
   either define MOZ_GECKO_PROFILER + make the profiler C++ compile for wasm, or
   make the crate stub when profiler is off. (Non-optional dep in gkrust-shared.)
   DIAGNOSTIC: generated `obj-full-emscripten/.../gecko-profiler-*/out/gecko/bindings.rs`
   is only ~104 lines (just std/ranges scaffolding) with NONE of the profiler types.
   NOTE: `MOZ_GECKO_PROFILER` does NOT exist as a define in this mozilla-central
   (profiler is unconditional). So bindgen is failing to PARSE the profiler headers
   under the wasm cross-config (host libclang + the crate's build.rs include setup),
   producing an empty TU — investigate `tools/profiler/rust-api/build.rs` bindgen
   inputs/cflags for the wasm target (it lacked a `--target`/sysroot in the cflags
   we saw). This is a representative example of the remaining long tail.
2. `config/external/icu/data/icu_data.S`: fixed the wasm `.section` syntax (added
   __EMSCRIPTEN__ to the __wasi__ branches) — re-verify.
3. libevent `sys/sendfile.h` STILL recurs: buffer.c is apparently NOT picking up the
   new `libevent/emscripten` config (the `include()`d libeventcommon.mozbuild change
   may not invalidate the backend). Verify buffer.c's `-I` include path in the objdir;
   may need `./mach build-backend` / touch to force regen, or the include order.

### SYSTEMIC bindgen fix (root cause of profiler/NSS/mls/all "missing function" walls)
`build/moz.configure/bindgen.configure` (`basic_bindgen_cflags`, EMSCRIPTEN branch):
add **`--target=wasm32-unknown-emscripten`** AND **`-fvisibility=default`**.
TWO root causes, both fixed:
  1. No `--target` → bindgen host-parsed → wrong header branches.
  2. **THE BIG ONE**: the bindgen clang inherited `-fvisibility=hidden` from the
     compiler flags, and **bindgen SKIPS hidden-visibility functions** → it emitted
     types but ZERO `extern "C"` functions for EVERY C-binding Rust crate (profiler,
     nss-rs, …). `-fvisibility=default` makes bindgen see/emit them. Verified: profiler
     bindings went 104→1390 lines, 0→40 `pub fn` incl gecko_profiler_register_thread.
This is THE systemic Rust↔C++ FFI fix — unblocks all bindgen crates at once.
(mls-rs-core also needed a per-crate cfg fix for its wasm_bindgen import; nss/profiler
are NOT stubbed — real bindings now generate. Scope = minimal engine embedding.)

### Rust/C++ walls fixed after the bindgen breakthrough (build advancing toward libxul link)
- `third_party/rust/mtu/src/lib.rs`: added `emscripten` to the unsupported-platform
  `interface_and_mtu_impl` fallback (+ checksum). MTU N/A in wasm (WISP networking).
- `third_party/rust/socket2/src/sys/unix.rs`: `emscripten` → `IovLen = c_int` (+ checksum).
- **Headless GfxInfo** (the headless toolkit had none — GfxInfo is registered per real
  toolkit): created `widget/headless/GfxInfo.{h,cpp}` (minimal, mirrors uikit — no GPU
  info, nothing blocklisted) + `widget/headless/components.conf` + moz.build wiring.
  Fixes `mozilla::components::GfxInfo` referenced by dom/ipc/ContentParent.cpp.

### gfx + networking crate walls (build-14/15)
- `gfx/cairo/cairo/src/moz.build`: exclude cairo PDF + font-subset sources for the
  `headless` toolkit (mirror cocoa/uikit; Mozilla uses Skia PDF, cairo PDF unused).
- `gfx/cairo/libpixman/src/moz.build`: `DEFINES['PIXMAN_NO_TLS']` for EMSCRIPTEN
  (single-threaded; pixman has no wasm TLS mechanism).
- `third_party/rust/libc/.../emscripten/mod.rs`: add `in6_pktinfo` struct (+ checksum)
  — emscripten libc crate lacked it; quinn-udp (QUIC) references it.

### More walls (build-16)
- libc `in6_pktinfo`: the active emscripten module is `src/unix/linux_like/emscripten/`
  (re-exported at linux_like/mod.rs:2187); added `in6_pktinfo` there (fields
  `crate::in6_addr` / `c_int`, matching android) + checksum + forced libc rebuild.
- `mfbt/UniquePtrExtensions.{h,cpp}`: `DuplicateFileHandle` guard `#ifndef __wasm__`
  → `#if !defined(__wasm__) || defined(__EMSCRIPTEN__)` — emscripten has `dup`, so
  the Unix path works (gfx/layers/Fence.cpp needs it).

### MILESTONE (build-16): entire libxul C++ compiles; all Rust crates compile except one
After build-16, the only remaining compile error in the whole engine was the
`rsclientcerts` Rust crate (client-cert/PKCS#11) — every C++ file in libxul compiled,
and every other Rust crate compiled. One crate from the libxul LINK.
- `third_party/rust/pkcs11-bindings/build.rs`: added `.allowlist_type("CK_.*")` (+ checksum)
  so all Cryptoki `CK_*` types generate (they were only pulled in as deps of the
  not-generated `C_GetFunctionList`); rsclientcerts references them directly.

### FRONTIER (build-17): entire engine compiles; now at the GRAPHICS PLATFORM backend
rsclientcerts fixed. build-17 advanced into gfx/thebes + webrender_bindings — the
remaining errors are all the gfx/font *platform backend*, which the headless toolkit
lacks:
- `gfx/thebes/gfxPlatform.cpp:797,922`: `#error "No gfxPlatform implementation
  available"` — gfxPlatform has Mac/Gtk/Android subclasses only. NEED a headless/wasm
  `gfxPlatform` subclass (the central graphics class: font list, draw-target backends,
  surfaces). Likely model on gfxAndroidPlatform (FreeType-based, simplest).
- `gfx/webrender_bindings/Moz2DImageRenderer.cpp`: `mozilla/gfx/UnscaledFontFreeType.h`
  not found — the FreeType font backend (gfx/2d) isn't built for headless. Need to
  enable tree FreeType + the FT UnscaledFont/ScaledFont path for emscripten.
- `servo/components/style/global_style_data.rs:136`: `PlatformThreadHandle` type
  missing (style thread-pool binding) — tied to the same platform/thread wiring.
This is the rendering backend — the last major piece before the libxul LINK, then
the `RenderDocument`→canvas path (Phase 4). Substantial but it's the core of rendering.

### GRAPHICS BACKEND (build-18): headless gfxPlatform based on Android (FreeType, software)
Decision (user): port the Android gfx backend under the headless toolkit (don't flip
to android toolkit = JNI, or gtk = X11/fontconfig). gfxFT2FontList already
`#ifdef MOZ_WIDGET_ANDROID`-guards its JNI bits, so it compiles for headless using
directory-based font discovery.
- `gfx/thebes/gfxPlatformHeadless.{h,cpp}`: NEW. Stripped gfxAndroidPlatform —
  FreeType init, gfxImageSurface offscreen, gfxFT2FontList, SoftwareVsyncSource;
  dropped Android JNI/vsync/hwbuffer/codec. (software, AccelerateLayersByDefault=false.)
- `gfx/thebes/moz.build`: headless branch builds the FT2 font classes
  (gfxFT2FontBase/Fonts/FontList/Utils) + gfxPlatformHeadless.
- `gfx/thebes/gfxPlatform.cpp`: MOZ_WIDGET_HEADLESS dispatch (include, instantiate,
  variation-font check) → gfxPlatformHeadless.
- `gfx/2d/moz.build`: FreeType backend (UnscaledFontFreeType/ScaledFontFreeType/
  NativeFontResourceFreeType + MOZ_ENABLE_FREETYPE) enabled for headless.
- `mozconfig.full.emscripten`: `-sUSE_FREETYPE=1` (emscripten FreeType port → headers
  + lib).
- `servo/components/style/global_style_data.rs`: wasm32 DummyThreadHandle path now
  applies WITH the gecko feature (was `not(feature=gecko)`) → PlatformThreadHandle defined.
TODO once it compiles: bundle a font in a "fonts" dir on the emscripten FS where
gfxFT2FontList::FindFonts looks (`<process_dir>/fonts/`), else no glyphs.

### FreeType/cairo FT backend (build-21/22)
- style/cbindgen PlatformThreadHandle: KEY learning — cbindgen understands cargo
  *features* but NOT target cfgs (wasm32/unix/emscripten). So gate the dummy on
  `not(feature="gecko")` (cbindgen excludes it for gecko → emits pthread_t) and add
  emscripten to the unix `RawPthread` branch (Rust emscripten matches → pthread_t).
  `servo/components/style/global_style_data.rs`. (Consistent cbindgen vs emcc.)
- cairo FT font backend: `cairo-features.h` gates `CAIRO_HAS_FT_FONT` on
  `MOZ_HAVE_FREETYPE2`, and `cairo-ft-font.c` on `MOZ_ENABLE_CAIRO_FT` — both off for
  emscripten (freetype2 detection is gtk/fontconfig-gated). `toolkit/moz.configure`:
  `MOZ_HAVE_FREETYPE2` and `enable_cairo_ft` now true for EMSCRIPTEN (FreeType via the
  emscripten port / `-sUSE_FREETYPE`). FT_ENCODING_* errors were secondary to the
  cairo-ft.h `#error`.

### Walls fixed:
  - `ipc/chromium/src/third_party/libevent`: created `emscripten/` config (copy of
    linux with epoll/eventfd/sendfile/splice/timerfd disabled; poll/select only);
    `libeventcommon.mozbuild` routes EMSCRIPTEN → that config.
  - `ipc/chromium/src/base/platform_thread.h`: emscripten `PlatformThreadId = pid_t`.
  - `config/makefiles/rust.mk`: cargo `--frozen` → `--offline` (allow Cargo.lock
    updates from vendored sources for wasm dep/feature edits).
  - `third_party/rust/uniffi_core/src/ffi/rustfuture/mod.rs`: flip the
    wasm-unstable-single-threaded cfg gates to plain `target_arch=wasm32` (futures
    aren't Send single-threaded); vendored `.cargo-checksum.json` updated to match.
- Frontier: finishing libxul compile (Rust megacrate `gkrust` + `-Zbuild-std` is slow
  and may surface more crate-level wasm issues), then the **libxul LINK** (~100MB+
  wasm: missing symbols / emscripten settings), runtime bring-up, then Phases 3-5
  (WISP networking, compositor→canvas, embedding). Large multi-step climb; each
  build cycle is minutes. Build cmd: from firefox/ with MOZCONFIG=mozconfig.full.emscripten,
  `./mach build`. Logs in firefox/artifacts/build-full-*.log.

### Graphics font backend RESOLVED (build-25 → build-29): whole tree compiles to the libxul link
The headless toolkit reuses the Android FreeType font impl (gfxFT2Fonts/FontList/
FontBase). Walls cleared, each a small guard making "headless behave like Android":
- `gfx/2d/2D.h` + `gfx/2d/Factory.cpp`: `Factory::CreateScaledFontForFreeTypeFont`,
  the ScaledFontFreeType/NativeFontResourceFreeType/UnscaledFontFreeType includes,
  and the `CreateNativeFontResource`/`CreateUnscaledFontFromFontDescriptor`
  FREETYPE cases — all `#ifdef MOZ_WIDGET_ANDROID` → `|| MOZ_WIDGET_HEADLESS`.
- `gfx/webrender_bindings/Moz2DImageRenderer.cpp`: the two fontconfig fallbacks
  (`UnscaledFontFontconfig`, `FontType::FONTCONFIG`) take the FreeType path for headless.
- `gfx/thebes/gfxFT2FontList.cpp`: `<android/log.h>` guarded Android-only (ALOG → no-op
  fallback); the `androidFontsRoot` FindFontsInDir call moved inside the Android `#if`
  (headless discovers fonts via omnijar + `<process_dir>/fonts/`).
- `dom/ipc/PContent.ipdl`: `SystemFontListEntry` — headless uses the ANDROID variant
  (familyName/faceName/filepath/weightRange/.../index/visibility), not the Linux
  fontconfig `{pattern, appFontFamily}` one, so gfxFT2FontList's accessors resolve.
  (MOZ_WIDGET_HEADLESS is in ACDEFINES so the IPDL preprocessor sees it.)
- **In-tree FreeType (KEY):** emscripten's bundled `-sUSE_FREETYPE` port is FreeType
  **2.6.0** (2015) — missing FT_Done_MM_Var, variable fonts, COLRv1, etc. Switched to
  Gecko's in-tree **FreeType 2.14.3**: `toolkit/moz.configure` `tree_freetype` now true
  for EMSCRIPTEN (builds `/modules/freetype2` into the `freetype` lib, linked via
  toolkit/library's existing `MOZ_TREE_FREETYPE` USE_LIBS gate; sets CAIRO_FT_CFLAGS to
  the in-tree include). `mozconfig.full.emscripten`: dropped `-sUSE_FREETYPE`, added a
  global `-I .../modules/freetype2/include` so every TU resolves `<ft2build.h>` to 2.14.3
  and we don't link two FreeType versions. (build-29 = full reconfigure + rebuild.)
TODO once linked: bundle a .ttf under `<process_dir>/fonts/` on the emscripten FS
(gfxFT2FontList::FindFonts scans NS_XPCOM_CURRENT_PROCESS_DIR/fonts), else no glyphs.

### Remaining Phase 2+ work (ordered, each is substantial)
1. **NSPR → emscripten** (foundational; relatively self-contained, like SpiderMonkey
   was). Single-threaded pthreads config; no context-switch asm; POSIX from emcc.
2. **NSS** (crypto) → emscripten (needed by necko/TLS; or stub for http-only first).
3. **Widget**: NO new widget backend needed. `widget/headless/HeadlessWidget` is a
   complete offscreen nsIWidget, always compiled. The headless toolkit (done) avoids
   GTK/X11. Gecko's docshell/presshell attach to an nsIWidget for event routing + as
   paint-target owner; HeadlessWidget satisfies that. (Corrected: earlier this said
   "write a widget backend" — wrong.)
4. **Render to canvas (lean, software)**: `PresShell::RenderDocument(...)` paints the
   frame tree directly into a Moz2D `DrawTarget` (RAM buffer) — same mechanism as
   `canvas.drawWindow()`/printing, NO GPU compositor, NO widget layers (default).
   Then blit the buffer to the HTML `<canvas>`. WebRender→WebGL is a later
   optimization, not required for first paint.
5. **Necko sockets → WISP** (Phase 3): replace the socket transport with a WISP client.
6. **libxul link**: ~100MB+ wasm; many emscripten incompatibilities to fix; long
   build cycles (30-60+ min each).
7. **Embedding API + address bar** (Phase 5).

This is the bulk of a browser-engine port: multi-subsystem, many long builds. Phase 1
proved the toolchain end-to-end; Phase 2 is the long climb. Proceeding NSPR-first.

## Full Firefox chrome build (embed-chrome/) — DONE

A second build renders the COMPLETE Firefox front-end (browser.xhtml: tab bar, URL
bar, back/forward/reload, hamburger menu) headless in wasm, and real sites load in
tabs (verified: example.com over WISP renders inside the chrome content area).
Shares the same gecko.wasm/.data as embed-xul (symlinked); selected by GECKO_CHROME=1.

How it works / what was needed (all in embed-xul/embed-xul.cpp, chrome-gated):
- Real top-level window: CreateTopLevelWindow(browser.xhtml, CHROME_ALL) instead of
  CreateWindowlessBrowser -- the front-end needs an nsIAppWindow tree owner (installs
  XULBrowserWindow); a windowless browser has none, so gBrowser never inits.
- MOZ_HEADLESS=1: AppWindow uses CreateHeadlessWidget() only when gfxPlatform::
  IsHeadless(); else it calls the platform CreateTopLevelWindow() which the headless
  widget backend never defines -> abort stub.
- Headless appshell: the headless widget toolkit registers NO nsIAppShell
  (NS_APPSHELL_CID). nsAppStartup::Init() do_GetService(that CID) and propagates the
  failure, so @mozilla.org/toolkit/app-startup;1 was FACTORY_NOT_REGISTERED and the
  front-end's Services.startup threw. Registered a no-op nsBaseAppShell subclass
  (EmbedAppShell) under NS_APPSHELL_CID (we pump via SpinEventLoopUntil, no native loop).
- GRE/APP dir split: NS_InitXPCOM binDir = /gre/browser (so resource:/// = front-end),
  GreDirProvider supplies NS_GRE_DIR = /gre AND nsIDirectoryServiceProvider2 GetFiles
  for NS_APP_PREFS_DEFAULTS_DIR_LIST (= /gre/browser/defaults/preferences) so
  firefox.js default prefs load (no omnijar -> only the dir-list branch finds them).
- Fonts staged at /gre/browser/fonts too (FindFonts uses app dir; else "No font files").
- StartupTimeline::Record(PROCESS_CREATION/START/MAIN): XRE normally records these;
  tabs.js reads getStartupInfo().start and threw without them.
- Non-remote tabs: single process has no content process, so forced
  browser.tabs.remote.autostart/fission.autostart=false + open the site tab with
  gBrowser.addTab(url, {forceNotRemote:true}) so the tab browser is in-process and
  has a docshell to render. Driven by evaluating JS in the chrome global (deferred via
  setTimeout so addTab's heavy sync setup runs on the event loop, not nested).

Run: cd embed-chrome; node server.cjs (then open the URL), or headless:
  HOLD=40 node chrome-test.cjs    -> chrome.png (Firefox UI)
  SITE=https://example.com node site-test.cjs  -> site-in-chrome.png (site in a tab)

### Persistent profile (embed-chrome) — DONE
The chrome build's profile (/profile) is now IndexedDB-backed via emscripten IDBFS,
so cookies/permissions/NSS DBs/DOM storage/site-security survive page reloads.
- build-embed-full.sh links `-lidbfs.js` (inert unless JS mounts IDBFS) and exports
  addRunDependency/removeRunDependency.
- embed-chrome/index.html preRun: FS.mkdir('/profile'); FS.mount(IDBFS,{}, '/profile');
  addRunDependency('profile-load'); FS.syncfs(true, ...removeRunDependency). The run
  dependency holds main()/xul_init until the profile is loaded from IndexedDB.
- Writes back with FS.syncfs(false) every 15s + on pagehide/beforeunload
  (window.geckoPersist() is a manual hook).
- Verified: embed-chrome/persist-test.cjs writes a sentinel + lists /profile, reloads
  the page, and confirms the sentinel and all Gecko-written profile files persist.
- Caveat: syncfs(false) snapshots the in-memory FS image; a snapshot taken mid-sqlite-
  write (WAL) could be inconsistent on next load. Acceptable for periodic/unload sync;
  not a transactional guarantee.

### WebExtensions (embed-chrome) — WORKING
WebExtensions install and run in the full-chrome embed. Verified: a temporary MV2
add-on with a content script injects into example.com (paints it magenta + adds an
"EXTENSION ACTIVE" banner) -- embed-chrome/ext-test.png.
- xul_init (chrome): start the Add-on Manager exactly as nsXREDirProvider does --
  do_GetService("@mozilla.org/addons/integration;1")->Observe(null,"addons-startup",
  null). The amManager integration service starts AddonManager/XPIProvider on that
  topic. Without it AddonManager.isReady stayed false and installs threw
  NS_ERROR_NOT_INITIALIZED.
- extensions.webextensions.remote=false (single process: extensions run in-process,
  like tabs).
- Driving it needs chrome JS: added op=5 (chrome eval -> RunChromeScript) +
  window.geckoEval(js) hook in embed-chrome/index.html. ext-test.cjs writes an
  unpacked extension to /ext via IOUtils and AddonManager.installTemporaryAddon()s it.
- Content-script injection works because tabs are in-process (forceNotRemote); the
  ExtensionPolicy injects into the in-process content document.

### Chrome popups (menus, app-menu, context menus) — PARTIAL (renders nothing yet)
Tested the hamburger app-menu and context menus in embed-chrome. Findings:
- Popups DO open and function: a popup's state goes showing->open, popupshowing/
  popupshown events fire, GetVisiblePopups() returns it. So input/logic work.
- They render in their OWN widget, which xul_paint's RenderDocument of the chrome
  window doesn't include -> invisible. Added popup compositing to xul_paint: iterate
  nsXULPopupManager::GetVisiblePopups(), nsLayoutUtils::PaintFrame each onto the same
  buffer at CalcWidgetBounds() (window is at 0,0 so widget bounds = canvas coords).
- BLOCKER: in headless the popup never gets a size. The headless popup widget never
  drives the popup frame's reflow, and PresShell::DoReflow hands a popup reflow root
  its own (zero) inline size as available width -> content collapses -> frame 0x0 ->
  CalcWidgetBounds 0x0 -> nothing to composite. Forcing it (SetSize(window) +
  FrameNeedsReflow(NS_FRAME_IS_DIRTY) + SetPopupPosition + flush) still reflows the
  content back to 0 (the XUL menuitem yields 0 intrinsic width in this build).
- So menus still don't appear. The compositing path is correct and will render popups
  once popup sizing in headless is solved -- that likely needs a libxul-level fix
  (make popup reflow roots use an unconstrained/widget-sized available inline size, or
  fix the headless widget<->frame size sync). Tested with a synthetic menupopup; a
  real contentAreaContextMenu may differ and is worth retrying.

### Chrome fullscreen + live resize — DONE
embed-chrome/index.html is now a bare fullscreen canvas (no header/status/buttons/
url bar/log); a dark loading overlay shows until browser.xhtml has rendered, then
the canvas fills the page. The engine renders the chrome at the LIVE window size and
reflows on resize (not a fixed buffer scaled):
- JS: WIDTH/HEIGHT track window.innerWidth/Height (onResize), sent in every command;
  runCmd snapshots them so a mid-flight resize can't mismatch the buffer/ImageData;
  blit() resizes the canvas backing to the rendered frame. Canvas CSS is 100vw/100vh,
  so pointer mapping (canvasXY: WIDTH/rect.width) stays ~1:1 and exact.
- C++ (embed-xul.cpp): EnsureSize(w,h) resizes the AppWindow (chrome) / docshell
  base window (content) via SetPositionAndSize, only when the size changed (resize
  forces a reflow). Called from xul_paint + gpu_present + EnsureBrowser. The chrome
  reflows to fill; verified at 1100x700 / 1600x1000 / 820x560 (resize-test.cjs:
  rendered dims + non-white px scale with the window; URL bar/toolbar reflow, icons
  pin right).
- index.html sets MOZ_HEADLESS_WIDTH/HEIGHT (headless screen) >= the physical screen
  so large windows aren't clamped.

### Chrome popups (menus, context menus, app-menu) — FIXED
Context menus / menus now open AND render. Verified: right-click the URL bar shows
the real text context menu (Undo/Redo/Cut/Copy/Paste/Paste and Go/Delete/Select All)
rendered on the canvas (embed-chrome/rclick-test.cjs -> rclick.png); a synthetic
menupopup with a 300x200 div and a menuitem both size + paint (menu-test.cjs).

Root cause (two compounding bugs, both from the minimal embedding bypassing XRE/the
per-toolkit nsAppShell):
1. The gfx ScreenManager was never populated. Real Firefox installs a screen helper
   in the per-toolkit nsAppShell (gtk: screenManager.SetHelper(HeadlessScreenHelper)),
   but our no-op EmbedAppShell doesn't, so the ScreenManager had zero screens ->
   nsMenuPopupFrame::GetConstraintRect got a 0-size screen and clamped every popup's
   mUsedRect to 0x0 (invisible), even though the content measured correctly.
2. The headless popup widget never sizes the popup frame, so PresShell::DoReflow
   handed the popup reflow root a 0 available inline size and its content collapsed.

Fix (all embedder-side; libxul source UNCHANGED):
- RefreshScreen(w,h) in embed-xul.cpp: ScreenManager::Refresh() with one Screen the
  size of the window; called at window creation (EnsureBrowser) and on resize
  (EnsureSize). Screen == window so popups also stay within the visible canvas.
- In xul_paint's popup-compositing loop: when a popup's CalcWidgetBounds is 0, give
  the frame the window inline size, FrameNeedsReflow + flush + SetPopupPosition so it
  reflows to content; self-limiting (skipped once sized).
- The compositing loop (nsXULPopupManager::GetVisiblePopups -> nsLayoutUtils::
  PaintFrame at CalcWidgetBounds) paints popups onto the canvas (they live in their
  own widgets RenderDocument doesn't include).
- do_mouse evType=3 -> "contextmenu" + the canvas contextmenu handler sends it (a
  synthesized right mousedown/up alone doesn't generate eContextMenu headless), so
  right-clicking the canvas opens the menu.
NOTE: the earlier "popups lay out to 0x0, never reflowed" diagnosis was a red herring
caused by menu-test.cjs's CDP capture filtering out console lines lacking the word
"popup"; LayoutPopup was running all along.

### about:preferences sidebar — FIXED
Clicking a sidebar category (Search, Privacy, etc.) now loads its content (verified:
about:preferences renders the full Account/Search/etc. panes; switching to "Search"
shows Default search engine + engine list). Was: clicking a category switched but
the pane was empty.
Root cause: this is a platform=other / headless build, so AppConstants.
HAVE_SHELL_SERVICE is false. preferences/main.js only registers the
browser.shell.checkDefaultBrowser Preference under `if (HAVE_SHELL_SERVICE)`, but the
"alwaysCheckDefault" Setting (which references that pref) is registered
unconditionally -> Preferences.addSetting throws PreferenceNotAddedError at top level
-> main.js aborts before defining gMainPane -> the General pane controller (and the
settings init) is missing, so panes render empty.
Fix: firefox/browser/components/preferences/main.js -- register
browser.shell.checkDefaultBrowser even when !HAVE_SHELL_SERVICE (the default-browser
UI stays hidden via DefaultBrowserHelper.canCheck, so no shell-service access). Pure
front-end JS (chrome), no libxul rebuild; mirrored into gre-stage + `mach build
faster` so dist/stage match. Test: embed-chrome/prefs-test.cjs.
Remaining (minor, non-fatal): "Setting group homepage not found" (Home pane) and
missing platform services (useridleservice/shell-service/update-service) which other
panes' individual controls reference -- the sidebar + most panes work regardless.

### Content context menus (right-click web pages) — FIXED
Right-clicking page content now opens contentAreaContextMenu correctly (Save Page
As / Select All / View Page Source / Inspect / ...). Was: TypeError "can't access
property defaultView, this.ownerDoc is undefined" at nsContextMenu.sys.mjs:282.
Root cause: the browser desktop JSWindowActors were never registered. BrowserGlue
normally registers them (DesktopActorRegistry.init() in BrowserGlue._init), but
BrowserGlue doesn't fully run in this minimal embedding -> ContextMenu actor missing
-> a content right-click isn't intercepted by ContextMenuChild (which sets
nsContextMenu.contentData), yet contentAreaContextMenu still opens -> nsContextMenu
runs the no-contentData branch with an empty context (target/ownerDoc undefined) ->
crash.
Fix: embed-xul.cpp xul_load (chrome path), once after browser.xhtml loads, runs
DesktopActorRegistry.init() via RunChromeScript -> registers ContextMenu (and all the
other desktop window/process actors). Embedder-only change, no libxul rebuild.
Verified: embed-chrome/ctxfinal.cjs (actor registered=true, no crash, menu renders).
Bonus: registering the full actor set should also unblock other actor-dependent
front-end features.

### Popup rollup + rounded corners — FIXED
Popups/context menus now (1) dismiss when you click off them and (2) have rounded
corners like desktop Firefox. (1) embed-xul.cpp do_mouse: on a mousedown outside all
visible-popup CalcWidgetBounds, call nsXULPopupManager::Rollup(RollupOptions{mCount=0})
and consume the click (the native headless rollup listener is a no-op, so we drive
rollup ourselves). (2) the chrome-startup RunChromeScript registers an AGENT_SHEET
`menupopup,panel,.menupopup-arrowscrollbox{border-radius:8px !important}`. The visible
menu box is `.menupopup-arrowscrollbox` (part=content) in the menupopup's UA shadow DOM
(the host is transparent); the popup compositor (PaintFrame + transparent backstop)
honors the radius so corners render genuinely rounded. Embedder-only, no libxul
rebuild. Verified: embed-chrome/rollup-test.cjs (OPEN_POPUPS 1->0) + rollup-open.png.

### Full-chrome GPU (?gpu=1) — FIXED
The full-chrome build rendered an all-white page under ?gpu=1, logging
`RenderCompositorSWGL failed mapping default framebuffer, no dt` — it fell back to
SOFTWARE WebRender, unlike the windowless embed-xul build (hardware RenderCompositorOGL).
Root cause: the chrome build sets MOZ_HEADLESS=1 (needed so AppWindow uses
CreateHeadlessWidget), making gfxPlatform::IsHeadless() true; InitCompositorAccelerationPrefs
force-disables Feature::HW_COMPOSITING in headless mode, and that ForceDisable overrides
even layers.acceleration.force-enabled ("safe/headless modes override everything"). No
HW_COMPOSITING -> ConfigureWebRender disables Feature::WEBRENDER -> UseSoftwareWebRender=true
-> SWGL, which needs a window DrawTarget the headless widget can't supply -> white. The
windowless build skips this (IsHeadless()=false).
Fix: gfx/thebes/gfxPlatform.cpp wraps the headless HW_COMPOSITING ForceDisable in
`#ifndef __EMSCRIPTEN__` — on emscripten "headless" only means no native window;
GLContextProviderEmscripten still backs the compositor with a real WebGL2 context, so
WebRender hardware stays enabled. No widget/GL changes needed (the emscripten GL-context
path is widget-independent; gpu_present drives whatever widget the presshell reports).
libxul change -> mach build binaries + restrip-relink-web.sh. Verified: the chrome
window's windowUtils.layerManagerType is now "WebRender" (was "WebRender (Software)"),
no SWGL/GFX1- errors, content composites on the GPU. Test: embed-chrome/gpu-chrome-test.cjs
(screenshot gpu-chrome.png).

### Full-chrome GPU popups — FIXED
With the chrome compositing on the GPU, opening any popup (context menu, app menu,
<select>) made it flicker at the canvas bottom-left, alternating with the main view
and white. Cause: a XUL popup is a separate top-level widget AND a separate display
root (NS_FRAME_IN_POPUP -> GetDisplayRootFrame stops at the popup, so popups are never
in the main window's WebRender scene). With HW_COMPOSITING now enabled, each popup
widget got its own WebRender compositor (ShouldUseOffMainThreadCompositing is global),
and nsXULPopupManager::PaintPopups had each one present its small framebuffer to the
SAME single page <canvas>, clearing it and landing at the GL origin (bottom-left) --
multiple compositors fighting one canvas. (Content was fine because in-process
<browser> subdocuments paint into the chrome window's scene, not a separate widget.)
Single-canvas wasm can't do in-Gecko multi-window GPU compositing, so the fix keeps
popups off the GPU and overlays them:
- libxul widget/headless/HeadlessWidget: ShouldUseOffMainThreadCompositing() returns
  false for WindowType::Popup (#if __EMSCRIPTEN__), so popup widgets use the fallback
  renderer and PaintPopups never composites them to the canvas -> main scene stable.
- embedder embed-xul.cpp: factored the software popup loop into composite_visible_popups()
  (shared with xul_paint) + paint_popup_overlay() paints visible popups into a
  transparent canvas-sized BGRA buffer (returned via result/resultLen in GPU mode).
- JS index.html: a 2D #popups overlay canvas stacked over the WebGL #screen; draws the
  popup buffer (un-premultiplied, alpha preserved) so the GPU scene shows through; clears
  when no popup is open.
Content + chrome stay GPU-accelerated; popups (small, transient) are software-painted
onto the overlay. Verified: embed-chrome/gpu-popup-test.cjs (context menu renders at the
correct position over the GPU scene, no SWGL errors, dismiss clears it; screenshots
gpu-popup-open/closed.png).

### New tab page (about:newtab / about:home) — FIXED
New tabs showed nothing and logged `AboutNewTabRedirector.sys.mjs NS_ERROR_NOT_AVAILABLE
[nsIIOService.newChannelFromURIWithLoadInfo]`. The new-tab page is a built-in add-on
(newtab@mozilla.org); about:newtab redirects to resource://newtab/prerendered/activity-
stream.html, but resource://newtab/ is set up by AboutNewTabResourceMapping.init() during
BrowserGlue startup, which doesn't run in this minimal embedding -> unmapped -> the
redirect channel fails. The content is packaged (gre-stage/.../builtin-addons/newtab/) and
resource://builtin-addons/ is mapped.
Fix: embed-xul.cpp chrome-startup RunChromeScript also runs
AboutNewTabResourceMapping.init() (next to DesktopActorRegistry.init()); since the newtab
add-on isn't active in the AddonManager, getPreferredMapping() falls back to
resource://builtin-addons/newtab/ and maps resource://newtab/ -> activity-stream loads
(search bar renders; top-sites/sponsored areas stay empty without those services/network,
expected). Embedder-only, no libxul rebuild. Same class as the DesktopActorRegistry and
about:preferences fixes (missing BrowserGlue/XRE init steps). Verified:
embed-chrome/newtab-auto-test.cjs (no redirector error at startup; screenshot
newtab-auto.png).

### Debranding: "Nightly" -> "Firefox"
The build sets no --with-branding, so it defaults to browser/branding/unofficial,
whose brand name is "Nightly" -> the front-end (window title, menus, about pages) all
said "Nightly". Changed the brand-name strings to "Firefox" in the source
(firefox/browser/branding/unofficial/locales/en-US/brand.ftl + brand.properties) and
the staged copies (embed-xul/gre-stage/.../branding/brand.ftl +
.../locale/branding/brand.properties): -brand-shorter/short/shortcut/full-name and
brandShorter/Short/FullName. Front-end resources only -> restrip-relink-web.sh
repackages gre-stage (no libxul rebuild). Verified the legacy bundle (brandShortName=
Firefox) and a Fluent message ("Refresh Firefox"). The generic unofficial logo images
(chrome://branding/content/about-logo.*) were left as-is.
