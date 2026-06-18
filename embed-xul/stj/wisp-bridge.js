// WISP networking bridge for the emscripten socket layer (browser, main thread).
//
// emscripten's SOCKFS turns each TCP socket into `new WebSocket(ws://addr:port)`
// and drives it with .send / .onopen / .onmessage(ArrayBuffer) / .onclose and
// .readyState (OPEN/CLOSING/CLOSED). We install a shim as the global WebSocket so
// every SOCKFS socket becomes a WISP *stream* multiplexed over ONE real WebSocket
// to a WISP server. Since libxul's socket syscalls are proxied to the runtime main
// thread (proxiedFunctionTable), SOCKFS + this shim live there; the real WebSocket
// and its messages are owned by that thread's event loop.
//
// Call WISP.install(Module, wispUrl) from a main-thread preRun callback.
(function () {
  var T_CONNECT = 1, T_DATA = 2, T_CONTINUE = 3, T_CLOSE = 4, ST_TCP = 1;

  // Wake the worker-side poll()/select() (wisp-syscalls.js) which sleeps in
  // Atomics.wait on the shared futex word `wisp_wakeword`. Called on every socket
  // state change (data in, open, close) so Necko's poll loop notices immediately
  // instead of waiting out its fallback slice. Atomics.notify is allowed on the
  // main thread (only .wait is not).
  function wakePoll() {
    // STJ (single-thread cooperative) build: wake any fiber suspended in an event-driven
    // poll wait immediately on socket activity, so the adaptive poll backoff adds no latency
    // to network reads. This is the early-wake half of the idle-poll-churn fix.
    try {
      var ms = WISP._module;
      if (ms && ms.__STJ && ms.__STJ.wakePollers) ms.__STJ.wakePollers();
    } catch (e) {}
    try {
      var m = WISP._module;
      if (!m || !m._wisp_wakeword) return;
      var idx = m._wisp_wakeword() >> 2;
      Atomics.add(m.HEAP32, idx, 1);
      Atomics.notify(m.HEAP32, idx);
    } catch (e) {}
  }

  function toU8(d) {
    if (d instanceof Uint8Array) return d;
    if (d instanceof ArrayBuffer) return new Uint8Array(d);
    if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    return new Uint8Array(d);
  }

  function WispStream(conn, id) {
    this.conn = conn; this.id = id; this.chunks = [];
    this.eof = false; this.onreadable = null; this.onclose = null;
  }
  WispStream.prototype._push = function (u8) { if (u8 && u8.length) this.chunks.push(u8); if (this.onreadable) this.onreadable(); wakePoll(); };
  WispStream.prototype._eof = function (r) { this.eof = true; if (this.onreadable) this.onreadable(); if (this.onclose) this.onclose(r); wakePoll(); };
  WispStream.prototype.read = function () {
    if (!this.chunks.length) return null;
    return this.chunks.shift();
  };
  WispStream.prototype.write = function (u8) { this.conn._sendFrame(this.id, T_DATA, toU8(u8)); };
  WispStream.prototype.close = function (reason) {
    if (this.conn.streams.has(this.id)) { this.conn._sendClose(this.id, reason | 0); this.conn.streams.delete(this.id); }
  };

  function WispConnection(ws) {
    var self = this;
    this.ws = ws; this.streams = new Map(); this.nextId = 1;
    this.ready = false; this.sendQueue = [];
    this.readyPromise = new Promise(function (res) { self._readyResolve = res; });
    try { ws.binaryType = 'arraybuffer'; } catch (e) {}
    ws.addEventListener('open', function () {
      self.ready = true;
      for (var i = 0; i < self.sendQueue.length; i++) ws.send(self.sendQueue[i]);
      self.sendQueue = [];
      if (self._readyResolve) self._readyResolve();
    });
    ws.addEventListener('message', function (e) { self._onMessage(e.data); });
    ws.addEventListener('close', function () { self.streams.forEach(function (s) { s._eof(255); }); self.streams.clear(); });
    ws.addEventListener('error', function () {});
    if (ws.readyState === 1) { ws.dispatchEvent ? ws.dispatchEvent(new Event('open')) : null; }
  }
  WispConnection.prototype._rawSend = function (buf) { if (this.ready) this.ws.send(buf); else this.sendQueue.push(buf); };
  WispConnection.prototype._sendFrame = function (id, type, payload) {
    var len = 5 + (payload ? payload.length : 0);
    var u8 = new Uint8Array(len), dv = new DataView(u8.buffer);
    dv.setUint8(0, type); dv.setUint32(1, id, true);
    if (payload && payload.length) u8.set(payload, 5);
    this._rawSend(u8);
  };
  WispConnection.prototype._sendClose = function (id, reason) {
    var u8 = new Uint8Array(6), dv = new DataView(u8.buffer);
    dv.setUint8(0, T_CLOSE); dv.setUint32(1, id, true); dv.setUint8(5, reason & 0xff);
    this._rawSend(u8);
  };
  WispConnection.prototype._onMessage = function (data) {
    var u8 = toU8(data);
    if (u8.length < 5) return;
    var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    var type = dv.getUint8(0), id = dv.getUint32(1, true), payload = u8.subarray(5);
    var s = this.streams.get(id);
    if (type === T_DATA) { if (s) s._push(payload.slice()); }
    else if (type === T_CLOSE) { if (s) { s._eof(payload.length ? payload[0] : 0); this.streams.delete(id); } }
    // T_CONTINUE: client->server flow control credit; tiny requests never overrun.
  };
  WispConnection.prototype.connect = function (host, port, streamType) {
    var id = this.nextId++, s = new WispStream(this, id);
    console.log('[wisp] CONNECT stream=' + id + ' ' + host + ':' + port);
    this.streams.set(id, s);
    var hostBytes = new TextEncoder().encode(host);
    var payload = new Uint8Array(3 + hostBytes.length), dv = new DataView(payload.buffer);
    dv.setUint8(0, streamType || ST_TCP); dv.setUint16(1, port, true); payload.set(hostBytes, 3);
    this._sendFrame(id, T_CONNECT, payload);
    return s;
  };

  // WebSocket-shaped shim that SOCKFS instantiates per TCP socket.
  function WispSocketShim(url) {
    var self = this;
    this.url = url; this.binaryType = 'arraybuffer';
    this.CONNECTING = 0; this.OPEN = 1; this.CLOSING = 2; this.CLOSED = 3;
    this.readyState = 0;
    this.onopen = this.onmessage = this.onclose = this.onerror = null;
    this.stream = null;
    // Parse host:port. Handle IPv6 literals ws://[::1]:80 too (the [^:] form
    // would choke on the colons). SOCKFS only ever builds ws://addr:port.
    var m = /^wss?:\/\/(\[[^\]]+\]|[^:\/]+):(\d+)/.exec(url);
    if (!m) { console.warn('[wisp] unparseable socket url: ' + url); this.readyState = 3; return; }
    var rawHost = m[1].replace(/^\[|\]$/g, '');
    var host = WISP._resolveHost(rawHost);
    var port = parseInt(m[2], 10);
    console.log('[wisp] socket ' + url + ' -> ' + host + ':' + port + (host !== rawHost ? ' (dns ' + rawHost + ')' : ''));
    var conn = WISP.conn;
    self._hostport = host + ':' + port; self._rx = 0; self._tx = 0;
    WISP._shims.push(self);
    function open() {
      self.readyState = 1; // OPEN -> SOCKFS poll reports POLLOUT
      self.stream = conn.connect(host, port);
      self.stream.onreadable = function () { self._drain(); };
      self.stream.onclose = function (r) { console.log('[wisp] STREAM_CLOSE id=' + self.stream.id + ' ' + self._hostport + ' rx=' + self._rx + ' tx=' + self._tx + ' reason=' + r); if (self.readyState !== 3) { self.readyState = 3; if (self.onclose) self.onclose({}); } };
      if (self.onopen) self.onopen({});
      self._drain();
      wakePoll();  // socket now writable (POLLOUT) -> wake any waiting poll loop
    }
    if (conn.ready) setTimeout(open, 0);
    else conn.readyPromise.then(function () { setTimeout(open, 0); });
  }
  WispSocketShim.prototype._drain = function () {
    if (!this.stream) return;
    var c;
    while ((c = this.stream.read()) !== null) {
      var ab = c.buffer.slice(c.byteOffset, c.byteOffset + c.byteLength);
      this._rx += ab.byteLength;
      if (this.onmessage) this.onmessage({ data: ab });
    }
    if (this.stream.eof && this.readyState !== 3) { this.readyState = 3; if (this.onclose) this.onclose({}); }
  };
  WispSocketShim.prototype.send = function (data) {
    if (this.stream) { var u = toU8(data); this._tx += u.length; this.stream.write(u); }
  };
  WispSocketShim.prototype.close = function () {
    this.readyState = 2;
    if (this.stream) this.stream.close(0);
    this.readyState = 3;
  };

  var WISP = {
    conn: null,
    _shims: [],
    // Per-connection byte tallies (host:port, bytes received, bytes sent, open?).
    // TLS is opaque so this is per TCP connection, not per URL -- but e.g. all of
    // www.gstatic.com's CSS rides its connection(s), so a tiny rx there proves the
    // response bytes did NOT arrive. Read from the page via window.WISP.stats().
    stats: function () {
      return WISP._shims.map(function (s) {
        return { host: s._hostport, rx: s._rx, tx: s._tx, open: s.readyState !== 3 };
      });
    },
    RealWebSocket: (typeof WebSocket !== 'undefined') ? WebSocket : null,
    // Map an emscripten synthetic DNS IP back to its hostname so WISP CONNECT uses
    // the real name; pass real/literal IPs through unchanged.
    _resolveHost: function (ip) {
      try {
        if (typeof DNS !== 'undefined' && DNS.lookup_addr) {
          var name = DNS.lookup_addr(ip);
          if (name) return name;
        }
      } catch (e) {}
      return ip;
    },
    _module: null,
    install: function (Module, wispUrl) {
      if (WISP.conn) return;
      WISP._module = Module;
      var RealWS = WISP.RealWebSocket || WebSocket;
      var ws = new RealWS(wispUrl);
      WISP.conn = new WispConnection(ws);
      // Route all subsequent `new WebSocket(...)` (i.e. SOCKFS sockets) through WISP.
      try { globalThis.WebSocket = WispSocketShim; } catch (e) { WebSocket = WispSocketShim; }
      Module.__wispReady = WISP.conn.readyPromise;
    },
  };

  (typeof globalThis !== 'undefined' ? globalThis : this).WISP = WISP;
})();
