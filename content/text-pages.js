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
  },

  // The Guide page (US-1.6.1). Its sections and paragraphs come from content/guide.js.
  guidePage: {
    kicker: 'Guide',
    heading: 'How to use this app, and how to read a territory account plan',
    contents: 'Contents',
    tour: 'Take the tour',
    reset: 'Reset all charts to default',
    resetDone: 'Every chart is back to its default type.',
    openView: 'Open {view}',
    orgBadge: 'Organization wording'
  },

  // The Insights page (US-1.7.3). Every insight is an observation to discuss, never a verdict (D20).
  insightsPage: {
    kicker: 'Insights',
    heading: 'What is worth discussing?',
    intro: '{n} observations, found by fixed rules in the plans and ranked by significance. Each one points to a difference worth a conversation; none of them grades a plan.',
    introOne: '1 observation, found by fixed rules in the plans. It points to a difference worth a conversation; it does not grade a plan.',
    scope: 'This list follows the comparison bar. {sentence}.',
    regionsLabel: 'Regions',
    familiesLabel: 'Families',
    filterHint: 'Choose any to filter the list. The number on each shows how many insights it would list.',
    shown: '{n} of {total} insights shown',
    clear: 'Clear filters',
    count: '{n} insights',
    countOne: '1 insight',
    label: 'Observation to discuss',
    showMe: 'Show me',
    details: 'Figures, rule and sources',
    detailsClose: 'Close figures',
    copy: 'Copy',
    figures: 'Figures',
    rule: 'Rule',
    sources: 'Sources',
    copied: 'Insight copied. It pastes into an email or a slide.',
    copyFailed: 'This browser blocked copying. Open the figures and copy the text by hand.',
    copyRule: 'Rule: {text}',
    copySources: 'Sources:',
    none: 'No insights match these filters.',
    empty: 'No insights for this comparison.',
    families: {
      priorities: { name: 'Agreement and disagreement on priorities', line: 'Where regions choose the same tier for an industry, or clearly different tiers.' },
      judgement: { name: 'Leader judgement and system figures', line: 'Where a leader’s tier or rating and the system figures for the same industry point different ways.' },
      assumptions: { name: 'Outlier assumptions', line: 'Planning assumptions far from those of the other regions.' },
      realism: { name: 'Realism checks', line: 'Ambition compared with the pipeline and accounts behind it.' },
      exposure: { name: 'Concentration and risk', line: 'Where much of a plan rests on a few accounts or one segment.' },
      capability: { name: 'Attractive but not yet winnable', line: 'Industries rated attractive where the ability to win is rated lower.' }
    }
  }
});
