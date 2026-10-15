/*
 * File: content/text-owner-report.js
 * Purpose: Wording for the review report each workbook owner receives (US-1.8.11, D166): the file's title, facts, what to
 *          do, the per-kind sections and closing lines, its text version, the file names, and the "Reports for workbook
 *          owners" list in the Import report and the data sources panel. Placeholders in {braces} are filled in by the
 *          code; the organization layer can replace any phrase by using the same key. Observations, not judgements (D20).
 * Provides: adds TAP_CONTENT.text.ownerReport
 * Depends on: nothing
 * Used by: js/ui/owner-report.js, js/ui/owner-report-ui.js
 * Owner: REPORTS stream (#615, #616)
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};

Object.assign(window.TAP_CONTENT.text, {
  ownerReport: {
    // The file: the title, the facts under it, what to do, the summary, the sections and the closing line
    title: 'Data review: {region}',
    allTitle: 'Data review: all workbooks',
    contents: 'Contents',
    contentsItem: '{region}: {count}',
    workbook: 'Workbook',
    saved: 'Saved',
    imported: 'Imported',
    reportDate: 'Report date',
    // A workbook the import could not use (a reading with errors): one plain sentence under the facts, nothing technical (D169)
    leftOut: 'This workbook could not be imported; the person who runs the import has the details.',
    todo: 'Open the workbook and go to each cell listed below. Fix what needs fixing, let the workbook recalculate, save it and send the file back. A blank cell reads as "not provided" in the app, which is fine where that is what you mean.',
    summary: '{n} items in {k} groups',
    summaryOne: '1 item in 1 group',
    kind: '{title} ({n})',
    none: 'Nothing to review in this workbook.',
    closing: 'Once the workbook is updated, send it back so the plans can be imported again.',
    // The text version: "where · sheet › cell: found X, expected Y" per item; with the cells behind the values (D169),
    // "where: found X (sheet › cell), expected Y (sheet › cells)"
    textCells: '{text} ({cells})',
    textSep: ' · ',
    textAt: ': ',
    textJoin: ', ',
    textItem: '- {line}',
    textIndent: '  ',
    // File names; the date is written year first
    fileName: '{region} data review {date}',
    allFileName: 'All workbooks data review {date}',
    allId: 'all-workbooks',

    // The list in the Import report and the data sources panel (js/ui/owner-report-ui.js)
    ui: {
      title: 'Reports for workbook owners',
      intro: 'One report per workbook, for its owner: the notes and warnings above in plain words, with the sheet and cell of each one and nothing technical. Download it as a page to print or send, or copy it as text for an email.',
      count: '{n} items',
      countOne: '1 item',
      none: 'Nothing to review',
      download: 'Download',
      copy: 'Copy as text',
      all: 'All workbooks',
      downloadAll: 'Download all workbooks',
      downloadOne: 'Download the report for {region}',
      copyOne: 'Copy the report for {region} as text',
      saved: 'The browser saved {name} to its Downloads folder.',
      copied: 'Report copied.',
      copyManual: 'This browser blocked copying. The report is selected below: press Ctrl+C to copy it.',
      textLabel: 'The report as text'
    }
  }
});
