// De-risk test (NO libxul): WebGL2 to the page <canvas> under PROXY_TO_PTHREAD.
//
// MILESTONE-1 config under test here: the GL context is created on a SECONDARY
// pthread (mimicking Gecko's "Renderer" thread, which is NOT the canvas owner)
// using proxyContextToMainThread=ALWAYS. This works from ANY thread WITHOUT an
// OffscreenCanvas transfer, PROVIDED the canvas was not auto-transferred away
// from the main browser thread -> build WITHOUT -sOFFSCREENCANVAS_SUPPORT (keep
// -sOFFSCREEN_FRAMEBUFFER so explicit swap works via an offscreen FBO blit).
// GL runs on the main browser thread; present is implicit on its yield.
//
// (Proven separately: a context on the main() pthread that OWNS an auto-
//  transferred OffscreenCanvas also works; that's the faster Milestone-2 path.)
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>
#include <emscripten.h>
#include <emscripten/html5.h>
#include <emscripten/html5_webgl.h>
#include <GLES3/gl3.h>

static void* render_thread(void* arg) {
  printf("[gltest] Renderer pthread started (proxied to main browser thread)\n");
  fflush(stdout);

  EmscriptenWebGLContextAttributes attrs;
  emscripten_webgl_init_context_attributes(&attrs);
  attrs.majorVersion = 2;
  attrs.minorVersion = 0;
  attrs.alpha = EM_TRUE;
  attrs.depth = EM_TRUE;
  attrs.stencil = EM_TRUE;
  attrs.antialias = EM_FALSE;
  attrs.preserveDrawingBuffer = EM_TRUE;
  attrs.explicitSwapControl = EM_TRUE;          // commit_frame blits FBO->default
  attrs.renderViaOffscreenBackBuffer = EM_TRUE;  // required when proxying w/o OffscreenCanvas
  attrs.proxyContextToMainThread = EMSCRIPTEN_WEBGL_CONTEXT_PROXY_ALWAYS;

  EMSCRIPTEN_WEBGL_CONTEXT_HANDLE ctx =
      emscripten_webgl_create_context("#screen", &attrs);
  printf("[gltest] create_context(#screen) proxied = %d\n", (int)ctx);
  fflush(stdout);
  if (ctx <= 0) {
    printf("[gltest] FAIL: proxied context creation failed\n");
    fflush(stdout);
    return NULL;
  }
  EMSCRIPTEN_RESULT mc = emscripten_webgl_make_context_current(ctx);
  const char* ver = (const char*)glGetString(GL_VERSION);
  printf("[gltest] make_current=%d GL_VERSION=%s\n", (int)mc, ver ? ver : "(null)");
  fflush(stdout);

  int frame = 0;
  for (;;) {
    glClearColor(1.0f, 0.5f, 0.0f, 1.0f);  // orange
    glClear(GL_COLOR_BUFFER_BIT);
    EMSCRIPTEN_RESULT cf = emscripten_webgl_commit_frame();
    if (frame == 0) {
      unsigned char px[4] = {0, 0, 0, 0};
      glReadPixels(400, 300, 1, 1, GL_RGBA, GL_UNSIGNED_BYTE, px);
      printf("[gltest] frame0 painted; commit=%d glReadPixels=%d,%d,%d,%d\n",
             (int)cf, px[0], px[1], px[2], px[3]);
      fflush(stdout);
    }
    frame++;
    usleep(16000);
  }
  return NULL;
}

int main() {
  printf("[gltest] main() on app pthread (PROXY_TO_PTHREAD)\n");
  fflush(stdout);
  pthread_t t;
  pthread_create(&t, NULL, render_thread, NULL);
  emscripten_exit_with_live_runtime();
  return 0;
}
