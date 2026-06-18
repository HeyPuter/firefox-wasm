// Static server for the EXPERIMENTAL single-threaded build (serves embed-xul/st/).
// Single-threaded needs no SharedArrayBuffer, but we still send COOP/COEP (harmless)
// and expose the same WISP endpoint so networking can be added later.
// Usage: node server-st.cjs [port]   (default 8924).
const http = require('http');
const fs = require('fs');
const path = require('path');
let wisp = null;
try { wisp = require('wisp-server-node'); } catch (e) { /* networking optional for ST */ }

const ROOT = path.join(__dirname, 'st');
const PORT = Number(process.argv[2] || 8924);
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
      'Content-Length': data.length,
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});

server.on('upgrade', (req, socket, head) => {
  if (!wisp) { try { socket.destroy(); } catch (e) {} return; }
  try { wisp.routeRequest(req, socket, head); }
  catch (e) { try { socket.destroy(); } catch (e2) {} }
});

if (require.main === module) {
  const host = process.argv[3] || '0.0.0.0';
  server.listen(PORT, host, () =>
    console.log(`[server-st] http://${host}:${PORT}/  (serving ${ROOT})`));
}
module.exports = { server, PORT };
