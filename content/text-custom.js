/*
 * File: content/text-custom.js
 * Purpose: Wording for custom charts (Build a chart).
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: the matching js files
 * Owner: CUSTOM stream. Placeholders in {braces} are filled in by the code.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  custom: {
    // The Build a chart view (js/views/build.js, D96): the header's kicker and title; the lead line follows them
    heading: 'Build a chart',
    viewTitle: 'Which question would you like to chart?',
    // The builder (js/ui/custom-builder.js, D140)
    lead: 'Start from the question: compare the regions, break one region down, or see the plan years. Then pick a measure by topic or by name. Only combinations that read well are offered: rates and ratings are never added up. The chart redraws with every change.',
    // Step 1 (js/ui/custom-controls.js): the three questions, each with one line of help
    ask: {
      label: 'What do you want to see?',
      regions: { label: 'Compare regions', help: 'One bar per region, for the regions in the comparison bar.' },
      one: { label: 'Break one region down', help: 'One region split by industry, channel or another dimension the measure has.' },
      years: { label: 'See the plan years', help: 'A bar per plan year for each region in the comparison bar.' }
    },
    region: { label: 'Region', note: 'This chart shows the region chosen here and ignores the comparison bar.' },
    measure: 'Measure',
    // The measure picker (js/ui/custom-measure-picker.js, D122): topics named after the menu, then the measures
    topic: 'Topic',
    topics: { ambition: 'Ambition', coverage: 'Market coverage', newBusiness: 'New business', customers: 'Customer growth',
      partners: 'Partners', outlook: 'Outlook', other: 'Other measures' },
    more: 'Show all {n} measures in {topic}',
    fewer: 'Show fewer',
    find: { label: 'Find a measure', none: 'No measure name has all of "{query}".', one: '1 measure found', count: '{n} measures found' },
    // The kind of value beside each measure: a glyph and a word, so it never rests on the glyph alone
    kinds: { amount: { glyph: '∑', word: 'amount' }, count: { glyph: '#', word: 'count' },
      rate: { glyph: '÷', word: 'rate or average' }, rating: { glyph: '★', word: 'rating' } },
    byPicker: 'By',
    by: { entity: 'Region' },
    showAs: 'Show as',
    showAsBar: 'Bar',
    showAsTable: 'Table',
    measureBy: '{measure} (by {by})',
    failed: 'This chart can’t be drawn',
    none: 'No measure in the data can be charted.',
    // The kept charts (US-3.5.3): a row of chips at the top of the view
    list: {
      keep: 'Keep this chart',
      heading: 'Your charts',
      empty: 'No charts kept yet. Up to six are kept while this tab is open; nothing is kept after it closes.',
      remove: '×',
      removeLabel: 'Remove {title}',
      kept: 'Kept: {title}.',
      full: 'Six charts are kept already. Remove one first, then keep this chart.'
    },
    // The badge on every custom chart's panel (js/panel/panel-menus.js)
    badge: 'Custom chart',
    // A custom chart's title and its "About this chart" text (js/engine/custom.js)
    title: '{measure} by {by}',
    titleOne: '{region} {measure} by {by}',
    titleYears: '{measure} by plan year',
    explain: {
      shows: 'A chart you built: {measure} by {by}. It is not one of the prepared reports.',
      readEntity: 'One bar per region, or per combined figure, in the current comparison.',
      readBy: 'Each region, or combined figure, is split by {by}. Every group is labelled.',
      readOne: 'One bar per {by} for {region}, largest first, with its value on the bar. The comparison bar is ignored.',
      combine: {
        sum: 'Combined figures add up the regions as a total, or average them, as the comparison says.',
        rate: 'Rates are never added up: combined figures are weighted averages of the regions.',
        ratio: 'Shares and ratios are never averaged: the regions’ parts are added up first, then divided.',
        rating: 'Ratings are never added up: combined figures are the average rating, with the range.'
      }
    },
    errors: {
      measure: 'There is no measure called "{id}".',
      notValue: '{measure} is words or a category, so it can’t be drawn as a chart value.',
      by: '{measure} can’t be shown by {by}.',
      noRegions: '{measure} has no region total to compare.',
      noDims: '{measure} has no dimension to break a region down by.',
      noYears: '{measure} has no plan years.',
      region: 'There is no region called "{id}".',
      type: 'A {type} chart doesn’t suit a chart by {by}.'
    }
  }
});
