// Verify raster images render with correct channel order (no B/R swap) on the GPU.
// Generates a solid-red PNG in the browser, renders it via <img>, and checks the
// image area is RED (255,0,0), not BLUE (0,0,255 = swapped).
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const PORT = 8948, ROOT = __dirname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.data': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const rel = (req.url.split('?')[0] === '/') ? '/index.html' : req.url.split('?')[0];
  fs.readFile(path.join(ROOT, rel), (e, d) => {
    if (e) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cache-Control': 'no-store' });
    res.end(d);
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: false,
    args: ['--no-sandbox', '--enable-features=SharedArrayBuffer', '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=900,760'],
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' } });
  const page = await browser.newPage();
  let crashed = '';
  page.on('pageerror', (e) => { crashed = e.message; });
  let exit = 1;
  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html?gpu=1`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 120000 });
    // Build a page with a solid-RED raster PNG (encoded by Chrome) at a known spot.
    const html = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 240; c.height = 160;
      const x = c.getContext('2d'); x.fillStyle = 'rgb(255,0,0)'; x.fillRect(0, 0, 240, 160);
      const url = c.toDataURL('image/png');
      return "data:text/html,<body style='margin:0;background:white'>" +
        "<img src='" + url + "' style='display:block;width:240px;height:160px'></body>";
    });
    await page.evaluate((u) => window.geckoRender(u), html);
    await new Promise((r) => setTimeout(r, 4000));
    const px = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
      t.getContext('2d').drawImage(c, 0, 0);
      const d = t.getContext('2d').getImageData(80, 60, 1, 1).data;  // inside the image
      return [d[0], d[1], d[2], d[3]];
    });
    await page.screenshot({ path: path.join(__dirname, 'gpu-image.png') });
    console.log(`[test] image pixel RGBA = ${JSON.stringify(px)} crashed=${crashed || 'no'}`);
    const isRed = px[0] > 200 && px[1] < 80 && px[2] < 80;
    const isBlue = px[2] > 200 && px[0] < 80;
    if (isRed && !crashed) { console.log('IMAGE_OK raster image renders red (correct channel order)'); exit = 0; }
    else if (isBlue) { console.log('IMAGE_FAIL B/R SWAPPED (image rendered blue)'); }
    else { console.log('IMAGE_FAIL unexpected pixel ' + JSON.stringify(px)); }
  } catch (e) { console.log('IMAGE_FAIL', e && e.message ? e.message : e); }
  finally { await browser.close(); server.close(); }
  process.exit(exit);
})();
