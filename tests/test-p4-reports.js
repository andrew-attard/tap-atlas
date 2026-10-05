/*
 * File: tests/test-p4-reports.js
 * Purpose: Tests for the Phase 4 reports on the New business and Partners views, checked against figures worked by
 *          hand from tests/fixtures/mini-p4.js (never against the builders' own output).
 * Provides: test cases TPV-TC-714, 715, 717, 718, 728, 729, 731, 733 and X-p4-*; window.P4R_T (shared helpers)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: NBPT stream
 */
(function (TAP) {
  'use strict';

  var TOL = 1e-6;
  var MODES = [{ mode: 'all' }, { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' },
    { mode: 'one', focus: 'alpha', restAs: 'individual' }, { mode: 'pair', focus: 'alpha', second: 'bravo' },
    { mode: 'set', set: ['bravo', 'delta'] }, { mode: 'org' }];

  function load(name) { return TAP.data.load(window.T_FIXTURE(name || 'miniP4')); }
  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c || {}); }
  function ctxFor(id, c, extra) {
    var k = cmp(c), def = TAP.reports.get(id);
    return Object.assign({ def: def, type: def.defaultType, measureId: null, sizeId: null, breakdown: null, cmp: k,
      entities: TAP.scope.entities(k), year: null, industryId: null, highlight: null, expanded: false,
      theme: window.TAP_THEME, opts: {} }, extra || {});
  }
  function builderOf(def) { return TAP.builders.get(def.builder || (def.shape === 'xyz' ? 'xy' : def.shape)); }
  function build(id, c, extra) { var ctx = ctxFor(id, c, extra); return builderOf(ctx.def)(ctx); }
  function parse(html) { var box = document.createElement('div'); TAP.dom.html(box, html); return box; }
  // The table row of an entity (and, once broken down, of one breakdown value)
  function row(res, entityId, group) {
    return res.table.rows.filter(function (r) { return r.entityId === entityId && (group == null || String(r.group) === String(group)); })[0];
  }
  // A cell against a hand-worked value: a number, or null for "not provided"
  function expectCell(a, c, want, what) {
    a.ok(c && c.src, what + ': a cell with a source');
    if (want === null) { a.equal(c.state, 'notProvided', what + ' is not provided'); a.ok(c.v !== 0, what + ' is never zero'); return; }
    a.equal(c.state, 'value', what + ' has a value');
    a.near(c.v, want, TOL, what);
  }
  // Every value series of a chart: {name, items: the data items that carry a figure}
  function series(res) {
    return ((res.option || {}).series || []).filter(function (s) { return s.tapRole === 'value'; }).map(function (s) {
      return { name: s.name, items: (s.data || []).filter(function (d) { return d && d.raw != null; }) };
    });
  }
  function labels(res) { return res.table.columns.map(function (c) { return c.label; }); }

  window.P4R_T = { TOL: TOL, MODES: MODES, load: load, cmp: cmp, ctxFor: ctxFor, build: build, parse: parse, row: row,
    expectCell: expectCell, series: series, labels: labels };

  /*
   * New business by solution on miniP4, worked by hand from the rows (three-year sums; ARR, services, and order
   * intake = ARR + services):
   *   A: row 20 names Solution 1: ARR 500 + 550 + 605 = 1655, services 100 + 110 + 121 = 331, order intake 1986
   *      row 21 names Solution 2: ARR 200 x 3 = 600, services 40 x 3 = 120, order intake 720
   *      total: ARR 2255, services 451, order intake 2706; nothing in Solution 3, no row without a solution
   *   B: row 20 names Solution 1: ARR 1000 + 1200 + 1200 = 3400, services 100 + 120 + 120 = 340, order intake 3740
   *      row 21 names no solution: ARR 200 x 3 = 600, services 20 x 3 = 60, order intake 660
   *      total: ARR 4000, services 400, order intake 4400
   *   C: no row names a solution, so the region has not filled the column: not provided
   *   D: row 20 names Solution 3: ARR 600 + 900 + 1350 = 2850, services 150 + 225 + 337.5 = 712.5, order intake 3562.5
   *   Together (C left out): Solution 1 5055 / 671 / 5726; Solution 2 600 / 120 / 720; Solution 3 2850 / 712.5 / 3562.5;
   *      no solution named 600 / 60 / 660; total 9105 / 1563.5 / 10668.5
   *   The other regions than A as an average (B and D; C left out): ARR Solution 1 3400 / 2 = 1700, Solution 3
   *      2850 / 2 = 1425, no solution named 600 / 2 = 300, total 6850 / 2 = 3425
   */
  var SOL = 'nb-solutions', VALUES = ['sol1', 'sol2', 'sol3', 'none'];
  var M = { arr: 'nb.arr.sol', services: 'nb.services.sol', oi: 'nb.oi.sol' };
  var BY_SOLUTION = {
    alpha: { arr: [1655, 600, 0, 0], services: [331, 120, 0, 0], oi: [1986, 720, 0, 0], total: { arr: 2255, services: 451, oi: 2706 } },
    bravo: { arr: [3400, 0, 0, 600], services: [340, 0, 0, 60], oi: [3740, 0, 0, 660], total: { arr: 4000, services: 400, oi: 4400 } },
    charlie: null,
    delta: { arr: [0, 0, 2850, 0], services: [0, 0, 712.5, 0], oi: [0, 0, 3562.5, 0], total: { arr: 2850, services: 712.5, oi: 3562.5 } }
  };
  var ORG = { arr: [5055, 600, 2850, 600], services: [671, 120, 712.5, 60], oi: [5726, 720, 3562.5, 660],
    total: { arr: 9105, services: 1563.5, oi: 10668.5 } };
  function key(m, v) { return m + '@solution:' + v; }

  T.suite('p4-reports', function () {
    /* ---------- US-4.4.1 new business by solution ---------- */

    T.test('TPV-TC-714', 'New business ARR, services and order intake per region and solution equal the hand-worked figures', function (a) {
      load();
      Object.keys(M).forEach(function (t) {
        var res = build(SOL, { mode: 'all' }, { type: 'table', measureId: M[t] });
        a.equal(res.error, null, t + ': builds');
        Object.keys(BY_SOLUTION).forEach(function (r) {
          var want = BY_SOLUTION[r], cells = row(res, r).cells;
          expectCell(a, cells[M[t]], want ? want.total[t] : null, r + ' ' + t + ' total');
          VALUES.forEach(function (v, i) {
            // "No solution named" is listed because Region B has such a row; a region with every row named has zero there
            expectCell(a, cells[key(M[t], v)], want ? want[t][i] : null, r + ' ' + t + ' ' + v);
          });
        });
        var org = row(build(SOL, { mode: 'org' }, { type: 'table', measureId: M[t] }), 'org').cells;
        expectCell(a, org[M[t]], ORG.total[t], 'together ' + t + ' total');
        VALUES.forEach(function (v, i) { expectCell(a, org[key(M[t], v)], ORG[t][i], 'together ' + t + ' ' + v); });
      });
      var rest = row(build(SOL, { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' }, { type: 'table' }), 'rest').cells;
      expectCell(a, rest[M.arr], 3425, 'the others as an average: total');
      [1700, 0, 1425, 300].forEach(function (v, i) { expectCell(a, rest[key(M.arr, VALUES[i])], v, 'the others as an average: ' + VALUES[i]); });
    });

    T.test('TPV-TC-714', 'The report sits on the New business view after the industries, with ARR, Services and Total order intake', function (a) {
      var def = TAP.reports.get(SOL), list = window.TAP_VIEWS.newBusiness.reports;
      a.ok(def, 'nb-solutions is defined');
      a.equal(def.view, 'newBusiness');
      a.equal(list.indexOf(SOL), list.indexOf('nb-industries') + 1, 'straight after nb-industries');
      a.deepEqual(TAP.reports.validate(def), [], 'the definition is valid');
      a.deepEqual(def.measures.map(function (m) { return [m.id, m.label]; }),
        [[M.arr, 'ARR'], [M.services, 'Services'], [M.oi, 'Total order intake']], 'the measure switch');
      ['shows', 'read', 'lookFor'].forEach(function (k) { a.ok(def.explain[k].length > 20, 'explain.' + k); });
    });

    T.test('TPV-TC-715', 'Chart types: heatmap, stacked bars and table', function (a) {
      var def = TAP.reports.get(SOL);
      [1, 4, 7].forEach(function (n) { a.deepEqual(TAP.shapes.types(def, n), ['heatmap', 'stackedBar', 'table'], n + ' regions'); });
      load();
      var grid = build(SOL, { mode: 'all' }, { type: 'heatmap' }), bars = build(SOL, { mode: 'all' }, { type: 'stackedBar' });
      a.ok(grid.html && !grid.option, 'the heatmap is a grid');
      a.ok(bars.option && !bars.html, 'the stacked bars are a chart');
      a.ok(build(SOL, { mode: 'all' }, { type: 'table' }).table.rows.length === 4, 'the table has a row per region');
    });

    T.test('X-p4-sol-bars', 'Stacked bars: one stack per region, one part per solution in the lookup’s order, each named and numbered', function (a) {
      load();
      var res = build(SOL, { mode: 'all' }, { type: 'stackedBar' }), ss = series(res);
      a.deepEqual(ss.map(function (s) { return s.name; }), ['Solution 1', 'Solution 2', 'Solution 3', 'No solution named'], 'the parts, in order');
      a.deepEqual(res.option.yAxis.data, ['Region A', 'Region B', 'Region C', 'Region D'], 'a bar per region');
      VALUES.forEach(function (v, i) {
        ['alpha', 'bravo', 'delta'].forEach(function (r) {
          var d = ss[i].items.filter(function (x) { return x.entityId === r; })[0];
          a.near(d ? d.raw : 0, BY_SOLUTION[r].arr[i], TOL, r + ' ' + v);
        });
        a.equal(ss[i].items.filter(function (x) { return x.entityId === 'charlie'; }).length, 0, 'nothing drawn for Region C');
      });
      // Never colour alone (D24): every part has a numbered key with its name, and the same number on its segments
      var keys = res.legend.filter(function (l) { return l.mark != null; });
      a.deepEqual(keys.map(function (l) { return [l.mark, l.label]; }), [[1, 'Solution 1'], [2, 'Solution 2'], [3, 'Solution 3'], [4, 'No solution named']]);
      var s0 = res.option.series[0];
      a.match(s0.label.formatter({ data: s0.data[1], value: s0.data[1].value }), /^\{n\|1\} /, 'a segment carries its part’s number, as a badge');
      var np = res.option.series.filter(function (s) { return s.tapRole === 'notProvided'; })[0];
      a.ok(np && np.data.some(function (d) { return d.entityId === 'charlie'; }), 'Region C carries the not-provided mark');
      a.deepEqual(res.missing, ['Region C'], 'and is named under the chart');
    });

    T.test('X-p4-sol-grid', 'Heatmap: solutions down, regions across, every value written out and equal to the table', function (a) {
      load();
      MODES.forEach(function (m) {
        var res = build(SOL, m, { type: 'heatmap' }), box = parse(res.html), n = 0;
        Array.prototype.forEach.call(box.querySelectorAll('.tap-nbg__cell[data-tap-row]'), function (el) {
          var v = el.getAttribute('data-tap-row').split(':')[1], c = row(res, el.getAttribute('data-tap-region')).cells[key(M.arr, v)];
          a.equal(el.getAttribute('data-tap-value'), c.state === 'value' ? String(c.v) : '', m.mode + ' ' + el.getAttribute('aria-label'));
          n++;
        });
        a.ok(n > 0, m.mode + ': compared ' + n + ' cells');
      });
      var box = parse(build(SOL, { mode: 'all' }, { type: 'heatmap' }).html);
      function cellOf(r, v) { return box.querySelector('.tap-nbg__cell[data-tap-region="' + r + '"][data-tap-row="solution:' + v + '"]'); }
      a.deepEqual(Array.prototype.map.call(box.querySelectorAll('.tap-nbg__name'), function (el) { return el.textContent; }),
        ['Solution 1', 'Solution 2', 'Solution 3', 'No solution named', 'Total'], 'a line per solution, then the totals');
      a.match(cellOf('bravo', 'sol1').textContent, /3\.4M/, 'the value is written, not only shaded');
      a.match(cellOf('charlie', 'sol1').textContent, /not provided/, 'a region without the column reads "not provided"');
      var big = parseFloat(cellOf('bravo', 'sol1').style.getPropertyValue('--tap-nbg-shade'));
      var small = parseFloat(cellOf('alpha', 'sol2').style.getPropertyValue('--tap-nbg-shade'));
      a.ok(big > small, 'a larger value takes a stronger shade');
    });

    T.test('TPV-TC-717', 'Rows without a solution count under "No solution named"; each region’s parts add up to its total', function (a) {
      load();
      var res = build(SOL, { mode: 'all' }, { type: 'table' });
      a.ok(labels(res).indexOf('No solution named') >= 0, 'the table names the group');
      expectCell(a, row(res, 'bravo').cells[key(M.arr, 'none')], 600, 'Region B, row 21');
      // Totals as worked for the engine: tests/fixtures/mini-p4-expected.js (nb.arr.sol, nb.services.sol, nb.oi.sol)
      var X = window.TEST_EXPECT.miniP4.region;
      Object.keys(M).forEach(function (t) {
        var r2 = build(SOL, { mode: 'all' }, { type: 'table', measureId: M[t] });
        ['alpha', 'bravo', 'delta'].forEach(function (r) {
          var cells = row(r2, r).cells, sum = VALUES.reduce(function (s, v) { return s + cells[key(M[t], v)].v; }, 0);
          a.near(sum, X[r][M[t]], TOL, r + ' ' + t + ': the parts add up to the new business total');
          a.near(cells[M[t]].v, X[r][M[t]], TOL, r + ' ' + t + ': the total shown');
        });
      });
      a.match(parse(build(SOL, { mode: 'all' }, { type: 'heatmap' }).html).textContent, /No solution named/, 'the heatmap names it');
      a.ok(series(build(SOL, { mode: 'all' }, { type: 'stackedBar' })).some(function (s) { return s.name === 'No solution named'; }), 'the bars name it');
      // With every row named, the group is not listed at all
      var plan = window.T_FIXTURE('miniP4');
      plan.regions[1].newBusiness[1].solution = 'sol2';
      TAP.data.load(plan);
      a.ok(labels(build(SOL, { mode: 'all' }, { type: 'table' })).indexOf('No solution named') < 0, 'no such column when every row names one');
    });

    T.test('TPV-TC-718', 'A cell’s drill target opens exactly that region’s new business rows for the solution', function (a) {
      load();
      var def = TAP.reports.get(SOL), grid = build(SOL, { mode: 'all' }, { type: 'heatmap' });
      a.equal(def.drill && def.drill.next, 'nb-rows', 'the next level is the list of rows');
      a.deepEqual(TAP.panelDrill.levels(def).errors, [], 'the levels are sound');
      function rowsFor(target) {
        return build('nb-rows', { mode: 'all' }, { drill: target }).table.rows.map(function (r) { return r.id; }).sort();
      }
      // The rows and the solution each names: tests/fixtures/mini-p4.js (SOLUTIONS)
      var cases = [['alpha', 'sol1', ['alpha:20']], ['alpha', 'sol2', ['alpha:21']], ['bravo', 'sol1', ['bravo:20']],
        ['bravo', 'none', ['bravo:21']], ['delta', 'sol3', ['delta:20']], ['alpha', 'sol3', []]];
      cases.forEach(function (c) {
        var tg = grid.target({ data: { regionId: c[0], row: 'solution:' + c[1] } });
        a.deepEqual([tg.regionIds, tg.solution], [[c[0]], c[1]], c[0] + ' ' + c[1] + ': the target names the region and the solution');
        a.deepEqual(rowsFor(tg), c[2], c[0] + ' ' + c[1] + ': its rows');
      });
      a.equal(grid.target({ data: { regionId: 'bravo', row: 'solution:sol1' } }).label, 'Solution 1, Region B', 'the level’s name for the breadcrumb');
      // A bar segment gives the same target as the cell
      var bars = build(SOL, { mode: 'all' }, { type: 'stackedBar' });
      var seg = series(bars)[3].items.filter(function (d) { return d.entityId === 'bravo'; })[0];
      a.deepEqual(rowsFor(bars.target({ data: seg })), ['bravo:21'], 'a bar segment: the rows without a solution');
      // A combined figure opens the rows of every region it stands for
      var org = build(SOL, { mode: 'org' }, { type: 'heatmap' }).target({ data: { regionId: 'org', row: 'solution:sol1' } });
      a.deepEqual(rowsFor(org), ['alpha:20', 'bravo:20'], 'together: Solution 1 in every region');
      a.equal(org.label, 'Solution 1', 'a combined cell is named for the solution alone');
      // The total line names no solution: all of the region's rows
      a.deepEqual(rowsFor(grid.target({ data: { regionId: 'bravo' } })), ['bravo:20', 'bravo:21'], 'a total: every row of the region');
      a.equal(grid.target({ data: {} }), null, 'nothing named, nothing opened');
    });

    T.test('X-p4-sol-drill-panel', 'On the view, a cell opens the rows for that region and solution in the same panel, with a breadcrumb', function (a) {
      load();
      var root = T.dom.mount(), view = TAP.views.get('newBusiness').mount(root);
      try {
        var panel = root.querySelector('.tap-panel[data-report="nb-solutions"]');
        a.ok(panel, 'the panel is on the view');
        panel.querySelector('.tap-nbg__cell[data-tap-region="bravo"][data-tap-row="solution:none"]').click();
        panel = root.querySelector('[data-slot="nb-solutions"] .tap-panel');
        var rows = Array.prototype.map.call(panel.querySelectorAll('tr[data-tap-row]'), function (tr) { return tr.getAttribute('data-tap-row'); });
        a.deepEqual(rows, ['newBusiness:bravo:21'], 'only Region B’s row without a solution');
        a.match(panel.querySelector('.tap-panel__crumbs').textContent, /No solution named, Region B/, 'the breadcrumb names the level');
        panel.querySelector('.tap-panel__crumbs button').click();
        a.ok(root.querySelector('[data-slot="nb-solutions"] .tap-nbg'), 'the breadcrumb leads back to the heatmap');
      } finally { view.destroy(); }
    });

    T.test('X-p4-sol-year', 'Broken down by plan year, every year’s parts are the hand-worked figures and add up to the three years', function (a) {
      load();
      var def = TAP.reports.get(SOL);
      a.deepEqual(TAP.prepare.breakdowns(def, { measureId: M.oi }), ['year'], 'year is offered');
      var res = build(SOL, { mode: 'all' }, { type: 'table', breakdown: 'year', measureId: M.oi });
      // Region D, Solution 3: 600 + 150, 900 + 225, 1350 + 337.5; Region A, Solution 1: 500 + 100, 550 + 110, 605 + 121
      [[750, 1125, 1687.5, 'delta', 'sol3'], [600, 660, 726, 'alpha', 'sol1']].forEach(function (c) {
        var sum = 0;
        [1, 2, 3].forEach(function (y) {
          var cell = row(res, c[3], y).cells[key(M.oi, c[4])];
          expectCell(a, cell, c[y - 1], c[3] + ' ' + c[4] + ' year ' + y);
          sum += cell.v;
        });
        a.near(sum, BY_SOLUTION[c[3]].oi[VALUES.indexOf(c[4])], TOL, c[3] + ': the years add up');
      });
      var bars = build(SOL, { mode: 'all' }, { type: 'stackedBar', breakdown: 'year', measureId: M.oi });
      a.equal(bars.option.yAxis.data.length, 12, 'a stack per region and year');
      a.match(bars.option.yAxis.data[0], /Region A · 2027/, 'each named for its region and year');
      var box = parse(build(SOL, { mode: 'all' }, { type: 'heatmap', breakdown: 'year' }).html);
      a.equal(box.querySelectorAll('.tap-nbg__row--year').length, 15, 'the heatmap gets a line per year under each solution and the total');
    });

    T.test('X-p4-sol-no-data', 'A file without solutions: the report says so for every region and the view draws as before', function (a) {
      // The default fixture has no Phase 4 part
      MODES.forEach(function (m) {
        var res = build(SOL, m);
        a.equal(res.error, null, m.mode + ': builds');
        a.ok(res.empty, m.mode + ': the panel’s own empty state');
        res.table.rows.forEach(function (r) {
          Object.keys(r.cells).forEach(function (k) {
            if (r.cells[k].kind) { a.equal(r.cells[k].state, 'notProvided', m.mode + ' ' + k); a.ok(r.cells[k].src, 'with a source'); }
          });
        });
      });
      a.deepEqual(build(SOL, { mode: 'all' }).missing, ['Region A', 'Region B', 'Region C', 'Region D'], 'every region is named as not provided');
      var root = T.dom.mount(), view = TAP.views.get('newBusiness').mount(root);
      try {
        var panel = root.querySelector('.tap-panel[data-report="nb-solutions"]');
        a.ok(panel.querySelector('.tap-panel__empty'), 'the panel shows its empty state');
        a.ok(root.querySelector('.tap-panel[data-report="nb-industries"] .tap-nbg'), 'the industry grid still draws');
      } finally { view.destroy(); }
    });

    T.test('X-p4-sol-highlight', 'A highlight marks the region’s column in the heatmap and its bar in the chart', function (a) {
      load();
      var hl = { reportId: SOL, regionIds: ['bravo'], mark: 'regionColumn' };
      var box = parse(build(SOL, { mode: 'all' }, { type: 'heatmap', highlight: hl }).html);
      var marked = Array.prototype.map.call(box.querySelectorAll('.tap-nbg__cell.is-hl'), function (el) { return el.getAttribute('data-tap-region'); });
      a.ok(marked.length >= 4 && marked.every(function (r) { return r === 'bravo'; }), 'only Region B’s cells');
      var one = parse(build(SOL, { mode: 'all' }, { type: 'heatmap', highlight: Object.assign({ solution: 'sol1' }, hl) }).html);
      a.equal(one.querySelectorAll('.tap-nbg__cell.is-hl').length, 1, 'with a solution named, that cell alone');
      var bars = build(SOL, { mode: 'all' }, { type: 'stackedBar', highlight: hl }), ring = window.TAP_THEME.echarts.tap.highlight.color;
      bars.option.series.filter(function (s) { return s.tapRole === 'value'; }).forEach(function (s) {
        s.data.forEach(function (d) { if (d && d.raw != null) a.equal(d.itemStyle.borderColor === ring, d.entityId === 'bravo', s.name + ' ' + d.entityId); });
      });
    });

    T.test('X-p4-sol-escape', 'Solution and region names are escaped in the heatmap and the tooltips', function (a) {
      var plan = window.T_FIXTURE('miniP4');
      plan.lookups.solutions[0].name = '<img src=x onerror=alert(1)>';
      plan.regions[0].name = '<b>Region A</b>';
      TAP.data.load(plan);
      var html = build(SOL, { mode: 'all' }, { type: 'heatmap' }).html;
      a.ok(html.indexOf('<img') < 0 && html.indexOf('<b>') < 0, 'no markup from the data in the grid');
      a.ok(html.indexOf('&lt;img') >= 0, 'the name is shown as text');
      var bars = build(SOL, { mode: 'all' }, { type: 'stackedBar' }), s0 = bars.option.series[0];
      var tip = s0.tooltip.formatter({ data: s0.data[0] });
      a.ok(tip.indexOf('<img') < 0 && tip.indexOf('<b>Region A') < 0, 'no markup from the data in the tooltip');
      a.ok(tip.indexOf('&lt;b&gt;Region A') >= 0 && tip.indexOf('&lt;img') >= 0, 'the names are shown as text');
    });

    T.test('X-p4-sol-layout', 'The view gives the solution heatmap a full row, straight under the industry grid', function (a) {
      var layout = TAP.newBusinessView.layout();
      a.deepEqual(layout.slice(0, 2), [['nb-industries'], ['nb-solutions']], 'two full-width rows');
      a.ok(layout.every(function (r) { return r.length <= 2; }), 'never more than two side by side');
    });

    /* ---------- US-4.5.1 customer value against books value ---------- */

    /*
     * Worked by hand from the recap grids in tests/fixtures/mini-p2.js (customer value) and the books value grids in
     * tests/fixtures/mini-p4.js. Channels: direct, partner, alliance A, alliance B. The difference compares ARR and
     * services, the two types both hold; Region A's software perpetual (50) and hardware (50), both direct, and
     * Region D's hardware (100, partner) are in the books value only.
     *
     * Region A, year 1: customer value direct 400 + 80 + 100 + 20 = 600, partner 200 + 40 + 50 + 10 = 300 -> 900
     *    books value direct 400 + 80 + 50 + 20 + 100 + 20 = 670, partner 150 + 20 + 40 + 5 = 215 -> 885
     *    difference direct 600 - (670 - 50 - 20) = 0, partner 300 - 215 = 85 -> 85; 85 / 300 = 0.2833333; 85 / 900 = 0.0944444
     * Region A, year 2: customer value direct 400 + 80 + 50 + 10 = 540, partner 300 + 60 = 360 -> 900
     *    books value direct 400 + 80 + 20 + 50 + 10 = 560, partner 225 + 30 = 255 -> 815; difference 0 and 105 -> 105
     * Region A, year 3: customer value direct 500 + 100 + 50 + 10 = 660, partner 360 -> 1020
     *    books value direct 500 + 100 + 10 + 50 + 10 = 670, partner 255 -> 925; difference 0 and 105 -> 105
     * Region A, three years: customer value 1800, 1020 -> 2820; books value 1900, 725 -> 2625;
     *    difference 0, 295 -> 295; 295 / 1020 = 0.2892157; 295 / 2820 = 0.1046099
     * Region B, three years: customer value direct 2000 + 200 + 100 + 10 = 2310, alliance A 1200 + 120 + 50 = 1370 -> 3680
     *    books value direct 2310, alliance A 900 + 60 + 40 = 1000 -> 3310; difference 0, 370 -> 370; 370 / 1370 = 0.270073;
     *    370 / 3680 = 0.1005435
     * Region B, year 1: customer value direct 770, alliance A 400 + 40 + 50 = 490 -> 1260; books value 770, 300 + 20 + 40 = 360
     *    -> 1130; difference 130; 130 / 1260 = 0.1031746
     * Region D, three years: customer value direct 900 + 225 + 268 + 92 = 1485, partner 900 + 225 = 1125,
     *    alliance A 450 + 115 = 565, alliance B 450 + 110 = 560 -> 3735
     *    books value direct 1485, partner 450 + 125 + 100 = 675, alliance A 225 + 115 = 340, alliance B 225 + 110 = 335 -> 2835
     *    difference 0, 1125 - 575 = 550, 225, 225 -> 1000; shares 0.4888889, 0.3982301, 0.4017857; 1000 / 3735 = 0.2677376
     * Together (Region C has nothing): customer value 5595, 2145, 1935, 560 -> 10235; books value 5695, 1400, 1340, 335
     *    -> 8770; difference 0, 845, 595, 225 -> 1665; 845 / 2145 = 0.3939394; 595 / 1935 = 0.3074935; 1665 / 10235 = 0.1626771
     * By product category, three years (customer value holds ARR and services only):
     *    A: books value software perpetual 50, recurring 2140, hardware 50, services 385 -> 2625; customer value recurring
     *       2100 + 250 = 2350, services 420 + 50 = 470 -> 2820
     *    B: books value recurring 3040, services 270 -> 3310 (no software perpetual or hardware items: not provided);
     *       customer value recurring 3200 + 150 = 3350, services 320 + 10 = 330 -> 3680
     *    D: books value recurring 2068, hardware 100, services 667 -> 2835; customer value recurring 2700 + 268 = 2968,
     *       services 675 + 92 = 767 -> 3735
     *    A, year 1: books value 50, 690, 20, 125 -> 885; customer value recurring 600 + 150 = 750, services 120 + 30 = 150 -> 900
     */
    var BOOKS = 'pt-books', CH = ['direct', 'partner', 'allianceA', 'allianceB'], CATS = ['swPerpetual', 'recurring', 'hardware', 'services'];
    // [customer value, books value, difference, difference %] per channel, then for all channels; null = not provided
    var BY_CHANNEL = {
      all: {
        alpha: { direct: [1800, 1900, 0, 0], partner: [1020, 725, 295, 0.2892157], total: [2820, 2625, 295, 0.1046099] },
        bravo: { direct: [2310, 2310, 0, 0], allianceA: [1370, 1000, 370, 0.270073], total: [3680, 3310, 370, 0.1005435] },
        delta: { direct: [1485, 1485, 0, 0], partner: [1125, 675, 550, 0.4888889], allianceA: [565, 340, 225, 0.3982301],
          allianceB: [560, 335, 225, 0.4017857], total: [3735, 2835, 1000, 0.2677376] },
        org: { direct: [5595, 5695, 0, 0], partner: [2145, 1400, 845, 0.3939394], allianceA: [1935, 1340, 595, 0.3074935],
          allianceB: [560, 335, 225, 0.4017857], total: [10235, 8770, 1665, 0.1626771] }
      },
      1: {
        alpha: { direct: [600, 670, 0, 0], partner: [300, 215, 85, 0.2833333], total: [900, 885, 85, 0.0944444] },
        bravo: { direct: [770, 770, 0, 0], allianceA: [490, 360, 130, 0.2653061], total: [1260, 1130, 130, 0.1031746] }
      },
      2: { alpha: { direct: [540, 560, 0, 0], partner: [360, 255, 105, 0.2916667], total: [900, 815, 105, 0.1166667] } },
      3: { alpha: { direct: [660, 670, 0, 0], partner: [360, 255, 105, 0.2916667], total: [1020, 925, 105, 0.1029412] } }
    };
    var COLS = ['cv.oi', 'bk.oi', 'bk.gap', 'bk.gapShare'];
    function line(res, entityId, part) { return res.table.rows.filter(function (r) { return r.entityId === entityId && r.part === part; })[0]; }
    function checkLines(a, res, want, label) {
      Object.keys(want).forEach(function (e) {
        Object.keys(want[e]).forEach(function (part) {
          var cells = line(res, e, part === 'total' ? 'all' : part).cells;
          COLS.forEach(function (c, i) { expectCell(a, cells[c], want[e][part][i], label + ' ' + e + ' ' + part + ' ' + c); });
        });
      });
    }

    T.test('TPV-TC-728', 'Customer value, books value and the difference in money and % per region, plan year and channel equal the hand-worked figures', function (a) {
      load();
      var def = TAP.reports.get(BOOKS), list = window.TAP_VIEWS.partners.reports;
      a.ok(def && def.view === 'partners', 'pt-books is a Partners report');
      a.equal(list.indexOf(BOOKS), list.indexOf('pt-capacity') + 1, 'straight after pt-capacity');
      a.deepEqual(TAP.reports.validate(def), [], 'the definition is valid');
      [1, 2, 3].forEach(function (y) {
        var res = build(BOOKS, { mode: 'all' }, { type: 'table', opts: { year: String(y) } });
        a.equal(res.error, null, 'year ' + y + ': builds');
        checkLines(a, res, BY_CHANNEL[y], 'year ' + y);
        a.equal(line(res, 'charlie', 'all').cells['bk.oi'].state, 'notProvided', 'year ' + y + ': Region C is not provided');
      });
      var res = build(BOOKS, { mode: 'all' }, { type: 'table' });
      a.deepEqual(labels(res), ['Region', 'Channel', 'Customer value', 'Books value', 'Difference', 'Difference %'], 'the table’s columns');
      a.deepEqual(res.missing, ['Region C'], 'Region C is named as not provided');
    });

    T.test('TPV-TC-729', 'The three years together: each value is the sum of the plan years and the % difference a ratio of sums', function (a) {
      load();
      var res = build(BOOKS, { mode: 'all' }, { type: 'table' });
      a.equal(res.controls.filter(function (c) { return c.key === 'year'; })[0].value, 'all', 'the report opens on the three years together');
      checkLines(a, res, { alpha: BY_CHANNEL.all.alpha, bravo: BY_CHANNEL.all.bravo, delta: BY_CHANNEL.all.delta }, 'three years');
      // Region A by hand: 900 + 900 + 1020, 885 + 815 + 925, 85 + 105 + 105; the share is 295 / 2820, not the mean of the years' shares
      var total = line(res, 'alpha', 'all').cells, years = [1, 2, 3].map(function (y) { return BY_CHANNEL[y].alpha.total; });
      [0, 1, 2].forEach(function (i) {
        a.near(total[COLS[i]].v, years[0][i] + years[1][i] + years[2][i], TOL, COLS[i] + ': the sum of the three plan years');
      });
      var mean = (years[0][3] + years[1][3] + years[2][3]) / 3;
      a.near(total['bk.gapShare'].v, 295 / 2820, TOL, 'difference %: summed difference over summed customer value');
      a.ok(Math.abs(total['bk.gapShare'].v - mean) > 1e-5, 'and not the mean of the yearly shares (' + mean.toFixed(7) + ')');
      // Regions together: a ratio of the summed parts again
      var org = build(BOOKS, { mode: 'org' }, { type: 'table' });
      checkLines(a, org, { org: BY_CHANNEL.all.org }, 'together');
      // The mean of the three regions' shares, worked for the engine in tests/fixtures/mini-p4-expected.js: 0.1576303
      a.ok(Math.abs(line(org, 'org', 'all').cells['bk.gapShare'].v - window.TEST_EXPECT.miniP4.meanOfRatios['bk.gapShare']) > 1e-3, 'never the mean of the regions’ shares');
    });

    T.test('X-p4-books-bars', 'Two bars per region, customer value above books value, channels as parts, the difference at the end of the books bar', function (a) {
      load();
      var res = build(BOOKS, { mode: 'all' }), ss = series(res);
      a.deepEqual(res.option.yAxis.data.slice(0, 4), ['Region A · Customer value', 'Region A · Books value', 'Region B · Customer value', 'Region B · Books value']);
      a.deepEqual(ss.map(function (s) { return s.name; }), ['Direct', 'Partner', 'Alliance A', 'Alliance B'], 'the channels, in the lookup’s order');
      function seg(name, rowId) { return ss.filter(function (s) { return s.name === name; })[0].items.filter(function (d) { return d.rowId === rowId; })[0].raw; }
      a.near(seg('Partner', 'alpha:cv'), 1020, TOL, 'Region A customer value through partners');
      a.near(seg('Partner', 'alpha:bk'), 725, TOL, 'Region A books value through partners');
      a.near(seg('Alliance A', 'bravo:bk'), 1000, TOL, 'Region B books value through alliance A');
      var total = res.option.series.filter(function (s) { return s.tapRole === 'total'; })[0];
      a.match(total.label.formatter({ dataIndex: 1 }), /^€2\.6M\s+difference €295k \(10%\)$/, 'the books bar ends with the difference in money and %');
      a.match(total.label.formatter({ dataIndex: 0 }), /^€2\.8M$/, 'the customer value bar ends with its total');
      a.ok(res.legend.some(function (l) { return l.label === 'Alliance A' && l.role === 'part'; }), 'the channels are named in the key');
      a.ok(res.notes.some(function (n) { return /software perpetual and hardware/i.test(n); }), 'a note says what the difference leaves out');
    });

    T.test('TPV-TC-731', 'The explanation says why the two differ: the reseller margin, partner-delivered services, the outsourcing %', function (a) {
      var ex = TAP.reports.get(BOOKS).explain, all = [ex.shows, ex.read, ex.lookFor].join(' ');
      a.match(all, /resellers keep a margin/i, 'resellers keep a margin');
      a.match(all, /services are delivered by partners/i, 'some services are delivered by partners');
      a.match(all, /outsourcing %[^.]*moves[^.]*services[^.]*partners/i, 'how the outsourcing % moves services to partners');
      a.match(all, /customer value/i);
      a.match(all, /books/i);
      // Neutral wording (D20, D51): none of the banned words
      (window.TAP_RULES.wording.banned || []).forEach(function (w) { a.ok(!new RegExp('\\b' + w + '\\b', 'i').test(all), 'no "' + w + '"'); });
      ['shows', 'read', 'lookFor'].forEach(function (k) { a.ok(ex[k].length > 20, 'explain.' + k); });
    });

    T.test('TPV-TC-733', 'The product category switch: software perpetual, recurring, hardware and services, adding up to the channel split’s totals', function (a) {
      load();
      var sw = build(BOOKS, { mode: 'all' }).controls.filter(function (c) { return c.key === 'split'; })[0];
      a.deepEqual(sw.options.map(function (o) { return [o.value, o.label]; }), [['channel', 'Channel'], ['category', 'Product category']], 'the switch');
      a.equal(sw.value, 'channel', 'off to begin with');
      var res = build(BOOKS, { mode: 'all' }, { type: 'table', opts: { split: 'category' } }), byChannel = build(BOOKS, { mode: 'all' }, { type: 'table' });
      a.deepEqual(res.table.rows.filter(function (r) { return r.entityId === 'alpha'; }).map(function (r) { return r.cells.part.v; }),
        ['Software perpetual', 'Recurring', 'Hardware', 'Services', 'All product categories'], 'the four categories, then all of them');
      // [books value, customer value] per category; null = not provided, 'na' = customer value has no such category
      var want = {
        alpha: { swPerpetual: [50, 'na'], recurring: [2140, 2350], hardware: [50, 'na'], services: [385, 470], total: [2625, 2820] },
        bravo: { swPerpetual: [null, 'na'], recurring: [3040, 3350], hardware: [null, 'na'], services: [270, 330], total: [3310, 3680] },
        delta: { swPerpetual: [null, 'na'], recurring: [2068, 2968], hardware: [100, 'na'], services: [667, 767], total: [2835, 3735] }
      };
      Object.keys(want).forEach(function (e) {
        var sums = [0, 0];
        CATS.forEach(function (c) {
          var cells = line(res, e, c).cells;
          expectCell(a, cells['bk.oi'], want[e][c][0], e + ' ' + c + ' books value');
          if (want[e][c][1] === 'na') a.equal(cells['cv.oi'].state, 'notApplicable', e + ' ' + c + ': customer value has no such category');
          else expectCell(a, cells['cv.oi'], want[e][c][1], e + ' ' + c + ' customer value');
          sums[0] += cells['bk.oi'].v || 0;
          sums[1] += cells['cv.oi'].v || 0;
        });
        var all = line(res, e, 'all').cells, ch = line(byChannel, e, 'all').cells;
        a.near(sums[0], want[e].total[0], TOL, e + ': the categories add up to the books value');
        a.near(sums[1], want[e].total[1], TOL, e + ': the categories add up to the customer value');
        ['cv.oi', 'bk.oi', 'bk.gap', 'bk.gapShare'].forEach(function (c) { a.near(all[c].v, ch[c].v, TOL, e + ' ' + c + ': the same total as the channel split'); });
        a.near(all['bk.oi'].v, want[e].total[0], TOL, e + ' books total');
      });
      // Year 1, Region A: 50, 690, 20, 125 through the books; 750 and 150 at customer value
      var y1 = build(BOOKS, { mode: 'all' }, { type: 'table', opts: { split: 'category', year: '1' } });
      [[50, null], [690, 750], [20, null], [125, 150]].forEach(function (w, i) {
        expectCell(a, line(y1, 'alpha', CATS[i]).cells['bk.oi'], w[0], 'year 1 ' + CATS[i] + ' books value');
        if (w[1] != null) expectCell(a, line(y1, 'alpha', CATS[i]).cells['cv.oi'], w[1], 'year 1 ' + CATS[i] + ' customer value');
      });
      var bars = build(BOOKS, { mode: 'all' }, { opts: { split: 'category' } });
      a.deepEqual(series(bars).map(function (s) { return s.name; }), ['Software perpetual', 'Recurring', 'Hardware', 'Services'], 'the bars stack the categories');
    });

    T.test('X-p4-books-no-data', 'A file without books value: the report says so for every region', function (a) {
      MODES.forEach(function (m) {
        var res = build(BOOKS, m);
        a.equal(res.error, null, m.mode + ': builds');
        a.ok(res.empty, m.mode + ': the panel’s own empty state');
      });
      a.deepEqual(build(BOOKS, { mode: 'all' }).missing, ['Region A', 'Region B', 'Region C', 'Region D'], 'every region is named');
    });

    T.test('X-p4-books-click', 'A segment opens details for its region, naming the figure clicked', function (a) {
      load();
      var res = build(BOOKS, { mode: 'all' }), seg = series(res)[1].items.filter(function (d) { return d.rowId === 'alpha:bk'; })[0];
      var tg = res.target({ data: seg });
      a.deepEqual([tg.regionIds, tg.figure.key], [['alpha'], 'bk.oi@channel:partner'], 'the books value through partners');
      var first = TAP.details.build(tg).groups[0].rows[0];
      a.near(first.cell.v, 725, TOL, 'details show the figure clicked first');
      var y2 = build(BOOKS, { mode: 'all' }, { opts: { year: '2' } });
      a.equal(y2.target({ data: series(y2)[0].items.filter(function (d) { return d.rowId === 'alpha:cv'; })[0] }).figure.key, 'cv.oi@y2', 'with a plan year chosen: that year’s bar');
    });

    T.test('X-p4-books-escape', 'Names from the data are escaped in the tooltips', function (a) {
      var plan = window.T_FIXTURE('miniP4');
      plan.lookups.channels[0].name = '<img src=x onerror=alert(1)>';
      plan.regions[0].name = '<i>Region A</i>';
      TAP.data.load(plan);
      var res = build(BOOKS, { mode: 'all' }), s0 = res.option.series[0], tip = s0.tooltip.formatter({ data: s0.data[0] });
      a.ok(tip.indexOf('<img') < 0 && tip.indexOf('<i>') < 0, 'no markup from the data');
      a.ok(tip.indexOf('&lt;img') >= 0, 'the name is shown as text');
    });
  });
})(window.TAP);
