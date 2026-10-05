/*
 * File: content/text-engine.js
 * Purpose: Wording produced by the report engine: comparison sentences, combined-figure labels, missing states, chart type names.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/engine/*.js and js/reports/*.js through TAP.content.text; shared states and combined-figure wording
 *          also in the panel, views, comparison bar, explanations and data sources panel
 * Owner: the ENGINE stream. Placeholders in {braces} are filled in by the code; the organization layer can
 *        replace any phrase by using the same key. {regions} is "region" or
 *        "regions" to match {n}.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  // Comparison sentences (US-1.1.3)
  scope: {
    all: 'Showing all {n} {regions} side by side',
    oneIndividual: 'Showing {focus} against the other {n} {regions}',
    oneAverage: 'Showing {focus} against the average of the other {n} {regions}',
    oneTotal: 'Showing {focus} against the total of the other {n} {regions}',
    // The same when the count is 1
    allOne: 'Showing the one region in the data',
    oneIndividualOne: 'Showing {focus} against the other region',
    oneAverageOne: 'Showing {focus} against the average of the other region',
    oneTotalOne: 'Showing {focus} against the total of the other region',
    orgOne: 'Showing the organization total of its one region',
    focusOnly: 'Showing {focus} only',
    pair: 'Showing {focus} against {second}',
    set: 'Showing {n} chosen {regions}: {names}',
    org: 'Showing the organization total across all {n} {regions}',
    // Data sources panel only (US-1.1.6)
    coloursRepeat: 'The data has {n} regions but there are {k} distinct region colours, so colours repeat after the {k}th region. Labels and legends still name every region.'
  },

  // Labels for combined figures (US-1.2.5)
  combined: {
    region: 'region',
    regions: 'regions',
    restAverage: 'Average of the other {n} {regions}',
    restTotal: 'Total of the other {n} {regions}',
    restAverageOne: 'Average of the other region',
    restTotalOne: 'Total of the other region',
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
    partExcluded: '{part} from {n} {regions}: {names} not included (not provided)',
    weightMissing: '{names} not included: weight missing',
    // Data sources panel only
    weightUnresolved: 'The weight "{weight}" for {measure} could not be found, so each region counts equally in that average.',
    partialNote: 'Partly provided by {names}'
  },

  states: {
    notProvided: 'not provided',
    empty: 'No region has data for this report yet.',
    missing: 'Not included (no data): {names}'
  },

  // Measure names (ARCHITECTURE section 9). The key path follows the measure id: 'nb.arr' -> measures.nb.arr.
  measures: {
    partialYears: 'Some plan years were left blank',
    partNotProvided: '{parts} not provided',
    partialAccounts: 'Some accounts left this year blank',
    partialWeights: 'Some rows have no figure to weight by and are not included',
    nb: {
      arr: { label: 'New business ARR potential', short: 'New business' },
      services: { label: 'New business services potential', short: 'New business services' },
      targetAccounts: { label: 'Target accounts', short: 'Target accounts' },
      targetAccountsRated: { label: 'Target accounts with a hit rate', short: 'Rated target accounts' },
      wins: { label: 'Implied wins', short: 'Wins' },
      hitRate: { label: 'Hit rate', short: 'Hit rate' },
      avgDealSize: { label: 'Average deal size', short: 'Deal size' },
      growthY2: { label: 'New business growth, year 2', short: 'Growth year 2' },
      growthY3: { label: 'New business growth, year 3', short: 'Growth year 3' },
      servicesRatio: { label: 'Services ratio', short: 'Services ratio' }
    },
    cg: {
      arr: { label: 'Customer growth ARR', short: 'Customer growth' },
      services: { label: 'Customer growth services', short: 'Customer growth services' },
      baseArr: { label: 'Current ARR of existing accounts', short: 'Account ARR' },
      growthY1: { label: 'Customer growth %, year 1', short: 'Growth year 1' },
      growthY2: { label: 'Customer growth %, year 2', short: 'Growth year 2' },
      growthY3: { label: 'Customer growth %, year 3', short: 'Growth year 3' },
      segment: {
        strategic: { label: 'Strategic accounts', short: 'Strategic' },
        growth: { label: 'Growth accounts', short: 'Growth' },
        core: { label: 'Core accounts', short: 'Core' },
        scaled: { label: 'Scaled accounts', short: 'Scaled' }
      }
    },
    amb: {
      arr: { label: '3-year ARR ambition', short: 'ARR ambition' },
      services: { label: 'Services ambition', short: 'Services' },
      oi: { label: 'Total order intake', short: 'Order intake' }
    },
    base: {
      arr: { label: 'Current ARR', short: 'Current ARR' },
      pipeline: { label: 'Pipeline', short: 'Pipeline' },
      pipeline12m: { label: 'Pipeline created in the last 12 months', short: 'Pipeline, 12 months' }
    },
    focus: {
      tier1: { label: 'Tier 1 industries', short: 'Tier 1' },
      tier2: { label: 'Tier 2 industries', short: 'Tier 2' },
      tier3: { label: 'Tier 3 industries', short: 'Tier 3' }
    },
    ind: {
      tier: { label: 'Tier', short: 'Tier' },
      growthPotential: { label: 'Growth potential', short: 'Growth potential' },
      criticality: { label: 'Criticality', short: 'Criticality' },
      competitiveIntensity: { label: 'Competitive intensity', short: 'Competitive intensity' },
      references: { label: 'References', short: 'References' },
      expertise: { label: 'Expertise', short: 'Expertise' },
      productFit: { label: 'Product fit', short: 'Product fit' },
      attractiveness: { label: 'Attractiveness', short: 'Attractiveness' },
      ability: { label: 'Ability to win', short: 'Ability to win' },
      currentArr: { label: 'Current ARR', short: 'Current ARR' },
      pipeline: { label: 'Pipeline', short: 'Pipeline' },
      pipeline12m: { label: 'Pipeline created in the last 12 months', short: 'Pipeline, 12 months' },
      nb: { arr: { label: 'New business ARR potential', short: 'New business' } },
      commentary: { label: 'Leader commentary', short: 'Commentary' }
    }
  },

  // Chart type menu names (US-1.2.3)
  chartTypes: {
    bar: 'Bar', groupedBar: 'Grouped bar', stackedBar: 'Stacked bar', stacked100: '100% stacked bar', treemap: 'Treemap',
    dot: 'Dot plot', radar: 'Radar', scatter: 'Scatter', bubble: 'Bubble', heatmap: 'Heatmap', bubbleGrid: 'Bubble grid',
    line: 'Line', table: 'Table'
  },

  // Words inside charts, tooltips and tables
  chart: {
    entityColumn: 'Region',
    industryColumn: 'Industry',
    total: 'Total',
    kind: 'Kind of value',
    how: 'Combined',
    partial: 'Partly provided',
    partialMark: '(partly provided)',
    year: 'Year {n}',
    npFor: '{name}: not provided',
    note: '{label}, {measure}: {text}',
    notPlaced: '{name} is not shown: {measure} not provided',
    notOnRadar: '{name} is not shown on the radar: {measures} not provided',
    zeroTile: '{name} is not shown: {measure} is zero',
    sizeMissing: '{name} (size not provided)',
    sizeLegend: 'Bubble size: {measure}',
    buildError: 'This report could not be drawn: {message}'
  }
});
