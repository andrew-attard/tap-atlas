/*
 * File: content/text-shell.js
 * Purpose: Wording for the page frame: banners, start-up messages, menu, comparison bar and data sources panel.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/ui/*.js through TAP.content.text
 * Owner: the SHELL stream. Placeholders in {braces} are filled in by the code; the organization layer can
 *        replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  banner: {
    sample: 'Sample data: all figures are fictional',
    internal: 'Internal: contains regional plan data, do not forward'
  },

  screens: {
    missingTitle: 'No plan data found',
    missingBody: 'Run the import to create data/plan-data.js, then reopen this page.',
    versionTitle: 'The data file doesn’t match this version of the app',
    versionBody: 'The data file says version {found}; this app reads version {expected}. Re-run the import, or use the matching app folder.',
    invalidTitle: 'The data file has problems that stop the app from opening',
    invalidBody: 'Fix the items below in the import, then reopen this page. The list can be copied for Copilot.',
    copy: 'Copy the list'
  }
});
