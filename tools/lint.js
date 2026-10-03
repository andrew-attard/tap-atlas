#!/usr/bin/env node
/*
 * File: tools/lint.js
 * Purpose: Zero-dependency linter for the repo's house rules (headers, size, file:// safety, colours, script order).
 * Provides: CLI `node tools/lint.js [--release] [--self-test] [--root dir]`; exports lintFiles, collect for reuse
 * Depends on: Node 18+ only; tests/lint-fixtures/ for --self-test
 * Used by: scripts/verify.sh, .github/workflows/ci.yml
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SHIPPED_HTML = ['index.html', 'index-sample.html', 'tests.html'];
const SHIPPED_DIRS = ['css', 'js', 'config', 'content'];
const HEADER_DIRS = ['tests', 'tools', 'scripts'];
const SKIP = [/^vendor\//, /(^|\/)node_modules\//, /(^|\/)\.git\//, /^data\/sample-plan-data\.js$/,
  /^tests\/auto-cases\.js$/, /^tests\/lint-fixtures\//];
const CHECKED_EXT = /\.(js|css|html|sh)$/;
// URLs that are not network requests, or point at this public repo.
const URL_ALLOW = [/^https:\/\/github\.com\/andrew-attard\/tap-atlas/, /^http:\/\/www\.w3\.org\/2000\/svg/,
  /^http:\/\/www\.w3\.org\/1999\/xlink/];
const HEX = /(^|[^\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/;
const FUNC_COLOUR = /\b(rgba?|hsla?)\s*\(/;

// ---- text helpers ----

let lineCache = { text: null, starts: [] };
function lineOf(text, idx) {
  if (lineCache.text !== text) {
    const starts = [0];
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
    lineCache = { text, starts };
  }
  const s = lineCache.starts;
  let lo = 0;
  let hi = s.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s[mid] <= idx) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

function blank(s) { return s.replace(/[^\n]/g, ' '); }

// Words or symbols after which a "/" starts a regex, not a division.
function regexAllowed(sig) {
  if (sig === '') return true;
  if (sig.length === 1) return '(,=:[!&|?{};+-*%<>~^'.indexOf(sig) !== -1;
  return /^w:(return|typeof|case|do|else|in|of|new|delete|void|throw|yield)$/.test(sig);
}

// Masks JS comments with spaces (keeping line breaks) and collects string literals.
function lexJs(src, firstLine) {
  let out = '';
  const strings = [];
  let i = 0;
  let line = firstLine || 1;
  let sig = '';
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      const j = src.indexOf('\n', i) === -1 ? n : src.indexOf('\n', i);
      out += blank(src.slice(i, j));
      i = j;
      continue;
    }
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      const j = end === -1 ? n : end + 2;
      const chunk = src.slice(i, j);
      out += blank(chunk);
      line += (chunk.match(/\n/g) || []).length;
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const start = line;
      let j = i + 1;
      let val = '';
      while (j < n && src[j] !== c) {
        if (src[j] === '\\') { val += src.slice(j, j + 2); j += 2; continue; }
        if (src[j] === '\n') { line++; if (c !== '`') break; }
        val += src[j];
        j++;
      }
      out += src.slice(i, j + 1);
      strings.push({ line: start, value: val });
      i = j + 1;
      sig = 'str';
      continue;
    }
    if (c === '/' && regexAllowed(sig)) {
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        else if (src[j] === '/' && !inClass) break;
        j++;
      }
      out += src.slice(i, j + 1);
      i = j + 1;
      sig = 're';
      continue;
    }
    if (c === '\n') line++;
    out += c;
    if (/[\w$]/.test(c)) sig = sig.startsWith('w:') && /[\w$]/.test(src[i - 1] || '') ? sig + c : 'w:' + c;
    else if (!/\s/.test(c)) sig = c;
    i++;
  }
  return { code: out, strings };
}

// HTML with comments masked and inline scripts lexed as JS; also returns style text.
function lexHtml(src) {
  let code = src.replace(/<!--[\s\S]*?-->/g, blank);
  const strings = [];
  code = code.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (m, open, body, close, idx) => {
    if (/\bsrc\s*=/.test(open)) return m;
    const lexed = lexJs(body, lineOf(code, idx));
    strings.push(...lexed.strings);
    return open + lexed.code + close;
  });
  return { code, strings };
}

function stripCss(src) { return src.replace(/\/\*[\s\S]*?\*\//g, blank); }

// The CSS inside an HTML file (style blocks and colour/style attributes), at the same offsets.
function htmlCss(code) {
  const chars = blank(code).split('');
  const put = (idx, s) => { for (let k = 0; k < s.length; k++) if (s[k] !== '\n') chars[idx + k] = s[k]; };
  let m;
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = styleRe.exec(code))) put(m.index + m[0].indexOf('>') + 1, stripCss(m[1]));
  const attrRe = /\b(style|fill|stroke|color|stop-color)\s*=\s*(["'])([^"']*)\2/gi;
  while ((m = attrRe.exec(code))) {
    put(m.index, ';' + (m[1].toLowerCase() === 'style' ? m[3] : m[1] + ':' + m[3]) + ';');
  }
  return chars.join('');
}

// ---- rules ----

function lintFiles(files, opts) {
  const out = [];
  const add = (file, line, rule, msg, warn) => out.push({ file, line, rule, msg, warn: !!warn });
  const release = !!opts.release;

  for (const f of files) {
    const rel = f.rel;
    const ext = path.extname(rel).slice(1);
    const text = f.text;
    const lines = text.split('\n');
    const shipped = !/^(tests|tools|scripts)\//.test(rel);

    if (CHECKED_EXT.test(rel)) {
      const head = lines.slice(0, 15).join('\n');
      const missing = ['Purpose:', 'Provides:', 'Depends on:', 'Used by:'].filter((k) => head.indexOf(k) === -1);
      if (missing.length) add(rel, 1, 'header', 'file header is missing ' + missing.join(', '));
    }
    if (ext === 'js') {
      try { new vm.Script(text, { filename: rel }); } catch (e) {
        const m = /:(\d+)/.exec((e.stack || '').split('\n')[0]);
        add(rel, m ? +m[1] : 1, 'syntax', e.message);
      }
    }
    if (!shipped) continue;

    const count = text.endsWith('\n') ? lines.length - 1 : lines.length;
    if (!/^data\//.test(rel)) {
      if (count > 350) add(rel, count, 'length', count + ' lines (limit 350): split the file');
      else if (count > 300) add(rel, count, 'length', count + ' lines (over 300): consider splitting', !release);
    }

    let code = text;
    let strings = [];
    if (ext === 'js') ({ code, strings } = lexJs(text));
    else if (ext === 'html') ({ code, strings } = lexHtml(text));
    else if (ext === 'css') code = stripCss(text);
    const codeLines = code.split('\n');

    if (ext === 'js' || ext === 'html') {
      codeLines.forEach((l, i) => {
        const raw = lines[i] || '';
        const at = i + 1;
        if (/type\s*=\s*["']?module/.test(l)) add(rel, at, 'no-module', 'type="module" does not work from file://');
        if (/^\s*(import|export)\s/.test(l)) add(rel, at, 'no-module', 'import/export does not work in classic scripts');
        if (/\bfetch\s*\(/.test(l)) add(rel, at, 'no-fetch', 'fetch() is blocked on file://');
        if (/\beval\s*\(/.test(l) || /\bnew\s+Function\b/.test(l)) add(rel, at, 'no-eval', 'eval and new Function are not allowed');
        if (/XMLHttpRequest/.test(l)) add(rel, at, 'no-xhr', 'XMLHttpRequest is blocked on file://');
        if (/console\.log\s*\(/.test(l)) add(rel, at, 'no-console', 'remove console.log');
        if (/\b(localStorage|sessionStorage)\b/.test(l) && rel !== 'js/core/storage.js') {
          add(rel, at, 'storage', 'browser storage only through js/core/storage.js');
        }
        if (/\.innerHTML\b/.test(l) && raw.indexOf('html-ok') === -1) {
          add(rel, at, 'innerhtml', '.innerHTML needs an "html-ok" comment saying why it is safe');
        }
        if (/\bTAP\.stub\s*\(/.test(l) && release) add(rel, at, 'stub', 'TAP.stub() left in a release build');
        if (ext === 'js' && /\bfontSize\s*:\s*\d/.test(l) && rel !== 'js/theme.js') {
          add(rel, at, 'font-size', 'fontSize must come from js/theme.js');
        }
        if (ext === 'html') {
          const m = /\b(src|href)\s*=\s*["']?(https?:\/\/[^"'\s>]*)/i.exec(l);
          if (m && !URL_ALLOW.some((re) => re.test(m[2]))) add(rel, at, 'no-url', 'external URL in ' + m[1] + ': vendor it locally');
        }
      });
      for (const s of strings) {
        const m = /https?:\/\/[^\s"'`]*/.exec(s.value);
        if (m && !URL_ALLOW.some((re) => re.test(m[0]))) add(rel, s.line, 'no-url', 'external URL in a string: ' + m[0]);
      }
    }

    // Colour literals and font sizes.
    if (rel !== 'js/theme.js') {
      const okLine = (n) => (lines[n - 1] || '').indexOf('lint-ok: colour') !== -1;
      codeLines.forEach((l, i) => {
        if (FUNC_COLOUR.test(l) && !okLine(i + 1)) add(rel, i + 1, 'colour', 'colour function literal: use a theme variable');
      });
      if (ext === 'js' || ext === 'html') {
        for (const s of strings) if (HEX.test(s.value) && !okLine(s.line)) add(rel, s.line, 'colour', 'hex colour in a string: use the theme');
      }
      const css = ext === 'css' ? code : ext === 'html' ? htmlCss(code) : '';
      if (css) {
        const decl = /([a-zA-Z-]+)\s*:\s*([^;{}]*)(?=[;}])/g;
        let m;
        while ((m = decl.exec(css))) {
          const at = lineOf(css, m.index);
          if (HEX.test(m[2]) && !okLine(at)) add(rel, at, 'colour', 'hex colour in CSS: use var(--...)');
          const size = m[1] === 'font-size' || m[1] === 'font';
          if (size && /\d*\.?\d+px/.test(m[2]) && rel !== 'css/base.css') {
            add(rel, at, 'font-size', m[1] + ' in px: use a theme size variable');
          }
          if (decl.lastIndex === m.index) decl.lastIndex++;
        }
      }
    }
  }
  return out;
}

