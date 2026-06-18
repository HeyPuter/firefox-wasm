#!/usr/bin/env bash
# STJ embedder link: single OS thread, JSPI cooperative fibers, per-fiber TLS, NO SAB.
# Engine from obj-full-emscripten-stj (-matomics, no -pthread). The TLS segment needs
# -Wl,--shared-memory at the final link; the non-atomics emscripten system libs need
# -Wl,--no-check-features; the harness patches the memory shared->non-shared at load.
# Outputs to embed-xul/stj/, referencing the big engine .so's by symlink.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OBJ="$ROOT/obj-full-emscripten-stj"
INC="$OBJ/dist/include"
DIST="$OBJ/dist/bin"
OUT_DIR="$HERE/stj"
export EM_CONFIG="$ROOT/em_config"
mkdir -p "$OUT_DIR"

[ -e "$DIST/libxul.so" ] || { echo "!! $DIST/libxul.so missing -- build: make build STJ=1" >&2; exit 1; }

echo ">> [stj] staging GRE"
GECKO_STJ=1 bash "$HERE/stage-gre.sh" >/dev/null || { echo "!! stage-gre failed" >&2; exit 1; }
# STJ: disable the XPConnect watchdog as a DEFAULT pref (read once at XPConnect init).
# Its monitor lock is taken on every C++->JS entry (AutoEntryScript) and a JSPI suspend
# can't cross the addFunction'd xptcall JS shim frame above it -> "suspend JS frames".
# (Doing this via a mid-init Preferences::SetBool instead blocks main indefinitely.)
echo 'pref("dom.use_watchdog", false);' >> "$HERE/gre-stage-stj/greprefs.js"
# STJ: keep everything in-process so the top-level load doesn't go through a
# DocumentChannel process-switch handoff (which currently doesn't resolve on cooperative
# fibers -> the data: load stalls at readyState=LOADING).
{
  echo 'pref("fission.autostart", false);'
  echo 'pref("browser.tabs.remote.autostart", false);'
  echo 'pref("dom.ipc.processCount", 1);'
  # HTML5 stream parser flushes parsed tokens to the main thread on a timer; with
  # cooperative fibers that timer fires slowly, leaving the doc stuck at LOADING. Flush
  # immediately so a necko document load can complete the parse.
  echo 'pref("html5.flushtimer.initialdelay", 0);'
  echo 'pref("html5.flushtimer.subsequentdelay", 0);'
  # Don't upgrade http:// to https:// (https_first) -- it makes even plain-HTTP sites
  # attempt TLS first; lets us load real plain-HTTP sites without the NSS/TLS path.
  echo 'pref("dom.security.https_first", false);'
  echo 'pref("dom.security.https_only_mode", false);'
  echo 'pref("dom.security.https_first_pbm", false);'
  # OCSP/CRL fetches add blocking network round-trips during the TLS handshake that
  # currently don't complete cooperatively; disable so cert verification is local-only.
  echo 'pref("security.OCSP.enabled", 0);'
  echo 'pref("security.OCSP.require", false);'
  # SCROLL PERF: we present via synchronous PresShell::RenderDocument, NOT the async
  # compositor, so the compositor's per-scroll work (APZ sampling, smooth-scroll animation
  # frames, WebRender scene updates on each refresh tick) is pure waste -- and on the single
  # cooperative OS thread it SERIALIZES with rendering, making scroll laggy (the multithreaded
  # build ran it on a real off-main thread). Disable APZ (scroll handled synchronously on the
  # main thread) and smooth-scroll (instant jump, no animation frames -> no per-frame ticks).
  echo 'pref("layers.async-pan-zoom.enabled", false);'
  echo 'pref("general.smoothScroll", false);'
  echo 'pref("apz.allow_zooming", false);'
  # SCROLL PERF (the big one): the SoftwareVsyncThread ticks at 60Hz driving the refresh-
  # driver/compositor pipeline. We render SYNCHRONOUSLY via PresShell::RenderDocument on
  # input (st_present), NOT via that pipeline, so the 60Hz vsync churn is pure overhead --
  # and on the single cooperative OS thread it serializes with everything, burning ~25% of
  # scroll time and triggering refresh-driver "catch up tick" feedback loops (measured: the
  # SoftwareVsyncThread fiber was the single heaviest worker during a scroll). Throttle the
  # software vsync to a low rate; input still renders immediately via st_present so scroll/
  # input stay responsive -- only refresh-driven animations run slower (acceptable trade).
  echo 'pref("layout.frame_rate", 10);'
} >> "$HERE/gre-stage-stj/greprefs.js"
echo ">> [stj] greprefs: +single-process +html5 flush=0 +no-https-first +ocsp-off +no-apz +no-smoothscroll +framerate10"

