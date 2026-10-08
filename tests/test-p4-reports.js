/*
 * File: tests/test-p4-reports.js
 * Purpose: Tests for the Phase 4 reports on the New business and Partners views, checked against figures worked by
 *          hand from tests/fixtures/mini-p4.js (never against the builders' own output).
 * Provides: test cases TPV-TC-714, 715, 717, 718, 728, 729, 731, 733, 734, 735, 737, 738, 739, 741 and X-p4-*; window.P4R_T (shared helpers)
    });

 * Provides: test cases TPV-TC-714, 715, 717, 718, 728, 729, 731, 733, 734, 735, 724, 725, 727 and X-p4-*; window.P4R_T (shared helpers)
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
    if (typeof want === 'string') a.equal(c.v, want, what); else a.near(c.v, want, TOL, what);
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
      a.match(total.label.formatter({ dataIndex: 0 }), /^€2\.8M/, 'the customer value bar ends with its total');
      a.ok(res.legend.some(function (l) { return l.label === 'Alliance A' && l.role === 'channel'; }), 'the channels are named in the key, in their colours (D124)');
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

    T.test('X-p4-pt-layout', 'The Partners view pairs its reports and gives the books value report and the list a full row', function (a) {
      var rows = TAP.partnersView.rows(window.TAP_VIEWS.partners.reports);
      a.ok(rows.every(function (r) { return r.length <= 2; }), 'never more than two side by side');
      a.deepEqual(rows[0], ['pt-reliance', 'pt-capacity'], 'the first row is as before');
      a.ok(rows.some(function (r) { return r.length === 1 && r[0] === 'pt-books'; }), 'pt-books alone on its row');
      a.deepEqual(rows[rows.length - 1], ['pt-list'], 'the list last, at full width');
      a.deepEqual([].concat.apply([], rows), window.TAP_VIEWS.partners.reports, 'every report placed, in order');
    });

    /* ---------- US-4.5.2 route to market ---------- */

    /*
     * Order intake by route on miniP4, worked by hand from the route lines in tests/fixtures/mini-p4.js (year 1 / 2 / 3):
     *   A: own sales force ARR 400 / 400 / 500 + services 80 / 80 / 100 = 480 / 480 / 600 = 1560
     *      customer success ARR 100 / 50 / 50 + services 20 / 10 / 10 = 120 / 60 / 60 = 240
     *      other resellers ARR 150 / 225 / 225 = 600                                  total 750 / 765 / 885 = 2400
     *   B: own sales force 600 / 600 / 800 = 2000; customer success 100 / 0 / 0 = 100
     *      system integrators ARR 300 x 3 + services 20 x 3 = 320 x 3 = 960            total 1020 / 920 / 1120 = 3060
     *   D: own sales force 200 / 300 / 400 = 900; Alliance B as reseller 50 / 75 / 100 = 225; other resellers
     *      100 / 150 / 200 = 450; partner existing business 30 / 30 / blank = 60        total 380 / 555 / 700 = 1635
     *   C: no route lines: not provided. A route with no line in a region is not provided there, never zero.
     *   Together: own sales force 4460, customer success 340, Alliance B as reseller 225, other resellers 1050,
     *      system integrators 960, partner existing business 60                         total 7095
     *   Shares of Region A's 2400: 1560 = 65%, 240 = 10%, 600 = 25%
     */
    var ROUTES = 'pt-routes', RT = ['ownSales', 'customerSuccess', 'allianceBReseller', 'otherResellers', 'systemIntegrators', 'partnerExisting'];
    var ROUTE_NAMES = ['Own sales force', 'Customer success', 'Alliance B as reseller', 'Other resellers', 'System integrators', 'Partner existing business'];
    var BY_ROUTE = {
      alpha: [1560, 240, null, 600, null, null, 2400], bravo: [2000, 100, null, null, 960, null, 3060], charlie: [null, null, null, null, null, null, null],
      delta: [900, null, 225, 450, null, 60, 1635], org: [4460, 340, 225, 1050, 960, 60, 7095]
    };
    // Per plan year: [own sales force, customer success, Alliance B as reseller, other resellers, system integrators, partner existing business, total]
    var ROUTE_YEARS = {
      alpha: [[480, 120, null, 150, null, null, 750], [480, 60, null, 225, null, null, 765], [600, 60, null, 225, null, null, 885]],
      bravo: [[600, 100, null, null, 320, null, 1020], [600, 0, null, null, 320, null, 920], [800, 0, null, null, 320, null, 1120]],
      delta: [[200, null, 50, 100, null, 30, 380], [300, null, 75, 150, null, 30, 555], [400, null, 100, 200, null, null, 700]]
    };
    function rkey(v) { return 'rt.oi@route:' + v; }
    function routeCells(a, cells, want, what) {
      RT.forEach(function (v, i) { expectCell(a, cells[rkey(v)], want[i], what + ' ' + v); });
      expectCell(a, cells['rt.oi'], want[6], what + ' total');
    }

    T.test('TPV-TC-734', 'Order intake per region by the six routes to market equals the hand-worked figures', function (a) {
      load();
      var def = TAP.reports.get(ROUTES), list = window.TAP_VIEWS.partners.reports;
      a.ok(def && def.view === 'partners', 'pt-routes is a Partners report');
      a.ok(list.indexOf(ROUTES) > list.indexOf('pt-capacity') && list.indexOf(ROUTES) < list.indexOf('pt-list'), 'after pt-capacity, before the list');
      a.deepEqual(TAP.reports.validate(def), [], 'the definition is valid');
      var res = build(ROUTES, { mode: 'all' }, { type: 'table' });
      a.equal(res.error, null, 'builds');
      a.deepEqual(labels(res), ['Region'].concat(ROUTE_NAMES).concat(['Total']), 'the six routes, in the lookup’s order');
      ['alpha', 'bravo', 'charlie', 'delta'].forEach(function (r) { routeCells(a, row(res, r).cells, BY_ROUTE[r], r); });
      routeCells(a, row(build(ROUTES, { mode: 'org' }, { type: 'table' }), 'org').cells, BY_ROUTE.org, 'together');
      a.deepEqual(res.missing, ['Region C'], 'Region C is named as not provided');
    });

    T.test('TPV-TC-735', '100% stacked bars and a table, with a plan year breakdown whose values add up to the three years', function (a) {
      var def = TAP.reports.get(ROUTES);
      a.equal(def.defaultType, 'stacked100', '100% stacked bars first');
      [1, 4, 7].forEach(function (n) {
        var types = TAP.shapes.types(def, n);
        a.ok(types.indexOf('stacked100') >= 0 && types.indexOf('table') >= 0, n + ' regions: 100% stacked bars and a table');
      });
      load();
      a.deepEqual(TAP.prepare.breakdowns(def, {}), ['year'], 'the plan year breakdown is offered');
      var res = build(ROUTES, { mode: 'all' }, { type: 'table', breakdown: 'year' });
      Object.keys(ROUTE_YEARS).forEach(function (r) {
        var sums = [0, 0, 0, 0, 0, 0, 0];
        [1, 2, 3].forEach(function (y) {
          var cells = row(res, r, y).cells;
          routeCells(a, cells, ROUTE_YEARS[r][y - 1], r + ' year ' + y);
          RT.concat(['total']).forEach(function (v, i) { var c = cells[i < 6 ? rkey(v) : 'rt.oi']; if (c.state === 'value') sums[i] += c.v; });
        });
        sums.forEach(function (s, i) { a.near(s, BY_ROUTE[r][i] || 0, TOL, r + ' ' + (RT[i] || 'total') + ': the years add up to the three-year figure'); });
      });
      a.equal(row(res, 'alpha', 1).cells.group.v, '2027', 'each line names its plan year');
      var bars = build(ROUTES, { mode: 'all' }, { breakdown: 'year' });
      a.equal(bars.option.yAxis.data.length, 12, 'a 100% bar per region and year');
    });

    T.test('X-p4-routes-bars', '100% bars: each route a numbered part, shares of the region’s total', function (a) {
      load();
      var res = build(ROUTES, { mode: 'all' }), ss = series(res);
      a.deepEqual(ss.map(function (s) { return s.name; }), ROUTE_NAMES, 'the six routes, in order');
      a.deepEqual(res.legend.filter(function (l) { return l.mark != null; }).map(function (l) { return [l.mark, l.label]; }),
        ROUTE_NAMES.map(function (n, i) { return [i + 1, n]; }), 'every route named in the key with its number');
      // Region A: 1560, 240 and 600 of 2400
      function pct(i) { var s = res.option.series[i], d = s.data[0]; return { v: d.value, text: s.label.formatter({ data: d, value: d.value }) }; }
      a.near(pct(0).v, 65, TOL, 'own sales force 65%');
      a.near(pct(1).v, 10, TOL, 'customer success 10%');
      a.near(pct(3).v, 25, TOL, 'other resellers 25%');
      a.match(pct(0).text, /^\{n\|1\} 65%$/, 'a wide part carries its number and share');
      a.match(pct(1).text, /^\{n\|2\}$/, 'a narrow part carries its number alone');
      a.equal(res.option.series[2].data[0].value, null, 'no part for a route the region gives no figure for');
      a.equal(res.option.xAxis.max, 100, 'the axis runs to 100%');
    });

    T.test('X-p4-routes-no-data', 'A file without routes: the report says so for every region', function (a) {
      MODES.forEach(function (m) {
        var res = build(ROUTES, m);
        a.equal(res.error, null, m.mode + ': builds');
        a.ok(res.empty, m.mode + ': the panel’s own empty state');
      });
      a.deepEqual(build(ROUTES, { mode: 'all' }).missing, ['Region A', 'Region B', 'Region C', 'Region D'], 'every region is named');
    });

    /* ---------- pt-books names its figures (glossary terms "Customer value" and "Books value", #467) ---------- */

    T.test('X-p4-books-measures', 'pt-books lists customer value and books value as its measures, with no measure switch', function (a) {
      load();
      var def = TAP.reports.get(BOOKS);
      a.deepEqual(def.measures.map(function (m) { return [m.id, m.label]; }), [['cv.oi', 'Customer value'], ['bk.oi', 'Books value']],
        'the two figures it draws, named as the glossary names them');
      def.measures.forEach(function (m) { a.ok(TAP.content.term(m.label), m.label + ' is a glossary term'); });
      a.deepEqual(TAP.reports.validate(def), [], 'the definition is valid');
      a.equal((def.options || {}).measuresAs, 'categories', 'both show together');
      var spec = TAP.panelMenus.spec({ st: { measureId: null, opts: {} }, opts: {} }, { def: def, ctx: { type: def.defaultType }, res: null });
      a.ok(!spec.own.some(function (c) { return c.key === 'measure'; }), 'no measure switch in the controls');
      a.ok(!spec.own.some(function (c) { return c.key === 'breakdown'; }), 'no breakdown menu');
      var res = build(BOOKS, { mode: 'all' }, { type: 'table' });
      checkLines(a, res, { alpha: BY_CHANNEL.all.alpha }, 'unchanged figures');
    });

    /* ---------- the sample's planted case R06 (docs/PLANTED-CASES.md) ---------- */

    // R06: Southern Europe, customer value 12,474.1 against books value over ARR and services 10,160: 18.6% (2,314.1)
    // outside the books, 39.5% for its Partner channel; every other region under 6%. Figures from SAMPLE_EXPECT.r06 and,
    // for the Partner channel's share, the planted-case table.
    T.test('X-p4-sample-r06', 'On the sample, customer value against books value shows the planted gap of Southern Europe', function (a) {
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      var X = window.SAMPLE_EXPECT.r06, res = build(BOOKS, { mode: 'all' }, { type: 'table' });
      a.equal(res.error, null, 'builds');
      var seu = line(res, X.region, 'all').cells;
      a.near(seu['cv.oi'].v, X.cv3, 0.05, 'Southern Europe: customer value 12,474.1');
      a.near(seu['bk.gap'].v, X.gap3, 0.05, 'Southern Europe: 2,314.1 outside the books');
      a.near(seu['bk.gapShare'].v, X.gapShare, 1e-4, 'Southern Europe: 18.6% of customer value');
      a.near(line(res, X.region, 'partner').cells['bk.gapShare'].v, 0.395, 5e-4, 'Southern Europe, Partner channel: 39.5%');
      Object.keys(X.gapShareByRegion).forEach(function (r) {
        a.near(line(res, r, 'all').cells['bk.gapShare'].v, X.gapShareByRegion[r], 1e-4, r + ': its share outside the books');
        if (r !== X.region) a.ok(X.gapShareByRegion[r] < 0.06, r + ': under 6%');
      });
    });

    /* ---------- US-4.5.3 partner types and maturity ---------- */

    /*
     * Partners on miniP4 (tests/fixtures/mini-p4.js), each with its type, maturity level and three-year order intake
     * (ARR + services): A1 value-added reseller, Enable, 450 + 90 = 540; A2 system integrator, "Strategic" written as
     * text, 150 + 30 = 180; A3 no type, no maturity, 90 + 0 = 90; B1 system integrator, Onboard, 150 + 30 = 180;
     * B2 value-added reseller, Enable, 60 + 15 = 75; D1 referral partner, Recruit, 240 + blank = 240. Region C names none.
     * Levels in the lookup's order: Recruit, Onboard, Enable, Skill, Strategic, then "Maturity not provided".
     *   A: partners 0, 0, 1, 0, 1, 1 = 3; order intake 0, 0, 540, 0, 180, 90 = 810
     *   B: partners 0, 1, 1, 0, 0, 0 = 2; order intake 0, 180, 75, 0, 0, 0 = 255
     *   D: partners 1, 0, 0, 0, 0, 0 = 1; order intake 240 = 240
     *   Together: partners 1, 1, 2, 0, 1, 1 = 6; order intake 240, 180, 615, 0, 180, 90 = 1305
     * By partner type: A's value-added reseller holds A1 (Enable 1, 540), system integrator A2 (Strategic 1, 180), no type
     * A3 (not provided 1, 90); B's system integrator B1 (Onboard), value-added reseller B2 (Enable); D's referral D1 (Recruit).
     */
    var MAT = 'pt-maturity', LEVELS = ['recruit', 'onboard', 'enable', 'skill', 'strategic', 'none'];
    var LEVEL_NAMES = ['Recruit', 'Onboard', 'Enable', 'Skill', 'Strategic', 'Maturity not provided'];
    var BY_LEVEL = {
      count: { alpha: [0, 0, 1, 0, 1, 1, 3], bravo: [0, 1, 1, 0, 0, 0, 2], charlie: [null, null, null, null, null, null, null], delta: [1, 0, 0, 0, 0, 0, 1], org: [1, 1, 2, 0, 1, 1, 6] },
      oi: { alpha: [0, 0, 540, 0, 180, 90, 810], bravo: [0, 180, 75, 0, 0, 0, 255], delta: [240, 0, 0, 0, 0, 0, 240], org: [240, 180, 615, 0, 180, 90, 1305] }
    };
    var PM = { count: 'pt.count.maturity', oi: 'pt.oi.maturity' };
    function mkey(m, v) { return m + '@maturity:' + v; }
    function levelCells(a, cells, m, want, what) {
      LEVELS.forEach(function (v, i) { expectCell(a, cells[mkey(m, v)], want[i], what + ' ' + v); });
      expectCell(a, cells[m], want[6], what + ' total');
    }

    T.test('TPV-TC-737', 'Partners and their planned order intake per region and maturity level, Recruit to Strategic, equal the hand-worked figures', function (a) {
      load();
      var def = TAP.reports.get(MAT), list = window.TAP_VIEWS.partners.reports;
      a.ok(def && def.view === 'partners', 'pt-maturity is a Partners report');
      a.ok(list.indexOf(MAT) > list.indexOf('pt-capacity') && list.indexOf(MAT) < list.indexOf('pt-list'), 'after pt-capacity, before the list');
      a.deepEqual(TAP.reports.validate(def), [], 'the definition is valid');
      a.deepEqual(def.measures.map(function (m) { return m.id; }), [PM.count, PM.oi], 'partners, then their order intake');
      Object.keys(PM).forEach(function (t) {
        var res = build(MAT, { mode: 'all' }, { type: 'table', measureId: PM[t] });
        a.equal(res.error, null, t + ': builds');
        a.deepEqual(labels(res), ['Region'].concat(LEVEL_NAMES).concat(['Total']), t + ': the levels in the lookup’s order, Recruit first');
        Object.keys(BY_LEVEL[t]).forEach(function (r) {
          if (r === 'org') return;
          levelCells(a, row(res, r).cells, PM[t], BY_LEVEL[t][r], t + ' ' + r);
        });
        levelCells(a, row(build(MAT, { mode: 'org' }, { type: 'table', measureId: PM[t] }), 'org').cells, PM[t], BY_LEVEL[t].org, t + ' together');
      });
      var bars = build(MAT, { mode: 'all' });
      a.deepEqual(series(bars).map(function (s) { return s.name; }), LEVEL_NAMES, 'the bars stack the levels in the same order');
      a.deepEqual(bars.missing, ['Region C'], 'Region C names no partner');
    });

    T.test('TPV-TC-738', 'Broken down by partner type, the type parts add up to each maturity level’s total', function (a) {
      load();
      var def = TAP.reports.get(MAT);
      a.deepEqual(TAP.prepare.breakdowns(def, {}), ['partnerType'], 'partner type is offered');
      Object.keys(PM).forEach(function (t) {
        var res = build(MAT, { mode: 'all' }, { type: 'table', breakdown: 'partnerType', measureId: PM[t] });
        var types = [];
        res.table.rows.forEach(function (r) { if (r.entityId === 'alpha') types.push(r.group); });
        a.deepEqual(types, ['var', 'si', 'referral', 'none'], t + ': the types in the lookup’s order, then no type');
        ['alpha', 'bravo', 'delta'].forEach(function (r) {
          LEVELS.concat(['total']).forEach(function (v, i) {
            var key = i < 6 ? mkey(PM[t], v) : PM[t], sum = 0;
            types.forEach(function (ty) { var c = row(res, r, ty).cells[key]; if (c.state === 'value') sum += c.v; });
            a.near(sum, BY_LEVEL[t][r][i] || 0, TOL, t + ' ' + r + ' ' + v + ': the types add up');
          });
        });
        // Region A's value-added reseller is A1, at Enable; its partner without a type is A3, without a maturity
        expectCell(a, row(res, 'alpha', 'var').cells[mkey(PM[t], 'enable')], t === 'count' ? 1 : 540, t + ': A1');
        expectCell(a, row(res, 'alpha', 'none').cells[mkey(PM[t], 'none')], t === 'count' ? 1 : 90, t + ': A3');
      });
      var bars = build(MAT, { mode: 'all' }, { breakdown: 'partnerType' });
      a.match(bars.option.yAxis.data[0], /^Region A · Value-added reseller$/, 'a bar per region and type, each named');
    });

    T.test('TPV-TC-739', 'The partner list has type, maturity and distribution columns; each sorts both ways; maturity in the lookup’s order', function (a) {
      load();
      var def = TAP.reports.get('pt-list'), keys = def.columns.map(function (c) { return c.key; });
      ['type', 'maturity', 'distribution'].forEach(function (k) { a.ok(keys.indexOf(k) >= 0, 'column ' + k); });
      a.ok(keys.indexOf('type') === keys.indexOf('channel') + 1, 'type sits next to the channel');
      var X = window.TEST_EXPECT.miniP4;
      var res = build('pt-list', { mode: 'all' });
      a.deepEqual(res.table.columns.filter(function (c) { return ['type', 'maturity', 'distribution'].indexOf(c.key) >= 0; }).map(function (c) { return c.label; }),
        ['Type', 'Maturity', 'Distribution at customer value, 3 years'], 'the headings');
      X.partnerList.forEach(function (p) {
        var r = res.table.rows.filter(function (x) { return x.id === p[0]; })[0];
        [['type', 1], ['maturity', 2], ['distribution', 3]].forEach(function (c) { expectCell(a, r.cells[c[0]], p[c[1]], p[0] + ' ' + c[0]); });
      });
      function ids(sort) { return build('pt-list', { mode: 'all' }, { opts: { sort: sort } }).table.rows.map(function (r) { return r.id; }); }
      a.deepEqual(ids('maturity:asc'), X.byMaturity, 'maturity ascending: Recruit first, the partner without one last');
      a.deepEqual(ids('maturity:desc'), ['alpha:11', 'alpha:10', 'bravo:11', 'bravo:10', 'delta:10', 'alpha:12'], 'maturity descending: Strategic first, the blank still last');
      a.ok(X.byMaturity.join() !== ids('maturity:asc').sort().join(), 'not the alphabet (Enable, Onboard, Recruit, Strategic)');
      a.deepEqual(ids('type:asc'), ['delta:10', 'alpha:11', 'bravo:10', 'alpha:10', 'bravo:11', 'alpha:12'], 'type ascending: referral, system integrators, resellers, no type last');
      a.deepEqual(ids('type:desc'), ['alpha:10', 'bravo:11', 'alpha:11', 'bravo:10', 'delta:10', 'alpha:12'], 'type descending');
      a.deepEqual(ids('distribution:asc'), ['bravo:11', 'alpha:11', 'bravo:10', 'delta:10', 'alpha:10', 'alpha:12'], 'distribution ascending: 90, 200, 240, 300, 900, blank');
      a.deepEqual(ids('distribution:desc'), ['alpha:10', 'delta:10', 'bravo:10', 'alpha:11', 'bravo:11', 'alpha:12'], 'distribution descending');
      // The heading offers the other direction once clicked (as every column does)
      var box = parse(build('pt-list', { mode: 'all' }, { opts: { sort: 'maturity:asc' } }).html);
      a.equal(box.querySelector('th[data-tap-col="maturity"] button').getAttribute('data-tap-value'), 'maturity:desc', 'the next click sorts the other way');
      a.equal(box.querySelector('th[data-tap-col="maturity"]').getAttribute('aria-sort'), 'ascending', 'and the heading says the direction');
    });

    T.test('X-p4-list-before-p4', 'A file without partner types or distribution: the list shows neither column, as before', function (a) {
      var res = build('pt-list', { mode: 'all' }), keys = res.table.columns.map(function (c) { return c.key; });
      a.ok(keys.indexOf('type') < 0 && keys.indexOf('distribution') < 0, 'no Phase 4 column');
      a.ok(keys.indexOf('maturity') >= 0, 'maturity, as in Phase 2');
      a.equal(res.notes.length, 0, 'and no note about a missing column');
    });

    T.test('TPV-TC-741', 'Partners without a maturity are counted under "not provided", never dropped', function (a) {
      load();
      var res = build(MAT, { mode: 'all' }, { type: 'table' });
      a.ok(labels(res).indexOf('Maturity not provided') >= 0, 'the table has the group');
      expectCell(a, row(res, 'alpha').cells[mkey(PM.count, 'none')], 1, 'Region A: partner A3');
      expectCell(a, row(build(MAT, { mode: 'all' }, { type: 'table', measureId: PM.oi }), 'alpha').cells[mkey(PM.oi, 'none')], 90, 'with its order intake');
      ['alpha', 'bravo', 'delta'].forEach(function (r) {
        var cells = row(res, r).cells, n = (TAP.data.region(r).partners || []).length;
        a.near(LEVELS.reduce(function (s, v) { return s + cells[mkey(PM.count, v)].v; }, 0), n, TOL, r + ': every partner is counted');
      });
      a.ok(series(build(MAT, { mode: 'all' })).some(function (s) { return s.name === 'Maturity not provided'; }), 'the bars name it');
      // A level written as its name in any case is mapped, never dropped (A2's "Strategic")
      expectCell(a, row(res, 'alpha').cells[mkey(PM.count, 'strategic')], 1, 'Region A: partner A2, written as text');
      // The list shows the same partner as not provided
      var list = build('pt-list', { mode: 'all' }).table.rows.filter(function (r) { return r.id === 'alpha:12'; })[0];
      a.equal(list.cells.maturity.state, 'notProvided', 'the list reads "not provided" for A3');
    });

    T.test('X-p4-maturity-no-data', 'A file without maturity lookups: the report says so for every region', function (a) {
      MODES.forEach(function (m) {
        var res = build(MAT, m);
        a.equal(res.error, null, m.mode + ': builds');
        a.ok(res.empty, m.mode + ': the panel’s own empty state');
      });
      a.deepEqual(build(MAT, { mode: 'all' }).missing, ['Region A', 'Region B', 'Region C', 'Region D'], 'every region is named');
    });

    /* ---------- the sample's planted case R08 (docs/PLANTED-CASES.md) ---------- */

    // R08: the 28 sample partners by maturity (Recruit 5, Onboard 3, Enable 6, Skill 7, Strategic 6, not named 1) and by
    // type (value-added reseller 16, system integrator 7, referral partner 4, not named 1). Figures from SAMPLE_EXPECT.r08.
    T.test('X-p4-sample-r08', 'On the sample, partners by maturity and by type equal the planted counts', function (a) {
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      var X = window.SAMPLE_EXPECT.r08;
      var res = build(MAT, { mode: 'org' }, { type: 'table', measureId: PM.count }), cells = row(res, 'org').cells;
      LEVELS.forEach(function (v) { expectCell(a, cells[mkey(PM.count, v)], X.maturity[v], 'together: partners at ' + v); });
      expectCell(a, cells[PM.count], X.partners, 'together: 28 partners');
      var oi = row(build(MAT, { mode: 'org' }, { type: 'table', measureId: PM.oi }), 'org').cells;
      LEVELS.forEach(function (v) { a.near(oi[mkey(PM.oi, v)].v, X.oiByMaturity[v], 0.05, 'together: order intake at ' + v); });
      var byType = build(MAT, { mode: 'org' }, { type: 'table', breakdown: 'partnerType', measureId: PM.count });
      Object.keys(X.types).forEach(function (ty) {
        var r = row(byType, 'org', ty);
        a.ok(r, 'a line for type ' + ty);
        expectCell(a, r.cells[PM.count], X.types[ty], 'together: partners of type ' + ty);
      });
    });

    /* ---------- US-4.4.3 solution as a breakdown on the existing new business reports ---------- */

    /*
     * The levers by solution on miniP4, worked by hand from the rows (tests/fixtures/mini-p4.js). Each lever is read
     * over the rows that name the solution; counts add up, rates are weighted as the lever's own rule says (hit rate by
     * target accounts, deal size by implied wins, growth by three-year ARR), so the whole-region figure is the weighted
     * recomposition of its solution parts, never their mean.
     *   A: row 20 (Solution 1): 20 target accounts, hit rate 0.25 (5 wins), deal 100, growth 0.1 / 0.1, ARR 1655
     *      row 21 (Solution 2): 10 target accounts, hit rate 0.1 (1 win), deal 200, growth 0 / 0, ARR 600
     *      all: 30 accounts, 6 wins, hit rate 6 / 30 = 0.2, deal (100 x 5 + 200 x 1) / 6 = 116.6667,
     *      growth year 2 (0.1 x 1655 + 0 x 600) / 2255 = 0.0733925
     *   B: row 20 (Solution 1): 40, 0.5 (20 wins), 50, 0.2 / 0, ARR 3400; row 21 (no solution): 10, 0.2 (2 wins), 100, 0 / 0, ARR 600
     *      all: 50 accounts, 22 wins, hit rate 0.44, deal (50 x 20 + 100 x 2) / 22 = 54.5455, growth year 2 (0.2 x 3400) / 4000 = 0.17
     *   C: no row names a solution: row 20 (10 accounts, no hit rate, deal 80) and row 21 (5, 0.2, 1 win, deal 100) count under
     *      "No solution named": 15 accounts, 1 win, hit rate 0.2 over the rated row, deal 100 (the row with a win)
     *   D: row 20 (Solution 3): 100, 0.6 (60 wins), 10, 0.5 / 0.5
     *   Together, Solution 1: hit rate (5 + 20) / (20 + 40) = 0.4166667; deal (100 x 5 + 50 x 20) / 25 = 60;
     *      growth year 2 (0.1 x 1655 + 0.2 x 3400) / 5055 = 845.5 / 5055 = 0.1672601
     * A solution a region has no row for: counts read zero (the rows exist, none is in the solution), rates are not provided.
     * "No solution named" is listed only when some region has a figure other than zero under it: every row without a
     * solution plans no growth, so the two growth levers have no such column (undefined below).
     */
    var LEV = 'nb-levers', LEVERS = ['nb.targetAccounts', 'nb.hitRate', 'nb.avgDealSize', 'nb.wins', 'nb.growthY2', 'nb.growthY3'];
    var SV = ['sol1', 'sol2', 'sol3', 'none'];
    // Per region: [Solution 1, Solution 2, Solution 3, No solution named, all]; null = not provided
    var LEVER_SOL = {
      'nb.targetAccounts': { alpha: [20, 10, 0, 0, 30], bravo: [40, 0, 0, 10, 50], charlie: [0, 0, 0, 15, 15], delta: [0, 0, 100, 0, 100] },
      'nb.wins': { alpha: [5, 1, 0, 0, 6], bravo: [20, 0, 0, 2, 22], charlie: [0, 0, 0, 1, 1], delta: [0, 0, 60, 0, 60] },
      'nb.hitRate': { alpha: [0.25, 0.1, null, null, 0.2], bravo: [0.5, null, null, 0.2, 0.44], charlie: [null, null, null, 0.2, 0.2], delta: [null, null, 0.6, null, 0.6] },
      'nb.avgDealSize': { alpha: [100, 200, null, null, 116.6666667], bravo: [50, null, null, 100, 54.5454545], charlie: [null, null, null, 100, 100], delta: [null, null, 10, null, 10] },
      'nb.growthY2': { alpha: [0.1, 0, null, undefined, 0.0733925], bravo: [0.2, null, null, undefined, 0.17], charlie: [null, null, null, undefined, 0], delta: [null, null, 0.5, undefined, 0.5] },
      'nb.growthY3': { alpha: [0.1, 0, null, undefined, 0.0733925], bravo: [0, null, null, undefined, 0], charlie: [null, null, null, undefined, 0], delta: [null, null, 0.5, undefined, 0.5] }
    };
    function skey(m, v) { return m + '@solution:' + v; }

    T.test('TPV-TC-724', '"Solution" is offered on the levers, whose measures list it, and not on the industries or channels, whose measures do not', function (a) {
      load();
      var lev = TAP.reports.get(LEV);
      a.ok(lev.breakdowns.indexOf('solution') >= 0, 'the levers allow it');
      LEVERS.forEach(function (m) {
        a.ok(TAP.measures.meta(m).dims.indexOf('solution') >= 0, m + ' lists solution');
        a.deepEqual(TAP.prepare.breakdowns(lev, { measureId: m }), ['industry', 'solution'], m + ': industry and solution offered');
      });
      a.ok(TAP.measures.meta('nb.targetAccountsRated').dims.indexOf('solution') >= 0, 'the hit rate’s weight lists it too');
      ['nb-industries', 'nb-channels'].forEach(function (id) {
        var def = TAP.reports.get(id);
        def.measures.forEach(function (m) {
          a.ok(TAP.measures.meta(m.id).dims.indexOf('solution') < 0, id + ': ' + m.id + ' does not list solution');
          a.ok(TAP.prepare.breakdowns(def, { measureId: m.id }).indexOf('solution') < 0, id + ': not offered for ' + m.id);
        });
      });
      // A file whose rows name no solution: not offered on the levers either
      TAP.data.load(window.T_FIXTURE('mini'));
      a.deepEqual(TAP.prepare.breakdowns(lev, {}), ['industry'], 'before Phase 4 data: industry only');
    });

    T.test('TPV-TC-725', 'Each lever broken down by solution equals the hand-worked figures and recomposes to the whole-region figure', function (a) {
      load();
      LEVERS.forEach(function (m) {
        var res = build(LEV, { mode: 'all' }, { type: 'table', breakdown: 'solution', measureId: m });
        a.equal(res.error, null, m + ': builds');
        var none = LEVER_SOL[m].alpha[3] !== undefined, want0 = ['Solution 1', 'Solution 2', 'Solution 3'].concat(none ? ['No solution named'] : []);
        a.deepEqual(res.table.columns.slice(2).map(function (c) { return c.label; }), want0, m + ': a column per solution, in order');
        Object.keys(LEVER_SOL[m]).forEach(function (r) {
          var cells = row(res, r).cells, want = LEVER_SOL[m][r], num = 0, den = 0, sum = 0;
          SV.forEach(function (v, i) {
            var c = cells[skey(m, v)];
            if (want[i] === undefined) { a.equal(c, undefined, m + ' ' + r + ' ' + v + ': no column'); return; }
            expectCell(a, c, want[i], m + ' ' + r + ' ' + v);
            if (c.state !== 'value') return;
            sum += c.v;
            if (c.ratio) { num += c.ratio.num; den += c.ratio.den; }
          });
          expectCell(a, cells[m], want[4], m + ' ' + r + ' all');
          if (TAP.measures.meta(m).valueKind === 'count') a.near(sum, want[4], TOL, m + ' ' + r + ': the solutions add up');
          else if (den > 0 && want[3] !== undefined) a.near(num / den, want[4], TOL, m + ' ' + r + ': the weighted parts recompose the whole');
        });
      });
      // Regions together, Solution 1
      var org = build(LEV, { mode: 'org' }, { type: 'table', breakdown: 'solution', measureId: 'nb.hitRate' });
      expectCell(a, row(org, 'org').cells[skey('nb.hitRate', 'sol1')], 25 / 60, 'together: hit rate in Solution 1');
      org = build(LEV, { mode: 'org' }, { type: 'table', breakdown: 'solution', measureId: 'nb.avgDealSize' });
      expectCell(a, row(org, 'org').cells[skey('nb.avgDealSize', 'sol1')], 60, 'together: deal size in Solution 1');
      org = build(LEV, { mode: 'org' }, { type: 'table', breakdown: 'solution', measureId: 'nb.growthY2' });
      expectCell(a, row(org, 'org').cells[skey('nb.growthY2', 'sol1')], 845.5 / 5055, 'together: year 2 growth in Solution 1');
      // Grouped bars, every group labelled (TPV-TC-726 in code)
      var bars = build(LEV, { mode: 'all' }, { breakdown: 'solution', measureId: 'nb.targetAccounts' });
      a.equal(bars.option.series.filter(function (s) { return s.tapRole === 'value'; }).length, 4, 'a group of four bars per region');
      a.ok(bars.legend.filter(function (l) { return l.role === 'part'; }).length === 4, 'every solution named in the key');
      var s0 = bars.option.series[0];
      a.match(s0.label.formatter({ data: s0.data[0] }), /^Solution 1\s+20$/, 'each bar carries its solution’s name and value');
    });

    T.test('TPV-TC-727', 'Build a chart offers solution and category as dimensions of the measures that support them', function (a) {
      load();
      function byId(id) { return TAP.custom.options().filter(function (o) { return o.measureId === id; })[0]; }
      a.deepEqual(byId('nb.arr').by, ['entity', 'year', 'industry', 'solution'], 'new business ARR by solution');
      a.deepEqual(byId('nb.targetAccounts').by, ['entity', 'industry', 'solution'], 'target accounts by solution');
      a.deepEqual(byId('oi.cat').by, ['entity', 'year', 'category'], 'order intake by product category');
      a.deepEqual(byId('sp.oi').by, ['entity', 'year', 'category'], 'the strategic plan by product category');
      a.ok(byId('rc.nb.arr').by.indexOf('solution') < 0, 'the recap has no solution');
      var d = TAP.custom.definition({ measure: 'nb.wins', by: 'solution', type: 'groupedBar' });
      a.ok(!d.errors, 'a chart of wins by solution is a valid definition');
      a.deepEqual(TAP.custom.definition({ measure: 'oi.cat', by: 'category', type: 'groupedBar' }).breakdowns, ['category'], 'and one by category');
    });

    T.test('X-p4-levers-unchanged', 'Nothing else about the levers changes: measures, types, default and the industry breakdown as before', function (a) {
      var def = TAP.reports.get(LEV);
      a.deepEqual(def.measures.map(function (m) { return m.id; }), LEVERS, 'the six levers');
      a.deepEqual(def.types, ['bar', 'dot', 'bubble', 'table'], 'the chart types');
      a.equal(def.defaultType, 'bar', 'bar first');
      a.deepEqual(def.breakdowns, ['industry', 'solution'], 'industry, then solution');
      a.deepEqual(TAP.reports.get('nb-channels').breakdowns, ['year'], 'the channels: plan year only');
      a.deepEqual(TAP.reports.get('nb-industries').breakdowns, ['year'], 'the industries: plan year only');
    });

    /* ---------- the sample's planted case R07 (docs/PLANTED-CASES.md) ---------- */

    // R07: Northern Europe's Solution 2 carries 68.3% of its three-year new business order intake (7,763.3);
    // no solution carries more than 38.4% of any other region's. Figures from SAMPLE_EXPECT.r07 (the generator's).
    T.test('X-p4-sample-r07', 'On the sample, new business by solution shows Northern Europe leaning on Solution 2', function (a) {
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      var X = window.SAMPLE_EXPECT.r07, res = build(SOL, { mode: 'all' }, { type: 'table', measureId: 'nb.oi.sol' });
      a.equal(res.error, null, 'builds');
      Object.keys(X.topByRegion).forEach(function (r) {
        var cells = row(res, r).cells, top = X.topByRegion[r], total = cells['nb.oi.sol'];
        a.equal(total.state, 'value', r + ': a total');
        a.near(cells[key('nb.oi.sol', top.id)].v / total.v, top.share, 1e-4, r + ': ' + top.id + ' carries its share');
      });
      a.near(row(res, X.region).cells[key('nb.oi.sol', X.solution)].v, X.oi, 0.05, 'Northern Europe, Solution 2: 7,763.3');
      // The levers by solution on the sample: target accounts per solution add up to the region's
      var lev = build(LEV, { mode: 'all' }, { type: 'table', breakdown: 'solution', measureId: 'nb.targetAccounts' });
      window.SAMPLE_EXPECT.regions.forEach(function (r) {
        var cells = row(lev, r).cells, sum = 0;
        Object.keys(cells).forEach(function (k) { if (k.indexOf('nb.targetAccounts@solution:') === 0 && cells[k].state === 'value') sum += cells[k].v; });
        a.near(sum, window.SAMPLE_EXPECT.totals[r]['nb.targetAccounts'], TOL, r + ': target accounts by solution add up');
      });
    });
  });
})(window.TAP);
