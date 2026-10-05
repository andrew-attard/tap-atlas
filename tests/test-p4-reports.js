/*
 * File: tests/test-p4-reports.js
 * Purpose: Tests for the Phase 4 reports on the New business and Partners views, checked against figures worked by
 *          hand from tests/fixtures/mini-p4.js (never against the builders' own output).
 * Provides: test cases TPV-TC-714, 715, 717, 718 and X-p4-*; window.P4R_T (shared helpers)
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
  });
})(window.TAP);
