// Verify the WebGL2-from-pthread test paints the #screen canvas orange.
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const PORT = 8945;
const ROOT = __dirname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  const rel = (req.url.split('?')[0] === '/') ? '/gltest.html' : req.url.split('?')[0];
  fs.readFile(path.join(ROOT, rel), (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});
const URL = `http://127.0.0.1:${PORT}/gltest.html`;
const TIMEOUT = 60000;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-features=SharedArrayBuffer',
           '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
           '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage();
  let painted = false, glver = '';
  page.on('console', (m) => {
    const t = m.text();
    console.log('  [console]', t);
    if (t.includes('frame0 painted')) painted = true;
    if (t.includes('GL_VERSION=')) glver = t;
    if (t.includes('GL_VERSION=')) glver = t;
  });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  let exit = 1;
  try {
    await page.goto(URL, { waitUntil: 'load', timeout: TIMEOUT });
    const coi = await page.evaluate(() => self.crossOriginIsolated);
    console.log('[test] crossOriginIsolated =', coi);
    // Wait (via console logs) for the worker to present its first frame.
    const t0 = Date.now();
    while (!painted && Date.now() - t0 < TIMEOUT) await new Promise((r) => setTimeout(r, 200));
    const res = painted ? 'painted' : 'no-paint';
    console.log('[test] result =', res, '|', glver);
    await new Promise((r) => setTimeout(r, 500));
    // Read the center pixel by copying the webgl canvas into a 2d canvas.
    const px = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const t = document.createElement('canvas');
      t.width = c.width; t.height = c.height;
      const tx = t.getContext('2d');
      tx.drawImage(c, 0, 0);
      const d = tx.getImageData(c.width >> 1, c.height >> 1, 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    });
    console.log('[test] center pixel RGBA =', px);
    await page.screenshot({ path: path.join(__dirname, 'gltest.png') });
    // Expect orange ~ (255,128,0).
    const ok = res === 'painted' && px[0] > 200 && px[1] > 80 && px[1] < 180 && px[2] < 80;
    if (ok) { console.log('GLTEST_OK webgl2-from-pthread presents to page canvas'); exit = 0; }
    else { console.log('GLTEST_FAIL canvas not orange / context failed'); }
  } catch (e) {
    console.log('GLTEST_FAIL', e && e.message ? e.message : e);
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(exit);
})();
