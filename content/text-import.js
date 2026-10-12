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
