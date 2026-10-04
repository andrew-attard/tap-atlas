/*
 * File: js/reports/themes.js
 * Purpose: Finds recurring themes in commentary and success factors with the keyword rules in config/comment-themes.js, and draws the themes report (US-2.5.1).
 * Provides: TAP.themes (all, match), builder 'themes'
 * Depends on: config/comment-themes.js, js/core/data.js, js/engine/shapes.js
 * Used by: js/insights/rules-themes.js, js/panel/panel.js
 * Owner: INSIGHTS2 stream (#72)
 */
(function (TAP) {
  'use strict';
  TAP.stub('themes', ['all', 'match'], 72);
  TAP.stub.builder('themes', 72);
})(window.TAP);
