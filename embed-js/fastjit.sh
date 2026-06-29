#!/usr/bin/env bash
# FAST JIT iteration loop for the re-architected JS->wasm JIT.
#
# The JIT now lives in standalone modules firefox/js/src/wasm/WasmJit*.cpp
# (front-end WasmJitWarp.cpp, back-end WasmJitBackend.cpp, runtime
# WasmJitRuntime.cpp), NOT bolted into WasmJS.cpp. This script recompiles those
# modules + the unified TU that still contains WasmJS.cpp (genuine WebAssembly
# JS API), re-archives the .o's into libjs_static.a, and relinks the embedder.
#
# Compiled at -O2 (de-optimizes the C++ COMPILER, not the JIT's emitted wasm, so
# behavior is identical). Before trusting perf, do a full -O rebuild:
#   make -C obj-js-emscripten/js/src   (note: requires the modules in moz.build)
#
#   bash embed-js/fastjit.sh && node embed-js/run.cjs embed-js/t_jit.js
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OBJ="$ROOT/obj-js-emscripten"
SRCDIR="$ROOT/firefox/js/src/wasm"
WASMOBJ="$OBJ/js/src/wasm"
LIBJS="$OBJ/js/src/build/libjs_static.a"
export EM_CONFIG="$ROOT/em_config" EMSDK="${EMSDK:-/usr/lib/emsdk}"
TU="${WJTU:-Unified_cpp_js_src_wasm4}"   # unified TU containing WasmJS.cpp

CXXFLAGS="-std=gnu++20 -c \
 -I$OBJ/dist/system_wrappers -include $ROOT/firefox/config/gcc_hidden.h \
 -DNDEBUG=1 -DTRIMMED=1 -DJS_CACHEIR_SPEW -DJS_STRUCTURED_SPEW -DEXPORT_JS_API \
 -DMOZ_HAS_MOZGLUE -DMOZ_SUPPORT_LEAKCHECKING \
 -I$OBJ/js/src -I$ROOT/firefox/js/src -I$OBJ/dist/include -DMOZILLA_CLIENT \
 -include $OBJ/js/src/js-confdefs.h \
 -fno-rtti -fno-sized-deallocation -fno-aligned-new -fno-math-errno -fno-exceptions \
 -fdiagnostics-absolute-paths -fPIC -O2 -fno-omit-frame-pointer -funwind-tables \
 -Wno-invalid-offsetof -fno-strict-aliasing -ffp-contract=off \
 -Wno-unknown-warning-option -Werror=format"

OBJS=()   # .o files to (re)archive
t0=$(date +%s.%N)

# 1. The new JIT modules (standalone TUs, compiled individually).
for src in "$SRCDIR"/WasmJit*.cpp; do
  [ -e "$src" ] || continue
  o="$WASMOBJ/$(basename "${src%.cpp}").o"
  echo ">> [fastjit] compiling $(basename "$src") at -O2"
  ( cd "$SRCDIR" && em++ $CXXFLAGS -o "$o" "$src" ) || { echo "compile FAILED: $src"; exit 1; }
  OBJS+=("$o")
done

# 2. The unified TU with WasmJS.cpp (genuine WebAssembly API).
echo ">> [fastjit] compiling $TU.cpp at -O2"
( cd "$WASMOBJ" && em++ $CXXFLAGS -o "$TU.o" "$TU.cpp" ) || { echo "compile FAILED: $TU"; exit 1; }
OBJS+=("$WASMOBJ/$TU.o")
t1=$(date +%s.%N)

echo ">> [fastjit] re-archiving ${#OBJS[@]} object(s) into libjs_static.a"
"$EMSDK/upstream/emscripten/emar" r "$LIBJS" "${OBJS[@]}" || { echo "ar FAILED"; exit 1; }
t2=$(date +%s.%N)

echo ">> [fastjit] relinking embed"
bash "$HERE/build.sh" >/dev/null 2>&1 || { echo "link FAILED (see embed-js/link.err)"; tail -20 "$HERE/link.err"; exit 1; }
t3=$(date +%s.%N)
echo ">> [fastjit] compile $(echo "$t1-$t0"|bc)s  ar $(echo "$t2-$t1"|bc)s  link $(echo "$t3-$t2"|bc)s  TOTAL $(echo "$t3-$t0"|bc)s"
