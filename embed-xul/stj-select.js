// STJ: override emscripten's select() syscall. Stock __syscall__newselect (a) asserts
// nfds <= 64 (only scans the first two fd_set words) and (b) ignores the timeout and
// returns readiness instantly. The IPC IO thread's message pump select()s on > 64 fds
// -> assert -> the IO thread dies -> XRE_GetAsyncIOEventTarget() (= IOThread message
// loop) becomes null -> every PBackground PortLink call hits a null function.
//
// This override scans the FULL fd_set (up to FD_SETSIZE) and stays NON-blocking; the
// cooperative wait is done by __wrap_select in jspi-threads.c (loop + stj_sleep), so it
// yields THROUGH the fiber scheduler (letting the pipe-writer fiber run) rather than
// busy-spinning.
mergeInto(LibraryManager.library, {
  __syscall__newselect__deps: ['$SYSCALLS', '$FS'],
  __syscall__newselect: function (nfds, readfds, writefds, exceptfds, timeout) {
    var POLLIN = 1, POLLOUT = 4, POLLERR = 8, POLLHUP = 16;
    var total = 0;
    var nwords = (nfds + 31) >> 5;
    var H = HEAP32;
    var getw = function (base, w) { return base ? H[(base >> 2) + w] : 0; };
    var dstR = [], dstW = [], dstE = [];
    for (var i = 0; i < nwords; i++) { dstR[i] = 0; dstW[i] = 0; dstE[i] = 0; }
    for (var fd = 0; fd < nfds; fd++) {
      var w = fd >> 5, bit = 1 << (fd & 31);
      var inR = getw(readfds, w) & bit, inW = getw(writefds, w) & bit, inE = getw(exceptfds, w) & bit;
      if (!(inR || inW || inE)) continue;
      var stream = FS.getStream(fd);
      var flags = stream ? SYSCALLS.DEFAULT_POLLMASK : 0;
      if (stream && stream.stream_ops.poll) flags = stream.stream_ops.poll(stream, -1);
      if ((flags & POLLIN) && inR) { dstR[w] |= bit; total++; }
      if ((flags & POLLOUT) && inW) { dstW[w] |= bit; total++; }
      if ((flags & (POLLERR | POLLHUP)) && inE) { dstE[w] |= bit; total++; }
    }
    var setw = function (base, arr) { if (!base) return; for (var w = 0; w < nwords; w++) HEAP32[(base >> 2) + w] = arr[w]; };
    setw(readfds, dstR); setw(writefds, dstW); setw(exceptfds, dstE);
    return total;
  },
});
