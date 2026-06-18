#!/usr/bin/env bash
# PoC F: validate the full fiber runtime (embed-xul/jspi-threads.c + jspi-sched.js)
# on a tiny producer/consumer. -matomics --shared-memory (no -pthread); memory patched
# non-shared at load (in pocF.html).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
RT="$ROOT/embed-xul"
export EM_CONFIG="$ROOT/em_config"
WRAPS=()
for f in pthread_create pthread_join pthread_detach pthread_self pthread_equal sched_yield \
         pthread_mutex_lock pthread_mutex_unlock pthread_mutex_trylock \
         pthread_cond_wait pthread_cond_timedwait pthread_cond_signal pthread_cond_broadcast \
         sem_wait sem_post sem_trywait sem_timedwait \
         pthread_key_create pthread_key_delete pthread_getspecific pthread_setspecific; do
  WRAPS+=("-Wl,--wrap=$f")
done
emcc "$HERE/pocF.c" "$RT/jspi-threads.c" -O1 -matomics -mbulk-memory -Wl,--shared-memory \
  -sMODULARIZE=1 -sEXPORT_NAME=createPocF -sENVIRONMENT=web \
  -sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=2147483648 \
  -sEXPORTED_FUNCTIONS=_main,_stj_boot,_stj_trampoline,_stj_tls_size,_malloc \
  -sEXPORTED_RUNTIME_METHODS=ccall \
  -sERROR_ON_UNDEFINED_SYMBOLS=0 \
  --js-library "$RT/jspi-threads.js" \
  -Wl,--export=__wasm_init_tls -Wl,--no-check-features "${WRAPS[@]}" \
  -o "$HERE/pocF.js" 2>&1 | grep -ivE "cache:INFO|binaryen version"
echo "build rc=${PIPESTATUS[0]}"
ls -la "$HERE"/pocF.js "$HERE"/pocF.wasm 2>/dev/null
