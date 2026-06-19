// Repro: an extension with a BACKGROUND PAGE breaks tab loading.
// Installs a minimal MV2 extension with a background script (+ optional webRequest
// blocking listener, like uBlock) and a content script, then loads a site.
// Watches for "Message manager was disconnected before receiving
// Extension:BackgroundViewLoaded" and whether the background script ever runs.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 8991;
const WEBREQUEST = process.env.WR === '1';   // add a blocking webRequest listener
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const bg = `
console.error("BGEXT background script STARTED");
try {
  ${WEBREQUEST ? `
  browser.webRequest.onBeforeRequest.addListener(
    (d) => { console.error("BGEXT webRequest " + d.url); return {}; },
    { urls: ["<all_urls>"] }, ["blocking"]);
  console.error("BGEXT webRequest listener registered");` : ``}
  browser.runtime.onMessage.addListener(() => {});
  console.error("BGEXT background script READY");
} catch (e) { console.error("BGEXT bg error " + (e && e.stack || e)); }
`;

const INSTALL_JS = (perms) => `
(async () => {
  try {
    const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
    if (!AddonManager.isReady) { try { await AddonManager.readyPromise; } catch (e) {} }
    await IOUtils.makeDirectory("/bgext", { ignoreExisting: true });
    const manifest = {
      manifest_version: 2, name: "BgTest", version: "1.0",
      browser_specific_settings: { gecko: { id: "bgtest@local" } },
      permissions: ${JSON.stringify(perms)},
      background: { scripts: ["b.js"], persistent: true },
      content_scripts: [{ matches: ["<all_urls>"], js: ["c.js"], run_at: "document_start" }]
    };
    await IOUtils.writeUTF8("/bgext/manifest.json", JSON.stringify(manifest));
    await IOUtils.writeUTF8("/bgext/b.js", ${JSON.stringify(bg)});
    await IOUtils.writeUTF8("/bgext/c.js", "console.error('BGEXT content-script ran on '+location.href);");
    const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    f.initWithPath("/bgext");
    const addon = await AddonManager.installTemporaryAddon(f);
    console.error("BGEXT INSTALLED id=" + addon.id + " active=" + addon.isActive);
    globalThis.__bgOk = true;
  } catch (e) { console.error("BGEXT INSTALL ERROR: " + (e && e.stack ? e.stack : e)); globalThis.__bgOk = false; }
})();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const hits = { disconnect: 0, bgStart: 0, bgReady: 0, csRan: 0, wrReg: 0, wr: 0 };
  page.on('console', m => {
    const t = m.text();
    if (/DBGBG|BackgroundViewLoaded|disconnected|BGEXT|webRequest|ExtensionParent|Message manager|backgroundState|startupReason/i.test(t)) {
      console.log('C| ' + t.slice(0, 260));
    }
    if (/disconnected before receiving Extension:BackgroundViewLoaded/.test(t)) hits.disconnect++;
    if (/BGEXT background script STARTED/.test(t)) hits.bgStart++;
    if (/BGEXT background script READY/.test(t)) hits.bgReady++;
    if (/BGEXT content-script ran/.test(t)) hits.csRan++;
    if (/BGEXT webRequest listener registered/.test(t)) hits.wrReg++;
    if (/BGEXT webRequest http/.test(t)) hits.wr++;
  });

  const evalIn = (js) => page.evaluate((j) => window.geckoEval(j), js);
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    const ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready + ' WEBREQUEST=' + WEBREQUEST);
    if (!ready) { await browser.close(); server.close(); process.exit(0); }
    await sleep(8000);

    console.log('STEP install bg extension');
    const perms = WEBREQUEST ? ["webRequest","webRequestBlocking","<all_urls>"] : ["<all_urls>"];
    await evalIn(INSTALL_JS(perms));
    await sleep(8000);

    console.log('STEP open a tab to example.com');
    await evalIn(`setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var t=gBrowser.addTab('http://example.com/',{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;}catch(e){console.error('naverr '+e);}},0);`);
    await sleep(15000);

    // Did the page actually load? check the tab's document title/URL via chrome eval.
    const status = await page.evaluate((j) => window.geckoEval(j), `(function(){try{var b=gBrowser.selectedBrowser;return 'uri='+(b.currentURI&&b.currentURI.spec)+' title='+(b.contentTitle||'')+' docReady='+(b.docShell&&b.docShell.isLoadingDocument===false);}catch(e){return 'EXC:'+e}})()`);
    console.log('TAB STATUS = ' + status);
    await page.screenshot({ path: require('path').join(__dirname, `bgext-repro-wr${WEBREQUEST?1:0}.png`) }).catch(()=>{});
    console.log('HITS = ' + JSON.stringify(hits));
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
