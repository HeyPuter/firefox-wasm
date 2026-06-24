#!/usr/bin/env bash
# Build the libxul.js engine artifacts: stage the engine libs + minimal GRE, then
# emcc-link embed-xul.cpp + libxul into wasm/gecko.{js,wasm,data,worker.js}.
# Classic emscripten MODULARIZE (createGecko) so the ESM library loads it via
# script injection. Flags mirror embed-xul/build-embed-full.sh (web target).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"          # libxul.js/build
PKG="$(cd "$HERE/.." && pwd)"                  # libxul.js
ROOT="$(cd "$PKG/.." && pwd)"                  # repo root
OBJ="$ROOT/obj-full-emscripten"
[ "${GECKO_RELEASE:-}" = "1" ] && OBJ="$ROOT/obj-full-emscripten-release"
INC="$OBJ/dist/include"
DISTBIN="$OBJ/dist/bin"
OUT="$PKG/wasm/gecko.js"
export EM_CONFIG="$ROOT/em_config"
mkdir -p "$PKG/wasm"

if [ "${GECKO_RELEASE:-}" = "1" ]; then EMBED_OPT=(-O3); LINK_OPT=-O3; else EMBED_OPT=(-O0 -g0); LINK_OPT=-O0; fi
[ "${NO_WASM_OPT:-}" = "1" ] && LINK_OPT=-O0

# 1. stage the engine libs (unstripped; the final link's --strip-debug strips the
#    module -- llvm-strip corrupts the relocatable .so reloc tables).
echo ">> staging engine libs from $DISTBIN"
for lib in libxul libnss3 libgkcodecs; do
  [ -e "$DISTBIN/$lib.so" ] || { echo "!! missing $DISTBIN/$lib.so -- run 'make build' first"; exit 1; }
  cp "$DISTBIN/$lib.so" "$HERE/$lib.stripped.so"
done
ln -sf libxul.stripped.so "$HERE/libxul.o"

# 2. stage the minimal GRE -> build/gre-stage
bash "$HERE/stage-gre-min.sh" || exit 1

# 3. compile + link
CXXFLAGS=(
  -std=gnu++20 -fno-exceptions -fno-rtti -fno-sized-deallocation -fno-aligned-new
  -DMOZILLA_INTERNAL_API -DMOZ_HAS_MOZGLUE -DNDEBUG=1
  -isystem "$INC" -isystem "$INC/nspr" -isystem "$ROOT/firefox/nsprpub/pr/include"
  -pthread "${EMBED_OPT[@]}"
)
echo ">> compiling embed-xul.cpp"
em++ "${CXXFLAGS[@]}" -c "$HERE/embed-xul.cpp" -o "$HERE/embed-xul.o" || exit 1

