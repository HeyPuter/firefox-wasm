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
    // Present-pacing instrumentation (GECKO_PRESENT_STATS): each call is one
    // composited present to #screen. Record inter-present deltas and, every ~120
    // presents, emit a PRESENT_STATS line via err() (emscripten proxies a pthread's
    // stderr to the main thread -> the embedder's printErr -> page console) AND keep
    // a ring buffer on the worker global (self.__pp.hist) as a CDP-readable fallback.
    var g = (typeof globalThis !== 'undefined') ? globalThis : self;
    var nowFn = (typeof performance !== 'undefined') ? function () { return performance.now(); } : Date.now;
    {
      var s = g.__pp || (g.__pp = { last: 0, lastResolve: 0, d: [], work: [], yld: [], hist: [] });
      var now = nowFn();
      if (s.last) s.d.push(now - s.last);                  // full present->present interval
      if (s.lastResolve) s.work.push(now - s.lastResolve); // render work between presents (frame build + GL submit)
      s.last = now;
      if (s.d.length >= 30) {
        var a = s.d.slice().sort(function (x, y) { return x - y; });
        var n = a.length, sum = 0, mx = 0, j20 = 0, j33 = 0, j50 = 0;
        for (var i = 0; i < n; i++) { var v = a[i]; sum += v; if (v > mx) mx = v; if (v > 20) j20++; if (v > 33) j33++; if (v > 50) j50++; }
        var avg = function (arr) { if (!arr.length) return 0; var t = 0; for (var k = 0; k < arr.length; k++) t += arr[k]; return t / arr.length; };
        var stats = { n: n, fps: +(1000 / (sum / n)).toFixed(1), meanMs: +(sum / n).toFixed(2),
          p50: +a[(n * 0.5) | 0].toFixed(2), p95: +a[(n * 0.95) | 0].toFixed(2), maxMs: +mx.toFixed(2), j20: j20, j33: j33, j50: j50,
          workMs: +avg(s.work).toFixed(2), yieldMs: +avg(s.yld).toFixed(2) };
        s.hist.push(stats); if (s.hist.length > 40) s.hist.shift();
        try { err('PRESENT_STATS ' + JSON.stringify(stats)); } catch (e) {}
        s.d.length = 0; s.work.length = 0; s.yld.length = 0;
      }
    }
    return new Promise(function (resolve) {
      setTimeout(function () {
        var s2 = g.__pp; if (s2) { var r = nowFn(); s2.yld.push(r - now); s2.lastResolve = r; }  // yield/commit time
        resolve();
      }, 0);
    });
  },
});
