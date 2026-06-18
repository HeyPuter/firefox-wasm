// Cooperative fiber scheduler for the STJ build (single OS thread, no SAB). Built by
// the harness after the wasm instantiates (needs exports + heap). One fiber runs at a
// time; blocking primitives yield via JSPI (return a Promise = suspend, undefined =
// continue). Per-fiber TLS is the wasm TLS region [base, base+size), saved/restored on
// every context switch. See [[gecko-wasm-singlethread-tls]] / jspi-threads.{c,js}.
//
// exports must provide: memory, stj_boot, stj_trampoline (wrapped with
//   WebAssembly.promising). opts = { base, size, template } -- the active TLS region
//   (the harness calls __wasm_init_tls + snapshots the INITIAL template in
//   instantiateWasm, BEFORE global ctors run, since ctors may touch thread_local).
function makeSTJScheduler(exports, opts, log) {
  log = log || function () {};
  const S = {
    fibers: {}, current: 0, nextId: 1, runQ: [], running: false, acts: 0,
    mutexes: new Map(), conds: new Map(), sems: new Map(), rwlocks: new Map(),
    base: opts.base, size: opts.size, template: opts.template,
    promisingBoot: WebAssembly.promising(exports.stj_boot),
    promisingTramp: WebAssembly.promising(exports.stj_trampoline),
  };
  const heap = () => new Uint8Array(exports.memory.buffer);
  // DIAGNOSTIC: current C shadow-stack pointer (linear-memory stack). If fibers share
  // this, a suspended fiber's stack-resident objects get clobbered by other fibers.
  S.sp = function () { try { return exports.emscripten_stack_get_current ? exports.emscripten_stack_get_current() : (exports.stackSave ? exports.stackSave() : -1); } catch (e) { return -2; } };

  // ---- per-fiber TLS + C shadow-stack save/restore ----
  // JSPI switches the wasm VM stack but NOT the `__stack_pointer` global (the C shadow
  // stack in linear memory). Without per-fiber stacks, a suspended fiber's stack-resident
  // objects (e.g. the IO thread's MessageLoop, held across Run()) get clobbered by other
  // fibers. So each spawned fiber gets its own malloc'd stack region, and we save/restore
  // __stack_pointer on every context switch alongside TLS.
  S.STACK_SZ = 4 * 1024 * 1024;   // 4 MiB per fiber (malloc'd, high address -> overflow
                                  // check never false-fires; main fiber 0 keeps default).
  S.saveCurrentTLS = function () {
    const f = S.fibers[S.current];
    // account fiber execution time (resume -> this suspend), total + per-fiber, for perf
    if (S._runStart) { const dt = S._now() - S._runStart; S._perf.runMs += dt; if (f) { f.runMs = (f.runMs || 0) + dt; f.runs = (f.runs || 0) + 1; } S._runStart = 0; }
    // Reuse the per-fiber buffer (.set) instead of .slice() (which ALLOCATES a fresh typed
    // array every context switch -> GC churn, esp. for the hot main fiber). Re-create only
    // if the size changed (shouldn't) -- the heap view is re-derived since memory can grow.
    if (f) {
      const h = heap();
      if (f.tlsBuf && f.tlsBuf.length === S.size) f.tlsBuf.set(h.subarray(S.base, S.base + S.size));
      else f.tlsBuf = h.slice(S.base, S.base + S.size);
      f.sp = exports.stackSave();
    }
  };
  S.restoreTLS = function (f) { if (f.tlsBuf) heap().set(f.tlsBuf, S.base); };
  // Set __stack_pointer for the fiber about to run/resume (skip fiber 0's first run,
  // which legitimately uses the default stack and has no saved sp yet).
  S.restoreSP = function (f) { if (f.sp !== undefined && f.sp !== null) exports.stackRestore(f.sp); };

  // fiber 0 (the main thread): its TLS IS the live region (post-ctor); tlsBuf=null so
  // boot() does NOT overwrite it. New fibers get the initial template.
  S.fibers[0] = { id: 0, started: true, state: 'running', tlsBuf: null, keys: new Map(), joiners: [], resume: null, retval: 0, relock: 0 };
  log('[stj] TLS base=' + S.base + ' size=' + S.size);

  // ---- scheduling core ----
  S._block = function (state, requeue) {
    S.acts++;
    const tid = S.current, f = S.fibers[tid];
    if (S.ev) {
      const owned = []; S.mutexes.forEach((s, m) => { if (s.owner === tid && s.count > 0) owned.push(m); });
      S.ev('blk ' + tid + ' ' + state + ' sp=' + S.sp() + (owned.length ? ' HOLDS-MTX[' + owned.join(',') + ']' : ''));
    }
    S.saveCurrentTLS();
    if (state !== 'runnable') f.yieldStreak = 0;   // a real block (cond/sem/join) resets sched_yield backoff
    f.state = state;
    S.running = false;
    let resolve; const p = new Promise((r) => { resolve = r; }); f.resume = resolve;
    if (requeue) S.runQ.push(tid);
    queueMicrotask(S.pump);
    return p;
  };
  S._wake = function (tid) {
    const f = S.fibers[tid]; if (!f || f.state === 'runnable' || f.state === 'running') return;
    f.state = 'runnable'; S.runQ.push(tid);
    if (!S.running) queueMicrotask(S.pump);
  };
  S.evCap = 0;   // scheduler run/blk/wake event log OFF by default (it floods + each line is
                 // a DOM write via the harness log -> slow). Set >0 at runtime to diagnose.
  S.ev = function (m) { if (S.evCount === undefined) S.evCount = 0; if (S.evCount++ < S.evCap) log('[stj] ' + m); };
  S.pump = function () {
    if (S.running) return;
    const tid = S.runQ.shift();
    if (tid === undefined) return;            // nothing runnable: control returns to the browser loop
    const f = S.fibers[tid];
    if (!f || f.state === 'done') { queueMicrotask(S.pump); return; }
    S.running = true; S.current = tid; f.state = 'running'; S.restoreTLS(f); S._perf.switches++;
    S._runStart = S._now ? S._now() : 0;       // start fiber-execution timer (perf diagnosis)
    if (!f.started) {
      f.started = true;
      S.ev('run ' + tid + ' (start) sp=' + f.sp);
      S.restoreSP(f);                  // switch to this fiber's own stack before it runs
      S.promisingTramp(f.start, f.arg).then(() => S._afterFiber(tid)).catch((e) => { log('[stj] fiber ' + tid + ' threw ' + e + ' STACK: ' + ((e && e.stack) ? e.stack.replace(/\n/g, ' | ').slice(0, 1600) : '?')); S._afterFiber(tid); });
    } else { S.ev('run ' + tid + ' (resume) sp=' + f.sp); S.restoreSP(f); const r = f.resume; f.resume = null; if (r) r(); }
  };
  S._afterFiber = function (tid) {
    if (S.ev) S.ev('done ' + tid);
    const f = S.fibers[tid]; f.state = 'done'; S.running = false; S.current = -1;
    const j = f.joiners; f.joiners = []; j.forEach((x) => S._wake(x));
    queueMicrotask(S.pump);
  };
  S.fiberReturned = function (retval) { const f = S.fibers[S.current]; if (f) f.retval = retval; };

  S.boot = function () {
    S.running = true; S.current = 0; S.restoreTLS(S.fibers[0]);
    return S.promisingBoot().then(() => { log('[stj] main fiber returned'); S._afterFiber(0); })
      .catch((e) => { log('[stj] main fiber threw ' + e + ' STACK: ' + ((e && e.stack) ? e.stack.replace(/\n/g, ' | ').slice(0, 1200) : '?')); S._afterFiber(0); });
  };

  // ---- imports ----
  S.spawn = function (start, arg) {
    S.acts++;
    const tid = S.nextId++;
    // Own C shadow stack for this fiber (grows down from stackTop). malloc'd -> high
    // address, so the (default-stack) overflow check never false-fires.
    const stackBase = exports.malloc(S.STACK_SZ);
    let stackTop = stackBase + S.STACK_SZ;
    stackTop -= stackTop % 16;                 // 16-byte align (avoid 32-bit bitwise ops)
    S.fibers[tid] = { id: tid, start, arg, started: false, state: 'runnable', tlsBuf: S.template.slice(), keys: new Map(), joiners: [], resume: null, retval: 0, relock: 0, stackBase, stackTop, sp: stackTop };
    S.runQ.push(tid);
    log('[stj] spawn fiber ' + tid + ' (total ' + (S.nextId - 1) + ') stack=' + stackBase + '..' + stackTop);
    if (!S.running) queueMicrotask(S.pump);   // started from outside a fiber
    return tid;
  };
  S.join = function (tid) {
    const t = S.fibers[tid];
    if (!t || t.state === 'done') return undefined;
    t.joiners.push(S.current);
    return S._block('blocked', false);
  };
  // DIAGNOSTIC: count hot synchronous-return primitives to find a busy-spin. console.log
  // is captured even while the JS macrotask loop is starved (wasm keeps calling imports),
  // so a hammered primitive surfaces as periodic SPIN lines.
  S._perf = { switches: 0, yields: 0, macroYields: 0, futexWait: 0, futexEwb: 0, condWait: 0, sleeps: 0, sleepMs: 0, runMs: 0 };
  S._runStart = 0;
  S._c = { yieldNow: 0, mtxLock: 0, mtxTry: 0, semTry: 0, keyGet: 0, keySet: 0 };
  S._c.mtxUnlock = 0; S._c.condSig = 0; S._c.semPost = 0; S._c.rwUnlock = 0; S._c.rwTry = 0;
  S._tick = function (k) { if (++S._c[k] % 2000 === 0) log('[stj] SPIN ' + k + '=' + S._c[k] + ' runQ=' + S.runQ.length + ' cur=' + S.current); };
  // sched_yield. A fiber spin-waiting on sched_yield (e.g. an idle Rust/JS thread-pool
  // worker that can't park without SAB-futex) must not monopolize the single OS thread:
  // requeue via a microtask normally (fast), but every 64th yield round-trip the BROWSER
  // macrotask queue so timers, the main fiber's browserYield/sleep wakes, and the data:
  // load actually run (else two such workers ping-pong on microtasks and starve main).
  S._lastMacro = 0;            // perf.now() of the last macrotask yield (= last browser turn)
  S._now = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => 0;
  S.yieldNow = function () {
    S._tick('yieldNow'); S._perf.yields++;
    const tid = S.current, f = S.fibers[tid];
    S.saveCurrentTLS(); f.state = 'blocked'; S.running = false;
    let resolve; const p = new Promise((r) => { resolve = r; }); f.resume = resolve;
    // Throughput-critical: sched_yield is called PER work item by the cooperative
    // MessagePump Run loops (message_pump_default/libevent.cc) under HTTP/IPC load. A
    // macrotask (setTimeout) round-trip per call is ~1-4ms + browser clamp -> seconds per
    // page. So:
    //  - If OTHER fibers are ready AND the browser has had a turn recently: re-wake via a
    //    MICROTASK (sub-ms) so this fiber resumes right after the others run. Fast path.
    //  - Every ~8ms (or when NOTHING else is ready = idle spin): re-wake via a MACROTASK so
    //    the browser actually runs (delivers WISP WebSocket data, timers, paint). A pure
    //    microtask self-wake would keep the microtask queue non-empty and starve the
    //    browser forever (no network, no render); the 8ms cap bounds that.
    // Backoff (idle-spin CPU saver) applies ONLY when alone (no other ready fiber), so it
    // never throttles a productive work loop. A real _block resets yieldStreak.
    const now = S._now();
    const otherReady = S.runQ.length > 0;
    const browserDue = (now - S._lastMacro) > 8;
    if (otherReady && !browserDue) {
      f.yieldStreak = 0;
      S._wake(tid);             // re-queue self at runQ tail; runs after the ready fibers
      return p;
    }
    S._lastMacro = now; S._perf.macroYields++;
    let delay = 0;
    if (!otherReady) { f.yieldStreak = (f.yieldStreak || 0) + 1; delay = f.yieldStreak > 4 ? Math.min(50, (f.yieldStreak - 4) * 6) : 0; }
    else f.yieldStreak = 0;
    setTimeout(() => S._wake(tid), delay);
    queueMicrotask(S.pump);     // meanwhile run any other already-runnable fibers
    return p;
  };
  // Yield to the BROWSER event loop (a macrotask): lets timers/network/input callbacks
  // run and other runnable fibers proceed, then re-queues self. Used by the main fiber's
  // cooperative loop so the page stays live without SAB/threads.
  S.browserYield = function () {
    // Dispatch queued input HERE, in the calling (main) fiber's context: this runs with
    // the main fiber's restored TLS + shadow stack, so re-entering st_mouse/st_key/st_wheel
    // executes Gecko main-thread code correctly (calling them from a raw DOM handler would
    // run with whatever fiber last ran -> wrong TLS/stack -> corruption). Drained once per
    // cooperative loop iteration.
    if (S.onBrowserYield) { try { S.onBrowserYield(); } catch (e) { log('[stj] onBrowserYield err ' + e); } }
    const tid = S.current, f = S.fibers[tid];
    S.saveCurrentTLS(); f.state = 'blocked'; S.running = false;
    let resolve; const p = new Promise((r) => { resolve = r; }); f.resume = resolve;
    setTimeout(() => { S._wake(tid); }, 0);   // browser turns, then re-run this fiber
    queueMicrotask(S.pump);                    // meanwhile run any already-runnable fibers
    return p;
  };
  // Timed sleep: yield this fiber for ms real time (lets other fibers + the browser
  // run). Routes nanosleep/usleep so spin-waits don't peg the single OS thread.
  S.sleep = function (ms) {
    S._perf.sleeps++; S._perf.sleepMs += (ms > 0 ? ms : 0);
    const tid = S.current, f = S.fibers[tid];
    S.saveCurrentTLS(); f.state = 'blocked'; S.running = false;
    let resolve; const p = new Promise((r) => { resolve = r; }); f.resume = resolve;
    setTimeout(() => { S._wake(tid); }, Math.max(0, ms));
    queueMicrotask(S.pump);
    return p;
  };
  // ---- cooperative futex (emscripten_futex_wait/wake) ----
  // Rust/crossbeam/std thread parking lands here. Stock no-pthread emscripten_futex_wait is
  // a no-op (returns 0 instantly) -> parkers busy-loop and peg the one thread. Suspend the
  // fiber until a wake on the same address (or timeout). Returns the result int as the
  // SUSPENDING import's resolved value: 0=woken, -110=ETIMEDOUT, -11=EWOULDBLOCK(no block).
  S.futexes = new Map();   // byte addr -> Set<fiber id>
  S._fxEwb = 0;
  S.futexWait = function (addr, val, ms) {
    const tid = S.current, f = S.fibers[tid]; S._perf.futexWait++;
    if (((new Int32Array(exports.memory.buffer)[addr >>> 2]) >>> 0) !== (val >>> 0)) {
      S._perf.futexEwb++;
      // EWOULDBLOCK: the word already differs, so we MUST NOT block (the caller would miss
      // the change). Stock behavior is to return -11 synchronously -- but a caller that
      // hot-loops futex_wait expecting the word to reach `val` (e.g. rust/crossbeam parking
      // while another fiber is about to flip it) then NEVER yields the single OS thread, so
      // the fiber that flips the word can't run -> LIVELOCK / hard peg (no import is even
      // hit -- this synchronous path is the spin). Detect a hot streak and YIELD
      // cooperatively (suspend, let other fibers run, resume returning -11) so the
      // value-changer gets the CPU. Safe to suspend: futex is reached from rust thread
      // fibers, no JS frames. See [[gecko-wasm-singlethread-tls]].
      f._fxEwbStreak = (f._fxEwbStreak || 0) + 1;
      if (++S._fxEwb % 5000 === 0) log('[stj] SPIN futexWait EWOULDBLOCK=' + S._fxEwb + ' addr=' + addr + ' streak=' + f._fxEwbStreak + ' cur=' + tid);
      if (f._fxEwbStreak > 8) {
        S.saveCurrentTLS(); f.state = 'blocked'; S.running = false;
        let resolve; const p = new Promise((r) => { resolve = r; });
        f.resume = function () { resolve(-11); };   // resume returning EWOULDBLOCK
        setTimeout(() => S._wake(tid), 0);          // browser turn -> other fibers run
        queueMicrotask(S.pump);
        return p;
      }
      return -11;
    }
    f._fxEwbStreak = 0;
    let w = S.futexes.get(addr); if (!w) { w = new Set(); S.futexes.set(addr, w); }
    w.add(tid);
    f.yieldStreak = 0;
    S.saveCurrentTLS(); f.state = 'blocked'; S.running = false; f._fxResult = 0;
    let resolve; const p = new Promise((r) => { resolve = r; });
    f.resume = function () { resolve(f._fxResult); };   // resolve with the futex result int
    if (isFinite(ms) && ms >= 0) {
      f._fxTimer = setTimeout(function () {
        const ww = S.futexes.get(addr);
        if (ww && ww.has(tid)) { ww.delete(tid); if (!ww.size) S.futexes.delete(addr); f._fxResult = -110; S._wake(tid); }
      }, Math.max(0, ms));
    }
    queueMicrotask(S.pump);
    return p;
  };
  S.futexWake = function (addr, count) {
    const w = S.futexes.get(addr);
    if (!w || !w.size) return 0;
    let woke = 0;
    for (const tid of Array.from(w)) {
      if (woke >= count) break;
      w.delete(tid);
      const f = S.fibers[tid];
      if (f) { if (f._fxTimer) { clearTimeout(f._fxTimer); f._fxTimer = null; } f._fxResult = 0; S._wake(tid); }
      woke++;
    }
    if (!w.size) S.futexes.delete(addr);
    return woke;
  };

  // Diagnostics: record the calling fiber's thread name (from pthread_setname_np).
  S.nameCurrent = function (name) { const f = S.fibers[S.current]; if (f) { f.name = name; log('[stj] fiber ' + S.current + ' = "' + name + '"'); } };
  // ---- event-driven poll wait ----
  // __wrap_poll/select call this instead of a fixed stj_sleep. An IDLE poll loop (socket /
  // IPC thread with no fd activity -- e.g. while scrolling, when nothing's on the wire)
  // otherwise wakes every ~4ms FOREVER (~470 sleeps/sec measured at idle), saturating the
  // single OS thread and starving render/input -> the laggy feel the multithreaded build
  // didn't have (its poll loops ran on real worker threads). Here: suspend up to `ms` (the C
  // side backs this off as the wait stays idle) BUT wake EARLY on real activity via
  // wakePollers (WISP socket data). A missed wake costs only up to `ms` latency, never a hang.
  S.pollWaiters = new Set();
  S.pollWait = function (ms) {
    const tid = S.current, f = S.fibers[tid];
    S._perf.sleeps++; S._perf.sleepMs += (ms > 0 ? ms : 0);
    S.saveCurrentTLS(); f.state = 'blocked'; S.running = false;
    S.pollWaiters.add(tid);
    let resolve; const p = new Promise((r) => { resolve = r; }); f.resume = resolve;
    f._pollTimer = setTimeout(() => { f._pollTimer = null; if (S.pollWaiters.delete(tid)) S._wake(tid); }, Math.max(0, ms));
    queueMicrotask(S.pump);
    return p;
  };
  S.wakePollers = function () {
    if (!S.pollWaiters.size) return 0;
    const ws = Array.from(S.pollWaiters); S.pollWaiters.clear();
    for (const tid of ws) { const f = S.fibers[tid]; if (f && f._pollTimer) { clearTimeout(f._pollTimer); f._pollTimer = null; } S._wake(tid); }
    return ws.length;
  };

  // Diagnostics: snapshot of scheduler state (for the harness watchdog).
  S.dump = function () {
    const states = {};
    for (const k in S.fibers) { const s = S.fibers[k].state; states[s] = (states[s] || 0) + 1; }
    return { fibers: Object.keys(S.fibers).length, states, runQ: S.runQ.length, current: S.current, acts: S.acts, spawned: S.nextId - 1, tlsSize: S.size, perf: Object.assign({}, S._perf) };
  };
  // Per-fiber {id: [name, state]} for diagnostics.
  S.named = function () { const o = {}; for (const k in S.fibers) { const f = S.fibers[k]; o[k] = [f.name || '?', f.state]; } return o; };
  // Top CPU-consuming fibers: [tid, ms, runs] sorted desc -- shows where execution goes.
  S.topFibers = function () { return Object.keys(S.fibers).map((k) => [+k, S.fibers[k].name || '?', Math.round(S.fibers[k].runMs || 0), S.fibers[k].runs || 0]).sort((a, b) => b[2] - a[2]).slice(0, 10); };

  // ---- mutex (cooperative; tracks owner + recursion + waiters) ----
  S._mtx = function (m) { let s = S.mutexes.get(m); if (!s) { s = { owner: 0, count: 0, waiters: [] }; S.mutexes.set(m, s); } return s; };
  // Cooperative single-OS-thread: only one fiber ever executes at a time, so a plain
  // mutex provides NO real exclusion -- it can only create lock-ORDERING DEADLOCKS (a
  // fiber suspends holding lock B while wanting A, another holds A wanting B). Worse, a
  // contended mutex reached from JS (SpiderMonkey) frames can't JSPI-suspend ->
  // SuspendError. Genuine producer/consumer waits use cond/sem (still real yields), not
  // plain mutexes. So make mutex lock/unlock/trylock NO-OPS: never block, never deadlock,
  // never force a suspend under JS. (Recursion was already allowed; this just drops the
  // cross-fiber blocking that single-thread doesn't need.)
  S.mutexLock = function (m) { if (S._mlc === undefined) S._mlc = 0; if (S._mlc++ < 4) log('[stj] mutexLock NOOP call#' + S._mlc + ' m=' + m); return undefined; };
  S.mutexTryLock = function (m) { return 0; };
  S.mutexUnlock = function (m) { /* no-op: see mutexLock */ };

  // ---- rwlock (cooperative reader/writer; mozilla::RWLock -> pthread_rwlock_*) ----
  // Reader-preferring (grant a read whenever no writer holds): this keeps recursive
  // read locks (rdlock by a fiber that already holds a read) live, and a single OS
  // thread can't truly starve a writer the way real threads can. Writer recursion
  // (wcount) is tracked so a fiber re-taking its own write lock doesn't self-deadlock.
  // Same as plain mutexes: cooperative single-thread needs no reader/writer exclusion,
  // and a Suspending rwlock reached from JS frames SuspendErrors. No-ops, and NOT in the
  // SUSPENDING list (so they're plain sync imports).
  S.rwRdLock = function (l) { return undefined; };
  S.rwWrLock = function (l) { return undefined; };
  S.rwTryRdLock = function (l) { return 1; };
  S.rwTryWrLock = function (l) { return 1; };
  S.rwUnlock = function (l) { /* no-op */ };

  // ---- cond ----
  S._cond = function (c) { let s = S.conds.get(c); if (!s) { s = { waiters: [], timers: new Map() }; S.conds.set(c, s); } return s; };
  S.condWait = function (c, m, timeoutMs) {
    S._perf.condWait++;
    S.mutexUnlock(m);                          // release while waiting (re-acquired on wake)
    const cs = S._cond(c), tid = S.current;
    S.fibers[tid].relock = m;
    cs.waiters.push(tid);
    if (timeoutMs >= 0) { const h = setTimeout(() => S._condTimeout(c, tid), Math.max(0, timeoutMs)); cs.timers.set(tid, h); }
    return S._block('blocked', false);
  };
  S._wakeCondWaiter = function (cs, tid) {
    const h = cs.timers.get(tid); if (h !== undefined) { clearTimeout(h); cs.timers.delete(tid); }
    const f = S.fibers[tid]; f.relock = 0;
    // Mutexes are NO-OPS in this build (single OS thread needs no exclusion; mutexLock/
    // Unlock don't track S.mutexes state). So the cond's "re-acquire the mutex before
    // waking" must ALSO be a no-op: just wake. The old code consulted S._mtx(m).count,
    // which mutexUnlock never resets -> after the first wait/signal cycle count stayed 1,
    // so a thread's SECOND cond-wait on the same monitor pushed to s.waiters and NEVER
    // woke. That stalled every worker on its 2nd event (e.g. the HTML5 Parser fiber got
    // OnStartRequest -> readyState=LOADING, then waited for OnDataAvailable forever ->
    // document loads never completed). See [[gecko-wasm-singlethread-tls]].
    S._wake(tid);
  };
  S.condSignal = function (c) { S._tick('condSig'); const cs = S._cond(c); if (cs.waiters.length) S._wakeCondWaiter(cs, cs.waiters.shift()); };
  S.condBroadcast = function (c) { const cs = S._cond(c); const ws = cs.waiters.splice(0); ws.forEach((w) => S._wakeCondWaiter(cs, w)); };
  S._condTimeout = function (c, tid) {
    const cs = S._cond(c), i = cs.waiters.indexOf(tid);
    if (i < 0) return;                         // already signalled
    cs.waiters.splice(i, 1); cs.timers.delete(tid);
    S._wakeCondWaiter(cs, tid);
  };

  // ---- sem ----
  S._sem = function (s) { let v = S.sems.get(s); if (!v) { v = { count: 0, waiters: [] }; S.sems.set(s, v); } return v; };
  S.semWait = function (s, timeoutMs) {
    const v = S._sem(s);
    if (v.count > 0) { v.count--; return undefined; }
    const tid = S.current; v.waiters.push(tid);
    if (timeoutMs >= 0) setTimeout(() => { const i = v.waiters.indexOf(tid); if (i >= 0) { v.waiters.splice(i, 1); S._wake(tid); } }, Math.max(0, timeoutMs));
    return S._block('blocked', false);
  };
  S.semTryWait = function (s) { S._tick('semTry'); const v = S._sem(s); if (v.count > 0) { v.count--; return 1; } return 0; };
  S.semPost = function (s) { S._tick('semPost'); const v = S._sem(s); if (v.waiters.length) S._wake(v.waiters.shift()); else v.count++; };

  // ---- per-fiber pthread keys ----
  S.keyGet = function (key) { S._tick('keyGet'); const f = S.fibers[S.current]; const v = f && f.keys.get(key); return v === undefined ? 0 : v; };
  S.keySet = function (key, val) { S._tick('keySet'); const f = S.fibers[S.current]; if (f) f.keys.set(key, val); };

  return S;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { makeSTJScheduler };
