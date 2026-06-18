// Navigate to a data: URL with MOZ_LOG enabled (DocLoader + parser executor + docshell),
// to trace where the document load stalls and which threads (fibers) are involved.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('../server-stj.cjs');
const PORT = 8983;
setTimeout(() => { console.log('=== HARD EXIT ==='); process.exit(7); }, 90000);
const lines = [];
let interactive = false;
function note(t) { lines.push(t); if (/doc INTERACTIVE after/.test(t)) interactive = true; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MOZLOG = 'DocLoader:5,Html5TreeOpExecutor:5,nsDocShell:5';

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 980, height: 820 } });
  page.on('console', (m) => note(m.text()));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?mozlog=${encodeURIComponent(MOZLOG)}`, { waitUntil: 'commit', timeout: 60000 });
    const t0 = Date.now();
    while (!/READY \(cooperative loop\)/.test(lines.join('\n')) && Date.now() - t0 < 60000) await sleep(300);
    console.log('engine READY; log lines so far: ' + lines.length);
    const markIdx = lines.length;
    await sleep(800);
    console.log('--- navigating to data:text/html,<h1>HELLO</h1> ---');
    await page.evaluate(() => { try { window.geckoNavigate("data:text/html,<h1>HELLO</h1>"); } catch (e) { console.log('naverr ' + e); } });
    await sleep(8000);
    console.log('interactive=' + interactive);
    // dump every log line emitted SINCE the nav that mentions the load machinery
    const since = lines.slice(markIdx);
    const rel = since.filter((l) => /DocLoader|Html5TreeOpExecutor|nsDocShell|OnStartRequest|OnStopRequest|OnDataAvailable|DidBuildModel|RunFlush|ParseAvailableData|readyState|DocumentChannel/i.test(l));
    console.log('--- ' + rel.length + ' load-machinery log lines since nav ---');
    console.log(rel.slice(0, 120).join('\n'));
  } catch (e) { console.log('exc ' + e.message); }
  finally { await browser.close().catch(() => {}); server.close(); process.exit(0); }
})();
