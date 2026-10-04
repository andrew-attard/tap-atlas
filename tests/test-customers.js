/*
 * File: tests/test-customers.js
 * Purpose: Tests for the Customer growth view: the view itself (US-2.2.1) and its reports.
 * Provides: test cases TPV-TC-369 to TPV-TC-377 and X-cg-*; window.CGP_T (shared helpers for tests/test-partners.js)
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

  window.CGP_T = { MODES: MODES, cmp: cmp, ctxFor: ctxFor, build: build, sample: sample, waiting: waiting, when: when,
    cellsHaveSources: cellsHaveSources, viewChecks: viewChecks };

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

    T.test('X-cg-layout-rows', 'Reports pair two by two; a list or a report left over takes a full row', function (a) {
      a.deepEqual(TAP.cgpLayout.rows(window.TAP_VIEWS.customers.reports), [['cg-segments', 'cg-growth'], ['cg-exposure', 'cg-bubble'], ['cg-accounts']]);
      a.deepEqual(TAP.cgpLayout.rows(window.TAP_VIEWS.partners.reports), [['pt-reliance', 'pt-capacity'], ['pt-list']]);
      a.deepEqual(TAP.cgpLayout.rows(['cg-segments', 'cg-exposure', 'cg-bubble']), [['cg-segments', 'cg-exposure'], ['cg-bubble']], 'an odd one out takes a full row');
    });
  });
})(window.TAP);
