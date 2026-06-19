#!/usr/bin/env bash
# Max-of-N octane measurement (max = least-disturbed run; robust to background jitter on this
# shared host). Uses the octane runner (which already passes --no-liftoff for stable TurboFan
# numbers). Usage: BENCH=richards N=8 bash measure.sh [ENV=VAL ...]
HERE="$(cd "$(dirname "$0")" && pwd)"
BENCH="${BENCH:-richards}"; N="${N:-8}"
best=0
for i in $(seq 1 "$N"); do
  s=$(env "$@" node "$HERE/octane.cjs" "$BENCH" 2>/dev/null | grep -oE "OCTSCORE=[0-9]+" | cut -d= -f2)
  [ "${s:-0}" -gt "$best" ] && best=$s
done
echo "$best"
