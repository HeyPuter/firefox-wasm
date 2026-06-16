// Verify the chrome build composites via HARDWARE WebRender (not SWGL) under gpu=1.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = 8963;
const Q = `(function(){ try {
  console.error("LMT=" + window.windowUtils.layerManagerType);
} catch(e){ console.error("LMT err "+e); } })();`;
const LOAD = `setTimeout(function(){ try { var sp=Services.scriptSecurityManager.getSystemPrincipal();
  var t=gBrowser.addTab("data:text/html,<body style='margin:0;background:%23207d32'><h1 style='color:white;font-family:sans-serif'>GPU CHROME OK</h1><div style='width:200px;height:120px;background:%23d22'></div></body>",{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});
  gBrowser.selectedTab=t; void t.linkedBrowser.docShell; }catch(e){console.error("LOAD err "+e);} },0);`;
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--remote-debugging-port=9383','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  let sawSWGL = false;
  const stop = await startCDPCapture(9383, (l) => {
    if (/RenderCompositorSWGL|GFX1-|mapping default framebuffer/.test(l)) { sawSWGL = true; console.log('SWGLERR:', l.slice(0,180)); }
    if (/LMT=/.test(l)) console.log(l.slice(0,160));
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await new Promise(r => setTimeout(r, 14000));
    await page.evaluate((js)=>window.geckoEval(js), Q);
    await page.evaluate((js)=>window.geckoEval(js), LOAD);
    await new Promise(r => setTimeout(r, 12000));
    await page.screenshot({ path: require('path').join(__dirname, 'gpu-chrome.png') });
    console.log('screenshot -> gpu-chrome.png ; sawSWGLerror=' + sawSWGL);
  } catch(e){ console.log('exc', e.message); }
  finally { try{stop();}catch{} await browser.close(); server.close(); } process.exit(0);
})();
