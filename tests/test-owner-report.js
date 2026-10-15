/*
 * File: tests/test-owner-report.js
 * Purpose: Tests of the review report per workbook (US-1.8.11, D166): the self-contained HTML page (structure, sections,
 *          nothing technical, no request, D24 sizes, the label), the text version, the all-workbooks page, the file names
 *          and the download.
 * Provides: test cases X-owner-report-* and X-cells-owner-* (the cells behind both values, and a workbook left out, US-1.8.12,
 *           D169; the lead assigns Test Plan ids)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts (TAP.ownerReport, TAP.warningGroups, TAP.content, TAP.shell, TAP.format)
 * Used by: tests.html
 * Owner: REPORTS stream (#616)
 */
(function (TAP) {
  'use strict';

  var t = function (key, vars) { return TAP.content.text(key, vars); };
  var qs = function (sel, root) { return root.querySelector(sel); };
  var qsa = function (sel, root) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  var NOW = '2026-10-15T09:00:00Z';
  var LOOKUPS = { channels: [{ id: 'direct', name: 'Direct' }, { id: 'partner', name: 'Partner' }], segments: [{ id: 'core', name: 'Core' }] };
  // Built in parts so the test file itself holds no web address
  var URL_RE = new RegExp('https?:' + '//', 'i');

  function parse(html) { return new DOMParser().parseFromString(html, 'text/html'); }
  function notes() {
    return [
      { message: 'The Customer Growth section is empty.', sheet: '3. Customer Growth', cell: 'C10', kind: 'emptySection', item: 'Customer Growth', found: null, expected: null, ref: 'customerGrowth.accounts' },
      { message: 'The Partner section is empty.', sheet: '4. Partner', cell: 'B10', kind: 'emptySection', item: 'Partner', found: null, expected: null, ref: 'partners' },
      { message: 'Revenue 450 is above the order intake 400 for 2027, direct, customerGrowth, arr.', sheet: '5. Recap', cell: 'E30', kind: 'revenueAbove', item: '2027, Direct, existing customers, ARR', found: 450, expected: 400, ref: '2027|direct|customerGrowth' }
    ];
  }
  var TECH = 'regions[0].partners[0].supportPct[0]: expected a share written as a decimal, for example 0.25 for 25%, found 2.33';
  function warns() {
    return [{ path: 'regions[0].partners[0].supportPct[0]', region: 'Region A', item: 'Fictional Partner A1 (row 10)', field: 'supportPct', kind: 'share',
      expected: 'a share written as a decimal, for example 0.25 for 25%', found: 2.33, vars: null, ref: null, message: TECH }];
  }
  function region(items, name) {
    return { name: name || 'Region A', fileName: (name || 'Region A') + ' plan.xlsx', fileModified: '2026-09-30T10:15:00Z', importedAt: '2026-10-12T09:30:00Z', items: items };
  }
  function full() {
    var W = TAP.warningGroups;
    return region(W.fromImport(notes(), 'Region A').concat(W.fromCheck(warns(), { lookups: LOOKUPS })));
  }
  function withLabel(l, fn) {
    var saved = TAP.shell.label;
    TAP.shell.label = function () { return l; };
    try { return fn(); } finally { TAP.shell.label = saved; }
  }
  function title(kind, n, note) { return t(note ? 'importPanel.notePlain.' + kind + '.title' : 'check.plain.' + kind + '.title') + ' (' + n + ')'; }
  var COLS = { where: t('check.groups.colWhere'), found: t('check.groups.colFound'), expected: t('check.groups.colExpected') };

  T.suite('owner-report', function () {
    T.test('X-owner-report-structure', 'The page parses: lang, charset, viewport, the title with the region, the app name, the facts, what to do, the summary and the closing line', function (a) {
      var r = TAP.ownerReport.build(full(), { now: NOW }), doc = parse(r.html), want = t('ownerReport.title', { region: 'Region A' });
      a.ok(/^<!doctype html>\n<html lang="en">/i.test(r.html), 'doctype and lang first');
      a.equal(doc.documentElement.getAttribute('lang'), 'en');
      a.ok(qs('meta[charset]', doc), 'a charset');
      a.ok(qs('meta[name="viewport"]', doc), 'a viewport');
      a.equal(doc.title, want, 'the title');
      a.equal(txt(qs('h1', doc)), want, 'the heading');
      a.equal(txt(qs('.kicker', doc)), t('app.name'), 'the app name above it');
      var facts = qsa('dl dt', doc).map(txt), values = qsa('dl dd', doc).map(txt);
      a.deepEqual(facts, [t('ownerReport.workbook'), t('ownerReport.saved'), t('ownerReport.imported'), t('ownerReport.reportDate')], 'the facts in order');
      a.deepEqual(values, ['Region A plan.xlsx', TAP.format.date('2026-09-30T10:15:00Z', { time: true }), TAP.format.date('2026-10-12T09:30:00Z', { time: true }), TAP.format.date(NOW)], 'the file, the dates, the report date');
      a.equal(txt(qs('.todo', doc)), t('ownerReport.todo'), 'what to do');
      a.equal(txt(qs('.summary', doc)), t('ownerReport.summary', { n: 4, k: 3 }), 'four items in three groups');
      a.equal(txt(qs('.closing', doc)), t('ownerReport.closing'), 'the closing line');
      a.equal(qsa('style', doc).length, 1, 'one style block');
      a.ok(r.html.indexOf('[ownerReport') < 0 && r.html.indexOf('[check.') < 0 && r.html.indexOf('—') < 0, 'every phrase has wording, no em dash');
    });

    T.test('X-owner-report-sections', 'One section per kind in the groups’ order: the title with the count, the intro once, a table with only the filled columns, the sheet › cell under Where', function (a) {
      var doc = parse(TAP.ownerReport.build(full(), { now: NOW }).html), secs = qsa('section.kind', doc);
      a.equal(secs.length, 3, 'three kinds');
      a.deepEqual(secs.map(function (s) { return txt(qs('h2', s)); }), [title('emptySection', 2, true), title('revenueAbove', 1, true), title('share', 1)], 'titles with counts, notes first');
      a.deepEqual(secs.map(function (s) { return qsa('p', s).length; }), [1, 1, 1], 'the intro once per section');
      a.equal(txt(qs('p', secs[0])), t('importPanel.notePlain.emptySection.intro'));
      a.equal(txt(qs('p', secs[2])), t('check.plain.share.intro'));
      var heads = function (s) { return qsa('th', s).map(txt); };
      a.deepEqual(heads(secs[0]), [COLS.where], 'empty sections: Where alone');
      a.deepEqual(heads(secs[1]), [COLS.where, COLS.found, COLS.expected], 'revenue: all three');
      a.deepEqual(heads(secs[2]), [COLS.where, COLS.found], 'a share: no expected');
      a.deepEqual(secs.map(function (s) { return qsa('tbody tr', s).length; }), [2, 1, 1], 'one row per item');
      a.deepEqual(qsa('td', qsa('tbody tr', secs[0])[0]).map(txt), ['Customer Growth 3. Customer Growth › C10'], 'the section and its first cell');
      a.deepEqual(qsa('td', qs('tbody tr', secs[1])).map(txt), ['2027, Direct, existing customers, ARR 5. Recap › E30', '450', '400'], 'where with the address, found, expected');
      a.equal(txt(qs('.cell', secs[1])), '5. Recap › E30', 'the address in its own span');
      a.deepEqual(qsa('td', qs('tbody tr', secs[2])).map(txt), ['Fictional Partner A1 (row 10), ' + t('check.fields.supportPct'), '2.33'], 'a check warning: the row and field in words, the value');
      a.ok(qsa('th[scope="col"]', doc).length >= 6, 'column headers carry their scope');
    });

    T.test('X-owner-report-self-contained', 'No script, link, image or frame, no web address, no font file, no data path and no technical message', function (a) {
      var r = TAP.ownerReport.build(full(), { now: NOW }), doc = parse(r.html);
      a.equal(qsa('script, link, img, iframe, object, embed, video, audio', doc).length, 0, 'nothing that loads or runs');
      a.ok(!URL_RE.test(r.html), 'no web address in the page');
      a.ok(!URL_RE.test(r.text), 'nor in the text');
      a.ok(r.html.indexOf('@font-face') < 0 && r.html.indexOf('url(') < 0, 'no font file or background file');
      a.ok(r.html.indexOf('regions[') < 0 && r.text.indexOf('regions[') < 0, 'no data path');
      a.ok(r.html.indexOf(TECH) < 0 && r.text.indexOf(TECH) < 0, 'no technical message');
      a.ok(r.html.indexOf('The Customer Growth section is empty.') < 0, 'a note’s own sentence stays out: the kind’s title and intro replace it');
      a.ok(r.html.indexOf('customerGrowth, arr') < 0 && r.html.indexOf('2027|direct') < 0, 'no raw key and no ref');
      a.ok(txt(doc.body).indexOf('<') < 0, 'text is escaped');
    });

    T.test('X-owner-report-escaping', 'Text from the data is escaped, so a name with angle brackets or quotes cannot inject markup', function (a) {
      var W = TAP.warningGroups, item = W.fromImport([{ message: 'm', sheet: '<b>S</b>', cell: 'A1', kind: 'emptySection', item: 'Row "x" & <i>y</i>', found: null, expected: null }], 'Reg <ion> & "A"')[0];
      var r = TAP.ownerReport.build(region([item], 'Reg <ion> & "A"'), { now: NOW }), doc = parse(r.html);
      a.equal(qsa('b, i', doc).length, 0, 'no element made from the data');
      a.equal(txt(qs('h1', doc)), t('ownerReport.title', { region: 'Reg <ion> & "A"' }), 'the name reads as written');
      a.equal(txt(qs('tbody td', doc)), 'Row "x" & <i>y</i> <b>S</b> › A1', 'the row and address read as written');
      a.equal(doc.title, t('ownerReport.title', { region: 'Reg <ion> & "A"' }));
    });

    T.test('X-owner-report-sizes', 'The style block sets body and table text at 16 px or more and headings larger, the theme’s font, and print rules that keep rows whole (D24)', function (a) {
      var css = qs('style', parse(TAP.ownerReport.build(full(), { now: NOW }).html)).textContent;
      function size(sel) { var m = new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{[^}]*font-size: (\\d+)px').exec(css); return m ? +m[1] : NaN; }
      a.ok(size('body') >= 16, 'body ' + size('body') + ' px');
      a.ok(size('table') >= 16, 'table ' + size('table') + ' px');
      a.ok(size('h1') > size('h2') && size('h2') > size('h3') && size('h3') > size('body'), 'headings larger than the body: ' + [size('h1'), size('h2'), size('h3')].join(', '));
      a.ok(css.indexOf(window.TAP_THEME.font) >= 0, 'the theme’s font with its own fallbacks');
      a.ok(css.indexOf(window.TAP_THEME.ink) >= 0 && css.indexOf(window.TAP_THEME.ground) >= 0, 'the theme’s colours, resolved');
      a.ok(/@media print \{[^]*break-inside: avoid/.test(css), 'rows do not split across pages');
      a.ok(/@media print \{[^]*break-after: avoid/.test(css), 'a heading stays with its table');
    });

    T.test('X-owner-report-label', 'The confidentiality label shows in the page and the text when the shell gives one, and not otherwise', function (a) {
      var on = withLabel({ kind: 'internal', text: 'Internal: for the planning team' }, function () { return TAP.ownerReport.build(full(), { now: NOW }); });
      var doc = parse(on.html);
      a.equal(txt(qs('.label', doc)), 'Internal: for the planning team', 'the label under the title');
      a.ok(on.text.split('\n').indexOf('Internal: for the planning team') === 2, 'the label on the third line of the text, under the app name and the title');
      var off = withLabel(null, function () { return TAP.ownerReport.build(full(), { now: NOW }); });
      a.ok(!qs('.label', parse(off.html)), 'no label element');
      a.ok(off.text.indexOf('Internal') < 0, 'no label in the text');
      var all = withLabel({ kind: 'sample', text: 'Sample data' }, function () { return TAP.ownerReport.buildAll([full()], { now: NOW }); });
      a.equal(qsa('.label', parse(all.html)).length, 1, 'once on the all-workbooks page');
    });

    T.test('X-owner-report-empty', 'A workbook with nothing to review says so: no summary, no section, the count reads "Nothing to review"', function (a) {
      var r = TAP.ownerReport.build(region([]), { now: NOW }), doc = parse(r.html);
      a.equal(qsa('section.kind', doc).length, 0, 'no section');
      a.ok(!qs('.summary', doc), 'no summary line');
      a.equal(txt(qs('.closing', doc)), t('ownerReport.none'), 'the closing line says nothing is listed');
      a.ok(qs('.todo', doc) && qs('dl', doc), 'the facts and what to do stay');
      a.ok(r.text.split('\n').indexOf(t('ownerReport.none')) >= 0, 'the text says so too');
      a.equal(TAP.ownerReport.countText(region([])), t('ownerReport.ui.none'));
      a.equal(TAP.ownerReport.countText(region([{}])), t('ownerReport.ui.countOne'));
      a.equal(TAP.ownerReport.countText(full()), t('ownerReport.ui.count', { n: 4 }));
    });

    T.test('X-owner-report-text', 'The text version has the app name, the title, the facts, what to do, the summary, then per kind the title, the intro and one line per item', function (a) {
      var r = TAP.ownerReport.build(full(), { now: NOW }), lines = r.text.split('\n'), trimmed = lines.map(function (l) { return l.trim(); });
      var at = function (s) { var i = trimmed.indexOf(s); a.ok(i >= 0, 'line: ' + s); return i; };
      var name = at(t('app.name')), head = at(t('ownerReport.title', { region: 'Region A' }));
      var file = at(t('ownerReport.workbook') + t('ownerReport.textAt') + 'Region A plan.xlsx'), todo = at(t('ownerReport.todo'));
      var sum = at(t('ownerReport.summary', { n: 4, k: 3 })), kind = at(title('emptySection', 2, true)), intro = at(t('importPanel.notePlain.emptySection.intro'));
      var item = at(t('ownerReport.textItem', { line: 'Customer Growth · 3. Customer Growth › C10' }));
      var rev = at(t('ownerReport.textItem', { line: '2027, Direct, existing customers, ARR · 5. Recap › E30: ' + t('check.groups.rowFound', { found: '450' }) + ', ' + t('check.groups.rowExpected', { expected: '400' }) }));
      var share = at(t('ownerReport.textItem', { line: 'Fictional Partner A1 (row 10), ' + t('check.fields.supportPct') + ': ' + t('check.groups.rowFound', { found: '2.33' }) }));
      var close = at(t('ownerReport.closing'));
      a.ok(name < head && head < file && file < todo && todo < sum && sum < kind && kind < intro && intro < item && item < rev && rev < share && share < close, 'in order');
      a.ok(lines[intro].search(/\S/) > 0 && lines[item].search(/\S/) > 0 && lines[kind].search(/\S/) === 0, 'the intro and the items indented under the kind');
      a.equal(r.text.split('E30').length, 2, 'each item once');
      a.equal(trimmed.filter(function (l) { return l === t('importPanel.notePlain.emptySection.intro'); }).length, 1, 'the intro once');
      a.ok(r.text.indexOf('<') < 0 && r.text.indexOf('&amp;') < 0, 'plain text, nothing escaped');
    });

    T.test('X-owner-report-all', 'buildAll has a contents list of anchors within the file and every region as a section with its own heading, the kinds a level down', function (a) {
      var regions = [full(), region([], 'Region B')], r = TAP.ownerReport.buildAll(regions, { now: NOW }), doc = parse(r.html);
      a.equal(doc.title, t('ownerReport.allTitle'));
      a.equal(txt(qs('h1', doc)), t('ownerReport.allTitle'));
      var links = qsa('nav ol li a', doc);
      a.deepEqual(links.map(function (l) { return l.getAttribute('href'); }), ['#region-1', '#region-2'], 'anchors within the file');
      a.deepEqual(links.map(txt), [t('ownerReport.contentsItem', { region: 'Region A', count: t('ownerReport.ui.count', { n: 4 }) }), t('ownerReport.contentsItem', { region: 'Region B', count: t('ownerReport.ui.none') })], 'each region with its count');
      a.equal(txt(qs('nav h2', doc)), t('ownerReport.contents'));
      var secs = links.map(function (l) { return qs(l.getAttribute('href'), doc); });
      a.ok(secs[0] && secs[1] && secs[0].tagName === 'SECTION', 'every anchor lands on a section');
      a.deepEqual(secs.map(function (s) { return txt(qs('h2', s)); }), [t('ownerReport.title', { region: 'Region A' }), t('ownerReport.title', { region: 'Region B' })], 'a heading per region');
      a.equal(qsa('section.kind h3', secs[0]).length, 3, 'the kinds a level down');
      a.equal(qsa('section.kind h2', secs[0]).length, 0);
      a.equal(qsa('dl', doc).length, 2, 'facts per region');
      a.equal(txt(qs('.closing', secs[1])), t('ownerReport.none'), 'the empty region says so');
      a.ok(!URL_RE.test(r.html) && qsa('script, link, img', doc).length === 0, 'self-contained too');
      a.ok(r.text.indexOf(t('ownerReport.title', { region: 'Region A' })) > 0 && r.text.indexOf(t('ownerReport.title', { region: 'Region B' })) > 0, 'both regions in the text');
      a.equal(r.fileName, 'All workbooks data review 2026-10-15.html');
    });

    T.test('X-owner-report-filenames', 'File names carry the region and the date, year first, with unsafe characters replaced by one space', function (a) {
      a.equal(TAP.ownerReport.build(full(), { now: NOW }).fileName, 'Region A data review 2026-10-15.html');
      a.equal(TAP.ownerReport.build(region([], 'North/East: "A"?  <B>|C*'), { now: NOW }).fileName, 'North East A B C data review 2026-10-15.html');
      a.equal(TAP.ownerReport.build(region([], 'Région É'), { now: '2026-01-05T23:59:00Z' }).fileName, 'Région É data review 2026-01-05.html', 'letters with accents stay');
      a.match(TAP.ownerReport.build(full()).fileName, /^Region A data review \d{4}-\d{2}-\d{2}\.html$/, 'today when no date is given');
    });

    /* ---------- US-1.8.12 (D169): the cells behind both values, and a workbook left out ---------- */

    var R = '5. Recap › ';
    function cellNotes() {
      return [
        { message: 'Revenue 490 is above the order intake 480 for 2027, direct, newBusiness.', sheet: '5. Recap', cell: 'E30, E33', kind: 'revenueAbove', item: '2027, Direct, new business', found: 490, expected: 480, ref: '2027|direct|newBusiness',
          cells: { found: R + 'E30, E33', expected: ['4. Partner › E5', '4. Partner › E13'] } },
        { message: 'The variance is 25; books order intake minus the strategic plan gives 90.', sheet: '5. Recap', cell: 'I90', kind: 'variance', item: '2027, ARR', found: 25, expected: 90, ref: '2027|arr',
          cells: { found: R + 'I90', expected: ['E60', 'F60', 'G60', 'H60', 'E72', 'F72', 'G72', 'H72', 'E90'].map(function (c) { return R + c; }) } },
        { message: 'The Partner section is empty.', sheet: '4. Partner', cell: 'B10', kind: 'emptySection', item: 'Partner', found: null, expected: null, ref: 'partners' }
      ];
    }
    function cellRegion(extra) { return Object.assign(region(TAP.warningGroups.fromImport(cellNotes(), 'Region A')), extra || {}); }

    T.test('X-cells-owner-html', 'The page shows the address under the value found and every address under the value expected, not under Where; a note without cells keeps its address under Where', function (a) {
      var doc = parse(TAP.ownerReport.build(cellRegion(), { now: NOW }).html), secs = qsa('section.kind', doc);
      a.equal(secs.length, 3);
      a.deepEqual(qsa('td', qs('tbody tr', secs[0])).map(txt), ['2027, Direct, new business', '490 ' + R + 'E30, E33', '480 4. Partner › E5 and E13'], 'where, found with its cells, expected with its cells');
      a.equal(qsa('.cell', qs('tbody tr', secs[0])).length, 2, 'two address spans, under Found and Expected');
      a.equal(qsa('.cell', qsa('td', qs('tbody tr', secs[0]))[0]).length, 0, 'none under Where');
      a.equal(qsa('td', qs('tbody tr', secs[1])).map(txt)[2], '90 ' + R + 'E60, F60, G60, H60, E72, F72, G72, H72 and E90', 'every address, the sheet once: the owner goes to each one');
      a.deepEqual(qsa('td', qs('tbody tr', secs[2])).map(txt), ['Partner 4. Partner › B10'], 'without cells: the address under Where');
    });

    T.test('X-cells-owner-text', 'The text version writes each address in brackets after its value, and the found address no longer after the item', function (a) {
      var r = TAP.ownerReport.build(cellRegion(), { now: NOW }), trimmed = r.text.split('\n').map(function (l) { return l.trim(); });
      var line = function (s) { a.ok(trimmed.indexOf(t('ownerReport.textItem', { line: s })) >= 0, 'line: ' + s); };
      line('2027, Direct, new business: ' + t('check.groups.rowFound', { found: '490' }) + ' (' + R + 'E30, E33), ' + t('check.groups.rowExpected', { expected: '480' }) + ' (4. Partner › E5 and E13)');
      line('2027, ARR: ' + t('check.groups.rowFound', { found: '25' }) + ' (' + R + 'I90), ' + t('check.groups.rowExpected', { expected: '90' }) + ' (' + R + 'E60, F60, G60, H60, E72, F72, G72, H72 and E90)');
      line('Partner · 4. Partner › B10');
      a.equal(r.text.split('E30').length, 2, 'the found address once');
    });

    T.test('X-cells-owner-left-out', 'A workbook left out of the import says so in one sentence under the facts, its notes still listed; an imported one does not', function (a) {
      var r = TAP.ownerReport.build(cellRegion({ leftOut: true }), { now: NOW }), doc = parse(r.html), p = qs('.left-out', doc);
      a.ok(p, 'the sentence');
      a.equal(txt(p), t('ownerReport.leftOut'));
      a.ok(p.previousElementSibling && p.previousElementSibling.tagName === 'DL' && p.nextElementSibling.classList.contains('todo'), 'under the facts, before what to do');
      a.equal(qsa('section.kind', doc).length, 3, 'the notes still listed');
      var lines = r.text.split('\n'), i = lines.indexOf(t('ownerReport.leftOut'));
      a.ok(i > 0 && i < lines.indexOf(t('ownerReport.todo')), 'in the text, after the facts and before what to do');
      var ok = TAP.ownerReport.build(cellRegion(), { now: NOW });
      a.ok(!qs('.left-out', parse(ok.html)) && ok.text.indexOf(t('ownerReport.leftOut')) < 0, 'not otherwise');
      a.equal(qsa('.left-out', parse(TAP.ownerReport.buildAll([cellRegion({ leftOut: true }), cellRegion()], { now: NOW }).html)).length, 1, 'once on the all-workbooks page');
      a.ok(t('ownerReport.leftOut').indexOf('—') < 0, 'no em dash');
    });

    T.test('X-owner-report-download', 'download makes a text/html Blob of the page and hands its URL and file name to TAP.panelExport.download', function (a) {
      var saved = TAP.panelExport.download, savedUrl = URL.createObjectURL, calls = [], blobs = [];
      TAP.panelExport.download = function (url, name) { calls.push({ url: url, name: name }); };
      URL.createObjectURL = function (b) { blobs.push(b); return 'blob:test-' + blobs.length; };
      try {
        var r = TAP.ownerReport.build(full(), { now: NOW });
        a.equal(TAP.ownerReport.download(r), 'blob:test-1', 'the URL is returned');
      } finally { TAP.panelExport.download = saved; URL.createObjectURL = savedUrl; }
      a.equal(calls.length, 1, 'one download');
      a.deepEqual(calls[0], { url: 'blob:test-1', name: 'Region A data review 2026-10-15.html' });
      a.equal(blobs.length, 1);
      a.equal(blobs[0].type, 'text/html', 'an HTML blob');
      a.equal(blobs[0].size, new Blob([r.html]).size, 'holding the page');
    });
  });
})(window.TAP);
