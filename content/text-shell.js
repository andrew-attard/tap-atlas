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
    // Four modes, in the bar's order (D99). One vs one is no longer offered; old settings read it as a selection.
    modes: { all: 'All regions', set: 'Selected regions', one: 'One vs the rest', org: 'All regions combined' },
    focus: 'Focus region',
    // The others in one vs the rest, as one control: one by one, or combined as their average or total (D50)
    rest: 'The others',
    restIndividual: 'Individually',
    restAverage: 'Average',
    restTotal: 'Total',
    setLabel: 'Selected regions',
    setButton: '{n} of {total} regions',
    setDone: 'Done',
    setMin: 'At least one region stays selected, so the charts have something to show. Select another region first.',
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
    none: 'None.'
  },

  // The data sources panel (US-1.1.5). Import notes appear here and nowhere else.
  sourcesPanel: {
    title: 'Data sources',
    // D100: addresses sit behind the data icon, so the panel says how to find them
    iconHelp: 'Where a figure comes from: select the data icon beside it to see the file, sheet and cells it was read from, and whether it is a leader’s input, a system figure or calculated in the workbook.',
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

  // The data icon beside a figure and its popover (D100, js/ui/source-tip.js)
  sourceTip: {
    label: 'Where this comes from',
    labelOf: 'Where this comes from: {label}',
    close: 'Close'
  },

  // Start-up screens (US-1.1.1, US-1.8.2). They replace the views when the data can't be used.
  screens: {
    banner: 'No plan data is shown',
    missingTitle: 'No plan data found',
    missingBody: 'The data file is missing or could not be read. Run the import to create data/plan-data.js, then reopen this page.',
    missingLooked: 'Looked for: data/plan-data.js, next to index.html. To look around with fictional figures, open index-sample.html.',
    openSample: 'Open the sample data edition',
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
    copyManual: 'This browser blocked copying. The list is selected below: press Ctrl+C to copy it.',
    // A view that failed to draw (the rest of the app keeps working)
    viewFailed: 'This page could not be drawn: {message}'
  }
});
