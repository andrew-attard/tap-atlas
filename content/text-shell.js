/*
 * File: content/text-shell.js
 * Purpose: Wording for the page frame: banners, start-up messages, menu, comparison bar and data sources panel.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/ui/*.js through TAP.content.text; js/panel/panel-menus.js (comparison wording)
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
    // The others in one vs the rest, as one control: one by one, or combined as their average or total (D50)
    rest: 'The others',
    restIndividual: 'Individually',
    restAverage: 'Average',
    restTotal: 'Total',
    setLabel: 'Regions in the set',
    setButton: '{n} of {total} regions',
    setDone: 'Done',
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

  // Start-up screens (US-1.1.1, US-1.8.2). They replace the views when the data can't be used.
  screens: {
    banner: 'No plan data is shown',
    missingTitle: 'No plan data found',
    missingBody: 'The data file is missing or could not be read. Run the import to create data/plan-data.js, then reopen this page.',
    missingLooked: 'Looked for: data/plan-data.js, next to index.html. To look around with fictional figures, open index-sample.html.',
    versionTitle: 'The data file doesn’t match this version of the app',
    versionBody: 'The data file says version {found}; this app reads version {expected}. Re-run the import, or use the matching app folder.',
    invalidTitle: 'The data file has problems that stop the app from opening',
    invalidBody: 'Fix the items below in the import, then reopen this page. The list can be copied for Copilot.',
    count: 'Problems found: {n}',
    colNumber: '#',
    colRegion: 'Region',
    colWhere: 'Where in the data file',
    colExpected: 'Expected',
    colFound: 'Found',
    colProblem: 'Problem',
    copyHeading: 'Data file check: {n} problems',
    copy: 'Copy the list',
    copied: 'List copied.',
    copyManual: 'This browser blocked copying. The list is selected below: press Ctrl+C to copy it.'
  }
});
