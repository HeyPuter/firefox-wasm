// Content-page benchmark driver. Loads the engine headless, navigates it (over
// WISP) to a bench page served by bench-server, and collects the JSON result the
// page POSTs back to /bench-result.
//
//   node bench/run-page.cjs <relative-bench-url> [--gpu] [--timeout=ms] [--label=name]
//
// e.g. node bench/run-page.cjs /bench/microjs.html
const path = require('path');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startBenchServer } = require('./bench-server.cjs');

const PORT = 8972;

(async () => {
  const args = process.argv.slice(2);
  const benchUrl = args.find((a) => !a.startsWith('--'));
  const gpu = args.includes('--gpu');
  const toArg = args.find((a) => a.startsWith('--timeout='));
  const labelArg = args.find((a) => a.startsWith('--label='));
  const TIMEOUT = toArg ? +toArg.split('=')[1] : 300000;
  const label = labelArg ? labelArg.split('=')[1] : (benchUrl || '');
  if (!benchUrl) { console.error('usage: run-page.cjs <relative-bench-url> [--gpu]'); process.exit(2); }

  // --qs=foo=1&bar=2 : extra query string appended to the engine index.html URL
  // (e.g. stylo=8, env.FOO=bar). Combined with ?gpu=1 when --gpu is set.
  const qsArg = (args.find((a) => a.startsWith('--qs=')) || '').split('=').slice(1).join('=');
  const { server, port, nextResult } = await startBenchServer(0);
  const params = [gpu ? 'gpu=1' : '', qsArg].filter(Boolean).join('&');
  const engineUrl = `http://127.0.0.1:${port}/index.html${params ? '?' + params : ''}`;
  const fetchUrl = `http://127.0.0.1:${port}${benchUrl}`;

  const browser = await chromium.launch({
    headless: !gpu,
    args: ['--no-sandbox', '--disable-dev-shm-usage',
           ...(gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle'] : [])],
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
  });
  const page = await browser.newPage();
  let aborted = null;
  page.on('console', (m) => {
    const t = m.text();
    if (t.includes('[ABORT]') || t.includes('Aborted(') || t.includes('RuntimeError')) aborted = t;
    if (process.env.VERBOSE && /\[(out|err)\]/.test(t)) console.error('  ', t.slice(0, 200));
  });
  page.on('pageerror', (e) => { aborted = 'pageerror: ' + e.message; });

  const fail = async (msg) => { console.error('[bench] FAIL ' + msg); await browser.close(); server.close(); process.exit(1); };

  const t0 = Date.now();
  await page.goto(engineUrl, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 180000 });
  const readyMs = Date.now() - t0;
  console.error(`[bench] engine READY in ${readyMs}ms; loading ${fetchUrl}`);

  const tLoad = Date.now();
  await page.evaluate((u) => window.geckoRender(u), fetchUrl);

  const timeout = new Promise((resolve) => setTimeout(() => resolve('__timeout__'), TIMEOUT));
  const result = await Promise.race([nextResult(), timeout]);
  const loadToResultMs = Date.now() - tLoad;

  if (result === '__timeout__') return fail('timed out waiting for /bench-result' + (aborted ? ' (abort: ' + aborted + ')' : ''));
  await browser.close(); server.close();
  if (aborted) console.error('[bench] WARNING engine reported: ' + aborted);

  const out = { label, readyMs, loadToResultMs, gpu, result };
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch((e) => { console.error('[bench] fatal', e); process.exit(1); });
