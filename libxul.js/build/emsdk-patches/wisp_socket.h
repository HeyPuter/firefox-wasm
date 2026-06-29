// WISP socket backend for WasmFS.
//
// Stock WasmFS stubs every socket syscall to -ENOSYS (system/lib/wasmfs/
// syscalls.cpp) and its poll() never blocks. This header reinstates real TCP
// sockets, multiplexed over a single WISP WebSocket, BELOW the syscall line so
// they survive WASMFS=1 (the old SOCKFS-based wisp shim cannot -- its JS
// syscall overrides can't replace wasm-internal C++ symbols).
//
// Model (mirrors the old SOCKFS+WISP stack, relocated):
//   * Each socket is a SocketFile (a DataFile on NullBackend, like PipeFile),
//     added to the WasmFS file table so dup/close/read/write/poll just work.
//   * Received bytes live in a per-socket buffer in shared wasm memory, guarded
//     by the File mutex. recv() drains it locally on the calling thread -- no
//     proxy round-trip. send()/connect()/close() are fire-and-forget posts to
//     the JS side (build/wisp-net.js, --js-library) which owns the one WebSocket.
//   * poll() (and therefore select(), which musl implements on top of poll())
//     computes readiness from socket state and BLOCKS on a futex wakeword that
//     the JS side bumps on socket activity. WasmFS syscalls run on the calling
//     pthread, which may Atomics.wait -- so this blocks correctly without ever
//     touching the runtime main thread.
//
// Naming: the C symbols the JS library *provides* (wisp_open/connect/send/close)
// have no leading underscore, so the --js-library keys match verbatim. The C
// symbols the JS library *calls* are exported as _wisp_deliver / _wisp_*  (the
// usual emscripten export mangling); list them in EXPORTED_FUNCTIONS.
//
// Included once, by syscalls.cpp. Stateful symbols here are intentionally
// non-inline (single TU) so __syscall_setsockopt overrides libc's weak stub.

#pragma once

#include <atomic>
#include <climits>
#include <cstdint>
#include <deque>
#include <memory>
#include <mutex>
#include <unordered_map>

#include <errno.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <poll.h>
#include <sys/socket.h>

#include <emscripten/emscripten.h> // emscripten_get_now
#include <emscripten/threading.h>  // emscripten_futex_wait / _wake

#include "file.h"
#include "file_table.h"
#include "wasmfs.h"

namespace wasmfs {
namespace wisp {

// ---------------------------------------------------------------------------
// JS hooks (defined in build/wisp-net.js). Called from C++ on the calling
// thread; the js-library marks them proxied to the thread that owns the WISP
// WebSocket, so they behave as fire-and-forget posts. `ip` is big-endian
// (network order) IPv4; `port` is host order.
// ---------------------------------------------------------------------------
extern "C" {
void wisp_open(uint32_t id);
void wisp_connect(uint32_t id, uint32_t ip_be, uint32_t port);
void wisp_send(uint32_t id, const uint8_t* buf, uint32_t len);
void wisp_close(uint32_t id);
}

// Safety net: longest a blocked poll() sleeps before re-scanning even with no
// wake. The wakeword wakes it immediately on socket activity; this only bounds
// recovery if a wake is ever missed (and honors Necko's finite poll timeouts).
static const double POLL_FALLBACK_MS = 50.0;

// The futex word poll() blocks on. Bumped + woken by the delivery hooks below.
inline std::atomic<int32_t>& wakeword() {
  static std::atomic<int32_t> w{0};
  return w;
}
inline void pollWake() {
  wakeword().fetch_add(1, std::memory_order_release);
  emscripten_futex_wake((void*)&wakeword(), INT_MAX);
}

class SocketFile;

// id -> socket, as weak_ptr so a JS-side delivery that races with close() is
// lifetime-safe (lock() yields null once the fd's OpenFileState dropped the
// last strong ref). The file table owns the strong ref.
inline std::mutex& registryMutex() {
  static std::mutex m;
  return m;
}
inline std::unordered_map<uint32_t, std::weak_ptr<SocketFile>>& registry() {
  static std::unordered_map<uint32_t, std::weak_ptr<SocketFile>> r;
  return r;
}
inline uint32_t nextId() {
  static std::atomic<uint32_t> n{1};
  return n.fetch_add(1, std::memory_order_relaxed);
}

class SocketFile : public DataFile {
public:
  const uint32_t id;
  const int domain;
  const int type;
  const int protocol;

