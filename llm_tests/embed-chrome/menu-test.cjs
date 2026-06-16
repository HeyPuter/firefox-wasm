// Test whether chrome popups render: open the app menu (hamburger) via the
// front-end and check (a) it opens, (b) it paints onto the canvas.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8945);

// Open two popups: one with an explicit-size HTML div (isolates "popup reflow
// works"), one with a real menuitem (isolates "menuitem content measures").
const OPEN_MENU = `
(function () {
  try {
    var mp1 = document.createXULElement("menupopup");
    var d = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    d.setAttribute("style", "width:300px;height:200px;background:#c00");
    mp1.appendChild(d);
    document.documentElement.appendChild(mp1);
    mp1.openPopup(document.documentElement, "overlap", 150, 150, false, false);

    var mp2 = document.createXULElement("menupopup");
    var mi = document.createXULElement("menuitem");
    mi.setAttribute("label", "Embed Test Item");
    mp2.appendChild(mi);
    document.documentElement.appendChild(mp2);
    mp2.openPopup(document.documentElement, "overlap", 600, 150, false, false);

    setTimeout(() => {
      var r1 = mp1.getBoundingClientRect(), r2 = mp2.getBoundingClientRect();
      console.error("POPUP div state=" + mp1.state + " rect=" + Math.round(r1.width) + "x" + Math.round(r1.height));
      console.error("POPUP menuitem state=" + mp2.state + " rect=" + Math.round(r2.width) + "x" + Math.round(r2.height));
    }, 1200);
  } catch (e) { console.error("POPUP err=" + (e && e.stack || e)); }
})();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--remote-debugging-port=9365'] });
  const stopCdp = await startCDPCapture(9365, (l) => {
    if (!/setsockopt|CSM |fluent|moz-support/.test(l)) console.log('  ' + l.slice(0, 300));
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('  [PAGEERROR] ' + ((e.stack||e.message)+'').slice(0,200)));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await new Promise((r) => setTimeout(r, 12000));
    console.log('[test] opening app menu...');
    await page.evaluate((js) => window.geckoEval(js), OPEN_MENU);
    await new Promise((r) => setTimeout(r, 6000));
    await page.screenshot({ path: require('path').join(__dirname, 'menu-test.png'), fullPage: true });
    console.log('[test] screenshot -> embed-chrome/menu-test.png');
  } catch (e) { console.log('[test] exception:', e && e.message ? e.message : e); }
  finally { try { stopCdp(); } catch {} await browser.close(); server.close(); }
  process.exit(0);
})();
