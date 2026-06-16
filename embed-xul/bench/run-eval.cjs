// Pure-JS benchmark driver for the wasm Gecko engine.
//
// Loads the engine headless, runs a JS workload in the chrome global via the
// op=5 eval hook (window.geckoEval), and captures a result line the workload
// prints with dump(). The result is machine-readable JSON after a marker.
//
//   node bench/run-eval.cjs <workload.js> [marker]
//
// The workload .js file is the script eval'd inside the engine; it must print
// a line `<marker> {json}` via dump(...). Default marker: BENCHRESULT.
const path = require('path');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 8971;

(async () => {
  const workloadFile = process.argv[2];
  const marker = process.argv[3] || 'BENCHRESULT';
  if (!workloadFile) { console.error('usage: run-eval.cjs <workload.js> [marker]'); process.exit(2); }
  const script = require('fs').readFileSync(workloadFile, 'utf8');

  // Serve embed-xul/ with COOP/COEP (+ WISP) using the project server.
  const { server } = require(path.join(ROOT, 'server.cjs'));
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();

  let resultLine = null, aborted = null;
  const resultP = new Promise((resolve) => {
    page.on('console', (m) => {
      const t = m.text();
      // engine stdout surfaces as `[out] <text>`; dump() output lands here too.
      const idx = t.indexOf(marker);
      if (idx >= 0) { resultLine = t.slice(idx + marker.length).trim(); resolve(); }
      if (t.includes('[ABORT]') || t.includes('Aborted(') || t.includes('RuntimeError')) {
        aborted = t; resolve();
      }
      if (process.env.VERBOSE && /\[(out|err)\]/.test(t)) console.error('  ', t.slice(0, 200));
    });
  });
  page.on('pageerror', (e) => { aborted = 'pageerror: ' + e.message; });

  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 180000 });
  console.error(`[bench] engine READY in ${Date.now() - t0}ms; running workload ${path.basename(workloadFile)}`);

  // Fire the workload. geckoEval enqueues an op=5 command; we don't need its
  // return value (we read the dump() marker line from the console instead).
  await page.evaluate((s) => { window.geckoEval(s); }, script);

  // Wait for the result marker (or an abort), with a hard timeout.
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('bench timeout')), 600000));
  try { await Promise.race([resultP, timeout]); }
  catch (e) { console.error('[bench] ' + e.message); await browser.close(); server.close(); process.exit(1); }

  await browser.close(); server.close();
  if (aborted) { console.error('[bench] ENGINE ABORTED: ' + aborted); process.exit(1); }
  console.log(resultLine);   // the JSON result, on stdout
  process.exit(0);
})().catch((e) => { console.error('[bench] fatal', e); process.exit(1); });
