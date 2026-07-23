// Window/docshell lifecycle + URL loading (content windowless-browser path and the
// chrome AppWindow path). Split from embed-xul.cpp. See embed-xul.h.
#include "embed-xul.h"
#include "js/Conversions.h"
#include "js/Exception.h"
#include "js/PropertyAndElement.h"

// A single windowless browser / chrome AppWindow is created lazily and kept alive
// across loads + input events so the live document stays interactive.
static nsCOMPtr<nsIWindowlessBrowser> g_wb;
static nsCOMPtr<nsIAppWindow> g_appWin;     // chrome build: the real top-level window
nsCOMPtr<nsIDocShell> g_docShell;            // shared (declared extern in embed-xul.h)
static bool g_isChrome = false;
static const char* kBrowserChromeURL = "chrome://browser/content/browser.xhtml";
// Last size we resized the window to (resize only on a real change).
static int g_lastW = 0, g_lastH = 0;
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
void EnsureSize(int width, int height) {
  using namespace mozilla;
  if (!g_docShell) return;
  // Re-assert the viewport whenever it has DRIFTED from the requested size, not
  // just when the JS-requested size changes. Content can shrink the presentation's
  // visible area below the canvas (observed: google.com collapses it to 400x0 via a
  // resize/new-viewer during its load) while the JS keeps sending 800x600 -- the old
  // "requested size unchanged -> skip" guard then never re-corrected it, so the page
  // painted into only the top-left and the rest of the buffer stayed blank.
  bool needResize = (width != g_lastW || height != g_lastH);
  if (!needResize) {
    if (PresShell* ps = g_docShell->GetPresShell()) {
      if (nsPresContext* pc = ps->GetPresContext()) {
        int32_t app = pc->AppUnitsPerDevPixel();
        nsSize vis = pc->GetVisibleArea().Size();
        if (app <= 0 || vis.width / app != width || vis.height / app != height) {
          needResize = true;
        }
      }
    }
  }
  if (!needResize) return;
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
bool RunChromeScript(const nsACString& aScript,
                            char** aOutResult) {
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
    // Describe the exception (message + stack) instead of swallowing it; the
    // description is printed AND handed back through aOutResult so evalChrome
    // callers see "EvalThrew: ..." as the result string.
    nsAutoCString desc("EvalThrew: ");
    JS::Rooted<JS::Value> exn(cx);
    if (JS_GetPendingException(cx, &exn)) {
      JS_ClearPendingException(cx);
      JS::Rooted<JSString*> str(cx, JS::ToString(cx, exn));
      if (JS::UniqueChars msg = str ? JS_EncodeStringToUTF8(cx, str) : nullptr) {
        desc.Append(msg.get());
      } else {
        JS_ClearPendingException(cx);  // ToString threw
        desc.AppendLiteral("<unstringifiable exception>");
      }
      if (exn.isObject()) {
        JS::Rooted<JSObject*> obj(cx, &exn.toObject());
        JS::Rooted<JS::Value> stackVal(cx);
        if (JS_GetProperty(cx, obj, "stack", &stackVal) &&
            stackVal.isString()) {
          JS::Rooted<JSString*> stackStr(cx, stackVal.toString());
          if (JS::UniqueChars stack = JS_EncodeStringToUTF8(cx, stackStr)) {
            desc.AppendLiteral("\n");
            desc.Append(stack.get());
          }
        }
        JS_ClearPendingException(cx);  // in case the stack getter threw
      }
    } else {
      desc.AppendLiteral("<uncatchable / no pending exception>");
    }
    printf("RunChromeScript: %s\n", desc.get());
    fflush(stdout);
    if (aOutResult) *aOutResult = strdup(desc.get());
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

// Fired (via the observer service) by the addTab script below once the new tab's
// top-level network load reaches STATE_STOP. Lets xul_chrome_load_content wait for
// the real load to finish instead of pumping a fixed iteration count.
class TabLoadObserver final : public nsIObserver {
 public:
  NS_DECL_ISUPPORTS
  bool mDone = false;
  NS_IMETHOD Observe(nsISupports*, const char*, const char16_t*) override {
    mDone = true;
    return NS_OK;
  }

 private:
  ~TabLoadObserver() = default;
};
NS_IMPL_ISUPPORTS(TabLoadObserver, nsIObserver)

// Chrome build: load a site in the full Firefox front-end. We open a fresh tab via
// gBrowser.addTab with forceNotRemote (single process: the tab's browser must be
// in-process to have a docshell we can render) and select it; the site then renders
// inside the chrome window we paint. The work is deferred with setTimeout so
// JS::Evaluate returns immediately -- addTab does heavy synchronous setup that must
// run on the event loop, not nested inside our command handler. The deferred script
// also attaches a one-shot nsIWebProgressListener that notifies "embed-tab-loaded"
// when the top-level network load completes; we pump the event loop until that
// fires (or a safety timeout), so load() returns when the page is actually loaded.
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
      "gBrowser.selectedTab=t;"
      // One-shot progress listener on the selected tab: notify when the top-level
      // network load stops, then detach. Single quotes avoid escaping in the C++
      // string; Ci/Services/ChromeUtils/gBrowser are chrome-window globals.
      "var L={QueryInterface:ChromeUtils.generateQI("
      "['nsIWebProgressListener','nsISupportsWeakReference']),"
      "onStateChange:function(wp,req,f,s){"
      "if(wp&&wp.isTopLevel&&(f&Ci.nsIWebProgressListener.STATE_STOP)&&"
      "(f&Ci.nsIWebProgressListener.STATE_IS_NETWORK)){"
      "try{gBrowser.removeProgressListener(L);}catch(e){}"
      "Services.obs.notifyObservers(null,'embed-tab-loaded','');}},"
      "onProgressChange:function(){},onLocationChange:function(){},"
      "onStatusChange:function(){},onSecurityChange:function(){},"
      "onContentBlockingEvent:function(){}};"
      "gBrowser.addProgressListener(L);"
      "void t.linkedBrowser.docShell;"
      "}catch(e){console.error(\"embed load error\",e);"
      "Services.obs.notifyObservers(null,'embed-tab-loaded','');}},0);");
  printf("xul_chrome_load_content: opening tab for %.80s\n", url);
  fflush(stdout);

  RefPtr<TabLoadObserver> obs = new TabLoadObserver();
  nsCOMPtr<nsIObserverService> os =
      do_GetService("@mozilla.org/observer-service;1");
  if (os) os->AddObserver(obs, "embed-tab-loaded", false);

  if (!RunChromeScript(js)) {
    if (os) os->RemoveObserver(obs, "embed-tab-loaded");
    return false;
  }

  // Pump until the load completes (observer fires) or a safety timeout. After we
  // return, the main command loop keeps pumping the event loop, so a still-loading
  // page continues in the background -- the timeout only bounds how long load()
  // blocks (a hung/slow site won't wedge it forever).
  TimeStamp deadline = TimeStamp::Now() + TimeDuration::FromSeconds(30);
  uint32_t spins = 0;
  SpinEventLoopUntil("xul_chrome_load"_ns, [&]() -> bool {
    ++spins;
    return obs->mDone || TimeStamp::Now() >= deadline;
  });
  if (os) os->RemoveObserver(obs, "embed-tab-loaded");
  printf("xul_chrome_load_content: %s after %u spins\n",
         obs->mDone ? "loaded" : "timed out", spins);
  fflush(stdout);
  return true;
}

