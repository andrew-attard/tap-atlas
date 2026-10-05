/*
 * File: js/views/outlook.js
 * Purpose: The Outlook view: the plans against the strategic plan and the base year, pipeline coverage, the revenue outlook and order intake by product category (Epics 4.2 and 4.3, US-4.4.2).
 * Provides: view 'outlook' (registered with TAP.views)
 * Depends on: js/ui/view-head.js, js/panel/panel.js, config/reports-outlook.js
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 * Owner: OUTLOOK stream (#441)
 */
(function (TAP) {
  'use strict';
  TAP.stub.view('outlook', 'Outlook', 441);
  TAP.views.get('outlook').available = function () { return false; };   // until built: never in the menu
})(window.TAP);
