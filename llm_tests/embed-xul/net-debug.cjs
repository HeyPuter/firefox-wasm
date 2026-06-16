// Load a URL with MOZ_LOG=nsHttp and report each HTTP channel's final status, so
// we can see WHICH subresources (CSS etc.) fail and WHY (status code).
// Usage: URL=https://www.google.com/ node net-debug.cjs
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8934);
const TARGET = process.env.URL || 'https://www.google.com/';
const MOZLOG = process.env.MOZLOG || 'nsHttp:3';

const lines = [];
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true,
    args: ['--no-sandbox', '--remote-debugging-port=9352'] });
  const stopCdp = await startCDPCapture(9352, (l) => { lines.push(l); });
  const page = await browser.newPage();
  page.on('pageerror', (e) => lines.push('[pageerror] ' + ((e.stack || e.message) + '')));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?mozlog=${encodeURIComponent(MOZLOG)}`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    const n = await page.evaluate((u) => window.geckoRender(u), TARGET).catch(() => null);
    await new Promise((r) => setTimeout(r, 8000));
    console.log('geckoRender =', n);
    const stats = await page.evaluate(() => (window.WISP && window.WISP.stats) ? window.WISP.stats() : null);
    console.log('\n=== WISP per-connection bytes (rx = bytes RECEIVED from network) ===');
    if (stats) {
      // aggregate by host
      const byHost = {};
      stats.forEach((s) => { const h = s.host; byHost[h] = byHost[h] || { rx: 0, tx: 0, n: 0, open: 0 }; byHost[h].rx += s.rx; byHost[h].tx += s.tx; byHost[h].n++; if (s.open) byHost[h].open++; });
      Object.entries(byHost).sort((a, b) => b[1].rx - a[1].rx).forEach(([h, v]) =>
        console.log(`  ${h.padEnd(40)} conns=${v.n} open=${v.open} rx=${v.rx} tx=${v.tx}`));
    } else { console.log('  (WISP.stats unavailable)'); }
  } catch (e) { console.log('exception', e.message); }
  finally { try { stopCdp(); } catch (e) {} await browser.close(); server.close(); }

  // CSS-loader decisions (MIME reject etc.)
  const css = lines.filter((l) => /improper MIME|Ignoring sheet|VerifySheetReadyToParse|MimeNotCss|text\/css|not .*text\/css|CSS Loader/i.test(l));
  console.log('\n=== CSS-loader lines:', css.length, '===');
  [...new Set(css)].slice(0, 40).forEach((l) => console.log('  ' + l.slice(0, 260)));

  // Summarize: channel OnStopRequest statuses (nsHttp logs "OnStopRequest ... status 0xNNN")
  const stops = lines.filter((l) => /OnStopRequest/i.test(l));
  const nonOk = stops.filter((l) => /status\s+0x(?!00000000)/i.test(l) || /status=0x(?!00000000)/i.test(l));
  console.log('\n=== OnStopRequest total:', stops.length, ' non-OK:', nonOk.length, '===');
  nonOk.slice(0, 40).forEach((l) => console.log(l.slice(0, 240)));
  // Also any explicit failure/cancel keywords
  const fails = lines.filter((l) => /NS_ERROR|NS_BINDING|Cancel|aStatus=0x80|failed|0x804b|0x805/.test(l) && !/CSM /.test(l));
  console.log('\n=== failure-ish lines:', fails.length, '===');
  [...new Set(fails)].slice(0, 40).forEach((l) => console.log(l.slice(0, 240)));
  process.exit(0);
})();
