/*
 * File: js/reports/cg-builders.js
 * Purpose: Thin wrappers round the generic builders for the Customer growth reports: segment shades, the multiplier
 *          note, exposure reference lines from the rule thresholds, and bar targets that list accounts.
 * Provides: builders 'cgSegments', 'cgGrowth', 'cgExposure'
 * Depends on: js/engine/build-parts.js, js/engine/build-compare.js, config/insight-rules.js
 * Used by: config/reports-customers.js
 * Owner: CGP stream (#204)
 */
(function (TAP) {
  'use strict';
  TAP.stub.builder('cgSegments', 204);
  TAP.stub.builder('cgGrowth', 205);
  TAP.stub.builder('cgExposure', 207);
})(window.TAP);
