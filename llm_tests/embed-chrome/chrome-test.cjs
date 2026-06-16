// Load the FULL Firefox chrome (browser.xhtml) headless and report what happens:
// chrome registration, front-end JS errors, rendered pixels, screenshot.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8940);
const HOLD = Number(process.env.HOLD || 20) * 1000;

const interesting = /chrome|browser\.xhtml|manifest|RuntimeError|unreachable|Error:|NS_ERROR|XULElement|customElement|Services\.|not a function|undefined|gBrowser|BrowserGlue|register/i;
const lines = [];

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true,
    args: ['--no-sandbox', '--js-flags=--stack-trace-limit=30', '--remote-debugging-port=9360'] });
  const stopCdp = await startCDPCapture(9360, (l) => {
    lines.push(l);
    if (interesting.test(l)) console.log('  ' + l.slice(0, 400));
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => { const s = ((e.stack || e.message) + ''); lines.push('[pageerror] ' + s); console.log('  [PAGEERROR] ' + s.slice(0, 400)); });

  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    console.log('[test] engine READY; chrome auto-loading browser.xhtml...');
    // wait for the load+paint to settle
    const start = Date.now();
    while (Date.now() - start < HOLD) {
      await new Promise((r) => setTimeout(r, 1000));
      const lr = await page.evaluate(() => window.__lastRender || null).catch(() => null);
      if (lr) { console.log('[test] __lastRender:', JSON.stringify(lr)); break; }
    }
    await new Promise((r) => setTimeout(r, 3000));
    const nonWhite = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let k = 0; for (let i = 0; i + 3 < d.length; i += 4) if (d[i] !== 255 || d[i+1] !== 255 || d[i+2] !== 255) k++;
      return k;
    }).catch((e) => 'err:' + e.message);
    console.log('[test] canvas non-white px =', nonWhite);
    await page.screenshot({ path: require('path').join(__dirname, 'chrome.png'), fullPage: true });
    console.log('[test] screenshot -> embed-chrome/chrome.png');
  } catch (e) {
    console.log('[test] exception:', e && e.message ? e.message : e);
  } finally {
    try { stopCdp(); } catch (e) {}
    await browser.close(); server.close();
  }
  process.exit(0);
})();
