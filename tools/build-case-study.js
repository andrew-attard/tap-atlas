#!/usr/bin/env node
/*
 * File: tools/build-case-study.js
 * Purpose: Writes docs/case-study.html from docs/CASE-STUDY.md, in the landing page's style, so a web host shows
 *          the case study as a page (GitHub Pages serves .md files as plain text). The .md file is the source.
 * Provides: CLI `node tools/build-case-study.js [--check] [--root dir]`; --check exits 1 if the page is out of date;
 *           module.exports ({render, build})
 * Depends on: Node 18+ only; docs/CASE-STUDY.md
 * Used by: the maintainer after editing the case study; tools/check-docs3.js (--check, in verify.sh and CI)
 * Owner: DOCS3 stream
 *
 * Handles only what the case study uses: headings, paragraphs, bullet and numbered lists, tables, images,
 * links, bold and code spans. Every piece of text is escaped first.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = 'docs/CASE-STUDY.md';
const OUT = 'docs/case-study.html';

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Inline marks on escaped text: images, links (a .md link to a page that has an .html edition points to it), bold, code.
function inline(text) {
  let s = esc(text);
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push('<code>' + c + '</code>'); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => '<img src="' + src + '" alt="' + alt + '" width="1440" height="900">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => '<a href="' + href.replace(/^CASE-STUDY\.md$/, 'case-study.html') + '">' + label + '</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => codes[Number(i)]);
}

function cells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

// Markdown blocks to HTML, one block per run of lines.
function render(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,3}) (.*)$/.exec(line);
    if (h) {
      out.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>');
      i++;
    } else if (/^\|/.test(line)) {
      const head = cells(line);
      i += 2;   // the header row and its |---| line
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push('<table>\n<thead><tr>' + head.map((c) => '<th scope="col">' + inline(c) + '</th>').join('') + '</tr></thead>\n<tbody>\n' +
        rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('\n') + '\n</tbody>\n</table>');
    } else if (/^(- |\d+\. )/.test(line)) {
      const tag = /^- /.test(line) ? 'ul' : 'ol';
      const items = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^(- |\d+\. )/, ''));
      out.push('<' + tag + '>\n' + items.map((t) => '<li>' + inline(t) + '</li>').join('\n') + '\n</' + tag + '>');
    } else if (/^!\[/.test(line)) {
      out.push('<figure>' + inline(line.trim()) + '</figure>');
      i++;
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(#|\||- |\d+\. |!\[)/.test(lines[i])) para.push(lines[i++].trim());
      out.push('<p>' + inline(para.join(' ')) + '</p>');
    }
  }
  return out.join('\n');
}

function build(root) {
  const md = fs.readFileSync(path.join(root, SRC), 'utf8');
  return '<!doctype html>\n<!--\n' +
    '  File: docs/case-study.html\n' +
    '  Purpose: The case study as a web page, in the landing page\'s style. Generated from docs/CASE-STUDY.md:\n' +
    '           edit that file, then run node tools/build-case-study.js. Never edit this page by hand.\n' +
    '  Provides: the case study page\n' +
    '  Depends on: js/theme.js, css/base.css, docs/portfolio.css, docs/screenshots/*.png\n' +
    '  Used by: docs/index.html (the case study link)\n' +
    '  Owner: DOCS3 stream\n-->\n' +
    '<html lang="en">\n<head>\n  <meta charset="utf-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '  <title>Case study: TAP Atlas</title>\n  <link rel="icon" href="data:,">\n' +
    '  <link rel="stylesheet" href="../css/base.css">\n  <link rel="stylesheet" href="portfolio.css">\n' +
    '  <script src="../js/theme.js"></script>\n</head>\n<body>\n' +
    '  <div class="lp-banner" role="note">Portfolio edition: every name and figure in the demo is fictional</div>\n' +
    '  <main class="lp-wrap lp-doc">\n  <a class="lp-back" href="index.html">Back to the overview</a>\n' +
    render(md) + '\n  </main>\n</body>\n</html>\n';
}

function rootDir() {
  const i = process.argv.indexOf('--root');
  return i > 0 ? path.resolve(process.argv[i + 1]) : path.join(__dirname, '..');
}

if (require.main === module) {
  const root = rootDir();
  const html = build(root);
  const file = path.join(root, OUT);
  const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (process.argv.indexOf('--check') > 0) {
    if (now !== html) {
      process.stdout.write(OUT + ' is out of date with ' + SRC + ': run node tools/build-case-study.js\n');
      process.exit(1);
    }
    process.stdout.write(OUT + ' matches ' + SRC + '\n');
  } else {
    fs.writeFileSync(file, html);
    process.stdout.write('wrote ' + OUT + '\n');
  }
}

module.exports = { render, build };
