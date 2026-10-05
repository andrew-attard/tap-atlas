#!/usr/bin/env bash
# File: scripts/qa/variants.sh
# Purpose: Runs the smoke test on imperfect copies of the sample data (scripts/qa/variants.js) and reports what
#          breaks: exceptions, data markup that ran or became elements, NaN/undefined/null or raw keys on screen,
#          sideways scrolling. Steps that only found nothing to click (an empty state) are listed as notes.
# Provides: CLI `scripts/qa/variants.sh [chrome|edge|both] [outdir] [variant...]`; exit 1 on any error
# Depends on: scripts/qa/lib-qa.sh, scripts/qa/variants.js, scripts/qa/watch.js, scripts/qa/smoke.js, Node
# Used by: scripts/qa/run-all.sh; the maintainer before a release

set -u
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/qa/lib-qa.sh
. "$here/lib-qa.sh"

browsers="$(qa_browsers "${1:-chrome}")" || exit 2
out="${2:-/tmp/tap-qa/variants}"
shift 2 2> /dev/null || shift $#
mkdir -p "$out"
mapfile -t names < <("$QA_NODE" "$here/variants.js" "$@") || exit 2
echo "QA variants: ${names[*]}"
status=0

for b in $browsers; do
  for v in "${names[@]}"; do
    base="$out/$b-$v"
    TAP_VTIME_BUDGET="${TAP_VTIME_BUDGET:-900000}" TAP_BROWSER_TIMEOUT="${TAP_BROWSER_TIMEOUT:-600}" \
      qa_run "$b" "tests/qa-variant-$v.html" "?qa=smoke" "$base.html" "$base.log" --window-size=1280,800 ||
      echo "ERROR  [$b $v] browser did not finish"
    "$QA_NODE" "$here/qa-report.js" smoke "$b $v" "$base.html" "$base.log" --json "$base.json" > /dev/null 2>&1
    "$QA_NODE" -e '
      const fs = require("fs"); const [file, tag] = process.argv.slice(1);
      let j = null; try { j = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { /* no result */ }
      const steps = j && j.result && j.result.smoke;
      if (!steps) { process.stdout.write("ERROR  [" + tag + "] no smoke result\n"); process.exit(1); }
      let errors = 0;
      steps.forEach((s) => {
        if (s.errors && s.errors.length) { errors++; process.stdout.write("ERROR  [" + tag + "] " + s.name + ": " + s.errors.join(" | ").slice(0, 400) + "\n"); }
        else if (!s.ok) process.stdout.write("NOTE   [" + tag + "] " + s.name + ": " + (s.note || "") + "\n");
      });
      process.stdout.write((errors ? "FAIL" : "PASS") + "   [" + tag + "] " + steps.length + " steps, " + errors + " with errors\n");
      process.exit(errors ? 1 : 0);
    ' "$base.json" "$b $v" || status=1
  done
done

if [ $status -eq 0 ]; then echo "PASS imperfect-data runs"; else echo "FAIL imperfect-data runs: see the ERROR lines above"; fi
exit $status