  SocketFile(int domain, int type, int protocol)
    : DataFile(S_IRUGO | S_IWUGO, NullBackend, S_IFSOCK),
      id(nextId()), domain(domain), type(type), protocol(protocol) {
    seekable = false;
  }

  SocketFile* asSocket() override { return this; }

  // ---- syscall-entry helpers (lock the File themselves) ----
  ssize_t recvLocking(uint8_t* buf, size_t len) {
    std::lock_guard<std::recursive_mutex> g(mutex);
    return drainLocked(buf, len);
  }
  ssize_t sendLocking(const uint8_t* buf, size_t len) {
    std::lock_guard<std::recursive_mutex> g(mutex);
    return sendLocked(buf, len);
  }
  void startConnect(uint32_t ipBe, uint16_t port) {
    {
      std::lock_guard<std::recursive_mutex> g(mutex);
      peerIpBe = ipBe;
      peerPort = port;
      connecting = true;
    }
    // CRITICAL: release the mutex before proxying. wisp_connect is sync-proxied
    // to the main browser thread, whose doConnect() calls back into
    // wisp_set_connected/wisp_set_error -> markConnected()/markError(), which
    // re-lock THIS File mutex. If we held it across the proxy, the worker would
    // block here holding the lock while the main thread spins trying to take it
    // -- and the main browser thread cannot Atomics.wait, so it busy-spins
    // forever: a hard deadlock. (The send/recv paths are safe: doSend/doClose on
    // the main thread never re-lock this mutex.)
    wisp_connect(id, ipBe, port);
  }
  int takeError() { // SO_ERROR: read-and-clear
    std::lock_guard<std::recursive_mutex> g(mutex);
    int e = soError;
    soError = 0;
    return e;
  }
  void getPeer(uint32_t* ipBe, uint16_t* port) {
    std::lock_guard<std::recursive_mutex> g(mutex);
    *ipBe = peerIpBe;
    *port = peerPort;
  }

  // ---- poll readiness (locks internally) ----
  int pollMask() {
    std::lock_guard<std::recursive_mutex> g(mutex);
    int m = 0;
    if (!rx.empty() || eof) m |= POLLIN;
    if (connected) m |= POLLOUT; // writable once the WISP stream is established
    if (soError) m |= POLLERR;
    if (eof) m |= POLLHUP;
    return m;
  }

  // ---- delivery, called on the WISP thread via the extern "C" shims ----
  void deliver(const uint8_t* data, uint32_t len) {
    {
      std::lock_guard<std::recursive_mutex> g(mutex);
      rx.insert(rx.end(), data, data + len);
    }
    pollWake();
  }
  void markConnected() {
    {
      std::lock_guard<std::recursive_mutex> g(mutex);
      connecting = false;
      connected = true;
    }
    pollWake();
  }
  void markEof() {
    {
      std::lock_guard<std::recursive_mutex> g(mutex);
      eof = true;
    }
    pollWake();
  }
  void markError(int err) {
    {
      std::lock_guard<std::recursive_mutex> g(mutex);
      soError = err;
      eof = true;
      connecting = false;
    }
    pollWake();
  }

protected:
  // ---- DataFile overrides (the caller already holds the File mutex) ----
  int open(oflags_t) override { return 0; }
  int close() override {
    wisp_close(id);
    std::lock_guard<std::mutex> g(registryMutex());
    registry().erase(id);
    return 0;
  }
  ssize_t read(uint8_t* buf, size_t len, off_t) override {
    return drainLocked(buf, len);
  }
  ssize_t write(const uint8_t* buf, size_t len, off_t) override {
    return sendLocked(buf, len);
  }
  int flush() override { return 0; }
  off_t getSize() override { return (off_t)rx.size(); }
  int setSize(off_t) override { return -ESPIPE; }

private:
  std::deque<uint8_t> rx; // received bytes awaiting recv()
  bool connecting = false;
  bool connected = false;
  bool eof = false; // peer sent FIN / stream closed
  int soError = 0;  // pending SO_ERROR
  uint32_t peerIpBe = 0;
  uint16_t peerPort = 0;

