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
// (2) DON'T BUSY-SPIN (the big one). emscripten lists select() (__syscall__newselect)
//     in its proxiedFunctionTable, so by default every select() from a Necko worker
//     is proxied to the runtime MAIN thread. There ENVIRONMENT_IS_PTHREAD is false,
//     so the wrapper can't Atomics.wait -> it returns immediately, and Necko's
//     socket-transport poll loop (PR_Poll maps to select() here) + libevent's IPC
//     select backend BUSY-SPIN at ~100k select/s = ~2 idle cores, and they saturate
//     the main thread + flood it with proxied scans and clock reads during loads.
//     FIX: __syscall__newselect__proxy:'' un-proxies select so the wrapper runs on
//     the CALLING worker (where Atomics.wait IS allowed); we split each call into
//       - a readiness SCAN still proxied to main (wisp_select_scan, __proxy:'sync'),
//         since SOCKFS lives there, and
//       - the worker-side wrapper, which when nothing is ready sleeps in Atomics.wait
//         on a shared futex word (wisp_wakeword). The main thread bumps + notifies
//         that word on any WISP socket activity (wisp-bridge.js) and on cross-thread
//         Dispatch (nsSocketTransportService WispWakeSocketPoll), so the loop wakes
//         immediately; a fallback slice re-scans in case a wakeup is ever missed.
//     Measured: idle active CPU 8.8s/8s -> 0.77s/8s, _emscripten_get_now 60x lower,
//     proxy mailbox_send ~gone; networking + rendering unaffected (microjs, wikipedia).
//     NOTE: poll() (__syscall_poll) is NOT in the proxied table so it already ran on
//     the worker, but NSPR routes everything through select() so poll() is unused.
// Max sleep per poll()/select() before re-scanning, a SAFETY net only: the loop is
// woken immediately by the wakeword on socket activity / Dispatch, so this just
// bounds recovery if a wakeup is missed. (Necko's finite poll timeouts still honored
// via Math.min.)
mergeInto(LibraryManager.library, {
  // $-prefixed so emscripten emits it into BOTH the main module AND the worker
  // (gecko.worker.js). A plain top-level `var` is only in the main scope, so a
  // worker-side reference throws ReferenceError -- which is exactly what broke
  // networking once select() stopped being proxied to main and started running on
  // the socket-transport worker. Functions that use it list it in __deps.
  $WISP_POLL_FALLBACK_MS: 50,

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
  // Sleeps AT MOST one fallback slice (woken early by the wakeword on WISP activity
  // / Dispatch), then returns the scan result -- even if 0. Returning early is always
  // valid (the caller re-checks). poll() only writes revents, so no snapshot needed.
  // NOTE: no __proxy key -> runs on the CALLING thread, where Atomics.wait is allowed.
  // ('none' is NOT "don't proxy" -- the jsifier treats any truthy __proxy, including
  // 'none', as async-proxy.) poll() is unused in practice (NSPR routes via select).
  __syscall_poll__deps: ['wisp_poll_scan', '$WISP_POLL_FALLBACK_MS'],
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
          // emscripten 6.0.1 dropped POLLPRI from its precomputed cDefs (struct_info.json);
          // use the stable musl value (0x2) directly.
          if ((flags & 0x2 /* POLLPRI */) && (ex & mask)) { dstExcept |= mask; total++; }
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
  // UN-PROXY select (THE perf fix; see job (2) up top). emscripten lists select in
  // proxiedFunctionTable and defaults its __proxy to 'sync' (library.js:
  // "if (library[x+'__proxy'] === undefined) library[x+'__proxy']='sync'"), forcing
  // it onto the runtime main thread where it can't Atomics.wait and busy-spins. The
  // empty string is the opt-out: it's a string (the decorator validator rejects a
  // boolean), it's defined (so it survives the `=== undefined -> 'sync'` re-default),
  // and it's falsy (so the jsifier's `if (proxyingMode)` gate skips proxy-wrapping).
  // -> select runs on the calling worker, where Atomics.wait blocks correctly.
  __syscall__newselect__proxy: '',
  __syscall__newselect__deps: ['wisp_select_scan', '$WISP_POLL_FALLBACK_MS'],
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
