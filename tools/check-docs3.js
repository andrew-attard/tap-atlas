#!/usr/bin/env node
/*
 * File: tools/check-docs3.js
 * Purpose: File checks for the handover pack and the portfolio edition, which the browser test page can't make:
 *          the sample edition works from a web host (relative paths, exact file names, nothing tied to file://),
 *          the README's file guide against the folder, the Data Contract's fields and change history, the known-good copy made by scripts/package.sh, the handover guide's parts and its place in the README, the landing page's links, the case study's parts, and the portfolio screenshots (one per view, 1440 x 900, stable names that the pages link to).
 * Provides: CLI `node tools/check-docs3.js [--root dir]`; exit 1 if any check finds a problem; module.exports
 * Depends on: Node 18+; tools/check-docs3-files.js (the screenshot and package checks), tools/check-docs4.js (Phase 4)
 * Used by: scripts/verify.sh ("handover and portfolio" step), CI; tests/test-docs3.js lists these cases as skipped
 * Owner: DOCS3 stream
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
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

// The .gitignore patterns as tests on a path: a name without "/" matches in any folder, one with "/" from the
// top, a trailing "/" a whole folder. Enough for this repository's file (no "!" lines).
function ignoreTests(root) {
  const file = path.join(root, '.gitignore');
  if (!fs.existsSync(file)) return [];
  const glob = (g) => g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('!')).map((l) => {
      const dir = l.endsWith('/');
      const pat = l.replace(/^\//, '').replace(/\/$/, '');
      const re = pat.indexOf('/') >= 0 ? new RegExp('^' + glob(pat) + (dir ? '/' : '(/|$)'))
        : new RegExp('(^|/)' + glob(pat) + (dir ? '/' : '(/|$)'));
      return (f) => re.test(f);
    });
}

// The shipped files: what git tracks in a git work tree; elsewhere (the internal copy, which holds the real
// data file and other ignored files) every file under the shipped folders that .gitignore doesn't match.
function shippedFiles(root) {
  const inShipped = (f) => SHIPPED.some((s) => f === s || f.startsWith(s + '/'));
  const git = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
  if (git.status === 0 && spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).stdout.trim() ===
      fs.realpathSync(root)) {
    return git.stdout.split('\0').filter((f) => f && inShipped(f) && fs.existsSync(path.join(root, f))).sort();
  }
  const ignored = ignoreTests(root);
  const out = [];
  (function walk(rel) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) fs.readdirSync(abs).sort().forEach((n) => { if (!n.startsWith('.')) walk(rel ? rel + '/' + n : n); });
    else if (!ignored.some((t) => t(rel))) out.push(rel);
  })('');
  return out.filter(inShipped);
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

/* ---------- US-3.4.4: the case study ---------- */

const CASE_STUDY = 'docs/CASE-STUDY.md';
const CASE_PARTS = [/^## .*brief/im, /^## .*constraints/im, /^## .*decisions/im, /^## .*(delivery|method)/im,
  /^## .*phase/im, /no server/i, /shared screen/i, /data boundary/i];

function checkCaseStudy(root) {
  const file = path.join(root, CASE_STUDY);
  if (!fs.existsSync(file)) return { problems: [CASE_STUDY + ' is missing'], checked: 0 };
  const text = fs.readFileSync(file, 'utf8');
  const problems = CASE_PARTS.filter((re) => !re.test(text)).map((re) => CASE_STUDY + ': nothing matches ' + re);
  const decisions = new Set(text.match(/\bD\d{1,3}\b/g) || []);
  if (decisions.size < 10) problems.push(CASE_STUDY + ': names ' + decisions.size + ' decisions by number, expected at least 10');
  // The landing page links to it, so a visitor can read it.
  const landing = path.join(root, 'docs/index.html');
  if (fs.existsSync(landing) && htmlRefs(fs.readFileSync(landing, 'utf8')).indexOf('case-study.html') < 0) {
    problems.push('docs/index.html does not link to case-study.html');
  }
  // The web page edition is generated from the .md and must be current, with links that work on a web host.
  const page = 'docs/case-study.html';
  if (!fs.existsSync(path.join(root, page))) problems.push(page + ' is missing: run node tools/build-case-study.js');
  else {
    if (require('./build-case-study.js').build(root) !== fs.readFileSync(path.join(root, page), 'utf8')) {
      problems.push(page + ' is out of date with ' + CASE_STUDY + ': run node tools/build-case-study.js');
    }
    htmlRefs(fs.readFileSync(path.join(root, page), 'utf8')).forEach((ref) => {
      const p = refProblem(root, page, ref);
      if (p) problems.push(p);
    });
  }
  return { problems, checked: CASE_PARTS.length + 3 };
}

const CHECKS = [
  { id: 'TPV-TC-621', label: 'sample edition: relative paths, exact names, nothing tied to file://', run: checkWeb },
  { id: 'TPV-TC-602', label: 'README file guide lists every shipped file (paths named are checked by check-docs.js)', run: checkReadmeFiles },
  { id: 'X-docs3-handover', label: 'handover guide: its parts, the import brief, and first in the README', run: checkHandover },
  { id: 'TPV-TC-598', label: 'every field the contract check reads is named in docs/DATA-CONTRACT.md', run: files.checkContractFields },
  { id: 'X-docs3-contract-history', label: 'docs/DATA-CONTRACT.md has a "Changes" section with each version and phase', run: checkContractHistory },
  { id: 'TPV-TC-606', label: 'package.sh: refuses on a failed verify, else one dated copy without tests or tools (606, 607, 609, 610, 611)', run: (root) => files.checkPackage(root, HANDOVER) },
  { id: 'X-docs3-case-study', label: 'case study: its parts, its web page current, linked from the landing page', run: checkCaseStudy },
  { id: 'TPV-TC-615', label: 'landing page: relative links to files that exist, 3 or 4 screenshots, the sample button', run: checkLanding },
  { id: 'TPV-TC-627', label: 'one 1440 x 900 screenshot per view in docs/screenshots', run: files.checkShots },
  { id: 'TPV-TC-628', label: 'screenshot names are stable and every page names an existing one', run: files.checkShotNames }
];
CHECKS.push(...require('./check-docs4.js').CHECKS);   // the Phase 4 handover checks (US-4.6.4, PAGES4)

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

