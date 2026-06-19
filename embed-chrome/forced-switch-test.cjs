// Verify the MaybeTriggerProcessSwitch fix: force a navigation to want a "web"
// content process via remoteTypeOverride. Pre-fix this would attempt a content
// subprocess (socketpair -> "Failed to launch tab subprocess" -> about:blank).
// Post-fix the switch is suppressed and the page loads in-process.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 9005;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  let subproc = 0;
  page.on('console', m => { const t = m.text(); if (/DIAG|FSW|socketpair|Failed to launch|subprocess|fixup/i.test(t)) console.log('C| '+t.slice(0,220)); if (/Failed to launch tab subprocess|socketpair/i.test(t)) subproc++; });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    const ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready); if (!ready) throw new Error('not ready');
    await sleep(7000);
    // Navigate the current tab to example.com but FORCE remoteType "web" (would trigger a process switch).
    console.log('STEP navigate with remoteTypeOverride=web');
    await page.evaluate((j) => window.geckoEval(j), `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var b=gBrowser.selectedBrowser;b.fixupAndLoadURIString('http://example.com/',{triggeringPrincipal:sp,remoteTypeOverride:'web'});console.error('FSW load issued');}catch(e){console.error('FSW naverr '+e);}},0);`);
    await sleep(15000);
    await page.evaluate((j) => window.geckoEval(j), "var b=gBrowser.selectedBrowser;console.error('DIAG isRemote='+b.isRemoteBrowser+' type='+b.remoteType+' uri='+(b.currentURI&&b.currentURI.spec));");
    await sleep(3000);
    await page.screenshot({ path: require('path').join(__dirname, 'forced-switch.png') }).catch(()=>{});
    console.log('RESULT subprocLaunches=' + subproc);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
