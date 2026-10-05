/*
 * File: js/views/other.js
 * Purpose: The Other sections view: one list per extra template section in the data, shown only when there are any (US-3.2.2).
 * Provides: view 'other' (registered with TAP.views, with available())
 * Depends on: js/ui/view-head.js, js/panel/panel.js, js/engine/rows.js
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 * Owner: EXTRA stream (#238)
 */
(function (TAP) {
  'use strict';
  TAP.stub.view('other', 'Other sections', 238);
  TAP.views.get('other').available = function () { return false; };   // until built: never in the menu
})(window.TAP);