# atomics (TLS segment) but NO -pthread. -DGECKO_STJ_BUILD selects stj_main_body.
CXXFLAGS=(
  -std=gnu++20 -fno-exceptions -fno-rtti -fno-sized-deallocation -fno-aligned-new
  -DMOZILLA_INTERNAL_API -DMOZ_HAS_MOZGLUE -DNDEBUG=1 -DGECKO_STJ_BUILD
  -isystem "$INC" -isystem "$INC/nspr" -isystem "$ROOT/firefox/nsprpub/pr/include"
  -O0 -g0 -matomics -mbulk-memory
)
echo ">> [stj] compiling embed-xul.cpp + jspi-threads.c"
em++ "${CXXFLAGS[@]}" -c "$HERE/embed-xul.cpp" -o "$OUT_DIR/embed-xul.o" || exit 1
emcc -O0 -g0 -matomics -mbulk-memory -c "$HERE/jspi-threads.c" -o "$OUT_DIR/jspi-threads.o" || exit 1

ln -sf "$DIST/libxul.so"      "$OUT_DIR/libxul.o"
ln -sf "$DIST/libnss3.so"     "$OUT_DIR/libnss3.so"
ln -sf "$DIST/libgkcodecs.so" "$OUT_DIR/libgkcodecs.so"

LOOSE=()
for d in mfbt mozglue/misc mozglue/baseprofiler mozglue/build memory/build memory/mozalloc third_party/fmt; do
  for f in "$OBJ/$d"/*.o; do [ -e "$f" ] && LOOSE+=("$f"); done
done
echo ">> [stj] ${#LOOSE[@]} loose glue objects"

WRAPS=()
for f in pthread_create pthread_join pthread_detach pthread_self pthread_equal sched_yield \
         pthread_mutex_lock pthread_mutex_unlock pthread_mutex_trylock \
         pthread_cond_wait pthread_cond_timedwait pthread_cond_signal pthread_cond_broadcast \
         sem_wait sem_post sem_trywait sem_timedwait \
         nanosleep usleep sleep pipe2 poll select \
         pthread_rwlock_init pthread_rwlock_destroy pthread_rwlock_rdlock pthread_rwlock_wrlock \
         pthread_rwlock_unlock pthread_rwlock_tryrdlock pthread_rwlock_trywrlock \
         pthread_rwlock_timedrdlock pthread_rwlock_timedwrlock pthread_setname_np \
         emscripten_futex_wait emscripten_futex_wake \
         pthread_key_create pthread_key_delete pthread_getspecific pthread_setspecific dlsym; do
  WRAPS+=("-Wl,--wrap=$f")
done

EMSETTINGS=(
  -O0 --profiling-funcs
  -sASSERTIONS=1 -sSTACK_OVERFLOW_CHECK=1 -sERROR_ON_UNDEFINED_SYMBOLS=0
  -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=536870912 -sMAXIMUM_MEMORY=4294967296 -sSTACK_SIZE=8388608
  -sEXIT_RUNTIME=0 -sINVOKE_RUN=0
  -sMODULARIZE=1 -sEXPORT_NAME=createGecko
  -sEXPORTED_FUNCTIONS=_malloc,_free,_WasmXPTCStubDispatch,_xul_cmd_ptr,_wisp_wakeword,_st_load,_st_request_nav,_st_mouse,_st_key,_st_wheel,_stj_boot,_stj_trampoline,_stj_tls_size
  -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,FS,addFunction,removeFunction,ENV
  -sALLOW_TABLE_GROWTH=1 -sWASM_BIGINT=1
  -sENVIRONMENT=web
  --preload-file "$HERE/gre-stage-stj@/gre"
  --js-library "$HERE/jspi-threads.js"
  --js-library "$HERE/stj-select.js"
  -Wl,--shared-memory -Wl,--no-check-features -Wl,--export=__wasm_init_tls
  "${WRAPS[@]}"
  -Wl,--strip-debug
)

OUT="$OUT_DIR/gecko.js"
echo ">> [stj] linking -> $OUT (slow)"
em++ "$OUT_DIR/embed-xul.o" "$OUT_DIR/jspi-threads.o" "$OUT_DIR/libxul.o" "${LOOSE[@]}" \
  "$OUT_DIR/libnss3.so" "$OUT_DIR/libgkcodecs.so" "${EMSETTINGS[@]}" -o "$OUT" 2> "$OUT_DIR/link.err"
rc=$?
echo ">> [stj] link rc=$rc"
ls -la "$OUT_DIR"/gecko.js "$OUT_DIR"/gecko.wasm "$OUT_DIR"/gecko.data 2>/dev/null
echo "=== undefined symbol count ==="; grep -c "undefined symbol:" "$OUT_DIR/link.err"
echo "=== errors (non-undef) ==="; grep -iE "error" "$OUT_DIR/link.err" | grep -ivE "undefined symbol|duplicate symbol" | head -15

if [ "$rc" = 0 ]; then
  # Defer global ctors into the promising boot fiber: stj_boot() calls
  # __wasm_call_ctors itself (so blocking ctors can JSPI-suspend). Strip emscripten's
  # auto-run from initRuntime.
  if grep -q 'addOnInit(wasmExports\["__wasm_call_ctors"\]);' "$OUT"; then
    sed -i 's/addOnInit(wasmExports\["__wasm_call_ctors"\]);/\/*stj:ctors-run-in-boot*\//' "$OUT"
    echo ">> [stj] deferred __wasm_call_ctors into stj_boot"
  else
    echo "!! [stj] WARNING: could not find addOnInit(__wasm_call_ctors) to strip"
  fi
fi
exit $rc
