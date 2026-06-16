// Load the full Firefox chrome, then load a real site INTO the active tab and
// verify it renders inside the chrome content area. Screenshots site-in-chrome.png.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8942);
const SITE = process.env.SITE || 'https://example.com';
const HOLD = Number(process.env.HOLD || 30) * 1000;

const interesting = /ds depth|content docshell|isRemote|browserTabsRemote|chrome_load_content|LoadURI|RuntimeError|unreachable|NS_ERROR|primary content|spun|load FAILED|TypeError/i;
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true,
    args: ['--no-sandbox', '--remote-debugging-port=9362'] });
  const stopCdp = await startCDPCapture(9362, (l) => {
    if (/setsockopt|CSM |fluent|moz-support/.test(l)) return;
    console.log('  ' + l.slice(0, 300));
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('  [PAGEERROR] ' + ((e.stack||e.message)+'').slice(0,200)));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    console.log('[test] engine READY; waiting for chrome (browser.xhtml) to settle...');
    // The page auto-loads browser.xhtml. Give it time to fully init gBrowser.
    await new Promise((r) => setTimeout(r, 12000));
    console.log('[test] loading site into tab:', SITE);
    const n = await page.evaluate((u) => window.geckoRender(u), SITE);
    console.log('[test] geckoRender returned px =', n);
    // let it paint a few frames
    await new Promise((r) => setTimeout(r, 16000));
    await page.screenshot({ path: require('path').join(__dirname, 'site-in-chrome.png'), fullPage: true });
    console.log('[test] screenshot -> embed-chrome/site-in-chrome.png');
    // sample a horizontal band in the content area (below the toolbar ~y=300)
    const sample = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const d = c.getContext('2d').getImageData(0, 300, c.width, 400).data;
      let nonWhite = 0; for (let i = 0; i + 3 < d.length; i += 4)
        if (d[i] !== 255 || d[i+1] !== 255 || d[i+2] !== 255) nonWhite++;
      return { contentBandNonWhite: nonWhite };
    }).catch((e) => 'err:' + e.message);
    console.log('[test] content-area sample:', JSON.stringify(sample));
  } catch (e) { console.log('[test] exception:', e && e.message ? e.message : e); }
  finally { try { stopCdp(); } catch {} await browser.close(); server.close(); }
  process.exit(0);
})();
