/*
 * File: js/ui/showme.js
 * Purpose: Wires "Show me" across views: opens the right view and chart, widens the comparison if needed,
 *          and highlights the data the insight refers to.
 * Provides: TAP.showme (go)
 * Depends on: js/core/store.js, js/engine/registry.js, js/ui/layers.js
 * Used by: js/ui/app.js (listens for the 'showme' event at start-up)
 */
(function (TAP) {
  'use strict';
  // Not built yet: a stub of the right shape (#65). Built by the INTEGRATOR stream in Wave 3.
  TAP.stub('showme', ['go'], 65);
})(window.TAP);
