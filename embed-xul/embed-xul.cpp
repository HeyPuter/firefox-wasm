// Minimal libxul (full Gecko engine) embedder for the emscripten wasm build.
// Phase 2b: bring up XPCOM. xul_init() is called explicitly from JS (after the
// module + FS are ready) so we capture NS_InitXPCOM's nsresult in JS. With
// -sNODERAWFS the wasm sees the host FS; GRE/bin dir points at obj .../dist/bin.
#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <unistd.h>
#include <pthread.h>
#include <emscripten.h>

#include "nsXPCOM.h"
#include "nsCOMPtr.h"
#include "nsIFile.h"
#include "nsIServiceManager.h"
#include "nsICategoryManager.h"
#include "nsIComponentRegistrar.h"
#include "nsComponentManagerUtils.h"
#include "nsCategoryManagerUtils.h"
#include "nsIDirectoryService.h"
#include "nsAppDirectoryServiceDefs.h"
#include "nsArrayEnumerator.h"
#include "nsCOMArray.h"
#include "nsISimpleEnumerator.h"
#include <cstring>
#include "nsIObserverService.h"
#include "nsISimpleEnumerator.h"
#include "nsIClassInfo.h"
#include "nsIProperties.h"
#include "nsDirectoryServiceDefs.h"
#include "nsAppDirectoryServiceDefs.h"
#include "nsDirectoryServiceUtils.h"
#include "nsStringFwd.h"
#include "nsString.h"
#include "mozilla/Preferences.h"
#include "mozilla/AutoSQLiteLifetime.h"

// Phase 4 (render) includes.
#include "nsIAppShellService.h"
#include "nsIWindowlessBrowser.h"
#include "nsIAppWindow.h"
#include "nsIWebBrowserChrome.h"
#include "nsIBaseWindow.h"
#include "nsBaseAppShell.h"
#include "nsWidgetsCID.h"
#include "nsIFactory.h"
#include "mozilla/StartupTimeline.h"
#include "mozilla/TimeStamp.h"
#include "nsDocShell.h"
#include "nsDocShellLoadState.h"
#include "nsIDocShellTreeItem.h"
#include "nsPIDOMWindow.h"
#include "nsIGlobalObject.h"
#include "nsILoadContext.h"
#include "mozilla/dom/ScriptSettings.h"
#include "js/CompilationAndEvaluation.h"
#include "js/CompileOptions.h"
#include "js/SourceText.h"
#include "mozilla/Utf8.h"
#include "jsapi.h"
#include "nsIDocShell.h"
#include "mozilla/dom/BrowsingContext.h"
#include "nsIWebNavigation.h"
#include "nsNetUtil.h"
#include "nsContentUtils.h"
#include "mozilla/NullPrincipal.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/Element.h"
#include "imgITools.h"
#include "imgIRequest.h"
#include "imgIContainer.h"
#include "nsIImageLoadingContent.h"
#include "mozilla/dom/NodeList.h"
#include "mozilla/dom/HTMLCanvasElement.h"
#include "mozilla/dom/ShadowRoot.h"
#include "nsGkAtoms.h"
#include "nsIPrincipal.h"
#include "mozilla/StyleSheet.h"
#include "mozilla/ServoCSSRuleList.h"
#include "mozilla/css/Rule.h"
#include "gfxUtils.h"
#include "mozilla/gfx/2D.h"
#include "mozilla/Base64.h"
#include "nsIURI.h"
#include <unordered_map>
#include <string>
#include "nsGkAtoms.h"
#include "nsNameSpaceManager.h"
#include "nsGenericHTMLElement.h"
#include "mozilla/dom/LoadURIOptionsBinding.h"
#include "mozilla/PresShell.h"
#include "nsIFrame.h"
#include "nsPresContext.h"
#include "nsThreadUtils.h"
#include "mozilla/SpinEventLoopUntil.h"
#include "nsServiceManagerUtils.h"
#include "mozilla/gfx/2D.h"
#include "gfxContext.h"
#include "nsRect.h"
#include "nsIWebProgress.h"
#include "nsIWebProgressListener.h"
#include "nsIRequest.h"
#include "nsIChannel.h"
#include "nsIHttpProtocolHandler.h"
#include "nsWeakReference.h"

// Input (mouse/keyboard/wheel) injection includes.
#include "nsIWidget.h"
#include "nsIFocusManager.h"
#include "nsFocusManager.h"
#include "mozIDOMWindow.h"
#include "nsIInterfaceRequestorUtils.h"
#include "mozilla/MouseEvents.h"
#include "mozilla/TextEvents.h"
#include "mozilla/BasicEvents.h"
#include "mozilla/dom/WindowBinding.h"
#include "mozilla/dom/FunctionBinding.h"
#include "mozilla/ScrollContainerFrame.h"
#include "mozilla/ServoStyleConsts.h"
#include "nsLayoutUtils.h"
#include "nsXULPopupManager.h"
#include "nsMenuPopupFrame.h"
#include "mozilla/widget/ScreenManager.h"
#include "mozilla/widget/Screen.h"
#include "Units.h"
#include <cmath>

// Single-threaded emscripten libc lacks pthread_setname_np; SpiderMonkey/mozglue
// threading code references it. No-op.
extern "C" int pthread_setname_np(pthread_t, const char*) { return 0; }

// Canvas-passthrough flag, captured on the app thread in main() (where getenv
// sees the env), read by libxul's GLContextProviderEmscripten on the content
// WebGL worker thread via the weak gecko_gl_passthrough_enabled() symbol.
int g_gl_passthrough = 0;
extern "C" int gecko_gl_passthrough_enabled() { return g_gl_passthrough; }

// Process-metrics helpers live in toolkit/components/processtools, which isn't
// compiled for wasm. libxul references them from glean power-metrics recording,
// which the user-interaction observer fires on the first input event. Without
// these the link leaves them as abort() stubs and the first mouse/key event
// crashes. Provide failing stubs so RecordPowerMetrics() bails early.
namespace mozilla {
nsresult GetCpuTimeSinceProcessStartInMs(uint64_t* aResult) {
  *aResult = 0;
  return NS_ERROR_NOT_IMPLEMENTED;
}
nsresult GetGpuTimeSinceProcessStartInMs(uint64_t* aResult) {
  *aResult = 0;
  return NS_ERROR_NOT_IMPLEMENTED;
}
nsresult GetCurrentProcessMemoryUsage(uint64_t* aResult) {
  *aResult = 0;
  return NS_ERROR_NOT_IMPLEMENTED;
}
}  // namespace mozilla

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

