// Full-console diagnostic: load index.html (with WISP), log EVERY console line +
// pageerror (no filtering) so we can see xul_init progress + any init crash.
const http = require('http');
const fs = require('fs');
const path = require('path');
const wisp = require('wisp-server-node');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const ROOT = __dirname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.data': 'application/octet-stream' };
const DROP = /CSM (System|Privileg|ExtScript|ProtoSec|Triggering|Incoherent|Validate|CheckChannel|DoContent|FileScript)/;

(async () => {
  const wispHttp = http.createServer((q, s) => { s.writeHead(200); s.end('w'); });
  wispHttp.on('upgrade', (req, sock, head) => wisp.routeRequest(req, sock, head, { logLevel: 2 }));
  await new Promise((r) => wispHttp.listen(0, '127.0.0.1', r));
  const wispPort = wispHttp.address().port;
  const statics = http.createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  await new Promise((r) => statics.listen(0, '127.0.0.1', r));
  const pagePort = statics.address().port;
  const wispUrl = `ws://127.0.0.1:${wispPort}/`;
  const pageUrl = `http://127.0.0.1:${pagePort}/index.html?wisp=${encodeURIComponent(wispUrl)}`;

  // dumpio: pipe the whole Chromium process stdout/stderr (incl. pthread/Web
  // Worker consoles, which page.on('console') does NOT capture) so we see crashes
  // that happen on emscripten worker threads.
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-logging=stderr', '--v=0'], dumpio: true });
  const page = await browser.newPage();
  page.on('console', (m) => { const t = m.text(); if (!DROP.test(t)) console.log('[con] ' + t.slice(0, 400)); });
  page.on('pageerror', (e) => console.log('[PAGEERROR]', (e.message || '').slice(0, 800)));
  page.on('crash', () => console.log('[PAGE CRASH]'));
  page.on('worker', (w) => { console.log('[worker created]', w.url()); w.on('close', () => console.log('[worker closed]', w.url())); });

  try {
    await page.goto(pageUrl, { waitUntil: 'load', timeout: 120000 });
    // Wait for READY, or until the wait window ends (init may crash).
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 90000 }).catch((e) => console.log('[no READY]', e.message));
    const url = process.env.URL;
    if (url && await page.evaluate(() => window.__geckoReady === true)) {
      console.log('[diag] READY; rendering', url);
      await page.evaluate((u) => window.geckoRender(u), url).catch((e) => console.log('[render err]', e.message));
      await page.waitForTimeout(8000);
    }
  } catch (e) { console.log('[harness]', e && e.message ? e.message : e); }
  finally { await browser.close(); wispHttp.close(); statics.close(); }
  process.exit(0);
})();
