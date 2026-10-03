#!/usr/bin/env bash
# File: scripts/open-pr.sh
# Purpose: Opens a pull request for the current story branch after checking its text against the denylist.
# Provides: CLI `scripts/open-pr.sh <title> <body-file> [--draft]`; prints the pull request URL
# Depends on: scripts/check-text.sh, git, gh (GitHub CLI, logged in)
# Used by: developers and agents when a story branch is ready for review

set -u
here="$(cd "$(dirname "$0")" && pwd)"
title="${1:-}"
body="${2:-}"
draft=()
[ "${3:-}" = "--draft" ] && draft=(--draft)
if [ -z "$title" ] || [ ! -f "$body" ]; then
  echo "Usage: $0 <title> <body-file> [--draft]"
  exit 2
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if ! [[ "$branch" =~ ^(feat|fix|chore|test|docs)/[0-9]+- ]]; then
  echo "Refusing: branch '$branch' is not named <type>/<issue>-<slug> (feat|fix|chore|test|docs)."
  exit 1
fi

git fetch -q origin main || { echo "Could not fetch origin/main"; exit 1; }

# The title, body and every commit message on the branch must be clean.
status=0
printf '%s\n' "$title" | "$here/check-text.sh" - || status=1
"$here/check-text.sh" "$body" || status=1
git log --format='%B' origin/main..HEAD | "$here/check-text.sh" - || status=1
if [ $status -ne 0 ]; then
  echo "Refusing: denylisted text found above. Fix it before opening the pull request."
  exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
cat "$body" > "$tmp"
attribution='🤖 Generated with [Claude Code](https://claude.com/claude-code)'
if ! grep -qF "$attribution" "$tmp"; then
  printf '\n%s\n' "$attribution" >> "$tmp"
fi

git push -q -u origin HEAD || { echo "Push failed"; exit 1; }
gh pr create --base main --title "$title" --body-file "$tmp" "${draft[@]}"
