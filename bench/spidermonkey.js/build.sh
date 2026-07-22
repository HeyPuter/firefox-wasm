#!/usr/bin/env bash
# Build the minimal SpiderMonkey-only embedder (libjs_static.a, NO libxul) ->
# build/embed.{js,wasm} for node. This is the wasm SpiderMonkey the bench harness
# (bench/main.ts) loads. Fast iteration on the JS->wasm JIT:
#   bash bench/spidermonkey.js/fastjit.sh    # recompile WasmJit*.cpp + relink (~65s)
#   node bench/main.ts octane richards
#
# Sources (embed.cpp, rust-stubs.c, wasm-host-bridge.js) live next to this script;
# build artifacts (embed.js, embed.wasm, *.o, link.err) go in build/.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"            # bench/spidermonkey.js
ROOT="$(cd "$HERE/../.." && pwd)"                # firefox-wasm repo root
OBJ="$ROOT/obj-js-emscripten"
OUT="$HERE/build"
mkdir -p "$OUT"
# The emscripten embed.js is CommonJS (module.exports). bench/package.json is
# type:module, so mark build/ as a CJS island or node mis-parses embed.js as ESM.
echo '{ "type": "commonjs" }' > "$OUT/package.json"
export EMSDK="${EMSDK:-/home/claude/emsdk}"
export EM_CONFIG="$ROOT/em_config"
export PATH="$EMSDK/upstream/emscripten:$PATH"

INCLUDES=(
  -I"$ROOT/firefox/js/src" -I"$OBJ/js/src" -I"$OBJ/dist/include"
  -I"$OBJ/dist/system_wrappers" -include "$ROOT/firefox/config/gcc_hidden.h"
  -include "$OBJ/js/src/js-confdefs.h"
)
DEFINES=(-DNDEBUG=1 -DTRIMMED=1 -DEXPORT_JS_API -DMOZ_HAS_MOZGLUE -DMOZILLA_CLIENT)
CXXFLAGS=(-std=gnu++20 -fno-rtti -fno-exceptions -fno-math-errno -O1 -fPIC
          "${INCLUDES[@]}" "${DEFINES[@]}")

echo ">> compiling embed.cpp"
em++ "${CXXFLAGS[@]}" -c "$HERE/embed.cpp" -o "$OUT/embed.o" || exit 1

LIBJS="$OBJ/js/src/build/libjs_static.a"
# libjs_static.a folds in lz4/xxhash; add the C++ deps it references but doesn't
# contain: mfbt, the allocator (mozalloc), and the mozglue/misc bits. Rust symbols
# come from rust-stubs.c (no rust lib in this objdir).
MOZGLUE=(
  "$OBJ/mfbt/Unified_cpp_mfbt0.o" "$OBJ/mfbt/Unified_cpp_mfbt1.o"
  "$OBJ/memory/mozalloc/Unified_cpp_memory_mozalloc0.o"
  "$OBJ/mozglue/misc/Printf.o" "$OBJ/mozglue/misc/TimeStamp.o"
  "$OBJ/mozglue/misc/TimeStamp_posix.o" "$OBJ/mozglue/misc/Decimal.o"
  "$OBJ/mozglue/misc/SIMD.o" "$OBJ/mozglue/misc/Mutex_posix.o"
  "$OBJ/mozglue/misc/ConditionVariable_posix.o" "$OBJ/mozglue/misc/Uptime.o" "$OBJ/mozglue/misc/Now.o"
)
echo ">> compiling rust-stubs.c"
emcc -O1 -fPIC -c "$HERE/rust-stubs.c" -o "$OUT/rust-stubs.o" || exit 1
MOZGLUE+=("$OUT/rust-stubs.o")

SETTINGS=(
  -O1
  -sERROR_ON_UNDEFINED_SYMBOLS=0
  -sALLOW_MEMORY_GROWTH=1
  -sINITIAL_MEMORY=2147483648
  -sMAXIMUM_MEMORY=4294967296
  -sSTACK_SIZE=67108864      # 64MB: real tool parsers (babel/typescript, web-tooling) recurse deep
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
# Wasm name section DEFAULT-ON for the dev embed: named C++ frames in trap
# stacks turn anonymous `wasm-function[97]` crashes into symbolized ones (this
# cracked the 2026-07-10 compartment-check crash instantly). WJ_NONAMES=1
# strips it for size-sensitive builds. (WJ_PROFNAMES kept as a no-op alias.)
if [ -z "${WJ_NONAMES:-}" ]; then SETTINGS+=(--profiling-funcs); fi

echo ">> linking embed (libjs_static.a, no libxul)"
em++ "$OUT/embed.o" "$LIBJS" "${MOZGLUE[@]}" "${SETTINGS[@]}" \
  -o "$OUT/embed.js" 2> "$OUT/link.err"
rc=$?
echo ">> link rc=$rc"
if [ $rc -ne 0 ]; then echo "=== link.err tail ==="; tail -30 "$OUT/link.err"; fi
echo "=== undefined symbol count ==="; grep -c "undefined symbol:" "$OUT/link.err" 2>/dev/null
ls -la "$OUT"/embed.js "$OUT"/embed.wasm 2>/dev/null
exit $rc
