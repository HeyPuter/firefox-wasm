const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = 8941;
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--remote-debugging-port=9361'] });
  const stopCdp = await startCDPCapture(9361, (l) => {
    if (/PROBE|INITIALIZED|profile-do-change|app-startup|appShell|storage service/.test(l)) console.log(l.slice(0, 300));
  });
  const page = await browser.newPage();
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await new Promise((r) => setTimeout(r, 8000));
  } catch (e) { console.log('exc:', e.message); }
  finally { try { stopCdp(); } catch {} await browser.close(); server.close(); }
  process.exit(0);
})();
