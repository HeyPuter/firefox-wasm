// Shared interface for the gecko.js embedder, split across embed-*.cpp:
//   embed-xul.cpp     entry (main) + the JS<->wasm shared-memory IPC command loop
//   embed-init.cpp    XPCOM bring-up (xul_init + the dir/appshell providers)
//   embed-browser.cpp window/docshell management + URL loading
//   embed-paint.cpp   software + GPU painting and popup compositing
//   embed-input.cpp   mouse/keyboard/wheel injection + clipboard
//   embed-mirror.cpp  DOM-mirror mode (serialize the page to data: URLs)
//
// All the Gecko headers the embedder needs are gathered here so each .cpp just
// includes this one. (If embed compile time becomes a concern, this can be split
// into per-file include sets.)
#pragma once

// Single-threaded embed (engine built without -pthread): no atomics, no SAB,
// no app pthread. main() must not block; JS drives xul_tick() and loads
// complete asynchronously (see xul_load_poll).
#if defined(__EMSCRIPTEN__) && !defined(__EMSCRIPTEN_PTHREADS__)
#  define GECKO_ST_EMBED 1
#endif

#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <cstring>
#include <cmath>
#include <string>
#include <unordered_map>
#include <unistd.h>
#include <sys/stat.h>
#include <pthread.h>
#include <emscripten.h>
#include <emscripten/wasmfs.h>

// Persistent /profile + /gre provider backend, patched into libwasmfs (emsdk-
// patches/provider_backend.h). Not in the public emscripten/wasmfs.h.
extern "C" backend_t wasmfs_create_provider_backend(int mountId);

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
#include "nsIObserverService.h"
#include "nsIObserver.h"
#include "nsIClassInfo.h"
#include "nsIProperties.h"
#include "nsDirectoryServiceDefs.h"
#include "nsDirectoryServiceUtils.h"
#include "nsStringFwd.h"
#include "nsString.h"
#include "mozilla/Preferences.h"
#include "mozilla/AutoSQLiteLifetime.h"
#include "mozilla/XREAppData.h"

// gAppData is null in embedded contexts (we never run XRE_main), which leaves
// Services.appinfo without the nsIXULAppInfo interface. embed-init.cpp populates it.
// Declared in toolkit/xre/nsAppRunner.h; declared here to avoid that whole header.
extern const mozilla::XREAppData* gAppData;

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
#include "nsNameSpaceManager.h"
#include "nsGenericHTMLElement.h"
#include "mozilla/dom/LoadURIOptionsBinding.h"
#include "mozilla/PresShell.h"
#include "nsIFrame.h"
#include "nsPresContext.h"
#include "nsThreadUtils.h"
#include "mozilla/SpinEventLoopUntil.h"
#include "nsServiceManagerUtils.h"
#include "nsIClipboard.h"
#include "nsITransferable.h"
#include "nsISupportsPrimitives.h"
#include "gfxContext.h"
#include "nsRect.h"
#include "nsIWebProgress.h"
#include "nsIWebProgressListener.h"
#include "nsIRequest.h"
#include "nsIChannel.h"
#include "nsIHttpProtocolHandler.h"
#include "nsWeakReference.h"
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

// ---- shared command struct (the JS<->wasm IPC mailbox; mirror of the offsets in
// gecko.js/src/index.ts). One instance lives at g_cmd; JS polls/sets state. ----
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

// ---- shared globals (defined in the file noted; extern everywhere else) ----
extern XulCmd* g_cmd;                  // embed-xul.cpp
extern nsCOMPtr<nsIDocShell> g_docShell;  // embed-browser.cpp
extern bool g_gpu;                     // embed-xul.cpp (env, set in main)
extern bool g_mirror;                  // embed-xul.cpp (env, set in main)

// ---- cross-file functions ----
extern "C" int xul_init(const char* greDir);                 // embed-init.cpp

bool xul_load(const char* url, int width, int height);       // embed-browser.cpp
void EnsureSize(int width, int height);                      // embed-browser.cpp
bool RunChromeScript(const nsACString& aScript, char** aOutResult = nullptr);

uint8_t* xul_paint(int width, int height);                   // embed-paint.cpp
void gpu_ensure_active(int width, int height);               // embed-paint.cpp
uint8_t* paint_popup_overlay(int width, int height);         // embed-paint.cpp
void PumpEvents();                                           // embed-paint.cpp

void do_mouse(int evType, int x, int y, int button, int clickCount,
              int buttons, int modifiers);                   // embed-input.cpp
void do_wheel(int x, int y, double dx, double dy, int modifiers);
void do_key(int evType, const char* keyUtf8, int keyCode, int charCode,
            int modifiers);
bool set_clipboard_text(const char* utf8);

char* mirror_collect_images();                               // embed-mirror.cpp
char* mirror_collect_css();
char* mirror_collect_canvases();
void mirror_clear_caches();
