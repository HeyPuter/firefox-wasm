// XPCOM bring-up: NS_InitXPCOM + the directory-service / app-shell providers the
// minimal embedding needs, plus all the runtime prefs/services XRE_main would set.
// Split from the monolithic embed-xul.cpp. See embed-xul.h.
#include "embed-xul.h"
#include "nsUserIdleService.h"
#include "mozilla/GenericFactory.h"
#include "mozilla/ModuleUtils.h"
// For the chrome build, NS_InitXPCOM is given binDir = the APP dir (/gre/browser)
// so resource:/// (NS_XPCOM_CURRENT_PROCESS_DIR) resolves to the Firefox front-end
// (its modules/sessionstore/... live under /gre/browser), while NS_GRE_DIR stays at
// the GRE (/gre) -- the standard Firefox GRE/app directory split. This provider
// mimics the parts of nsXREDirProvider the front-end needs: NS_GRE_DIR and the
// NS_APP_PREFS_DEFAULTS_DIR_LIST (so $app/defaults/preferences/firefox.js loads --
// without an omnijar, the pref service only finds the browser default prefs via
// this dir list). Everything else falls through to the default provider.
class GreDirProvider final : public nsIDirectoryServiceProvider2 {
 public:
  NS_DECL_ISUPPORTS
  GreDirProvider(const char* aGreDir, const char* aAppDir)
      : mGreDir(aGreDir), mAppDir(aAppDir) {}
  NS_IMETHOD GetFile(const char* aProp, bool* aPersistent,
                     nsIFile** aResult) override {
    if (!strcmp(aProp, NS_GRE_DIR) || !strcmp(aProp, NS_GRE_BIN_DIR)) {
      *aPersistent = true;
      return NS_NewNativeLocalFile(mGreDir, aResult);
    }
    return NS_ERROR_FAILURE;
  }
  NS_IMETHOD GetFiles(const char* aProp, nsISimpleEnumerator** aResult) override {
    if (!strcmp(aProp, NS_APP_PREFS_DEFAULTS_DIR_LIST)) {
      nsCOMPtr<nsIFile> prefDir;
      nsresult rv = NS_NewNativeLocalFile(mAppDir, getter_AddRefs(prefDir));
      NS_ENSURE_SUCCESS(rv, rv);
      prefDir->AppendNative("defaults"_ns);
      prefDir->AppendNative("preferences"_ns);
      nsCOMArray<nsIFile> dirs;
      dirs.AppendObject(prefDir);
      rv = NS_NewArrayEnumerator(aResult, dirs, NS_GET_IID(nsIFile));
      NS_ENSURE_SUCCESS(rv, rv);
      return NS_SUCCESS_AGGREGATE_RESULT;
    }
    return NS_ERROR_FAILURE;
  }

 private:
  ~GreDirProvider() = default;
  nsCString mGreDir;
  nsCString mAppDir;
};
NS_IMPL_ISUPPORTS(GreDirProvider, nsIDirectoryServiceProvider,
                  nsIDirectoryServiceProvider2)

// The headless widget toolkit registers no nsIAppShell (NS_APPSHELL_CID): a pure
// headless build is unusual -- Firefox --headless piggybacks on the GTK appshell,
// which carries NS_APPSHELL_CID. nsAppStartup::Init() does do_GetService(that CID)
// and propagates the failure, so without an appshell @mozilla.org/toolkit/app-startup;1
// resolves to FACTORY_NOT_REGISTERED and the front-end's Services.startup throws,
// which aborts tabbrowser init (gBrowser stays undefined). We pump the event loop
// with SpinEventLoopUntil and have no native event source, so a no-op appshell that
// merely satisfies the service dependency is sufficient.
class EmbedAppShell final : public nsBaseAppShell {
 public:
  EmbedAppShell() = default;
  nsresult InitShell() { return Init(); }

 protected:
  ~EmbedAppShell() override = default;
  void ScheduleNativeEventCallback() override {}
  bool ProcessNextNativeEvent(bool) override { return false; }
};

class EmbedAppShellFactory final : public nsIFactory {
 public:
  NS_DECL_ISUPPORTS
  explicit EmbedAppShellFactory(nsIAppShell* aShell) : mShell(aShell) {}
  NS_IMETHOD CreateInstance(const nsIID& aIID, void** aResult) override {
    return mShell->QueryInterface(aIID, aResult);
  }

 private:
  ~EmbedAppShellFactory() = default;
  nsCOMPtr<nsIAppShell> mShell;
};
NS_IMPL_ISUPPORTS(EmbedAppShellFactory, nsIFactory)

// The cairo-headless toolkit registers no platform user-idle service
// (@mozilla.org/widget/useridleservice;1 lives in widget/{gtk,...}/components.conf,
// none built here). Front-end code does
// `Cc['@mozilla.org/widget/useridleservice;1'].getService(...)` -- e.g.
// SessionStore's SessionSaver.sys.mjs -- and throws "Cc[...] is undefined" when the
// contract is unregistered. Register the GENERIC nsUserIdleService: its base
// PollIdleTime() returns false (no OS idle polling, correct for headless; idle is
// still tracked via the internal timer / ResetIdleTimeOut machinery), so consumers
// get a working nsIUserIdleService. A trivial subclass exposes the protected base
// constructor for the generic factory.
class EmbedUserIdleService final : public nsUserIdleService {
 public:
  EmbedUserIdleService() = default;

