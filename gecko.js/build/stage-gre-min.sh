#!/usr/bin/env bash
# Stage the MINIMAL GRE resource set needed to render a web page into
# gecko.js/build/gre-stage (preloaded into gecko.data at /gre). Trees that the
# basic "embed a web page" demo does not need are EXCLUDED here; a consumer that
# needs them (e.g. chrome-demo's Firefox front-end) supplies them at runtime via
# the gecko.js `fs` provider (readFile/readdir):
#   browser/        the Firefox front-end UI (chrome only)        ~66M
#   hyphenation/    hyphenation dictionaries (not needed to render) ~4M
#   dictionaries/   spellcheck dictionaries                         ~0.5M
#   gmp-*           bundled DRM/codec plugins
#
# Tier-1 feature trees that plain web rendering never touches are ALSO excluded
# (all lazy-loaded: removing them only disables that feature, not rendering):
#   chrome/pdfjs          ~7.3M  built-in PDF viewer
#   .../global/ml         ~4.4M  AI/ML (transformers, onnxruntime, wllama, openai)
#   chrome/remote         ~2.5M  CDP/WebDriver remote agent (embed never enables it)
#   .../translations + modules/translations ~1.8M  built-in page translation
#   .../global/vendor     ~1.4M  react/redux/d3 (only about: pages use it)
#   .../global/certviewer ~1.1M  about:certificate
#   about:* diag pages    ~0.8M  aboutMemory/Telemetry/Support/Processes/Logging,
#                                aboutwebrtc, megalist, usercharacteristics
#   .../global/license.html ~0.3M
#   chrome/pippki         ~0.2M  cert dialogs
#
# Tier-2 (only the pure web embed -- chrome-demo's WebExtensions/Sync need these):
#   WebExtensions, Sync, Remote Settings (chrome-demo would need these back).
# Tier-3 (feature code/data unused by plain rendering):
#   ScalarArtifactDefinitions.json + EventArtifactDefinitions.json  telemetry defs
#   chrome/toolkit/res/{nimbus,normandy,messaging-system}  experiments
#   chrome/toolkit/res/autofill                       form-autofill data
#   moz-src/toolkit/components/{ipprotection,doh,search,reader}  VPN/DoH/search/reader
# Tier-4 -- modules/ keep-list (see the find below): essentially all of modules/ is
#   chrome JS that a content embed never imports; only 4 are reached. ~5MB dropped.
# (res/, components/, actors/, localization/, .../global/elements + errors,
# chrome/toolkit/skin/classic [video/form widget skins] are load-bearing / risky and
# KEPT.) Net: gecko.data 38M -> ~8M.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"          # gecko.js/build
ROOT="$(cd "$HERE/../.." && pwd)"              # repo root
OBJ="$ROOT/obj-full-emscripten"
[ "${GECKO_RELEASE:-}" = "1" ] && OBJ="$ROOT/obj-full-emscripten-release"
SRC="$OBJ/dist/bin"
DST="$HERE/gre-stage"

rm -rf "$DST"; mkdir -p "$DST"
# Pin bumps leave dangling symlinks in dist/bin; rsync -L aborts on them.
pruned=$(find "$SRC" -xtype l -print -delete 2>/dev/null || true)
[ -n "$pruned" ] && echo "stage-gre-min: pruned dangling symlink(s) from dist/bin" >&2

