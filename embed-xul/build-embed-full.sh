#!/usr/bin/env bash
# Phase 2b: link the minimal libxul embedder into a wasm module.
#   TARGET=node (default) -> -sNODERAWFS, runs via run-node.cjs (quick smoke).
#   TARGET=web            -> -sENVIRONMENT=web,worker, GRE resources preloaded to
#                            /gre, pthread worker pool; served by server.cjs (COOP/
#                            COEP) and driven by browser-test.cjs in real Chromium.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OBJ="$ROOT/obj-full-emscripten"
[ "${GECKO_RELEASE:-}" = "1" ] && OBJ="$ROOT/obj-full-emscripten-release"
INC="$OBJ/dist/include"
TARGET="${TARGET:-node}"
export EM_CONFIG="$ROOT/em_config"   # binaryen v129 shim (rust LLVM21 wasm features)

# -pthread: match libxul's threaded ABI (shared memory). Both compile + link.
# Release build (GECKO_RELEASE=1): -O3 makes emcc run wasm-opt's optimization
# passes over the whole linked module (the engine is already --enable-optimize;
# add --enable-lto via the mozconfig). Default -O0 -g0 is a fast debug link with
# NO wasm-opt.
if [ "${GECKO_RELEASE:-}" = "1" ]; then
  EMBED_OPT=(-O3); LINK_OPT=-O3
else
  EMBED_OPT=(-O0 -g0); LINK_OPT=-O0
fi

CXXFLAGS=(
  -std=gnu++20 -fno-exceptions -fno-rtti
  -fno-sized-deallocation -fno-aligned-new
  -DMOZILLA_INTERNAL_API -DMOZ_HAS_MOZGLUE -DNDEBUG=1
  -isystem "$INC"
  -isystem "$INC/nspr"
  -isystem "$ROOT/firefox/nsprpub/pr/include"   # fallback for un-exported nspr headers
  -pthread
  "${EMBED_OPT[@]}"
)

echo ">> [$TARGET] compiling embed-xul.cpp"
em++ "${CXXFLAGS[@]}" -c "$HERE/embed-xul.cpp" -o "$HERE/embed-xul.o" || exit 1

# libxul as a relocatable object (static link). Pass as .o so emcc never mistakes
# it for a side module to dlopen.
ln -sf libxul.stripped.so "$HERE/libxul.o"

