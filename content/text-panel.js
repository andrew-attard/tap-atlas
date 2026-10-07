/*
 * File: content/text-panel.js
 * Purpose: Wording for the report panel: controls, menus, table, export, takeaway and insight list.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/panel/*.js
 * Owner: the PANEL stream. Placeholders in {braces} are filled in by the code; the organization layer can
 *        replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  panel: {
    tools: 'Chart tools',
    takeaway: 'Main takeaway',
    close: 'Close',
    dataDate: 'Data: {date}',

    // Insights for one chart (US-1.2.2, US-1.7.11)
    insights: 'Insights',
    insightsCount: '{n} insights for this chart',
    insightsTitle: 'Insights for this chart',
    showAll: 'Show all on the Insights page',
    rule: 'Rule: {text}',
    highlightOn: 'Highlight on chart',
    highlightOff: 'Clear highlight',
    hide: 'Hide for this session',
    highlighted: 'Highlighted insight',
    highlightedTarget: 'Highlighted on the chart',
    widened: 'The comparison is now All regions, so every region in this insight is on the chart.',
    clear: 'Clear',

    // The explanation (US-1.6.5)
    about: 'About',
    aboutLabel: 'About this chart',
    shows: 'What this shows',
    read: 'How to read it',
    lookFor: 'What to look for',

    // Chart type, measure and bubble size (US-1.2.3)
    typesLabel: 'Chart types that suit this data',
    typeAria: 'Chart type: {type}',
    default: 'Default',
    measure: 'Measure',
    size: 'Bubble size',

    // Break down by a second dimension (US-1.2.7)
    breakdown: 'Break down by',
    breakdownNone: 'None',
    breakdowns: { year: 'Plan year', industry: 'Industry', productLine: 'Product line', channel: 'Channel', segment: 'Segment',
      motion: 'New business or customers', risk: 'Risk level' },
    industry: 'Industry',
    more: 'More',

    // Expanded and full-screen chart (US-1.2.8)
    expand: 'Expand',
    fullscreen: 'Full screen',
    closeExpanded: 'Close · Esc',
    chartOf: 'Chart {i} of {n} · ← → to step',

    // Chart images for slides (US-1.2.10)
    saveImage: 'Save image',
    copyImage: 'Copy image',
    imageNone: 'Image export works on chart views.',
    imageSaved: 'Image saved. Look in your downloads folder.',
    imageCopied: 'Image copied. Paste it into a slide, chat or email.',
    imageBlocked: 'This browser blocked image copy. Use Save image instead.',

    // Compare one chart differently (US-1.1.4). The mode names come from compare.modes in text-shell.js.
    compareDifferently: 'Compare differently…',
    compareTitle: 'Compare this chart differently',
    compareMode: 'Comparison mode for this chart',
    compareFocus: 'Focus region for this chart',
    done: 'Done',
    custom: 'Custom comparison',
    customReset: 'Reset to page comparison',

    // Drill-down (US-2.7.1)
    drillPath: 'Drill-down path',
    drillHint: 'Select part of the chart to step down to {level}.',
    drillHintList: 'Select a row of the list to step down to {level}.',
    drillKeys: '(Backspace or Alt + ← goes back up)',
    drillUnknown: 'The next drill level "{id}" is not a report.',
    drillLoop: 'The drill levels lead back to "{id}".',

    // Table view (US-1.2.4)
    table: 'Table',
    tableNote: 'A table of the same data is always available from the Table button.',
    tableCount: '{n} rows · select a column heading to sort · exact figures',
    kindKey: 'Kinds of value:',
    listCount: '{n} rows · select a column heading to sort · select a row for its details',
    source: 'Source',
    focusRow: 'Focus region',
    copy: 'Copy to clipboard',
    copied: 'Table copied. Paste it into Excel, an email or a slide.',
    copyManual: 'This browser blocked copying. The table text is selected below: press Ctrl+C to copy it.',

    // Legend line for stacked parts, which are shades of each region's colour
    partsTwo: 'Darker: {dark} · lighter: {light}',
    partsMany: 'Shades, darkest first: {list}',

    // States inside the panel
    errorTitle: 'This report could not be drawn',
    errorNote: 'The rest of the app is unaffected.',
    noBuilder: 'No chart builder for the "{shape}" shape.',
    emptyTitle: 'No region has data for this report',
    emptyBody: 'None of the regions in this comparison provided the figures this chart needs.',
    emptyMissing: 'No data from {names}.',
    missing: 'Not included (no data): {names}.'
  }
});
