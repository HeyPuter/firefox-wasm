// Functional check: a wheel event scrolls a tall page (smooth scroll settles to a
// new position) without crashing. Smoothness itself is judged visually; this just
// confirms scrolling works end-to-end with the GPU compositor.
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const PORT = 8947, ROOT = __dirname;
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
// Tall page: 40 colored rows so a scroll visibly changes the top of the viewport.
let rows = '';
for (let i = 0; i < 40; i++) rows += `<div style='height:60px;background:hsl(${i*9},70%,60%);font:20px sans-serif;padding:6px'>row ${i}</div>`;
const PAGE = `data:text/html,<body style='margin:0'>${rows}</body>`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: false,
    args: ['--no-sandbox', '--enable-features=SharedArrayBuffer', '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=900,760'],
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' } });
  const page = await browser.newPage();
  let crashed = '';
  page.on('console', (m) => { const t = m.text(); if (t.includes('[ABORT]') || t.includes('Aborted(')) crashed = t; });
  page.on('pageerror', (e) => { crashed = e.message; });
  let exit = 1;
  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html?gpu=1`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 120000 });
    await page.evaluate((u) => window.geckoRender(u), PAGE);
    await new Promise((r) => setTimeout(r, 2500));
    const topRow = (label) => page.evaluate(() => {
      const c = document.getElementById('screen');
      const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
      t.getContext('2d').drawImage(c, 0, 0);
      // hash a vertical strip down the left edge to fingerprint the viewport content
      const d = t.getContext('2d').getImageData(20, 0, 1, c.height).data;
      let h = 0; for (let i = 0; i < d.length; i += 16) h = (h * 31 + d[i]) | 0;
      return h;
    });
    const before = await topRow();
    // Send wheel-down events (smooth scroll), let the animation settle.
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.geckoInput({ op: 3, x: 400, y: 300, deltaX: 0, deltaY: 240 }));
      await new Promise((r) => setTimeout(r, 250));
    }
    await new Promise((r) => setTimeout(r, 1500));
    const after = await topRow();
    await page.screenshot({ path: path.join(__dirname, 'gpu-scroll.png') });
    console.log(`[test] viewport fingerprint before=${before} after=${after} crashed=${crashed || 'no'}`);
    if (before !== after && !crashed) { console.log('SCROLL_OK page scrolled (content changed), no crash'); exit = 0; }
    else { console.log('SCROLL_FAIL before==after or crashed'); }
  } catch (e) { console.log('SCROLL_FAIL', e && e.message ? e.message : e); }
  finally { await browser.close(); server.close(); }
  process.exit(exit);
})();
