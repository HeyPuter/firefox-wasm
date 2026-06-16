// Benchmark server for the wasm Gecko engine.
//
// One HTTP server on a single port serves three roles:
//   1. Static files from embed-xul/ (the OUTER chromium loads index.html + gecko.*).
//   2. The SAME files to the ENGINE over WISP (the engine fetches a bench page from
//      http://127.0.0.1:PORT/... which WISP TCP-proxies right back here).
//   3. A result sink: the bench page POSTs its JSON result to /bench-result.
// Plus a WISP websocket-upgrade endpoint so the engine's Necko has connectivity.
//
// Exposes startBenchServer(port) -> { server, port, nextResult() }.
const http = require('http');
const fs = require('fs');
const path = require('path');
// wisp-server-node logs connection chatter to stdout, which pollutes the JSON the
// bench drivers print on stdout. Filter only that chatter (keep everything else,
// e.g. the driver's JSON result line).
const _origLog = console.log;
console.log = (...a) => { if (/Client decided to terminate|reason \d|\bwisp\b/i.test(a.join(' '))) return; _origLog(...a); };
const wisp = require('wisp-server-node');

const ROOT = path.join(__dirname, '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.wasm': 'application/wasm', '.data': 'application/octet-stream',
  '.png': 'image/png', '.css': 'text/css', '.json': 'application/json',
};

function startBenchServer(port) {
  const waiters = [];        // pending nextResult() promises
  const pending = [];        // results that arrived before anyone awaited

  function deliver(obj) {
    if (waiters.length) waiters.shift()(obj);
    else pending.push(obj);
  }

  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

    if (req.method === 'POST' && urlPath === '/bench-result') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        res.end();
        let obj; try { obj = JSON.parse(body); } catch (e) { obj = { raw: body, parseError: String(e) }; }
        deliver(obj);
      });
      return;
    }

    let rel = urlPath === '/' ? '/index.html' : urlPath;
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found: ' + rel); return; }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Content-Length': data.length,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  });

  server.on('upgrade', (req, socket, head) => {
    try { wisp.routeRequest(req, socket, head); }
    catch (e) { try { socket.destroy(); } catch (e2) {} }
  });

  // Resolves with the next POSTed result (or one already queued).
  function nextResult() {
    if (pending.length) return Promise.resolve(pending.shift());
    return new Promise((resolve) => waiters.push(resolve));
  }

  return new Promise((resolve) => {
    // port 0 -> OS-assigned ephemeral port (avoids collisions between overlapping runs).
    server.listen(port || 0, '127.0.0.1', () => resolve({ server, port: server.address().port, nextResult }));
  });
}

module.exports = { startBenchServer };
