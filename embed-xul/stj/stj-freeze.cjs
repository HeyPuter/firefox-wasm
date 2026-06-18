// Reproduce + diagnose the "works then freezes after a few seconds" deadlock.
// Loads the page, drives continuous input (mouse move/click + keys), and tracks the
// scheduler watchdog `acts` counter. acts stalls -> deadlock (all blocked, no waker);
// watchdog goes SILENT -> a fiber is busy-spinning (pegging the one OS thread). Also
// captures any SuspendError / RuntimeError / fiber-threw / abort.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 8958;
const RUN_MS = Number(process.env.RUN_MS || 45000);
setTimeout(() => { console.log('\n=== HARD EXIT ==='); process.exit(7); }, RUN_MS + 25000);

const wd = [];               // [{t, acts, states, runQ, current}]
const errs = [];
let lastWdAt = 0, rendered = false, lastPresentAt = 0, lastPhase = '(none)', lastPhaseAt = 0;
let lastRun = '(none)', lastRunAt = 0; const spawns = [];
function onLine(t) {
  const ph = /STJ-IN: (\S+)/.exec(t);
  if (ph) { lastPhase = ph[1]; lastPhaseAt = Date.now(); }
  const rn = /\[stj\] run (\d+) \((start|resume)\)/.exec(t);
  if (rn) { lastRun = rn[1] + ' (' + rn[2] + ')'; lastRunAt = Date.now(); }
  const sp = /\[stj\] spawn fiber (\d+)/.exec(t);
  if (sp) spawns.push(sp[1] + ':' + t.slice(0, 100));
  const m = /\[wd\] (\{.*\})/.exec(t);
  if (m) { lastWdAt = Date.now(); try { const d = JSON.parse(m[1]); wd.push({ t: Date.now(), acts: d.acts, states: JSON.stringify(d.states), runQ: d.runQ, cur: d.current }); } catch (e) {} }
  if (/inject\+paint done|st_present:/.test(t)) { rendered = true; lastPresentAt = Date.now(); }
  if (/SuspendError|RuntimeError|fiber \d+ threw|ABORT|MOZ_CRASH|Aborted|main fiber threw/.test(t)) errs.push(t.slice(0, 200));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  page.on('console', (m) => onLine(m.text()));
  page.on('pageerror', (e) => errs.push('PAGEERR ' + String(e).slice(0, 200)));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit', timeout: 60000 });
  // wait for the first render (console marker) -- boot takes ~15s headless. Do NOT
  // page.evaluate (it hangs while the page is busy booting).
  for (let k = 0; k < 100 && !rendered; k++) await sleep(500);
  const rect = { l: 8, t: 25 };   // STJ index.html canvas offset (body margin + status line)
  console.log('rendered=' + rendered + '; driving input for ' + RUN_MS + 'ms (canvas offset ' + JSON.stringify(rect) + ')');

  const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT ' + label)), ms))]);
  const t0 = Date.now(); let i = 0;
  while (Date.now() - t0 < RUN_MS) {
    i++;
    const x = rect.l + 60 + (i * 37) % 300, y = rect.t + 40 + (i * 23) % 160;
    try {
      await withTimeout(page.mouse.move(x, y, { steps: 2 }), 5000, 'mouse.move');
      if (i % 5 === 0) await withTimeout(page.mouse.click(x, y), 5000, 'mouse.click');
      if (i % 7 === 0) await withTimeout(page.keyboard.type('ab', { delay: 30 }), 5000, 'keyboard.type');
    } catch (e) { console.log('!! input op ' + e.message + ' @ ' + (Date.now() - t0) + 'ms -> renderer unresponsive (FROZEN)'); break; }
    // freeze detection: watchdog silent for >6s = busy-spin peg
    if (lastWdAt && Date.now() - lastWdAt > 6000) { console.log('!! watchdog SILENT for >6s at ' + (Date.now() - t0) + 'ms -> busy-spin peg'); break; }
    await sleep(400);
  }
  await sleep(3000);
  // analysis
  const tail = wd.slice(-12);
  console.log('\n=== watchdog acts timeline (last 12) ===');
  tail.forEach((d) => console.log('  +' + (d.t - t0) + 'ms acts=' + d.acts + ' states=' + d.states + ' runQ=' + d.runQ + ' cur=' + d.cur));
  // did acts stall?
  let stalledAt = null;
  for (let k = 1; k < wd.length; k++) if (wd[k].acts === wd[k - 1].acts) { stalledAt = wd[k]; break; }
  console.log('acts stalled: ' + (stalledAt ? ('YES at +' + (stalledAt.t - t0) + 'ms acts=' + stalledAt.acts + ' states=' + stalledAt.states) : 'no (kept progressing)'));
  console.log('watchdog last seen: ' + (lastWdAt ? (Date.now() - lastWdAt) + 'ms ago' : 'never'));
  console.log('LAST INPUT PHASE before freeze: ' + lastPhase + ' (' + (Date.now() - lastPhaseAt) + 'ms ago)');
  console.log('LAST FIBER RUN before freeze: fiber ' + lastRun + ' (' + (Date.now() - lastRunAt) + 'ms ago) -> THIS fiber spun');
  console.log('=== fiber spawns (what each fiber is) ===\n' + spawns.join('\n'));
  console.log('=== errors/traps ===\n' + (errs.length ? errs.join('\n') : '(none)'));
  await browser.close().catch(() => {}); server.close(); process.exit(0);
})().catch((e) => { console.log('fatal ' + e.message); process.exit(1); });
