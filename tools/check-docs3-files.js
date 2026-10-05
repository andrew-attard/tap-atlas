#!/usr/bin/env node
/*
 * File: tools/check-docs3-files.js
 * Purpose: The deeper checks for tools/check-docs3.js: the portfolio screenshots (one per view, 1440 x 900,
 *          stable names that the pages link to), the known-good copy made by scripts/package.sh, and every field
 *          the contract check reads being named in the Data Contract.
 * Provides: module.exports ({checkShots, checkShotNames, checkPackage, checkContractFields, fieldsTheCheckReads,
 *           shotName, pngSize})
 * Depends on: Node 18+; tools/check-docs3.js (existsExact, read at call time); bash and git for the package check;
 *             js/core/namespace.js, check.js, extra.js and data/sample-plan-data.js, run in a Node sandbox
 * Used by: tools/check-docs3.js
 * Owner: DOCS3 stream
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

// Read at call time: tools/check-docs3.js loads this file first.
function existsExact(root, rel) { return require('./check-docs3.js').existsExact(root, rel); }

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

/* ---------- US-3.3.4: the known-good copy (TPV-TC-606, 607, 609, 610, 611) ---------- */

const PACKAGED = ['index.html', 'index-sample.html', 'js', 'css', 'config', 'content', 'vendor', 'data', 'docs'];
const NOT_PACKAGED = ['tests', 'tools', 'scripts', 'tests.html', '.git', '.github', '.githooks'];

// Runs scripts/package.sh into a scratch folder, with a stand-in for verify.sh so the check stays fast.
function runPackage(root, verifyCmd, dist) {
  return spawnSync('bash', [path.join(root, 'scripts/package.sh')], {
    encoding: 'utf8', cwd: root,
    env: Object.assign({}, process.env, { TAP_VERIFY_CMD: verifyCmd, TAP_DIST_DIR: dist })
  });
}

function checkPackage(root, handover) {
  const problems = [];
  if (!fs.existsSync(path.join(root, 'scripts/package.sh'))) return { problems: ['scripts/package.sh is missing'], checked: 0 };
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tap-package-'));
  try {
    // TPV-TC-609: a failing verify stops it, and no copy is made.
    const failDist = path.join(scratch, 'fail');
    const bad = runPackage(root, 'false', failDist);
    if (bad.status === 0) problems.push('package.sh exited 0 although verify failed');
    if (fs.existsSync(failDist) && fs.readdirSync(failDist).length) problems.push('package.sh made a copy although verify failed');

    // TPV-TC-606, 607, 610: a passing verify gives one dated copy, printed, with the shipped files only.
    const okDist = path.join(scratch, 'ok');
    const good = runPackage(root, 'true', okDist);
    if (good.status !== 0) {
      problems.push('package.sh failed with a passing verify: ' + (good.stdout + good.stderr).trim().split('\n').pop());
      return { problems, checked: 2 };
    }
    const made = fs.existsSync(okDist) ? fs.readdirSync(okDist) : [];
    const today = new Date();
    const stamp = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const version = (/TAP\.version\s*=\s*'([^']+)'/.exec(fs.readFileSync(path.join(root, 'js/core/namespace.js'), 'utf8')) || [])[1];
    const want = 'tap-atlas-' + version + '-' + stamp;
    if (made.length !== 1 || made[0] !== want) problems.push('dist holds ' + JSON.stringify(made) + ', expected ["' + want + '"]');
    const copy = path.join(okDist, made[0] || want);
    if (good.stdout.indexOf(copy) < 0) problems.push('package.sh did not print where the copy went (' + copy + ')');
    PACKAGED.forEach((p) => {
      if (fs.existsSync(path.join(root, p)) && !fs.existsSync(path.join(copy, p))) problems.push('the copy has no ' + p);
    });
    NOT_PACKAGED.forEach((p) => { if (fs.existsSync(path.join(copy, p))) problems.push('the copy holds ' + p); });
    // Every document the handover guide names is in the copy (D70).
    if (fs.existsSync(path.join(root, handover)) && !fs.existsSync(path.join(copy, handover))) problems.push('the copy has no ' + handover);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  // TPV-TC-611: dist/ is ignored by git.
  const ig = spawnSync('git', ['check-ignore', '-q', 'dist/tap-atlas-0.0.0-2000-01-01/index.html'], { cwd: root });
  if (ig.status !== 0) problems.push('.gitignore does not ignore dist/');
  return { problems, checked: PACKAGED.length + NOT_PACKAGED.length + 4 };
}

/* ---------- TPV-TC-598: every field the contract check reads is in the Data Contract ---------- */

const BUILTIN = ['length', 'forEach', 'map', 'filter', 'some', 'every', 'indexOf', 'slice', 'concat', 'join', 'keys',
  'hasOwnProperty', 'constructor', 'toString', 'valueOf', 'push', 'reduce', 'find', 'includes', 'sort', 'toJSON', 'then'];

// Runs the app's contract check (js/core/check.js and js/core/extra.js) on the sample data and records every
// property it reads. Only names the check's own code spells out count as fields, so data values used as keys
// (region ids, extra section ids and columns) are left out.
function fieldsTheCheckReads(root) {
  const ctx = { console: console, addEventListener: function () {}, document: { addEventListener: function () {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  const code = {};
  ['js/core/namespace.js', 'js/core/check.js', 'js/core/extra.js', 'data/sample-plan-data.js'].forEach((f) => {
    code[f] = fs.readFileSync(path.join(root, f), 'utf8');
    if (f === 'js/core/check.js') {
      vm.runInContext('window.TAP.content = { text: function (k) { return k; }, regionName: function (r) { return r && r.name; },' +
        ' setting: function (k, d) { return d; } };', ctx);
    }
    vm.runInContext(code[f], ctx, { filename: f });
  });
  const reads = new Set();
  const wrap = (o) => (o === null || typeof o !== 'object') ? o : new Proxy(o, {
    get: (t, k, r) => { if (typeof k === 'string') reads.add(k); return wrap(Reflect.get(t, k, r)); },
    has: (t, k) => { if (typeof k === 'string') reads.add(k); return Reflect.has(t, k); }
  });
  ctx.TAP.check.run(wrap(ctx.PLAN_DATA));
  // Code only: comments could mention a data value in passing.
  const src = (code['js/core/check.js'] + code['js/core/extra.js']).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  return [...reads].filter((k) => !/^\d+$/.test(k) && BUILTIN.indexOf(k) < 0 &&
    new RegExp('(^|[^A-Za-z0-9_$])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9_$])').test(src)).sort();
}

function checkContractFields(root) {
  const contract = fs.readFileSync(path.join(root, 'docs/DATA-CONTRACT.md'), 'utf8');
  const words = new Set();
  (contract.match(/`[^`\n]+`/g) || []).forEach((span) => (span.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).forEach((w) => words.add(w)));
  let fields;
  try { fields = fieldsTheCheckReads(root); } catch (e) { return { problems: ['could not run the contract check: ' + e.message], checked: 0 }; }
  const problems = fields.filter((f) => !words.has(f)).map((f) => 'docs/DATA-CONTRACT.md: the contract check reads "' + f + '", which the contract never names');
  if (fields.length < 20) problems.push('only ' + fields.length + ' fields recorded from the contract check: the recording looks broken');
  return { problems, checked: fields.length };
}

module.exports = { checkShots, checkShotNames, checkPackage, checkContractFields, fieldsTheCheckReads, shotName, pngSize };