  // Both assume the File mutex is held.
  ssize_t drainLocked(uint8_t* buf, size_t len) {
    if (rx.empty()) {
      return eof ? 0 : -EAGAIN; // 0 == EOF; EAGAIN == would block (Necko polls)
    }
    size_t n = len < rx.size() ? len : rx.size();
    for (size_t i = 0; i < n; i++) {
      buf[i] = rx.front();
      rx.pop_front();
    }
    return (ssize_t)n;
  }
  ssize_t sendLocked(const uint8_t* buf, size_t len) {
    if (soError) {
      int e = soError;
      soError = 0;
      return -e;
    }
    if (eof) return -EPIPE;
    if (len == 0) return 0;
    // WISP buffers on the JS side, so a send always "succeeds" from here.
    wisp_send(id, buf, (uint32_t)len);
    return (ssize_t)len;
  }
};

// Recover a SocketFile from an fd (null if the fd is not a socket).
inline std::shared_ptr<SocketFile> socketFromFd(int fd) {
  auto openFile = wasmFS.getFileTable().locked().getEntry(fd);
  if (!openFile) return nullptr;
  auto file = openFile->locked().getFile();
  if (file->asSocket()) {
    return std::static_pointer_cast<SocketFile>(file);
  }
  return nullptr;
}

// ===========================================================================
// Syscall bodies (called from the one-line forwarders patched into
// syscalls.cpp). All take/return the raw syscall ABI.
// ===========================================================================

inline int do_socket(int domain, int type, int protocol) {
  int base = type & 0xff; // strip SOCK_NONBLOCK / SOCK_CLOEXEC
  if ((domain != AF_INET && domain != AF_INET6) || base != SOCK_STREAM) {
    return -EAFNOSUPPORT; // only TCP is modeled
  }
  auto sock = std::make_shared<SocketFile>(domain, base, protocol);
  std::shared_ptr<OpenFileState> open;
  int err = OpenFileState::create(sock, O_RDWR, open);
  if (err) return err;
  {
    std::lock_guard<std::mutex> g(registryMutex());
    registry()[sock->id] = sock;
  }
  int fd = wasmFS.getFileTable().locked().addEntry(open);
  wisp_open(sock->id);
  return fd;
}

inline int do_connect(int fd, intptr_t addr, socklen_t len) {
  auto s = socketFromFd(fd);
  if (!s) return -ENOTSOCK;
  if (!addr || (size_t)len < sizeof(sockaddr_in)) return -EINVAL;
  auto* sa = (sockaddr_in*)addr;
  uint32_t ipBe = (uint32_t)sa->sin_addr.s_addr; // network order
  uint16_t port = ntohs(sa->sin_port);
  s->startConnect(ipBe, port);
  // Non-blocking connect: Necko polls for POLLOUT, which we raise once the WISP
  // stream is established (markConnected from the JS side).
  return -EINPROGRESS;
}

inline ssize_t do_sendto(int fd, intptr_t msg, size_t len, int /*flags*/,
                         intptr_t /*addr*/, socklen_t /*alen*/) {
  auto s = socketFromFd(fd);
  if (!s) return -ENOTSOCK;
  return s->sendLocking((const uint8_t*)msg, len);
}

inline ssize_t do_recvfrom(int fd, intptr_t buf, size_t len, int /*flags*/,
                           intptr_t addr, intptr_t alen) {
  auto s = socketFromFd(fd);
  if (!s) return -ENOTSOCK;
  ssize_t r = s->recvLocking((uint8_t*)buf, len);
  if (r >= 0 && addr) {
    uint32_t ipBe;
    uint16_t port;
    s->getPeer(&ipBe, &port);
    auto* sa = (sockaddr_in*)addr;
    sa->sin_family = AF_INET;
    sa->sin_port = htons(port);
    sa->sin_addr.s_addr = ipBe;
    if (alen) *(socklen_t*)alen = sizeof(sockaddr_in);
  }
  return r;
}

// sendmsg/recvmsg: walk the iovec array, reusing the stream send/recv.
inline ssize_t do_sendmsg(int fd, intptr_t msg, int /*flags*/) {
  auto s = socketFromFd(fd);
  if (!s) return -ENOTSOCK;
  auto* mh = (struct msghdr*)msg;
  ssize_t total = 0;
  for (int i = 0; i < (int)mh->msg_iovlen; i++) {
    auto& iov = mh->msg_iov[i];
    if (iov.iov_len == 0) continue;
    ssize_t r = s->sendLocking((const uint8_t*)iov.iov_base, iov.iov_len);
    if (r < 0) return total > 0 ? total : r;
    total += r;
    if ((size_t)r < iov.iov_len) break;
  }
  return total;
}

inline ssize_t do_recvmsg(int fd, intptr_t msg, int /*flags*/) {
  auto s = socketFromFd(fd);
  if (!s) return -ENOTSOCK;
  auto* mh = (struct msghdr*)msg;
  ssize_t total = 0;
  for (int i = 0; i < (int)mh->msg_iovlen; i++) {
    auto& iov = mh->msg_iov[i];
    if (iov.iov_len == 0) continue;
    ssize_t r = s->recvLocking((uint8_t*)iov.iov_base, iov.iov_len);
    if (r < 0) return total > 0 ? total : r;
    total += r;
    if ((size_t)r < iov.iov_len) break; // drained what was available
  }
  return total;
}

inline int do_getsockopt(int fd, int level, int optname, intptr_t optval,
                         intptr_t optlen) {
  auto s = socketFromFd(fd);
  if (!s) return -ENOTSOCK;
  if (!optval || !optlen) return -EFAULT;
  auto* outLen = (socklen_t*)optlen;
  if ((size_t)*outLen < sizeof(int)) return -EINVAL;
  int val = 0;
  if (level == SOL_SOCKET && optname == SO_ERROR) {
    val = s->takeError(); // read-and-clear; 0 => connect succeeded
  } else if (level == SOL_SOCKET && optname == SO_TYPE) {
    val = s->type;
  }
  // Everything else reports 0 (fine for a client: SO_SNDBUF probes etc.)
  *(int*)optval = val;
  *outLen = sizeof(int);
  return 0;
}

// setsockopt: ignore every option (TCP_NODELAY, SO_KEEPALIVE, ...). WISP has no
// per-stream socket options; returning 0 keeps Necko happy.
inline int do_setsockopt(int /*fd*/, int /*level*/, int /*optname*/,
                         intptr_t /*optval*/, socklen_t /*optlen*/) {
  return 0;
}

inline int do_getpeername(int fd, intptr_t addr, intptr_t len) {
  auto s = socketFromFd(fd);
  if (!s) return -ENOTSOCK;
  if (!addr || !len || *(socklen_t*)len < sizeof(sockaddr_in)) return -EINVAL;
  uint32_t ipBe;
  uint16_t port;
  s->getPeer(&ipBe, &port);
  auto* sa = (sockaddr_in*)addr;
  sa->sin_family = AF_INET;
  sa->sin_port = htons(port);
  sa->sin_addr.s_addr = ipBe;
  *(socklen_t*)len = sizeof(sockaddr_in);
  return 0;
}

// getsockname: we have no local bind; report 0.0.0.0:0.
inline int do_getsockname(int fd, intptr_t addr, intptr_t len) {
  auto s = socketFromFd(fd);
  if (!s) return -ENOTSOCK;
  if (!addr || !len || *(socklen_t*)len < sizeof(sockaddr_in)) return -EINVAL;
  auto* sa = (sockaddr_in*)addr;
  sa->sin_family = AF_INET;
  sa->sin_port = 0;
  sa->sin_addr.s_addr = 0;
  *(socklen_t*)len = sizeof(sockaddr_in);
  return 0;
}

// ---------------------------------------------------------------------------
// poll(): scan readiness (sockets via pollMask, other files via the stock
// size/access heuristic), then block on the wakeword if nothing is ready.
// select() routes through this in musl, so this is the single blocking point.
// ---------------------------------------------------------------------------
inline int poll_scan(struct pollfd* fds, nfds_t nfds) {
  auto fileTable = wasmFS.getFileTable().locked();
  int nonzero = 0;
  for (nfds_t i = 0; i < nfds; i++) {
    auto* pollfd = &fds[i];
    auto fd = pollfd->fd;
    if (fd < 0) {
      pollfd->revents = 0;
      continue;
    }
    int mask = POLLNVAL;
    auto openFile = fileTable.getEntry(fd);
    if (openFile) {
      auto lockedOpenFile = openFile->locked();
      auto file = lockedOpenFile.getFile();
      if (auto* sock = file->asSocket()) {
        mask = sock->pollMask();
      } else {
        // Stock WasmFS heuristic: writable if write-access; readable if
        // read-access and there is data.
        mask = 0;
        auto flags = lockedOpenFile.getFlags();
        auto accessMode = flags & O_ACCMODE;
        if ((pollfd->events & POLLOUT) &&
            (accessMode == O_WRONLY || accessMode == O_RDWR)) {
          mask |= POLLOUT;
        }
        if ((pollfd->events & POLLIN) &&
            (accessMode == O_RDONLY || accessMode == O_RDWR)) {
          if (file->locked().getSize() > 0) {
            mask |= POLLIN;
          }
        }
      }
    }
    mask &= pollfd->events | POLLERR | POLLHUP;
    if (mask) nonzero++;
    pollfd->revents = (short)mask;
  }
  return nonzero;
}

inline int poll_impl(intptr_t fds_, nfds_t nfds, int timeout) {
  struct pollfd* fds = (struct pollfd*)fds_;
  // NEVER block on the main browser thread: Atomics.wait/emscripten_futex_wait is
  // disallowed there and busy-spins, hanging the page (deadlock) -- and a thread
  // that can't run its event loop can't make the socket ready, so the wait would
  // never end. Scan once and return (matches the old wisp-syscalls.js
  // `!ENVIRONMENT_IS_PTHREAD` guard). Gecko's poll loops run on worker threads,
  // which block correctly below.
  if (emscripten_is_main_browser_thread()) {
    return poll_scan(fds, nfds);
  }
  double start = emscripten_get_now();
  for (;;) {
    int32_t gen = wakeword().load(std::memory_order_acquire);
    int nonzero = poll_scan(fds, nfds);
    if (nonzero || timeout == 0) return nonzero;

    double waited = emscripten_get_now() - start;
    double remaining = (timeout < 0) ? POLL_FALLBACK_MS : (timeout - waited);
    if (timeout >= 0 && remaining <= 0) return nonzero; // timed out, 0 ready
    double slice = remaining < POLL_FALLBACK_MS ? remaining : POLL_FALLBACK_MS;

    // Sleep until the wakeword changes (woken by socket activity) or the slice
    // elapses. If it already changed since `gen`, futex_wait returns at once.
    emscripten_futex_wait((void*)&wakeword(), (uint32_t)gen, slice);
  }
}

} // namespace wisp
} // namespace wasmfs

