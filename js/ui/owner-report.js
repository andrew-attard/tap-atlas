/*
 * File: js/ui/owner-report.js
 * Purpose: Writes the review report a workbook owner receives (US-1.8.11, D166): one self-contained HTML page per
 *          workbook (inline styles from the theme, no script, no link, no image, no web request, prints to PDF) and the
 *          same content as plain text for an email, plus the all-workbooks page with a contents list. The items are the
 *          region's import notes and the check's unmatched warnings, already folded (D165) and normalized by
 *          js/ui/warning-groups.js; kindGroups arranges them. No data path and no technical message reaches the file.
 *          Every word comes from content/text-owner-report.js (ownerReport.*) and content/text-data.js (check.groups).
 * Provides: TAP.ownerReport (build, buildAll, download, countText, fileName)
 * Depends on: js/theme.js (TAP_THEME: font, colours, sizes), js/core/content.js, js/core/format.js, js/ui/warning-groups.js
 *             (kindGroups), js/ui/shell.js (label, at call time), js/panel/panel-export.js (download, at call time)
 * Used by: js/ui/owner-report-ui.js
 * Owner: REPORTS stream (#616)
 *
 * build(region, opts) and buildAll(regions, opts) give { html, text, fileName }. A region is
 * { name, fileName, fileModified, importedAt, items } with items in the warning groups' normalized shape. opts.now (ISO)
 * sets the report date; the default is now.
 */
