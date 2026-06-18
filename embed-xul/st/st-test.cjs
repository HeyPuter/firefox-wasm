// Playwright smoke test for the EXPERIMENTAL single-threaded (ST=1) web build.
// Loads st/index.html in Chromium, prints the real xul_init markers, then attempts
// a bounded data: render so a single-threaded hang can't freeze the test forever.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-st.cjs');
const path = require('path');
const PORT = 8932;
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 30000);

const HTML = "data:text/html,<body style='margin:0;background:%23ffffff'>" +
  "<div style='width:400px;height:300px;background:%230066cc'></div>" +
  "<div style='width:200px;height:150px;background:%23cc0000'></div></body>";

const ttl = (p, ms, tag) => Promise.race([
  p, new Promise((r) => setTimeout(() => r({ __timeout: tag }), ms)),
]);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-experimental-webassembly-jspi', '--js-flags=--experimental-wasm-jspi'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  page.on('pageerror', (e) => console.log('  PAGEERR| ' + String(e).slice(0, 200)));

  let verdict = 'UNKNOWN';
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(
      () => window.__geckoReady === true || window.__stAbort || window.__stReject,
      undefined, { timeout: 180000 });

    const initLog = await page.evaluate(() => window.__stLog || []);
    const abort = await page.evaluate(() => window.__stAbort || null);
    const reject = await page.evaluate(() => window.__stReject || null);

    console.log('\n=== xul_init stdout (single-threaded) ===');
    console.log(initLog.join('\n'));

    const initOk = initLog.some((s) => /NS_InitXPCOM returned rv=0x00000000|XPCOM INITIALIZED/.test(s));
    const initFail = initLog.some((s) => /xul_init FAILED|NS_InitXPCOM returned rv=0x(?!00000000)/.test(s));
    const loopRunning = initLog.some((s) => /cooperative main loop running/.test(s));
    console.log(`\nNS_InitXPCOM ok=${initOk} fail=${initFail} loopRunning=${loopRunning}`);
    if (abort) console.log('abort: ' + abort.slice(0, 300));
    if (reject) console.log('reject: ' + reject.slice(0, 300));

    if (!loopRunning) {
      verdict = initOk ? 'INIT_OK_NO_LOOP' : 'INIT_FAILED';
    } else {
      console.log('\n=== attempting bounded data: render (timeout ' + RENDER_TIMEOUT_MS + 'ms) ===');
      const r = await ttl(
        page.evaluate((u) => window.geckoRender(u), HTML).then((rv) => ({ rv })),
        RENDER_TIMEOUT_MS, 'render');
      if (r && r.__timeout) {
        verdict = 'RENDER_HANG';
        console.log('!! st_load did NOT return within ' + RENDER_TIMEOUT_MS + 'ms');
        console.log('   (single-threaded load blocks the main thread waiting on a worker/event that never comes)');
      } else {
        console.log('geckoRender rv=' + (r && r.rv));
        await new Promise((res) => setTimeout(res, 1500));
        const shot = path.join(__dirname, 'st-render.png');
        await ttl(page.screenshot({ path: shot, clip: { x: 0, y: 0, width: 820, height: 640 } }), 8000, 'shot');
        const px = await ttl(page.evaluate(() => {
          const c = document.getElementById('screen'); const x = c.getContext('2d');
          const at = (X, Y) => Array.from(x.getImageData(X, Y, 1, 1).data).slice(0, 3).join(',');
          return { blue: at(50, 50), red: at(50, 380), bg: at(700, 550) };
        }), 8000, 'px');
        console.log('canvas samples: ' + JSON.stringify(px));
        verdict = (r.rv === 0) ? 'RENDER_OK' : 'RENDER_FAILED';
        console.log('screenshot -> ' + shot);
      }
    }
  } catch (e) {
    verdict = 'TEST_ERROR';
    console.log('exception: ' + (e && e.message));
  } finally {
    console.log('\n=== ST VERDICT: ' + verdict + ' ===');
    try { await ttl(browser.close(), 5000, 'close'); } catch (e) {}
    server.close();
    process.exit(0);
  }
})();
