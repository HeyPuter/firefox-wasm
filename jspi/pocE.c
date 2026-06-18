// JSPI PoC E (capstone): cooperative fibers on ONE OS thread, NO SAB, each fiber with
// ISOLATED thread_local storage. Combines pocB2 (fiber scheduler over JSPI) with pocD
// (per-fiber TLS via region save/restore). Built -matomics --shared-memory (no
// -pthread) for the TLS segment; the memory is patched shared->non-shared at load.
#include <emscripten.h>
#include <pthread.h>
#include <stdio.h>
#include <stdint.h>

_Thread_local int tls_v = 100;   // must be per-fiber

// Scheduler imports (JS). st_join is wrapped SUSPENDING at instantiation.
extern void st_enqueue(void* start, void* arg, int* out_id);
extern void st_join(int id);
extern int  st_self(void);

// Promising entry: scheduler calls this (WebAssembly.promising) to run a fiber body.
EMSCRIPTEN_KEEPALIVE void st_fiber_start(void* (*start)(void*), void* arg) { start(arg); }

// TLS region info for the JS scheduler's save/restore.
EMSCRIPTEN_KEEPALIVE unsigned st_tls_size(void) { return (unsigned)__builtin_wasm_tls_size(); }
EMSCRIPTEN_KEEPALIVE unsigned st_tls_addr(void) { return (unsigned)(uintptr_t)&tls_v; }  // active base+offset

int __wrap_pthread_create(pthread_t* t, const void* a, void* (*start)(void*), void* arg) {
  (void)a; int id = 0; st_enqueue((void*)start, arg, &id); if (t) *(int*)t = id; return 0;
}
int __wrap_pthread_join(pthread_t t, void** r) { st_join((int)(intptr_t)t); if (r) *r = 0; return 0; }

static void* worker(void* arg) {
  printf("[worker %d] tls_v on entry=%d (expect 100, fresh from template)\n", st_self(), tls_v);
  tls_v = 42;
  printf("[worker %d] set tls_v=%d arg=%ld\n", st_self(), tls_v, (long)(intptr_t)arg);
  return 0;
}

EMSCRIPTEN_KEEPALIVE int run_test(void) {
  tls_v = 7;
  printf("[main %d] tls_v=%d; creating worker\n", st_self(), tls_v);
  pthread_t t;
  pthread_create(&t, 0, worker, (void*)(intptr_t)5);
  printf("[main] before join tls_v=%d\n", tls_v);
  pthread_join(t, 0);
  printf("[main] after join tls_v=%d (expect 7 => per-fiber TLS isolated)\n", tls_v);
  return tls_v;
}

int main(void) { return 0; }