// GRE/bin directory is passed from JS: the host path under -sNODERAWFS (node),
// or the preloaded mount point (e.g. "/gre") in the browser.
extern "C" EMSCRIPTEN_KEEPALIVE int xul_init(const char* greDir) {
  printf("xul_init: GRE dir = %s\n", greDir);
  fflush(stdout);

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
  nsAutoCString binPath(greDir);
  if (chrome) binPath.AppendLiteral("/browser");
  nsCOMPtr<nsIFile> binDir;
  nsresult rv = NS_NewNativeLocalFile(binPath, getter_AddRefs(binDir));
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
    // require a profile directory. Create one in MEMFS and register ProfD/ProfLD.
    {
      const char* profPath = getenv("PROFILE_DIR");
      if (!profPath || !*profPath) profPath = "/profile";
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

// Diagnostic web progress listener: logs the load's state changes + the abort
// status code, to see why the data: load aborts before committing the document.
class RenderLoadListener final : public nsIWebProgressListener,
                                 public nsSupportsWeakReference {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIWEBPROGRESSLISTENER
 private:
  ~RenderLoadListener() = default;
};
NS_IMPL_ISUPPORTS(RenderLoadListener, nsIWebProgressListener,
                  nsISupportsWeakReference)
NS_IMETHODIMP RenderLoadListener::OnStateChange(nsIWebProgress*, nsIRequest* aReq,
                                                uint32_t aFlags,
                                                nsresult aStatus) {
  nsAutoCString name;
  if (aReq) aReq->GetName(name);
  uint32_t blockReason = 0;
  nsCOMPtr<nsIChannel> chan = do_QueryInterface(aReq);
  if (chan) {
    nsCOMPtr<nsILoadInfo> li = chan->LoadInfo();
    if (li) li->GetRequestBlockingReason(&blockReason);
  }
  // Report failures always, but for successful STOPs only the overall network stop
  // (STATE_IS_NETWORK fires once per page) -- NOT every sub-resource's STOP, which on a
  // real page is hundreds of printf+flushes (measured ~10% of load CPU went to logging).
  const bool overallStop = (aFlags & nsIWebProgressListener::STATE_STOP) &&
                           (aFlags & nsIWebProgressListener::STATE_IS_NETWORK);
  if (overallStop || NS_FAILED(aStatus)) {
    printf("xul_render: load %s status=0x%08x blockReason=%u req=%.60s\n",
           NS_FAILED(aStatus) ? "FAILED" : "stop", (unsigned)aStatus, blockReason,
           name.get());
    fflush(stdout);
  }
  return NS_OK;
}
NS_IMETHODIMP RenderLoadListener::OnProgressChange(nsIWebProgress*, nsIRequest*,
                                                   int32_t, int32_t, int32_t,
                                                   int32_t) { return NS_OK; }
NS_IMETHODIMP RenderLoadListener::OnLocationChange(nsIWebProgress*, nsIRequest*,
                                                   nsIURI*, uint32_t) { return NS_OK; }
NS_IMETHODIMP RenderLoadListener::OnStatusChange(nsIWebProgress*, nsIRequest*,
                                                 nsresult, const char16_t*) { return NS_OK; }
NS_IMETHODIMP RenderLoadListener::OnSecurityChange(nsIWebProgress*, nsIRequest*,
                                                   uint32_t) { return NS_OK; }
NS_IMETHODIMP RenderLoadListener::OnContentBlockingEvent(nsIWebProgress*,
                                                         nsIRequest*, uint32_t) { return NS_OK; }

// A single windowless browser is created lazily and kept alive across loads and
// input events, so the live document can receive synthesized mouse/keyboard/wheel
// events and be repainted in place. (The old one-shot model recreated it per
// render, which couldn't hold interactive state.)
static nsCOMPtr<nsIWindowlessBrowser> g_wb;
static nsCOMPtr<nsIAppWindow> g_appWin;   // chrome build: the real top-level window
static nsCOMPtr<nsIDocShell> g_docShell;
static bool g_isChrome = false;
static bool g_gpu = false;
// DOM-mirror mode (GECKO_MIRROR=1): run headless (never paint); the host pulls the
// serialized, self-contained DOM via op=5 and renders it in a native iframe. <canvas>
// still goes through the normal (GPU/software) paint path.
static bool g_mirror = false;
static void mirror_clear_caches();  // defined with the op=6/7 collectors below

// chrome:// URL of the full Firefox front-end window.
static const char* kBrowserChromeURL = "chrome://browser/content/browser.xhtml";

// Last size we resized the window to. Resizing forces a reflow, so only do it when
// the requested size actually changes (the JS side sends the live viewport size on
// every paint so the chrome tracks the window).
static int g_lastW = 0, g_lastH = 0;

// Populate the gfx ScreenManager with a single screen the size of our window.
// Real Firefox installs a screen helper in the per-toolkit nsAppShell; our no-op
// appshell (EmbedAppShell) doesn't, leaving the ScreenManager empty -- which makes
// nsMenuPopupFrame::GetConstraintRect see a 0-size screen and clamp every popup
// (menus, context menus, the app-menu panel) to 0x0, i.e. invisible. Sizing the
// screen to the window also keeps popups positioned within the visible canvas.
static void RefreshScreen(int width, int height) {
  using namespace mozilla;
  using namespace mozilla::widget;
  LayoutDeviceIntRect r(0, 0, width, height);
  nsTArray<RefPtr<Screen>> screens;
  screens.AppendElement(MakeRefPtr<Screen>(
      r, r, 24, 24, 0, DesktopToLayoutDeviceScale(), CSSToLayoutDeviceScale(),
      96.0f, Screen::IsPseudoDisplay::No, Screen::IsHDR::No));
  ScreenManager::Refresh(std::move(screens));
}

// Resize the browser window/content to width x height (device px). For the chrome
// build the AppWindow is the thing to resize (it carries the widget + chrome doc);
// for the windowless content build it's the docshell's base window.
static void EnsureSize(int width, int height) {
  using namespace mozilla;
  if (!g_docShell || (width == g_lastW && height == g_lastH)) return;
  g_lastW = width;
  g_lastH = height;
  nsCOMPtr<nsIBaseWindow> bw;
  if (g_appWin) bw = do_QueryInterface(g_appWin);
  if (!bw) bw = do_QueryInterface(g_docShell);
  if (bw) bw->SetPositionAndSize(0, 0, width, height, nsIBaseWindow::eRepaint);
  RefreshScreen(width, height);
}

static nsIDocShell* EnsureBrowser(int width, int height) {
  using namespace mozilla;
  if (g_docShell) {
    EnsureSize(width, height);
    return g_docShell;
  }
  nsCOMPtr<nsIAppShellService> appShell =
      do_GetService("@mozilla.org/appshell/appShellService;1");
  if (!appShell) {
    printf("EnsureBrowser: no appShellService\n");
    return nullptr;
  }
  g_isChrome = getenv("GECKO_CHROME") != nullptr;

  if (g_isChrome) {
    // Full Firefox chrome: the front-end (browser.xhtml + browser.js) requires a
    // genuine top-level XUL window -- it reaches for nsIAppWindow on the tree owner
    // and installs XULBrowserWindow there. A windowless browser has no nsAppWindow
    // tree owner, so gBrowser never initializes. CreateTopLevelWindow builds a real
    // nsAppWindow (headless widget, since MOZ_WIDGET_TOOLKIT=headless) and kicks off
    // the browser.xhtml load itself. Sites then load in tabs (gBrowser), not by
    // navigating this chrome docshell.
    nsCOMPtr<nsIURI> chromeURI;
    nsresult rv = NS_NewURI(getter_AddRefs(chromeURI),
                            nsDependentCString(kBrowserChromeURL));
    if (NS_FAILED(rv)) {
      printf("EnsureBrowser: bad chrome URI 0x%08x\n", (unsigned)rv);
      return nullptr;
    }
    rv = appShell->CreateTopLevelWindow(
        nullptr, chromeURI, nsIWebBrowserChrome::CHROME_ALL, width, height,
        getter_AddRefs(g_appWin));
    if (NS_FAILED(rv) || !g_appWin) {
      printf("EnsureBrowser: CreateTopLevelWindow failed 0x%08x\n", (unsigned)rv);
      return nullptr;
    }
    g_appWin->GetDocShell(getter_AddRefs(g_docShell));
    nsCOMPtr<nsIBaseWindow> baseWin = do_QueryInterface(g_appWin);
    if (baseWin) {
      baseWin->SetPositionAndSize(0, 0, width, height, nsIBaseWindow::eRepaint);
      baseWin->SetVisibility(true);
    }
    g_lastW = width;
    g_lastH = height;
    RefreshScreen(width, height);
    printf("EnsureBrowser: created top-level chrome window %dx%d\n", width, height);
    fflush(stdout);
    return g_docShell;
  }

  // Content-only embedding: a windowless browser is enough to host a page and
  // render it to canvas.
  nsresult rv = appShell->CreateWindowlessBrowser(false, 0, getter_AddRefs(g_wb));
  if (NS_FAILED(rv) || !g_wb) {
    printf("EnsureBrowser: CreateWindowlessBrowser failed 0x%08x\n", (unsigned)rv);
    return nullptr;
  }
  g_wb->GetDocShell(getter_AddRefs(g_docShell));
  // Give the docshell a real size + make it visible, so its PresShell has a
  // non-empty viewport and actually reflows/paints.
  nsCOMPtr<nsIBaseWindow> baseWin = do_QueryInterface(g_docShell);
  if (baseWin) {
    baseWin->SetPositionAndSize(0, 0, width, height, nsIBaseWindow::eRepaint);
    baseWin->SetVisibility(true);
  }
  g_lastW = width;
  g_lastH = height;
  RefreshScreen(width, height);
  nsCOMPtr<nsIWebProgress> webProgress = do_QueryInterface(g_docShell);
  if (webProgress) {
    RenderLoadListener* listener = new RenderLoadListener();
    NS_ADDREF(listener);  // held weakly by the progress mgr; leak to keep alive
    webProgress->AddProgressListener(listener,
                                     nsIWebProgress::NOTIFY_STATE_ALL |
                                         nsIWebProgress::NOTIFY_LOCATION);
  }
  printf("EnsureBrowser: created windowless browser %dx%d\n", width, height);
  fflush(stdout);
  return g_docShell;
}

// Navigate the persistent browser to `url` (full docshell/necko load path) and
// spin until the target document finishes loading.
// Evaluate a script in the chrome window's global (system principal). Used to
// drive the Firefox front-end (gBrowser etc.) the way the UI does.
// Evaluate aScript in the content window's global. If aOutResult is non-null, the
// script's return value is coerced to a UTF-8 string and returned via *aOutResult
// (malloc'd; caller owns) -- used by the DOM-mirror mode to pull the serialized DOM
// back to the host.
static bool RunChromeScript(const nsACString& aScript,
                            char** aOutResult = nullptr) {
  if (aOutResult) *aOutResult = nullptr;
  nsCOMPtr<mozIDOMWindowProxy> winProxy = do_GetInterface(g_docShell);
  nsPIDOMWindowOuter* outer =
      winProxy ? nsPIDOMWindowOuter::From(winProxy) : nullptr;
  nsPIDOMWindowInner* inner = outer ? outer->GetCurrentInnerWindow() : nullptr;
  nsIGlobalObject* glob = inner ? inner->AsGlobal() : nullptr;
  JSObject* globalObj = glob ? glob->GetGlobalJSObject() : nullptr;
  if (!globalObj) {
    printf("RunChromeScript: no chrome global\n");
    fflush(stdout);
    return false;
  }
  mozilla::dom::AutoEntryScript aes(glob, "embed-chrome-eval");
  JSContext* cx = aes.cx();
  JS::Rooted<JSObject*> global(cx, globalObj);
  JSAutoRealm ar(cx, global);
  JS::CompileOptions options(cx);
  options.setFileAndLine("embed-chrome", 1);
  JS::SourceText<mozilla::Utf8Unit> srcBuf;
  if (!srcBuf.init(cx, aScript.BeginReading(), aScript.Length(),
                   JS::SourceOwnership::Borrowed)) {
    return false;
  }
  JS::Rooted<JS::Value> rval(cx);
  if (!JS::Evaluate(cx, options, srcBuf, &rval)) {
    printf("RunChromeScript: eval threw\n");
    fflush(stdout);
    JS_ClearPendingException(cx);
    return false;
  }
  if (aOutResult && !rval.isNullOrUndefined()) {
    JS::Rooted<JSString*> str(cx, JS::ToString(cx, rval));
    if (str) {
      JS::UniqueChars utf8 = JS_EncodeStringToUTF8(cx, str);
      if (utf8) *aOutResult = strdup(utf8.get());
    } else {
      JS_ClearPendingException(cx);
    }
  }
  return true;
}

// Chrome build: load a site in the full Firefox front-end. We open a fresh tab
// via gBrowser.addTab with forceNotRemote (single process: the tab's browser must
// be in-process to have a docshell we can render) and select it; the site then
// renders inside the chrome window we paint. The work is deferred with setTimeout
// so JS::Evaluate returns immediately -- addTab does heavy synchronous setup that
// must run on the event loop, not nested inside our command handler. We then pump
// the event loop so the load progresses (the continuous paint loop shows it).
static bool xul_chrome_load_content(const char* url, int width, int height) {
  using namespace mozilla;
  if (!g_appWin) {
    printf("xul_chrome_load_content: no chrome window\n");
    return false;
  }
  nsAutoCString safe(url);
  safe.ReplaceSubstring("\\", "\\\\");
  safe.ReplaceSubstring("\"", "\\\"");
  nsAutoCString js;
  js.AppendLiteral(
      "setTimeout(function(){try{"
      "var sp=Services.scriptSecurityManager.getSystemPrincipal();"
      "var t=gBrowser.addTab(\"");
  js.Append(safe);
  js.AppendLiteral(
      "\",{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});"
      "gBrowser.selectedTab=t;void t.linkedBrowser.docShell;"
      "}catch(e){console.error(\"embed load error\",e);}},0);");
  printf("xul_chrome_load_content: opening tab for %.80s\n", url);
  fflush(stdout);
  if (!RunChromeScript(js)) return false;

  // Pump the event loop so the deferred addTab runs and the page loads. The tab's
  // content browser isn't reachable from the chrome docshell tree here (lazy
  // frame-loader presentation), so we can't cheaply observe load completion --
  // pump a bounded number of iterations, ample for a typical page over WISP.
  uint32_t spins = 0;
  SpinEventLoopUntil("xul_chrome_load"_ns,
                     [&]() -> bool { return ++spins > 400000; });
  printf("xul_chrome_load_content: pumped %u\n", spins);
  fflush(stdout);
  return true;
}

static bool xul_load(const char* url, int width, int height) {
  using namespace mozilla;
  using mozilla::dom::Document;
  printf("xul_load: %dx%d url=%.60s\n", width, height, url);
  fflush(stdout);

  nsIDocShell* ds = EnsureBrowser(width, height);
  if (!ds) return false;

  // Chrome build: a non-chrome URL is a site to open in the current tab (the
  // chrome window itself stays at browser.xhtml). The chrome must already be up.
  if (g_isChrome && strncmp(url, "chrome:", 7) != 0 &&
      strncmp(url, "about:", 6) != 0) {
    return xul_chrome_load_content(url, width, height);
  }

  nsCOMPtr<nsIURI> uri;
  if (NS_FAILED(NS_NewURI(getter_AddRefs(uri), nsDependentCString(url)))) {
    printf("xul_load: NS_NewURI failed\n");
    return false;
  }
  // Remember the document we're navigating away from. The browser is persistent,
  // so right after LoadURI the OLD document is still current (and at readyState
  // COMPLETE); we must wait for a genuinely NEW document, not just "any non-blank
  // doc at COMPLETE", or a second load returns instantly with the previous page.
  // Hold a strong ref so the address stays unique for the comparison.
  RefPtr<Document> oldDoc;
  if (PresShell* p0 = ds->GetPresShell()) oldDoc = p0->GetDocument();

  if (g_isChrome) {
    // browser.xhtml is already loading (kicked off by CreateTopLevelWindow); do
    // not navigate the chrome docshell. Just wait for the chrome document to
    // finish below. Sites are loaded into tabs via xul_chrome_load_tab().
    printf("xul_load: chrome window, waiting for browser.xhtml\n");
    fflush(stdout);
  } else {
    dom::LoadURIOptions opts;
    opts.mTriggeringPrincipal = nsContentUtils::GetSystemPrincipal();
    nsresult rv = g_wb->LoadURI(uri, opts);
    printf("xul_load: LoadURI rv=0x%08x\n", (unsigned)rv);
    fflush(stdout);
  }

  // Return once the new document is INTERACTIVE (DOM parsed, deferred scripts run)
  // instead of COMPLETE. A heavy SPA with long-lived connections / never-ending
  // subresource loads never reaches COMPLETE, so waiting for it spins to the 500k cap
  // (minutes) and blocks the engine. INTERACTIVE means the DOM + frame tree exist, which
  // is all both render paths need: the mirror loop keeps re-serializing and the paint
  // loop (op=4, ~25fps) keeps repainting as the page hydrates/mutates afterward -- i.e.
  // progressive load, like a real browser, instead of a multi-minute stall.
  uint32_t spins = 0;
  SpinEventLoopUntil("xul_load"_ns, [&]() -> bool {
    PresShell* p = ds->GetPresShell();
    Document* d = p ? p->GetDocument() : nullptr;
    int st = d ? (int)d->GetReadyStateEnum() : -1;
    bool isNew = d && d != oldDoc;
    return (isNew && st >= (int)Document::READYSTATE_INTERACTIVE) ||
           (++spins > 500000);
  });
  printf("xul_load: spun %u, ready\n", spins);
  fflush(stdout);

  // Make our content window the focused/active window so synthesized keyboard
  // events route to the focused element (otherwise nsFocusManager has no active
  // window and key events go nowhere).
  nsCOMPtr<nsIFocusManager> fm =
      do_GetService("@mozilla.org/focus-manager;1");
  nsCOMPtr<mozIDOMWindowProxy> win = do_GetInterface(ds);
  if (fm && win) {
    nsresult frv = fm->SetFocusedWindow(win);
    printf("xul_load: SetFocusedWindow rv=0x%08x\n", (unsigned)frv);
    fflush(stdout);
  }
  // Mark the window ACTIVE, not just focused. Key events route to the focused
  // element regardless, but the text caret + :focus visual state require the
  // active window -- which a windowless browser otherwise never is, so the caret
  // never enables in focused inputs.
  if (nsFocusManager* fmc = nsFocusManager::GetFocusManager()) {
    if (win) {
      fmc->WindowRaised(win, nsFocusManager::GenerateFocusActionId());
      printf("xul_load: WindowRaised (activated)\n");
      fflush(stdout);
    }
  }

  // Register the desktop JSWindowActors. BrowserGlue normally does this (via
  // DesktopActorRegistry.init() in its _init), but BrowserGlue doesn't fully run in
  // this minimal embedding, so e.g. the ContextMenu actor is missing -- content
  // right-clicks then open contentAreaContextMenu with null contentData and
  // nsContextMenu crashes (ownerDoc undefined). Do it once, now that the chrome
  // window/global exists.
  if (g_isChrome) {
    static bool s_actorsRegistered = false;
    if (!s_actorsRegistered) {
      s_actorsRegistered = true;
      RunChromeScript(
          "try{ChromeUtils.importESModule('moz-src:///browser/components/"
          "DesktopActorRegistry.sys.mjs').DesktopActorRegistry.init();}"
          "catch(e){console.error('DesktopActorRegistry.init: '+e);}"
          // Map resource://newtab (and chrome://newtab) for about:newtab/about:home.
          // The new-tab page lives in a built-in add-on whose resources are normally
          // wired up by AboutNewTabResourceMapping during BrowserGlue startup; that
          // doesn't run here, so about:newtab's redirector hits NS_ERROR_NOT_AVAILABLE
          // (no resource://newtab). init() falls back to resource://builtin-addons/
          // newtab/ (which IS mapped) when the add-on isn't active -> page loads.
          "try{ChromeUtils.importESModule('resource:///modules/"
          "AboutNewTabResourceMapping.sys.mjs').AboutNewTabResourceMapping.init();}"
          "catch(e){console.error('AboutNewTabResourceMapping.init: '+e);}"
          // Register ExtensionsUI's observers. It's the listener for
          // "webextension-permission-prompt" (fired by AddonManager during an
          // install) -- it shows the permission doorhanger and resolves the
          // install's promptHandler when the user clicks Add. BrowserGlue normally
          // calls ExtensionsUI.init(); without it the notification has no observer,
          // promptHandler's promise never resolves, and the install hangs forever at
          // "Verifying". init() addObserver's synchronously (before its first await),
          // so the prompt works even though the later delayedStartupPromise await may
          // reject in this minimal embedding (harmless).
          "try{ChromeUtils.importESModule('resource:///modules/"
          "ExtensionsUI.sys.mjs').ExtensionsUI.init();}"
          "catch(e){console.error('ExtensionsUI.init: '+e);}"
          // Round popup/menu corners like desktop Firefox. The headless/other-platform
          // theme leaves them square; register an agent !important sheet (beats author
          // rules) so menupopups and panels get a small radius. Our compositor paints
          // the popup frame with a transparent backstop, so the corners outside the
          // radius show the page through -> actually rounded.
          "try{var s=Cc['@mozilla.org/content/style-sheet-service;1']"
          ".getService(Ci.nsIStyleSheetService);"
          "var u=Services.io.newURI('data:text/css;charset=utf-8,'+encodeURIComponent("
          "'menupopup,panel,.menupopup-arrowscrollbox{border-radius:8px !important}'));"
          "if(!s.sheetRegistered(u,s.AGENT_SHEET))s.loadAndRegisterSheet(u,s.AGENT_SHEET);}"
          "catch(e){console.error('round css: '+e);}"_ns);
      printf("xul_load: registered desktop JSWindowActors + rounded-popup sheet\n");
      fflush(stdout);
    }
  }

  // DOM-mirror mode is headless: we never composite, we pull the laid-out DOM via
  // op=5. But the refresh driver still ticks (animations/timers/JS), and any content
  // invalidation (e.g. a click handler mutating the DOM) makes nsRefreshDriver::Tick
  // reach PaintIfNeeded -> PresShell::PaintSynchronously -> PuppetWidget::
  // GetWindowRenderer -> CreateCompositor -> WebRenderBridgeChild::SendEnsureConnected,
  // a SYNC IPC that never returns here (no compositor session is running in this mode),
  // hanging the engine thread forever. SetNeverPainting makes PaintSynchronously a
  // no-op so the tick advances content without trying to composite.
  if (g_mirror) {
    mirror_clear_caches();  // new document -> drop the previous page's cached resources
    if (PresShell* ps = ds->GetPresShell()) {
      ps->SetNeverPainting(true);
      printf("xul_load: mirror mode -> SetNeverPainting(true)\n");
      fflush(stdout);
    }
  }
  return true;
}

// Paint the current document of the persistent browser to a fresh BGRA buffer
// (width*height*4 bytes). Caller owns/free()s the buffer.
// Composite any open popups (menus, context menus, the app-menu panel, <select>
// dropdowns) onto ctx. Popups live in their own widgets and are separate display
// roots (NS_FRAME_IN_POPUP -> GetDisplayRootFrame stops at the popup), so neither
// the main window's RenderDocument nor its WebRender scene includes them; we paint
// each popup frame at its widget bounds. Our window is at (0,0), so a popup's
// widget bounds are canvas coordinates. Returns the number of popups painted.
static int composite_visible_popups(gfxContext* ctx, mozilla::PresShell* ps,
                                    int width, int height, int32_t appPerCss) {
  using namespace mozilla;
  using namespace mozilla::gfx;
  using mozilla::dom::Document;
  nsXULPopupManager* pm = nsXULPopupManager::GetInstance();
  if (!pm) return 0;
  nsTArray<nsMenuPopupFrame*> popups;
  pm->GetVisiblePopups(popups);

  // The headless popup widget never sizes the popup frame, so a freshly-shown
  // popup comes up 0-sized; give it the window's inline size, force an intrinsic
  // reflow, then position it. CRITICAL: FlushPendingNotifications can run reflow
  // and script that DESTROYS popup frames, so we must NOT hold the raw
  // nsMenuPopupFrame* (or any entry of `popups`) across a flush -- that was a
  // use-after-free that slowly corrupted memory. Re-query GetVisiblePopups after
  // every flush, and keep the paint pass below flush-free.
  bool sized = false;
  for (auto* pf : popups) {
    if (!pf) continue;
    LayoutDeviceIntRect b = pf->CalcWidgetBounds();
    if (b.width <= 0 || b.height <= 0) {
      pf->SetSize(nsSize(width * appPerCss, height * appPerCss));
      ps->FrameNeedsReflow(pf, mozilla::IntrinsicDirty::FrameAncestorsAndDescendants,
                           NS_FRAME_IS_DIRTY);
      sized = true;
    }
  }
  if (sized) {
    if (Document* d = ps->GetDocument())
      d->FlushPendingNotifications(mozilla::FlushType::Layout);
    popups.Clear();
    pm->GetVisiblePopups(popups);  // the flush may have destroyed frames
    for (auto* pf : popups)
      if (pf) pf->SetPopupPosition(false);
    if (Document* d = ps->GetDocument())
      d->FlushPendingNotifications(mozilla::FlushType::Layout);
    popups.Clear();
    pm->GetVisiblePopups(popups);  // re-query once more before painting
  }

  // Paint pass: no flushes here, so the frame pointers stay valid for its
  // duration. GetVisiblePopups is top-to-bottom; paint back-to-front so the
  // topmost wins.
  int painted = 0;
  for (size_t i = popups.Length(); i-- > 0;) {
    nsMenuPopupFrame* pf = popups[i];
    if (!pf) continue;
    LayoutDeviceIntRect b = pf->CalcWidgetBounds();
    if (b.width <= 0 || b.height <= 0) continue;
    gfxContextMatrixAutoSaveRestore saveMatrix(ctx);
    ctx->SetMatrix(Matrix::Translation((float)b.x, (float)b.y));
    nsRegion dirty(pf->InkOverflowRectRelativeToSelf());
    // value 0 == nsDisplayListBuilderMode::Painting (avoid including the heavy
    // nsDisplayList.h, which drags in IPC/WebRender headers not on our path).
    nsLayoutUtils::PaintFrame(
        ctx, pf, dirty, NS_RGBA(0, 0, 0, 0),
        static_cast<mozilla::nsDisplayListBuilderMode>(0),
        nsLayoutUtils::PaintFrameFlags::SyncDecodeImages);
    painted++;
  }
  return painted;
}

static uint8_t* xul_paint(int width, int height) {
  using namespace mozilla;
  using namespace mozilla::gfx;
  using mozilla::dom::Document;
  if (!g_docShell) return nullptr;
  // Track the live window size: the JS side sends the current viewport dimensions
  // on every paint, so the chrome reflows to fill the window (resize support).
  EnsureSize(width, height);
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) {
    printf("xul_paint: no PresShell\n");
    return nullptr;
  }
  ps->UnsuppressPainting();
  if (Document* doc2 = ps->GetDocument()) {
    doc2->FlushPendingNotifications(mozilla::FlushType::Layout);
  }

  int32_t stride = width * 4;
  uint8_t* buf = (uint8_t*)calloc((size_t)height * stride, 1);
  RefPtr<DrawTarget> dt = Factory::CreateDrawTargetForData(
      BackendType::SKIA, buf, IntSize(width, height), stride,
      SurfaceFormat::B8G8R8A8);
  if (!dt) {
    printf("xul_paint: CreateDrawTargetForData failed\n");
    free(buf);
    return nullptr;
  }
  UniquePtr<gfxContext> ctx = gfxContext::CreateOrNull(dt);
  if (!ctx) {
    free(buf);
    return nullptr;
  }
  int32_t appPerCss = AppUnitsPerCSSPixel();  // 60
  nsRect r(0, 0, width * appPerCss, height * appPerCss);
  // DrawCaret: RenderDocument force-hides the text caret by default. We want it
  // visible in focused <input>/<textarea>/contenteditable. (Blinking is disabled
  // via ui.caretBlinkTime=0 in xul_init so a single snapshot never catches the
  // caret in its "off" phase.)
  ps->RenderDocument(r, RenderDocumentFlags::DrawCaret, NS_RGB(255, 255, 255),
                     ctx.get());

  // Composite open popups onto the same buffer (no-op when nothing is open).
  composite_visible_popups(ctx.get(), ps, width, height, appPerCss);
  return buf;  // BGRA8, width*height*4 bytes
}

// GPU mode (GECKO_GPU=1): the in-process WebRender compositor presents directly
// to the page <canvas> via WebGL. We must NOT call RenderDocument here -- it does
// a synchronous software paint that consumes the frame-tree invalidation, which
// would starve the compositor. Instead unsuppress painting, flush layout, mark
// the frame tree dirty, and pump the event loop so the refresh driver ticks and
// WebRender composites + presents. Presentation is async (next refresh tick).
static void PumpEvents();  // defined below
static char* g_evalResult = nullptr;  // op=5 eval result (UTF-8); -> g_cmd->result
static void gpu_present(int width, int height) {
  using namespace mozilla;
  using mozilla::dom::Document;
  if (!g_docShell) return;
  EnsureSize(width, height);  // track the live window size (resize support)
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return;
  // Clear the gates that keep a windowless browser from painting:
  //  - never-painting (set from docshell invisibility),
  //  - inactive (ComputeActiveness; the top-level-always-active pref forces it),
  //  - suppressed painting.
  ps->SetNeverPainting(false);
  ps->ActivenessMaybeChanged();
  ps->UnsuppressPainting();
  if (Document* doc = ps->GetDocument()) {
    doc->FlushPendingNotifications(mozilla::FlushType::Layout);
  }
  nsPoint offset;
  nsIWidget* widget = nsContentUtils::GetWidget(ps, &offset);
  if (widget) {
    if (!widget->IsVisible()) widget->Show(true);
    // The windowless PuppetWidget is created with an empty rect; resize it so the
    // compositor surface (and WebRender framebuffer) is the canvas size, not 0x0.
    LayoutDeviceIntRect b = widget->GetBounds();
    if (b.width != width || b.height != height) {
      widget->Resize(mozilla::DesktopSize((float)width, (float)height), true);
    }
  }
  // SchedulePaint() sets NS_FRAME_UPDATE_LAYER_TREE on the display root, which is
  // what makes PaintInternal build a fresh WebRender display list (otherwise it
  // does an EndEmptyTransaction -> empty/transparent scene). InvalidateFrame()
  // alone does not set that bit.
  if (nsIFrame* root = ps->GetRootFrame()) {
    root->SchedulePaint();
  }
  // The refresh driver only paints when a paint was scheduled, but PuppetWidget's
  // Invalidate is a no-op in-process, so force the paint+composite directly:
  // PresShell::PaintSynchronously -> PaintAndRequestComposite -> WebRender display
  // list -> EndTransaction -> compositor. PumpEvents lets the compositor/Renderer
  // threads process the transaction and present to the canvas.
  ps->PaintSynchronously();
  PumpEvents();
}

// GPU mode: popups are kept off the GPU (their widgets use the fallback renderer
// via HeadlessWidget::ShouldUseOffMainThreadCompositing) so they never present to
// the single page <canvas> and fight the main window's compositor. Instead we
// paint the visible popups here into a transparent, canvas-sized BGRA buffer that
// the JS side draws onto a 2D overlay canvas stacked over the WebGL canvas. The
// buffer is a reused static (caller must NOT free it). Returns null when no popup
// is open, which tells JS to clear the overlay.
static uint8_t* paint_popup_overlay(int width, int height) {
  using namespace mozilla;
  using namespace mozilla::gfx;
  if (!g_docShell) return nullptr;
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return nullptr;
  nsXULPopupManager* pm = nsXULPopupManager::GetInstance();
  if (!pm) return nullptr;
  nsTArray<nsMenuPopupFrame*> popups;
  pm->GetVisiblePopups(popups);
  if (popups.IsEmpty()) return nullptr;  // nothing open -> JS clears the overlay

  size_t need = (size_t)width * (size_t)height * 4;
  if (need == 0) return nullptr;
  static uint8_t* s_buf = nullptr;
  static size_t s_cap = 0;
  if (need > s_cap) {
    free(s_buf);
    s_buf = (uint8_t*)malloc(need);
    s_cap = s_buf ? need : 0;
  }
  if (!s_buf) return nullptr;
  memset(s_buf, 0, need);  // fully transparent backdrop

  int32_t stride = width * 4;
  RefPtr<DrawTarget> dt = Factory::CreateDrawTargetForData(
      BackendType::SKIA, s_buf, IntSize(width, height), stride,
      SurfaceFormat::B8G8R8A8);
  if (!dt) return nullptr;
  UniquePtr<gfxContext> ctx = gfxContext::CreateOrNull(dt);
  if (!ctx) return nullptr;
  int n = composite_visible_popups(ctx.get(), ps, width, height,
                                   AppUnitsPerCSSPixel());
  return n > 0 ? s_buf : nullptr;
}

// Per-page caches of encoded resource data URLs, cleared on navigation (xul_load).
// Steady-state mirroring is gated by a content-side dirty flag, but when the DOM DOES
// change (SPAs, dynamic pages) a dirty tick would otherwise re-encode every image and
// stylesheet from scratch even though they're unchanged. Keying by image URL / stylesheet
// pointer makes a dirty tick re-encode only genuinely-new resources.
static std::unordered_map<std::string, std::string> g_mirrorImgCache;
static std::unordered_map<std::string, std::string> g_mirrorCssCache;
static void mirror_clear_caches() {
  g_mirrorImgCache.clear();
  g_mirrorCssCache.clear();
}

// Composed-tree walk for DOM-mirror resource collection. Visits elements in the EXACT
// order the JS serializer (mirrorSerializerFn) does, so the #MIRRORIMG{n}#/#MIRRORCANVAS{n}#
// token indices line up: at each element, descend the open shadow root FIRST (matching the
// <template shadowrootmode> emitted before light children), then a same-origin iframe's
// content document (matching the recursive srcdoc), then the light children. <script>/
// <noscript>/<style>/<link>/<template> subtrees are skipped (the serializer drops or
// raw-emits them, never indexing inside). Only OPEN, non-UA shadow roots
// (GetShadowRootForBindings) and same-origin iframes (GetContentDocument under the node's
// own principal) are entered -- exactly what the content-JS serializer can reach.
static void mirror_walk(nsINode* node,
                        nsTArray<RefPtr<mozilla::dom::Element>>& imgs,
                        nsTArray<RefPtr<mozilla::dom::Element>>& canvases) {
  using namespace mozilla::dom;
  for (nsIContent* c = node->GetFirstChild(); c; c = c->GetNextSibling()) {
    if (!c->IsElement()) continue;
    Element* el = c->AsElement();
    if (el->IsHTMLElement()) {
      nsAtom* tag = el->NodeInfo()->NameAtom();
      if (tag == nsGkAtoms::script || tag == nsGkAtoms::noscript ||
          tag == nsGkAtoms::style || tag == nsGkAtoms::link ||
          tag == nsGkAtoms::_template) {
        continue;
      }
      if (tag == nsGkAtoms::img) {
        imgs.AppendElement(el);
        continue;
      }
      if (tag == nsGkAtoms::canvas) {
        canvases.AppendElement(el);
        continue;
      }
      if (tag == nsGkAtoms::iframe) {
        // Same-origin only, matching the serializer's JS iframe.contentDocument access.
        if (Document* cd = el->OwnerDoc()->GetSubDocumentFor(el)) {
          bool same = false;
          el->NodePrincipal()->Equals(cd->NodePrincipal(), &same);
          if (same) {
            if (Element* de = cd->GetDocumentElement()) {
              mirror_walk(de, imgs, canvases);
            }
          }
        }
        continue;
      }
    }
    if (ShadowRoot* sr = el->GetShadowRootForBindings()) {
      mirror_walk(sr, imgs, canvases);
    }
    mirror_walk(el, imgs, canvases);
  }
}

// DOM-mirror image inlining (op=6). Gecko already downloaded + decoded the page's
// images using the PAGE's own privileges, so we can read their bytes here and hand the
// host data: URLs -- sidestepping the cross-origin canvas-taint / CORS wall that blocks
// the content-JS serializer (a content script can't toDataURL() a cross-origin image).
// Returns a JSON array of data: URLs (empty string for images not yet decoded), one per
// <img> in document order, so the JS side swaps them in by index. Caller owns the
// strdup'd result.
static char* mirror_collect_images() {
  using namespace mozilla;
  using mozilla::dom::Document;
  if (!g_docShell) return strdup("[]");
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return strdup("[]");
  Document* doc = ps->GetDocument();
  if (!doc) return strdup("[]");

  nsCOMPtr<imgITools> imgTools = do_GetService("@mozilla.org/image/tools;1");
  if (!imgTools) return strdup("[]");

  // Composed-tree order (shadow + same-origin iframes), matching the serializer's tokens.
  nsTArray<RefPtr<mozilla::dom::Element>> imgEls, cvEls;
  if (mozilla::dom::Element* root = doc->GetDocumentElement()) {
    mirror_walk(root, imgEls, cvEls);
  }
  uint32_t count = imgEls.Length();

  nsCString json;
  json.Append('[');
  for (uint32_t i = 0; i < count; i++) {
    if (i) json.Append(',');
    nsCString dataUrl;
    nsCOMPtr<nsIImageLoadingContent> ilc = do_QueryInterface(imgEls[i]);
    if (ilc) {
      nsCOMPtr<imgIRequest> req;
      ilc->GetRequest(nsIImageLoadingContent::CURRENT_REQUEST,
                      getter_AddRefs(req));
      if (req) {
        // Cache by the image's URL: identical URLs share one encode, and an unchanged
        // image is never re-encoded on a later dirty tick.
        std::string key;
        if (nsCOMPtr<nsIURI> uri = req->GetURI()) {
          nsAutoCString spec;
          uri->GetSpec(spec);
          key.assign(spec.get(), spec.Length());
          auto it = g_mirrorImgCache.find(key);
          if (it != g_mirrorImgCache.end()) {
            json.Append('"');
            json.Append(it->second.c_str());
            json.Append('"');
            continue;
          }
        }
        nsCOMPtr<imgIContainer> container;
        req->GetImage(getter_AddRefs(container));
        if (container) {
          nsCOMPtr<nsIInputStream> stream;
          imgTools->EncodeImage(container, "image/png"_ns, u""_ns,
                                getter_AddRefs(stream));
          // Vector (SVG) images decode to a VectorImage with no fixed frame, so
          // EncodeImage yields nothing. Re-encode at the intrinsic size, which forces
          // a raster of the SVG.
          uint64_t avail64 = 0;
          if (stream) stream->Available(&avail64);
          if (avail64 == 0) {
            int32_t iw = 0, ih = 0;
            container->GetWidth(&iw);
            container->GetHeight(&ih);
            if (iw > 0 && ih > 0) {
              if (iw > 1024) iw = 1024;
              if (ih > 1024) ih = 1024;
              stream = nullptr;
              imgTools->EncodeScaledImage(container, "image/png"_ns, iw, ih,
                                          u""_ns, getter_AddRefs(stream));
              avail64 = 0;
              if (stream) stream->Available(&avail64);
            }
          }
          if (stream && avail64) {
            uint32_t avail =
                avail64 > 0xFFFFFFFFu ? 0xFFFFFFFFu : (uint32_t)avail64;
            nsAutoCString b64;
            if (NS_SUCCEEDED(Base64EncodeInputStream(stream, b64, avail))) {
              dataUrl.AssignLiteral("data:image/png;base64,");
              dataUrl.Append(b64);
            }
          }
        }
        // Cache only a successful encode, keyed by URL. An image still decoding yields
        // empty -> not cached -> retried next dirty tick until it lands.
        if (!key.empty() && !dataUrl.IsEmpty()) {
          g_mirrorImgCache[key].assign(dataUrl.get(), dataUrl.Length());
        }
      }
    }
    // base64 + the literal prefix contain no JSON-special chars, so a bare quote
    // wrap is safe (no escaping needed).
    json.Append('"');
    json.Append(dataUrl);
    json.Append('"');
  }
  json.Append(']');
  return strdup(json.get());
}

// DOM-mirror CSS inlining (op=7). The content-JS serializer can only read same-origin
// document.styleSheets[i].cssRules (cross-origin throws SecurityError). Here we use the
// privileged StyleSheet::GetCssRulesInternal() (no security check) to serialize EVERY
// stylesheet -- same- and cross-origin -- to text, and hand back data:text/css URLs in
// document (cascade) order so the JS side can <link> them in. Caller owns the result.
static char* mirror_collect_css() {
  using namespace mozilla;
  using mozilla::dom::Document;
  if (!g_docShell) return strdup("[]");
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return strdup("[]");
  Document* doc = ps->GetDocument();
  if (!doc) return strdup("[]");

  size_t count = doc->SheetCount();
  nsCString json;
  json.Append('[');
  for (size_t i = 0; i < count; i++) {
    if (i) json.Append(',');
    nsCString dataUrl;
    StyleSheet* sheet = doc->SheetAt(i);
    if (sheet && !sheet->Disabled()) {
      // Cache by sheet identity (stable for the page's life; the map is cleared on
      // navigation). Stylesheets almost never change after load, so this turns repeated
      // dirty ticks' CSS cost into a map lookup.
      std::string key = std::to_string((uintptr_t)sheet);
      auto it = g_mirrorCssCache.find(key);
      if (it != g_mirrorCssCache.end()) {
        json.Append('"');
        json.Append(it->second.c_str());
        json.Append('"');
        continue;
      }
      if (ServoCSSRuleList* rules = sheet->GetCssRulesInternal()) {
        nsCString css;
        uint32_t n = rules->Length();
        for (uint32_t k = 0; k < n; k++) {
          if (css::Rule* rule = rules->GetRule(k)) {
            nsAutoCString t;
            rule->GetCssText(t);
            css.Append(t);
            css.Append('\n');
          }
        }
        if (!css.IsEmpty()) {
          nsAutoCString b64;
          if (NS_SUCCEEDED(Base64Encode(css.get(), css.Length(), b64))) {
            dataUrl.AssignLiteral("data:text/css;charset=utf-8;base64,");
            dataUrl.Append(b64);
          }
        }
      }
      if (!dataUrl.IsEmpty()) {
        g_mirrorCssCache[key].assign(dataUrl.get(), dataUrl.Length());
      }
    }
    json.Append('"');
    json.Append(dataUrl);
    json.Append('"');
  }
  json.Append(']');
  return strdup(json.get());
}

// DOM-mirror canvas inlining (op=8). A <canvas> can't be serialized as markup -- its
// pixels live in a backing surface. Snapshot each one (privileged readback, so WebGL and
// cross-origin-tainted canvases are fine) and hand back data:image/png URLs in document
// order; the JS side swaps each <canvas> for an <img> with these pixels.
static char* mirror_collect_canvases() {
  using namespace mozilla;
  using mozilla::dom::Document;
  using mozilla::dom::HTMLCanvasElement;
  if (!g_docShell) return strdup("[]");
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return strdup("[]");
  Document* doc = ps->GetDocument();
  if (!doc) return strdup("[]");

  // Composed-tree order (shadow + same-origin iframes), matching the serializer's tokens.
  nsTArray<RefPtr<mozilla::dom::Element>> imgEls, cvEls;
  if (mozilla::dom::Element* root = doc->GetDocumentElement()) {
    mirror_walk(root, imgEls, cvEls);
  }
  uint32_t count = cvEls.Length();
  nsCString json;
  json.Append('[');
  for (uint32_t i = 0; i < count; i++) {
    if (i) json.Append(',');
    nsCString dataUrl;
    HTMLCanvasElement* canvas = HTMLCanvasElement::FromNodeOrNull(cvEls[i]);
    if (canvas) {
      RefPtr<gfx::SourceSurface> surf = canvas->GetSurfaceSnapshot();
      if (surf) {
        Maybe<nsTArray<uint8_t>> bytes = gfxUtils::EncodeSourceSurfaceAsBytes(
            surf, ImageType::PNG, u""_ns);
        if (bytes && !bytes->IsEmpty()) {
          nsAutoCString b64;
          if (NS_SUCCEEDED(Base64Encode((const char*)bytes->Elements(),
                                        bytes->Length(), b64))) {
            dataUrl.AssignLiteral("data:image/png;base64,");
            dataUrl.Append(b64);
          }
        }
      }
    }
    json.Append('"');
    json.Append(dataUrl);
    json.Append('"');
  }
  json.Append(']');
  return strdup(json.get());
}

// Shared command block. JS writes the request fields + sets state=1; the Gecko
// pthread runs the op and sets state=3 with the BGRA result pointer. Field
// offsets are stable for JS. The first 6 fields keep their original offsets
// (back-compat: a calloc'd block with op=0 is a plain load like before); the
// input fields are appended after url[]:
//   0 state, 4 width, 8 height, 12 result(ptr), 16 resultLen, 20 url[8192],
//   then op@8212, evType@8216, ex@8220, ey@8224, button@8228, buttons@8232,
//   clickCount@8236, modifiers@8240, keyCode@8244, charCode@8248, deltaX@8252,
//   deltaY@8256, keyValue[64]@8260, cursor@8324 (output: StyleCursorKind).
struct XulCmd {
  volatile int32_t state;  // 0 idle, 1 request, 2 processing, 3 done, -1 error, 10 ready
  int32_t width;
  int32_t height;
  uint8_t* result;
  int32_t resultLen;
  char url[8192];
  int32_t op;       // 0 load, 1 mouse, 2 key, 3 wheel, 4 paint-only
  int32_t evType;   // mouse: 0 move/1 down/2 up;  key: 0 down/1 up
  int32_t ex;       // event x (CSS px)
  int32_t ey;       // event y (CSS px)
  int32_t button;   // mouse button (0 left,1 middle,2 right)
  int32_t buttons;  // mouse buttons bitmask (-1 = auto)
  int32_t clickCount;
  int32_t modifiers;  // nsIDOMWindowUtils MODIFIER_* bits
  int32_t keyCode;    // DOM keyCode
  int32_t charCode;   // char code for printable keys (else 0)
  int32_t deltaX;     // wheel delta x (px)
  int32_t deltaY;     // wheel delta y (px)
  char keyValue[64];  // key string ("a", "Enter", "ArrowLeft", ...)
  int32_t cursor;     // OUTPUT: StyleCursorKind under the pointer (host mirrors it)
};
static XulCmd* g_cmd = nullptr;
extern "C" EMSCRIPTEN_KEEPALIVE void* xul_cmd_ptr() { return g_cmd; }

// Shared futex word for the WISP socket-poll fast path (wisp-syscalls.js +
// wisp-bridge.js). The worker-side poll()/select() sleep in Atomics.wait on this
// word instead of busy-spinning; the main thread bumps it + Atomics.notify on any
// WISP socket activity so the poll loop wakes immediately. A function-local static
// lives at a fixed address in the shared wasm heap, so every thread sees the same
// word. See gecko-wasm socket-poll optimization.
extern "C" EMSCRIPTEN_KEEPALIVE int32_t* wisp_wakeword() {
  static int32_t w = 0;
  return &w;
}

// Run the event loop briefly so any handlers/microtasks fired by an input event
// settle (and async layout updates land) before we repaint. Uses pending-event
// processing rather than SpinEventLoopUntil so it can't block waiting for an
// event that never comes.
static void PumpEvents() {
  NS_ProcessPendingEvents(nullptr, PR_MillisecondsToInterval(30));
  if (g_docShell) {
    if (mozilla::PresShell* ps = g_docShell->GetPresShell()) {
      if (auto* d = ps->GetDocument()) {
        d->FlushPendingNotifications(mozilla::FlushType::Layout);
      }
    }
  }
}

// Synthesize a mouse event (evType: 0 move, 1 down, 2 up) at CSS px (x,y) and
// dispatch it through the full event path (hit-testing, focus, click synthesis).
static void do_mouse(int evType, int x, int y, int button, int clickCount,
                     int buttons, int modifiers) {
  using namespace mozilla;
  if (!g_docShell) return;
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return;
  nsPresContext* pc = ps->GetPresContext();
  nsPoint offset;
  nsIWidget* widget = nsContentUtils::GetWidget(ps, &offset);
  if (!widget || !pc) return;

  // Outside-click rollup: native widgets roll popups up when you click off them
  // (the widget's rollup listener); the headless widget never delivers that, so do
  // it here. On a mousedown outside every open popup, roll them all up and consume
  // the click so it doesn't also fall through to content -- matching native menu
  // behavior. Clicks inside a popup fall through (menu item activation).
  if (evType == 1) {
    if (nsXULPopupManager* pm = nsXULPopupManager::GetInstance()) {
      nsTArray<nsMenuPopupFrame*> popups;
      pm->GetVisiblePopups(popups);
      if (!popups.IsEmpty()) {
        bool inside = false;
        for (auto* pf : popups) {
          if (!pf) continue;
          LayoutDeviceIntRect b = pf->CalcWidgetBounds();
          if (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height) {
            inside = true;
            break;
          }
        }
        if (!inside) {
          nsIRollupListener::RollupOptions opts;
          opts.mCount = 0;  // close all open popups
          pm->Rollup(opts, nullptr);
          return;  // consume the dismissing click
        }
      }
    }
  }

  LayoutDeviceIntPoint ref =
      nsContentUtils::ToWidgetPoint(CSSPoint(x, y), offset, pc);
  // evType: 0=mousemove 1=mousedown 2=mouseup 3=contextmenu. A synthesized right
  // mousedown/up doesn't generate eContextMenu in this headless build, so the JS
  // side sends an explicit contextmenu event (button 2) to open context menus.
  const char* typeStr =
      evType == 1 ? "mousedown"
                  : (evType == 2 ? "mouseup"
                                 : (evType == 3 ? "contextmenu" : "mousemove"));
  nsAutoString type;
  type.AssignASCII(typeStr);

  dom::SynthesizeMouseEventData data;
  data.mButton = button;
  data.mModifiers = modifiers;
  data.mInputSource = 1;  // MouseEvent.MOZ_SOURCE_MOUSE
  if (buttons >= 0) data.mButtons.Construct(buttons);
  if (clickCount > 0) data.mClickCount.Construct(clickCount);
  dom::SynthesizeMouseEventOptions options;  // defaults are fine
  dom::Optional<OwningNonNull<dom::VoidFunction>> noCallback;

  auto rv = nsContentUtils::SynthesizeMouseEvent(ps, widget, type, ref, data,
                                                 options, noCallback);
  (void)rv;

  // Capture the cursor the content specifies under the pointer so the host page
  // can mirror it (cursor: pointer over links, text over inputs, resize handles,
  // etc.). This is what EventStateManager::UpdateCursor feeds the widget; we read
  // it back from the frame since the windowless widget's SetCursor is a no-op.
  if (g_cmd) {
    int32_t a = AppUnitsPerCSSPixel();
    nsPoint rootPt(x * a, y * a);
    int kind = (int)StyleCursorKind::Auto;
    if (nsIFrame* root = ps->GetRootFrame()) {
      if (nsIFrame* target =
              nsLayoutUtils::GetFrameForPoint(RelativeTo{root}, rootPt)) {
        nsPoint framePt = rootPt - target->GetOffsetTo(root);
        kind = (int)target->GetCursor(framePt).mCursor;
      }
    }
    g_cmd->cursor = kind;
  }
}

// Synthesize a wheel (scroll) event at CSS px (x,y) with pixel deltas, mirroring
// the tested EventUtils.synthesizeWheel path.
static void do_wheel(int x, int y, double dx, double dy, int modifiers) {
  using namespace mozilla;
  if (!g_docShell) return;
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return;
  nsPresContext* pc = ps->GetPresContext();
  nsPoint offset;
  nsIWidget* widget = nsContentUtils::GetWidget(ps, &offset);
  if (!widget || !pc) return;

  ScrollContainerFrame* sf = ps->GetRootScrollContainerFrame();
  nsPoint before = sf ? sf->GetScrollPosition() : nsPoint();

  WidgetWheelEvent ev(true, eWheel, widget);
  ev.mModifiers = nsContentUtils::GetWidgetModifiers(modifiers);
  ev.mDeltaX = dx;
  ev.mDeltaY = dy;
  ev.mDeltaZ = 0.0;
  ev.mDeltaMode = 0;  // WheelEvent.DOM_DELTA_PIXEL
  ev.mLineOrPageDeltaX = dx > 0 ? (int32_t)std::floor(dx) : (int32_t)std::ceil(dx);
  ev.mLineOrPageDeltaY = dy > 0 ? (int32_t)std::floor(dy) : (int32_t)std::ceil(dy);
  ev.mRefPoint = nsContentUtils::ToWidgetPoint(CSSPoint(x, y), offset, pc);
  widget->DispatchEvent(&ev);

  // The windowless build has no APZ, so the dispatched wheel event is "consumed"
  // by the event manager (eConsumeNoDefault) but the scroll isn't applied. If the
  // position didn't move and content didn't preventDefault (e.g. a custom scroller
  // / map), apply the scroll to the root scroll frame ourselves. Use Smooth mode
  // so the GPU compositor animates it over refresh-driver ticks.
  if (sf && sf->GetScrollPosition() == before && !ev.DefaultPrevented()) {
    sf->ScrollToCSSPixels(
        CSSPoint::FromAppUnits(before) + CSSPoint((float)dx, (float)dy),
        ScrollMode::Smooth);
  }
}

// Build + dispatch one keyboard event of the given message through the widget.
static void dispatch_key(nsIWidget* widget, mozilla::EventMessage msg,
                         const nsAString& key, int keyCode, int charCode,
                         int modifiers) {
  using namespace mozilla;
  WidgetKeyboardEvent ev(true, msg, widget);
  KeyNameIndex kni = WidgetKeyboardEvent::GetKeyNameIndex(key);
  ev.mKeyNameIndex = kni;
  if (kni == KEY_NAME_INDEX_USE_STRING) ev.mKeyValue = key;
  ev.mCodeNameIndex = CODE_NAME_INDEX_UNKNOWN;
  ev.mModifiers = nsContentUtils::GetWidgetModifiers(modifiers);
  if (msg == eKeyPress && charCode) {
    // Printable keypress: mCharCode gates text insertion (IsInputtingText),
    // mKeyValue carries the inserted string; DOM keyCode is 0 for printables.
    ev.mCharCode = charCode;
    ev.mKeyCode = 0;
  } else {
    ev.mKeyCode = keyCode ? keyCode
                          : (kni != KEY_NAME_INDEX_USE_STRING
                                 ? WidgetKeyboardEvent::
                                       ComputeKeyCodeFromKeyNameIndex(kni)
                                 : 0);
  }
  widget->DispatchEvent(&ev);
}

// Synthesize a keyboard event (evType: 0 keydown, 1 keyup). On keydown, also
// dispatch a keypress for non-modifier keys (matching DOM ordering), which is
// what drives text insertion + editor commands.
static void do_key(int evType, const char* keyUtf8, int keyCode, int charCode,
                   int modifiers) {
  using namespace mozilla;
  if (!g_docShell) return;
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return;
  nsPoint offset;
  nsIWidget* widget = nsContentUtils::GetWidget(ps, &offset);
  if (!widget) return;

  NS_ConvertUTF8toUTF16 key(keyUtf8);
  KeyNameIndex kni = WidgetKeyboardEvent::GetKeyNameIndex(key);
  bool isModifierKey = WidgetKeyboardEvent::GetModifierForKeyName(kni) !=
                       MODIFIER_NONE;
  if (evType == 0) {
    dispatch_key(widget, eKeyDown, key, keyCode, 0, modifiers);
    if (!isModifierKey) {
      dispatch_key(widget, eKeyPress, key, keyCode, charCode, modifiers);
    }
  } else {
    dispatch_key(widget, eKeyUp, key, keyCode, 0, modifiers);
  }
}


// With -sPROXY_TO_PTHREAD, main() runs on a dedicated pthread (Gecko's "main
// thread"), leaving emscripten's runtime main thread free to service proxied
// calls. This lets xul_render's SpinEventLoopUntil block here without deadlocking
// the workers (WebRender/compositor/helper threads) that need the runtime thread.
int main() {
  printf("embed-xul: main() on the app pthread (PROXY_TO_PTHREAD)\n");
  fflush(stdout);

  g_cmd = (XulCmd*)calloc(1, sizeof(XulCmd));

  // GPU mode: the in-process WebRender compositor presents directly to the page
  // <canvas> (GLContextProviderEmscripten over WebGL2). Set by index.html?gpu=1.
  g_gpu = getenv("GECKO_GPU") != nullptr;
  g_mirror = getenv("GECKO_MIRROR") != nullptr;
  // Capture the canvas-passthrough flag HERE (main/app thread, where getenv sees
  // the env) into a shared global; content WebGL's GLContextProvider runs on a
  // different worker thread where getenv may not see ENV. See g_gl_passthrough.
  extern int g_gl_passthrough;
  g_gl_passthrough = getenv("GECKO_GL_PASSTHROUGH") != nullptr;
  printf("embed-xul: GECKO_GL_PASSTHROUGH=%d\n", g_gl_passthrough);
  fflush(stdout);
  printf("embed-xul: GECKO_GPU=%d (%s rendering)\n", (int)g_gpu,
         g_gpu ? "GPU/WebRender->canvas" : "software RenderDocument+blit");
  fflush(stdout);

  const char* gre = getenv("GRE_DIR");
  if (!gre || !*gre) {
    // web build sets GRE_DIR=/gre (MEMFS preload); this is just a fallback.
    gre = "/gre";
  }
  int rv = xul_init(gre);
  if (rv != 0) {
    printf("embed-xul: xul_init FAILED rv=0x%08x\n", (unsigned)rv);
    fflush(stdout);
    g_cmd->state = -2;
    return rv;
  }

  g_cmd->state = 10;  // ready
  printf("embed-xul: READY cmd=%p (state@0,w@4,h@8,result@12,len@16,url@20)\n",
         (void*)g_cmd);
  fflush(stdout);

  // On-demand command loop: serve load/input/paint requests from JS until the
  // process ends. op selects the action; every op repaints and returns BGRA.
  for (;;) {
    if (g_cmd->state == 1) {
      g_cmd->state = 2;  // processing
      if (g_cmd->result) {
        free(g_cmd->result);
        g_cmd->result = nullptr;
      }
      uint8_t* buf = nullptr;
      bool ok = true;
      switch (g_cmd->op) {
        case 0:  // load URL
          ok = xul_load(g_cmd->url, g_cmd->width, g_cmd->height);
          break;
        case 1:  // mouse
          do_mouse(g_cmd->evType, g_cmd->ex, g_cmd->ey, g_cmd->button,
                   g_cmd->clickCount, g_cmd->buttons, g_cmd->modifiers);
          PumpEvents();
          break;
        case 2:  // keyboard
          do_key(g_cmd->evType, g_cmd->keyValue, g_cmd->keyCode, g_cmd->charCode,
                 g_cmd->modifiers);
          PumpEvents();
          break;
        case 3:  // wheel
          do_wheel(g_cmd->ex, g_cmd->ey, (double)g_cmd->deltaX,
                   (double)g_cmd->deltaY, g_cmd->modifiers);
          PumpEvents();
          break;
        case 4:  // paint only
          break;
        case 5: {  // eval JS in the content global; returns the eval's string result
          char* res = nullptr;
          ok = RunChromeScript(nsDependentCString(g_cmd->url), &res);
          g_evalResult = res;  // ownership -> g_cmd->result below (freed next cmd)
          PumpEvents();
          break;
        }
        case 6:  // DOM-mirror: data: URLs for the page's <img>s (privileged, CORS-free)
          g_evalResult = mirror_collect_images();
          PumpEvents();
          break;
        case 7:  // DOM-mirror: data:text/css URLs for every stylesheet (cross-origin too)
          g_evalResult = mirror_collect_css();
          PumpEvents();
          break;
        case 8:  // DOM-mirror: data: URLs for the page's <canvas> pixels
          g_evalResult = mirror_collect_canvases();
          PumpEvents();
          break;
      }
      // GPU mode: present the main scene via the compositor (no software buffer),
      // then paint any open popups into an overlay buffer (result/resultLen,
      // otherwise unused in GPU mode) for the JS 2D overlay canvas. Software mode:
      // paint everything into one BGRA buffer for the JS putImageData blit.
      if (g_cmd->op >= 5 && g_cmd->op <= 8) {
        // String results: op5 eval/serialize, op6 image / op7 css / op8 canvas
        // data-URL JSON.
        buf = (uint8_t*)g_evalResult;
        g_evalResult = nullptr;
        g_cmd->result = buf;
        g_cmd->resultLen = buf ? (uint32_t)strlen((char*)buf) : 0;
        g_cmd->state = ok ? 3 : -1;
      } else if (g_mirror) {
        // Headless: Gecko parsed/styled/laid-out + ran JS above (and PumpEvents kept it
        // ticking); we never paint. The host pulls the DOM via op=5.
        g_cmd->result = nullptr;
        g_cmd->resultLen = 0;
        g_cmd->state = ok ? 3 : -1;
      } else {
        // GPU mode: present the main scene via the compositor (no software buffer),
        // then paint any open popups into an overlay buffer. Software mode: paint
        // everything into one BGRA buffer for the JS putImageData blit.
        if (g_gpu) {
          if (ok) {
            gpu_present(g_cmd->width, g_cmd->height);
            buf = paint_popup_overlay(g_cmd->width, g_cmd->height);  // null = no popups
          }
        } else if (ok) {
          buf = xul_paint(g_cmd->width, g_cmd->height);
        }
        g_cmd->result = buf;
        g_cmd->resultLen = buf ? g_cmd->width * g_cmd->height * 4 : 0;
        g_cmd->state = (g_gpu ? ok : (buf != nullptr)) ? 3 : -1;  // done / error
      }
    } else {
      // Idle: keep pumping the Gecko main-thread event loop so content timers,
      // JS/CSS animations and the refresh driver advance continuously -- not just
      // while a command is being handled. The JS side repaints on a loop (op=4),
      // so the canvas reflects these ongoing changes.
      NS_ProcessPendingEvents(nullptr, PR_MillisecondsToInterval(8));
    }
    usleep(2000);  // breather; this is a real pthread (worker), so it can block
  }
  return 0;
}
