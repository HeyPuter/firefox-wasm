// Microbench driver. Loaded AFTER a microbenches/<name>.js that defines
// `class Benchmark { setup?(); runIteration(); result() }`. Warms, times N
// runIteration() calls, prints perIter + JSSCORE (perf) and MICROSUM=<result()>
// so bench/main.ts can DIFF the JIT vs PBL result (correctness) without fragile
// hardcoded constants. Honors globalThis.JS_ITERS / JS_WARM.
(function () {
  if (typeof Benchmark === "undefined") { print("ERR=no-Benchmark"); return; }
  var iters = (typeof globalThis.JS_ITERS !== "undefined") ? globalThis.JS_ITERS : 30;
  var warm = (typeof globalThis.JS_WARM !== "undefined") ? globalThis.JS_WARM : 3;
  try {
    var b = new Benchmark();
    if (typeof b.setup === "function") b.setup();
    for (var i = 0; i < warm; i++) b.runIteration();
    var t0 = Date.now();
    for (var i = 0; i < iters; i++) b.runIteration();
    var ms = Date.now() - t0;
    var sum = (typeof b.result === "function") ? b.result() : 0;
    print("JSMS=" + ms + " perIter=" + (ms / iters).toFixed(3) + "ms");
    print("JSSCORE=" + Math.round(iters * 1000 / Math.max(ms, 1)));
    print("MICROSUM=" + sum);
    print("OK");
  } catch (e) {
    print("ERR=exception " + e);
  }
})();
