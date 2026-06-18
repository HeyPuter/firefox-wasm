// Cooperative pthread runtime over JSPI for the STJ (single-OS-thread, no-SAB) build:
// the C side. Selected via -Wl,--wrap=pthread_*; routes every pthread/NSPR threading
// primitive to the JS scheduler (jspi-sched.js). Blocking calls (join/cond_wait/
// sem_wait/yield/contended mutex) are SUSPENDING imports that yield the fiber.
#include <pthread.h>
#include <semaphore.h>
#include <sched.h>
#include <time.h>
#include <errno.h>
#include <stdint.h>
#include <poll.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <emscripten.h>

extern int   stj_spawn(void* start, void* arg);
extern void  stj_join(int tid);
extern int   stj_self(void);
extern void  stj_yield_(void);
extern void  stj_mutex_lock(void* m);
extern void  stj_mutex_unlock(void* m);
extern int   stj_mutex_trylock(void* m);
extern void  stj_cond_wait(void* c, void* m, double timeout_ms);
extern void  stj_cond_signal(void* c);
extern void  stj_cond_broadcast(void* c);
extern void  stj_sem_wait(void* s, double timeout_ms);
extern int   stj_sem_trywait(void* s);
extern void  stj_sem_post(void* s);
extern void* stj_key_get(int key);
extern void  stj_key_set(int key, void* val);
extern void  stj_done(void* retval);
extern void  stj_sleep(double ms);   // SUSPENDING: yield this fiber for ms (real time)

// TLS region size for the scheduler's per-fiber save/restore.
EMSCRIPTEN_KEEPALIVE unsigned stj_tls_size(void) { return (unsigned)__builtin_wasm_tls_size(); }

// Promising entries (wrapped with WebAssembly.promising on the JS side so they suspend).
extern void* stj_main_body(void* arg);  // provided by the embedder (xul boot) / test
extern void __wasm_call_ctors(void);    // global ctors; emscripten's auto-run is stripped
EMSCRIPTEN_KEEPALIVE void stj_boot(void) {
  // Run global ctors HERE, inside the promising fiber: a static initializer that
  // spawns+joins a thread (cooperative fiber) must be able to JSPI-suspend, which only
  // works under WebAssembly.promising. (emscripten's initRuntime auto-call is removed
  // by a post-link sed in build-embed-stj.sh.)
  __wasm_call_ctors();
  void* r = stj_main_body(0);
  stj_done(r);
}
EMSCRIPTEN_KEEPALIVE void stj_trampoline(void* (*start)(void*), void* arg) { void* r = start(arg); stj_done(r); }

int __wrap_pthread_create(pthread_t* t, const pthread_attr_t* a, void* (*start)(void*), void* arg) {
  (void)a; int tid = stj_spawn((void*)start, arg); if (t) *(int*)t = tid; return 0;
}
int __wrap_pthread_join(pthread_t t, void** ret) { stj_join((int)(intptr_t)t); if (ret) *ret = 0; return 0; }
int __wrap_pthread_detach(pthread_t t) { (void)t; return 0; }
pthread_t __wrap_pthread_self(void) { return (pthread_t)(intptr_t)stj_self(); }
int __wrap_pthread_equal(pthread_t a, pthread_t b) { return a == b; }
int __wrap_sched_yield(void) { stj_yield_(); return 0; }

int __wrap_pthread_mutex_lock(pthread_mutex_t* m) { stj_mutex_lock(m); return 0; }
int __wrap_pthread_mutex_unlock(pthread_mutex_t* m) { stj_mutex_unlock(m); return 0; }
int __wrap_pthread_mutex_trylock(pthread_mutex_t* m) { return stj_mutex_trylock(m); }

int __wrap_pthread_cond_wait(pthread_cond_t* c, pthread_mutex_t* m) { stj_cond_wait(c, m, -1.0); return 0; }
int __wrap_pthread_cond_timedwait(pthread_cond_t* c, pthread_mutex_t* m, const struct timespec* abs) {
  double ms = -1.0;
  if (abs) {
    struct timespec now; clock_gettime(CLOCK_MONOTONIC, &now);
    ms = (abs->tv_sec * 1000.0 + abs->tv_nsec / 1e6) - (now.tv_sec * 1000.0 + now.tv_nsec / 1e6);
    if (ms < 0) ms = 0;
  }
  stj_cond_wait(c, m, ms); return 0;
}
int __wrap_pthread_cond_signal(pthread_cond_t* c) { stj_cond_signal(c); return 0; }
int __wrap_pthread_cond_broadcast(pthread_cond_t* c) { stj_cond_broadcast(c); return 0; }

