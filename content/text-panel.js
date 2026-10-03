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
    industry: 'Industry',

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
