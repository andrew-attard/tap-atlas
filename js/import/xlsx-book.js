/*
 * File: js/import/xlsx-book.js
 * Purpose: Opens a workbook (an ArrayBuffer) through the vendored SheetJS library and gives sheets, cells and stored values; docs/ARCHITECTURE.md section 20. Stub until the READ stream builds it (#585).
 * Provides: TAP.xlsxBook (available, open, colIndex, colLetter, addr, split, serialToDate, iso)
 * Depends on: vendor/xlsx.mini.min.js, js/core/namespace.js
 * Used by: js/import/import-rows.js, js/import/import-grid.js, js/import/import-region.js
 * Owner: READ stream
 */
(function (TAP) {
  'use strict';

  TAP.xlsxBook = {
    available: TAP.stub.fn('TAP.xlsxBook.available', 585),
    open: TAP.stub.fn('TAP.xlsxBook.open', 585),
    colIndex: TAP.stub.fn('TAP.xlsxBook.colIndex', 585),
    colLetter: TAP.stub.fn('TAP.xlsxBook.colLetter', 585),
    addr: TAP.stub.fn('TAP.xlsxBook.addr', 585),
    split: TAP.stub.fn('TAP.xlsxBook.split', 585),
    serialToDate: TAP.stub.fn('TAP.xlsxBook.serialToDate', 585),
    iso: TAP.stub.fn('TAP.xlsxBook.iso', 585)
  };
})(window.TAP);
