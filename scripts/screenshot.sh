#!/usr/bin/env bash
# File: scripts/screenshot.sh
# Purpose: Takes headless screenshots of a page at a given size and zoom, singly or as a full matrix.
# Provides: CLI `scripts/screenshot.sh <page> <query> <width> <height> <zoom> <out.png> [chrome|edge]`
#           and `scripts/screenshot.sh --matrix <page> <outdir> [chrome|edge]`
# Depends on: scripts/lib-browser.sh, Chrome or Edge
# Used by: developers and agents checking layouts; the app reads ?screenshot=1&view=&mode=&focus=
#
# Width and height are the browser window in CSS pixels and zoom is the device
# scale factor, so the image is width*zoom by height*zoom pixels. To mimic a
# 1920x1080 screen at 125% Windows scaling, use 1536 864 1.25.

set -u
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/lib-browser.sh
. "$here/lib-browser.sh"

usage() {
  echo "Usage: $0 <page> <query> <width> <height> <zoom> <out.png> [chrome|edge]"
  echo "       $0 --matrix <page> <outdir> [chrome|edge]"
  exit 2
}

abspath() {
  case "$1" in /*) echo "$1" ;; *) echo "$PWD/$1" ;; esac
}

# shot <page> <query> <w> <h> <zoom> <out> <browser>
shot() {
  local page="$1" query="${2#\?}" w="$3" h="$4" zoom="$5" out browser="$7"
  out="$(abspath "$6")"
  mkdir -p "$(dirname "$out")"
  rm -f "$out"
  [ -n "$query" ] && query="?$query"
  browser_run "$browser" "$page" "$query" "--screenshot=$(browser_path_for "$out")" \
    "--window-size=$w,$h" "--force-device-scale-factor=$zoom" --hide-scrollbars > /dev/null
  if [ -s "$out" ]; then
    echo "wrote $out"
  else
    echo "FAIL no screenshot written for $page$query"
    return 1
  fi
}

if [ "${1:-}" = "--matrix" ]; then
  page="${2:-}"
  outdir="${3:-}"
  browser="${4:-chrome}"
  [ -n "$page" ] && [ -n "$outdir" ] || usage
  outdir="$(abspath "$outdir")"
  mkdir -p "$outdir"
  status=0
  sheet="$outdir/index.html"
  {
    echo '<!doctype html><meta charset="utf-8"><title>Screenshot matrix</title>'
    echo '<style>body{font:14px sans-serif;margin:16px}figure{display:inline-block;margin:8px;vertical-align:top}'
    echo 'img{width:360px;border:1px solid #ccc}figcaption{font-size:12px}</style>'
    echo "<h1>$page ($browser)</h1>"
  } > "$sheet"
  # Every view in the menu order of config/views.js, so new views are never left out
  node_bin="$(command -v node || echo "$HOME/.local/bin/node")"
  views="$("$node_bin" -e '
    const vm = require("vm"); const fs = require("fs");
    const ctx = { window: {} }; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(process.argv[1], "utf8"), ctx);
    console.log(((ctx.window.TAP_VIEWS || {}).order || []).join(" "));
  ' "$TAP_ROOT/config/views.js")"
  if [ -z "$views" ]; then echo "No views found in config/views.js"; exit 2; fi
  for view in $views; do
    echo "<h2>$view</h2>" >> "$sheet"
    for size in 1280x800 1920x1080; do
      for zoom in 1.25 1.5; do
        for mode in all set one; do
          name="$view-${size%x*}-$zoom-$mode.png"
          shot "$page" "screenshot=1&view=$view&mode=$mode" "${size%x*}" "${size#*x}" "$zoom" \
            "$outdir/$name" "$browser" || status=1
          echo "<figure><a href=\"$name\"><img src=\"$name\" loading=\"lazy\"></a><figcaption>$size @ $zoom, $mode</figcaption></figure>" >> "$sheet"
        done
      done
    done
  done
  echo "contact sheet: $sheet"
  exit $status
fi

[ $# -ge 6 ] || usage
shot "$1" "$2" "$3" "$4" "$5" "$6" "${7:-chrome}"
