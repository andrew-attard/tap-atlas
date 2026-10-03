/*
 * File: tests/test-shapes.js
 * Purpose: Tests for chart-type rules, prepared data and the generic builders: allowed types per shape, table
 *          values identical to chart values, the five modes on the reference report, highlights, escaping, colours.
 * Provides: test cases TPV-TC-056, TPV-TC-062, TPV-TC-074 (report weights), TPV-TC-075 (builders), TPV-TC-095,
 *           X-shapes-*, X-prepare-*, X-builders-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var X = window.TEST_EXPECT.mini;
  var TOL = 1e-6;
  var TH = window.TAP_THEME;

  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c); }
  function ctxFor(def, type, c, extra) {
    var k = cmp(c);
    return Object.assign({ def: def, type: type, measureId: null, sizeId: null, breakdown: null, cmp: k,
      entities: TAP.scope.entities(k), year: null, industryId: null, highlight: null, expanded: false, theme: TH }, extra || {});
  }
  function builderFor(def) { return TAP.builders.get(def.builder || (def.shape === 'xyz' ? 'xy' : def.shape)); }
  function build(id, type, c, extra) {
    var def = TAP.reports.get(id);
    return builderFor(def)(ctxFor(def, type, c, extra));
  }
  function seriesOf(res) {
    var s = res.option && res.option.series;
    return Array.isArray(s) ? s : s ? [s] : [];
  }
  // Every value-carrying data item, including treemap children.
  function items(res) {
    var out = [];
    function walk(list, s) {
      (list || []).forEach(function (d) {
        if (!d || typeof d !== 'object') return;
        if (d.raw !== undefined && !d.np) out.push({ d: d, s: s });
        if (d.children) walk(d.children, s);
      });
    }
    seriesOf(res).forEach(function (s) { walk(s.data, s); });
    return out;
  }
  function rowOf(res, d) {
    return res.table.rows.filter(function (r) { return r.entityId === d.entityId && (r.industryId || null) === (d.industryId || null); })[0];
  }
  // TPV-TC-062: each chart value equals the table value for the same row and column.
  function sameAsTable(a, res, label) {
    var n = 0;
    items(res).forEach(function (it) {
      var d = it.d, row = rowOf(res, d);
      a.ok(row, label + ': table row for ' + d.entityId);
      (d.keys || [d.key]).forEach(function (k, i) {
        if (!k) return;
        var raw = d.keys ? d.raw[i] : d.raw;
        a.equal(raw, row.cells[k].v, label + ': ' + d.entityId + ' ' + k);
        n++;
      });
    });
    a.ok(n > 0, label + ': compared ' + n + ' values');
    return n;
  }

  T.suite('shapes', function () {
    T.test('TPV-TC-056', 'Allowed chart types follow the D18 table for every shipped report', function (a) {
      var all = TAP.reports.all();
      Object.keys(all).forEach(function (id) {
        var def = all[id];
        [1, 3, 4, 7].forEach(function (n) {
          var t = TAP.shapes.types(def, n), label = id + ' with ' + n;
          t.forEach(function (x) {
            a.ok(x === 'table' || (TAP.reports.SHAPE_TYPES[def.shape].indexOf(x) >= 0 && def.types.indexOf(x) >= 0), label + ': ' + x);
          });
          a.ok(t.indexOf('table') >= 0, label + ': table always');
          a.equal(t.indexOf('radar') >= 0, n <= 3 && def.types.indexOf('radar') >= 0, label + ': radar only with 3 or fewer');
          if (t.indexOf('bubble') >= 0) a.ok(def.size && def.size.options.length, label + ': bubble needs a size');
          a.equal(t.indexOf('donut'), -1, label + ': no donut');
        });
      });
      a.deepEqual(TAP.shapes.types(TAP.reports.get('ov-ambition'), 7), ['stackedBar', 'stacked100', 'treemap', 'bubble', 'table']);
      a.deepEqual(TAP.shapes.types(TAP.reports.get('ind-ratings'), 3), ['dot', 'bar', 'radar', 'table']);
      a.deepEqual(TAP.shapes.types(TAP.reports.get('ind-ratings'), 4), ['dot', 'bar', 'table']);
    });

    T.test('TPV-TC-056', 'Bubble needs a size measure; grouped bars appear once a breakdown is chosen', function (a) {
      var def = Object.assign({}, TAP.reports.get('ov-ambition'), { size: null });
      a.equal(TAP.shapes.types(def, 4).indexOf('bubble'), -1);
      var grouped = Object.assign({}, TAP.reports.get('ov-ambition'), { types: ['stackedBar', 'groupedBar', 'table'] });
      a.equal(TAP.shapes.types(grouped, 4).indexOf('groupedBar'), -1, 'no breakdown');
      a.ok(TAP.shapes.types(grouped, 4, { breakdown: 'year' }).indexOf('groupedBar') >= 0, 'with a breakdown');
      a.deepEqual(TAP.shapes.types({ shape: 'compare', types: ['bar'] }, 2), ['bar', 'table'], 'table added if missing');
    });

    T.test('X-shapes-labels', 'Every chart type has a menu name', function (a) {
      TAP.reports.TYPES.forEach(function (t) { a.ok(TAP.shapes.label(t).charAt(0) !== '[', t); });
      a.equal(TAP.shapes.label('stackedBar'), 'Stacked bar');
      a.equal(TAP.shapes.label('stacked100'), '100% stacked bar');
    });

    T.test('X-shapes-validate', 'Every shipped definition passes validation now that the measures exist', function (a) {
      var all = TAP.reports.all();
      Object.keys(all).forEach(function (id) { a.deepEqual(TAP.reports.validate(all[id]), [], id); });
    });
  });

  T.suite('prepare', function () {
    T.test('X-prepare-dataset', 'Prepared rows hold a full cell with its source for every measure the report names', function (a) {
      var def = TAP.reports.get('ov-ambition');
      var ds = TAP.prepare.run(def, ctxFor(def, 'stackedBar', { mode: 'all' }));
      a.deepEqual(ds.rows.map(function (r) { return r.entityId; }), ['alpha', 'bravo', 'charlie', 'delta']);
      TAP.reports.measureIds(def).forEach(function (id) {
        a.ok(ds.columns.some(function (c) { return c.key === id; }), 'column ' + id);
        ds.rows.forEach(function (r) { a.ok(r.cells[id] && r.cells[id].src, r.entityId + ' ' + id + ' has a source'); });
      });
      a.near(ds.rows[0].cells['amb.arr'].v, X.region.alpha['amb.arr'], TOL);
      a.deepEqual(ds.missing, []);
      a.equal(ds.empty, false);
    });

    T.test('X-prepare-years', 'Breaking down by year adds one column per plan year that adds up to the total', function (a) {
      var def = TAP.reports.get('ov-ambition');
      var ds = TAP.prepare.run(def, ctxFor(def, 'stackedBar', { mode: 'all' }, { breakdown: 'year' }));
      var r = ds.rows[0];
      a.equal(r.cells['amb.arr@y1'].v, 900, 'A year 1: 700 new business + (50 + 100 + 0 + 50) customer growth');
      a.equal(r.cells['amb.arr@y1'].src.year, 1, 'the source names the plan year');
      a.near(r.cells['amb.arr@y1'].v + r.cells['amb.arr@y2'].v + r.cells['amb.arr@y3'].v, r.cells['amb.arr'].v, TOL);
    });

    T.test('TPV-TC-074', 'A report definition’s own weight is used by the prepared data', function (a) {
      var def = { id: 'x-hit', view: 'overview', title: 'x', shape: 'compare', dimension: 'entity', measures: [{ id: 'nb.hitRate' }],
        types: ['bar', 'table'], defaultType: 'bar', options: { weights: { 'nb.hitRate': 'nb.arr' } } };
      var ds = TAP.prepare.run(def, ctxFor(def, 'bar', { mode: 'org' }));
      a.near(ds.rows[0].cells['nb.hitRate'].v, 0.4232855, TOL, '3981 / 9405');
      def.options = {};
      a.near(TAP.prepare.run(def, ctxFor(def, 'bar', { mode: 'org' })).rows[0].cells['nb.hitRate'].v, X.combined.orgTotal['nb.hitRate'], TOL);
    });
  });

  T.suite('builders', function () {
    var MODES = [{ mode: 'all' }, { mode: 'one', focus: 'alpha' }, { mode: 'one', focus: 'bravo', restAs: 'individual' },
      { mode: 'one', focus: 'delta', restAgg: 'total' }, { mode: 'pair', focus: 'charlie', second: 'alpha' },
      { mode: 'set', set: ['bravo', 'delta'] }, { mode: 'org' }];

    T.test('TPV-TC-062', 'Ambition report: every table value equals the chart value, in every type and mode', function (a) {
      MODES.forEach(function (c) {
        ['stackedBar', 'stacked100', 'treemap', 'bubble'].forEach(function (type) {
          ['amb.arr', 'amb.oi'].forEach(function (mid) {
            var res = build('ov-ambition', type, c, { measureId: mid });
            sameAsTable(a, res, c.mode + ' ' + type + ' ' + mid);
            if (type === 'stackedBar') items(res).forEach(function (it) { a.equal(it.d.value, it.d.raw, 'bar length is the value'); });
          });
        });
      });
      var y = build('ov-ambition', 'stackedBar', { mode: 'all' }, { breakdown: 'year' });
      sameAsTable(a, y, 'by year');
    });

    T.test('TPV-TC-062', 'Ratings report: every table value equals the chart value, in every type and mode', function (a) {
      MODES.forEach(function (c) {
        ['dot', 'bar', 'radar'].forEach(function (type) {
          var res = build('ind-ratings', type, c, { industryId: 'ind1' });
          sameAsTable(a, res, c.mode + ' ' + type);
          if (type === 'dot') items(res).forEach(function (it) { a.equal(it.d.value[0], it.d.raw, 'nudging never moves the value'); });
        });
      });
    });

    T.test('TPV-TC-075', 'The reference report draws exactly the expected regions and combined figures in each mode', function (a) {
      function cats(c) { return build('ov-ambition', 'stackedBar', c).option.yAxis.data; }
      a.deepEqual(cats({ mode: 'all' }), ['Region A', 'Region B', 'Region C', 'Region D']);
      a.deepEqual(cats({ mode: 'one', focus: 'alpha' }), ['Region A', 'Average of the other 3 regions']);
      a.deepEqual(cats({ mode: 'one', focus: 'alpha', restAs: 'individual' }), ['Region A', 'Region B', 'Region C', 'Region D']);
      a.deepEqual(cats({ mode: 'pair', focus: 'delta', second: 'bravo' }), ['Region D', 'Region B']);
      a.deepEqual(cats({ mode: 'set', set: ['delta', 'alpha'] }), ['Region A', 'Region D']);
      a.deepEqual(cats({ mode: 'org' }), ['Organization total (4 regions)']);
      var org = build('ov-ambition', 'stackedBar', { mode: 'org' });
      a.near(org.table.rows[0].cells['amb.arr'].v, X.combined.orgTotal['amb.arr'], TOL);
      var rest = build('ov-ambition', 'stackedBar', { mode: 'one', focus: 'alpha' });
      a.near(rest.table.rows[1].cells['amb.arr'].v, X.combined.restOfAlphaAverage['amb.arr'], TOL);
      a.near(rest.table.rows[1].cells['nb.arr'].v + rest.table.rows[1].cells['cg.arr'].v, rest.table.rows[1].cells['amb.arr'].v, TOL,
        'the parts add up to the total');
      a.ok(rest.notes.some(function (n) { return /Region C/.test(n); }), 'the note names Region C');
    });

    T.test('TPV-TC-095', 'Bubble view: across is new business, up is customer growth, size is current ARR', function (a) {
      var res = build('ov-ambition', 'bubble', { mode: 'all' });
      var placed = {};
      items(res).forEach(function (it) { placed[it.d.entityId] = it.d; });
      ['alpha', 'bravo', 'delta'].forEach(function (r) {
        var e = [X.region[r]['nb.arr'], X.region[r]['cg.arr'], X.region[r]['base.arr']];
        a.deepEqual(placed[r].raw, e, r);
        a.deepEqual(placed[r].value.slice(0, 3), e, r + ' drawn at its values');
      });
      a.ok(!placed.charlie, 'Region C has no customer growth figure, so it cannot be placed');
      a.ok(res.notes.some(function (n) { return /Region C/.test(n); }), 'and a note says so');
      a.ok(res.sizeLegend && res.sizeLegend.items.length === 3, 'size legend');
    });

    T.test('X-builders-result', 'Builders return the full result shape, and clicks map to details targets', function (a) {
      [['ov-ambition', 'stackedBar'], ['ov-ambition', 'bubble'], ['ind-ratings', 'dot']].forEach(function (p) {
        var res = build(p[0], p[1], { mode: 'all' }, { industryId: 'ind1' });
        ['option', 'table', 'legend', 'notes', 'missing'].forEach(function (k) { a.ok(res[k] !== undefined, p.join(' ') + ' ' + k); });
        a.equal(res.error, null);
        a.equal(res.empty, false);
        a.equal(typeof res.target, 'function');
        var first = items(res)[0].d;
        var t = res.target({ data: first });
        a.equal(t.reportId, p[0]);
        a.deepEqual(t.regionIds, [first.entityId]);
        a.equal(res.legend.length >= 1, true);
      });
      a.deepEqual(build('ind-ratings', 'dot', { mode: 'all' }, { industryId: 'ind1' }).target({ data: null }), null);
    });

    T.test('X-builders-highlight', 'A highlight is drawn for every matching region, not only the first', function (a) {
      var hl = { reportId: 'ind-ratings', regionIds: ['alpha', 'delta'], mark: 'points' };
      var res = build('ind-ratings', 'dot', { mode: 'all' }, { industryId: 'ind1', highlight: hl });
      var ring = seriesOf(res).filter(function (s) { return s.tapRole === 'highlight'; })[0];
      a.ok(ring, 'highlight series');
      var who = {};
      ring.data.forEach(function (d) { who[d.entityId] = (who[d.entityId] || 0) + 1; });
      a.deepEqual(who, { alpha: 6, delta: 6 }, 'six ratings each');
      var bars = build('ov-ambition', 'stackedBar', { mode: 'all' }, { highlight: { reportId: 'ov-ambition', regionIds: ['bravo', 'delta'] } });
      items(bars).forEach(function (it) {
        var on = it.d.entityId === 'bravo' || it.d.entityId === 'delta';
        a.equal(it.d.itemStyle.borderColor === TH.accent, on, it.d.entityId + ' ' + it.d.key);
      });
    });

    T.test('X-builders-escape', 'Names from the workbooks are escaped in tooltips', function (a) {
      var saved = window.TAP_ORG;
      window.TAP_ORG = { regions: { alpha: '<img src=x onerror=alert(1)>' } };
      try {
        [['ov-ambition', 'stackedBar'], ['ov-ambition', 'bubble'], ['ind-ratings', 'dot'], ['ind-ratings', 'bar']].forEach(function (p) {
          var res = build(p[0], p[1], { mode: 'all' }, { industryId: 'ind1' });
          var it = items(res).filter(function (x) { return x.d.entityId === 'alpha'; })[0];
          var f = it.s.tooltip.formatter;
          var html = f({ data: it.d, seriesIndex: seriesOf(res).indexOf(it.s), dataIndex: it.s.data.indexOf(it.d), name: it.d.name });
          a.ok(html.indexOf('&lt;img') >= 0, p.join(' ') + ' escapes the name');
          a.equal(html.indexOf('<img'), -1, p.join(' ') + ' has no raw tag');
        });
      } finally {
        window.TAP_ORG = saved;
      }
    });

    T.test('X-builders-tooltip', 'Tooltips show the exact value, the region and the kind of value', function (a) {
      var res = build('ov-ambition', 'stackedBar', { mode: 'all' });
      var it = items(res).filter(function (x) { return x.d.entityId === 'alpha' && x.d.key === 'nb.arr'; })[0];
      var html = it.s.tooltip.formatter({ data: it.d });
      a.ok(html.indexOf('Region A') >= 0, 'region');
      a.ok(html.indexOf('€2,255,000') >= 0, 'exact value');
      a.ok(html.indexOf(TAP.format.kind('DER').label) >= 0, 'kind of value');
    });

    T.test('X-builders-colours', 'Past 8 regions every mark still has a theme colour', function (a) {
      var plan = T_FIXTURE('mini');
      for (var i = 0; i < 6; i++) {
        var extra = JSON.parse(JSON.stringify(plan.regions[i % 4]));
        extra.id = 'extra' + i;
        extra.name = 'Region X' + i;
        plan.regions.push(extra);
      }
      TAP.data.load(plan);
      [['ov-ambition', 'stackedBar'], ['ov-ambition', 'bubble'], ['ind-ratings', 'dot']].forEach(function (p) {
        var res = build(p[0], p[1], { mode: 'all' }, { industryId: 'ind1' });
        a.equal(JSON.stringify(res.option).indexOf('undefined'), -1, p.join(' ') + ': nothing undefined');
        items(res).forEach(function (it) {
          var c = (it.d.itemStyle && it.d.itemStyle.color) || (it.s.itemStyle && it.s.itemStyle.color) || (it.d.lineStyle && it.d.lineStyle.color);
          a.ok(/^#[0-9a-f]{6}$/i.test(c), p.join(' ') + ' ' + it.d.entityId + ' colour ' + c);
        });
        res.legend.forEach(function (l) { a.ok(/^#[0-9a-f]{6}$/i.test(l.color), 'legend ' + l.label); });
      });
      TAP.notes.clear();
    });
  });
})(window.TAP);
