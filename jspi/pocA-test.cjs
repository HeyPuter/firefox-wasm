// Serve jspi/ and run pocA.html in Chromium; report whether JSPI suspend/resume works.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const HERE = __dirname; const PORT = 8941;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  const f = path.join(HERE, (req.url === '/' ? '/pocA.html' : req.url).split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
});
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await b.newPage();
  try {
    await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 30000 });
    await p.waitForFunction(() => window.__done || window.__err, undefined, { timeout: 30000 }).catch(() => {});
    const st = await p.evaluate(() => ({ done: window.__done || null, err: window.__err || null, log: window.__log || [] }));
    console.log(st.log.join('\n'));
    console.log('\n=== RESULT ===');
    if (st.done) {
      // If it truly suspended, the 3x40ms sleeps interleave with the event loop and
      // the printf order is before/after pairs (not all-before-then-all-after of a busy spin).
      console.log('PoC A PASS: poc_run resolved rv=' + st.done.rv + ' in ' + st.done.dt + 'ms');
      console.log(st.done.dt >= 100 ? '  -> elapsed >=100ms: real JSPI suspension confirmed' : '  -> elapsed short: check whether it actually suspended');
    } else {
      console.log('PoC A FAIL: ' + (st.err || 'no result'));
    }
  } catch (e) { console.log('test exc: ' + e.message); }
  finally { await b.close(); server.close(); process.exit(0); }
})();
