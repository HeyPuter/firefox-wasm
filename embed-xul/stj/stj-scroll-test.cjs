// Measure scroll performance on the STJ build. Loads a tall scrollable data: page (no
// network), drives wheel events, and measures: st_present count + ms/paint during scroll,
// the input-queue backlog (uncoalesced wheel pileup), and per-fiber execution -- to see
// whether scroll lag is render cost, queue pileup, or scheduling.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 9181;
setTimeout(() => { console.log('=== HARD EXIT ==='); process.exit(7); }, 120000);
const lines = [];
let interactive = false;
function note(t) { lines.push(t); if (/doc INTERACTIVE after/.test(t)) interactive = true; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evalSafe = async (page, fn) => { try { return await Promise.race([page.evaluate(fn), new Promise((r) => setTimeout(() => r('HUNG'), 1500))]); } catch (e) { return 'err ' + e; } };
// tall striped page so scrolling repaints visibly
const TALL = "data:text/html,<body style='margin:0'>" +
  Array.from({ length: 60 }, (_, i) => `<div style='height:90px;background:hsl(${i * 6},70%,60%);font:20px monospace'>row ${i}</div>`).join('') +
  "</body>";

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 980, height: 820 } });
  page.on('console', (m) => note(m.text()));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?url=${encodeURIComponent(TALL)}`, { waitUntil: 'commit', timeout: 60000 });
    const t0 = Date.now();
    while (!interactive && Date.now() - t0 < 60000) await sleep(300);
    console.log('page loaded (interactive=' + interactive + ')');
    await sleep(800);
    // position mouse over the canvas (REQUIRED so wheel events hit the canvas listener)
    const r = await evalSafe(page, () => { const c = document.getElementById('screen'); const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await page.mouse.move(r.x, r.y).catch(() => {});
    await sleep(200);
    const base = await evalSafe(page, () => window.__STJg.dump().perf);
    const topB = await evalSafe(page, () => window.__STJg.topFibers());
    console.log('baseline perf=' + JSON.stringify(base));
    // drive 30 wheel events ~every 60ms (like a real scroll), sampling queue backlog
    const tScroll = Date.now();
    const backlogs = [];
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, 120).catch(() => {});
      if (i % 5 === 0) { const q = await evalSafe(page, () => (window.__stjInput && window.__stjInput.length) || 0); backlogs.push(q); }
      await sleep(60);
    }
    const scrollDriveMs = Date.now() - tScroll;
    // let the queue drain
    let drained = false;
    for (let i = 0; i < 40; i++) { const q = await evalSafe(page, () => (window.__stjInput && window.__stjInput.length) || 0); if (q === 0) { drained = true; break; } await sleep(100); }
    const tDrained = Date.now() - tScroll;
    const after = await evalSafe(page, () => window.__STJg.dump().perf);
    const topA = await evalSafe(page, () => window.__STJg.topFibers());
    const d = (k) => (after && base) ? Math.round(after[k] - base[k]) : '?';
    console.log('==== SCROLL PERF ====');
    console.log('30 wheel events driven over ' + scrollDriveMs + 'ms; queue drained at ' + tDrained + 'ms (drained=' + drained + ')');
    console.log('queue backlog samples (every 5 events): ' + JSON.stringify(backlogs));
    console.log('delta switches=' + d('switches') + ' yields=' + d('yields') + ' macroYields=' + d('macroYields') +
                ' condWait=' + d('condWait') + ' sleeps=' + d('sleeps') + ' runMs=' + d('runMs'));
    console.log('st_present timing lines:');
    console.log('  ' + lines.filter((l) => /paints,/.test(l)).slice(-4).join('\n  '));
    // topFibers entries: [tid, name, ms, runs]
    const bMap = {}; if (Array.isArray(topB)) for (const t of topB) bMap[t[0]] = t;
    console.log('per-fiber exec delta during scroll:');
    if (Array.isArray(topA)) for (const t of topA) { const b = bMap[t[0]] || [t[0], t[1], 0, 0]; const dm = t[2] - b[2]; if (dm > 5) console.log('  fiber ' + t[0] + ' "' + t[1] + '": +' + dm + 'ms / +' + (t[3] - b[3]) + ' runs'); }
  } catch (e) { console.log('exc ' + e.message); }
  finally { await browser.close().catch(() => {}); server.close(); process.exit(0); }
})();
