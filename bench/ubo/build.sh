#!/usr/bin/env bash
# Bundle uBlock's SNFE compile+load path into self-contained files.
# - build/compile-bundle.iife.js : globalThis.uboBench = {...}  (for the gecko-wasm `js` shell, browser, geckoEval)
# - build/compile-bundle.mjs     : ESM exports                  (alt for node)
# Unminified + --keep-names so function names survive for JIT profiling.
set -euo pipefail
cd "$(dirname "$0")"

ESBUILD="${ESBUILD:-esbuild}"
if ! command -v "$ESBUILD" >/dev/null 2>&1; then
    ESBUILD="$(ls /home/velzie/src/puter/node_modules/.bin/esbuild 2>/dev/null || true)"
fi
[ -n "$ESBUILD" ] || { echo "esbuild not found; set ESBUILD=/path/to/esbuild"; exit 1; }

mkdir -p build

COMMON=(driver.mjs --bundle --platform=neutral --target=es2022 --keep-names --log-level=warning)

"$ESBUILD" "${COMMON[@]}" --format=iife --global-name=uboBench --outfile=build/compile-bundle.iife.js
"$ESBUILD" "${COMMON[@]}" --format=esm                          --outfile=build/compile-bundle.mjs

echo "built:"
ls -la build/*.js build/*.mjs | awk '{print "  "$5, $9}'
