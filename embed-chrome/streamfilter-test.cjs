// Probe whether webRequest.filterResponseData (StreamFilter) hangs page loads.
// A minimal MV2 ext registers a PASS-THROUGH StreamFilter on main_frame; if the
// StreamFilter infra doesn't deliver ondata/onstop in this embedding, the document
// response is held forever -> "Waiting for ..." (which is what uBlock Origin does).
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 8999;
const USE_SF = process.env.NOSF !== '1';   // NOSF=1 -> plain blocking, no filterResponseData
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const bg = `
console.error("SFBG started use_sf=${USE_SF}");
browser.webRequest.onBeforeRequest.addListener((details) => {
  ${USE_SF ? `
  try {
    const f = browser.webRequest.filterResponseData(details.requestId);
    f.ondata = (e) => { console.error("SFBG ondata " + e.data.byteLength); f.write(e.data); };
    f.onstop = () => { console.error("SFBG onstop"); f.disconnect(); };
    f.onerror = () => { console.error("SFBG onerror " + f.error); };
    console.error("SFBG filterResponseData attached for " + details.url);
  } catch(e){ console.error("SFBG filter err " + e); }
  ` : `console.error("SFBG saw " + details.url);`}
  return {};
}, { urls: ["<all_urls>"], types: ["main_frame"] }, ["blocking"]);
console.error("SFBG listener registered");
`;

const INSTALL = `
(async () => {
  try {
    const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
    if (!AddonManager.isReady) { try { await AddonManager.readyPromise; } catch (e) {} }
    await IOUtils.makeDirectory("/sfext", { ignoreExisting: true });
    await IOUtils.writeUTF8("/sfext/manifest.json", JSON.stringify({
      manifest_version: 2, name: "SFTest", version: "1.0",
      browser_specific_settings: { gecko: { id: "sftest@local" } },
      permissions: ["webRequest","webRequestBlocking","<all_urls>"],
      background: { scripts: ["b.js"], persistent: true } }));
    await IOUtils.writeUTF8("/sfext/b.js", ${JSON.stringify(bg)});
    const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    f.initWithPath("/sfext");
    const addon = await AddonManager.installTemporaryAddon(f);
    console.error("SFBG INSTALLED active=" + addon.isActive);
  } catch (e) { console.error("SFBG INSTALL ERR: " + (e && e.stack ? e.stack : e)); }
})();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('console', m => { const t = m.text(); if (/SFBG|StreamFilter|Waiting|example/i.test(t)) console.log('C| ' + t.slice(0,200)); });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    const ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready + ' USE_SF=' + USE_SF); if (!ready) throw new Error('not ready');
    await sleep(7000);
    console.log('STEP install StreamFilter ext');
    await page.evaluate((j) => window.geckoEval(j), INSTALL);
    await sleep(8000);
    const NT = process.env.NEWTAB === '1';
    console.log('STEP load example.com (' + (NT?'NEW tab then navigate':'forceNotRemote') + ')');
    if (NT) {
      await page.evaluate((j) => window.geckoEval(j), `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var t=gBrowser.addTab('about:newtab',{triggeringPrincipal:sp,inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;setTimeout(function(){gBrowser.selectedBrowser.fixupAndLoadURIString('http://example.com/',{triggeringPrincipal:sp});},2500);}catch(e){console.error('naverr '+e);}},0);`);
    } else {
      await page.evaluate((j) => window.geckoEval(j), `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var t=gBrowser.addTab('http://example.com/',{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;}catch(e){console.error('naverr '+e);}},0);`);
    }
    await sleep(20000);
    await page.screenshot({ path: require('path').join(__dirname, `streamfilter-${USE_SF?'on':'off'}.png`) }).catch(()=>{});
    console.log('done');
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
