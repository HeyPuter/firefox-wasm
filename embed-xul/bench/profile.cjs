// CPU profiler for the wasm Gecko engine across ALL emscripten pthread workers.
//
// The engine runs on Web Workers (pthreads); V8's CPU profiler is per-target, so
// we connect to chromium's *browser* CDP endpoint, auto-attach (flatten) to every
// worker + the page, run Profiler on each session, trigger an engine action, then
// stop and aggregate self-time per function. With --profiling-funcs in the build,
// wasm frames carry real C++/Rust names.
//
//   node bench/profile.cjs <action> [--ms=8000] [--gpu] [--url=...] [--top=40]
//     action: 'load'  -> geckoRender(--url) and profile the load
//             'micro' -> navigate to /bench/microjs.html and profile the JS run
//             'idle'  -> profile N ms of the idle engine (event-loop overhead)
//
// Sampling interval is 1000us (1ms) to keep overhead/volume sane on 20+ workers.
const path = require('path');
const http = require('http');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startBenchServer } = require('./bench-server.cjs');

const PORT = 8973, CDP_PORT = 9333;

function httpJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => { let b = ''; res.on('data', (c) => b += c); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
  });
}

// Minimal multiplexed CDP client over the browser websocket (flatten sessions).
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.cbs = new Map(); this.listeners = []; this.sessions = new Set();
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data);
      if (m.id && this.cbs.has(m.id)) { const { resolve, reject } = this.cbs.get(m.id); this.cbs.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
      else if (m.method) for (const l of this.listeners) l(m); };
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => { this.cbs.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params })); });
  }
  on(fn) { this.listeners.push(fn); }
}

