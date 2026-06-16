// Browser verification of the mini-browser UI in REAL Chromium via Playwright:
// load the libxul wasm engine, wait for it to reach READY, then exercise the real
// address-bar -> LoadURI -> render -> canvas path (no DOM injection). Types a URL
// into the address bar, clicks Go, and confirms the canvas receives painted pixels.
// Screenshots the full page to embed-xul/screenshot.png and the canvas pixels are
// validated via window.__lastRender.
//
// Usage: node browser-test.cjs
const path = require('path');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server, PORT } = require('./server.cjs');

const URL = `http://127.0.0.1:${PORT}/`;
const TIMEOUT = 240000; // large module + first render; allow generous time

const BOXES = "data:text/html,<body style='margin:0;background:white'>" +
  "<div style='width:400px;height:300px;background:rgb(0,102,204)'></div>" +
  "<div style='width:200px;height:150px;background:rgb(204,0,0);margin-left:120px'></div></body>";

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  console.log(`[test] serving ${URL} (COOP/COEP)`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-features=SharedArrayBuffer'],
  });
  const page = await browser.newPage();
  page.on('console', (m) => console.log('  [console]', m.text()));
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  page.on('crash', () => console.log('  [page CRASHED]'));

  let exit = 1;
  try {
    await page.goto(URL, { waitUntil: 'load', timeout: TIMEOUT });

    const coi = await page.evaluate(() => self.crossOriginIsolated);
    console.log('[test] crossOriginIsolated =', coi);
    if (!coi) console.log('[test] WARNING: not cross-origin-isolated; pthreads unavailable');

    // Wait for the engine to finish NS_InitXPCOM and reach the READY render loop.
    console.log('[test] waiting for engine READY…');
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: TIMEOUT });
    console.log('[test] engine READY');

    // Drive the real address-bar flow: set the URL, click Go.
    await page.fill('#addr', BOXES);
    await page.click('#go');

    // Wait for a render to complete (harness sets window.__lastRender).
    await page.waitForFunction(() => window.__lastRender && window.__lastRender.nonWhite > 0,
      { timeout: TIMEOUT });
    const r = await page.evaluate(() => window.__lastRender);
    console.log(`[test] render: ${r.nonWhite}/${r.w * r.h} non-white px for ${r.url.slice(0, 40)}…`);

    // Sanity: read pixels straight off the canvas (independent of __lastRender).
    const canvasNonWhite = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i + 3 < d.length; i += 4)
        if (d[i] !== 255 || d[i + 1] !== 255 || d[i + 2] !== 255) n++;
      return n;
    });
    console.log('[test] canvas pixels non-white =', canvasNonWhite);

    await page.screenshot({ path: path.join(__dirname, 'screenshot.png'), fullPage: true });

    // The boxes are 400x300 + 200x150 = 150000 px. Expect ~150000 on the canvas.
    if (r.nonWhite > 1000 && canvasNonWhite > 1000) {
      console.log('BROWSER_OK address-bar -> LoadURI -> render -> canvas works in Chromium');
      exit = 0;
    } else {
      console.log('BROWSER_FAIL canvas did not receive painted content');
    }
  } catch (e) {
    console.log('BROWSER_FAIL exception:', e && e.message ? e.message : e);
    if (e && e.stack) console.log(e.stack);
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(exit);
})();
