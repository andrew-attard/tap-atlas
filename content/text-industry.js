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
    lead: 'Select an industry in the grid, the chart or the ratings: the ratings and the leaders’ comments below follow it.'
  },

  // US-1.5.7: leaders' commentary. Only comments that exist are listed; blanks are never called out.
  commentary: {
    label: 'Leaders’ commentary',
    title: 'What leaders say about {industry}',
    intro: 'Each region’s tier and comment for the selected industry, focus region first. A region appears where its leader wrote a comment.',
    listLabel: 'Comments, one per region',
    focus: 'Focus region',
    foot: '(tier and comment)',
    none: 'None of the regions shown wrote about {industry}. Pick another industry, or compare other regions, to read what leaders wrote.'
  },

  // US-1.5.4: the tier grid
  tierGrid: {
    corner: 'Industry',
    agreeHead: 'Regions per tier',
    agreeSub: 'Tier 1 · 2 · 3',
    agreeCounts: '{t1} · {t2} · {t3}',
    agreeNp: '{n} not provided',
    notCombinedRest: 'Tiers can’t be combined, so the other regions are shown one by one.',
    notCombinedAll: 'Tiers can’t be combined, so every region is shown one by one.',
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
  },

  // US-1.5.5: attractiveness vs ability to win. Area labels stay neutral (D20).
  quadrant: {
    areas: {
      attractiveAble: 'Attractive, able to win',
      attractiveNotYet: 'Attractive, not yet able to win',
      lessAttractiveAble: 'Less attractive, able to win',
      lessBoth: 'Less attractive, less able'
    },
    area: 'Area',
    average: 'Average of {n} {regions}',
    averageStatement: 'Each bubble averages the scores of the regions shown',
    everyStatement: 'Each point is one region’s view of one industry',
    focusStatement: '{focus}’s scores beside the average of the other regions',
    joinNote: 'A thin line joins each industry’s two bubbles; the industry is named beside {first}’s bubble.',
    averageNote: 'Each bubble averages the regions’ scores, following the rule for ratings: every region counts equally, and a region that left a rating blank is left out of that score.',
    sizeLegend: 'Bubble size: {measure}, not a leader rating',
    show: 'Show',
    showAverage: 'Average per industry',
    showEvery: 'Every region',
    filter: 'Industry',
    allIndustries: 'All industries',
    takeaway: '{who}: {n} of {total} industries sit in “{area}”.',
    takeawayEvery: '{n} of {total} points (one per region and industry) sit in “{area}”.'
  },

  // US-1.2.9: the details side panel
  details: {
    regionIndustry: '{industry} · {region}',
    industryAcross: '{industry} · {n} regions',
    account: '{name} · {region}',
    priority: 'Priority',
    priorityCentral: 'Priority (group priority, set centrally as Tier 1)',
    attractiveness: 'Attractiveness',
    ability: 'Ability to win',
    system: 'System figures',
    commentary: 'Leader commentary',
    combinedGroup: 'Combined across {n} regions',
    nbRow: 'New business: {market} · {subVertical}',
    growthYear: 'Growth, year {n}',
    arrPotential: 'ARR potential, 3 years',
    servicesPotential: 'Services potential, 3 years',
    successFactors: 'Success factors',
    sections: { marketCoverage: 'Market coverage', newBusiness: 'New business', customerGrowth: 'Customer growth', ambition: 'Ambition' },
    year: 'Year {n}',
    perYear: '{label}, {year}',
    accountGroup: 'Account',
    planGroup: 'Planned growth',
    industry: 'Industry',
    country: 'Country',
    productLine: 'Product line',
    riskLevel: 'Risk level',
    segment: 'Segment',
    growthPct: 'Growth %',
    multiplier: '3-year multiplier',
    servicesRatio: 'Services ratio',
    incrementalArr: 'Incremental ARR',
    servicesOi: 'Services order intake',
    cumulativeOi: 'Cumulative order intake'
  }
});
