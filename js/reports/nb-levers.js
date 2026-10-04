/*
 * File: js/reports/nb-levers.js
 * Purpose: The levers report's builder (US-2.1.4): bars, dots and table through the compare builder, and the bubble
 *          view (target accounts across, hit rate up, size = average deal size).
 * Provides: builder 'nbLevers'
 * Depends on: js/engine/build-compare.js, js/engine/shapes.js (at call time)
 * Used by: config/reports-newbusiness.js (nb-levers)
 * Owner: NB stream (#200)
 */
(function (TAP) {
  'use strict';
  TAP.stub.builder('nbLevers', 200);
})(window.TAP);
