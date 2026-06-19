// Query the runtime multiprocess/e10s/fission state + whether a web tab goes remote.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 9001;
const WITH_UBO = process.env.UBO === '1';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const QUERY = `
(() => { try {
  const ai = Services.appinfo;
  console.error("PROC browserTabsRemoteAutostart=" + ai.browserTabsRemoteAutostart + " fissionAutostart=" + ai.fissionAutostart + " maxWebProcessCount=" + ai.maxWebProcessCount);
  const w = Services.wm.getMostRecentWindow("navigator:browser") || Services.wm.getMostRecentWindow(null);
  console.error("PROC gMultiProcessBrowser=" + (w && w.gMultiProcessBrowser) + " gFissionBrowser=" + (w && w.gFissionBrowser));
  for (const p of ["browser.tabs.remote.autostart","fission.autostart","fission.autostart.session","extensions.webextensions.remote","dom.ipc.processCount","dom.ipc.processPrelaunch.enabled"]) {
    let v; try { v = Services.prefs.getBoolPref(p); } catch(e){ try{v=Services.prefs.getIntPref(p);}catch(e2){v="(unset)";} }
    console.error("PROC pref " + p + " = " + v);
  }
} catch(e){ console.error("PROC ERR " + (e&&e.stack||e)); } })();
`;

const TABQ = `
(() => { try {
  const b = gBrowser.selectedBrowser;
  console.error("PROC selectedBrowser isRemoteBrowser=" + b.isRemoteBrowser + " remoteType=" + b.remoteType + " uri=" + (b.currentURI&&b.currentURI.spec));
} catch(e){ console.error("PROC TABQ ERR " + (e&&e.stack||e)); } })();
`;

const INSTALL_UBO = `
(async () => { try {
  const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
  if (!AddonManager.isReady) { try { await AddonManager.readyPromise; } catch (e) {} }
  const resp = await fetch("http://127.0.0.1:${PORT}/ubo.xpi");
  const buf = new Uint8Array(await resp.arrayBuffer());
  await IOUtils.write("/ubo.xpi", buf);
  const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  f.initWithPath("/ubo.xpi");
  const install = await AddonManager.getInstallForFile(f, "application/x-xpinstall");
  await install.install().catch(e=>{});
  console.error("PROC uBlock installed state=" + install.state);
} catch(e){ console.error("PROC UBO ERR " + e); } })();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('console', m => { const t = m.text(); if (/PROC|subprocess|socketpair|fixupAndLoadURI/i.test(t)) console.log('C| ' + t.slice(0,240)); });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    const ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready + ' WITH_UBO=' + WITH_UBO); if (!ready) throw new Error('not ready');
    await sleep(7000);
    console.log('--- process state ---');
    await page.evaluate((j) => window.geckoEval(j), QUERY);
    await sleep(2000);
    if (WITH_UBO) {
      console.log('--- install uBlock ---');
      await page.evaluate((j) => window.geckoEval(j), INSTALL_UBO);
      await sleep(10000);
      const reloads = Number(process.env.RELOADS || 0);
      for (let i = 0; i < reloads; i++) {
        console.log('--- RELOAD #' + (i+1) + ' (APP_STARTUP) ---');
        await page.reload({ waitUntil: 'load', timeout: 240000 });
        await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).catch(()=>{});
        await sleep(9000);
      }
      if (reloads) { await page.evaluate((j) => window.geckoEval(j), QUERY); await sleep(1500); }
    }
    console.log('--- open google.com (addTab default, like user) ---');
    await page.evaluate((j) => window.geckoEval(j), `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var t=gBrowser.addTab('https://www.google.com/',{triggeringPrincipal:sp,inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;}catch(e){console.error('PROC naverr '+e);}},0);`);
    await sleep(8000);
    await page.evaluate((j) => window.geckoEval(j), TABQ);
    await sleep(3000);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
