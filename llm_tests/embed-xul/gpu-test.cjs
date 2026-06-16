// REAL GPU verification of the WebRender->WebGL2->canvas path.
//
// Runs HEADED Chromium on the live display (DISPLAY=:0) so it uses the actual
// hardware GPU (this box: AMD Radeon RX 6500 XT via radeonsi), NOT swiftshader.
// We (1) read UNMASKED_RENDERER_WEBGL to PROVE the browser is on a real GPU, then
// (2) load index.html?gpu=1, load a data: URL, and confirm the engine's in-process
// WebRender created a GL context (GLContextProviderEmscripten) and presented to
// the page <canvas> -- with no software blit.
//
//   GPU_HEADLESS=1  -> headless + swiftshader (software GL; CI pipeline check only,
//                      does NOT prove hardware acceleration).
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
let wisp = null; try { wisp = require('wisp-server-node'); } catch (e) {}

const PORT = 8946;
const ROOT = __dirname;
const HEADLESS = process.env.GPU_HEADLESS === '1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm',
  '.data': 'application/octet-stream', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const rel = (req.url.split('?')[0] === '/') ? '/index.html' : req.url.split('?')[0];
  fs.readFile(path.join(ROOT, rel), (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});
if (wisp) server.on('upgrade', (req, s, h) => { try { wisp.routeRequest(req, s, h); } catch (e) { try { s.destroy(); } catch (e2) {} } });

const URL = `http://127.0.0.1:${PORT}/index.html?gpu=1`;
// Rich page: text (heading/paragraph/bold) + a CSS gradient + a solid box --
// exercises glyph rasterization, gradients, and solid rects composited together.
const BOXES = "data:text/html,<body style='margin:0;font-family:sans-serif;padding:12px'>" +
  "<h1 style='color:rgb(0,102,204)'>GPU WebRender</h1>" +
  "<p>Text and <b>boxes</b> composited on the GPU.</p>" +
  "<div style='width:320px;height:120px;background:linear-gradient(90deg,red,orange,yellow,green,blue)'></div>" +
  "<div style='width:200px;height:80px;background:rgb(0,160,60);margin-top:10px'></div></body>";
const TIMEOUT = 180000;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const args = ['--no-sandbox', '--enable-features=SharedArrayBuffer',
    '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=900,760'];
  if (HEADLESS) args.push('--use-gl=swiftshader', '--enable-unsafe-swiftshader');
  const browser = await chromium.launch({
    headless: HEADLESS, args,
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
  });
  const page = await browser.newPage();
  let glCreated = false, crashed = '';
  page.on('console', (m) => {
    const t = m.text();
    console.log('  [c]', t.length > 220 ? t.slice(0, 220) : t);
    if (t.includes('[gpu] GLContextEmscripten created')) glCreated = true;
    if (t.includes('[ABORT]') || t.includes('RuntimeError') || t.includes('Aborted('))
      crashed = t;
  });
  page.on('pageerror', (e) => { console.log('  [pageerror]', e.message); crashed = e.message; });
  page.on('crash', () => { console.log('  [page CRASHED]'); crashed = 'page crash'; });

  let exit = 1;
  try {
    await page.goto(URL, { waitUntil: 'load', timeout: TIMEOUT });

    // PROOF OF REAL GPU: read the unmasked renderer Chromium is actually using.
    const gpu = await page.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return { renderer: 'NO-WEBGL', vendor: '' };
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      };
    });
    const isHardware = !/swiftshader|software|llvmpipe|softwarerasterizer/i.test(gpu.renderer);
    console.log(`[test] browser GPU renderer = ${gpu.renderer} (${gpu.vendor})`);
    console.log(`[test] hardware GPU = ${isHardware}  (headless=${HEADLESS})`);

    console.log('[test] waiting for engine READY…');
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: TIMEOUT });
    console.log('[test] READY; loading boxes data: URL…');
    await page.evaluate((u) => window.geckoRender(u), BOXES);
    await new Promise((r) => setTimeout(r, 5000));  // let the compositor present
    console.log('[test] GLContextEmscripten created =', glCreated, '| crashed =', crashed || 'no');

    const px = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
      try { t.getContext('2d').drawImage(c, 0, 0); } catch (e) { return 'drawerr:' + e.message; }
      const ctx2 = t.getContext('2d');
      const d = ctx2.getImageData(0, 0, c.width, c.height).data;
      let nonWhite = 0, nonBlack = 0;
      for (let i = 0; i + 3 < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        if (r !== 255 || g !== 255 || b !== 255) nonWhite++;
        if (r !== 0 || g !== 0 || b !== 0) nonBlack++;
      }
      const at = (x, y) => { const p = ctx2.getImageData(x, y, 1, 1).data; return [p[0],p[1],p[2],p[3]]; };
      return { nonWhite, nonBlack, total: c.width * c.height,
               box: at(100, 100), bg: at(600, 450) };
    });
    console.log('[test] canvas pixels =', JSON.stringify(px));
    await page.screenshot({ path: path.join(__dirname, 'gpu.png') });

    const presented = px && typeof px === 'object' && px.nonBlack > 1000 && px.nonWhite > 1000;
    if (glCreated && !crashed && (isHardware || HEADLESS) && presented) {
      console.log(`GPU_OK WebRender composited to canvas on ${isHardware ? 'HARDWARE GPU' : 'swiftshader'}: ${gpu.renderer}`);
      exit = 0;
    } else {
      console.log(`GPU_FAIL glCreated=${glCreated} crashed=${crashed || 'no'} hw=${isHardware} presented=${presented}`);
    }
  } catch (e) {
    console.log('GPU_FAIL', e && e.message ? e.message : e);
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(exit);
})();
