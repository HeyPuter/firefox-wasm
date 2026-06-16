// Verify popups render correctly in GPU mode (overlay canvas), no canvas fight.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = 8964;
const LOAD = `setTimeout(function(){ try { var sp=Services.scriptSecurityManager.getSystemPrincipal();
  var t=gBrowser.addTab("data:text/html,<body style='margin:0;background:%23207d32'><h1 style='color:white;font-family:sans-serif'>gpu popup test</h1></body>",{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});
  gBrowser.selectedTab=t; void t.linkedBrowser.docShell; }catch(e){console.error("LOAD err "+e);} },0);`;
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--remote-debugging-port=9384','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  let sawSWGL = false;
  const stop = await startCDPCapture(9384, (l) => {
    if (/RenderCompositorSWGL|GFX1-|mapping default framebuffer/.test(l)) { sawSWGL = true; console.log('SWGLERR:', l.slice(0,150)); }
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await new Promise(r => setTimeout(r, 14000));
    await page.evaluate((js)=>window.geckoEval(js), LOAD);
    await new Promise(r => setTimeout(r, 9000));
    // open context menu at (300,300)
    await page.evaluate(()=>window.geckoInput({op:1,evType:0,x:300,y:300,buttons:0}));
    await page.evaluate(()=>window.geckoInput({op:1,evType:3,x:300,y:300,button:2,buttons:0,clickCount:1}));
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: require('path').join(__dirname, 'gpu-popup-open.png') });
    console.log('opened menu -> gpu-popup-open.png');
    // click off at (900,600) to dismiss
    await page.evaluate(()=>window.geckoInput({op:1,evType:1,x:900,y:600,button:0,buttons:1,clickCount:1}));
    await page.evaluate(()=>window.geckoInput({op:1,evType:2,x:900,y:600,button:0,buttons:0,clickCount:1}));
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: require('path').join(__dirname, 'gpu-popup-closed.png') });
    console.log('dismissed -> gpu-popup-closed.png ; sawSWGLerror=' + sawSWGL);
  } catch(e){ console.log('exc', e.message); }
  finally { try{stop();}catch{} await browser.close(); server.close(); } process.exit(0);
})();
