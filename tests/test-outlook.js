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
  });
})(window.TAP);
