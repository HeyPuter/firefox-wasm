// Verify the text caret renders in a focused <input>. Render an empty borderless
// white input, count dark pixels in its interior before focus (~0) vs after a
// click focuses it (the solid caret adds dark pixels).
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8937);

const HTML =
  '<body style="margin:0;background:#fff">' +
  '<input id=t style="position:absolute;left:40px;top:40px;width:300px;height:40px;' +
  'font-size:24px;border:none;outline:none;background:#fff;color:#000">' +
  '</body>';
const PAGE = 'data:text/html,' + encodeURIComponent(HTML);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--remote-debugging-port=9355'] });
  const stop = await startCDPCapture(9355, () => {});
  const p = await b.newPage();
  // count dark pixels in input interior (x 44..330, y 46..74)
  const darkCount = () => p.evaluate(() => {
    const c = document.getElementById('screen');
    const d = c.getContext('2d').getImageData(38, 44, 304, 34).data;  // include input's left edge (caret sits there)
    let n = 0; for (let i = 0; i + 3 < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 400) n++;
    return n;
  });
  const mouse = (evType, x, y) => p.evaluate((a) => window.geckoInput({ op: 1, evType: a.evType, x: a.x, y: a.y, button: 0, buttons: a.evType === 1 ? 1 : 0, clickCount: 1 }), { evType, x, y });
  try {
    await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await p.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await p.evaluate((u) => window.geckoRender(u), PAGE);
    const before = await darkCount();
    await mouse(1, 50, 60); await mouse(2, 50, 60);   // click into the input -> focus + caret
    await new Promise((r) => setTimeout(r, 300));
    await p.evaluate(() => window.geckoInput({ op: 4 }));  // force a repaint
    const after = await darkCount();
    await p.screenshot({ path: '/tmp/caret.png', fullPage: true });
    const ok = before < 5 && after >= 5;
    console.log(`caret: darkPx before-focus=${before}  after-focus=${after}  ${ok ? 'CARET-OK' : 'FAIL'}`);
    console.log(ok ? 'CARET_OK' : 'CARET_FAIL');
  } catch (e) { console.log('CARET_FAIL exception', e.message); }
  finally { try { stop(); } catch (e) {} await b.close(); server.close(); process.exit(0); }
})();
