#!/usr/bin/env bash
# Build the WebGL2-from-pthread de-risk test. Mirrors the embedder's threading
# flags (PROXY_TO_PTHREAD + pthread pool) and adds the candidate GL link flags.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
export EM_CONFIG="$ROOT/em_config"

emcc "$HERE/gltest.c" -O1 \
  -pthread \
  -sPROXY_TO_PTHREAD=1 \
  -sPTHREAD_POOL_SIZE=4 \
  -sALLOW_MEMORY_GROWTH=1 \
  -sEXIT_RUNTIME=0 \
  -sENVIRONMENT=web,worker \
  -sMAX_WEBGL_VERSION=2 \
  -sMIN_WEBGL_VERSION=2 \
  -sFULL_ES3 \
  -sOFFSCREEN_FRAMEBUFFER=1 \
  -sGL_SUPPORT_EXPLICIT_SWAP_CONTROL=1 \
  -sGL_ENABLE_GET_PROC_ADDRESS=1 \
  -sGL_DEBUG=1 \
  -sGL_ASSERTIONS=1 \
  -o "$HERE/gltest.js" 2> "$HERE/gltest-build.err"
rc=$?
echo "build rc=$rc"
if [ $rc -ne 0 ]; then tail -30 "$HERE/gltest-build.err"; fi
ls -la "$HERE"/gltest.js "$HERE"/gltest.wasm 2>/dev/null
