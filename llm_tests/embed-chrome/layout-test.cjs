// Verify the chrome page's new fullscreen layout: a loading overlay first, then
// the canvas fills the viewport (no header/status/buttons/url bar). Screenshots
// loading.png (early) and fullscreen.png (after chrome renders).
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8946);
const VW = 1440, VH = 900;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    // Early: the loading overlay should be visible, no chrome UI elements present.
    await new Promise((r) => setTimeout(r, 1500));
    const dom = await page.evaluate(() => ({
      hasH1: !!document.querySelector('h1'),
      hasBar: !!document.getElementById('bar'),
      hasAddr: !!document.getElementById('addr'),
      hasGo: !!document.getElementById('go'),
      hasLog: !!document.getElementById('log'),
      loaderVisible: !document.getElementById('loader').classList.contains('hidden'),
      loaderText: document.getElementById('progressText').textContent,
    }));
    console.log('[test] DOM check:', JSON.stringify(dom));
    await page.screenshot({ path: require('path').join(__dirname, 'loading.png') });

    console.log('[test] waiting for chrome to render + loader to dismiss…');
    await page.waitForFunction(
      () => document.getElementById('loader').classList.contains('hidden'),
      { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 4000));  // let the canvas paint the chrome

    const geo = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const r = c.getBoundingClientRect();
      return { vw: innerWidth, vh: innerHeight, cx: Math.round(r.x), cy: Math.round(r.y),
               cw: Math.round(r.width), ch: Math.round(r.height),
               loaderHidden: document.getElementById('loader').classList.contains('hidden') };
    });
    console.log('[test] geometry:', JSON.stringify(geo));
    // 1280:800 = 1.6; in a 1440x900 (1.6) viewport it should fill exactly.
    const fillsW = geo.cw >= geo.vw - 2, fillsH = geo.ch >= geo.vh - 2;
    console.log('[test] canvas fills viewport: width=' + fillsW + ' height=' + fillsH);
    await page.screenshot({ path: require('path').join(__dirname, 'fullscreen.png') });
    console.log('[test] screenshots -> loading.png, fullscreen.png');
  } catch (e) { console.log('[test] exception:', e && e.message ? e.message : e); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