(async () => {
  const args = process.argv.slice(2);
  const action = args.find((a) => !a.startsWith('--')) || 'idle';
  const MS = +((args.find((a) => a.startsWith('--ms=')) || '').split('=')[1]) || 8000;
  const TOP = +((args.find((a) => a.startsWith('--top=')) || '').split('=')[1]) || 40;
  // --callers=NAME: instead of self-time, attribute samples whose stack contains NAME
  // to the function that calls NAME (the frame one level toward the root). Shows the
  // hot callers of e.g. _emscripten_get_now.
  const callersOf = (args.find((a) => a.startsWith('--callers=')) || '').split('=').slice(1).join('=');
  const gpu = args.includes('--gpu');
  const url = (args.find((a) => a.startsWith('--url=')) || '--url=https://en.wikipedia.org/wiki/WebAssembly').split('=').slice(1).join('=');

  const { server, port } = await startBenchServer(0);
  const browser = await chromium.launch({
    headless: !gpu,
    args: ['--no-sandbox', '--disable-dev-shm-usage', `--remote-debugging-port=${CDP_PORT}`,
           ...(gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle'] : [])],
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
  });
  const page = await browser.newPage();
  page.on('console', (m) => { const t = m.text(); if (process.env.VERBOSE && /\[(out|err)\]/.test(t)) console.error('  ', t.slice(0, 180)); });

  const engineQs = (args.find((a) => a.startsWith('--engineqs=')) || '').split('=').slice(1).join('=');
  const engineUrl = `http://127.0.0.1:${port}/index.html${gpu ? '?gpu=1' : '?'}${engineQs ? '&' + engineQs : ''}`;
  await page.goto(engineUrl, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 180000 });
  console.error('[profile] engine READY; attaching CDP to all workers');

  // Connect to the browser-level CDP endpoint and auto-attach to every target.
  const ver = await httpJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  const cdp = new CDP(ws);

  const profSessions = [];          // sessionIds with an active profiler
  const sidInfo = new Map();        // sessionId -> {type,url,title}
  const perTarget = process.argv.includes('--per-target');
  const seen = new Set();
  const attached = new Promise((resolve) => {
    let settle = setTimeout(resolve, 4000);
    cdp.on(async (m) => {
      if (m.method === 'Target.attachedToTarget') {
        const sid = m.params.sessionId, type = m.params.targetInfo.type;
        if (seen.has(sid)) return; seen.add(sid);
        sidInfo.set(sid, { type, url: m.params.targetInfo.url || '', title: m.params.targetInfo.title || '' });
        // RECURSE: workers are children of the page target, so each attached
        // session must itself auto-attach to surface nested pthread workers.
        try { await cdp.send('Target.setAutoAttach',
          { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sid); } catch (e) {}
        try {
          await cdp.send('Profiler.enable', {}, sid);
          await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }, sid);
          profSessions.push(sid);
        } catch (e) {}
        clearTimeout(settle); settle = setTimeout(resolve, 2000);
      }
    });
  });
  await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  await attached;
  console.error(`[profile] attached to ${profSessions.length} targets; starting profiler`);

  // --settle=N: navigate FIRST, wait N ms (let the load + shader-compile finish),
  // THEN start the profiler -- isolates steady-state (post-load) cost from the load.
  const settleMs = +((args.find((a) => a.startsWith('--settle=')) || '').split('=')[1]) || 0;
  const loadUrl = url.startsWith('/') ? `http://127.0.0.1:${port}${url}` : url;
  const doNav = async () => {
    if (action === 'load') { await page.evaluate((u) => window.geckoRender(u), loadUrl); }
    else if (action === 'micro') { await page.evaluate((p) => window.geckoRender(p), `http://127.0.0.1:${port}/bench/microjs.html`); }
  };
  if (settleMs > 0) {
    await doNav();
    console.error(`[profile] settling ${settleMs}ms before profiling`);
    await new Promise((r) => setTimeout(r, settleMs));
  }
  for (const sid of profSessions) { try { await cdp.send('Profiler.start', {}, sid); } catch (e) {} }
  if (settleMs === 0) await doNav();
  console.error(`[profile] profiling ${action} for ${MS}ms`);
  await new Promise((r) => setTimeout(r, MS));

  // Frames that mean "this thread is asleep / waiting" — the 20-thread pool spends
  // almost all its time here. Excluded from the ACTIVE total so percentages reflect
  // real CPU cost, not idle pool threads.
  const IDLE = new Set(['__timedwait_cp', 'emscripten_futex_wait', '(idle)',
    '__emscripten_thread_mailbox_await', '_emscripten_yield', 'pthread_cond_wait',
    '__pthread_cond_timedwait', 'sched_yield',
    // With select un-proxied, a worker blocked in select()'s Atomics.wait samples
    // with leaf ___syscall__newselect — that's SLEEPING, not CPU. (Its real scan work
    // runs on main as wisp_select_scan.) Exclude so percentages reflect real cost.
    '___syscall__newselect', '__syscall__newselect']);

  // Stop profilers on all targets IN PARALLEL with a per-target timeout. A busy or
  // dead pthread worker can make Profiler.stop hang forever; don't let one stall the
  // whole run (skip it and report how many were collected).
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('stop-timeout')), ms))]);
  const stopped = await Promise.all(profSessions.map((sid) =>
    withTimeout(cdp.send('Profiler.stop', {}, sid), 8000).then((r) => r).catch(() => null)));
  const collected = stopped.filter(Boolean).length;

  // Aggregate self time by function name (and optionally caller attribution).
  const self = new Map();   // name -> us
  const callers = new Map(); // caller-fn -> us (only when callersOf set)
  const tgtActive = [];      // per-target {info, activeUs, topFn}
  let totalUs = 0, activeUs = 0, targetUs = 0;
  for (let ti = 0; ti < stopped.length; ti++) {
    const prof = stopped[ti];
    if (!prof) continue;
    const p = prof && prof.profile; if (!p || !p.nodes) continue;
    const info = sidInfo.get(profSessions[ti]) || {};
    let tActive = 0; const tSelf = new Map(); const tIncl = new Map();
    const byId = new Map(p.nodes.map((n) => [n.id, n]));
    const parent = new Map();   // childId -> parentId
    for (const n of p.nodes) for (const c of (n.children || [])) parent.set(c, n.id);
    const fnOf = (id) => { const n = byId.get(id); return n ? (n.callFrame.functionName || '(anonymous)') : null; };
    const interval = 1000;
    const add = (fn, us) => { self.set(fn, (self.get(fn) || 0) + us); totalUs += us; if (!IDLE.has(fn)) { activeUs += us; tActive += us; tSelf.set(fn, (tSelf.get(fn) || 0) + us); } };
    const samples = p.samples || p.nodes.flatMap((n) => Array(n.hitCount || 0).fill(n.id));
    const deltas = p.timeDeltas || samples.map(() => interval);
    for (let i = 0; i < samples.length; i++) {
      const leaf = samples[i]; const n = byId.get(leaf); if (!n) continue;
      const us = Math.max(0, deltas[i] || 0);
      add(n.callFrame.functionName || '(anonymous)', us);
      if (perTarget) {  // inclusive: every distinct fn on this sample's stack
        const onStack = new Set(); let id = leaf;
        while (id != null) { const f = fnOf(id); if (f) onStack.add(f); id = parent.get(id); }
        for (const f of onStack) tIncl.set(f, (tIncl.get(f) || 0) + us);
      }
      if (callersOf) {
        // walk leaf -> root; when we hit the target fn, credit its first REAL caller
        // (skipping V8's synthetic wasm<->js trampoline frames, which otherwise hide
        // the actual wasm caller).
        const SYNTH = (f) => !f || f === 'wasm-to-js' || f.startsWith('js-to-wasm') || f === '(garbage collector)';
        let id = leaf;
        while (id != null) {
          const f0 = fnOf(id);
          if (f0 && f0.includes(callersOf)) {
            let pid = parent.get(id);
            while (pid != null && SYNTH(fnOf(pid))) pid = parent.get(pid);
            const cf = pid != null ? fnOf(pid) : '(root)';
            callers.set(cf, (callers.get(cf) || 0) + us); targetUs += us;
            break;
          }
          id = parent.get(id);
        }
      }
    }
    const topFn = [...tSelf.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([fn, us]) => fn.slice(0, 40) + ':' + Math.round(us / 1000));
    // inclusive frames identify the thread's loop; drop generic/synthetic ones
    const GENERIC = new Set(['(program)', '(root)', '(idle)', 'wasm-to-js', '__timedwait_cp',
      'emscripten_futex_wait', '__pthread_cond_timedwait', 'pthread_cond_timedwait',
      '_emscripten_get_now', '__clock_gettime', 'now', '(anonymous)',
      // message-loop scaffolding (always on stack) — exclude so the actual runnable/work surfaces
      'nsThread::ProcessNextEvent(bool, bool*)', 'NS_ProcessNextEvent(nsIThread*, bool)',
      'MessageLoop::Run()', 'nsThread::ThreadFunc(void*)', 'invokeEntryPoint', 'handleMessage',
      'base::Thread::ThreadMain()', 'ThreadFunc(void*)', 'mozilla::ipc::MessagePumpForNonMainThreads::Ru',
      'base::MessagePumpLibevent::Run(base::MessagePu', '_emscripten_thread_mailbox_await',
      'checkMailbox', '_emscripten_check_mailbox', 'em_task_queue_execute', 'callUserCallback',
      '__original_main', '_main_thread', 'emscripten_thread_sleep', 'nanosleep']);
    const loop = [...tIncl.entries()].filter(([f]) => !GENERIC.has(f) && !f.startsWith('js-to-wasm') && !f.startsWith('mozilla::ipc::MessagePump'))
      .sort((a, b) => b[1] - a[1]).slice(0, 12).map(([fn, us]) => fn.slice(0, 52) + ':' + Math.round(us / 1000));
    tgtActive.push({ type: info.type, url: (info.url || '').slice(0, 40), activeMs: Math.round(tActive / 1000), topFn, loop });
  }
  ws.close(); await browser.close(); server.close();

  if (perTarget) {
    tgtActive.sort((a, b) => b.activeMs - a.activeMs);
    console.log(JSON.stringify({ action, ms: MS, perTarget: tgtActive.slice(0, 24) }, null, 2));
    process.exit(0);
  }

  if (callersOf) {
    const sorted = [...callers.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP);
    console.log(JSON.stringify({
      action, ms: MS, callersOf, targetTotalMs: Math.round(targetUs / 1000), targets: profSessions.length,
      note: `time on stacks that pass through ${callersOf}, attributed to its immediate caller`,
      callers: sorted.map(([fn, us]) => ({ fn: fn.slice(0, 78), ms: Math.round(us / 1000), pct: +(us / targetUs * 100).toFixed(1) })),
    }, null, 2));
    process.exit(0);
  }

  const sorted = [...self.entries()].filter(([fn]) => !IDLE.has(fn)).sort((a, b) => b[1] - a[1]).slice(0, TOP);
  console.log(JSON.stringify({
    action, ms: MS, gpu, url: action === 'load' ? url : undefined,
    totalSampledMs: Math.round(totalUs / 1000), activeMs: Math.round(activeUs / 1000),
    targets: profSessions.length, collected,
    note: 'pct is of ACTIVE time (idle/wait frames excluded)',
    top: sorted.map(([fn, us]) => ({ fn: fn.slice(0, 78), ms: Math.round(us / 1000), pct: +(us / activeUs * 100).toFixed(1) })),
  }, null, 2));
  process.exit(0);
})().catch((e) => { console.error('[profile] fatal', e); process.exit(1); });
