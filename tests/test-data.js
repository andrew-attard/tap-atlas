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
    T.test('X-data-names-vetted', 'Account and partner names come only from the vetted stems, with 30% spare stems', function (a) {
      var V = X.vettedNames;
      var flagged = ['Draxwell', 'Embervale', 'Nimbrook', 'Kestrelwick', 'Hollowmere', 'Xanthorpe', 'Zelmora', 'Bonkersby', 'Hiccupvale'];
      var used = [];
      P.regions.forEach(function (r) {
        r.customerGrowth.accounts.concat(r.partners).forEach(function (x) {
          var stem = x.name.split(' ')[0];
          used.push(stem);
          a.ok(V.stems.indexOf(stem) !== -1, 'vetted stem: ' + x.name);
          a.ok(V.kinds.indexOf(x.name.slice(stem.length + 1)) !== -1, 'known kind of business: ' + x.name);
          a.ok(flagged.indexOf(stem) === -1, 'not a flagged name: ' + x.name);
        });
      });
      a.ok(V.stems.length >= used.length * 1.3, V.stems.length + ' stems for ' + used.length + ' names');
      flagged.forEach(function (f) { a.equal(V.stems.indexOf(f), -1, f + ' is not in the vetted list'); });
    });

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
