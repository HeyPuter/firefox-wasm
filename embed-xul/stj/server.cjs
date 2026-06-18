// Static server for the libxul browser harness. Sends COOP/COEP so the page is
// cross-origin-isolated -> SharedArrayBuffer is available -> emscripten pthreads
// (Web Workers) work. Without these headers, threads silently fail.
//
// It ALSO serves a WISP endpoint on the same origin (ws:// upgrade), so the page's
// networking works out of the box: index.html defaults to ws://<this host>/ when no
// ?wisp= is given. (wisp-server-node proxies TCP to the real internet.)
//
// Usage: node server.cjs [port]   (default 8923). Serves embed-xul/.
const http = require('http');
const fs = require('fs');
const path = require('path');
const wisp = require('wisp-server-node');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || 8923);
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.wasm': 'application/wasm', '.data': 'application/octet-stream',
  '.png': 'image/png', '.css': 'text/css', '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found: ' + rel); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      // Send Content-Length (not chunked) so the frontend can show a real wasm
      // download progress percentage.
      'Content-Length': data.length,
      // Required for SharedArrayBuffer / emscripten pthreads:
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});

// WISP endpoint on the same origin: ws://<host>:<port>/ upgrades into a WISP
// session (multiplexed TCP-over-WebSocket) that proxies to the real internet.
server.on('upgrade', (req, socket, head) => {
  try {
    wisp.routeRequest(req, socket, head);
  } catch (e) {
    try { socket.destroy(); } catch (e2) { }
  }
});

if (require.main === module) {
  const host = process.argv[3] || '0.0.0.0';
  server.listen(PORT, host, () =>
    console.log(`[server] http://${host}:${PORT}/  (COOP/COEP + WISP at ws://${host}:${PORT}/, serving ${ROOT})`));
}
module.exports = { server, PORT };
