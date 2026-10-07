/*
 * File: tests/test-industry.js
 * Purpose: Tests for the tier grid, the quadrant chart, ratings, commentary and details.
 * Provides: test cases TPV-TC-105, TPV-TC-107, TPV-TC-062 (tier grid and quadrant), TPV-TC-252 to 254, TPV-TC-262, 263, 265, 266, X-industry-*, X-details-*,
 *           X-d101-ratings-grid (the ratings grid), X-d102-ratings-insights (the rating insights on it) (US-1.5.7 commentary checks are X-industry-comments-*)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: the INDUSTRY stream (#32, #33, #34, #35, #21).
 */
(function (TAP) {
  'use strict';

  var TH = window.TAP_THEME;
  var MINI_IND = ['ind1', 'ind2', 'ind3', 'ind4'];

  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c || {}); }
  function ctxFor(id, type, c, extra) {
    var k = cmp(c);
    return Object.assign({ def: TAP.reports.get(id), type: type, measureId: null, sizeId: null, breakdown: null, cmp: k,
      entities: TAP.scope.entities(k), year: null, industryId: null, highlight: null, expanded: false, theme: TH, opts: {} }, extra || {});
  }
  function grid(type, c, extra) { return TAP.builders.get('tierGrid')(ctxFor('ind-tiers', type, c, extra)); }
  function sample() { TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA))); }
  function sampleIds() { return TAP.data.regions().map(function (r) { return r.id; }); }

  // The builder's HTML, parsed into a detached element so tests can query it.
  function parse(html) { var box = document.createElement('div'); TAP.dom.html(box, html); return box; }
  function cells(box) { return Array.prototype.slice.call(box.querySelectorAll('[data-tap-region][data-tap-industry]')); }
  function rowFor(res, industryId) { return res.table.rows.filter(function (r) { return r.industryId === industryId; })[0]; }
  function order(res) { return res.table.rows.map(function (r) { return r.industryId; }); }
  // The tier straight from the data file's Market Coverage row.
  function rawTier(regionId, industryId) {
    var row = TAP.data.region(regionId).marketCoverage.filter(function (d) { return d.industryId === industryId; })[0];
    return row ? row.tier : null;
  }
  function series(res) { return (res.option && res.option.series) || []; }
  function points(res) {
    var out = [];
    series(res).forEach(function (s) { (s.data || []).forEach(function (d) { if (d && d.raw !== undefined && !d.np) out.push(d); }); });
    return out;
  }

  // TPV-TC-062 for the tier grid: what the chart shows equals what the table holds.
  function heatSameAsTable(a, res, label) {
    var n = 0;
    cells(parse(res.html)).forEach(function (el) {
      var row = rowFor(res, el.getAttribute('data-tap-industry'));
      var c = row.cells['tier:' + el.getAttribute('data-tap-region')];
      a.equal(el.getAttribute('data-tap-value'), c.state === 'value' ? String(c.v) : '', label + ': ' + el.getAttribute('aria-label'));
      n++;
    });
    a.ok(n > 0, label + ': compared ' + n + ' cells');
  }
  function bubbleSameAsTable(a, res, label) {
    var n = 0;
    points(res).forEach(function (d) {
      var row = res.table.rows.filter(function (r) { return r.entityId === d.entityId && r.industryId === d.industryId; })[0];
      a.ok(row, label + ': a table row for ' + d.entityId + ' ' + d.industryId);
      d.keys.forEach(function (k, i) { if (k) { a.equal(d.raw[i], row.cells[k].v, label + ': ' + k); n++; } });
    });
    a.ok(n > 0, label + ': compared ' + n + ' values');
  }

  T.suite('industry', function () {
    /* ---------- US-1.5.4 tier grid ---------- */

    T.test('TPV-TC-105', 'Sample data: every cell shows the tier in the data file, or "not provided"', function (a) {
      sample();
      var res = grid('heatmap', { mode: 'all' }), box = parse(res.html), seen = 0;
      a.equal(res.error, null, 'draws');
      TAP.data.industries({ rated: true }).forEach(function (ind) {
        sampleIds().forEach(function (r) {
          var want = rawTier(r, ind.id), c = rowFor(res, ind.id).cells['tier:' + r];
          a.equal(c.state, want == null ? 'notProvided' : 'value', ind.id + ' ' + r + ' state');
          if (want != null) a.equal(c.v, want, ind.id + ' ' + r + ' tier');
          var el = box.querySelector('[data-tap-region="' + r + '"][data-tap-industry="' + ind.id + '"]');
          a.match(el.textContent, want == null ? /not provided/ : new RegExp('Tier ' + want), ind.id + ' ' + r + ' on screen');
          seen++;
        });
      });
      a.equal(seen, 18 * 7, 'every industry and region');
      // G1: Middle East & Africa left the Government tier blank, drawn as an outlined cell
      var gov = box.querySelector('[data-tap-region="mea"][data-tap-industry="government"]');
      a.ok(/tap-tg__cell--np/.test(gov.className), 'the blank is an outlined not-provided cell');
    });

    T.test('TPV-TC-105', 'Other and Unapplied industry rows are left out', function (a) {
      sample();
      var res = grid('heatmap', { mode: 'all' });
      a.equal(res.table.rows.length, 18, 'eighteen rated industries');
      ['other', 'unapplied'].forEach(function (id) {
        a.equal(rowFor(res, id), undefined, id + ' not in the table');
        a.equal(parse(res.html).querySelector('[data-tap-industry="' + id + '"]'), null, id + ' not in the grid');
      });
    });

    T.test('TPV-TC-107', 'Sample data: the agreement column counts regions per tier', function (a) {
      sample();
      var X = window.SAMPLE_EXPECT, res = grid('heatmap', { mode: 'all' });
      function counts(id) { var c = rowFor(res, id).cells; return [c.t1.v, c.t2.v, c.t3.v, c.np.v]; }
      a.deepEqual(counts(X.p01.industry), [0, X.p01.tier12.length, X.p01.tier3.length, 0], 'P01 education');
      a.deepEqual(counts(X.p02.industry), [0, X.p02.tier2.length, X.p02.tier3.length, 0], 'P02 retail');
      Object.keys(X.headline.tier1).forEach(function (id) { a.equal(counts(id)[0], X.headline.tier1[id], id + ' Tier 1 everywhere'); });
      var gov = counts(X.gaps.blankTier[1]);
      a.equal(gov[3], 1, 'one region left the Government tier blank');
      a.equal(gov[0] + gov[1] + gov[2], 6, 'six regions gave a tier');
      a.match(parse(res.html).querySelector('[data-tap-agree="' + X.p02.industry + '"]').textContent, /0 · 3 · 4/, 'counts on screen');
    });

    T.test('TPV-TC-107', 'Mini data: counts follow the hand calculation and the comparison scope', function (a) {
      var res = grid('heatmap', { mode: 'all' }), c = rowFor(res, 'ind2').cells;
      a.deepEqual([c.t1.v, c.t2.v, c.t3.v, c.np.v], [0, 2, 1, 1], 'ind2: Tier 2 twice, Tier 3 once, Region C blank');
      c = rowFor(grid('heatmap', { mode: 'set', set: ['alpha', 'delta'] }), 'ind2').cells;
      a.deepEqual([c.t1.v, c.t2.v, c.t3.v, c.np.v], [0, 1, 1, 0], 'only the chosen regions count');
      c = rowFor(grid('heatmap', { mode: 'one', focus: 'bravo' }), 'ind3').cells;
      a.deepEqual([c.t1.v, c.t2.v, c.t3.v], [0, 1, 3], 'one vs the rest still counts every region');
    });

    T.test('X-industry-grid-columns', 'Columns are the regions in scope, the focus first and the others muted', function (a) {
      var res = grid('heatmap', { mode: 'one', focus: 'charlie' }), box = parse(res.html);
      var heads = Array.prototype.slice.call(box.querySelectorAll('[data-tap-column]')).map(function (e) { return e.getAttribute('data-tap-column'); });
      a.deepEqual(heads, ['charlie', 'alpha', 'bravo', 'delta'], 'focus column first, then file order');
      a.ok(/is-focus/.test(box.querySelector('[data-tap-column="charlie"]').className), 'focus emphasized');
      a.ok(/is-muted/.test(box.querySelector('[data-tap-column="alpha"]').className), 'others muted');
      a.ok(/is-muted/.test(box.querySelector('[data-tap-region="bravo"][data-tap-industry="ind1"]').className), 'muted cells');
      heads = res.table.columns.map(function (c) { return c.key; }).filter(function (k) { return /^tier:/.test(k); });
      a.deepEqual(heads, ['tier:charlie', 'tier:alpha', 'tier:bravo', 'tier:delta'], 'table columns in the same order');
      res = grid('heatmap', { mode: 'pair', focus: 'delta', second: 'alpha' });
      a.deepEqual(res.table.columns.filter(function (c) { return /^tier:/.test(c.key); }).length, 2, 'a pair shows two columns');
      a.equal(parse(grid('heatmap', { mode: 'all' }).html).querySelectorAll('.is-muted').length, 0, 'nothing muted without a focus');
    });

    T.test('X-industry-grid-colours', 'Every column has a colour, past the eighth region too', function (a) {
      var plan = T_FIXTURE('mini'), base = plan.regions[0];
      for (var i = 0; i < 6; i++) {
        var r = JSON.parse(JSON.stringify(base));
        r.id = 'extra' + i; r.name = 'Extra ' + i;
        plan.regions.push(r);
      }
      TAP.data.load(plan);
      var res = grid('heatmap', { mode: 'all' }), box = parse(res.html);
      a.equal(box.querySelectorAll('[data-tap-column]').length, 10, 'ten columns');
      Array.prototype.slice.call(box.querySelectorAll('.tap-tg__bar')).forEach(function (b) {
        a.ok(b.getAttribute('style') && !/undefined/.test(b.getAttribute('style')), 'colour set: ' + b.getAttribute('style'));
      });
      a.equal(res.error, null);
    });

    T.test('X-industry-grid-group', 'Group-priority industries are marked as set centrally', function (a) {
      var box = parse(grid('heatmap', { mode: 'all' }).html);
      var name = box.querySelector('.tap-tg__name[data-tap-industry="ind1"]');
      a.match(name.textContent, /set centrally/i, 'the row says it is set centrally');
      a.equal(box.querySelector('.tap-tg__name[data-tap-industry="ind2"]').textContent.indexOf(TAP.content.text('tierGrid.central')), -1, 'others are not marked');
      a.match(box.querySelector('[data-tap-region="alpha"][data-tap-industry="ind1"]').getAttribute('aria-label'), /set centrally/i, 'cells say so too');
    });

    T.test('X-industry-grid-sorts', 'Each sort orders rows as defined (hand-worked on the mini data)', function (a) {
      function by(sort) { return order(grid('heatmap', { mode: 'all' }, { opts: { sort: sort } })); }
      a.deepEqual(by('groupPriority'), ['ind1', 'ind4', 'ind2', 'ind3'], 'group priority, then average tier');
      a.deepEqual(by('agreement'), ['ind1', 'ind4', 'ind3', 'ind2'], 'most agreed first');
      a.deepEqual(by('disagreement'), ['ind2', 'ind3', 'ind1', 'ind4'], 'most split first');
      a.deepEqual(by('productLine'), ['ind1', 'ind2', 'ind4', 'ind3'], 'grouped by product line');
      a.deepEqual(order(grid('heatmap', { mode: 'all' })), by('groupPriority'), 'group priority by default');
      var heads = parse(grid('heatmap', { mode: 'all' }, { opts: { sort: 'productLine' } }).html).querySelectorAll('.tap-tg__group');
      a.deepEqual(Array.prototype.map.call(heads, function (h) { return h.textContent; }), ['Product line 1', 'Product line 2'], 'group headings');
    });

    T.test('X-industry-grid-controls', 'The builder offers the sorts from the definition, and bubble size on the bubble grid', function (a) {
      var res = grid('heatmap', { mode: 'all' }, { opts: { sort: 'agreement' } });
      var sort = res.controls.filter(function (c) { return c.key === 'sort'; })[0];
      a.deepEqual(sort.options.map(function (o) { return o.value; }), TAP.reports.get('ind-tiers').options.sorts, 'four sorts');
      a.equal(sort.value, 'agreement', 'current choice');
      a.equal(sort.kind, 'segmented');
      sort.options.forEach(function (o) { a.ok(o.label && o.label.charAt(0) !== '[', 'worded: ' + o.label); });
    });

    T.test('X-industry-grid-highlight', 'Highlights follow the target: industry row, cell or region column, for every match', function (a) {
      function hl(target) { return parse(grid('heatmap', { mode: 'all' }, { highlight: target }).html); }
      var box = hl({ reportId: 'ind-tiers', industryIds: ['ind3', 'ind4'], mark: 'industryRow' });
      a.equal(box.querySelectorAll('.tap-tg__row.is-hl').length, 2, 'both rows');
      box = hl({ reportId: 'ind-tiers', regionIds: ['delta'], industryIds: ['ind3'], mark: 'cell' });
      a.equal(box.querySelectorAll('.tap-tg__cell.is-hl').length, 1, 'one cell');
      a.ok(/is-hl/.test(box.querySelector('[data-tap-region="delta"][data-tap-industry="ind3"]').className), 'the right cell');
      box = hl({ reportId: 'ind-tiers', regionIds: ['alpha', 'charlie'], mark: 'regionColumn' });
      a.equal(box.querySelectorAll('.tap-tg__cell.is-hl').length, 8, 'every cell of both columns');
      var res = grid('bubbleGrid', { mode: 'all' }, { highlight: { reportId: 'ind-tiers', regionIds: ['alpha', 'charlie'], mark: 'regionColumn' } });
      var ring = series(res).filter(function (s) { return s.tapRole === 'highlight'; })[0];
      a.equal(ring.data.length, 7, 'bubble grid rings every point of both columns (Region C has one blank tier)');
    });

    T.test('X-industry-grid-target', 'A click maps to the region and industry', function (a) {
      var res = grid('heatmap', { mode: 'all' });
      var t = res.target({ data: { regionId: 'charlie', industryId: 'ind2' } });
      a.equal(t.reportId, 'ind-tiers');
      a.deepEqual(t.regionIds, ['charlie']);
      a.deepEqual(t.industryIds, ['ind2']);
      t = res.target({ data: { industryId: 'ind2' } });
      a.deepEqual([t.regionIds, t.industryIds], [[], ['ind2']], 'a row name selects the industry only');
      t = grid('bubbleGrid', { mode: 'all' }).target({ data: { entityId: 'delta', industryId: 'ind3' } });
      a.deepEqual([t.regionIds, t.industryIds], [['delta'], ['ind3']], 'bubble grid point');
      a.equal(res.target(null), null);
    });

    T.test('X-industry-grid-escape', 'Every name in the grid and tooltips is escaped', function (a) {
      var plan = T_FIXTURE('mini');
      plan.lookups.industries[1].name = '<img src=x onerror=alert(1)>';
      plan.regions[0].name = 'A & <b>B</b>';
      TAP.data.load(plan);
      var res = grid('heatmap', { mode: 'all' });
      a.equal(res.html.indexOf('<img'), -1, 'industry name escaped');
      a.equal(res.html.indexOf('<b>B</b>'), -1, 'region name escaped');
      a.ok(res.html.indexOf('&lt;img') >= 0, 'shown as text');
      res = grid('bubbleGrid', { mode: 'all' });
      var d = points(res).filter(function (p) { return p.industryId === 'ind2' && p.entityId === 'alpha'; })[0];
      var html = series(res)[0].tooltip.formatter({ data: d });
      a.equal(html.indexOf('<img'), -1, 'tooltip escaped');
      a.equal(html.indexOf('<b>B</b>'), -1, 'tooltip region escaped');
    });

    T.test('X-industry-bubble-grid', 'Bubble grid: colour is the tier, size the pipeline (or current ARR), legend says which is which', function (a) {
      var res = grid('bubbleGrid', { mode: 'all' });
      var d = points(res).filter(function (p) { return p.entityId === 'alpha' && p.industryId === 'ind1'; })[0];
      a.deepEqual(d.keys, ['ind.tier', 'ind.pipeline'], 'pipeline by default');
      a.deepEqual(d.raw, [1, 2000], 'Region A Healthcare: Tier 1, pipeline 2000');
      a.equal(d.itemStyle.color, TH.tiers[1].bg, 'tier colour');
      var e = points(grid('bubbleGrid', { mode: 'all' }, { sizeId: 'ind.currentArr' })).filter(function (p) { return p.entityId === 'alpha' && p.industryId === 'ind1'; })[0];
      a.deepEqual(e.raw, [1, 1000], 'current ARR when switched');
      function sizeOf(r) { return points(r).filter(function (p) { return p.entityId === 'bravo' && p.industryId === 'ind3'; })[0].symbolSize; }
      a.ok(sizeOf(res) > sizeOf(grid('bubbleGrid', { mode: 'all' }, { sizeId: 'ind.currentArr' })), 'Region B Retail: 900 of 2000 pipeline, 300 of 1000 ARR');
      a.match(res.sizeLegend.kind, /System figure/, 'size is a system figure');
      a.match(res.sizeLegend.label, /pipeline/i);
      a.ok(res.legend.some(function (l) { return /leader/i.test(l.label); }), 'colour is the leader’s choice');
      var np = series(res).filter(function (s) { return s.tapRole === 'notProvided'; })[0];
      a.ok(np && np.data.some(function (p) { return p.entityId === 'charlie' && p.industryId === 'ind2'; }), 'blank tier is an outlined mark');
      a.ok(res.legend.some(function (l) { return /not provided/i.test(l.label); }), 'legend names the outlined mark');
    });

    T.test('TPV-TC-062', 'Tier grid: every chart value equals the table value, on the mini data, in every mode', function (a) {
      [{ mode: 'all' }, { mode: 'one', focus: 'alpha' }, { mode: 'one', focus: 'bravo', restAs: 'individual' }, { mode: 'org' },
        { mode: 'pair', focus: 'charlie', second: 'delta' }, { mode: 'set', set: ['alpha', 'charlie'] }].forEach(function (c) {
        heatSameAsTable(a, grid('heatmap', c), c.mode + ' heatmap');
        bubbleSameAsTable(a, grid('bubbleGrid', c), c.mode + ' bubble grid');
        bubbleSameAsTable(a, grid('bubbleGrid', c, { sizeId: 'ind.currentArr' }), c.mode + ' bubble grid by ARR');
      });
    });

    T.test('TPV-TC-062', 'Tier grid: every chart value equals the table value, on the sample data', function (a) {
      sample();
      var R = sampleIds();
      [{ mode: 'all' }, { mode: 'one', focus: R[3] }, { mode: 'org' }, { mode: 'pair', focus: R[1], second: R[5] }].forEach(function (c) {
        ['heatmap', 'bubbleGrid', 'table'].forEach(function (type) {
          var res = grid(type, c);
          a.equal(res.error, null, c.mode + ' ' + type + ' draws');
          if (type === 'heatmap') heatSameAsTable(a, res, 'sample ' + c.mode);
          if (type === 'bubbleGrid') bubbleSameAsTable(a, res, 'sample ' + c.mode);
          if (type === 'table') { a.equal(res.option, null, 'table has no chart'); a.equal(res.table.rows.length, 18); }
        });
      });
    });

    T.test('X-industry-view-grid', 'The view shows the tier grid in a panel; a row selects its industry, a cell opens details', function (a) {
      var root = T.dom.mount(), view = TAP.views.get('industry').mount(root);
      try {
        var panel = root.querySelector('.tap-panel[data-report="ind-tiers"]');
        a.ok(panel, 'tier grid panel');
        panel.querySelector('.tap-tg__name[data-tap-industry="ind3"]').click();
        a.equal(TAP.store.get().industry, 'ind3', 'row click selects the industry');
        var opened = null, off = TAP.bus.on('industry:select', function () {});
        var keep = TAP.layers.openDetails;
        TAP.layers.openDetails = function (tg) { opened = tg; };
        try { root.querySelector('.tap-panel[data-report="ind-tiers"] [data-tap-region="delta"][data-tap-industry="ind2"]').click(); }
        finally { TAP.layers.openDetails = keep; off(); }
        a.equal(TAP.store.get().industry, 'ind2', 'cell click selects its industry');
        a.deepEqual(opened && [opened.regionIds, opened.industryIds], [['delta'], ['ind2']], 'and opens its details');
      } finally { view.destroy(); }
      a.equal(root.querySelector('.tap-panel'), null, 'destroy removes the panel');
    });

    T.test('X-industry-grid-explain', 'The explanation says which tier is darkest', function (a) {
      a.match(TAP.reports.get('ind-tiers').explain.read, /Tier 1 darkest/);
      a.deepEqual(TAP.reports.validate(TAP.reports.get('ind-tiers')), []);
    });
  });

  /* ---------- US-1.5.5 attractiveness vs ability to win ---------- */

  var X = window.TEST_EXPECT.mini, TOL = 1e-6;
  function quad(type, c, extra) { return TAP.builders.get('quadrant')(ctxFor('ind-quad', type, c, extra)); }
  function valueSeries(res) { return series(res).filter(function (s) { return s.tapRole === 'value'; }); }
  function pointOf(res, entityId, industryId) {
    return points(res).filter(function (d) { return d.entityId === entityId && d.industryId === industryId; })[0];
  }
  function areaLabels(res) {
    var s = series(res).filter(function (x) { return x.markArea; })[0];
    return s.markArea.data.map(function (d) { return d[0].name; }).sort();
  }
  function tipOf(res, d) {
    var s = series(res).filter(function (x) { return (x.data || []).indexOf(d) >= 0; })[0];
    return s.tooltip.formatter({ data: d, seriesName: s.name });
  }

  T.suite('industry-quad', function () {
    T.test('X-industry-quad-default', 'Default: one bubble per industry, scores averaged over the regions in scope', function (a) {
      var res = quad('bubble', { mode: 'all' });
      a.equal(res.error, null, 'draws');
      a.equal(valueSeries(res).length, 1, 'one averaged group');
      a.equal(points(res).length, 4, 'one point per rated industry');
      var d = pointOf(res, points(res)[0].entityId, 'ind1');
      a.near(d.raw[1], 2.75, TOL, 'ind1 attractiveness: average of 2.67, 3, 2.33 and 3');
      a.near(d.raw[0], 7 / 3, TOL, 'ind1 ability: average of 3, 3 and 1 (Region C not provided)');
      d = pointOf(res, d.entityId, 'ind2');
      a.near(d.raw[1], (2 + 8 / 3 + 2 + 1) / 4, TOL, 'ind2 attractiveness');
      a.near(d.raw[0], (2 + 4 / 3 + 2 + 2) / 4, TOL, 'ind2 ability');
      a.equal(d.itemStyle.color, TH.combined, 'dark grey for an average');
      a.equal(d.label.formatter, 'Education', 'labelled with the industry');
      a.ok(res.notes.some(function (n) { return /average/i.test(n) && /rating/i.test(n); }), 'the averaging is stated');
      a.ok(res.notes.some(function (n) { return /Region C/.test(n); }), 'Region C named as not included');
      a.match(JSON.stringify(res.option.title || {}), /verage/, 'stated on the chart itself');
    });

    T.test('X-industry-quad-every', 'Show every region: one point per region and industry, nudged apart, values exact', function (a) {
      var res = quad('bubble', { mode: 'all' }, { opts: { everyRegion: true } });
      a.equal(points(res).length, 15, '4 regions x 4 industries, less Region C ind1 (ability not provided)');
      ['alpha', 'bravo', 'charlie', 'delta'].forEach(function (r) {
        Object.keys(X.scores[r] || {}).forEach(function (ind) {
          var e = X.scores[r][ind], d = pointOf(res, r, ind);
          if (e.b == null) { a.equal(d, undefined, r + ' ' + ind + ' left off'); return; }
          a.near(d.raw[1], e.a, TOL, r + ' ' + ind + ' attractiveness');
          a.near(d.raw[0], e.b, TOL, r + ' ' + ind + ' ability');
        });
      });
      var spots = {};
      points(res).forEach(function (d) {
        var key = d.value[0].toFixed(4) + '|' + d.value[1].toFixed(4);
        a.ok(!spots[key], 'no two markers on the same spot: ' + d.entityId + ' ' + d.industryId);
        spots[key] = true;
      });
      var same = [pointOf(res, 'alpha', 'ind4'), pointOf(res, 'delta', 'ind4'), pointOf(res, 'delta', 'ind1')];
      a.ok(same[0].value[0] !== same[1].value[0] || same[0].value[1] !== same[1].value[1], 'overlapping points moved');
      same.forEach(function (d) { a.deepEqual([d.raw[0], d.raw[1]], [1, 3], 'raw stays exact'); });
      a.equal(pointOf(res, 'alpha', 'ind1').itemStyle.color, TAP.scope.colorOf('alpha'), 'region colour');
    });

    T.test('X-industry-quad-focus', 'With a focus region: its points in its colour, the rest averaged in dark grey', function (a) {
      var res = quad('bubble', { mode: 'one', focus: 'alpha' });
      a.equal(valueSeries(res).length, 2, 'focus and the rest');
      a.equal(pointOf(res, 'alpha', 'ind4').itemStyle.color, TAP.scope.colorOf('alpha'), 'focus colour');
      var rest = points(res).filter(function (d) { return d.entityId !== 'alpha'; });
      a.equal(rest.length, 4, 'one averaged point per industry for the rest');
      rest.forEach(function (d) { a.equal(d.itemStyle.color, TH.combined, 'rest in dark grey'); });
      var r1 = rest.filter(function (d) { return d.industryId === 'ind1'; })[0];
      a.near(r1.raw[1], (3 + 7 / 3 + 3) / 3, TOL, 'rest ind1 attractiveness: B, C and D');
      res = quad('bubble', { mode: 'one', focus: 'alpha', restAs: 'individual' });
      a.equal(points(res).filter(function (d) { return d.entityId !== 'alpha'; }).length, 4, 'still averaged by default');
      res = quad('bubble', { mode: 'one', focus: 'alpha' }, { opts: { everyRegion: true } });
      a.equal(pointOf(res, 'bravo', 'ind1').itemStyle.color, TH.focusGrey, 'every region: the others grey');
      a.equal(pointOf(res, 'alpha', 'ind1').itemStyle.color, TAP.scope.colorOf('alpha'), 'every region: focus coloured');
      res = quad('bubble', { mode: 'pair', focus: 'bravo', second: 'delta' });
      a.equal(pointOf(res, 'delta', 'ind3').itemStyle.color, TAP.scope.colorOf('delta'), 'a pair keeps both colours');
    });

    T.test('X-industry-quad-areas', 'Four neutral labelled areas split at the midpoint; 2.0 counts as attractive and able', function (a) {
      var res = quad('bubble', { mode: 'all' }, { opts: { everyRegion: true } });
      a.deepEqual(areaLabels(res), ['Attractive, able to win', 'Attractive, not yet able to win', 'Less attractive, able to win', 'Less attractive, less able']);
      var lines = series(res).filter(function (x) { return x.markLine; })[0].markLine.data;
      a.deepEqual(lines.map(function (l) { return l.xAxis != null ? ['x', l.xAxis] : ['y', l.yAxis]; }), [['x', 2], ['y', 2]], 'lines at 2.0');
      var d = pointOf(res, 'delta', 'ind3');
      a.match(tipOf(res, d), /Attractive, able to win/, 'Region D Retail (attractiveness exactly 2.0) is attractive');
      var row = res.table.rows.filter(function (r) { return r.entityId === 'delta' && r.industryId === 'ind3'; })[0];
      a.equal(row.cells.quadrant.v, 'Attractive, able to win', 'the table says the same');
      window.TAP_SETTINGS.scores.midpoint = 2.5;
      try {
        res = quad('bubble', { mode: 'all' });
        lines = series(res).filter(function (x) { return x.markLine; })[0].markLine.data;
        a.equal(lines[0].xAxis, 2.5, 'the midpoint is a setting');
      } finally { window.TAP_SETTINGS.scores.midpoint = 2.0; }
    });

    T.test('X-industry-quad-tooltip', 'Tooltips name region and industry, both scores and their three ratings with wording', function (a) {
      var res = quad('bubble', { mode: 'all' }, { opts: { everyRegion: true } });
      var html = tipOf(res, pointOf(res, 'alpha', 'ind1'));
      ['Region A', 'Healthcare', 'Attractiveness', 'Ability to win', 'Strong dynamics, business to take (3)', 'Fragmented, no clear leader (2)',
        'Generalized (3)', 'Strong (3)', '2.67'].forEach(function (s) { a.ok(html.indexOf(s) >= 0, 'shows ' + s); });
      res = quad('bubble', { mode: 'all' });
      html = tipOf(res, pointOf(res, points(res)[0].entityId, 'ind1'));
      a.ok(html.indexOf('2.8 average') >= 0, 'averaged rating shows "average": growth potential 2.75');
      a.ok(/Average of 4 regions/.test(html), 'says how it was combined');
    });

    T.test('X-industry-quad-size', 'Size is pipeline by default, current ARR when switched, none on the scatter', function (a) {
      var res = quad('bubble', { mode: 'all' }, { opts: { everyRegion: true } });
      var d = pointOf(res, 'alpha', 'ind1');
      a.deepEqual(d.keys, ['ind.ability', 'ind.attractiveness', 'ind.pipeline']);
      a.equal(d.raw[2], 2000, 'pipeline');
      a.match(res.sizeLegend.kind, /System figure/, 'legend calls it a system figure');
      a.equal(pointOf(quad('bubble', { mode: 'all' }, { sizeId: 'ind.currentArr', opts: { everyRegion: true } }), 'alpha', 'ind1').raw[2], 1000, 'current ARR');
      res = quad('scatter', { mode: 'all' }, { opts: { everyRegion: true } });
      a.equal(res.sizeLegend, null, 'no size legend on the scatter');
      a.equal(pointOf(res, 'alpha', 'ind1').keys[2], null, 'no size key');
      a.deepEqual(TAP.shapes.types(TAP.reports.get('ind-quad'), 7), ['bubble', 'scatter', 'table'], 'bubble, scatter, table');
      a.equal(TAP.reports.get('ind-quad').defaultType, 'bubble');
    });

    T.test('X-industry-quad-filter', 'The industry filter shows one industry across every region in scope', function (a) {
      var res = quad('bubble', { mode: 'all' }, { opts: { industryFilter: 'ind4' } });
      a.deepEqual(points(res).map(function (d) { return d.industryId; }), ['ind4', 'ind4', 'ind4', 'ind4'], 'only ind4, per region');
      a.equal(pointOf(res, 'bravo', 'ind4').label.formatter, 'Region B', 'labelled by region');
      var c = res.controls.filter(function (x) { return x.key === 'industryFilter'; })[0];
      a.equal(c.kind, 'select');
      a.equal(c.options.length, 5, 'all industries plus each rated industry');
      a.equal(c.value, 'ind4');
      var e = res.controls.filter(function (x) { return x.key === 'everyRegion'; })[0];
      a.deepEqual(e.options.map(function (o) { return o.value; }), [false, true], 'average or every region');
      res = quad('bubble', { mode: 'set', set: ['alpha', 'delta'] }, { opts: { industryFilter: 'ind1' } });
      a.equal(points(res).length, 2, 'follows the comparison scope');
    });

    T.test('X-review-SV-16', 'With two regions, the quadrant names the rest "the other region" (#372)', function (a) {
      var plan = window.T_FIXTURE('mini');
      plan.regions = plan.regions.slice(0, 2);
      TAP.data.load(plan);
      var labels = quad('bubble', { mode: 'one', focus: 'alpha', restAs: 'individual' }).legend.map(function (l) { return l.label; });
      a.ok(labels.indexOf('Average of the other region') >= 0, 'singular: ' + labels.join(' | '));
      a.ok(!labels.some(function (l) { return /other 1 /.test(l); }), 'never "the other 1 region"');
    });

    // Review (ENGINE note on #340): a combined rating whose mean is a whole number still reads as an average
    T.test('X-review-DE-7', 'In the quadrant tooltip, a rating combined over regions reads as an average, even when whole', function (a) {
      var res = quad('bubble', { mode: 'all' }), found = 0;
      points(res).forEach(function (d) {
        var tip = tipOf(res, d), ents = TAP.scope.entities({ mode: 'all' }), g = { id: 'all', kind: 'combined', regionIds: ents.map(function (e) { return e.id; }), how: 'average', role: 'combined' };
        ['growthPotential', 'criticality', 'competitiveIntensity', 'references', 'expertise', 'productFit'].forEach(function (f) {
          var c = TAP.measures.combined('ind.' + f, g, { industryId: d.industryId });
          if (c.state !== 'value' || !Number.isInteger(c.v)) return;
          found++;
          a.ok(tip.indexOf(c.v + ' average') >= 0, d.industryId + ' ' + f + ': a mean of ' + c.v + ' reads "' + c.v + ' average"');
        });
      });
      a.ok(found > 0, 'the mini fixture has combined ratings with a whole-number mean (' + found + ')');
    });

    T.test('X-review-RI-19', 'With one industry filtered, the table numbers each row as its bubble is numbered (the region)', function (a) {
      var res = quad('bubble', { mode: 'all' }, { opts: { industryFilter: 'ind4' } });
      // Hand-worked: the regions' places in file order, alpha 1 to delta 4
      var want = { 'Region A': '1', 'Region B': '2', 'Region C': '3', 'Region D': '4' };
      a.equal(res.table.rows.length, 4, 'one row per region');
      res.table.rows.forEach(function (r) {
        a.equal(r.cells.num.v, want[r.cells.entity.v], r.cells.entity.v + ': numbered as its bubble');
      });
      var plain = quad('bubble', { mode: 'all' });
      var ind4 = plain.table.rows.filter(function (r) { return r.industryId === 'ind4'; })[0];
      a.equal(ind4.cells.num.v, String(TAP.data.industries({ rated: true }).map(function (d) { return d.id; }).indexOf('ind4') + 1),
        'unfiltered, the number stays the industry’s');
    });

    T.test('X-industry-quad-highlight', 'Highlights ring every matching point, in every group', function (a) {
      var res = quad('bubble', { mode: 'all' }, { opts: { everyRegion: true }, highlight: { reportId: 'ind-quad', industryIds: ['ind4'], mark: 'points' } });
      var ring = series(res).filter(function (s) { return s.tapRole === 'highlight'; })[0];
      a.equal(ring.data.length, 4, 'all four regions');
      res = quad('bubble', { mode: 'one', focus: 'alpha' }, { highlight: { reportId: 'ind-quad', industryIds: ['ind4'] } });
      ring = series(res).filter(function (s) { return s.tapRole === 'highlight'; })[0];
      a.equal(ring.data.length, 2, 'focus and rest both ringed');
      res = quad('bubble', { mode: 'all' }, { highlight: { reportId: 'ind-quad', quadrant: 'attractiveNotYet', mark: 'quadrant' } });
      var area = series(res).filter(function (x) { return x.markArea; })[0].markArea.data.filter(function (d) { return d[0].tapQuadrant === 'attractiveNotYet'; })[0];
      a.equal(area[0].itemStyle.borderColor, TH.accent, 'the named area is outlined');
    });

    T.test('X-industry-quad-target', 'A click names the region(s) and the industry', function (a) {
      var res = quad('bubble', { mode: 'all' }, { opts: { everyRegion: true } });
      var t = res.target({ data: pointOf(res, 'charlie', 'ind4') });
      a.deepEqual([t.reportId, t.regionIds, t.industryIds], ['ind-quad', ['charlie'], ['ind4']]);
      res = quad('bubble', { mode: 'all' });
      t = res.target({ data: points(res)[0] });
      a.deepEqual(t.regionIds, ['alpha', 'bravo', 'charlie', 'delta'], 'an average names its regions');
      a.equal(res.target({}), null);
    });

    T.test('X-industry-quad-escape', 'Names in labels and tooltips are escaped', function (a) {
      var plan = T_FIXTURE('mini');
      plan.lookups.industries[0].name = '<img src=x onerror=alert(1)>';
      plan.regions[0].name = 'A & <b>B</b>';
      TAP.data.load(plan);
      var res = quad('bubble', { mode: 'all' }, { opts: { everyRegion: true } });
      var html = tipOf(res, pointOf(res, 'alpha', 'ind1'));
      a.equal(html.indexOf('<img'), -1, 'industry escaped');
      a.equal(html.indexOf('<b>B</b>'), -1, 'region escaped');
    });

    T.test('X-industry-quad-axes', 'Both axes always run over the full score range, 1 to 3, so the four areas are equal', function (a) {
      [[{ mode: 'all' }, {}], [{ mode: 'all' }, { everyRegion: true }], [{ mode: 'one', focus: 'delta' }, {}],
        [{ mode: 'all' }, { industryFilter: 'ind3' }]].forEach(function (p) {
        var res = quad('bubble', p[0], { opts: p[1] }), label = JSON.stringify(p);
        a.deepEqual([res.option.xAxis.min, res.option.xAxis.max], [1, 3], label + ': x from 1 to 3');
        a.deepEqual([res.option.yAxis.min, res.option.yAxis.max], [1, 3], label + ': y from 1 to 3');
        valueSeries(res).forEach(function (s) { a.equal(s.clip, false, label + ': bubbles on the edge are not cut'); });
      });
      var area = series(quad('bubble', { mode: 'all' })).filter(function (x) { return x.markArea; })[0].markArea.data;
      var q = area.filter(function (d) { return d[0].tapQuadrant === 'attractiveAble'; })[0];
      a.deepEqual([q[0].coord, q[1].coord], [[2, 2], [3, 3]], 'the top-right area is a square from 2 to 3');
    });

    // A label's box on screen, from the option's own plot margins and the size the builder was given.
    function labelBoxes(res, size) {
      var g = res.option.grid, w = size.w - g.left - g.right, h = size.h - g.top - g.bottom, fs = TH.type.chart;
      return points(res).filter(function (d) { return d.label.show; }).map(function (d) {
        var lines = String(d.label.formatter).split('\n'), tw = Math.max.apply(null, lines.map(function (l) { return l.length; })) * fs * 0.5;
        var x = g.left + (d.value[0] - 1) / 2 * w, y = g.top + (3 - d.value[1]) / 2 * h, r = d.symbolSize / 2, gap = d.label.position[0] - (d.label.side === 'right' ? d.symbolSize : 0);
        var bh = lines.length * fs;
        return { name: d.name, x: d.label.side === 'right' ? x + r + gap : x - r + gap - tw, y: y + d.label.dy - bh / 2, w: tw, h: bh, d: d };
      });
    }
    function overlaps(boxes) {
      var out = [];
      boxes.forEach(function (p, i) {
        boxes.slice(i + 1).forEach(function (q) {
          if (p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h) out.push(p.name + ' / ' + q.name);
        });
      });
      return out;
    }

    T.test('X-industry-quad-labels', 'Labels move apart with leader lines; hiding is the last resort and nothing is lost', function (a) {
      [{}, { everyRegion: true }].forEach(function (o) {
        valueSeries(quad('bubble', { mode: 'all' }, { opts: o })).forEach(function (s) {
          if (!(s.data || []).length) return;
          a.equal(s.labelLayout.hideOverlap, true, 'a label that still overlaps hides');
          a.ok(s.labelLine && s.labelLine.show, 'short leader lines');
        });
      });
      sample();
      [{ w: 440, h: 560 }, { w: 560, h: 560 }, { w: 900, h: 640 }].forEach(function (size) {
        var res = quad('bubble', { mode: 'all' }, { size: size }), boxes = labelBoxes(res, size), tag = size.w + ' px: ';
        a.ok(boxes.length >= 14, tag + 'most of the 18 averaged bubbles keep a label (' + boxes.length + ')');
        a.deepEqual(overlaps(boxes), [], tag + 'no two labels overlap where they are drawn');
        a.equal(res.sized, true, tag + 'the panel is asked to pass the real size');
      });
      var res = quad('bubble', { mode: 'all' }, { size: { w: 560, h: 560 } });
      a.ok(points(res).some(function (d) { return d.label.show && d.label.dy !== 0; }), 'crowded labels step up or down');
      a.ok(points(res).some(function (d) { return /\n/.test(d.label.formatter); }), 'a long name breaks onto two lines');
      a.equal(res.table.rows.length, points(res).length, 'every point, labelled or not, is in the table');
      a.ok(points(res).every(function (d) { return res.target({ data: d }); }), 'and opens its details on click');
    });

    T.test('X-industry-quad-label-order', 'QA-3 (d): the largest bubbles, then group priorities, win label spots', function (a) {
      sample();
      [{ w: 560, h: 560 }, { w: 440, h: 560 }].forEach(function (size) {
        ['ind.pipeline', 'ind.currentArr'].forEach(function (sizeId) {
          var res = quad('bubble', { mode: 'all' }, { size: size, sizeId: sizeId }), pts = points(res), tag = size.w + ' px, ' + sizeId + ': ';
          var big = pts.slice().sort(function (p, q) { return q.symbolSize - p.symbolSize; })[0];
          a.ok(big.label.show, tag + 'the largest bubble (' + big.name + ') is labelled');
          pts.filter(function (d) { return TAP.data.industry(d.industryId).groupPriority; }).forEach(function (d) {
            a.ok(d.label.show, tag + 'group priority ' + d.name + ' is labelled');
          });
        });
      });
    });

    T.test('X-industry-quad-frame', 'QA-3: area names sit outside the plot and labels sit over the midpoint lines', function (a) {
      sample();
      var size = { w: 560, h: 560 }, res = quad('bubble', { mode: 'all' }, { size: size }), g = res.option.grid;
      a.equal(g.containLabel, false, 'fixed margins, so the plot is where the labels were placed');
      var names = res.option.graphic.filter(function (x) { return x.tapQuadrant; });
      a.equal(names.length, 4, 'four area names');
      names.forEach(function (n) {
        var out = n.y <= g.top - 8 || n.y >= size.h - g.bottom + 8;
        a.ok(out, n.style.text + ' is outside the plot');
        a.ok(n.style.fontSize >= TH.type.chartMin, n.style.text + ' at 13 px or more');
      });
      var lines = series(res).filter(function (x) { return x.markLine && x.tapRole !== 'link'; })[0];
      valueSeries(res).filter(function (x) { return (x.data || []).length; }).forEach(function (x) {
        a.ok(x.z > (lines.markLine.z || 5) && x.z > 5, x.name + ': bubbles and labels draw over the midpoint lines');
        x.data.forEach(function (d) { a.equal(d.label.backgroundColor, TH.ground, d.name + ': the label breaks the line behind it'); });
      });
      var hl = quad('bubble', { mode: 'all' }, { size: size, highlight: { reportId: 'ind-quad', mark: 'quadrant', quadrant: 'attractiveNotYet' } });
      var on = hl.option.graphic.filter(function (x) { return x.tapQuadrant === 'attractiveNotYet'; })[0];
      a.equal(on.style.fontWeight, 800, 'the highlighted area name is bold, beside its outline');
    });

    T.test('X-industry-quad-pairs', 'QA-3, QA-6: one against the rest and a pair name each industry once, join its bubbles and caption the chart right', function (a) {
      sample();
      var R = sampleIds(), size = { w: 560, h: 560 };
      [[{ mode: 'one', focus: R[0] }, 'focusStatement'], [{ mode: 'pair', focus: R[0], second: R[2] }, 'everyStatement']].forEach(function (c) {
        var res = quad('bubble', c[0], { size: size }), tag = c[0].mode + ': ', seen = {}, twice = [];
        points(res).filter(function (d) { return d.label.show; }).forEach(function (d) { if (seen[d.industryId]) twice.push(d.name); seen[d.industryId] = true; });
        a.deepEqual(twice, [], tag + 'no industry is named twice');
        var link = series(res).filter(function (x) { return x.tapRole === 'link'; })[0];
        a.ok(link && link.markLine.data.length >= 15, tag + 'a thin line joins each industry\'s two bubbles');
        a.equal(res.option.title.text, TAP.content.text('quadrant.' + c[1], { focus: TAP.content.regionName(TAP.data.region(R[0])) }), tag + 'caption');
        a.ok(res.notes.some(function (n) { return n.indexOf(TAP.content.regionName(TAP.data.region(R[0]))) >= 0; }), tag + 'a note says where the names sit');
        a.deepEqual(overlaps(labelBoxes(res, size)), [], tag + 'no two labels overlap');
      });
      var pair = quad('bubble', { mode: 'pair', focus: R[0], second: R[2] }, { size: size });
      a.ok(pair.notes.indexOf(TAP.content.text('quadrant.averageNote')) < 0, 'pair: no note about averages, as nothing is averaged');
      var all = quad('bubble', { mode: 'all' }, { size: size });
      a.equal(all.option.title.text, TAP.content.text('quadrant.averageStatement'), 'All regions: each bubble is an average');
      a.ok(!series(all).some(function (x) { return x.tapRole === 'link'; }), 'All regions: nothing to join');
    });

    T.test('X-industry-tiers-combined-note', 'QA-12: when the comparison combines regions, the tier grid says why it shows them one by one', function (a) {
      var one = grid('heatmap', { mode: 'one', focus: 'alpha' }), org = grid('heatmap', { mode: 'org' }), all = grid('heatmap', { mode: 'all' });
      a.equal(one.notes[0], TAP.content.text('tierGrid.notCombinedRest'), 'one against the rest as one figure');
      a.equal(org.notes[0], TAP.content.text('tierGrid.notCombinedAll'), 'organization total');
      a.equal(all.notes.indexOf(TAP.content.text('tierGrid.notCombinedRest')), -1, 'All regions: no note');
      var ind = grid('heatmap', { mode: 'one', focus: 'alpha', restAs: 'individual' });
      a.equal(ind.notes.indexOf(TAP.content.text('tierGrid.notCombinedRest')), -1, 'the rest drawn one by one: no note');
      a.equal(grid('bubbleGrid', { mode: 'org' }).notes[0], TAP.content.text('tierGrid.notCombinedAll'), 'the bubble grid says so too');
    });

    T.test('X-industry-quad-switch', 'QA-6: the Show switch matches what is drawn, and is left out where averaging cannot apply', function (a) {
      function sw(c, o) { return quad('bubble', c, { opts: o || {} }).controls.filter(function (x) { return x.key === 'everyRegion'; })[0] || null; }
      a.ok(sw({ mode: 'all' }), 'All regions: offered');
      a.equal(sw({ mode: 'all' }).value, false, 'average pressed by default');
      a.equal(sw({ mode: 'all' }, { everyRegion: true }).value, true, 'every region pressed when chosen');
      a.ok(sw({ mode: 'one', focus: 'alpha' }), 'one against the rest: offered');
      a.ok(sw({ mode: 'set', set: ['alpha', 'bravo', 'charlie'] }), 'a set: offered (it averages)');
      a.equal(sw({ mode: 'pair', focus: 'alpha', second: 'bravo' }), null, 'a pair: left out, each region already has its own bubble');
      a.ok(quad('bubble', { mode: 'pair', focus: 'alpha', second: 'bravo' }).controls.some(function (x) { return x.key === 'industryFilter'; }), 'the industry filter stays');
    });

    T.test('X-industry-quad-leaders', 'Leader lines only where a label moved away from its bubble; short ones when every region is drawn', function (a) {
      sample();
      var size = { w: 560, h: 560 }, R = sampleIds();
      var res = quad('bubble', { mode: 'all' }, { size: size }), shown = points(res).filter(function (d) { return d.label.show; });
      shown.forEach(function (d) {
        var moved = d.label.dy !== 0 || Math.abs(d.label.position[0] - (d.label.side === 'right' ? d.symbolSize : 0)) > 6;
        a.equal(!!(d.labelLine && d.labelLine.show), moved, d.name + ': a line only when moved');
      });
      [[{ mode: 'pair', focus: R[0], second: R[2] }, {}], [{ mode: 'all' }, { everyRegion: true }]].forEach(function (c) {
        points(quad('bubble', c[0], { size: size, opts: c[1] })).filter(function (d) { return d.label.show; }).forEach(function (d) {
          var gap = Math.abs(d.label.position[0] - (d.label.side === 'right' ? d.symbolSize : 0));
          a.ok(gap <= 28 && Math.abs(d.label.dy) <= 2 * (TH.type.chart + 6), c[0].mode + ': ' + d.name + ' stays near its bubble');
        });
      });
    });

    T.test('X-industry-quad-labels-module', 'TAP.quadrantLabels places labels on its own: biggest first, none overlapping, frame returned', function (a) {
      function pt(name, x, y, d, gp) { return { x: { v: x }, y: { v: y }, dx: 0, dy: 0, d: d, named: true, text: name, ind: { groupPriority: !!gp } }; }
      var pts = [pt('Small one', 2, 2, 10), pt('Biggest industry name here', 2.01, 2.01, 30), pt('Group pick', 2.02, 1.99, 30, true), pt('Far away', 1.2, 2.8, 12)];
      var F = TAP.quadrantLabels.place(pts, { size: { w: 560, h: 560 } }, { scale: { min: 1, max: 3 } });
      a.ok(F.w > 300 && F.h > 300 && F.m.left > 0, 'returns the plot frame');
      a.ok(pts[1].lab && pts[2].lab, 'the two biggest bubbles are labelled');
      a.ok(/\n/.test(pts[1].label), 'a long name is on two lines');
      a.equal(pts[3].label, 'Far away', 'a short name is unchanged');
      var pos = TAP.quadrantLabels.at(pts[1], 30);
      a.ok(pos.align === 'left' || pos.align === 'right', 'at() gives an ECharts label position');
      var near = [pt('A', 2, 2, 20), pt('B', 2, 2, 20)];
      TAP.quadrantLabels.place(near, { size: { w: 560, h: 560 } }, { scale: { min: 1, max: 3 }, near: true });
      near.forEach(function (p) { if (p.lab) a.ok(p.lab.gap <= 28, p.text + ': near spot only'); });
      a.ok(TAP.quadrantLabels.place([], {}, {}).w > 0, 'no points: still a frame');
    });

    /* ---------- QA-3 (b): every bubble identifiable without hover ---------- */

    // The six comparison settings of the QA matrix, picked by position like scripts/qa/lib-qa.sh does.
    function settingsOf(R) {
      return [['all', { mode: 'all' }], ['one-average', { mode: 'one', focus: R[4], restAgg: 'average' }],
        ['one-total', { mode: 'one', focus: R[0], restAgg: 'total' }], ['pair', { mode: 'pair', focus: R[0], second: R[R.length - 1] }],
        ['set', { mode: 'set', set: [R[0], R[3], R[R.length - 1]] }], ['org', { mode: 'org' }]];
    }
    // The chart sizes of a half-width panel at 1280 and a full-width one at 853 x 533 @150%, and a narrower one.
    var QUAD_SIZES = [{ w: 540, h: 560 }, { w: 700, h: 560 }, { w: 440, h: 520 }];
    function numberOf(industryId) {
      return TAP.data.industries({ rated: true }).map(function (d) { return d.id; }).indexOf(industryId) + 1;
    }
    function marks(res) { return series(res).filter(function (s) { return s.tapRole === 'mark'; }).reduce(function (o, s) { return o.concat(s.data || []); }, []); }
    function markOf(res, d) { return marks(res).filter(function (m) { return m.entityId === d.entityId && m.industryId === d.industryId; })[0]; }
    // Every label and number on screen as a box, and every bubble as a circle, from the option's own plot margins.
    function layoutOf(res, size) {
      var g = res.option.grid, w = size.w - g.left - g.right, h = size.h - g.top - g.bottom, fs = TH.type.chart, nfs = TH.type.chartMin;
      function at(v) { return { x: g.left + (v[0] - 1) / 2 * w, y: g.top + (3 - v[1]) / 2 * h }; }
      // Drawing order: series by z, then data order (later marks are drawn over earlier ones)
      var dots = [], boxes = [];
      valueSeries(res).slice().sort(function (p, q) { return p.z - q.z; }).forEach(function (s) {
        s.data.forEach(function (d) { var c = at(d.value); c.r = d.symbolSize / 2; c.d = d; c.rank = dots.length; dots.push(c); });
      });
      points(res).filter(function (d) { return d.label.show; }).forEach(function (d) {
        var lines = String(d.label.formatter).split('\n'), tw = Math.max.apply(null, lines.map(function (l) { return l.length; })) * fs * 0.5;
        var c = at(d.value), r = d.symbolSize / 2, gap = d.label.position[0] - (d.label.side === 'right' ? d.symbolSize : 0), bh = lines.length * fs;
        boxes.push({ name: d.name, x: d.label.side === 'right' ? c.x + r + gap : c.x - r + gap - tw, y: c.y + d.label.dy - bh / 2, w: tw, h: bh, own: null });
      });
      marks(res).filter(function (m) { return m.label && m.label.show; }).forEach(function (m) {
        var c = at(m.value), o = m.label.offset || [0, 0], tw = String(m.label.formatter).length * nfs * 0.55, own = dots.filter(function (x) {
          return x.d.entityId === m.entityId && x.d.industryId === m.industryId; })[0];
        boxes.push({ name: '#' + m.label.formatter, x: c.x + o[0] - tw / 2, y: c.y + o[1] - nfs * 0.36, w: tw, h: nfs * 0.72, own: own, inside: !o[0] && !o[1] });
      });
      return { dots: dots, boxes: boxes };
    }
    function clashes(L) {
      var out = [], hit = function (b, c) {
        var nx = Math.max(b.x, Math.min(c.x, b.x + b.w)), ny = Math.max(b.y, Math.min(c.y, b.y + b.h));
        return (c.x - nx) * (c.x - nx) + (c.y - ny) * (c.y - ny) < (c.r - 1) * (c.r - 1);
      };
      L.boxes.forEach(function (p, i) {
        L.boxes.slice(i + 1).forEach(function (q) { if (p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h) out.push(p.name + ' / ' + q.name); });
        // A number inside its bubble may sit over bubbles drawn underneath that bubble: they are hidden there
        L.dots.forEach(function (c) { if (c !== p.own && !(p.inside && c.rank < p.own.rank) && hit(p, c)) out.push(p.name + ' on the bubble of ' + c.d.name + ' · ' + c.d.entityId); });
      });
      return out;
    }
    // A bubble is identifiable when its name is beside it, or it carries a number the key names.
    function unnamed(res) {
      var key = {};
      (res.legend || []).forEach(function (l) { if (l.mark != null && l.role === 'industry') key[l.mark] = l.label; });
      return points(res).filter(function (d) {
        if (d.label.show && String(d.label.formatter).replace(/\n/g, ' ') === d.name) return false;
        var m = markOf(res, d);
        return !(m && m.label.show && m.label.formatter === String(numberOf(d.industryId)) && key[m.label.formatter] === d.name);
      }).map(function (d) { return d.name + ' · ' + d.entityId; });
    }

    T.test('X-industry-quad-identify', 'QA-3: in every comparison setting, every bubble is named or numbered, and nothing overlaps', function (a) {
      sample();
      settingsOf(sampleIds()).forEach(function (s) {
        QUAD_SIZES.forEach(function (size) {
          var res = quad('bubble', s[1], { size: size }), tag = s[0] + ' ' + size.w + ' px: ';
          a.ok(points(res).length >= 18, tag + 'draws the bubbles (' + points(res).length + ')');
          a.deepEqual(unnamed(res), [], tag + 'every bubble is named beside it or numbered with a key entry');
          a.deepEqual(clashes(layoutOf(res, size)), [], tag + 'no label or number overlaps another, or another bubble');
        });
      });
    });

    T.test('X-industry-quad-numbers', 'QA-3: each industry keeps one number, in lookup order, in its bubbles, the key and the table', function (a) {
      sample();
      var R = sampleIds(), inds = TAP.data.industries({ rated: true });
      settingsOf(R).forEach(function (s) {
        var res = quad('bubble', s[1], { size: { w: 540, h: 560 } }), tag = s[0] + ': ';
        var key = res.legend.filter(function (l) { return l.role === 'industry'; });
        a.deepEqual(key.map(function (l) { return [l.mark, l.label]; }), inds.map(function (d, i) { return [i + 1, d.name]; }), tag + 'the key lists 1 to n in lookup order');
        key.forEach(function (l) { a.equal(l.color, null, tag + l.label + ': a number, no colour swatch'); });
        a.ok(res.legend.some(function (l) { return l.role !== 'industry' && l.color; }), tag + 'the region or average swatches stay');
        marks(res).forEach(function (m) { a.equal(m.raw, undefined, tag + 'a number is not a value'); });
        var s0 = series(res).filter(function (x) { return x.tapRole === 'mark'; })[0];
        a.ok(s0 && s0.silent && s0.z > 8, tag + 'numbers sit over the bubbles and leave hover and clicks to them');
        a.ok(res.table.columns.some(function (c) { return c.key === 'num'; }), tag + 'the table has a number column');
        res.table.rows.forEach(function (r) { a.equal(r.cells.num.v, String(numberOf(r.industryId)), tag + 'table number for ' + r.industryId); });
      });
      var big = quad('bubble', { mode: 'all' }, { size: { w: 700, h: 560 } });
      a.ok(marks(big).some(function (m) { return !m.label.offset || (!m.label.offset[0] && !m.label.offset[1]); }), 'numbers sit inside the bubbles where they fit');
      a.ok(marks(big).filter(function (m) { return !m.label.backgroundColor; }).every(function (m) { return m.label.color === TH.onColour; }), 'in on-colour text');
    });

    T.test('X-industry-quad-no-web', 'QA-3: one against the rest and a pair use numbers instead of leader lines', function (a) {
      sample();
      settingsOf(sampleIds()).filter(function (s) { return /one|pair/.test(s[0]); }).forEach(function (s) {
        QUAD_SIZES.forEach(function (size) {
          var shown = points(quad('bubble', s[1], { size: size })).filter(function (d) { return d.label.show; });
          a.deepEqual(shown.filter(function (d) { return d.labelLine && d.labelLine.show; }).map(function (d) { return d.name; }), [],
            s[0] + ' ' + size.w + ' px: every name sits beside its bubble, no leader line');
        });
      });
    });

    T.test('X-industry-quad-filter-numbers', 'QA-3: with an industry filter each point carries its region number, matching the legend', function (a) {
      sample();
      var res = quad('bubble', { mode: 'all' }, { size: { w: 540, h: 560 }, opts: { industryFilter: TAP.data.industries({ rated: true })[0].id } });
      var key = {};
      res.legend.forEach(function (l) { if (l.mark != null) key[l.mark] = l.label; });
      points(res).forEach(function (d) {
        var m = markOf(res, d), n = TAP.data.regionIndex(d.entityId) + 1, name = TAP.content.regionName(TAP.data.region(d.entityId));
        a.ok((d.label.show && d.label.formatter === name) || (m && m.label.formatter === String(n) && key[n] === name), name + ' is identifiable');
      });
      a.deepEqual(clashes(layoutOf(res, { w: 540, h: 560 })), [], 'nothing overlaps');
    });

    T.test('X-industry-quad-takeaway', 'The takeaway follows the comparison scope', function (a) {
      var all = quad('bubble', { mode: 'all' }).takeaway, one = quad('bubble', { mode: 'one', focus: 'delta' }).takeaway;
      a.ok(all && one && all !== one, 'differs by scope');
      a.match(one, /Region D/, 'names the focus region');
    });

    T.test('TPV-TC-062', 'Quadrant: every chart value equals the table value, on the mini data, in every mode', function (a) {
      [{ mode: 'all' }, { mode: 'one', focus: 'alpha' }, { mode: 'one', focus: 'bravo', restAs: 'individual' }, { mode: 'org' },
        { mode: 'pair', focus: 'charlie', second: 'delta' }, { mode: 'set', set: ['alpha', 'charlie'] }].forEach(function (c) {
        [false, true].forEach(function (every) {
          ['bubble', 'scatter'].forEach(function (type) {
            bubbleSameAsTable(a, quad(type, c, { opts: { everyRegion: every } }), c.mode + ' ' + type + (every ? ' every' : ''));
          });
        });
        bubbleSameAsTable(a, quad('bubble', c, { opts: { industryFilter: 'ind4' } }), c.mode + ' filtered');
      });
    });

    T.test('TPV-TC-062', 'Quadrant: every chart value equals the table value, on the sample data', function (a) {
      sample();
      var R = sampleIds();
      [{ mode: 'all' }, { mode: 'one', focus: R[2] }, { mode: 'org' }, { mode: 'pair', focus: R[0], second: R[6] }].forEach(function (c) {
        [false, true].forEach(function (every) {
          var res = quad('bubble', c, { opts: { everyRegion: every } });
          a.equal(res.error, null, c.mode + ' draws');
          bubbleSameAsTable(a, res, 'sample ' + c.mode + (every ? ' every' : ''));
        });
      });
      var p03 = window.SAMPLE_EXPECT.p03, res = quad('bubble', { mode: 'all' }, { opts: { everyRegion: true } });
      Object.keys(p03.scores).forEach(function (r) {
        var d = pointOf(res, r, p03.industry);
        a.near(d.raw[1], p03.scores[r].a, 1e-5, 'P03 ' + r + ' attractiveness');
        a.near(d.raw[0], p03.scores[r].b, 1e-5, 'P03 ' + r + ' ability');
      });
    });
  });

  /* ---------- US-1.2.9 click for details ---------- */

  function rowsOf(built) {
    var out = [];
    (built.groups || []).forEach(function (g) { (g.rows || []).forEach(function (r) { out.push(Object.assign({ group: g.title }, r)); }); });
    return out;
  }
  function find(built, label) { return rowsOf(built).filter(function (r) { return r.label === label; })[0]; }
  function shown(r) { return r.text != null ? r.text : TAP.format.cell(r.cell, { unit: r.unit, field: r.field, exact: true }); }
  function everyValueSourced(a, built, label) {
    var rows = rowsOf(built);
    a.ok(rows.length > 0, label + ': has rows');
    rows.forEach(function (r) {
      var c = r.cell || {};
      a.ok(c.state, label + ' ' + r.label + ': a full cell');
      a.ok(c.kind && TAP.format.kind(c.kind).label, label + ' ' + r.label + ': kind of value');
      var at = c.src && TAP.sources.address(c.src);
      a.ok(at && at.text, label + ' ' + r.label + ': source');
      // A figure the app adds up itself (the ambition) names the file only; every other value names its sheet too.
      if (at && !at.combined) a.ok(at.file && (at.sheet || c.kind === 'APP'), label + ' ' + r.label + ': file and sheet');
    });
  }

  T.suite('industry-details', function () {
    T.test('TPV-TC-252', 'One region and one industry: six ratings with wording, tier, system figures, commentary, grouped', function (a) {
      var built = TAP.details.build({ reportId: 'ind-tiers', regionIds: ['alpha'], industryIds: ['ind1'] });
      a.match(built.title, /Healthcare/, 'title names the industry');
      a.match(built.title, /Region A/, 'and the region');
      a.ok(built.groups.length >= 4, 'grouped');
      built.groups.forEach(function (g) { a.ok(g.title && g.title.charAt(0) !== '[', 'group titled: ' + g.title); });
      [['Growth potential', 'Strong dynamics, business to take (3)'], ['Criticality', 'Core, business critical (3)'],
        ['Competitive intensity', 'Fragmented, no clear leader (2)'], ['References', 'Selling to top 5 local players (3)'],
        ['Expertise', 'Generalized (3)'], ['Product fit', 'Strong (3)']].forEach(function (p) {
        var r = find(built, p[0]);
        a.ok(r, p[0] + ' listed');
        a.equal(shown(r), p[1], p[0] + ' with its wording');
        a.equal(r.cell.kind, 'IN', p[0] + ' is a leader input');
      });
      a.equal(shown(find(built, 'Tier')), 'Tier 1', 'tier');
      a.equal(find(built, 'Current ARR').cell.v, 1000, 'current ARR');
      a.equal(find(built, 'Pipeline').cell.v, 2000, 'pipeline');
      a.equal(find(built, 'Pipeline created in the last 12 months').cell.v, 800, 'pipeline, 12 months');
      a.equal(find(built, 'Current ARR').cell.kind, 'PRE', 'system figure');
      a.equal(find(built, 'Leader commentary').cell.v, 'Strong base in clinics.', 'commentary');
      a.near(find(built, 'Attractiveness').cell.v, X.scores.alpha.ind1.a, 1e-6, 'attractiveness score');
      a.equal(find(built, 'Target accounts').cell.v, 20, 'new business row: target accounts');
      a.equal(find(built, 'Success factors').cell.v, 'Local references', 'new business row: success factors');
      a.ok(built.groups.some(function (g) { return /North/.test(g.title) && /Clinics/.test(g.title); }), 'new business row named by market and sub-vertical');
    });

    T.test('TPV-TC-252', 'A blank commentary or a missing new business row adds no empty group', function (a) {
      var built = TAP.details.build({ regionIds: ['alpha'], industryIds: ['ind2'] });
      a.equal(find(built, 'Leader commentary'), undefined, 'no commentary row when blank');
      a.ok(built.groups.every(function (g) { return g.rows.length; }), 'no empty groups');
      a.equal(shown(find(built, 'References')), 'Some references (2)');
      built = TAP.details.build({ regionIds: ['charlie'], industryIds: ['ind1'] });
      a.equal(shown(find(built, 'References')), 'not provided', 'a blank rating reads not provided');
      a.equal(shown(find(built, 'Ability to win')), 'not provided', 'so does the score built on it');
    });

    T.test('TPV-TC-253', 'Every value carries its kind and its source, for every kind of target', function (a) {
      everyValueSourced(a, TAP.details.build({ regionIds: ['alpha'], industryIds: ['ind1'] }), 'region and industry');
      everyValueSourced(a, TAP.details.build({ regionIds: ['bravo'] }), 'region');
      everyValueSourced(a, TAP.details.build({ accountIds: ['a2'] }), 'account');
      everyValueSourced(a, TAP.details.build({ regionIds: ['alpha', 'bravo', 'delta'], industryIds: ['ind4'] }), 'several regions');
      var r = find(TAP.details.build({ regionIds: ['alpha'], industryIds: ['ind1'] }), 'Growth potential');
      a.equal(TAP.sources.address(r.cell.src).text, 'Region A plan.xlsx › 1. Market Coverage › D10', 'file › sheet › cell');
      r = find(TAP.details.build({ regionIds: ['alpha'], industryIds: ['ind1'] }), 'Hit rate');
      a.equal(TAP.sources.address(r.cell.src).text, 'Region A plan.xlsx › 2. New Business › J20', 'new business cell');
    });

    T.test('TPV-TC-254', 'Details close with Esc or the close button, and update when another item is clicked', function (a) {
      try {
        TAP.layers.openDetails({ reportId: 'ind-tiers', regionIds: ['alpha'], industryIds: ['ind1'] });
        a.equal(TAP.layers.top(), 'details', 'open');
        a.match(document.querySelector('.tap-layer__title').textContent, /Healthcare/, 'first item');
        TAP.layers.openDetails({ reportId: 'ind-tiers', regionIds: ['delta'], industryIds: ['ind3'] });
        a.equal(document.querySelectorAll('.tap-layer').length, 1, 'still one side panel');
        a.match(document.querySelector('.tap-layer__title').textContent, /Retail/, 'updated to the new item');
        a.match(document.querySelector('.tap-layer__title').textContent, /Region D/);
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        a.equal(TAP.layers.top(), null, 'Esc closes');
        TAP.layers.openDetails({ reportId: 'ind-tiers', regionIds: ['bravo'], industryIds: ['ind2'] });
        document.querySelector('.tap-layer__close').click();
        a.equal(TAP.layers.top(), null, 'the close button closes');
      } finally { TAP.layers.close(); }
    });

    T.test('X-details-region', 'A region alone: the plan summary by section, without import notes', function (a) {
      var built = TAP.details.build({ regionIds: ['alpha'] }), E = X.region.alpha;
      a.equal(built.title, 'Region A');
      a.ok(built.groups.length >= 4, 'one group per section');
      a.equal(find(built, 'Current ARR').cell.v, E['base.arr']);
      a.equal(find(built, 'New business ARR potential').cell.v, E['nb.arr']);
      a.near(find(built, 'Hit rate').cell.v, E['nb.hitRate'], 1e-9);
      a.equal(find(built, 'Customer growth ARR').cell.v, E['cg.arr']);
      a.equal(find(built, '3-year ARR ambition').cell.v, E['amb.arr']);
      a.equal(find(built, 'Tier 2 industries').cell.v, E['focus.tier2']);
      var c = TAP.details.build({ regionIds: ['charlie'] });
      a.ok(rowsOf(c).every(function (r) { return String(r.cell.v).indexOf('section is empty') < 0 && r.label.indexOf('section is empty') < 0; }), 'no import notes');
      a.equal(shown(find(c, 'Customer growth ARR')), 'not provided', 'an empty section reads not provided');
    });

    T.test('X-review-RI-16', 'A bar click opens details with the clicked figure first, as the bar and its tooltip show it', function (a) {
      sample();
      var P = window.PLAN_DATA, num = function (v) { return typeof v === 'number' && isFinite(v); };
      function bar(id, c, extra, pick) {
        var k = cmp(c), def = TAP.reports.get(id), item = null;
        var ctx = Object.assign(ctxFor(id, def.defaultType, c), { breakdown: def.defaultBreakdown || null, entities: TAP.scope.entities(k) }, extra || {});
        var res = TAP.builders.get(def.builder || def.shape)(ctx);
        res.option.series.forEach(function (s) {
          (s.data || []).forEach(function (d) { if (!item && d && typeof d === 'object' && pick(d)) item = { d: d, s: s }; });
        });
        return { res: res, item: item };
      }
      function check(label, b, hand) {
        a.ok(b.item, label + ': the bar is drawn');
        if (!b.item) return;
        a.near(b.item.d.raw, hand, 1e-6, label + ': the bar holds the hand-worked figure');
        var built = TAP.details.build(b.res.target({ data: b.item.d })), g = built.groups[0] || { rows: [] }, r = g.rows[0];
        a.equal(g.title, 'In this chart', label + ': the first group is the chart’s figure');
        a.ok(r && r.cell.state === 'value' && Math.abs(r.cell.v - hand) < 1e-6, label + ': the details show it (' + (r && r.cell.v) + ')');
        a.ok(r && r.cell.src, label + ': with its source');
        var tip = b.item.s.tooltip && b.item.s.tooltip.formatter({ data: b.item.d });
        if (r) a.ok(String(tip).indexOf(TAP.format.cell(r.cell, { unit: r.unit, exact: true })) >= 0, label + ': the tooltip shows the same figure');
      }
      // Southern Europe's order intake through partners: every partner recap item (both motions, ARR and services)
      var seu = P.regions.filter(function (r) { return r.id === 'seu'; })[0];
      var hand1 = seu.recap.filter(function (x) { return x.channel === 'partner' && num(x.value); }).reduce(function (s, x) { return s + x.value; }, 0);
      check('pt-reliance, one region', bar('pt-reliance', { mode: 'all' }, { measureId: 'rc.all.oi' },
        function (d) { return d.entityId === 'seu' && d.key === 'rc.all.oi.partner'; }), hand1);
      // The other regions' year-1 customer growth: their summed year-1 increments over their summed current ARR
      var inc = 0, base = 0;
      P.regions.filter(function (r) { return r.id !== 'na'; }).forEach(function (r) {
        r.customerGrowth.accounts.forEach(function (x) { if (num(x.incrementalArr[0]) && num(x.currentArr)) { inc += x.incrementalArr[0]; base += x.currentArr; } });
      });
      check('cg-growth, combined bar', bar('cg-growth', { mode: 'one', focus: 'na', restAs: 'combined', restAgg: 'average' }, null,
        function (d) { return d.entityId === 'rest' && d.key === 'cg.growth.all@y1'; }), inc / base);
    });

    T.test('X-review-RI-17', 'An account is found within the region named, never in another region', function (a) {
      var plan = window.T_FIXTURE('mini'), copy = JSON.parse(JSON.stringify(plan.regions[0].customerGrowth.accounts[1]));
      copy.name = 'Fictional Twin';
      plan.regions[1].customerGrowth.accounts.push(copy);   // the same account id in Region B
      TAP.data.load(plan);
      a.match(TAP.details.build({ accountIds: [copy.id], regionIds: ['bravo'] }).title, /Fictional Twin/, 'Region B’s account');
      a.match(TAP.details.build({ accountIds: [copy.id], regionIds: ['alpha'] }).title, /Fictional Account A2/, 'Region A’s account');
    });

    T.test('X-details-account', 'An account: its figures with their kinds and cells', function (a) {
      var built = TAP.details.build({ accountIds: ['a2'] });
      a.match(built.title, /Fictional Account A2/);
      a.match(built.title, /Region A/);
      a.equal(find(built, 'Current ARR').cell.v, 200);
      a.equal(find(built, 'Current ARR').cell.kind, 'PRE');
      a.equal(find(built, 'Risk level').cell.v, 'high');
      a.equal(find(built, 'Segment').cell.v, 'core');
      var g1 = rowsOf(built).filter(function (r) { return r.cell.src && r.cell.src.field === 'growthPct' && r.cell.src.year === 1; })[0];
      a.equal(g1.cell.v, 0.5, 'growth % year 1');
      a.equal(g1.cell.kind, 'IN');
      a.equal(TAP.sources.address(g1.cell.src).text, 'Region A plan.xlsx › 3. Customer Growth › I11', 'cell of growth % year 1');
      a.deepEqual(TAP.details.build({ accountIds: ['nobody'] }).groups, [], 'an unknown account gives no groups');
    });

    T.test('X-details-several', 'Several regions and one industry: combined ratings, then each region', function (a) {
      var built = TAP.details.build({ reportId: 'ind-quad', regionIds: ['alpha', 'bravo', 'charlie', 'delta'], industryIds: ['ind1'] });
      a.match(built.title, /Healthcare/);
      a.near(find(built, 'Growth potential').cell.v, 2.75, 1e-9, 'combined by the rating rule');
      a.equal(find(built, 'Growth potential').cell.kind, 'APP');
      a.ok(built.groups.some(function (g) { return g.title === 'Region C'; }), 'a group per region');
      var only = TAP.details.build({ industryIds: ['ind3'] });
      a.match(only.title, /Retail/);
      a.ok(only.groups.length >= 4, 'an industry alone lists the regions in scope');
      a.deepEqual(TAP.details.build(null).groups, [], 'no target, no groups');
    });
  });

  /* ---------- US-1.5.7 leaders' commentary ---------- */

  function withView(fn) {
    var root = T.dom.mount(), view = TAP.views.get('industry').mount(root);
    try { fn(root); } finally { view.destroy(); TAP.layers.close(); }
  }
  function comments(root) { return Array.prototype.slice.call(root.querySelectorAll('.tap-ind-comment')); }
  function commentRegions(root) { return comments(root).map(function (c) { return c.getAttribute('data-region'); }); }
  function heading(root) { return root.querySelector('.tap-ind-comments__title').textContent; }

  T.suite('industry-comments', function () {
    T.test('X-industry-view-layout', 'Tier grid at full width, then the quadrant and ratings side by side, then the commentary', function (a) {
      withView(function (root) {
        var ids = Array.prototype.map.call(root.querySelectorAll('.tap-panel'), function (p) { return p.getAttribute('data-report'); });
        a.deepEqual(ids, ['ind-tiers', 'ind-quad', 'ind-ratings'], 'three panels in order');
        var pair = root.querySelector('.tap-ind__pair');
        a.equal(pair.querySelectorAll('.tap-panel').length, 2, 'two panels side by side, never more');
        var all = Array.prototype.slice.call(root.querySelectorAll('.tap-panel, .tap-ind-comments'));
        a.ok(/tap-ind-comments/.test(all[all.length - 1].className), 'the commentary comes last');
      });
    });

    T.test('X-industry-comments-list', 'Each region’s tier and comment for the selected industry; only comments that exist', function (a) {
      withView(function (root) {
        TAP.store.set({ industry: 'ind3' });
        a.match(heading(root), /Retail/, 'names the industry');
        a.deepEqual(commentRegions(root), ['bravo', 'delta'], 'only the regions that commented, in file order');
        var b = comments(root)[0];
        a.match(b.textContent, /Region B/, 'labelled by region');
        a.match(b.textContent, /Opportunistic only\./, 'the comment');
        a.match(b.textContent, /Tier 3/, 'the tier');
        a.ok(b.textContent.indexOf('Region B plan.xlsx › 1. Market Coverage › N12') >= 0, 'the source cell');
        a.ok(b.textContent.indexOf(TAP.format.kind('IN').text) >= 0, 'the kind of value');
        TAP.store.set({ industry: 'ind2' });
        a.equal(comments(root).length, 0, 'nobody commented on ind2: nothing listed');
        a.ok(!/no comment|0 comments|not commented/i.test(root.querySelector('.tap-ind-comments').textContent), 'and no "no comment" label or count');
        // QA-5: one plain line instead of an empty box, naming no region
        var none = root.querySelector('.tap-ind-comments__none');
        a.ok(none, 'an empty-state line');
        a.equal(none.textContent, TAP.content.text('commentary.none', { industry: TAP.data.industry('ind2').name }), 'its wording');
        TAP.data.regions().forEach(function (r) { a.equal(none.textContent.indexOf(r.name), -1, 'does not name ' + r.name); });
        TAP.store.set({ industry: 'ind3' });
        a.equal(root.querySelector('.tap-ind-comments__none'), null, 'gone when there are comments');
      });
    });

    T.test('X-industry-comments-focus', 'The focus region’s comment comes first, and the list follows the comparison', function (a) {
      withView(function (root) {
        TAP.store.set({ industry: 'ind1', cmp: { mode: 'one', focus: 'charlie' } });
        a.deepEqual(commentRegions(root), ['charlie', 'alpha', 'bravo', 'delta'], 'focus first');
        a.match(comments(root)[0].textContent, /Focus region/, 'marked as the focus');
        TAP.store.set({ cmp: { mode: 'set', set: ['bravo', 'delta'] } });
        a.deepEqual(commentRegions(root), ['bravo', 'delta'], 'only the chosen regions');
      });
    });

    T.test('X-industry-comments-select', 'Selecting an industry in the grid, the quadrant or the ratings updates the commentary', function (a) {
      withView(function (root) {
        root.querySelector('.tap-panel[data-report="ind-tiers"] .tap-tg__name[data-tap-industry="ind4"]').click();
        a.match(heading(root), /Utilities/, 'grid row');
        TAP.bus.emit('industry:select', { industryId: 'ind1' });   // what a quadrant point or the ratings picker sends
        a.match(heading(root), /Healthcare/, 'industry:select');
        TAP.layers.openDetails({ reportId: 'ind-quad', regionIds: ['delta'], industryIds: ['ind3'] });
        a.equal(TAP.store.get().industry, 'ind3', 'details naming one industry select it');
        a.match(heading(root), /Retail/);
      });
    });

    T.test('X-industry-comments-long', 'A long comment is shown in full and the list scrolls', function (a) {
      var plan = T_FIXTURE('mini'), long = new Array(120).join('A long planted comment that keeps going. ') + 'The very end.';
      plan.regions[0].marketCoverage[0].commentary = long;
      plan.regions[1].marketCoverage[0].commentary = '<img src=x onerror=alert(1)>';
      TAP.data.load(plan);
      withView(function (root) {
        TAP.store.set({ industry: 'ind1' });
        var text = root.querySelector('.tap-ind-comment[data-region="alpha"] .tap-ind-comment__text');
        a.equal(text.textContent, long, 'every word, nothing cut off');
        var list = root.querySelector('.tap-ind-comments__list');
        a.equal(getComputedStyle(list).overflowY, 'auto', 'the list scrolls');
        a.equal(getComputedStyle(text).overflow, 'visible', 'the text itself is never clipped');
        a.equal(root.querySelector('.tap-ind-comments img'), null, 'commentary is shown as text');
      });
    });

    T.test('X-industry-comments-default', 'With no industry selected, the commentary shows the most split industry', function (a) {
      withView(function (root) {
        a.equal(TAP.store.get().industry, null);
        a.match(heading(root), /Education/, 'ind2 is the most split on the mini data');
      });
    });
  });

  /* ---------- US-1.5.6 how regions rate one industry ---------- */

  var RATINGS = ['growthPotential', 'criticality', 'competitiveIntensity', 'references', 'expertise', 'productFit'];
  // The report's own builder (the grid, D101), and the generic compare builder that still draws the bars, and dots or a
  // radar for any definition that asks for them.
  function ratingsRes(type, c, industryId, extra) {
    var def = TAP.reports.get('ind-ratings');
    return TAP.builders.get(def.builder || def.shape)(ctxFor('ind-ratings', type, c, Object.assign({ industryId: industryId }, extra || {})));
  }
  function dotsRes(type, c, industryId) { return TAP.builders.get('compare')(ctxFor('ind-ratings', type, c, { industryId: industryId })); }
  function rawRow(regionId, industryId) {
    return TAP.data.region(regionId).marketCoverage.filter(function (d) { return d.industryId === industryId; })[0];
  }
  function ratingsTitle(root) { return root.querySelector('.tap-panel[data-report="ind-ratings"] .tap-panel__title').textContent; }
  // Hand rule for the default: the smallest share of regions on one tier, then more distinct tiers, then file order.
  function splitByHand(regionIds) {
    var best = null;
    TAP.data.industries({ rated: true }).forEach(function (ind, i) {
      var n = { 1: 0, 2: 0, 3: 0 };
      regionIds.forEach(function (r) { var row = rawRow(r, ind.id); if (row && row.tier) n[row.tier]++; });
      var tot = n[1] + n[2] + n[3], share = tot ? Math.max(n[1], n[2], n[3]) / tot : 1;
      var distinct = [1, 2, 3].filter(function (x) { return n[x]; }).length;
      if (!best || share < best.share - 1e-12 || (Math.abs(share - best.share) < 1e-12 && distinct > best.distinct)) best = { id: ind.id, share: share, distinct: distinct, i: i };
    });
    return best && best.id;
  }

  T.suite('industry-ratings', function () {
    T.test('TPV-TC-262', 'The chosen industry’s six ratings, by region, match the data file', function (a) {
      var res = ratingsRes('grid', { mode: 'all' }, 'ind4');
      ['alpha', 'bravo', 'charlie', 'delta'].forEach(function (r) {
        var row = res.table.rows.filter(function (x) { return x.entityId === r; })[0], raw = rawRow(r, 'ind4');
        RATINGS.forEach(function (f) { a.equal(row.cells['ind.' + f].v, raw[f], r + ' ' + f); });
      });
      withView(function (root) {
        TAP.store.set({ industry: 'ind3' });
        a.match(ratingsTitle(root), /How do regions rate Retail\?/, 'the panel follows the chosen industry');
      });
    });

    T.test('TPV-TC-263', 'First opened, the panel shows the industry with the most disagreement on tier', function (a) {
      a.equal(TAP.industryView.current({ mode: 'all' }), 'ind2', 'mini: ind2 (Tier 2, 2, 3 and one blank)');
      a.equal(TAP.industryView.current({ mode: 'set', set: ['bravo', 'delta'] }), 'ind2', 'a tie goes to the first in the list');
      a.equal(TAP.industryView.current({ mode: 'set', set: ['alpha', 'bravo', 'charlie'] }), 'ind1', 'no split at all: the first industry');
      withView(function (root) {
        a.match(ratingsTitle(root), /Education/, 'the panel opens on it');
        TAP.store.set({ cmp: { mode: 'set', set: ['alpha', 'bravo', 'charlie'] } });
        a.match(ratingsTitle(root), /Healthcare/, 'and follows the scope while nothing is selected');
        TAP.store.set({ industry: 'ind4' });
        TAP.store.set({ cmp: { mode: 'all' } });
        a.match(ratingsTitle(root), /Utilities/, 'a selected industry stays');
      });
      sample();
      var R = sampleIds();
      a.equal(TAP.industryView.current(cmp({ mode: 'all' })), splitByHand(R), 'sample, all regions');
      a.equal(TAP.industryView.current(cmp({ mode: 'pair', focus: R[0], second: R[4] })), splitByHand([R[0], R[4]]), 'sample, a pair');
    });

    T.test('X-industry-ratings-wording', 'Ratings carry their wording into the table and the grid cells’ spoken names', function (a) {
      var res = ratingsRes('grid', { mode: 'all' }, 'ind1');
      var col = res.table.columns.filter(function (c) { return c.key === 'ind.growthPotential'; })[0];
      var row = res.table.rows.filter(function (x) { return x.entityId === 'alpha'; })[0];
      a.equal(TAP.format.cell(row.cells['ind.growthPotential'], { unit: col.unit, field: col.field, exact: true }), 'Strong dynamics, business to take (3)');
      var cell = parse(res.html).querySelector('[data-tap-region="alpha"][data-key="ind.growthPotential"]');
      a.match(cell.getAttribute('aria-label'), /Strong dynamics, business to take \(3\)/, 'the grid cell says the wording too');
    });

    T.test('TPV-TC-265', 'Grid by default (D101), bar and table offered; no dot plot or radar', function (a) {
      var def = TAP.reports.get('ind-ratings');
      a.equal(def.defaultType, 'grid');
      [1, 2, 3, 4, 7].forEach(function (n) { a.deepEqual(TAP.shapes.types(def, n), ['grid', 'bar', 'table'], n + ' regions'); });
    });

    T.test('TPV-TC-266', 'In each comparison mode the entities drawn match the comparison scope', function (a) {
      [{ mode: 'all' }, { mode: 'one', focus: 'alpha' }, { mode: 'one', focus: 'bravo', restAs: 'individual' },
        { mode: 'pair', focus: 'charlie', second: 'delta' }, { mode: 'set', set: ['alpha', 'delta'] }, { mode: 'org' }].forEach(function (c) {
        var want = TAP.scope.entities(cmp(c)).map(function (e) { return e.id; });
        ['grid', 'bar'].forEach(function (type) {
          var res = ratingsRes(type, c, 'ind1');
          a.deepEqual(res.table.rows.map(function (r) { return r.entityId; }), want, c.mode + ' ' + type + ': table');
          var drawn = [];
          if (type === 'grid') drawn = Array.prototype.map.call(parse(res.html).querySelectorAll('[data-entity]'), function (r) { return r.getAttribute('data-entity'); });
          else points(res).forEach(function (d) { if (drawn.indexOf(d.entityId) < 0) drawn.push(d.entityId); });
          a.deepEqual(drawn.slice().sort(), want.slice().sort(), c.mode + ' ' + type + ': chart');
        });
      });
    });
    T.test('X-industry-ratings-numbers', 'QA-4 (generic compare builder, six ratings as categories): with more than 3 regions each dot carries its region number, in file order, matching the legend', function (a) {
      sample();
      var R = sampleIds(), ind = TAP.data.industries({ rated: true })[0].id;
      function valueSeries2(res) { return series(res).filter(function (s) { return s.tapRole === 'value'; }); }
      function numbers(res) {
        var out = {};
        valueSeries2(res).forEach(function (s) { (s.data || []).forEach(function (d) { out[d.entityId] = s.label && s.label.show ? s.label.formatter : null; }); });
        return out;
      }
      var all = dotsRes('dot', { mode: 'all' }, ind), n = numbers(all);
      R.forEach(function (id, i) { a.equal(n[id], String(i + 1), id + ' is number ' + (i + 1)); });
      a.deepEqual(all.legend.map(function (l) { return l.mark; }), R.map(function (id, i) { return i + 1; }), 'the legend carries the same numbers');
      valueSeries2(all).forEach(function (s) { a.ok(s.symbolSize >= 18, s.name + ': dots big enough for a number'); });
      // QA-4b: rows stay compact. Every dot sits on its row's line at its exact value; dots that share a rating are
      // spread as a swarm by a pixel offset of the drawn symbol, so no two overlap and the chart keeps its normal height.
      var pts = [];
      valueSeries2(all).forEach(function (s) { s.data.forEach(function (d) { pts.push({ d: d, size: s.symbolSize }); }); });
      a.ok(pts.every(function (p) { return p.d.value[1] === RATINGS.indexOf(p.d.key.replace('ind.', '')); }), 'every dot on its row line');
      a.ok(pts.every(function (p) { return p.d.value[0] === p.d.raw; }), 'and at its exact value');
      var clash = [];
      pts.forEach(function (p, i) {
        pts.slice(i + 1).forEach(function (q) {
          if (p.d.key !== q.d.key || p.d.value[0] !== q.d.value[0]) return;
          var o1 = p.d.symbolOffset || [0, 0], o2 = q.d.symbolOffset || [0, 0];
          if (Math.max(Math.abs(o1[0] - o2[0]), Math.abs(o1[1] - o2[1])) < p.size) clash.push(p.d.entityId + '/' + q.d.entityId + ' ' + p.d.key);
        });
      });
      a.deepEqual(clash, [], 'dots that share a rating sit at least a dot apart');
      a.ok(pts.every(function (p) { var o = p.d.symbolOffset || [0, 0]; return Math.abs(o[1]) <= p.size; }), 'a swarm is at most two lines, so a row stays compact');
      a.equal(all.height, undefined, 'no height hint: the chart keeps its normal height');
      // Stable across modes: a set keeps each region's own number
      var set = numbers(dotsRes('dot', { mode: 'set', set: [R[1], R[3], R[5], R[6]] }, ind));
      a.deepEqual([set[R[1]], set[R[3]], set[R[5]], set[R[6]]], ['2', '4', '6', '7'], 'a set of four keeps the file numbers');
      var one = numbers(dotsRes('dot', { mode: 'one', focus: R[4], restAs: 'individual' }, ind));
      a.equal(one[R[4]], '5', 'one against the rest drawn one by one: the focus keeps its number');
      // Three or fewer groups: the look is unchanged
      var pair = dotsRes('dot', { mode: 'pair', focus: R[0], second: R[1] }, ind);
      a.ok(valueSeries2(pair).every(function (s) { return !(s.label && s.label.show); }), 'a pair has no numbers');
      a.ok(pair.legend.every(function (l) { return l.mark == null; }), 'and no legend numbers');
      a.ok(series(pair).every(function (x) { return (x.data || []).every(function (d) { return !d.symbolOffset; }); }), 'and no swarm');
    });

    T.test('X-industry-ratings-values', 'QA-4 (generic compare builder): numbering never changes a value, tooltip or table cell', function (a) {
      sample();
      var ind = TAP.data.industries({ rated: true })[2].id, res = dotsRes('dot', { mode: 'all' }, ind), n = 0;
      series(res).filter(function (s) { return s.tapRole === 'value'; }).forEach(function (s) {
        s.data.forEach(function (d) {
          var row = res.table.rows.filter(function (r) { return r.entityId === d.entityId; })[0];
          a.equal(d.value[0], row.cells[d.key].v, d.entityId + ' ' + d.key + ': chart value is the table value');
          a.equal(d.raw, row.cells[d.key].v, d.entityId + ' ' + d.key + ': raw value');
          n++;
        });
      });
      a.ok(n >= 40, 'every dot checked (' + n + ')');
    });
    T.test('X-industry-ratings-radar-fit', 'Polish (a), generic compare builder: radar names fit a half-width panel: smaller radius, long names on two lines', function (a) {
      var res = dotsRes('radar', { mode: 'pair', focus: 'alpha', second: 'bravo' }, 'ind1'), r = res.option.radar;
      a.equal(r.radius, '58%', 'radius leaves room for the names');
      var f = r.axisName.formatter;
      a.equal(f('Competitive intensity'), 'Competitive\nintensity', 'a long name breaks at its middle space');
      a.equal(f('Growth potential'), 'Growth\npotential', 'another long name');
      a.equal(f('References'), 'References', 'a short name stays on one line');
      a.deepEqual(r.indicator.map(function (i) { return i.name; }), ['Growth potential', 'Criticality', 'Competitive intensity', 'References', 'Expertise', 'Product fit'],
        'the names themselves are unchanged');
      a.ok(r.axisName.fontSize >= TH.type.chartMin, 'at 13 px or more');
    });
  });

  /* ---------- D101: the six ratings as a grid, grouped under the two scores ---------- */

  T.suite('ratings-grid', function () {
    var KEYS = ['ind.growthPotential', 'ind.criticality', 'ind.competitiveIntensity', 'ind.attractiveness',
      'ind.references', 'ind.expertise', 'ind.productFit', 'ind.ability'];
    function attrs(box, sel, name) { return Array.prototype.map.call(box.querySelectorAll(sel), function (n) { return n.getAttribute(name); }); }
    function gridCell(box, entity, key) { return box.querySelector('[data-entity="' + entity + '"] [data-key="' + key + '"]'); }
    function tableRow(res, id) { return res.table.rows.filter(function (r) { return r.entityId === id; })[0]; }
    // The attractiveness chart's own figures for the same comparison and industry (its table reads the exact cells).
    function quadRow(c, industryId, entityId, every) {
      var res = TAP.builders.get('quadrant')(ctxFor('ind-quad', 'bubble', c, { opts: every ? { industryFilter: industryId } : {} }));
      return res.table.rows.filter(function (r) { return r.entityId === entityId && r.industryId === industryId; })[0];
    }

    T.test('X-d101-ratings-grid', 'The grid is the default: one row per comparison entity, eight columns in the two groups', function (a) {
      var def = TAP.reports.get('ind-ratings');
      a.equal(def.defaultType, 'grid', 'the grid is the default type');
      sample();
      var ind = window.SAMPLE_EXPECT.p16.industry, res = ratingsRes(def.defaultType, { mode: 'all' }, ind), box = parse(res.html);
      a.deepEqual(attrs(box, '[data-entity]', 'data-entity'), sampleIds(), 'one row per region, in file order');
      a.deepEqual(Array.prototype.map.call(box.querySelectorAll('.tap-rg__group'), function (g) { return g.textContent; }),
        ['Attractiveness', 'Ability to win'], 'two groups');
      a.deepEqual(attrs(box, '[data-col]', 'data-col'), KEYS, 'three ratings, then the group’s average, for each group');
      sampleIds().forEach(function (id) {
        a.deepEqual(attrs(box.querySelector('[data-entity="' + id + '"]'), '[data-key]', 'data-key'), KEYS, id + ': eight cells');
      });
      a.deepEqual(res.table.columns.map(function (c) { return c.key; }), ['entity'].concat(KEYS), 'the table has the same columns');
    });

    T.test('X-d101-ratings-grid', 'For two sample regions the cells are the file’s ratings and the averages the attractiveness chart’s scores', function (a) {
      sample();
      var X = window.SAMPLE_EXPECT.p16, ind = X.industry, res = ratingsRes('grid', { mode: 'all' }, ind), box = parse(res.html);
      ['na', 'seu'].forEach(function (r) {
        var raw = rawRow(r, ind), row = tableRow(res, r);
        RATINGS.forEach(function (f) {
          a.equal(row.cells['ind.' + f].v, raw[f], r + ' ' + f + ' in the table');
          a.equal(gridCell(box, r, 'ind.' + f).textContent.trim(), String(raw[f]), r + ' ' + f + ' in the grid');
        });
        a.near(row.cells['ind.attractiveness'].v, X.scores[r].a, 1e-5, r + ': attractiveness (planted)');
        a.near(row.cells['ind.ability'].v, X.scores[r].b, 1e-5, r + ': ability to win (planted)');
        a.equal(gridCell(box, r, 'ind.attractiveness').textContent.trim(), X.scores[r].a.toFixed(1), r + ': one decimal');
        a.equal(gridCell(box, r, 'ind.ability').textContent.trim(), X.scores[r].b.toFixed(1), r + ': one decimal');
        var q = quadRow({ mode: 'all' }, ind, r, true);
        a.near(row.cells['ind.attractiveness'].v, q.cells['ind.attractiveness'].v, 1e-12, r + ': the chart’s y');
        a.near(row.cells['ind.ability'].v, q.cells['ind.ability'].v, 1e-12, r + ': the chart’s x');
      });
    });

    T.test('X-d101-ratings-grid', 'One vs the rest adds the combined row, with the attractiveness chart’s combined scores', function (a) {
      sample();
      var ind = window.SAMPLE_EXPECT.p16.industry, c = { mode: 'one', focus: 'na' }, res = ratingsRes('grid', c, ind), box = parse(res.html);
      var want = TAP.scope.entities(cmp(c));
      a.deepEqual(attrs(box, '[data-entity]', 'data-entity'), want.map(function (e) { return e.id; }), 'the focus region, then the rest');
      var rest = box.querySelector('[data-entity="rest"]');
      a.ok(rest && rest.classList.contains('is-combined'), 'the combined row is marked as combined');
      a.ok(rest.textContent.indexOf(want[1].label) >= 0, 'and named: ' + want[1].label);
      var row = tableRow(res, 'rest'), q = quadRow(c, ind, 'rest');
      a.near(row.cells['ind.attractiveness'].v, q.cells['ind.attractiveness'].v, 1e-12, 'attractiveness as the chart combines it');
      a.near(row.cells['ind.ability'].v, q.cells['ind.ability'].v, 1e-12, 'ability to win as the chart combines it');
      a.equal(gridCell(box, 'rest', 'ind.growthPotential').textContent.trim(), row.cells['ind.growthPotential'].v.toFixed(1),
        'a combined rating shows one decimal');
    });

    T.test('X-d101-ratings-grid', 'Dot plot and radar are no longer offered; a stored or presented one falls back or is skipped', function (a) {
      var def = TAP.reports.get('ind-ratings');
      a.deepEqual(def.types, ['grid', 'bar', 'table'], 'grid, bar and table');
      [2, 3, 7].forEach(function (n) {
        var t = TAP.shapes.types(def, n);
        a.ok(t.indexOf('dot') < 0 && t.indexOf('radar') < 0, n + ' regions: no dot plot, no radar');
      });
      a.equal(TAP.panelMenus.types(def, 4, { type: 'dot' }).current, 'grid', 'a remembered dot plot shows the grid');
      a.equal(TAP.panelMenus.types(def, 2, { type: 'radar' }).current, 'grid', 'a remembered radar shows the grid');
      ['dot', 'radar'].forEach(function (type) {
        var res = TAP.present.check([{ report: 'ind-ratings', type: type }]);
        a.equal(res.ok.length, 0, 'a presentation step asking for ' + type + ' is not shown');
        a.equal(res.skipped.length, 1, 'it is skipped with the usual message');
      });
      TAP.notes.clear();
    });

    T.test('X-d101-ratings-grid', 'Every cell shows its number; ratings are shaded light to dark, averages stand apart, blanks read "not provided"', function (a) {
      var res = ratingsRes('grid', { mode: 'all' }, 'ind1'), box = parse(res.html);
      var gp = gridCell(box, 'alpha', 'ind.growthPotential');
      a.equal(gp.textContent.trim(), '3', 'the number is in the cell');
      a.ok(gp.classList.contains('tap-rg__cell--r3'), 'a 3 takes the darkest shade');
      var avg = gridCell(box, 'alpha', 'ind.attractiveness');
      a.equal(avg.textContent.trim(), '2.7', 'Region A attractiveness 2.67 shows as 2.7');
      a.ok(avg.classList.contains('tap-rg__cell--avg'), 'an average is marked as one');
      a.ok(!/tap-rg__cell--r\d/.test(avg.className), 'and is not shaded like a rating');
      var blank = gridCell(box, 'charlie', 'ind.references');
      a.ok(blank.classList.contains('tap-rg__cell--np'), 'Region C left references blank: outlined');
      a.match(blank.textContent, /not provided/, 'and says not provided');
      a.ok(gridCell(box, 'charlie', 'ind.ability').classList.contains('tap-rg__cell--np'),
        'its ability to win is not provided, as on the attractiveness chart');
      a.equal(tableRow(res, 'charlie').cells['ind.ability'].state, 'notProvided', 'in the table too');
    });

    T.test('X-d101-ratings-grid', 'The key explains the scale and competitive intensity; About names the attractiveness chart; a click names the cell', function (a) {
      var res = ratingsRes('grid', { mode: 'all' }, 'ind1'), key = parse(res.html).querySelector('.tap-rg__key').textContent;
      a.ok(key.indexOf('1 = low · 3 = high, higher is more favourable') >= 0, 'the scale');
      a.ok(key.indexOf('3 = the region leads its competitors') >= 0, 'competitive intensity');
      var ex = TAP.reports.get('ind-ratings').explain;
      a.match(ex.shows + ' ' + ex.read, /place on the attractiveness chart/, 'About: the averages are each region’s place on the attractiveness chart');
      var t = res.target({ data: { regionId: 'alpha', industryId: 'ind1' } });
      a.deepEqual([t.reportId, t.regionIds, t.industryIds], ['ind-ratings', ['alpha'], ['ind1']], 'a region cell: that region’s details');
      var rest = ratingsRes('grid', { mode: 'one', focus: 'alpha' }, 'ind1').target({ data: { regionId: 'rest', industryId: 'ind1' } });
      a.deepEqual(rest.regionIds, ['bravo', 'charlie', 'delta'], 'a combined cell: the regions it combines');
      a.equal(res.target({ data: null }), null, 'nothing clicked: no target');
    });

    T.test('X-d101-ratings-grid', 'At half width (1280 px) and 853 px at 150%, numbers stay 16 px and headings 13 px, with no sideways scroll', function (a) {
      sample();
      [600, 540, 1100].forEach(function (w) {
        var host = T.dom.mount();
        host.style.width = w + 'px';
        var p = TAP.panel.create(host, 'ind-ratings', { industryId: window.SAMPLE_EXPECT.p16.industry });
        try {
          var grid = p.el.querySelector('.tap-rg'), px = function (n) { return parseFloat(getComputedStyle(n).fontSize); };
          a.ok(grid, w + ' px: the grid is drawn');
          Array.prototype.forEach.call(grid.querySelectorAll('[data-key]'), function (n) { if (px(n) < 16) a.ok(false, w + ' px: a cell at ' + px(n) + ' px'); });
          Array.prototype.forEach.call(grid.querySelectorAll('.tap-rg__col, .tap-rg__group, .tap-rg__name'), function (n) {
            if (px(n) < 13) a.ok(false, w + ' px: a heading at ' + px(n) + ' px');
          });
          var box = p.el.querySelector('.tap-panel__html');
          a.ok(box.scrollWidth <= box.clientWidth + 1, w + ' px: no sideways scroll (' + box.scrollWidth + ' in ' + box.clientWidth + ')');
          var full = grid.querySelector('.tap-rg__col .tap-rg__full');
          a.equal(getComputedStyle(full).display !== 'none', w > 1000, w + ' px: ' + (w > 1000 ? 'full headings' : 'short headings, explained in the key'));
        } finally { p.destroy(); }
      });
    });
  });

  /* ---------- D102: the rating insights also show on the ratings chart ---------- */

  T.suite('ratings-insights', function () {
    var RULES = ['strongRating', 'weakRating', 'groupPriority', 'notYetWinnable'];
    function onRatings() { return TAP.insights.ranked(cmp({ mode: 'all' }), { reportId: 'ind-ratings' }); }
    // Hides every other insight on the ratings chart for the test, so the one wanted is the panel's only one.
    function only(id) { onRatings().forEach(function (x) { if (x.id !== id) TAP.insights.hide(x.id); }); }
    function showMe(p) {
      p.el.querySelector('[data-action="insights"]').click();
      var list = Array.prototype.slice.call(p.el.querySelectorAll('.tap-panel__insight'));
      var btn = list.length === 1 ? list[0].querySelector('[data-action="select-insight"]') : null;
      if (btn) btn.click();
      return !!btn;
    }
    function outlined(p) {
      return Array.prototype.map.call(p.el.querySelectorAll('.tap-rg__cell.is-hl'), function (c) {
        return c.getAttribute('data-tap-region') + '|' + c.getAttribute('data-key');
      }).sort();
    }
    function withPanel(industryId, fn) {
      var p = TAP.panel.create(T.dom.mount(), 'ind-ratings', { industryId: industryId });
      try { fn(p); } finally { p.destroy(); (TAP.insights.hidden() || []).slice().forEach(function (id) { TAP.insights.unhide(id); }); }
    }
    function countOf(p) { return Number((p.el.querySelector('[data-action="insights"]').textContent.match(/\d+/) || ['0'])[0]); }

    T.test('X-d102-ratings-insights', 'The ratings chart lists only the insights about the industry it shows; with none it shows 0 and no takeaway', function (a) {
      sample();
      var root = T.dom.mount(), view = TAP.views.get('industry').mount(root);
      function panel(id) { return { el: root.querySelector('.tap-panel[data-report="' + id + '"]') }; }
      try {
        // Healthcare has no strong or weak rating, no group priority rated low and is not in the not-yet-winnable area
        // on the sample (the dump of every sample insight); Pharma and Biotech has only the planted strong rating (P04)
        TAP.store.set({ industry: 'healthcare' });
        var r = panel('ind-ratings');
        a.equal(countOf(r), 0, 'Healthcare: 0 insights on the ratings chart');
        a.ok(r.el.querySelector('[data-action="insights"]').disabled, 'the usual no-insight state');
        a.equal(r.el.querySelector('.tap-panel__takeaway').textContent.trim(), '', 'no takeaway borrowed from another industry');
        a.equal(countOf(panel('ind-quad')), TAP.insights.ranked(cmp({ mode: 'all' }), { reportId: 'ind-quad' }).length, 'the quadrant keeps all its insights');
        TAP.store.set({ industry: window.SAMPLE_EXPECT.p04.industry });
        r = panel('ind-ratings');
        a.equal(countOf(r), 1, 'Pharma and Biotech: one insight');
        a.match(r.el.querySelector('.tap-panel__takeaway').textContent, /Pharma and Biotech/, 'the takeaway is about it');
        r.el.querySelector('[data-action="insights"]').click();
        var texts = Array.prototype.map.call(r.el.querySelectorAll('.tap-panel__insight-text'), function (n) { return n.textContent; });
        a.equal(texts.length, 1, 'the list holds it alone');
        a.match(texts[0], /Northern Europe rates its references in Pharma and Biotech as strong/, 'the planted strong rating');
      } finally { view.destroy(); }
    });

    T.test('X-d102-ratings-insights', 'On the sample the ratings chart has insights, from the four rating rules only', function (a) {
      sample();
      var list = onRatings();
      a.ok(list.length > 0, 'the ratings chart’s insight count is above zero (' + list.length + ')');
      a.deepEqual(list.filter(function (x) { return RULES.indexOf(x.ruleId) < 0; }).map(function (x) { return x.id; }), [], 'only the four rules attach');
      RULES.forEach(function (r) { a.ok(list.some(function (x) { return x.ruleId === r; }), r + ' attaches'); });
      list.forEach(function (x) { a.ok(x.reportId === 'ind-quad' || x.reportId === 'ind-tiers', x.id + ': "Show me" elsewhere still opens its first chart'); });
      var X = window.SAMPLE_EXPECT.p04, mine = list.filter(function (x) { return x.industryIds.indexOf(X.industry) >= 0; });
      withPanel(X.industry, function (p) {
        a.equal(countOf(p), mine.length, 'the panel counts the insights about the industry it shows (' + mine.length + ')');
      });
    });

    T.test('X-d102-ratings-insights', '"Show me" on a strong-rating insight outlines the rating behind it', function (a) {
      sample();
      var X = window.SAMPLE_EXPECT.p04, ins = onRatings().filter(function (x) { return x.ruleId === 'strongRating' && x.regionIds[0] === X.region; })[0];
      a.ok(ins, 'the planted strong rating (P04) is on the ratings chart');
      only(ins.id);
      withPanel(X.industry, function (p) {
        a.ok(showMe(p), 'its "Show me" is in the panel’s list');
        a.deepEqual(outlined(p), [X.region + '|ind.references'], 'the region’s references cell, and only that, is outlined');
      });
    });

    T.test('X-d102-ratings-insights', '"Show me" on a group priority outlines the ability to win average of the regions it names', function (a) {
      sample();
      var X = window.SAMPLE_EXPECT.p03, ins = onRatings().filter(function (x) { return x.ruleId === 'groupPriority' && x.industryIds[0] === X.industry; })[0];
      a.ok(ins, 'the planted group priority (P03) is on the ratings chart');
      only(ins.id);
      withPanel(X.industry, function (p) {
        a.ok(showMe(p), 'its "Show me" is in the panel’s list');
        a.deepEqual(outlined(p), X.lowAbility.map(function (r) { return r + '|ind.ability'; }).sort(), 'the four regions’ ability to win averages');
      });
    });

    T.test('X-d102-ratings-insights', 'The Insights page lists each insight once, though four rules now attach to one more chart', function (a) {
      sample();
      var root = T.dom.mount(), view = TAP.views.get('insights').mount(root);
      try {
        var ids = Array.prototype.map.call(root.querySelectorAll('[data-insight]'), function (n) { return n.getAttribute('data-insight'); });
        a.ok(ids.length > 0, 'the page lists insights');
        a.deepEqual(ids.filter(function (id, i) { return ids.indexOf(id) !== i; }), [], 'no insight twice');
        onRatings().forEach(function (x) { a.equal(ids.filter(function (id) { return id === x.id; }).length, 1, x.id + ' once'); });
      } finally { view.destroy(); }
    });

    T.test('X-d102-ratings-insights', 'A presentation step can outline rating cells: mark ratingCell with the measures named', function (a) {
      var hl = { reportId: 'ind-ratings', regionIds: ['bravo'], industryIds: ['ind1'], mark: 'ratingCell', measureIds: ['ind.expertise', 'ind.ability'] };
      var box = parse(ratingsRes('grid', { mode: 'all' }, 'ind1', { highlight: hl }).html);
      var on = Array.prototype.map.call(box.querySelectorAll('.is-hl'), function (c) { return c.getAttribute('data-tap-region') + '|' + c.getAttribute('data-key'); });
      a.deepEqual(on.sort(), ['bravo|ind.ability', 'bravo|ind.expertise'], 'the named cells of the named region');
      var other = parse(ratingsRes('grid', { mode: 'all' }, 'ind2', { highlight: hl }).html);
      a.equal(other.querySelectorAll('.is-hl').length, 0, 'nothing outlined while the chart shows another industry');
    });
  });
})(window.TAP);
