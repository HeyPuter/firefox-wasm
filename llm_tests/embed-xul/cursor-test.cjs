// Verify the content cursor propagates to the host canvas: hover a link -> the
// canvas CSS cursor becomes 'pointer', an input -> 'text', a plain area -> not
// pointer.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8938);

const HTML =
  '<body style="margin:0">' +
  '<a href="https://example.com" style="position:absolute;left:40px;top:40px;width:200px;height:40px;display:block;background:#eef">LINK</a>' +
  '<input style="position:absolute;left:40px;top:120px;width:200px;height:30px;font-size:18px">' +
  '<div style="position:absolute;left:40px;top:210px;width:200px;height:40px;background:#fee">plain</div>' +
  '</body>';
const PAGE = 'data:text/html,' + encodeURIComponent(HTML);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--remote-debugging-port=9356'] });
  const stop = await startCDPCapture(9356, () => {});
  const p = await b.newPage();
  const move = (x, y) => p.evaluate((a) => window.geckoInput({ op: 1, evType: 0, x: a.x, y: a.y }), { x, y });
  const cur = () => p.evaluate(() => document.getElementById('screen').style.cursor);
  let pass = 0, fail = 0;
  const check = (name, got, want) => { const ok = got === want; console.log(`  ${ok ? 'PASS' : 'FAIL'} ${name}: cursor='${got}' (want '${want}')`); ok ? pass++ : fail++; };
  try {
    await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await p.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await p.evaluate((u) => window.geckoRender(u), PAGE);
    await move(140, 60); await new Promise(r => setTimeout(r, 150));  check('over link', await cur(), 'pointer');
    await move(140, 133); await new Promise(r => setTimeout(r, 150)); check('over input', await cur(), 'text');
    await move(140, 228); await new Promise(r => setTimeout(r, 150)); check('over plain div', await cur(), 'default');
    console.log(`\n${pass} passed, ${fail} failed`);
    console.log(fail === 0 ? 'CURSOR_OK' : 'CURSOR_FAIL');
  } catch (e) { console.log('CURSOR_FAIL exception', e.message); }
  finally { try { stop(); } catch (e) {} await b.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
})();
