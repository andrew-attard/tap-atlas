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

    // Presenting (US-3.1.2)
    button: 'Present',
    empty: 'Nothing to present: the running order in config/running-order.js has no steps yet.',
    noneValid: 'Nothing to present: none of the {n} steps in the running order can be shown with this data. The data sources panel lists why.',
    noneValidOne: 'Nothing to present: the one step in the running order can’t be shown with this data. The data sources panel lists why.',
    startError: 'Presentation mode stopped: the first step could not be drawn ({message}).',
    layerLabel: 'Presentation mode',
    barLabel: 'Presentation steps',
    progress: 'Step {n} of {total}',
    prev: 'Back',
    prevKeys: '←',
    next: 'Next',
    nextKeys: 'Space',
    leave: 'Leave',
    leaveKeys: 'Esc',

    // Recording from the screen (US-3.1.3)
    add: 'Add to running order',
    added: 'Added as step {n} of the running order you are recording. The Guide lists it.',
    guide: {
      title: 'Running order',
      intro: 'Steps you added with "Add to running order" in a chart’s More menu, kept in this browser only. Try them, then copy them as the text of config/running-order.js and paste it over that file, so "Present" plays them on any laptop.',
      none: 'No steps recorded yet. Open a chart’s More menu and choose "Add to running order".',
      up: 'Move up',
      down: 'Move down',
      remove: 'Remove',
      try: 'Try this order',
      copy: 'Copy running order',
      clear: 'Remove all',
      cleared: 'The recorded steps are removed.',
      presentFile: 'Present the running order file',
      copied: 'Copied. Paste it over config/running-order.js in the app folder, then reload.',
      copyFailed: 'The browser didn’t allow copying. Select the text below and copy it.',
      textLabel: 'The running order as file text',
      insight: 'Insight',
      custom: 'Custom chart',
      by: 'by {dim}'
    },

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
