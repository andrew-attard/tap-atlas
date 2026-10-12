/*
 * File: js/import/import-fields.js
 * Purpose: The field kinds of every row section, in the Data Contract's order, and the units of extra sections; docs/ARCHITECTURE.md section 20. Stub until the READ stream builds it (#585).
 * Provides: TAP.importFields (SECTIONS, EXTRA_UNITS)
 * Depends on: js/core/namespace.js
 * Used by: js/import/import-rows.js, js/import/import-values.js
 * Owner: READ stream
 */
(function (TAP) {
  'use strict';

  TAP.stub.fn('TAP.importFields.SECTIONS', 585);
  TAP.importFields = { SECTIONS: {}, EXTRA_UNITS: {} };
})(window.TAP);
