#!/usr/bin/env bash
# After a `mach build` that changed libxul: re-strip libxul.so -> libxul.stripped.so
# and relink the web embedder. (libnss3 unchanged unless NSS was rebuilt.)
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
# Release uses a separate objdir so debug<->release doesn't thrash one tree.
OBJDIR="$ROOT/obj-full-emscripten"
[ "${GECKO_RELEASE:-}" = "1" ] && OBJDIR="${OBJDIR}-release"
DISTBIN="$OBJDIR/dist/bin"

# Stage the engine libs the embedder links against (all built by `mach build` into
# dist/bin). Copy them UNSTRIPPED and let the final emcc link (-Wl,--strip-debug in
# build-embed-full.sh) strip the combined module: llvm-strip/objcopy corrupt these
# relocatable wasm .so reloc tables ("invalid relocation offset") when stripped
# directly (notably libnss3's static softoken).
echo ">> staging engine libs from $DISTBIN ($(date +%H:%M:%S)) ..."
miss=0
for lib in libxul libnss3 libgkcodecs; do
  src="$DISTBIN/$lib.so"
  if [ ! -e "$src" ]; then
    echo "!! missing $src -- did 'mach build' complete? (NSS + gkcodecs are part of the engine build)"
    miss=1; continue
  fi
  cp "$src" "$HERE/$lib.stripped.so"
  ls -la "$HERE/$lib.stripped.so" | awk '{print $5,$9}'
done
[ "$miss" = 0 ] || { echo ">> aborting: missing engine libs"; exit 1; }

echo ">> relinking web build ($(date +%H:%M:%S)) ..."
TARGET=web bash "$HERE/build-embed-full.sh" 2>&1 | grep -E "compiling|error:|link rc=|pthread-fwd"
rc=${PIPESTATUS[0]}   # exit of build-embed-full.sh, not grep's
echo ">> done ($(date +%H:%M:%S)) rc=$rc"
ls -la "$HERE/gecko.wasm" 2>/dev/null | awk '{print $5,$6,$7,$8}'
# A failed relink must fail the caller (make web/release) so the error surfaces
# here -- not as a missing gecko.js in the downstream packaging step.
[ "$rc" = 0 ] || { echo "!! web relink failed -- see embed-xul/link.err"; exit "$rc"; }
