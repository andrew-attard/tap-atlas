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
