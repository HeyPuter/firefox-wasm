// Time the engine startup by capturing each [out] log line with its arrival time,
// to find the slow xul_init / NS_InitXPCOM phases. Reports inter-line gaps > 50ms.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startBenchServer } = require('./bench-server.cjs');

(async () => {
  const { server, port } = await startBenchServer(0);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const lines = [];
  const t0 = Date.now();
  page.on('console', (m) => {
    const t = m.text();
    const i = t.indexOf('[out]');
    if (i >= 0) lines.push({ ms: Date.now() - t0, text: t.slice(i + 5).trim().slice(0, 70) });
  });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 180000 });
  const readyMs = Date.now() - t0;
  await browser.close(); server.close();
  // Print lines with the gap since the previous line; flag big gaps.
  let prev = 0;
  console.log('readyMs=' + readyMs + ' (gaps >50ms flagged with <<<)');
  for (const l of lines) {
    const gap = l.ms - prev; prev = l.ms;
    console.log(String(l.ms).padStart(6) + 'ms  +' + String(gap).padStart(5) + 'ms  ' + l.text + (gap > 50 ? '  <<< ' + gap + 'ms' : ''));
  }
  process.exit(0);
})().catch((e) => { console.error('startup-timing fatal', e && e.message); process.exit(1); });
