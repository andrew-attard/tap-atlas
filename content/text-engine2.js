/*
 * File: content/text-engine2.js
 * Purpose: Wording for Phase 2 measures, lists and breakdowns.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: the matching js files
 * Owner: ENGINE2 stream. Placeholders in {braces} are filled in by the code; the organization layer can replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  viewHead: {
    showMe: 'Show me'
  }
});
// Menu names for the Phase 2 chart types, added to the Phase 1 list in content/text-engine.js
window.TAP_CONTENT.text.chartTypes = Object.assign(window.TAP_CONTENT.text.chartTypes || {}, {
  list: 'List'
});
