/*
 * File: tests/test-rows.js
 * Purpose: Tests for row figures (TAP.rows) and the list builder, checked against the mini fixture by hand.
 * Provides: test cases TPV-TC-281 to 283, 285 to 287, 289, 292, X-rows-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: ENGINE2 stream
 *
 * Three-year incremental ARR per account in mini (by hand): a1 50, a2 100, a3 0, a4 150, b1 120, b2 30,
 * d1 80 + 88 = 168, d2 100, d3 0. Region C has no accounts.
 */
(function (TAP) {
  'use strict';

  var TOL = 1e-9;
  var BY_INCR_DESC = ['delta:10', 'alpha:13', 'bravo:10', 'alpha:11', 'delta:11', 'alpha:10', 'bravo:11', 'alpha:12', 'delta:12'];

  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c); }
  function def(extra) {
    return Object.assign({ id: 'x-list', view: 'customers', title: 'Accounts', explain: { shows: 's', read: 'r', lookFor: 'l' },
      shape: 'list', defaultType: 'list', types: ['list'], rows: 'accounts',
      columns: [{ key: 'region' }, { key: 'name' }, { key: 'segment' }, { key: 'incr3', label: '3-year incremental ARR' }],
      sort: { key: 'incr3', dir: 'desc' }, filter: [{ key: 'industry' }], sources: ['PRE', 'DER'], breakdowns: [], options: {} }, extra || {});
  }
  function build(d, ctx) {
    return TAP.builders.get('list')(Object.assign({ def: d, type: 'list', cmp: cmp({ mode: 'all' }), opts: {} }, ctx || {}));
  }
  function ids(res) { return res.table.rows.map(function (r) { return r.id; }); }
  function html(res) { var box = document.createElement('div'); TAP.dom.html(box, res.html); return box; }

  T.suite('rows', function () {
    T.test('TPV-TC-281', 'A list definition validates; without columns it fails clearly', function (a) {
      a.deepEqual(TAP.reports.validate(def()), [], 'a list with rows and columns is valid');
      var errs = TAP.reports.validate(def({ columns: [] }));
      a.ok(errs.length >= 1);
      a.match(errs.join(' '), /columns/);
    });

    T.test('TPV-TC-282', 'One row per item, with exactly the columns the definition names, in order', function (a) {
      var res = build(def());
      a.equal(res.table.rows.length, 9, 'nine accounts in mini (A 4, B 2, C 0, D 3)');
      a.deepEqual(res.table.columns.map(function (c) { return c.key; }), ['region', 'name', 'segment', 'incr3']);
      a.equal(res.table.columns[3].label, '3-year incremental ARR', 'the definition’s label wins');
      a.equal(res.table.columns[3].kind, 'DER', 'every column carries its kind');
      a.equal(html(res).querySelectorAll('tbody tr').length, 9);
      a.deepEqual([].map.call(html(res).querySelectorAll('thead th'), function (th) { return th.getAttribute('data-tap-col'); }),
        ['region', 'name', 'segment', 'incr3', 'source'], 'the same headings on screen, then the row source (the panel adds it to copies itself)');
      a.equal(TAP.rows.list('newBusiness').length, 7, 'seven new business rows');
      a.deepEqual(TAP.rows.list('partners').map(function (r) { return r.id; }), ['alpha:10', 'bravo:10', 'delta:10']);
    });

    T.test('TPV-TC-283', 'Rows follow the default sort, then sort ascending and descending on a column', function (a) {
      a.deepEqual(ids(build(def())), BY_INCR_DESC, 'incr3 descending, ties in file order');
      var asc = ids(build(def(), { opts: { sort: 'name:asc' } }));
      a.deepEqual(asc, ['alpha:10', 'alpha:11', 'alpha:12', 'alpha:13', 'bravo:10', 'bravo:11', 'delta:10', 'delta:11', 'delta:12']);
      a.deepEqual(ids(build(def(), { opts: { sort: 'name:desc' } })), asc.slice().reverse());
      var res = build(def());
      var next = {};
      [].forEach.call(html(res).querySelectorAll('[data-tap-opt="sort"]'), function (b) {
        var v = b.getAttribute('data-tap-value').split(':');
        next[v[0]] = v[1];
      });
      a.deepEqual(next, { region: 'asc', name: 'asc', segment: 'asc', incr3: 'asc' }, 'the active column offers the other way; others their natural order');
      a.equal(build(def({ columns: [{ key: 'name' }, { key: 'currentArr' }] })).table.rows.length, 9);
      var b2 = html(build(def({ columns: [{ key: 'name' }, { key: 'currentArr' }] }), { opts: { sort: 'name:asc' } }));
      a.equal(b2.querySelector('[data-tap-value^="currentArr:"]').getAttribute('data-tap-value'), 'currentArr:desc', 'numbers start high');
      a.equal(b2.querySelector('[data-tap-value^="name:"]').getAttribute('data-tap-value'), 'name:desc');
      a.equal(b2.querySelector('th[data-tap-col="name"]').getAttribute('aria-sort'), 'ascending', 'the heading shows the direction');
    });

    T.test('TPV-TC-285', 'A filter keeps one industry’s rows; clearing it brings every row back', function (a) {
      var res = build(def());
      a.equal(res.controls.length, 1);
      var c = res.controls[0];
      a.equal(c.key, 'filter:industry');
      a.equal(c.kind, 'select');
      a.equal(c.value, 'all');
      a.deepEqual(c.options.map(function (o) { return o.label; }), ['All', 'Education', 'Healthcare', 'Retail']);
      var only = build(def(), { opts: { 'filter:industry': 'Healthcare' } });
      a.deepEqual(ids(only), ['alpha:13', 'bravo:10', 'alpha:10'], 'a4 150, b1 120, a1 50');
      a.equal(only.controls[0].value, 'Healthcare');
      a.equal(ids(build(def(), { opts: { 'filter:industry': 'all' } })).length, 9);
    });

    T.test('TPV-TC-286', 'Comparison modes: focus first in one and pair, chosen regions in set, every row in org', function (a) {
      a.deepEqual(ids(build(def(), { cmp: cmp({ mode: 'one', focus: 'bravo' }) })),
        ['bravo:10', 'bravo:11', 'delta:10', 'alpha:13', 'alpha:11', 'delta:11', 'alpha:10', 'alpha:12', 'delta:12']);
      a.deepEqual(ids(build(def(), { cmp: cmp({ mode: 'pair', focus: 'delta', second: 'alpha' }) })),
        ['delta:10', 'delta:11', 'delta:12', 'alpha:13', 'alpha:11', 'alpha:10', 'alpha:12']);
      a.deepEqual(ids(build(def(), { cmp: cmp({ mode: 'set', set: ['alpha', 'charlie'] }) })), ['alpha:13', 'alpha:11', 'alpha:10', 'alpha:12']);
      a.deepEqual(ids(build(def(), { cmp: cmp({ mode: 'org' }) })), BY_INCR_DESC);
    });

    T.test('TPV-TC-287', 'Every row names its region file and row, and a click opens that row', function (a) {
      var res = build(def());
      res.table.rows.forEach(function (r) {
        var t = TAP.sources.address(r.src).text, reg = TAP.data.region(r.regionId);
        a.ok(t.indexOf(reg.source.fileName) === 0, r.id + ' names the file');
        a.ok(t.indexOf('C' + r.sourceRow) > 0, r.id + ' names the row');
      });
      a.equal(TAP.sources.address(build(def({ rows: 'newBusiness', columns: [{ key: 'market' }], filter: [], sort: null })).table.rows[2].src).text,
        'Region B plan.xlsx › 2. New Business › D20');
      var tr = html(res).querySelector('tr[data-tap-row="accounts:alpha:13"]');
      a.ok(tr, 'the row carries data-tap-row');
      a.equal(tr.getAttribute('data-tap-region'), 'alpha');
      a.match(tr.textContent, /Region A plan\.xlsx, row 13/, 'the row shows its source');
      a.deepEqual(res.target({ data: { regionId: 'alpha', row: 'accounts:alpha:13' } }),
        { reportId: 'x-list', regionIds: ['alpha'], industryIds: ['ind1'], accountIds: ['a4'], mark: 'row',
          items: [{ section: 'customerGrowth', regionId: 'alpha', row: 13 }] });
      a.equal(res.target({ data: {} }), null, 'a click elsewhere names no row');
    });

    T.test('TPV-TC-289', 'A blank reads "not provided" and a zero reads as zero', function (a) {
      var d = def({ rows: 'newBusiness', columns: [{ key: 'region' }, { key: 'hitRate' }, { key: 'arr3' }], filter: [], sort: null });
      var res = build(d), blank = res.table.rows.filter(function (r) { return r.id === 'charlie:20'; })[0];
      a.equal(blank.cells.hitRate.state, 'notProvided');
      a.equal(blank.cells.arr3.state, 'notProvided', 'every year blank');
      var np = TAP.content.text('states.notProvided');
      a.match(html(res).querySelector('tr[data-tap-row="newBusiness:charlie:20"]').textContent, new RegExp(np));
      var zero = TAP.rows.cell('accounts', 'incr3', { regionId: 'alpha', sourceRow: 12 });
      a.equal(zero.state, 'value');
      a.equal(zero.v, 0, 'a3 plans no growth: zero, not blank');
      var td = html(build(def())).querySelector('tr[data-tap-row="accounts:alpha:12"] td[data-tap-col="incr3"]');
      a.equal(td.textContent, TAP.format.cell(zero, { unit: 'money' }));
      a.ok(td.textContent !== np);
    });

    T.test('TPV-TC-292', 'A list offers no chart type menu', function (a) {
      a.deepEqual(TAP.shapes.types(def(), 4), ['list']);
    });

    T.test('X-rows-columns', 'Each source lists the columns in ARCHITECTURE 17.4 with unit, kind and label', function (a) {
      var want = {
        newBusiness: ['region', 'industry', 'tier', 'subVertical', 'market', 'targetAccounts', 'hitRate', 'avgDealSize', 'wins', 'arr3',
          'services3', 'successFactors', 'alsoTargeted'],
        accounts: ['region', 'name', 'industry', 'country', 'productLine', 'segment', 'riskLevel', 'currentArr', 'growthY1', 'growthY2',
          'growthY3', 'multiplier3y', 'incr3', 'oi3', 'servicesRatio'],
        partners: ['region', 'name', 'channel', 'maturity', 'expertiseGeo', 'expertiseProduct', 'fteSales', 'fteConsultants', 'fte',
          'centralSupportPct', 'arr3', 'services3', 'oiPerFte', 'alsoNamed']
      };
      Object.keys(want).forEach(function (s) {
        var cols = TAP.rows.columns(s);
        a.deepEqual(cols.map(function (c) { return c.key; }), want[s], s);
        cols.forEach(function (c) {
          a.ok(c.unit && c.label && c.label.charAt(0) !== '[', s + ' ' + c.key + ' has a unit and a label');
          a.ok(['IN', 'PRE', 'DER', 'APP'].indexOf(c.kind) >= 0, s + ' ' + c.key + ' kind');
        });
      });
      ['wins', 'alsoTargeted'].forEach(function (k) { a.equal(TAP.rows.columns('newBusiness').filter(function (c) { return c.key === k; })[0].kind, 'APP'); });
      ['oiPerFte', 'alsoNamed'].forEach(function (k) { a.equal(TAP.rows.columns('partners').filter(function (c) { return c.key === k; })[0].kind, 'APP'); });
    });

    T.test('X-rows-cells', 'Row cells equal the hand figures, with their sources', function (a) {
      function c(s, k, r, n) { return TAP.rows.cell(s, k, { regionId: r, sourceRow: n }); }
      var nb = { region: 'Region A', industry: 'Healthcare', tier: 1, subVertical: 'Clinics', market: 'North', targetAccounts: 20,
        hitRate: 0.25, avgDealSize: 100, wins: 5, arr3: 1655, services3: 331, successFactors: 'Local references' };   // 20 x 0.25; 500 + 550 + 605
      Object.keys(nb).forEach(function (k) { a.equal(c('newBusiness', k, 'alpha', 20).v, nb[k], 'NB alpha:20 ' + k); });
      a.equal(c('newBusiness', 'arr3', 'alpha', 20).src.field, 'arrPotential');
      a.equal(c('newBusiness', 'arr3', 'alpha', 20).src.row, 20);
      a.equal(c('newBusiness', 'alsoTargeted', 'alpha', 20).state, 'notApplicable', 'no other region names Clinics');
      var acc = { name: 'Fictional Account A4', industry: 'Healthcare', country: 'Country 1', productLine: 'Product line 1', segment: 'growth',
        riskLevel: 'Medium', currentArr: 150, multiplier3y: 2, incr3: 150, oi3: 180, servicesRatio: 0.2 };
      Object.keys(acc).forEach(function (k) { a.equal(c('accounts', k, 'alpha', 13).v, acc[k], 'a4 ' + k); });
      a.equal(c('accounts', 'growthY1', 'alpha', 13).state, 'notApplicable', 'a4 is planned with the multiplier, not growth %');
      a.near(c('accounts', 'growthY1', 'alpha', 11).v, 0.5, TOL);
      a.equal(c('accounts', 'riskLevel', 'alpha', 10).v, 'None', 'no risk flag reads as none, never as not provided');
      var pt = { name: 'Fictional Partner A1', channel: 'Partner', maturity: 'Developing', fteSales: 2, fteConsultants: 3, fte: 5,
        centralSupportPct: 0.1, arr3: 450, services3: 90, oiPerFte: 108 };   // (450 + 90) / 5
      Object.keys(pt).forEach(function (k) { a.equal(c('partners', k, 'alpha', 10).v, pt[k], 'A1 ' + k); });
      a.equal(c('partners', 'oiPerFte', 'alpha', 10).kind, 'APP');
      a.equal(TAP.rows.cell('customerGrowth', 'incr3', { regionId: 'bravo', row: 10 }).v, 120, 'a details item {section, regionId, row} works too');
    });

    T.test('X-rows-match', 'Names are matched trimmed, in lower case, with inner spaces collapsed', function (a) {
      a.equal(TAP.rows.matchKey('  Fictional   Partner A1 '), 'fictional partner a1');
      a.equal(TAP.rows.matchKey(null), '');
      var p = window.T_FIXTURE('mini');
      p.regions[1].newBusiness[0].subVertical = ' clinics ';
      p.regions[3].partners[0].name = 'fictional  partner a1';
      TAP.data.load(p);
      var t = TAP.rows.cell('newBusiness', 'alsoTargeted', { regionId: 'alpha', sourceRow: 20 });
      a.equal(t.v, 'Region B', 'Region B names the same sub-industry');
      a.deepEqual(t.regionIds, ['bravo']);
      a.equal(t.kind, 'APP');
      a.equal(TAP.rows.cell('partners', 'alsoNamed', { regionId: 'delta', sourceRow: 10 }).v, 'Region A');
    });

    T.test('X-rows-drill', 'A drill target keeps its regions and industries only', function (a) {
      var res = build(def(), { drill: { regionIds: ['alpha'], industryIds: ['ind1'] } });
      a.deepEqual(ids(res), ['alpha:13', 'alpha:10'], 'a4 150 and a1 50');
    });

    T.test('X-rows-highlight', 'Highlighted rows are marked, and every value is escaped', function (a) {
      var p = window.T_FIXTURE('mini');
      p.regions[0].customerGrowth.accounts[0].name = '<b>Bold</b>';
      TAP.data.load(p);
      var box = html(build(def(), { highlight: { reportId: 'x-list', items: [{ section: 'customerGrowth', regionId: 'alpha', row: 13 }] } }));
      a.ok(box.querySelector('tr[data-tap-row="accounts:alpha:13"]').classList.contains('is-highlight'));
      a.equal(box.querySelectorAll('tr.is-highlight').length, 1);
      a.equal(box.querySelector('b'), null, 'no markup from the data');
      a.match(box.textContent, /<b>Bold<\/b>/);
    });

    T.test('X-rows-empty', 'A scope with no rows is empty and names the regions with none', function (a) {
      var res = build(def(), { cmp: cmp({ mode: 'set', set: ['charlie'] }) });
      a.equal(res.empty, true);
      a.deepEqual(res.missing, ['Region C']);
    });
  });
})(window.TAP);
