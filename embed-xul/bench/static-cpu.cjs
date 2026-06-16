// Measure CPU while a STATIC (non-animating) page just sits there. The harness
// paint loop fires op=4 (full RenderDocument + blit) every 40ms regardless of whether
// anything changed, so this exposes wasted repaint-unchanged CPU. Compare to idle-cpu
// (no page). A real browser would be ~0 on a static page.
const fs = require('fs');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startBenchServer } = require('./bench-server.cjs');
const HZ = 100;
function chromePids() { const p = []; for (const pid of fs.readdirSync('/proc')) { if (!/^\d+$/.test(pid)) continue; try { if (/chrome|headless_shell/i.test(fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8'))) p.push(pid); } catch (e) {} } return p; }
function ticks(pids) { let t = 0; for (const pid of pids) { try { const st = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); const r = st.slice(st.lastIndexOf(')') + 2).split(' '); t += (+r[11] || 0) + (+r[12] || 0); } catch (e) {} } return t; }

(async () => {
  const { server, port } = await startBenchServer(0);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 180000 });
  // A STATIC page: text + boxes, no animation/rAF/timers.
  const url = "data:text/html,<body style='font-family:sans-serif'><h1>Static</h1>" +
    "<p>".repeat(1) + "Lorem ipsum dolor sit amet. ".repeat(200) +
    "<div style='width:300px;height:120px;background:linear-gradient(90deg,red,blue)'></div></body>";
  await page.evaluate((u) => window.geckoRender(u), url);
  await new Promise((r) => setTimeout(r, 2000)); // settle the load
  const pids = chromePids();
  const t0 = ticks(pids), w0 = Date.now();
  await new Promise((r) => setTimeout(r, 8000));   // measure 8s of "static" sitting
  const cpu = (ticks(pids) - t0) / HZ, wall = (Date.now() - w0) / 1000;
  await browser.close(); server.close();
  console.log(JSON.stringify({ bench: 'static-cpu', windowSec: +wall.toFixed(1), coresUsed: +(cpu / wall).toFixed(2) }));
  process.exit(0);
})().catch((e) => { console.error('static-cpu fatal', e && e.message); process.exit(1); });
