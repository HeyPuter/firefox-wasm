// JSPI PoC A: does a wasm export, wrapped with WebAssembly.promising, suspend at a
// WebAssembly.Suspending import and resume after the JS event loop turns?
#include <emscripten.h>
#include <stdio.h>

// Imported; wrapped as a SUSPENDING import on the JS side (returns a Promise).
extern void poc_sleep(int ms);

EMSCRIPTEN_KEEPALIVE int poc_run(int n) {
  printf("[wasm] poc_run start n=%d\n", n);
  for (int i = 0; i < n; i++) {
    printf("[wasm] before sleep %d\n", i);
    poc_sleep(40);                 // <-- suspends the wasm stack via JSPI
    printf("[wasm] after sleep %d\n", i);
  }
  printf("[wasm] poc_run done\n");
  return n * 10;
}

int main() { printf("[wasm] main\n"); return 0; }
