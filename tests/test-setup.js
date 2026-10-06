/*
 * File: tests/test-setup.js
 * Purpose: Puts the app in a known state before every test: default store, no event handlers, mini fixture loaded.
 * Provides: window.T_BEFORE_EACH, window.T_FIXTURE, window.T_WITH_EXTRA
 * Depends on: tests/harness.js, the app scripts, tests/fixtures/mini-data.js, tests/fixtures/sample-expected.js
 *             (SAMPLE_EXPECT.extra.fixture), data/sample-plan-data.js
 * Used by: tests/harness.js (calls T_BEFORE_EACH before each test)
 */
(function () {
  'use strict';

  // A deep copy, so a test that changes the fixture can't affect the next one.
  window.T_FIXTURE = function (name) {
    return JSON.parse(JSON.stringify(window.TEST_FIXTURES[name]));
  };

  // A copy of the plan (the sample if none is given) with the test extra section added: the sample itself has
  // none (D93), so the extra-section tests (US-3.2.1, US-3.2.2) add the fictional "5. Events" section here.
  window.T_WITH_EXTRA = function (plan) {
    var p = JSON.parse(JSON.stringify(plan || window.PLAN_DATA));
    var f = JSON.parse(JSON.stringify(window.SAMPLE_EXPECT.extra.fixture));
    p.meta.extraSections = (p.meta.extraSections || []).concat([f.section]);
    p.regions.forEach(function (r) {
      var rows = f.rows[r.id];
      if (rows && rows.length) { r.extra = r.extra || {}; r.extra[f.section.id] = rows; }
    });
    return p;
  };

  window.T_BEFORE_EACH = function () {
    window.TAP.app.stop();   // a test that started the app and forgot to stop it can't leak into the next
    window.TAP.bus.clear();
    window.TAP.store.reset();
    window.TAP.data.load(window.T_FIXTURE('mini'));
  };
})();
