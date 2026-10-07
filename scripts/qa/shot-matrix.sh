#!/usr/bin/env bash
# File: scripts/qa/shot-matrix.sh
# Purpose: Takes the shared-screen screenshot matrix (US-1.9.3, D24): every view and comparison mode at each
#          laptop size and zoom, in Chrome and/or Edge, plus a contact sheet to review them by eye.
# Provides: CLI `scripts/qa/shot-matrix.sh [page] [outdir] [chrome|edge|both]`; exit 1 if any shot failed
# Depends on: scripts/qa/lib-qa.sh, scripts/screenshot.sh
# Used by: scripts/qa/run-all.sh, the project owner before each demo
#
# Sizes are the window in CSS pixels and zoom is the device scale factor:
#   1280x800 and 1536x864 (a 1920 screen at 125%), each at zoom 1.25 and 1.5,
#   plus 853x533 at 1.5 (a 1280 screen at 150%).
# Add QA_TALL=1 for one extra full-length shot per view and mode (1280 wide, 4000 tall)
# to review what sits below the fold. QA_JOBS sets how many shots run at once (default 3).
# Opened states (expanded chart, side panels, popovers, the tour) are shot through the QA
# page's ?act= at 1280x800@1.25 and 853x533@1.5; QA_ACTS="" skips them, QA_ONLY_ACTS=1 shoots only them.

set -u
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/qa/lib-qa.sh
. "$here/lib-qa.sh"

page="${1:-index-sample.html}"
outdir="${2:-/tmp/tap-qa/shots}"
browsers="$(qa_browsers "${3:-both}")" || exit 2
sizes="${QA_SIZES:-1280x800@1.25 1280x800@1.5 1536x864@1.25 1536x864@1.5 1024x640@1.25 853x533@1.5}"
[ "${QA_TALL:-0}" = "1" ] && sizes="$sizes 1280x4000@1"
jobs="${QA_JOBS:-3}"

mkdir -p "$outdir"
list="$(mktemp)"
trap 'rm -f "$list"' EXIT

# One line per shot: browser, page, query, width, height, zoom, file.
[ "${QA_ONLY_ACTS:-0}" = "1" ] && QA_VIEWS="none"
for b in $browsers; do
  mkdir -p "$outdir/$b"
  for view in $QA_VIEWS; do
    [ "$view" = "none" ] && continue
    for mode in $(qa_view_modes "$view"); do
      q="screenshot=1&$(qa_view_query "$view")&$(qa_mode_query "$mode")"
      for s in $sizes; do
        wh="${s%@*}"; zoom="${s#*@}"
        printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$b" "$page" "$q" "${wh%x*}" "${wh#*x}" "$zoom" \
          "$outdir/$b/$view-$mode-${wh}@$zoom.png" >> "$list"
      done
    done
  done
done

# Opened states (expanded chart, side panels, popovers, tour) through the QA page's ?act=, in All regions
acts="${QA_ACTS-expand:overview expand:industry type:industry explain:overview sources:overview details:overview term:overview tour:overview}"
for b in $browsers; do
  for a in $acts; do
    for s in 1280x800@1.25 853x533@1.5; do
      wh="${s%@*}"; zoom="${s#*@}"
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$b" tests/qa.html "screenshot=1&view=${a#*:}&mode=all&act=${a%%:*}" \
        "${wh%x*}" "${wh#*x}" "$zoom" "$outdir/$b/act-${a%%:*}-${a#*:}-${wh}@$zoom.png" >> "$list"
    done
  done
done

echo "$(wc -l < "$list") shots, $jobs at a time"
fails="$outdir/failed.txt"
: > "$fails"
# Each line runs screenshot.sh; a failed shot is listed, not fatal, so the rest still run.
while IFS=$'\t' read -r b p q w h z f; do
  printf '%s\0%s\0%s\0%s\0%s\0%s\0%s\0' "$p" "$q" "$w" "$h" "$z" "$f" "$b"
done < "$list" | xargs -0 -n 7 -P "$jobs" sh -c '"$0" "$@" > /dev/null || echo "$6" >> "'"$fails"'"' "$TAP_ROOT/scripts/screenshot.sh"

# Contact sheet: one section per browser and view, one row per mode.
sheet="$outdir/index.html"
{
  echo '<!doctype html><meta charset="utf-8"><title>QA screenshot matrix</title>'
  echo '<style>body{font:14px sans-serif;margin:16px}figure{display:inline-block;margin:6px;vertical-align:top}'
  echo 'img{width:300px;border:1px solid}figcaption{font-size:12px}</style>'
  echo "<h1>$page</h1><p>Generated $(date '+%Y-%m-%d %H:%M')</p>"
  for b in $browsers; do
    for view in $QA_VIEWS; do
      [ "$view" = "none" ] && continue
      echo "<h2>$b: $view</h2>"
      for mode in $(qa_view_modes "$view"); do
        echo "<div><h3>$mode</h3>"
        for s in $sizes; do
          n="$view-$mode-${s%@*}@${s#*@}.png"
          echo "<figure><a href=\"$b/$n\"><img src=\"$b/$n\" loading=\"lazy\"></a><figcaption>${s%@*} at ${s#*@}</figcaption></figure>"
        done
        echo "</div>"
      done
    done
    echo "<h2>$b: opened states</h2>"
    for a in $acts; do
      for s in 1280x800@1.25 853x533@1.5; do
        n="act-${a%%:*}-${a#*:}-${s%@*}@${s#*@}.png"
        echo "<figure><a href=\"$b/$n\"><img src=\"$b/$n\" loading=\"lazy\"></a><figcaption>${a%%:*} on ${a#*:}, ${s%@*} at ${s#*@}</figcaption></figure>"
      done
    done
  done
} > "$sheet"

echo "contact sheet: $sheet"
if [ -s "$fails" ]; then
  echo "FAIL $(wc -l < "$fails") shots not written (listed in $fails)"
  exit 1
fi
echo "PASS all shots written"
