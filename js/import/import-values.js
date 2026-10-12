/*
 * File: js/import/import-values.js
 * Purpose: Turns a stored cell value into a Data Contract value by kind: numbers, shares, ratings, tiers, lookup ids, months; blanks stay null; docs/ARCHITECTURE.md section 20. Stub until the READ stream builds it (#585).
 * Provides: TAP.importValues (create)
 * Depends on: js/core/content.js
 * Used by: js/import/import-rows.js, js/import/import-grid.js
 * Owner: READ stream
 */
(function (TAP) {
  'use strict';

  TAP.importValues = {
    create: TAP.stub.fn('TAP.importValues.create', 585)
  };
})(window.TAP);
