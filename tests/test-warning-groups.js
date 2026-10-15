/*
 * File: tests/test-warning-groups.js
 * Purpose: Tests of the warning groups component (US-1.8.8, D161; US-1.8.9, D163, D164): the check's warnings grouped by
 *          workbook, then by kind, and the import's notes grouped by kind, each group a table of where, found and expected
 *          in plain words, as both panels and the copied report show them.
 * Provides: test cases TPV-TC-877 to TPV-TC-885, TPV-TC-900, TPV-TC-901, TPV-TC-902, TPV-TC-903, TPV-TC-904
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts (TAP.warningGroups, TAP.warningTable, TAP.importWrite, TAP.content)
 * Used by: tests.html
 * Owner: WARN stream (#605), NOTES2 stream (#612)
 */
(function (TAP) {
  'use strict';

  var qs = function (sel, root) { return root.querySelector(sel); };
  var qsa = function (sel, root) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  var t = function (key, vars) { return TAP.content.text(key, vars); };
  function click(node) { node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
  function px(node) { return parseFloat(getComputedStyle(node).fontSize); }

  // A warning as TAP.check.run raises it, with the technical message the copied report keeps
  function w(region, kind, field, item, expected, found, path, vars) {
    return { path: path, region: region, item: item, field: field, kind: kind, expected: expected, found: found, vars: vars || null,
      message: path + ': expected ' + expected + ', found ' + (typeof found === 'string' ? found : JSON.stringify(found)) };
  }
  var SHARE = 'a share written as a decimal, for example 0.25 for 25%';
  function set() {
    return [
      w('Region A', 'share', 'supportPct', 'Fictional Partner A1 (row 10)', SHARE, 2.33, 'regions[0].partners[0].supportPct[0]'),
      w('Region A', 'partnerChannel', 'channel', 'Fictional Partner A2 (row 11)', 'a channel for this partner (left blank, so it is shown under "Channel not provided")', null, 'regions[0].partners[1].channel'),
      w('Region A', 'share', 'hitRate', 'Healthcare (row 20)', SHARE, 25, 'regions[0].newBusiness[0].hitRate'),
      w('Region A', 'tier3Row', 'tier', 'Retail (row 21)', 'a Tier 1 or Tier 2 industry (the template has no New Business rows for Tier 3; this row is kept and counted)', 3, 'regions[0].newBusiness[1].tier'),
      w('Region B', 'items', 'partners', null, 'at least one item', 'an empty list', 'regions[1].partners'),
      w(null, 'sourceMap', 'partners', null, 'the template map: a sheet and its columns for each section', 'nothing', 'meta.sourceMap.partners')
    ];
  }
  var FILES = { 'Region A': 'Region A plan.xlsx', 'Region B': 'Region B plan.xlsx' };
  var LOOKUPS = { channels: [{ id: 'direct', name: 'Direct' }, { id: 'partner', name: 'Partner' }], segments: [{ id: 'core', name: 'Core' }, { id: 'growth', name: 'Growth' }] };
  function render(list, opts) {
    var host = T.dom.mount(), node = TAP.warningGroups.render(list, Object.assign({ files: FILES, lookups: LOOKUPS }, opts || {}));
    if (node) host.appendChild(node);
    return { host: host, node: node };
  }
  function renderKinds(items, opts) {
    var host = T.dom.mount(), node = TAP.warningGroups.renderKinds(items, Object.assign({ lookups: LOOKUPS }, opts || {}));
    if (node) host.appendChild(node);
    return { host: host, node: node };
  }
  function books(root) { return qsa('details.tap-wg', root); }
  function kinds(book) { return qsa('details.tap-wg__kind', book); }
  function summary(d) { return txt(qs(':scope > summary', d)); }
  function rows(root) { return qsa('tbody tr', root); }
  function heads(d) { return qsa('th', d).map(txt); }
  function title(kind, n) { return t('check.plain.' + kind + '.title') + ' (' + n + ')'; }
  var COLS = { where: t('check.groups.colWhere'), found: t('check.groups.colFound'), expected: t('check.groups.colExpected') };

  // The kinds the check can raise, as issue #605 lists them, every one with plain wording
  var KINDS = ['share', 'partnerChannel', 'tier3Row', 'items', 'revenueWithin', 'booksWithin', 'coverage', 'variance', 'splitSum',
    'arrFormula', 'segmentRule', 'sourceRow', 'sourceCell', 'uniqueRow', 'uniqueRecap', 'oneItem', 'yearMonth', 'isoDate', 'sourceMap',
    'unrated', 'notNegative', 'mcTier'];
  var EXTRA_KINDS = ['list', 'section', 'id', 'title', 'intro', 'columns', 'column', 'key', 'label', 'unit', 'kind', 'letter', 'extra',
    'known', 'rows', 'row', 'rowKey', 'uniqueRow', 'number', 'text', 'sourceRow'].map(function (k) { return 'extra.' + k; });
  // The kinds the import's notes carry (D163), every one with a plain title and intro
  var NOTE_KINDS = ['emptySection', 'splitSum', 'arrFormula', 'segmentRule', 'variance', 'revenueAbove', 'booksAbove', 'coverage', 'badValue',
    'errorCell', 'formulaNoValue', 'unknownIndustry', 'tierDiffers', 'looseSheet', 'unmatchedWorkbook', 'missingSheet', 'missingIndustries',
    'headerMismatch', 'filterMismatch', 'duplicateRegion', 'unreadable'];

  // Import notes as TAP.importRegion.read writes them (D163)
  function notes() {
    return [
      { message: 'The Customer Growth section is empty.', sheet: '3. Customer Growth', cell: 'C10', kind: 'emptySection', item: 'Customer Growth', found: null, expected: null },
      { message: 'The Partner section is empty.', sheet: '4. Partner', cell: 'B10', kind: 'emptySection', item: 'Partner', found: null, expected: null },
      { message: 'Revenue 450 is above the order intake 400 for 2027, direct, customerGrowth, arr.', sheet: '5. Recap', cell: 'E30', kind: 'revenueAbove', item: '2027, Direct, existing customers, ARR', found: 450, expected: 400 },
      { message: 'growthPotential: the value "Great" was not recognized and is left blank.', sheet: '1. Market Coverage', cell: 'D11', kind: 'badValue', item: 'Retail, growth potential', found: '"Great"', expected: null }
    ];
  }

  T.suite('warning-groups', function () {
    T.test('TPV-TC-877', 'One group per workbook in the order the warnings come, the whole file last; one group per kind inside, first seen first; counts in every summary', function (a) {
      var r = render(set()), b = books(r.host);
      a.equal(b.length, 3, 'three workbook groups');
      a.deepEqual(b.map(function (d) { return d.getAttribute('data-region'); }), ['Region A', 'Region B', ''], 'the regions, the whole file last');
      a.equal(summary(b[0]), 'Region A · Region A plan.xlsx: 4 warnings', 'region, file and count');
      a.equal(summary(b[1]), 'Region B · Region B plan.xlsx: 1 warning', 'singular');
      a.equal(summary(b[2]), t('check.groups.wholeFile') + ': 1 warning', 'the warnings about the file as a whole');
      var k = kinds(b[0]);
      a.deepEqual(k.map(function (d) { return d.getAttribute('data-kind'); }), ['share', 'partnerChannel', 'tier3Row'], 'kinds in first-seen order');
      a.deepEqual(k.map(summary), [title('share', 2), title('partnerChannel', 1), title('tier3Row', 1)], 'plain titles with counts');
      a.deepEqual(k.map(function (d) { return rows(d).length; }), [2, 1, 1], 'one table row per warning');
      a.equal(kinds(b[2])[0].getAttribute('data-kind'), 'sourceMap');
    });

    T.test('TPV-TC-878', 'A workbook group is open when it holds three warnings or fewer, else closed; the limit can be set', function (a) {
      var r = render(set()), b = books(r.host);
      a.deepEqual(b.map(function (d) { return d.open; }), [false, true, true], 'four closed, one open, one open');
      a.ok(kinds(b[0]).every(function (d) { return d.open; }), 'kind groups of three or fewer open too');
      var r2 = render(set(), { openUpTo: 4 });
      a.deepEqual(books(r2.host).map(function (d) { return d.open; }), [true, true, true], 'with a limit of four every group opens');
      var r3 = render(set(), { openUpTo: 0 });
      a.deepEqual(books(r3.host).map(function (d) { return d.open; }), [false, false, false], 'with a limit of zero none opens');
    });

    T.test('TPV-TC-879', 'Each row names the row or cell in words and the field, with the value found in its own column, never the data path; the intro once per group', function (a) {
      var r = render(set()), b = books(r.host), share = kinds(b[0])[0], cells = rows(share).map(function (tr) { return qsa('td', tr).map(txt); });
      a.deepEqual(heads(share), [COLS.where, COLS.found], 'Where and Found: the share check carries no figure');
      a.equal(cells[0][0], 'Fictional Partner A1 (row 10), ' + t('check.fields.supportPct'), 'the row and the field in words');
      a.equal(cells[0][1], '2.33', 'the value found');
      a.equal(cells[1][0], 'Healthcare (row 20), ' + t('check.fields.hitRate'));
      a.equal(qsa('.tap-wg__intro', share).length, 1, 'the intro once');
      a.equal(txt(qs('.tap-wg__intro', share)), t('check.plain.share.intro'), 'the sentence that explains the kind');
      var partner = kinds(b[0])[1];
      a.deepEqual(heads(partner), [COLS.where], 'a kind without found or expected has the Where column alone');
      a.equal(txt(qs('td', partner)), 'Fictional Partner A2 (row 11)');
      a.ok(txt(qs('.tap-wg__intro', partner)).indexOf('Channel not provided') >= 0, 'the intro says where the partner is shown');
      a.ok(txt(qs('.tap-wg__intro', kinds(b[0])[2])).indexOf('kept and counted') >= 0, 'the Tier 3 intro says the row is kept');
      a.equal(txt(qs('td', b[1])), t('check.fields.partners'), 'an empty section names the section in words');
      var all = txt(r.host);
      a.ok(all.indexOf('regions[') < 0, 'no data path on screen');
      a.ok(all.indexOf('meta.') < 0 && all.indexOf('sourceMap') < 0, 'no key path on screen');
      a.ok(all.indexOf('[check.') < 0 && all.indexOf('{') < 0, 'no missing wording and no unfilled placeholder');
    });

    T.test('TPV-TC-880', 'Expand all and Collapse all show with more than one workbook group and toggle every group', function (a) {
      var r = render(set()), btns = qsa('.tap-wg__tools .tap-btn', r.host);
      a.equal(btns.length, 2, 'two buttons');
      a.deepEqual(btns.map(txt), [t('check.groups.expand'), t('check.groups.collapse')]);
      click(btns[0]);
      a.ok(qsa('details', r.host).every(function (d) { return d.open; }), 'every group open');
      click(btns[1]);
      a.ok(qsa('details', r.host).every(function (d) { return !d.open; }), 'every group closed');
      var one = render(set().slice(0, 4));
      a.equal(qsa('.tap-wg__tools', one.host).length, 0, 'no buttons for a single workbook');
    });

    T.test('TPV-TC-881', 'A kind without wording falls back to the expected sentence as its title, no intro, and the row with the value found', function (a) {
      var r = render([w('Region A', 'mystery', null, 'Row X', 'something else', 7, 'regions[0].x')]), k = kinds(books(r.host)[0])[0];
      a.equal(summary(k), 'something else (1)');
      a.equal(qsa('.tap-wg__intro', k).length, 0, 'no intro');
      a.deepEqual(rows(k).map(function (tr) { return qsa('td', tr).map(txt); }), [['Row X', '7']]);
      // A note with no kind and no expected sentence (an older entry) still reads: its message is the title
      var r2 = render([{ path: 'regions[1].partners', region: 'Region B', item: null, expected: '', found: '', message: 'No partners are listed.' }]);
      a.equal(summary(kinds(books(r2.host)[0])[0]), 'No partners are listed. (1)');
    });

    T.test('TPV-TC-882', 'No warnings, no element', function (a) {
      a.equal(TAP.warningGroups.render([], {}), null);
      a.equal(TAP.warningGroups.render(null), null);
      a.equal(TAP.warningGroups.renderKinds([], {}), null);
    });

    T.test('TPV-TC-883', 'Every kind the check raises and every note kind has a plain title and intro, with no em dash', function (a) {
      KINDS.concat(EXTRA_KINDS).forEach(function (k) {
        var title = t('check.plain.' + k + '.title'), intro = t('check.plain.' + k + '.intro');
        a.ok(title.charAt(0) !== '[' && title.length > 3, k + ': a title (' + title + ')');
        a.ok(intro.charAt(0) !== '[' && intro.length > 3, k + ': an intro (' + intro + ')');
        a.ok((title + intro).indexOf('—') < 0, k + ': no em dash');
      });
      NOTE_KINDS.forEach(function (k) {
        var title = t('importPanel.notePlain.' + k + '.title'), intro = t('importPanel.notePlain.' + k + '.intro');
        a.ok(title.charAt(0) !== '[' && title.length > 3, k + ': a note title (' + title + ')');
        a.ok(intro.charAt(0) !== '[' && intro.length > 3, k + ': a note intro (' + intro + ')');
        a.ok((title + intro).indexOf('—') < 0, k + ': no em dash');
      });
      a.ok(t('check.plain.fallback.found', { found: 'x' }).indexOf('x') >= 0, 'the fallback line carries the value');
    });

    T.test('TPV-TC-884', 'Summaries, intros and table cells are body text, 16 px and up, and the disclosure marker shows (D24)', function (a) {
      var r = render(set());
      click(qsa('.tap-wg__tools .tap-btn', r.host)[0]);
      qsa('summary, .tap-wg__intro, th, td', r.host).forEach(function (n) { a.ok(px(n) >= 16, n.tagName + ': ' + px(n) + ' px'); });
      qsa('summary', r.host).forEach(function (n) { a.ok(getComputedStyle(n).display !== 'none', 'the summary shows'); });
    });

    T.test('TPV-TC-885', 'The copied report groups the warnings by workbook then kind, the intro once, each plain row followed by its technical message', function (a) {
      var result = { mapProblems: [], missing: [], regions: [
        { ok: true, id: 'alpha', name: 'Region A', fileName: 'Region A plan.xlsx', region: { source: {} }, parts: {}, errors: [], notes: [] },
        { ok: true, id: 'bravo', name: 'Region B', fileName: 'Region B plan.xlsx', region: { source: {} }, parts: {}, errors: [], notes: [] }
      ], check: { errors: [], warnings: set() }, usable: true };
      var text = TAP.importWrite.report(result), lines = text.split('\n');
      var at = function (s) { var i = lines.map(function (l) { return l.trim(); }).indexOf(s); a.ok(i >= 0, 'line: ' + s); return i; };
      var head = at(t('importPanel.check.report.checkWarnings', { n: 6 }));
      var bookA = at('Region A · Region A plan.xlsx (4)'), kindA = at(title('share', 2)), intro = at(t('check.plain.share.intro'));
      var plain = at(TAP.warningGroups.line(set()[0])), tech = at(set()[0].message);
      var bookB = at('Region B · Region B plan.xlsx (1)'), whole = at(t('check.groups.wholeFile') + ' (1)');
      a.ok(head < bookA && bookA < kindA && kindA < intro && intro < plain && plain < tech && tech < bookB && bookB < whole, 'in order: heading, workbook, kind, intro, plain line, technical line, next workbook, the whole file');
      a.ok(/^\s{4,}\S/.test(lines[tech]) && lines[tech].search(/\S/) > lines[plain].search(/\S/), 'the technical line indented under the plain line');
      a.ok(lines[plain].search(/\S/) > lines[kindA].search(/\S/) && lines[kindA].search(/\S/) > lines[bookA].search(/\S/), 'kind under workbook, line under kind');
      a.equal(lines.filter(function (l) { return l.trim() === t('check.plain.share.intro'); }).length, 1, 'the intro once for two share warnings');
      a.equal(lines[plain].trim(), 'Fictional Partner A1 (row 10), ' + t('check.fields.supportPct') + ', ' + t('check.groups.rowFound', { found: '2.33' }), 'the plain row: where, found');
    });

    /* ---------- US-1.8.9 (D163, D164): import notes by kind, tables inside every group ---------- */

    T.test('TPV-TC-900', 'fromImport and fromCheck normalize to the same shape: region, kind, title, intro, where, cell, found, expected, tech', function (a) {
      var W = TAP.warningGroups, keys = ['region', 'kind', 'title', 'intro', 'where', 'cell', 'found', 'expected', 'tech'];
      var ni = W.fromImport(notes(), 'Region A'), ci = W.fromCheck(set(), { lookups: LOOKUPS });
      a.equal(ni.length, 4);
      a.equal(ci.length, 6);
      ni.concat(ci).forEach(function (it) { a.deepEqual(Object.keys(it).sort(), keys.slice().sort(), 'the keys of ' + it.tech); });
      a.deepEqual(ni[0], { region: 'Region A', kind: 'emptySection', title: t('importPanel.notePlain.emptySection.title'), intro: t('importPanel.notePlain.emptySection.intro'),
        where: 'Customer Growth', cell: '3. Customer Growth › C10', found: '', expected: '', tech: 'The Customer Growth section is empty.' }, 'an import note: the item, the address, the message as tech');
      a.deepEqual(ni[2].found + '|' + ni[2].expected + '|' + ni[2].where, '450|400|2027, Direct, existing customers, ARR', 'found and expected as text, the item as the site wrote it');
      a.deepEqual(ci[4], { region: 'Region B', kind: 'items', title: t('check.plain.items.title'), intro: t('check.plain.items.intro'),
        where: t('check.fields.partners'), cell: '', found: '', expected: '', tech: set()[4].message }, 'a check warning: no address, the field in words');
      a.equal(ci[5].region, null, 'a warning about the whole file has no region');
      a.deepEqual(W.normalize(set(), { lookups: LOOKUPS }), ci, 'normalize takes raw warnings');
      a.deepEqual(W.normalize(ni), ni, 'and leaves normalized items alone');
    });

    T.test('TPV-TC-901', 'renderKinds makes one details per kind with the count, the intro once, a table with only the filled columns, closed above three', function (a) {
      var r = renderKinds(TAP.warningGroups.fromImport(notes(), 'Region A')), k = qsa('details.tap-wg__kind', r.host);
      a.equal(qsa('details.tap-wg', r.host).length, 0, 'no workbook level');
      a.deepEqual(k.map(function (d) { return d.getAttribute('data-kind'); }), ['emptySection', 'revenueAbove', 'badValue'], 'kinds in first-seen order');
      a.deepEqual(k.map(summary), [t('importPanel.notePlain.emptySection.title') + ' (2)', t('importPanel.notePlain.revenueAbove.title') + ' (1)', t('importPanel.notePlain.badValue.title') + ' (1)']);
      a.ok(k.every(function (d) { return d.open; }), 'open: three or fewer each');
      a.deepEqual(k.map(function (d) { return qsa('.tap-wg__intro', d).length; }), [1, 1, 1], 'the intro once per group');
      a.equal(txt(qs('.tap-wg__intro', k[1])), t('importPanel.notePlain.revenueAbove.intro'));
      a.deepEqual(heads(k[0]), [COLS.where], 'empty sections: Where alone');
      a.deepEqual(heads(k[1]), [COLS.where, COLS.found, COLS.expected], 'revenue: all three');
      a.deepEqual(heads(k[2]), [COLS.where, COLS.found], 'a bad value: no expected');
      a.deepEqual(rows(k[0]).map(function (tr) { return txt(qs('.tap-wg__where > span', tr)); }), ['Customer Growth', 'Partner'], 'the sections in words');
      a.deepEqual(rows(k[0]).map(function (tr) { return txt(qs('.tap-wg__cell', tr)); }), ['3. Customer Growth › C10', '4. Partner › B10'], 'sheet › cell under each row');
      a.deepEqual(qsa('td', rows(k[1])[0]).map(txt), ['2027, Direct, existing customers, ARR 5. Recap › E30', '450', '400'], 'where with its address, found, expected');
      a.equal(qs('table', k[1]).getAttribute('aria-label'), t('importPanel.notePlain.revenueAbove.title'), 'the table is named after the group');
      a.ok(qs('table', k[1]).classList.contains('tap-table') && qs('table', k[1]).classList.contains('tap-wg__table'));
      var all = txt(r.host);
      a.ok(all.indexOf('regions[') < 0 && all.indexOf('customerGrowth, arr') < 0 && all.indexOf('[importPanel') < 0, 'no raw path, raw key or missing wording: ' + all.slice(0, 120));
      var many = renderKinds(TAP.warningGroups.fromImport(notes().concat(notes()), 'Region A'));
      a.equal(qsa('details.tap-wg__kind[data-kind="emptySection"]', many.host)[0].open, false, 'four empty-section notes: closed');
      a.equal(qsa('details.tap-wg__kind[data-kind="emptySection"]', renderKinds(TAP.warningGroups.fromImport(notes().concat(notes()), 'Region A'), { openUpTo: 4 }).host)[0].open, true, 'the limit can be set');
    });

    T.test('TPV-TC-902', 'Ids inside a warning’s item or figures read as labels: channels by lookup name, motions and types in words, segments by name, nothing quoted', function (a) {
      var list = [
        w('Region A', 'revenueWithin', null, '2027, direct, customerGrowth', 'revenue no higher than the order intake for 2027, direct, customerGrowth (400)', 450, 'regions[0].revenue.x', { key: '2027, direct, customerGrowth', value: 400 }),
        w('Region A', 'segmentRule', 'segment', 'Fictional Account 2 (row 11)', 'the segment the thresholds give ("core")', 'growth', 'regions[0].customerGrowth.accounts[1].segment', { segment: '"core"' }),
        w('Region A', 'oneItem', null, 'cell E5', 'one item for each year, channel, motion and type', 'a second item for 2027, partner, newBusiness, arr', 'regions[0].revenue[3]', { what: 'year, channel, motion and type' })
      ];
      var r = render(list), k = kinds(books(r.host)[0]);
      a.deepEqual(qsa('td', rows(k[0])[0]).map(txt), ['2027, Direct, existing customers', '450', '400'], 'the recap key in words, found, then the order intake from vars.value');
      a.deepEqual(qsa('td', rows(k[1])[0]).map(txt), ['Fictional Account 2 (row 11)', 'Growth', 'Core'], 'segments by their lookup names, the quotes gone');
      a.equal(qsa('td', rows(k[2])[0]).map(txt)[1], 'a second item for 2027, Partner, new business, ARR', 'ids inside the value found labelled too');
      var all = txt(r.host);
      a.ok(all.indexOf('customerGrowth') < 0 && all.indexOf('newBusiness') < 0 && all.indexOf('"core"') < 0, 'no raw id on screen: ' + all.slice(0, 160));
      // Without lookups at hand, the fixed channel ids still read as words
      var bare = TAP.warningGroups.fromCheck(list.slice(0, 1), { lookups: {} })[0];
      a.equal(bare.where, '2027, ' + t('importPanel.words.channels.direct') + ', ' + t('importPanel.words.motions.customerGrowth'));
    });

    T.test('TPV-TC-903', 'A note without a kind (an older data file) groups by its message, with the address alone and no found or expected column', function (a) {
      var old = [{ message: 'The Customer Growth section is empty.', sheet: '3. Customer Growth', cell: 'A10' }, { message: 'The Customer Growth section is empty.', sheet: '4. Partner', cell: null }];
      var r = renderKinds(TAP.warningGroups.fromImport(old, 'Region C')), k = qsa('details.tap-wg__kind', r.host);
      a.equal(k.length, 1, 'one group for the two notes of one message');
      a.equal(k[0].getAttribute('data-kind'), '', 'no kind');
      a.equal(summary(k[0]), 'The Customer Growth section is empty. (2)', 'the message as the title');
      a.equal(qsa('.tap-wg__intro', k[0]).length, 0, 'no intro');
      a.deepEqual(heads(k[0]), [COLS.where], 'the Where column alone');
      a.deepEqual(rows(k[0]).map(function (tr) { return txt(qs('.tap-wg__cell', tr)); }), ['3. Customer Growth › A10', '4. Partner'], 'the address, the sheet alone when there is no cell');
      a.equal(TAP.warningGroups.row(TAP.warningGroups.fromImport(old, 'Region C')[0]), '3. Customer Growth › A10', 'the text row is the address');
      // A kind with no wording yet keeps its columns and groups by kind
      var fresh = TAP.warningGroups.fromImport([{ message: 'Something new.', sheet: 'S', cell: 'A1', kind: 'brandNew', item: 'Row 1', found: 1, expected: 2 }], 'Region C')[0];
      a.deepEqual([fresh.kind, fresh.title, fresh.intro, fresh.where, fresh.found, fresh.expected], ['brandNew', 'Something new.', '', 'Row 1', '1', '2']);
    });

    T.test('TPV-TC-904', 'In a kind group every summary, intro, heading, cell and address is body text, 16 px and up, and the table has no fixed width (D24)', function (a) {
      var r = renderKinds(TAP.warningGroups.fromImport(notes(), 'Region A'));
      var nodes = qsa('summary, .tap-wg__intro, th, td, .tap-wg__cell', r.host);
      a.ok(nodes.length >= 12, 'nodes measured: ' + nodes.length);
      nodes.forEach(function (n) { a.ok(px(n) >= 16, n.tagName + '.' + n.className + ': ' + px(n) + ' px'); });
      qsa('table', r.host).forEach(function (tb) {
        var cs = getComputedStyle(tb);
        a.equal(cs.tableLayout, 'auto', 'auto layout, so the Where column wraps');
        a.ok(tb.getBoundingClientRect().width <= r.host.getBoundingClientRect().width + 1, 'the table stays within its host: ' + tb.getBoundingClientRect().width + ' of ' + r.host.getBoundingClientRect().width);
      });
      qsa('td', r.host).forEach(function (td) { a.equal(getComputedStyle(td).overflowWrap, 'anywhere', 'cells wrap anywhere'); });
    });
  });
})(window.TAP);
