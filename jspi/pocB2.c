// JSPI PoC B (decisive): a minimal cooperative fiber runtime, NO shared memory / NO
// SAB. pthread_create -> JSPI fiber on the one OS thread; pthread_join yields via a
// suspending import; per-fiber TLS comes from -femulated-tls whose pthread key
// lookups we route per-fiber. If main's thread_local survives a worker mutating its
// own copy, SAB-free per-fiber TLS is proven.
#include <emscripten.h>
#include <pthread.h>
#include <stdio.h>
#include <stdint.h>

_Thread_local int tls_v = 100;

// Scheduler imports (JS). st_join is wrapped as a SUSPENDING import on the JS side.
extern void  st_enqueue(void* start, void* arg, int* out_id);
extern void  st_join(int id);
extern int   st_self(void);
// Per-fiber emulated-TLS storage: returns this fiber's copy of the thread_local
// described by `control` (allocating + template-initializing on first access).
extern void* st_emutls(void* control, int size, void* templ);

// Override compiler-rt's __emutls_get_address (which uses a single global in a
// non-threaded build) with a per-fiber one. -femulated-tls makes thread_local
// accesses call this; the control struct is { size, align, object, value(template) }.
void* __emutls_get_address(void* control) {
  uintptr_t* c = (uintptr_t*)control;
  return st_emutls(control, (int)c[0], (void*)c[3]);
}

// Promising entry: the scheduler calls this (wrapped with WebAssembly.promising) to
// run a fiber body, so the body can suspend.
EMSCRIPTEN_KEEPALIVE void st_fiber_start(void* (*start)(void*), void* arg) {
  start(arg);
}

// pthread shims (selected by -Wl,--wrap). emutls's TLS array is stored/fetched via
// pthread_{get,set}specific -> routed to the CURRENT fiber's key map => per-fiber TLS.
int __wrap_pthread_create(pthread_t* t, const void* a, void* (*start)(void*), void* arg) {
  (void)a; int id = 0; st_enqueue((void*)start, arg, &id);
  if (t) *(int*)t = id; return 0;
}
int __wrap_pthread_join(pthread_t t, void** ret) {
  st_join((int)(intptr_t)t); if (ret) *ret = 0; return 0;
}

static void* worker(void* arg) {
  printf("[worker] enter: tls_v=%d self=%d\n", tls_v, st_self());
  tls_v = 42;
  printf("[worker] set tls_v=%d arg=%ld\n", tls_v, (long)(intptr_t)arg);
  return 0;
}

EMSCRIPTEN_KEEPALIVE int run_test(void) {
  tls_v = 7;
  printf("[main] tls_v=%d self=%d; creating worker\n", tls_v, st_self());
  pthread_t t;
  pthread_create(&t, 0, worker, (void*)(intptr_t)5);
  printf("[main] joining worker...\n");
  pthread_join(t, 0);
  printf("[main] after join: tls_v=%d (expect 7 => per-fiber TLS works)\n", tls_v);
  return tls_v;
}

int main(void) { return 0; }
