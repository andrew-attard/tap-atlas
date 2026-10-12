/*
 * File: content/text-import.js
 * Purpose: Wording for the Import panel, its report and the import's notes and errors (D147). Placeholders in {braces} are filled in by the code; the organization layer can replace any phrase by using the same key.
 * Provides: adds TAP_CONTENT.text.importPanel
 * Depends on: nothing
 * Used by: js/ui/import-panel.js, js/ui/import-report.js, js/import/*.js
 * Owner: UI stream (#587); the READ and PLAN streams add their message keys here under importPanel.read and importPanel.check
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};

Object.assign(window.TAP_CONTENT.text, {
  importPanel: {
    title: 'Import workbooks',
    // The button on the comparison bar (D116 style): the short word shows, the full name is its label
    button: 'Import',
    buttonLabel: 'Import workbooks',

    // The intro: which mapping the import reads with, and where the data stays
    intro: 'Reads the planning workbooks with the mapping {version}. Everything happens in this browser: nothing leaves this PC and nothing is kept in the browser.',
    sampleBadge: 'Fictional sample mapping',
    mapMissing: 'The import mapping (config/import-map.js) is missing, so no workbook can be read.',
    mapProblems: 'The import mapping (config/import-map.js) has problems, so no workbook can be read:',

    pick: 'Choose the workbooks',
    statusIdle: 'Pick one workbook per region.',
    statusReading: 'Reading {i} of {n}: {name}',
    statusDone: '{k} of {n} workbooks imported.',
    statusFailed: 'The import stopped: {message}',

    // The three actions and why they are disabled
    use: 'Use these plans now',
    useSome: 'Use these {k} of {n} plans',
    save: 'Save data/plan-data.js',
    copy: 'Copy report',
    whyNoResult: 'Pick the workbooks first.',
    whyErrors: 'Fix the errors above first: {n} problems.',
    whyNone: 'No plan could be built from these workbooks.',
    saved: 'The browser saved plan-data.js to its Downloads folder. Move it into the app folder\'s data folder, replacing the old file, then reopen index.html. Delete the copy in Downloads.',
    copied: 'Report copied.',
    copyManual: 'This browser blocked copying. The report is selected below: press Ctrl+C to copy it.',
    textLabel: 'The report as text',

    // The report (js/ui/import-report.js)
    report: {
      summary: '{k} of {n} workbooks imported',
      leftOut: 'left out',
      leftOutOne: '1 left out',
      leftOutMany: '{m} left out',
      missingOne: '1 mapped region without a workbook',
      missingMany: '{p} mapped regions without a workbook',
      missingList: 'Without a workbook: {names}.',
      mapProblems: 'Mapping problems',
      file: 'File',
      saved: 'Saved',
      parts: 'Imported parts',
      partsNone: 'none',
      notes: 'Notes',
      errorsTitle: 'Why it was left out',
      notesTitle: 'Notes',
      checkErrors: 'What the app would refuse',
      checkWarnings: 'What the app will also warn about',
      colNumber: '#',
      colRegion: 'Region',
      colWhere: 'Where in the data file',
      colExpected: 'Expected',
      colFound: 'Found'
    },
    // The parts of a workbook, as the report lists them
    parts: {
      marketCoverage: 'Market coverage',
      newBusiness: 'New business',
      customerGrowth: 'Customer growth',
      partners: 'Partners',
      recap: 'Recap',
      baseYear: 'Order intake',
      revenue: 'Revenue',
      booksValue: 'Books value',
      strategicPlan: 'Strategic plan',
      routes: 'Routes to market',
      extra: 'Other sections'
    }
  }
});

// The PLAN stream's messages (#586): the region checks, the plan build and the plain-text report.
window.TAP_CONTENT.text.importPanel.check = {
  sections: { marketCoverage: 'Market Coverage', newBusiness: 'New Business', customerGrowth: 'Customer Growth',
    partners: 'Partner', recap: 'Recap', revenue: 'Revenue', booksValue: 'Books value', strategicPlan: 'Strategic plan',
    baseYear: 'Base year', routes: 'Routes', extra: 'Other sections' },
  unmatchedWorkbook: 'The workbook {file} matches no region of the mapping. It was read as "{name}" ({id}).',
  missingSheet: 'The sheet {sheet} for {section} is missing from the workbook.',
  duplicateRegion: 'Two workbooks were read for {name} ({files}). Neither is used.',
  unreadable: 'The workbook {file} could not be read: {reason}',
  missingIndustries: 'No Market Coverage row for {n} rated industries: {names}.',
  emptySection: 'The {section} section is empty.',
  splitSum: 'The channel split adds up to {sum}%, not 100%.',
  arrFormula: 'ARR potential for year 1 is {found}; target accounts × hit rate × average deal size gives {value}.',
  segmentRule: 'The segment is {found}; the thresholds give {segment}.',
  variance: 'The variance is {found}; books order intake minus the strategic plan gives {value}.',
  revenueAbove: 'Revenue {found} is above the order intake {value} for {key}.',
  booksAbove: 'The books value {found} is above the customer value {value} for {key}.',
  coverage: 'The coverage ratio is {found}; pipeline over forecast minus actuals gives {value}.',
  report: {
    region: '{name}: {status}',
    imported: 'imported',
    leftOut: 'left out',
    facts: '  file {file}, saved {date}, parts: {parts}',
    noDate: 'no saved date',
    part: '{section} {state}',
    parts: { read: 'read', empty: 'empty', missing: 'missing', error: 'error' },
    error: '  Error {where}: {message}',
    note: '  Note {where}: {message}',
    where: '{sheet} › {cell}',
    whereSheet: '{sheet}',
    whereNone: 'workbook',
    missing: 'Missing workbook: {name} ({id})',
    mapProblem: 'Mapping: {message}',
    none: 'No workbook was read.',
    checkErrors: 'Contract check: {n} errors',
    checkWarnings: 'Contract check: {n} warnings',
    checkLine: '  {message}'
  }
};
