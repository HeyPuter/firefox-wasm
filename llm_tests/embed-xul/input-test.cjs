// Verify mouse + keyboard + wheel input reach the rendered web content.
// Loads interactive data: pages via the page's own geckoRender, then injects raw
// events through window.geckoInput (same path real canvas events use) and asserts
// the canvas pixels react: a button click recolors a region, typing fires the
// input event (recolors the body), and a wheel scroll brings offscreen content in.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8931);  // avoid clashing with a running server.cjs

const DROP = /CSM (System|Privileg|ExtScript|ProtoSec|Triggering|Incoherent|Validate|CheckChannel|DoContent|FileScript)/;

// Interactive page: button recolors #box blue; typing recolors body yellow.
const HTML1 =
  '<body id=bd style="margin:0;background:#fff;font-family:sans-serif">' +
  '<div id=box style="position:absolute;left:0;top:0;width:800px;height:200px;background:#fff"></div>' +
  '<input id=t style="position:absolute;left:50px;top:250px;width:400px;height:40px;font-size:28px">' +
  '<button id=btn style="position:absolute;left:50px;top:320px;width:200px;height:60px;font-size:24px">go</button>' +
  '<script>btn.onclick=function(){box.style.background="rgb(0,128,255)"};' +
  't.addEventListener("input",function(){bd.style.background=t.value?"rgb(255,255,0)":"#fff"});</script>' +
  '</body>';
// Tall page for the wheel test: white top, green band 600..1200.
const HTML2 =
  '<body style="margin:0">' +
  '<div style="height:600px;background:#fff"></div>' +
  '<div style="height:600px;background:rgb(0,200,0)"></div>' +
  '</body>';
const P1 = 'data:text/html,' + encodeURIComponent(HTML1);
const P2 = 'data:text/html,' + encodeURIComponent(HTML2);

const close = (v, t, tol) => Math.abs(v - t) <= tol;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true,
    args: ['--no-sandbox', '--js-flags=--stack-trace-limit=30', '--remote-debugging-port=9347'] });
  const stopCdp = await startCDPCapture(9347, (l) => { if (!DROP.test(l)) console.log('  ' + l.slice(0, 600)); });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('  [PAGEERROR]', ((e.stack || e.message) + '').slice(0, 600)));

  // sample a canvas pixel -> [r,g,b]
  const sample = (x, y) => page.evaluate(([x, y]) => {
    const c = document.getElementById('screen');
    const d = c.getContext('2d').getImageData(x, y, 1, 1).data;
    return [d[0], d[1], d[2]];
  }, [x, y]);
  const mouse = (evType, x, y, buttons) => page.evaluate((a) =>
    window.geckoInput({ op: 1, evType: a.evType, x: a.x, y: a.y, button: 0, buttons: a.buttons, clickCount: 1 }), { evType, x, y, buttons });
  const click = async (x, y) => { await mouse(1, x, y, 1); await mouse(2, x, y, 0); };
  const typeStr = async (s) => {
    for (const ch of s) {
      await page.evaluate((c) => window.geckoInput({ op: 2, evType: 0, key: c, keyCode: c.toUpperCase().charCodeAt(0), charCode: c.codePointAt(0) }), ch);
      await page.evaluate((c) => window.geckoInput({ op: 2, evType: 1, key: c, keyCode: c.toUpperCase().charCodeAt(0) }), ch);
    }
  };
  const wheel = (x, y, dy) => page.evaluate((a) => window.geckoInput({ op: 3, x: a.x, y: a.y, deltaY: a.dy }), { x, y, dy });

  let pass = 0, fail = 0;
  const check = (name, ok, extra) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); ok ? pass++ : fail++; };

  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });

    // ---- mouse: click the button -> #box (top strip) turns blue ----
    console.log('[test] page 1: render + mouse + keyboard');
    await page.evaluate((u) => window.geckoRender(u), P1);
    const boxBefore = await sample(400, 100);
    await click(150, 350);               // on the button
    const boxAfter = await sample(400, 100);
    check('mouse click recolors region (box -> blue)',
      close(boxAfter[0], 0, 40) && close(boxAfter[1], 128, 50) && close(boxAfter[2], 255, 40),
      `before=${boxBefore} after=${boxAfter}`);

    // ---- keyboard: focus input, type -> input event recolors body yellow ----
    await click(250, 270);               // focus the input
    await typeStr('hello');
    const bg = await sample(700, 550);   // empty body area
    check('keyboard typing fires input (body -> yellow)',
      close(bg[0], 255, 30) && close(bg[1], 255, 30) && close(bg[2], 0, 40),
      `bodyPixel=${bg}`);

    // ---- wheel: scroll a tall page -> green band scrolls into view ----
    console.log('[test] page 2: wheel scroll');
    await page.evaluate((u) => window.geckoRender(u), P2);
    const centerBefore = await sample(400, 300);
    await wheel(400, 300, 650);
    await wheel(400, 300, 650);          // ensure we pass 600px
    const centerAfter = await sample(400, 300);
    check('wheel scroll brings green band into view',
      close(centerAfter[0], 0, 60) && close(centerAfter[1], 200, 70) && close(centerAfter[2], 0, 60),
      `before=${centerBefore} after=${centerAfter}`);

    await page.screenshot({ path: require('path').join(__dirname, 'input-test.png'), fullPage: true });
    console.log(`\n[test] ${pass} passed, ${fail} failed`);
    console.log(fail === 0 ? 'INPUT_OK' : 'INPUT_FAIL');
  } catch (e) {
    console.log('INPUT_FAIL exception:', e && e.message ? e.message : e);
    fail++;
  } finally {
    try { stopCdp(); } catch (e) {}
    await browser.close(); server.close();
  }
  process.exit(fail === 0 ? 0 : 1);
})();
