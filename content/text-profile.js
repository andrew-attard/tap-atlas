/*
 * File: content/text-profile.js
 * Purpose: Wording for the Regions view (region picker and region profile).
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/views/regions.js, and the "Open profile" links in js/views/overview-cards.js and js/reports/details.js
 * Owner: PROFILE stream. Placeholders in {braces} are filled in by the code; the organization layer can replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  // US-2.4.1: the Regions view and its region picker
  profile: {
    openProfile: 'Open profile',
    openProfileFor: 'Open profile: {name}',
    pick: {
      kicker: 'Regions',
      title: 'Which region’s plan do you want to open?',
      lead: 'Each profile puts one region’s plan next to the average of the other regions, on one page.',
      label: 'Regions to pick from'
    },
    kicker: 'Region profile',
    lead: '{sentence}, on this page only.',
    picker: 'Region',
    print: 'Print',
    reports: 'Reports for {name} against the average of the other regions',
    // US-2.4.2: the plan at a glance. Neutral words only (D20): a difference is never good or bad.
    glance: {
      title: 'The plan at a glance',
      hint: 'Select a figure for its details, or an average for how it was worked out',
      // Data with one region: nothing to compare with
      hintAlone: 'Select a figure for its details',
      alone: 'The data has no other region, so these figures are shown without a comparison.',
      total: 'Total',
      against: 'Compared with the rest',
      above: 'above the average of the rest',
      below: 'below the average of the rest',
      same: 'the same as the average of the rest',
      figureTitle: '{label}. Source: {where}',
      // US-4.6.3: the full template's lines, shown when the plans hold a strategic plan or a revenue outlook
      p4: {
        strategicLine: 'Against the strategic plan, three years',
        revenueLine: 'Revenue outlook',
        plan: 'Plan',
        strategicPlan: 'Strategic plan',
        variance: 'Variance',
        year: 'Year {n}'
      }
    },
    // US-2.4.4: the region's insights and its leader's words
    insights: {
      title: 'Insights about {name}',
      intro: '{n} observations name this region, the most significant first.',
      introOne: 'One observation names this region.',
      none: 'No insight names {name} at the moment.',
      label: 'Observation to discuss',
      showMe: 'Show me'
    },
    words: {
      title: 'What {name}’s plan says',
      intro: 'The leader’s commentary and success factors, by industry, each with the cell it came from.',
      commentary: 'Commentary',
      successFactors: 'Success factors'
    }
  }
});
