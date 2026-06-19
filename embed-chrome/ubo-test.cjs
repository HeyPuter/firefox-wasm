// Reproduce the real uBlock Origin failure: install it permanently, watch its
// background page load (Message manager disconnected?), then load a site.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 8997;
const RELOAD = process.env.RELOAD === '1';
const NOFIX = process.env.NOEXTBG === '1';   // disable the background-startup fix (A/B)
const QS = `?gpu=1&glpass=1${NOFIX ? '&noextbg' : ''}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
    install.addListener({
      onInstallEnded(i, addon){ console.error("UBO INSTALL ENDED active="+addon.isActive+" id="+addon.id+" v="+addon.version); },
      onInstallFailed(i){ console.error("UBO INSTALL FAILED state="+i.state+" error="+i.error); },
    });
    await install.install();
    console.error("UBO install() resolved state=" + install.state);
  } catch (e) { console.error("UBO INSTALL ERR: " + (e && e.stack ? e.stack : e)); }
})();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  let disc = 0;
  page.on('console', m => {
    const t = m.text();
    if (/UBO |disconnect|BackgroundViewLoaded|uBlock|moz-extension|unsupported syscall|abort|Aborted|RuntimeError|unreachable|NS_ERROR|MOZ_CRASH|StreamFilter|webRequest|process|frameLoader|out of bounds|ext-bg-startup|ext startup notify|ublockorigin/i.test(t)) {
      console.log('C| ' + t.slice(0, 260));
    }
    if (/disconnected before receiving Extension:BackgroundViewLoaded/.test(t)) disc++;
  });
  page.on('pageerror', e => console.log('PAGEERR| ' + String(e).slice(0,200)));
  try {
    console.log('QS=' + QS);
    await page.goto(`http://127.0.0.1:${PORT}/${QS}`, { waitUntil: 'load', timeout: 240000 });
    let ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready); if (!ready) throw new Error('not ready');
    await sleep(8000);
    console.log('STEP install uBlock Origin');
    await page.evaluate((j) => window.geckoEval(j), INSTALL);
    await sleep(20000);   // uBlock background is heavy; give it time

    if (RELOAD) {
      console.log('=== RELOAD (APP_STARTUP) ===');
      await page.reload({ waitUntil: 'load', timeout: 240000 });
      ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
      console.log('PHASE2 READY=' + ready);
      await sleep(Number(process.env.SETTLE || 1200));   // race the background build: load a site ASAP
    }

    const SITE = process.env.SITE || 'http://example.com/';
    const FNR = process.env.NOFORCE === '1' ? '' : 'forceNotRemote:true,';
    if (process.env.NEWTAB === '1') {
      // Faithful chrome flow: open a NEW tab (about:newtab, default opts like the +
      // button), then navigate IT via the URL-bar mechanism (current-tab load).
      console.log('STEP open new tab then navigate -> ' + SITE);
      await page.evaluate((j) => window.geckoEval(j), `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var t=gBrowser.addTab('about:newtab',{triggeringPrincipal:sp,inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;setTimeout(function(){try{gBrowser.selectedBrowser.fixupAndLoadURIString(${JSON.stringify(SITE)},{triggeringPrincipal:sp});}catch(e){console.error('naverr2 '+e);}},2500);}catch(e){console.error('naverr '+e);}},0);`);
    } else if (process.env.CURTAB === '1') {
      // Faithful URL-bar flow: navigate the CURRENT (initial, non-remote) tab.
      console.log('STEP navigate current tab -> ' + SITE);
      await page.evaluate((j) => window.geckoEval(j), `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();gBrowser.selectedBrowser.fixupAndLoadURIString(${JSON.stringify(SITE)},{triggeringPrincipal:sp});}catch(e){console.error('naverr '+e);}},0);`);
    } else {
      console.log('STEP load ' + SITE + ' (FNR=' + (FNR?1:0) + ')');
      await page.evaluate((j) => window.geckoEval(j), `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var t=gBrowser.addTab(${JSON.stringify(SITE)},{triggeringPrincipal:sp,${FNR}inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;}catch(e){console.error('naverr '+e);}},0);`);
    }
    await sleep(30000);   // give the suspended request a long time to either resolve or hang
    await page.screenshot({ path: require('path').join(__dirname, 'ubo-test.png') }).catch(()=>{});
    console.log('RESULT disconnectCount=' + disc);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
