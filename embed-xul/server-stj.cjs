// Static server for the STJ build (serves embed-xul/stj/). Single-threaded + no SAB,
// so COOP/COEP are NOT required; we don't send them (proving the build needs no
// cross-origin isolation). WISP endpoint exposed for later networking.
const http = require('http'); const fs = require('fs'); const path = require('path');
let wisp = null; try { wisp = require('wisp-server-node'); } catch (e) {}
const ROOT = path.join(__dirname, 'stj');
const PORT = Number(process.argv[2] || 8925);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.data': 'application/octet-stream', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.normalize(path.join(ROOT, urlPath === '/' ? '/index.html' : urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'no-store' });
    res.end(data);
  });
});
server.on('upgrade', (req, socket, head) => { if (!wisp) { try { socket.destroy(); } catch (e) {} return; } try { wisp.routeRequest(req, socket, head); } catch (e) { try { socket.destroy(); } catch (e2) {} } });
if (require.main === module) server.listen(PORT, '0.0.0.0', () => console.log(`[server-stj] http://0.0.0.0:${PORT}/ (no COOP/COEP, serving ${ROOT})`));
module.exports = { server, PORT };
