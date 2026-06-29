#!/usr/bin/env bash
# Build the gecko.js engine artifacts: stage the engine libs + minimal GRE, then
# emcc-link embed-xul.cpp + libxul into wasm/gecko.{js,wasm,data,worker.js}.
# Classic emscripten MODULARIZE (createGecko) so the ESM library loads it via
# script injection.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"          # gecko.js (package root)
PKG="$HERE"                                    # gecko.js
ROOT="$(cd "$PKG/.." && pwd)"                  # repo root
SRC="$HERE/src"                                # C++ embedder sources (embed-*.cpp)
LIB="$HERE/lib"                                # --js-library glue (wisp-net.js, provider-fs.js, ...)
BUILD="$HERE/build"                            # generated artifacts (.o, staged libs, gre-stage, link.err)
mkdir -p "$BUILD"
OBJ="$ROOT/obj-full-emscripten"
[ "${GECKO_RELEASE:-}" = "1" ] && OBJ="$ROOT/obj-full-emscripten-release"
INC="$OBJ/dist/include"
DISTBIN="$OBJ/dist/bin"
OUT="$PKG/wasm/gecko.js"
export EM_CONFIG="$ROOT/em_config"
# Use the active emsdk's em++ (EMSDK points at the pinned, WasmFS-patched install
# set up by `make emsdk`). Default to the repo's pinned emsdk when EMSDK is unset:
# a PATH em++ is almost always an UNPATCHED emscripten whose libwasmfs lacks our
# ProviderBackend patch, which fails the link with
# "undefined exported symbol: _provider_record_entry".
if [ -z "${EMSDK:-}" ] && [ -d "$ROOT/emsdk/upstream/emscripten" ]; then
  export EMSDK="$ROOT/emsdk"
fi
EMXX="${EMSDK:+$EMSDK/upstream/emscripten/}em++"
mkdir -p "$PKG/wasm"

# Embedder C++ codegen is -O3 in release. The emcc LINK stays at -O0 even in release
# so emcc does NOT run its own wasm-opt -- the manual wasm-opt step after the link
# (release only, below) is the SINGLE optimization pass, using $GECKO_WASMOPT_FLAGS.
if [ "${GECKO_RELEASE:-}" = "1" ]; then EMBED_OPT=(-O3); LINK_OPT=-O0; else EMBED_OPT=(-O0 -g0); LINK_OPT=-O0; fi
[ "${NO_WASM_OPT:-}" = "1" ] && LINK_OPT=-O0

# 1. stage the engine libs (unstripped; the final link's --strip-debug strips the
#    module -- llvm-strip corrupts the relocatable .so reloc tables).
echo ">> staging engine libs from $DISTBIN"
for lib in libxul libnss3 libgkcodecs; do
  [ -e "$DISTBIN/$lib.so" ] || { echo "!! missing $DISTBIN/$lib.so -- run 'make build' first"; exit 1; }
  cp "$DISTBIN/$lib.so" "$BUILD/$lib.stripped.so"
done
ln -sf libxul.stripped.so "$BUILD/libxul.o"

# 2. stage the minimal GRE -> build/gre-stage
bash "$HERE/stage-gre-min.sh" || exit 1

# 3. compile + link
CXXFLAGS=(
  -std=gnu++20 -fno-exceptions -fno-rtti -fno-sized-deallocation -fno-aligned-new
  -DMOZILLA_INTERNAL_API -DMOZ_HAS_MOZGLUE -DNDEBUG=1
  -isystem "$INC" -isystem "$INC/nspr" -isystem "$ROOT/firefox/nsprpub/pr/include"
  -pthread "${EMBED_OPT[@]}"
)
echo ">> compiling embedder (embed-*.cpp)"
EMBED_OBJS=()
for src in embed-xul embed-init embed-browser embed-paint embed-input embed-mirror; do
  "$EMXX" "${CXXFLAGS[@]}" -c "$SRC/$src.cpp" -o "$BUILD/$src.o" || exit 1
  EMBED_OBJS+=( "$BUILD/$src.o" )
