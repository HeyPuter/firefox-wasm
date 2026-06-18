// Single-threaded per-fiber TLS via SAVE/RESTORE of the TLS region.
// Built -matomics --shared-memory (NO -pthread) so the TLS segment + __tls_base/
// __tls_size exist; the memory is then patched shared->non-shared (no SAB). We never
// swap the base; we memcpy the active region [tls_base, tls_base+tls_size) in/out per
// fiber. The access stays base-relative to the single active base, so swapping the
// CONTENTS gives each fiber its own thread_locals.
#include <emscripten.h>
#include <stddef.h>

__thread int  t1 = 11;
__thread int  t2 = 22;
__thread long t3 = 33;

EMSCRIPTEN_KEEPALIVE unsigned tls_base(void) { return (unsigned)(size_t)__builtin_wasm_tls_base(); }
EMSCRIPTEN_KEEPALIVE unsigned tls_size(void) { return (unsigned)__builtin_wasm_tls_size(); }
EMSCRIPTEN_KEEPALIVE unsigned a1(void) { return (unsigned)(size_t)&t1; }
EMSCRIPTEN_KEEPALIVE unsigned a2(void) { return (unsigned)(size_t)&t2; }
EMSCRIPTEN_KEEPALIVE unsigned a3(void) { return (unsigned)(size_t)&t3; }
EMSCRIPTEN_KEEPALIVE int  rd1(void) { return t1; }
EMSCRIPTEN_KEEPALIVE int  rd2(void) { return t2; }
EMSCRIPTEN_KEEPALIVE int  rd3(void) { return (int)t3; }
EMSCRIPTEN_KEEPALIVE void wr(int a, int b, int c) { t1 = a; t2 = b; t3 = c; }

int main(void) { return 0; }
