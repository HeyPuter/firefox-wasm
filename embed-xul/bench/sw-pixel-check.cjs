// Verify the software blit (BGRA->RGBA swizzle in index.html) is color-correct:
// render a known solid color and read it back from the canvas. Software mode.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startBenchServer } = require('./bench-server.cjs');

(async () => {
  const { server, port } = await startBenchServer(0);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 180000 });
  // Known color: rgb(0,102,204) full-page background.
  const url = "data:text/html,<body style='margin:0;background:rgb(0,102,204)'></body>";
  await page.evaluate((u) => window.geckoRender(u), url);
  await new Promise((r) => setTimeout(r, 1500));
  const px = await page.evaluate(() => {
    const c = document.getElementById('screen');
    const x = c.getContext('2d').getImageData(c.width >> 1, c.height >> 1, 1, 1).data;
    return { r: x[0], g: x[1], b: x[2], a: x[3] };
  });
  await browser.close(); server.close();
  const ok = Math.abs(px.r - 0) < 12 && Math.abs(px.g - 102) < 12 && Math.abs(px.b - 204) < 12 && px.a === 255;
  console.log(JSON.stringify({ expected: 'rgb(0,102,204)', got: px, colorCorrect: ok }));
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('sw-pixel-check fatal', e); process.exit(1); });
