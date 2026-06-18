#!/usr/bin/env bash
# Cooperative fiber PoC: -femulated-tls for per-fiber TLS, NO -pthread / atomics /
# shared memory (so NO SAB). --wrap intercepts the pthread primitives.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
export EM_CONFIG="$ROOT/em_config"
WRAPS=(-Wl,--wrap=pthread_create -Wl,--wrap=pthread_join)
emcc "$HERE/pocB2.c" \
  -O0 -femulated-tls \
  -sMODULARIZE=1 -sEXPORT_NAME=createPocB2 -sENVIRONMENT=web \
  -sEXPORTED_FUNCTIONS=_main,_run_test,_st_fiber_start,_malloc \
  -sEXPORTED_RUNTIME_METHODS=ccall \
  -sERROR_ON_UNDEFINED_SYMBOLS=0 \
  --js-library "$HERE/fiber-rt.js" \
  "${WRAPS[@]}" \
  -o "$HERE/pocB2.js" 2>&1 | grep -ivE "cache:INFO|binaryen version"
echo "build rc=${PIPESTATUS[0]}"
ls -la "$HERE"/pocB2.js "$HERE"/pocB2.wasm 2>/dev/null
echo "=== shared memory in glue? (should be none) ==="
grep -oE "shared:[ ]*true|SharedArrayBuffer" "$HERE/pocB2.js" | head || echo "  none -> no SAB"
