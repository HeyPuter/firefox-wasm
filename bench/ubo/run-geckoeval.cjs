// Run the benchmark INSIDE the real gecko-wasm engine (the JS->WASM JIT target)
// via the embed-chrome harness + geckoEval. Fetches the IIFE bundle + dataset
// into the engine, builds uboBench, runs the compile+load loop, prints timings.
//
//   node run-geckoeval.cjs [list] [iters]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server: chromeServer } = require('../embed-chrome/server.cjs');
const CHROME_PORT = 9021, ASSET_PORT = 9022;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const list = (process.argv[2] || 'easylist.txt');
const iters = parseInt(process.argv[3] || '5', 10);

// static server for this dir (serves build/ + data/)
const assetServer = http.createServer((req, res) => {
    const p = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]));
    if ( !p.startsWith(__dirname) || !fs.existsSync(p) ) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' });
    fs.createReadStream(p).pipe(res);
});

const BENCH = `
(async () => { try {
  const base = "http://127.0.0.1:${ASSET_PORT}";
  const lists = ${JSON.stringify(list.split(','))};
  const raw = await Promise.all(lists.map(n => fetch(base + "/data/" + n).then(r => r.text())));
  const scope = {};
  Services.scriptloader.loadSubScript(base + "/build/compile-bundle.iife.js", scope);   // CSP-safe, system principal
  const uboBench = scope.uboBench;
  console.error("UBOBENCH ready bench=" + typeof (uboBench && uboBench.bench));
  const runs = uboBench.bench(raw, ${iters});
  console.error("UBOBENCH " + JSON.stringify(runs));
} catch(e){ console.error("UBOBENCH err " + (e && e.name) + ": " + (e && e.message) + " @ " + (e && e.stack)); } })();
`;

(async () => {
    await new Promise(r => chromeServer.listen(CHROME_PORT, '127.0.0.1', r));
    await new Promise(r => assetServer.listen(ASSET_PORT, '127.0.0.1', r));
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    page.on('console', m => { const t = m.text(); if ( /UBOBENCH/.test(t) ) console.log(t.slice(0, 4000)); });
    try {
        await page.goto(`http://127.0.0.1:${CHROME_PORT}/?gpu=0`, { waitUntil: 'load', timeout: 240000 });
        await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 });
        await sleep(4000);
        console.log(`running benchmark in-engine: ${list}  iters=${iters}`);
        await page.evaluate((j) => window.geckoEval(j), BENCH);
        await sleep(160000);   // generous: interpreted compile is slow
    } catch (e) { console.log('exc', e.message); }
    finally { await browser.close(); chromeServer.close(); assetServer.close(); }
    process.exit(0);
})();
