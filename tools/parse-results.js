#!/usr/bin/env node
/*
 * File: tools/parse-results.js
 * Purpose: Reads a headless browser's DOM dump of a test page and reports the results.
 * Provides: CLI `node tools/parse-results.js [--release] [--label name] [file]` (reads stdin when no file)
 * Depends on: Node 18+ only; the <pre id="t-json"> block written by tests/harness.js
 * Used by: scripts/test-headless.sh
 */
'use strict';

const fs = require('fs');

const args = process.argv.slice(2);
const release = args.includes('--release');
const labelAt = args.indexOf('--label');
const label = labelAt !== -1 ? args[labelAt + 1] : '';
const file = args.filter((a, i) => !a.startsWith('--') && i !== labelAt + 1)[0];

function fail(msg) {
  console.log((label ? '[' + label + '] ' : '') + 'FAIL ' + msg);
  process.exit(1);
}

function unescapeHtml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function indent(text) {
  return String(text).split('\n').map((l) => '      ' + l).join('\n');
}

const dump = file ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8');
const m = /<pre\b[^>]*\bid="t-json"[^>]*>([\s\S]*?)<\/pre>/.exec(dump);
if (!m) fail('no results block (<pre id="t-json">) in the page dump: the run did not finish or the page did not load');

let res;
try {
  res = JSON.parse(unescapeHtml(m[1]));
} catch (e) {
  fail('results block is not valid JSON: ' + e.message);
}
if (!res || res.done !== true) fail('results block says the run did not finish (done is not true)');

const rows = res.results || [];
const failures = rows.filter((r) => r.status === 'fail');
const pendingRows = rows.filter((r) => r.status === 'pending');
const prefix = label ? '[' + label + '] ' : '';

for (const r of failures) {
  console.log(prefix + 'FAIL  ' + r.id + '  ' + r.title + (r.suite ? '  [' + r.suite + ']' : ''));
  console.log('    message:  ' + r.message);
  console.log('    expected:\n' + indent(r.expected));
  console.log('    found:\n' + indent(r.found));
}
const skips = rows.filter((r) => r.status === 'skip');
if (skips.length) console.log(prefix + 'skipped: ' + skips.map((r) => r.id).join(', '));
if (pendingRows.length) {
  const ids = pendingRows.map((r) => r.id);
  console.log(prefix + 'pending (' + ids.length + '): ' + ids.slice(0, 20).join(', ') + (ids.length > 20 ? ', ...' : ''));
}

const ran = res.passed + res.failed;
const ok = res.failed === 0 && !(release && res.pending > 0);
console.log(prefix + (ok ? 'PASS ' : 'FAIL ') + (ok ? res.passed : res.failed) + '/' + ran +
  '  (' + res.passed + ' passed, ' + res.failed + ' failed, ' + res.skipped + ' skipped, ' +
  res.pending + ' pending' + (res.release ? ', release mode' : '') + ')');
if (release && !res.release) console.log(prefix + 'note: --release given but the page did not run in release mode');
process.exit(ok ? 0 : 1);
