#!/usr/bin/env bash
# File: scripts/qa/text-size.sh
# Purpose: Runs the D24 text-size check (scripts/qa/text-size.js) on the QA page for every view and comparison
#          mode at each window width: body text 16 px or more, any text 13 px or more, chart font sizes 13 or more.
# Provides: CLI `scripts/qa/text-size.sh [chrome|edge|both] [outdir]`; exit 1 on any text below the floor
# Depends on: scripts/qa/lib-qa.sh, scripts/qa/qa-report.js, tests/qa.html, Node
# Used by: scripts/qa/run-all.sh, the project owner before each demo
#
# QA_WIDTHS sets the window widths in CSS pixels (default "1280 853"). Browser zoom
# does not change CSS pixel sizes, so zoom needs no separate run.

set -u
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/qa/lib-qa.sh
. "$here/lib-qa.sh"

browsers="$(qa_browsers "${1:-both}")" || exit 2
out="${2:-/tmp/tap-qa/text}"
widths="${QA_WIDTHS:-1280 853}"
mkdir -p "$out"
status=0

for b in $browsers; do
  for w in $widths; do
    for view in $QA_VIEWS; do
      for mode in $(qa_view_modes "$view"); do
        q="screenshot=1&$(qa_view_query "$view")&$(qa_mode_query "$mode")&qa=text"
        base="$out/$b-$w-$view-$mode"
        qa_run "$b" tests/qa.html "?$q" "$base.html" "$base.log" "--window-size=$w,800" ||
          echo "ERROR  [$b $w $view $mode] browser did not finish"
        "$QA_NODE" "$here/qa-report.js" text "$b $w $view $mode" "$base.html" "$base.log" --json "$base.json" || status=1
      done
    done
  done
done

if [ $status -eq 0 ]; then echo "PASS text sizes"; else echo "FAIL text sizes: see the lines above"; fi
exit $status
