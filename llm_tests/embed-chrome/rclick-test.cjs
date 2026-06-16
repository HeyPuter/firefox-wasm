// Real context-menu test: load the chrome, right-click the URL bar, and check a
// context menu opens + renders. Screenshots rclick.png.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8948);
const VW = 1280, VH = 800;

// Report any open popup (after the right-click).
const REPORT = `
(function(){
  var ps = [...document.querySelectorAll("menupopup, panel")]
    .filter(p => p.state === "open" || p.state === "showing");
  console.error("OPEN_POPUPS=" + ps.map(p => (p.id||p.tagName)).join(","));
  ps.forEach(p => { var r = p.getBoundingClientRect();
    console.error("  POPUP " + (p.id||p.tagName) + " state=" + p.state +
      " rect=" + Math.round(r.width) + "x" + Math.round(r.height)); });
})();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--remote-debugging-port=9366'] });
  const stopCdp = await startCDPCapture(9366, (l) => {
    if (/OPEN_POPUPS|POPUP |contextmenu|ContextMenu/i.test(l) && !/setsockopt/.test(l))
      console.log('  ' + l.slice(0, 240));
  });
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await page.waitForFunction(() => document.getElementById('loader').classList.contains('hidden'), { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 4000));
    // Right-click in the URL bar (toolbar row, ~y=64; field center ~x=640).
    const X = 640, Y = 64;
    console.log('[test] right-clicking urlbar at', X, Y);
    await page.evaluate(({x,y}) => window.geckoInput({ op: 1, evType: 0, x, y, buttons: 0 }), {x:X,y:Y});
    // contextmenu event (evType 3) -> opens the context menu
    await page.evaluate(({x,y}) => window.geckoInput({ op: 1, evType: 3, x, y, button: 2, buttons: 0, clickCount: 1 }), {x:X,y:Y});
    await new Promise((r) => setTimeout(r, 3000));
    await page.evaluate((js) => window.geckoEval(js), REPORT);
    await new Promise((r) => setTimeout(r, 3000));
    await page.screenshot({ path: require('path').join(__dirname, 'rclick.png') });
    console.log('[test] screenshot -> embed-chrome/rclick.png');
  } catch (e) { console.log('[test] exception:', e && e.message ? e.message : e); }
  finally { try { stopCdp(); } catch {} await browser.close(); server.close(); }
  process.exit(0);
})();
