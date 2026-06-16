// Render a REAL external site (http://example.com) over WISP, in Chromium. The
// local wisp-server-node proxies to the actual internet, so this exercises the full
// path: Gecko DNS (synthetic IP -> hostname via DNS.lookup_addr in the WISP shim) ->
// WISP CONNECT example.com:80 -> real TCP -> HTTP -> parse -> render to <canvas>.
const http = require('http');
const fs = require('fs');
const path = require('path');
const wisp = require('wisp-server-node');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');

const ROOT = __dirname;
const TARGET = process.env.URL || 'http://example.com/';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.data': 'application/octet-stream' };

(async () => {
  const wispHttp = http.createServer((q, s) => { s.writeHead(200); s.end('w'); });
  // logLevel DEBUG(0): print what host:port each WISP CONNECT targets + result.
  wispHttp.on('upgrade', (req, sock, head) => wisp.routeRequest(req, sock, head, { logLevel: 0 }));
  await new Promise((r) => wispHttp.listen(0, '127.0.0.1', r));
  const wispPort = wispHttp.address().port;

  const statics = http.createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'cross-origin', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  await new Promise((r) => statics.listen(0, '127.0.0.1', r));
  const pagePort = statics.address().port;

  const wispUrl = `ws://127.0.0.1:${wispPort}/`;
  const mozlog = process.env.MOZLOG || '';
  const pageUrl = `http://127.0.0.1:${pagePort}/index.html?wisp=${encodeURIComponent(wispUrl)}` +
    (mozlog ? `&mozlog=${encodeURIComponent(mozlog)}` : '');
  console.log('[test] wisp', wispPort, 'page', pagePort, '-> render', TARGET);

  const DROP = /CSM (System|Privileg|ExtScript|ProtoSec|Triggering|Incoherent|Validate|CheckChannel|DoContent|FileScript)/;
  const CDP_PORT = 9242;
  const browser = await chromium.launch({ headless: true,
    args: ['--no-sandbox', '--js-flags=--stack-trace-limit=30', `--remote-debugging-port=${CDP_PORT}`] });
  // Browser-level CDP capture: relays console + EXCEPTIONS from the page AND every
  // emscripten pthread Web Worker (where crashes actually happen) -- the
  // DevTools-equivalent that page.on('console') misses.
  const stopCdp = await startCDPCapture(CDP_PORT, (line) => { if (!DROP.test(line)) console.log('  ' + line.slice(0, 1600)); });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('  [PAGEERROR]', ((e.stack || e.message || '') + '').slice(0, 1500)));
  page.on('crash', () => console.log('  [PAGE CRASH]'));
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  let exit = 1;
  try {
    await page.goto(pageUrl, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    console.log('[test] READY; rendering', TARGET, 'over WISP...');
    const n = await page.evaluate((u) => window.geckoRender(u), TARGET);
    console.log('[test] geckoRender non-white =', n);
    const canvasNonWhite = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let k = 0; for (let i = 0; i + 3 < d.length; i += 4) if (d[i] !== 255 || d[i+1] !== 255 || d[i+2] !== 255) k++;
      return k;
    });
    console.log('[test] canvas non-white =', canvasNonWhite);
    const shot = 'site-' + TARGET.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_').slice(0, 40) + '.png';
    await page.screenshot({ path: path.join(ROOT, shot), fullPage: true });
    console.log('[test] screenshot ->', shot);
    if (n > 50 && canvasNonWhite > 50) {
      console.log('EXTERN_OK rendered a real internet site over WISP:', TARGET);
      exit = 0;
    } else {
      console.log('EXTERN_FAIL little/no content rendered');
    }
  } catch (e) {
    console.log('EXTERN_FAIL exception:', e && e.message ? e.message : e);
  } finally {
    try { stopCdp(); } catch (e) {}
    await browser.close();
    wispHttp.close(); statics.close();
  }
  process.exit(exit);
})();
