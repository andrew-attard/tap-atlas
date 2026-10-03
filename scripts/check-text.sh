#!/usr/bin/env bash
# File: scripts/check-text.sh
# Purpose: Checks text against the private denylist so organization terms never reach this public repo.
# Provides: CLI `scripts/check-text.sh <file>...` or `scripts/check-text.sh -` (stdin); exit 1 on any hit
# Depends on: grep; the denylist at $TAP_ATLAS_DENYLIST or ~/.config/tap-atlas/denylist.txt
# Used by: scripts/verify.sh, scripts/open-pr.sh
#
# Same matching as the pre-commit hook: whole words, any case, fixed strings.
# In CI (CI=true) the terms are never printed, and a missing denylist is skipped
# with a notice, because the list only exists on the maintainer's machine.

set -u
denylist="${TAP_ATLAS_DENYLIST:-$HOME/.config/tap-atlas/denylist.txt}"
in_ci=0
[ "${CI:-}" = "true" ] && in_ci=1

if [ $# -eq 0 ]; then
  echo "Usage: $0 <file>... | -"
  exit 2
fi

if [ ! -f "$denylist" ]; then
  if [ $in_ci -eq 1 ]; then
    echo "notice: no denylist in CI, text scan skipped"
    exit 0
  fi
  echo "FAIL denylist not found at $denylist"
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
grep -v -e '^[[:space:]]*$' -e '^#' "$denylist" > "$tmp/terms" || true
[ -s "$tmp/terms" ] || exit 0

files=()
for f in "$@"; do
  if [ "$f" = "-" ]; then
    cat > "$tmp/stdin"
    files+=("$tmp/stdin")
  elif [ -f "$f" ]; then
    files+=("$f")
  fi
done
[ ${#files[@]} -eq 0 ] && exit 0

# One grep for all files and terms; -I skips binary files.
hits="$(grep -HnoiwIF -f "$tmp/terms" -- "${files[@]}" 2> /dev/null)"
[ -z "$hits" ] && exit 0

printf '%s\n' "$hits" | while IFS= read -r hit; do
  file="${hit%%:*}"
  rest="${hit#*:}"
  line="${rest%%:*}"
  term="${rest#*:}"
  shown="$file"
  [ "$file" = "$tmp/stdin" ] && shown="(stdin)"
  if [ $in_ci -eq 1 ]; then
    echo "$shown:$line: contains a denylisted term (hidden in CI)"
  else
    echo "$shown:$line: denylisted term \"$term\""
    sed -n "${line}p" "$file" | cut -c1-200 | sed 's/^/    /'
  fi
done
exit 1
