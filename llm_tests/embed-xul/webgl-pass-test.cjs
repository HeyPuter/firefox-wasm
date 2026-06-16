// Verify the content-WebGL passthrough: load a page with a WebGL canvas via the
// engine (?gpu=1&glpass=1), confirm a host gecko-webgl-* canvas was created (proves
// GLContextProviderEmscripten::CreateContent ran), capture the page's [webgl-test]
// result, and sample the composited #screen pixels (the triangle should appear).
//   URL=http://127.0.0.1:8957/webgl-test.html node webgl-pass-test.cjs
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
let wisp = null; try { wisp = require('wisp-server-node'); } catch (e) {}
const PORT = 8957, ROOT = __dirname;
const TARGET = process.env.URL || `http://127.0.0.1:${PORT}/webgl-test.html`;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.data': 'application/octet-stream', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const rel = (req.url.split('?')[0] === '/') ? '/index.html' : req.url.split('?')[0];
  fs.readFile(path.join(ROOT, rel), (e, d) => {
    if (e) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin', 'Content-Length': d.length, 'Cache-Control': 'no-store' });
    res.end(d);
  });
});
if (wisp) server.on('upgrade', (req, s, h) => { try { wisp.routeRequest(req, s, h); } catch (e) { try { s.destroy(); } catch (e2) {} } });

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: false,
    args: ['--no-sandbox', '--enable-features=SharedArrayBuffer', '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=1000,820'],
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' } });
  const page = await browser.newPage();
  page.on('console', (m) => { const t = m.text();
    if (/webgl-test|WEBGL_OK|NO_WEBGL|LINK_FAIL|EXCEPTION|Failed to create WebGL|RuntimeError|Aborted/i.test(t)) console.log('  ' + t.slice(0, 240)); });
  page.on('pageerror', (e) => console.log('  [pageerror] ' + e.message.slice(0, 200)));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 120000 });
    console.log('[test] READY; rendering ' + TARGET);
    await page.evaluate((u) => window.geckoRender(u), TARGET);
    await new Promise((r) => setTimeout(r, 6000));
    // host DOM: did CreateContent make a hidden host canvas?
    const hostCanvases = await page.evaluate(() =>
      [...document.querySelectorAll('canvas[id^="gecko-webgl-"]')].map((c) => c.id));
    console.log('[test] host passthrough canvases = ' + JSON.stringify(hostCanvases));
    // sample composited #screen: the triangle area (centre) should be non-background.
    const px = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
      t.getContext('2d').drawImage(c, 0, 0);
      const g = t.getContext('2d');
      const at = (x, y) => { const d = g.getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
      // canvas is 400x300 at top-left; centre ~ (200,150); triangle tip ~ (200,40)
      return { centre: at(200, 150), tip: at(200, 60), clearArea: at(40, 280) };
    });
    console.log('[test] #screen samples = ' + JSON.stringify(px));
    await page.screenshot({ path: path.join(__dirname, 'webgl-pass.png') });
  } catch (e) { console.log('[test] FAIL', e && e.message ? e.message : e); }
  finally { await browser.close(); server.close(); process.exit(0); }
})();
