/*
 * File: content/text-industry.js
 * Purpose: Wording for the Industry priorities view: tier grid, quadrant labels, ratings, commentary, details.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/views/industry.js, js/reports/*.js
 * Owner: the INDUSTRY stream. Placeholders in {braces} are filled in by the code; the organization layer can
 *        replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  // The view itself
  industryView: {
    kicker: 'Industry priorities',
    title: 'Where do regions agree and differ on which industries matter, and why?',
    chartType: 'Chart type'
  },

  // US-1.5.4: the tier grid
  tierGrid: {
    corner: 'Industry',
    agreeHead: 'Regions per tier',
    agreeSub: 'Tier 1 · 2 · 3',
    agreeCounts: '{t1} · {t2} · {t3}',
    agreeNp: '{n} not provided',
    star: '★',
    central: 'Set centrally',
    cellAria: '{region}, {industry}: {tier}',
    cellCentral: '{tier}, set centrally',
    sortLabel: 'Sort by',
    sorts: { groupPriority: 'Group priority', agreement: 'Agreement', disagreement: 'Disagreement', productLine: 'Product line' },
    noProductLine: 'No product line',
    legendGroup: '★ Group priority: set centrally as Tier 1, not a leader’s choice',
    legendNp: 'Outlined: not provided',
    legendColour: 'Colour and number: the tier, a leader’s choice (● leader input)',
    sizeLegend: 'Bubble size: {measure}, a system figure',
    sizeMissing: '{region}, {industry}: {measure} not provided, drawn at the smallest size',
    columns: { productLine: 'Product line', groupPriority: 'Group priority', t1: 'Tier 1', t2: 'Tier 2', t3: 'Tier 3', np: 'Not provided' },
    groupYes: 'Yes, set centrally',
    groupNo: 'No',
    tierTip: 'Tier (leader input)',
    takeawayOne: '{region} places {t2} industries in Tier 2 and {t3} in Tier 3.',
    takeawaySplit: '{same} of {total} industries get the same tier from every region shown. {industry} is the most split: {counts}.',
    takeawayFocus: '{region} places {n} of {total} industries in a different tier from most other regions, for example {industry}.',
    takeawaySame: 'Every region shown gives each industry the same tier.',
    countPart: 'Tier {tier}: {n}'
  }
});
