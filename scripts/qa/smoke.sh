#!/usr/bin/env bash
# File: scripts/qa/smoke.sh
# Purpose: Runs the scripted interaction smoke test (scripts/qa/smoke.js) on the QA page in Chrome and/or Edge:
#          every view, mode, side panel, popover, chart type, table, expand, hide, Show me and the tour.
# Provides: CLI `scripts/qa/smoke.sh [chrome|edge|both] [outdir]`; exit 1 if any step failed or raised an error
# Depends on: scripts/qa/lib-qa.sh, scripts/qa/qa-report.js, tests/qa.html, Node
# Used by: scripts/qa/run-all.sh, the project owner before each demo
#
# The full step list with each outcome is kept in <outdir>/<browser>.json.

set -u
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/qa/lib-qa.sh
. "$here/lib-qa.sh"

browsers="$(qa_browsers "${1:-both}")" || exit 2
out="${2:-/tmp/tap-qa/smoke}"
mkdir -p "$out"
status=0

for b in $browsers; do
  base="$out/$b"
  TAP_VTIME_BUDGET="${TAP_VTIME_BUDGET:-600000}" qa_run "$b" tests/qa.html "?qa=smoke" \
    "$base.html" "$base.log" --window-size=1280,800 || echo "ERROR  [$b] browser did not finish"
  "$QA_NODE" "$here/qa-report.js" smoke "$b smoke" "$base.html" "$base.log" --json "$base.json" || status=1
done

if [ $status -eq 0 ]; then echo "PASS smoke test"; else echo "FAIL smoke test: see the lines above"; fi
exit $status
