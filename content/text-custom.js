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
    // A custom chart's title and its "About this chart" text (js/engine/custom.js)
    title: '{measure} by {by}',
    by: { entity: 'Region' },
    explain: {
      shows: 'A chart you built: {measure} by {by}. It is not one of the prepared reports.',
      readEntity: 'One bar or dot per region, or per combined figure, in the current comparison.',
      readBy: 'Each region, or combined figure, is split by {by}. Every group is labelled.',
      combine: {
        sum: 'Combined figures add up the regions as a total, or average them, as the comparison says.',
        rate: 'Rates are never added up: combined figures are weighted averages of the regions.',
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
