// Fiber scheduler imports for PoC E. The actual logic lives in Module.__sched (set up
// in pocE.html, where it has the wasm instance + heap for TLS save/restore). st_join
// returns a Promise and is wrapped with WebAssembly.Suspending at instantiation.
mergeInto(LibraryManager.library, {
  st_enqueue: function (start, arg, outId) {
    var id = Module.__sched.enqueue(start, arg);
    if (outId) HEAP32[outId >> 2] = id;
  },
  st_self: function () { return Module.__sched.current; },
  st_join: function (id) { return Module.__sched.join(id); },
});
