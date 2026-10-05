#!/usr/bin/env node
/*
 * File: tools/check-docs3.js
 * Purpose: File checks for the handover pack and the portfolio edition, which the browser test page can't make:
 *          the sample edition works from a web host (relative paths, exact file names, nothing tied to file://),
 *          the landing page's links, and the portfolio screenshots (one per view, 1440 x 900, stable names that the pages link to).
 * Provides: CLI `node tools/check-docs3.js [--root dir]`; exit 1 if any check finds a problem; module.exports
 * Depends on: Node 18+ only
 * Used by: scripts/verify.sh ("handover and portfolio" step), CI; tests/test-docs3.js lists these cases as skipped
 * Owner: DOCS3 stream
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

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


/* ---------- TPV-TC-627 and 628: one screenshot per view, stable names ---------- */

const SHOTS = 'docs/screenshots';
const SHOT_SIZE = { width: 1440, height: 900 };
// Shown only with some data, so its picture may or may not be there.
const CONDITIONAL_VIEWS = ['other'];

// The same rule as scripts/portfolio-shots.sh: newBusiness -> new-business.png.
function shotName(viewId) {
  return viewId.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() + '.png';
}

function viewOrder(root) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'config/views.js'), 'utf8'), ctx);
  return ((ctx.window.TAP_VIEWS || {}).order || []).slice();
}

// Width and height from a PNG's header, or null when the file isn't a PNG.
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('latin1', 1, 4) !== 'PNG') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function checkShots(root) {
  const problems = [];
  const dir = path.join(root, SHOTS);
  if (!fs.existsSync(dir)) return { problems: [SHOTS + ' is missing: run scripts/portfolio-shots.sh'], checked: 0 };
  const views = viewOrder(root);
  const allowed = views.map(shotName);
  const files = fs.readdirSync(dir).filter((f) => !f.startsWith('.'));
  views.filter((v) => CONDITIONAL_VIEWS.indexOf(v) < 0).forEach((v) => {
    if (files.indexOf(shotName(v)) < 0) problems.push(SHOTS + ': no screenshot of the ' + v + ' view (' + shotName(v) + ')');
  });
  files.forEach((f) => {
    if (allowed.indexOf(f) < 0) { problems.push(SHOTS + '/' + f + ' is not named after a view'); return; }
    const size = pngSize(path.join(dir, f));
    if (!size) problems.push(SHOTS + '/' + f + ' is not a PNG image');
    else if (size.width !== SHOT_SIZE.width || size.height !== SHOT_SIZE.height) {
      problems.push(SHOTS + '/' + f + ' is ' + size.width + ' x ' + size.height + ', not 1440 x 900');
    }
  });
  return { problems, checked: files.length };
}

// The pages that show screenshots name only files the script writes, and the script names them as the checker does.
function checkShotNames(root) {
  const problems = [];
  let checked = 0;
  const script = path.join(root, 'scripts/portfolio-shots.sh');
  if (!fs.existsSync(script)) return { problems: ['scripts/portfolio-shots.sh is missing'], checked: 0 };
  viewOrder(root).forEach((v) => {
    checked++;
    const r = spawnSync('bash', [script, '--name', v], { encoding: 'utf8' });
    const got = (r.stdout || '').trim();
    if (got !== shotName(v)) problems.push('scripts/portfolio-shots.sh names the ' + v + ' view "' + got + '", expected "' + shotName(v) + '"');
  });
  ['docs/index.html', 'docs/CASE-STUDY.md'].forEach((doc) => {
    const file = path.join(root, doc);
    if (!fs.existsSync(file)) return;
    const text = fs.readFileSync(file, 'utf8');
    const re = /screenshots\/([A-Za-z0-9_-]+\.png)/g;
    let m;
    while ((m = re.exec(text))) {
      checked++;
      if (!existsExact(root, SHOTS + '/' + m[1])) problems.push(doc + ': names screenshots/' + m[1] + ', which the script does not write');
    }
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

const CHECKS = [
  { id: 'TPV-TC-621', label: 'sample edition: relative paths, exact names, nothing tied to file://', run: checkWeb },
  { id: 'TPV-TC-615', label: 'landing page: relative links to files that exist, 3 or 4 screenshots, the sample button', run: checkLanding },
  { id: 'TPV-TC-627', label: 'one 1440 x 900 screenshot per view in docs/screenshots', run: checkShots },
  { id: 'TPV-TC-628', label: 'screenshot names are stable and every page names an existing one', run: checkShotNames }
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

module.exports = { runAll, existsExact, isRelative, htmlRefs, refProblem, codeLines, shotName, pngSize };
