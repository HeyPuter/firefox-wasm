// CPU-profile the wasm engine while it loads a heavy real page (bench.html) over
// http-over-WISP. Uses RAW CDP (remote-debugging-port) to auto-attach the Profiler
// to every worker thread (emscripten pthreads: engine main + stylo/render/compositor),
// since Playwright's newCDPSession rejects Worker targets. --profiling-funcs keeps
// wasm function names so the profile shows real names. Aggregates self-time per
// function across all threads.
//
//   node perf-profile.cjs            # headed, real GPU
//   GPU_HEADLESS=1 node perf-profile.cjs   # swiftshader
//   NOGPU=1 node perf-profile.cjs    # software render path (no ?gpu)
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
let wisp = null; try { wisp = require('wisp-server-node'); } catch (e) {}

const PORT = 8951;
const DBG = 9223;
const ROOT = __dirname;
const HEADLESS = process.env.GPU_HEADLESS === '1';
const GPU = process.env.NOGPU === '1' ? '' : '?gpu=1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm',
  '.data': 'application/octet-stream', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const rel = (req.url.split('?')[0] === '/') ? '/index.html' : req.url.split('?')[0];
  fs.readFile(path.join(ROOT, rel), (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin', 'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});
if (wisp) server.on('upgrade', (req, s, h) => { try { wisp.routeRequest(req, s, h); } catch (e) { try { s.destroy(); } catch (e2) {} } });

