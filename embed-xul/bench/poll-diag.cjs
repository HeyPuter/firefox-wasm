// Capture WISPPOLL diagnostic lines (from wisp-syscalls.js) while the engine is
// idle, with receipt timestamps, to compute poll/select call RATE and timeout
// distribution per worker. Pinpoints idle busy-wait sources.
const path = require('path');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startBenchServer } = require('./bench-server.cjs');

(async () => {
  const WINDOW = +((process.argv.find((a) => a.startsWith('--ms=')) || '').split('=')[1]) || 8000;
  const { server, port } = await startBenchServer(0);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const lines = [];
  page.on('console', (m) => {
    const t = m.text();
    const i = t.indexOf('WISPPOLL');
    if (i >= 0) lines.push({ ms: Date.now(), text: t.slice(i) });
  });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 180000 });
  await new Promise((r) => setTimeout(r, 1500)); // settle
  lines.length = 0;
  const t0 = Date.now();
  await new Promise((r) => setTimeout(r, WINDOW));
  const elapsed = (Date.now() - t0) / 1000;
  await browser.close(); server.close();

  // Each WISPPOLL line = WISP_POLL_DIAG (2000) combined calls. Sum buckets.
  let poll = 0, sel = 0, t0b = 0, tsmall = 0, tmid = 0, tbig = 0;
  for (const l of lines) {
    const g = (k) => { const m = l.text.match(new RegExp('\\b' + k + '=(\\d+)')); return m ? +m[1] : 0; };
    poll += g('poll'); sel += g('sel'); t0b += g('t0'); tsmall += g('ts'); tmid += g('tm'); tbig += g('tb');
  }
  const total = poll + sel;
  console.log(JSON.stringify({
    windowSec: +elapsed.toFixed(1), wisppollLines: lines.length,
    pollCalls: poll, selectCalls: sel, callsPerSec: Math.round(total / elapsed),
    timeoutBuckets: { eq0: t0b, le25: tsmall, le250: tmid, big_or_inf: tbig },
  }, null, 2));
  process.exit(0);
})().catch((e) => { console.error('poll-diag fatal', e); process.exit(1); });
