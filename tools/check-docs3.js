#!/usr/bin/env node
/*
 * File: tools/check-docs3.js
 * Purpose: File checks for the handover pack and the portfolio edition, which the browser test page can't make:
 *          the sample edition works from a web host (relative paths, exact file names, nothing tied to file://),
 *          the README's file guide against the folder, the Data Contract's fields and change history, the known-good copy made by scripts/package.sh, the handover guide's parts and its place in the README, the landing page's links, and the portfolio screenshots (one per view, 1440 x 900, stable names that the pages link to).
 * Provides: CLI `node tools/check-docs3.js [--root dir]`; exit 1 if any check finds a problem; module.exports
 * Depends on: Node 18+; tools/check-docs3-files.js (the screenshot and package checks)
 * Used by: scripts/verify.sh ("handover and portfolio" step), CI; tests/test-docs3.js lists these cases as skipped
 * Owner: DOCS3 stream
 */
'use strict';

const fs = require('fs');
const path = require('path');
const files = require('./check-docs3-files.js');

function rootDir() {
  const i = process.argv.indexOf('--root');
  return i > 0 ? path.resolve(process.argv[i + 1]) : path.join(__dirname, '..');
}

// True when the file exists with exactly this spelling. Windows doesn't mind the case of a name; a web host does.
function existsExact(root, rel) {
  let dir = root;
  for (const part of rel.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') { dir = path.dirname(dir); continue; }
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
    if (fs.readdirSync(dir).indexOf(part) < 0) return false;
    dir = path.join(dir, part);
  }
  return true;
}

// A path a web host serves from the same site: no scheme, no leading slash, no drive letter.
function isRelative(ref) {
  return !/^[a-z][a-z0-9+.-]*:/i.test(ref) && !/^[\\/]/.test(ref);
}

// The src and href values of an HTML file, comments left out.
function htmlRefs(src) {
  const body = src.replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  const re = /\s(?:src|href)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(body))) out.push(m[1]);
  return out;
}

