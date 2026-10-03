#!/usr/bin/env node
/*
 * File: tools/check-docs.js
 * Purpose: Checks that every repository path the docs name really exists (TPV-TC-204), so the README's file
 *          tables and the Copilot prompts never send anyone to a file that was moved or renamed.
 * Provides: CLI `node tools/check-docs.js [--root dir]`; exit 1 if a named path is missing
 * Depends on: Node 18+ only; reads README.md, docs/*.md and .gitignore
 * Used by: scripts/verify.sh ("docs paths" step)
 *
 * What counts as a path: text in `backticks` that starts with a top-level folder of this repository (js/,
 * config/, docs/ ...) or is a top-level file (README.md, index.html ...). The whole of README.md and docs/*.md
 * is read. Accepted without a file on disk:
 *   - paths that .gitignore keeps out of the repository (the real data file, the organization file);
 *   - placeholders in <angle brackets>, e.g. content/text-<area>.js, and lists written with "|".
 * A "*" matches any run of characters within one folder level; at least one file must match.
 * A query or anchor (tests.html?suite=theme, README.md#data) is dropped before checking.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOTS = ['js/', 'config/', 'content/', 'css/', 'data/', 'docs/', 'tests/', 'tools/', 'scripts/', 'vendor/',
  '.github/', '.githooks/'];
const ROOT_FILES = ['README.md', 'CONTRIBUTING.md', 'LICENSE', 'index.html', 'index-sample.html', 'tests.html'];

function args() {
  const i = process.argv.indexOf('--root');
  return { root: i > 0 ? path.resolve(process.argv[i + 1]) : path.join(__dirname, '..') };
}

// The plain-line entries of .gitignore that name one file, e.g. data/plan-data.js.
function ignoredFiles(root) {
  const file = path.join(root, '.gitignore');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !/[*!]/.test(l) && !l.endsWith('/'));
}

function isCandidate(p) {
  return ROOT_FILES.indexOf(p) >= 0 || ROOTS.some((r) => p.startsWith(r));
}

// True when a path with "*" matches at least one file or folder.
function globExists(root, p) {
  const parts = p.replace(/\/$/, '').split('/');
  let found = [''];
  for (const part of parts) {
    const re = new RegExp('^' + part.replace(/[.+^${}()[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$');
    const next = [];
    for (const dir of found) {
      const abs = path.join(root, dir);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) continue;
      for (const name of fs.readdirSync(abs)) if (re.test(name)) next.push(dir ? dir + '/' + name : name);
    }
    found = next;
  }
  return found.length > 0;
}

function check(root) {
  const ignored = ignoredFiles(root);
  const docs = ['README.md'].concat(fs.readdirSync(path.join(root, 'docs'))
    .filter((f) => f.endsWith('.md')).sort().map((f) => 'docs/' + f));
  const missing = [];
  let checked = 0;
  for (const doc of docs) {
    const lines = fs.readFileSync(path.join(root, doc), 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const spans = line.match(/`[^`\n]+`/g) || [];
      for (const span of spans) {
        const p = span.slice(1, -1).trim().split(/[?#]/)[0];
        if (!isCandidate(p) || /[<>|\s]/.test(p)) continue;
        checked++;
        if (ignored.indexOf(p) >= 0) continue;
        const ok = p.indexOf('*') >= 0 ? globExists(root, p) : fs.existsSync(path.join(root, p));
        if (!ok) missing.push(doc + ':' + (i + 1) + '  ' + p);
      }
    });
  }
  return { missing, checked, docs: docs.length };
}

if (require.main === module) {
  const res = check(args().root);
  if (res.missing.length) {
    process.stdout.write('Paths named in the docs that do not exist:\n' + res.missing.map((m) => '  ' + m).join('\n') + '\n');
    process.stdout.write('docs paths: ' + res.missing.length + ' missing of ' + res.checked + '\n');
    process.exit(1);
  }
  process.stdout.write('docs paths: ' + res.checked + ' paths in ' + res.docs + ' files all exist\n');
}

module.exports = { check };
