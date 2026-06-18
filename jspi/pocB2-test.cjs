// Serve jspi/ WITHOUT COOP/COEP and run pocB2.html. Proves (or disproves) SAB-free
// cooperative fibers with per-fiber TLS.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const HERE = __dirname; const PORT = 8943;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  const f = path.join(HERE, (req.url === '/' ? '/pocB2.html' : req.url).split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
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
    if (st.done && st.done.rv === 7) {
      console.log(`PoC B PASS: per-fiber TLS isolated (main tls_v=7 after worker set 42), coi=${st.done.coi} SAB=${st.done.sab}`);
      console.log('  -> SAB-FREE cooperative fibers + per-fiber TLS PROVEN');
    } else {
      console.log('PoC B FAIL/INCONCLUSIVE: done=' + JSON.stringify(st.done) + ' err=' + st.err);
    }
  } catch (e) { console.log('test exc: ' + e.message); }
  finally { await b.close(); server.close(); process.exit(0); }
})();
