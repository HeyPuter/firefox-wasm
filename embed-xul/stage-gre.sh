#!/usr/bin/env bash
# Stage the GRE resource files (greprefs.js, component manifests, chrome, defaults,
# ...) that NS_InitXPCOM reads, into embed-xul/gre-stage/ for --preload-file. We
# EXCLUDE the big binaries (*.so is 3.7GB libxul, *.wasm, *.a) — those are linked
# into the module, not read from the FS. Trim/expand the set as runtime demands.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../obj-full-emscripten/dist/bin"
DST="$HERE/gre-stage"

rm -rf "$DST"; mkdir -p "$DST"
# -L: dereference symlinks (dist/bin uses relative symlinks into the objdir that
# would dangle here and break emscripten's file_packager).
rsync -aL \
  --exclude='*.so' --exclude='*.wasm' --exclude='*.a' --exclude='*.data' \
  --exclude='*.dbg' --exclude='*.symbols' \
  --exclude='firefox' --exclude='firefox-bin' --exclude='pingsender' \
  --exclude='nsinstall' --exclude='nsinstall_real' \
  "$SRC/" "$DST/"

echo "staged GRE resources -> $DST"
du -sh "$DST"
echo "top-level entries:"; ls "$DST" | head -40
echo "greprefs.js present: $([ -e "$DST/greprefs.js" ] && echo yes || echo NO)"
