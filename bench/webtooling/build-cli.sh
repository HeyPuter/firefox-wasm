#!/usr/bin/env bash
# (Re)build dist/cli.js (the self-contained JS-shell bundle) from the upstream
# web-tooling-benchmark and copy it here. ~3 min, needs network + node.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
git clone --depth 1 https://github.com/v8/web-tooling-benchmark.git "$TMP/wtb"
( cd "$TMP/wtb" && npm install )   # postinstall runs webpack -> dist/cli.js
cp "$TMP/wtb/dist/cli.js" "$HERE/cli.js"
echo ">> wrote $HERE/cli.js ($(wc -c <"$HERE/cli.js") bytes)"
