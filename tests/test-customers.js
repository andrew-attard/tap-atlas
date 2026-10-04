/*
 * File: tests/test-customers.js
 * Purpose: Tests for the Customer growth view: the view itself (US-2.2.1) and its reports.
 * Provides: test cases TPV-TC-369 to TPV-TC-410 (automated ones) and X-cg-*; window.CGP_T (shared helpers for tests/test-partners.js)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: CGP stream
 *
 * Tests that need a piece another stream is still building (ENGINE2 measures and rows, the list builder) are
 * registered as skipped, naming what they wait for, and run as soon as that piece's stub is gone.
 */
(function (TAP) {
  'use strict';

  // Switched on when ENGINE2's breakdowns (#229) and reference lines land; they have no stub to wait on.
  var ENGINE2_BREAKDOWNS = false, ENGINE2_REFLINES = false;

  var MODES = [
    { mode: 'all' },
    { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' },
    { mode: 'pair', focus: 'alpha', second: 'bravo' },
    { mode: 'set', set: ['alpha', 'charlie', 'delta'] },
    { mode: 'org' }
  ];

  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c || {}); }
  function ctxFor(id, c, extra) {
    var k = cmp(c), def = TAP.reports.get(id);
    return Object.assign({ def: def, type: def.defaultType, measureId: null, sizeId: null, breakdown: null, cmp: k,
      entities: TAP.scope.entities(k), year: null, industryId: null, highlight: null, expanded: false,
      theme: window.TAP_THEME, opts: {} }, extra || {});
  }
  function builderOf(def) { return TAP.builders.get(def.builder || (def.shape === 'xyz' ? 'xy' : def.shape)); }
  function build(id, c, extra) { var ctx = ctxFor(id, c, extra); return builderOf(ctx.def)(ctx); }
  function sample() { TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA))); TAP.insights.reset(); }

  // Stubs still left among the given issues; empty when every piece a test needs is built.
  function waiting(issues) {
    return TAP.stub.list().filter(function (s) { return issues.indexOf(s.issue) >= 0; }).map(function (s) { return s.what + ' (#' + s.issue + ')'; });
  }
  // A test that runs once the pieces (and report definitions) it needs are built, and shows as skipped (pending) until then.
  // reports: definitions the test needs; a report not defined yet keeps it pending too.
  function when(issues, id, title, fn, reports) {
    var left = waiting(issues).concat((reports || []).filter(function (r) { return !TAP.reports.get(r); }).map(function (r) { return 'report ' + r; }));
    if (left.length) T.skip(id, title, 'pending: waits for ' + left.join(', '));
    else T.test(id, title, fn);
  }
  // Every table cell that holds a figure (not the entity or industry name) carries a source.
  function cellsHaveSources(a, res, label) {
    var n = 0;
    ((res.table || {}).rows || []).forEach(function (r) {
      Object.keys(r.cells).forEach(function (k) {
        var c = r.cells[k];
        if (k === 'entity' || k === 'industry' || !c || c.kind == null) return;
        a.ok(c.src, label + ': ' + (r.entityId || r.id) + ' ' + k + ' has a source');
        n++;
      });
    });
    a.ok(n > 0, label + ': checked ' + n + ' cells');
  }
  function guideLists(viewId, name) {
    var g = (window.TAP_CONTENT || {}).guide || {}, hit = false;
    ((g.planning || {}).sections || []).forEach(function (s) { if (s.link && s.link.view === viewId) hit = true; });
    return hit || JSON.stringify(g.howTo || {}).indexOf(name) >= 0;
  }
  function rule(id) { return ((window.TAP_RULES || {}).rules || []).filter(function (r) { return r.id === id; })[0]; }

  // The view's checks, shared with the Partners view (US-2.2.1 and US-2.3.1 have the same shape)
  function viewChecks(o) {
    T.test(o.ids.menu, 'Menu: "' + o.menu + '" comes straight after ' + o.after + ', titled "' + o.title + '"', function (a) {
      var order = window.TAP_VIEWS.order;
      a.equal(order.indexOf(o.view), order.indexOf(o.afterId) + 1, 'menu order');
      a.equal(TAP.views.title(o.view), o.menu, 'menu title');
      a.ok(TAP.views.get(o.view) && !TAP.views.get(o.view).__stub, 'the view is built');
      var root = T.dom.mount(), v = TAP.views.get(o.view).mount(root);
      try { a.equal(root.querySelector('h1').textContent, o.title, 'the question is the title'); } finally { v.destroy(); }
    });

    T.test(o.ids.headline, 'Headline: the most significant insight attached to the view, or no line', function (a) {
      sample();
      var c = TAP.store.get().cmp, best = null;
      window.TAP_VIEWS[o.view].reports.forEach(function (id) {
        (TAP.insights.ranked(c, { reportId: id }) || []).forEach(function (x) { if (!best || x.significance > best.significance) best = x; });
      });
      var root = T.dom.mount(), v = TAP.views.get(o.view).mount(root);
      try {
        var line = root.querySelector('.tap-vh__headline');
        a.ok(line, 'the header has a headline slot');
        if (best) a.equal(line.querySelector('.tap-vh__headline-text').textContent, best.sentence, 'the top insight');
        else a.ok(line.hidden, 'no insight attached: no headline line');
      } finally { v.destroy(); }
      var keep = TAP.insights.ranked;
      TAP.insights.ranked = function () { return []; };
      root = T.dom.mount();
      v = TAP.views.get(o.view).mount(root);
      try { a.ok(root.querySelector('.tap-vh__headline').hidden, 'with none attached, the line is hidden'); }
      finally { v.destroy(); TAP.insights.ranked = keep; }
    });

    T.test(o.ids.layout, 'The view holds the epic’s reports, at most two panels per row', function (a) {
      a.deepEqual(window.TAP_VIEWS[o.view].reports, o.reports, 'report list');
      var root = T.dom.mount(), v = TAP.views.get(o.view).mount(root);
      try {
        var slots = Array.prototype.slice.call(root.querySelectorAll('.tap-vh-slot'));
        var defined = o.reports.filter(function (id) { return !!TAP.reports.get(id); });
        a.deepEqual(slots.map(function (s) { return s.getAttribute('data-slot'); }), defined, 'one slot per defined report, in order');
        Array.prototype.forEach.call(root.querySelectorAll('.tap-vh-pair'), function (p) {
          a.ok(p.querySelectorAll(':scope > .tap-vh-slot').length <= 2, 'at most two side by side');
        });
      } finally { v.destroy(); }
      a.equal(root.querySelector('.tap-panel'), null, 'destroy removes the panels');
    });

    when(o.needs, o.ids.modes, 'Every report validates, and in all five modes builds with a table whose cells carry sources', function (a) {
      o.reports.forEach(function (id) {
        var def = TAP.reports.get(id);
        a.ok(def, id + ' is defined');
        a.deepEqual(TAP.reports.validate(def), [], id + ' is valid');
        MODES.forEach(function (m) {
          var res = build(id, m), label = id + ' ' + m.mode;
          a.equal(res.error, null, label + ': builds');
          a.ok(def.shape === 'list' ? !!res.table : TAP.shapes.types(def, 4).indexOf('table') >= 0, label + ': offers the table');
          cellsHaveSources(a, res, label);
        });
      });
    }, o.reports);

    when(o.needs, o.ids.empty, 'A region with an empty section shows "not provided", never zero', function (a) {
      var name = TAP.content.regionName(TAP.data.region(o.emptyRegion));
      o.reports.forEach(function (id) {
        var res = build(id, { mode: 'all' });
        a.ok((res.missing || []).indexOf(name) >= 0, id + ': ' + name + ' is named as not provided');
        ((res.table || {}).rows || []).forEach(function (r) {
          var mine = r.entityId === o.emptyRegion || (r.cells.region && r.cells.region.src && r.cells.region.src.regionId === o.emptyRegion);
          if (!mine) return;
          Object.keys(r.cells).forEach(function (k) {
            var c = r.cells[k];
            if (k === 'entity' || c.kind == null) return;
            a.ok(c.state === 'notProvided', id + ': ' + k + ' is not provided');
            a.ok(c.v !== 0, id + ': ' + k + ' is never zero');
          });
        });
      });
    }, o.reports);

    T.test(o.ids.explain, 'Every report has its three explanation parts', function (a) {
      o.reports.forEach(function (id) {
        var def = TAP.reports.get(id);
        if (!def) { a.ok(true, id + ' not defined yet; checked once it lands'); return; }
        ['shows', 'read', 'lookFor'].forEach(function (k) {
          a.ok(def.explain && typeof def.explain[k] === 'string' && def.explain[k].trim().length > 20, id + ' explain.' + k);
        });
      });
    });
    if (guideLists(o.view, o.menu)) {
      T.test(o.ids.guide, 'The Guide lists the view', function (a) { a.ok(guideLists(o.view, o.menu)); });
    } else T.skip(o.ids.guide, 'The Guide lists the view', 'pending: waits for the Guide content (PAGES2, wave B)');
  }

  // Every drawn bubble: {name, regionId, row, x, y, size, labelled}.
  function bubbles(res) {
    var out = [];
    ((res.option || {}).series || []).forEach(function (s) {
      if (s.tapRole !== 'value') return;
      (s.data || []).forEach(function (d) {
        out.push({ name: d.name, regionId: d.regionId, row: d.row, rowId: d.rowId, x: d.raw[0], y: d.raw[1], size: d.raw[2],
          labelled: !!(d.label && d.label.show), color: d.itemStyle.color, series: s });
      });
    });
    return out;
  }

  window.CGP_T = { MODES: MODES, cmp: cmp, ctxFor: ctxFor, build: build, sample: sample, waiting: waiting, when: when,
    cellsHaveSources: cellsHaveSources, viewChecks: viewChecks, bubbles: bubbles };

  T.suite('customers', function () {
    /* ---------- US-2.2.1 the view ---------- */

    viewChecks({ view: 'customers', menu: 'Customer growth', title: 'How will existing customers grow?',
      after: 'New business', afterId: 'newBusiness', emptyRegion: 'charlie', needs: [194, 196, 204, 205, 206, 207, 208],
      reports: ['cg-segments', 'cg-growth', 'cg-exposure', 'cg-bubble', 'cg-accounts'],
      ids: { menu: 'TPV-TC-369', headline: 'TPV-TC-371', layout: 'TPV-TC-372', modes: 'TPV-TC-373', empty: 'TPV-TC-375', explain: 'TPV-TC-376', guide: 'X-cg-guide' } });

    var phase1 = { concentration: 'cg-exposure', atRisk: 'cg-exposure', segmentMix: 'cg-segments' };
    var attached = Object.keys(phase1).every(function (id) { var r = rule(id); return r && (r.attach || []).length; });
    if (attached) {
      T.test('TPV-TC-377', 'The concentration, at-risk and segment balance insights attach to this view’s reports', function (a) {
        Object.keys(phase1).forEach(function (id) {
          var r = rule(id);
          a.equal(r.attach[0], phase1[id], id + ' shows its report first');
          a.ok(window.TAP_VIEWS.customers.reports.indexOf(r.attach[0]) >= 0, id + ' names a report on the view');
          a.ok(r.highlight, id + ' has something to highlight');
        });
      });
    } else T.skip('TPV-TC-377', 'The concentration, at-risk and segment balance insights attach to this view’s reports',
      'pending: waits for the attach change in config/insight-rules.js (requested from the lead)');

    /* ---------- US-2.2.2 segments ---------- */

    // Worked out by hand from tests/fixtures/mini-data.js, segments in order Strategic, Growth, Core, Scaled.
    // alpha: a1 strategic 500 / 60, a4 growth 150 / 180, a2 core 200 / 110, a3 scaled 30 / 0 (current ARR / order intake)
    // bravo: b1 strategic 600 / 132, b2 core 100 / 30. delta: d1 strategic 800 / 210, d2 core 400 / 150, d3 scaled 50 / 0.
    // charlie: empty customer growth section, so not provided.
    var SEGS = ['strategic', 'growth', 'core', 'scaled'];
    var SEG_MINI = {
      alpha: { accounts: [1, 1, 1, 1], arr: [500, 150, 200, 30], oi: [60, 180, 110, 0] },
      bravo: { accounts: [1, 0, 1, 0], arr: [600, 0, 100, 0], oi: [132, 0, 30, 0] },
      delta: { accounts: [1, 0, 1, 1], arr: [800, 0, 400, 50], oi: [210, 0, 150, 0] }
    };
    var SEG_TOTAL = { 'cg.accounts': 'accounts', 'cg.currentArr': 'arr', 'cg.oi3': 'oi' };
    function segRow(res, entityId) { return res.table.rows.filter(function (r) { return r.entityId === entityId; })[0]; }
    function seriesSegments(res) {
      return ((res.option || {}).series || []).filter(function (s) { return s.tapRole === 'value'; }).map(function (s) {
        var d = (s.data || []).filter(function (x) { return x && x.key; })[0];
        return d ? TAP.cgBuilders.segmentOf(d.key) : null;
      });
    }

    when([196], 'TPV-TC-380', 'Measure switch: Accounts (default), Current ARR, Three-year order intake; values match the hand calculation', function (a) {
      var def = TAP.reports.get('cg-segments');
      a.deepEqual(def.measures.map(function (m) { return m.label; }), ['Accounts', 'Current ARR', 'Three-year order intake']);
      a.equal(TAP.prepare.selected(def, {}), 'cg.accounts', 'Accounts is the default');
      Object.keys(SEG_TOTAL).forEach(function (m) {
        var v = SEG_TOTAL[m], res = build('cg-segments', { mode: 'all' }, { measureId: m, type: 'table' });
        Object.keys(SEG_MINI).forEach(function (r) {
          var row = segRow(res, r), sum = 0;
          SEGS.forEach(function (s, i) {
            var c = row.cells['cg.seg.' + s + '.' + v];
            a.equal(c.state, 'value', r + ' ' + s + ' ' + v + ' has a value');
            a.near(c.v, SEG_MINI[r][v][i], 1e-9, r + ' ' + s + ' ' + v);
            sum += SEG_MINI[r][v][i];
          });
          a.near(row.cells[m].v, sum, 1e-9, r + ' ' + m + ' total');
        });
        a.equal(segRow(res, 'charlie').cells[m].state, 'notProvided', 'charlie ' + m + ' is not provided');
      });
    });

    T.test('TPV-TC-381', 'Chart types: 100% stacked bar by default, also stacked bar and table', function (a) {
      var def = TAP.reports.get('cg-segments');
      a.equal(def.defaultType, 'stacked100');
      [1, 4, 7].forEach(function (n) { a.deepEqual(TAP.shapes.types(def, n), ['stacked100', 'stackedBar', 'table'], n + ' regions'); });
    });

    when([196, 204], 'TPV-TC-382', 'Segments are always Strategic, Growth, Core, Scaled in series, legend and table', function (a) {
      // The legend names the segments as the lookups do, whatever the measure
      var labels = SEGS.map(function (id) { return TAP.data.lookups().segments.filter(function (x) { return x.id === id; })[0].name; });
      Object.keys(SEG_TOTAL).forEach(function (m) {
        MODES.forEach(function (mode) {
          ['stacked100', 'stackedBar', 'table'].forEach(function (type) {
            var res = build('cg-segments', mode, { measureId: m, type: type }), label = m + ' ' + mode.mode + ' ' + type;
            a.equal(res.error, null, label + ' builds');
            if (type !== 'table') a.deepEqual(seriesSegments(res), SEGS, label + ': series');
            a.deepEqual(res.legend.map(function (l) { return l.label; }), labels, label + ': legend');
            var cols = res.table.columns.map(function (c) { return TAP.cgBuilders.segmentOf(c.key); }).filter(Boolean);
            a.deepEqual(cols, SEGS, label + ': table columns');
          });
        });
      });
    });

    when([196, 204], 'X-cg-segments-ink', 'Segments are drawn in ink steps, darkest Strategic, each named in the legend', function (a) {
      var th = window.TAP_THEME, res = build('cg-segments', { mode: 'all' });
      ((res.option || {}).series || []).filter(function (s) { return s.tapRole === 'value'; }).forEach(function (s) {
        (s.data || []).forEach(function (d) {
          if (!d || !d.key) return;
          a.equal(d.itemStyle.color, th.shade(th.ink, SEGS.indexOf(TAP.cgBuilders.segmentOf(d.key))), d.entityId + ' ' + d.key);
        });
      });
      a.deepEqual(res.legend.map(function (l) { return l.color; }), SEGS.map(function (s, i) { return th.shade(th.ink, i); }), 'legend swatches');
      a.ok(res.legend.every(function (l) { return l.role === 'part' && l.label; }), 'every segment named; no region colour key');
    });

    when([196, 229], 'TPV-TC-384', 'Broken down by risk: high, medium and not flagged add up to each segment', function (a) {
      // alpha by risk (hand): high a2 core 200 / 110; medium a4 growth 150 / 180; not flagged a1 strategic 500 / 60, a3 scaled 30 / 0
      var want = { high: { core: [1, 200, 110] }, medium: { growth: [1, 150, 180] }, none: { strategic: [1, 500, 60], scaled: [1, 30, 0] } };
      ['accounts', 'arr', 'oi'].forEach(function (v, vi) {
        SEGS.forEach(function (s) {
          var id = 'cg.seg.' + s + '.' + v, fn = TAP.measures.get(id), sum = 0;
          a.ok(TAP.measures.meta(id).dims.indexOf('risk') >= 0, id + ' breaks down by risk');
          ['high', 'medium', 'none'].forEach(function (risk) {
            var c = fn('alpha', { risk: risk }), hand = (want[risk][s] || [0, 0, 0])[vi];
            a.near(c.v, hand, 1e-9, 'alpha ' + id + ' ' + risk);
            sum += c.v;
          });
          a.near(sum, fn('alpha', {}).v, 1e-9, 'alpha ' + id + ': the parts add up');
        });
      });
    });

    // The prepared columns per risk level come with ENGINE2's breakdowns (US-2.7.5), which have no stub to wait on
    var riskColumns = function (a) {
      var ds = TAP.prepare.run(TAP.reports.get('cg-segments'), ctxFor('cg-segments', { mode: 'all' }, { breakdown: 'risk' }));
      var vals = ds.columns.filter(function (c) { return c.breakdown && c.breakdown.dim === 'risk'; }).map(function (c) { return c.breakdown.value; });
      ['high', 'medium', 'none'].forEach(function (r) { a.ok(vals.indexOf(r) >= 0, 'a column for ' + r); });
    };
    if (ENGINE2_BREAKDOWNS) T.test('X-cg-segments-risk', 'The prepared report has a column per risk level', riskColumns);
    else T.skip('X-cg-segments-risk', 'The prepared report has a column per risk level', 'pending: waits for ENGINE2 breakdowns (#229)');

    when([196], 'TPV-TC-385', 'The segment stored in the data file is used, even where the thresholds would say otherwise', function (a) {
      var plan = window.T_FIXTURE('mini');
      plan.regions[0].customerGrowth.accounts[0].segment = 'scaled';   // a1: current ARR 500, above the strategic threshold 400
      TAP.data.load(plan);
      var res = build('cg-segments', { mode: 'one', focus: 'alpha', restAs: 'individual' }, { type: 'table' }), row = segRow(res, 'alpha');
      a.equal(row.cells['cg.seg.strategic.accounts'].v, 0, 'no strategic account left');
      a.equal(row.cells['cg.seg.scaled.accounts'].v, 2, 'a1 counts as scaled, as stored');
    });

    T.test('TPV-TC-386', 'Details list each region’s segment thresholds as held in the data file; "not provided" for the empty section', function (a) {
      sample();
      var ids = TAP.data.regions().map(function (r) { return r.id; });
      var d = TAP.details.build({ reportId: 'cg-segments', regionIds: ids, items: ids.map(function (r) { return { section: 'customerGrowth', regionId: r, row: null }; }) });
      a.equal(d.groups.length, ids.length, 'one group per region');
      ids.forEach(function (r, i) {
        var th = (TAP.data.region(r).customerGrowth || {}).thresholds || {}, g = d.groups[i];
        a.match(g.title, new RegExp(TAP.content.regionName(TAP.data.region(r)).replace(/[.*+?^${}()|[\]\\&]/g, '\\$&')), r + ' named');
        ['strategicArr', 'scaledArr', 'growthArr', 'growthOrderIntake'].forEach(function (k, j) {
          var c = g.rows[j].cell, held = th[k];
          a.equal(c.state, held == null ? 'notProvided' : 'value', r + ' ' + k + ' state');
          if (held != null) a.equal(c.v, held, r + ' ' + k);
          a.equal(c.src.field, 'thresholds.' + k, r + ' ' + k + ' source field');
          a.ok(TAP.sources.address(c.src).cell, r + ' ' + k + ' has a cell address');
        });
      });
      var empty = window.SAMPLE_EXPECT.gaps.emptySection[0];
      a.ok(d.groups[ids.indexOf(empty)].rows.every(function (x) { return x.cell.state === 'notProvided'; }), empty + ': every threshold not provided');
    });

    when([196, 204], 'X-cg-segments-target', 'A bar click lists the thresholds of every region behind the bar', function (a) {
      var res = build('cg-segments', { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' });
      var tg = res.target({ data: { entityId: 'rest', key: 'cg.seg.core.accounts' } });
      a.deepEqual(tg.items.map(function (i) { return [i.section, i.regionId, i.row]; }),
        [['customerGrowth', 'bravo', null], ['customerGrowth', 'charlie', null], ['customerGrowth', 'delta', null]]);
      a.equal(TAP.details.build(tg).groups.length, 3, 'details show the three regions');
    });

    /* ---------- US-2.2.3 growth assumptions ---------- */

    // Growth % = incremental ARR / current ARR over the accounts (D60), by hand from the mini data:
    // alpha: current ARR 500 + 200 + 30 + 150 = 880; increments y1 50 + 100 + 0 + 50 = 200, y2 50 (a4 only), y3 50 (a4)
    // bravo: 600 + 100 = 700; y1 120 + 30 = 150, y2 0, y3 0. delta: 800 + 400 + 50 = 1250; y1 80 + 100 = 180, y2 88, y3 0
    var GROWTH = {
      alpha: [200 / 880, 50 / 880, 50 / 880, 300 / 880],
      bravo: [150 / 700, 0, 0, 150 / 700],
      delta: [180 / 1250, 88 / 1250, 0, 268 / 1250]
    };
    // One segment only (hand): alpha strategic a1 50 / 500 in y1; alpha growth a4 50 / 150 each year;
    // delta strategic d1 80 / 800, 88 / 800, 0; delta core d2 100 / 400 in y1; bravo core b2 30 / 100 in y1
    var GROWTH_SEG = {
      strategic: { alpha: [0.1, 0, 0], delta: [0.1, 0.11, 0], bravo: [0.2, 0, 0] },
      growth: { alpha: [1 / 3, 1 / 3, 1 / 3] },
      core: { alpha: [0.5, 0, 0], bravo: [0.3, 0, 0], delta: [0.25, 0, 0] },
      scaled: { alpha: [0, 0, 0], delta: [0, 0, 0] }
    };
    // Rows of a table or of a prepared dataset; the year columns are read from the dataset, as the chart is drawn from it
    function growthRow(res, id) { return ((res.table || res).rows).filter(function (r) { return (r.entityId || r.id) === id; })[0]; }
    function growthAt(m, c) {
      var ctx = ctxFor('cg-growth', c, { measureId: m, breakdown: 'year' });
      return TAP.prepare.run(ctx.def, ctx);
    }

    when([196], 'TPV-TC-387', 'Growth % per region for years 1 to 3 equals the hand calculation, weighted by current ARR', function (a) {
      var res = growthAt('cg.growth.all', { mode: 'all' }), plain = build('cg-growth', { mode: 'all' }, { breakdown: null, type: 'table' });
      Object.keys(GROWTH).forEach(function (r) {
        [1, 2, 3].forEach(function (y) { a.near(growthRow(res, r).cells['cg.growth.all@y' + y].v, GROWTH[r][y - 1], 1e-9, r + ' year ' + y); });
        a.near(growthRow(plain, r).cells['cg.growth.all'].v, GROWTH[r][3], 1e-9, r + ' three years');
      });
      a.equal(growthRow(res, 'charlie').cells['cg.growth.all@y1'].state, 'notProvided', 'charlie is not provided');
    });

    T.test('TPV-TC-389', 'Chart types: grouped bar by year by default, also dot plot and table', function (a) {
      var def = TAP.reports.get('cg-growth');
      a.equal(def.defaultType, 'groupedBar', 'grouped bar first');
      a.equal(def.defaultBreakdown, 'year', 'by year');
      a.deepEqual(TAP.shapes.types(def, 4, { breakdown: 'year' }), ['groupedBar', 'dot', 'table']);
      a.deepEqual(TAP.shapes.types(def, 4), ['dot', 'table'], 'without the year breakdown, dot plot and table');
    });

    when([196], 'TPV-TC-390', 'Segment switch: All accounts and each segment’s accounts; one segment uses only its accounts', function (a) {
      var def = TAP.reports.get('cg-growth');
      a.deepEqual(def.measures.map(function (m) { return m.label; }), ['All accounts', 'Strategic accounts', 'Growth accounts', 'Core accounts', 'Scaled accounts']);
      a.equal(TAP.prepare.selected(def, {}), 'cg.growth.all', 'All accounts is the default');
      Object.keys(GROWTH_SEG).forEach(function (s) {
        var res = growthAt('cg.growth.' + s, { mode: 'all' });
        Object.keys(GROWTH_SEG[s]).forEach(function (r) {
          [1, 2, 3].forEach(function (y) {
            a.near(growthRow(res, r).cells['cg.growth.' + s + '@y' + y].v, GROWTH_SEG[s][r][y - 1], 1e-9, s + ' ' + r + ' year ' + y);
          });
        });
      });
    });

    when([196, 205], 'TPV-TC-391', 'Multiplier accounts count through their workbook increments, and a note names how many and where', function (a) {
      // a4 (alpha) is the only multiplier account: alpha's year 2 growth is a4's 50 over alpha's 880, not left out
      var res = growthAt('cg.growth.all', { mode: 'all' });
      a.near(growthRow(res, 'alpha').cells['cg.growth.all@y2'].v, 50 / 880, 1e-9, 'a4 counts in year 2');
      a.equal(TAP.measures.get('cg.multiplierAccounts')('alpha', {}).v, 1, 'one multiplier account in Region A');
      var notes = build('cg-growth', { mode: 'all' }).notes;
      a.ok(notes.indexOf('1 account in Region A uses a three-year multiplier; it counts through the incremental ARR the workbook calculated.') >= 0, 'the note: ' + notes.join(' | '));
      a.ok(!notes.some(function (n) { return /Region [BCD]/.test(n) && /multiplier/.test(n); }), 'no note for regions without one');
      var strategic = build('cg-growth', { mode: 'all' }, { measureId: 'cg.growth.strategic' }).notes;
      a.ok(!strategic.some(function (n) { return /multiplier/.test(n); }), 'a4 is a Growth account, so no note on Strategic');
      var plan = window.T_FIXTURE('mini');
      plan.regions[3].customerGrowth.accounts[0].multiplier3y = 1.5;   // d1 and d2 now both use one
      plan.regions[3].customerGrowth.accounts[1].multiplier3y = 1.2;
      TAP.data.load(plan);
      a.ok(build('cg-growth', { mode: 'set', set: ['delta'] }).notes.indexOf('2 accounts in Region D use a three-year multiplier; they count through the incremental ARR the workbook calculated.') >= 0, 'plural');
      // Several regions share one note, so the chart doesn't grow a line per region
      var both = build('cg-growth', { mode: 'all' }).notes.filter(function (n) { return /multiplier/.test(n); });
      a.deepEqual(both, ['Accounts planned with a three-year multiplier count through the incremental ARR the workbook calculated: 1 in Region A and 2 in Region D.'], 'one note for several regions');
    });

    when([196], 'TPV-TC-392', 'One vs the rest and organization total: weighted by current ARR', function (a) {
      // rest of alpha (charlie has no accounts): y1 (150 + 180) / (700 + 1250); org: y1 (200 + 150 + 180) / 2830, 3 years 718 / 2830
      var rest = growthAt('cg.growth.all', { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' });
      a.near(growthRow(rest, 'rest').cells['cg.growth.all@y1'].v, 330 / 1950, 1e-9, 'rest year 1');
      a.near(growthRow(rest, 'rest').cells['cg.growth.all@y2'].v, 88 / 1950, 1e-9, 'rest year 2');
      var org = growthAt('cg.growth.all', { mode: 'org' });
      a.near(growthRow(org, 'org').cells['cg.growth.all@y1'].v, 530 / 2830, 1e-9, 'org year 1');
      a.near(build('cg-growth', { mode: 'org' }, { breakdown: null, type: 'table' }).table.rows[0].cells['cg.growth.all'].v, 718 / 2830, 1e-9, 'org three years');
    });

    /* ---------- US-2.2.5 concentration and exposure ---------- */

    // Three-year incremental ARR per account, by hand from the mini data:
    // alpha a1 50, a2 100 (high), a3 0, a4 150 (medium) = 300; bravo b1 120, b2 30 (high) = 150;
    // delta d1 80 + 88 = 168, d2 100 (medium), d3 0 = 268.
    var EXPOSE = {
      'cg.top3Share': { alpha: 300 / 300, bravo: 150 / 150, delta: 268 / 268 },
      'cg.riskShare': { alpha: 250 / 300, bravo: 30 / 150, delta: 100 / 268 }
    };
    function exposeRow(res, id) { return res.table.rows.filter(function (r) { return r.entityId === id; })[0]; }
    function withRule(id, share, fn) {
      var r = ((window.TAP_RULES || {}).rules || []).filter(function (x) { return x.id === id; })[0], keep = r.params.share;
      r.params.share = share;
      try { fn(); } finally { r.params.share = keep; }
    }
    // Numbers held by any markLine in the chart option (where the reference lines are drawn).
    function markLineValues(option) {
      var out = [];
      ((option || {}).series || []).forEach(function (s) {
        ((s.markLine || {}).data || []).forEach(function (d) {
          [d, d && d[0]].forEach(function (x) { if (x) ['xAxis', 'yAxis', 'value'].forEach(function (k) { if (typeof x[k] === 'number') out.push(x[k]); }); });
        });
      });
      return out;
    }

    when([196], 'TPV-TC-400', 'Measure switch: top 3 share and at-risk share of three-year incremental ARR, per the hand calculation', function (a) {
      var def = TAP.reports.get('cg-exposure');
      a.deepEqual(def.measures.map(function (m) { return m.label; }), ['Share in top 3 accounts', 'Share in high or medium risk accounts']);
      a.equal(TAP.prepare.selected(def, {}), 'cg.top3Share', 'top 3 first');
      Object.keys(EXPOSE).forEach(function (m) {
        var res = build('cg-exposure', { mode: 'all' }, { measureId: m, type: 'table' });
        Object.keys(EXPOSE[m]).forEach(function (r) { a.near(exposeRow(res, r).cells[m].v, EXPOSE[m][r], 1e-9, r + ' ' + m); });
        a.equal(exposeRow(res, 'charlie').cells[m].state, 'notProvided', 'charlie ' + m);
      });
    });

    when([196], 'TPV-TC-401', 'Sample data: the planted concentration and at-risk regions show their planted shares', function (a) {
      sample();
      var E = window.SAMPLE_EXPECT;
      a.near(TAP.measures.get('cg.top3Share')(E.p13.region, {}).v, E.p13.share, 1e-4, 'P13 top 3 share');
      a.near(TAP.measures.get('cg.riskShare')(E.p14.region, {}).v, E.p14.share, 1e-4, 'P14 at-risk share');
    });

    T.test('TPV-TC-402', 'Chart types: bar by default, also dot plot and table', function (a) {
      var def = TAP.reports.get('cg-exposure');
      a.equal(def.defaultType, 'bar');
      [3, 4, 7].forEach(function (n) { a.deepEqual(TAP.shapes.types(def, n), ['bar', 'dot', 'table'], n + ' regions'); });
    });

    when([207], 'TPV-TC-403', 'Each measure has a labelled reference line at its rule threshold, which moves with the threshold', function (a) {
      var def = TAP.reports.get('cg-exposure');
      a.deepEqual(TAP.cgBuilders.refLines(def, { measureId: 'cg.top3Share' }).map(function (l) { return [l.value, l.label]; }), [[0.5, 'Insight threshold: 50%']], 'top 3 at 50%');
      a.deepEqual(TAP.cgBuilders.refLines(def, { measureId: 'cg.riskShare' }).map(function (l) { return [l.value, l.label]; }), [[0.25, 'Insight threshold: 25%']], 'at risk at 25%');
      withRule('concentration', 0.4, function () {
        a.deepEqual(TAP.cgBuilders.refLines(def, { measureId: 'cg.top3Share' }).map(function (l) { return l.value; }), [0.4], 'moves with the setting');
      });
    });

    var drawnLines = function (a) {
      a.ok(markLineValues(build('cg-exposure', { mode: 'all' }).option).indexOf(0.5) >= 0, 'the chart draws the 50% line');
      withRule('atRisk', 0.3, function () {
        a.ok(markLineValues(build('cg-exposure', { mode: 'all' }, { measureId: 'cg.riskShare' }).option).indexOf(0.3) >= 0, 'and redraws it at 30%');
      });
    };
    if (ENGINE2_REFLINES) when([196], 'X-cg-exposure-lines', 'The chart draws the reference line, and redraws it when the threshold changes', drawnLines);
    else T.skip('X-cg-exposure-lines', 'The chart draws the reference line, and redraws it when the threshold changes', 'pending: waits for ENGINE2 options.refLines');

    when([196], 'TPV-TC-404', 'The rest and organization total come from the combined accounts, not averaged shares', function (a) {
      // org: all nine accounts, total 718; top 3 = d1 168 + a4 150 + b1 120 = 438; at risk = a2 100 + a4 150 + b2 30 + d2 100 = 380
      // rest of alpha: bravo and delta accounts, total 418; top 3 = 168 + 120 + 100 = 388; at risk = 30 + 100 = 130
      var org = build('cg-exposure', { mode: 'org' }, { type: 'table' }), rest = build('cg-exposure',
        { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' }, { type: 'table' });
      a.near(exposeRow(org, 'org').cells['cg.top3Share'].v, 438 / 718, 1e-9, 'org top 3 is the top 3 across the scope');
      a.near(exposeRow(rest, 'rest').cells['cg.top3Share'].v, 388 / 418, 1e-9, 'rest top 3, not the average of 100% and 100%');
      var orgRisk = build('cg-exposure', { mode: 'org' }, { measureId: 'cg.riskShare', type: 'table' });
      var restRisk = build('cg-exposure', { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' }, { measureId: 'cg.riskShare', type: 'table' });
      a.near(exposeRow(orgRisk, 'org').cells['cg.riskShare'].v, 380 / 718, 1e-9, 'org at risk');
      a.near(exposeRow(restRisk, 'rest').cells['cg.riskShare'].v, 130 / 418, 1e-9, 'rest at risk');
    });

    when([196, 207], 'TPV-TC-405', 'A region’s bar opens its top 3 accounts, or its at-risk accounts, in details', function (a) {
      var rows = function (tg) { return tg.items.map(function (i) { return [i.section, i.regionId, i.row]; }); };
      var top = build('cg-exposure', { mode: 'all' }).target({ data: { entityId: 'alpha', key: 'cg.top3Share' } });
      a.deepEqual(rows(top), [['customerGrowth', 'alpha', 13], ['customerGrowth', 'alpha', 11], ['customerGrowth', 'alpha', 10]], 'a4, a2, a1');
      var risk = build('cg-exposure', { mode: 'all' }, { measureId: 'cg.riskShare' }).target({ data: { entityId: 'alpha', key: 'cg.riskShare' } });
      a.deepEqual(rows(risk), [['customerGrowth', 'alpha', 13], ['customerGrowth', 'alpha', 11]], 'a4 (medium) and a2 (high)');
      var org = build('cg-exposure', { mode: 'org' }).target({ data: { entityId: 'org', key: 'cg.top3Share' } });
      a.deepEqual(rows(org), [['customerGrowth', 'delta', 10], ['customerGrowth', 'alpha', 13], ['customerGrowth', 'bravo', 10]], 'top 3 across the scope');
      if (!waiting([194]).length) {
        var d = TAP.details.build(top);
        a.equal(d.groups.filter(function (g) { return /^Fictional Account A[124], Region A$/.test(g.title); }).length, 3, 'details name the three accounts');
      }
    });

    T.test('X-cg-exposure-items', 'A bar lists exactly the accounts its share counted', function (a) {
      // a1's increments made blank: it has no incremental ARR, so it counts in neither share and is never listed
      var plan = window.T_FIXTURE('mini');
      plan.regions[0].customerGrowth.accounts[0].incrementalArr = [null, null, null];
      a.ok(TAP.data.load(plan).ok, 'the changed fixture loads');
      var rows = function (m) { return TAP.cgBuilders.accountItems(['alpha'], m).map(function (i) { return i.row; }); };
      a.deepEqual(rows('cg.top3Share'), [13, 11, 12], 'a4 150, a2 100, a3 0; a1 has no figure');
      a.deepEqual(rows('cg.riskShare'), [13, 11], 'high and medium only');
      var rules = window.TAP_RULES.rules, conc = rules.filter(function (r) { return r.id === 'concentration'; })[0];
      var risk = rules.filter(function (r) { return r.id === 'atRisk'; })[0], keep = [conc.params.top, risk.params.levels];
      conc.params.top = 2;
      risk.params.levels = ['high'];
      try {
        a.equal(rows('cg.top3Share').length, 3, 'always the top 3, as the share');
        a.deepEqual(rows('cg.riskShare'), [13, 11], 'always high and medium, as the share');
      } finally { conc.params.top = keep[0]; risk.params.levels = keep[1]; }
    });

    /* ---------- US-2.2.4 the accounts bubble (rowBubble) ---------- */

    // Per account, from the mini data: [current ARR, three-year incremental ARR, cumulative order intake]
    var ACCOUNTS = {
      'alpha:10': [500, 50, 60], 'alpha:11': [200, 100, 110], 'alpha:12': [30, 0, 0], 'alpha:13': [150, 150, 180],
      'bravo:10': [600, 120, 132], 'bravo:11': [100, 30, 30],
      'delta:10': [800, 168, 210], 'delta:11': [400, 100, 150], 'delta:12': [50, 0, 0]
    };
    function withLabelMax(n, fn) {
      var s = window.TAP_SETTINGS.rowBubble, keep = s.labelMax;
      s.labelMax = n;
      try { return fn(); } finally { s.labelMax = keep; }
    }

    T.test('TPV-TC-393', 'One bubble per account: current ARR across, incremental ARR up, order intake as size', function (a) {
      var res = build('cg-bubble', { mode: 'all' }), seen = bubbles(res);
      a.equal(res.error, null, 'draws');
      a.deepEqual(seen.map(function (b) { return b.rowId; }).sort(), Object.keys(ACCOUNTS).sort(), 'every account once');
      seen.forEach(function (b) { a.deepEqual([b.x, b.y, b.size], ACCOUNTS[b.rowId], b.rowId); });
      a.deepEqual(res.missing, ['Region C'], 'the region with no accounts is named, not drawn at zero');
      a.ok(res.sizeLegend && /order intake/i.test(res.sizeLegend.label), 'the size key names the order intake');
    });

    T.test('TPV-TC-395', 'The largest accounts by incremental ARR carry their data name, up to the limit in settings', function (a) {
      a.equal(window.TAP_SETTINGS.rowBubble.labelMax, 10, 'default limit');
      var all = bubbles(build('cg-bubble', { mode: 'all' }));
      a.equal(all.filter(function (b) { return b.labelled; }).length, 9, 'nine accounts, all within the limit of 10');
      withLabelMax(3, function () {
        var three = bubbles(build('cg-bubble', { mode: 'all' })).filter(function (b) { return b.labelled; });
        // the three largest increments: d1 168, a4 150, b1 120
        a.deepEqual(three.map(function (b) { return b.rowId; }).sort(), ['alpha:13', 'bravo:10', 'delta:10'], 'exactly the top 3');
        three.forEach(function (b) {
          var held = TAP.data.region(b.regionId).customerGrowth.accounts.filter(function (x) { return x.sourceRow === b.row; })[0].name;
          a.equal(b.name, held, b.rowId + ' shows the name the data holds');
          var d = b.series.data.filter(function (x) { return x.rowId === b.rowId; })[0];
          a.equal(d.label.formatter(), held, b.rowId + ' label text');
        });
      });
    });

    T.test('TPV-TC-396', 'One account’s details: region, segment, risk, growth per year and source row', function (a) {
      var d = TAP.details.build({ reportId: 'cg-bubble', regionIds: ['alpha'], items: [{ section: 'customerGrowth', regionId: 'alpha', row: 11 }] });
      a.equal(d.title, 'Fictional Account A2, Region A', 'title names the account and its region');
      var rows = [];
      d.groups.forEach(function (g) { rows = rows.concat(g.rows); });
      var find = function (re) { return rows.filter(function (r) { return re.test(r.label); })[0]; };
      a.equal(find(/^segment$/i).cell.v, 'core', 'segment');
      a.match(String(find(/risk/i).cell.v), /^high$/i, 'risk');
      a.equal(find(/^Growth %, 2027$/).cell.v, 0.5, 'growth year 1');
      a.equal(find(/^Growth %, 2029$/).cell.v, 0, 'growth year 3');
      a.match(find(/^Source row$/).text, /Region A plan\.xlsx › 3\. Customer Growth › row 11$/, 'source row');
      rows.filter(function (r) { return r.cell && r.cell.kind; }).forEach(function (r) { a.ok(r.cell.src, r.label + ' has a source'); });
      var multi = TAP.details.build({ items: [{ section: 'customerGrowth', regionId: 'alpha', row: 13 }] }), mrows = [];
      multi.groups.forEach(function (g) { mrows = mrows.concat(g.rows); });
      a.ok(!mrows.some(function (r) { return /^Growth %/.test(r.label); }), 'a multiplier account has no growth % by year');
      a.equal(mrows.filter(function (r) { return /multiplier/i.test(r.label); })[0].cell.v, 2, 'it shows its multiplier');
    });

    T.test('TPV-TC-398', 'Table view: its rows match the bubbles', function (a) {
      a.deepEqual(TAP.shapes.types(TAP.reports.get('cg-bubble'), 7), ['bubble', 'table'], 'bubble and table');
      MODES.forEach(function (m) {
        var res = build('cg-bubble', m), seen = bubbles(res);
        a.equal(res.table.rows.length, seen.length, m.mode + ': one table row per bubble');
        seen.forEach(function (b) {
          var r = res.table.rows.filter(function (x) { return x.rowId === b.rowId; })[0];
          a.deepEqual([r.cells.currentArr.v, r.cells.incr3.v, r.cells.oi3.v], [b.x, b.y, b.size], m.mode + ' ' + b.rowId);
        });
      });
    });

    T.test('X-cg-bubble-scope', 'Rows follow the comparison: focus first in its colour, the rest in grey underneath', function (a) {
      var th = window.TAP_THEME;
      var pair = bubbles(build('cg-bubble', { mode: 'pair', focus: 'delta', second: 'alpha' }));
      a.deepEqual(pair.map(function (b) { return b.regionId; }).filter(function (r, i, l) { return l.indexOf(r) === i; }), ['delta', 'alpha'], 'focus first, then the second');
      var one = bubbles(build('cg-bubble', { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' }));
      one.forEach(function (b) {
        a.equal(b.color, b.regionId === 'alpha' ? TAP.scope.colorOf('alpha') : th.combined, b.rowId + ' colour');
      });
      var top = one.filter(function (b) { return b.regionId === 'alpha'; })[0].series.z, under = one.filter(function (b) { return b.regionId !== 'alpha'; })[0].series.z;
      a.ok(top > under, 'the focus region is drawn on top');
      var org = build('cg-bubble', { mode: 'org' });
      a.deepEqual(org.legend.map(function (l) { return l.label; }), ['Region A', 'Region B', 'Region D'], 'organization total: each account keeps its region colour, named in the key');
      var set = bubbles(build('cg-bubble', { mode: 'set', set: ['bravo'] }));
      a.ok(set.length === 2 && set.every(function (b) { return b.regionId === 'bravo'; }), 'a chosen set shows only its regions');
    });

    T.test('X-cg-bubble-target', 'A bubble click opens that account’s details', function (a) {
      var res = build('cg-bubble', { mode: 'all' }), b = bubbles(res).filter(function (x) { return x.rowId === 'delta:11'; })[0];
      var d = b.series.data.filter(function (x) { return x.rowId === 'delta:11'; })[0];
      a.deepEqual(res.target({ data: d }), { reportId: 'cg-bubble', regionIds: ['delta'], industryIds: [], accountIds: [], mark: 'points',
        items: [{ section: 'customerGrowth', regionId: 'delta', row: 11 }] });
    });

    T.test('X-cg-bubble-left', 'An account with no current ARR is left off and named in a note; names are escaped', function (a) {
      var plan = window.T_FIXTURE('mini');
      plan.regions[1].customerGrowth.accounts[1].currentArr = null;
      plan.regions[1].customerGrowth.accounts[0].name = '<b>Fictional & Co</b>';
      TAP.data.load(plan);
      var res = build('cg-bubble', { mode: 'all' });
      a.ok(!bubbles(res).some(function (b) { return b.rowId === 'bravo:11'; }), 'not drawn');
      a.ok(res.notes.some(function (n) { return /^Fictional Account B2 \(Region B\) is not on the chart/.test(n); }), 'named in a note: ' + res.notes.join(' | '));
      var b1 = bubbles(res).filter(function (b) { return b.rowId === 'bravo:10'; })[0], d = b1.series.data.filter(function (x) { return x.rowId === 'bravo:10'; })[0];
      var html = b1.series.tooltip.formatter({ data: d });
      a.ok(html.indexOf('<b>Fictional') < 0 && html.indexOf('&lt;b&gt;Fictional &amp; Co') >= 0, 'tooltip escapes the name');
    });

    T.test('X-cg-layout-rows', 'Reports pair two by two; a list or a report left over takes a full row', function (a) {
      a.deepEqual(TAP.cgpLayout.rows(window.TAP_VIEWS.customers.reports), [['cg-segments', 'cg-growth'], ['cg-exposure', 'cg-bubble'], ['cg-accounts']]);
      a.deepEqual(TAP.cgpLayout.rows(window.TAP_VIEWS.partners.reports), [['pt-reliance', 'pt-capacity'], ['pt-list']]);
      a.deepEqual(TAP.cgpLayout.rows(['cg-segments', 'cg-exposure', 'cg-bubble']), [['cg-segments', 'cg-exposure'], ['cg-bubble']], 'an odd one out takes a full row');
    });
  });
})(window.TAP);
