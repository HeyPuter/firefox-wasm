// Diagnostic runner for the single-threaded build: loads the page N times and
// reports, for each, how far init/load got (last markers, ready flag, any
// trap/abort/error). Characterizes the (nondeterministic) single-threaded deadlock.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-st.cjs');
const PORT = 8933;
const RUNS = Number(process.env.RUNS || 3);
const WAIT_MS = Number(process.env.WAIT_MS || 75000);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-experimental-webassembly-jspi', '--js-flags=--experimental-wasm-jspi'] });
  for (let i = 1; i <= RUNS; i++) {
    const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
    let rterr = null;
    page.on('pageerror', (e) => { rterr = String(e).slice(0, 240); });
    try {
      const q = process.env.MOZLOG ? `?mozlog=${encodeURIComponent(process.env.MOZLOG)}` : '';
      await page.goto(`http://127.0.0.1:${PORT}/${q}`, { waitUntil: 'load', timeout: 60000 });
      // Wait until ready/abort/err OR WAIT_MS, without throwing.
      await page.waitForFunction(
        () => window.__geckoReady === true || window.__stAbort || window.__stReject || window.__stErr,
        undefined, { timeout: WAIT_MS }).catch(() => {});
      const st = await page.evaluate(() => ({
        ready: !!window.__geckoReady,
        abort: window.__stAbort || null,
        reject: window.__stReject || null,
        err: window.__stErr || null,
        log: window.__stLog || [],
      })).catch((e) => ({ evalErr: String(e).slice(0, 120) }));
      const log = st.log || [];
      const last = log.slice(process.env.MOZLOG ? -22 : -4).map((s) => '      ' + s).join('\n');
      console.log(`\n--- run ${i} ---`);
      console.log(`ready=${st.ready} abort=${st.abort} reject=${st.reject} err=${st.err} rterr=${rterr} evalErr=${st.evalErr || ''}`);
      console.log(`markers=${log.length}, last:\n${last}`);
      // Classify
      const j = log.join('\n');
      let where = 'unknown';
      if (/cooperative main loop running/.test(j)) where = 'INIT_OK (loop running)';
      else if (/NS_InitXPCOM returned rv=0x00000000/.test(j)) where = 'INIT returned OK (no loop yet)';
      else if (/calling NS_InitXPCOM/.test(j)) where = 'HANG/TRAP inside NS_InitXPCOM';
      else where = 'before NS_InitXPCOM';
      console.log(`=> ${where}`);
    } catch (e) {
      console.log(`\n--- run ${i} --- EXC ${e.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }
  await browser.close(); server.close(); process.exit(0);
})();
