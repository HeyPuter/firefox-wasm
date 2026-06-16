#!/usr/bin/env bash
# Stage the GRE resource files (greprefs.js, component manifests, chrome, defaults,
# ...) that NS_InitXPCOM reads, into embed-xul/gre-stage/ for --preload-file. We
# EXCLUDE the big binaries (*.so is 3.7GB libxul, *.wasm, *.a) — those are linked
# into the module, not read from the FS. Trim/expand the set as runtime demands.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OBJ="$HERE/../obj-full-emscripten"
[ "${GECKO_RELEASE:-}" = "1" ] && OBJ="${OBJ}-release"
SRC="$OBJ/dist/bin"
DST="$HERE/gre-stage"

# WARNING: gre-stage/ is REGENERATED from scratch on every run (rm -rf below), so
# anything hand-edited here is silently lost on the next build. Do NOT edit staged
# files directly. Reproducible alternatives: set prefs via Preferences::Set* in
# embed-xul.cpp (gate runtime-only ones on an env flag); patch chrome JS in the
# firefox source so it lands in dist/bin; add runtime assets here by copying them in
# below (see the fonts block). (A lost GPU-pref edit here caused an all-white ?gpu=1.)
rm -rf "$DST"; mkdir -p "$DST"
# -L: dereference symlinks (dist/bin uses relative symlinks into the objdir that
# would dangle here and break emscripten's file_packager).
rsync -aL \
  --exclude='*.so' --exclude='*.wasm' --exclude='*.a' --exclude='*.data' \
  --exclude='*.dbg' --exclude='*.symbols' \
  --exclude='firefox' --exclude='firefox-bin' --exclude='pingsender' \
  --exclude='nsinstall' --exclude='nsinstall_real' \
  "$SRC/" "$DST/"

# Headless gfxFT2FontList reads text fonts from <process dir>/fonts (= /gre/fonts in
# the web build). The headless toolkit installs none (browser/fonts ships only an
# emoji font, and only for gtk/windows), so seed /gre/fonts with the LiberationSans
# set already vendored in the pinned tree by pdf.js. Without a font here,
# gfxFT2FontList::FindFonts hits MOZ_CRASH("No font files found") -> wasm
# "RuntimeError: unreachable" at first layout.
FONTSRC="$HERE/../firefox/toolkit/components/pdfjs/content/web/standard_fonts"
mkdir -p "$DST/fonts"
cp "$FONTSRC"/*.ttf "$DST/fonts/" 2>/dev/null || true
if [ -z "$(ls -A "$DST/fonts" 2>/dev/null)" ]; then
  echo "!! no .ttf at $FONTSRC -- the headless build would crash 'No font files found'" >&2
  exit 1
fi
echo "staged $(ls "$DST/fonts" | wc -l) font(s) -> $DST/fonts"

echo "staged GRE resources -> $DST"
du -sh "$DST"
echo "top-level entries:"; ls "$DST" | head -40
echo "greprefs.js present: $([ -e "$DST/greprefs.js" ] && echo yes || echo NO)"
