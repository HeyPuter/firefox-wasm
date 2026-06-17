const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 8981;
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('console', m => { const t=m.text(); if (/ABORT|RuntimeError|MOZ_CRASH|shader|gldummy/i.test(t)) console.log('C|'+t.slice(0,150)); });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 120000 });
    const redpng = await page.evaluate(() => { const c=document.createElement('canvas'); c.width=c.height=16; const x=c.getContext('2d'); x.fillStyle='rgb(255,0,0)'; x.fillRect(0,0,16,16); return c.toDataURL('image/png'); });
    const html = `<body style='margin:0;background:rgb(255,255,255)'>`+
      `<img src='${redpng}' width='300' height='150' style='display:block'>`+
      `<div style='width:300px;height:90px;background:rgb(0,170,0)'></div>`+
      `<div style='width:300px;height:90px;background:linear-gradient(90deg,rgb(255,230,0),rgb(0,120,255))'></div>`+
      `</body>`;
    await page.evaluate((u)=>window.geckoRender(u), 'data:text/html,'+encodeURIComponent(html));
    await new Promise(r => setTimeout(r, 9000));
    await page.screenshot({ path: require('path').join(__dirname, 'gpu-bgr.png') });
    console.log('BGR screenshot -> gpu-bgr.png');
  } catch(e){ console.log('exc', e.message); }
  finally { await browser.close(); server.close(); } process.exit(0);
})();
