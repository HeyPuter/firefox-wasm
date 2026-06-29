// JSPI present-yield for GPU mode. The WebRender Renderer thread owns #screen's
// transferred OffscreenCanvas and renders to it locally (no per-GL-call proxy); the
// browser implicit-presents that OffscreenCanvas to the #screen placeholder element
// whenever the owning worker yields to its event loop. But a Gecko thread runs a
// blocking message loop and never yields. GLContextEmscripten::SwapBuffers (libxul,
// gfx/gl/GLContextProviderEmscripten.cpp) calls gl_present_yield() to yield via JSPI:
//
//   __async: true  -> with the link's -sJSPI, emscripten wraps this as a suspending
//                     import, so the calling wasm stack (the Renderer thread) is
//                     suspended until the returned Promise resolves.
//   NO __proxy     -> it runs on the CALLING thread (the Renderer worker), so it is
//                     that worker's event loop that turns -- which is the one that
//                     implicit-presents ITS OffscreenCanvas.
//
// setTimeout(0) is a macrotask, so the worker reaches the rendering/update step (the
// present) before resolving; a microtask (Promise.resolve) would not. This replaces
// the old transferToImageBitmap -> postMessage -> #glout bitmaprenderer hack, so the
// page needs only the single #screen canvas.
// gl_present_yield is imported by GLContextEmscripten::SwapBuffers (libxul). It
// returns a Promise that resolves on the next macrotask. We do NOT mark it __async
// (that needs global -sJSPI); instead patch-gecko-shaderfix.mjs wraps THIS import
// with WebAssembly.Suspending and the proxy/mailbox executor exports with
// WebAssembly.promising, so ONLY this call suspends the (Renderer) thread -- one
// macrotask, during which the browser implicit-presents the OffscreenCanvas to the
// #screen placeholder. A normal (non-suspending) call here would just not yield.
mergeInto(LibraryManager.library, {
  gl_present_yield: function () {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
  },
});
