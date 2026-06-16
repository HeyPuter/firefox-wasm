// Repo-local emscripten --js-library override (keeps the SYSTEM emsdk pristine --
// wired in via build-embed-full.sh with `--js-library wisp-syscalls.js`).
//
// mergeInto with no options silently overrides the built-in definitions (later
// wins), so these replace emscripten's library_syscall.js versions without
// touching the emsdk install.
//
// TWO jobs:
//
// (1) fd-set coverage + ceiling. Upstream select() (__syscall__newselect) only
//     inspects the first two 32-bit words of each fd_set (fds 0..63), and socket()
//     asserts fd < 64. A connection-heavy page opens many parallel sockets on
//     initial load, pushing socket fds past 63 -> invisible to select() -> stalls.
//     We scan the full fd_set (musl FD_SETSIZE=1024) and raise the socket() ceiling.
//
// (2) DON'T BUSY-SPIN. emscripten's poll()/select() are non-blocking: they scan fd
//     readiness and return immediately, ignoring the timeout (they can't block --
//     SOCKFS + the WISP shim live on the runtime main thread, which must stay free
//     to receive WISP WebSocket messages). But Necko's socket-transport thread
//     calls poll(timeout) EXPECTING it to block until a socket is ready, so it
//     turns into a CPU-burning busy-spin during every network wait -- each
//     iteration proxies a syscall to the main thread and reads the clock (both very
//     expensive in wasm). Fix: split each call into
//       - a readiness SCAN proxied to the main thread (where SOCKFS lives), and
//       - a worker-side wrapper that, when nothing is ready, sleeps in Atomics.wait
//         on a shared futex word (wisp_wakeword) instead of spinning. The main
//         thread bumps + notifies that word on any WISP socket activity (see
//         wisp-bridge.js) so the loop wakes immediately; a small fallback slice
//         re-scans for non-socket fds (e.g. the PollableEvent self-pipe) whose
//         readiness changes don't go through WISP.
// Max sleep per poll()/select() before re-scanning, as a SAFETY net only: the
// poll loop is woken immediately by the shared wakeword on socket activity
// (wisp-bridge.js) and on cross-thread Dispatch (nsSocketTransportService, which
// bumps wisp_wakeword since emscripten has no PollableEvent). So this large value
// just bounds recovery if a wakeup is ever missed; it does NOT cost continuous
// polling. (Necko's own finite poll timeouts are still respected via Math.min.)
var WISP_POLL_FALLBACK_MS = 250;

