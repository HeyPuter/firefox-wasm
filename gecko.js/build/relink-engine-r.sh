#!/usr/bin/env bash
# Relink the engine libs (libxul/libnss3/libgkcodecs) as `-r` RELOCATABLE objects.
#
# emscripten 6.0.1's wasm-ld (1) SIGSEGVs in the ElemSection writer on the `-shared`
# link of the huge libxul, and (2) treats `-shared` wasm libs as runtime-fetched
# dynamic side modules rather than static inputs. This project statically links all
# engine libs into ONE wasm module (gecko.js/build/build-lib.sh), so they must be
# plain relocatable objects. (emscripten 3.1.56's older lld tolerated the `-shared`
# path and static-linked them; 6.0.x does not.)
#
# We re-derive each lib's link command from the RecursiveMake backend (so it tracks
# any flag changes), then transform `-shared` -> `-r`, drop the ELF-only flags
# (-Wl,-z,*, --version-script), and for libxul drop the dependent .so inputs (NSS /
# codecs / freebl / lgpllibs / sqlite / ffvpx) -- those are resolved at the embedder's
# final link, exactly as the static-link model expects.
#
# Run AFTER `mach build` has compiled the objects (it fails at the libxul `-shared`
# link; this produces the relocatable libxul.so so a second `mach build` can skip the
# link and finish the resource/chrome tiers). See the Makefile `build` target.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"          # gecko.js/build
ROOT="$(cd "$HERE/../.." && pwd)"              # repo root
OBJ="$ROOT/obj-full-emscripten"
[ "${GECKO_RELEASE:-}" = "1" ] && OBJ="$ROOT/obj-full-emscripten-release"
DISTBIN="$OBJ/dist/bin"

relink() {  # $1=make-subdir  $2=libname  $3=drop-dependent-so-inputs(0/1)
  local dir="$OBJ/$1" lib="$2" dropso="$3"
  local so="$DISTBIN/$lib.so"
  [ -d "$dir" ] || { echo "!! relink-engine-r: $dir missing -- run 'mach build' first"; return 1; }
  # Derive the (-shared) link recipe: move the target aside so `make -n` prints the
  # rule, then restore it.
  local bak=""
  [ -e "$so" ] && { bak="${so}.relink-bak"; mv -f "$so" "$bak"; }
  local cmd
  cmd=$(make -C "$dir" -n V=1 2>/dev/null \
        | grep -E "em(cc|\+\+) .* -o +\S*${lib}\.so" | head -1 | sed 's#^/usr/bin/sccache ##')
  [ -n "$bak" ] && mv -f "$bak" "$so"
  [ -n "$cmd" ] || { echo "!! relink-engine-r: could not derive link recipe for $lib"; return 1; }
  cmd=$(printf '%s' "$cmd" \
        | sed -e 's/ -shared / -r /' -e 's/-Wl,-z,[a-z]*//g' -e 's#-Wl,--version-script,[^ ]*##')
  if [ "$dropso" = 1 ]; then
    cmd=$(printf '%s' "$cmd" \
          | sed -E 's#[^ ]*/dist/bin/lib(nss3|gkcodecs|lgpllibs|freebl3|mozsqlite3|mozavcodec|mozavutil|smime3|ssl3|nssutil3)\.so##g')
  fi
  echo ">> relink-engine-r: relinking $lib.so as -r"
  ( cd "$dir" && { ulimit -s unlimited 2>/dev/null || true; }; eval "$cmd" ) \
    || { echo "!! relink-engine-r: $lib -r relink failed"; return 1; }
}

relink toolkit/library/build libxul 1 || exit 1
relink security             libnss3 0 || exit 1
relink config/external/gkcodecs libgkcodecs 0 || exit 1
echo ">> relink-engine-r: libxul/libnss3/libgkcodecs are now relocatable (-r) objects"
