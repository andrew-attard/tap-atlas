#!/usr/bin/env bash
# File: scripts/portfolio-shots.sh
# Purpose: Takes one screenshot per view of the sample edition at 1440 x 900 for the landing page and case study.
# Provides: CLI `scripts/portfolio-shots.sh [chrome|edge]` writing docs/screenshots/<view>.png;
#           `scripts/portfolio-shots.sh --name <viewId>` prints the file name a view gets
# Depends on: scripts/lib-browser.sh, scripts/screenshot.sh, index-sample.html, Node, Chrome or Edge
# Used by: the project owner before publishing; docs/index.html and docs/CASE-STUDY.md show the images
# Owner: DOCS3 stream
#
# The views are read from the page's own menu, so a view that only shows with some data (Other sections)
# is included exactly when the sample data has it. File names come from the view id alone (newBusiness ->
# new-business.png), so pages that link to them keep working when the set is taken again.

set -u
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/lib-browser.sh
. "$here/lib-browser.sh"
out="$TAP_ROOT/docs/screenshots"
page=index-sample.html
node_bin="$(command -v node || echo "$HOME/.local/bin/node")"

# The stable file name for a view id: camelCase to lower-case words joined by hyphens.
shot_name() {
  echo "$1" | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' | tr '[:upper:]' '[:lower:]' | sed 's/$/.png/'
}

if [ "${1:-}" = "--name" ]; then
  [ -n "${2:-}" ] || { echo "Usage: $0 --name <viewId>"; exit 2; }
  shot_name "$2"
  exit 0
fi

browser="${1:-chrome}"
case "$browser" in chrome|edge) ;; *) echo "Usage: $0 [chrome|edge] | --name <viewId>"; exit 2 ;; esac

# The views in menu order, as the sample edition draws them.
dom="$(mktemp)"
trap 'rm -f "$dom"' EXIT
browser_run "$browser" "$page" "?screenshot=1&view=overview&mode=all" --dump-dom > "$dom"
mapfile -t views < <(grep -o 'class="tap-menu__item[^"]*" data-view="[^"]*"' "$dom" | sed 's/.*data-view="\([^"]*\)"/\1/')
if [ ${#views[@]} -eq 0 ]; then
  echo "FAIL could not read the views from $page"
  exit 1
fi

# The Regions view shows the first region's profile, so the picture has content.
first_region="$("$node_bin" -e '
  const vm = require("vm"); const fs = require("fs");
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(process.argv[1], "utf8"), ctx);
  console.log(((ctx.window.PLAN_DATA || {}).regions || [])[0].id);
' "$TAP_ROOT/data/sample-plan-data.js")"

mkdir -p "$out"
status=0
keep=()
for view in "${views[@]}"; do
  name="$(shot_name "$view")"
  keep+=("$name")
  query="screenshot=1&view=$view&mode=all"
  [ "$view" = "regions" ] && query="$query&region=$first_region"
  "$here/screenshot.sh" "$page" "$query" 1440 900 1 "$out/$name" "$browser" > /dev/null || status=1
  [ -s "$out/$name" ] || { echo "FAIL $view: no screenshot"; status=1; continue; }
done

# A view that no longer shows leaves no stale picture behind.
for f in "$out"/*.png; do
  [ -e "$f" ] || continue
  case " ${keep[*]} " in *" $(basename "$f") "*) ;; *) rm -f "$f"; echo "removed $(basename "$f") (no such view now)" ;; esac
done

echo "wrote ${#keep[@]} screenshots to docs/screenshots: ${keep[*]}"
exit $status
