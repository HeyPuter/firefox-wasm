// Verify GPU-mode resize no longer throws InvalidStateError and the chrome reflows.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 9007;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  let invalidState = 0;
  const note = (t) => { if (/InvalidStateError|transferControlToOffscreen|Cannot resize canvas/i.test(t)) { invalidState++; console.log('C| ' + t.slice(0,160)); } };
  page.on('console', m => note(m.text()));
  page.on('pageerror', e => note(String(e)));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    const ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready); if (!ready) throw new Error('not ready');
    await sleep(6000);
    console.log('RESIZE 1100x760 -> 820x600');
    await page.setViewportSize({ width: 820, height: 600 }); await sleep(5000);
    await page.screenshot({ path: require('path').join(__dirname, 'resize-gpu-a.png') }).catch(()=>{});
    console.log('RESIZE 820x600 -> 1320x900');
    await page.setViewportSize({ width: 1320, height: 900 }); await sleep(5000);
    await page.screenshot({ path: require('path').join(__dirname, 'resize-gpu-b.png') }).catch(()=>{});
    console.log('RESULT invalidStateErrors=' + invalidState);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