const BENCH_URL = process.env.BENCH_URL || `http://127.0.0.1:${PORT}/bench.html`;
const SETTLE_MS = Number(process.env.SETTLE_MS || 400);
const TIMEOUT = 180000;

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0; this.pending = new Map(); this.onEvent = () => {};
    this.openP = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      } else if (m.method) this.onEvent(m);
    };
  }
  ready() { return this.openP; }
  send(method, params = {}, sessionId) {
    const id = ++this.id; const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    this.ws.send(JSON.stringify(msg));
    return new Promise((res, rej) => {
      const t = setTimeout(() => { this.pending.delete(id); rej(new Error('cdp timeout ' + method)); }, 8000);
      this.pending.set(id, { res: (v) => { clearTimeout(t); res(v); }, rej: (e) => { clearTimeout(t); rej(e); } });
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

// caller attribution: for target leaf functions, sum self-time by the calling fn.
const CALLERS_FOR = ['_emscripten_get_now', '__pthread_mutex_lock', 'emscripten_thread_mailbox_send'];
const callerAgg = new Map();  // target -> Map(callerName -> us)

function aggregate(profile, into) {
  if (!profile || !profile.nodes) return 0;
  const byId = new Map(), parent = new Map();
  for (const n of profile.nodes) {
    byId.set(n.id, n);
    for (const c of (n.children || [])) parent.set(c, n.id);
  }
  const nameOf = (id) => { const n = byId.get(id); return n && n.callFrame ? (n.callFrame.functionName || '(anon)') : '?'; };
  const samples = profile.samples || [];
  const deltas = profile.timeDeltas || [];
  let span = 0;
  for (let i = 0; i < samples.length; i++) {
    const n = byId.get(samples[i]); if (!n) continue;
    const dt = Math.max(0, deltas[i] || 0); span += dt;
    const cf = n.callFrame || {};
    let name = cf.functionName || '(anon)'; if (name === '') name = '(anon)';
    let bucket = 'other'; const u = cf.url || '';
    if (name === '(idle)' || name === '(program)') bucket = 'idle';
    else if (u.endsWith('.wasm') || u.includes('gecko.wasm')) bucket = 'wasm';
    else if (u.includes('gecko.js') || u.includes('.worker.js')) bucket = 'glue';
    const e = into.get(name) || { us: 0, bucket };
    e.us += dt; into.set(name, e);
    if (CALLERS_FOR.includes(name)) {
      const cm = callerAgg.get(name) || new Map();
      const chain = [];
      let cur = parent.get(n.id), hops = 0;
      while (cur != null && chain.length < 4 && hops < 14) {
        const cn = nameOf(cur);
        if (!/^(wasm-to-js|js-to-wasm|__memset|__clock_gettime|evutil_gettime_monotonic_|em_task_queue_send|do_proxy|\(anon\)|emscripten_)/.test(cn))
          chain.push(cn.slice(0, 46));
        cur = parent.get(cur); hops++;
      }
      const key = chain.join(' < ') || '(top)';
      cm.set(key, (cm.get(key) || 0) + dt);
      callerAgg.set(name, cm);
    }
  }
  return span;
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const args = ['--no-sandbox', '--enable-features=SharedArrayBuffer', `--remote-debugging-port=${DBG}`,
    '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=1100,860'];
  if (HEADLESS) args.push('--use-gl=swiftshader', '--enable-unsafe-swiftshader');
  const browser = await chromium.launch({ headless: HEADLESS, args,
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' } });
  const page = await browser.newPage();
  let crashed = '';
  page.on('console', (m) => { const t = m.text();
    if (t.includes('[ABORT]') || t.includes('RuntimeError') || t.includes('Aborted(')) crashed = t; });
  page.on('pageerror', (e) => { crashed = e.message; });

  let exit = 1, cdp = null;
  try {
    const tNav = Date.now();
    await page.goto(`http://127.0.0.1:${PORT}/index.html${GPU}`, { waitUntil: 'load', timeout: TIMEOUT });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: TIMEOUT });
    const loadMs = Date.now() - tNav;
    console.log(`[perf] load->READY: ${loadMs} ms  (gpu=${GPU ? 'yes' : 'no'} headless=${HEADLESS})`);

    // raw CDP: attach to page, auto-attach to its workers, profile each.
    const ver = await new Promise((res, rej) => {
      http.get(`http://127.0.0.1:${DBG}/json/version`, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej);
    });
    cdp = new CDP(ver.webSocketDebuggerUrl);
    await cdp.ready();
    const workerSessions = new Set();
    cdp.onEvent = (m) => {
      if (m.method === 'Target.attachedToTarget') {
        const t = m.params.targetInfo;
        if (t.type === 'worker' || t.type === 'shared_worker') workerSessions.add(m.params.sessionId);
      }
    };
    const { targetInfos } = await cdp.send('Target.getTargets');
    const pageTarget = targetInfos.find((t) => t.type === 'page' && t.url.includes('index.html'));
    const { sessionId: pageSession } = await cdp.send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
    await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, pageSession);
    await new Promise((r) => setTimeout(r, 800));  // collect worker attach events
    const sids = [...workerSessions];
    for (const sid of sids) {
      try {
        await cdp.send('Profiler.enable', {}, sid);
        await cdp.send('Profiler.setSamplingInterval', { interval: 150 }, sid);
        await cdp.send('Profiler.start', {}, sid);
      } catch (e) {}
    }
    console.log(`[perf] profiling ${sids.length} worker threads; loading bench.html over WISP…`);

    const tR = Date.now();
    const windowMs = Number(process.env.PROFILE_MS || 0);
    if (windowMs > 0) {
      // Heavy real sites may never "complete" (SPA redirects/continuous fetches):
      // fire the load and profile for a fixed window instead of awaiting it.
      page.evaluate((u) => { window.geckoRender(u); }, BENCH_URL).catch(() => {});
      await new Promise((r) => setTimeout(r, windowMs));
    } else {
      await page.evaluate((u) => window.geckoRender(u), BENCH_URL);
    }
    const renderMs = Date.now() - tR;
    await new Promise((r) => setTimeout(r, SETTLE_MS));

    const agg = new Map();
    let active = 0;
    for (const sid of sids) {
      try {
        const { profile } = await cdp.send('Profiler.stop', {}, sid);
        const span = aggregate(profile, agg);
        if (span > 0) active++;
      } catch (e) {}
    }
    console.log(`[perf] geckoRender(bench) wall: ${renderMs} ms  crashed=${crashed || 'no'}  busyThreads=${active}`);

    const rows = [...agg.entries()].map(([name, e]) => ({ name, ms: e.us / 1000, bucket: e.bucket }))
      .filter((r) => r.ms >= 1).sort((a, b) => b.ms - a.ms);
    const total = rows.reduce((a, r) => a + r.ms, 0);
    const totalActive = rows.filter((r) => r.bucket !== 'idle').reduce((a, r) => a + r.ms, 0);
    console.log(`[perf] CPU across threads: ${total.toFixed(0)} ms total, ${totalActive.toFixed(0)} ms non-idle`);
    console.log('[perf] top self-time (ms / bucket / function):');
    for (const r of rows.slice(0, 50))
      console.log(`  ${r.ms.toFixed(1).padStart(8)}  ${r.bucket.padEnd(5)}  ${r.name.slice(0, 88)}`);
    console.log('[perf] callers of hot leaves (ms / caller):');
    for (const t of CALLERS_FOR) {
      const cm = callerAgg.get(t); if (!cm) continue;
      const top = [...cm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
      console.log(`  <- ${t}`);
      for (const [cn, us] of top) console.log(`       ${(us / 1000).toFixed(1).padStart(7)}  ${cn.slice(0, 150)}`);
    }
    await page.screenshot({ path: path.join(__dirname, 'perf-bench.png') });
    exit = crashed ? 1 : 0;
  } catch (e) {
    console.log('[perf] FAIL', e && e.message ? e.message : e, e && e.stack ? e.stack.split('\n')[1] : '');
  } finally {
    if (cdp) cdp.close();
    await browser.close();
    server.close();
  }
  process.exit(exit);
})();