// ===========================================================================
// extern "C" boundary symbols (NON-inline: one definition, in syscalls.o).
//   * JS -> C++ delivery: exported (EXPORTED_FUNCTIONS _wisp_deliver, ...),
//     called from wisp-net.js as Module._wisp_deliver(...) etc.
//   * __syscall_setsockopt: a strong def overriding libc's weak -ENOPROTOOPT
//     stub, so Necko's setsockopt() calls succeed.
// ===========================================================================
extern "C" {

void wisp_deliver(uint32_t id, const uint8_t* data, uint32_t len) {
  std::shared_ptr<wasmfs::wisp::SocketFile> s;
  {
    std::lock_guard<std::mutex> g(wasmfs::wisp::registryMutex());
    auto it = wasmfs::wisp::registry().find(id);
    if (it != wasmfs::wisp::registry().end()) s = it->second.lock();
  }
  if (s) s->deliver(data, len);
}

void wisp_set_connected(uint32_t id) {
  std::shared_ptr<wasmfs::wisp::SocketFile> s;
  {
    std::lock_guard<std::mutex> g(wasmfs::wisp::registryMutex());
    auto it = wasmfs::wisp::registry().find(id);
    if (it != wasmfs::wisp::registry().end()) s = it->second.lock();
  }
  if (s) s->markConnected();
}

void wisp_set_eof(uint32_t id) {
  std::shared_ptr<wasmfs::wisp::SocketFile> s;
  {
    std::lock_guard<std::mutex> g(wasmfs::wisp::registryMutex());
    auto it = wasmfs::wisp::registry().find(id);
    if (it != wasmfs::wisp::registry().end()) s = it->second.lock();
  }
  if (s) s->markEof();
}

void wisp_set_error(uint32_t id, int err) {
  std::shared_ptr<wasmfs::wisp::SocketFile> s;
  {
    std::lock_guard<std::mutex> g(wasmfs::wisp::registryMutex());
    auto it = wasmfs::wisp::registry().find(id);
    if (it != wasmfs::wisp::registry().end()) s = it->second.lock();
  }
  if (s) s->markError(err);
}

// Address of the futex word, so the JS side can Atomics.notify it directly.
int32_t* wisp_wakeword(void) {
  return (int32_t*)&wasmfs::wisp::wakeword();
}

// Strong override of libc's weak __syscall_setsockopt stub.
int __syscall_setsockopt(int sockfd, int level, int optname, intptr_t optval,
                         socklen_t optlen, int dummy) {
  return wasmfs::wisp::do_setsockopt(sockfd, level, optname, optval, optlen);
}

} // extern "C"
