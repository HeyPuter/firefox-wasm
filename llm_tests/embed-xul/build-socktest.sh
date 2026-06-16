#!/usr/bin/env bash
# Build the tiny socket test (Step 2 of WISP bring-up). Fast: no libxul.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
export EM_CONFIG="$ROOT/em_config"

em++ "$HERE/socktest.c" \
  -O1 -pthread -sPROXY_TO_PTHREAD=1 -sPTHREAD_POOL_SIZE=4 \
  -sALLOW_MEMORY_GROWTH=1 -sEXIT_RUNTIME=1 \
  -sENVIRONMENT=web,worker \
  -sEXPORTED_RUNTIME_METHODS=ENV,FS \
  --pre-js "$HERE/wisp-bridge.js" \
  -o "$HERE/socktest.js"
echo "build rc=$?"
ls -la "$HERE"/socktest.js "$HERE"/socktest.wasm 2>/dev/null | awk '{print $5,$9}'
