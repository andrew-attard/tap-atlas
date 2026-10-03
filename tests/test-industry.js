/*
 * File: tests/test-industry.js
 * Purpose: Tests for the tier grid, the quadrant chart, ratings, commentary and details.
 * Provides: test cases TPV-TC-105, TPV-TC-107, TPV-TC-062 (tier grid), X-industry-*
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

    T.test('X-industry-grid-explain', 'The explanation says which tier is darkest', function (a) {
      a.match(TAP.reports.get('ind-tiers').explain.read, /Tier 1 darkest/);
      a.deepEqual(TAP.reports.validate(TAP.reports.get('ind-tiers')), []);
    });
  });
})(window.TAP);
