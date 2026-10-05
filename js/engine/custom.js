/*
 * File: js/engine/custom.js
 * Purpose: Custom charts: the measure and dimension pairs each measure allows, a report definition built from a choice, and the session list (Epic 3.5).
 * Provides: TAP.custom (options, definition, saved, save, remove)
 * Depends on: js/engine/measures.js, js/engine/registry.js (at call time)
 * Used by: js/ui/custom-builder.js, js/ui/present.js (custom steps)
 * Owner: CUSTOM stream (#250)
 */
(function (TAP) {
  'use strict';
  TAP.stub('custom', ['options', 'definition', 'saved', 'save', 'remove'], 250);
})(window.TAP);