rsync -aL \
  --exclude='*.so' --exclude='*.wasm' --exclude='*.a' --exclude='*.data' \
  --exclude='*.dbg' --exclude='*.symbols' \
  --exclude='firefox' --exclude='firefox-bin' --exclude='pingsender' \
  --exclude='nsinstall' --exclude='nsinstall_real' \
  --exclude='browser' \
  --exclude='hyphenation' \
  --exclude='dictionaries' \
  --exclude='gmp-clearkey' --exclude='gmp-fake' --exclude='gmp-fakeopenh264' \
  --exclude='/chrome/pdfjs' --exclude='/chrome/pdfjs.manifest' \
  --exclude='/chrome/remote' --exclude='/chrome/remote.manifest' \
  --exclude='/chrome/pippki' --exclude='/chrome/pippki.manifest' \
  --exclude='/chrome/toolkit/content/global/ml' \
  --exclude='/chrome/toolkit/content/global/translations' \
  --exclude='/chrome/toolkit/content/global/vendor' \
  --exclude='/chrome/toolkit/content/global/certviewer' \
  --exclude='/chrome/toolkit/content/global/license.html' \
  --exclude='/chrome/toolkit/content/global/aboutwebrtc' \
  --exclude='/chrome/toolkit/content/global/aboutLogging' \
  --exclude='/chrome/toolkit/content/global/megalist' \
  --exclude='/chrome/toolkit/content/global/usercharacteristics' \
  --exclude='/chrome/toolkit/content/global/aboutMemory.js' \
  --exclude='/chrome/toolkit/content/global/aboutTelemetry.js' \
  --exclude='/chrome/toolkit/content/global/aboutSupport.js' \
  --exclude='/chrome/toolkit/content/global/aboutProcesses.js' \
  --exclude='/ScalarArtifactDefinitions.json' \
  --exclude='/EventArtifactDefinitions.json' \
  --exclude='/chrome/toolkit/res/nimbus' \
  --exclude='/chrome/toolkit/res/normandy' \
  --exclude='/chrome/toolkit/res/messaging-system' \
  --exclude='/chrome/toolkit/res/autofill' \
  --exclude='/moz-src/toolkit/components/ipprotection' \
  --exclude='/moz-src/toolkit/components/doh' \
  --exclude='/moz-src/toolkit/components/search' \
  --exclude='/moz-src/toolkit/components/reader' \
  "$SRC/" "$DST/"

# The excluded sub-manifests are still referenced by the top-level chrome.manifest;
# drop those lines so the chrome registry doesn't warn about missing files.
if [ -e "$DST/chrome.manifest" ]; then
  sed -i -E '/^manifest chrome\/(pdfjs|remote|pippki)\.manifest$/d' "$DST/chrome.manifest"
fi

# modules/*.sys.mjs are chrome-privileged JS imported by Gecko's own code (never by
# content). An over-aggressive "keep only the 4 imported by a blank page" experiment
# broke real sites: e.g. google.com touches navigator.geolocation, whose provider
# (NetworkGeolocationProvider.sys.mjs) was gone -> load error + a teardown crash in
# Geolocation::Shutdown. A blank page imports ~4 modules; real pages import a wide,
# unpredictable set (geolocation, forms, find, ...), and a missing one is usually a
# logged exception but sometimes fatal. So keep modules/ broadly; only drop the heavy
# Tier-2/3 feature SUBSYSTEMS (WebExtensions / Sync / telemetry / fxaccounts /
# downloads / form-autofill / translations) that a content embed won't reach.
if [ -d "$DST/modules" ]; then
  rm -rf "$DST/modules/addons" "$DST/modules/services-sync" \
         "$DST/modules/services-common" "$DST/modules/services-settings" \
         "$DST/modules/shared" "$DST/modules/translations"
  find "$DST/modules" -maxdepth 1 -type f \( \
    -name 'Extension*' -o -name 'AddonManager.sys.mjs' -o -name 'Schemas.sys.mjs' \
    -o -name 'FxAccounts*' -o -name 'Download*' -o -name 'Telemetry*' \) -delete
fi

# Headless gfxFT2FontList needs >=1 font in <process dir>/fonts or it MOZ_CRASHes
# ("No font files found"). Seed /gre/fonts with the vendored LiberationSans set.
FONTSRC="$ROOT/firefox/toolkit/components/pdfjs/content/web/standard_fonts"
mkdir -p "$DST/fonts"
cp "$FONTSRC"/*.ttf "$DST/fonts/" 2>/dev/null || true
if [ -z "$(ls -A "$DST/fonts" 2>/dev/null)" ]; then
  echo "!! no .ttf at $FONTSRC -- headless build would crash 'No font files found'" >&2
  exit 1
fi

echo "staged minimal GRE -> $DST ($(du -sh "$DST" | cut -f1)); greprefs.js: $([ -e "$DST/greprefs.js" ] && echo yes || echo NO)"
