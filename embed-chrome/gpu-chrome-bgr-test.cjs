const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 8983;
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('console', m => { const t=m.text(); if (/gldummy|ABORT|RuntimeError|could not find canvas/i.test(t)) console.log('C|'+t.slice(0,150)); });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1`, { waitUntil: 'load', timeout: 200000 });
    const ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 120000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready);
    if (!ready) { await browser.close(); server.close(); process.exit(0); }
    await new Promise(r => setTimeout(r, 4000));
    const redpng = await page.evaluate(() => { const c=document.createElement('canvas'); c.width=c.height=16; const x=c.getContext('2d'); x.fillStyle='rgb(255,0,0)'; x.fillRect(0,0,16,16); return c.toDataURL('image/png'); });
    const html = `<body style='margin:0;background:rgb(255,255,255)'><img src='${redpng}' width='250' height='150' style='display:block'><div style='width:250px;height:90px;background:rgb(0,170,0)'></div></body>`;
    const evalStr = `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var t=gBrowser.addTab("data:text/html,"+encodeURIComponent(${JSON.stringify(html)}),{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;}catch(e){console.error("err "+e);}},0);`;
    await page.evaluate((js)=>window.geckoEval(js), evalStr);
    await new Promise(r => setTimeout(r, 12000));
    await page.screenshot({ path: require('path').join(__dirname, 'gpu-chrome-bgr.png') });
    console.log('screenshot -> gpu-chrome-bgr.png');
  } catch(e){ console.log('exc', e.message); }
  finally { await browser.close(); server.close(); } process.exit(0);
})();
