// Browser-level CDP console/exception capture -- the DevTools-equivalent way to
// see crashes on emscripten pthread Web Workers from a headless run. Playwright's
// page.on('console') / a page-level CDP session only sees the page target; worker
// targets need Runtime.enable on THEIR session, which Playwright's flatten wrapper
// doesn't expose. So we connect a raw CDP client to the browser endpoint, auto-
// attach to every target (page + all workers), enable Runtime on each child by
// sessionId, and relay Runtime.consoleAPICalled + Runtime.exceptionThrown.
//
// Usage: launch chromium with --remote-debugging-port=<port>, then
//   const stop = await startCDPCapture(port, (line) => console.log(line));
const WebSocket = require('/home/velzie/src/puter/node_modules/ws');
const http = require('http');

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } }); }).on('error', reject);
  });
}

function fmtArg(a) {
  if (!a) return '';
  if (a.value !== undefined) return typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value);
  return a.description || a.unserializableValue || a.type || '';
}

// Connect to the browser CDP endpoint and relay console + exceptions from every
// target. Retries until the endpoint is up. Returns a stop() function.
async function startCDPCapture(port, log) {
  let ver;
  for (let i = 0; i < 50; i++) {
    try { ver = await getJSON(`http://127.0.0.1:${port}/json/version`); break; } catch (e) { await new Promise((r) => setTimeout(r, 100)); }
  }
  if (!ver || !ver.webSocketDebuggerUrl) throw new Error('no CDP browser endpoint on port ' + port);

  const ws = new WebSocket(ver.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
  let nextId = 1;
  const send = (method, params, sessionId) =>
    ws.send(JSON.stringify(Object.assign({ id: nextId++, method, params: params || {} }, sessionId ? { sessionId } : {})));

  await new Promise((resolve, reject) => { ws.on('open', resolve); ws.on('error', reject); });
  // Browser-level auto-attach to all targets (flatten => one connection, events
  // carry sessionId). waitForDebuggerOnStart:true so a worker is PAUSED on attach
  // until we enable Runtime + resume it -- otherwise an early crash (e.g. during
  // startup) fires before Runtime.enable lands and the exception is missed.
  send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  send('Target.setDiscoverTargets', { discover: true });

  ws.on('message', (data) => {
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    const p = m.params || {};
    if (m.method === 'Target.attachedToTarget') {
      const sid = p.sessionId;
      const ti = p.targetInfo || {};
      if (process.env.CDP_DEBUG) log(`[cdp:attached] ${ti.type} ${(ti.url || '').split('/').pop()} sid=${sid}`);
      // Enable Runtime + Log on the child target so we get its console/exceptions.
      send('Runtime.enable', {}, sid);
      send('Log.enable', {}, sid);
      send('Runtime.setAsyncCallStackDepth', { maxDepth: 32 }, sid);
      // Auto-attach is NOT hierarchical: propagate it into this target's own
      // children (a page's Web Workers, a worker's nested workers) so emscripten
      // pthread worker targets attach too.
      send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, sid);
      // Resume the (paused-on-start) target now that Runtime is enabled, so it can
      // run -- and any exception it throws is now captured.
      send('Runtime.runIfWaitingForDebugger', {}, sid);
    } else if (m.method === 'Runtime.consoleAPICalled') {
      const text = (p.args || []).map(fmtArg).join(' ');
      log(`[cdp:${p.type}] ${text}`);
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = p.exceptionDetails || {};
      const ex = d.exception || {};
      const desc = ex.description || ex.value || d.text || '(no description)';
      const st = d.stackTrace && d.stackTrace.callFrames
        ? '\n    ' + d.stackTrace.callFrames.slice(0, 25).map((f) => `${f.functionName || '<anon>'} (${(f.url || '').split('/').pop()}:${f.lineNumber})`).join('\n    ')
        : '';
      log(`[cdp:EXCEPTION] ${desc}${st}`);
    } else if (m.method === 'Log.entryAdded') {
      const e = p.entry || {};
      log(`[cdp:log:${e.level}] ${e.text}`);
    }
  });

  return () => { try { ws.close(); } catch (e) {} };
}

module.exports = { startCDPCapture };
