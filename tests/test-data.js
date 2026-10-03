/*
 * File: tests/test-data.js
 * Purpose: Tests for the sample data file: shape, consistency and planted gaps (TPV-TC-193 to 199).
 * Provides: test cases for DATA stories (#25, #26, #27): X-data-*
 * Depends on: tests/harness.js, tests/test-setup.js, data/sample-plan-data.js (window.PLAN_DATA),
 *             tests/fixtures/sample-expected.js (window.SAMPLE_EXPECT)
 * Used by: tests.html
 *
 * Consistency is recomputed here from the raw rows, independently of the app's code.
 */
(function () {
  'use strict';

  var P = window.PLAN_DATA;
  var X = window.SAMPLE_EXPECT;

  function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }

  T.suite('sample data', function () {
    T.test('X-data-generated-pair', 'The sample file and its expected figures come from the same generator run', function (a) {
      a.ok(X && X.regions && X.totals, 'SAMPLE_EXPECT has regions and totals');
      a.deepEqual(P.regions.map(function (r) { return r.id; }), X.regions, 'same regions in the same order');
      P.regions.forEach(function (r) {
        var arr = sum(r.marketCoverage.map(function (m) { return m.currentArr || 0; }));
        a.equal(X.totals[r.id]['base.arr'], arr, r.id + ' current ARR total');
      });
    });
  });
})();
