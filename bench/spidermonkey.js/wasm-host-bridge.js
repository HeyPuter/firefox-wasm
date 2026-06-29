// Repo-local emscripten --js-library: guest-WebAssembly -> host-WebAssembly
// passthrough (wired in via build-embed-full.sh with `--js-library`).
//
// Our wasm32-emscripten SpiderMonkey has no in-process wasm compiler (the JIT is
// disabled), so content's `WebAssembly` object was never even exposed. Instead of
// compiling guest wasm in-process, we route it to the HOST browser's WebAssembly
// engine (a real JIT) and bridge exports, imports, and linear memory across.
//
// SpiderMonkey (js/src/wasm/WasmJS.cpp, under __EMSCRIPTEN__) drives this from the
// content thread:
//   wasmhost_compile(bytes)        -> compile on host, enumerate imports/exports
//   (C++ extracts guest import fns -> callback ids, and host objects -> obj ids)
//   wasmhost_instantiate(h, ids)   -> build host import object, instantiate
// Export functions become SpiderMonkey native trampolines (-> wasmhost_call);
// import functions become host shims (-> wasmhost_invoke_import).
//
// MEMORY: the host wasm's linear memory lives in a separate (host) ArrayBuffer
// that a guest SpiderMonkey ArrayBuffer cannot alias. So content gets a guest
// "mirror" buffer (JS::NewArrayBufferWithUserOwnedContents over a js_malloc'd
// region, whose pointer is stable) and we COPY between the mirror and the host
// memory at the boundaries where they can change hands: around every export call
// AND around every import call (emscripten's imported syscalls read/write the
// heap mid-call). We copy only the currently-allocated size, not a max.
//
// Registries live on globalThis (per-worker): content JS for one global runs on
// a single thread.

