/*
 * File: content/text-engine.js
 * Purpose: Wording produced by the report engine: comparison sentences, combined-figure labels, missing states, chart type names.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/engine/*.js through TAP.content.text
 * Owner: the ENGINE stream. Placeholders in {braces} are filled in by the code; the organization layer can
 *        replace any phrase by using the same key. In combined-figure labels, {regions} is "region" or
 *        "regions" to match {n}.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  // Comparison sentences (US-1.1.3)
  scope: {
    all: 'Showing all {n} regions side by side',
    oneIndividual: 'Showing {focus} against the other {n} regions',
    oneAverage: 'Showing {focus} against the average of the other {n} regions',
    oneTotal: 'Showing {focus} against the total of the other {n} regions',
    focusOnly: 'Showing {focus} only',
    pair: 'Showing {focus} against {second}',
    set: 'Showing {n} chosen regions: {names}',
    org: 'Showing the organization total across all {n} regions',
    // Data sources panel only (US-1.1.6)
    coloursRepeat: 'The data has {n} regions but there are {k} distinct region colours, so colours repeat after the {k}th region. Labels and legends still name every region.'
  },

  // Labels for combined figures (US-1.2.5)
  combined: {
    region: 'region',
    regions: 'regions',
    restAverage: 'Average of the other {n} {regions}',
    restTotal: 'Total of the other {n} {regions}',
    org: 'Organization total ({n} {regions})',
    explainAverage: 'Each region counts equally. For rates such as hit rate, larger regions count more, in proportion to their size.',
    explainTotal: 'The regions’ figures added together. Rates such as hit rate are averaged, with larger regions counting more.',
    how: {
      sum: 'Total of {n} {regions}',
      mean: 'Average of {n} {regions}',
      wmean: 'Weighted average of {n} {regions}, by {weight}',
      wmeanPlain: 'Weighted average of {n} {regions}',
      rating: 'Average of {n} {regions}, ranging from {min} to {max}',
      count: 'Counted across {n} {regions}',
      list: 'Listed by region ({n} {regions})'
    },
    excluded: '{names} not included: not provided',
    partialNote: 'Partly provided by {names}'
  },

  states: {
    notProvided: 'not provided',
    empty: 'No region has data for this report yet.',
    missing: 'Not included (no data): {names}'
  }
});
