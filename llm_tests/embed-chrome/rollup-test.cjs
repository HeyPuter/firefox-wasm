const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = 8958;
const LOAD = `setTimeout(function(){ try { var sp=Services.scriptSecurityManager.getSystemPrincipal();
  var t=gBrowser.addTab("data:text/html,<body style='margin:0;background:%23eef'><h1>menu rollup test</h1></body>",{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});
  gBrowser.selectedTab=t; void t.linkedBrowser.docShell; }catch(e){console.error("loaderr "+e);} },0);`;
const COUNT = `(function(){ var n=[...document.querySelectorAll("menupopup,panel")].filter(p=>p.state==="open"||p.state==="showing").length; console.error("OPEN_POPUPS="+n); })();`;
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--remote-debugging-port=9378'] });
  const stop = await startCDPCapture(9378, (l) => { if (/OPEN_POPUPS|round css|ownerDoc/i.test(l) && !/setsockopt/.test(l)) console.log(l.slice(0,200)); });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await page.waitForFunction(() => document.getElementById('loader').classList.contains('hidden'), { timeout: 120000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.evaluate((js)=>window.geckoEval(js), LOAD);
    await new Promise(r => setTimeout(r, 9000));
    // open context menu at (300,300)
    await page.evaluate(()=>window.geckoInput({op:1,evType:0,x:300,y:300,buttons:0}));
    await page.evaluate(()=>window.geckoInput({op:1,evType:3,x:300,y:300,button:2,buttons:0,clickCount:1}));
    await new Promise(r => setTimeout(r, 3500));
    await page.evaluate((js)=>window.geckoEval(js), COUNT);
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: require('path').join(__dirname, 'rollup-open.png') });
    // click OFF the menu at (900,600)
    await page.evaluate(()=>window.geckoInput({op:1,evType:1,x:900,y:600,button:0,buttons:1,clickCount:1}));
    await page.evaluate(()=>window.geckoInput({op:1,evType:2,x:900,y:600,button:0,buttons:0,clickCount:1}));
    await new Promise(r => setTimeout(r, 2500));
    await page.evaluate((js)=>window.geckoEval(js), COUNT);
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: require('path').join(__dirname, 'rollup-closed.png') });
    console.log('screenshots -> rollup-open.png, rollup-closed.png');
  } catch(e){ console.log('exc', e.message); }
  finally { try{stop();}catch{} await browser.close(); server.close(); } process.exit(0);
})();
