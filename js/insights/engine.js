/*
 * File: js/insights/engine.js
 * Purpose: Runs the insight rules, scores and ranks what they find, and keeps the session's hidden list.
 * Provides: TAP.insights (defineRule, all, ranked, top, hide, unhide, hidden, failures, reset)
 * Depends on: config/insight-rules.js, js/engine/*, js/core/content.js
 * Used by: panels, the Overview, the Insights page, the data sources panel
 */
(function (TAP) {
  'use strict';
  // Not built yet: a stub of the right shape (#44). See docs/ARCHITECTURE.md.
  TAP.stub('insights', ['defineRule', 'all', 'ranked', 'top', 'hide', 'unhide', 'hidden', 'failures', 'reset'], 44);
})(window.TAP);
