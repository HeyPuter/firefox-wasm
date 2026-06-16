// Step 3 verification: Gecko loads a REAL http:// URL over WISP and renders it to
// the canvas. Stands up an origin HTTP server (colored boxes, like the data: test),
// a wisp-server-node, and a COOP/COEP static server for the embed-xul dir; then in
// real Chromium loads index.html?wisp=ws://... and drives the address bar to
// http://127.0.0.1:<origin>/, asserting the canvas receives painted pixels.
const http = require('http');
const fs = require('fs');
const path = require('path');
const wisp = require('wisp-server-node');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');

const ROOT = __dirname;
// Same 400x300 + 200x150 boxes the data: test uses -> expect ~150000 non-white px.
const BODY =
  "<!doctype html><html><head><meta charset='utf-8'></head>" +
  "<body style='margin:0;background:white'>" +
  "<div style='width:400px;height:300px;background:rgb(0,102,204)'></div>" +
  "<div style='width:200px;height:150px;background:rgb(204,0,0);margin-left:120px'></div>" +
  "</body></html>";
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm',
  '.data': 'application/octet-stream' };

(async () => {
  const origin = http.createServer((req, res) => {
    console.log('[origin] ' + req.method + ' ' + req.url);
    res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': Buffer.byteLength(BODY) });
    res.end(BODY);
  });
  await new Promise((r) => origin.listen(0, '127.0.0.1', r));
  const originPort = origin.address().port;

  const wispHttp = http.createServer((q, s) => { s.writeHead(200); s.end('w'); });
  wispHttp.on('upgrade', (req, sock, head) => wisp.routeRequest(req, sock, head));
  await new Promise((r) => wispHttp.listen(0, '127.0.0.1', r));
  const wispPort = wispHttp.address().port;

  const statics = http.createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  });
  await new Promise((r) => statics.listen(0, '127.0.0.1', r));
  const pagePort = statics.address().port;

  const wispUrl = `ws://127.0.0.1:${wispPort}/`;
  const targetUrl = `http://127.0.0.1:${originPort}/`;
  const pageUrl = `http://127.0.0.1:${pagePort}/index.html?wisp=${encodeURIComponent(wispUrl)}`;
  console.log('[test] origin', originPort, 'wisp', wispPort, 'page', pagePort);
  console.log('[test] will render', targetUrl);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (m) => console.log('  [c]', m.text()));
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  page.on('crash', () => console.log('  [CRASH]'));

  let exit = 1;
  try {
    await page.goto(pageUrl, { waitUntil: 'load', timeout: 240000 });
    console.log('[test] coi =', await page.evaluate(() => self.crossOriginIsolated));
    console.log('[test] waiting for engine READY…');
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    console.log('[test] READY; rendering real URL over WISP…');

    const n = await page.evaluate((u) => window.geckoRender(u), targetUrl);
    console.log('[test] geckoRender returned non-white =', n);

    const canvasNonWhite = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let k = 0;
      for (let i = 0; i + 3 < d.length; i += 4)
        if (d[i] !== 255 || d[i + 1] !== 255 || d[i + 2] !== 255) k++;
      return k;
    });
    console.log('[test] canvas non-white =', canvasNonWhite);
    await page.screenshot({ path: path.join(ROOT, 'wisp-render.png'), fullPage: true });

    if (n > 1000 && canvasNonWhite > 1000) {
      console.log('WISP_RENDER_OK Gecko fetched + rendered a real http:// URL over WISP');
      exit = 0;
    } else {
      console.log('WISP_RENDER_FAIL no painted content');
    }
  } catch (e) {
    console.log('WISP_RENDER_FAIL exception:', e && e.message ? e.message : e);
    if (e && e.stack) console.log(e.stack);
  } finally {
    await browser.close();
    origin.close(); wispHttp.close(); statics.close();
  }
  process.exit(exit);
})();
