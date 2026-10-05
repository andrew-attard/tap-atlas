/*
 * File: tests/test-extra-view.js
 * Purpose: Tests for the Other sections view (US-3.2.2): the menu, one list per extra section, the comparison,
 *          sorting, number keys, row details and report validation for extra rows.
 * Provides: test cases TPV-TC-581 to TPV-TC-587 (automated ones) and X-extra-view, X-extra-long-text,
 *           X-extra-row-click, X-extra-validate
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, tests/fixtures/mini-data.js,
 *             data/sample-plan-data.js (window.PLAN_DATA), tests/fixtures/sample-expected.js (SAMPLE_EXPECT.extra)
 * Used by: tests.html
 * Owner: EXTRA stream
 */
(function (TAP) {
  'use strict';

  var SRC = 'extra:events';
  function E() { return window.SAMPLE_EXPECT.extra; }
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  function sample() { return copy(window.PLAN_DATA); }
  function loadSample() { var r = TAP.data.load(sample()); if (TAP.insights && TAP.insights.reset) TAP.insights.reset(); return r; }

  T.suite('extra view', function () {

    function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c || {}); }
    function def0() { return TAP.otherSections.definitions()[0]; }
    function build(def, c, opts) {
      var k = cmp(c);
      return TAP.builders.get('list')({ def: def, type: 'list', cmp: k, entities: TAP.scope.entities(k), highlight: null,
        expanded: false, theme: window.TAP_THEME, opts: opts || {} });
    }
    function regionsOf(res) { return res.table.rows.map(function (r) { return r.regionId; }); }
    function values(res, key) { return res.table.rows.map(function (r) { var c = r.cells[key]; return c.state === 'value' ? c.v : null; }); }
    function htmlOf(res) { var d = document.createElement('div'); TAP.dom.html(d, res.html); return d; }
    function twoSections() {
      var p = sample(), s2 = copy(p.meta.extraSections[0]);
      s2.id = 'visits';
      s2.title = '6. Visits';
      s2.intro = 'A second section.';
      p.meta.extraSections.push(s2);
      p.regions[0].extra.visits = [{ sourceRow: 5, event: 'Site tour', invited: 4 }];
      return p;
    }

    T.test('TPV-TC-581', '"Other sections" is in the menu after Partners with an extra section, and not without one', function (a) {
      loadSample();
      var order = TAP.views.order();
      a.equal(order.indexOf('other'), order.indexOf('outlook') + 1, 'after Partners and Outlook');
      a.equal(order.indexOf('outlook'), order.indexOf('partners') + 1, 'Outlook comes straight after Partners');
      a.equal(TAP.views.title('other'), 'Other sections', 'menu title');
      a.ok(!TAP.views.get('other').__stub, 'the view is built');
      var root = T.dom.mount();
      TAP.app.start({ root: root, plan: sample() });
      a.ok(root.querySelector('.tap-menu__item[data-view="other"]'), 'a menu button with the sample');
      TAP.app.stop();
      root = T.dom.mount();
      TAP.app.start({ root: root, plan: T_FIXTURE('mini') });
      a.equal(root.querySelector('.tap-menu__item[data-view="other"]'), null, 'no menu button with the mini fixture');
      a.ok(root.querySelector('.tap-menu__item[data-view="partners"]'), 'the other views are there');
      TAP.app.stop();
      a.equal(TAP.views.order().indexOf('other'), -1, 'not in the order');
    });

    T.test('TPV-TC-583', 'Each section becomes a list report with its title, intro and columns in the order given', function (a) {
      var p = twoSections();
      TAP.data.load(p);
      var defs = TAP.otherSections.definitions();
      a.deepEqual(defs.map(function (d) { return d.title; }), [E().title, '6. Visits'], 'one per section, in file order');
      var d = defs[0];
      a.equal(d.intro, E().intro, 'intro');
      a.equal(d.explain.shows, E().intro, 'the explanation starts from the intro');
      a.equal(d.shape, 'list', 'a list');
      a.equal(d.rows, SRC, 'rows from the section');
      a.equal(d.view, 'other', 'on the Other sections view');
      a.deepEqual(d.columns.map(function (c) { return c.key; }), ['region'].concat(E().columns), 'columns in order');
      a.deepEqual(TAP.reports.validate(d), [], 'a valid definition');
      var res = build(d, { mode: 'all' });
      a.equal(res.error, null, 'builds');
      a.deepEqual(res.table.columns.slice(1).map(function (c) { return c.label; }), E().labels, 'headings');
    });

    T.test('X-extra-view', 'The view mounts one panel per section, each under its intro, with no errors', function (a) {
      TAP.data.load(twoSections());
      var root = T.dom.mount(), v = TAP.views.get('other').mount(root);
      try {
        var titles = TAP.dom.qsa('.tap-panel__title', root).map(function (h) { return h.textContent; });
        a.deepEqual(titles, [E().title, '6. Visits'], 'panel titles');
        a.ok(root.textContent.indexOf(E().intro) >= 0, 'the intro is shown');
        a.equal(root.querySelector('h1').textContent, TAP.content.text('otherView.title'), 'the view title');
        a.equal(root.querySelectorAll('.tap-stub').length, 0, 'no error in any slot');
        a.equal(root.querySelectorAll('table.tap-list').length, 2, 'two lists');
      } finally {
        v.destroy();
        // The view registers its definitions when it mounts: leave none behind for the next test
        ['other-events', 'other-visits'].forEach(function (id) { delete window.TAP_REPORTS[id]; });
      }
    });

    T.test('TPV-TC-584', 'Rows follow the comparison: focus first in one and pair, only the chosen in set, every row in all and org', function (a) {
      loadSample();
      var d = def0(), rows = E().rows, total = E().total;
      a.equal(build(d, { mode: 'all' }).table.rows.length, total, 'all: every row');
      a.equal(build(d, { mode: 'org' }).table.rows.length, total, 'org: every row');
      var one = regionsOf(build(d, { mode: 'one', focus: 'neu', restAs: 'combined' }));
      a.equal(one.length, total, 'one: every row');
      a.deepEqual(one.slice(0, rows.neu), Array(rows.neu + 1).join('neu,').split(',').slice(0, rows.neu), 'one: the focus rows first');
      var pair = regionsOf(build(d, { mode: 'pair', focus: 'mea', second: 'na' }));
      a.equal(pair.length, rows.mea + rows.na, 'pair: the two regions');
      a.ok(pair.slice(0, rows.mea).every(function (r) { return r === 'mea'; }), 'pair: the focus rows first');
      var set = regionsOf(build(d, { mode: 'set', set: ['seu', 'apac'] }));
      a.equal(set.length, rows.seu + rows.apac, 'set: only the chosen regions');
      a.ok(set.every(function (r) { return r === 'seu' || r === 'apac'; }), 'set: nothing else');
      var none = build(d, { mode: 'set', set: ['ceu'] });
      a.ok(none.empty, 'a region with no rows gives an empty list');
    });

    T.test('TPV-TC-585', 'Every column sorts: numbers ascending then descending, blanks last; text alphabetically', function (a) {
      loadSample();
      var d = def0(), up = values(build(d, { mode: 'all' }, { sort: 'budget:asc' }), 'budget');
      var down = values(build(d, { mode: 'all' }, { sort: 'budget:desc' }), 'budget');
      var nums = up.filter(function (v) { return v != null; });
      a.deepEqual(nums, nums.slice().sort(function (x, y) { return x - y; }), 'ascending');
      a.equal(up[up.length - 1], null, 'the blank budget goes last');
      a.deepEqual(down.filter(function (v) { return v != null; }), nums.slice().reverse(), 'descending');
      a.equal(down[down.length - 1], null, 'and last again');
      var res = build(d, { mode: 'all' }, { sort: 'budget:asc' }), h = htmlOf(res);
      a.equal(h.querySelector('th[data-tap-col="budget"] [data-tap-opt="sort"]').getAttribute('data-tap-value'), 'budget:desc', 'the next click sorts descending');
      a.equal(h.querySelector('th[data-tap-col="invited"] [data-tap-opt="sort"]').getAttribute('data-tap-value'), 'invited:desc', 'a number column starts descending');
      d.columns.forEach(function (c) { a.ok(h.querySelector('th[data-tap-col="' + c.key + '"] [data-tap-opt="sort"]'), c.key + ' can be sorted'); });
      var text = values(build(d, { mode: 'all' }, { sort: 'event:asc' }), 'event');
      a.deepEqual(text, text.slice().sort(function (x, y) { return x.localeCompare(y); }), 'text sorts alphabetically');
    });

    T.test('X-extra-long-text', 'A long note is in the list in full', function (a) {
      loadSample();
      var L = E().long, h = htmlOf(build(def0(), { mode: 'all' }));
      var td = h.querySelector('tr[data-tap-row="' + SRC + ':' + L.region + ':' + L.row + '"] td[data-tap-col="' + L.key + '"]');
      a.ok(td, 'the cell is drawn');
      if (td) a.equal(td.textContent.length, L.length, 'every character');
    });

    T.test('X-extra-row-click', 'A row click names the section and row; details list its fields with file, section and row', function (a) {
      loadSample();
      var res = build(def0(), { mode: 'all' }), tg = res.target({ data: { row: 'extra:events:na:9' } });
      a.deepEqual(tg.items, [{ section: SRC, regionId: 'na', row: 9 }], 'the item');
      a.deepEqual(tg.regionIds, ['na'], 'the region');
      var d = TAP.details.build(tg), text = JSON.stringify(d);
      a.ok(d.title.indexOf('Healthcare roundtable') >= 0, 'titled by the event: ' + d.title);
      a.ok(text.indexOf('5. Events') >= 0, 'names the section as the sheet');
      var rows = d.groups[0].rows, budget = rows.filter(function (r) { return r.label === 'Budget'; })[0];
      a.ok(budget && budget.cell.src && TAP.sources.address(budget.cell.src).text === 'North America plan.xlsx › 5. Events › F9', 'a value and its cell');
    });

    T.test('X-extra-validate', 'Report definitions accept "extra:<section id>" rows and say so when rows are unknown', function (a) {
      loadSample();
      var d = copy(def0());
      a.deepEqual(TAP.reports.validate(d), [], 'extra rows are valid');
      d.rows = 'nothing';
      a.ok(TAP.reports.validate(d).some(function (e) { return e.indexOf('extra:<section id>') >= 0; }), 'the error names extra sections');
    });

    T.test('TPV-TC-587', 'Without extra sections every number key opens the view at its menu position, never Other sections', function (a) {
      var order = TAP.views.order();
      a.equal(order.indexOf('other'), -1, 'not in the menu');
      for (var k = 1; k <= 9; k++) {
        a.equal(TAP.keys.viewFor(String(k)), order[k - 1] || null, 'key ' + k);
        a.ok(TAP.keys.viewFor(String(k)) !== 'other', 'key ' + k + ' is not Other sections');
      }
      a.equal(TAP.keys.viewFor('7'), 'regions', 'key 7 opens Regions, the view after Outlook');
      loadSample();
      a.equal(TAP.keys.viewFor('7'), 'other', 'with an extra section, key 7 opens Other sections');
      a.equal(TAP.keys.viewFor('8'), 'regions', 'and key 8 Regions');
    });
  });
})(window.TAP);
