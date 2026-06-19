// Verify the WebExtension background-startup fix:
//  (1) ExtensionParent.browserStartupPromise / browserPaintedPromise are RESOLVED
//      at startup (the promises that gate APP_STARTUP background builds + primed
//      listener wakeups; they were pending forever before the fix).
//  (2) The notify didn't throw ("ext startup notify:" error absent).
//  (3) A webRequest-blocking background extension installed at runtime still lets
//      tabs load (no regression).
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 8993;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const CHECK_JS = `
(async () => {
  try {
    const { ExtensionParent } = ChromeUtils.importESModule('resource://gre/modules/ExtensionParent.sys.mjs');
    let s=false,p=false;
    ExtensionParent.browserStartupPromise.then(()=>{s=true;console.error('DBGCHK browserStartupPromise RESOLVED');});
    ExtensionParent.browserPaintedPromise.then(()=>{p=true;console.error('DBGCHK browserPaintedPromise RESOLVED');});
    await new Promise(r=>setTimeout(r,800));
    console.error('DBGCHK after-tick startupResolved='+s+' paintedResolved='+p);
  } catch(e){ console.error('DBGCHK ERR '+(e&&e.stack||e)); }
})();
`;

const bg = `console.error("VBG bg started");
try { browser.webRequest.onBeforeRequest.addListener((d)=>({}),{urls:["<all_urls>"]},["blocking"]);
  console.error("VBG webRequest registered"); } catch(e){ console.error("VBG err "+e); }`;

const INSTALL_JS = `
(async () => {
  try {
    const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
    if (!AddonManager.isReady) { try { await AddonManager.readyPromise; } catch (e) {} }
    await IOUtils.makeDirectory("/vbg", { ignoreExisting: true });
    await IOUtils.writeUTF8("/vbg/manifest.json", JSON.stringify({
      manifest_version: 2, name: "VBG", version: "1.0",
      browser_specific_settings: { gecko: { id: "vbg@local" } },
      permissions: ["webRequest","webRequestBlocking","<all_urls>"],
      background: { scripts: ["b.js"], persistent: true } }));
    await IOUtils.writeUTF8("/vbg/b.js", ${JSON.stringify(bg)});
    const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    f.initWithPath("/vbg");
    const addon = await AddonManager.installTemporaryAddon(f);
    console.error("VBG INSTALLED active=" + addon.isActive);
  } catch (e) { console.error("VBG INSTALL ERR: " + (e && e.stack ? e.stack : e)); }
})();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const seen = [];
  page.on('console', m => {
    const t = m.text();
    if (/DBGCHK|VBG |ext startup notify|disconnected|BackgroundViewLoaded/i.test(t)) { console.log('C| ' + t.slice(0,220)); seen.push(t); }
  });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    const ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready);
    if (!ready) { await browser.close(); server.close(); process.exit(0); }
    await sleep(8000);
    console.log('STEP check gating promises');
    await page.evaluate((j) => window.geckoEval(j), CHECK_JS);
    await sleep(2500);
    console.log('STEP install webRequest-blocking bg extension');
    await page.evaluate((j) => window.geckoEval(j), INSTALL_JS);
    await sleep(8000);
    console.log('STEP load example.com');
    await page.evaluate((j) => window.geckoEval(j), `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var t=gBrowser.addTab('http://example.com/',{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;}catch(e){console.error('naverr '+e);}},0);`);
    await sleep(15000);
    await page.screenshot({ path: require('path').join(__dirname, 'ext-startup-verify.png') }).catch(()=>{});
    const notifyErr = seen.some(t => /ext startup notify/i.test(t));
    const sResolved = seen.some(t => /browserStartupPromise RESOLVED/.test(t));
    const pResolved = seen.some(t => /browserPaintedPromise RESOLVED/.test(t));
    console.log('RESULT startupResolved=' + sResolved + ' paintedResolved=' + pResolved + ' notifyThrew=' + notifyErr);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
