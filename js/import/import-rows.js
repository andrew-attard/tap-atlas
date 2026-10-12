/*
 * File: js/import/import-rows.js
 * Purpose: Reads the row sections of one workbook through the mapping: header check, spare rows, by-year columns, fixed cells; docs/ARCHITECTURE.md section 20. Stub until the READ stream builds it (#585).
 * Provides: TAP.importRows (read, section, customerGrowth, baseYear, cells, extra)
 * Depends on: js/import/xlsx-book.js, js/import/import-values.js, js/import/import-fields.js, js/core/content.js
 * Used by: js/import/import-region.js
 * Owner: READ stream
 */
(function (TAP) {
  'use strict';

  TAP.importRows = {
    read: TAP.stub.fn('TAP.importRows.read', 585),
    section: TAP.stub.fn('TAP.importRows.section', 585),
    customerGrowth: TAP.stub.fn('TAP.importRows.customerGrowth', 585),
    baseYear: TAP.stub.fn('TAP.importRows.baseYear', 585),
    cells: TAP.stub.fn('TAP.importRows.cells', 585),
    extra: TAP.stub.fn('TAP.importRows.extra', 585)
  };
})(window.TAP);
