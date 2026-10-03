#!/usr/bin/env bash
# File: scripts/test-headless.sh
# Purpose: Runs a test page in headless Chrome and/or Edge and reports the harness results.
# Provides: CLI `scripts/test-headless.sh [page[?query]] [chrome|edge|both]`, exit 0 only if every browser passed
# Depends on: tools/parse-results.js, Node, Chrome or Edge; scripts/lib-browser.sh
# Used by: scripts/verify.sh, .github/workflows/ci.yml, developers
#
# How pages are opened (tested 2026-10-03, WSL2 Ubuntu, Windows Chrome and Edge):
#   The repo stays in the Linux filesystem and the Windows browser opens it through
#   the UNC path from `wslpath -w`, as file://wsl.localhost/<distro>/<path>.
#   Both browsers load classic <script src> files over that path and run async tests,
#   so no copy is needed. Set TAP_TEST_COPY=1 to copy the folder to a Windows temp
#   folder instead, in case a future browser update blocks UNC file access.
#   On plain Linux (CI) it uses google-chrome or chromium from PATH with a normal file:// URL.
#
# --dump-dom with --virtual-time-budget waits for the page's timers to settle, so the
# harness's async tests finish before the DOM is captured. Virtual time jumps ahead
# when the page is idle, so a large budget costs no real time.
#
# Environment: TAP_CHROME, TAP_EDGE (browser paths), TAP_WIN_TEMP (Windows temp folder
# as a /mnt path), TAP_VTIME_BUDGET (ms, default 60000), TAP_TEST_COPY=1, TAP_KEEP_DUMP=1.
# Chrome and the temp folder are found through Windows' %LOCALAPPDATA% when not set.

set -u
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/lib-browser.sh
. "$here/lib-browser.sh"

target="${1:-tests.html}"
which="${2:-both}"
page="${target%%\?*}"
query=""
[ "$page" != "$target" ] && query="?${target#*\?}"

case "$which" in
  chrome|edge) browsers="$which" ;;
  both) browsers="chrome edge" ;;
  *) echo "Usage: $0 [page[?query]] [chrome|edge|both]"; exit 2 ;;
esac

if [ ! -f "$TAP_ROOT/$page" ]; then
  echo "FAIL page not found: $page"
  exit 2
fi

parse_flags=()
case "$query" in *release=1*) parse_flags+=(--release) ;; esac

node_bin="$(command -v node || echo "$HOME/.local/bin/node")"
status=0
for b in $browsers; do
  start=$(date +%s%N)
  dump="$(mktemp)"
  if ! browser_run "$b" "$page" "$query" --dump-dom > "$dump"; then
    echo "[$b] FAIL could not run the browser"
    status=1
    rm -f "$dump"
    continue
  fi
  "$node_bin" "$TAP_ROOT/tools/parse-results.js" --label "$b" "${parse_flags[@]}" "$dump"
  rc=$?
  ms=$(( ($(date +%s%N) - start) / 1000000 ))
  echo "[$b] $page$query took ${ms} ms ($BROWSER_MODE)"
  if [ $rc -ne 0 ]; then
    status=1
    if [ "${TAP_KEEP_DUMP:-0}" = "1" ]; then echo "[$b] page dump kept at $dump"; dump=""; fi
  fi
  # TAP_DUMP_DIR keeps a copy of each page dump (used to record results in the Test Plan)
  if [ -n "$dump" ] && [ -n "${TAP_DUMP_DIR:-}" ]; then mkdir -p "$TAP_DUMP_DIR" && cp "$dump" "$TAP_DUMP_DIR/$b.html"; fi
  [ -n "$dump" ] && rm -f "$dump"
done
exit $status
