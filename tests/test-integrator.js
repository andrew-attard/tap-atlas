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
    (list || TAP.insights.all()).forEach(function (x) {
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
        a.equal(all.length, 37, 'the sample data has 37 insights');
        a.ok(all.some(function (x) { return !x.reportId; }) && all.some(function (x) { return x.reportId; }), 'both kinds are covered');
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

    T.test('X-int-showme-combined', 'From the organization total or one region against the rest, every insight still lands', function (a) {
      withApp(function (root) {
        a.ok(oneOfEach().length >= 6, 'every chart and kind of highlight is covered');
        a.deepEqual(everyInsight(root, { mode: 'org' }, oneOfEach()), [], 'organization total');
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
        var x = TAP.insights.all().filter(function (i) { return !i.reportId; })[0];
        reset(null, 'insights');
        var r = TAP.showme.go({ insightId: x.id, target: x.highlight });
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
        TAP.store.set({ cmp: { mode: 'org' } });
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

    T.test('X-int-showme-overview', 'Show me from the Overview top insights lands on its chart', function (a) {
      withApp(function (root) {
        reset(null, 'overview');
        var n = qsa('.tap-ov-insight__show', root).length;
        a.ok(n > 0, 'the Overview lists top insights');
        for (var i = 0; i < n; i++) {
          reset(null, 'overview');
          var btn = qsa('.tap-ov-insight__show', root)[i], id = btn.closest('[data-insight]').getAttribute('data-insight');
          btn.click();
          a.equal(landed(root, TAP.insights.all().filter(function (x) { return x.id === id; })[0]), null, 'top insight ' + (i + 1));
        }
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
        reset({ mode: 'org' }, 'overview');
        p = panelEl(root, 'ov-ambition');
        var btn = p.querySelector('[data-action="insights"]');
        a.ok(btn && !btn.disabled, 'the ambition chart has insights in the organization total');
        btn.click();
        panelEl(root, 'ov-ambition').querySelector('[data-action="select-insight"]').click();
        a.equal(TAP.store.get().cmp.mode, 'all', 'switched to All regions');
        a.ok(drawn(root, 'ov-ambition'), 'drawn on the ambition chart');
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
  });
})(window.TAP);
