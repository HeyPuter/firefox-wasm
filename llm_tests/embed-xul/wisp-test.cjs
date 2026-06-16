// Step 1 verification (no Gecko): stand up a local HTTP origin + a local
// wisp-server-node, then use wisp-client.cjs to fetch the page THROUGH WISP and
// confirm the bytes come back. Validates the WISP framing end-to-end before wiring
// it into the emscripten socket layer.
const http = require('http');
const WebSocket = require('/home/velzie/src/puter/node_modules/ws');
const wisp = require('wisp-server-node');
const { WispConnection } = require('./wisp-client.cjs');

const BODY = '<!doctype html><title>wisp</title><h1>WISP_OK hello from origin</h1>';

(async () => {
  // 1) Origin HTTP server.
  const origin = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': Buffer.byteLength(BODY) });
    res.end(BODY);
  });
  await new Promise((r) => origin.listen(0, '127.0.0.1', r));
  const originPort = origin.address().port;
  console.log('[test] origin http on 127.0.0.1:' + originPort);

  // 2) WISP server (attach to an HTTP server's upgrade).
  const wispHttp = http.createServer((req, res) => { res.writeHead(200); res.end('wisp'); });
  wispHttp.on('upgrade', (req, socket, head) => wisp.routeRequest(req, socket, head));
  await new Promise((r) => wispHttp.listen(0, '127.0.0.1', r));
  const wispPort = wispHttp.address().port;
  console.log('[test] wisp ws on 127.0.0.1:' + wispPort);

  let exit = 1;
  try {
    // 3) WISP client over a ws:// connection (URL must end in '/').
    const ws = new WebSocket(`ws://127.0.0.1:${wispPort}/`);
    const conn = new WispConnection(ws);
    await conn.readyPromise;
    console.log('[test] wisp websocket open');

    // 4) Open a TCP stream to the origin and speak HTTP/1.1 by hand.
    const stream = conn.connect('127.0.0.1', originPort);
    const req = `GET / HTTP/1.1\r\nHost: 127.0.0.1:${originPort}\r\nConnection: close\r\n\r\n`;
    stream.write(new TextEncoder().encode(req));

    // 5) Collect the response until the peer closes (CLOSE) or we time out.
    const chunks = [];
    const got = await new Promise((resolve) => {
      const to = setTimeout(() => resolve('timeout'), 8000);
      const pump = () => {
        let c; while ((c = stream.read()) !== null) chunks.push(Buffer.from(c));
        if (stream.eof) { clearTimeout(to); resolve('eof'); }
      };
      stream.onreadable = pump;
      pump();
    });

    const resp = Buffer.concat(chunks).toString('utf8');
    console.log('[test] stream ended via', got, '- received', resp.length, 'bytes');
    console.log('[test] response head:', JSON.stringify(resp.slice(0, 60)));
    if (resp.includes('200') && resp.includes('WISP_OK hello from origin')) {
      console.log('WISP_TEST_OK fetched real HTTP through WISP');
      exit = 0;
    } else {
      console.log('WISP_TEST_FAIL did not get expected body');
    }
    conn.closeAll();
  } catch (e) {
    console.log('WISP_TEST_FAIL exception:', e && e.message ? e.message : e);
    if (e && e.stack) console.log(e.stack);
  } finally {
    origin.close(); wispHttp.close();
  }
  process.exit(exit);
})();
