// Repro GL crashes on real sites. Loads URL (env URL=...) in GPU mode and dumps
// all console + pageerror + crash. Headed, real GPU.
//   URL=https://velzie.rip/ node repro-gl.cjs
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
let wisp = null; try { wisp = require('wisp-server-node'); } catch (e) {}

const PORT = 8953;
const ROOT = __dirname;
const TARGET = process.env.URL || 'https://velzie.rip/';
const params = [];
if (process.env.NOGPU !== '1') params.push('gpu=1');
if (process.env.GLPASS === '1') params.push('glpass=1');
const GPU = params.length ? '?' + params.join('&') : '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm',
  '.data': 'application/octet-stream', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const rel = (req.url.split('?')[0] === '/') ? '/index.html' : req.url.split('?')[0];
  fs.readFile(path.join(ROOT, rel), (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});
if (wisp) server.on('upgrade', (req, s, h) => { try { wisp.routeRequest(req, s, h); } catch (e) { try { s.destroy(); } catch (e2) {} } });

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: false,
    args: ['--no-sandbox', '--enable-features=SharedArrayBuffer', '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=1100,860'],
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' } });
  const page = await browser.newPage();
  const lines = [];
  page.on('console', (m) => { const t = m.text(); lines.push('[c] ' + t);
    if (/webgl-test|WEBGL_OK|NO_WEBGL|LINK_FAIL|EXCEPTION|defaultFbo|glBindFramebuffer|GL_INVALID|gl error|RuntimeError|Aborted|null function|currentContext|Failed to create WebGL/i.test(t)) console.log('!! ' + t.slice(0, 220)); });
  page.on('pageerror', (e) => { console.log('!! [pageerror] ' + (e.stack || e.message).slice(0, 600)); });
  page.on('crash', () => console.log('!! [page CRASH]'));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html${GPU}`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 120000 });
    console.log('[repro] READY; loading ' + TARGET + ' (gpu=' + (GPU ? 'yes' : 'no') + ')');
    await page.evaluate((u) => window.geckoRender(u), TARGET);
    await new Promise((r) => setTimeout(r, 8000));
    await page.screenshot({ path: path.join(__dirname, 'repro-gl.png') });
    fs.writeFileSync(path.join(__dirname, 'repro-gl.log'), lines.join('\n'));
    console.log('[repro] done; screenshot saved. (' + lines.length + ' console lines -> repro-gl.log)');
  } catch (e) { console.log('[repro] FAIL', e && e.message ? e.message : e); }
  finally { await browser.close(); server.close(); process.exit(0); }
})();
