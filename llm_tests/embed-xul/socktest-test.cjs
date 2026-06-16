// Step 2 harness: origin HTTP + wisp-server-node + COOP/COEP static server, then
// load socktest.html in real Chromium and confirm it fetched HTTP over WISP via
// the emscripten socket layer.
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('/home/velzie/src/puter/node_modules/ws');
const wisp = require('wisp-server-node');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');

const ROOT = __dirname;
const BODY = '<!doctype html><title>o</title><h1>WISP_OK from origin over sockets</h1>';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };

(async () => {
  const origin = http.createServer((req, res) => {
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
    const file = path.join(ROOT, rel === '/' ? 'socktest.html' : rel);
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  });
  await new Promise((r) => statics.listen(0, '127.0.0.1', r));
  const pagePort = statics.address().port;

  const wispUrl = `ws://127.0.0.1:${wispPort}/`;
  const pageUrl = `http://127.0.0.1:${pagePort}/socktest.html?wisp=${encodeURIComponent(wispUrl)}&port=${originPort}`;
  console.log('[test] origin', originPort, 'wisp', wispPort, 'page', pagePort);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (m) => console.log('  [c]', m.text()));
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  let exit = 1;
  try {
    await page.goto(pageUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__done !== null, { timeout: 60000 });
    const ok = await page.evaluate(() => window.__done);
    console.log('[test] result =', ok);
    if (ok) { console.log('STEP2_OK'); exit = 0; } else { console.log('STEP2_FAIL'); }
  } catch (e) {
    console.log('STEP2_FAIL exception:', e && e.message ? e.message : e);
  } finally {
    await browser.close();
    origin.close(); wispHttp.close(); statics.close();
  }
  process.exit(exit);
})();
