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
    viewTitle: 'Which figure would you like to compare?',
    // The builder (js/ui/custom-builder.js)
    lead: 'Pick a topic, then a measure from its short list, or find one by name; then what to show it by and a chart type. Only combinations that make sense are offered: rates and ratings are never added up. The chart follows the comparison like any other.',
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
    type: 'Chart type',
    measureBy: '{measure} (by {by})',
    failed: 'This chart can’t be drawn',
    none: 'No measure in the data can be charted.',
    // The session list (US-3.5.3)
    list: {
      keep: 'Keep this chart',
      heading: 'Charts kept for this session',
      intro: 'Up to six charts are kept while this tab is open. Nothing is kept after it closes.',
      empty: 'No charts kept yet.',
      open: '{title}, {type}',
      remove: 'Remove',
      removeLabel: 'Remove {title}, {type}',
      kept: 'Kept: {title}.',
      full: 'Six charts are kept already. Remove one first, then keep this chart.'
    },
    // The badge on every custom chart's panel (js/panel/panel-menus.js)
    badge: 'Custom chart',
    // A custom chart's title and its "About this chart" text (js/engine/custom.js)
    title: '{measure} by {by}',
    explain: {
      shows: 'A chart you built: {measure} by {by}. It is not one of the prepared reports.',
      readEntity: 'One bar or dot per region, or per combined figure, in the current comparison.',
      readBy: 'Each region, or combined figure, is split by {by}. Every group is labelled.',
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
      noBy: '{measure} has no region or dimension it can be shown by.',
      type: 'A {type} chart doesn’t suit a chart by {by}.'
    }
  }
});
