// Phase 1 browser verification: load the wasm SpiderMonkey in real Chromium via
// Playwright, confirm the in-page self-tests pass, and evaluate JS through it.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');

const WEB = path.join(__dirname, '..', 'web');
const MIME = { '.html': 'text/html', '.js': 'text/javascript',
               '.wasm': 'application/wasm', '.png': 'image/png' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
      const file = path.join(WEB, path.normalize(url));
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const url = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (m) => console.log('  [console]', m.text()));
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  let exit = 0;
  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('#status[data-ready="1"]', { timeout: 30000 });

    const pass = await page.getAttribute('#selftest', 'data-pass');
    const total = await page.getAttribute('#selftest', 'data-total');
    const selftext = await page.textContent('#selftest');
    console.log('=== in-page self-test ===\n' + selftext);

    // Drive an eval the same way a user would, through the wasm engine.
    const live = await page.evaluate(() => window.smEval('6 * 7 + Math.sqrt(16)'));
    console.log('smEval("6*7+sqrt(16)") =>', live);

    await page.screenshot({ path: path.join(WEB, 'phase1.png'), fullPage: true });

    if (pass === total && Number(total) > 0 && live === '46') {
      console.log(`BROWSER_OK ${pass}/${total} self-tests + live eval correct`);
    } else {
      console.log(`BROWSER_FAIL pass=${pass} total=${total} live=${live}`);
      exit = 1;
    }
  } catch (e) {
    console.log('BROWSER_FAIL exception:', e.message);
    exit = 1;
  } finally {
    await browser.close();
    srv.close();
  }
  process.exit(exit);
})();
