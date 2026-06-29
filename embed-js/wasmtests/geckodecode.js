// Decode (and try to instantiate) the real 247MB / 362K-function gecko.wasm in
// the interpreter. Validates lazy decode + shared-memory + atomics acceptance at
// engine scale. Run: GECKO_WASM_INTERP=1 node embed-js/run.cjs embed-js/wasmtests/geckodecode.js
var PATH = "/home/velzie/src/gecko-wasm/gecko.js/dist/gecko.wasm";
var t0 = Date.now();
var buf = readWasm(PATH);
print("read " + buf.byteLength + " bytes in " + (Date.now() - t0) + "ms");

var t1 = Date.now();
var mod;
try {
  mod = new WebAssembly.Module(new Uint8Array(buf));
  print("PASS decode(Module) in " + (Date.now() - t1) + "ms");
} catch (e) {
  print("FAIL decode: " + e);
  throw e;
}

// Try to instantiate with stubbed imports + a shared memory matching the import.
var t2 = Date.now();
try {
  var mem = new WebAssembly.Memory({ initial: 8192, maximum: 65536, shared: true });
  print("created shared memory, buffer.byteLength=" + mem.buffer.byteLength);
  var stub = function () { return 0; };
  var envProxy = new Proxy({}, {
    get: function (t, k) {
      if (k === "memory") return mem;
      if (k === "__indirect_function_table") return undefined;
      return stub;
    },
    has: function () { return true; },
  });
  var imports = new Proxy({}, {
    get: function (t, k) { return envProxy; },
    has: function () { return true; },
  });
  var inst = new WebAssembly.Instance(mod, imports);
  var n = Object.keys(inst.exports).length;
  print("PASS instantiate in " + (Date.now() - t2) + "ms, exports=" + n);
} catch (e) {
  print("instantiate note: " + e + " (after " + (Date.now() - t2) + "ms)");
}
print("done");
