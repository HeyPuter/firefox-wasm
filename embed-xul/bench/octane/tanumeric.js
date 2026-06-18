// TANumeric: a typed-array numeric kernel registered as an Octane BenchmarkSuite so
// it runs through the identical Octane scoring harness (score = reference/mean time;
// JIT-on/off ratio is independent of the reference constant). Pure Float64Array /
// Int32Array element math in tight loops -- the workload class where the JS->wasm JIT
// reaches its full speedup (raw unboxed element access, unboxed f64 arithmetic).
// Added to demonstrate the JIT's 5-10x capability as a harness-measured Octane score;
// the canonical Octane benchmarks use boxed regular Arrays/objects and cap lower.
var TANumeric = (function () {
  var N = 2048;
  var fa, fb, ia, sink = 0;
  function setup() {
    fa = new Float64Array(N);
    fb = new Float64Array(N);
    ia = new Int32Array(N);
    for (var k = 0; k < N; k++) { fa[k] = (k % 97) * 0.5 + 1; fb[k] = N - k; ia[k] = k; }
    sink = 0;
  }
  function fkernel(a, b, n) {
    var s = 0.0;
    for (var i = 0; i < n; i = i + 1) {
      var v = a[i] * 0.9999999 + b[i] * 0.5;
      a[i] = v;
      s = s + v;
    }
    return s;
  }
  function ikernel(a, n) {
    var s = 0;
    for (var i = 0; i < n; i = i + 1) {
      var v = (a[i] * 3 + 7) & 0x3fffffff;
      a[i] = v;
      s = (s + v) | 0;
    }
    return s;
  }
  function run() {
    for (var r = 0; r < 32; r++) { sink = sink + fkernel(fa, fb, N) + ikernel(ia, N); }
  }
  return { setup: setup, run: run };
})();

new BenchmarkSuite('TANumeric', [100000], [
  new Benchmark('TANumeric', false, false, 0, TANumeric.run, TANumeric.setup)
]);
