// Measure load performance + scheduler counters. Times nav->doc-INTERACTIVE and dumps the
// per-load delta of {switches, yields, macroYields, futexWait, futexEwb, condWait} so we can
// see what dominates (context switches? macrotask yields? futex spins?).
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 9143;
const URL = process.env.NAV_URL || 'https://example.com/';
setTimeout(() => { console.log('=== HARD EXIT ==='); process.exit(7); }, 140000);
const lines = [];
let interactive = false, tNav = 0, tInteractive = 0, passes = null;
function note(t) {
  lines.push(t);
  const m = /doc INTERACTIVE after (\d+) passes/.exec(t);
  if (m && !interactive) { interactive = true; tInteractive = Date.now(); passes = +m[1]; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evalSafe = async (page, fn) => { try { return await Promise.race([page.evaluate(fn), new Promise((r) => setTimeout(() => r('EVAL-HUNG'), 1500))]); } catch (e) { return 'err ' + e; } };

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
    const base = await evalSafe(page, () => window.__STJg.dump().perf);
    const tlsSize = await evalSafe(page, () => window.__STJg.dump().tlsSize);
    console.log('TLS size=' + tlsSize + ' bytes');
    console.log('baseline perf=' + JSON.stringify(base));
    const topBefore = await evalSafe(page, () => window.__STJg.topFibers());
    console.log('navigating to ' + URL);
    tNav = Date.now();
    await page.evaluate((u) => window.geckoNavigate(u), URL);
    for (let i = 0; i < 60 && !interactive; i++) await sleep(500);
    const dur = interactive ? (tInteractive - tNav) : -1;
    await sleep(500);
    const after = await evalSafe(page, () => window.__STJg.dump().perf);
    const d = (k) => (after && base && typeof after[k] === 'number') ? (after[k] - base[k]) : '?';
    console.log('==== PERF ====');
    console.log('time nav->INTERACTIVE: ' + dur + ' ms (' + passes + ' embedder passes)');
    if (after && base && typeof after.runMs === 'number') console.log('fiber EXECUTION time: ' + Math.round(after.runMs - base.runMs) + ' ms  (rest = scheduling/macrotask gaps)');
    console.log('delta switches=' + d('switches') + ' yields=' + d('yields') + ' macroYields=' + d('macroYields') +
                ' futexWait=' + d('futexWait') + ' futexEwb=' + d('futexEwb') + ' condWait=' + d('condWait') +
                ' sleeps=' + d('sleeps') + ' sleepMs=' + d('sleepMs'));
    if (typeof d('switches') === 'number' && typeof d('macroYields') === 'number' && d('macroYields') > 0)
      console.log('est macrotask floor: ' + d('macroYields') + ' macroYields x ~2ms = ~' + (d('macroYields') * 2) + ' ms');
    const topAfter = await evalSafe(page, () => window.__STJg.topFibers());
    const bMap = {}; if (Array.isArray(topBefore)) for (const t of topBefore) bMap[t[0]] = t;
    console.log('==== per-fiber execution DELTA during load (tid: +ms / +runs) ====');
    if (Array.isArray(topAfter)) for (const t of topAfter) { const b = bMap[t[0]] || [t[0], 0, 0]; const dm = t[1] - b[1], dr = t[2] - b[2]; if (dm > 5) console.log('  fiber ' + t[0] + ': +' + dm + 'ms / +' + dr + ' runs (' + (dr ? Math.round(dm / dr) : 0) + 'ms/run)'); }
  } catch (e) { console.log('exc ' + e.message); }
  finally { await browser.close().catch(() => {}); server.close(); process.exit(0); }
})();
