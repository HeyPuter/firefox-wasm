#!/usr/bin/env bash
# EXPERIMENTAL single-threaded embedder link (ST=1 / no emscripten pthreads), WEB.
#
# Mirrors build-embed-full.sh but:
#   - reads the single-threaded engine from obj-full-emscripten-st,
#   - omits EVERY pthread flag (-pthread, PROXY_TO_PTHREAD, PTHREAD_POOL_SIZE,
#     OFFSCREENCANVAS*), so the module has no Web Workers at all,
#   - targets the browser (-sENVIRONMENT=web, GRE preloaded to /gre), driven
#     cooperatively: main() inits then emscripten_set_main_loop(st_tick); JS calls
#     st_load/st_mouse/st_key/st_wheel synchronously on the main thread,
#   - writes its outputs into embed-xul/st/ and references the big engine .so's by
#     symlink, so it never touches the threaded build's gecko.* / *.stripped.so.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OBJ="$ROOT/obj-full-emscripten-st"
INC="$OBJ/dist/include"
DIST="$OBJ/dist/bin"
OUT_DIR="$HERE/st"
export EM_CONFIG="$ROOT/em_config"   # system binaryen v129 (rust LLVM21 wasm features)

mkdir -p "$OUT_DIR"

if [ ! -e "$DIST/libxul.so" ]; then
  echo "!! $DIST/libxul.so missing -- build the engine first: make build ST=1" >&2
  exit 1
fi

# Stage the GRE resources for this objdir into gre-stage-st/ (separate from the
# threaded build's gre-stage/).
echo ">> [st] staging GRE resources"
GECKO_ST=1 bash "$HERE/stage-gre.sh" >/dev/null || { echo "!! stage-gre.sh failed" >&2; exit 1; }

# -O0 debug link (no wasm-opt). DEBUG=1 keeps DWARF in a sidecar.
CXXFLAGS=(
  -std=gnu++20 -fno-exceptions -fno-rtti
  -fno-sized-deallocation -fno-aligned-new
  -DMOZILLA_INTERNAL_API -DMOZ_HAS_MOZGLUE -DNDEBUG=1
  -isystem "$INC"
  -isystem "$INC/nspr"
  -isystem "$ROOT/firefox/nsprpub/pr/include"
  -O0 -g0
  # NOTE: deliberately NO -pthread -> __EMSCRIPTEN_PTHREADS__ is undefined ->
  # embed-xul.cpp compiles the single-threaded cooperative branch of main().
)

echo ">> [st] compiling embed-xul.cpp (single-threaded)"
em++ "${CXXFLAGS[@]}" -c "$HERE/embed-xul.cpp" -o "$OUT_DIR/embed-xul.o" || exit 1

# Reference the engine .so's by symlink (.o so emcc static-links them, never
# dlopens). These point into the -st objdir so we don't copy 3.7GB libxul.
ln -sf "$DIST/libxul.so"       "$OUT_DIR/libxul.o"
ln -sf "$DIST/libnss3.so"      "$OUT_DIR/libnss3.so"
ln -sf "$DIST/libgkcodecs.so"  "$OUT_DIR/libgkcodecs.so"

# mozglue/memory/mfbt/fmt are MOZ_GLUE_IN_PROGRAM: linked into the program.
LOOSE=()
for d in mfbt mozglue/misc mozglue/baseprofiler mozglue/build \
         memory/build memory/mozalloc third_party/fmt; do
  for f in "$OBJ/$d"/*.o; do
    [ -e "$f" ] && LOOSE+=("$f")
  done
done
echo ">> [st] ${#LOOSE[@]} loose glue objects"

EXTRA=(
  "$OUT_DIR/libnss3.so"
  "$OUT_DIR/libgkcodecs.so"
)

EMSETTINGS=(
  -O0
  --profiling-funcs
  -sASSERTIONS=1
  -sSTACK_OVERFLOW_CHECK=1
  -sERROR_ON_UNDEFINED_SYMBOLS=0
  -sALLOW_MEMORY_GROWTH=1
  -sINITIAL_MEMORY=536870912
  -sMAXIMUM_MEMORY=4294967296
  -sSTACK_SIZE=8388608
  -sEXIT_RUNTIME=0
  -sMODULARIZE=1
  -sEXPORT_NAME=createGecko
  -sEXPORTED_FUNCTIONS=_main,_xul_init,_free,_malloc,_WasmXPTCStubDispatch,_xul_cmd_ptr,_wisp_wakeword,_st_load,_st_mouse,_st_key,_st_wheel
  -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,FS,addFunction,removeFunction,ENV
  -sALLOW_TABLE_GROWTH=1            # xptcall builds JS->wasm stub fns via addFunction()
  -sWASM_BIGINT=1                   # i64 XPCOM params cross the JS boundary as BigInt
  # browser, single-threaded: no worker, no PROXY_TO_PTHREAD. main() inits then
  # emscripten_set_main_loop hands control back to the page between frames.
  -sENVIRONMENT=web
  --preload-file "$HERE/gre-stage-st@/gre"
)
# NOTE: JSPI is done MANUALLY at the JS boundary (WebAssembly.promising/Suspending),
# not via -sASYNCIFY=2 (emscripten 3.1.56's JSPI path shells out to `wasm-opt --jspi`,
# which our pinned binaryen v129 dropped). See jspi/ PoCs.

if [ "${DEBUG:-0}" = "1" ]; then
  EMSETTINGS+=( -g -gseparate-dwarf="$OUT_DIR/gecko.debug.wasm" )
else
  EMSETTINGS+=( -Wl,--strip-debug )
fi

OUT="$OUT_DIR/gecko.js"

echo ">> [st] linking embed-xul + libxul + glue -> $OUT (slow)"
em++ "$OUT_DIR/embed-xul.o" "$OUT_DIR/libxul.o" "${LOOSE[@]}" "${EXTRA[@]}" \
  "${EMSETTINGS[@]}" -o "$OUT" 2> "$OUT_DIR/link.err"
rc=$?
echo ">> [st] link rc=$rc"
ls -la "$OUT_DIR"/gecko.js "$OUT_DIR"/gecko.wasm "$OUT_DIR"/gecko.data 2>/dev/null
echo "=== undefined symbol count ==="; grep -c "undefined symbol:" "$OUT_DIR/link.err"
echo "=== other errors ==="; grep -iE "error" "$OUT_DIR/link.err" | grep -ivE "undefined symbol|duplicate symbol" | head -15
exit $rc
