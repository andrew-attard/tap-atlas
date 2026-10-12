/*
 * File: js/import/import-write.js
 * Purpose: Writes the plan as the data file's text (window.PLAN_DATA = {...}), downloads it, and writes the report as plain text; docs/ARCHITECTURE.md section 20. Stub until the PLAN stream builds it (#586).
 * Provides: TAP.importWrite (text, jsonPart, download, report)
 * Depends on: js/panel/panel-export.js, js/core/content.js
 * Used by: js/ui/import-panel.js
 * Owner: PLAN stream
 */
(function (TAP) {
  'use strict';

  TAP.importWrite = {
    text: TAP.stub.fn('TAP.importWrite.text', 586),
    jsonPart: TAP.stub.fn('TAP.importWrite.jsonPart', 586),
    download: TAP.stub.fn('TAP.importWrite.download', 586),
    report: TAP.stub.fn('TAP.importWrite.report', 586)
  };
})(window.TAP);
