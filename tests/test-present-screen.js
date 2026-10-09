/*
 * File: tests/test-present-screen.js
 * Purpose: Tests for presenting the screen (D141, #570): Present and P show the charts on the page as they are, in
 *          screen order, then a marker step continues to the next page in menu order, or the next region on a profile.
 * Provides: test cases X-screen-* for the PRESENT stream
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures, data/sample-plan-data.js,
 *             config/running-order.js
 * Used by: tests.html
 * Owner: PRESENT stream
 */
(function (TAP) {
  'use strict';

  function sample() { return JSON.parse(JSON.stringify(window.PLAN_DATA)); }
  function text(n) { return (n && n.textContent) || ''; }

  // The app on the sample data, keys bound; presentation always left and the mini fixture back afterwards.
  function withApp(fn, plan) {
    var root = T.dom.mount(), file = window.TAP_RUNNING_ORDER.steps;
    TAP.app.start({ root: root, plan: plan || sample() });
    TAP.insights.reset();
    try { return fn(root); } finally {
      window.TAP_RUNNING_ORDER.steps = file;
      try { TAP.layers.close(); } catch (e) { /* none open */ }
      TAP.app.stop();
      TAP.notes.clear('presentation');
      TAP.data.load(T_FIXTURE('mini'));
      TAP.insights.reset();
    }
  }
  function press(key, target) {
    var e = new KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true });
    (target || document.body).dispatchEvent(e);
    return e;
  }
  function click(node) { if (node) node.click(); return node; }
  function choose(sel, value) { if (sel) { sel.value = value; sel.dispatchEvent(new Event('change')); } }
  function layer() { return document.querySelector('.tap-present'); }
  function marker() { return document.querySelector('.tap-present .tap-present__marker'); }
  function shown() { return document.querySelector('.tap-present .tap-panel'); }
  function cur() { return TAP.present.current(); }
  function n() { var c = cur(); return c ? c.n : null; }
  function nextBtn() { return document.querySelector('.tap-present [data-present="next"]'); }
  function pressed(panel, key) {
    var b = panel && panel.querySelector('[data-control="' + key + '"] [aria-pressed="true"]');
    return b ? b.getAttribute('data-value') : null;
  }
  function viewPanel(root, id) { return root.querySelector('.tap-view .tap-panel[data-report="' + id + '"]'); }
  function regionName(id) { return TAP.content.regionName(TAP.data.region(id)); }
  function ids(steps) { return steps.map(function (s) { return s.reportId; }); }
  // Walks to the marker after the page's charts: Next on each chart step
  function toMarker() { var guard = 0; while (!marker() && guard++ < 20) TAP.present.next(); return marker(); }

  // Customer growth as the sample shows it: the five reports of config/views.js, in that order
  var CG = ['cg-segments', 'cg-growth', 'cg-exposure', 'cg-bubble', 'cg-accounts'];

  T.suite('present-screen', function () {

    T.test('X-screen-order', 'Present shows the charts of Customer growth in screen order, then a marker for Partners', function (a) {
      withApp(function () {
        TAP.store.set({ view: 'customers' });
        var pg = TAP.presentScreen.page();
        a.deepEqual(ids(pg.steps), CG, 'the five charts in screen order');
        a.equal(pg.startAt, 0, 'nothing expanded: starts at the first');
        a.deepEqual(pg.next, { view: 'partners' }, 'the next page is Partners');
        var res = TAP.present.startScreen();
        a.ok(res.started && TAP.present.active(), 'presentation mode starts');
        a.equal(res.total, 5, 'five charts');
        var seen = [];
        for (var i = 0; i < 5; i++) { seen.push(cur().reportId); a.equal(cur().total, 5, 'the count is over the charts'); TAP.present.next(); }
        a.deepEqual(seen, CG, 'shown in that order');
        a.ok(marker(), 'after the last chart: the marker on the stage');
        a.ok(!shown(), 'with no panel');
        a.equal(cur().kind, 'marker', 'current() says so');
        a.equal(cur().title, TAP.content.text('present.nextPage', { name: 'Partners' }), 'titled "Next: Partners"');
        a.equal(text(marker().querySelector('.tap-present__marker-title')), cur().title, 'the title on the stage');
        a.equal(text(marker().querySelector('.tap-present__marker-hint')), TAP.content.text('present.markerHint'), 'and the hint line');
        a.equal(TAP.store.get().expanded, null, 'nothing expanded behind it');
        a.ok(nextBtn() && !nextBtn().disabled, 'Next is enabled on the marker');
        a.ok(text(document.querySelector('.tap-present__where')).indexOf(cur().title) >= 0, 'the progress row shows the marker title');
      });
    });

    T.test('X-screen-settings', 'A chart presents with the measure, chart type, breakdown and own comparison chosen on the panel behind', function (a) {
      withApp(function (root) {
        TAP.store.set({ view: 'customers' });
        var ex = viewPanel(root, 'cg-exposure'), gr = viewPanel(root, 'cg-growth');
        click(ex.querySelector('[data-control="measure"] [data-value="cg.riskShare"]'));
        click(ex.querySelector('[data-action="type"]'));
        click(ex.querySelector('[data-type="dot"]'));
        click(gr.querySelector('[data-control="breakdown"] [data-value="none"]'));
        click(gr.querySelector('[data-action="more"]'));
        click(gr.querySelector('[data-action="compare"]'));
        choose(gr.querySelector('select[data-control="cmp-mode"]'), 'one');
        choose(gr.querySelector('select[data-control="cmp-focus"]'), 'mea');
        a.ok(gr.querySelector('.tap-panel__custom'), 'cg-growth has its own comparison');
        var steps = TAP.presentScreen.page().steps;
        a.deepEqual([steps[2].initial.measureId, steps[2].initial.type], ['cg.riskShare', 'dot'], 'cg-exposure: the measure and type chosen');
        a.equal(steps[1].initial.breakdown, 'none', 'cg-growth: no breakdown, as chosen');
        a.deepEqual([steps[1].cmp.mode, steps[1].cmp.focus], ['one', 'mea'], 'cg-growth: its own comparison');
        a.equal(steps[0].cmp.mode, 'all', 'cg-segments: the shared comparison, all regions');
        TAP.present.startScreen();
        TAP.present.next();
        var p = shown();
        a.equal(p && p.getAttribute('data-report'), 'cg-growth', 'step 2 is cg-growth');
        a.equal(pressed(p, 'breakdown'), 'none', 'shown with no breakdown');
        a.equal(text(p.querySelector('.tap-panel__expand-sentence')), TAP.scope.sentence(steps[1].cmp), 'and its own comparison');
        TAP.present.next();
        p = shown();
        a.equal(pressed(p, 'measure'), 'cg.riskShare', 'step 3 on the risk share');
        a.deepEqual(TAP.store.get().cmp, TAP.store.defaults().cmp, 'the shared comparison is never written (D74)');
      });
    });

    T.test('X-screen-start-expanded', 'Present starts at the expanded chart; leaving without a move puts the page back', function (a) {
      withApp(function () {
        TAP.store.set({ view: 'customers' });
        TAP.store.set({ expanded: 'cg-exposure' });
        a.equal(TAP.presentScreen.page().startAt, 2, 'the expanded chart is step 3');
        TAP.present.startScreen();
        a.equal(cur().reportId, 'cg-exposure', 'starts there');
        a.equal(n(), 3, 'as step 3');
        TAP.present.prev();
        a.equal(cur().reportId, 'cg-growth', 'Back goes to the chart before it');
        TAP.present.stop();
        a.ok(!TAP.present.active(), 'left');
        a.equal(TAP.store.get().view, 'customers', 'the page as before');
        a.equal(TAP.store.get().expanded, 'cg-exposure', 'with the chart expanded as before');
      });
    });

    T.test('X-screen-continue', 'The marker continues to Partners with a one-region selection kept; Leave then stays there', function (a) {
      withApp(function () {
        var one = Object.assign(TAP.store.defaults().cmp, { mode: 'set', set: ['na'] });
        TAP.store.set({ view: 'customers', cmp: one });
        TAP.present.startScreen();
        a.ok(toMarker(), 'at the marker');
        a.ok(TAP.present.next(), 'Next on the marker continues');
        a.equal(TAP.store.get().view, 'partners', 'the Partners view');
        a.equal(TAP.app.current(), 'partners', 'is on screen');
        a.ok(TAP.present.active() && layer(), 'presentation mode goes on');
        a.equal(cur().reportId, 'pt-reliance', 'at the first chart of Partners');
        a.equal(n(), 1, 'as step 1');
        a.deepEqual(cur().page, { view: 'partners', region: null }, 'current() names the page');
        a.deepEqual(TAP.store.get().cmp, one, 'the selection is kept');
        a.deepEqual(TAP.presentScreen.page().steps[0].cmp.set, ['na'], 'and the charts present with it');
        a.ok(shown() && shown().classList.contains('tap-panel--expanded'), 'in the expanded panel');
        TAP.present.stop();
        a.ok(!TAP.present.active() && !layer(), 'left');
        a.equal(TAP.store.get().view, 'partners', 'stays on Partners');
        a.equal(TAP.store.get().expanded, null, 'with nothing expanded');
        a.ok(TAP.panelKeys.enabled, 'the panel keys are on again');
        a.equal(window.scrollY, 0, 'at the top of the page');
      });
    });

    T.test('X-screen-profile', 'A region profile presents every chart one against the rest, then continues to the next region', function (a) {
      withApp(function () {
        TAP.store.set({ view: 'regions', region: 'na' });
        var pg = TAP.presentScreen.page();
        a.deepEqual(ids(pg.steps), TAP.profile.rows().reduce(function (all, r) { return all.concat(r); }, []), 'the profile reports, in page order');
        a.ok(ids(pg.steps).indexOf('ov-ambition') >= 0, 'the ambition chart among them');
        pg.steps.forEach(function (s) {
          a.deepEqual([s.cmp.mode, s.cmp.focus], ['one', 'na'], s.reportId + ': one against the rest, this region (D62)');
        });
        a.deepEqual(pg.next, { view: 'regions', region: 'latam' }, 'the next page is the next region in file order');
        TAP.present.startScreen();
        a.ok(toMarker(), 'the marker after the last chart');
        a.equal(cur().title, TAP.content.text('present.nextPage', { name: regionName('latam') }), 'names the next region');
        TAP.present.next();
        a.deepEqual([TAP.store.get().view, TAP.store.get().region], ['regions', 'latam'], 'continues to that region');
        a.equal(cur().reportId, pg.steps[0].reportId, 'at its first chart');
        a.deepEqual([TAP.presentScreen.page().steps[0].cmp.mode, TAP.presentScreen.page().steps[0].cmp.focus], ['one', 'latam'], 'against the rest');
        TAP.present.stop();
        a.equal(TAP.store.get().region, 'latam', 'Leave stays on the region reached');
        TAP.store.set({ region: 'apac' });
        a.equal(TAP.presentScreen.nextOf(TAP.store.get()), null, 'the last region: nothing after it');
        TAP.present.startScreen();
        var total = cur().total;
        for (var i = 1; i < total; i++) TAP.present.next();
        a.equal(TAP.present.next(), false, 'no marker after the last chart');
        a.ok(!marker(), 'none on the stage');
      });
    });

    T.test('X-screen-nothing', 'Insights, the Guide and the Regions picker have nothing to present: the button says so, no layer', function (a) {
      withApp(function (root) {
        [{ view: 'insights' }, { view: 'guide' }, { view: 'regions', region: null }].forEach(function (state) {
          TAP.store.set(state);
          var res = TAP.present.startScreen();
          a.deepEqual([res.started, res.reason], [false, 'none'], state.view + ': not started');
          a.equal(res.message, TAP.content.text('present.nothingOnPage'), state.view + ': the message');
          click(root.querySelector('.tap-present__button'));
          a.ok(!TAP.present.active() && !layer(), state.view + ': the button starts nothing');
          a.equal(text(root.querySelector('.tap-present__msg')), TAP.content.text('present.nothingOnPage'), state.view + ': the button says why');
          press('p');
          a.ok(!TAP.present.active() && !layer(), state.view + ': P starts nothing');
          a.equal(TAP.store.get().view, state.view, state.view + ': the page stays');
        });
      });
    });

    T.test('X-screen-overview', 'The Overview presents its chart, then continues to Market coverage with the ratings on the current industry', function (a) {
      withApp(function () {
        TAP.store.set({ industry: 'finance' });
        a.equal(TAP.store.get().view, 'overview', 'on the Overview');
        TAP.present.startScreen();
        a.deepEqual([cur().reportId, cur().total], ['ov-ambition', 1], 'one chart');
        TAP.present.next();
        a.equal(cur().title, TAP.content.text('present.nextPage', { name: 'Market coverage' }), 'the marker names Market coverage');
        TAP.present.next();
        a.equal(TAP.store.get().view, 'industry', 'continues there');
        var steps = TAP.presentScreen.page().steps;
        a.deepEqual(ids(steps), ['ind-tiers', 'ind-quad', 'ind-ratings'], 'three charts');
        a.equal(steps[2].initial.industryId, 'finance', 'the ratings step pinned to the industry in focus');
        TAP.present.next(); TAP.present.next();
        var title = shown() && shown().querySelector('.tap-panel__title');
        a.ok(title && text(title).indexOf(TAP.data.industry('finance').name) >= 0, 'the ratings chart shows that industry');
        a.equal(TAP.store.get().cmp.mode, 'all', 'the shared comparison untouched');
      });
    });

    T.test('X-screen-build', 'Build a chart gives one custom step and no marker', function (a) {
      withApp(function () {
        TAP.store.set({ view: 'build' });
        var pg = TAP.presentScreen.page();
        a.equal(pg.steps.length, 1, 'one step');
        a.equal(pg.steps[0].kind, 'custom', 'a custom chart');
        a.equal(pg.next, null, 'nothing after it');
        TAP.present.startScreen();
        a.ok(TAP.present.active() && shown(), 'presented');
        a.equal(cur().total, 1, 'one step in all');
        a.equal(TAP.present.next(), false, 'no marker');
        a.ok(!marker(), 'none on the stage');
      });
    });

    T.test('X-screen-other-last', 'Outlook is the last page; with extra data, Other sections comes after it and is the last', function (a) {
      withApp(function () {
        TAP.store.set({ view: 'outlook' });
        a.equal(TAP.presentScreen.nextOf(TAP.store.get()), null, 'no extra data: nothing after Outlook');
      });
      withApp(function () {
        TAP.store.set({ view: 'outlook' });
        a.deepEqual(TAP.presentScreen.nextOf(TAP.store.get()), { view: 'other' }, 'with extra data: Other sections follows');
        TAP.present.startScreen();
        a.ok(toMarker(), 'the marker after the Outlook charts');
        a.equal(cur().title, TAP.content.text('present.nextPage', { name: 'Other sections' }), 'names Other sections');
        TAP.present.next();
        a.equal(TAP.store.get().view, 'other', 'continues there');
        a.ok(cur().total >= 1 && /^other-/.test(cur().reportId), 'presenting its list');
        for (var i = 1; i < cur().total; i++) TAP.present.next();
        a.equal(TAP.present.next(), false, 'the last page: no marker');
      }, window.T_WITH_EXTRA());
    });

    T.test('X-screen-external-move', 'A view change from outside, after a continuation, leaves presentation on the new view', function (a) {
      withApp(function () {
        TAP.store.set({ view: 'customers' });
        TAP.present.startScreen();
        toMarker();
        TAP.present.next();
        a.equal(TAP.store.get().view, 'partners', 'moved to Partners');
        TAP.store.set({ view: 'insights' });
        a.ok(!TAP.present.active() && !layer(), 'presentation has ended');
        a.equal(TAP.store.get().view, 'insights', 'the view asked for stays');
        a.equal(TAP.store.get().expanded, null, 'no chart left expanded');
        a.ok(TAP.panelKeys.enabled, 'the panel keys are on again');
      });
    });

    T.test('X-screen-back-home', 'Back from the marker returns to the last chart; Home goes to step 1 of the current page', function (a) {
      withApp(function () {
        TAP.store.set({ view: 'customers' });
        TAP.present.startScreen();
        toMarker();
        a.ok(TAP.present.prev(), 'Back from the marker');
        a.equal(cur().reportId, 'cg-accounts', 'is the last chart');
        a.ok(!marker() && shown(), 'the chart is back on the stage');
        toMarker();
        TAP.present.next();
        TAP.present.next();
        a.deepEqual([TAP.store.get().view, n()], ['partners', 2], 'step 2 of Partners');
        press('Home');
        a.deepEqual([TAP.store.get().view, n(), cur().reportId], ['partners', 1, 'pt-reliance'], 'Home: step 1 of Partners, not of the first page');
        a.equal(TAP.present.prev(), false, 'Left never crosses a page');
      });
    });

    T.test('X-screen-guide-plays-file', 'The Guide still plays the saved presentation and the recorded list', function (a) {
      withApp(function () {
        TAP.present.clearRecorded();
        try {
          TAP.store.set({ view: 'guide' });
          var sec = document.querySelector('.tap-view [data-guide="runningOrder"]');
          click(sec.querySelector('[data-ro="present"]'));
          a.ok(TAP.present.active(), '"Present the saved presentation" starts');
          a.equal(cur().reportId, window.TAP_RUNNING_ORDER.steps[0].report, 'with the first step of the file');
          a.equal(cur().title, window.TAP_RUNNING_ORDER.steps[0].title, 'and its title');
          TAP.present.stop();
          a.equal(TAP.store.get().view, 'guide', 'back on the Guide');
          TAP.present.record({ report: 'cg-growth', title: 'Recorded one' });
          sec = document.querySelector('.tap-view [data-guide="runningOrder"]');
          click(sec.querySelector('[data-ro="try"]'));
          a.ok(TAP.present.active() && cur().title === 'Recorded one', '"Try this presentation" plays the recorded step');
          a.equal(TAP.present.next(), false, 'a list plays with no marker after it');
          TAP.present.stop();
        } finally { TAP.present.clearRecorded(); }
      });
    });
  });
})(window.TAP);
