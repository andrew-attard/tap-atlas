#!/usr/bin/env bash
# File: scripts/verify.sh
# Purpose: Runs every local check in order (lint, denylist, ignored files, docs paths, browser tests) before a pull request.
# Provides: CLI `scripts/verify.sh [--release] [--browser chrome|edge|both]`; exit 1 if any step fails
# Depends on: tools/lint.js, tools/check-docs.js, tools/check-docs3.js, scripts/check-text.sh, scripts/test-headless.sh, git, Node
# Used by: developers and agents before opening a pull request (see CONTRIBUTING.md)

set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root" || exit 2
release=0
browser=both
while [ $# -gt 0 ]; do
  case "$1" in
    --release) release=1 ;;
    --browser) browser="${2:-}"; shift ;;
    *) echo "Usage: $0 [--release] [--browser chrome|edge|both]"; exit 2 ;;
  esac
  shift
done
case "$browser" in chrome|edge|both) ;; *) echo "Unknown browser: $browser"; exit 2 ;; esac

node_bin="$(command -v node || echo "$HOME/.local/bin/node")"
lint_flag=()
query=""
if [ $release -eq 1 ]; then lint_flag=(--release); query="?release=1"; fi

failed=0
log="$(mktemp)"
trap 'rm -f "$log"' EXIT

# step <label> <command...>: one PASS/FAIL line, full output only on failure.
step() {
  local label="$1"
  shift
  local start=$SECONDS
  if "$@" > "$log" 2>&1; then
    echo "PASS  $label  ($((SECONDS - start)) s) $(tail -n 1 "$log")"
  else
    echo "FAIL  $label  ($((SECONDS - start)) s)"
    sed 's/^/      /' "$log"
    failed=1
  fi
}

denylist_scan() {
  local files=()
  while IFS= read -r -d '' f; do
    case "$f" in vendor/*) continue ;; esac
    [ -f "$f" ] && files+=("$f")
  done < <(git ls-files -z --cached)
  "$root/scripts/check-text.sh" "${files[@]}" && echo "${#files[@]} files clean"
}

ignored_guard() {
  local bad
  bad="$(git ls-files | grep -E '\.(xlsx|xlsm|xls|csv|tsv)$|^data/plan-data\.js$|^content/organization\.js$')"
  if [ -n "$bad" ]; then
    echo "Tracked files that must never be committed:"
    printf '%s\n' "$bad"
    return 1
  fi
  echo "no forbidden files tracked"
}

step "lint${lint_flag:+ --release}" "$node_bin" tools/lint.js "${lint_flag[@]}"
step "lint self-test" "$node_bin" tools/lint.js --self-test
step "denylist scan" denylist_scan
step "ignored-files guard" ignored_guard
# The QA page must list the same scripts as the app (it is generated from index-sample.html)
if [ -f scripts/qa/make-qa-page.js ]; then
  step "qa page in step" "$node_bin" scripts/qa/make-qa-page.js --check
fi
# Every path the README and docs name must exist (TPV-TC-204)
step "docs paths" "$node_bin" tools/check-docs.js
# Handover and portfolio file checks (Phase 3)
step "handover and portfolio" "$node_bin" tools/check-docs3.js
# The committed sample data must be exactly what the generator writes (US-1.3.3)
if [ -f tools/generate-sample-data.js ]; then
  step "sample data reproducible" "$node_bin" tools/generate-sample-data.js --check
fi

one="$browser"
[ "$one" = "both" ] && one=chrome
if [ -f tests.html ]; then
  step "tests.html$query ($browser)" scripts/test-headless.sh "tests.html$query" "$browser"
  step "harness self-test ($one)" scripts/test-headless.sh "tests/selftest.html$query" "$one"
else
  step "harness self-test, no tests.html yet ($browser)" scripts/test-headless.sh "tests/selftest.html$query" "$browser"
fi

if [ $failed -ne 0 ]; then
  echo "verify: FAIL"
  exit 1
fi
echo "verify: PASS"
