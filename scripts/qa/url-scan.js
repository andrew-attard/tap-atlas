#!/usr/bin/env node
/*
 * File: scripts/qa/url-scan.js
 * Purpose: Lists every http:// or https:// address in the shipped files outside comments, so nothing can reach
 *          the web (US-1.9.3). XML namespace names and the repository's own link are not requests and are allowed.
 * Provides: CLI `node scripts/qa/url-scan.js [--root dir]`; exit 1 if any other address is found
 * Depends on: Node 18+
 * Used by: scripts/qa/offline-check.sh
 */
'use strict';

const fs = require('fs');
const path = require('path');

const at = process.argv.indexOf('--root');
const root = at > 0 ? process.argv[at + 1] : path.join(__dirname, '..', '..');
const SHIPPED = ['index.html', 'index-sample.html', 'css', 'js', 'config', 'content', 'data', 'vendor'];
// Namespace names identify XML vocabularies; browsers never request them. Licence links sit in comments.
const ALLOW = [/^https?:\/\/www\.w3\.org\/(2000\/svg|1999\/xlink|2000\/xmlns\/?|XML\/1998\/namespace|1999\/xhtml)/,
  /^https:\/\/github\.com\/andrew-attard\/tap-atlas/];

function files(rel, acc) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return acc;
  if (fs.statSync(abs).isDirectory()) {
    fs.readdirSync(abs).forEach((n) => files(rel + '/' + n, acc));
  } else if (/\.(js|css|html)$/.test(rel)) acc.push(rel);
  return acc;
}

const blankOut = (m) => m.replace(/[^\n]/g, ' ');

// Blanks out comments, keeping strings and line breaks, for JS and CSS; HTML comments for HTML.
// Minified vendor code has regex literals a simple lexer misreads, so there only /* ... */ blocks
// that open at the start of a line (licence headers) are removed.
function stripComments(src, ext, vendor) {
  if (ext === 'html') return src.replace(/<!--[\s\S]*?-->/g, blankOut);
  if (vendor) return src.replace(/(^|\n)\s*\/\*[\s\S]*?\*\//g, blankOut);
  let out = '';
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') { out += d || ''; i += 2; continue; }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i++; continue; }
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }
    // A line comment, but not the "//" inside an address
    if (ext === 'js' && c === '/' && d === '/' && src[i - 1] !== ':') {
      const end = src.indexOf('\n', i);
      const stop = end < 0 ? src.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const hits = [];
const allowed = {};
SHIPPED.forEach((top) => files(top, []).forEach((rel) => {
  const ext = path.extname(rel).slice(1);
  const code = stripComments(fs.readFileSync(path.join(root, rel), 'utf8'), ext, /^vendor\//.test(rel));
  const re = /https?:\/\/[^\s"'`)<>\\]*/g;
  let m;
  while ((m = re.exec(code))) {
    if (ALLOW.some((a) => a.test(m[0]))) { allowed[m[0]] = (allowed[m[0]] || 0) + 1; continue; }
    const line = code.slice(0, m.index).split('\n').length;
    hits.push(rel + ':' + line + '  ' + m[0]);
  }
}));

Object.keys(allowed).forEach((u) => console.log('OK     ' + u + ' (namespace or repository link, not a request) x' + allowed[u]));
hits.forEach((h) => console.log('ERROR  web address outside comments: ' + h));
console.log(hits.length ? 'FAIL ' + hits.length + ' web addresses in shipped code' : 'PASS no web addresses in shipped code outside comments');
process.exit(hits.length ? 1 : 0);
