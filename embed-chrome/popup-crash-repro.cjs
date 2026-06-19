// Repro: GPU-mode popup memory corruption.
// Sequence: open app menu, close it, load about:preferences, open app menu again -> crash (gpu=1 only).
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 8987;
const GPU = process.env.GPU_MODE === '0' ? '0' : '1';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  let crashed = false, lastErr = '';
  page.on('console', m => {
    const t = m.text();
    if (/ABORT|RuntimeError|unreachable|out of bounds|memory access|Aborted|MOZ_CRASH|segfault|popupcrash/i.test(t)) {
      console.log('C| ' + t.slice(0, 240));
      if (/ABORT|RuntimeError|unreachable|out of bounds|memory access|Aborted|MOZ_CRASH/i.test(t)) { crashed = true; lastErr = t; }
    }
  });
  page.on('pageerror', e => { console.log('PAGEERR| ' + String(e).slice(0,240)); });

  const evalIn = async (js) => page.evaluate((j) => window.geckoEval(j), js);
  // returns a value from the chrome global (op=5)
  const evalRet = async (js) => {
    try { return await page.evaluate((j) => window.geckoEval(j), `(function(){try{return String(${js})}catch(e){return 'EXC:'+e}})()`); }
    catch (e) { return 'NORESP:' + e.message; }
  };

  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=${GPU}`, { waitUntil: 'load', timeout: 200000 });
    const ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 150000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready + ' GPU=' + GPU);
    if (!ready) { await browser.close(); server.close(); process.exit(0); }
    await sleep(6000);

    console.log('STEP open#1');
    await evalIn(`PanelUI.show();`);
    await sleep(2500);
    console.log('STEP close#1');
    await evalIn(`PanelUI.hide();`);
    await sleep(2000);

    console.log('STEP load about:preferences');
    await evalIn(`setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var t=gBrowser.addTab('about:preferences',{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;}catch(e){console.error('naverr '+e);}},0);`);
    await sleep(6000);

    console.log('STEP open#2 (expected crash)');
    await evalIn(`PanelUI.show();`);
    await sleep(3000);

    // liveness check
    const alive = await evalRet(`(1+1)`);
    console.log('LIVENESS after open#2 = ' + alive);
    await page.screenshot({ path: require('path').join(__dirname, `popup-crash-gpu${GPU}.png`) }).catch(()=>{});
    console.log('CRASHED=' + crashed + (lastErr ? (' :: ' + lastErr.slice(0,160)) : ''));
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
