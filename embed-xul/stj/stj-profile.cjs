// CPU-profile the (single-target) STJ build to find the import-free wasm busy-spin.
// V8's sampler runs on a separate thread, so samples accumulate even while the renderer
// main thread is wedged in a tight wasm loop. The only risk is Profiler.stop needing the
// main thread; we race it against a timeout. With --profiling-funcs the wasm frames carry
// real C++ names, so the hottest self-time function pinpoints the spin.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 8954;
const WAIT_MS = Number(process.env.WAIT_MS || 22000);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--js-flags=--no-turbo-inlining'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  page.on('console', (m) => { const t = m.text(); if (/xul_load|CreateWindowlessBrowser|Connecting/.test(t)) console.log('C| ' + t.slice(0, 120)); });
  const client = await page.context().newCDPSession(page);
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: 100 }); // 100us
  await client.send('Profiler.start');
  page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit' }).catch(() => {});
  console.log(`[prof] sampling for ${WAIT_MS}ms while it boots + spins...`);
  await new Promise((r) => setTimeout(r, WAIT_MS));

  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('stop-timeout')), ms))]);
  let prof;
  try { prof = await withTimeout(client.send('Profiler.stop'), 12000); }
  catch (e) { console.log('[prof] Profiler.stop ' + e.message + ' -> main thread uninterruptible (tight wasm loop)'); await browser.close().catch(()=>{}); server.close(); process.exit(3); }

  const p = prof.profile;
  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of p.nodes) for (const c of (n.children || [])) parent.set(c, n.id);
  const fnOf = (id) => { const n = byId.get(id); return n ? (n.callFrame.functionName || '(anon)') : '?'; };
  const self = new Map();
  const samples = p.samples || [];
  const deltas = p.timeDeltas || samples.map(() => 100);
  // self time per leaf function
  for (let i = 0; i < samples.length; i++) { const n = byId.get(samples[i]); if (!n) continue; const f = n.callFrame.functionName || '(anon)'; self.set(f, (self.get(f) || 0) + Math.max(0, deltas[i] || 0)); }
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  const totalUs = [...self.values()].reduce((a, b) => a + b, 0);
  console.log('\n=== top self-time functions (us) ===');
  for (const [fn, us] of top) console.log((us / 1000).toFixed(1).padStart(8) + 'ms  ' + (us / totalUs * 100).toFixed(1).padStart(5) + '%  ' + fn.slice(0, 90));

  // Print the hottest leaf's full stack to root (the spin's call chain).
  const hot = top[0] && top[0][0];
  if (hot) {
    // find a sample whose leaf is the hot fn, walk to root
    let leafId = null;
    for (let i = samples.length - 1; i >= 0; i--) { const n = byId.get(samples[i]); if (n && (n.callFrame.functionName || '(anon)') === hot) { leafId = samples[i]; break; } }
    console.log('\n=== call stack of hottest spin (' + hot.slice(0, 60) + ') ===');
    let id = leafId, depth = 0;
    while (id != null && depth++ < 40) { console.log('  ' + fnOf(id).slice(0, 100)); id = parent.get(id); }
  }
  await browser.close().catch(()=>{}); server.close(); process.exit(0);
})().catch((e) => { console.log('fatal ' + e.message); process.exit(1); });
