/*
 * File: tests/test-partners.js
 * Purpose: Tests for the Partners view: the view itself (US-2.3.1) and its reports.
 * Provides: test cases TPV-TC-411 to TPV-TC-417 and X-pt-*
 * Depends on: tests/harness.js, tests/test-setup.js, tests/test-customers.js (window.CGP_T), the app scripts and fixtures
 * Used by: tests.html
 * Owner: CGP stream
 */
(function (TAP) {
  'use strict';

  var H = window.CGP_T;

  T.suite('partners', function () {
    /* ---------- US-2.3.1 the view ---------- */

    H.viewChecks({ view: 'partners', menu: 'Partners', title: 'Which partners carry each plan?',
      after: 'Customer growth', afterId: 'customers', emptyRegion: 'charlie', needs: [194, 196, 206, 208],
      reports: ['pt-reliance', 'pt-capacity', 'pt-list'],
      ids: { menu: 'TPV-TC-411', headline: 'TPV-TC-413', layout: 'X-pt-layout', modes: 'TPV-TC-414', empty: 'TPV-TC-416', explain: 'TPV-TC-417', guide: 'X-pt-guide' } });
  });
})(window.TAP);
