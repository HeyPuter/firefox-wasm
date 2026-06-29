#!/usr/bin/env bash
# Minimal SpiderMonkey-only embedder: links libjs_static.a (NO libxul) -> embed.js/embed.wasm
# for node. Fast iteration on the JS->wasm JIT: edit firefox/js/src/wasm/WasmJS.cpp, then
#   make -C obj-js-emscripten/js/src   (re-archives libjs_static.a)
#   bash embed-js/build.sh             (relinks just embed.cpp + libjs_static.a, ~fast)
#   node embed-js/embed.js embed-js/t_jit.js
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OBJ="$ROOT/obj-js-emscripten"
export EM_CONFIG="$ROOT/em_config" EMSDK="${EMSDK:-/usr/lib/emsdk}"

INCLUDES=(
  -I"$ROOT/firefox/js/src" -I"$OBJ/js/src" -I"$OBJ/dist/include"
  -I"$OBJ/dist/system_wrappers" -include "$ROOT/firefox/config/gcc_hidden.h"
  -include "$OBJ/js/src/js-confdefs.h"
)
DEFINES=(-DNDEBUG=1 -DTRIMMED=1 -DEXPORT_JS_API -DMOZ_HAS_MOZGLUE -DMOZILLA_CLIENT)
CXXFLAGS=(-std=gnu++20 -fno-rtti -fno-exceptions -fno-math-errno -O1 -fPIC
          "${INCLUDES[@]}" "${DEFINES[@]}")

echo ">> compiling embed.cpp"
em++ "${CXXFLAGS[@]}" -c "$HERE/embed.cpp" -o "$HERE/embed.o" || exit 1

# libjs_static.a + the mozglue/fdlibm loose objects SpiderMonkey references (no standalone
# libmozglue.a in this objdir). Gathered as a glob; -sERROR_ON_UNDEFINED_SYMBOLS=0 lets the
# few host-only stubs resolve to emscripten defaults.
LIBJS="$OBJ/js/src/build/libjs_static.a"
# libjs_static.a folds in lz4/xxhash; add the C++ deps it references but doesn't contain:
# mfbt (mozcrash/double-conversion/SIMD), the allocator (mozalloc + mozjemalloc), and the
# mozglue/misc bits (Printf/TimeStamp/Decimal). Rust symbols (encoding_*/js_normalize/
# install_rust_hooks) have no lib in this objdir -> provided by rust-stubs.c.
MOZGLUE=(
  "$OBJ/mfbt/Unified_cpp_mfbt0.o" "$OBJ/mfbt/Unified_cpp_mfbt1.o"
  "$OBJ/memory/mozalloc/Unified_cpp_memory_mozalloc0.o"
  "$OBJ/mozglue/misc/Printf.o" "$OBJ/mozglue/misc/TimeStamp.o"
  "$OBJ/mozglue/misc/TimeStamp_posix.o" "$OBJ/mozglue/misc/Decimal.o"
  "$OBJ/mozglue/misc/SIMD.o" "$OBJ/mozglue/misc/Mutex_posix.o"
  "$OBJ/mozglue/misc/ConditionVariable_posix.o" "$OBJ/mozglue/misc/Uptime.o" "$OBJ/mozglue/misc/Now.o"
)
echo ">> compiling rust-stubs.c"
emcc -O1 -fPIC -c "$HERE/rust-stubs.c" -o "$HERE/rust-stubs.o" || exit 1
MOZGLUE+=("$HERE/rust-stubs.o")

SETTINGS=(
  -O1
  -sERROR_ON_UNDEFINED_SYMBOLS=0
  -sALLOW_MEMORY_GROWTH=1
  -sINITIAL_MEMORY=2147483648
  -sMAXIMUM_MEMORY=4294967296
  -sSTACK_SIZE=8388608
  -sEXIT_RUNTIME=0
  -sALLOW_TABLE_GROWTH=1     # the JIT bridge builds export trampolines via addFunction()
  -sWASM_BIGINT=1
  -sMODULARIZE=1
  -sEXPORT_NAME=createEmbed
  -sEXPORTED_FUNCTIONS=_main,_free,_malloc,_wasmhost_invoke_import,_wjhelp,_wasmjit_invoke,_WJTraceRoots,_InterpTraceRoots
  -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,addFunction,removeFunction,ENV,FS,callMain
  -sENVIRONMENT=node
  -sNODERAWFS=1
  -sINVOKE_RUN=0            # don't auto-run main; the node runner calls callMain(argv)
  --js-library "$HERE/wasm-host-bridge.js"
  -Wl,--strip-debug
)

echo ">> linking embed (libjs_static.a, no libxul)"
em++ "$HERE/embed.o" "$LIBJS" "${MOZGLUE[@]}" "${SETTINGS[@]}" \
  -o "$HERE/embed.js" 2> "$HERE/link.err"
rc=$?
echo ">> link rc=$rc"
if [ $rc -ne 0 ]; then echo "=== link.err tail ==="; tail -30 "$HERE/link.err"; fi
echo "=== undefined symbol count ==="; grep -c "undefined symbol:" "$HERE/link.err" 2>/dev/null
ls -la "$HERE"/embed.js "$HERE"/embed.wasm 2>/dev/null
