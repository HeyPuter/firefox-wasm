// Render+input-dispatch loop test for the STJ build (single OS thread, JSPI fibers, no SAB).
// Loads the interactive page (a CSS :hover/:active button + a text input), then drives REAL
// DOM input (mouse move/click, keyboard) and verifies the page re-renders in response --
// read from the embedder's st_present pixel-sample printf (reliable; no page.evaluate needed
// for the verdict). Button #b: #0066cc normally, #cc0000 on :hover, #00aa00 on :active.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 8956;
const TIMEOUT = Number(process.env.STJ_TIMEOUT_MS || 120000);
setTimeout(() => { console.log('\n=== HARD EXIT ==='); process.exit(7); }, TIMEOUT + 15000);

// latest btn(...)=#xxxxxx sample seen in the console
let lastBtn = null, lastInputPx = null, sawBlue = false;
const lines = [];
function note(t) {
  const m = /btn\(160,80\)=#([0-9a-f]{6}) inputInk=(\d+)/.exec(t);
  if (m) { lastBtn = m[1]; lastInputPx = m[2]; if (m[1] === '0066cc') sawBlue = true; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(pred, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (pred()) return true; await sleep(200); }
  console.log('  [timeout waiting for ' + label + ']');
  return false;
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  page.on('console', (m) => { const t = m.text(); lines.push(t); note(t); if (/READY|input forwarding|inject\+paint|st_present/.test(t)) {} });
  let verdict = 'UNKNOWN';
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit', timeout: 60000 });
    // 1. wait for the interactive page to render (button blue)
    const rendered = await waitFor(() => sawBlue, TIMEOUT * 0.7, 'button rendered blue');
    console.log('button rendered (blue seen): ' + rendered + '  lastBtn=#' + lastBtn);
    if (!rendered) { verdict = 'NO_RENDER'; throw new Error('no initial render'); }

    // 2. locate the canvas, move the REAL mouse over the button center (canvas 160,80)
    const rect = await page.evaluate(() => { const c = document.getElementById('screen'); const r = c.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; }).catch(() => null);
    console.log('canvas rect: ' + JSON.stringify(rect));
    const vx = (rect ? rect.l : 8) + 160, vy = (rect ? rect.t : 30) + 80;
    console.log('moving mouse to button center viewport (' + Math.round(vx) + ',' + Math.round(vy) + ')');
    lastBtn = null;
    await page.mouse.move(vx, vy, { steps: 4 });
    // 3. expect :hover -> button turns red (#cc0000)
    const hovered = await waitFor(() => lastBtn === 'cc0000', 30000, 'button :hover red');
    console.log('HOVER result: btn=#' + lastBtn + ' -> ' + (hovered ? 'RED (input dispatch OK)' : 'no change'));

    // 4. press the mouse -> :active -> green (#00aa00)
    lastBtn = null;
    await page.mouse.down();
    const active = await waitFor(() => lastBtn === '00aa00', 20000, 'button :active green');
    console.log('ACTIVE result: btn=#' + lastBtn + ' -> ' + (active ? 'GREEN (mousedown OK)' : 'no change'));
    await page.mouse.up();

    // 5. focus the input (click) + type; the input pixel region should CHANGE (placeholder
    //    gray -> typed black). Detect by change, not absolute color.
    await page.mouse.click(vx, vy + 100);   // over the <input> (~y=180 canvas)
    await sleep(1500);
    const before = lastInputPx;
    console.log('input focused, before-type px=#' + before + '; typing...');
    await page.keyboard.type('HELLO', { delay: 100 });
    const typed = await waitFor(() => lastInputPx && lastInputPx !== before, 40000, 'typed text changes input');
    console.log('TYPE result: input px #' + before + ' -> #' + lastInputPx + ' = ' + (typed ? 'CHANGED (keyboard OK)' : 'no change'));

    verdict = (hovered ? 'HOVER_OK' : 'HOVER_FAIL') + '/' + (active ? 'ACTIVE_OK' : 'ACTIVE_FAIL') + '/' + (typed ? 'TYPE_OK' : 'TYPE_FAIL');
    const shot = require('path').join(__dirname, 'stj-input.png');
    await page.screenshot({ path: shot }).catch(() => {});
    console.log('screenshot -> ' + shot);
  } catch (e) { console.log('exc ' + e.message); verdict = verdict === 'UNKNOWN' ? 'ERROR' : verdict; }
  finally {
    console.log('\n=== INPUT VERDICT: ' + verdict + ' ===');
    console.log('--- last st_present samples ---');
    console.log(lines.filter((l) => /st_present:/.test(l)).slice(-6).join('\n'));
    await browser.close().catch(() => {}); server.close(); process.exit(0);
  }
})();
