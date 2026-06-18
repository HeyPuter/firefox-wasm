// Serve jspi/ WITHOUT COOP/COEP and run pocE.html: cooperative fibers + per-fiber TLS,
// single OS thread, no SAB.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const HERE = __dirname; const PORT = 8945;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  const f = path.join(HERE, (req.url === '/' ? '/pocE.html' : req.url).split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); // NO COOP/COEP
});
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('PAGEERR| ' + String(e).slice(0, 200)));
  try {
    await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 30000 });
    await p.waitForFunction(() => window.__done || window.__err, undefined, { timeout: 30000 }).catch(() => {});
    const st = await p.evaluate(() => ({ done: window.__done || null, err: window.__err || null, log: window.__log || [] }));
    console.log(st.log.join('\n'));
    console.log('\n=== RESULT ===');
    const d = st.done;
    const workerFresh = st.log.some((l) => /\[worker .*\] tls_v on entry=100/.test(l));
    if (d && d.rv === 7 && workerFresh) {
      console.log(`PoC E PASS: fibers + isolated per-fiber TLS, coi=${d.coi} SAB=${d.sab}`);
      console.log('  -> single OS thread, NO SAB, worker saw fresh TLS(100), main kept TLS(7)');
    } else {
      console.log('PoC E FAIL/INCONCLUSIVE: done=' + JSON.stringify(d) + ' workerFresh=' + workerFresh + ' err=' + st.err);
    }
  } catch (e) { console.log('test exc: ' + e.message); }
  finally { await b.close(); server.close(); process.exit(0); }
})();
