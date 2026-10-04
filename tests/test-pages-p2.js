/*
 * File: tests/test-pages-p2.js
 * Purpose: Tests for Phase 2 glossary, guide, tips, tour and shortcuts.
 * Provides: test cases for the PAGES2 stream
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: PAGES2 stream
 */
(function (TAP) {
  'use strict';
  T.suite('pages-p2', function () {
    T.test('TPV-TC-496', 'FTE and its spellings on the partner reports find the FTE entry', function (a) {
      ['FTE', 'full-time equivalent', 'full-time equivalents', 'sales FTE', 'consultant FTE'].forEach(function (w) {
        var e = TAP.content.term(w);
        a.ok(e && e.id === 'fte', '"' + w + '" finds the FTE entry');
      });
    });
  });
})(window.TAP);
