// Build a wall-clock timeline of a load (timestamps relative to nav) so we can see where
// the seconds go: DNS (nav->CONNECT), network RTT (CONNECT->first response bytes via WISP
// rx growth), or parse/render (data->doc INTERACTIVE).
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 9073;
const URL = process.env.NAV_URL || 'https://news.ycombinator.com/';
setTimeout(() => { console.log('=== HARD EXIT ==='); process.exit(7); }, 140000);
const lines = [];
let tNav = 0, interactive = false;
const ev = [];   // {t, msg}
function note(t) {
  lines.push(t);
  if (tNav && /\[wisp\] (CONNECT|socket)|LoadURI|doc INTERACTIVE|OnStopRequest|st_present:|pass \d+ st=/i.test(t))
    ev.push({ t: Date.now() - tNav, msg: t.slice(0, 80) });
  if (/doc INTERACTIVE after/.test(t)) interactive = true;
}
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
    await sleep(500);
    console.log('navigating to ' + URL);
    tNav = Date.now();
    await page.evaluate((u) => window.geckoNavigate(u), URL);
    // sample WISP rx/tx over time to see when bytes flow
    const wispSamples = [];
    for (let i = 0; i < 40 && !interactive; i++) {
      await sleep(500);
      let w = 'n/a';
      try { w = await Promise.race([page.evaluate(() => (window.WISP && window.WISP.stats && window.WISP.stats()) || []), new Promise((r) => setTimeout(() => r('HUNG'), 800))]); } catch (e) {}
      const totRx = Array.isArray(w) ? w.reduce((a, s) => a + s.rx, 0) : -1;
      const totTx = Array.isArray(w) ? w.reduce((a, s) => a + s.tx, 0) : -1;
      wispSamples.push((Date.now() - tNav) + 'ms rx=' + totRx + ' tx=' + totTx + ' conns=' + (Array.isArray(w) ? w.length : '?'));
    }
    console.log('==== TIMELINE (ms from nav) ====');
    for (const e of ev) console.log('  +' + e.t + 'ms  ' + e.msg);
    console.log('==== WISP rx/tx samples ====');
    console.log('  ' + wispSamples.join('\n  '));
    console.log('interactive=' + interactive);
  } catch (e) { console.log('exc ' + e.message); }
  finally { await browser.close().catch(() => {}); server.close(); process.exit(0); }
})();
