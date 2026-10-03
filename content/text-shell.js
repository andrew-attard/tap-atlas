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
  menu: { label: 'Views' },

  // The comparison bar (US-1.1.3). The sentence itself comes from scope.* in content/text-engine.js.
  compare: {
    label: 'Compare',
    modesLabel: 'Comparison mode',
    modes: { all: 'All regions', one: 'One vs the rest', pair: 'One vs one', set: 'Chosen set', org: 'Organization total' },
    focus: 'Focus region',
    region: 'Region',
    second: 'against',
    restAs: 'Show the others',
    restAsIndividual: 'Individually',
    restAsCombined: 'As one figure',
    restAgg: 'Combined as',
    restAggAverage: 'Average',
    restAggTotal: 'Total',
    setLabel: 'Regions in the set',
    setMin: 'A set needs at least two regions.',
    explain: 'What the combined figure means',
    dataDate: 'Data: {date}'
  },

  banner: {
    sample: 'Sample data: all figures are fictional',
    internal: 'Internal: contains regional plan data, do not forward'
  },

  // Side panels (US-1.1.5)
  layers: {
    close: 'Close',
    escHint: 'Esc to close',
    none: 'None.',
    glossary: 'Glossary'
  },

  // The data sources panel (US-1.1.5). Import notes appear here and nowhere else.
  sourcesPanel: {
    title: 'Data sources',
    kindSample: 'Sample data · data format {v}',
    kindPlan: 'Plan data · data format {v}',
    summary: 'Data: {date} · {n} import notes',
    summaryOne: 'Data: {date} · 1 import note',
    datesDiffer: 'Import dates differ between regions, so some figures may be older than others.',
    file: 'File',
    fileDate: 'File saved',
    imported: 'Imported',
    notes: 'Import notes',
    noNotes: 'No import notes.',
    other: 'Other things to check',
    failures: 'Insight rules that were skipped'
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
