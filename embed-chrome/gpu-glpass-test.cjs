const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 8984;
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('console', m => { const t=m.text(); if (/WEBGL|gldummy|ABORT|RuntimeError|passthrough/i.test(t)) console.log('C|'+t.slice(0,160)); });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 200000 });
    const ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 120000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready); if (!ready) { await browser.close(); server.close(); process.exit(0); }
    await new Promise(r => setTimeout(r, 4000));
    const content = `<body style='margin:0;font-family:sans-serif'><script>`+
      `var c=document.createElement('canvas');c.width=300;c.height=180;c.style.display='block';document.body.appendChild(c);`+
      `var gl=c.getContext('webgl2')||c.getContext('webgl');`+
      `document.body.style.background = gl ? 'rgb(0,160,0)' : 'rgb(210,0,0)';`+
      `var h=document.createElement('h1');h.style.color='white';h.textContent = gl ? ('WEBGL OK '+gl.getParameter(gl.VERSION)) : 'NO WEBGL';document.body.insertBefore(h,c);`+
      `if(gl){gl.clearColor(0,0,1,1);gl.clear(gl.COLOR_BUFFER_BIT);}`+
      `<\\/script></body>`;
    const evalStr = `setTimeout(function(){try{var sp=Services.scriptSecurityManager.getSystemPrincipal();var t=gBrowser.addTab("data:text/html,"+encodeURIComponent(${JSON.stringify(content)}),{triggeringPrincipal:sp,forceNotRemote:true,inBackground:false});gBrowser.selectedTab=t;void t.linkedBrowser.docShell;}catch(e){console.error("err "+e);}},0);`;
    await page.evaluate((js)=>window.geckoEval(js), evalStr);
    await new Promise(r => setTimeout(r, 12000));
    await page.screenshot({ path: require('path').join(__dirname, 'gpu-glpass.png') });
    console.log('screenshot -> gpu-glpass.png');
  } catch(e){ console.log('exc', e.message); }
  finally { await browser.close(); server.close(); } process.exit(0);
})();