// Script order across the three HTML files, and no orphan scripts.
function scriptSrcs(html) {
  const list = [];
  const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  let m;
  const clean = html.replace(/<!--[\s\S]*?-->/g, '');
  while ((m = re.exec(clean))) list.push(m[1].replace(/^\.\//, '').replace(/[?#].*$/, ''));
  return list;
}

function lintScriptOrder(files) {
  const out = [];
  const byRel = {};
  files.forEach((f) => { byRel[f.rel] = f; });
  const isApp = (p) => /^(vendor|js|config|content)\//.test(p) && !/^content\/organization(\.example)?\.js$/.test(p);
  const present = SHIPPED_HTML.filter((h) => byRel[h]);
  if (!present.length) return out;
  const lists = {};
  present.forEach((h) => { lists[h] = scriptSrcs(byRel[h].text).filter(isApp); });
  const ref = lists['index-sample.html'] ? 'index-sample.html' : present[0];
  present.forEach((h) => {
    if (h === ref) return;
    const a = lists[h].join('\n');
    const b = lists[ref].join('\n');
    if (a !== b) {
      const i = lists[h].findIndex((s, k) => s !== lists[ref][k]);
      const at = i === -1 ? lists[h].length : i;
      out.push({ file: h, line: 1, rule: 'script-order', warn: false,
        msg: 'app scripts differ from ' + ref + ' at position ' + (at + 1) + ': found ' +
          (lists[h][at] || '(none)') + ', expected ' + (lists[ref][at] || '(none)') });
    }
  });
  if (lists['index-sample.html']) {
    const loaded = new Set(lists['index-sample.html']);
    files.forEach((f) => {
      if (/^(js|config|content)\/.*\.js$/.test(f.rel) && !/^content\/organization/.test(f.rel) && !loaded.has(f.rel)) {
        out.push({ file: f.rel, line: 1, rule: 'orphan', warn: false, msg: 'not loaded by index-sample.html' });
      }
    });
  }
  return out;
}

// ---- file collection ----

function walk(root, dir, acc) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = dir ? dir + '/' + ent.name : ent.name;
    if (SKIP.some((re) => re.test(rel + (ent.isDirectory() ? '/' : '')))) continue;
    if (ent.isDirectory()) walk(root, rel, acc);
    else acc.push(rel);
  }
  return acc;
}

