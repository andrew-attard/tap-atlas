/*
 * File: content/ui-text.js
 * Purpose: Every on-screen phrase that isn't a glossary entry or guide text, so wording changes need no code.
 * Provides: window.TAP_CONTENT.text
 * Depends on: nothing
 * Used by: js/core/content.js (TAP.content.text) and through it every module that shows words
 *
 * Placeholders in {braces} are filled in by the code, e.g. {focus} or {n}.
 * The organization layer (content/organization.js) can replace any of these by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = {
  app: { name: 'TAP Atlas', subtitle: 'Territory Account Plan Atlas' },

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
  },

  // Comparison sentences (US-1.1.3)
  scope: {
    all: 'Showing all {n} regions side by side',
    oneIndividual: 'Showing {focus} against the other {n} regions',
    oneAverage: 'Showing {focus} against the average of the other {n} regions',
    oneTotal: 'Showing {focus} against the total of the other {n} regions',
    pair: 'Showing {focus} against {second}',
    set: 'Showing {n} chosen regions: {names}',
    org: 'Showing the organization total across all {n} regions'
  },

  // Labels for combined figures
  combined: {
    restAverage: 'Average of the other {n} regions',
    restTotal: 'Total of the other {n} regions',
    org: 'Organization total ({n} regions)',
    explainAverage: 'Each region counts equally. For rates such as hit rate, larger regions count more, in proportion to their size.',
    explainTotal: 'The regions’ figures added together. Rates such as hit rate are averaged, with larger regions counting more.'
  },

  states: {
    notProvided: 'not provided',
    empty: 'No region has data for this report yet.',
    missing: 'Not included (no data): {names}'
  }
};
