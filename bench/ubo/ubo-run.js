// ubo-bench driver for the embed harness. Paths relative to the firefox-wasm root (cwd):
//   node embed-js/run.cjs embed-js/ubo-run.js                 # JIT
//   GECKO_NOWASMJIT=1 node embed-js/run.cjs embed-js/ubo-run.js   # PBL baseline
// Optionally precede with a tiny -e/prelude file that sets globalThis.UBO_LIST / UBO_ITERS.
// Mirrors ubo-bench/bench-shell.js but for our minimal embed (uses read()).

// --- shim globals the uBlock SNFE dependency graph touches (from ubo-bench/shim.mjs) ---
(function () {
  var g = globalThis;
  if (typeof g.self === 'undefined') { g.self = g; }
  if (typeof g.vAPI === 'undefined') {
    g.vAPI = {
      canWASM: false,
      localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
      webextFlavor: { env: [], soup: new Set(['firefox', 'webext']) },
    };
  }
  if (typeof g.CSS === 'undefined') { g.CSS = { supports: function () { return false; } }; }

  // Timers: the compile+load path is synchronous, so deferred work is non-essential.
  // No-op stubs (returning an id) avoid ReferenceErrors without changing the measured work.
  if (typeof g.setTimeout === 'undefined') { g.setTimeout = function () { return 0; }; }
  if (typeof g.clearTimeout === 'undefined') { g.clearTimeout = function () {}; }
  if (typeof g.setInterval === 'undefined') { g.setInterval = function () { return 0; }; }
  if (typeof g.clearInterval === 'undefined') { g.clearInterval = function () {}; }
  if (typeof g.queueMicrotask === 'undefined') { g.queueMicrotask = function (fn) { Promise.resolve().then(fn); }; }
  if (typeof g.requestIdleCallback === 'undefined') { g.requestIdleCallback = function () { return 0; }; }
  if (typeof g.cancelIdleCallback === 'undefined') { g.cancelIdleCallback = function () {}; }

  // Host web-APIs the minimal embed lacks (the gecko-wasm js shell has them). uBlock's
  // SNFE compile/load graph touches these; provide functional polyfills.
  if (typeof g.URL === 'undefined') {
    var reURL = /^([a-z][a-z0-9+.-]*:)?(?:\/\/([^\/?#]*))?([^?#]*)(\?[^#]*)?(#.*)?$/i;
    g.URL = function (url, base) {
      var u = String(url);
      var m = reURL.exec(u) || [];
      this.href = u;
      this.protocol = m[1] || '';
      var host = m[2] || '';
      var at = host.lastIndexOf('@'); if (at >= 0) host = host.slice(at + 1);
      this.host = host;
      this.hostname = host.replace(/:\d+$/, '');
      this.port = (host.match(/:(\d+)$/) || ['', ''])[1];
      this.pathname = m[3] || '';
      this.search = m[4] || '';
      this.hash = m[5] || '';
      var sp = this.search.replace(/^\?/, '');
      this.searchParams = {
        _s: sp,
        get: function () { return null; }, has: function () { return false; },
        getAll: function () { return []; }, toString: function () { return this._s; },
      };
    };
  }
  if (typeof g.TextDecoder === 'undefined') {
    g.TextDecoder = function (enc) { this.encoding = (enc || 'utf-8') + ''; };
    g.TextDecoder.prototype.decode = function (buf) {
      if (buf == null) return '';
      var u8 = (buf instanceof Uint8Array) ? buf
             : (buf && buf.buffer) ? new Uint8Array(buf.buffer, buf.byteOffset || 0, buf.byteLength)
             : new Uint8Array(buf);
      var out = '', i = 0, n = u8.length;
      while (i < n) {
        var c = u8[i++];
        if (c < 0x80) { out += String.fromCharCode(c); }
        else if (c < 0xe0) { out += String.fromCharCode(((c & 0x1f) << 6) | (u8[i++] & 0x3f)); }
        else if (c < 0xf0) { var b2 = u8[i++], b3 = u8[i++]; out += String.fromCharCode(((c & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f)); }
        else { var d2 = u8[i++], d3 = u8[i++], d4 = u8[i++]; var cp = ((c & 0x07) << 18) | ((d2 & 0x3f) << 12) | ((d3 & 0x3f) << 6) | (d4 & 0x3f); cp -= 0x10000; out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff)); }
      }
      return out;
    };
  }
  if (typeof g.TextEncoder === 'undefined') {
    g.TextEncoder = function () {};
    g.TextEncoder.prototype.encode = function (str) {
      str = String(str); var out = [], i = 0, n = str.length;
      for (; i < n; i++) {
        var c = str.charCodeAt(i);
        if (c < 0x80) out.push(c);
        else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
        else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
      return new Uint8Array(out);
    };
  }
  if (typeof g.atob === 'undefined') {
    var B = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    g.atob = function (s) {
      s = String(s).replace(/[^A-Za-z0-9+/]/g, ''); var out = '', i = 0;
      while (i < s.length) {
        var e1 = B.indexOf(s[i++]), e2 = B.indexOf(s[i++]), e3 = B.indexOf(s[i++]), e4 = B.indexOf(s[i++]);
        var n = (e1 << 18) | (e2 << 12) | ((e3 & 63) << 6) | (e4 & 63);
        out += String.fromCharCode((n >> 16) & 255);
        if (e3 !== -1) out += String.fromCharCode((n >> 8) & 255);
        if (e4 !== -1) out += String.fromCharCode(n & 255);
      }
      return out;
    };
    g.btoa = function (s) {
      s = String(s); var out = '', i = 0;
      while (i < s.length) {
        var c1 = s.charCodeAt(i++), c2 = s.charCodeAt(i++), c3 = s.charCodeAt(i++);
        var n = (c1 << 16) | ((isNaN(c2) ? 0 : c2) << 8) | (isNaN(c3) ? 0 : c3);
        out += B[(n >> 18) & 63] + B[(n >> 12) & 63] + (isNaN(c2) ? '=' : B[(n >> 6) & 63]) + (isNaN(c3) ? '=' : B[n & 63]);
      }
      return out;
    };
  }
})();

// Paths are relative to bench/ubo (main.ts runs this child with cwd=bench/ubo).
load('build/compile-bundle.iife.js');   // -> globalThis.uboBench

var LIST = (typeof globalThis.UBO_LIST !== 'undefined') ? globalThis.UBO_LIST : 'easylist.txt';
var ITERS = (typeof globalThis.UBO_ITERS !== 'undefined') ? globalThis.UBO_ITERS : 4;
var lists = LIST.split(',');
var raw = lists.map(function (n) { return read('data/' + n); });
var bytes = raw.reduce(function (a, s) { return a + s.length; }, 0);
print('UBO lists: ' + lists.join(',') + '  (' + bytes + ' bytes)  iters=' + ITERS);

var runs;
try {
  runs = uboBench.bench(raw, ITERS);
} catch (e) {
  print('UBO BENCH THREW: ' + (e && e.message));
  print('STACK: ' + (e && e.stack));
  throw e;
}
runs.forEach(function (r, i) {
  print('UBO run ' + i + ': compile ' + Math.round(r.compileMs) + 'ms  load ' + Math.round(r.loadMs) +
        'ms  total ' + Math.round(r.totalMs) + 'ms  (net ' + r.netFilters + ', ext ' + r.extFilters +
        ', acc ' + r.acceptedCount + ')');
});
var warm = runs.slice(1);
if (warm.length) {
  var avg = function (k) { var s = 0; warm.forEach(function (r) { s += r[k]; }); return s / warm.length; };
  var c = avg('compileMs'), l = avg('loadMs'), t = avg('totalMs');
  print('UBO warm avg (runs 1..' + (runs.length - 1) + '): compile ' + c.toFixed(1) +
        'ms  load ' + l.toFixed(1) + 'ms  total ' + t.toFixed(1) + 'ms');
  print('UBOTOTALMS=' + t.toFixed(1));   // lower = better; compare JIT vs PBL
  print('UBOCOMPILEMS=' + c.toFixed(1));
}
