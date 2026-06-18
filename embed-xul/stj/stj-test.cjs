// Playwright smoke test for the STJ build (single OS thread, JSPI fibers, no SAB).
// Loads index.html (no COOP/COEP), boots the main fiber, and reports how far
// xul_init/NS_InitXPCOM gets cooperatively. The main fiber loops forever on success,
// so we watch the wasm stdout markers rather than a "done".
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const path = require('path');
const PORT = 8951;
const TIMEOUT = Number(process.env.STJ_TIMEOUT_MS || 240000);

// Hard safety: a busy-spinning (frozen) page hangs page.evaluate forever. Force-exit
// after the timeout regardless, so the live-captured console trace is what we read.
setTimeout(() => { console.log('\n=== HARD EXIT (page likely frozen/busy-spin) ==='); process.exit(7); }, TIMEOUT + 20000);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  page.on('console', (m) => { console.log('C| ' + m.text().slice(0, 1400)); });   // diagnostic: print all
  page.on('pageerror', (e) => console.log('PAGEERR| ' + String(e).slice(0, 200)));
  let verdict = 'UNKNOWN';
  try {
    const q = process.env.MOZLOG ? `?mozlog=${encodeURIComponent(process.env.MOZLOG)}` : '';
    await page.goto(`http://127.0.0.1:${PORT}/${q}`, { waitUntil: 'load', timeout: 60000 });
    // Wait for a terminal-ish marker: init returned (ok/fail), READY, abort, or error.
    await page.waitForFunction(() => {
      const L = (window.__log || []).join('\n');
      return /xul_init rv=/.test(L) || /embed-xul\[stj\]: READY/.test(L) || window.__stjAbort || window.__stjErr;
    }, undefined, { timeout: TIMEOUT }).catch(() => {});
    const st = await page.evaluate(() => ({ log: window.__log || [], abort: window.__stjAbort || null, err: window.__stjErr || null, booted: !!window.__geckoBooted }));
    const L = st.log.join('\n');
    const m = /xul_init rv=0x([0-9a-fA-F]+)/.exec(L);
    console.log('\n=== xul_init rv: ' + (m ? '0x' + m[1] : '(never returned)') + ' ===');
    if (m && m[1] === '00000000') {
      verdict = /READY/.test(L) ? 'INIT_OK_RENDERING' : 'INIT_OK';
      await new Promise((r) => setTimeout(r, 4000));
      const shot = path.join(__dirname, 'stj-render.png');
      await page.screenshot({ path: shot }).catch(() => {});
      const px = await page.evaluate(() => { try { const c = document.getElementById('screen'); const x = c.getContext('2d'); const at = (X, Y) => Array.from(x.getImageData(X, Y, 1, 1).data).slice(0, 3).join(','); return { blue: at(50, 50), red: at(50, 380), bg: at(700, 550) }; } catch (e) { return null; } });
      console.log('canvas samples: ' + JSON.stringify(px) + '  shot -> ' + shot);
    } else if (m) { verdict = 'INIT_FAILED(rv=0x' + m[1] + ')'; }
    else if (st.abort) { verdict = 'ABORT'; }
    else if (st.err) { verdict = 'ERROR'; }
    else { verdict = 'HANG/TIMEOUT'; }
    console.log('abort=' + st.abort + ' err=' + st.err + ' booted=' + st.booted);
    console.log('--- last markers ---\n' + st.log.filter((l) => /stj|xul_init|NS_Init|ABORT|MOZ_CRASH|thread/i.test(l)).slice(-30).join('\n'));
  } catch (e) { verdict = 'TEST_ERROR'; console.log('exc ' + e.message); }
  finally { console.log('\n=== STJ VERDICT: ' + verdict + ' ==='); await browser.close().catch(()=>{}); server.close(); process.exit(0); }
})();
