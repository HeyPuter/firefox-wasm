// Load the engine, idle, and print console lines matching a pattern (default
// WISPSCAN|WISPPOLL). For ad-hoc idle diagnostics.
//   node bench/idle-console.cjs [--ms=8000] [--match=WISPSCAN]
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startBenchServer } = require('./bench-server.cjs');

(async () => {
  const MS = +((process.argv.find((a) => a.startsWith('--ms=')) || '').split('=')[1]) || 8000;
  const matchArg = (process.argv.find((a) => a.startsWith('--match=')) || '').split('=')[1] || 'WISPSCAN|WISPPOLL';
  const re = new RegExp(matchArg);
  const { server, port } = await startBenchServer(0);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const hits = [];
  page.on('console', (m) => { const t = m.text(); if (re.test(t)) hits.push(t.replace(/^.*?(WISP\w+)/, '$1')); });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 180000 });
  if (!process.argv.includes('--keep-startup')) { await new Promise((r) => setTimeout(r, 1500)); hits.length = 0; }
  await new Promise((r) => setTimeout(r, MS));
  await browser.close(); server.close();
  // de-dup identical lines with counts
  const counts = new Map();
  for (const h of hits) counts.set(h, (counts.get(h) || 0) + 1);
  console.log('captured ' + hits.length + ' lines, ' + counts.size + ' distinct:');
  [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([l, c]) => console.log(String(c).padStart(5) + 'x  ' + l));
  process.exit(0);
})().catch((e) => { console.error('idle-console fatal', e); process.exit(1); });
