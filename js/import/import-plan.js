/*
 * File: js/import/import-plan.js
 * Purpose: Reads every picked workbook and builds the plan (meta, lookups, regions in mapping order), then runs the app's contract check; docs/ARCHITECTURE.md section 20. Stub until the PLAN stream builds it (#586).
 * Provides: TAP.importPlan (run, build)
 * Depends on: js/import/import-map.js, js/import/import-region.js, js/core/check.js, js/core/namespace.js
 * Used by: js/ui/import-panel.js
 * Owner: PLAN stream
 */
(function (TAP) {
  'use strict';

  TAP.importPlan = {
    run: TAP.stub.fn('TAP.importPlan.run', 586),
    build: TAP.stub.fn('TAP.importPlan.build', 586)
  };
})(window.TAP);
