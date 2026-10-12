/*
 * File: js/import/import-grid.js
 * Purpose: Expands a grid block's row and column axes and reads its cells into recap-shaped items with a sourceCell each; docs/ARCHITECTURE.md section 20. Stub until the READ stream builds it (#585).
 * Provides: TAP.importGrid (expand, block)
 * Depends on: js/import/xlsx-book.js, js/import/import-values.js, js/core/content.js
 * Used by: js/import/import-region.js
 * Owner: READ stream
 */
(function (TAP) {
  'use strict';

  TAP.importGrid = {
    expand: TAP.stub.fn('TAP.importGrid.expand', 585),
    block: TAP.stub.fn('TAP.importGrid.block', 585)
  };
})(window.TAP);
