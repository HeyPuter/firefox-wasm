// Capture the fiber that busy-spins on an http:// nav. The harness now resets the event
// log on each nav (index.html 'n' drain), so scheduler run/blk events from the nav onward
// reach console synchronously (in-wasm) -- captured even while the JS macrotask loop is
// pegged. The LAST "run N" before the events go quiet is the spinning fiber.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 9043;
setTimeout(() => { console.log('=== HARD EXIT ==='); process.exit(7); }, 70000);
const lines = [];
function note(t) { lines.push(t); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 980, height: 820 } });
  page.on('console', (m) => note(m.text()));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit', timeout: 60000 });
    const t0 = Date.now();
    while (!/READY \(cooperative loop\)/.test(lines.join('\n')) && Date.now() - t0 < 60000) await sleep(300);
    console.log('engine READY');
    const mark = lines.length;
    const target = `http://127.0.0.1:${PORT}/hello.html`;
    console.log('--- navigating to ' + target + ' ---');
    await page.evaluate((u) => window.geckoNavigate(u), target).catch((e) => console.log('eval-nav err ' + e));
    await sleep(9000);
    const since = lines.slice(mark);
    const evs = since.filter((l) => /^\[stj\] (run|blk|wake|spawn|done|SPIN)/.test(l));
    console.log('--- ' + evs.length + ' scheduler events since nav; LAST 50 ---');
    console.log(evs.slice(-50).join('\n'));
    console.log('--- other log since nav (xul_load/wisp/etc, last 20) ---');
    console.log(since.filter((l) => !/^\[stj\] (run|blk|wake|done)/.test(l) && !/^\[wd\]/.test(l)).slice(-20).join('\n'));
  } catch (e) { console.log('exc ' + e.message); }
  finally { await browser.close().catch(() => {}); server.close(); process.exit(0); }
})();
