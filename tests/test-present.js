/*
 * File: tests/test-present.js
 * Purpose: Tests for presentation mode and the running order.
 * Provides: test cases for the PRESENT stream: TPV-TC-516 to 520 (US-3.1.1)
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
  });
})(window.TAP);
