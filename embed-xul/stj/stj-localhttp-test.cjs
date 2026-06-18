// Isolate WISP relay + Necko HTTP read + parse + render from internet-host quirks: the
// wasm's Necko fetches http://127.0.0.1:PORT/hello.html THROUGH WISP (which relays to the
// same local server). If hello.html's #00cc66 bg renders, real HTTP-over-WISP loading works.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 9050;
setTimeout(() => { console.log('=== HARD EXIT ==='); process.exit(7); }, 120000);
const lines = [];
let lastSt = null, lastIsNew = null, interactive = false, lastColored = null, lastBg = null;
function note(t) {
  lines.push(t);
  let m;
  if ((m = /pass \d+ st=(-?\d+) isNew=(\d+)/.exec(t))) { lastSt = +m[1]; lastIsNew = +m[2]; }
  if ((m = /st_present: \d+x\d+ nonblack=\d+ colored=(\d+).*bg\(500,400\)=#([0-9a-f]{6})/.exec(t))) { lastColored = +m[1]; lastBg = m[2]; }
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
    const target = `http://127.0.0.1:${PORT}/hello.html`;
    console.log('engine READY; navigating (via WISP->local server) to ' + target);
    await page.evaluate((u) => { try { window.geckoNavigate(u); } catch (e) { console.log('naverr ' + e); } }, target);

    for (let i = 0; i < 25 && !interactive; i++) {
      await sleep(2000);
      let stats = 'n/a';
      try { stats = await Promise.race([page.evaluate(() => (window.WISP && window.WISP.stats && window.WISP.stats()) || 'no-stats'), new Promise((r) => setTimeout(() => r('EVAL-HUNG(page pegged)'), 1500))]); } catch (e) { stats = 'err ' + e; }
      console.log('[t+' + (2 * (i + 1)) + 's] st=' + lastSt + ' isNew=' + lastIsNew + ' interactive=' + interactive + ' colored=' + lastColored + ' bg=#' + lastBg + ' WISP=' + JSON.stringify(stats));
    }
    console.log('FINAL interactive=' + interactive + ' st=' + lastSt + ' isNew=' + lastIsNew + ' bg=#' + lastBg + ' colored=' + lastColored);
    await page.screenshot({ path: require('path').join(__dirname, 'stj-localhttp.png') }).catch(() => {});
  } catch (e) { console.log('exc ' + e.message); }
  finally {
    console.log('--- tail ---');
    console.log(lines.filter((l) => /xul_load|wisp|nav|LoadURI|INTERACTIVE|cap reached/i.test(l)).slice(-14).join('\n'));
    await browser.close().catch(() => {}); server.close(); process.exit(0);
  }
})();
