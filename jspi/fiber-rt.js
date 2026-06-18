// Cooperative JSPI fiber scheduler, exposed to wasm as imports. State lives on
// Module.__ST (created lazily). The pump + main-fiber registration + the
// promising/Suspending wiring are set up on the JS side (see pocB2.html). st_join
// returns a Promise and is wrapped with WebAssembly.Suspending at instantiation.
mergeInto(LibraryManager.library, {
  st_enqueue: function (start, arg, outId) {
    var S = Module.__ST;
    var id = S.nextId++;
    S.fibers[id] = { id: id, start: start, arg: arg, started: false, done: false, joiners: [], resume: null, spec: {} };
    S.runQ.push(id);
    if (outId) HEAP32[outId >> 2] = id;
    Module.__stPump();
  },
  st_self: function () { return Module.__ST.current; },
  // Per-fiber emulated-TLS: map (control ptr) -> this fiber's storage, template-init
  // on first touch. This is what makes thread_local per-fiber without shared memory.
  st_emutls__deps: ['malloc'],
  st_emutls: function (control, size, templ) {
    var S = Module.__ST; var f = S.fibers[S.current];
    if (!f.emutls) f.emutls = {};
    var p = f.emutls[control];
    if (!p) {
      p = _malloc(size || 1);
      if (templ) HEAPU8.copyWithin(p, templ, templ + size);
      else HEAPU8.fill(0, p, p + size);
      f.emutls[control] = p;
    }
    return p;
  },
  // Returns a Promise; wrapped as a SUSPENDING import so the calling fiber suspends.
  st_join: function (id) {
    var S = Module.__ST;
    var target = S.fibers[id];
    if (!target || target.done) return Promise.resolve();
    return new Promise(function (resolve) {
      var meF = S.fibers[S.current];
      meF.resume = resolve;
      target.joiners.push(S.current);
      S.running = false;
      queueMicrotask(Module.__stPump);
    });
  },
});
