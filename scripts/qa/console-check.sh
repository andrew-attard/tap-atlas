#!/usr/bin/env bash
# File: scripts/qa/console-check.sh
# Purpose: Opens a page headless in Chrome and/or Edge for every view and comparison mode and reports console
#          errors, uncaught exceptions and files that fail to load, each with its view and mode (US-1.9.3).
# Provides: CLI `scripts/qa/console-check.sh [page] [chrome|edge|both] [outdir]`; exit 1 on any error
# Depends on: scripts/qa/lib-qa.sh, scripts/qa/qa-report.js, scripts/qa/make-qa-page.js, tests/qa.html, Node
# Used by: scripts/qa/run-all.sh, the project owner before each demo (also on real data with index.html)
#
# Three passes per browser:
#   1. Files: every script and stylesheet the page names must exist. A missing file that git
#      ignores (the real data and organization files) is reported as expected, not as an error.
#   2. The page itself, per view and mode: console lines from the browser log. Browsers print
#      no level there, so only "Uncaught" lines count as errors; the rest are listed as notes.
#   3. The QA page (tests/qa.html, the same scripts with hooks), per view and mode: console
#      errors and warnings with their level, plus a blank view, "Not built yet", a missing
#      wording key, a banner count other than one and sideways scrolling. Sample page only.
# QA_WIDTH sets the window width for pass 3 (default 1280).

set -u
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/qa/lib-qa.sh
. "$here/lib-qa.sh"

page="${1:-index-sample.html}"
browsers="$(qa_browsers "${2:-both}")" || exit 2
out="${3:-/tmp/tap-qa/console}"
width="${QA_WIDTH:-1280}"
mkdir -p "$out"
status=0
errors=0

# ---- 1. files the page names ----
echo "== files named by $page"
while IFS= read -r ref; do
  [ -z "$ref" ] && continue
  if [ -f "$TAP_ROOT/$ref" ]; then continue; fi
  if git -C "$TAP_ROOT" check-ignore -q "$ref" 2> /dev/null; then
    echo "EXPECTED  missing $ref (ignored by git: kept out of the repository; the page shows its no-data screen)"
  else
    echo "ERROR  missing $ref"
    status=1; errors=$((errors + 1))
  fi
done < <(sed -e 's/<!--.*-->//' "$TAP_ROOT/$page" | grep -oE '(src|href)="[^"]+"' | sed -E 's/^(src|href)="//; s/"$//' | grep -vE '^(https?:|data:|#)')

# The QA page must load exactly what the sample page loads
if [ "$page" = "index-sample.html" ]; then
  "$QA_NODE" "$here/make-qa-page.js" --check || { status=1; errors=$((errors + 1)); }
fi

for b in $browsers; do
  for view in $QA_VIEWS; do
    for mode in $(qa_view_modes "$view"); do
      q="screenshot=1&$(qa_view_query "$view")&$(qa_mode_query "$mode")"
      tag="$b $view $mode"
      base="$out/$b-$view-$mode"

      # ---- 2. the page itself ----
      qa_run "$b" "$page" "?$q" "$base.page.html" "$base.page.log" "--window-size=$width,800" ||
        echo "ERROR  [$tag] browser did not finish on $page"
      if ! "$QA_NODE" "$here/qa-report.js" log "$tag $page" "$base.page.html" "$base.page.log"; then
        status=1; errors=$((errors + 1))
      fi

      # ---- 3. the QA page (sample data only) ----
      if [ "$page" = "index-sample.html" ]; then
        qa_run "$b" tests/qa.html "?$q&qa=console" "$base.qa.html" "$base.qa.log" "--window-size=$width,800" ||
          echo "ERROR  [$tag] browser did not finish on tests/qa.html"
        if ! "$QA_NODE" "$here/qa-report.js" console "$tag" "$base.qa.html" "$base.qa.log" --json "$base.json"; then
          status=1; errors=$((errors + 1))
        fi
      fi
    done
  done
done

if [ $status -eq 0 ]; then echo "PASS console check: no errors on $page"; else echo "FAIL console check: $errors runs with errors on $page"; fi
exit $status