// Checks one reference found in `from` (a path relative to the root); returns a problem or null.
function refProblem(root, from, ref) {
  if (/^(data:|#)/.test(ref) || ref === '') return null;
  const clean = ref.split(/[?#]/)[0];
  if (!isRelative(clean)) return from + ': "' + ref + '" is not a relative path';
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(from), clean));
  if (target.startsWith('..')) return from + ': "' + ref + '" points outside the folder';
  if (!existsExact(root, target)) return from + ': "' + ref + '" does not exist with that exact name';
  return null;
}

// Code lines with comments left out (our own files only: header blocks, // lines and trailing // comments).
function codeLines(src) {
  let inBlock = false;
  return src.split(/\r?\n/).map((line, i) => {
    let text = line;
    if (inBlock) {
      const end = text.indexOf('*/');
      if (end < 0) return { n: i + 1, text: '' };
      text = text.slice(end + 2);
      inBlock = false;
    }
    const t = text.trim();
    if (t.startsWith('//')) return { n: i + 1, text: '' };
    if (t.startsWith('/*')) {
      if (t.indexOf('*/') < 0) inBlock = true;
      return { n: i + 1, text: '' };
    }
    return { n: i + 1, text: text.replace(/\s\/\/\s.*$/, '') };
  });
}

/* ---------- TPV-TC-621: the sample edition works from a web host ---------- */

function checkWeb(root) {
  const problems = [];
  const page = 'index-sample.html';
  if (!fs.existsSync(path.join(root, page))) return { problems: [page + ' is missing'], checked: 0 };
  const refs = htmlRefs(fs.readFileSync(path.join(root, page), 'utf8'));
  let checked = 0;
  refs.forEach((ref) => {
    checked++;
    const p = refProblem(root, page, ref);
    if (p) problems.push(p);
  });
  // The public edition never loads the organization layer or the real data file (TPV-TC-623, file side).
  refs.filter((r) => /(^|\/)organization\.js$/.test(r) || r === 'data/plan-data.js')
    .forEach((r) => problems.push(page + ': loads "' + r + '", which belongs to the internal edition only'));
  if (refs.indexOf('data/sample-plan-data.js') < 0) problems.push(page + ': does not load data/sample-plan-data.js');

  refs.filter((r) => /\.css$/.test(r) && isRelative(r) && existsExact(root, r)).forEach((css) => {
    const src = fs.readFileSync(path.join(root, css), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
    let m;
    while ((m = re.exec(src))) {
      checked++;
      const p = refProblem(root, css, m[1].trim());
      if (p) problems.push(p);
    }
  });

  // Nothing in our own scripts may test for, or build, a file:// address or an absolute folder path.
  const tied = /file:\/\/|location\.protocol|['"`]file:|['"`]\/(js|css|config|content|data|vendor|docs)\//;
  refs.filter((r) => /\.js$/.test(r) && !/^vendor\//.test(r) && isRelative(r) && existsExact(root, r)).forEach((js) => {
    checked++;
    codeLines(fs.readFileSync(path.join(root, js), 'utf8')).forEach((l) => {
      if (tied.test(l.text)) problems.push(js + ':' + l.n + ': depends on file:// or an absolute path: ' + l.text.trim());
    });
  });
  return { problems, checked };
}


/* ---------- TPV-TC-615: the landing page links only to files of the site ---------- */

function checkLanding(root) {
  const page = 'docs/index.html';
  if (!fs.existsSync(path.join(root, page))) return { problems: [page + ' is missing'], checked: 0 };
  const refs = htmlRefs(fs.readFileSync(path.join(root, page), 'utf8'));
  const problems = [];
  refs.forEach((ref) => {
    const p = refProblem(root, page, ref);
    if (p) problems.push(p);
  });
  if (refs.indexOf('../index-sample.html') < 0) problems.push(page + ': has no link to ../index-sample.html');
  const shots = new Set(refs.filter((r) => /^screenshots\/[^/]+\.png$/.test(r)));
  if (shots.size < 3 || shots.size > 4) problems.push(page + ': shows ' + shots.size + ' screenshots, expected 3 or 4');
  return { problems, checked: refs.length };
}

/* ---------- US-3.3.1: the handover guide, linked first from the README ---------- */

const HANDOVER = 'docs/HANDOVER.md';
const HANDOVER_PARTS = [/^## .*two editions/im, /^## .*refresh/im, /^## .*checks/im, /^## .*which document/im,
  /^## .*known limits/im, /account names/i, /partner maturity/i, /weights/i];

function checkHandover(root) {
  const problems = [];
  const file = path.join(root, HANDOVER);
  if (!fs.existsSync(file)) return { problems: [HANDOVER + ' is missing'], checked: 0 };
  const text = fs.readFileSync(file, 'utf8');
  HANDOVER_PARTS.forEach((re) => { if (!re.test(text)) problems.push(HANDOVER + ': nothing matches ' + re); });
  if (!/docs\/IMPORT-BRIEF\.md/.test(text)) problems.push(HANDOVER + ': the refresh steps do not point to docs/IMPORT-BRIEF.md');
  // The first document the README links to or names is the handover guide.
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const first = /(?:\]\(|`)((?:docs\/)?[A-Z][A-Z-]*\.md)/.exec(readme);
  if (!first || first[1] !== HANDOVER) problems.push('README.md: the first document it links to is ' + (first ? first[1] : 'none') + ', not ' + HANDOVER);
  return { problems, checked: HANDOVER_PARTS.length + 2 };
}

/* ---------- TPV-TC-602: the README's file guide lists every shipped file ---------- */

const SHIPPED = ['index.html', 'index-sample.html', 'js', 'css', 'config', 'content', 'data', 'vendor', 'docs'];

// Files under the shipped folders, ignoring what .gitignore keeps out (the real data and organization files).
function shippedFiles(root) {
  const ignored = new Set(['data/plan-data.js', 'content/organization.js']);
  const out = [];
  (function walk(rel) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) fs.readdirSync(abs).sort().forEach((n) => { if (!n.startsWith('.')) walk(rel + '/' + n); });
    else if (!ignored.has(rel)) out.push(rel);
  })('.');
  return out.map((f) => f.replace(/^\.\//, '')).filter((f) => SHIPPED.some((s) => f === s || f.startsWith(s + '/')));
}

// True when a README path names the file: the same path, a folder it sits in, or a pattern with "*" in one level.
function covers(named, file) {
  if (named.endsWith('/')) return file.startsWith(named);
  if (named.indexOf('*') < 0) return named === file;
  const re = new RegExp('^' + named.replace(/[.+^${}()[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$');
  return re.test(file);
}

function checkReadmeFiles(root) {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  // Only the file guide: from "What each file does" to the next level-2 heading.
  const guide = (/^## What each file does[\s\S]*?(?=^## )/m.exec(readme) || [''])[0];
  // A file counts as listed when the first cell of a table row names it, so each has a line saying its job.
  const firstCells = guide.split(/\r?\n/).filter((l) => /^\|/.test(l)).map((l) => l.split('|')[1] || '');
  const named = [];
  firstCells.forEach((c) => (c.match(/`[^`]+`/g) || []).forEach((m) => named.push(m.slice(1, -1).trim())));
  const files = shippedFiles(root);
  const problems = files.filter((f) => !named.some((n) => covers(n, f)))
    .map((f) => 'README.md file guide: ' + f + ' is not listed');
  return { problems, checked: files.length };
}

/* ---------- US-3.3.2: the Data Contract's change history ---------- */

function checkContractHistory(root) {
  const text = fs.readFileSync(path.join(root, 'docs/DATA-CONTRACT.md'), 'utf8');
  const part = (/^## Changes\s*$[\s\S]*?(?=^## |(?![\s\S]))/m.exec(text) || [''])[0];
  if (!part) return { problems: ['docs/DATA-CONTRACT.md has no "## Changes" section'], checked: 0 };
  const want = [/0\.1/, /0\.2/, /Phase 1/, /Phase 2/, /Phase 3/, /extraSections/];
  const problems = want.filter((re) => !re.test(part)).map((re) => 'docs/DATA-CONTRACT.md "Changes": nothing matches ' + re);
  return { problems, checked: want.length };
}

const CHECKS = [
  { id: 'TPV-TC-621', label: 'sample edition: relative paths, exact names, nothing tied to file://', run: checkWeb },
  { id: 'TPV-TC-602', label: 'README file guide lists every shipped file (paths named are checked by check-docs.js)', run: checkReadmeFiles },
  { id: 'X-docs3-handover', label: 'handover guide: its parts, the import brief, and first in the README', run: checkHandover },
  { id: 'TPV-TC-598', label: 'every field the contract check reads is named in docs/DATA-CONTRACT.md', run: files.checkContractFields },
  { id: 'X-docs3-contract-history', label: 'docs/DATA-CONTRACT.md has a "Changes" section with each version and phase', run: checkContractHistory },
  { id: 'TPV-TC-606', label: 'package.sh: refuses on a failed verify, else one dated copy without tests or tools (606, 607, 609, 610, 611)', run: (root) => files.checkPackage(root, HANDOVER) },
  { id: 'TPV-TC-615', label: 'landing page: relative links to files that exist, 3 or 4 screenshots, the sample button', run: checkLanding },
  { id: 'TPV-TC-627', label: 'one 1440 x 900 screenshot per view in docs/screenshots', run: files.checkShots },
  { id: 'TPV-TC-628', label: 'screenshot names are stable and every page names an existing one', run: files.checkShotNames }
];

function runAll(root) {
  return CHECKS.map((c) => Object.assign({ id: c.id, label: c.label }, c.run(root)));
}

// Set before the run below, so the files checks can read the helpers at call time.
module.exports = { runAll, existsExact, isRelative, htmlRefs, refProblem, codeLines };

if (require.main === module) {
  const results = runAll(rootDir());
  let failed = 0;
  results.forEach((r) => {
    if (r.problems.length) {
      failed++;
      process.stdout.write('FAIL  ' + r.id + '  ' + r.label + '\n' + r.problems.map((p) => '      ' + p).join('\n') + '\n');
    } else {
      process.stdout.write('PASS  ' + r.id + '  ' + r.label + ' (' + r.checked + ' checked)\n');
    }
  });
  process.stdout.write('check-docs3: ' + (results.length - failed) + ' of ' + results.length + ' checks pass\n');
  process.exit(failed ? 1 : 0);
}

