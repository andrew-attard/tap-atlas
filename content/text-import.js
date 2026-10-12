/*
 * File: content/text-import.js
 * Purpose: Wording for the Import panel, its report and the import's notes and errors (D147). Placeholders in {braces} are filled in by the code; the organization layer can replace any phrase by using the same key.
 * Provides: adds TAP_CONTENT.text.importPanel
 * Depends on: nothing
 * Used by: js/ui/import-panel.js, js/ui/import-report.js, js/import/*.js
 * Owner: UI stream (#587); the READ and PLAN streams add their message keys here
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};

Object.assign(window.TAP_CONTENT.text, {
  importPanel: {
    title: 'Import workbooks'
  }
});