static bool XulLoadTail(nsIDocShell* ds);

#ifdef GECKO_ST_EMBED
// Pending single-threaded load: xul_load stashes here instead of spinning;
// xul_load_poll (from xul_tick) completes it.
static struct {
  bool active = false;
  nsCOMPtr<nsIDocShell> ds;
  RefPtr<mozilla::dom::Document> oldDoc;
  uint32_t polls = 0;
} g_stLoad;

// 0 = still loading, 1 = completed ok, 2 = completed (tail failed), -1 = no
// load in flight.
extern "C" int xul_load_poll() {
  using mozilla::PresShell;
  using mozilla::dom::Document;
  if (!g_stLoad.active) {
    return -1;
  }
  PresShell* p = g_stLoad.ds->GetPresShell();
  Document* d = p ? p->GetDocument() : nullptr;
  int st = d ? (int)d->GetReadyStateEnum() : -1;
  bool isNew = d && d != g_stLoad.oldDoc;
  // ~30k ticks at ~4ms is the 120s JS-side command timeout; give up like the
  // threaded spin cap does and run the tail anyway.
  if (!((isNew && st >= (int)Document::READYSTATE_INTERACTIVE) ||
        (++g_stLoad.polls > 30000))) {
    return 0;
  }
  nsCOMPtr<nsIDocShell> ds = g_stLoad.ds;
  g_stLoad.active = false;
  g_stLoad.ds = nullptr;
  g_stLoad.oldDoc = nullptr;
  printf("xul_load: ST load ready after %u polls\n", g_stLoad.polls);
  fflush(stdout);
  return XulLoadTail(ds) ? 1 : 2;
}
#endif