mergeInto(LibraryManager.library, {
  // ---- compile / instantiate -------------------------------------------------
  wasmhost_compile: function (ptr, len) {
    try {
      if (typeof WebAssembly === 'undefined') return -1;
      var bytes = HEAPU8.slice(ptr, ptr + len);
      var mod = new WebAssembly.Module(bytes);
      var reg = globalThis.__whReg || (globalThis.__whReg = []);
      var h = reg.length;
      reg.push({
        mod: mod, inst: null,
        imports: WebAssembly.Module.imports(mod),
        exps: WebAssembly.Module.exports(mod),
        fns: null, memObjId: -1,
      });
      return h;
    } catch (e) {
      console.error('[wasm-host] compile failed:', e && e.message ? e.message : e);
      return -1;
    }
  },

  wasmhost_import_count: function (h) {
    var r = globalThis.__whReg && globalThis.__whReg[h];
    return r ? r.imports.length : 0;
  },
  wasmhost_import_kind: function (h, i) {
    var r = globalThis.__whReg && globalThis.__whReg[h];
    if (!r) return -1;
    var k = r.imports[i].kind;
    return k === 'function' ? 0 : k === 'table' ? 1 : k === 'memory' ? 2 : 3;
  },
  wasmhost_import_module__deps: ['$stringToUTF8', '$lengthBytesUTF8'],
  wasmhost_import_module: function (h, i, buf, buflen) {
    var r = globalThis.__whReg && globalThis.__whReg[h];
    if (!r) return 0;
    var s = r.imports[i].module, need = lengthBytesUTF8(s);
    stringToUTF8(s, buf, buflen);
    return need < buflen ? need : buflen - 1;
  },
  wasmhost_import_name__deps: ['$stringToUTF8', '$lengthBytesUTF8'],
  wasmhost_import_name: function (h, i, buf, buflen) {
    var r = globalThis.__whReg && globalThis.__whReg[h];
    if (!r) return 0;
    var s = r.imports[i].name, need = lengthBytesUTF8(s);
    stringToUTF8(s, buf, buflen);
    return need < buflen ? need : buflen - 1;
  },

  // dir 0: guest mirror -> host memory; dir 1: host memory -> guest mirror.
  $whSyncMem: function (h, dir) {
    var r = globalThis.__whReg[h];
    if (!r || r.memObjId < 0) return;
    var mem = globalThis.__whObj[r.memObjId];
    // A JIT module imports the guest's own memory and has NO mirror (it shares
    // the guest ArrayBuffer): nothing to copy, and __whObjMirror may be unset.
    var mir = globalThis.__whObjMirror && globalThis.__whObjMirror[r.memObjId];
    if (!mem || !mir) return;
    var hb = new Uint8Array(mem.buffer);
    var n = mir.len < hb.length ? mir.len : hb.length;
    if (dir === 0) hb.set(HEAPU8.subarray(mir.ptr, mir.ptr + n));
    else HEAPU8.set(hb.subarray(0, n), mir.ptr);
  },

  wasmhost_instantiate__deps: ['$whSyncMem'],
  wasmhost_instantiate: function (h, callbackIdsPtr, importCount) {
    try {
      var r = globalThis.__whReg && globalThis.__whReg[h];
      if (!r) return -1;

      function shimFor(cbid, hh) {
        return function () {
          whSyncMem(hh, 1);  // host -> guest, so the guest import sees live memory
          var argc = arguments.length;
          if (argc > 64) argc = 64;
          var scratch = globalThis.__whScratch;
          if (!scratch) scratch = globalThis.__whScratch = Module._malloc(64 * 8);
          var base = scratch >> 3;
          for (var i = 0; i < argc; i++) {
            var a = arguments[i];
            HEAPF64[base + i] = typeof a === 'bigint' ? Number(a) : a;
          }
          var ret = Module._wasmhost_invoke_import(cbid, scratch, argc);
          whSyncMem(hh, 0);  // guest -> host, capture the import's writes
          return ret;
        };
      }

      var hostImports = {};
      for (var i = 0; i < importCount; i++) {
        var imp = r.imports[i];
        if (!hostImports[imp.module]) hostImports[imp.module] = {};
        var id = HEAP32[(callbackIdsPtr >> 2) + i];
        if (id === -2) {
          // JS->wasm JIT call dispatch: a JIT module's "m"."call" import re-enters
          // C++ to invoke the cached callee's wasm (args already in gWJScratch).
          hostImports[imp.module][imp.name] = function (site, argc) {
            return Module._wasmjit_invoke(site, argc);
          };
          continue;
        }
        if (id === -3) {
          // Mode VS no-restart helper: a JIT module's "m"."help" import re-enters
          // C++ to complete one op (operands in gWJHelp*; shares the guest heap, so
          // no whSyncMem). Returns 0 ok / 1 threw / (engine may grow guest memory).
          // PERF: bind DIRECTLY to embed.wasm's raw `_wjhelp` export (signature
          // (f64,f64)->f64, matching this import) so the call is a direct wasm->wasm
          // cross-instance call -- NO per-helper-call JS trampoline frame (that hop
          // was a big chunk of "JavaScript" time in --prof on helper-heavy benches).
          // Falls back to the JS shim if the export isn't a raw wasm function.
          var helpFn = Module['_wjhelp'];
          var noDirect = (typeof process !== 'undefined' && process.env &&
                          process.env.GECKO_WJ_NODIRECTHELP);
          hostImports[imp.module][imp.name] =
            (!noDirect && typeof helpFn === 'function')
              ? helpFn
              : function (kind, site) { return Module._wjhelp(kind, site); };
          continue;
        }
        if (id < 0) continue;
        if (imp.kind === 'function') {
          hostImports[imp.module][imp.name] = shimFor(id, h);
        } else {
          // memory / table / global: host-backed object from the registry
          hostImports[imp.module][imp.name] = globalThis.__whObj[id];
          if (imp.kind === 'memory') r.memObjId = id;
        }
      }

      var inst = new WebAssembly.Instance(r.mod, hostImports);
      r.inst = inst;
      var fns = [];
      for (var j = 0; j < r.exps.length; j++) {
        fns.push(r.exps[j].kind === 'function' ? inst.exports[r.exps[j].name] : null);
      }
      r.fns = fns;
      return 0;
    } catch (e) {
      console.error('[wasm-host] instantiate failed:', e && e.message ? e.message : e);
      return -1;
    }
  },

  // ---- exports ---------------------------------------------------------------
  wasmhost_export_count: function (h) {
    var r = globalThis.__whReg && globalThis.__whReg[h];
    return r ? r.exps.length : 0;
  },
  wasmhost_export_kind: function (h, i) {
    var r = globalThis.__whReg && globalThis.__whReg[h];
    if (!r) return -1;
    var k = r.exps[i].kind;
    return k === 'function' ? 0 : k === 'table' ? 1 : k === 'memory' ? 2 : 3;
  },
  wasmhost_export_name__deps: ['$stringToUTF8', '$lengthBytesUTF8'],
  wasmhost_export_name: function (h, i, buf, buflen) {
    var r = globalThis.__whReg && globalThis.__whReg[h];
    if (!r) return 0;
    var s = r.exps[i].name, need = lengthBytesUTF8(s);
    stringToUTF8(s, buf, buflen);
    return need < buflen ? need : buflen - 1;
  },

  // Register export `idx`'s memory into the object registry, mark it as this
  // instance's memory (for sync), and return its obj id (-1 if not a memory).
  wasmhost_export_register_mem: function (h, idx) {
    var r = globalThis.__whReg && globalThis.__whReg[h];
    if (!r || !r.inst) return -1;
    var mem = r.inst.exports[r.exps[idx].name];
    if (!(mem instanceof WebAssembly.Memory)) return -1;
    var reg = globalThis.__whObj || (globalThis.__whObj = []);
    var id = reg.length; reg.push(mem);
    r.memObjId = id;
    return id;
  },

  wasmhost_call__deps: ['$whSyncMem', '$addFunction'],
  wasmhost_call: function (h, idx, argsptr, argc) {
    var r = globalThis.__whReg && globalThis.__whReg[h];
    if (!r || !r.fns) return 0;
    // idx === -1: register the trampoline export (f: (f64)->f64) into the MAIN
    // indirect table so the engine can call the JIT'd fn via a C function pointer
    // (no JS hop). Returns the slot (a valid fn pointer); 0 if it can't be
    // registered (C++ treats <= 0 as "no direct entry" and falls back to the shim).
    if (idx === -1) {
      if (r.directIdx === undefined) {
        var f0 = r.fns[0];
        try { r.directIdx = (typeof f0 === 'function') ? addFunction(f0, 'dd') : 0; }
        catch (e) { r.directIdx = 0; }
      }
      return r.directIdx;
    }
    var fn = r.fns[idx];
    if (typeof fn !== 'function') return 0;
    var base = argsptr >> 3;
    whSyncMem(h, 0);  // guest -> host before the export runs
    var v;
    if (argc === 1) v = fn(HEAPF64[base]);
    else if (argc === 0) v = fn();
    else if (argc === 2) v = fn(HEAPF64[base], HEAPF64[base + 1]);
    else {
      var args = new Array(argc);
      for (var i = 0; i < argc; i++) args[i] = HEAPF64[base + i];
      v = fn.apply(null, args);
    }
    whSyncMem(h, 1);  // host -> guest after
    return typeof v === 'number' ? v : (typeof v === 'bigint' ? Number(v) : 0);
  },

  // ---- memory / table / global objects --------------------------------------
  wasmhost_mem_new: function (initialPages, maxPages, shared) {
    try {
      var desc = { initial: initialPages };
      if (maxPages >= 0) desc.maximum = maxPages;
      else if (shared) desc.maximum = initialPages;
      if (shared) desc.shared = true;
      var mem = new WebAssembly.Memory(desc);
      var reg = globalThis.__whObj || (globalThis.__whObj = []);
      var id = reg.length; reg.push(mem); return id;
    } catch (e) {
      console.error('[wasm-host] mem_new failed:', e && e.message ? e.message : e);
      return -1;
    }
  },
  wasmhost_table_new: function (initial, maxN, isExternref) {
    try {
      var desc = { initial: initial, element: isExternref ? 'externref' : 'anyfunc' };
      if (maxN >= 0) desc.maximum = maxN;
      var t = new WebAssembly.Table(desc);
      var reg = globalThis.__whObj || (globalThis.__whObj = []);
      var id = reg.length; reg.push(t); return id;
    } catch (e) {
      console.error('[wasm-host] table_new failed:', e && e.message ? e.message : e);
      return -1;
    }
  },
  // kind: 0=i32 1=i64 2=f32 3=f64
  wasmhost_global_new: function (val, kind, mut) {
    try {
      var type = kind === 0 ? 'i32' : kind === 1 ? 'i64' : kind === 2 ? 'f32' : 'f64';
      var g = new WebAssembly.Global({ value: type, mutable: !!mut },
                                     kind === 1 ? BigInt(Math.trunc(val)) : val);
      var reg = globalThis.__whObj || (globalThis.__whObj = []);
      var id = reg.length; reg.push(g); return id;
    } catch (e) {
      console.error('[wasm-host] global_new failed:', e && e.message ? e.message : e);
      return -1;
    }
  },
  wasmhost_mem_bytelength: function (id) {
    var m = globalThis.__whObj && globalThis.__whObj[id];
    return m && m.buffer ? m.buffer.byteLength : 0;
  },
  wasmhost_mem_is_shared: function (id) {
    var m = globalThis.__whObj && globalThis.__whObj[id];
    return m && m.buffer && (typeof SharedArrayBuffer !== 'undefined') &&
           (m.buffer instanceof SharedArrayBuffer) ? 1 : 0;
  },
  // Record the guest mirror (ptr in the guest heap + its length) for a memory.
  wasmhost_obj_set_mirror: function (id, ptr, len) {
    var reg = globalThis.__whObjMirror || (globalThis.__whObjMirror = {});
    reg[id] = { ptr: ptr, len: len };
  },

  // ---- JS->wasm JIT support --------------------------------------------------
  // Register the GUEST's own linear memory (emscripten's wasmMemory) into the
  // object registry so a JIT-compiled host module can IMPORT it and read/write
  // the guest heap directly (a JSObject* is just a wasm32 memory offset). No
  // mirror is recorded for it, so whSyncMem is a no-op for such modules: the
  // host module shares the guest ArrayBuffer rather than copying. Returns the
  // obj id (-1 if the guest memory object is unreachable here).
  wasmhost_guest_mem_objid: function () {
    if (globalThis.__whGuestMemId !== undefined) return globalThis.__whGuestMemId;
    var mem = (typeof wasmMemory !== 'undefined' && wasmMemory) ? wasmMemory
            : (typeof Module !== 'undefined' && Module.wasmMemory) ? Module.wasmMemory
            : null;
    if (!mem || !mem.buffer) { globalThis.__whGuestMemId = -1; return -1; }
    var reg = globalThis.__whObj || (globalThis.__whObj = []);
    var id = reg.length; reg.push(mem);
    globalThis.__whGuestMemId = id;
    return id;
  },
  // Shared funcref table for JS->wasm JIT calls: every compiled JIT function's
  // export is placed in this table, so a JIT'd caller can `call_indirect` a
  // callee's wasm DIRECTLY (native, no JS/C++ bridge hop) -- this is what makes
  // calls (and recursion) fast. Created once; returns its obj id (-1 on failure).
  wasmhost_jit_table: function () {
    if (globalThis.__whJitTableId !== undefined) return globalThis.__whJitTableId;
    try {
      var t = new WebAssembly.Table({ element: 'anyfunc', initial: 4096 });
      var reg = globalThis.__whObj || (globalThis.__whObj = []);
      var id = reg.length; reg.push(t);
      globalThis.__whJitTableId = id;
      return id;
    } catch (e) {
      console.error('[wasm-host] jit_table failed:', e && e.message ? e.message : e);
      globalThis.__whJitTableId = -1; return -1;
    }
  },
  // Put compiled module `h`'s REGISTER-convention main into the shared table at
  // `idx` (export "m": (f64,i64...)->(f64,i64)), so other JIT'd functions can fast
  // `call_indirect` it (type 0). NOT the (f64)->f64 host trampoline (export "f" =
  // fns[0], used only for direct/shim entry). Falls back to fns[0] for single-export
  // modules.
  wasmhost_jit_table_set: function (h, idx) {
    var tid = globalThis.__whJitTableId;
    if (tid === undefined || tid < 0) return -1;
    var t = globalThis.__whObj[tid];
    var r = globalThis.__whReg && globalThis.__whReg[h];
    if (!t || !r || !r.fns) return -1;
    // Register the module's "m" (main) export -- the register-arg ABI target of
    // internal call_indirect. Fall back to the first export for older modules.
    var fn = null;
    for (var i = 0; i < r.exps.length; i++) {
      if (r.exps[i].name === 'm') { fn = r.fns[i]; break; }
    }
    if (!fn) fn = r.fns[0];
    if (typeof fn !== 'function') return -1;
    try { t.set(idx, fn); return 0; } catch (e) { return -1; }
  },

  // 1 if the guest memory is backed by a SharedArrayBuffer (the JIT module must
  // then declare its imported memory as shared, with a max), 0 otherwise.
  wasmhost_guest_mem_shared: function () {
    var mem = (typeof wasmMemory !== 'undefined' && wasmMemory) ? wasmMemory
            : (typeof Module !== 'undefined' && Module.wasmMemory) ? Module.wasmMemory
            : null;
    return (mem && mem.buffer && typeof SharedArrayBuffer !== 'undefined' &&
            (mem.buffer instanceof SharedArrayBuffer)) ? 1 : 0;
  },
});
