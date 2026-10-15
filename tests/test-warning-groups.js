/*
 * File: tests/test-warning-groups.js
 * Purpose: Tests of the warning groups component (US-1.8.8, D161): the check's warnings grouped by workbook, then by
 *          kind, in plain words, as both panels and the copied report show them.
 * Provides: test cases X-warn-groups-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts (TAP.warningGroups, TAP.importWrite, TAP.content)
 * Used by: tests.html
 * Owner: WARN stream (#605)
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
  function w(region, kind, field, item, expected, found, path) {
    return { path: path, region: region, item: item, field: field, kind: kind, expected: expected, found: found,
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
  function render(list, opts) {
    var host = T.dom.mount(), node = TAP.warningGroups.render(list, Object.assign({ files: FILES }, opts || {}));
    if (node) host.appendChild(node);
    return { host: host, node: node };
  }
  function books(root) { return qsa('details.tap-wg', root); }
  function kinds(book) { return qsa('details.tap-wg__kind', book); }
  function summary(d) { return txt(qs(':scope > summary', d)); }
  function title(kind, n) { return t('check.plain.' + kind + '.title') + ' (' + n + ')'; }

  // The kinds the check can raise, as issue #605 lists them, every one with plain wording
  var KINDS = ['share', 'partnerChannel', 'tier3Row', 'items', 'revenueWithin', 'booksWithin', 'coverage', 'variance', 'splitSum',
    'arrFormula', 'segmentRule', 'sourceRow', 'sourceCell', 'uniqueRow', 'uniqueRecap', 'oneItem', 'yearMonth', 'isoDate', 'sourceMap',
    'unrated', 'notNegative', 'mcTier'];
  var EXTRA_KINDS = ['list', 'section', 'id', 'title', 'intro', 'columns', 'column', 'key', 'label', 'unit', 'kind', 'letter', 'extra',
    'known', 'rows', 'row', 'rowKey', 'uniqueRow', 'number', 'text', 'sourceRow'].map(function (k) { return 'extra.' + k; });

  T.suite('warning-groups', function () {
    T.test('X-warn-groups-structure', 'One group per workbook in the order the warnings come, the whole file last; one group per kind inside, first seen first; counts in every summary', function (a) {
      var r = render(set()), b = books(r.host);
      a.equal(b.length, 3, 'three workbook groups');
      a.deepEqual(b.map(function (d) { return d.getAttribute('data-region'); }), ['Region A', 'Region B', ''], 'the regions, the whole file last');
      a.equal(summary(b[0]), 'Region A · Region A plan.xlsx: 4 warnings', 'region, file and count');
      a.equal(summary(b[1]), 'Region B · Region B plan.xlsx: 1 warning', 'singular');
      a.equal(summary(b[2]), t('check.groups.wholeFile') + ': 1 warning', 'the warnings about the file as a whole');
      var k = kinds(b[0]);
      a.deepEqual(k.map(function (d) { return d.getAttribute('data-kind'); }), ['share', 'partnerChannel', 'tier3Row'], 'kinds in first-seen order');
      a.deepEqual(k.map(summary), [title('share', 2), title('partnerChannel', 1), title('tier3Row', 1)], 'plain titles with counts');
      a.deepEqual(k.map(function (d) { return qsa('li', d).length; }), [2, 1, 1], 'one line per warning');
      a.equal(kinds(b[2])[0].getAttribute('data-kind'), 'sourceMap');
    });

    T.test('X-warn-groups-open', 'A workbook group is open when it holds three warnings or fewer, else closed; the limit can be set', function (a) {
      var r = render(set()), b = books(r.host);
      a.deepEqual(b.map(function (d) { return d.open; }), [false, true, true], 'four closed, one open, one open');
      a.ok(kinds(b[0]).every(function (d) { return d.open; }), 'kind groups of three or fewer open too');
      var r2 = render(set(), { openUpTo: 4 });
      a.deepEqual(books(r2.host).map(function (d) { return d.open; }), [true, true, true], 'with a limit of four every group opens');
      var r3 = render(set(), { openUpTo: 0 });
      a.deepEqual(books(r3.host).map(function (d) { return d.open; }), [false, false, false], 'with a limit of zero none opens');
    });

    T.test('X-warn-groups-lines', 'Each line names the row or cell in words, the field and the value found, never the data path', function (a) {
      var r = render(set()), b = books(r.host), lines = qsa('li', b[0]).map(txt);
      a.ok(lines[0].indexOf('Fictional Partner A1 (row 10)') >= 0, 'the row in words: ' + lines[0]);
      a.ok(lines[0].indexOf(t('check.fields.supportPct')) >= 0, 'the field in words: ' + lines[0]);
      a.ok(lines[0].indexOf('2.33') >= 0, 'the value found: ' + lines[0]);
      a.ok(lines[1].indexOf('Channel not provided') >= 0, 'the partner line says where it is shown: ' + lines[1]);
      a.ok(lines[3].indexOf('kept and counted') >= 0, 'the Tier 3 line says the row is kept: ' + lines[3]);
      a.equal(txt(qs('li', b[1])), t('check.plain.items.line', { field: t('check.fields.partners') }), 'an empty section names the section in words');
      var all = txt(r.host);
      a.ok(all.indexOf('regions[') < 0, 'no data path on screen');
      a.ok(all.indexOf('meta.') < 0 && all.indexOf('sourceMap') < 0, 'no key path on screen');
      a.ok(all.indexOf('[check.') < 0 && all.indexOf('{') < 0, 'no missing wording and no unfilled placeholder');
    });

    T.test('X-warn-groups-expand', 'Expand all and Collapse all show with more than one workbook group and toggle every group', function (a) {
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

    T.test('X-warn-groups-fallback', 'A kind without wording falls back to the expected sentence as its title and the value found as its line', function (a) {
      var r = render([w('Region A', 'mystery', 'x', 'Row X', 'something else', 7, 'regions[0].x')]);
      a.equal(summary(kinds(books(r.host)[0])[0]), 'something else (1)');
      a.equal(txt(qs('li', r.host)), 'Row X: ' + t('check.plain.fallback.found', { found: '7' }));
      // A note with no kind and no expected sentence (an older entry) still reads: its message is the title
      var r2 = render([{ path: 'regions[1].partners', region: 'Region B', item: null, expected: '', found: '', message: 'No partners are listed.' }]);
      a.equal(summary(kinds(books(r2.host)[0])[0]), 'No partners are listed. (1)');
    });

    T.test('X-warn-groups-empty', 'No warnings, no element', function (a) {
      a.equal(TAP.warningGroups.render([], {}), null);
      a.equal(TAP.warningGroups.render(null), null);
    });

    T.test('X-warn-groups-wording', 'Every kind the check raises has a plain title and line, with no em dash', function (a) {
      KINDS.concat(EXTRA_KINDS).forEach(function (k) {
        var title = t('check.plain.' + k + '.title'), line = t('check.plain.' + k + '.line');
        a.ok(title.charAt(0) !== '[' && title.length > 3, k + ': a title (' + title + ')');
        a.ok(line.charAt(0) !== '[' && line.length > 3, k + ': a line (' + line + ')');
        a.ok((title + line).indexOf('—') < 0, k + ': no em dash');
      });
      a.ok(t('check.plain.fallback.found', { found: 'x' }).indexOf('x') >= 0, 'the fallback line carries the value');
    });

    T.test('X-warn-groups-size', 'Summaries and lines are body text, 16 px and up, and the disclosure marker shows (D24)', function (a) {
      var r = render(set());
      click(qsa('.tap-wg__tools .tap-btn', r.host)[0]);
      qsa('summary, li', r.host).forEach(function (n) { a.ok(px(n) >= 16, n.tagName + ': ' + px(n) + ' px'); });
      qsa('summary', r.host).forEach(function (n) { a.ok(getComputedStyle(n).display !== 'none', 'the summary shows'); });
    });

    T.test('X-warn-groups-report', 'The copied report groups the warnings by workbook then kind, each plain line followed by its technical message', function (a) {
      var result = { mapProblems: [], missing: [], regions: [
        { ok: true, id: 'alpha', name: 'Region A', fileName: 'Region A plan.xlsx', region: { source: {} }, parts: {}, errors: [], notes: [] },
        { ok: true, id: 'bravo', name: 'Region B', fileName: 'Region B plan.xlsx', region: { source: {} }, parts: {}, errors: [], notes: [] }
      ], check: { errors: [], warnings: set() }, usable: true };
      var text = TAP.importWrite.report(result), lines = text.split('\n');
      var at = function (s) { var i = lines.map(function (l) { return l.trim(); }).indexOf(s); a.ok(i >= 0, 'line: ' + s); return i; };
      var head = at(t('importPanel.check.report.checkWarnings', { n: 6 }));
      var bookA = at('Region A · Region A plan.xlsx (4)'), kindA = at(title('share', 2));
      var plain = at(TAP.warningGroups.line(set()[0])), tech = at(set()[0].message);
      var bookB = at('Region B · Region B plan.xlsx (1)'), whole = at(t('check.groups.wholeFile') + ' (1)');
      a.ok(head < bookA && bookA < kindA && kindA < plain && plain < tech && tech < bookB && bookB < whole, 'in order: heading, workbook, kind, plain line, technical line, next workbook, the whole file');
      a.ok(/^\s{4,}\S/.test(lines[tech]) && lines[tech].search(/\S/) > lines[plain].search(/\S/), 'the technical line indented under the plain line');
      a.ok(lines[plain].search(/\S/) > lines[kindA].search(/\S/) && lines[kindA].search(/\S/) > lines[bookA].search(/\S/), 'kind under workbook, line under kind');
    });
  });
})(window.TAP);
