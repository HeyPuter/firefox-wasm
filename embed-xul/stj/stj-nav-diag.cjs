// Diagnostic: navigate to a data: URL and snapshot the cooperative scheduler state during
// the load stall, with THREAD NAMES, to see which fiber is the HTML5 Parser and whether it
// (and necko's delivery threads) ever wake / progress during the load.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 8972;
setTimeout(() => { console.log('=== HARD EXIT ==='); process.exit(7); }, 110000);

const lines = [];
let interactive = false, capReached = false;
function note(t) {
  lines.push(t);
  if (/doc INTERACTIVE after/.test(t)) interactive = true;
  if (/cap reached/.test(t)) capReached = true;
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
    console.log('engine READY');
    await sleep(1500);

    // show the fiber roster (names) BEFORE nav
    const roster0 = await page.evaluate(() => { try { return window.__STJg.named(); } catch (e) { return { err: String(e) }; } });
    console.log('ROSTER pre-nav: ' + JSON.stringify(roster0));

    // open the event firehose so we capture scheduler activity DURING the load
    await page.evaluate(() => { try { const S = window.__STJg; S.evCap = 300000; S.evCount = 0; } catch (e) {} });

    const dataUrl = "data:text/html,<h1>HELLO</h1>";
    console.log('--- navigating to ' + dataUrl + ' ---');
    await page.evaluate((u) => { try { window.geckoNavigate(u); } catch (e) { console.log('naverr ' + e); } }, dataUrl);

    for (let i = 0; i < 10 && !interactive; i++) {
      await sleep(1000);
      const d = await page.evaluate(() => { try { return { named: window.__STJg.named(), futex: window.__STJg.futexes.size, conds: window.__STJg.conds.size }; } catch (e) { return { err: String(e) }; } });
      // only print fibers that are NOT 'blocked' (the active ones) + counts
      const active = {};
      if (d.named) for (const k in d.named) if (d.named[k][1] !== 'blocked') active[k] = d.named[k];
      console.log('[t+' + (i + 1) + 's] active=' + JSON.stringify(active) + ' futex=' + d.futex + ' conds=' + d.conds);
    }
    console.log('interactive=' + interactive + ' cap=' + capReached);
    const roster1 = await page.evaluate(() => { try { return window.__STJg.named(); } catch (e) { return { err: String(e) }; } });
    console.log('ROSTER post-load: ' + JSON.stringify(roster1));
  } catch (e) { console.log('exc ' + e.message); }
  finally {
    console.log('--- xul_load[stj] tail ---');
    console.log(lines.filter((l) => /xul_load\[stj\]: (cap|doc)/.test(l)).slice(-3).join('\n'));
    // which fibers RAN during the load window (after evCount reset)? count run-events per fiber
    const runs = {};
    for (const l of lines) { const m = /^\[stj\] run (\d+) \(/.exec(l); if (m) runs[m[1]] = (runs[m[1]] || 0) + 1; }
    console.log('--- run-event counts per fiber (load window) ---');
    console.log(JSON.stringify(runs));
    // any block/wake events naming HTML5/parser/Socket/Stream fibers
    console.log('--- fiber-name assignments seen ---');
    console.log(lines.filter((l) => /^\[stj\] fiber \d+ = /.test(l)).join('\n'));
    await browser.close().catch(() => {}); server.close(); process.exit(0);
  }
})();
