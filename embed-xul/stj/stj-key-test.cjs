// Keyboard-dispatch test for the STJ build: load the interactive page, click the <input>
// to focus it, type, and verify the input region repaints (text/caret appears) -- read from
// the embedder's st_present input(60,180) pixel sample (white when empty, non-white once
// text is drawn). Goes straight to keyboard (no hover/active) to fit the slow cooperative
// loop within budget.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 8957;
const TIMEOUT = Number(process.env.STJ_TIMEOUT_MS || 150000);
setTimeout(() => { console.log('\n=== HARD EXIT ==='); process.exit(7); }, TIMEOUT + 15000);

let lastInk = null, sawBlue = false;
const lines = [];
function note(t) {
  const m = /btn\(160,80\)=#([0-9a-f]{6}) inputInk=(\d+)/.exec(t);
  if (m) { if (m[1] === '0066cc') sawBlue = true; lastInk = +m[2]; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(pred, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (pred()) return true; await sleep(200); } console.log('  [timeout: ' + label + ']'); return false; }

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  let inkLog = 0;
  page.on('console', (m) => {
    const t = m.text(); lines.push(t); note(t);
    if (/inputInk=/.test(t) && (++inkLog % 4 === 0)) console.log('  live ' + (/btn\(160,80\)=#[0-9a-f]+ inputInk=\d+/.exec(t) || [''])[0]);
    if (/\[input\]|focus\+activate|do_key|SetFocusedWindow/.test(t)) console.log('  page: ' + t.slice(0, 90));
  });
  let verdict = 'UNKNOWN';
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit', timeout: 60000 });
    if (!await waitFor(() => sawBlue, TIMEOUT * 0.5, 'page rendered')) { verdict = 'NO_RENDER'; throw new Error('no render'); }
    console.log('page rendered; input ink (empty)=' + lastInk);
    const rect = await page.evaluate(() => { const r = document.getElementById('screen').getBoundingClientRect(); return { l: r.left, t: r.top }; }).catch(() => ({ l: 8, t: 25 }));
    // click the <input> (canvas ~ (200,180)) to focus it
    const ix = rect.l + 200, iy = rect.t + 180;
    console.log('clicking input at viewport (' + Math.round(ix) + ',' + Math.round(iy) + ') to focus');
    await page.mouse.click(ix, iy);
    await page.focus('#screen').catch(() => {});   // ensure canvas is the DOM keyboard target
    await sleep(2000);
    const beforeInk = lastInk || 0;
    console.log('input focused; ink before typing=' + beforeInk + '; typing "HELLO"...');
    await page.keyboard.type('HELLO', { delay: 150 });
    const typed = await waitFor(() => lastInk != null && lastInk > beforeInk + 40, 70000, 'typed text ink jump');
    console.log('TYPE result: inputInk ' + beforeInk + ' -> ' + lastInk + ' = ' + (typed ? 'TEXT DRAWN (keyboard dispatch OK)' : 'no jump'));
    verdict = typed ? 'KEYBOARD_OK' : 'KEYBOARD_FAIL';
    await page.screenshot({ path: require('path').join(__dirname, 'stj-key.png') }).catch(() => {});
  } catch (e) { console.log('exc ' + e.message); if (verdict === 'UNKNOWN') verdict = 'ERROR'; }
  finally {
    console.log('\n=== KEYBOARD VERDICT: ' + verdict + ' ===');
    console.log(lines.filter((l) => /st_present:/.test(l)).slice(-5).join('\n'));
    await browser.close().catch(() => {}); server.close(); process.exit(0);
  }
})();
