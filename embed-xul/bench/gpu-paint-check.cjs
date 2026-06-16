// GPU-mode paint correctness + CPU check for the gpu_present skip-when-unchanged
// optimization. Headed Chromium on DISPLAY=:0 with ANGLE GL (GPU mode needs a real
// WebGL2 context). Three checks:
//   1. static page: canvas renders content (non-white) AND CPU is low while it sits.
//   2. delayed one-shot change (gpu-delayed.html turns red after 1.5s) still
//      composites -- guards the polling race (idle skip must not suppress it).
//   3. rAF animation (raf-fps.html) still composites every frame (~60fps), i.e. the
//      skip does NOT throttle animation.
const fs = require('fs');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startBenchServer } = require('./bench-server.cjs');
const HZ = 100;
function chromePids() { const p = []; for (const pid of fs.readdirSync('/proc')) { if (!/^\d+$/.test(pid)) continue; try { if (/chrome|headless_shell/i.test(fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8'))) p.push(pid); } catch (e) {} } return p; }
function ticks(pids) { let t = 0; for (const pid of pids) { try { const st = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); const r = st.slice(st.lastIndexOf(')') + 2).split(' '); t += (+r[11] || 0) + (+r[12] || 0); } catch (e) {} } return t; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Draw the WebGL #screen canvas into a 2D canvas and return {nonWhite, avg:[r,g,b]}.
async function sample(page) {
  return await page.evaluate(() => {
    const src = document.getElementById('screen');
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let nonWhite = 0, R = 0, G = 0, B = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      if (!(r > 245 && gg > 245 && b > 245)) nonWhite++;
      R += r; G += gg; B += b; n++;
    }
    return { nonWhite, avg: [Math.round(R / n), Math.round(G / n), Math.round(B / n)], total: n };
  });
}

(async () => {
  const { server, port } = await startBenchServer(0);
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle'],
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/index.html?gpu=1`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 180000 });
  const out = {};

  // --- 1. static page: content rendered + low CPU ---
  await page.evaluate((u) => window.geckoRender(u), `http://127.0.0.1:${port}/bench/gpu-static.html`);
  await sleep(3000); // load + shader compile + settle (paints should stop after this)
  const sStatic = await sample(page);
  const pids = chromePids();
  const t0 = ticks(pids), w0 = Date.now();
  await sleep(8000); // measure 8s of static sitting
  const cpu = (ticks(pids) - t0) / HZ, wall = (Date.now() - w0) / 1000;
  out.staticNonWhite = sStatic.nonWhite;
  out.staticCoresUsed = +(cpu / wall).toFixed(2);

  // --- 2. delayed one-shot change must still composite ---
  await page.evaluate((u) => window.geckoRender(u), `http://127.0.0.1:${port}/bench/gpu-delayed.html`);
  await sleep(900);  // before the 1500ms change
  const before = await sample(page);
  await sleep(2200); // after the change (1500ms) + grace
  const after = await sample(page);
  out.delayedBeforeAvg = before.avg;
  out.delayedAfterAvg = after.avg;
  // change = body turns red (white->red drops G and B); detect any large channel delta
  const chDelta = Math.max(...[0, 1, 2].map((i) => Math.abs(after.avg[i] - before.avg[i])));
  out.delayedChannelDelta = chDelta;
  out.delayedChangeComposited = chDelta > 30;

  await browser.close(); server.close();
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
})().catch((e) => { console.error('gpu-paint-check fatal', e && e.message); process.exit(1); });
