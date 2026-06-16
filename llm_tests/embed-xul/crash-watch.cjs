// Hold a real site open like an interactive session and FAIL on any wasm crash.
// Unlike server-test (render-once-then-exit), this keeps the page alive while the
// continuous render loop pumps the engine, lets workers/timers run and tear down,
// and captures every worker RuntimeError / pageerror / CDP exception with full
// stack. Usage: URL=https://4chan.org/ HOLD=20 node crash-watch.cjs
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8933);
const TARGET = process.env.URL || 'https://4chan.org/';
const HOLD = Number(process.env.HOLD || 20) * 1000;

const crashes = [];
const isCrash = (s) => /RuntimeError|unreachable|MOZ_CRASH|Aborted\(|abort\(|wasm-function/i.test(s || '');

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true,
    args: ['--no-sandbox', '--js-flags=--stack-trace-limit=40', '--remote-debugging-port=9351'] });
  // CDP relays worker-thread crashes (the ones page.on('console') misses).
  const stopCdp = await startCDPCapture(9351, (line) => {
    if (isCrash(line)) { crashes.push('[cdp] ' + line); console.log('CRASH>', line.slice(0, 1000)); }
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => {
    const s = (e.stack || e.message || '') + '';
    if (isCrash(s)) { crashes.push('[pageerror] ' + s); console.log('CRASH> [pageerror]', s.slice(0, 1000)); }
  });
  page.on('crash', () => { crashes.push('[page crash]'); console.log('CRASH> page crashed'); });

  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    console.log('[watch] engine ready; loading', TARGET);
    const n = await page.evaluate((u) => window.geckoRender(u), TARGET).catch((e) => { console.log('render threw', e.message); return null; });
    console.log('[watch] geckoRender =', n, '- holding', HOLD / 1000 + 's (continuous render loop running, workers live)...');

    // Hold the session open. Periodically nudge the page with a mouse move + a
    // scroll so the live document keeps doing work (and workers spin), like a user.
    const start = Date.now();
    while (Date.now() - start < HOLD && crashes.length === 0) {
      await page.evaluate(() => {
        if (window.geckoInput) {
          window.geckoInput({ op: 1, evType: 0, x: 200 + (Date.now() % 300), y: 150 });
          window.geckoInput({ op: 3, x: 400, y: 300, deltaY: 120 });
        }
      }).catch(() => {});
      await new Promise((r) => setTimeout(r, 500));
    }
  } catch (e) {
    if (isCrash((e.message || '') + '')) crashes.push('[exception] ' + e.message);
    console.log('[watch] exception:', e && e.message ? e.message : e);
  } finally {
    try { stopCdp(); } catch (e) {}
    await browser.close(); server.close();
  }

  console.log('\n[watch] ' + crashes.length + ' crash event(s) captured');
  console.log(crashes.length === 0 ? 'NO_CRASH' : 'CRASHED');
  process.exit(crashes.length === 0 ? 0 : 1);
})();
