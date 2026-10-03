/*
 * File: tests/test-setup.js
 * Purpose: Puts the app in a known state before every test: default store, no event handlers, mini fixture loaded.
 * Provides: window.T_BEFORE_EACH, window.T_FIXTURE
 * Depends on: tests/harness.js, the app scripts, tests/fixtures/mini-data.js
 * Used by: tests/harness.js (calls T_BEFORE_EACH before each test)
 */
(function () {
  'use strict';

  // A deep copy, so a test that changes the fixture can't affect the next one.
  window.T_FIXTURE = function (name) {
    return JSON.parse(JSON.stringify(window.TEST_FIXTURES[name]));
  };

  window.T_BEFORE_EACH = function () {
    window.TAP.bus.clear();
    window.TAP.store.reset();
    window.TAP.data.load(window.T_FIXTURE('mini'));
  };
})();
