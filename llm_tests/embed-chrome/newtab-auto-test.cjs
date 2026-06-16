const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = 8967;
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--remote-debugging-port=9387','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  let mapErr = false, redirErr = false;
  const stop = await startCDPCapture(9387, (l) => {
    if (/AboutNewTabResourceMapping\.init/.test(l)) { mapErr = true; console.log('MAPINITLOG:', l.slice(0,160)); }
    if (/AboutNewTabRedirector.*NS_ERROR_NOT_AVAILABLE|newChannelFromURIWithLoadInfo/.test(l)) { redirErr = true; console.log('REDIRERR:', l.slice(0,160)); }
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await new Promise(r => setTimeout(r, 16000));  // let the initial New Tab settle
    await page.screenshot({ path: require('path').join(__dirname, 'newtab-auto.png') });
    console.log('screenshot -> newtab-auto.png ; sawRedirectorError=' + redirErr);
  } catch(e){ console.log('exc', e.message); }
  finally { try{stop();}catch{} await browser.close(); server.close(); } process.exit(0);
})();
