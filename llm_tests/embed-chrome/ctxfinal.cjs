const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = 8957;
const LOAD = `setTimeout(function(){ try { var sp=Services.scriptSecurityManager.getSystemPrincipal();
  var t=gBrowser.addTab("data:text/html,<body style='margin:0;background:%23dfe'><h1>Right-click test</h1><p>select me</p></body>",{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});
  gBrowser.selectedTab=t; void t.linkedBrowser.docShell; }catch(e){console.error("loaderr "+e);} },0);`;
const CHK = `(function(){ try { var a=gBrowser.selectedBrowser.browsingContext.currentWindowGlobal.getActor("ContextMenu"); console.error("CTX actor registered=" + !!a); }catch(e){ console.error("CTX actor FAIL: "+(e&&e.message||e)); } })();`;
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--remote-debugging-port=9377'] });
  const stop = await startCDPCapture(9377, (l) => { if (/CTX |ContextMenu.sys.mjs|defaultView|ownerDoc|loaderr|registered desktop/i.test(l) && !/setsockopt/.test(l)) console.log(l.slice(0,260)); });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await page.waitForFunction(() => document.getElementById('loader').classList.contains('hidden'), { timeout: 120000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.evaluate((js)=>window.geckoEval(js), LOAD);
    await new Promise(r => setTimeout(r, 10000));
    await page.evaluate((js)=>window.geckoEval(js), CHK);
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(()=>window.geckoInput({op:1,evType:0,x:300,y:300,buttons:0}));
    await page.evaluate(()=>window.geckoInput({op:1,evType:3,x:300,y:300,button:2,buttons:0,clickCount:1}));
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: require('path').join(__dirname, 'ctxfinal.png') });
    console.log('screenshot -> ctxfinal.png');
  } catch(e){ console.log('exc', e.message); }
  finally { try{stop();}catch{} await browser.close(); server.close(); } process.exit(0);
})();
