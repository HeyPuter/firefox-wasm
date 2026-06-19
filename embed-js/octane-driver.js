// Octane driver for the node embedder. Loaded AFTER octane/base.js + the benchmark file(s).
// With `window` undefined, BenchmarkSuite.RunSuites runs the whole suite synchronously (no
// setTimeout), so the score is available as soon as it returns. Prints OCTSCORE=<n> (higher
// is better) for the A/B harness to parse, plus per-benchmark results.
(function () {
  var results = {};
  if (typeof BenchmarkSuite === "undefined") { print("ERR=no-BenchmarkSuite"); return; }
  // Match the browser harness config (let benchmarks pick their own warmup/determinism).
  BenchmarkSuite.config.doWarmup = undefined;
  BenchmarkSuite.config.doDeterministic = undefined;
  var t0 = Date.now();
  try {
    BenchmarkSuite.RunSuites({
      NotifyResult: function (name, result) { results[name] = result; print(name + ": " + result); },
      NotifyError: function (name, error) { print(name + " ERROR " + error); print("ERR=" + name); },
      NotifyScore: function (score) {
        print("WALLMS=" + (Date.now() - t0));
        print("OCTSCORE=" + Math.round(score));
      },
    });
  } catch (e) {
    print("ERR=exception " + e);
  }
})();
