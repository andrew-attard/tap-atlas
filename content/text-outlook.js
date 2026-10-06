/*
 * File: content/text-outlook.js
 * Purpose: Wording for the Outlook view and its reports.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/views/outlook.js
 * Owner: OUTLOOK stream. Placeholders in {braces} are filled in by the code; the organization layer can replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  // US-4.2.1: the Outlook view
  outlookView: {
    kicker: 'Outlook',
    title: 'How do the plans compare with the strategy and this year?',
    lead: 'Each region’s planned order intake against its strategic plan and the current year, the pipeline behind it, and the revenue the plans release.',
    label: 'Outlook reports',
    // One line in place of the panels when the file has none of these parts of the template
    none: 'This plan data has no strategic plan, base year, revenue outlook or order intake through the books for any region, so there is nothing to compare here yet.',
    // One line under the panels when only some parts are missing; {names} lists them
    some: 'Not in this plan data for any region: {names}.',
    names: {
      'ol-strategic': 'the strategic plan',
      'ol-baseyear': 'the base year',
      'ol-coverage': 'pipeline coverage',
      'ol-revenue': 'the revenue outlook',
      'ol-revshare': 'revenue against order intake',
      'ol-category': 'order intake by product category'
    },
    // US-4.2.3: the base-year report's explanation names the month the actuals run to ({months})
    months: 'January February March April May June July August September October November December',
    month: '{month} {year}',
    actualsTo: 'The actuals cover part of the year only: they run to {months}, so they sit below the full-year budget and forecast.',
    actualsPart: 'The actuals cover part of the year only, up to the month the workbook gives, so they sit below the full-year budget and forecast.'
  },

  // Pipeline coverage (js/reports/outlook-coverage.js): the table's parts of the ratio, the note and the line at 1
  olCoverage: {
    pipeline: 'Pipeline',
    left: 'Still to win',
    refLine: 'Coverage 1×',
    workedOut: 'For {names}, the workbook leaves out the coverage ratio for some or all product categories, so the ratio there is worked out by this app: unweighted pipeline over the order intake still to win (forecast minus actuals).'
  },

  // The side-by-side charts (js/reports/outlook-side.js): the closing line after each row's bars
  olSide: {
    endBoth: '{label} {amount} ({rate})',
    endOne: '{label} {value}',
    amountOf: '{label}',
    rateOf: '{label}, %',
    // A region's row under a combined total in the table
    partOf: '{region}, in {total}'
  }
});
