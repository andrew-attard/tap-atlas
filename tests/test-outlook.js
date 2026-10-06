/*
 * File: tests/test-outlook.js
 * Purpose: Tests for the Outlook view (US-4.2.1) and its reports, checked against the hand calculations in
 *          tests/fixtures/mini-p4-expected.js (never against the reports' own output).
 * Provides: test cases TPV-TC-679 to TPV-TC-713 and TPV-TC-720 to TPV-TC-723 (automated ones), X-p4-outlook-*;
 *           window.OUTLOOK_T (helpers shared by the test cases of each report)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, tests/fixtures/mini-p4.js and mini-p4-expected.js
 * Used by: tests.html
 * Owner: OUTLOOK stream
 */
(function (TAP) {
  'use strict';

  var VIEW = 'outlook', TITLE = 'How do the plans compare with the strategy and this year?';
  var REPORTS = ['ol-strategic', 'ol-baseyear', 'ol-coverage', 'ol-revenue', 'ol-revshare', 'ol-category'];

  function load(name) {
    var r = TAP.data.load(window.T_FIXTURE(name || 'miniP4'));
    if (TAP.insights && TAP.insights.reset) TAP.insights.reset();
    return r;
  }
  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c || {}); }
  function ctxFor(id, c, extra) {
    var k = cmp(c), def = TAP.reports.get(id);
    return Object.assign({ def: def, type: def.defaultType, measureId: null, sizeId: null, breakdown: def.defaultBreakdown || null, cmp: k,
      entities: TAP.scope.entities(k), year: null, industryId: null, highlight: null, expanded: false,
      theme: window.TAP_THEME, opts: {} }, extra || {});
  }
  function build(id, c, extra) {
    var ctx = ctxFor(id, c, extra);
    return TAP.builders.get(ctx.def.builder || ctx.def.shape)(ctx);
  }
  // Mounts the view, runs fn(root) and always unmounts.
  function withView(fn) {
    var root = T.dom.mount(), v = TAP.views.get(VIEW).mount(root);
    try { fn(root); } finally { v.destroy(); }
    return root;
  }
  function txt(n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function qsa(sel, root) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  // A test that waits for its report definition: skipped (pending) until the report is built.
  function when(reports, id, title, fn) {
    var left = reports.filter(function (r) { return !TAP.reports.get(r); });
    if (left.length) T.skip(id, title, 'pending: waits for report ' + left.join(', '));
    else T.test(id, title, fn);
  }
  window.OUTLOOK_T = { load: load, cmp: cmp, ctxFor: ctxFor, build: build, withView: withView, txt: txt, qsa: qsa, when: when };

  T.suite('outlook', function () {

    /* ---------- US-4.2.1 the view ---------- */

    T.test('TPV-TC-679', 'Menu: "Outlook" comes straight after Partners, titled "' + TITLE + '"', function (a) {
      var order = window.TAP_VIEWS.order;
      a.equal(order.indexOf(VIEW), order.indexOf('partners') + 1, 'menu order in the view configuration');
      a.equal(TAP.views.title(VIEW), 'Outlook', 'menu title');
      a.ok(TAP.views.get(VIEW) && !TAP.views.get(VIEW).__stub, 'the view is built');
      a.equal(TAP.views.order()[TAP.views.order().indexOf('partners') + 1], VIEW, 'shown in the menu straight after Partners');
      load();
      withView(function (root) { a.equal(txt(root.querySelector('h1')), TITLE, 'the question is the title'); });
    });

    T.test('TPV-TC-680', 'The view has a lead line, and its headline is the top attached insight unless the first panel leads with it (D83)', function (a) {
      load();
      var c = TAP.store.get().cmp, best = TAP.viewHead.headline(VIEW, c);
      withView(function (root) {
        a.ok(txt(root.querySelector('.tap-vh__lead')).length > 20, 'a lead line under the title');
        a.equal(txt(root.querySelector('.tap-vh__kicker')), 'Outlook', 'the kicker names the view');
        var line = root.querySelector('.tap-vh__headline');
        a.ok(line, 'the header has a headline slot');
        var first = TAP.reports.get(REPORTS[0]) ? TAP.panelInsights.get(c, REPORTS[0]).top : null;
        if (best && first && first.sentence === best.sentence) a.ok(line.hidden, 'the first panel leads with the same sentence: no headline line');
        else if (best) a.equal(txt(line.querySelector('.tap-vh__headline-text')), best.sentence, 'the top insight');
        else a.ok(line.hidden, 'no insight attached: no headline line');
      });
      // With an insight attached to a later panel, the headline shows it; when the first panel leads with it, it is left out
      var keepRanked = TAP.insights.ranked, keepTop = TAP.insights.top, on = 'ol-revenue';
      var fake = { id: 'x:1', ruleId: 'x', family: 'outlook', sentence: 'A planted sentence for the headline.', figures: [], description: '',
        regionIds: [], industryIds: [], accountIds: [], significance: 0.9, sources: [], attach: [], highlight: {}, fallback: 'details' };
      TAP.insights.ranked = function (cm, o) { return o && o.reportId === on ? [fake] : []; };
      TAP.insights.top = function (cm, id) { return id === on ? [fake] : []; };
      try {
        withView(function (root) {
          a.equal(txt(root.querySelector('.tap-vh__headline-text')), fake.sentence, 'an insight on a later panel is the headline');
        });
        on = REPORTS[0];
        withView(function (root) { a.ok(root.querySelector('.tap-vh__headline').hidden, 'repeating the first panel’s takeaway: left out (D83)'); });
      } finally { TAP.insights.ranked = keepRanked; TAP.insights.top = keepTop; }
    });

    // The tip text is PAGES4's line in content/text-pages.js; the view shows whatever the content holds.
    (function () {
      var title = 'The view shows its tip line under the title';
      var key = 'viewTips.' + VIEW, text = TAP.content.text(key);
      if (!text || text === '[' + key + ']') { T.skip('TPV-TC-680', title, 'pending: waits for the tip line viewTips.outlook (PAGES4)'); return; }
      T.test('TPV-TC-680', title, function (a) {
        load();
        withView(function (root) {
          var tip = root.querySelector('.tap-vh__tip[data-view="' + VIEW + '"]');
          a.ok(tip && !tip.hidden, 'the tip line shows');
          a.equal(txt(tip.querySelector('.tap-vh__tiptext')), text, 'with the content text');
        });
      });
    })();

    T.test('TPV-TC-682', 'The view lists the reports of Epics 4.2 and 4.3 and the product category report, at most two panels per row', function (a) {
      a.deepEqual(window.TAP_VIEWS[VIEW].reports, REPORTS, 'report list');
      load();
      var defined = REPORTS.filter(function (id) { return !!TAP.reports.get(id); });
      var root = withView(function (r) {
        var slots = qsa('.tap-vh-slot', r);
        a.deepEqual(slots.map(function (s) { return s.getAttribute('data-slot'); }), defined, 'one slot per report that is built, in order');
        qsa('.tap-vh-pair', r).forEach(function (p) { a.ok(p.querySelectorAll(':scope > .tap-vh-slot').length <= 2, 'at most two side by side'); });
        if (defined[0] === REPORTS[0]) a.ok(slots[0].parentNode.classList.contains('tap-ol__wide'), 'the strategic plan report comes first, at full width');
        a.equal(r.querySelector('.tap-ol__none'), null, 'the fixture has the data: no "nothing to show" line');
      });
      a.equal(root.querySelector('.tap-panel'), null, 'leaving the view removes the panels');
      a.deepEqual(TAP.outlookView.layout().filter(function (row) { return row.length > 2; }), [], 'no row of the layout holds more than two');
    });

    T.test('TPV-TC-684', 'Without a strategic plan, base year or revenue for any region: one line, no empty panels, still in the menu', function (a) {
      load('mini');   // the mini fixture has no Phase 4 part at all
      withView(function (root) {
        var line = qsa('.tap-ol__none', root);
        a.equal(line.length, 1, 'one line');
        a.ok(/no strategic plan, base year/.test(txt(line[0])), 'it says what the data lacks: ' + txt(line[0]));
        a.equal(root.querySelector('.tap-panel'), null, 'no panels');
        a.equal(root.querySelector('.tap-vh-slot'), null, 'no empty slots');
        a.equal(txt(root.querySelector('h1')), TITLE, 'the title still shows');
      });
      a.ok(TAP.views.order().indexOf(VIEW) >= 0, 'Outlook stays in the menu order');
      var root = T.dom.mount();
      TAP.app.start({ root: root, plan: window.T_FIXTURE('mini') });
      try {
        var item = root.querySelector('.tap-menu__item[data-view="' + VIEW + '"]');
        a.ok(item, 'a menu button without any Phase 4 data');
        item.click();
        a.equal(TAP.store.get().view, VIEW, 'it opens the view');
        a.equal(qsa('.tap-ol__none', root).length, 1, 'which shows the one line');
      } finally { TAP.app.stop(); }
    });

    T.test('X-p4-outlook-part-missing', 'A report whose part of the template no region gives takes no slot and is named in one line', function (a) {
      var p = window.T_FIXTURE('miniP4');
      p.regions.forEach(function (r) { delete r.revenue; });
      TAP.data.load(p);
      withView(function (root) {
        var shown = qsa('.tap-vh-slot', root).map(function (s) { return s.getAttribute('data-slot'); });
        a.ok(shown.indexOf('ol-revenue') < 0 && shown.indexOf('ol-revshare') < 0, 'no slot for the revenue reports');
        a.equal(root.querySelector('.tap-ol__none'), null, 'the rest of the view still shows');
        var built = ['ol-revenue', 'ol-revshare'].filter(function (id) { return !!TAP.reports.get(id); });
        var some = root.querySelector('.tap-ol__some');
        if (built.length) a.ok(some && /revenue/.test(txt(some)), 'one line names what is not in the data: ' + txt(some));
        else a.equal(some, null, 'nothing to name while those reports are not built');
      });
    });

    T.test('TPV-TC-686', 'Number keys, the Guide’s key list, the tour and the profile follow the menu order with Outlook after Partners', function (a) {
      var order = TAP.views.order(), i = order.indexOf(VIEW);
      a.equal(order[i - 1], 'partners', 'Outlook follows Partners');
      order.slice(0, 9).forEach(function (id, n) { a.equal(TAP.keys.viewFor(String(n + 1)), id, 'key ' + (n + 1) + ' opens ' + id); });
      a.equal(TAP.keys.viewFor(String(i + 1)), VIEW, 'the key after Partners’ opens Outlook');
      var root = T.dom.mount(), g = TAP.views.get('guide').mount(root);
      try {
        var keys = qsa('.tap-guide__key', root).map(function (li) { return li.getAttribute('data-view'); });
        a.deepEqual(keys, order.slice(0, 9), 'the Guide lists the keys in menu order');
        a.equal(keys[keys.indexOf('partners') + 1], VIEW, 'with Outlook after Partners');
      } finally { if (g && g.destroy) g.destroy(); }
      // Tour steps that point at a view's menu button come in menu order
      var named = [];
      TAP.tour.steps().forEach(function (s) { var m = /^\.tap-menu__item\[data-view="([A-Za-z]+)"\]/.exec(s.sel); if (m) named.push(m[1]); });
      a.ok(named.length > 0, 'the tour points at menu buttons: ' + named.join(', '));
      named.forEach(function (id, n) {
        if (n) a.ok(window.TAP_VIEWS.order.indexOf(id) >= window.TAP_VIEWS.order.indexOf(named[n - 1]), 'tour: ' + id + ' is not before ' + named[n - 1]);
      });
      // Profile sections: Outlook reports never come before a Partners report
      var flat = [].concat.apply([], window.TAP_PROFILE.reports), lastPt = -1, firstOl = flat.length;
      flat.forEach(function (id, n) { if (/^pt-/.test(id)) lastPt = n; if (/^ol-/.test(id)) firstOl = Math.min(firstOl, n); });
      a.ok(firstOl > lastPt, 'profile: Outlook reports follow the Partners report');
    });

    /* ---------- US-4.2.2 the plan against the strategic plan ---------- */

    var SP = 'ol-strategic', X = window.TEST_EXPECT.miniP4, TOL = 1e-6;
    function row(res, id) { return res.table.rows.filter(function (r) { return r.id === id; })[0]; }
    function v(c) { return c && c.state === 'value' ? c.v : null; }
    // Checks a cell against a hand-worked value: a number, or null for "not provided"
    function cellIs(a, c, exp, what) {
      a.ok(c && c.src, what + ' is a cell with a source');
      if (exp === null) { a.equal(c.state, 'notProvided', what + ' is not provided'); a.equal(c.v, null, what + ' is never zero'); return; }
      a.equal(c.state, 'value', what + ' has a value');
      a.near(c.v, exp, TOL, what);
    }
    var SP_KEYS = ['sp.oi', 'sp.plan', 'sp.variance', 'sp.variancePct'];

    when([SP], 'TPV-TC-688', 'Strategic plan, plan and variance per entity, for the three years and per plan year, equal the hand-worked figures', function (a) {
      load();
      var res = build(SP, { mode: 'all' }, { type: 'table' });
      a.equal(res.error, null, 'builds');
      a.deepEqual(res.table.columns.map(function (c) { return c.key; }), ['entity'].concat(SP_KEYS), 'the table holds the four figures');
      ['alpha', 'bravo', 'delta'].forEach(function (r) {
        SP_KEYS.forEach(function (k) { cellIs(a, row(res, r).cells[k], X.region[r][k], r + ' ' + k); });
      });
      SP_KEYS.forEach(function (k) { cellIs(a, row(res, 'charlie').cells[k], null, 'charlie ' + k); });
      // Per plan year: Region A year 1 (900, 865, -35, -35 / 900); Region D year 3 (950, 840, -110, -110 / 950 = -0.1157895)
      var by = build(SP, { mode: 'all' }, { type: 'table', breakdown: 'year' });
      a.equal(by.error, null, 'builds by year');
      a.equal(by.table.rows.length, 12, 'one row per region and plan year');
      cellIs(a, row(by, 'alpha:1').cells['sp.oi'], X.region.alpha['sp.oi.y1'], 'A year 1 strategic plan');
      cellIs(a, row(by, 'alpha:1').cells['sp.plan'], X.region.alpha['sp.plan.y1'], 'A year 1 plan');
      cellIs(a, row(by, 'alpha:1').cells['sp.variance'], X.region.alpha['sp.variance.y1'], 'A year 1 variance');
      cellIs(a, row(by, 'alpha:1').cells['sp.variancePct'], X.region.alpha['sp.variancePct.y1'], 'A year 1 variance %');
      cellIs(a, row(by, 'delta:3').cells['sp.oi'], X.region.delta['sp.oi.y3'], 'D year 3 strategic plan');
      cellIs(a, row(by, 'delta:3').cells['sp.plan'], X.region.delta['sp.plan.y3'], 'D year 3 plan');
      cellIs(a, row(by, 'delta:3').cells['sp.variance'], X.region.delta['sp.variance.y3'], 'D year 3 variance');
      cellIs(a, row(by, 'delta:3').cells['sp.variancePct'], -110 / 950, 'D year 3 variance %');
      a.ok(/2027/.test(row(by, 'alpha:1').cells.entity.v), 'the row is named with its year: ' + row(by, 'alpha:1').cells.entity.v);
      // The chart: two bars per row, the variance written after them in money and in percent
      var chart = build(SP, { mode: 'all' });
      var bars = chart.option.series.filter(function (s) { return s.tapRole === 'value'; });
      a.deepEqual(bars.map(function (s) { return s.name; }), ['Strategic plan', 'Plan'], 'two bars per region');
      a.deepEqual(chart.option.yAxis.data.slice(0, 2), ['Region A', 'Region B'], 'one row per region');
      var end = chart.option.series.filter(function (s) { return s.tapRole === 'total'; })[0];
      a.equal(end.label.formatter({ dataIndex: 0 }), 'Variance -€125k (-5%)', 'Region A: the variance in money and %');
      a.equal(end.label.formatter({ dataIndex: 1 }), 'Variance +€110k (+3%)', 'Region B: above its strategic plan reads with a plus');
      a.equal(end.label.formatter({ dataIndex: 2 }), '', 'Region C: no variance line');
      a.ok(chart.option.series.some(function (s) { return s.tapRole === 'notProvided'; }), 'Region C has the not-provided mark');
      a.equal(bars[0].data[0].text, 'Strategic plan  €2.7M', 'each bar is named on the chart');
      a.equal(bars[1].label.formatter({ data: bars[1].data[0] }), 'Plan  €2.6M', 'the plan bar too');
      a.ok(chart.legend.some(function (l) { return l.role === 'part' && l.label === 'Plan'; }), 'the key names the bars');
      a.ok(chart.height >= 12 * 24, 'a height hint that gives each of the 12 bar lines its room: ' + chart.height);
    });

    when([SP], 'TPV-TC-690', 'The measure switch offers total, ARR, services, software perpetual and hardware where the data gives them', function (a) {
      load();
      var def = TAP.reports.get(SP);
      a.deepEqual(def.measures.map(function (m) { return m.label; }), ['Order intake', 'ARR', 'Services', 'Software perpetual', 'Hardware'], 'the five types');
      a.deepEqual(TAP.reports.validate(def), [], 'valid');
      function offered() {
        var root = T.dom.mount(), p = TAP.panel.create(root, SP, {});
        try { return qsa('[data-control="measure"] button', root).map(txt); } finally { p.destroy(); }
      }
      a.deepEqual(offered(), ['Order intake', 'ARR', 'Services', 'Software perpetual', 'Hardware'], 'all five with the fixture (A has software perpetual, D hardware)');
      // ARR: the recurring category of each figure. A: 2200, books 2140, -60, -60 / 2200
      var res = build(SP, { mode: 'all' }, { type: 'table', measureId: 'sp.arr' });
      cellIs(a, row(res, 'alpha').cells['sp.oi'], X.region.alpha['sp.arr'], 'A ARR strategic plan');
      cellIs(a, row(res, 'alpha').cells['sp.plan'], X.region.alpha['bk.arr'], 'A ARR plan');
      cellIs(a, row(res, 'alpha').cells['sp.variance'], -60, 'A ARR variance');
      cellIs(a, row(res, 'alpha').cells['sp.variancePct'], -60 / 2200, 'A ARR variance %');
      // Hardware: only D has one; A's hardware books value has no strategic plan figure, so A is not provided
      var hw = build(SP, { mode: 'all' }, { type: 'table', measureId: 'sp.hardware' });
      cellIs(a, row(hw, 'delta').cells['sp.oi'], X.region.delta['sp.hardware'], 'D hardware strategic plan');
      cellIs(a, row(hw, 'delta').cells['sp.plan'], X.region.delta['bk.hardware'], 'D hardware plan');
      a.equal(row(hw, 'alpha').cells['sp.oi'].state, 'notProvided', 'A: no hardware in its strategic plan');
      a.ok(hw.missing.indexOf('Region A') >= 0, 'and A is named as not provided');
      // A category no region's strategic plan gives is not offered
      var p = window.T_FIXTURE('miniP4');
      p.regions.forEach(function (r) { r.strategicPlan = (r.strategicPlan || []).filter(function (it) { return it.type !== 'hardware'; }); });
      TAP.data.load(p);
      a.deepEqual(offered(), ['Order intake', 'ARR', 'Services', 'Software perpetual'], 'hardware is not offered without a hardware figure');
    });

    when([SP], 'TPV-TC-691', 'Organization total: the sum of the plans against the sum of the strategic plans, with each region’s share of the gap', function (a) {
      load();
      var res = build(SP, { mode: 'org' }, { type: 'table' }), org = res.table.rows[0];
      SP_KEYS.forEach(function (k) { cellIs(a, org.cells[k], X.combined.orgTotal[k], 'organization ' + k); });
      a.equal(res.table.columns[res.table.columns.length - 1].label, 'Share of the gap', 'a share column');
      // Each region's variance over the combined variance of -530: A -125 (0.2358491), B +110 (-0.2075472), D -515 (0.9716981)
      var share = { alpha: -125 / -530, bravo: 110 / -530, delta: -515 / -530 };
      Object.keys(share).forEach(function (r) {
        var x = row(res, 'org/' + r);
        a.ok(x, r + ' has a row under the total');
        cellIs(a, x.cells.share, share[r], r + ' share of the gap');
        a.equal(x.cells.share.kind, 'APP', 'calculated by this app');
        cellIs(a, x.cells['sp.variance'], X.region[r]['sp.variance'], r + ' variance beside it');
      });
      a.near(Object.keys(share).reduce(function (t, r) { return t + v(row(res, 'org/' + r).cells.share); }, 0), 1, TOL, 'the shares add up to 1');
      a.equal(row(res, 'org/charlie').cells.share.state, 'notProvided', 'C has no strategic plan: no share');
      a.equal(org.cells.share.state, 'notApplicable', 'the total itself has no share');
      a.equal(build(SP, { mode: 'all' }, { type: 'table' }).table.columns.filter(function (c) { return c.key === 'share'; }).length, 0, 'no share column without a combined total');
      var chart = build(SP, { mode: 'org' });
      a.equal(chart.option.yAxis.data.length, 1, 'one row on the chart');
      a.near(chart.option.series[0].data[0].value, 9000, TOL, 'the summed strategic plans');
      a.near(chart.option.series[1].data[0].value, 8470, TOL, 'against the summed plans');
    });

    when([SP], 'TPV-TC-692', 'A region without a strategic plan is not provided, left out of combined variances and named in a note', function (a) {
      load();
      var res = build(SP, { mode: 'all' }, { type: 'table' });
      SP_KEYS.forEach(function (k) { cellIs(a, row(res, 'charlie').cells[k], null, 'charlie ' + k); });
      a.ok(res.missing.indexOf('Region C') >= 0, 'named among the regions with no data');
      var org = build(SP, { mode: 'org' }, { type: 'table' }), top = org.table.rows[0];
      cellIs(a, top.cells['sp.variance'], X.combined.orgTotal['sp.variance'], 'the combined variance leaves C out');
      cellIs(a, top.cells['sp.variancePct'], X.combined.orgTotal['sp.variancePct'], 'as a ratio of sums');
      a.ok(top.cells['sp.variance'].src.excluded.indexOf('charlie') >= 0, 'the source says C was left out');
      a.ok(org.notes.some(function (n) { return /Region C/.test(n) && /not provided/.test(n); }), 'a note names Region C: ' + org.notes.join(' | '));
      var rest = build(SP, { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' }, { type: 'table' });
      cellIs(a, row(rest, 'rest').cells['sp.variance'], X.combined.restOfAlphaAverage['sp.variance'], 'the rest as an average, without C');
      cellIs(a, row(rest, 'rest').cells['sp.variancePct'], X.combined.restOfAlphaAverage['sp.variancePct'], 'the rest’s variance % over the summed strategic plans');
      a.ok(rest.notes.some(function (n) { return /Region C/.test(n); }), 'the rest’s note names Region C');
    });

    when([SP], 'TPV-TC-723', 'Product category is a breakdown of the strategic plan report; the category parts equal the hand-worked figures and add up', function (a) {
      load();
      var def = TAP.reports.get(SP);
      a.ok(TAP.prepare.breakdowns(def, {}).indexOf('category') >= 0, 'offered');
      var res = build(SP, { mode: 'org' }, { type: 'table', breakdown: 'category' });
      a.equal(res.error, null, 'builds by category');
      var exp = X.breakdowns.filter(function (b) { return b.id === 'sp.oi' && b.dim === 'category' && b.entity === 'org'; })[0];
      var sum = 0;
      Object.keys(exp.values).forEach(function (cat) {
        cellIs(a, row(res, 'org:' + cat).cells['sp.oi'], exp.values[cat], 'strategic plan ' + cat);
        sum += v(row(res, 'org:' + cat).cells['sp.oi']);
      });
      a.near(sum, exp.total, TOL, 'the categories add up to the strategic plan total');
      // The plan on the same basis per category: recurring 7248 (the books ARR), services 385 + 270 + 417 = 1072,
      // software perpetual 50 (A), hardware 100 (D; A's hardware has no strategic plan figure) = 8470
      var plan = { recurring: 7248, services: 1072, swPerpetual: 50, hardware: 100 };
      Object.keys(plan).forEach(function (cat) { cellIs(a, row(res, 'org:' + cat).cells['sp.plan'], plan[cat], 'plan ' + cat); });
      a.near(Object.keys(plan).reduce(function (t, c) { return t + plan[c]; }, 0), X.combined.orgTotal['sp.plan'], TOL, 'the plan parts add up to the total');
      // With one type selected, only its category stays on the chart
      var arr = build(SP, { mode: 'all' }, { type: 'table', measureId: 'sp.arr', breakdown: 'category' });
      a.deepEqual(arr.table.rows.map(function (r) { return r.id; }), ['alpha:recurring', 'bravo:recurring', 'charlie:recurring', 'delta:recurring'], 'ARR broken down by category shows the recurring rows only');
    });

    // The planted cases on the sample (docs/PLANTED-CASES.md R01, R02, R03, R09; figures from SAMPLE_EXPECT)
    when([SP], 'X-p4-outlook-sample-strategic', 'Sample: Asia Pacific below and Latin America above their strategic plans, the plans together short, Northern Europe left out', function (a) {
      var E = window.SAMPLE_EXPECT, TOLS = 0.05;
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      try {
        var res = build(SP, { mode: 'all' }, { type: 'table' });
        a.near(v(row(res, E.r01.region).cells['sp.plan']), E.r01.plan3, TOLS, 'R01 plan');
        a.near(v(row(res, E.r01.region).cells['sp.oi']), E.r01.strategicPlan3, TOLS, 'R01 strategic plan');
        a.near(v(row(res, E.r01.region).cells['sp.variance']), E.r01.variance3, TOLS, 'R01 variance');
        a.near(v(row(res, E.r01.region).cells['sp.variancePct']), E.r01.variancePct3, 1e-5, 'R01 30.3% below');
        a.near(v(row(res, E.r02.region).cells['sp.variance']), E.r02.variance3, TOLS, 'R02 variance');
        a.near(v(row(res, E.r02.region).cells['sp.variancePct']), E.r02.variancePct3, 1e-5, 'R02 24.8% above');
        Object.keys(E.r01.variancePct).forEach(function (r) {
          var c = row(res, r).cells['sp.variancePct'];
          if (E.r01.variancePct[r] === null) a.equal(c.state, 'notProvided', r + ': no strategic plan');
          else a.near(c.v, E.r01.variancePct[r], 1e-5, r + ' variance %');
        });
        var org = build(SP, { mode: 'org' }, { type: 'table' }), top = org.table.rows[0];
        a.near(v(top.cells['sp.plan']), E.r03.plans3, TOLS, 'R03 the plans together');
        a.near(v(top.cells['sp.oi']), E.r03.strategicPlans3, TOLS, 'R03 the strategic plans together');
        a.near(v(top.cells['sp.variance']), E.r03.variance3, TOLS, 'R03 short together');
        a.near(v(top.cells['sp.variancePct']), E.r03.variancePct3, 1e-5, 'R03 7.9% short, a ratio of sums');
        var neu = TAP.data.region(E.r09.region).name;
        a.ok(org.notes.some(function (n) { return n.indexOf(neu) >= 0; }), 'R09 ' + neu + ' is named in the note: ' + org.notes.join(' | '));
        a.ok(top.cells['sp.variance'].src.excluded.indexOf(E.r09.region) >= 0, 'and left out of the combined variance');
      } finally { TAP.data.load(window.T_FIXTURE('mini')); }
    });

    /* ---------- US-4.2.3 year 1 against the base year ---------- */

    var BY = 'ol-baseyear', BY_KEYS = ['by.budget', 'by.forecast', 'by.actuals', 'by.plan', 'by.growth'];

    when([BY], 'TPV-TC-694', 'Budget, latest forecast and actuals so far next to plan year 1, with the growth over the forecast, equal the hand-worked figures', function (a) {
      load();
      a.deepEqual(TAP.reports.get(BY).measures.map(function (m) { return m.id; }), ['by.growth'], 'its measure is the growth, which the year 1 insight names (D79)');
      var res = build(BY, { mode: 'all' }, { type: 'table' });
      a.equal(res.error, null, 'builds');
      a.deepEqual(res.table.columns.map(function (c) { return c.key; }), ['entity'].concat(BY_KEYS), 'the table holds the five figures');
      ['alpha', 'bravo', 'delta'].forEach(function (r) {
        BY_KEYS.forEach(function (k) { cellIs(a, row(res, r).cells[k], X.region[r][k], r + ' ' + k); });
      });
      BY_KEYS.forEach(function (k) { cellIs(a, row(res, 'charlie').cells[k], null, 'charlie ' + k); });
      a.ok(res.missing.indexOf('Region C') >= 0, 'Region C is named as having no base year');
      // Combined: (2800 - 2625) / 2625, a ratio of sums
      var org = build(BY, { mode: 'org' }, { type: 'table' }).table.rows[0];
      BY_KEYS.forEach(function (k) { cellIs(a, org.cells[k], X.combined.orgTotal[k], 'organization ' + k); });
      // The chart: four named bars per region and the growth written after them
      var chart = build(BY, { mode: 'all' });
      var bars = chart.option.series.filter(function (s) { return s.tapRole === 'value'; });
      a.deepEqual(bars.map(function (s) { return s.name; }), ['Budget', 'Forecast', 'Actuals so far', 'Plan year 1'], 'four bars per region');
      var end = chart.option.series.filter(function (s) { return s.tapRole === 'total'; })[0];
      a.equal(end.label.formatter({ dataIndex: 0 }), 'Year 1 over the forecast +8%', 'Region A: (865 - 800) / 800 = +8.1%');
      a.ok(chart.option.series.some(function (s) { return s.tapRole === 'notProvided'; }), 'Region C has the not-provided mark');
    });

    when([BY], 'TPV-TC-695', 'The growth switch offers budget and forecast, the forecast by default; on the budget the growth equals the hand-worked figure', function (a) {
      load();
      var res = build(BY, { mode: 'all' });
      var ctl = (res.controls || []).filter(function (c) { return c.key === 'against'; })[0];
      a.ok(ctl, 'a switch for the figure growth is measured against');
      a.deepEqual(ctl.options.map(function (o) { return o.value; }), ['forecast', 'budget'], 'forecast and budget');
      a.equal(ctl.value, 'forecast', 'the latest forecast by default');
      var on = build(BY, { mode: 'all' }, { type: 'table', opts: { against: 'budget' } });
      // (865 - 760) / 760, (1130 - 1000) / 1000, (805 - 670) / 670
      var exp = { alpha: 0.1381579, bravo: 0.13, delta: 135 / 670 };
      Object.keys(exp).forEach(function (r) { cellIs(a, row(on, r).cells['by.growth'], exp[r], r + ' growth over the budget'); });
      a.ok(on.table.columns.some(function (c) { return c.key === 'by.growth' && /budget/.test(c.label); }), 'the growth column names the budget');
      var org = build(BY, { mode: 'org' }, { type: 'table', opts: { against: 'budget' } }).table.rows[0];
      cellIs(a, org.cells['by.growth'], 0.1522634, 'organization: (2800 - 2430) / 2430');
      // The panel draws the switch and follows it
      var root = T.dom.mount(), p = TAP.panel.create(root, BY, {});
      try {
        var seg = root.querySelector('[data-control="against"]');
        a.ok(seg, 'the panel shows the switch');
        var budget = qsa('button', seg).filter(function (b) { return /Budget/.test(txt(b)); })[0];
        a.ok(budget, 'with a Budget choice');
        budget.click();
        var after = root.querySelector('[data-control="against"] [aria-pressed="true"]');
        a.ok(after && /Budget/.test(txt(after)), 'Budget is now the choice');
      } finally { p.destroy(); }
    });

    when([BY], 'TPV-TC-696', 'With two forecasts in the workbook, the default growth is measured against the later one (the contract’s forecast)', function (a) {
      // The import keeps the later of the workbook's two forecasts as `forecast`; an earlier forecast carried along
      // under another name is never read. Region A: forecast 800, the earlier one 750.
      var p = window.T_FIXTURE('miniP4');
      p.regions[0].baseYear.items.forEach(function (it) { it.forecastEarlier = it.forecast - 50 / 3; });
      TAP.data.load(p);
      var res = build(BY, { mode: 'all' }, { type: 'table' });
      cellIs(a, row(res, 'alpha').cells['by.forecast'], 800, 'the forecast shown is the later one');
      cellIs(a, row(res, 'alpha').cells['by.growth'], (865 - 800) / 800, 'growth over the later forecast');
      a.ok(Math.abs(v(row(res, 'alpha').cells['by.growth']) - (865 - 750) / 750) > 0.01, 'not over the earlier one');
    });

    when([BY], 'TPV-TC-698', 'The explanation says the actuals cover part of the year only and names the month they run to', function (a) {
      load();
      var def = TAP.reports.get(BY);
      function all() { return TAP.explain.sections(BY).map(function (s) { return s.paras.join(' '); }).join(' '); }
      a.match(all(), /part of the year/, 'actuals cover part of the year');
      a.match(all(), /August 2026/, 'names the month of the data (2026-08)');
      a.ok(typeof def.explain.read === 'string' && typeof def.explain.lookFor === 'string', 'the explanation parts are text');
      var p = window.T_FIXTURE('miniP4');
      p.regions.forEach(function (r) { if (r.baseYear) r.baseYear.actualsThrough = '2026-05'; });
      TAP.data.load(p);
      a.match(all(), /May 2026/, 'follows the data');
      p.regions.forEach(function (r) { if (r.baseYear) r.baseYear.actualsThrough = null; });
      TAP.data.load(p);
      a.match(all(), /part of the year/, 'without a month the explanation still says so');
    });

    when([BY], 'X-p4-outlook-sample-baseyear', 'Sample: Middle East & Africa year 1 is 60.3% above its base-year forecast; Central Europe has no base year', function (a) {
      var E = window.SAMPLE_EXPECT;
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      try {
        var res = build(BY, { mode: 'all' }, { type: 'table' }), r4 = row(res, E.r04.region);
        a.near(v(r4.cells['by.plan']), E.r04.year1, 0.05, 'R04 year 1');
        a.near(v(r4.cells['by.forecast']), E.r04.forecast, 0.05, 'R04 forecast');
        a.near(v(r4.cells['by.growth']), E.r04.growth, 1e-5, 'R04 60.3% above');
        Object.keys(E.r04.growthByRegion).forEach(function (r) {
          var c = row(res, r).cells['by.growth'];
          if (E.r04.growthByRegion[r] === null) a.equal(c.state, 'notProvided', r + ': no base year');
          else a.near(c.v, E.r04.growthByRegion[r], 1e-5, r + ' growth');
        });
        a.ok(res.missing.indexOf(TAP.data.region(E.r10.region).name) >= 0, 'R10 Central Europe is named');
      } finally { TAP.data.load(window.T_FIXTURE('mini')); }
    });

    /* ---------- US-4.2.4 pipeline coverage ---------- */

    var CV = 'ol-coverage';
    // Pipeline over the order intake still to win (forecast minus actuals, or read back from the workbook's ratio):
    // A 540 / 280, B 530 / (400 + 60) = 530 / 460, D 130 / 220 (services has no pipeline); together 1200 / 960
    var CV_PARTS = { alpha: [540, 280], bravo: [530, 460], delta: [130, 220] };

    when([CV], 'TPV-TC-699', 'Pipeline, the order intake still to win and the coverage ratio per entity and by category equal the hand-worked figures', function (a) {
      load();
      var def = TAP.reports.get(CV);
      a.ok(def.measures.some(function (m) { return m.id === 'by.coverage'; }), 'offers by.coverage, which the low-coverage insight names (D79)');
      a.equal(TAP.measures.meta('by.coverage').unit, 'ratio', 'coverage is a ratio, not a percentage');
      var res = build(CV, { mode: 'all' }, { type: 'table' });
      a.equal(res.error, null, 'builds');
      a.deepEqual(res.table.columns.map(function (c) { return c.key; }), ['entity', 'pipeline', 'left', 'by.coverage'], 'pipeline, still to win and coverage');
      Object.keys(CV_PARTS).forEach(function (r) {
        cellIs(a, row(res, r).cells.pipeline, CV_PARTS[r][0], r + ' pipeline');
        cellIs(a, row(res, r).cells.left, CV_PARTS[r][1], r + ' still to win');
        cellIs(a, row(res, r).cells['by.coverage'], X.region[r]['by.coverage'], r + ' coverage');
      });
      ['pipeline', 'left', 'by.coverage'].forEach(function (k) { cellIs(a, row(res, 'charlie').cells[k], null, 'charlie ' + k); });
      var org = build(CV, { mode: 'org' }, { type: 'table' }).table.rows[0];
      cellIs(a, org.cells['by.coverage'], X.combined.orgTotal['by.coverage'], 'organization: 1200 / 960, a ratio of sums');
      a.ok(Math.abs(org.cells['by.coverage'].v - X.meanOfRatios['by.coverage']) > 0.01, 'not the mean of the regions’ ratios');
      cellIs(a, org.cells.pipeline, 1200, 'organization pipeline');
      cellIs(a, org.cells.left, 960, 'organization still to win');
      // By product category: A recurring is the workbook's 2, A services 60 / (110 - 70) = 1.5, D hardware 30 / (25 - 5) = 1.5
      var cat = build(CV, { mode: 'all' }, { type: 'table', breakdown: 'category' });
      a.equal(cat.error, null, 'builds by category');
      var r0 = row(cat, 'alpha');
      cellIs(a, r0.cells['by.coverage@category:recurring'], 2, 'A recurring');
      cellIs(a, r0.cells['by.coverage@category:services'], 1.5, 'A services');
      cellIs(a, row(cat, 'delta').cells['by.coverage@category:hardware'], 1.5, 'D hardware');
      a.equal(row(cat, 'delta').cells['by.coverage@category:services'].state, 'notProvided', 'D services: no pipeline figure');
      // Read as a ratio everywhere: 1.93×, never 192.9%
      var chart = build(CV, { mode: 'all' });
      var bar = chart.option.series.filter(function (s) { return s.tapRole === 'value'; })[0];
      a.equal(TAP.format.cell(row(res, 'alpha').cells['by.coverage'], { unit: 'ratio' }), '1.93×', 'A reads 1.93×');
      a.ok(bar && bar.label && /1\.93×/.test(String(bar.label.formatter({ data: bar.data[0], value: bar.data[0].value, dataIndex: 0 }))), 'the bar label reads 1.93×');
      a.equal(chart.option.xAxis.axisLabel.formatter(1.5), '1.50×', 'the axis reads as a ratio');
    });

    when([CV], 'TPV-TC-700', 'The workbook’s own ratio shows where it is given; otherwise the app works it out (APP) and a note says so', function (a) {
      // Region B keeps one item, recurring with the workbook's 1.25; Region A's three items need working out
      var p = window.T_FIXTURE('miniP4');
      p.regions.filter(function (r) { return r.id === 'bravo'; })[0].baseYear.items.splice(1);
      TAP.data.load(p);
      var res = build(CV, { mode: 'all' }, { type: 'table' }), b = row(res, 'bravo').cells['by.coverage'], al = row(res, 'alpha').cells['by.coverage'];
      cellIs(a, b, 1.25, 'B: the workbook’s ratio');
      a.equal(b.kind, 'PRE', 'B: a figure the workbook gives');
      cellIs(a, row(res, 'bravo').cells.left, 400, 'B: still to win read back from it, 500 / 1.25');
      cellIs(a, al, X.region.alpha['by.coverage'], 'A: worked out by the app');
      a.equal(al.kind, 'APP', 'A: calculated by this app');
      var note = res.notes.filter(function (n) { return /worked out by this app/.test(n); })[0];
      // A gives the workbook's ratio for recurring only, D for no category: both are named; B gives it throughout
      a.ok(note && /Region A/.test(note) && /Region D/.test(note) && !/Region B/.test(note), 'a note names the regions the app worked out: ' + note);
    });

    when([CV], 'TPV-TC-701', 'The coverage chart has a labelled reference line at a coverage of 1', function (a) {
      load();
      var chart = build(CV, { mode: 'all' }), host = chart.option.series.filter(function (s) { return s.markLine; })[0];
      a.ok(host, 'a reference line');
      var line = host.markLine.data[0];
      a.equal(line.xAxis, 1, 'at 1');
      a.ok(line.name && /1/.test(line.name), 'named: ' + line.name);
      a.equal(host.markLine.lineStyle.type, 'dashed', 'dashed, so not told apart by colour alone');
    });

    when([CV], 'X-p4-outlook-sample-coverage', 'Sample: North America’s coverage 1.09×, Latin America worked out by the app at 2.59×, Central Europe not provided', function (a) {
      var E = window.SAMPLE_EXPECT;
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      try {
        var res = build(CV, { mode: 'all' }, { type: 'table' });
        a.near(v(row(res, E.r05.region).cells['by.coverage']), E.r05.coverage, 1e-4, 'R05 1.09×');
        a.near(v(row(res, E.r05.region).cells.pipeline), E.r05.pipeline, 0.05, 'R05 pipeline');
        Object.keys(E.r05.coverageByRegion).forEach(function (r) {
          var c = row(res, r).cells['by.coverage'];
          if (E.r05.coverageByRegion[r] === null) a.equal(c.state, 'notProvided', r + ': no base year');
          else a.near(c.v, E.r05.coverageByRegion[r], 1e-4, r + ' coverage');
        });
        var la = row(res, E.r10.coverageNotGiven[0]).cells['by.coverage'];
        a.equal(la.kind, 'APP', 'R10 Latin America: worked out by the app');
        a.equal(TAP.format.cell(la, { unit: 'ratio' }), '2.59×', 'reads 2.59×');
        a.ok(res.notes.some(function (n) { return /worked out by this app/.test(n) && n.indexOf(TAP.data.region('latam').name) >= 0; }), 'the note names Latin America');
      } finally { TAP.data.load(window.T_FIXTURE('mini')); }
    });

    /* ---------- US-4.3.1 revenue by year ---------- */

    var RV = 'ol-revenue';
    // Revenue by year and motion, hand-worked from the comment block of mini-p4-expected.js:
    //   A NB 300+60 / 600+100 / 800+140 = 360 / 700 / 940, CG 75+15 / 50+10 / 50+10 = 90 / 60 / 60 (all 450 / 760 / 1000)
    //   B all 635 / 1100 / 1220 with CG 75 + 10 = 85 in year 1 only: NB 550 / 1100 / 1220, CG 85 / 0 / 0
    //   D NB 300+150 / 600+140 / 1200+300 = 450 / 740 / 1500, CG 90+70 / 88+22 / 0 = 160 / 110 / 0 (all 610 / 850 / 1500)
    var RV_YEARS = { alpha: [[360, 90], [700, 60], [940, 60]], bravo: [[550, 85], [1100, 0], [1220, 0]], delta: [[450, 160], [740, 110], [1500, 0]] };
    function partKey(res, m, motion) { return m + '@motion:' + motion; }

    when([RV], 'TPV-TC-703', 'Revenue per entity and plan year, stacked by new business and customer growth, equals the hand-worked figures', function (a) {
      load();
      var def = TAP.reports.get(RV);
      a.equal(def.defaultBreakdown, 'year', 'opens with a stack per plan year');
      var res = build(RV, { mode: 'all' }, { type: 'table', breakdown: 'year' });
      a.equal(res.error, null, 'builds');
      Object.keys(RV_YEARS).forEach(function (r) {
        RV_YEARS[r].forEach(function (y, i) {
          var x = row(res, r + ':' + (i + 1));
          a.ok(x, r + ' year ' + (i + 1) + ' has a row');
          cellIs(a, x.cells[partKey(res, 'rv.all.oi', 'nb')], y[0], r + ' year ' + (i + 1) + ' new business');
          cellIs(a, x.cells[partKey(res, 'rv.all.oi', 'cg')], y[1], r + ' year ' + (i + 1) + ' customer growth');
          cellIs(a, x.cells['rv.all.oi'], y[0] + y[1], r + ' year ' + (i + 1) + ' total');
        });
      });
      cellIs(a, row(res, 'alpha:2').cells['rv.all.oi'], X.region.alpha['rv.all.oi.y2'], 'A year 2 against the expected file');
      cellIs(a, row(res, 'bravo:1').cells['rv.all.oi'], X.region.bravo['rv.all.oi.y1'], 'B year 1 against the expected file');
      [1, 2, 3].forEach(function (y) { cellIs(a, row(res, 'charlie:' + y).cells['rv.all.oi'], null, 'C year ' + y + ' not provided'); });
      a.ok(res.missing.indexOf('Region C') >= 0, 'Region C is named as not provided');
      // The three-year figures, with no breakdown: A 2000 + 210
      var all = build(RV, { mode: 'all' }, { type: 'table', breakdown: null });
      cellIs(a, row(all, 'alpha').cells[partKey(all, 'rv.all.oi', 'nb')], X.region.alpha['rv.nb.oi'], 'A new business over three years');
      cellIs(a, row(all, 'alpha').cells[partKey(all, 'rv.all.oi', 'cg')], X.region.alpha['rv.cg.oi'], 'A customer growth over three years');
      cellIs(a, row(all, 'delta').cells['rv.all.oi'], X.region.delta['rv.all.oi'], 'D over three years');
      var org = build(RV, { mode: 'org' }, { type: 'table', breakdown: null });
      cellIs(a, org.table.rows[0].cells['rv.all.oi'], X.combined.orgTotal['rv.all.oi'], 'organization total, C left out');
      // The chart: stacked bars with a part for each motion, named in the key
      var chart = build(RV, { mode: 'all' }, { type: 'stackedBar', breakdown: 'year' });
      a.deepEqual(chart.option.series.filter(function (s) { return s.tapRole === 'value'; }).map(function (s) { return s.name; }),
        ['New business', 'Customer growth'], 'one part per motion');
      a.ok(chart.legend.some(function (l) { return l.label === 'Customer growth'; }), 'the key names the motions');
      a.ok(chart.option.yAxis.data.length === 12, 'a stack per region and plan year');
    });

    when([RV], 'TPV-TC-704', 'ARR and services are measures and channel a breakdown; the channel parts add up to each total', function (a) {
      load();
      var def = TAP.reports.get(RV);
      a.deepEqual(def.measures.map(function (m) { return m.id; }), ['rv.all.oi', 'rv.all.arr', 'rv.all.services'], 'total, ARR and services');
      a.ok(TAP.prepare.breakdowns(def, {}).indexOf('channel') >= 0, 'a channel breakdown');
      // ARR: A NB 1700 + CG 175; services: A NB 300 + CG 35
      var arr = build(RV, { mode: 'all' }, { type: 'table', breakdown: null, measureId: 'rv.all.arr' });
      cellIs(a, row(arr, 'alpha').cells['rv.all.arr'], X.region.alpha['rv.all.arr'], 'A ARR');
      cellIs(a, row(arr, 'alpha').cells[partKey(arr, 'rv.all.arr', 'nb')], X.region.alpha['rv.nb.arr'], 'A new business ARR');
      var sv = build(RV, { mode: 'all' }, { type: 'table', breakdown: null, measureId: 'rv.all.services' });
      cellIs(a, row(sv, 'alpha').cells['rv.all.services'], X.region.alpha['rv.all.services'], 'A services');
      cellIs(a, row(sv, 'delta').cells[partKey(sv, 'rv.all.services', 'cg')], X.region.delta['rv.cg.services'], 'D customer growth services');
      // By channel: A direct 1460 + partner 750 = 2210; B direct 1830 + Alliance A 1125 = 2955; D direct 1170
      var ch = build(RV, { mode: 'all' }, { type: 'table', breakdown: 'channel' });
      cellIs(a, row(ch, 'alpha:direct').cells['rv.all.oi'], 1460, 'A direct');
      cellIs(a, row(ch, 'alpha:partner').cells['rv.all.oi'], 750, 'A partner');
      cellIs(a, row(ch, 'bravo:allianceA').cells['rv.all.oi'], 1125, 'B Alliance A');
      cellIs(a, row(ch, 'delta:direct').cells['rv.all.oi'], 1170, 'D direct');
      ['alpha', 'bravo', 'delta'].forEach(function (r) {
        var sum = ch.table.rows.filter(function (x) { return x.entityId === r; }).reduce(function (t, x) { return t + (v(x.cells['rv.all.oi']) || 0); }, 0);
        a.near(sum, X.region[r]['rv.all.oi'], TOL, r + ': the channels add up to the total');
      });
    });

    when([RV], 'TPV-TC-706', 'The explanation says the revenue is indicative, at today’s recurring revenue level, and released by the template’s assumptions', function (a) {
      var e = TAP.reports.get(RV).explain, all = [e.shows, e.read, e.lookFor].join(' ');
      a.match(all, /indicative/, 'indicative');
      a.match(all, /today’s recurring revenue level/, 'at today’s recurring revenue level');
      a.match(all, /released from (the )?order intake by the template’s own assumptions/, 'released by the template’s own assumptions');
    });

    when([RV], 'TPV-TC-708', 'Sample: every revenue value is calculated in the workbook (DER) and traces to the Recap’s revenue block', function (a) {
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      try {
        var sheet = window.PLAN_DATA.meta.sourceMap.revenue.sheet, n = 0;
        var res = build(RV, { mode: 'all' }, { type: 'table', breakdown: 'year' });
        res.table.rows.forEach(function (r) {
          Object.keys(r.cells).forEach(function (k) {
            var c = r.cells[k];
            if (k === 'entity' || k === 'group' || !c || c.state !== 'value') return;
            n++;
            a.equal(c.kind, 'DER', r.id + ' ' + k + ' is calculated in the workbook');
            var ad = TAP.sources.address(c.src);
            a.ok(ad.calculated, r.id + ' ' + k + ' reads as calculated');
            a.ok(ad.text.indexOf('› ' + sheet + ' ›') > 0, r.id + ' ' + k + ' traces to ' + sheet + ': ' + ad.text);
          });
        });
        a.ok(n > 40, 'checked ' + n + ' values');
        var one = TAP.sources.address(TAP.measures.get('rv.nb.arr')('na', { channel: 'direct', year: 1 }).src);
        a.equal(one.text, 'North America plan.xlsx › ' + sheet + ' › E5', 'one cell names its file, sheet and cell');
      } finally { TAP.data.load(window.T_FIXTURE('mini')); }
    });

    /* ---------- US-4.3.2 order intake against revenue ---------- */

    var RS = 'ol-revshare', RS_KEYS = ['rc.all.oi', 'rv.all.oi', 'rv.share'];
    // Order intake (customer value) and revenue, year 1 / 2 / 3, from the comment block of mini-p4-expected.js:
    //   A 900 / 900 / 1020 = 2820 and 450 / 760 / 1000 = 2210; B 1260 / 1100 / 1320 = 3680 and 635 / 1100 / 1220 = 2955;
    //   D 1000 / 1235 / 1500 = 3735 and 610 / 850 / 1500 = 2960
    var RS_YEARS = { alpha: [[900, 450], [900, 760], [1020, 1000]], bravo: [[1260, 635], [1100, 1100], [1320, 1220]],
      delta: [[1000, 610], [1235, 850], [1500, 1500]] };

    when([RS], 'TPV-TC-710', 'Order intake, revenue and the share released in the same year, per entity and year, equal the hand-worked figures', function (a) {
      load();
      var res = build(RS, { mode: 'all' }, { type: 'table' });
      a.equal(res.error, null, 'builds');
      a.deepEqual(res.table.columns.map(function (c) { return c.key; }), ['entity'].concat(RS_KEYS), 'order intake, revenue and the share');
      ['alpha', 'bravo', 'delta'].forEach(function (r) {
        cellIs(a, row(res, r).cells['rc.all.oi'], X.region[r]['cv.oi'], r + ' order intake over three years');
        cellIs(a, row(res, r).cells['rv.all.oi'], X.region[r]['rv.all.oi'], r + ' revenue over three years');
        cellIs(a, row(res, r).cells['rv.share'], X.region[r]['rv.share'], r + ' share');
      });
      var by = build(RS, { mode: 'all' }, { type: 'table', breakdown: 'year' });
      Object.keys(RS_YEARS).forEach(function (r) {
        RS_YEARS[r].forEach(function (y, i) {
          var x = row(by, r + ':' + (i + 1));
          cellIs(a, x.cells['rc.all.oi'], y[0], r + ' year ' + (i + 1) + ' order intake');
          cellIs(a, x.cells['rv.all.oi'], y[1], r + ' year ' + (i + 1) + ' revenue');
          cellIs(a, x.cells['rv.share'], y[1] / y[0], r + ' year ' + (i + 1) + ' share');
        });
      });
      cellIs(a, row(by, 'alpha:1').cells['rv.share'], X.region.alpha['rv.share.y1'], 'A year 1 against the expected file');
      cellIs(a, row(by, 'delta:1').cells['rv.share'], X.region.delta['rv.share.y1'], 'D year 1 against the expected file');
      // The chart: order intake and revenue as two named bars, the share written after them
      var chart = build(RS, { mode: 'all' });
      a.deepEqual(chart.option.series.filter(function (s) { return s.tapRole === 'value'; }).map(function (s) { return s.name; }),
        ['Order intake', 'Revenue'], 'two bars per region');
      var end = chart.option.series.filter(function (s) { return s.tapRole === 'total'; })[0];
      // A's revenue grid leaves one cell blank (year 1, new business ARR, Alliance B), so its share is partly provided
      a.equal(end.label.formatter({ dataIndex: 0 }), 'Released in the same year 78% ' + TAP.content.text('chart.partialMark'), 'Region A: 2210 / 2820');
    });

    when([RS], 'TPV-TC-711', 'One vs the rest and organization total: the released share is the ratio of the summed figures, not the mean', function (a) {
      load();
      var org = build(RS, { mode: 'org' }, { type: 'table' }).table.rows[0];
      cellIs(a, org.cells['rv.share'], X.combined.orgTotal['rv.share'], 'organization: 8125 / 10235');
      a.ok(Math.abs(org.cells['rv.share'].v - X.meanOfRatios['rv.share']) > 1e-4, 'not the mean of the regions’ shares');
      var rest = build(RS, { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' }, { type: 'table' });
      cellIs(a, row(rest, 'rest').cells['rv.share'], X.combined.restOfAlphaAverage['rv.share'], 'the rest: 5915 / 7415');
      cellIs(a, row(rest, 'alpha').cells['rv.share'], X.region.alpha['rv.share'], 'Region A beside it');
    });

    when([RS], 'TPV-TC-712', 'A region without revenue reads "not provided" for revenue and the share, never zero', function (a) {
      load();
      var res = build(RS, { mode: 'all' }, { type: 'table' }), c = row(res, 'charlie');
      cellIs(a, c.cells['rv.all.oi'], null, 'C revenue');
      cellIs(a, c.cells['rv.share'], null, 'C share');
      // A region with order intake but no revenue outlook: its revenue bar and its share say "not provided"
      var p = window.T_FIXTURE('miniP4');
      p.regions.filter(function (r) { return r.id === 'delta'; })[0].revenue = [];
      TAP.data.load(p);
      var d = row(build(RS, { mode: 'all' }, { type: 'table' }), 'delta');
      a.equal(d.cells['rc.all.oi'].state, 'value', 'D: its order intake still shows');
      cellIs(a, d.cells['rv.all.oi'], null, 'D revenue');
      cellIs(a, d.cells['rv.share'], null, 'D share');
      var chart = build(RS, { mode: 'all' }), bars = chart.option.series.filter(function (s) { return s.tapRole === 'value'; });
      var di = chart.option.yAxis.data.indexOf('Region D');
      a.equal(bars[1].data[di].text, TAP.content.text('chart.npFor', { name: 'Revenue' }), 'the revenue bar says not provided');
      var end = chart.option.series.filter(function (s) { return s.tapRole === 'total'; })[0];
      a.ok(/not provided/.test(end.label.formatter({ dataIndex: di })), 'and so does the share: ' + end.label.formatter({ dataIndex: di }));
      load();
      var org = build(RS, { mode: 'org' }, { type: 'table' });
      a.ok(org.notes.some(function (n) { return /Region C/.test(n); }), 'the combined share names Region C as left out');
    });

    /* ---------- US-4.4.2 order intake by product category ---------- */

    var OC = 'ol-category', CATS = ['swPerpetual', 'recurring', 'hardware', 'services'];
    function catKey(c) { return 'oi.cat@category:' + c; }

    when([OC], 'TPV-TC-720', 'Order intake per entity and plan year by software perpetual, recurring, hardware and services equals the hand-worked figures', function (a) {
      load();
      var res = build(OC, { mode: 'all' }, { type: 'table', breakdown: null });
      a.equal(res.error, null, 'builds');
      a.deepEqual(res.table.columns.map(function (c) { return c.key; }), ['entity'].concat(CATS.map(catKey), ['oi.cat']), 'the four categories in the lookup’s order, then the total');
      var exp = X.breakdowns.filter(function (b) { return b.id === 'oi.cat' && b.entity === 'alpha'; })[0];
      CATS.forEach(function (c) { cellIs(a, row(res, 'alpha').cells[catKey(c)], exp.values[c], 'A ' + c); });
      cellIs(a, row(res, 'alpha').cells['oi.cat'], X.region.alpha['oi.cat'], 'A total');
      // B: recurring 3040, services 270, no software perpetual or hardware; D: recurring 2068, services 667, hardware 100
      cellIs(a, row(res, 'bravo').cells[catKey('recurring')], 3040, 'B recurring');
      cellIs(a, row(res, 'bravo').cells[catKey('hardware')], null, 'B hardware: no item, not provided');
      cellIs(a, row(res, 'delta').cells[catKey('services')], 667, 'D services');
      cellIs(a, row(res, 'delta').cells[catKey('hardware')], 100, 'D hardware');
      cellIs(a, row(res, 'charlie').cells['oi.cat'], null, 'C not provided');
      var org = build(OC, { mode: 'org' }, { type: 'table', breakdown: null }).table.rows[0];
      var oexp = X.breakdowns.filter(function (b) { return b.id === 'oi.cat' && b.entity === 'org'; })[0];
      CATS.forEach(function (c) { cellIs(a, org.cells[catKey(c)], oexp.values[c], 'organization ' + c); });
      cellIs(a, org.cells['oi.cat'], oexp.total, 'organization total');
      // Per plan year: A year 1 software perpetual 50, recurring 690, hardware 20, services 125 = 885; year 3 925
      var by = build(OC, { mode: 'all' }, { type: 'table', breakdown: 'year' });
      var y1 = { swPerpetual: 50, recurring: 690, hardware: 20, services: 125 };
      CATS.forEach(function (c) { cellIs(a, row(by, 'alpha:1').cells[catKey(c)], y1[c], 'A year 1 ' + c); });
      cellIs(a, row(by, 'alpha:1').cells['oi.cat'], 885, 'A year 1 total');
      cellIs(a, row(by, 'alpha:3').cells['oi.cat'], X.region.alpha['oi.cat.y3'], 'A year 3 total');
    });

    when([OC], 'TPV-TC-721', 'Stacked bars and 100% stacked bars are offered; in the 100% stack each entity’s parts add up to 100%', function (a) {
      load();
      var def = TAP.reports.get(OC);
      a.ok(def.types.indexOf('stackedBar') >= 0 && def.types.indexOf('stacked100') >= 0, 'both chart types: ' + def.types.join(', '));
      a.equal(def.defaultType, 'stackedBar', 'stacked bars first');
      var chart = build(OC, { mode: 'all' }, { type: 'stacked100', breakdown: null });
      var parts = chart.option.series.filter(function (s) { return s.tapRole === 'value'; });
      a.deepEqual(parts.map(function (s) { return s.name; }), ['Software perpetual', 'Recurring', 'Hardware', 'Services'], 'one part per category, named');
      chart.option.yAxis.data.forEach(function (name, i) {
        var sum = parts.reduce(function (t, s) { return t + ((s.data[i] || {}).value || 0); }, 0);
        if (name !== 'Region C') a.near(sum, 100, 1e-6, name + ' adds up to 100%');
      });
      a.ok(chart.legend.some(function (l) { return l.label === 'Hardware' && l.mark; }), 'the key numbers each category, so they are told apart without colour');
    });

    when([OC], 'X-p4-outlook-sample-category', 'Sample: each region’s order intake by product category equals the planted figures', function (a) {
      var E = window.SAMPLE_EXPECT.p4.regions;
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      try {
        var res = build(OC, { mode: 'all' }, { type: 'table', breakdown: null });
        Object.keys(E).forEach(function (r) {
          var want = E[r].booksByCategory;
          if (!want) { a.equal(row(res, r).cells['oi.cat'].state, 'notProvided', r + ': no books value'); return; }
          CATS.forEach(function (c) { a.near(v(row(res, r).cells[catKey(c)]), want[c], 0.05, r + ' ' + c); });
        });
      } finally { TAP.data.load(window.T_FIXTURE('mini')); }
    });

    T.test('X-p4-outlook-modes', 'Every Outlook report that is built validates, and in all five modes builds with a table whose cells carry sources', function (a) {
      load();
      var built = REPORTS.filter(function (id) { return !!TAP.reports.get(id); });
      a.ok(built.length > 0, 'some report is built: ' + built.join(', '));
      var modes = [{ mode: 'all' }, { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' }, { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'total' },
        { mode: 'pair', focus: 'alpha', second: 'bravo' }, { mode: 'set', set: ['alpha', 'charlie', 'delta'] }, { mode: 'org' }];
      built.forEach(function (id) {
        var def = TAP.reports.get(id);
        a.deepEqual(TAP.reports.validate(def), [], id + ' is valid');
        a.ok(def.explain.shows.length > 40 && def.explain.read.length > 40 && def.explain.lookFor.length > 40, id + ' has its explanation');
        modes.forEach(function (m) {
          var res = build(id, m), label = id + ' ' + m.mode + (m.restAgg || ''), n = 0;
          a.equal(res.error, null, label + ': builds');
          a.ok(res.option || res.empty, label + ': draws a chart');
          (res.table.rows || []).forEach(function (r) {
            Object.keys(r.cells).forEach(function (k) {
              var c = r.cells[k];
              if (k === 'entity' || !c || c.kind == null) return;
              a.ok(c.src, label + ': ' + r.id + ' ' + k + ' has a source');
              n++;
            });
          });
          a.ok(n > 0, label + ': checked ' + n + ' cells');
        });
      });
    });
  });
})(window.TAP);
