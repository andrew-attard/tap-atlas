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
    intro: 'Reads the planning workbooks with the mapping {version}. Everything happens in this browser: nothing leaves this computer and nothing is kept in the browser.',
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
    },

    // READ stream (#585): the mapping's problems, one sentence each, and the notes and errors of reading a workbook.
    // A note's sheet and cell are shown next to the message, so the message itself names the field and the value.
    read: {
      map: {
        notObject: 'The mapping is not an object.',
        noMeta: 'The mapping has no meta object.',
        years: 'The mapping’s meta.years must list three different plan years.',
        regions: 'The mapping has no regions list.',
        regionId: 'Region {n} in the mapping has no id.',
        duplicateRegion: 'The region id {id} is used twice in the mapping.',
        regionFile: 'Region {id} in the mapping has no file name.',
        lookups: 'The mapping has no lookups object.',
        lookupList: 'The mapping’s lookups have no {list}.',
        sections: 'The mapping has no sections object.',
        required: 'The mapping has no {section} section.',
        badSection: 'The {section} section of the mapping is not an object.',
        sheet: 'The {section} section of the mapping names no sheet.',
        firstRow: 'The {section} section of the mapping has no first row.',
        columns: 'The {section} section of the mapping has no columns.',
        column: 'In the {section} section of the mapping, the column for {field} is not a column letter or a list of three letters.',
        cells: 'In the {section} section of the mapping, cells must map each field to a cell address such as N3.',
        filterCell: 'In the {section} section of the mapping, filterCell is not a cell address.',
        axis: 'The {section} section of the mapping has no {part}.',
        axisFirst: 'In the {section} section of the mapping, {part} needs a first row or column and a list of axes.',
        axisField: 'In the {section} section of the mapping, the {part} axis field {field} is not known.',
        axisValue: 'In the {section} section of the mapping, the {field} value {value} names no entry of the lookups.',
        axisEntry: 'In the {section} section of the mapping, each listed {part} entry needs a {at}.',
        blank: 'In the {section} section of the mapping, blank must be null or skip.',
        extra: 'The mapping’s extra sections must be a list.',
        extraEntry: 'Extra section {n} in the mapping needs an id, a title, a sheet, a first row and a list of columns.',
        nameCell: 'The mapping’s nameCell needs a sheet and a cell.',
        placeholders: 'The mapping’s placeholders must be a list of texts, one per dropdown placeholder such as "Select channel".'
      },
      blankCell: 'a blank cell',
      noResult: 'a formula with no saved result',
      badValue: '{field}: the value {found} was not recognized and is left blank.',
      errorCell: '{field}: the cell holds the error {found} and is left blank.',
      formulaNoValue: '{field}: the cell holds a formula with no saved result and is left blank. Save the workbook after it has recalculated.',
      headerMismatch: 'The heading {expected} was not found at {cell}, which holds {found}. The sheet is not read.',
      filterMismatch: 'The region filter holds {found}, not {expected}. The block is not read.',
      unknownIndustry: 'The industry {found} is not in the industry list; the row is left out.',
      tierDiffers: 'The tier column holds {found}; the Market Coverage tier for this industry is {expected}, which is used.',
      looseSheet: 'The sheet {found} was read for {expected}: the names differ in case or spacing.'
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
