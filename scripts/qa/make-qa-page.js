#!/usr/bin/env node
/*
 * File: scripts/qa/make-qa-page.js
 * Purpose: Writes tests/qa.html from index-sample.html: the same stylesheets and app scripts, with the QA hooks
 *          loaded first and the QA checks loaded last. --check exits 1 if tests/qa.html is out of date.
 * Provides: CLI `node scripts/qa/make-qa-page.js [--check] [--from index-sample.html]`
 * Depends on: Node 18+; index-sample.html
 * Used by: scripts/qa/console-check.sh (runs --check first), developers after the page's script list changes
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const fromAt = args.indexOf('--from');
const from = fromAt >= 0 ? args[fromAt + 1] : 'index-sample.html';
const outRel = 'tests/qa.html';

function build(src) {
  const clean = src.replace(/<!--[\s\S]*?-->/g, '');
  const css = [...clean.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+\.css)["']/gi)].map((m) => m[1]);
  const js = [...clean.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const up = (p) => '../' + p.replace(/^\.\//, '');
  const lines = [
    '<!doctype html>',
    '<!--',
    '  File: tests/qa.html',
    '  Purpose: QA page: the app exactly as ' + from + ' loads it, with hooks that record console errors first and',
    '           the QA checks last (text sizes, web requests, the interaction smoke test). Generated: do not edit.',
    '  Provides: the page read by scripts/qa/*.sh; open with ?screenshot=1&view=..&mode=..&qa=console|text|offline|smoke|all',
    '  Depends on: every file ' + from + ' loads; scripts/qa/hooks.js, text-size.js, smoke.js, qa-run.js',
    '  Used by: scripts/qa/console-check.sh, text-size.sh, offline-check.sh, smoke.sh; made by scripts/qa/make-qa-page.js',
    '-->',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>TAP Atlas QA</title>',
    ...css.map((h) => '  <link rel="stylesheet" href="' + up(h) + '">'),
    '  <script src="../scripts/qa/hooks.js"></script>',
    '</head>',
    '<body>',
    '  <div id="app"></div>',
    ...js.map((s) => '  <script src="' + up(s) + '"></script>'),
    '  <script src="../scripts/qa/text-size.js"></script>',
    '  <script src="../scripts/qa/smoke.js"></script>',
    '  <script src="../scripts/qa/qa-run.js"></script>',
    '</body>',
    '</html>',
    ''
  ];
  return lines.join('\n');
}

const want = build(fs.readFileSync(path.join(root, from), 'utf8'));
const outAbs = path.join(root, outRel);
const have = fs.existsSync(outAbs) ? fs.readFileSync(outAbs, 'utf8') : '';
if (check) {
  if (have !== want) {
    console.error('FAIL ' + outRel + ' is out of date with ' + from + ': run node scripts/qa/make-qa-page.js');
    process.exit(1);
  }
  process.stdout.write('PASS ' + outRel + ' matches ' + from + '\n');
} else {
  fs.writeFileSync(outAbs, want);
  process.stdout.write('wrote ' + outRel + '\n');
}