# mozglue/memory/mfbt/fmt are MOZ_GLUE_IN_PROGRAM: linked into the program, not libxul.
LOOSE=()
for d in mfbt mozglue/misc mozglue/baseprofiler mozglue/build memory/build memory/mozalloc third_party/fmt; do
  for f in "$OBJ/$d"/*.o; do [ -e "$f" ] && LOOSE+=("$f"); done
done
EXTRA=( "$HERE/libnss3.stripped.so" "$HERE/libgkcodecs.stripped.so" )

EMSETTINGS=(
  "$LINK_OPT" --profiling-funcs
  -sASSERTIONS=1 -sSTACK_OVERFLOW_CHECK=1 -sERROR_ON_UNDEFINED_SYMBOLS=0
  -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=536870912 -sMAXIMUM_MEMORY=4294967296
  -sSTACK_SIZE=8388608 -sEXIT_RUNTIME=0
  -pthread -sPTHREAD_POOL_SIZE=20 -sPTHREAD_POOL_SIZE_STRICT=0
  -sMODULARIZE=1 -sEXPORT_NAME=createGecko
  -sEXPORTED_FUNCTIONS=_main,_xul_init,_free,_malloc,_WasmXPTCStubDispatch,_xul_cmd_ptr,_wisp_wakeword,_wasmhost_invoke_import,_wjhelp,_wasmjit_invoke,_WJTraceRoots
  -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,FS,addFunction,removeFunction,ENV,addRunDependency,removeRunDependency
  -lidbfs.js -sALLOW_TABLE_GROWTH=1 -sWASM_BIGINT=1
  --pre-js "$HERE/wisp-bridge.js"
  --js-library "$HERE/wisp-syscalls.js"
  --js-library "$HERE/wasm-host-bridge.js"
  -sPROXY_TO_PTHREAD=1
  -sMAX_WEBGL_VERSION=2 -sMIN_WEBGL_VERSION=1 -sFULL_ES3
  -sOFFSCREEN_FRAMEBUFFER=1 -sGL_SUPPORT_EXPLICIT_SWAP_CONTROL=1 -sGL_ENABLE_GET_PROC_ADDRESS=1
  -sOFFSCREENCANVAS_SUPPORT=1 -sOFFSCREENCANVASES_TO_PTHREAD=#gldummy
  -sENVIRONMENT=web,worker
  --preload-file "$HERE/gre-stage@/gre"
)
if [ "${DEBUG:-0}" = "1" ]; then
  EMSETTINGS+=( -g -gseparate-dwarf="$PKG/wasm/gecko.debug.wasm" )
else
  EMSETTINGS+=( -Wl,--strip-debug )
fi

ulimit -s unlimited 2>/dev/null || ulimit -s 524288 2>/dev/null || true
echo ">> linking embed-xul + libxul + glue -> $OUT (slow)"
em++ "$HERE/embed-xul.o" "$HERE/libxul.o" "${LOOSE[@]}" "${EXTRA[@]}" \
  "${EMSETTINGS[@]}" -o "$OUT" 2> "$HERE/link.err"
rc=$?
echo ">> link rc=$rc"
ls -la "$PKG"/wasm/gecko.js "$PKG"/wasm/gecko.wasm "$PKG"/wasm/gecko.data "$PKG"/wasm/gecko.worker.js 2>/dev/null | awk '{print $5,$9}'
[ "$rc" = 0 ] || { echo "=== link.err tail ==="; tail -25 "$HERE/link.err"; exit "$rc"; }

# Compress shipped assets for the loader (src/index.ts reads gecko-assets.json and
# decodes the .zst with zstddec via emscripten getPreloadedPackage/instantiateWasm).
# gecko.data is ALWAYS compressed (small, mostly text). gecko.wasm only in RELEASE
# (--ultra -22 on the ~250MB module is slow; debug iterates the link constantly).
command -v zstd >/dev/null || { echo "!! zstd not found -- install zstd"; exit 1; }
DATA_LVL="${GECKO_DATA_ZSTD_LEVEL:-19}"
echo ">> zstd -$DATA_LVL gecko.data (always)"
zstd -q -f "-$DATA_LVL" "$PKG/wasm/gecko.data" -o "$PKG/wasm/gecko.data.zst" || { echo "!! zstd gecko.data failed"; exit 1; }
WASM_COMPRESSED=false
if [ "${GECKO_RELEASE:-}" = "1" ]; then
  echo ">> zstd --ultra -22 gecko.wasm (release)"
  zstd -q -f --ultra -22 "$PKG/wasm/gecko.wasm" -o "$PKG/wasm/gecko.wasm.zst" || { echo "!! zstd gecko.wasm failed"; exit 1; }
  WASM_COMPRESSED=true
else
  rm -f "$PKG/wasm/gecko.wasm.zst"
fi
printf '{"dataCompressed":true,"dataSize":%s,"wasmCompressed":%s,"wasmSize":%s}\n' \
  "$(stat -c%s "$PKG/wasm/gecko.data")" "$WASM_COMPRESSED" "$(stat -c%s "$PKG/wasm/gecko.wasm")" \
  > "$PKG/wasm/gecko-assets.json"
echo ">> assets: gecko.data.zst $(du -h "$PKG/wasm/gecko.data.zst" | cut -f1)$([ "$WASM_COMPRESSED" = true ] && echo " + gecko.wasm.zst $(du -h "$PKG/wasm/gecko.wasm.zst" | cut -f1)")  (wasmCompressed=$WASM_COMPRESSED)"
exit "$rc"
