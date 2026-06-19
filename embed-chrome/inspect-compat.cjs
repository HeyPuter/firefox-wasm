// Inspect WebExtension compatibility state + Services.appinfo.version.
// Hypothesis: appinfo.version is undefined -> uBlock's strict_min_version check
// fails -> addon marked incompatible (appDisabled) -> background can't run.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 8998;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const APPINFO = `
(() => { try {
  const ai = Services.appinfo;
  const { AppConstants } = ChromeUtils.importESModule("resource://gre/modules/AppConstants.sys.mjs");
  console.error("COMPAT appinfo.version=" + JSON.stringify(ai.version) + " platformVersion=" + JSON.stringify(ai.platformVersion) + " appBuildID=" + JSON.stringify(ai.appBuildID) + " ID=" + JSON.stringify(ai.ID));
  console.error("COMPAT AppConstants MOZ_APP_VERSION=" + JSON.stringify(AppConstants.MOZ_APP_VERSION) + " DISPLAY=" + JSON.stringify(AppConstants.MOZ_APP_VERSION_DISPLAY) + " NIGHTLY=" + AppConstants.NIGHTLY_BUILD);
  for (const p of ["extensions.checkCompatibility.nightly","extensions.checkCompatibility.153.0a1","extensions.strictCompatibility","extensions.checkCompatibility"]) {
    let v; try { v = Services.prefs.getBoolPref(p); } catch(e){ v = "(unset)"; }
    console.error("COMPAT pref " + p + " = " + v);
  }
} catch(e){ console.error("COMPAT appinfo ERR " + (e&&e.stack||e)); } })();
`;

const INSTALL = `
(async () => {
  try {
    const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
    if (!AddonManager.isReady) { try { await AddonManager.readyPromise; } catch (e) {} }
    const resp = await fetch("http://127.0.0.1:${PORT}/ubo.xpi");
    const buf = new Uint8Array(await resp.arrayBuffer());
    await IOUtils.write("/ubo.xpi", buf);
    const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    f.initWithPath("/ubo.xpi");
    const install = await AddonManager.getInstallForFile(f, "application/x-xpinstall");
    await install.install().catch(e=>console.error("COMPAT install err "+e));
    console.error("COMPAT install state=" + install.state + " err=" + install.error);
  } catch (e) { console.error("COMPAT INSTALL ERR: " + (e && e.stack ? e.stack : e)); }
})();
`;

const ADDONSTATE = `
(async () => {
  try {
    const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
    const a = await AddonManager.getAddonByID("uBlock0@raymondhill.net");
    if (!a) { console.error("COMPAT addon NOT FOUND"); return; }
    console.error("COMPAT addon active=" + a.isActive + " userDisabled=" + a.userDisabled + " appDisabled=" + a.appDisabled + " isCompatible=" + a.isCompatible + " version=" + a.version + " blocklistState=" + a.blocklistState);
    try {
      const apps = a.targetApplications || (a.matchingTargetApplication ? [a.matchingTargetApplication] : []);
      console.error("COMPAT targetApps=" + JSON.stringify(apps));
    } catch(e){ console.error("COMPAT targetApps err "+e); }
    console.error("COMPAT isCompatibleWith(appVer)=" + (a.isCompatibleWith ? "fn" : "none"));
  } catch (e) { console.error("COMPAT ADDONSTATE ERR: " + (e && e.stack ? e.stack : e)); }
})();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('console', m => { const t = m.text(); if (/COMPAT|incompatible|appVersion|strict_/i.test(t)) console.log('C| ' + t.slice(0,300)); });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    let ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready); if (!ready) throw new Error('not ready');
    await sleep(7000);
    console.log('--- appinfo + prefs ---');
    await page.evaluate((j) => window.geckoEval(j), APPINFO);
    await sleep(1500);
    console.log('--- install uBlock ---');
    await page.evaluate((j) => window.geckoEval(j), INSTALL);
    await sleep(10000);
    console.log('--- addon state (fresh install) ---');
    await page.evaluate((j) => window.geckoEval(j), ADDONSTATE);
    await sleep(3000);
    console.log('=== RELOAD (APP_STARTUP) ===');
    await page.reload({ waitUntil: 'load', timeout: 240000 });
    ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('PHASE2 READY=' + ready);
    await sleep(8000);
    console.log('--- addon state (after reload / APP_STARTUP) ---');
    await page.evaluate((j) => window.geckoEval(j), ADDONSTATE);
    await sleep(3000);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
