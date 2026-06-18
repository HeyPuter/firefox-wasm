// Cooperative pthread runtime over JSPI for the STJ (single-OS-thread, no-SAB) build:
// the wasm IMPORTS. Gecko/NSPR threads become fibers scheduled on one thread; blocking
// primitives yield via JSPI; per-fiber TLS is swapped on context switch. The scheduler
// itself is Module.__STJ (built by makeSTJScheduler() in jspi-sched.js after the module
// instantiates, since it needs the wasm exports + heap). See jspi-threads.c for the C
// --wrap shims. Imports that may block (join/mutex_lock/cond_wait/sem_wait/yield) are
// wrapped with WebAssembly.Suspending at instantiation and return a Promise to suspend.
mergeInto(LibraryManager.library, {
  stj_spawn: function (start, arg) { return Module.__STJ.spawn(start, arg); },
  stj_self: function () { return Module.__STJ.current; },
  stj_name: function (ptr) { try { Module.__STJ.nameCurrent(UTF8ToString(ptr)); } catch (e) {} },
  stj_join: function (tid) { return Module.__STJ.join(tid); },
  stj_yield_: function () { return Module.__STJ.yieldNow(); },
  stj_browser_yield: function () { return Module.__STJ.browserYield(); },
  stj_sleep: function (ms) { return Module.__STJ.sleep(ms); },
  stj_poll_wait: function (ms) { return Module.__STJ.pollWait(ms); },   // SUSPENDING; woken early by wakePollers
  stj_mutex_lock: function (m) { return Module.__STJ.mutexLock(m); },
  stj_mutex_unlock: function (m) { Module.__STJ.mutexUnlock(m); },
  stj_mutex_trylock: function (m) { return Module.__STJ.mutexTryLock(m); },
  stj_cond_wait: function (c, m, timeout) { return Module.__STJ.condWait(c, m, timeout); },
  stj_cond_signal: function (c) { Module.__STJ.condSignal(c); },
  stj_cond_broadcast: function (c) { Module.__STJ.condBroadcast(c); },
  stj_sem_wait: function (s, timeout) { return Module.__STJ.semWait(s, timeout); },
  stj_sem_trywait: function (s) { return Module.__STJ.semTryWait(s); },
  stj_sem_post: function (s) { Module.__STJ.semPost(s); },
  stj_futex_wait: function (addr, val, ms) { return Module.__STJ.futexWait(addr >>> 0, val >>> 0, ms); },  // SUSPENDING
  stj_futex_wake: function (addr, count) { return Module.__STJ.futexWake(addr >>> 0, count); },
  stj_rw_rdlock: function (l) { return Module.__STJ.rwRdLock(l); },
  stj_rw_wrlock: function (l) { return Module.__STJ.rwWrLock(l); },
  stj_rw_unlock: function (l) { Module.__STJ.rwUnlock(l); },
  stj_rw_tryrdlock: function (l) { return Module.__STJ.rwTryRdLock(l); },
  stj_rw_trywrlock: function (l) { return Module.__STJ.rwTryWrLock(l); },
  stj_key_get: function (key) { return Module.__STJ.keyGet(key); },
  stj_key_set: function (key, val) { Module.__STJ.keySet(key, val); },
  stj_done: function (retval) { Module.__STJ.fiberReturned(retval); },
});
