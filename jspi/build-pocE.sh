#!/usr/bin/env bash
# Capstone PoC: cooperative fibers + per-fiber TLS, single OS thread, no SAB.
# -matomics --shared-memory (NO -pthread) for the TLS segment; memory patched
# non-shared at load. --wrap intercepts pthread; JSPI is done manually in pocE.html.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
export EM_CONFIG="$ROOT/em_config"
emcc "$HERE/pocE.c" -O1 -matomics -mbulk-memory -Wl,--shared-memory \
  -sMODULARIZE=1 -sEXPORT_NAME=createPocE -sENVIRONMENT=web \
  -sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=2147483648 \
  -sEXPORTED_FUNCTIONS=_main,_run_test,_st_fiber_start,_st_tls_size,_st_tls_addr,_malloc \
  -sEXPORTED_RUNTIME_METHODS=ccall \
  -sERROR_ON_UNDEFINED_SYMBOLS=0 \
  --js-library "$HERE/fiber-rt-e.js" \
  -Wl,--wrap=pthread_create -Wl,--wrap=pthread_join -Wl,--export=__wasm_init_tls \
  -o "$HERE/pocE.js" 2>&1 | grep -ivE "cache:INFO|binaryen version"
echo "build rc=${PIPESTATUS[0]}"
ls -la "$HERE"/pocE.js "$HERE"/pocE.wasm 2>/dev/null
