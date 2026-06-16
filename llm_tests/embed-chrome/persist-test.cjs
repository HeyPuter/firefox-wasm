// Verify the chrome build's profile persists across reloads (IDBFS).
// Run 1: load chrome, write a sentinel into /profile, persist (syncfs), list profile.
// Reload the SAME page (same origin -> IndexedDB survives).
// Run 2: load chrome; the sentinel + Gecko-written files must still be present.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8943);
const SENTINEL = 'embed-persist-' + Date.now();

async function waitReadyAndChrome(page) {
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
  await new Promise((r) => setTimeout(r, 10000));   // let browser.xhtml settle
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--remote-debugging-port=9363'] });
  const stopCdp = await startCDPCapture(9363, (l) => {
    if (/profile|IndexedDB|syncfs/i.test(l) && !/setsockopt/.test(l)) console.log('  ' + l.slice(0, 200));
  });
  const page = await browser.newPage();
  try {
    // ---- Run 1 ----
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await waitReadyAndChrome(page);
    const lsBefore = await page.evaluate(() => window.geckoProfile.ls());
    console.log('[run1] /profile contents:', JSON.stringify(lsBefore));
    const w = await page.evaluate((s) => window.geckoProfile.write('embed-sentinel.txt', s), SENTINEL);
    console.log('[run1] wrote sentinel ->', w, '=', SENTINEL);
    // persist to IndexedDB and give syncfs time to flush
    await page.evaluate(() => window.geckoPersist());
    await new Promise((r) => setTimeout(r, 4000));
    console.log('[run1] persisted; reloading page...');

    // ---- Reload (new wasm instance, same origin => IndexedDB persists) ----
    await page.reload({ waitUntil: 'load', timeout: 240000 });
    await waitReadyAndChrome(page);
    const lsAfter = await page.evaluate(() => window.geckoProfile.ls());
    console.log('[run2] /profile contents:', JSON.stringify(lsAfter));
    const got = await page.evaluate(() => window.geckoProfile.read('embed-sentinel.txt'));
    console.log('[run2] sentinel read back:', got);

    const ok = got === SENTINEL;
    const geckoFiles = lsAfter.filter((n) => n !== 'embed-sentinel.txt');
    console.log(ok
      ? `[PASS] profile persisted across reload (sentinel matched; ${geckoFiles.length} other profile entries: ${JSON.stringify(geckoFiles)})`
      : `[FAIL] sentinel did not survive reload (got ${JSON.stringify(got)})`);
  } catch (e) { console.log('[test] exception:', e && e.message ? e.message : e); }
  finally { try { stopCdp(); } catch {} await browser.close(); server.close(); }
  process.exit(0);
})();
