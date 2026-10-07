/*
 * File: content/text-themes.js
 * Purpose: Wording for the recurring themes report (US-2.5.1).
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/reports/themes.js
 * Owner: INSIGHTS2 stream. Placeholders in {braces} are filled in by the code; the organization layer can replace any
 *        phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  themes: {
    barsLabel: 'Themes by the number of regions whose leaders mention them. Choose a theme to read its quotes.',
    regions: '{n} of {total} regions',
    // With one region in the comparison (a selection of one, D99): never "1 of 1 regions"
    regionsOneYes: 'Mentioned',
    regionsOneNo: 'Not mentioned',
    pick: 'Theme',
    quotesTitle: '{theme}: what leaders wrote',
    keywords: 'Counted when a success factor or comment holds one of these words: {list}.',
    noQuotes: 'No region in this comparison mentions {theme}.',
    from: { successFactors: 'Success factor, {industry}', commentary: 'Commentary, {industry}' },
    rows: '{n} rows',
    notMentioned: 'Not mentioned in this comparison: {list}.',
    counted: 'Themes are counted by this app from the keyword lists in its configuration, not tagged in the workbooks.',
    empty: 'No success factors or commentary in this comparison.',
    columns: { theme: 'Theme', regions: 'Regions mentioning it', names: 'Regions', keywords: 'Keywords' }
  }
});