done

# mozglue/memory/mfbt/fmt are MOZ_GLUE_IN_PROGRAM: linked into the program, not libxul.
LOOSE=()
for d in mfbt mozglue/misc mozglue/baseprofiler mozglue/build memory/build memory/mozalloc third_party/fmt; do
  for f in "$OBJ/$d"/*.o; do [ -e "$f" ] && LOOSE+=("$f"); done
done
EXTRA=( "$BUILD/libnss3.stripped.so" "$BUILD/libgkcodecs.stripped.so" )

EMSETTINGS=(
  "$LINK_OPT" --profiling-funcs
  # Keep the JS glue UNMINIFIED even in release. The post-link patches in
  # patch-gecko-shaderfix.mjs (shader hoist + proxied-JS completion + gl_present_yield
  # Suspending + invokeEntryPoint promising) match LITERAL generated-glue source. At
  # -O2+ emscripten enables MINIFY_WHITESPACE, which strips the spaces/newlines those
  # regexes rely on -> "could not find the _glShaderSource call site". --minify 0
  # disables ONLY JS whitespace minification; the wasm is still fully -O3 / wasm-opt
  # optimized, and rspack re-minifies the glue into dist/ anyway. No-op at -O0. (No name
  # minification happens here: emscripten's minifyNames is wasm2js-only + off under -pthread.)
  --minify 0
  -sASSERTIONS=1 -sSTACK_OVERFLOW_CHECK=1 -sERROR_ON_UNDEFINED_SYMBOLS=0
  # Allocator: mimalloc instead of emscripten's default dlmalloc. Gecko is extremely
  # allocation-heavy and MOZ_MEMORY (mozjemalloc) is off on wasm, so every alloc hits
  # the emscripten malloc; mimalloc is markedly faster and thread-aware (fits -pthread).
  -sMALLOC=mimalloc
  -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=536870912 -sMAXIMUM_MEMORY=4294967296
  -sSTACK_SIZE=67108864 -sEXIT_RUNTIME=0
  -pthread -sPTHREAD_POOL_SIZE=20 -sPTHREAD_POOL_SIZE_STRICT=0
  -sMODULARIZE=1 -sEXPORT_NAME=createGecko
  -sEXPORTED_FUNCTIONS=_main,_xul_init,_free,_malloc,_WasmXPTCStubDispatch,_xul_cmd_ptr,_wisp_wakeword,_wisp_deliver,_wisp_set_connected,_wisp_set_eof,_wisp_set_error,_wasmfs_create_provider_backend,_provider_record_entry,_wasmhost_invoke_import,_wjhelp,_wasmjit_invoke,_WJTraceRoots,_InterpTraceRoots,_b_help
  -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,FS,addFunction,removeFunction,ENV,addRunDependency,removeRunDependency,HEAPU8,HEAP32
  # WasmFS (the new FS impl). Its socket syscalls are reinstated by the WISP
  # backend patched into libwasmfs (emsdk-patches/wisp_socket.h); wisp-net.js is
  # the JS transport. Legacy SOCKFS/MEMFS/IDBFS are gone under WASMFS.
  -sWASMFS=1 -sALLOW_TABLE_GROWTH=1 -sWASM_BIGINT=1
  --js-library "$LIB/wisp-net.js"
  --js-library "$LIB/provider-fs.js"
  --js-library "$LIB/wasm-host-bridge.js"
  # Web Audio output: the wasm cubeb backend (firefox cubeb_wasmaudio.c) pulls PCM
  # into a shared-heap ring; this library drains it via a host AudioWorklet into an
  # AudioContext (emaudio_* run proxied on the main thread).
  --js-library "$LIB/audio-out.js"
  # GPU present yield (gl-present.js): gl_present_yield is wired to JSPI MANUALLY in
  # the glue (patch-gecko-shaderfix.mjs) -- WebAssembly.Suspending on this one import
  # + WebAssembly.promising on the proxy/mailbox executors that reach SwapBuffers. We
  # deliberately do NOT use -sJSPI: global JSPI makes every async op (OPFS, image
  # decode, proxy waits) suspend, and those die ("suspend JS frames") under Gecko's
  # pervasive JS frames (xptcall trampoline, DOM bindings). Scoping JSPI to this one
  # import keeps everything else on its original non-suspending block model.
  --js-library "$LIB/gl-present.js"
  -sPROXY_TO_PTHREAD=1
  -sMAX_WEBGL_VERSION=2 -sMIN_WEBGL_VERSION=1 -sFULL_ES3
  -sOFFSCREEN_FRAMEBUFFER=1 -sGL_SUPPORT_EXPLICIT_SWAP_CONTROL=1 -sGL_ENABLE_GET_PROC_ADDRESS=1
  -sOFFSCREENCANVAS_SUPPORT=1 -sOFFSCREENCANVASES_TO_PTHREAD=#gldummy
  -sENVIRONMENT=web,worker
  --preload-file "$BUILD/gre-stage@/gre-baked"
)
if [ "${DEBUG:-0}" = "1" ]; then
  EMSETTINGS+=( -g -gseparate-dwarf="$PKG/wasm/gecko.debug.wasm" )
else
  EMSETTINGS+=( -Wl,--strip-debug )
fi

ulimit -s unlimited 2>/dev/null || ulimit -s 524288 2>/dev/null || true
echo ">> linking embed-xul + libxul + glue -> $OUT (slow)"
"$EMXX" "${EMBED_OBJS[@]}" "$BUILD/libxul.o" "${LOOSE[@]}" "${EXTRA[@]}" \
  "${EMSETTINGS[@]}" -o "$OUT" 2> "$BUILD/link.err"
rc=$?
echo ">> link rc=$rc"
ls -la "$PKG"/wasm/gecko.js "$PKG"/wasm/gecko.wasm "$PKG"/wasm/gecko.data "$PKG"/wasm/gecko.worker.js 2>/dev/null | awk '{print $5,$9}'
[ "$rc" = 0 ] || { echo "=== link.err tail ==="; tail -25 "$BUILD/link.err"; exit "$rc"; }

# Release: the SINGLE wasm-opt pass over the linked module (emcc's own wasm-opt is
# off -- LINK_OPT=-O0 above). These flags can't be routed through em++ (it rejects
# -O4), so wasm-opt is invoked directly on gecko.wasm. -all enables all wasm features
# so it accepts the module regardless of the target_features section. Override the flag
# string with $GECKO_WASMOPT_FLAGS; set NO_WASM_OPT=1 to skip optimization entirely.
if [ "${GECKO_RELEASE:-}" = "1" ] && [ "${NO_WASM_OPT:-}" != "1" ]; then
  WASMOPT="${EMSDK:+$EMSDK/upstream/bin/}wasm-opt"
  WASMOPT_FLAGS="${GECKO_WASMOPT_FLAGS:--all -O4 -O4 -O4 -O4 -O4 -O4}"
  echo ">> wasm-opt $WASMOPT_FLAGS  (release, on gecko.wasm)"
  # shellcheck disable=SC2086 -- intentional word-splitting of the flag string
  "$WASMOPT" $WASMOPT_FLAGS "$PKG/wasm/gecko.wasm" -o "$PKG/wasm/gecko.wasm.opt" \
    && mv -f "$PKG/wasm/gecko.wasm.opt" "$PKG/wasm/gecko.wasm" \
    || { echo "!! wasm-opt failed"; rm -f "$PKG/wasm/gecko.wasm.opt"; exit 1; }
fi

# emscripten regenerates gecko.js on every link; re-apply the WebRender shader
# fix (hoist `out` varyings declared after main() so host WebGL -- e.g. Firefox,
# which runs ANGLE's init-output-variables pass -- accepts the compositor
# shaders). Idempotent; errors if the emscripten call site moved.
echo ">> patching gecko.js (WebRender shader hoist for host WebGL)"
node "$HERE/patch-gecko-shaderfix.mjs" "$OUT" || { echo "!! gecko.js shader patch failed"; exit 1; }

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
