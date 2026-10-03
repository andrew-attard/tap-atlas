#!/usr/bin/env bash
# File: scripts/qa/lib-qa.sh
# Purpose: Shared settings and helpers for the QA scripts: the view and mode matrix, and a headless run that keeps the browser log.
# Provides: QA_VIEWS, QA_MODES, qa_mode_query, qa_mode_label, qa_regions, qa_run, qa_browsers
# Depends on: scripts/lib-browser.sh (browser paths and file:// URLs), Node
# Used by: scripts/qa/*.sh (sourced, not run directly)
#
# Region ids are read from the data file, so the same scripts run on the sample
# data and, later, on real data (QA_DATA=data/plan-data.js).

QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib-browser.sh
. "$QA_DIR/../lib-browser.sh"

QA_VIEWS="${QA_VIEWS:-overview industry insights guide}"
# Comparison modes as labels; qa_mode_query turns each into the screenshot query.
QA_MODES="${QA_MODES:-all one-average one-total pair set org}"
QA_DATA="${QA_DATA:-data/sample-plan-data.js}"
QA_NODE="$(command -v node || echo "$HOME/.local/bin/node")"

# Region ids in file order, one per line, read from the data file.
qa_regions() {
  "$QA_NODE" -e '
    const vm = require("vm"); const fs = require("fs");
    const ctx = { window: {} }; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(process.argv[1], "utf8"), ctx);
    const plan = ctx.window.PLAN_DATA || {};
    (plan.regions || []).forEach((r) => console.log(r.id));
  ' "$TAP_ROOT/$QA_DATA"
}

# qa_mode_query <label>: the screenshot query values for a mode label.
# Picks regions by position, never by name: the focus is the 5th region (often the
# one with gaps in sample data), the pair is first and last, the set is three spread out.
qa_mode_query() {
  local r n focus first last mid
  mapfile -t r < <(qa_regions)
  n=${#r[@]}
  first="${r[0]}"; last="${r[$((n - 1))]}"
  focus="${r[$(( n > 4 ? 4 : n - 1 ))]}"
  mid="${r[$((n / 2))]}"
  case "$1" in
    all) echo "mode=all" ;;
    one-average) echo "mode=one&focus=$focus&rest=average" ;;
    one-total) echo "mode=one&focus=$first&rest=total" ;;
    pair) echo "mode=pair&focus=$first&second=$last" ;;
    set) echo "mode=set&set=$first,$mid,$last" ;;
    org) echo "mode=org" ;;
    *) echo "mode=$1" ;;
  esac
}

qa_browsers() {
  case "${1:-both}" in
    chrome|edge) echo "$1" ;;
    both) echo "chrome edge" ;;
    *) echo "Unknown browser: $1" >&2; return 2 ;;
  esac
}

# qa_run <chrome|edge> <page> <query> <out-dom> <out-log> [extra flags...]
# Like browser_run, but keeps the browser log (stderr), where console messages land.
# Chrome only writes page console messages to the log with the LogJsConsoleMessages feature.
qa_run() {
  local which="$1" page="$2" query="$3" dom="$4" log="$5"
  shift 5
  local exe profile url rc
  exe="$(browser_find "$which")"
  if [ -z "$exe" ]; then echo "No $which browser found" >&2; return 1; fi
  if browser_windows; then profile="$TAP_WIN_TEMP/tap-qa-profile-$$-$RANDOM"; else profile="$(mktemp -d)"; fi
  mkdir -p "$profile"
  case "$page" in /*) url="$page" ;; *) url="$TAP_ROOT/$page" ;; esac
  url="$(file_url "$(browser_path_for "$url")")$query"
  local flags=(--headless=new --disable-gpu --no-first-run --no-default-browser-check
    --disable-extensions --allow-file-access-from-files
    "--user-data-dir=$(browser_path_for "$profile")"
    "--virtual-time-budget=${TAP_VTIME_BUDGET:-30000}"
    --enable-logging=stderr --v=0 --enable-features=LogJsConsoleMessages)
  [ "${CI:-}" = "true" ] && ! browser_windows && flags+=(--no-sandbox)
  timeout "${TAP_BROWSER_TIMEOUT:-180}" "$exe" "${flags[@]}" "$@" --dump-dom "$url" > "$dom" 2> "$log"
  rc=$?
  for _ in 1 2 3 4 5; do
    rm -rf "$profile" 2> /dev/null && [ ! -e "$profile" ] && break
    sleep 1
  done
  return $rc
}
