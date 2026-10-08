/*
 * File: tests/test-integrator.js
 * Purpose: Tests for cross-view behaviour: "Show me", keyboard shortcuts and the Esc order.
 * Provides: test cases for the INTEGRATOR stream (#65)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures, data/sample-plan-data.js
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function sample() { return JSON.parse(JSON.stringify(window.PLAN_DATA)); }
  function hlColor() { return window.TAP_THEME.echarts.tap.highlight.color; }

  // Starts the app on the sample data in the sandbox, with "Show me" listening, and always stops it again.
  function withApp(fn) {
    var root = T.dom.mount();
    TAP.app.start({ root: root, plan: sample() });
    TAP.showme.bind();
    try { return fn(root); } finally {
      TAP.showme.unbind();
      try { TAP.layers.close(); } catch (e) { /* none open */ }
      TAP.app.stop();
      TAP.data.load(T_FIXTURE('mini'));
    }
  }

  function panelEl(root, reportId) { return root.querySelector('.tap-panel[data-report="' + reportId + '"]'); }

  // Looks through an ECharts option for a mark drawn in the highlight colour.
  function ringed(o, depth) {
    if (!o || typeof o !== 'object' || depth > 10) return false;
    if (Array.isArray(o)) return o.some(function (x) { return ringed(x, depth + 1); });
    if (o.borderColor === hlColor() && o.borderWidth > 0) return true;
    return Object.keys(o).some(function (k) { return ringed(o[k], depth + 1); });
  }

  // True when the panel draws a highlight: outlined grid rows or cells, or ringed marks on the chart.
  function drawnHl(root, reportId) { return drawn(root, reportId); }
  function drawn(root, reportId) {
    var p = panelEl(root, reportId);
    if (!p) return false;
    if (qsa('.is-hl', p).length) return true;
    var c = p.querySelector('.tap-panel__chart'), chart = c && window.echarts.getInstanceByDom(c);
    if (!chart) return false;
    var series = chart.getOption().series || [];
    return series.some(function (s) {
      if (s.tapRole === 'highlight') return (s.data || []).length > 0;
      return ringed(s.data, 0) || ringed(s.markArea, 0);
    });
  }

  // Back to a known comparison with nothing open. The view stays unless one is given (mounting views is slow).
  function reset(cmp, view) {
    TAP.layers.close();
    TAP.store.set({ expanded: null, highlight: null });
    if (view) TAP.store.set({ view: view });
    TAP.store.set({ cmp: Object.assign({ mode: 'all', focus: null, second: null, set: [], restAs: 'combined', restAgg: 'average' }, cmp || {}) });
  }

  // Checks where one "Show me" landed. Returns a problem in words, or null.
  function landed(root, x) {
    var s = TAP.store.get();
    if (!x.reportId) return TAP.layers.top() === 'details' ? null : x.id + ': details did not open';
    var def = TAP.reports.get(x.reportId);
    if (s.view !== def.view) return x.id + ': on view ' + s.view + ', expected ' + def.view;
    if (!s.highlight || s.highlight.reportId !== x.reportId) return x.id + ': no highlight for ' + x.reportId;
    var scope = TAP.scope.regionIds(s.cmp);
    if (x.regionIds.some(function (r) { return scope.indexOf(r) < 0; })) return x.id + ': a region is out of scope';
    return drawn(root, x.reportId) ? null : x.id + ': highlight not drawn on ' + x.reportId;
  }

  // One insight per chart and kind of highlight, plus one with no chart: the cases that land differently.
  function oneOfEach() {
    var seen = {};
    return TAP.insights.all().filter(function (x) {
      var key = x.reportId + '|' + (x.highlight && x.highlight.mark);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  // Runs "Show me" for each insight (default: every sample insight) from the given comparison. Returns the problems.
  function everyInsight(root, cmp, list) {
    var problems = [];
    (list || TAP.insights.all()).slice().sort(function (p, q) { return String(p.reportId).localeCompare(String(q.reportId)); }).forEach(function (x) {
      reset(cmp);
      TAP.showme.go({ insightId: x.id, target: x.highlight });
      var bad = landed(root, x);
      if (bad) problems.push(bad);
    });
    return problems;
  }

  T.suite('integrator', function () {
    /* ---------- "Show me" ---------- */

    T.test('X-int-showme-sample', 'Every sample insight lands on a drawn highlight, or on details', function (a) {
      withApp(function (root) {
        var all = TAP.insights.all();
        // Phase 2 rule families add their own insights; the Phase 1 families gave 37. D112 (SAMPLE_EXPECT.s01, s02) adds
        // one industryCover insight per region with a finding (D121), the priorityVsPlan findings and Manufacturing's
        // consensus, and takes away its split and the three findings of the two retired rules
        var phase1 = ['priorities', 'judgement', 'assumptions', 'realism', 'exposure', 'capability'], S = window.SAMPLE_EXPECT;
        var n1 = 37 + S.s01.fired.map(function (f) { return f.region; }).filter(function (r, i, all) { return all.indexOf(r) === i; }).length + S.s02.fired.length + 1 - 1 - 3;
        a.equal(all.filter(function (x) { return phase1.indexOf(x.family) >= 0; }).length, n1, 'the sample data has ' + n1 + ' Phase 1 insights');
        a.ok(all.some(function (x) { return x.reportId; }), 'insights with a chart are covered');
        // Every Phase 2 rule now has a report; the details-only path is checked with a synthetic target (X-int-showme-details)
        if (all.some(function (x) { return !x.reportId; })) a.ok(true, 'details-only insights are covered too');
        a.deepEqual(everyInsight(root, {}), [], 'All regions');
      });
    });

    T.test('X-int-showme-widen', 'A region outside the comparison switches it to All regions first', function (a) {
      withApp(function (root) {
        var ids = TAP.data.regions().map(function (r) { return r.id; });
        a.deepEqual(everyInsight(root, { mode: 'pair', focus: ids[0], second: ids[1] }, oneOfEach()), [], 'from a pair');
        var x = TAP.insights.all().filter(function (i) { return i.reportId && i.regionIds.indexOf(ids[0]) < 0 && i.regionIds.length; })[0];
        reset({ mode: 'pair', focus: ids[0], second: ids.filter(function (id) { return x.regionIds.indexOf(id) < 0 && id !== ids[0]; })[0] });
        var r = TAP.showme.go({ insightId: x.id });
        a.equal(r.widened, true, 'reported as widened');
        a.equal(TAP.store.get().cmp.mode, 'all', 'comparison is All regions');
        a.equal(TAP.store.get().highlight.widened, true, 'the highlight says so');
        var strip = panelEl(root, x.reportId).querySelector('.tap-panel__strip');
        a.ok(strip && strip.textContent.indexOf(TAP.content.text('panel.widened')) >= 0, 'the strip over the chart says so');
      });
    });

    T.test('X-int-showme-combined', 'From one region against the total or the average of the rest, every insight still lands', function (a) {
      withApp(function (root) {
        a.ok(oneOfEach().length >= 6, 'every chart and kind of highlight is covered');
        a.deepEqual(everyInsight(root, { mode: 'one', focus: TAP.data.regions()[0].id, restAgg: 'total' }, oneOfEach()), [], 'the total of the rest');
        a.deepEqual(everyInsight(root, { mode: 'one', focus: TAP.data.regions()[0].id }, oneOfEach()), [], 'one against the rest');
      });
    });

    T.test('X-int-showme-stays', 'A comparison that already shows every region is kept', function (a) {
      withApp(function () {
        var x = TAP.insights.all().filter(function (i) { return i.reportId === 'ind-tiers' && i.regionIds.length === 1; })[0];
        var ids = TAP.data.regions().map(function (r) { return r.id; });
        reset({ mode: 'one', focus: x.regionIds[0] });
        var r = TAP.showme.go({ insightId: x.id });
        a.equal(r.widened, false, 'not widened');
        a.equal(TAP.store.get().cmp.mode, 'one', 'still one region against the rest');
        a.ok(ids.length > 1, 'sample has several regions');
      });
    });

    T.test('X-int-showme-marks', 'Each kind of highlight draws on its chart', function (a) {
      withApp(function (root) {
        var ids = TAP.data.regions().map(function (r) { return r.id; }), ind = TAP.data.industries({ rated: true })[0].id;
        var cases = [
          { reportId: 'ind-tiers', mark: 'industryRow', regionIds: [], industryIds: [ind] },
          { reportId: 'ind-tiers', mark: 'regionColumn', regionIds: [ids[1]], industryIds: [] },
          { reportId: 'ind-tiers', mark: 'cell', regionIds: [ids[2]], industryIds: [ind] },
          { reportId: 'ind-quad', mark: 'points', regionIds: [ids[0]], industryIds: [ind] },
          { reportId: 'ind-quad', mark: 'quadrant', regionIds: ids.slice(0, 3), industryIds: [ind], quadrant: 'attractiveNotYet' },
          { reportId: 'ov-ambition', mark: 'bar', regionIds: [ids[3]], industryIds: [] }
        ];
        cases.forEach(function (tg) {
          reset();
          TAP.showme.go({ target: Object.assign({ accountIds: [] }, tg) });
          a.ok(drawn(root, tg.reportId), tg.mark + ' is drawn on ' + tg.reportId);
        });
      });
    });

    T.test('X-int-showme-details', 'An insight with no chart opens the details side panel', function (a) {
      withApp(function () {
        // A target with no report, as an insight with no chart carries (fallback 'details'); built here, since every
        // sample insight may have a report by now
        var target = { reportId: null, regionIds: [TAP.data.regions()[0].id], industryIds: [], accountIds: [], mark: null };
        reset(null, 'insights');
        var r = TAP.showme.go({ target: target });
        a.equal(r.to, 'details', 'lands on details');
        a.equal(TAP.layers.top(), 'details', 'the details panel is open');
        a.equal(TAP.store.get().view, 'insights', 'the view stays');
      });
    });

    T.test('X-int-showme-clears', 'The highlight clears when the comparison or the view changes', function (a) {
      withApp(function () {
        var x = TAP.insights.all().filter(function (i) { return i.reportId === 'ind-quad'; })[0];
        reset();
        TAP.showme.go({ insightId: x.id });
        a.ok(TAP.store.get().highlight, 'highlight set');
        TAP.store.set({ cmp: { mode: 'one', focus: TAP.data.regions()[0].id } });
        a.equal(TAP.store.get().highlight, null, 'cleared by a comparison change');
        reset();
        TAP.showme.go({ insightId: x.id });
        TAP.store.set({ view: 'insights' });
        a.equal(TAP.store.get().highlight, null, 'cleared by a view change');
      });
    });

    T.test('X-int-showme-industry', 'On the Industry view, one named industry is selected too', function (a) {
      withApp(function () {
        var x = TAP.insights.all().filter(function (i) { return i.reportId && TAP.reports.get(i.reportId).view === 'industry' && i.industryIds.length === 1; })[0];
        reset();
        TAP.showme.go({ insightId: x.id });
        a.equal(TAP.store.get().industry, x.industryIds[0], 'industry selected');
      });
    });

    // D92: the Overview no longer lists top insights, so their Show me buttons are clicked on the Insights page instead
    T.test('X-int-showme-overview', 'Show me on the top-ranked insights, from the Insights page, lands on its chart', function (a) {
      withApp(function (root) {
        reset(null, 'insights');
        var top = TAP.insights.top(TAP.store.get().cmp, null, 3).map(function (x) { return x.id; });
        a.ok(top.length > 0, 'the sample data has top insights');
        top.forEach(function (id, i) {
          reset(null, 'insights');
          var btn = root.querySelector('.tap-ins__item[data-insight="' + id + '"] .tap-ins__showme');
          a.ok(!!btn, 'top insight ' + (i + 1) + ' has a Show me button');
          if (!btn) return;
          btn.click();
          a.equal(landed(root, TAP.insights.all().filter(function (x) { return x.id === id; })[0]), null, 'top insight ' + (i + 1));
        });
      });
    });

    T.test('X-int-showme-insights-page', 'Show me from the Insights page lands on its chart or details', function (a) {
      withApp(function (root) {
        reset();
        TAP.store.set({ view: 'insights' });
        var ids = qsa('.tap-ins__item', root).map(function (n) { return n.getAttribute('data-insight'); }), problems = [];
        a.equal(ids.length, TAP.insights.all().length, 'the page lists every insight');
        ids = oneOfEach().map(function (x) { return x.id; });
        ids.forEach(function (id) {
          reset();
          TAP.store.set({ view: 'insights' });
          root.querySelector('.tap-ins__item[data-insight="' + id + '"] .tap-ins__showme').click();
          var bad = landed(root, TAP.insights.all().filter(function (x) { return x.id === id; })[0]);
          if (bad) problems.push(bad);
        });
        a.deepEqual(problems, [], 'every item lands');
      });
    });

    T.test('X-int-showme-panel-list', 'Highlight on chart from a panel list draws, and widens when a region is inside a combined figure', function (a) {
      withApp(function (root) {
        reset();
        TAP.store.set({ view: 'industry' });
        var p = panelEl(root, 'ind-quad');
        p.querySelector('[data-action="insights"]').click();
        p = panelEl(root, 'ind-quad');
        p.querySelector('[data-action="select-insight"]').click();
        a.ok(drawn(root, 'ind-quad'), 'drawn on the quadrant');
        // A focus region no strategic plan insight names, so the insight's regions sit inside the combined rest. The
        // Outlook's strategic plan chart, as the Overview's ambition chart lists only broad insights (D119).
        var named = [];
        TAP.insights.ranked(null, { reportId: 'ol-strategic' }).forEach(function (i) { named = named.concat(i.regionIds); });
        var focus = TAP.data.regions().map(function (r) { return r.id; }).filter(function (id) { return named.indexOf(id) < 0; })[0];
        a.ok(focus, 'a region no strategic plan insight names: ' + focus);
        reset({ mode: 'one', focus: focus, restAgg: 'total' }, 'outlook');
        p = panelEl(root, 'ol-strategic');
        var btn = p.querySelector('[data-action="insights"]');
        a.ok(btn && !btn.disabled, 'the strategic plan chart has insights against the total of the rest');
        btn.click();
        panelEl(root, 'ol-strategic').querySelector('[data-action="select-insight"]').click();
        a.equal(TAP.store.get().cmp.mode, 'all', 'switched to All regions');
        a.ok(drawn(root, 'ol-strategic'), 'drawn on the strategic plan chart');
      });
    });

    T.test('X-int-showme-local', 'A new Show me replaces an insight picked from the panel list', function (a) {
      withApp(function (root) {
        reset();
        TAP.store.set({ view: 'industry' });
        var p = panelEl(root, 'ind-tiers');
        p.querySelector('[data-action="insights"]').click();
        panelEl(root, 'ind-tiers').querySelector('[data-action="select-insight"]').click();
        var other = TAP.insights.all().filter(function (i) { return i.reportId === 'ind-tiers' && i.highlight.mark === 'cell'; })[0];
        TAP.showme.go({ insightId: other.id });
        var strip = panelEl(root, 'ind-tiers').querySelector('.tap-panel__strip');
        a.ok(strip && strip.textContent.indexOf(TAP.content.text('panel.highlightedTarget')) >= 0, 'the strip names the Show me target');
        a.ok(qsa('.tap-tg__cell.is-hl', panelEl(root, 'ind-tiers')).length > 0, 'its cell is outlined');
      });
    });
    /* ---------- keys ---------- */

    function press(key, target, opts) {
      var e = new KeyboardEvent('keydown', Object.assign({ key: key, bubbles: true, cancelable: true }, opts || {}));
      (target || document.body).dispatchEvent(e);
      return e;
    }
    // The app with the keys bound; always unbound again.
    function withKeys(fn) {
      return withApp(function (root) {
        TAP.keys.bind();
        try { return fn(root); } finally { TAP.keys.unbind(); TAP.tour.stop(); TAP.glossary.close(); TAP.storage.remove('tour:done'); }
      });
    }

    T.test('X-int-keys-views', 'Number keys switch views in menu order; other digits and modifier keys do nothing', function (a) {
      // The keys only set the store: no app runs here, so the address bar is left alone. Chrome stops following the
      // address after about 200 changes in ten seconds, and later routing tests would see the old address.
      var keep = TAP.store.get().view;
      // Eleven with an extra section: it adds Other sections (Phase 3, US-3.2.2), Phase 4 adds Outlook and D96 Build
      // a chart. The sample itself has no extra section (D93), so the test section is added. Keys 1 to 9 open the
      // first nine items and 0 the tenth (D90); the eleventh, the Guide, has no key.
      TAP.data.load(window.T_WITH_EXTRA(sample()));
      TAP.keys.bind();
      try {
        var order = TAP.views.order();
        a.equal(order.length, 11, 'eleven items');
        a.equal(TAP.keys.viewFor('0'), order[9], 'key 0 is the tenth item, ' + order[9]);
        a.ok('0123456789'.split('').every(function (k) { return TAP.keys.viewFor(k) !== order[10]; }), 'no key opens the eleventh, ' + order[10]);
        order.slice(0, 9).reverse().forEach(function (id, i) {
          press(String(9 - i));
          a.equal(TAP.store.get().view, id, String(9 - i) + ' opens ' + id);
        });
        press('0');
        a.equal(TAP.store.get().view, order[9], '0 opens the tenth view, ' + order[9]);
        press('2', null, { ctrlKey: true });
        a.equal(TAP.store.get().view, order[9], 'Ctrl+2 is left to the browser');
      } finally {
        TAP.keys.unbind();
        TAP.store.set({ view: keep });
        TAP.data.load(T_FIXTURE('mini'));
      }
    });

    // Review fix #376 (SV-10): the Regions key opens the region picker, as the menu does (US-2.4.1)
    T.test('X-review-SV-10', 'The Regions number key opens the region picker, not the last profile', function (a) {
      withKeys(function (root) {
        var key = String(TAP.views.order().indexOf('regions') + 1), first = TAP.data.regions()[0].id;
        TAP.store.set({ view: 'regions', region: first });
        press('1');
        a.equal(TAP.store.get().view, TAP.views.order()[0], '1 leaves the profile');
        press(key);
        a.equal(TAP.store.get().view, 'regions', key + ' opens Regions');
        a.equal(TAP.store.get().region, null, 'on the picker');
        TAP.store.set({ region: first });
        press(key);
        a.equal(TAP.store.get().region, null, 'from a profile, the Regions key goes back to the picker, as the menu does');
        TAP.store.set({ view: 'overview' });
        root.querySelector('.tap-menu__item[data-view="regions"]').click();
        a.equal(TAP.store.get().region, null, 'the menu opens the picker too');
      });
    });

    T.test('X-int-keys-typing', 'Digits typed in a field never switch views', function (a) {
      withKeys(function (root) {
        var input = TAP.dom.el('input', { type: 'text' }), sel = TAP.dom.el('select', null, [TAP.dom.el('option', null, 'x')]);
        root.appendChild(input);
        root.appendChild(sel);
        var e = press('2', input);
        a.equal(TAP.store.get().view, 'overview', 'input: still on Overview');
        a.equal(e.defaultPrevented, false, 'the digit reaches the field');
        press('3', sel);
        a.equal(TAP.store.get().view, 'overview', 'select: still on Overview');
      });
    });

    T.test('X-int-keys-tour', 'While the tour is on, digits do nothing and Esc only ends the tour', function (a) {
      withKeys(function () {
        TAP.store.set({ view: 'industry' });
        TAP.tour.start();
        a.equal(TAP.store.get().view, 'overview', 'the tour starts on the Overview');
        press('2');
        a.equal(TAP.store.get().view, 'overview', 'digit ignored during the tour');
        TAP.layers.open('details', { target: { reportId: null, regionIds: [TAP.data.regions()[0].id] } });
        press('Escape');
        a.equal(document.querySelector('.tap-tour'), null, 'Esc ends the tour');
        a.equal(TAP.layers.top(), 'details', 'and leaves the side panel');
      });
    });

    T.test('X-int-keys-esc', 'One Esc order: glossary popover, side panel, expanded chart', function (a) {
      withKeys(function (root) {
        TAP.store.set({ view: 'industry' });
        TAP.store.set({ expanded: 'ind-quad' });
        TAP.layers.openDetails({ reportId: 'ind-quad', regionIds: [TAP.data.regions()[0].id], industryIds: [] });
        var anchor = root.querySelector('.tap-term') || root.querySelector('h1');
        TAP.glossary.popover(Object.keys(TAP.content.terms())[0], anchor);
        a.ok(document.querySelector('.tap-popover'), 'popover open');
        press('Escape');
        a.equal(document.querySelector('.tap-popover'), null, '1st Esc: popover closed');
        a.equal(TAP.layers.top(), 'details', '1st Esc: side panel still open');
        a.equal(TAP.store.get().expanded, 'ind-quad', '1st Esc: chart still expanded');
        press('Escape');
        a.equal(TAP.layers.top(), null, '2nd Esc: side panel closed');
        a.equal(TAP.store.get().expanded, 'ind-quad', '2nd Esc: chart still expanded');
        press('Escape');
        a.equal(TAP.store.get().expanded, null, '3rd Esc: expanded chart closed');
        a.equal(TAP.store.get().view, 'industry', 'the view stays');
      });
    });

    T.test('X-int-keys-esc-menu', 'A panel menu takes Esc before the expanded chart', function (a) {
      withKeys(function (root) {
        TAP.store.set({ view: 'industry' });
        TAP.store.set({ expanded: 'ind-tiers' });
        panelEl(root, 'ind-tiers').querySelector('[data-action="type"]').click();
        a.ok(panelEl(root, 'ind-tiers').querySelector('.tap-panel__pop'), 'chart type menu open');
        press('Escape');
        a.equal(panelEl(root, 'ind-tiers').querySelector('.tap-panel__pop'), null, 'menu closed');
        a.equal(TAP.store.get().expanded, 'ind-tiers', 'chart still expanded');
        press('Escape');
        a.equal(TAP.store.get().expanded, null, 'then the chart closes');
      });
    });

    T.test('X-int-keys-arrows', 'Left and right step through the expanded charts of the view, and wrap', function (a) {
      withKeys(function (root) {
        TAP.store.set({ view: 'industry' });
        TAP.store.set({ expanded: 'ind-tiers' });
        var seen = [];
        for (var i = 0; i < 3; i++) { press('ArrowRight'); seen.push(TAP.store.get().expanded); }
        a.deepEqual(seen, ['ind-quad', 'ind-ratings', 'ind-tiers'], 'right steps in page order and wraps');
        press('ArrowLeft');
        a.equal(TAP.store.get().expanded, 'ind-ratings', 'left steps back and wraps');
        a.ok(panelEl(root, 'ind-ratings').classList.contains('tap-panel--expanded'), 'that panel is drawn expanded');
        var sel = panelEl(root, 'ind-ratings').querySelector('select');
        if (sel) { press('ArrowRight', sel); a.equal(TAP.store.get().expanded, 'ind-ratings', 'arrows in a select stay in the select'); }
        TAP.store.set({ view: 'overview' });
        a.equal(TAP.store.get().expanded, null, 'a view change closes the expanded chart');
        TAP.store.set({ expanded: 'ov-ambition' });
        press('ArrowRight');
        a.equal(TAP.store.get().expanded, 'ov-ambition', 'a view with one chart stays on it');
      });
    });

    // Debt #369 (PP-15): the keys use the panel's shared helpers rather than copies of their own
    T.test('X-review-PP-15-keys', 'The view keys ask TAP.panelKeys.typing and close an expanded chart with TAP.panelExpand.collapse', function (a) {
      withKeys(function () {
        var realTyping = TAP.panelKeys.typing, realCollapse = TAP.panelExpand.collapse, collapsed = 0;
        TAP.panelKeys.typing = function () { return true; };
        TAP.panelExpand.collapse = function () { collapsed++; return realCollapse.apply(this, arguments); };
        try {
          press('2');
          a.equal(TAP.store.get().view, TAP.views.order()[0], 'a key the shared helper says is typed text switches nothing');
          TAP.panelKeys.typing = realTyping;
          // A chart not on this view, so no panel takes the Esc first and the view keys close it
          TAP.store.set({ expanded: 'ind-tiers' });
          press('Escape');
          a.equal(collapsed, 1, 'Esc closes the expanded chart through the shared helper');
          a.equal(TAP.store.get().expanded, null, 'and it is closed');
        } finally { TAP.panelKeys.typing = realTyping; TAP.panelExpand.collapse = realCollapse; }
      });
    });

    T.test('X-int-keys-unbind', 'After unbind, the digits do nothing; bind twice listens once', function (a) {
      withKeys(function () {
        TAP.keys.bind();
        press('2');
        a.equal(TAP.store.get().view, TAP.views.order()[1], 'bound twice: one switch');
        TAP.keys.unbind();
        press('3');
        a.equal(TAP.store.get().view, TAP.views.order()[1], 'unbound: nothing');
        a.equal(TAP.keys.viewFor('1'), TAP.views.order()[0], 'viewFor maps the digit');
        a.equal(TAP.keys.viewFor('x'), null, 'viewFor ignores other keys');
      });
    });
    /* ---------- QA batch layout checks (D24 sizes, one-row toolbars, narrow grids) ---------- */

    function px(node, prop) { return parseFloat(getComputedStyle(node)[prop]); }

    T.test('X-int-qa7-card-notes', 'QA-7: the card notes on how figures combine, and partial notes, are body text (16 px)', function (a) {
      withApp(function () {
        // The Overview always shows every region (D118), so the cards for a focus region are drawn on their own
        var host = T.dom.mount();
        host.className = 'tap-ov-cards';
        TAP.overviewCards.render(host, Object.assign(TAP.store.defaults().cmp, { mode: 'one', focus: 'ceu' }));
        var how = host.querySelectorAll('.tap-ov-card__how'), part = host.querySelectorAll('.tap-ov-card__partial');
        a.ok(how.length > 0 && part.length > 0, 'both notes are on screen (Central Europe has no customer growth)');
        Array.prototype.forEach.call(how, function (n) { a.ok(px(n, 'fontSize') >= 16, 'how-combined note at ' + px(n, 'fontSize') + ' px'); });
        Array.prototype.forEach.call(part, function (n) { a.ok(px(n, 'fontSize') >= 16, 'partial note at ' + px(n, 'fontSize') + ' px'); });
      });
    });

    T.test('X-int-qa10-toolbar', 'QA-10: a half-width panel keeps its toolbar on one row, and every tool keeps a spoken name', function (a) {
      withApp(function (root) {
        // Since D105 every Market coverage chart is full width, so the half-width panels are those of a paired view
        TAP.store.set({ view: 'customers' });
        var halves = qsa('.tap-vh-pair .tap-panel', root).map(function (n) { return n.getAttribute('data-report'); });
        a.ok(halves.length >= 2, 'the Customer growth view pairs its charts (' + halves.join(', ') + ')');
        halves.forEach(function (id) {
          var p = panelEl(root, id), tops = qsa('.tap-panel__tools > .tap-panel__tool', p).map(function (b) { return Math.round(b.getBoundingClientRect().top); });
          a.ok(p.getBoundingClientRect().width < 44 * 16, id + ' is a half-width panel (' + Math.round(p.getBoundingClientRect().width) + ' px)');
          a.equal(tops.filter(function (t) { return Math.abs(t - tops[0]) > 8; }).length, 0, id + ': one row of tools (' + tops.join(', ') + ')');
          ['about', 'table'].forEach(function (act) {
            var b = p.querySelector('[data-action="' + act + '"]');
            a.ok(b.querySelector('.tap-icon'), id + ' ' + act + ': the icon shows');
            a.ok((b.getAttribute('aria-label') || b.textContent).trim().length > 2, id + ' ' + act + ': it still has a name');
          });
        });
        TAP.store.set({ view: 'industry' });
        ['ind-tiers', 'ind-quad', 'ind-ratings'].forEach(function (id) {
          var wide = panelEl(root, id).querySelector('[data-action="table"] > span:not(.tap-icon)');
          a.ok(wide.getBoundingClientRect().width > 20, id + ': a full-width panel keeps the words');
        });
      });
    });

    T.test('X-int-qa8-qa9-grid', 'QA-8, QA-9: tier-grid column names stay apart, and a narrow grid shows a dash for not provided', function (a) {
      withApp(function (root) {
        TAP.store.set({ view: 'industry' });
        var cols = qsa('.tap-tg__col', panelEl(root, 'ind-tiers'));
        a.ok(cols.length >= 7, 'a column per region');
        cols.forEach(function (c) { a.ok(px(c, 'paddingRight') >= 4, c.textContent + ': space before the next name'); });
        var host = panelEl(root, 'ind-tiers').parentNode;
        host.style.width = '700px';
        var np = panelEl(root, 'ind-tiers').querySelector('.tap-tg__cell--np');
        a.ok(np, 'a not-provided cell (the sample has one)');
        a.ok(getComputedStyle(np.querySelector('.tap-tg__npdash')).display !== 'none', 'narrow: the dash shows');
        a.ok(np.querySelector('.tap-tg__npword').getBoundingClientRect().width <= 1, 'narrow: the words are visually hidden');
        a.ok(np.scrollWidth <= np.clientWidth + 1, 'nothing overflows the cell');
        a.ok(/not provided/i.test(np.getAttribute('aria-label')), 'the cell still says not provided to a screen reader');
        host.style.width = '';
        a.equal(getComputedStyle(np.querySelector('.tap-tg__npdash')).display, 'none', 'wide: no dash');
      });
    });

    T.test('X-int-qa13-guide-bar', 'QA-13, D116: on the Guide the comparison bar shrinks to its buttons; other views keep it whole', function (a) {
      withApp(function (root) {
        TAP.store.set({ view: 'industry', cmp: { mode: 'one', focus: TAP.data.regions()[0].id } });
        var bar = root.querySelector('.tap-cmp'), controls = bar.querySelector('.tap-cmp__controls');
        var full = bar.getBoundingClientRect().height;
        a.ok(controls.getBoundingClientRect().height > 0, 'Market coverage: the controls show');
        TAP.store.set({ view: 'guide' });
        a.equal(controls.getBoundingClientRect().height, 0, 'Guide: the controls are hidden');
        a.ok(bar.querySelector('.tap-cmp__sentence').textContent.length > 0, 'Guide: screen readers still have the sentence');
        a.ok(bar.querySelector('.tap-cmp__date').getBoundingClientRect().height > 0, 'Guide: the Data button stays');
        var slim = bar.getBoundingClientRect().height;
        a.ok(slim <= full && slim <= 64, 'Guide: only the buttons (' + Math.round(slim) + ' of ' + Math.round(full) + ' px)');
        TAP.store.set({ view: 'insights' });
        a.ok(controls.getBoundingClientRect().height > 0, 'Insights follows the comparison: the controls are back');
      });
    });

    // The page edge is 3% of the window (css/shell.css); a test sandbox has a narrower window, so set it as on a real screen.
    function screen(root, w) { root.style.width = w + 'px'; root.style.setProperty('--tap-edge', Math.max(24, Math.min(48, w * 0.03)) + 'px'); }
    // Regions by name length, longest first: the widest pickers the sample data can make.
    function longest() {
      return TAP.data.regions().slice().sort(function (x, y) { return TAP.content.regionName(y).length - TAP.content.regionName(x).length; })
        .map(function (r) { return r.id; });
    }
    function visible(n) { var r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
    // Groups the bar's visible parts into rows by their vertical middle.
    function barRows(bar) {
      var parts = qsa('.tap-cmp__title, .tap-cmp__mode, .tap-cmp__label, .tap-cmp__select, [data-picker] .tap-seg, .tap-cmp__setbtn, ' +
        '.tap-cmp__explain, .tap-cmp__date', bar).filter(visible);
      var rows = [];
      parts.forEach(function (n) {
        var r = n.getBoundingClientRect(), mid = (r.top + r.bottom) / 2;
        var row = rows.filter(function (x) { return Math.abs(x.mid - mid) <= 12; })[0];
        if (row) row.parts.push(n); else rows.push({ mid: mid, parts: [n] });
      });
      return rows.sort(function (x, y) { return x.mid - y.mid; });
    }

    T.test('X-int-qa11-bar-rows', 'QA-11, D116: at 1280 px the comparison bar is one row, or two when One vs the rest needs the room', function (a) {
      withApp(function (root) {
        screen(root, 1280);
        TAP.store.set({ view: 'industry' });   // the Overview has no comparison (D118)
        var ids = longest(), bar = root.querySelector('.tap-cmp');
        var cases = {
          all: { mode: 'all' },
          one: { mode: 'one', focus: ids[0], restAs: 'combined', restAgg: 'average' },
          set: { mode: 'set', set: ids.slice(0, 3) },
          setOne: { mode: 'set', set: ids.slice(0, 1) },
          oneTotal: { mode: 'one', focus: ids[0], restAs: 'combined', restAgg: 'total' }
        };
        Object.keys(cases).forEach(function (m) {
          TAP.store.set({ cmp: cases[m] });
          var rows = barRows(bar), h = Math.round(bar.getBoundingClientRect().height);
          a.ok(rows.length <= (m.indexOf('one') === 0 ? 2 : 1), m + ': ' + rows.length + ' rows');
          a.ok(rows[0].parts.indexOf(bar.querySelector('.tap-cmp__mode')) >= 0, m + ': the modes lead the first row');
          a.ok(rows[rows.length - 1].parts.indexOf(bar.querySelector('.tap-cmp__date')) >= 0, m + ': the Data button on the last row');
          a.ok(h <= (m.indexOf('one') === 0 ? 120 : 70), m + ': the bar is ' + h + ' px high (was about 220 in one vs the rest)');
        });
        // Every region in the set: the button only counts them, so the controls stay one line
        TAP.store.set({ cmp: { mode: 'set', set: ids.slice() } });
        var controls = bar.querySelector('.tap-cmp__controls').getBoundingClientRect().height;
        a.ok(controls <= 48, 'set of all ' + ids.length + ' regions: the controls are ' + Math.round(controls) + ' px, one line');
      });
    });

    T.test('X-int-qa11-first-screen', 'QA-11: at 853 x 533 the first panel of the Overview and the Industry view starts on the first screen', function (a) {
      withApp(function (root) {
        screen(root, 853);
        var screenH = 533, ids = longest();
        [{ mode: 'one', focus: ids[0], restAs: 'combined', restAgg: 'average' }, { mode: 'set', set: ids.slice(0, 3) }].forEach(function (c) {
          ['overview', 'industry'].forEach(function (view) {
            TAP.store.set({ cmp: c });
            TAP.store.set({ view: view });
            // The Overview's first block after its headline; the Industry view's first report panel.
            var first = root.querySelector('.tap-view .tap-panel, .tap-view [data-part]:not([data-part="headline"])');
            var top = Math.round(first.getBoundingClientRect().top - root.getBoundingClientRect().top);
            a.ok(top + 48 <= screenH, view + ', ' + c.mode + ': the first panel starts at ' + top + ' px, with its heading above ' + screenH);
          });
        });
      });
    });

    T.test('X-int-qa11-title-gap', 'QA-11: no large gap between the comparison bar and the view title', function (a) {
      withApp(function (root) {
        screen(root, 1280);
        var bar = root.querySelector('.tap-cmp');
        [['overview', '.tap-ov__title'], ['industry', '.tap-ind__head'], ['insights', '.tap-ins__head']].forEach(function (v) {
          TAP.store.set({ view: v[0] });
          var gap = Math.round(root.querySelector(v[1]).getBoundingClientRect().top - bar.getBoundingClientRect().bottom);
          a.ok(gap >= 8 && gap <= 32, v[0] + ': ' + gap + ' px from the bar to the title');
        });
      });
    });

    /* ---------- test hygiene (polish f) ---------- */

    T.test('X-int-hygiene-view-and-cmp', 'Changing view and comparison in one step leaves the old view silent', function (a) {
      withApp(function (root) {
        var calls = 0, keep = TAP.insights.top;
        TAP.store.set({ view: 'overview' });
        TAP.insights.top = function () { calls++; return keep.apply(TAP.insights, arguments); };
        try {
          TAP.store.set({ view: 'guide', cmp: { mode: 'one', focus: TAP.data.regions()[0].id } });   // one update: the Overview is destroyed during it
          calls = 0;
          TAP.store.set({ cmp: { mode: 'all' } });
          a.equal(calls, 0, 'the destroyed Overview no longer asks for insights');
        } finally { TAP.insights.top = keep; }
      });
    });

    T.test('X-int-hygiene-views', 'Polish (f): a view taken off the page without destroy() stops redrawing and asking for insights', function (a) {
      ['overview', 'industry', 'insights'].forEach(function (id) {
        var host = T.dom.mount();
        TAP.views.get(id).mount(host);
        host.parentNode.removeChild(host);
        var calls = 0, keep = { top: TAP.insights.top, ranked: TAP.insights.ranked };
        TAP.insights.top = function () { calls++; return keep.top.apply(TAP.insights, arguments); };
        TAP.insights.ranked = function () { calls++; return keep.ranked.apply(TAP.insights, arguments); };
        try {
          TAP.store.set({ cmp: { mode: 'one', focus: TAP.data.regions()[0].id } });   // the first change tells it that it is gone
          calls = 0;
          TAP.store.set({ cmp: { mode: 'all' } });
          TAP.store.set({ hiddenInsights: ['x:y'] });
          a.equal(calls, 0, id + ': no more insight queries once it is off the page');
        } finally { TAP.insights.top = keep.top; TAP.insights.ranked = keep.ranked; TAP.store.set({ hiddenInsights: [] }); }
      });
    });

    T.test('X-int-hygiene-highlight', 'A highlight for one chart redraws only that chart', function (a) {
      withApp(function (root) {
        reset(null, 'industry');
        var drawn = {};
        ['ind-tiers', 'ind-quad', 'ind-ratings'].forEach(function (id) { drawn[id] = panelEl(root, id).querySelector('.tap-panel__head'); });
        TAP.store.set({ highlight: { reportId: 'ind-quad', regionIds: [], industryIds: [TAP.data.industries({ rated: true })[0].id], mark: 'points' } });
        a.equal(panelEl(root, 'ind-tiers').querySelector('.tap-panel__head'), drawn['ind-tiers'], 'the tier grid was not redrawn');
        a.equal(panelEl(root, 'ind-ratings').querySelector('.tap-panel__head'), drawn['ind-ratings'], 'the ratings were not redrawn');
        a.ok(panelEl(root, 'ind-quad').querySelector('.tap-panel__head') !== drawn['ind-quad'], 'the quadrant was redrawn');
        a.ok(drawnHl(root, 'ind-quad'), 'and shows the highlight');
        TAP.store.set({ highlight: null });
        a.ok(!panelEl(root, 'ind-quad').querySelector('.tap-panel__strip'), 'clearing it redraws the quadrant without the strip');
      });
    });
  });
})(window.TAP);
