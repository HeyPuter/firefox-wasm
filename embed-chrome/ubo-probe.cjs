// Install instrumented uBlock (temporary addon, no signing) and capture the
// [PROBE] per-2s primitive/listener deltas to identify the idle loop driver.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 9019;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const INSTALL = `
(async () => { try {
  const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
  if (!AddonManager.isReady) { try { await AddonManager.readyPromise; } catch (e) {} }
  const resp = await fetch("http://127.0.0.1:${PORT}/ubo-probe.xpi");
  await IOUtils.write("/ubo-probe.xpi", new Uint8Array(await resp.arrayBuffer()));
  const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile); f.initWithPath("/ubo-probe.xpi");
  const addon = await AddonManager.installTemporaryAddon(f);
  console.error("PROBEINST installed active=" + addon.isActive + " id=" + addon.id);
} catch(e){ console.error("PROBEINST err "+(e&&e.stack||e)); } })();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('console', m => { const t=m.text(); if(/PROBE|PROBEINST/i.test(t)) console.log(t.slice(0,2000)); });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1&contentconsole`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 });
    await sleep(7000);
    console.log('--- installing instrumented uBlock (temporary) ---');
    await page.evaluate((j) => window.geckoEval(j), INSTALL);
    // let it init + auto-reload, then watch the probe through ~50s to see steady state
    await sleep(58000);
    console.log('--- (observation done) ---');
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
