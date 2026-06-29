// WISP TCP transport for the WasmFS socket backend (emsdk-patches/wisp_socket.h).
//
// Under WASMFS=1 the socket syscalls are C++ (libwasmfs), not JS -- so the old
// SOCKFS-based wisp shim (wisp-bridge.js + wisp-syscalls.js) can't attach. This
// --js-library instead provides the C-imported hooks the C++ SocketFile calls
// (wisp_open/connect/send/close) and, on incoming WISP frames, calls back into
// the exported C delivery functions (_wisp_deliver / _wisp_set_connected /
// _wisp_set_eof / _wisp_set_error), each of which appends to the socket's rx
// buffer / flips state and wakes the C++ poll() futex.
//
// One real WebSocket to the WISP server, with TCP sockets multiplexed as streams
// keyed by the C++ socket id (== WISP stream id; the ids are monotonic and never
// reused, so no collisions). The WebSocket lives on the runtime main thread R;
// the hooks are __proxy:'sync' so they run there regardless of which Gecko
// pthread issued the syscall (matching the old SOCKFS-proxied-to-main model).
//
// WISP framing: [type:u8][streamId:u32-le][payload]. CONNECT payload =
// [streamType:u8][port:u16-le][host...]; CLOSE payload = [reason:u8].

mergeInto(LibraryManager.library, {
  // --- DNS: keep the synthetic-IP <-> hostname map on the main thread R -------
  // gethostbyname() -> _emscripten_lookup_name allocates a fake 172.x IP and
  // records IP<->name in $DNS. Stock emscripten doesn't proxy it, so when Gecko
  // resolves on a DNS-resolver pthread the mapping lands in THAT worker's
  // (per-thread) $DNS, while wisp_connect (on R) reverse-looks-up an empty map
  // and WISP CONNECTs to the raw IP. Proxy it to R so the alloc and the reverse
  // lookup share one map. (Carried over from wisp-syscalls.js; still a JS
  // override since _emscripten_lookup_name is JS, not a WasmFS C++ syscall.)
  _emscripten_lookup_name__proxy: 'sync',
  _emscripten_lookup_name__deps: ['$UTF8ToString', '$DNS', '$inetPton4'],
  _emscripten_lookup_name: function (name) {
    return inetPton4(DNS.lookup_name(UTF8ToString(name)));
  },

  // --- WISP connection state + helpers (only ever touched on R) --------------
  $WISP__deps: ['$DNS'],
  $WISP: {
    conn: null,
    // Lazily open the single WebSocket to Module.wispUrl (set by index.ts).
    ensureConn: function () {
      if (WISP.conn) return WISP.conn;
      var url = (typeof Module !== 'undefined') && Module.wispUrl;
      if (!url) { err('[wisp] Module.wispUrl unset; networking disabled'); return null; }
      var conn = { ws: null, ready: false, sendQueue: [], streams: new Set(), pending: [] };
      var ws = new WebSocket(url);
      try { ws.binaryType = 'arraybuffer'; } catch (e) {}
      conn.ws = ws;
      ws.addEventListener('open', function () {
        conn.ready = true;
        for (var i = 0; i < conn.sendQueue.length; i++) ws.send(conn.sendQueue[i]);
        conn.sendQueue.length = 0;
        var p = conn.pending; conn.pending = [];
        for (var j = 0; j < p.length; j++) { try { p[j](); } catch (e) {} }
      });
      ws.addEventListener('message', function (e) { WISP._onMessage(conn, e.data); });
      ws.addEventListener('close', function () {
        conn.streams.forEach(function (id) { try { _wisp_set_eof(id); } catch (e) {} });
        conn.streams.clear();
      });
      ws.addEventListener('error', function () {});
      WISP.conn = conn;
      return conn;
    },
    _rawSend: function (conn, buf) {
      if (conn.ready) conn.ws.send(buf); else conn.sendQueue.push(buf);
    },
    _frame: function (conn, id, type, payload) {
      var len = 5 + (payload ? payload.length : 0);
      var u8 = new Uint8Array(len), dv = new DataView(u8.buffer);
      dv.setUint8(0, type); dv.setUint32(1, id >>> 0, true);
      if (payload && payload.length) u8.set(payload, 5);
      WISP._rawSend(conn, u8);
    },
    _onMessage: function (conn, data) {
      var u8 = (data instanceof Uint8Array) ? data : new Uint8Array(data);
      if (u8.length < 5) return;
      var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
      var type = dv.getUint8(0), id = dv.getUint32(1, true);
      if (type === 2 /* DATA */) {
        var n = u8.length - 5;
        if (n > 0 && conn.streams.has(id)) {
          // Copy the payload into the wasm heap; _wisp_deliver appends it to the
          // socket's rx buffer (under the File lock) and wakes the poll() futex.
          var ptr = _malloc(n);
          HEAPU8.set(u8.subarray(5), ptr);
          try { _wisp_deliver(id, ptr, n); } finally { _free(ptr); }
        }
      } else if (type === 4 /* CLOSE */) {
        if (conn.streams.has(id)) { conn.streams.delete(id); try { _wisp_set_eof(id); } catch (e) {} }
      }
      // type 3 (CONTINUE): server->client flow-control credit; ignored (we never
      // overrun a stream's window for normal request sizes).
    },
    doConnect: function (id, ipBe, port) {
      var conn = WISP.ensureConn();
      if (!conn) { try { _wisp_set_error(id, 111 /* ECONNREFUSED */); } catch (e) {} return; }
      // ipBe is network order; on little-endian wasm byte 0 is the first octet.
      var dotted = (ipBe & 0xff) + '.' + ((ipBe >>> 8) & 0xff) + '.' +
                   ((ipBe >>> 16) & 0xff) + '.' + ((ipBe >>> 24) & 0xff);
      var host = dotted;
      try { if (DNS.lookup_addr) { var nm = DNS.lookup_addr(dotted); if (nm) host = nm; } } catch (e) {}
      var go = function () {
        conn.streams.add(id);
        var hb = new TextEncoder().encode(host);
        var payload = new Uint8Array(3 + hb.length), dv = new DataView(payload.buffer);
        dv.setUint8(0, 1 /* ST_TCP */); dv.setUint16(1, port & 0xffff, true); payload.set(hb, 3);
        WISP._frame(conn, id, 1 /* CONNECT */, payload);
        // WISP doesn't ack connects; treat the stream as connected once CONNECT
        // is sent (matches the old shim's optimistic OPEN). Necko's poll then
        // sees POLLOUT and proceeds.
        try { _wisp_set_connected(id); } catch (e) {}
      };
      if (conn.ready) go(); else conn.pending.push(go);
    },
    doSend: function (id, ptr, len) {
      var conn = WISP.conn;
      if (!conn || !conn.streams.has(id)) return;
      // sync-proxied: the calling worker is blocked, so the heap view is stable;
      // _frame copies it into the outgoing frame.
      WISP._frame(conn, id, 2 /* DATA */, HEAPU8.subarray(ptr, ptr + len));
    },
    doClose: function (id) {
      var conn = WISP.conn;
      if (!conn || !conn.streams.has(id)) return;
      conn.streams.delete(id);
      var u8 = new Uint8Array(6), dv = new DataView(u8.buffer);
      dv.setUint8(0, 4 /* CLOSE */); dv.setUint32(1, id >>> 0, true); dv.setUint8(5, 0);
      WISP._rawSend(conn, u8);
    },
  },

  // --- C++ -> JS hooks (proxied to R, where the WebSocket lives) -------------
  wisp_open__proxy: 'sync',
  wisp_open__deps: ['$WISP'],
  wisp_open: function (id) { WISP.ensureConn(); },

  wisp_connect__proxy: 'sync',
  wisp_connect__deps: ['$WISP'],
  wisp_connect: function (id, ipBe, port) { WISP.doConnect(id >>> 0, ipBe >>> 0, port >>> 0); },

  wisp_send__proxy: 'sync',
  wisp_send__deps: ['$WISP'],
  wisp_send: function (id, ptr, len) { WISP.doSend(id >>> 0, ptr, len); },

  wisp_close__proxy: 'sync',
  wisp_close__deps: ['$WISP'],
  wisp_close: function (id) { WISP.doClose(id >>> 0); },
});
