/*
 * File: js/core/storage.js
 * Purpose: lint fixture.
 * Provides: nothing
 * Depends on: nothing
 * Used by: tools/lint.js --self-test
 */
window.TAP.storage = { get: function (k) { return localStorage.getItem(k); } };
