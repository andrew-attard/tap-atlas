/*
 * File: tests/test-industry.js
 * Purpose: Tests for the tier grid, the quadrant chart, ratings, commentary and details.
 * Provides: test cases TPV-TC-105, TPV-TC-107, TPV-TC-062 (tier grid and quadrant), TPV-TC-252 to 254, X-industry-*, X-details-* (US-1.5.7 commentary checks are X-industry-comments-*)
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

    T.test('X-industry-quad-labels', 'Labels move apart with leader lines; hiding is the last resort and nothing is lost', function (a) {
      [{}, { everyRegion: true }].forEach(function (o) {
        valueSeries(quad('bubble', { mode: 'all' }, { opts: o })).forEach(function (s) {
          a.equal(s.labelLayout.hideOverlap, true, 'a label that still overlaps hides');
          a.ok(s.labelLine && s.labelLine.show, 'short leader lines');
        });
      });
      sample();
      var res = quad('bubble', { mode: 'all' }), shown = points(res).filter(function (d) { return d.label.show; });
      a.ok(shown.length >= 14, 'most of the 18 averaged bubbles keep a label (' + shown.length + ')');
      a.ok(shown.some(function (d) { return d.label.dy !== 0; }), 'crowded labels step up or down');
      // On the narrowest plot (480 x 440 px for 1 to 3), no two label boxes overlap.
      var fs = TH.type.chart;
      function box(d) {
        var x = (d.value[0] - 1) * 240, y = (3 - d.value[1]) * 220 + d.label.dy, w = d.label.formatter.length * fs * 0.5, r = d.symbolSize / 2;
        return { x: d.label.side === 'right' ? x + r + 6 : x - r - 6 - w, y: y - fs / 2, w: w, h: fs };
      }
      shown.forEach(function (d, i) {
        shown.slice(i + 1).forEach(function (e) {
          var p = box(d), q = box(e), hit = p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
          a.ok(!hit, d.label.formatter + ' and ' + e.label.formatter + ' do not overlap');
        });
      });
      a.equal(res.table.rows.length, points(res).length, 'every point, labelled or not, is in the table');
      a.ok(points(res).every(function (d) { return res.target({ data: d }); }), 'and opens its details on click');
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
})(window.TAP);
