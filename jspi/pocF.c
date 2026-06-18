// PoC F: exercise the full fiber runtime (jspi-threads.c) — mutex + cond producer/
// consumer between two fibers, per-fiber thread_local, and a per-fiber pthread key.
// Single OS thread, no SAB. Validates the scheduler before the Gecko integration.
#include <emscripten.h>
#include <pthread.h>
#include <stdio.h>
#include <stdint.h>

_Thread_local int my_tls = -1;
static pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t  cv  = PTHREAD_COND_INITIALIZER;
static pthread_key_t   key;
static int slot = 0, produced = 0, consumed = 0;

static void* consumer(void* arg) {
  (void)arg;
  my_tls = 222;
  pthread_setspecific(key, (void*)(intptr_t)999);
  for (int i = 0; i < 3; i++) {
    pthread_mutex_lock(&mtx);
    while (slot == 0) pthread_cond_wait(&cv, &mtx);
    int v = slot; slot = 0; consumed++;
    pthread_cond_signal(&cv);
    pthread_mutex_unlock(&mtx);
    printf("[consumer self=%ld] got %d my_tls=%d key=%ld\n",
           (long)pthread_self(), v, my_tls, (long)(intptr_t)pthread_getspecific(key));
  }
  return (void*)(intptr_t)consumed;
}

// The main fiber body (run via stj_boot). Producer.
void* stj_main_body(void* arg) {
  (void)arg;
  pthread_key_create(&key, 0);
  my_tls = 111;
  pthread_setspecific(key, (void*)(intptr_t)42);
  pthread_t t;
  pthread_create(&t, 0, consumer, 0);
  for (int i = 1; i <= 3; i++) {
    pthread_mutex_lock(&mtx);
    while (slot != 0) pthread_cond_wait(&cv, &mtx);
    slot = i * 10; produced++;
    pthread_cond_signal(&cv);
    pthread_mutex_unlock(&mtx);
    printf("[main self=%ld] produced %d my_tls=%d key=%ld\n",
           (long)pthread_self(), i * 10, my_tls, (long)(intptr_t)pthread_getspecific(key));
  }
  void* rv;
  pthread_join(t, &rv);
  int ok = (produced == 3 && consumed == 3 && my_tls == 111 &&
            (long)(intptr_t)pthread_getspecific(key) == 42);
  printf("[main] joined rv=%ld produced=%d consumed=%d my_tls=%d key=%ld -> %s\n",
         (long)(intptr_t)rv, produced, consumed, my_tls,
         (long)(intptr_t)pthread_getspecific(key), ok ? "OK" : "BAD");
  return (void*)(intptr_t)(ok ? 0xABCD : 0);
}

int main(void) { return 0; }
