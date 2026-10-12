/*
 * File: js/import/import-region.js
 * Purpose: Reads one workbook into one region: id and name, source record, every section and part, the checks; docs/ARCHITECTURE.md section 20. Stub until the PLAN stream builds it (#586).
 * Provides: TAP.importRegion (read, slug)
 * Depends on: js/import/xlsx-book.js, js/import/import-map.js, js/import/import-rows.js, js/import/import-grid.js, js/import/import-checks.js, js/core/content.js
 * Used by: js/import/import-plan.js
 * Owner: PLAN stream
 */
(function (TAP) {
  'use strict';

  TAP.importRegion = {
    read: TAP.stub.fn('TAP.importRegion.read', 586),
    slug: TAP.stub.fn('TAP.importRegion.slug', 586)
  };
})(window.TAP);
