#!/usr/bin/env bash
# After a `mach build` that changed libxul: re-strip libxul.so -> libxul.stripped.so
# and relink the web embedder. (libnss3 unchanged unless NSS was rebuilt.)
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DISTBIN=/home/velzie/src/gecko-wasm/obj-full-emscripten/dist/bin
STRIP=/usr/lib/emsdk/upstream/bin/llvm-strip

# llvm-strip/objcopy corrupt this object's wasm reloc table ("invalid relocation
# offset"), so DON'T strip here -- copy the unstripped libxul.so and let the link
# (-Wl,--strip-debug in build-embed-full.sh) strip the final module instead.
echo ">> copying unstripped libxul.so -> libxul.stripped.so ($(date +%H:%M:%S)) ..."
cp "$DISTBIN/libxul.so" "$HERE/libxul.stripped.so"
ls -la "$HERE/libxul.stripped.so" | awk '{print $5,$9}'

echo ">> relinking web build ($(date +%H:%M:%S)) ..."
TARGET=web bash "$HERE/build-embed-full.sh" 2>&1 | grep -E "compiling|error:|link rc=|pthread-fwd"
echo ">> done ($(date +%H:%M:%S))"
ls -la "$HERE/gecko.wasm" | awk '{print $5,$6,$7,$8}'
