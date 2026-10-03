/*
 * File: content/text-pages.js
 * Purpose: Wording for the Insights and Guide pages, explanations and the tour.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/views/insights.js, js/views/guide.js, js/ui/explain.js, js/ui/tour.js
 * Owner: the PAGES stream. Placeholders in {braces} are filled in by the code; the organization layer can
 *        replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  // The explanation side panel (US-1.6.5). The three texts themselves sit in each report definition.
  explain: {
    title: 'About this chart',
    shows: 'What this shows',
    read: 'How to read it',
    lookFor: 'What to look for',
    anIndustry: 'the chosen industry',
    unknown: 'There is no explanation for this chart yet.',
    scores: 'How the scores are built',
    scoreEqual: '{score} is the average of {ratings}, each counting equally.',
    scoreWeighted: '{score} is a weighted average of {ratings}.',
    weightItem: '{rating} (weight {w})',
    scoreMidpoint: 'Both scores run from 1 to 3. A score of {midpoint} or more counts as high.',
    scoreBlank: 'If any rating behind a score is blank, the score is not provided.',
    combined: 'How combined figures are made',
    noCombined: 'Every region is shown on its own here, so no figures are combined.',
    combinedLine: '{label}: {how}',
    rateWeight: '{measure} is a weighted average, with each region counting in proportion to its {weight}.',
    ratingRange: 'Ratings are averaged, and the lowest and highest region ratings are shown as a range.'
  }
});
