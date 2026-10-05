/*
 * File: tests/test-extra.js
 * Purpose: Tests for extra template sections (US-3.2.1) and the Other sections view (US-3.2.2).
 * Provides: test cases TPV-TC-574 to TPV-TC-587 (automated ones) and X-extra-*
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
  function about(list) { return list.filter(function (w) { return /extra/i.test(w.path); }); }
  function messages(list) { return list.map(function (w) { return w.message; }).join(' | '); }
  function regionIndex(p, id) { return p.regions.map(function (r) { return r.id; }).indexOf(id); }

  // Broken extra sections: each must give one warning at the path, naming the section and the field, and still load.
  var BROKEN = [
    { id: 'unknown unit', tc: 'TPV-TC-576', path: 'meta.extraSections[0].columns[4].unit', field: 'unit', found: 'euros',
      change: function (p) { p.meta.extraSections[0].columns[4].unit = 'euros'; } },
    { id: 'unknown kind', tc: 'TPV-TC-576', path: 'meta.extraSections[0].columns[1].kind', field: 'kind', found: 'MANUAL',
      change: function (p) { p.meta.extraSections[0].columns[1].kind = 'MANUAL'; } },
    { id: 'row naming an unknown column', tc: 'TPV-TC-576', path: 'regions[0].extra.events[1]', field: 'venue', found: 'venue',
      change: function (p) { p.regions[0].extra.events[1].venue = 'Hall B'; } },
    { id: 'extra sections not a list', tc: 'X-extra-check', path: 'meta.extraSections', field: 'extraSections', section: null,
      change: function (p) { p.meta.extraSections = { events: true }; } },
    { id: 'duplicate section id', tc: 'X-extra-check', path: 'meta.extraSections[1].id', field: 'id',
      change: function (p) { p.meta.extraSections.push(copy(p.meta.extraSections[0])); } },
    { id: 'reserved column key', tc: 'X-extra-check', path: 'meta.extraSections[0].columns[0].key', field: 'key',
      change: function (p) { p.meta.extraSections[0].columns[0].key = 'region'; } },
    { id: 'region names a section not listed', tc: 'X-extra-check', path: 'regions[0].extra.pricing', field: 'pricing', section: 'pricing',
      change: function (p) { p.regions[0].extra.pricing = []; } },
    { id: 'row without its source row', tc: 'X-extra-check', path: 'regions[0].extra.events[0].sourceRow', field: 'sourceRow',
      change: function (p) { delete p.regions[0].extra.events[0].sourceRow; } },
    { id: 'text in a money column', tc: 'X-extra-check', path: 'regions[0].extra.events[0].budget', field: 'budget',
      change: function (p) { p.regions[0].extra.events[0].budget = '45k'; } },
    { id: 'a number in a text column', tc: 'X-extra-check', path: 'regions[0].extra.events[0].event', field: 'event', single: true,
      change: function (p) { p.regions[0].extra.events[0].event = 12; } },
    { id: 'section without columns: one warning, not one per row', tc: 'X-extra-check', path: 'meta.extraSections[0].columns',
      field: 'columns', single: true, change: function (p) { delete p.meta.extraSections[0].columns; } },
    { id: 'two rows from the same worksheet row', tc: 'X-extra-check', path: 'regions[0].extra.events[1].sourceRow', field: 'sourceRow',
      single: true, change: function (p) { p.regions[0].extra.events[1].sourceRow = 8; } }
  ];

  T.suite('extra', function () {
    /* ---------- US-3.2.1 extra sections in the Data Contract ---------- */

    T.test('TPV-TC-574', 'The mini fixture has no extra sections and the check says nothing about them', function (a) {
      var res = TAP.check.run(T_FIXTURE('mini'));
      a.deepEqual(res.errors, [], messages(res.errors));
      a.deepEqual(about(res.warnings), [], messages(about(res.warnings)));
      a.equal(TAP.extra.sections().length, 0, 'no sections');
      a.equal(TAP.extra.any(), false, 'any() is false');
      a.deepEqual(TAP.rows.list(SRC), [], 'no rows');
    });

    T.test('TPV-TC-575', 'The sample data with its extra section passes the check with no errors and no extra-section warnings', function (a) {
      var res = TAP.check.run(sample());
      a.deepEqual(res.errors, [], messages(res.errors));
      a.deepEqual(about(res.warnings), [], messages(about(res.warnings)));
      a.ok(loadSample().ok, 'the sample loads');
    });

    BROKEN.forEach(function (c) {
      T.test(c.tc, 'Broken extra section, ' + c.id + ': a warning naming the section and the field; the data still loads', function (a) {
        var p = sample();
        c.change(p);
        var res = TAP.check.run(copy(p)), hit = res.warnings.filter(function (w) { return w.path === c.path; })[0];
        a.deepEqual(res.errors, [], 'no errors: ' + messages(res.errors));
        if (c.single) a.equal(about(res.warnings).length, 1, 'a single warning: ' + messages(about(res.warnings)));
        a.ok(hit, 'a warning at ' + c.path + '; got: ' + messages(about(res.warnings)));
        if (hit) {
          var section = c.section !== undefined ? c.section : E().title;
          if (section) a.ok(hit.message.indexOf('"' + section + '"') > 0, 'names the section: ' + hit.message);
          a.ok(hit.message.indexOf(c.field) >= 0, 'names the field: ' + hit.message);
          a.ok(hit.message.indexOf(c.path + ' ') === 0 || hit.message.indexOf(c.path + ':') === 0, 'starts with the path: ' + hit.message);
          if (c.found) a.equal(hit.found, c.found, 'found');
          a.ok(hit.expected, 'says what was expected');
        }
        var load = TAP.data.load(p);
        a.ok(load.ok, 'the app still loads');
        a.ok(load.warnings.some(function (w) { return w.path === c.path; }), 'the warning reaches the data sources panel list');
        a.ok(Array.isArray(TAP.extra.sections()) && Array.isArray(TAP.rows.list(SRC)), 'reading the sections never throws');
      });
    });

    T.test('X-extra-check', 'Every extra-section warning has path, region, item, expected, found and message', function (a) {
      BROKEN.forEach(function (c) {
        var p = sample();
        c.change(p);
        about(TAP.check.run(p).warnings).forEach(function (w) {
          ['path', 'region', 'item', 'expected', 'found', 'message'].forEach(function (k) { a.ok(k in w, c.id + ': ' + k); });
        });
      });
      var p = sample();
      p.regions[regionIndex(p, 'neu')].extra = 'events';
      var w = TAP.check.run(p).warnings.filter(function (x) { return x.path === 'regions[2].extra'; })[0];
      a.ok(w && w.region === 'Northern Europe', 'a region-level warning names the region');
    });

    T.test('X-extra-tolerant', 'Malformed sections are skipped quietly when reading; a good one next to them still reads', function (a) {
      var p = sample();
      p.meta.extraSections.unshift(null, { id: '', columns: [] }, { id: 'x', title: 'X' });
      p.meta.extraSections[3].columns.push({ key: 'region' }, null);
      TAP.data.load(p);
      a.deepEqual(TAP.extra.sections().map(function (s) { return s.id; }), ['events'], 'only the usable section');
      a.deepEqual(TAP.rows.columns(SRC).map(function (c) { return c.key; }), ['region'].concat(E().columns), 'bad columns left out');
      a.equal(TAP.rows.list(SRC).length, E().total, 'rows still listed');
      p = sample();
      p.regions[0].extra.events[1].sourceRow = 8;
      p.regions[0].extra.events[0].event = 12;
      TAP.data.load(p);
      a.deepEqual(TAP.rows.list(SRC, ['na']).map(function (e) { return e.item.timing; }), ['Year 1 Q2', 'Year 2 Q1'], 'a repeated row is left out, the first kept');
      a.equal(TAP.rows.cell(SRC, 'event', { regionId: 'na', row: 8 }).state, 'notProvided', 'a value of the wrong type shows as not provided');
      p = sample();
      p.meta.extraSections.unshift({ id: 'events', title: 'Broken', columns: 'none' });
      TAP.data.load(p);
      a.deepEqual(TAP.extra.sections(), [], 'of two sections with one id, the first is kept even when it is broken');
      a.ok(TAP.check.run(p).warnings.some(function (w) { return w.path === 'meta.extraSections[1].id'; }), 'and the check names the second');
    });

    T.test('TPV-TC-579', 'The sample data has one extra section, with rows for at least one region', function (a) {
      loadSample();
      var list = TAP.extra.sections();
      a.equal(list.length, 1, 'one section');
      a.equal(list[0].id, E().id, 'id');
      a.equal(list[0].title, E().title, 'title');
      a.equal(list[0].intro, E().intro, 'intro');
      a.ok(TAP.extra.any(), 'any() is true');
      var counts = {};
      TAP.data.regions().forEach(function (r) { counts[r.id] = TAP.rows.list(SRC, [r.id]).length; });
      a.deepEqual(counts, E().rows, 'rows per region');
      a.ok(Object.keys(counts).some(function (k) { return counts[k] > 0; }), 'some region has rows');
    });

    T.test('X-extra-rows', 'TAP.rows serves the section: the region then its columns in order, every row, values as cells', function (a) {
      loadSample();
      var raw = window.PLAN_DATA.meta.extraSections[0].columns, cols = TAP.rows.columns(SRC);
      a.deepEqual(cols.map(function (c) { return c.key; }), ['region'].concat(E().columns), 'column keys in order');
      a.deepEqual(cols.slice(1).map(function (c) { return c.label; }), E().labels, 'labels');
      raw.forEach(function (c, i) { a.equal(cols[i + 1].unit, c.unit, c.key + ' unit'); a.equal(cols[i + 1].kind, c.kind, c.key + ' kind'); });
      var all = TAP.rows.list(SRC);
      a.equal(all.length, E().total, 'every row');
      var order = TAP.data.regions().map(function (r) { return r.id; });
      a.ok(all.every(function (e, i) {
        var b = all[i - 1];
        return !b || order.indexOf(b.regionId) < order.indexOf(e.regionId) || (b.regionId === e.regionId && b.sourceRow < e.sourceRow);
      }), 'region file order, then row order');
      a.equal(all[0].id, all[0].regionId + ':' + all[0].sourceRow, 'row id');
      E().values.forEach(function (v) {
        var c = TAP.rows.cell(SRC, v[2], { regionId: v[0], row: v[1] });
        a.equal(c.state, 'value', v.join(' ') + ' state');
        a.equal(c.v, v[3], v.join(' ') + ' value');
      });
      var b = E().blank, blank = TAP.rows.cell(SRC, b[2], { regionId: b[0], row: b[1] });
      a.equal(blank.state, 'notProvided', 'a blank budget is not provided');
      a.equal(TAP.rows.cell(SRC, 'perAccount', { regionId: 'na', row: 8 }).kind, 'DER', 'calculated in the workbook');
      a.equal(TAP.rows.cell(SRC, 'region', all[0]).v, TAP.content.regionName(TAP.data.region(all[0].regionId)), 'region name');
      a.equal(TAP.rows.section(SRC), SRC, 'the section is the source itself');
      a.equal(TAP.rows.rowSrc(SRC, 'na', 9).field, 'event', 'a row is addressed by its first text column');
      a.deepEqual(TAP.rows.list('extra:nothing'), [], 'an unknown section has no rows');
      a.deepEqual(TAP.rows.columns('extra:nothing'), [], 'and no columns');
    });

    T.test('TPV-TC-577', 'Every value in the sample extra section traces to file, section (as the sheet) and its source row', function (a) {
      loadSample();
      E().sources.forEach(function (s) {
        var c = TAP.rows.cell(SRC, s.src.field, { regionId: s.src.regionId, row: s.src.row });
        var ad = TAP.sources.address(c.src);
        a.equal(ad.text, s.text, s.text);
        a.equal(ad.calculated, s.calculated, s.text + ' calculated');
      });
      var n = 0;
      TAP.rows.list(SRC).forEach(function (e) {
        var file = TAP.data.region(e.regionId).source.fileName;
        TAP.rows.columns(SRC).forEach(function (col) {
          var ad = TAP.sources.address(TAP.rows.cell(SRC, col.key, e).src);
          n++;
          a.ok(ad.file === file && ad.sheet === E().title && new RegExp('[A-Z]' + e.sourceRow + '$').test(ad.cell),
            e.id + ' ' + col.key + ': ' + ad.text);
        });
      });
      a.ok(n > E().total, 'checked ' + n + ' values');
      var p = sample();
      delete p.meta.extraSections[0].columns[0].column;
      TAP.data.load(p);
      var ad = TAP.sources.address(TAP.rows.cell(SRC, 'event', { regionId: 'na', row: 9 }).src);
      a.equal(ad.text, 'North America plan.xlsx › ' + E().title + ' › row 9', 'without a column letter the row is named');
    });

    /* ---------- US-3.2.2 the Other sections view ---------- */

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
      a.equal(order.indexOf('other'), order.indexOf('partners') + 1, 'straight after Partners');
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
      } finally { v.destroy(); }
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
      a.equal(TAP.keys.viewFor('6'), 'regions', 'key 6 opens Regions, the view after Partners');
      loadSample();
      a.equal(TAP.keys.viewFor('6'), 'other', 'with an extra section, key 6 opens Other sections');
      a.equal(TAP.keys.viewFor('7'), 'regions', 'and key 7 Regions');
    });
  });
})(window.TAP);
