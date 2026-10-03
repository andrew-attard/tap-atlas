#!/usr/bin/env bash
# File: scripts/qa/offline-check.sh
# Purpose: Proves the app makes no web requests (US-1.9.3): no web address in the shipped code, and every view
#          drawn in full with networking cut off, ECharts and the Archivo fonts loaded from the folder.
# Provides: CLI `scripts/qa/offline-check.sh [chrome|edge|both] [outdir]`; exit 1 on any web request or failed load
# Depends on: scripts/qa/lib-qa.sh, scripts/qa/url-scan.js, scripts/qa/qa-report.js, scripts/screenshot.sh, tests/qa.html
# Used by: scripts/qa/run-all.sh, the project owner before each demo
#
# Networking is cut off by resolving every host name to nothing and sending any request
# to a proxy that does not exist. A request the page tries then fails, and shows up as a
# failed load (QA hooks), a non-file address (resource timing) or a net:: error in the log.

set -u
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/qa/lib-qa.sh
. "$here/lib-qa.sh"

browsers="$(qa_browsers "${1:-both}")" || exit 2
out="${2:-/tmp/tap-qa/offline}"
mkdir -p "$out"
status=0
OFF=(--host-resolver-rules="MAP * ~NOTFOUND" --proxy-server="http://127.0.0.1:9" --proxy-bypass-list="<-loopback>"
  --disable-background-networking --disable-component-update --no-pings --disable-domain-reliability --disable-sync)

echo "== web addresses in the shipped files"
"$QA_NODE" "$here/url-scan.js" || status=1

echo "== fonts and ECharts come from the folder"
if grep -qE "url\(['\"]?\.\./vendor/fonts/archivo-[0-9]+\.woff2" "$TAP_ROOT/css/base.css"; then
  echo "PASS  css/base.css loads Archivo from vendor/fonts"
else
  echo "ERROR css/base.css does not load Archivo from vendor/fonts"; status=1
fi
for f in "$TAP_ROOT"/vendor/fonts/archivo-*.woff2 "$TAP_ROOT/vendor/echarts.min.js"; do
  [ -s "$f" ] || { echo "ERROR missing $f"; status=1; }
done

for b in $browsers; do
  echo "== $b with networking off"
  for view in $QA_VIEWS; do
    base="$out/$b-$view"
    qa_run "$b" tests/qa.html "?screenshot=1&view=$view&mode=all&qa=offline,console" "$base.html" "$base.log" \
      --window-size=1280,800 "${OFF[@]}" || echo "ERROR  [$b $view] browser did not finish"
    "$QA_NODE" "$here/qa-report.js" offline "$b $view offline" "$base.html" "$base.log" --json "$base.json" || status=1
    # Only the page's own console lines count; the browser's services (sync, updates) also fail offline
    if grep 'CONSOLE' "$base.log" | grep -E 'net::ERR_' | grep -q .; then
      echo "ERROR  [$b $view] the page logged a failed network request:"
      grep 'CONSOLE' "$base.log" | grep -E 'net::ERR_' | head -5
      status=1
    fi
  done
  # The page itself, offline, as a picture for the record
  browser_run "$b" index-sample.html "?screenshot=1&view=overview&mode=all" \
    "--screenshot=$(browser_path_for "$out/$b-offline-overview.png")" --window-size=1280,800 \
    --force-device-scale-factor=1.25 --hide-scrollbars "${OFF[@]}" > /dev/null
  [ -s "$out/$b-offline-overview.png" ] && echo "shot   $out/$b-offline-overview.png"
done

if [ $status -eq 0 ]; then echo "PASS offline: no web requests, everything loads from the folder"; else echo "FAIL offline: see the lines above"; fi
exit $status
