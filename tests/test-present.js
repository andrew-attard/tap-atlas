/*
 * File: tests/test-present.js
 * Purpose: Tests for presentation mode and the running order.
 * Provides: test cases for the PRESENT stream: TPV-TC-516 to 520 (US-3.1.1), 518 and 524 to 536 (US-3.1.2), 548 and 550 (US-3.1.4), 539 to 546 (US-3.1.3)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures, data/sample-plan-data.js,
 *             config/running-order.js
 * Used by: tests.html
 * Owner: PRESENT stream
 */
(function (TAP) {
  'use strict';

  function sample() { return JSON.parse(JSON.stringify(window.PLAN_DATA)); }

  // Runs fn with the sample data loaded (the starter order and the insight ids are written for it).
  function onSample(fn) {
    TAP.data.load(sample());
    TAP.insights.reset();
    try { return fn(); } finally { TAP.notes.clear('presentation'); TAP.data.load(T_FIXTURE('mini')); TAP.insights.reset(); }
  }

  function indexes(list) { return list.map(function (x) { return x.index; }); }
  function text(n) { return (n && n.textContent) || ''; }

  // Valid steps at even positions, one unknown name at each odd position (TPV-TC-518).
  var MIXED = [
    { report: 'ov-ambition' },
    { report: 'no-such-report' },
    { report: 'nb-levers', measure: 'nb.wins' },
    { report: 'nb-levers', measure: 'nb.noSuchMeasure' },
    { report: 'cg-growth' },
    { report: 'ov-ambition', cmp: { mode: 'one', focus: 'nowhere' } },
    { report: 'pt-reliance' },
    { insight: 'noSuchRule:nowhere' },
    { report: 'ind-tiers' }
  ];

  T.suite('present', function () {

    /* ---------- US-3.1.1: the running order in configuration ---------- */

    T.test('TPV-TC-516', 'The running order file holds a list of steps, each naming a report or an insight', function (a) {
      var steps = (window.TAP_RUNNING_ORDER || {}).steps;
      a.ok(Array.isArray(steps) && steps.length > 0, 'TAP_RUNNING_ORDER.steps is a list with steps');
      (steps || []).forEach(function (s, i) {
        var named = ['report', 'insight'].filter(function (k) { return typeof s[k] === 'string' && s[k]; });
        a.equal(named.length, 1, 'step ' + (i + 1) + ' names exactly one report or insight');
      });
    });

    T.test('TPV-TC-517', 'Every optional step field is accepted and held as written', function (a) {
      onSample(function () {
        var steps = [
          { report: 'nb-levers', measure: 'nb.wins' },
          { report: 'nb-levers', type: 'dot' },
          { report: 'cg-growth', breakdown: 'year' },
          { report: 'ov-ambition', cmp: { mode: 'one', focus: 'seu', restAs: 'combined', restAgg: 'total' } },
          { report: 'ov-ambition', cmp: { mode: 'pair', focus: 'na', second: 'apac' } },
          { report: 'ov-ambition', cmp: { mode: 'set', set: ['na', 'neu', 'seu'] } },
          { report: 'nb-levers', highlight: { regionIds: ['na'], mark: 'bar' } },
          { insight: 'winsVsPeers:na' },
          { report: 'ind-tiers', title: 'Where the regions agree' }
        ];
        var res = TAP.present.check(steps), ok = res.ok;
        a.deepEqual(res.skipped, [], 'no step is skipped');
        a.equal(ok.length, 9, 'all nine steps are kept');
        a.equal(ok[0].initial.measureId, 'nb.wins', 'measure');
        a.equal(ok[1].initial.type, 'dot', 'chart type');
        a.equal(ok[2].initial.breakdown, 'year', 'breakdown');
        a.deepEqual([ok[3].cmp.mode, ok[3].cmp.focus, ok[3].cmp.restAs, ok[3].cmp.restAgg], ['one', 'seu', 'combined', 'total'], 'one vs the rest, as a total');
        a.deepEqual([ok[4].cmp.mode, ok[4].cmp.focus, ok[4].cmp.second], ['pair', 'na', 'apac'], 'one vs one');
        a.deepEqual([ok[5].cmp.mode, ok[5].cmp.set], ['set', ['na', 'neu', 'seu']], 'chosen set');
        a.deepEqual([ok[6].highlight.reportId, ok[6].highlight.regionIds, ok[6].highlight.mark], ['nb-levers', ['na'], 'bar'], 'highlight, for the step report');
        a.equal(ok[7].reportId, 'nb-levers', 'insight step: the insight report');
        a.equal(ok[8].title, 'Where the regions agree', 'title');
        a.equal(ok[0].cmp.mode, 'all', 'no comparison given: the default, all regions');
      });
    });

    T.test('TPV-TC-518', 'Steps naming an unknown report, measure, region or insight are skipped; the rest keep their order', function (a) {
      onSample(function () {
        var res;
        try { res = TAP.present.check(MIXED); } catch (e) { a.ok(false, 'check threw: ' + e.message); return; }
        a.deepEqual(indexes(res.skipped), [1, 3, 5, 7], 'the four unknown names are skipped');
        a.deepEqual(res.skipped.map(function (s) { return s.reason; }), ['report', 'measure', 'region', 'insight'], 'each for its own reason');
        a.deepEqual(indexes(res.ok), [0, 2, 4, 6, 8], 'the valid steps stay, in order');
        a.deepEqual(res.ok.map(function (s) { return s.reportId; }), ['ov-ambition', 'nb-levers', 'cg-growth', 'pt-reliance', 'ind-tiers'], 'with their reports');
      });
    });

    T.test('TPV-TC-519', 'Skipped steps are listed in the data sources panel with position and name, never on the main screen', function (a) {
      var root = T.dom.mount();
      TAP.app.start({ root: root, plan: sample() });
      try {
        TAP.present.check(MIXED);
        var notes = TAP.notes.list('presentation');
        a.equal(notes.length, 4, 'four notes, source "presentation"');
        [[2, 'no-such-report'], [4, 'nb.noSuchMeasure'], [6, 'nowhere'], [8, 'noSuchRule:nowhere']].forEach(function (x, i) {
          var m = (notes[i] || {}).message || '';
          a.ok(m.indexOf(TAP.content.text('present.stepN', { n: x[0] })) >= 0 && m.indexOf(x[1]) >= 0, 'note ' + (i + 1) + ' names step ' + x[0] + ' and "' + x[1] + '"');
        });
        var body = T.dom.mount();
        TAP.sourcesPanel.render(body);
        var sec = body.querySelector('.tap-src__present');
        a.ok(sec, 'the data sources panel has a running order section');
        a.ok(text(sec).indexOf(TAP.content.text('present.sourcesTitle')) >= 0, 'with its heading');
        a.equal(sec ? sec.querySelectorAll('li').length : 0, 4, 'listing the four skipped steps');
        var others = body.querySelector('.tap-src__notes:not(.tap-src__present)');
        a.ok(!others || text(others).indexOf('no-such-report') < 0, 'not repeated under other notes');
        a.ok(text(root.querySelector('.tap-view')).indexOf('no-such-report') < 0 && text(root).indexOf('noSuchRule') < 0, 'nothing on the main screen');
      } finally { TAP.app.stop(); TAP.notes.clear('presentation'); TAP.data.load(T_FIXTURE('mini')); }
    });

    T.test('TPV-TC-520', 'The starter order runs on the sample data: about 10 steps, none skipped, every Phase 1 and 2 view covered', function (a) {
      onSample(function () {
        var steps = window.TAP_RUNNING_ORDER.steps, res = TAP.present.check(steps);
        a.deepEqual(res.skipped, [], 'no step is skipped');
        a.ok(steps.length >= 8 && steps.length <= 14, 'about 10 steps (' + steps.length + ')');
        var seen = {};
        res.ok.forEach(function (s) {
          var def = TAP.reports.get(s.reportId);
          if (def) seen[def.view] = true;
          if (s.kind === 'insight') seen.insights = true;              // the Insights view: an insight step
          if (s.cmp.mode === 'one') seen.regions = true;               // the Regions view: one region against the rest
        });
        ['overview', 'industry', 'newBusiness', 'customers', 'partners', 'insights', 'regions'].forEach(function (v) {
          a.ok(seen[v], 'covers the ' + v + ' view');
        });
      });
    });

    T.test('X-present-step-shapes', 'Odd steps are skipped quietly: not an object, no report, two kinds at once', function (a) {
      onSample(function () {
        var res = TAP.present.check([null, 'ov-ambition', {}, { report: 'ov-ambition', insight: 'winsVsPeers:na' }, { report: 'ov-ambition', type: 'pie' },
          { report: 'nb-levers', breakdown: 'channel' }, { report: 'ov-ambition', cmp: { mode: 'sideways' } }, { report: 'ov-ambition' }]);
        a.deepEqual(indexes(res.skipped), [0, 1, 2, 3, 4, 5, 6], 'seven steps skipped');
        a.deepEqual(indexes(res.ok), [7], 'the one valid step stays');
        a.equal(TAP.notes.list('presentation').length, 7, 'each one noted');
        a.deepEqual(TAP.present.check(undefined).skipped, [], 'no argument: the file order, which is valid');
      });
    });

    T.test('X-present-custom-def', 'A step may carry a full custom chart definition (D70)', function (a) {
      onSample(function () {
        var def = JSON.parse(JSON.stringify(TAP_REPORTS['cg-exposure']));
        def.id = 'custom:test:exposure';
        def.custom = true;
        var res = TAP.present.check([{ custom: def, type: 'dot' }, { custom: { id: 'custom:broken', shape: 'nothing' } }]);
        a.deepEqual(indexes(res.ok), [0], 'the full definition is kept');
        a.equal(res.ok[0] && res.ok[0].kind, 'custom', 'as a custom step');
        a.equal(res.ok[0] && res.ok[0].reportId, 'custom:test:exposure', 'under its own id');
        a.deepEqual(res.skipped.map(function (s) { return s.reason; }), ['custom'], 'a definition that does not validate is skipped');
        a.ok(!TAP_REPORTS['custom:test:exposure'], 'checking registers nothing');
      });
    });
    /* ---------- US-3.1.2: presenting ---------- */

    // The app on the sample data, keys bound; presentation always left and the mini fixture back afterwards.
    function withApp(fn) {
      var root = T.dom.mount(), file = window.TAP_RUNNING_ORDER.steps;
      TAP.app.start({ root: root, plan: sample() });
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
    function press(key, target, opts) {
      var e = new KeyboardEvent('keydown', Object.assign({ key: key, bubbles: true, cancelable: true }, opts || {}));
      (target || document.body).dispatchEvent(e);
      return e;
    }
    function layer() { return document.querySelector('.tap-present'); }
    function click(node) { if (node) node.click(); return node; }
    function choose(sel, value) { if (sel) { sel.value = value; sel.dispatchEvent(new Event('change')); } }
    function shown() { return document.querySelector('.tap-present .tap-panel'); }
    function n() { var c = TAP.present.current(); return c ? c.n : null; }
    function titled(k) { var out = []; for (var i = 1; i <= k; i++) out.push({ report: i % 2 ? 'ov-ambition' : 'cg-growth', title: 'Title ' + i }); return out; }
    function pressed(panel, key) {
      var b = panel && panel.querySelector('[data-control="' + key + '"] [aria-pressed="true"]');
      return b ? b.getAttribute('data-value') : null;
    }

    T.test('TPV-TC-518', 'Presenting a running order with four unknown names shows only the valid steps, in order', function (a) {
      withApp(function () {
        var res;
        try { res = TAP.present.start(MIXED); } catch (e) { a.ok(false, 'start threw: ' + e.message); return; }
        a.ok(res.started && TAP.present.active(), 'presentation mode starts');
        var seen = [];
        for (var i = 0; i < 5; i++) { seen.push(TAP.present.current().reportId); TAP.present.next(); }
        a.deepEqual(seen, ['ov-ambition', 'nb-levers', 'cg-growth', 'pt-reliance', 'ind-tiers'], 'the five valid steps, in order');
        a.equal(TAP.present.current().total, 5, 'five steps in all');
        a.equal(TAP.notes.list('presentation').length, 4, 'the four skipped steps are noted');
      });
    });

    T.test('TPV-TC-524', 'P starts presentation mode at step 1, but not while typing in a field', function (a) {
      withApp(function (root) {
        var field = root.appendChild(document.createElement('input'));
        field.focus();
        press('p', field);
        a.ok(!TAP.present.active(), 'P typed in a field does nothing');
        field.blur();
        press('p');
        a.ok(TAP.present.active(), 'P starts presentation mode');
        a.equal(n(), 1, 'at step 1');
        a.equal(TAP.present.current().reportId, window.TAP_RUNNING_ORDER.steps[0].report, 'the first step of the file');
      });
    });

    T.test('TPV-TC-525', 'A step with measure, chart type, breakdown and comparison shows exactly those settings', function (a) {
      withApp(function () {
        var cmp = { mode: 'pair', focus: 'na', second: 'seu' };
        TAP.present.start([{ report: 'nb-levers', measure: 'nb.avgDealSize', type: 'dot', breakdown: 'industry', cmp: cmp }]);
        var p = shown();
        a.equal(p && p.getAttribute('data-report'), 'nb-levers', 'the step report');
        a.ok(p && p.classList.contains('tap-panel--expanded'), 'in the expanded panel');
        var type = p && p.querySelector('[data-action="type"]');
        a.ok(type && type.textContent.indexOf(TAP.shapes.label('dot')) >= 0, 'chart type: dot');
        a.equal(pressed(p, 'measure'), 'nb.avgDealSize', 'measure: average deal size');
        a.equal(pressed(p, 'breakdown'), 'industry', 'broken down by industry');
        a.deepEqual(TAP.store.get().cmp, TAP.store.defaults().cmp, 'the shared comparison is left alone (D74)');
        var sentence = p && p.querySelector('.tap-panel__expand-sentence');
        a.equal(sentence && sentence.textContent, TAP.scope.sentence(Object.assign(TAP.store.defaults().cmp, cmp)), 'the comparison sentence on screen');
      });
    });

    T.test('TPV-TC-527', 'Space and Right step forward; Left and Backspace step back', function (a) {
      withApp(function () {
        TAP.present.start(titled(5));
        TAP.present.next();
        a.equal(n(), 2, 'at step 2');
        press(' '); a.equal(n(), 3, 'Space: step 3');
        press('ArrowRight'); a.equal(n(), 4, 'Right: step 4');
        press('ArrowLeft'); a.equal(n(), 3, 'Left: step 3');
        press('Backspace'); a.equal(n(), 2, 'Backspace: step 2');
      });
    });

    T.test('TPV-TC-528', 'Home goes to step 1; Esc leaves presentation mode', function (a) {
      withApp(function () {
        TAP.present.start(titled(5));
        TAP.present.next(); TAP.present.next();
        a.equal(n(), 3, 'at a middle step');
        press('Home'); a.equal(n(), 1, 'Home: step 1');
        press('Escape');
        a.ok(!TAP.present.active(), 'Esc: presentation mode ends');
        a.ok(!layer(), 'and its layer is gone');
      });
    });

    T.test('TPV-TC-530', 'The progress row reads "Step 3 of 12" followed by the step title', function (a) {
      withApp(function () {
        TAP.present.start(titled(12));
        TAP.present.next(); TAP.present.next();
        var row = document.querySelector('.tap-present__where');
        var txt = row ? row.textContent.replace(/\s+/g, ' ').trim() : '';
        a.equal(txt.indexOf('Step 3 of 12'), 0, 'starts with "Step 3 of 12": ' + txt);
        a.ok(txt.indexOf('Title 3') >= 'Step 3 of 12'.length, 'followed by the step title');
      });
    });

    T.test('TPV-TC-532', 'A step without a comparison does not carry the previous step comparison', function (a) {
      withApp(function () {
        function said() { var n = document.querySelector('.tap-present .tap-panel__expand-sentence'); return n ? n.textContent : ''; }
        var one = { mode: 'one', focus: 'seu', restAgg: 'total' };
        TAP.present.start([{ report: 'ov-ambition', cmp: one }, { report: 'cg-growth' }]);
        a.equal(said(), TAP.scope.sentence(Object.assign(TAP.store.defaults().cmp, one)), 'step 1: one vs the rest');
        TAP.present.next();
        a.equal(said(), TAP.scope.sentence(TAP.store.defaults().cmp), 'step 2: the default comparison, all regions');
      });
    });

    T.test('TPV-TC-533', 'Leaving restores the view and comparison exactly as before', function (a) {
      withApp(function () {
        TAP.store.set({ view: 'customers', cmp: { mode: 'one', focus: 'seu' } });
        var before = JSON.stringify({ view: TAP.store.get().view, cmp: TAP.store.get().cmp, expanded: TAP.store.get().expanded });
        TAP.present.start();
        TAP.present.next(); TAP.present.next(); TAP.present.next(); TAP.present.next(); TAP.present.next();
        TAP.present.stop();
        var s = TAP.store.get();
        a.equal(JSON.stringify({ view: s.view, cmp: s.cmp, expanded: s.expanded }), before, 'view, comparison and expanded chart as before');
        a.equal(TAP.app.current(), 'customers', 'the Customer growth view is on screen');
        a.ok(TAP.panelKeys.enabled, 'the panel keys are on again');
      });
    });

    T.test('TPV-TC-534', 'Every step of the starter order draws its chart with animation off', function (a) {
      withApp(function () {
        TAP.present.start();
        var total = TAP.present.current().total, charts = 0;
        for (var i = 0; i < total; i++) {
          var box = document.querySelector('.tap-present .tap-panel__chart'), chart = box && window.echarts.getInstanceByDom(box);
          if (chart) { charts++; a.equal(chart.getOption().animation, false, 'step ' + (i + 1) + ': animation off'); }
          a.ok(!document.querySelector('.tap-present .tap-panel__error'), 'step ' + (i + 1) + ' draws without an error');
          TAP.present.next();
        }
        a.ok(charts >= 6, 'charts checked: ' + charts);
      });
    });

    T.test('TPV-TC-536', 'An empty or fully invalid running order does not start and the button says why', function (a) {
      withApp(function (root) {
        var btn = root.querySelector('.tap-topbar__actions .tap-present__button');
        a.ok(btn, 'a Present button in the top bar');
        window.TAP_RUNNING_ORDER.steps = [];
        if (btn) btn.click();
        a.ok(!TAP.present.active(), 'empty: does not start');
        var msg = root.querySelector('.tap-present__msg');
        a.equal(msg && msg.textContent, TAP.content.text('present.empty'), 'empty: the button says so');
        window.TAP_RUNNING_ORDER.steps = [{ report: 'no-such-report' }, { insight: 'noSuchRule:x' }];
        if (btn) btn.click();
        a.ok(!TAP.present.active(), 'fully invalid: does not start');
        a.equal(msg && msg.textContent, TAP.content.text('present.noneValid', { n: 2 }), 'fully invalid: the button says so');
      });
    });

    T.test('X-present-button', 'The Present button starts the file order at step 1', function (a) {
      withApp(function (root) {
        var btn = root.querySelector('.tap-topbar__actions .tap-present__button');
        a.ok(btn && btn.textContent.indexOf(TAP.content.text('present.button')) >= 0, 'labelled Present');
        if (btn) btn.click();
        a.ok(TAP.present.active() && n() === 1, 'presentation mode at step 1');
        a.ok(shown() && shown().classList.contains('tap-panel--expanded'), 'the report fills the expanded panel');
      });
    });

    T.test('X-present-keys-owned', 'While presenting, number keys, drill and panel Esc are off; Esc closes a popover first', function (a) {
      withApp(function () {
        TAP.present.start(titled(3));
        a.ok(!TAP.panelKeys.enabled, 'the panel keys are off');
        press('3');
        a.equal(TAP.store.get().view, 'overview', 'a number key does not switch views');
        var more = document.querySelector('.tap-present [data-action="more"]');
        if (more) more.click();
        a.ok(document.querySelector('.tap-present .tap-panel__pop'), 'a chart menu is open');
        press('Escape');
        a.ok(!document.querySelector('.tap-present .tap-panel__pop'), 'Esc closes the menu first');
        a.ok(TAP.present.active(), 'and presentation mode stays');
        press('Escape');
        a.ok(!TAP.present.active(), 'the next Esc leaves');
        a.ok(TAP.panelKeys.enabled, 'the panel keys are on again');
      });
    });

    T.test('X-present-close', 'Close on the expanded strip, or the progress row button, leaves presentation mode', function (a) {
      withApp(function () {
        TAP.present.start(titled(3));
        var close = document.querySelector('.tap-present [data-action="collapse"]');
        if (close) close.click();
        a.ok(!TAP.present.active(), 'Close on the strip leaves');
        TAP.present.start(titled(3));
        var leave = document.querySelector('.tap-present [data-present="leave"]');
        if (leave) leave.click();
        a.ok(!TAP.present.active(), 'Leave on the progress row leaves');
      });
    });

    T.test('X-present-scroll', 'Stepping never scrolls the page behind, and leaving puts the scroll back', function (a) {
      withApp(function (root) {
        root.style.minHeight = '4000px';
        window.scrollTo(0, 40);
        var y = window.scrollY;
        TAP.present.start(titled(3));
        TAP.present.next(); TAP.present.next();
        a.equal(window.scrollY, y, 'the page has not moved while stepping');
        TAP.present.stop();
        a.equal(window.scrollY, y, 'the same scroll after leaving');
        window.scrollTo(0, 0);
      });
    });

    T.test('X-present-behind', 'Charts behind the layer keep their drill level, own comparison, breakdown and measure (D74)', function (a) {
      withApp(function () {
        var host = T.dom.mount();
        var A = TAP.panel.create(host, 'nb-industries', {}), B = TAP.panel.create(host, 'cg-growth', {}), C = TAP.panel.create(host, 'nb-levers', {});
        try {
          click(A.el.querySelector('[data-tap-region]'));
          a.ok(A.el.querySelector('.tap-panel__crumbs'), 'A: one drill level down');
          click(B.el.querySelector('[data-control="breakdown"] [data-value="year"]'));
          click(B.el.querySelector('[data-action="more"]'));
          click(B.el.querySelector('[data-action="compare"]'));
          choose(B.el.querySelector('select[data-control="cmp-mode"]'), 'one');
          a.ok(B.el.querySelector('.tap-panel__custom'), 'B: its own comparison');
          click(C.el.querySelector('[data-control="measure"] [data-value="nb.hitRate"]'));
          var before = JSON.stringify(TAP.store.get().cmp);
          TAP.present.start([{ report: 'ov-ambition', cmp: { mode: 'one', focus: 'seu' } }, { insight: 'winsVsPeers:na' }]);
          TAP.present.next();
          TAP.present.stop();
          a.equal(JSON.stringify(TAP.store.get().cmp), before, 'the shared comparison never changed');
          a.ok(A.el.querySelector('.tap-panel__crumbs'), 'A: still at its drill level');
          a.ok(B.el.querySelector('.tap-panel__custom'), 'B: still its own comparison');
          a.equal(pressed(B.el, 'breakdown'), 'year', 'B: still broken down by year');
          a.equal(pressed(C.el, 'measure'), 'nb.hitRate', 'C: still on hit rate, though the insight step showed wins');
        } finally { A.destroy(); B.destroy(); C.destroy(); }
      });
    });

    T.test('X-present-app-stop', 'Stopping the app ends a running presentation and turns the panel keys back on', function (a) {
      var root = T.dom.mount();
      TAP.app.start({ root: root, plan: sample() });
      try {
        TAP.present.start(titled(2));
        a.ok(TAP.present.active(), 'presenting');
      } finally { TAP.app.stop(); TAP.data.load(T_FIXTURE('mini')); TAP.insights.reset(); }
      a.ok(!TAP.present.active(), 'ended by TAP.app.stop()');
      a.ok(!document.querySelector('.tap-present'), 'the layer is gone');
      a.ok(TAP.panelKeys.enabled, 'panel keys on');
    });

    T.test('X-present-start-error', 'A step that fails to draw ends presentation cleanly', function (a) {
      withApp(function () {
        var create = TAP.panel.create;
        TAP.panel.create = function () { throw new Error('test failure'); };
        var res;
        try { res = TAP.present.start(titled(2)); } catch (e) { a.ok(false, 'start threw: ' + e.message); } finally { TAP.panel.create = create; }
        a.deepEqual(res && [res.started, res.reason], [false, 'error'], 'not started, reason error');
        a.ok(!TAP.present.active() && !document.querySelector('.tap-present'), 'no layer left behind');
        a.ok(TAP.panelKeys.enabled, 'panel keys on');
      });
    });

    T.test('X-present-esc-typing', 'Esc typed in a field does not leave presentation mode', function (a) {
      withApp(function () {
        TAP.present.start(titled(2));
        var field = document.querySelector('.tap-present').appendChild(document.createElement('input'));
        press('Escape', field);
        a.ok(TAP.present.active(), 'still presenting');
      });
    });

    T.test('X-present-bounds', 'Next stops at the last step and Back at the first; first() returns to step 1', function (a) {
      withApp(function () {
        TAP.present.start(titled(2));
        a.equal(TAP.present.prev(), false, 'no step before the first');
        TAP.present.next();
        a.equal(TAP.present.next(), false, 'no step after the last');
        a.equal(n(), 2, 'stays on the last step');
        TAP.present.first();
        a.equal(n(), 1, 'first() goes to step 1');
        TAP.present.stop();
        a.equal(TAP.present.current(), null, 'current() is null once left');
      });
    });
    /* ---------- US-3.1.4: insight steps ---------- */

    function insightOf(id) { return TAP.insights.all().filter(function (x) { return x.id === id; })[0]; }
    function hlColor() { return window.TAP_THEME.echarts.tap.highlight.color; }
    function ringed(o, depth) {
      if (!o || typeof o !== 'object' || depth > 10) return false;
      if (Array.isArray(o)) return o.some(function (x) { return ringed(x, depth + 1); });
      if (o.borderColor === hlColor() && o.borderWidth > 0) return true;
      return Object.keys(o).some(function (k) { return ringed(o[k], depth + 1); });
    }

    T.test('TPV-TC-548', 'An insight step shows the insight report with its highlight, titled with the insight sentence', function (a) {
      withApp(function () {
        // Planted case: North America needs about 3x the new customer wins of the other regions (nb-levers, wins)
        var ins = insightOf('winsVsPeers:na');
        a.ok(ins, 'the sample data gives the insight');
        TAP.present.start([{ insight: 'winsVsPeers:na' }]);
        var p = shown();
        a.equal(p && p.getAttribute('data-report'), 'nb-levers', 'the insight report');
        a.equal(pressed(p, 'measure'), 'nb.wins', 'on the insight measure');
        a.equal(TAP.store.get().highlight, null, 'the highlight goes to the step panel only, not the shared state (D74)');
        a.ok(p && p.querySelector('.tap-panel__strip'), 'the panel names the highlight');
        var box = p && p.querySelector('.tap-panel__chart'), chart = box && window.echarts.getInstanceByDom(box);
        a.ok(chart && ringed(chart.getOption().series, 0), 'and rings the mark on the chart');
        a.equal(TAP.present.current().title, ins && ins.sentence, 'the step title is the insight sentence');
        var row = document.querySelector('.tap-present__where');
        a.ok(row && row.textContent.indexOf(ins && ins.sentence) >= 0, 'shown in the progress row');
        a.ok(row && row.textContent.indexOf(ins && ins.label) >= 0, 'marked as an observation to discuss');
      });
    });

    T.test('TPV-TC-550', 'A step naming an insight the data no longer gives is skipped and listed; the other steps run', function (a) {
      withApp(function () {
        a.ok(insightOf('winsVsPeers:na') && !insightOf('winsVsPeers:latam'), 'the rule finds North America, not Latin America');
        var res = TAP.present.start([{ report: 'ov-ambition' }, { insight: 'winsVsPeers:latam' }, { insight: 'winsVsPeers:na' }]);
        a.ok(res.started, 'presentation mode starts');
        a.deepEqual(res.skipped.map(function (x) { return [x.index, x.reason, x.name]; }), [[1, 'insight', 'winsVsPeers:latam']], 'step 2 is skipped');
        a.equal(TAP.present.current().total, 2, 'two steps run');
        TAP.present.next();
        a.equal(TAP.present.current().reportId, 'nb-levers', 'the next step is the insight that exists');
        var body = T.dom.mount();
        TAP.sourcesPanel.render(body);
        var sec = body.querySelector('.tap-src__present');
        a.ok(sec && sec.textContent.indexOf('winsVsPeers:latam') >= 0 && sec.textContent.indexOf(TAP.content.text('present.stepN', { n: 2 })) >= 0,
          'the data sources panel lists step 2 and the insight id');
      });
    });
    T.test('X-present-reveal', 'An insight step scrolls its outlined rows into view in the stage', function (a) {
      withApp(function () {
        TAP.present.start([{ insight: 'split:retail' }]);
        var stage = document.querySelector('.tap-present__stage'), hit = stage && stage.querySelector('.is-hl');
        a.ok(hit, 'the insight row is outlined');
        var r = hit && hit.getBoundingClientRect(), box = stage && stage.getBoundingClientRect();
        a.ok(r && r.top >= box.top && r.bottom <= box.bottom, 'and within the visible stage');
      });
    });
    /* ---------- US-3.1.3: record from the screen ---------- */

    // A panel of the given report on the sample data, with the recorded steps cleared before and after.
    function withPanel(reportId, fn) {
      return withApp(function (root) {
        TAP.present.clearRecorded();
        var host = T.dom.mount(), p = TAP.panel.create(host, reportId, {});
        try { return fn(p, root); } finally { p.destroy(); TAP.present.clearRecorded(); }
      });
    }
    function recordFrom(p) {
      click(p.el.querySelector('[data-action="more"]'));
      return click(p.el.querySelector('[data-action="record"]'));
    }

    T.test('TPV-TC-539', 'Add to running order records the report, measure, chart type, breakdown and comparison on screen', function (a) {
      withPanel('nb-levers', function (p) {
        TAP.store.set({ cmp: { mode: 'pair', focus: 'na', second: 'seu' } });
        click(p.el.querySelector('[data-control="measure"] [data-value="nb.hitRate"]'));
        click(p.el.querySelector('[data-action="type"]'));
        click(p.el.querySelector('[data-type="dot"]'));
        click(p.el.querySelector('[data-control="breakdown"] [data-value="industry"]'));
        a.ok(recordFrom(p), 'the More menu has "Add to running order"');
        var steps = TAP.present.recorded(), s0 = steps[0] || {};
        a.equal(steps.length, 1, 'one step recorded');
        a.deepEqual([s0.report, s0.measure, s0.type, s0.breakdown], ['nb-levers', 'nb.hitRate', 'dot', 'industry'], 'report, measure, type and breakdown');
        a.deepEqual(s0.cmp, { mode: 'pair', focus: 'na', second: 'seu' }, 'the comparison on screen');
        a.ok(p.el.querySelector('.tap-panel__status').textContent.length > 0, 'the panel says it was added');
      });
    });

    T.test('TPV-TC-540', 'A panel with its own comparison records that comparison, not the shared one', function (a) {
      withPanel('ov-ambition', function (p) {
        click(p.el.querySelector('[data-action="more"]'));
        click(p.el.querySelector('[data-action="compare"]'));
        choose(p.el.querySelector('select[data-control="cmp-mode"]'), 'one');
        choose(p.el.querySelector('select[data-control="cmp-focus"]'), 'mea');
        a.equal(TAP.store.get().cmp.mode, 'all', 'the shared comparison stays all regions');
        recordFrom(p);
        var c = (TAP.present.recorded()[0] || {}).cmp || {};
        a.deepEqual([c.mode, c.focus], ['one', 'mea'], 'the panel comparison: one vs the rest, Middle East & Africa');
      });
    });

    T.test('X-present-record-drilled', 'Below the top drill level only the report and comparison are recorded, with no title', function (a) {
      withPanel('nb-industries', function (p) {
        click(p.el.querySelector('[data-tap-region]'));
        a.ok(p.el.querySelector('.tap-panel__crumbs'), 'one drill level down');
        recordFrom(p);
        var s0 = TAP.present.recorded()[0] || {};
        a.equal(s0.report, 'nb-industries', 'the top report');
        a.deepEqual([s0.title, s0.type, s0.measure, s0.breakdown], [undefined, undefined, undefined, undefined], 'no title or level choices');
        a.ok(s0.cmp && s0.cmp.mode === 'all', 'the comparison');
      });
    });

    /* ---------- review fixes after v0.3.0: what a step keeps (#363) ---------- */

    T.test('X-review-PP-3', 'A step with type "table" shows the table view, and a chart recorded in table view records "table"', function (a) {
      withPanel('ov-ambition', function (p) {
        a.deepEqual(TAP.present.check([{ report: 'ov-ambition', type: 'table' }]).skipped, [], 'the step passes the check');
        TAP.present.start([{ report: 'ov-ambition', type: 'table' }]);
        try {
          var sp = shown();
          a.ok(sp && sp.querySelector('.tap-panel__table'), 'the step shows the table');
          a.equal(sp && sp.querySelector('[data-action="table"]').getAttribute('aria-pressed'), 'true', 'with Table pressed');
        } finally { TAP.present.stop(); }
        click(p.el.querySelector('[data-action="table"]'));
        recordFrom(p);
        a.equal((TAP.present.recorded()[0] || {}).type, 'table', 'recorded in table view: type "table"');
      });
    });

    T.test('X-review-PP-9', 'A chart recorded with "Break down by: None" replays with no breakdown', function (a) {
      withPanel('cg-growth', function (p) {
        a.equal(pressed(p.el, 'breakdown'), 'year', 'the report starts by plan year');
        click(p.el.querySelector('[data-control="breakdown"] [data-value="none"]'));
        recordFrom(p);
        var s0 = TAP.present.recorded()[0] || {};
        a.equal(s0.breakdown, 'none', 'recorded as an explicit "none"');
        a.deepEqual(TAP.present.check([s0]).skipped, [], 'the step passes the check');
        TAP.present.start([s0]);
        try { a.equal(pressed(shown(), 'breakdown'), 'none', 'the step shows no breakdown'); } finally { TAP.present.stop(); }
      });
    });

    T.test('X-review-PP-10', 'A step recorded on the ratings chart keeps its industry', function (a) {
      withApp(function () {
        TAP.present.clearRecorded();
        var rated = TAP.data.industries({ rated: true }), ind = rated[1];
        TAP.store.set({ industry: ind.id });
        var p = TAP.panel.create(T.dom.mount(), 'ind-ratings', {});
        try {
          recordFrom(p);
          var s0 = TAP.present.recorded()[0] || {};
          a.equal(s0.industry, ind.id, 'the industry is recorded');
          TAP.store.set({ industry: null });
          TAP.present.start([s0]);
          try {
            var title = shown() && shown().querySelector('.tap-panel__title');
            a.ok(title && title.textContent.indexOf(ind.name) >= 0, 'the step shows ' + ind.name + ', not ' + rated[0].name);
          } finally { TAP.present.stop(); }
        } finally { p.destroy(); TAP.present.clearRecorded(); }
      });
    });

    var THREE = [{ report: 'ov-ambition', title: 'First' }, { report: 'ind-tiers', title: 'Second' }, { report: 'cg-growth', title: 'Third' }];

    T.test('TPV-TC-542', 'Moving the second step up and removing the last leaves the old second and first, in that order', function (a) {
      TAP.present.clearRecorded();
      try {
        THREE.forEach(function (s) { TAP.present.record(s); });
        TAP.present.move(1, -1);
        TAP.present.remove(2);
        a.deepEqual(TAP.present.recorded().map(function (s) { return s.title; }), ['Second', 'First'], 'old second, then old first');
        a.equal(TAP.present.move(0, -1), false, 'the first step cannot move up');
      } finally { TAP.present.clearRecorded(); }
    });

    T.test('TPV-TC-544', 'The copied text, loaded as config/running-order.js, gives the same steps and passes the check', function (a) {
      onSample(function () {
        var saved = window.TAP_RUNNING_ORDER;
        TAP.present.clearRecorded();
        try {
          [THREE[0], { report: 'nb-levers', measure: 'nb.wins', type: 'dot', cmp: { mode: 'one', focus: 'na' }, title: 'It’s "quoted" \\ here' },
            { insight: 'winsVsPeers:na' }].forEach(function (s) { TAP.present.record(s); });
          var text = TAP.present.asFileText();
          a.equal(text.indexOf('/*\n * File: config/running-order.js'), 0, 'starts with the file header');
          ['report ', 'insight ', 'custom ', 'title ', 'measure ', 'type ', 'breakdown ', 'cmp ', 'highlight '].forEach(function (f) {
            a.ok(text.indexOf(' *   ' + f) >= 0, 'the header explains ' + f.trim());
          });
          window.TAP_RUNNING_ORDER = undefined;
          var tag = document.createElement('script');
          tag.text = text;   // as the browser would load the pasted file
          document.head.appendChild(tag);
          document.head.removeChild(tag);
          var loaded = window.TAP_RUNNING_ORDER;
          a.deepEqual(loaded && loaded.steps, TAP.present.recorded(), 'the same steps');
          a.deepEqual(TAP.present.check(loaded && loaded.steps).skipped, [], 'and none is skipped');
        } finally { window.TAP_RUNNING_ORDER = saved; TAP.present.clearRecorded(); }
      });
    });

    T.test('TPV-TC-546', 'Recorded steps are kept in this browser through TAP.storage, in order', function (a) {
      TAP.present.clearRecorded();
      try {
        THREE.forEach(function (s) { TAP.present.record(s); });
        var raw = null;
        try { raw = window.localStorage.getItem('tap-atlas:runningOrder.recorded'); } catch (e) { /* blocked */ }
        a.ok(raw, 'saved under runningOrder.recorded');
        a.deepEqual(JSON.parse(raw || '[]').map(function (s) { return s.title; }), ['First', 'Second', 'Third'], 'what a reload reads back, in order');
        TAP.present.clearRecorded();
        a.deepEqual(TAP.present.recorded(), [], 'cleared');
      } finally { TAP.present.clearRecorded(); }
    });

    T.test('X-present-guide-recorded', 'The Guide lists the recorded steps with move, remove, try and copy buttons; Try plays them', function (a) {
      withApp(function () {
        TAP.present.clearRecorded();
        try {
          THREE.forEach(function (s) { TAP.present.record(s); });
          TAP.store.set({ view: 'guide' });
          var sec = document.querySelector('.tap-view [data-guide="runningOrder"]');
          a.ok(sec, 'the Guide has a running order section');
          var items = sec ? sec.querySelectorAll('.tap-ro__step') : [];
          a.equal(items.length, 3, 'three steps listed');
          a.ok(items[0] && items[0].textContent.indexOf('First') >= 0 && items[2].textContent.indexOf('Third') >= 0, 'in order');
          ['up', 'down', 'remove'].forEach(function (k) { a.equal(sec.querySelectorAll('[data-ro="' + k + '"]').length, 3, k + ' on each step'); });
          a.ok(sec.querySelector('[data-ro="copy"]'), 'Copy running order');
          click(sec.querySelectorAll('[data-ro="up"]')[1]);
          sec = document.querySelector('.tap-view [data-guide="runningOrder"]');
          a.ok(sec.querySelectorAll('.tap-ro__step')[0].textContent.indexOf('Second') >= 0, 'moving up redraws the list');
          click(sec.querySelector('[data-ro="try"]'));
          a.ok(TAP.present.active(), 'Try this order starts presentation mode');
          a.equal(TAP.present.current().title, 'Second', 'with the recorded steps, in their order');
          TAP.present.stop();
        } finally { TAP.present.clearRecorded(); }
      });
    });

    T.test('X-present-guide-empty', 'With nothing recorded the Guide says how to add steps, and Try is not offered', function (a) {
      withApp(function () {
        TAP.present.clearRecorded();
        TAP.store.set({ view: 'guide' });
        var sec = document.querySelector('.tap-view [data-guide="runningOrder"]');
        a.ok(sec && sec.textContent.indexOf(TAP.content.text('present.guide.none')) >= 0, 'the empty message');
        a.ok(sec && !sec.querySelector('[data-ro="try"]'), 'no Try button');
        a.ok(sec && sec.querySelector('[data-ro="present"]'), 'the file order can still be presented from here');
      });
    });
  });
})(window.TAP);