# mozglue/memory/mfbt/fmt are MOZ_GLUE_IN_PROGRAM: linked into the PROGRAM, not
# libxul (libxul references them, e.g. mozilla::detail::MutexImpl, the allocator).
LOOSE=()
for d in mfbt mozglue/misc mozglue/baseprofiler mozglue/build \
         memory/build memory/mozalloc third_party/fmt; do
  for f in "$OBJ/$d"/*.o; do
    [ -e "$f" ] && LOOSE+=("$f")
  done
done
echo ">> ${#LOOSE[@]} loose glue objects"

# libnss3 (fold target; provides the NSS data templates libxul references and
# bundles NSPR; with static-softoken it now also carries softoken+freebl AND a
# static sqlite, so do NOT also link libmozsqlite3 -> duplicate sqlite3_*) +
# libgkcodecs (ogg/opus/vorbis; NS_InitXPCOM registers codec fns).
# NOTE: libnss3.stripped.so is the UNSTRIPPED libnss3.so (llvm-strip --strip-debug
# corrupts the larger static-softoken object -> "invalid relocation offset").
EXTRA=(
  "$HERE/libnss3.stripped.so"
  "$HERE/libgkcodecs.stripped.so"
)

EMSETTINGS=(
  "$LINK_OPT"
  --profiling-funcs
  # ASSERTIONS=1, not 2: level 2 adds emscripten's expensive integer-write checks
  # (checkInt32 etc.), and its MIN_INT32 is off-by-one (-(2**31)+1 = -2147483647),
  # so it spuriously aborts when a syscall legitimately writes 0x80000000 -- e.g.
  # select() writing an fd_set mask `1<<31` (= -2147483648) for a high socket fd,
  # which happens on the initial load of any site that opens many connections. The
  # heap write itself is correct; only the over-strict assertion fires.
  -sASSERTIONS=1
  # STACK_OVERFLOW_CHECK=1 (not the default 2): level 2 emits binaryen's
  # --check-stack-overflow, which instruments EVERY wasm function with a stack-
  # pointer check -- heavy overhead for the JS interpreter's deep call chains.
  # Level 1 keeps a cheap one-time canary check without per-function instrumentation.
  -sSTACK_OVERFLOW_CHECK=1
  -sERROR_ON_UNDEFINED_SYMBOLS=0
  -sALLOW_MEMORY_GROWTH=1
  -sINITIAL_MEMORY=536870912
  -sMAXIMUM_MEMORY=4294967296
  -sSTACK_SIZE=8388608
  -sEXIT_RUNTIME=0
  -pthread
  -sPTHREAD_POOL_SIZE=20           # pre-spawn workers; in-browser the main thread can't
                                   # block to spawn one on-demand, so pre-create enough
                                   # for Gecko's startup threads (IO/timer/stylo/...).
  -sPTHREAD_POOL_SIZE_STRICT=0     # still allow on-demand (works in node; browser relies on pool)
  -sMODULARIZE=1
  -sEXPORT_NAME=createGecko
  -sEXPORTED_FUNCTIONS=_main,_xul_init,_free,_malloc,_WasmXPTCStubDispatch,_xul_cmd_ptr,_wisp_wakeword,_wasmhost_invoke_import,_wjhelp,_wasmjit_invoke,_WJTraceRoots
  -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,FS,addFunction,removeFunction,ENV,addRunDependency,removeRunDependency
  -lidbfs.js                       # IndexedDB-backed FS so the chrome build can mount
                                   # a persistent profile dir (FS.syncfs); inert unless
                                   # JS calls FS.mount(IDBFS,...) (embed-chrome only).
  -sALLOW_TABLE_GROWTH=1            # xptcall builds JS->wasm stub fns via addFunction()
  -sWASM_BIGINT=1                   # i64 XPCOM params cross the JS boundary as BigInt
  --pre-js "$HERE/wisp-bridge.js"   # WISP networking: route SOCKFS sockets over WISP
  --js-library "$HERE/wisp-syscalls.js"  # override select()/socket() for >64 fds (keeps emsdk pristine)
  --js-library "$HERE/wasm-host-bridge.js"  # guest WebAssembly -> host WebAssembly passthrough
  -sPROXY_TO_PTHREAD=1              # run main() (the render) on a pthread so its
                                   # SpinEventLoopUntil can block without deadlocking
                                   # the runtime main thread that services proxied calls
  # --- GPU acceleration: WebGL2 (GLES3) so WebRender's RenderCompositorOGL can
  # composite on the GPU and present to the page <canvas>. Without these the GL
  # symbols libxul references (webrender/CompositorOGL) link as abort stubs.
  # GLContextProviderEmscripten creates a context PROXIED to the main browser
  # thread (works from WebRender's Renderer pthread); OFFSCREEN_FRAMEBUFFER lets
  # it emulate explicit swap by blitting a back buffer. Deliberately NOT enabling
  # OFFSCREENCANVAS_SUPPORT, so the canvas stays on the main thread for proxying.
  -sMAX_WEBGL_VERSION=2
  # MIN=1 so emscripten's GL layer also supports WebGL1 (GLES2) content contexts: the
  # compositor still uses WebGL2, but real WebGL1 content (e.g. shaders that #extension
  # GL_EXT_frag_depth, a WebGL1-only extension) needs a genuine WebGL1 context.
  -sMIN_WEBGL_VERSION=1
  -sFULL_ES3
  -sOFFSCREEN_FRAMEBUFFER=1
  -sGL_SUPPORT_EXPLICIT_SWAP_CONTROL=1
  -sGL_ENABLE_GET_PROC_ADDRESS=1
  # GPU mode routes the page canvas (#screen) to WebRender's Renderer pthread as a
  # transferred OffscreenCanvas (RenderThread::Start + NSPR settransferredcanvases),
  # so its compositor GL context is created LOCAL on that worker (no per-GL-call proxy
  # to the main thread). Requires OffscreenCanvas support at build time.
  -sOFFSCREENCANVAS_SUPPORT=1
  # emscripten's PROXY_TO_PTHREAD app thread transfers the default OFFSCREENCANVASES_TO_PTHREAD
  # canvas to itself (crt1_proxy_main passes MAX_PTR). The default "#canvas" doesn't exist
  # here and aborts startup, and "" is rejected by the flag parser, so point it at a
  # throwaway 1x1 #gldummy canvas (index.html) the app thread can harmlessly own. The real
  # page canvas (#screen) is transferred to the Renderer thread via the pthread attr.
  -sOFFSCREENCANVASES_TO_PTHREAD=#gldummy
)

# DEBUG=1: keep DWARF so wasm crash offsets can be mapped to source lines with
# llvm-symbolizer. The DWARF (~3GB) is split into a sidecar (gecko.debug.wasm) so
# the main gecko.wasm stays loadable; symbolize with:
#   llvm-symbolizer --obj=embed-xul/gecko.debug.wasm 0x<codeOffset>
# Default: strip DWARF at link (llvm-strip corrupts the relocatable .so reloc
# tables, so we link the UNSTRIPPED .so and let -Wl,--strip-debug strip the module).
if [ "${DEBUG:-0}" = "1" ]; then
  EMSETTINGS+=( -g -gseparate-dwarf="$HERE/gecko.debug.wasm" )
else
  EMSETTINGS+=( -Wl,--strip-debug )
fi

if [ "$TARGET" = "web" ]; then
  EMSETTINGS+=(
    -sENVIRONMENT=web,worker
    --preload-file "$HERE/gre-stage@/gre"   # GRE resources (greprefs.js, manifests, ...) into MEMFS at /gre
  )
  OUT="$HERE/gecko.js"
else
  EMSETTINGS+=(
    -sENVIRONMENT=node,worker
    -sNODERAWFS=1
  )
  OUT="$HERE/gecko.js"
fi

echo ">> [$TARGET] linking embed-xul + libxul (477MB) + glue -> $OUT (slow)"
em++ "$HERE/embed-xul.o" "$HERE/libxul.o" "${LOOSE[@]}" "${EXTRA[@]}" \
  "${EMSETTINGS[@]}" -o "$OUT" 2> "$HERE/link.err"
rc=$?
echo ">> link rc=$rc"
ls -la "$HERE"/gecko.js "$HERE"/gecko.wasm "$HERE"/gecko.data "$HERE"/gecko.worker.js 2>/dev/null
echo "=== undefined symbol count ==="; grep -c "undefined symbol:" "$HERE/link.err"
echo "=== undefined sample ==="; grep -oE "undefined symbol: [^ ]+" "$HERE/link.err" | sort -u | head -20
echo "=== duplicate symbols ==="; grep -oE "duplicate symbol: [^ ]+" "$HERE/link.err" | sort -u | head
echo "=== other errors ==="; grep -iE "error" "$HERE/link.err" | grep -ivE "undefined symbol|duplicate symbol" | head -15

# Release (GECKO_RELEASE=1, web target): zstd-compress the shipped artifacts at
# max level. index.html downloads the .zst and decompresses with zstddec, using
# gecko-assets.json for the wasm's uncompressed size (the data size comes from
# emscripten). Non-release builds remove any stale .zst/manifest so the frontend
# stays on the uncompressed path.
if [ "$TARGET" = web ]; then
  if [ "${GECKO_RELEASE:-}" = "1" ] && [ "$rc" = 0 ] && command -v zstd >/dev/null; then
    echo ">> [release] zstd --ultra -22 gecko.wasm + gecko.data"
    zstd -q -f --ultra -22 "$HERE/gecko.wasm" -o "$HERE/gecko.wasm.zst"
    zstd -q -f --ultra -22 "$HERE/gecko.data" -o "$HERE/gecko.data.zst"
    printf '{"compressed":true,"wasm":%s,"data":%s}\n' \
      "$(stat -c%s "$HERE/gecko.wasm")" "$(stat -c%s "$HERE/gecko.data")" \
      > "$HERE/gecko-assets.json"
    echo ">> wrote gecko.wasm.zst ($(du -h "$HERE/gecko.wasm.zst" | cut -f1)), gecko.data.zst ($(du -h "$HERE/gecko.data.zst" | cut -f1)), gecko-assets.json"
  else
    rm -f "$HERE/gecko.wasm.zst" "$HERE/gecko.data.zst" "$HERE/gecko-assets.json"
  fi
fi
