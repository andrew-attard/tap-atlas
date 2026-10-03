/*
 * File: tests/test-meta.js
 * Purpose: Checks about the test page and the build itself: every automated test case has a test, no stubs at release.
 * Provides: test cases TPV-TC-219, TPV-TC-202, TPV-TC-203, TPV-TC-204, TPV-TC-042, X-meta-*
 * Depends on: tests/harness.js, tests/auto-cases.js, every test file (loads last)
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  T.suite('meta', function () {
    // Registered last so every other test file has registered its cases first.
    T.test('TPV-TC-219', 'Every automated test case in the Test Plan has a matching test', function (a) {
      var have = T.ids();
      var missing = (window.TAP_AUTO_CASES || []).map(function (c) { return c.id; })
        .filter(function (id) { return have.indexOf(id) < 0; });
      a.ok(window.TAP_AUTO_CASES && window.TAP_AUTO_CASES.length > 0, 'the automated case list is loaded');
      if (T.release) a.deepEqual(missing, [], 'automated cases without a test');
    });

    T.test('X-meta-no-stubs', 'No module is still a stub (checked at release)', function (a) {
      if (T.release) a.deepEqual(TAP.stub.list(), [], 'remaining stubs');
      else a.ok(Array.isArray(TAP.stub.list()), 'stub list readable');
    });

    // These are file checks, run by tools/lint.js in scripts/verify.sh, not in the browser.
    T.skip('TPV-TC-202', 'Every code file starts with a header', 'Checked by tools/lint.js (rule 1) in scripts/verify.sh');
    T.skip('TPV-TC-203', 'Files over about 300 lines are listed', 'Checked by tools/lint.js (rule 2) in scripts/verify.sh');
    T.skip('TPV-TC-204', 'Every path the "which files for which change" table names exists', 'Checked by tools/check-docs.js in scripts/verify.sh');
    T.skip('TPV-TC-042', 'No colour values or organization names outside the theme file', 'Checked by tools/lint.js (rule 4) and the denylist scan in scripts/verify.sh');
  });
})(window.TAP);
