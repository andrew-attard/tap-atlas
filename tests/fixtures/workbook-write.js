/*
 * File: tests/fixtures/workbook-write.js
 * Purpose: Writes workbooks from a plan and a mapping, the inverse of the import, for the round-trip tests and the sample workbooks tool (D156). Placeholder until the FIXTURES stream builds it (#584).
 * Provides: window.WORKBOOK_WRITE (workbooks, toArrayBuffer, files); module.exports in Node
 * Depends on: vendor/xlsx.mini.min.js
 * Used by: tests/test-import-plan.js, tests/test-import-fixtures.js, tools/build-sample-workbooks.js
 * Owner: FIXTURES stream
 */
(function (root) {
  'use strict';
  var WORKBOOK_WRITE = {};
  root.WORKBOOK_WRITE = WORKBOOK_WRITE;
  if (typeof module !== 'undefined') module.exports = WORKBOOK_WRITE;
})(typeof window !== 'undefined' ? window : {});
