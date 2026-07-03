// Coarse monotonic clock writer (on by default; GECKO_COARSE_CLOCK=0 disables).
//
// TimeStamp::Now(lowRes) and NSPR PR_IntervalNow are read enormously often, and on
// this port each read is a wasm->JS performance.now() boundary crossing. This bridge
// removes that crossing for the millisecond-granular (low-res / interval) readers:
// the embedder publishes an 8-byte shared-heap word (gecko_coarse_now_ptr), and this
// writer refreshes it ~every 1ms with the engine's own clock value. The C readers
// load it lock-free (TimeStamp_posix.cpp, nsprpub/.../unix.c).
//
// The single monotonic writer + an atomic 64-bit store/load make the word strictly
// non-decreasing as seen by any reader, so the readers need no de-tearing or clamp.
mergeInto(LibraryManager.library, {
  // Called once from the embedder (main()) when the coarse clock is enabled. __proxy
  // 'sync' runs it on the emscripten main thread, which owns the page event loop and
  // a reliable setInterval; the Gecko pthreads only READ the word from C.
  gecko_coarse_clock_start__proxy: 'sync',
  gecko_coarse_clock_start: function () {
    try {
      if (globalThis.__geckoCoarseClock) return;          // idempotent
      if (typeof _gecko_coarse_now_ptr !== 'function') return;
      var ptr = _gecko_coarse_now_ptr();                  // 8-aligned byte offset
      if (!ptr) return;
      globalThis.__geckoCoarseClock = true;
      // The heap is a SharedArrayBuffer (-pthread); a fresh view is needed after a
      // memory growth detaches the old buffer.
      var view = null;
      var current = function () {
        if (!view || view.buffer !== wasmMemory.buffer) {
          view = new BigInt64Array(wasmMemory.buffer, ptr, 1);
        }
        return view;
      };
      var nowMs = (typeof _emscripten_get_now === 'function')
        // _emscripten_get_now() is exactly what clock_gettime(CLOCK_MONOTONIC) routes
        // through, so the published nanoseconds share the engine's clock timeline.
        ? function () { return _emscripten_get_now(); }
        : function () { return performance.timeOrigin + performance.now(); };
      var tick = function () {
        Atomics.store(current(), 0, BigInt(Math.round(nowMs() * 1e6)));
      };
      tick();
      setInterval(tick, 1);
    } catch (e) {}
  },
});
