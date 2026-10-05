#!/usr/bin/env bash
# File: scripts/package.sh
# Purpose: Makes a known-good copy of the app in one step: runs every check, and only if they pass copies the
#          pages, app files, data and docs (no tests, no tools) into dist/tap-atlas-<version>-<date>/.
# Provides: CLI `scripts/package.sh [verify options, e.g. --browser chrome]`; prints the copy's path; exit 1 if
#           the checks fail (no copy is made)
# Depends on: scripts/verify.sh, js/core/namespace.js (TAP.version)
# Used by: the data owner before a demo; docs/HANDOVER.md
# Owner: DOCS3 stream
#
# TAP_VERIFY_CMD replaces scripts/verify.sh and TAP_DIST_DIR replaces dist/; tools/check-docs3.js uses both
# to test this script quickly. Don't set them by hand.

set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root" || exit 2
verify_cmd="${TAP_VERIFY_CMD:-$root/scripts/verify.sh}"
dist="${TAP_DIST_DIR:-$root/dist}"
# What a presenter needs; the data and organization files are copied when this copy of the folder has them.
ITEMS=(index.html index-sample.html README.md LICENSE js css config content vendor data docs)

version="$(sed -n "s/.*TAP\.version = '\([^']*\)'.*/\1/p" js/core/namespace.js | head -n 1)"
if [ -z "$version" ]; then
  echo "FAIL could not read TAP.version from js/core/namespace.js; no copy made"
  exit 1
fi
name="tap-atlas-$version-$(date +%Y-%m-%d)"

echo "Running the checks first ($verify_cmd $*)"
log="$(mktemp)"
trap 'rm -f "$log"' EXIT
if ! $verify_cmd "$@" > "$log" 2>&1; then
  tail -n 20 "$log"
  echo "FAIL the checks did not pass, so no copy was made. Fix what failed, then run this again."
  exit 1
fi

# A second copy on the same day gets -2, -3 ..., so an earlier known-good copy is never overwritten.
target="$dist/$name"
n=2
while [ -e "$target" ]; do
  target="$dist/$name-$n"
  n=$((n + 1))
done

# Copy into a temporary folder first, so a failed copy never looks like a finished one.
mkdir -p "$dist"
partial="$target.partial"
rm -rf "$partial"
mkdir -p "$partial"
for item in "${ITEMS[@]}"; do
  [ -e "$item" ] || continue
  if ! cp -R "$item" "$partial/"; then
    rm -rf "$partial"
    echo "FAIL could not copy $item; no copy made"
    exit 1
  fi
done
mv "$partial" "$target"

echo "Checks passed. Known-good copy: $target"
echo "Open index.html (real data) or index-sample.html (sample data) in that folder to present from it."
