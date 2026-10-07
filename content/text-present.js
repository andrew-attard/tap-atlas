/*
 * File: content/text-present.js
 * Purpose: Wording for presentation mode. On screen the running order is called a presentation (D97).
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
    empty: 'Nothing to present: the presentation file config/running-order.js has no steps yet.',
    noneValid: 'Nothing to present: none of the {n} steps in the presentation can be shown with this data. The data sources panel lists why.',
    noneValidOne: 'Nothing to present: the one step in the presentation can’t be shown with this data. The data sources panel lists why.',
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

    // Recording from the screen (US-3.1.3). On screen the running order is called a presentation (D97).
    add: 'Add to presentation',
    added: 'Added as step {n} of your presentation. The Guide lists it.',
    guide: {
      title: 'Your presentation',
      // The explanation the section opens with: what, who, how to play, how to make your own (D97)
      whatLabel: 'What it is',
      what: 'Presentation mode shows a set list of charts full screen, one step at a time. Each step has its own comparison and highlight, so you can talk instead of clicking.',
      whoLabel: 'Who it is for',
      who: 'Whoever shares the screen in a meeting.',
      playLabel: 'To play it',
      play: '"Present", beside the data date, or the P key plays the saved presentation: the file config/running-order.js. Space or Right goes on, Left goes back, and Esc leaves and puts the screen back as it was.',
      makeLabel: 'To make your own',
      make: 'Choose "Add to presentation" in a chart’s More menu, for each chart in order. The steps are listed below and kept in this browser only. "Try this presentation" plays them. "Copy as file text" gives the text to paste over config/running-order.js, or to hand to whoever keeps the app folder, so "Present" plays it for everyone.',
      stepsLabel: 'Your steps',
      none: 'No steps added yet. Open a chart’s More menu and choose "Add to presentation".',
      up: 'Move up',
      down: 'Move down',
      remove: 'Remove',
      try: 'Try this presentation',
      copy: 'Copy as file text',
      clear: 'Remove all',
      cleared: 'The steps are removed.',
      presentFile: 'Present the saved presentation',
      copied: 'Copied. Paste it over config/running-order.js in the app folder, then reload.',
      copyFailed: 'The browser didn’t allow copying. Select the text below and copy it.',
      textLabel: 'Your presentation as file text',
      insight: 'Insight',
      custom: 'Custom chart',
      by: 'by {dim}'
    },

    // Steps left out of the presentation, listed in the data sources panel only (US-3.1.1)
    sourcesTitle: 'Presentation steps left out',
    sourcesIntro: 'Steps of the presentation that were left out when presentation mode started. The rest still ran.',
    skip: {
      step: '{step} of the presentation is left out: it should name one report, one insight or one custom chart.',
      report: '{step} of the presentation is left out: there is no report called "{name}".',
      measure: '{step} of the presentation is left out: its report has no measure "{name}".',
      type: '{step} of the presentation is left out: its report has no chart type "{name}".',
      breakdown: '{step} of the presentation is left out: its report can’t be broken down by "{name}".',
      region: '{step} of the presentation is left out: there is no region "{name}" in this data.',
      industry: '{step} of the presentation is left out: there is no industry "{name}" in this data.',
      insight: '{step} of the presentation is left out: this data gives no insight "{name}".',
      noChart: '{step} of the presentation is left out: the insight "{name}" has no chart to show.',
      custom: '{step} of the presentation is left out: the custom chart "{name}" can’t be drawn.',
      setting: '{step} of the presentation is left out: "{name}" is not a comparison setting the app knows.',
      error: '{step} of the presentation is left out: it could not be read ({name}).'
    }
  }
});