 protected:
  ~EmbedUserIdleService() override = default;
};
NS_GENERIC_FACTORY_CONSTRUCTOR(EmbedUserIdleService)
// Fresh CID for our factory; consumers use the contract id, not this CID.
#define EMBED_USERIDLE_CID                           \
  {                                                  \
    0x6f3a1c84, 0x9b2d, 0x4e57, {                    \
      0xa1, 0x0c, 0x3d, 0x82, 0x6b, 0x4f, 0x91, 0xe3 \
    }                                                \
  }

// Defined in widget/nsTransferable.cpp (emscripten only): registers the widget
// components the cairo-headless toolkit omits (transferable / format converter /
// clipboard helper).
extern "C" void WasmRegisterWidgetComponents();

extern "C" EMSCRIPTEN_KEEPALIVE int xul_init(const char* greDir) {
  printf("xul_init: GRE dir = %s\n", greDir);
  fflush(stdout);
  // Note: /dev/shm (needed by Gecko's shm_open-based IPC shared memory) is created
  // by the WasmFS patch in patch-emsdk-wasmfs.mjs -- it can't be mkdir'd here
  // because WasmFS's /dev is mode 0555 (mkdir returns EACCES).

  // String `fs:`/`profile:` paths are served by WasmFS's NATIVE OPFS backend:
  // ranged sync-access-handle I/O on a dedicated worker, with NO round-trip to the
  // page main thread -- the fast path (the proxy-to-R ProviderBackend below is only
  // for custom JS providers). Mount it ONCE at /opfs, which maps to the OPFS root;
  // GRE_DIR / PROFILE_DIR then point at /opfs/<path> (index.ts). Safe to create
  // here: xul_init runs on the app pthread (PROXY_TO_PTHREAD), not the browser main
  // thread -- creating the backend on the main thread would deadlock waiting for the
  // OPFS worker to spawn (see emscripten/wasmfs.h).
  // GECKO_SKIP_OPFS: diagnostic for the nested (interpreter-in-interpreter)
  // case. Creating the OPFS backend proxies to spawn an OPFS worker and the app
  // pthread blocks for it; under the in-process interpreter the inner app pthread
  // runs synchronously and cannot yield, so this deadlocks. Skipping it falls the
  // profile back to the default in-memory WasmFS backend (mkdir creates /opfs/*).
  if (getenv("GECKO_OPFS_MOUNT") && !getenv("GECKO_SKIP_OPFS")) {
    backend_t ob = wasmfs_create_opfs_backend();
    int orv = wasmfs_create_directory("/opfs", 0777, ob);
    printf("xul_init: mounted /opfs (native OPFS backend) rv=%d\n", orv);
    fflush(stdout);
  } else {
    printf("xul_init: OPFS mount skipped (GECKO_SKIP_OPFS or no mount)\n");
    fflush(stdout);
  }

  // Mount the GRE provider backend at greDir BEFORE NS_InitXPCOM reads any GRE
  // resource. When an `fs` provider OBJECT is registered (index.ts sets
  // GECKO_GRE_PROVIDER + GRE_DIR=/gre), greDir is the empty /gre and we mount a
  // pass-through ProviderBackend there: readdir/stat/read are served live from the
  // provider (Module.geckoProviders[0]). (String paths use /opfs above instead;
  // gecko.data stays baked at /gre-baked for the no-`fs` case.)
  // (emsdk-patches/provider_backend.h + build/provider-fs.js.)
  if (getenv("GECKO_GRE_PROVIDER")) {
    backend_t gb = wasmfs_create_provider_backend(/*mountId=*/0);
    int grv = wasmfs_create_directory(greDir, 0555, gb);
    printf("xul_init: mounted %s (GRE provider backend) rv=%d\n", greDir, grv);
    fflush(stdout);
  }

  // Content build: binDir = the GRE (/gre), no provider. Chrome build: binDir = the
  // APP dir (/gre/browser) so resource:/// points at the Firefox front-end, with a
  // provider supplying NS_GRE_DIR = /gre.
  bool chrome = getenv("GECKO_CHROME") != nullptr;
  // The full chrome runs in a real top-level XUL window. With the headless widget
  // toolkit, AppWindow only uses CreateHeadlessWidget() when gfxPlatform::IsHeadless()
  // is true (otherwise it calls the platform CreateTopLevelWindow(), which the
  // headless backend never defines -> abort stub). IsHeadless() is keyed off
  // MOZ_HEADLESS, so set it before any gfx init. Chrome-only to avoid touching the
  // content build's behavior.
  if (chrome) setenv("MOZ_HEADLESS", "1", 1);

  // Disable e10s/Fission DETERMINISTICALLY. mozilla::BrowserTabsRemoteAutostart()
  // defaults e10s ON and IGNORES the browser.tabs.remote.autostart pref -- its only
  // off-switch is the MOZ_FORCE_DISABLE_E10S env var (read once via PR_GetEnv and
  // cached). index.html sets it in Module.ENV, but that's fragile (harness drift /
  // env not yet visible to PR_GetEnv when e10s is first computed); if it's missed,
  // e10s turns on -> tabs + the extension background try to load REMOTE -> the child
  // process launch hits `socketpair` (unsupported here) -> "Failed to launch tab
  // subprocess" -> pages stick at about:blank AND the extension background MM is torn
  // down ("Message manager was disconnected before receiving
  // Extension:BackgroundViewLoaded"). Setting the env here in C++, on the main
  // thread before NS_InitXPCOM (and thus before any e10s/window/tab creation),
  // guarantees PR_GetEnv sees it. (Single process: no content/extension subprocess
  // can exist.) The prefs set later in xul_init are belt-and-suspenders.
  setenv("MOZ_FORCE_DISABLE_E10S", "1", 1);

  printf("xul_init: DBG post-mounts chrome=%d, making binDir\n", chrome);
  fflush(stdout);
  nsAutoCString binPath(greDir);
  if (chrome) binPath.AppendLiteral("/browser");
  nsCOMPtr<nsIFile> binDir;
  nsresult rv = NS_NewNativeLocalFile(binPath, getter_AddRefs(binDir));
  printf("xul_init: DBG NS_NewNativeLocalFile rv=0x%08x\n", (unsigned)rv);
  fflush(stdout);
  if (NS_FAILED(rv)) {
    printf("xul_init: NS_NewNativeLocalFile FAILED rv=0x%08x\n", (unsigned)rv);
    fflush(stdout);
    return (int)rv;
  }

  printf("xul_init: calling NS_InitXPCOM (binDir=%s)...\n", binPath.get());
  fflush(stdout);
  nsCOMPtr<nsIServiceManager> servMan;
  nsCOMPtr<nsIDirectoryServiceProvider> provider;
  if (chrome) provider = new GreDirProvider(greDir, binPath.get());
  rv = NS_InitXPCOM(getter_AddRefs(servMan), binDir, provider);
  printf("xul_init: NS_InitXPCOM returned rv=0x%08x (%s)\n", (unsigned)rv,
         NS_SUCCEEDED(rv) ? "SUCCESS" : "FAIL");
  fflush(stdout);

  if (NS_SUCCEEDED(rv)) {
    // The cairo-headless toolkit doesn't register the platform widget components
    // (transferable / html format converter / clipboard helper live in
    // widget/{gtk,...}/components.conf, none built here). Register them at runtime
    // so editor copy/cut/paste can build transferables. See widget/nsTransferable.cpp.
    WasmRegisterWidgetComponents();

    // Register the headless user-idle service (see EmbedUserIdleService above) so
    // @mozilla.org/widget/useridleservice;1 resolves -- otherwise SessionSaver and
    // other front-end consumers throw "Cc[...] is undefined".
    {
      nsCOMPtr<nsIComponentRegistrar> ireg;
      NS_GetComponentRegistrar(getter_AddRefs(ireg));
      bool idlePresent = false;
      if (ireg &&
          !(NS_SUCCEEDED(ireg->IsContractIDRegistered(
                "@mozilla.org/widget/useridleservice;1", &idlePresent)) &&
            idlePresent)) {
        static NS_DEFINE_CID(kIdleCID, EMBED_USERIDLE_CID);
        RefPtr<mozilla::GenericFactory> ifac =
            new mozilla::GenericFactory(EmbedUserIdleServiceConstructor);
        nsresult irv =
            ireg->RegisterFactory(kIdleCID, "UserIdleService",
                                  "@mozilla.org/widget/useridleservice;1", ifac);
        printf("xul_init: registered headless user-idle service rv=0x%08x\n",
               (unsigned)irv);
        fflush(stdout);
      }
    }

    // Populate Services.appinfo (nsIXULAppInfo). XRE_main normally sets the global
    // gAppData from the app's nsXREAppData; this minimal embedding skips XRE, so
    // gAppData stays null -> the nsIXULAppInfo interface is not exposed and
    // appinfo.version/ID/appBuildID are all `undefined`. That breaks version-gated
    // logic: WebExtensions can't match a target application (isCompatible=false ->
    // "incompatible with {app} {$version}", $version blank) and add-on background
    // code that reads runtime.getBrowserInfo().version (e.g. uBlock Origin) gets
    // undefined and misbehaves. Point gAppData at a static app descriptor. Values
    // mirror a Firefox build (ID is the Firefox app id so add-ons targeting Firefox
    // match); platformVersion/platformBuildID come from gToolkitVersion/BuildID
    // (compile-time) once the interface is exposed. Set after NS_InitXPCOM so init
    // itself is unaffected; appinfo consumers (AddonManager, front-end) run later.
    // Keep in sync with browser/config/version.txt (GRE_MILESTONE / the build's
    // app version); MOZ_APP_VERSION isn't a C macro in this embedder's compile.
    static const char* const kAppVersion = "153.0a1";
    static const mozilla::StaticXREAppData kStaticAppData = {
        .vendor = "Mozilla",
        .name = "Firefox",
        .remotingName = "firefox",
        .version = kAppVersion,
        .buildID = "20990101000000",
        .ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}",  // Firefox application id
    };
    static mozilla::XREAppData sAppData(kStaticAppData);
    gAppData = &sAppData;
    printf("xul_init: set gAppData (appinfo version=%s)\n", kAppVersion);
    fflush(stdout);

    // Initialize sqlite for mozStorage. XREMain normally constructs an
    // AutoSQLiteLifetime to call sqlite3_config()/sqlite3_initialize(); this
    // minimal embedding skips XRE, so AutoSQLiteLifetime::Init() never runs and
    // AutoSQLiteLifetime::sResult stays at its default SQLITE_MISUSE. The storage
    // service (mozStorage) then fails to construct -> do_GetService returns null ->
    // every DB open (cookies/IndexedDB/places) null-derefs. Construct it here
    // (leaked, process-lifetime) before anything touches storage.
    new mozilla::AutoSQLiteLifetime();
    printf("xul_init: AutoSQLiteLifetime initialized, getInitResult=%d\n",
           mozilla::AutoSQLiteLifetime::getInitResult());
    fflush(stdout);

    // Chrome build: register a no-op nsIAppShell under NS_APPSHELL_CID so
    // nsAppStartup (Services.startup) can construct -- see EmbedAppShell. Must
    // happen before the app-startup category / front-end run.
    if (chrome) {
      nsCOMPtr<nsIComponentRegistrar> reg;
      NS_GetComponentRegistrar(getter_AddRefs(reg));
      if (reg) {
        RefPtr<EmbedAppShell> shell = new EmbedAppShell();
        nsresult srv = shell->InitShell();
        static NS_DEFINE_CID(kAppShellCID, NS_APPSHELL_CID);
        RefPtr<EmbedAppShellFactory> fac = new EmbedAppShellFactory(shell);
        nsresult rrv = reg->RegisterFactory(
            kAppShellCID, "EmbedAppShell",
            "@mozilla.org/widget/appshell/headless;1", fac);
        printf("xul_init: registered headless appshell init=0x%08x reg=0x%08x\n",
               (unsigned)srv, (unsigned)rrv);
        fflush(stdout);
      }

      // XRE normally records these startup timestamps; this embedding skips XRE,
      // so nsAppStartup::GetStartupInfo() returns an object missing .start/.main
      // and the front-end (tabs.js) throws reading getStartupInfo().start. Record
      // them now (monotonic from Now()) so getStartupInfo() yields valid Dates.
      mozilla::TimeStamp now = mozilla::TimeStamp::Now();
      mozilla::StartupTimeline::Record(
          mozilla::StartupTimeline::PROCESS_CREATION, now);
      mozilla::StartupTimeline::Record(mozilla::StartupTimeline::START, now);
      mozilla::StartupTimeline::Record(mozilla::StartupTimeline::MAIN, now);
      printf("xul_init: recorded startup timeline\n");
      fflush(stdout);

      // Single process: no content process exists, so tabs must be non-remote
      // (a remote <browser> would have a null remoteTab and RemoteWebNavigation
      // throws). MOZ_FORCE_DISABLE_E10S + these prefs keep tab browsers in-process.
      mozilla::Preferences::SetBool("browser.tabs.remote.autostart", false);
      mozilla::Preferences::SetBool("fission.autostart", false);
      mozilla::Preferences::SetBool("browser.tabs.remote.force-enable", false);
      // WebExtensions also have no separate process here -> run them in-process.
      mozilla::Preferences::SetBool("extensions.webextensions.remote", false);
      // Don't reject add-ons whose strict_max_version is below our app version
      // (153.0a1). AddonManager defaults gCheckCompatibility=true and reads
      // extensions.checkCompatibility.nightly (our build is a1 -> NIGHTLY_BUILD);
      // real Nightly sets this false in its default prefs so add-ons aren't blocked
      // by maxVersion, but we don't ship those, so installs failed with
      // addon-install-error-incompatible. Must be set BEFORE addons-startup below.
      mozilla::Preferences::SetBool("extensions.checkCompatibility.nightly", false);
      // Don't require signed add-ons. We also skip the signature *verification* step
      // (XPIInstall shouldVerifySignedState) because the async NSS verifier
      // (openSignedAppFileAsync) never completes in this wasm build -> install hangs
      // forever at "Verifying". This pref keeps the requirement consistent with that.
      mozilla::Preferences::SetBool("xpinstall.signatures.required", false);
      // During install, XPIInstall.loadManifest fetches the add-on's AMO metadata
      // (AddonRepository.cacheAddons -> a network request to addons.mozilla.org). Over
      // WISP that request never returns, so the install hangs forever at "Verifying"
      // (right after loadManifest, before staging). Disable the AMO metadata cache so
      // cacheAddons/getCachedAddonByID short-circuit (no fetch); the add-on installs
      // without ratings/screenshots metadata, which we don't use.
      mozilla::Preferences::SetBool("extensions.getAddons.cache.enabled", false);
      printf("xul_init: forced non-remote tabs + extensions (single process)\n");
      fflush(stdout);
    }

    // No socket/network process: we have no subprocess support, and networking is
    // in-process over WISP. With network.process.enabled at its desktop default
    // (true), Gecko repeatedly tries (and fails) to launch the socket subprocess
    // ("Failed to launch socket subprocess"), leaving the IPC I/O thread's libevent
    // pump spinning on a perpetually-ready wakeup pipe (~113k select()/s at idle).
    // Force it off so the socket process is never attempted -> the IPC pump idles.
    mozilla::Preferences::SetBool("network.process.enabled", false);
    mozilla::Preferences::SetBool(
        "network.http.network_access_on_socket_process.enabled", false);
    printf("xul_init: disabled socket/network process (single process)\n");
    fflush(stdout);

    // Stylo thread count. Kept SEQUENTIAL (1) deliberately: build-std+atomics makes
    // parallel stylo *work* (no more "thread handle already set" abort, threads spawn
    // fine), but measured on a style-bound page (css-stress, 2400 elems, ~91% style
    // recalc) it REGRESSES monotonically with thread count (1->170ms, 4->174ms,
    // 8->188ms per restyle). The emscripten cross-thread sync tax (Atomics futex
    // wake/wait + spin contention in rayon's work-stealing join) exceeds the
    // parallelism benefit for fine-grained style traversal. So sequential is faster
    // here. Override with GECKO_STYLO_THREADS to re-measure (e.g. if the sync tax is
    // ever reduced). See bench/RESULTS.md.
    int styloThreads = 1;
    if (const char* st = getenv("GECKO_STYLO_THREADS")) { int v = atoi(st); if (v != 0) styloThreads = v; }
    mozilla::Preferences::SetInt("layout.css.stylo-threads", styloThreads);
    printf("xul_init: set layout.css.stylo-threads=%d\n", styloThreads);

    // Disable the shared-memory UA stylesheet cache. It exists only to share the
    // built-in UA sheets across CONTENT PROCESSES; this is a single-process build
    // (no e10s/Fission), so it's pure overhead -- and Stylo's to_shmem builder
    // (Servo_SharedMemoryBuilder_AddStylesheet) panics on the larger chrome UA
    // sheet set (RustMozCrash in to_shmem::SharedMemoryBuilder::alloc), which
    // blocks the chrome front-end from loading. Off => UA sheets load per-process.
    mozilla::Preferences::SetBool("layout.css.shared-memory-ua-sheets.enabled", false);
    printf("xul_init: disabled shared-memory UA sheets (single-process)\n");

    // ALWAYS-ACTIVE: a windowless browser is "inactive" by default. An inactive
    // top-level throttles its refresh driver to the background frame rate
    // (~1fps via layout.throttled_frame_rate), so content requestAnimationFrame,
    // CSS animations/transitions, smooth scroll and <video> run at ~0.5fps even
    // though setTimeout is unaffected. We are an embedder that is always presenting
    // the page, so force it active so the refresh driver ticks at the full frame
    // rate. (Measured: software-mode rAF 0.5fps -> 60fps. Previously this pref was
    // set only under GECKO_GPU, where it was also needed to avoid an early-return in
    // PaintAndRequestComposite.)
    mozilla::Preferences::SetBool("layout.testing.top-level-always-active", true);

    // MEDIA AUTOPLAY: a windowless browser is never a foreground/active *tab* in the
    // media sense, so HTMLMediaElement::Play parks autoplay as a pending promise and
    // only frame 1 is ever rendered:
    //   - MediaPlaybackDelayPolicy::ShouldDelayPlayback() delays Play() for an
    //     inactive tab; block-autoplay-until-in-foreground=false short-circuits it.
    //   - media.autoplay.default defaults to 1 (Blocked); 0 (Allowed) lets <video>
    //     autoplay outright.
    //   - suspend-background-video would suspend the decoder for a "hidden" tab.
    // These let host-WebCodecs-decoded <video> actually play (see the WebCodecsProxy
    // PlatformDecoderModule + lib/webcodecs-bridge.js).
    mozilla::Preferences::SetBool("media.block-autoplay-until-in-foreground", false);
    mozilla::Preferences::SetInt("media.autoplay.default", 0 /* Allowed */);
    mozilla::Preferences::SetBool("media.suspend-background-video.enabled", false);
    printf("xul_init: enabled media autoplay (no foreground-delay/suspend)\n");

    // Follow the HOST browser's prefers-color-scheme. The loader's preRun reads
    // window.matchMedia('(prefers-color-scheme: dark)') and passes it as GECKO_DARK;
    // setting ui.systemUsesDarkTheme overrides LookAndFeel::NativeGetInt
    // (nsXPLookAndFeel::GetIntValue checks this pref first), so BOTH the default
    // chrome theme and content prefers-color-scheme track the host. Unset => the
    // native headless default (light). (Initial detection only; a host scheme flip
    // mid-session would need the loader to re-push the pref.)
    if (const char* d = getenv("GECKO_DARK")) {
      mozilla::Preferences::SetInt("ui.systemUsesDarkTheme", atoi(d) ? 1 : 0);
      printf("xul_init: ui.systemUsesDarkTheme=%d (from host prefers-color-scheme)\n",
             atoi(d) ? 1 : 0);
    }

    // GPU compositing (GECKO_GPU=1 / index.html?gpu=1): force in-process hardware
    // WebRender presenting to the page <canvas> via WebGL2 (GLContextProviderEmscripten).
    // Set here so it is REPRODUCIBLE -- these were previously hand-added to the staged
    // greprefs.js, which stage-gre.sh regenerates from dist/bin from scratch, silently
    // dropping them (-> WebRender falls back to software/disabled -> white canvas).
    // Gated on the env so the default software RenderDocument+blit path is unchanged.
    if (getenv("GECKO_GPU")) {
      // hardware WebRender (not the software backend), single in-process compositor.
      mozilla::Preferences::SetBool("gfx.webrender.all", true);
      mozilla::Preferences::SetBool("gfx.webrender.software", false);
      mozilla::Preferences::SetBool("layers.acceleration.force-enabled", true);
      mozilla::Preferences::SetBool("layers.gpu-process.enabled", false);
      // WebGL2 can't losslessly emulate glMapBufferRange, so WebRender's PBO GPU-cache
      // uploads corrupt; force direct texSubImage uploads (this made primitives render).
      mozilla::Preferences::SetBool("gfx.webrender.pbo-uploads", false);
      // Nightly defaults to gleam's ErrorReactingGl (a synchronous glGetError after
      // EVERY GL call). With the compositor context now LOCAL on the Renderer thread
      // (OffscreenCanvas, no proxy), each glGetError is a real GPU sync that stalls the
      // pipeline (~0.2 cores of glGetError on a GL-heavy page). Disable it (release
      // behavior). [pref backs StaticPrefs::gfx_webrender_panic_on_gl_error]
      mozilla::Preferences::SetBool("gfx.webrender.panic-on-gl-error", false);
      // Async pan/zoom (APZ): handle scrolling on the compositor (async scroll
      // transform sampled per composite) instead of a synchronous main-thread
      // display-list rebuild per wheel tick. gfxPlatform::AsyncPanZoomEnabled is
      // patched to honor this pref on emscripten (the e10s gate is skipped).
      // Gated on GECKO_APZ so it can be A/B'd against the legacy main-thread scroll.
      if (getenv("GECKO_APZ")) {
        mozilla::Preferences::SetBool("layers.async-pan-zoom.enabled", true);
        printf("xul_init: GECKO_APZ -> async pan/zoom enabled\n");
      }
      printf("xul_init: GECKO_GPU -> forced hardware WebRender prefs\n");
      fflush(stdout);
    } else {
      // Software (non-GPU) mode paints via xul_paint (RenderDocument) and blits to
      // #screen through a 2D context. The compositor must therefore NOT create a
      // hardware GL context: CreateForCompositorWidget targets #screen and would call
      // transferControlToOffscreen(#screen), which throws InvalidStateError because
      // #screen already has a 2D rendering context. Our gfxPlatform patch enables
      // HW_COMPOSITING even headless (for GPU mode), so without this the compositor
      // goes hardware here too. Force software WebRender (SWGL) -> no GL context on
      // #screen. (SWGL never presents in this mode; RenderDocument is the paint path.)
      mozilla::Preferences::SetBool("gfx.webrender.software", true);
      printf("xul_init: no GECKO_GPU -> forced software WebRender (SWGL)\n");
      fflush(stdout);
    }

    // Smooth scrolling: animated over several refresh-driver ticks. With the GPU
    // compositor presenting continuously (the paint loop composites every frame),
    // the animation is visible, so keep it enabled (it was forced off under the
    // old one-snapshot-per-event software model).
    mozilla::Preferences::SetBool("general.smoothScroll", true);
    // Keep the text caret solid (no blink) so a single rendered snapshot always
    // shows it in focused inputs -- a blinking caret would be invisible ~half the
    // time. Paired with RenderDocumentFlags::DrawCaret in xul_paint.
    mozilla::Preferences::SetInt("ui.caretBlinkTime", 0);
    // Disable the slow-script watchdog ("a web page is slowing down your browser").
    // This is a JIT-less interpreter-only wasm build, so content scripts routinely
    // exceed the 10s/5s defaults and trip the notification. 0 == no limit (same as
    // the chrome default dom.max_chrome_script_run_time=0). Live StaticPrefs.
    mozilla::Preferences::SetInt("dom.max_script_run_time", 0);
    mozilla::Preferences::SetInt("dom.max_ext_content_script_run_time", 0);
    // Diagnostic (opt-in, ?contentconsole / GECKO_CONTENT_CONSOLE=1): route
    // content + extension-page console.* to stdout. Off by default (verbose).
    // Chrome console already goes to stdout; extension BACKGROUND pages are
    // "content" so their logs are otherwise invisible -- needed to see why an
    // extension (e.g. uBlock Origin) misbehaves.
    if (getenv("GECKO_CONTENT_CONSOLE")) {
      mozilla::Preferences::SetBool("devtools.console.stdout.content", true);
      printf("xul_init: devtools.console.stdout.content=true (diagnostic)\n");
      fflush(stdout);
    }
    // Top-level data: URL navigations are blocked by default (anti-phishing),
    // which silently aborts our LoadURI(data:...) -> the doc never leaves
    // about:blank. Allow them for this embedding.
    mozilla::Preferences::SetBool(
        "security.data_uri.block_toplevel_data_uri_navigations", false);
    printf("xul_init: allowed top-level data: navigations\n");

    // Force IPv4: emscripten SOCKFS builds its WebSocket URL as ws://addr:port and
    // parses it with a regex that can't handle the colons in an IPv6 literal, so an
    // AAAA/IPv6 connect attempt is unusable. WISP carries IPv4 fine.
    mozilla::Preferences::SetBool("network.dns.disableIPv6", true);
    printf("xul_init: disabled IPv6 (SOCKFS ws:// url can't encode IPv6 literals)\n");

    // Disable browser services not needed for rendering that stall/crash in this
    // minimal embedding. The big one: Safe Browsing / tracking protection run the
    // URL classifier, which SUSPENDS the channel pending an exception list loaded
    // via IndexedDB (NS_ERROR_FACTORY_NOT_REGISTERED here) -> the navigation hangs
    // at about:blank forever. Predictor/captive-portal are likewise unneeded.
    static const char* kDisableBool[] = {
        "browser.safebrowsing.malware.enabled",
        "browser.safebrowsing.phishing.enabled",
        "browser.safebrowsing.blockedURIs.enabled",
        "browser.safebrowsing.downloads.enabled",
        "privacy.trackingprotection.enabled",
        "privacy.trackingprotection.pbmode.enabled",
        "privacy.trackingprotection.annotate_channels",
        "privacy.trackingprotection.antifraud.annotate_channels",
        "privacy.trackingprotection.consentmanager.annotate_channels",
        "privacy.trackingprotection.emailtracking.enabled",
        "privacy.trackingprotection.cryptomining.enabled",
        "privacy.trackingprotection.fingerprinting.enabled",
        "network.predictor.enabled",
        "network.captive-portal-service.enabled",
    };
    for (auto* p : kDisableBool) mozilla::Preferences::SetBool(p, false);
    printf("xul_init: disabled safe-browsing / tracking-protection / predictor\n");

    // HTTP disk cache (Cache2) writes entries under ProfD/cache2. On the default
    // OPFS profile that makes every cache write()/flush() a proxied round-trip to
    // the OPFS worker (__wasmfs_opfs_write_access) -- the single biggest named
    // function on a cold page load, and pure overhead for a session-scoped browser.
    // Keep the in-memory cache; disable the disk cache unless the embedder opts into
    // cross-session persistence with GECKO_DISK_CACHE.
    if (!getenv("GECKO_DISK_CACHE")) {
      mozilla::Preferences::SetBool("browser.cache.disk.enable", false);
      printf("xul_init: disabled HTTP disk cache (set GECKO_DISK_CACHE=1 to persist)\n");
    }

    // User-Agent: the wasm/emscripten build computes a non-desktop platform token
    // (OSCPU), so sites like Google sniff it as an unknown/limited browser and
    // serve a stripped-down page. Override with a standard desktop Firefox UA for
    // this Gecko version so we get the normal modern content.
    {
      nsCOMPtr<nsIHttpProtocolHandler> http =
          do_GetService("@mozilla.org/network/protocol;1?name=http");
      if (http) {
        nsAutoCString ua;
        http->GetUserAgent(ua);
        printf("xul_init: default UA = %s\n", ua.get());
        fflush(stdout);
      }
      mozilla::Preferences::SetCString(
          "general.useragent.override",
          "Mozilla/5.0 (X11; Linux x86_64; rv:153.0) Gecko/20100101 "
          "Firefox/153.0");
      printf("xul_init: set general.useragent.override (desktop Firefox 153)\n");
      fflush(stdout);
    }

    // Real sites need storage: cookies, IndexedDB, cache, places history all
    // require a profile directory. Register ProfD/ProfLD at PROFILE_DIR (WasmFS:
    // a native-OPFS mount at /opfs/<path>, or a provider-backed /profile below).
    {
      const char* profPath = getenv("PROFILE_DIR");
      if (!profPath || !*profPath) profPath = "/profile";
      // Mount the persistent /profile provider backend (WasmFS) BEFORE ProfD setup,
      // so cookies/IndexedDB/places persist via the consumer's FsProvider. Gated on
      // the ENV flag index.ts sets when a profile provider exists (the JS
      // Module.geckoProviders the hooks read isn't visible on this pthread, but ENV
      // is). Backend + hooks: emsdk-patches/provider_backend.h + build/provider-fs.js.
      if (getenv("GECKO_PROFILE_PROVIDER")) {
        backend_t pb = wasmfs_create_provider_backend(/*mountId=*/1);
        int mrv = wasmfs_create_directory(profPath, 0777, pb);
        printf("xul_init: mounted persistent %s (provider backend) rv=%d\n", profPath, mrv);
        fflush(stdout);
      }
      nsCOMPtr<nsIFile> profDir;
      if (NS_SUCCEEDED(NS_NewNativeLocalFile(nsDependentCString(profPath),
                                             getter_AddRefs(profDir)))) {
        profDir->Create(nsIFile::DIRECTORY_TYPE, 0755);  // ok if it exists
        nsCOMPtr<nsIProperties> dirSvc =
            do_GetService("@mozilla.org/file/directory_service;1");
        if (dirSvc) {
          dirSvc->Set(NS_APP_USER_PROFILE_50_DIR, profDir);
          dirSvc->Set(NS_APP_USER_PROFILE_LOCAL_50_DIR, profDir);
          printf("xul_init: profile dir = %s\n", profPath);
        }
      }
    }

    // The JSONView devtools content-sniffer (net-content-sniffers category) tries
    // to load resource://devtools/.../Sniffer.sys.mjs, which is absent in our
    // minimal GRE; that failure aborts the data: load during content-sniffing.
    // Remove it from the category so it isn't invoked.
    nsCOMPtr<nsICategoryManager> catMan =
        do_GetService("@mozilla.org/categorymanager;1");
    if (catMan) {
      catMan->DeleteCategoryEntry("net-content-sniffers", "JSONView"_ns, false);
      printf("xul_init: removed JSONView content sniffer\n");
    }

    // Force-create the mozStorage service NOW, before profile-do-change triggers
    // NSS softoken (which initializes the SHARED sqlite). mozStorage's
    // AutoSQLiteLifetime must run sqlite3_config() BEFORE sqlite3_initialize(); if
    // NSS inits sqlite first, mozStorage's config returns SQLITE_MISUSE and the
    // storage service comes back null -> every DB open (cookies/IndexedDB/places)
    // null-derefs. Creating it first lets mozStorage configure+init sqlite, and
    // NSS's later sqlite3_initialize() is an idempotent no-op.
    {
      nsCOMPtr<nsISupports> storageSvc =
          do_GetService("@mozilla.org/storage/service;1");
      printf("xul_init: storage service = %p\n", (void*)storageSvc.get());
      fflush(stdout);
    }

    // GECKO_CHROME: register the Firefox front-end (browser) chrome package. A bare
    // NS_InitXPCOM only auto-processes the GRE chrome.manifest (toolkit packages);
    // the app's browser/chrome.manifest -- which registers chrome://browser/... and
    // the front-end components -- is normally registered by XRE, which this minimal
    // embedding skips. Register it manually so browser.xhtml resolves.
    if (getenv("GECKO_CHROME")) {
      nsCOMPtr<nsIComponentRegistrar> reg;
      NS_GetComponentRegistrar(getter_AddRefs(reg));
      nsAutoCString manifestPath(greDir);
      manifestPath.AppendLiteral("/browser/chrome.manifest");
      nsCOMPtr<nsIFile> manifest;
      if (reg && NS_SUCCEEDED(NS_NewNativeLocalFile(manifestPath,
                                                    getter_AddRefs(manifest)))) {
        nsresult mrv = reg->AutoRegister(manifest);
        printf("xul_init: registered browser chrome.manifest %s rv=0x%08x\n",
               manifestPath.get(), (unsigned)mrv);
        fflush(stdout);
      } else {
        printf("xul_init: could NOT register browser chrome.manifest at %s\n",
               manifestPath.get());
        fflush(stdout);
      }
      // Run the app-startup category exactly like XRE does. This instantiates the
      // main-process singleton (which imports CustomElementsListener -> defines
      // MozXULElement etc. in chrome documents via a document-element-inserted
      // observer) and BrowserGlue (the Firefox front-end's startup). Without it the
      // chrome custom elements (tabs, urlbar, toolbar buttons) never initialize.
      NS_CreateServicesFromCategory("app-startup", nullptr, "app-startup",
                                    nullptr);
      printf("xul_init: ran app-startup category\n");
      fflush(stdout);
    }

    // Fire profile-do-change LAST (after all synchronous setup) so storage
    // services (QuotaManager/IndexedDB, cookies) initialize. Doing it here, right
    // before we return to the event loop, lets their background init proceed
    // without deadlocking the synchronous init steps.
    {
      nsCOMPtr<nsIObserverService> obs =
          do_GetService("@mozilla.org/observer-service;1");
      if (obs) {
        printf("xul_init: firing profile-do-change...\n");
        fflush(stdout);
        obs->NotifyObservers(nullptr, "profile-do-change", u"startup");
        printf("xul_init: profile-do-change done\n");
        fflush(stdout);
        // profile-after-change is the second half of the standard profile-startup
        // sequence (XRE fires both). We were skipping it, which left several
        // profile-after-change observers uninitialized -- notably
        // RemoteWorkerService (registered by nsLayoutStatics::Initialize), whose
        // observer starts the worker-launcher thread + registers the PARENT-process
        // RemoteWorker actor. Without it, RemoteWorkerManager::SelectTargetActor has
        // no parent actor for an e10s-disabled (in-parent) ServiceWorker, so it falls
        // back to LaunchNewContentProcess -- which fails here ("Failed to launch tab
        // subprocess", no subprocesses in this single-process wasm build) and the SW
        // registration rejects ("...threw an exception during script evaluation").
        printf("xul_init: firing profile-after-change...\n");
        fflush(stdout);
        obs->NotifyObservers(nullptr, "profile-after-change", u"startup");
        printf("xul_init: profile-after-change done\n");
        fflush(stdout);
      }
    }

    // Chrome build: start the Add-on Manager exactly as XRE does
    // (nsXREDirProvider) -- the amManager integration service starts the
    // AddonManager (XPIProvider, extensions DB) on the "addons-startup" topic.
    // Without this, AddonManager.isReady stays false and installs throw
    // NS_ERROR_NOT_INITIALIZED, so WebExtensions can't load.
    if (chrome) {
      nsCOMPtr<nsIObserver> em =
          do_GetService("@mozilla.org/addons/integration;1");
      if (em) {
        em->Observe(nullptr, "addons-startup", nullptr);
        printf("xul_init: started Add-on Manager (addons-startup)\n");
      } else {
        printf("xul_init: addon integration service unavailable\n");
      }
      fflush(stdout);
    }
    // Keep the runtime alive (no NS_ShutdownXPCOM): we proceed to render.
    printf("xul_init: *** XPCOM INITIALIZED *** (runtime kept alive)\n");
    fflush(stdout);
  }
  return (int)rv;
}
