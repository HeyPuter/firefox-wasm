// Isolate "does loaded external CSS get APPLIED?" from google specifics.
// Renders a page with: inline <style> (RED box #a) + external <link> stylesheet
// (BLUE box #b). Tests both a data: external sheet and an http: external sheet
// served by our own server over WISP (same path google's CSS takes).
// RED present but BLUE absent => external/loaded CSS is parsed-but-not-applied.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const fs = require('fs');
const path = require('path');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8935);

// http external-CSS case: serve page + sheet from our own server (text/css MIME).
fs.writeFileSync(path.join(__dirname, 'cssapply-page.html'),
  '<!doctype html><html><head>' +
  '<style>#a{position:absolute;left:0;top:0;width:120px;height:120px;background:rgb(255,0,0)}</style>' +
  '<link rel="stylesheet" href="/cssapply-ext.css">' +
  '</head><body style="margin:0"><div id=a></div><div id=b></div></body></html>');
// LARGE sheet (~300KB) with the decisive #b rule at the VERY END, so it only
// turns #b blue if the whole sheet transferred over WISP AND parsed fully. A
// truncation/corruption/reorder of a large response would drop the trailing rule.
let big = '';
for (let i = 0; i < 6000; i++) big += `.filler${i}{color:rgb(${i % 256},0,0);margin:${i % 10}px;padding:1px;border:0}\n`;
big += '#b{position:absolute;left:0;top:150px;width:120px;height:120px;background:rgb(0,0,255)}\n';
fs.writeFileSync(path.join(__dirname, 'cssapply-ext.css'), big);
console.log('[test] cssapply-ext.css size =', big.length, 'bytes');

// data external-CSS case (no network): inline red + data: <link> blue.
const dataCss = encodeURIComponent('#b{position:absolute;left:0;top:150px;width:120px;height:120px;background:rgb(0,0,255)}');
const DATA_PAGE = 'data:text/html,' + encodeURIComponent(
  '<!doctype html><html><head>' +
  '<style>#a{position:absolute;left:0;top:0;width:120px;height:120px;background:rgb(255,0,0)}</style>' +
  '<link rel="stylesheet" href="data:text/css,' + dataCss + '">' +
  '</head><body style="margin:0"><div id=a></div><div id=b></div></body></html>');

const close = (v, t) => Math.abs(v - t) <= 40;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--remote-debugging-port=9353'] });
  const stopCdp = await startCDPCapture(9353, () => {});
  const page = await browser.newPage();
  const sample = (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('screen'); const d = c.getContext('2d').getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; }, [x, y]);
  const test = async (label, url) => {
    const n = await page.evaluate((u) => window.geckoRender(u), url).catch((e) => { console.log(label, 'render threw', e.message); return null; });
    const red = await sample(60, 60);     // #a (inline)
    const blue = await sample(60, 210);   // #b (external)
    const inlineOK = close(red[0], 255) && close(red[1], 0) && close(red[2], 0);
    const extOK = close(blue[0], 0) && close(blue[1], 0) && close(blue[2], 255);
    console.log(`${label}: render=${n}  inline(#a)=${red} ${inlineOK ? 'RED-OK' : 'FAIL'}  external(#b)=${blue} ${extOK ? 'BLUE-OK' : 'FAIL'}`);
    return { inlineOK, extOK };
  };
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    console.log('[test] engine ready');
    await test('data:  external', DATA_PAGE);
    await test('http:  external (own server over WISP)', `http://127.0.0.1:${PORT}/cssapply-page.html`);
  } catch (e) { console.log('exception', e.message); }
  finally { try { stopCdp(); } catch (e) {} await browser.close(); server.close(); }
  process.exit(0);
})();
