/*
 * File: content/text-present.js
 * Purpose: Wording for presentation mode and the running order.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: the matching js files
 * Owner: PRESENT stream. Placeholders in {braces} are filled in by the code.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  present: {
    stepN: 'Step {n}',

    // Steps left out of the running order, listed in the data sources panel only (US-3.1.1)
    sourcesTitle: 'Running order',
    sourcesIntro: 'Steps of the running order that were left out when presentation mode started.',
    skip: {
      step: '{step} of the running order is left out: it should name one report, one insight or one custom chart.',
      report: '{step} of the running order is left out: there is no report called "{name}".',
      measure: '{step} of the running order is left out: its report has no measure "{name}".',
      type: '{step} of the running order is left out: its report has no chart type "{name}".',
      breakdown: '{step} of the running order is left out: its report can’t be broken down by "{name}".',
      region: '{step} of the running order is left out: there is no region "{name}" in this data.',
      industry: '{step} of the running order is left out: there is no industry "{name}" in this data.',
      insight: '{step} of the running order is left out: this data gives no insight "{name}".',
      noChart: '{step} of the running order is left out: the insight "{name}" has no chart to show.',
      custom: '{step} of the running order is left out: the custom chart "{name}" can’t be drawn.',
      setting: '{step} of the running order is left out: "{name}" is not a comparison setting the app knows.',
      error: '{step} of the running order is left out: it could not be read ({name}).'
    }
  }
});
