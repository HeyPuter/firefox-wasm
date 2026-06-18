---
name: gecko-wasm-webgl-canvas
description: "De-risked facts on emscripten WebGL2→page-canvas under PROXY_TO_PTHREAD, for the GPU-acceleration goal (render WebRender to <canvas>)."
metadata: 
  node_type: memory
  type: project
  originSessionId: d2f741b0-a9a8-4dd9-b382-40d7988d83d6
---

Goal (2026-06-14): real GPU acceleration — WebRender composites directly to the HTML `<canvas>` like a real browser, single-process (no GPU process, in-process compositor threads). See [[gecko-wasm-runtime-frontier]], [[gecko-wasm-toolchain]].

Proven by de-risk test `embed-xul/gltest.c` (+ build-gltest.sh, gltest-test.cjs), NO libxul rebuild:
- WebGL2/GLES3 contexts WORK in this `-sPROXY_TO_PTHREAD` build. GL_VERSION="WebGL 2.0 (OpenGL ES 3.0)". GL renders (glReadPixels confirmed) AND presents to the visible page canvas (full-orange screenshot, GLTEST_OK).
- Required emscripten link flags: `-sMAX_WEBGL_VERSION=2 -sMIN_WEBGL_VERSION=2 -sFULL_ES3 -sOFFSCREENCANVAS_SUPPORT=1 -sOFFSCREEN_FRAMEBUFFER=1 -sGL_SUPPORT_EXPLICIT_SWAP_CONTROL=1 -sGL_ENABLE_GET_PROC_ADDRESS=1`. (Link-time only; libxul's GL symbols resolve to emscripten WebGL2 instead of abort stubs — no libxul rebuild needed for the symbols themselves.)

CRITICAL threading constraint (the central integration challenge):
- Under PROXY_TO_PTHREAD + OFFSCREENCANVAS_SUPPORT, emscripten AUTO-TRANSFERS `Module.canvas` (#screen) to the `main()` pthread (= Gecko's main thread) as an OffscreenCanvas at first pthread_create.
- A WebGL context can ONLY be created targeting that canvas on the thread that OWNS the OffscreenCanvas (the main() pthread). WebGL contexts are thread-affine.
- A secondary pthread creating a context on "#screen" FAILS (returns 0): "no known OffscreenCanvas" — the transferControlToOffscreen was already consumed. proxyContextToMainThread=ALWAYS routes back to main browser thread, but that thread no longer has the canvas either (it went to the main() pthread).
- Therefore: WebRender's RenderThread (a separate pthread) cannot create the canvas's GL context directly. Must EITHER (a) transfer the OffscreenCanvas to the RenderThread at its pthread_create (emscripten_pthread_attr_settransferredcanvases), OR (b) use a proxied context after PREVENTING the auto-transfer so #screen stays a normal HTMLCanvasElement on the main browser thread (slow: every GL call proxied), OR (c) run WebRender's renderer on the thread that owns the canvas.

PRESENTATION: `emscripten_webgl_commit_frame()` is a NO-OP for OffscreenCanvas (browsers dropped OffscreenCanvas.commit()). Presentation to the placeholder <canvas> is IMPLICIT — happens when the owning worker YIELDS to its event loop. A tight C loop never presents; drive via emscripten_request_animation_frame_loop, OR rely on WebRender's RenderThread yielding between composites (it waits on its event queue → yields → presents). So GLContextEmscripten::SwapBuffers can be a no-op; the present is the thread yield.

Test harness note: headless Chromium needs `--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. Reading back a transferred-offscreen canvas via `drawImage` onto a 2D canvas works for verification; getContext('2d') on the original element does not.
