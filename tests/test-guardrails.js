/*
 * File: tests/test-guardrails.js
 * Purpose: Tests for neutral wording and guardrails on the sample data, and every planted case found
 *          (US-1.7.10, US-1.3.2): TPV-TC-167 to 169 and TPV-TC-198.
 * Provides: test cases TPV-TC-167, 168, 169, 198
 * Depends on: tests/harness.js, tests/test-setup.js, tests/test-rules.js (window.T_RULES), the app scripts,
 *             data/sample-plan-data.js, tests/fixtures/sample-expected.js
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var R = window.T_RULES;

  function all() { return TAP.insights.all(); }
  function about(regionId, industryId) {
    return all().filter(function (x) { return x.regionIds.indexOf(regionId) >= 0 && x.industryIds.indexOf(industryId) >= 0; });
  }
  function word(text, w) {
    var esc = String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^A-Za-z])' + esc + '([^A-Za-z]|$)', 'i').test(text);
  }

  T.suite('guardrails', function () {
    T.test('TPV-TC-167', 'No insight from the sample data contains a banned word from the wording guide', function (a) {
      R.sample();
      var banned = window.TAP_RULES.wording.banned;
      a.ok(all().length >= 16, 'the sample gives insights to check');
      all().forEach(function (x) {
        banned.forEach(function (w) { a.ok(!word(x.sentence, w), x.id + ' avoids "' + w + '"'); });
        ['NaN', 'undefined', 'null', 'Infinity', 'not provided'].forEach(function (w) { a.ok(!word(x.sentence, w), x.id + ' has no gap: ' + w); });
        a.equal(x.label, 'Observation to discuss', x.id + ' is labelled as an observation');
      });
      window.TAP_RULES.rules.forEach(function (r) {
        [r.template].concat(Object.keys(r.templates || {}).map(function (k) { return r.templates[k]; })).forEach(function (t) {
          banned.forEach(function (w) { a.ok(!word(t, w), r.id + ' template avoids "' + w + '"'); });
        });
      });
    });

    T.test('TPV-TC-168', 'A planted blank value is never treated as low or zero', function (a) {
      R.sample();
      all().forEach(function (x) {
        x.figures.forEach(function (f) { a.ok(f.cell.state !== 'notProvided', x.id + ': ' + f.label + ' is a provided figure'); });
      });
      a.equal(about('neu', 'finance').filter(function (x) { return x.family === 'capability' || x.ruleId === 'groupPriority'; }).length, 0,
        'Northern Europe Financial Services: blank criticality, so no score-based insight');
      a.ok(R.get('notYetList:neu').industryIds.indexOf('property') < 0, 'blank product fit keeps Property Management off the list');
      a.equal(about('mea', 'government').length, 0, 'Middle East & Africa Government: blank tier, no tier insight');
      a.equal(about('neu', 'culture').filter(function (x) { return x.family === 'judgement' || x.family === 'realism'; }).length, 0,
        'Northern Europe Culture and Tourism: blank current ARR is not "no ARR"');
      a.ok(!all().some(function (x) { return x.family === 'exposure' && x.regionIds[0] === 'ceu'; }), 'empty customer growth is not zero growth');
      a.ok(R.get('strongRating:neu:pharma'), 'with its zero figures entered, P04 fires');
      R.mc('neu', 'pharma').currentArr = null;
      TAP.insights.reset();
      a.ok(!R.get('strongRating:neu:pharma'), 'with current ARR left blank, it does not');
    });

    T.test('TPV-TC-169', 'No comparison insight when fewer than 3 regions provide the value', function (a) {
      R.sample(function (p) { p.regions = p.regions.slice(0, 2); });
      var compare = window.TAP_RULES.rules.filter(function (r) { return r.compare; });
      a.ok(compare.length >= 5, 'the comparison rules are known');
      compare.forEach(function (r) { a.equal(R.ofRule(r.id).length, 0, r.id + ' stays quiet with 2 regions'); });
      a.deepEqual(TAP.insights.failures(), [], 'quiet, not failed');
      a.ok(all().length > 0, 'rules that need no comparison still run');
    });

    R.PLANTED.forEach(function (c) {
      T.test('TPV-TC-198', c.p + ': the planted case produces its expected insight (' + c.id + ')', function (a) {
        R.sample();
        R.check(a, c);
      });
    });
  });
})(window.TAP);
