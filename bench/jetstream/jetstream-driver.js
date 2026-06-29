// JetStream2 driver for the node embedder. Loaded AFTER a JetStream bench file that
// defines `class Benchmark { runIteration() }`. Times N runIteration() calls (with
// warmup), prints JSSCORE=<n> (higher better = iters/sec) + JSMS=<total> for the A/B
// harness, plus OK / ERR (benches throw on bad result -> self-checking correctness).
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
    if (typeof b.validate === "function") b.validate();
    print("JSMS=" + ms + " perIter=" + (ms / iters).toFixed(3) + "ms");
    print("JSSCORE=" + Math.round(iters * 1000 / Math.max(ms, 1)));
    print("OK");
  } catch (e) {
    print("ERR=exception " + e);
  }
})();