int __wrap_sem_wait(sem_t* s) { stj_sem_wait(s, -1.0); return 0; }
int __wrap_sem_post(sem_t* s) { stj_sem_post(s); return 0; }
int __wrap_sem_trywait(sem_t* s) { if (stj_sem_trywait(s)) return 0; errno = EAGAIN; return -1; }
int __wrap_sem_timedwait(sem_t* s, const struct timespec* abs) {
  double ms = -1.0;
  if (abs) {
    struct timespec now; clock_gettime(CLOCK_MONOTONIC, &now);
    ms = (abs->tv_sec * 1000.0 + abs->tv_nsec / 1e6) - (now.tv_sec * 1000.0 + now.tv_nsec / 1e6);
    if (ms < 0) ms = 0;
  }
  stj_sem_wait(s, ms); return 0;
}

// Sleeps must YIELD cooperatively (a busy-wait would peg the single OS thread and
// starve every other fiber). Route nanosleep/usleep through the scheduler's timed
// yield so spin-waits (while(!ready) usleep(..)) let the producing fiber run.
int __wrap_nanosleep(const struct timespec* req, struct timespec* rem) {
  if (req) stj_sleep(req->tv_sec * 1000.0 + req->tv_nsec / 1e6);
  if (rem) { rem->tv_sec = 0; rem->tv_nsec = 0; }
  return 0;
}
int __wrap_usleep(unsigned us) { stj_sleep(us / 1000.0); return 0; }
unsigned __wrap_sleep(unsigned s) { stj_sleep(s * 1000.0); return 0; }

// emscripten has no __syscall_pipe2; implement via pipe() + fcntl flags. Message
// pumps (the IPC IO thread) use a self-pipe for cross-thread wakeups.
int __wrap_pipe2(int fds[2], int flags) {
  int r = pipe(fds);
  if (r == 0 && (flags & O_NONBLOCK)) { fcntl(fds[0], F_SETFL, O_NONBLOCK); fcntl(fds[1], F_SETFL, O_NONBLOCK); }
  return r;
}
// emscripten's poll() IGNORES the timeout and returns readiness instantly, so a pump's
// poll(fds, timeout>0) busy-spins. Re-check readiness via the real poll (timeout 0)
// and YIELD cooperatively between checks until something is ready or the timeout
// elapses. timeout<0 = wait forever (until ready); a fiber writing the pipe wakes it.
extern void stj_poll_wait(double ms);   // SUSPENDING: sleep up to ms, woken early on activity
extern int __real_poll(struct pollfd* fds, nfds_t nfds, int timeout);
int __wrap_poll(struct pollfd* fds, nfds_t nfds, int timeout) {
  int waited = 0;
  double slice = 4.0;   // adaptive: grows as the wait stays idle so an idle poll loop
                        // doesn't churn the one OS thread (capped); wakePollers wakes early.
  for (;;) {
    int r = __real_poll(fds, nfds, 0);
    if (r != 0) return r;
    if (timeout == 0) return 0;
    stj_poll_wait(slice);
    if (timeout > 0) { waited += (int)slice; if (waited >= timeout) return 0; }
    if (slice < 64.0) slice *= 2.0;
  }
}

// Cooperative select (the IPC IO thread's MessagePump uses select). The JS override
// (stj-select.js) makes __syscall__newselect full-fd_set + non-blocking; here we add
// the cooperative wait so select yields THROUGH the scheduler (other fibers run, e.g.
// the pipe writer) instead of busy-spinning. Save/restore the input fd_sets each pass
// (real select rewrites them to the ready set).
#include <sys/select.h>
extern int __real_select(int nfds, fd_set* r, fd_set* w, fd_set* e, struct timeval* tv);
int __wrap_select(int nfds, fd_set* r, fd_set* w, fd_set* e, struct timeval* tv) {
  fd_set ri, wi, ei;
  if (r) ri = *r; if (w) wi = *w; if (e) ei = *e;
  double timeoutMs = tv ? (tv->tv_sec * 1000.0 + tv->tv_usec / 1000.0) : -1.0;
  double waited = 0;
  double slice = 4.0;   // adaptive backoff (see __wrap_poll): idle select loops must not
                        // churn the single OS thread; wakePollers wakes early on activity.
  struct timeval zero = {0, 0};
  for (;;) {
    if (r) *r = ri; if (w) *w = wi; if (e) *e = ei;
    int n = __real_select(nfds, r, w, e, &zero);   // non-blocking (override ignores timeout)
    if (n != 0) return n;
    if (timeoutMs == 0) return 0;
    stj_poll_wait(slice);
    if (timeoutMs > 0) { waited += slice; if (waited >= timeoutMs) {
      if (r) FD_ZERO(r); if (w) FD_ZERO(w); if (e) FD_ZERO(e); return 0; } }
    if (slice < 64.0) slice *= 2.0;
  }
}

