// Reproduce the process-switch failure: open an EXTENSION page (moz-extension://),
// which prefers the "extension" content process -> process switch -> socketpair ->
// "Failed to launch tab subprocess" -> load fails. This is the same mechanism as
// the user's stuck web navigations + "clicking the extension fails".
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 9003;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Install a trivial MV2 extension with an options page, then open that page in a tab.
const INSTALL = `
(async () => { try {
  const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
  if (!AddonManager.isReady) { try { await AddonManager.readyPromise; } catch (e) {} }
  await IOUtils.makeDirectory("/ep", { ignoreExisting: true });
  await IOUtils.writeUTF8("/ep/manifest.json", JSON.stringify({
    manifest_version: 2, name: "EPTest", version: "1.0",
    browser_specific_settings: { gecko: { id: "eptest@local" } },
    options_ui: { page: "opt.html" },
    background: { scripts: ["b.js"], persistent: true } }));
  await IOUtils.writeUTF8("/ep/opt.html", "<!doctype html><meta charset=utf-8><title>OPT</title><body style='background:#0a0'><h1>EXT OPTIONS PAGE OK</h1>");
  await IOUtils.writeUTF8("/ep/b.js", "browser.runtime.onMessage.addListener(()=>{});");
  const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  f.initWithPath("/ep");
  const addon = await AddonManager.installTemporaryAddon(f);
  const policy = WebExtensionPolicy.getByID("eptest@local");
  const base = policy ? policy.getURL("") : "(no policy)";
  console.error("EP INSTALLED active=" + addon.isActive + " base=" + base);
  globalThis.__epBase = base;
} catch(e){ console.error("EP INSTALL ERR " + (e&&e.stack||e)); } })();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  let subproc = 0;
  page.on('console', m => {
    const t = m.text();
    if (/EP |subprocess|socketpair|Failed to launch|fixupAndLoadURI|DIAG|process switch|moz-extension/i.test(t)) console.log('C| ' + t.slice(0,220));
    if (/Failed to launch tab subprocess|socketpair/i.test(t)) subproc++;
  });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    const ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready); if (!ready) throw new Error('not ready');
    await sleep(7000);
    console.log('STEP install ext');
    await page.evaluate((j) => window.geckoEval(j), INSTALL);
    await sleep(8000);
    console.log('STEP open the extension options page in a tab');
    await page.evaluate((j) => window.geckoEval(j), `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var url=(WebExtensionPolicy.getByID('eptest@local').getURL('opt.html'));console.error('EP opening '+url);var t=gBrowser.addTab(url,{triggeringPrincipal:sp,inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;}catch(e){console.error('EP naverr '+e);}},0);`);
    await sleep(12000);
    // probe the tab
    await page.evaluate((j) => window.geckoEval(j), "var b=gBrowser.selectedBrowser;console.error('DIAG isRemote='+b.isRemoteBrowser+' type='+b.remoteType+' uri='+(b.currentURI&&b.currentURI.spec));");
    await sleep(3000);
    await page.screenshot({ path: require('path').join(__dirname, 'extpage-test.png') }).catch(()=>{});
    console.log('RESULT subprocLaunches=' + subproc);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