bool xul_load(const char* url, int width, int height) {
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
#ifdef GECKO_ST_EMBED
  // Single-threaded: cannot spin here -- network delivery needs the JS event
  // loop, which is blocked while we run. Stash the load; xul_load_poll()
  // (driven by xul_tick) runs XulLoadTail once the document is interactive.
  g_stLoad.active = true;
  g_stLoad.ds = ds;
  g_stLoad.oldDoc = oldDoc;
  g_stLoad.polls = 0;
  printf("xul_load: ST async load pending\n");
  fflush(stdout);
  return true;
#else
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

  return XulLoadTail(ds);
#endif
}

// Post-load tail (focus/actors/mirror), shared by the blocking (threaded) and
// polled (single-threaded) load paths.
static bool XulLoadTail(nsIDocShell* ds) {
  using namespace mozilla;
  using mozilla::dom::Document;

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
          // Unblock the bookmarks toolbar. PlacesToolbarHelper.init() (delayed
          // startup) awaits PlacesUIUtils.canLoadToolbarContentPromise, resolved
          // only by PlacesUIUtils.unblockToolbars -- a 'browser-idle-startup'
          // category task that BrowserGlue._onWindowsRestored dispatches on
          // 'sessionstore-windows-restored', which never fires here (SessionStore
          // doesn't fully run). Without it the toolbar's PlacesToolbar view is
          // never constructed: no bookmark items, no "Import bookmarks" message.
          // Resolving the promise directly is order-independent and side-effect
          // free (vs firing the whole windows-restored notification).
          "try{ChromeUtils.importESModule('moz-src:///browser/components/places/"
          "PlacesUIUtils.sys.mjs').PlacesUIUtils.unblockToolbars();}"
          "catch(e){console.error('unblockToolbars: '+e);}"
          // Register the built-in page actions (the urlbar bookmark star).
          // PageActions.init is a 'browser-first-window-ready' category task;
          // BrowserGlue._onFirstWindowLoaded dispatches that category but aborts
          // first in _maybeOfferProfileReset (Services.appinfo.replacedLockTime
          // -> NS_ERROR_NOT_AVAILABLE: no XRE profile lock here). Without it
          // PageActions.actionForID('bookmark') is null and Ctrl+D throws
          // "PageActions: No anchor node for <no action>" (StarUI can't anchor).
          // Late init is the normal flow (per-window BrowserPageActions.init runs
          // first in real Firefox too); onActionAdded places the star button.
          // Deliberately NOT dispatching the whole browser-first-window-ready
          // category: it also contains ProcessHangMonitor/TabCrashHandler/DoH/
          // profile services, which this embedding must not run.
          "try{ChromeUtils.importESModule('resource:///modules/"
          "PageActions.sys.mjs').PageActions.init();}"
          "catch(e){console.error('PageActions.init: '+e);}"
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

      // Build already-installed WebExtension background pages at startup.
      // ExtensionParent gates the APP_STARTUP background build on
      // browserStartupPromise, which resolves from 'sessionstore-windows-restored'
      // OR 'extensions-late-startup'. SessionStore doesn't fully run here, so a
      // persistent background (e.g. uBlock Origin loaded from the profile at
      // startup) never builds and its primed webRequestBlocking listener suspends
      // every request forever (no tab loads). 'extensions-late-startup' is exactly
      // the no-SessionStore signal ExtensionParent.sys.mjs documents; it's narrowly
      // observed (ExtensionParent), so firing it has no other side effects.
      // NOTE: do NOT fire 'browser-delayed-startup-finished' to resolve the
      // browserPaintedPromise (used only for primed event-page WAKEUPS, not for
      // persistent backgrounds): that notification makes BrowserGlue run its entire
      // _onFirstWindowLoaded first-window init ('browser-first-window-ready'
      // modules, profile-reset, etc.), which in this minimal embedding errors out
      // and tries to spin up a content subprocess -> tab loads then fail
      // (nsIWebNavigation.fixupAndLoadURIString NS_ERROR_NOT_AVAILABLE). Promises
      // resolve async, so an onManifestEntry registering its .then() afterward
      // still runs. Fresh installs (ADDON_INSTALL) build immediately, no signal
      // needed. (Set GECKO_NO_EXT_BG_STARTUP to skip, for A/B debugging.)
      //
      // *** TIMING: fire it DEFERRED, not during chrome startup. ***
      // Firing it here (right after browser.xhtml loads, while gBrowserInit is still
      // running its startup) builds the background page TOO EARLY: loading the
      // background page (fixupAndLoadURIString moz-extension://.../background.html)
      // tears the just-created frameloader down ("message-manager-close" right after
      // the load, uri=null) before BackgroundViewLoaded -> the background never
      // starts -> uBlock's primed webRequestBlocking listener suspends every request
      // -> about:blank. Proof: disabling + re-enabling the extension (which runs the
      // SAME build() but LATE, via ADDON_ENABLE, after the chrome has settled) works.
      // So defer the signal until the chrome window has finished its delayed startup
      // (gBrowserInit fires 'browser-delayed-startup-finished' itself), with a
      // timeout fallback. We only OBSERVE that notification for timing; we never fire
      // it (firing it has the BrowserGlue side effects described above).
      if (!getenv("GECKO_NO_EXT_BG_STARTUP")) {
        // After the chrome has settled, (1) fire 'extensions-late-startup' so the
        // APP_STARTUP background build is unblocked, and (2) RELOAD each active
        // extension. (2) is the key: an extension started at APP_STARTUP has its
        // persistent listeners PRIMED, and for at least uBlock Origin that makes
        // loading its background page tear the frameloader down before it runs
        // ("message-manager-close" on the background load, before
        // Extension:BackgroundViewLoaded) -> the background never starts -> its
        // webRequestBlocking listener suspends every request -> no tab ever loads.
        // Manually disabling + re-enabling the extension fixes it (the restart runs
        // via the ADDON_ENABLE path, without the APP_STARTUP priming). addon.reload()
        // is exactly that, automated once, deferred to the settled point.
        RunChromeScript(
            "(function(){var fired=false;"
            "var go=function(tag){if(fired)return;fired=true;"
            "try{Services.obs.notifyObservers(null,'extensions-late-startup');}catch(e){}"
            "(async function(){try{var m=ChromeUtils.importESModule("
            "'resource://gre/modules/AddonManager.sys.mjs');"
            "var addons=await m.AddonManager.getAddonsByTypes(['extension']);"
            "for(var a of addons){if(a&&a.isActive&&!a.isSystem){"
            "try{await a.reload();console.error('ext-bg-startup: reloaded '+a.id);}"
            "catch(e){console.error('ext-bg-startup reload '+a.id+': '+e);}}}}"
            "catch(e){console.error('ext-bg-startup reload-all: '+e);}})();"
            "console.error('ext-bg-startup: fired+reload ('+tag+')');};"
            "try{var o={observe:function(){try{Services.obs.removeObserver(o,"
            "'browser-delayed-startup-finished');}catch(e){}"
            "setTimeout(function(){go('delayed-startup');},1500);}};"
            "Services.obs.addObserver(o,'browser-delayed-startup-finished');}catch(e){}"
            "setTimeout(function(){go('timeout');},10000);})();"_ns);
        fflush(stdout);
      }
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
