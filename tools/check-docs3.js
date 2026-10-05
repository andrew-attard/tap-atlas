#!/usr/bin/env node
/*
 * File: tools/check-docs3.js
 * Purpose: File checks for the handover pack and the portfolio edition, which the browser test page can't make:
 *          the sample edition works from a web host (relative paths, exact file names, nothing tied to file://).
 * Provides: CLI `node tools/check-docs3.js [--root dir]`; exit 1 if any check finds a problem; module.exports
 * Depends on: Node 18+ only
 * Used by: scripts/verify.sh ("handover and portfolio" step), CI; tests/test-docs3.js lists these cases as skipped
 * Owner: DOCS3 stream
 */
'use strict';

const fs = require('fs');
const path = require('path');

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

const CHECKS = [
  { id: 'TPV-TC-621', label: 'sample edition: relative paths, exact names, nothing tied to file://', run: checkWeb }
];

function runAll(root) {
  return CHECKS.map((c) => Object.assign({ id: c.id, label: c.label }, c.run(root)));
}

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

module.exports = { runAll, existsExact, isRelative, htmlRefs, refProblem, codeLines };
