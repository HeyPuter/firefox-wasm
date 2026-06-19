// Faithful end-to-end test of the user's scenario: a webRequest-blocking background
// extension that is ALREADY INSTALLED when the browser starts (startupReason=APP_STARTUP).
// Phase 1: permanently install it (getInstallForFile, no prompt). Phase 2: reload the
// page (the IDBFS /profile persists across reload in the same browser session, so the
// addon loads at APP_STARTUP), then load example.com. Pre-fix: the background never
// builds (gated on browserStartupPromise) and the primed webRequest listener hangs
// every request -> no tab loads. Post-fix: background builds, site loads.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { execFileSync } = require('child_process');
const { server } = require('./server.cjs');
const PORT = 8995;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Build the XPI (zip with manifest.json + b.js at root) into embed-chrome/ so the
// harness server can serve it.
function buildXpi() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbgxpi-'));
  const usePage = process.env.BGPAGE === '1';   // mimic uBlock: real background.html page
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
    manifest_version: 2, name: "AppStartupBG", version: "1.0",
    browser_specific_settings: { gecko: { id: "appstartupbg@local" } },
    permissions: ["webRequest", "webRequestBlocking", "<all_urls>"],
    background: usePage ? { page: "background.html", persistent: true } : { scripts: ["b.js"], persistent: true },
  }));
  fs.writeFileSync(path.join(dir, 'b.js'),
    `console.error("APPBG background started");
     browser.webRequest.onBeforeRequest.addListener((d)=>({}),{urls:["<all_urls>"]},["blocking"]);
     console.error("APPBG webRequest listener registered");`);
  fs.writeFileSync(path.join(dir, 'background.html'),
    `<!doctype html><meta charset=utf-8><title>bg</title><script src="b.js"></script>`);
  const xpi = path.join(__dirname, 'appstartupbg.xpi');
  try { fs.unlinkSync(xpi); } catch {}
  execFileSync('zip', ['-j', xpi, path.join(dir, 'manifest.json'), path.join(dir, 'b.js'), path.join(dir, 'background.html')]);
  return xpi;
}

const INSTALL_PERMANENT = `
(async () => {
  try {
    const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
    if (!AddonManager.isReady) { try { await AddonManager.readyPromise; } catch (e) {} }
    const resp = await fetch("http://127.0.0.1:${PORT}/appstartupbg.xpi");
    const buf = new Uint8Array(await resp.arrayBuffer());
    await IOUtils.write("/appstartupbg.xpi", buf);
    const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    f.initWithPath("/appstartupbg.xpi");
    const install = await AddonManager.getInstallForFile(f, "application/x-xpinstall");
    install.addListener({
      onInstallEnded(i, addon){ console.error("APPBG INSTALL ENDED active="+addon.isActive+" id="+addon.id); },
      onInstallFailed(i){ console.error("APPBG INSTALL FAILED state="+i.state+" error="+i.error); },
    });
    await install.install();
    console.error("APPBG install() resolved state=" + install.state);
  } catch (e) { console.error("APPBG INSTALL ERR: " + (e && e.stack ? e.stack : e)); }
})();
`;

(async () => {
  buildXpi();
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const seen = [];
  page.on('console', m => {
    const t = m.text();
    if (/APPBG|DBGBG|disconnected|BackgroundViewLoaded|startupReason|browserStartupPromise|naverr/i.test(t)) { console.log('C| ' + t.slice(0,240)); seen.push(t); }
  });
  const url = `http://127.0.0.1:${PORT}/?gpu=1&glpass=1`;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 240000 });
    let ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('PHASE1 READY=' + ready); if (!ready) throw new Error('not ready');
    await sleep(8000);
    console.log('PHASE1 install permanent extension');
    await page.evaluate((j) => window.geckoEval(j), INSTALL_PERMANENT);
    await sleep(12000);   // let install finish + IDBFS timer sync

    console.log('=== RELOAD (engine restart; addon should load at APP_STARTUP) ===');
    seen.length = 0;
    await page.reload({ waitUntil: 'load', timeout: 240000 });   // pagehide -> syncfs(false) persists profile
    ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('PHASE2 READY=' + ready); if (!ready) throw new Error('not ready after reload');
    await sleep(10000);   // let AddonManager start the addon at APP_STARTUP + background build

    console.log('PHASE2 load example.com');
    await page.evaluate((j) => window.geckoEval(j), `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var t=gBrowser.addTab('http://example.com/',{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;}catch(e){console.error('naverr '+e);}},0);`);
    await sleep(18000);
    await page.screenshot({ path: require('path').join(__dirname, 'appstartup-ext-test.png') }).catch(()=>{});
    const appStartup = seen.some(t => /startupReason=APP_STARTUP/.test(t) && /appstartupbg/.test(t));
    const built = seen.some(t => /BackgroundPage.build context loaded = true/.test(t));
    const disconnect = seen.some(t => /disconnected before receiving Extension:BackgroundViewLoaded/.test(t));
    console.log('RESULT sawAppStartupEntry=' + appStartup + ' bgBuilt=' + built + ' disconnect=' + disconnect);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
