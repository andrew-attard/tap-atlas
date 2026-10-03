/*
 * File: tests/test-insights.js
 * Purpose: Tests for the insight engine: rule checks, scoring, ranking, guardrails (TPV-TC-128 to 137, 167 to 169).
 * Provides: test cases for INSIGHTS stories (#44, #45, #53, #54), X-insights-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var FAMILIES = ['priorities', 'judgement', 'assumptions', 'realism', 'exposure', 'capability'];
  var MARKS = ['industryRow', 'regionColumn', 'cell', 'points', 'quadrant', 'bar', null];
  var STATES = ['value', 'notProvided', 'notApplicable'];

  // Checks one insight against the insight object contract (ARCHITECTURE section 12).
  function checkShape(a, x) {
    var tag = x.id + ': ';
    a.equal(x.id, x.ruleId + ':' + x.id.slice(x.ruleId.length + 1), tag + 'id is ruleId:key');
    a.ok(FAMILIES.indexOf(x.family) >= 0, tag + 'family');
    a.ok(typeof x.sentence === 'string' && x.sentence.length > 10 && !/[{}]/.test(x.sentence), tag + 'sentence is filled in');
    a.ok(typeof x.description === 'string' && x.description.length > 10, tag + 'rule description');
    a.ok(Array.isArray(x.regionIds) && x.regionIds.length > 0, tag + 'regions');
    a.ok(Array.isArray(x.industryIds) && Array.isArray(x.accountIds), tag + 'items');
    a.ok(Array.isArray(x.figures) && x.figures.length > 0, tag + 'figures');
    x.figures.forEach(function (f) {
      a.ok(typeof f.label === 'string' && f.label.length > 0, tag + 'figure label');
      a.ok(f.cell && STATES.indexOf(f.cell.state) >= 0 && f.cell.src, tag + 'figure is a cell with a source');
    });
    a.ok(typeof x.significance === 'number' && x.significance >= 0 && x.significance <= 1, tag + 'significance 0..1');
    a.ok(Array.isArray(x.sources) && x.sources.length > 0, tag + 'sources');
    a.ok(x.highlight && MARKS.indexOf(x.highlight.mark) >= 0, tag + 'highlight target with a mark');
    a.equal(x.highlight.reportId, x.reportId, tag + 'highlight names the same report');
    a.ok(Array.isArray(x.attach), tag + 'attach list');
    if (x.reportId) a.equal(x.attach[0], x.reportId, tag + 'reportId is the first attached report');
    else a.equal(x.fallback, 'details', tag + 'no report: Show me opens the details');
    a.equal(x.label, 'Observation to discuss', tag + 'labelled as an observation');
  }

  T.suite('insights', function () {
    T.test('X-insights-fixture', 'The insight fixture covers every family in the final insight shape', function (a) {
      var list = window.TEST_FIXTURES.insights;
      a.ok(list.length >= 8, 'about eight insights');
      list.forEach(function (x) { checkShape(a, x); });
      FAMILIES.forEach(function (f) {
        a.ok(list.some(function (x) { return x.family === f; }), 'family ' + f + ' is covered');
      });
      a.ok(list.some(function (x) { return x.fallback === 'details'; }), 'one insight falls back to the details panel');
      var ids = list.map(function (x) { return x.id; });
      a.equal(ids.filter(function (id, i) { return ids.indexOf(id) === i; }).length, ids.length, 'ids are unique');
    });
  });

  // Shared with tests/test-rules.js.
  window.T_INSIGHT_SHAPE = checkShape;
})(window.TAP);
