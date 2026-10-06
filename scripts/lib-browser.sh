#!/usr/bin/env bash
# File: scripts/lib-browser.sh
# Purpose: Shared helpers to find a browser, build the page's file:// URL and run it headless.
# Provides: TAP_ROOT, BROWSER_MODE, browser_run, browser_path_for, browser_find
# Depends on: wslpath and Windows Chrome/Edge under WSL, or google-chrome/chromium on Linux
# Used by: scripts/test-headless.sh, scripts/screenshot.sh (sourced, not run directly)

TAP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BROWSER_MODE=""

# The Windows user's AppData\Local as a /mnt path, asked from Windows so no
# user name is written into the repo. Empty when not under WSL.
win_local_appdata() {
  local cmd p
  cmd="$(command -v cmd.exe || echo /mnt/c/Windows/System32/cmd.exe)"
  [ -x "$cmd" ] || return 0
  p="$(cd /mnt/c && "$cmd" /d /c 'echo %LOCALAPPDATA%' 2> /dev/null | tr -d '\r')"
  case "$p" in ''|%*) return 0 ;; esac
  wslpath -u "$p"
}

if [ -d /mnt/c ] && command -v wslpath > /dev/null 2>&1; then
  if [ -z "${TAP_CHROME:-}" ] || [ -z "${TAP_WIN_TEMP:-}" ]; then
    _lad="$(win_local_appdata)"
  fi
  if [ -z "${TAP_CHROME:-}" ]; then
    for _c in "${_lad:-/nonexistent}/Google/Chrome/Application/chrome.exe" \
      "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" \
      "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"; do
      if [ -x "$_c" ]; then TAP_CHROME="$_c"; break; fi
    done
  fi
  TAP_WIN_TEMP="${TAP_WIN_TEMP:-${_lad:+$_lad/Temp}}"
fi
TAP_CHROME="${TAP_CHROME:-}"
TAP_EDGE="${TAP_EDGE:-/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
TAP_WIN_TEMP="${TAP_WIN_TEMP:-}"

# Windows mode when running under WSL with the Windows browsers present.
browser_windows() {
  [ -d /mnt/c ] && command -v wslpath > /dev/null 2>&1 && [ -d "$TAP_WIN_TEMP" ]
}

# Prints the browser executable for chrome|edge, or nothing if none is found.
browser_find() {
  if browser_windows; then
    case "$1" in
      chrome) [ -x "$TAP_CHROME" ] && echo "$TAP_CHROME" ;;
      edge) [ -x "$TAP_EDGE" ] && echo "$TAP_EDGE" ;;
    esac
    return 0
  fi
  local names
  case "$1" in
    chrome) names="google-chrome google-chrome-stable chromium chromium-browser" ;;
    edge) names="microsoft-edge microsoft-edge-stable" ;;
  esac
  for n in $names; do
    if command -v "$n" > /dev/null 2>&1; then command -v "$n"; return 0; fi
  done
}

# A Linux path as the browser should see it (UNC form under WSL).
browser_path_for() {
  if browser_windows; then wslpath -w "$1"; else echo "$1"; fi
}

# Turns a native path into a file:// URL.
file_url() {
  local p="$1"
  if browser_windows; then
    p="${p//\\//}"
    case "$p" in
      //*) echo "file:$p" ;;       # \\wsl.localhost\Distro\... -> file://wsl.localhost/Distro/...
      *) echo "file:///$p" ;;      # C:\... -> file:///C:/...
    esac
  else
    echo "file://$p"
  fi
}

# browser_run <chrome|edge> <page> <query> <extra flags...>
# Runs the page headless with a throwaway profile and prints the browser's stdout.
browser_run() {
  local which="$1" page="$2" query="$3"
  shift 3
  local exe base profile url rc copy=""
  exe="$(browser_find "$which")"
  if [ -z "$exe" ]; then
    echo "No $which browser found" >&2
    return 1
  fi
  base="$TAP_ROOT"
  if browser_windows; then
    profile="$TAP_WIN_TEMP/tap-atlas-profile-$$-$RANDOM"
    BROWSER_MODE="windows $which, UNC file path"
    if [ "${TAP_TEST_COPY:-0}" = "1" ]; then
      copy="$TAP_WIN_TEMP/tap-atlas-test-$$-$RANDOM"
      mkdir -p "$copy"
      tar -C "$TAP_ROOT" --exclude=.git --exclude=node_modules -cf - . | tar -C "$copy" -xf -
      base="$copy"
      BROWSER_MODE="windows $which, copied to Windows temp"
    fi
  else
    profile="$(mktemp -d)"
    BROWSER_MODE="linux $which"
  fi
  mkdir -p "$profile"
  url="$(file_url "$(browser_path_for "$base/$page")")$query"

  # --disable-ipc-flooding-protection: Chrome otherwise caps address-bar changes (about 200 in ten seconds), and a
  # long test page that switches views many times starves the later routing tests of their hashchange.
  local flags=(--headless=new --disable-gpu --no-first-run --no-default-browser-check
    --disable-extensions --allow-file-access-from-files --disable-ipc-flooding-protection
    "--user-data-dir=$(browser_path_for "$profile")"
    "--virtual-time-budget=${TAP_VTIME_BUDGET:-60000}")
  # GitHub's Ubuntu runners block Chrome's user-namespace sandbox.
  [ "${CI:-}" = "true" ] && ! browser_windows && flags+=(--no-sandbox)

  timeout "${TAP_BROWSER_TIMEOUT:-180}" "$exe" "${flags[@]}" "$@" "$url" 2> /dev/null
  rc=$?
  # The browser can hold profile files for a moment after it exits.
  for _ in 1 2 3 4 5; do
    rm -rf "$profile" 2> /dev/null && [ ! -e "$profile" ] && break
    sleep 1
  done
  [ -n "$copy" ] && rm -rf "$copy"
  return $rc
}
