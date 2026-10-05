#!/usr/bin/env bash
# File: scripts/qa/run-all.sh
# Purpose: Runs every automated cross-cutting check of US-1.9.3 in order and prints one PASS/FAIL line each:
#          console, text sizes, offline, smoke test, imperfect-data runs, denylist search and the screenshot matrix.
# Provides: CLI `scripts/qa/run-all.sh [chrome|edge|both] [outdir]`; exit 1 if any check failed
# Depends on: scripts/qa/*.sh, scripts/check-text.sh, git, Node, Chrome and/or Edge
# Used by: the project owner before each demo; the results go in the execution log
#
# The screenshots still need a person to look at them (contact sheet at <outdir>/shots/index.html).
# Views: every view in the menu order of config/views.js, plus two region profiles (scripts/qa/lib-qa.sh).
# Real data: QA_DATA=data/plan-data.js changes the regions used for the modes; the console check
# then also runs on index.html (the checks on tests/qa.html always use the sample data).

set -u
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/qa/lib-qa.sh
. "$here/lib-qa.sh"

which="${1:-both}"
out="${2:-/tmp/tap-qa}"
qa_browsers "$which" > /dev/null || exit 2
mkdir -p "$out"
failed=0

step() {
  local label="$1" log="$out/$2.log"
  shift 2
  local start=$SECONDS
  if "$@" > "$log" 2>&1; then
    echo "PASS  $label  ($((SECONDS - start)) s)"
  else
    echo "FAIL  $label  ($((SECONDS - start)) s), details in $log"
    grep -E '^(ERROR|FAIL)' "$log" | head -20 | sed 's/^/      /'
    failed=1
  fi
}

denylist() {
  local files=()
  while IFS= read -r -d '' f; do [ -f "$TAP_ROOT/$f" ] && files+=("$TAP_ROOT/$f"); done < <(git -C "$TAP_ROOT" ls-files -z --cached)
  "$TAP_ROOT/scripts/check-text.sh" "${files[@]}" && echo "${#files[@]} files clean"
}

step "console, index-sample.html" console "$here/console-check.sh" index-sample.html "$which" "$out/console"
[ -f "$TAP_ROOT/data/plan-data.js" ] &&
  step "console, index.html" console-index "$here/console-check.sh" index.html "$which" "$out/console-index"
step "text sizes (D24)" text "$here/text-size.sh" "$which" "$out/text"
step "offline" offline "$here/offline-check.sh" "$which" "$out/offline"
step "smoke test" smoke "$here/smoke.sh" "$which" "$out/smoke"
step "organization names and colours (denylist)" denylist denylist
step "imperfect data (one browser)" variants "$here/variants.sh" chrome "$out/variants"
step "screenshot matrix" shots "$here/shot-matrix.sh" index-sample.html "$out/shots" "$which"

echo "Review the screenshots by eye: $out/shots/index.html"
exit $failed
