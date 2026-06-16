// Fixed-work JS microbenchmark for the JIT-less (PBL interpreter) wasm engine.
// Each kernel does a FIXED amount of work; we report elapsed ms (lower = better)
// per kernel and total. Designed to surface structural costs (interpreter call
// dispatch, property ICs, allocation/GC, string handling) — not to be an Octane.
//
// Defines globalThis.MICRO_BENCH() -> results object. Used by microjs.html
// (which POSTs the result back to the bench server) and any eval path.
globalThis.MICRO_BENCH = function () {
  function now() { return Date.now(); }
  var results = {};
  function time(name, fn) { var t = now(); fn(); results[name] = now() - t; }

  // 1. Function-call dispatch: naive recursive fibonacci. Stresses the
  //    interpreter's call/return path — the dominant no-JIT overhead.
  time('calls_fib', function () {
    function fib(n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
    var s = 0; for (var i = 0; i < 6; i++) s += fib(30); return s;
  });

  // 2. Property access / inline caches: many gets/sets on monomorphic objects.
  time('props', function () {
    function Pt(x, y) { this.x = x; this.y = y; this.d = 0; }
    var n = 400000, arr = new Array(n);
    for (var i = 0; i < n; i++) arr[i] = new Pt(i, i * 2);
    var s = 0;
    for (var k = 0; k < 6; k++)
      for (var i = 0; i < n; i++) { var p = arr[i]; p.d = p.x * p.x + p.y * p.y; s += p.d; }
    return s;
  });

  // 3. Arrays: allocation, fill, numeric sort, reduce.
  time('arrays', function () {
    var s = 0;
    for (var r = 0; r < 30; r++) {
      var a = new Array(20000);
      for (var i = 0; i < a.length; i++) a[i] = (i * 2654435761) % 100000;
      a.sort(function (x, y) { return x - y; });
      for (var i = 0; i < a.length; i++) s += a[i];
    }
    return s;
  });

  // 4. Strings: build, split, join, indexOf, charCodeAt hashing.
  time('strings', function () {
    var s = 0;
    for (var r = 0; r < 2000; r++) {
      var str = '';
      for (var i = 0; i < 200; i++) str += 'word' + i + ',';
      var parts = str.split(',');
      var joined = parts.join('|');
      for (var i = 0; i < joined.length; i++) s = (s + joined.charCodeAt(i)) | 0;
      if (joined.indexOf('word199') >= 0) s++;
    }
    return s;
  });

  // 5. Object churn / GC pressure: allocate short-lived objects + maps.
  time('gc_churn', function () {
    var keep = null, s = 0;
    for (var r = 0; r < 200000; r++) {
      var o = { a: r, b: r + 1, c: 'k' + (r & 255), arr: [r, r + 1, r + 2] };
      s += o.a + o.arr[2];
      if ((r & 1023) === 0) keep = o;
    }
    return s + (keep ? keep.a : 0);
  });

  var total = 0; for (var k in results) total += results[k];
  results.total = total;
  return results;
};
