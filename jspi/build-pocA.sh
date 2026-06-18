#!/usr/bin/env bash
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
export EM_CONFIG="$ROOT/em_config"
emcc "$HERE/pocA.c" \
  -O0 \
  -sMODULARIZE=1 -sEXPORT_NAME=createPocA \
  -sENVIRONMENT=web \
  -sEXPORTED_FUNCTIONS=_main,_poc_run \
  -sEXPORTED_RUNTIME_METHODS=ccall \
  -sERROR_ON_UNDEFINED_SYMBOLS=0 \
  --js-library "$HERE/pocA-lib.js" \
  -o "$HERE/pocA.js"
echo "build rc=$? -> $HERE/pocA.{js,wasm}"
ls -la "$HERE"/pocA.js "$HERE"/pocA.wasm 2>/dev/null