// Reader/writer locks (mozilla::RWLock -> pthread_rwlock_* in mozglue). These are NOT
// in libxul's symbol table because RWLockImpl lives in mozglue, but they ARE called by
// the 1000+ RWLock consumers. Unwrapped, a contended rwlock falls to musl's spin + the
// main-thread futex poll, which busy-waits forever (no fiber ever gets to release it).
// Route them through the cooperative scheduler like mutexes.
extern void stj_rw_rdlock(void* l);    // SUSPENDING
extern void stj_rw_wrlock(void* l);    // SUSPENDING
extern void stj_rw_unlock(void* l);
extern int  stj_rw_tryrdlock(void* l);
extern int  stj_rw_trywrlock(void* l);
int __wrap_pthread_rwlock_init(pthread_rwlock_t* l, const pthread_rwlockattr_t* a) { (void)l; (void)a; return 0; }
int __wrap_pthread_rwlock_destroy(pthread_rwlock_t* l) { (void)l; return 0; }
int __wrap_pthread_rwlock_rdlock(pthread_rwlock_t* l) { stj_rw_rdlock(l); return 0; }
int __wrap_pthread_rwlock_wrlock(pthread_rwlock_t* l) { stj_rw_wrlock(l); return 0; }
int __wrap_pthread_rwlock_unlock(pthread_rwlock_t* l) { stj_rw_unlock(l); return 0; }
int __wrap_pthread_rwlock_tryrdlock(pthread_rwlock_t* l) { return stj_rw_tryrdlock(l) ? 0 : EBUSY; }
int __wrap_pthread_rwlock_trywrlock(pthread_rwlock_t* l) { return stj_rw_trywrlock(l) ? 0 : EBUSY; }
int __wrap_pthread_rwlock_timedrdlock(pthread_rwlock_t* l, const struct timespec* at) { (void)at; stj_rw_rdlock(l); return 0; }
int __wrap_pthread_rwlock_timedwrlock(pthread_rwlock_t* l, const struct timespec* at) { (void)at; stj_rw_wrlock(l); return 0; }

// Diagnostic: log fiber -> thread-name so we can identify which cooperative fibers are
// the idle spinners (sched_yield without parking). Threads name themselves via
// pthread_setname_np(pthread_self(), ...), so the current fiber is the one being named.
#include <stdio.h>
extern void stj_name(const char* name);   // record fiber name in the scheduler (diagnostic)
int __wrap_pthread_setname_np(pthread_t t, const char* name) {
  (void)t;
  if (name) stj_name(name);   // threads name themselves -> current fiber gets the label
  return 0;
}
// NSPR's PR_SetCurrentThreadName looks up pthread_setname_np via dlsym(RTLD_DEFAULT, ...)
// (NOT a direct call), so --wrap doesn't intercept it and names are otherwise lost. Hand
// dlsym our naming shim so the scheduler can label fibers (diagnostic -> identifies which
// fiber is which thread, e.g. Compositor/Renderer/Socket, for perf work).
static int __stj_setname_shim(pthread_t t, const char* name) { (void)t; if (name) stj_name(name); return 0; }
extern void* __real_dlsym(void* handle, const char* symbol);
void* __wrap_dlsym(void* handle, const char* symbol) {
  if (symbol && strcmp(symbol, "pthread_setname_np") == 0) return (void*)&__stj_setname_shim;
  return __real_dlsym(handle, symbol);
}

// Cooperative futex. Rust/crossbeam/std-thread parking on emscripten goes through
// emscripten_futex_wait, which WITHOUT -pthread is a no-op stub that returns 0 ("woken")
// immediately -> the parker busy-loops and PEGS the single cooperative thread (e.g. the
// WebRender RenderBackend fiber freezes the page a few seconds into interaction). Route it
// through the scheduler instead: stj_futex_wait SUSPENDS the fiber until stj_futex_wake (or
// timeout). (The stock impl also uses memory.atomic.wait32, which TRAPS on our non-shared
// memory -- so a scheduler futex is the only workable option.)
extern int stj_futex_wait(void* addr, unsigned val, double ms);   // SUSPENDING
extern int stj_futex_wake(void* addr, int count);
int __wrap_emscripten_futex_wait(volatile void* addr, unsigned val, double maxWaitMs) {
  if (((intptr_t)addr & 3) != 0) return -22;   // -EINVAL
  return stj_futex_wait((void*)addr, val, maxWaitMs);
}
int __wrap_emscripten_futex_wake(volatile void* addr, int count) {
  return stj_futex_wake((void*)addr, count);
}

static int g_next_key = 1;
int __wrap_pthread_key_create(pthread_key_t* k, void (*dtor)(void*)) { (void)dtor; *(int*)k = g_next_key++; return 0; }
int __wrap_pthread_key_delete(pthread_key_t k) { (void)k; return 0; }
void* __wrap_pthread_getspecific(pthread_key_t k) { return stj_key_get((int)k); }
int __wrap_pthread_setspecific(pthread_key_t k, const void* v) { stj_key_set((int)k, (void*)v); return 0; }