(function (TAP) {
  'use strict';

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  var HEAD = { where: 'colWhere', found: 'colFound', expected: 'colExpected' };

  function t(key, vars) { return TAP.content.text('ownerReport.' + key, vars); }
  function g(key, vars) { return TAP.content.text('check.groups.' + key, vars); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function appName() { return TAP.content.text('app.name'); }

  // The organization's confidentiality label (or the sample note), when the shell gives one
  function label() {
    try { var l = TAP.shell && TAP.shell.label ? TAP.shell.label() : null; return l && l.text ? String(l.text) : ''; } catch (e) { return ''; }
  }
  function dateOf(opts) {
    var d = opts && opts.now ? new Date(opts.now) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  }
  function ymd(d) { return d.toISOString().slice(0, 10); }
  // A file name without the characters file systems refuse, runs of spaces collapsed
  function safe(s) { return String(s).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function fileName(region, d) { return safe(t('fileName', { region: region, date: ymd(d) })) + '.html'; }
  function allFileName(d) { return safe(t('allFileName', { date: ymd(d) })) + '.html'; }
  function items(r) { return Array.isArray(r.items) ? r.items : []; }

  // "{n} items", "1 item" or "Nothing to review", for the list rows and the contents
  function countText(r) {
    var n = items(r).length;
    return n === 0 ? t('ui.none') : n === 1 ? t('ui.countOne') : t('ui.count', { n: n });
  }
  function summary(n, k) { return n === 1 && k === 1 ? t('summaryOne') : t('summary', { n: n, k: k }); }

  /* ---------- the HTML page ---------- */

  // The one style block: the theme's font (its own fallbacks only, no font file) and colours, read from the theme at build
  // time, body and table text at 16 px or more and headings larger (D24, for the printed copy too); rows never split in print
  function styles() {
    var T = window.TAP_THEME || {}, type = T.type || {}, body = Math.max(16, type.body || 0);
    var h1 = Math.max(body + 8, type.h1 || 0), h2 = Math.max(body + 4, type.h2 || 0), h3 = Math.max(body + 2, type.h3 || 0);
    return [
      'body { margin: 0; padding: 32px 24px; font-family: ' + (T.font || 'system-ui, sans-serif') + '; font-size: ' + body + 'px; line-height: 1.45; color: ' + T.ink + '; background: ' + T.ground + '; }',
      'main { max-width: 960px; margin: 0 auto; }',
      'h1 { font-size: ' + h1 + 'px; line-height: 1.15; margin: 0 0 8px; }',
      'h2 { font-size: ' + h2 + 'px; line-height: 1.2; margin: 32px 0 8px; }',
      'h3 { font-size: ' + h3 + 'px; line-height: 1.2; margin: 24px 0 8px; }',
      'p { margin: 0 0 12px; }',
      '.kicker { margin: 0 0 4px; font-weight: 600; color: ' + T.muted + '; }',
      '.label { display: inline-block; margin: 0 0 12px; padding: 2px 8px; border: 2px solid ' + T.accent + '; color: ' + T.accent + '; font-weight: 700; }',
      'dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 2px 16px; margin: 0 0 16px; }',
      'dt { color: ' + T.muted + '; }',
      'dd { margin: 0; font-weight: 600; }',
      '.todo { padding: 12px; background: ' + T.surface + '; border-left: 3px solid ' + T.ink + '; }',
      '.summary { font-weight: 600; }',
      'table { width: 100%; border-collapse: collapse; margin: 0 0 16px; font-size: ' + body + 'px; }',
      'th, td { padding: 8px 10px; text-align: left; vertical-align: top; border-bottom: 1px solid ' + T.rule + '; overflow-wrap: anywhere; }',
      'th { background: ' + T.surface + '; border-bottom: 2px solid ' + T.ink + '; }',
      '.cell { display: block; color: ' + T.muted + '; }',
      'nav ol { margin: 0 0 16px; padding-left: 24px; }',
      'nav a { color: ' + T.ink + '; }',
      '@media print { body { padding: 0; background: none; } h2, h3 { break-after: avoid; page-break-after: avoid; } tr, dl, .todo { break-inside: avoid; page-break-inside: avoid; } }'
    ].join('\n');
  }

  function head(title) {
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + esc(title) + '</title>\n<style>\n' + styles() + '\n</style>\n</head>\n<body>\n<main>\n';
  }
  function heading(title) {
    var lab = label();
    return '<p class="kicker">' + esc(appName()) + '</p>\n<h1>' + esc(title) + '</h1>\n' + (lab ? '<p class="label">' + esc(lab) + '</p>\n' : '');
  }

  // The facts: the workbook, its saved date, the import date and the report date
  function factRows(r, d) {
    var date = function (iso) { return TAP.format.date(iso, { time: true }); };
    return [[t('workbook'), r.fileName || TAP.content.text('states.notProvided')], [t('saved'), date(r.fileModified)],
      [t('imported'), date(r.importedAt)], [t('reportDate'), TAP.format.date(d.toISOString())]];
  }
  function facts(rows) {
    return '<dl>\n' + rows.map(function (row) { return '<dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd>'; }).join('\n') + '\n</dl>\n';
  }

  // The Where cell: the row or item, the sheet and cell under it (a space between keeps the copied text apart)
  function whereCell(it, hasCell) {
    return '<td>' + (it.where ? '<span>' + esc(it.where) + '</span>' : '') + (hasCell && it.cell ? ' <span class="cell">' + esc(it.cell) + '</span>' : '') + '</td>';
  }
  // One kind group as a table with the columns the group fills (D164)
  function table(k) {
    return '<table>\n<thead><tr>' + k.cols.map(function (c) { return '<th scope="col">' + esc(g(HEAD[c])) + '</th>'; }).join('') + '</tr></thead>\n<tbody>\n' +
      k.items.map(function (it) {
        return '<tr>' + k.cols.map(function (c) { return c === 'where' ? whereCell(it, k.hasCell) : '<td>' + esc(it[c] || '') + '</td>'; }).join('') + '</tr>';
      }).join('\n') + '\n</tbody>\n</table>\n';
  }
  // One kind: the title with its count, the rule sentence once, then the table
  function kindSection(k, tag) {
    return '<section class="kind">\n<' + tag + '>' + esc(t('kind', { title: k.title, n: k.items.length })) + '</' + tag + '>\n' +
      (k.intro ? '<p>' + esc(k.intro) + '</p>\n' : '') + table(k) + '</section>\n';
  }

  // One region's report body: the facts, what to do, the summary, a section per kind, the closing line
  function body(r, d, tag) {
    var list = items(r), kinds = TAP.warningGroups.kindGroups(list);
    return facts(factRows(r, d)) + '<p class="todo">' + esc(t('todo')) + '</p>\n' +
      (list.length ? '<p class="summary">' + esc(summary(list.length, kinds.length)) + '</p>\n' : '') +
      kinds.map(function (k) { return kindSection(k, tag); }).join('') +
      '<p class="closing">' + esc(list.length ? t('closing') : t('none')) + '</p>\n';
  }
  var TAIL = '</main>\n</body>\n</html>\n';

  /* ---------- the text version ---------- */

  // One item: "where · sheet › cell: found X, expected Y", whichever parts exist
  function line(it) {
    var where = [it.where, it.cell].filter(Boolean).join(t('textSep'));
    var vals = [it.found ? g('rowFound', { found: it.found }) : '', it.expected ? g('rowExpected', { expected: it.expected }) : ''].filter(Boolean).join(t('textJoin'));
    return vals ? where + t('textAt') + vals : where;
  }
  function textBody(r, d) {
    var list = items(r), kinds = TAP.warningGroups.kindGroups(list), pad = t('textIndent'), out = [];
    factRows(r, d).forEach(function (row) { out.push(row[0] + t('textAt') + row[1]); });
    out.push('', t('todo'), '');
    if (list.length) out.push(summary(list.length, kinds.length), '');
    kinds.forEach(function (k) {
      out.push(t('kind', { title: k.title, n: k.items.length }));
      if (k.intro) out.push(pad + k.intro);
      k.items.forEach(function (it) { out.push(pad + t('textItem', { line: line(it) })); });
      out.push('');
    });
    out.push(list.length ? t('closing') : t('none'));
    return out;
  }
  function textHead(title) { var lab = label(); return [appName(), title].concat(lab ? [lab] : []); }

  /* ---------- the reports ---------- */

  function build(region, opts) {
    var d = dateOf(opts), title = t('title', { region: region.name });
    return {
      html: head(title) + heading(title) + body(region, d, 'h2') + TAIL,
      text: textHead(title).concat(textBody(region, d)).join('\n') + '\n',
      fileName: fileName(region.name, d)
    };
  }

  // Every region in one page: a contents list of anchors within the file, then each report under its own heading
  function buildAll(regions, opts) {
    var d = dateOf(opts), title = t('allTitle'), list = regions || [], id = function (i) { return 'region-' + (i + 1); };
    var toc = '<nav aria-label="' + esc(t('contents')) + '">\n<h2>' + esc(t('contents')) + '</h2>\n<ol>\n' + list.map(function (r, i) {
      return '<li><a href="#' + id(i) + '">' + esc(t('contentsItem', { region: r.name, count: countText(r) })) + '</a></li>';
    }).join('\n') + '\n</ol>\n</nav>\n';
    var html = head(title) + heading(title) + toc + list.map(function (r, i) {
      return '<section id="' + id(i) + '">\n<h2>' + esc(t('title', { region: r.name })) + '</h2>\n' + body(r, d, 'h3') + '</section>\n';
    }).join('') + TAIL;
    var text = textHead(title).concat(list.map(function (r) { return ['', '', t('title', { region: r.name })].concat(textBody(r, d)); }).reduce(function (a, b) { return a.concat(b); }, []));
    return { html: html, text: text.join('\n') + '\n', fileName: allFileName(d) };
  }

  // Saves a built report as a page, through the panel's download outlet, and frees the URL
  function download(report) {
    var blob = new Blob([report.html], { type: 'text/html' }), url = URL.createObjectURL(blob);
    TAP.panelExport.download(url, report.fileName);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    return url;
  }

  TAP.ownerReport = { build: build, buildAll: buildAll, download: download, countText: countText, fileName: fileName };
})(window.TAP);
