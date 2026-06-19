#!/usr/bin/env bash
# FAST JIT iteration loop. Recompiles ONLY the unified TU that contains WasmJS.cpp
# (Unified_cpp_js_src_wasm4.cpp) at -O0, re-archives it into libjs_static.a, and relinks the
# node embedder. ~2-3x faster than `make -C obj-js-emscripten/js/src` (which compiles at -O).
#
# Use for correctness iteration on the JS->wasm JIT (WasmJS.cpp): -O0 only de-optimizes the
# C++ COMPILER, not the JIT's emitted wasm output, so behavior is identical. Before trusting
# perf numbers or finishing, do a full `make -C obj-js-emscripten/js/src` (-O) rebuild.
#   bash embed-js/fastjit.sh && GECKO_WJVS_NOUNBOX=1 GECKO_WJVS_FDEOPT=1 \
#     node embed-js/run.cjs embed-js/t_jit.js
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OBJ="$ROOT/obj-js-emscripten"
WASMDIR="$OBJ/js/src/wasm"
LIBJS="$OBJ/js/src/build/libjs_static.a"
export EM_CONFIG="$ROOT/em_config" EMSDK="${EMSDK:-/usr/lib/emsdk}"
TU="${WJTU:-Unified_cpp_js_src_wasm4}"   # the unified TU containing WasmJS.cpp (override via WJTU)

CXXFLAGS="-std=gnu++20 -c \
 -I$OBJ/dist/system_wrappers -include $ROOT/firefox/config/gcc_hidden.h \
 -DNDEBUG=1 -DTRIMMED=1 -DJS_CACHEIR_SPEW -DJS_STRUCTURED_SPEW -DEXPORT_JS_API \
 -DMOZ_HAS_MOZGLUE -DMOZ_SUPPORT_LEAKCHECKING \
 -I$OBJ/js/src -I$ROOT/firefox/js/src -I$OBJ/dist/include -DMOZILLA_CLIENT \
 -include $OBJ/js/src/js-confdefs.h \
 -fno-rtti -fno-sized-deallocation -fno-aligned-new -fno-math-errno -fno-exceptions \
 -fdiagnostics-absolute-paths -fPIC -O0 -fno-omit-frame-pointer -funwind-tables \
 -Wno-invalid-offsetof -fno-strict-aliasing -ffp-contract=off \
 -Wno-unknown-warning-option -Werror=format"

t0=$(date +%s.%N)
echo ">> [fastjit] compiling $TU.cpp at -O0"
( cd "$WASMDIR" && em++ $CXXFLAGS -o "$TU.o" "$TU.cpp" ) || { echo "compile FAILED"; exit 1; }
t1=$(date +%s.%N)
echo ">> [fastjit] re-archiving $TU.o into libjs_static.a"
"$EMSDK/upstream/emscripten/emar" r "$LIBJS" "$WASMDIR/$TU.o" || { echo "ar FAILED"; exit 1; }
t2=$(date +%s.%N)
echo ">> [fastjit] relinking embed"
bash "$HERE/build.sh" >/dev/null 2>&1 || { echo "link FAILED (see embed-js/link.err)"; exit 1; }
t3=$(date +%s.%N)
echo ">> [fastjit] compile $(echo "$t1-$t0"|bc)s  ar $(echo "$t2-$t1"|bc)s  link $(echo "$t3-$t2"|bc)s  TOTAL $(echo "$t3-$t0"|bc)s"
