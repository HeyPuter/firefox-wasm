// Diagnostic: why does NSS init trap on the first http:// load? Sets MOZ_LOG for
// the NSS/PKCS11 modules and filters console to the relevant lines + the crash.
const http = require('http');
const fs = require('fs');
const path = require('path');
const wisp = require('wisp-server-node');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');

const ROOT = __dirname;
const BODY = "<!doctype html><body style='margin:0'><div style='width:300px;height:200px;background:rgb(0,102,204)'></div></body>";
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.data': 'application/octet-stream' };
const KEEP = /nss|pk11|pkcs|softok|freebl|loader|PSM|InitializeNSS|secmod|SECMOD|unreachable|CRASH|abort|RuntimeError|wasm-function|xul_render|load FAILED|SECStatus|dlopen|No such|cannot|Error:/i;

(async () => {
  const origin = http.createServer((q, s) => { s.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': Buffer.byteLength(BODY) }); s.end(BODY); });
  await new Promise((r) => origin.listen(0, '127.0.0.1', r));
  const originPort = origin.address().port;
  const wispHttp = http.createServer((q, s) => { s.writeHead(200); s.end('w'); });
  wispHttp.on('upgrade', (req, sock, head) => wisp.routeRequest(req, sock, head));
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
  const target = `http://127.0.0.1:${originPort}/`;
  const mozlog = 'pipnss:5,pkcs11module:5,nsslibinit:5';
  const pageUrl = `http://127.0.0.1:${pagePort}/index.html?wisp=${encodeURIComponent(wispUrl)}&mozlog=${encodeURIComponent(mozlog)}`;

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (m) => { const t = m.text(); if (KEEP.test(t)) console.log(t); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  try {
    await page.goto(pageUrl, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    console.log('--- READY; loading', target, '---');
    await page.evaluate((u) => { window.geckoRender(u); }, target).catch(() => {});
    await page.waitForTimeout(15000); // let the NSS path run + crash
  } catch (e) {
    console.log('[harness]', e && e.message ? e.message : e);
  } finally {
    await browser.close();
    origin.close(); wispHttp.close(); statics.close();
  }
  process.exit(0);
})();
