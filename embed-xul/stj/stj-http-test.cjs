// Probe real-site loading over WISP: navigate to a PLAIN-HTTP site (neverssl.com, which
// never redirects to https) to isolate networking from TLS. Polls WISP byte counters +
// the embedder's readyState (st=) so we see whether bytes flow back and the parse runs.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 9061;
const URL = process.env.NAV_URL || 'http://neverssl.com/';
setTimeout(() => { console.log('=== HARD EXIT ==='); process.exit(7); }, 130000);
const lines = [];
let lastSt = null, lastIsNew = null, interactive = false;
function note(t) {
  lines.push(t);
  let m;
  if ((m = /pass \d+ st=(-?\d+) isNew=(\d+)/.exec(t))) { lastSt = +m[1]; lastIsNew = +m[2]; }
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
    console.log('engine READY; navigating to ' + URL);
    await page.evaluate((u) => { try { window.geckoNavigate(u); } catch (e) { console.log('naverr ' + e); } }, URL);

    for (let i = 0; i < 30 && !interactive; i++) {
      await sleep(2000);
      const stats = await page.evaluate(() => { try { return (window.WISP && window.WISP.stats && window.WISP.stats()) || 'no-stats'; } catch (e) { return 'err ' + e; } });
      console.log('[t+' + (2 * (i + 1)) + 's] st=' + lastSt + ' isNew=' + lastIsNew + ' interactive=' + interactive + ' WISP=' + JSON.stringify(stats));
    }
    console.log('FINAL interactive=' + interactive + ' st=' + lastSt + ' isNew=' + lastIsNew);
  } catch (e) { console.log('exc ' + e.message); }
  finally {
    console.log('--- xul_load/wisp/error tail ---');
    console.log(lines.filter((l) => /xul_load|wisp|nav|LoadURI|NS_ERROR|nsResult|0x80|fail|error/i.test(l)).slice(-22).join('\n'));
    await browser.close().catch(() => {}); server.close(); process.exit(0);
  }
})();
