#!/usr/bin/env bash
# FAST JIT iteration loop. Recompiles the standalone JIT modules
# (firefox/js/src/wasm/WasmJit{Backend,Runtime,Warp}.cpp) + the unified TU holding
# WasmJS.cpp, re-archives them into libjs_static.a, and relinks the embedder
# (build.sh) -> build/embed.{js,wasm}. ~65s at -O2.
#
#   bash bench/spidermonkey.js/fastjit.sh && node bench/main.ts octane richards
#
# -O2 de-optimizes the C++ COMPILER, not the JIT's emitted wasm (behavior identical);
# it is the production-fair build (see memory: pbl-baseline-must-be-O2).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"            # bench/spidermonkey.js
ROOT="$(cd "$HERE/../.." && pwd)"                # firefox-wasm repo root
OBJ="$ROOT/obj-js-emscripten"
SRCDIR="$ROOT/firefox/js/src/wasm"
WASMOBJ="$OBJ/js/src/wasm"
LIBJS="$OBJ/js/src/build/libjs_static.a"
export EMSDK="${EMSDK:-/home/claude/emsdk}"
export EM_CONFIG="$ROOT/em_config"
export PATH="$EMSDK/upstream/emscripten:$PATH"
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
 -Wno-unknown-warning-option -Werror=format -msimd128"

OBJS=()
t0=$(date +%s.%N)

for src in "$SRCDIR"/WasmJit*.cpp; do
  [ -e "$src" ] || continue
  o="$WASMOBJ/$(basename "${src%.cpp}").o"
  echo ">> [fastjit] compiling $(basename "$src") at -O2"
  ( cd "$SRCDIR" && em++ $CXXFLAGS -o "$o" "$src" ) || { echo "compile FAILED: $src"; exit 1; }
  OBJS+=("$o")
done

echo ">> [fastjit] compiling $TU.cpp at -O2"
( cd "$WASMOBJ" && em++ $CXXFLAGS -o "$TU.o" "$TU.cpp" ) || { echo "compile FAILED: $TU"; exit 1; }
OBJS+=("$WASMOBJ/$TU.o")
t1=$(date +%s.%N)

echo ">> [fastjit] re-archiving ${#OBJS[@]} object(s) into libjs_static.a"
"$EMSDK/upstream/emscripten/emar" r "$LIBJS" "${OBJS[@]}" || { echo "ar FAILED"; exit 1; }
t2=$(date +%s.%N)

echo ">> [fastjit] relinking embed"
bash "$HERE/build.sh" >/dev/null 2>&1 || { echo "link FAILED (see build/link.err)"; tail -20 "$HERE/build/link.err"; exit 1; }
t3=$(date +%s.%N)
echo ">> [fastjit] compile $(echo "$t1-$t0"|bc)s  ar $(echo "$t2-$t1"|bc)s  link $(echo "$t3-$t2"|bc)s  TOTAL $(echo "$t3-$t0"|bc)s"
