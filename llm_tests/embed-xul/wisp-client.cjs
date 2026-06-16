'use strict';
// Minimal WISP v1 client. Multiplexes many TCP streams over one WebSocket.
// Frame: [type:u8][streamID:u32 LE][payload]. CONNECT payload =
// [streamType:u8 (TCP=1)][port:u16 LE][hostname utf8]. DATA payload = raw bytes.
// CONTINUE (server->client) = [buffer:u32 LE] flow-control credit. CLOSE = [reason:u8].
//
// Environment-agnostic: pass any WebSocket-like object (node `ws` or browser
// `WebSocket`). Streams buffer received bytes for non-blocking reads; callers poll
// available()/read() and use onreadable/onclose to drive event loops.

const T_CONNECT = 1, T_DATA = 2, T_CONTINUE = 3, T_CLOSE = 4;
const ST_TCP = 1;

function toU8(d) {
  if (d instanceof Uint8Array) return d;
  if (d instanceof ArrayBuffer) return new Uint8Array(d);
  if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(d))
    return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
  return new Uint8Array(d);
}

class WispStream {
  constructor(conn, id) {
    this.conn = conn; this.id = id;
    this.chunks = [];          // queued received Uint8Arrays
    this.eof = false;          // peer closed (CLOSE received)
    this.closeReason = null;
    this.onreadable = null;    // fired when new bytes arrive or eof
    this.onclose = null;
  }
  _push(u8) { if (u8 && u8.length) this.chunks.push(u8); if (this.onreadable) this.onreadable(); }
  _eof(reason) { this.eof = true; this.closeReason = reason; if (this.onreadable) this.onreadable(); if (this.onclose) this.onclose(reason); }
  available() { let n = 0; for (const c of this.chunks) n += c.length; return n; }
  read(max) {                  // returns Uint8Array (<= max bytes) or null if empty
    if (!this.chunks.length) return null;
    let need = (max == null) ? Infinity : max;
    const out = [];
    while (this.chunks.length && need > 0) {
      const c = this.chunks[0];
      if (c.length <= need) { out.push(c); need -= c.length; this.chunks.shift(); }
      else { out.push(c.subarray(0, need)); this.chunks[0] = c.subarray(need); need = 0; }
    }
    if (out.length === 1) return out[0];
    let total = 0; for (const c of out) total += c.length;
    const r = new Uint8Array(total); let o = 0;
    for (const c of out) { r.set(c, o); o += c.length; }
    return r;
  }
  write(u8) { this.conn._sendFrame(this.id, T_DATA, toU8(u8)); }
  close(reason = 0) {
    if (this.conn.streams.has(this.id)) {
      this.conn._sendClose(this.id, reason);
      this.conn.streams.delete(this.id);
    }
  }
}

class WispConnection {
  constructor(ws) {
    this.ws = ws;
    this.streams = new Map();
    this.nextId = 1;
    this.ready = false;
    this.sendQueue = [];       // frames queued before ws OPEN
    this._readyResolve = null;
    this.readyPromise = new Promise((r) => (this._readyResolve = r));
    try { ws.binaryType = 'arraybuffer'; } catch (e) {}

    const onMsg = (data) => this._onMessage(data);
    const onOpen = () => { this.ready = true; for (const f of this.sendQueue) ws.send(f); this.sendQueue = []; if (this._readyResolve) this._readyResolve(); };
    const onClose = () => { for (const s of this.streams.values()) s._eof(255); this.streams.clear(); };

    if (typeof ws.on === 'function') {           // node `ws` (EventEmitter)
      ws.on('message', (d) => onMsg(d));
      ws.on('open', onOpen);
      ws.on('close', onClose);
      ws.on('error', () => {});
      if (ws.readyState === 1) onOpen();          // already open
    } else {                                      // browser WebSocket
      ws.addEventListener('message', (e) => onMsg(e.data));
      ws.addEventListener('open', onOpen);
      ws.addEventListener('close', onClose);
      ws.addEventListener('error', () => {});
      if (ws.readyState === 1) onOpen();
    }
  }

  _rawSend(buf) {
    if (this.ready) this.ws.send(buf);
    else this.sendQueue.push(buf);
  }

  _sendFrame(id, type, payload) {
    const len = 5 + (payload ? payload.length : 0);
    const u8 = new Uint8Array(len);
    const dv = new DataView(u8.buffer);
    dv.setUint8(0, type);
    dv.setUint32(1, id, true);
    if (payload && payload.length) u8.set(payload, 5);
    this._rawSend(u8);
  }

  _sendClose(id, reason) {
    const u8 = new Uint8Array(6);
    const dv = new DataView(u8.buffer);
    dv.setUint8(0, T_CLOSE);
    dv.setUint32(1, id, true);
    dv.setUint8(5, reason & 0xff);
    this._rawSend(u8);
  }

  _onMessage(data) {
    const u8 = toU8(data);
    if (u8.length < 5) return;
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const type = dv.getUint8(0);
    const id = dv.getUint32(1, true);
    const payload = u8.subarray(5);
    if (type === T_DATA) {
      const s = this.streams.get(id);
      if (s) s._push(payload.slice());           // copy: ws buffer may be reused
    } else if (type === T_CLOSE) {
      const s = this.streams.get(id);
      const reason = payload.length ? payload[0] : 0;
      if (s) { s._eof(reason); this.streams.delete(id); }
    } else if (type === T_CONTINUE) {
      // flow-control credit on stream 0 (initial) or per-stream; tiny requests
      // never overrun the default buffer, so we accept without throttling.
    }
  }

  // Open a TCP stream to host:port. Returns a WispStream immediately (CONNECT is
  // sent now; data may be written before the server confirms — it queues server-side).
  connect(host, port, streamType = ST_TCP) {
    const id = this.nextId++;
    const s = new WispStream(this, id);
    this.streams.set(id, s);
    const hostBytes = new TextEncoder().encode(host);
    const payload = new Uint8Array(3 + hostBytes.length);
    const dv = new DataView(payload.buffer);
    dv.setUint8(0, streamType);
    dv.setUint16(1, port, true);
    payload.set(hostBytes, 3);
    this._sendFrame(id, T_CONNECT, payload);
    return s;
  }

  closeAll() { try { this.ws.close(); } catch (e) {} }
}

module.exports = { WispConnection, WispStream, T_CONNECT, T_DATA, T_CONTINUE, T_CLOSE, ST_TCP };