function collect(root) {
  const rels = SHIPPED_HTML.filter((h) => fs.existsSync(path.join(root, h)));
  SHIPPED_DIRS.concat(HEADER_DIRS).forEach((d) => walk(root, d, rels));
  return rels.filter((r) => CHECKED_EXT.test(r))
    .map((rel) => ({ rel, text: fs.readFileSync(path.join(root, rel), 'utf8') }));
}

function lintTree(root, opts) {
  const files = collect(root);
  return lintFiles(files, opts).concat(lintScriptOrder(files));
}

// ---- self-test against tests/lint-fixtures ----

function selfTest(repo) {
  const fx = path.join(repo, 'tests', 'lint-fixtures');
  const expect = JSON.parse(fs.readFileSync(path.join(fx, 'expect.json'), 'utf8'));
  let bad = 0;
  const report = (ok, msg) => { console.log((ok ? 'ok    ' : 'FAIL  ') + msg); if (!ok) bad++; };

  const good = lintTree(path.join(fx, 'good'), { release: true });
  report(good.length === 0, 'good tree is clean' + (good.length ? ': ' + good.map(fmt).join('; ') : ''));

  const found = lintTree(path.join(fx, 'bad'), { release: true });
  for (const [file, rules] of Object.entries(expect.bad)) {
    for (const rule of rules) {
      report(found.some((f) => f.file === file && f.rule === rule), 'bad/' + file + ' is caught by ' + rule);
    }
  }
  const unexpected = found.filter((f) => !(expect.bad[f.file] || []).includes(f.rule));
  report(unexpected.length === 0, 'no unexpected findings in the bad tree' +
    (unexpected.length ? ': ' + unexpected.map(fmt).join('; ') : ''));

  // Length limits, built in memory so no huge fixture is stored.
  const header = '/*\n * Purpose: x\n * Provides: x\n * Depends on: x\n * Used by: x\n */\n';
  const mk = (n) => header + 'var a = 1;\n'.repeat(n - 6);
  const long = lintFiles([{ rel: 'js/long.js', text: mk(351) }], {});
  report(long.some((f) => f.rule === 'length' && !f.warn), '351 lines is an error');
  const mid = lintFiles([{ rel: 'js/mid.js', text: mk(310) }], {});
  report(mid.some((f) => f.rule === 'length' && f.warn), '310 lines is a warning');
  const midRel = lintFiles([{ rel: 'js/mid.js', text: mk(310) }], { release: true });
  report(midRel.some((f) => f.rule === 'length' && !f.warn), '310 lines is an error with --release');
  const stubDev = lintFiles([{ rel: 'js/s.js', text: header + 'TAP.stub("x");\n' }], {});
  report(!stubDev.some((f) => f.rule === 'stub'), 'TAP.stub is allowed outside --release');

  console.log(bad ? 'lint self-test FAILED (' + bad + ')' : 'lint self-test passed');
  return bad ? 1 : 0;
}

function fmt(f) { return f.file + ':' + f.line + ' ' + f.rule + ' ' + (f.warn ? 'warning: ' : '') + f.msg; }

function main() {
  const args = process.argv.slice(2);
  const rootAt = args.indexOf('--root');
  const root = rootAt !== -1 ? path.resolve(args[rootAt + 1]) : path.resolve(__dirname, '..');
  if (args.includes('--self-test')) process.exit(selfTest(path.resolve(__dirname, '..')));
  const findings = lintTree(root, { release: args.includes('--release') });
  findings.forEach((f) => console.log(fmt(f)));
  const errors = findings.filter((f) => !f.warn).length;
  const warns = findings.length - errors;
  console.log('lint: ' + errors + ' error(s), ' + warns + ' warning(s)');
  process.exit(errors ? 1 : 0);
}

if (require.main === module) main();
module.exports = { lintFiles, lintScriptOrder, collect, lintTree };
