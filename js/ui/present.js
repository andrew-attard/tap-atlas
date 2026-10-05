/*
 * File: js/ui/present.js
 * Purpose: Presentation mode: steps through the running order full screen, each step with its own report, measure, comparison and highlight, and records a running order from the screen (Epic 3.1).
 * Provides: TAP.present (check, start, stop, next, prev, first, current, active, record, recorded, move, remove, clearRecorded, asFileText)
 * Depends on: config/running-order.js, js/ui/present-steps.js, js/panel/panel.js, js/core/store.js, js/core/storage.js (at call time)
 * Used by: js/ui/shell.js (Present button), js/ui/keys.js (P), js/views/guide.js (recorded steps)
 * Owner: PRESENT stream (#233)
 */
(function (TAP) {
  'use strict';
  var mod = TAP.stub('present', ['check', 'start', 'stop', 'next', 'prev', 'first', 'current', 'active', 'record', 'recorded', 'move', 'remove', 'clearRecorded', 'asFileText'], 233);
  // The step check is built (US-3.1.1, #232); the rest follows with #233 and #234.
  mod.check = function (steps) { return TAP.presentSteps.check(steps); };
})(window.TAP);
