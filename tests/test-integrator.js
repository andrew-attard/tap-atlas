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

    T.test('X-int-keys-views', '1 to 4 switch views in menu order; other digits and modifier keys do nothing', function (a) {
      withKeys(function () {
        var order = TAP.views.order();
        a.equal(order.length, 4, 'four views');
        order.slice().reverse().forEach(function (id, i) {
          press(String(order.length - i));
          a.equal(TAP.store.get().view, id, String(order.length - i) + ' opens ' + id);
        });
        press('5');
        a.equal(TAP.store.get().view, order[0], '5 does nothing');
        press('2', null, { ctrlKey: true });
        a.equal(TAP.store.get().view, order[0], 'Ctrl+2 is left to the browser');
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
      withApp(function (root) {
        TAP.store.set({ cmp: { mode: 'one', focus: 'ceu' } });
        var how = root.querySelectorAll('.tap-ov-card__how'), part = root.querySelectorAll('.tap-ov-card__partial');
        a.ok(how.length > 0 && part.length > 0, 'both notes are on screen (Central Europe has no customer growth)');
        Array.prototype.forEach.call(how, function (n) { a.ok(px(n, 'fontSize') >= 16, 'how-combined note at ' + px(n, 'fontSize') + ' px'); });
        Array.prototype.forEach.call(part, function (n) { a.ok(px(n, 'fontSize') >= 16, 'partial note at ' + px(n, 'fontSize') + ' px'); });
      });
    });

    T.test('X-int-qa10-toolbar', 'QA-10: a half-width panel keeps its toolbar on one row, and every tool keeps a spoken name', function (a) {
      withApp(function (root) {
        TAP.store.set({ view: 'industry' });
        ['ind-quad', 'ind-ratings'].forEach(function (id) {
          var p = panelEl(root, id), tops = qsa('.tap-panel__tools > .tap-panel__tool', p).map(function (b) { return Math.round(b.getBoundingClientRect().top); });
          a.ok(p.getBoundingClientRect().width < 44 * 16, id + ' is a half-width panel (' + Math.round(p.getBoundingClientRect().width) + ' px)');
          a.equal(tops.filter(function (t) { return Math.abs(t - tops[0]) > 8; }).length, 0, id + ': one row of tools (' + tops.join(', ') + ')');
          ['about', 'table'].forEach(function (act) {
            var b = p.querySelector('[data-action="' + act + '"]');
            a.ok(b.querySelector('.tap-icon'), id + ' ' + act + ': the icon shows');
            a.ok((b.getAttribute('aria-label') || b.textContent).trim().length > 2, id + ' ' + act + ': it still has a name');
          });
        });
        var wide = panelEl(root, 'ind-tiers').querySelector('[data-action="table"] > span:not(.tap-icon)');
        a.ok(wide.getBoundingClientRect().width > 20, 'a full-width panel keeps the words');
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

    T.test('X-int-qa13-guide-bar', 'QA-13: on the Guide the comparison bar shrinks to its sentence line; other views keep it whole', function (a) {
      withApp(function (root) {
        TAP.store.set({ cmp: { mode: 'one', focus: TAP.data.regions()[0].id } });
        var bar = root.querySelector('.tap-cmp'), controls = bar.querySelector('.tap-cmp__row--controls');
        var full = bar.getBoundingClientRect().height;
        a.ok(controls.getBoundingClientRect().height > 0, 'Overview: the controls show');
        TAP.store.set({ view: 'guide' });
        a.equal(controls.getBoundingClientRect().height, 0, 'Guide: the controls are hidden');
        a.ok(bar.querySelector('.tap-cmp__sentence').textContent.length > 0, 'Guide: the sentence stays');
        a.ok(bar.querySelector('.tap-cmp__date').getBoundingClientRect().height > 0, 'Guide: the data date stays');
        a.ok(bar.getBoundingClientRect().height < full / 2, 'Guide: under half the height (' + Math.round(bar.getBoundingClientRect().height) + ' of ' + Math.round(full) + ' px)');
        TAP.store.set({ view: 'insights' });
        a.ok(controls.getBoundingClientRect().height > 0, 'Insights follows the comparison: the controls are back');
      });
    });
  });
})(window.TAP);
