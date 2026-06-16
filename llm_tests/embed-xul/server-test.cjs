// End-to-end test of the REAL server.cjs path (the way you run it): start
// server.cjs (static COOP/COEP + same-origin WISP), load the page with NO ?wisp=
// (so it uses the default same-origin WISP endpoint), and render a real URL via the
// page's own geckoRender -- exactly what happens when you `node server.cjs` and use
// the address bar. Captures worker crashes via cdp-capture.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8932);  // avoid clashing with a running server.cjs

const TARGET = process.env.URL || 'https://example.com/';
const DROP = /CSM (System|Privileg|ExtScript|ProtoSec|Triggering|Incoherent|Validate|CheckChannel|DoContent|FileScript)/;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  console.log(`[test] server.cjs up on http://127.0.0.1:${PORT}/ (static+WISP)`);
  const pageUrl = `http://127.0.0.1:${PORT}/`;  // NO ?wisp= -> default same-origin WISP

  const browser = await chromium.launch({ headless: true,
    args: ['--no-sandbox', '--js-flags=--stack-trace-limit=30', '--remote-debugging-port=9343'] });
  const stopCdp = await startCDPCapture(9343, (line) => { if (!DROP.test(line)) console.log('  ' + line.slice(0, 800)); });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('  [PAGEERROR]', ((e.stack || e.message || '') + '').slice(0, 800)));
  page.on('crash', () => console.log('  [PAGE CRASH]'));

  let exit = 1;
  try {
    await page.goto(pageUrl, { waitUntil: 'load', timeout: 240000 });
    console.log('[test] coi =', await page.evaluate(() => self.crossOriginIsolated));
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    console.log('[test] READY; rendering', TARGET, 'via the page default WISP...');
    const n = await page.evaluate((u) => window.geckoRender(u), TARGET);
    const canvasNonWhite = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let k = 0; for (let i = 0; i + 3 < d.length; i += 4) if (d[i] !== 255 || d[i+1] !== 255 || d[i+2] !== 255) k++;
      return k;
    });
    console.log('[test] geckoRender =', n, ' canvas non-white =', canvasNonWhite);
    require('path');
    await page.screenshot({ path: require('path').join(__dirname, 'server-test.png'), fullPage: true });
    if (n > 1000 && canvasNonWhite > 1000) { console.log('SERVER_OK default-WISP rendering works via server.cjs'); exit = 0; }
    else { console.log('SERVER_FAIL no content'); }
  } catch (e) {
    console.log('SERVER_FAIL exception:', e && e.message ? e.message : e);
  } finally {
    try { stopCdp(); } catch (e) {}
    await browser.close(); server.close();
  }
  process.exit(exit);
})();
