// Entry point + the JS<->wasm shared-memory IPC command loop. The other embed-*.cpp
// files (init/browser/paint/input/mirror) implement the ops dispatched here. See
// embed-xul.h for the shared interface.
#include "embed-xul.h"
#include <emscripten/threading.h>  // emscripten_futex_wait (event-driven command loop)
// No-op override of pthread_setname_np. musl provides a real one, but thread names
// are irrelevant in this embedding; SpiderMonkey/mozglue call it on thread startup,
// so define it as a cheap no-op.
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

// ---- IPC mailbox + env-driven render flags (shared globals defined here) ----
XulCmd* g_cmd = nullptr;
extern "C" EMSCRIPTEN_KEEPALIVE void* xul_cmd_ptr() { return g_cmd; }
bool g_gpu = false;                  // GPU/WebRender present (set from env in main)
bool g_mirror = false;               // DOM-mirror mode (op 6-8 pull the DOM)
static char* g_evalResult = nullptr; // op 5-8 string result -> g_cmd->result
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
    // index.ts always sets GRE_DIR; fall back to the baked GRE for safety.
    gre = "/gre-baked";
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
  // Event-driven: when idle we drain the Gecko event loop, then SLEEP on the command
  // word until JS submits a request (Atomics.notify on `state`, see index.ts) or a
  // short timeout elapses so the engine keeps ticking. A command is then picked up
  // instantly (no poll-interval latency) and the thread doesn't busy-spin when idle.
  // The timeout is the steady-state engine pump cadence: with no command in flight,
  // Gecko's own main-thread runnables (the refresh driver, network/timer events
  // posted by other threads) drain at most this often, so keep it well under a frame
  // (4ms) to avoid stutter -- commands themselves don't wait for it (notify wakes us).
  constexpr double kCmdPumpMs = 4.0;
  for (;;) {
    int32_t s = g_cmd->state;
    if (s != 1) {  // idle: pump the engine loop, then wait for a command or timeout
      NS_ProcessPendingEvents(nullptr, 0);  // non-blocking drain of ready runnables
      // futex_wait returns at once if `state` already changed (no lost wakeups), so
      // a request submitted in the race window between the read and the wait is not
      // missed -- it's why this takes the expected value `s`.
      emscripten_futex_wait((void*)&g_cmd->state, (uint32_t)s, kCmdPumpMs);
      continue;
    }
    {
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
        case 9:  // set clipboard text (system-clipboard prime before a native paste)
          ok = set_clipboard_text(g_cmd->url);
          break;
      }
      // Build the result for this op: string ops (5-8) return a UTF-8 buffer; op 9
      // and mirror mode paint nothing; everything else paints a frame (GPU present
      // + popup overlay, or a software BGRA blit). See each branch below.
      if (g_cmd->op >= 5 && g_cmd->op <= 8) {
        // String results: op5 eval/serialize, op6 image / op7 css / op8 canvas
        // data-URL JSON.
        buf = (uint8_t*)g_evalResult;
        g_evalResult = nullptr;
        g_cmd->result = buf;
        g_cmd->resultLen = buf ? (uint32_t)strlen((char*)buf) : 0;
        g_cmd->state = ok ? 3 : -1;
      } else if (g_cmd->op == 9 || g_mirror) {
        // op 9 (clipboard set) and DOM-mirror produce no painted frame: Gecko did
        // its work above; we don't blit. (Mirror mode pulls the DOM via op=5.)
        g_cmd->result = nullptr;
        g_cmd->resultLen = 0;
        g_cmd->state = ok ? 3 : -1;
      } else {
        // GPU mode: present the main scene via the compositor (no software buffer),
        // then paint any open popups into an overlay buffer. Software mode: paint
        // everything into one BGRA buffer for the JS putImageData blit.
        if (g_gpu) {
          if (ok) {
            // Main scene presents autonomously (refresh driver, see gpu_ensure_active);
            // here we just keep the compositor active/sized and pull the popup overlay.
            gpu_ensure_active(g_cmd->width, g_cmd->height);
            buf = paint_popup_overlay(g_cmd->width, g_cmd->height);  // null = no popups
          }
        } else if (ok) {
          buf = xul_paint(g_cmd->width, g_cmd->height);
        }
        g_cmd->result = buf;
        g_cmd->resultLen = buf ? g_cmd->width * g_cmd->height * 4 : 0;
        g_cmd->state = (g_gpu ? ok : (buf != nullptr)) ? 3 : -1;  // done / error
      }
    }
  }
  return 0;
}
