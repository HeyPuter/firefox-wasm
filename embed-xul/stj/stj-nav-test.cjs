// Real-content navigation test for the STJ build (single OS thread, JSPI fibers, no SAB).
// Boots the page, then navigates the address bar through the REAL necko load path
// (st_request_nav -> main fiber -> xul_load LoadURI). Two phases:
//   1. data: URL  -> isolates necko document-load COMPLETION (no networking)
//   2. http:// URL -> adds WISP networking (server-stj.cjs proxies to the internet)
// Verdict from the embedder console: "doc INTERACTIVE after N passes" + st_present
// nonblack/colored pixel counts + [wisp] CONNECT lines.
try { require('fs').writeFileSync('/tmp/stj-nav-sentinel.txt', 'top reached ' + process.pid + '\n'); } catch (e) {}
process.stdout.write('SENTINEL: test top reached\n');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 8961;
const TIMEOUT = Number(process.env.STJ_TIMEOUT_MS || 180000);
setTimeout(() => { console.log('\n=== HARD EXIT ==='); process.exit(7); }, TIMEOUT + 20000);

const lines = [];
let lastPresent = null;          // {nonblack, colored}
let interactive = false, capReached = false, loadURIrv = null;
let wispConnects = 0, navAck = false;
function note(t) {
  lines.push(t);
  let m;
  if ((m = /st_present: \d+x\d+ nonblack=(\d+) colored=(\d+)/.exec(t))) lastPresent = { nonblack: +m[1], colored: +m[2] };
  if (/doc INTERACTIVE after/.test(t)) interactive = true;
  if (/cap reached/.test(t)) capReached = true;
  if ((m = /LoadURI rv=(0x[0-9a-f]+)/.exec(t))) loadURIrv = m[1];
  if (/\[wisp\] CONNECT/.test(t)) wispConnects++;
  if (/nav requested ->/.test(t)) navAck = true;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(pred, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (pred()) return true; await sleep(250); }
  console.log('  [timeout waiting for ' + label + ']');
  return false;
}

async function navigate(page, url, ms, label) {
  interactive = false; capReached = false; loadURIrv = null; navAck = false;
  const before = lastPresent;
  console.log('\n--- NAV: ' + label + ' -> ' + url + ' ---');
  await page.evaluate((u) => window.geckoNavigate(u), url);
  await waitFor(() => navAck, 10000, 'nav ack');
  const done = await waitFor(() => interactive || capReached, ms, 'doc INTERACTIVE/cap');
  await sleep(2500);   // let progressive paints land
  console.log('  LoadURI rv=' + loadURIrv + ' interactive=' + interactive + ' cap=' + capReached +
              ' wispConnects=' + wispConnects);
  console.log('  st_present before=' + JSON.stringify(before) + ' after=' + JSON.stringify(lastPresent));
  return { interactive, capReached, present: lastPresent };
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 980, height: 820 } });
  page.on('console', (m) => note(m.text()));
  page.on('pageerror', (e) => console.log('[pageerror] ' + e.message));
  let verdict = {};
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit', timeout: 60000 });
    // boot: the inject demo renders the blue button -> proves engine is up
    const booted = await waitFor(() => /READY \(cooperative loop\)/.test(lines.join('\n')), TIMEOUT * 0.5, 'engine READY');
    console.log('engine READY: ' + booted);
    if (!booted) throw new Error('engine never reached READY');
    await waitFor(() => lastPresent && lastPresent.nonblack > 0, 20000, 'initial inject paint');
    console.log('initial inject present=' + JSON.stringify(lastPresent));

    // PHASE 1: data: URL (no network) -- pure necko document-load completion
    const dataUrl = "data:text/html,<body style='margin:0;background:%23ffcc00'>" +
      "<h1 style='color:%23003366'>NECKO LOAD OK</h1>" +
      "<div style='width:300px;height:200px;background:%23cc0000'></div></body>";
    const r1 = await navigate(page, dataUrl, 60000, 'data: (necko, no net)');
    verdict.data = r1.interactive ? 'INTERACTIVE' : (r1.capReached ? 'CAP' : 'STALL');

    // PHASE 2: real site over WISP
    const r2 = await navigate(page, 'http://example.com/', 90000, 'http example.com (WISP)');
    verdict.http = r2.interactive ? 'INTERACTIVE' : (r2.capReached ? 'CAP' : 'STALL');

    await page.screenshot({ path: require('path').join(__dirname, 'stj-nav.png') }).catch(() => {});
  } catch (e) { console.log('exc ' + e.message); verdict.err = e.message; }
  finally {
    console.log('\n=== NAV VERDICT ===');
    console.log('  data: ' + (verdict.data || '?') + '   http: ' + (verdict.http || '?') + (verdict.err ? '   err=' + verdict.err : ''));
    console.log('  wispConnects=' + wispConnects);
    console.log('--- recent xul_load[stj] / wisp lines ---');
    console.log(lines.filter((l) => /xul_load|wisp|navigating|nav requested|LoadURI|readyState/i.test(l)).slice(-25).join('\n'));
    console.log('--- last st_present ---');
    console.log(lines.filter((l) => /st_present:/.test(l)).slice(-4).join('\n'));
    await browser.close().catch(() => {}); server.close(); process.exit(0);
  }
})();