mergeInto(LibraryManager.library, {
  __syscall_socket__proxy: 'sync',
  __syscall_socket__deps: ['$SOCKFS'],
  __syscall_socket: function (domain, type, protocol) {
    var sock = SOCKFS.createSocket(domain, type, protocol);
    return sock.stream.fd;
  },

  // --- DNS: keep the synthetic-IP <-> hostname map on the proxied (main) thread ---
  // gethostbyname() calls _emscripten_lookup_name to allocate a fake 172.29.x.x IP
  // and record IP<->hostname in $DNS.address_map. Stock emscripten proxies
  // getaddrinfo to main but NOT _emscripten_lookup_name, so when Gecko resolves via
  // gethostbyname on a DNS-resolver pthread, the mapping lands in THAT worker's
  // (per-thread) map -- while the WISP socket shim runs on the runtime main thread
  // and reverse-looks-up an empty map -> WISP CONNECT goes to the raw 172.29.x.x
  // instead of the hostname. Proxy it to main so the alloc and the reverse lookup
  // share one map.
  // (Replaces a non-reproducible hand-edit to the system emsdk's library.js.)
  _emscripten_lookup_name__proxy: 'sync',
  _emscripten_lookup_name__deps: ['$UTF8ToString', '$DNS', '$inetPton4'],
  _emscripten_lookup_name: function (name) {
    var nameString = UTF8ToString(name);
    return inetPton4(DNS.lookup_name(nameString));
  },

  // --- poll() ------------------------------------------------------------------
  // Readiness scan (runs on the main thread; identical to emscripten's default
  // __syscall_poll body). Reads pollfd.fd/.events, writes pollfd.revents.
  wisp_poll_scan__proxy: 'sync',
  wisp_poll_scan__deps: ['$FS', '$SYSCALLS'],
  wisp_poll_scan: function (fds, nfds) {
    var nonzero = 0;
    for (var i = 0; i < nfds; i++) {
      var pollfd = fds + {{{ C_STRUCTS.pollfd.__size__ }}} * i;
      var fd = {{{ makeGetValue('pollfd', C_STRUCTS.pollfd.fd, 'i32') }}};
      var events = {{{ makeGetValue('pollfd', C_STRUCTS.pollfd.events, 'i16') }}};
      var mask = {{{ cDefs.POLLNVAL }}};
      var stream = FS.getStream(fd);
      if (stream) {
        mask = SYSCALLS.DEFAULT_POLLMASK;
        if (stream.stream_ops.poll) {
          mask = stream.stream_ops.poll(stream, -1);
        }
      }
      mask &= events | {{{ cDefs.POLLERR }}} | {{{ cDefs.POLLHUP }}};
      if (mask) nonzero++;
      {{{ makeSetValue('pollfd', C_STRUCTS.pollfd.revents, 'mask', 'i16') }}};
    }
    return nonzero;
  },
  // Worker-side blocking wrapper. timeout is in ms (<0 = infinite, 0 = poll once).
  // We sleep AT MOST one fallback slice (woken early by the wakeword on WISP
  // activity), then return the scan result -- even if 0. Returning early from
  // poll() is always valid (the caller re-checks), and it is REQUIRED here: this
  // platform has no working PollableEvent (pipe2 is unsupported), so Necko's
  // socket-transport loop relies on poll() returning to fall through and process
  // its event queue. Blocking indefinitely (waiting for fd readiness that only
  // arrives via the queue) would deadlock. So this just throttles the old busy-
  // spin to ~1/slice Hz. poll() only writes revents, so no snapshot is needed.
  // NOTE: no __proxy key -> runs on the CALLING thread (the socket-transport
  // worker), where Atomics.wait is allowed. ('none' is NOT "don't proxy" -- the
  // jsifier treats any truthy __proxy, including 'none', as async-proxy.)
  __syscall_poll__deps: ['wisp_poll_scan'],
  __syscall_poll: function (fds, nfds, timeout) {
    if (timeout === 0 || typeof ENVIRONMENT_IS_PTHREAD === 'undefined' || !ENVIRONMENT_IS_PTHREAD) {
      return _wisp_poll_scan(fds, nfds);
    }
    var wi = _wisp_wakeword() >> 2;
    var cur = Atomics.load(HEAP32, wi);
    var total = _wisp_poll_scan(fds, nfds);
    if (total) { globalThis.__wispGen = cur; return total; }
    // A wakeword bump since our last return means a signal (e.g. a cross-thread
    // Dispatch, not reflected in fd readiness) arrived between polls -- return now
    // so Necko drains its event queue instead of sleeping on a stale generation.
    // (undefined on the first call also returns, forcing an initial drain.)
    if (globalThis.__wispGen !== cur) { globalThis.__wispGen = cur; return 0; }
    var slice = (timeout < 0) ? WISP_POLL_FALLBACK_MS : Math.min(timeout, WISP_POLL_FALLBACK_MS);
    Atomics.wait(HEAP32, wi, cur, slice);
    globalThis.__wispGen = Atomics.load(HEAP32, wi);
    return _wisp_poll_scan(fds, nfds);
  },

  // --- select() ----------------------------------------------------------------
  // Readiness scan (runs on the main thread). fd_set is an array of 32-bit words;
  // fd N lives in word (N>>5), bit (N&31). Iterate every word covering nfds so fds
  // >= 64 are handled (upstream only read words 0 and 1). Rewrites the sets in
  // place (clears non-ready bits), per select() semantics.
  wisp_select_scan__proxy: 'sync',
  wisp_select_scan__deps: ['$SYSCALLS'],
  wisp_select_scan: function (nfds, readfds, writefds, exceptfds) {
    var total = 0;
    var nwords = (nfds + 31) >> 5;
    for (var w = 0; w < nwords; w++) {
      var rd = readfds ? {{{ makeGetValue('readfds', 'w*4', 'i32') }}} : 0;
      var wr = writefds ? {{{ makeGetValue('writefds', 'w*4', 'i32') }}} : 0;
      var ex = exceptfds ? {{{ makeGetValue('exceptfds', 'w*4', 'i32') }}} : 0;
      var any = rd | wr | ex;
      var dstRead = 0, dstWrite = 0, dstExcept = 0;
      if (any) {
        for (var bit = 0; bit < 32; bit++) {
          var fd = (w << 5) + bit;
          if (fd >= nfds) break;
          var mask = 1 << bit;
          if (!(any & mask)) continue;

          var stream = SYSCALLS.getStreamFromFD(fd);
          var flags = SYSCALLS.DEFAULT_POLLMASK;
          if (stream.stream_ops.poll) {
            flags = stream.stream_ops.poll(stream, -1);
          }
          if ((flags & {{{ cDefs.POLLIN }}}) && (rd & mask)) { dstRead |= mask; total++; }
          if ((flags & {{{ cDefs.POLLOUT }}}) && (wr & mask)) { dstWrite |= mask; total++; }
          if ((flags & {{{ cDefs.POLLPRI }}}) && (ex & mask)) { dstExcept |= mask; total++; }
        }
      }
      if (readfds) {{{ makeSetValue('readfds', 'w*4', 'dstRead', 'i32') }}};
      if (writefds) {{{ makeSetValue('writefds', 'w*4', 'dstWrite', 'i32') }}};
      if (exceptfds) {{{ makeSetValue('exceptfds', 'w*4', 'dstExcept', 'i32') }}};
    }
    return total;
  },
  // Worker-side blocking wrapper. Like poll() above, sleeps at most one fallback
  // slice then returns the scan result. The scan rewrites the fd_sets in place, so
  // we snapshot the requested masks and restore them before the post-wait re-scan.
  // No __proxy key -> runs on the calling worker (see poll() note above).
  __syscall__newselect__deps: ['wisp_select_scan'],
  __syscall__newselect: function (nfds, readfds, writefds, exceptfds, timeout) {
    var timeoutMs = -1;
    if (timeout) {
      // timeval: tv_sec then tv_usec; in wasm32 the second field is at offset 4.
      var tv_sec = {{{ makeGetValue('timeout', 0, 'i32') }}},
          tv_usec = {{{ makeGetValue('timeout', 4, 'i32') }}};
      timeoutMs = (tv_sec * 1000) + (tv_usec / 1000);
    }
    if (timeoutMs === 0 || typeof ENVIRONMENT_IS_PTHREAD === 'undefined' || !ENVIRONMENT_IS_PTHREAD) {
      return _wisp_select_scan(nfds, readfds, writefds, exceptfds);
    }
    var nbytes = ((nfds + 31) >> 5) * 4;
    var snapR = readfds ? HEAPU8.slice(readfds, readfds + nbytes) : null;
    var snapW = writefds ? HEAPU8.slice(writefds, writefds + nbytes) : null;
    var snapE = exceptfds ? HEAPU8.slice(exceptfds, exceptfds + nbytes) : null;
    var wi = _wisp_wakeword() >> 2;
    var cur = Atomics.load(HEAP32, wi);
    var total = _wisp_select_scan(nfds, readfds, writefds, exceptfds);
    if (total) { globalThis.__wispGen = cur; return total; }
    // See poll() above: a bump since our last return -> drain now. fd_sets were
    // zeroed by the scan (total 0), which is the correct "no fds ready" result.
    if (globalThis.__wispGen !== cur) { globalThis.__wispGen = cur; return 0; }
    var slice = (timeoutMs < 0) ? WISP_POLL_FALLBACK_MS : Math.min(timeoutMs, WISP_POLL_FALLBACK_MS);
    Atomics.wait(HEAP32, wi, cur, slice);
    globalThis.__wispGen = Atomics.load(HEAP32, wi);
    if (snapR) HEAPU8.set(snapR, readfds);
    if (snapW) HEAPU8.set(snapW, writefds);
    if (snapE) HEAPU8.set(snapE, exceptfds);
    return _wisp_select_scan(nfds, readfds, writefds, exceptfds);
  },
});
