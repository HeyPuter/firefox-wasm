// Verify a REAL multi-connection HTTPS site loads + renders over WISP (software
// mode) with the un-proxied select. Loads a page, waits, counts non-white canvas
// pixels — real content => substantial non-white.
//   node bench/wiki-render-check.cjs [url]
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startBenchServer } = require('./bench-server.cjs');

(async () => {
  const url = process.argv[2] || 'https://en.wikipedia.org/wiki/WebAssembly';
  const { server, port } = await startBenchServer(0);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  let aborted = null;
  page.on('console', (m) => { const t = m.text(); if (/\[ABORT\]|Aborted\(|RuntimeError/.test(t)) aborted = t; });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 180000 });
  const t0 = Date.now();
  await page.evaluate((u) => window.geckoRender(u), url);
  await new Promise((r) => setTimeout(r, 3000)); // let the paint loop settle
  const loadMs = Date.now() - t0;
  const px = await page.evaluate(() => {
    const c = document.getElementById('screen');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let nonWhite = 0, nonBlack = 0;
    for (let i = 0; i + 3 < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (r !== 255 || g !== 255 || b !== 255) nonWhite++;
      if (r !== 0 || g !== 0 || b !== 0) nonBlack++;
    }
    return { nonWhite, nonBlack, total: c.width * c.height };
  });
  await browser.close(); server.close();
  const rendered = px.nonWhite > 2000 && px.nonBlack > 2000;
  console.log(JSON.stringify({ url, loadMs, pixels: px, rendered, aborted: aborted || null }));
  process.exit(rendered && !aborted ? 0 : 1);
})().catch((e) => { console.error('wiki-render-check fatal', e && e.message); process.exit(1); });
