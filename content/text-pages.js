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
    rateRatio: '{measure} is worked out from the combined totals: the regions’ parts are added up first, then divided, so it is never an average of the regions’ own figures.',
    ratingRange: 'Ratings are averaged, and the lowest and highest region ratings are shown as a range.'
  },

  // One line under each view's title: what the view is for and where to start (US-2.6.2), by view id.
  // A view without a line here shows none. "Hide tips" hides them all until the page is reloaded.
  viewTips: {
    hide: 'Hide tips',
    overview: 'Start with the headline, then compare the region cards.',
    industry: 'Start with the tier grid to see where regions agree and differ.',
    newBusiness: 'Start with the industry grid, then compare the channels and the levers.',
    customers: 'Start with the segments, then compare the growth each region assumes.',
    partners: 'Start with how much each plan relies on partners and alliances.',
    outlook: 'Start with each plan against its strategic plan, then the base year.',
    regions: 'Pick a region to see its whole plan on one page.',
    insights: 'Filter by region or family, then use "Show me" to see the figures.',
    build: 'Pick a measure and what to show it by; keep a chart to reopen it later.',
    guide: 'Use the contents to jump to a section; select a dotted term for its definition.'
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
    keysLabel: 'Number keys and the views they open',
    orgBadge: 'Organization wording'
  },

  // The guided tour (US-1.1.11): one or two sentences per step, about using the screen, never the planning method.
  // {app} is the app name. The organization layer can reword any step by its key (content/organization.example.js).
  tour: {
    purpose: '{app} puts every region’s territory account plan side by side, so the plans can be compared and discussed.',
    menu: 'The menu switches between the views. Each view answers a few questions, one chart per question.',
    views: 'New business, Customer growth and Partners each look at one part of the plan in more detail. Their lists show every row the leaders filled in.',
    outlook: 'Outlook sets each plan against the strategic plan and the year before the plan, with pipeline coverage and the revenue the plan brings in. When the plans hold none of these parts, it says so in one line.',
    profile: 'Regions shows one region’s whole plan on a single page. Pick a region there, or select "Open profile" on a region card.',
    compare: 'This bar sets what every chart compares: all regions, selected regions (one or more), one against the rest, or all regions combined into one figure. The sentence below it always says what is on screen.',
    panel: 'Every chart sits in a panel like this. Switch the chart type or show a table of exact figures, use the explanation icon to learn how to read it, and check the source line for where the figures come from.',
    freshness: 'This is the date of the data. Select it to see each region’s workbook and any notes from the import.',
    glossary: 'Terms with a dotted underline open a short definition, and why it matters, when you select them.',
    guide: 'To learn what territory account planning is and how to read a plan, open the Guide. You can replay this tour from there or from the top bar.'
  },
  tourUi: {
    button: 'Take the tour',
    label: 'Tour',
    welcome: 'Welcome',
    welcomeText: 'This app plays back each region’s territory account plan, side by side. It reads the planning workbooks and changes nothing in them.',
    welcomeHint: 'The tour takes about a minute and shows how to use the screen.',
    take: 'Take the 1-minute tour',
    skip: 'Skip',
    step: 'Step {n} of {total}',
    next: 'Next',
    back: 'Back',
    finish: 'Finish',
    skipTour: 'Skip the tour',
    keys: '← → to move · Esc to close',
    openGuide: 'Open the Guide',
    titles: {
      purpose: 'What this app is for',
      menu: 'Moving between views',
      views: 'The plan in detail',
      outlook: 'Strategy and outlook',
      profile: 'One region’s whole plan',
      compare: 'Choosing what to compare',
      panel: 'Reading a chart',
      freshness: 'How fresh the data is',
      glossary: 'Terms and definitions',
      guide: 'Planning explained'
    }
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
    hide: 'Hide for this session',
    unhide: 'Show again',
    hiddenBadge: 'Hidden for this session',
    hiddenCount: '{n} hidden',
    hiddenCountOne: '1 hidden',
    showHidden: 'Show hidden',
    hideHidden: 'Hide them again',
    // D111: background facts that move no decision, listed after the ranked groups in one closed group
    context: { name: 'Context: background facts, not on the charts',
      line: 'True and worth knowing when preparing, but they point to no decision, so the charts and headlines leave them out.' },
    families: {
      priorities: { name: 'Agreement and disagreement on priorities', line: 'Where regions choose the same tier for an industry, or clearly different tiers.' },
      judgement: { name: 'Leader judgement and system figures', line: 'Where a leader’s tier or rating and the system figures for the same industry point different ways.' },
      assumptions: { name: 'Outlier assumptions', line: 'Planning assumptions far from those of the other regions.' },
      realism: { name: 'Realism checks', line: 'Ambition compared with the pipeline and accounts behind it.' },
      exposure: { name: 'Concentration and risk', line: 'Where much of a plan rests on a few accounts or one segment.' },
      capability: { name: 'Attractive but not yet winnable', line: 'Industries rated attractive where the ability to win is rated lower.' },
      plan: { name: 'Plan make-up and channels', line: 'How each plan splits between new business and existing customers, and across channels.' },
      shared: { name: 'Shared targets and partners', line: 'Sub-industries and partners named by several regions, and partners planned to bring much more per person.' },
      outlook: { name: 'Strategy and outlook', line: 'Plans against the strategic plan and the current year, pipeline coverage, and what runs through the organization’s books.' },
      themes: { name: 'Recurring themes', line: 'Themes that come up in several regions’ commentary and success factors.' }
    }
  }
});
