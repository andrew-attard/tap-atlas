/*
 * File: config/settings.js
 * Purpose: Every tunable number in one place: weights, thresholds and limits. Change values here, not in code.
 * Provides: window.TAP_SETTINGS
 * Depends on: nothing
 * Used by: combining (js/engine/aggregate.js), scope, scores, the quadrant, details, explanations, the insight engine
 *          and the Insights page
 */
window.TAP_SETTINGS = {
  // Combining regions (US-1.2.5). Weights for rates: measure id -> the measure it is weighted by.
  // Proposed defaults; to be confirmed with the CRO. A report definition can override them in options.weights.
  combine: {
    weights: {
      'nb.hitRate': 'nb.targetAccountsRated',   // target accounts on rows that have a hit rate, so wins add up
      'nb.avgDealSize': 'nb.wins',
      'nb.growthY2': 'nb.arr',               // 3-year new business ARR potential
      'nb.growthY3': 'nb.arr',
      'nb.servicesRatio': 'nb.arr'
    }
  },

  // The two scores on the attractiveness vs ability chart (US-1.5.5). Equal weights by default.
  scores: {
    attractiveness: { growthPotential: 1, criticality: 1, competitiveIntensity: 1 },
    ability: { references: 1, expertise: 1, productFit: 1 },
    midpoint: 2.0
  },

  // Row bubbles (US-2.2.4, US-2.3.3): how many of the largest bubbles carry a label.
  rowBubble: { labelMax: 10 },

  // Ranking insights (US-1.7.2). Significance = family weight x (strength, money and breadth combined).
  insights: {
    weights: { strength: 0.5, money: 0.3, breadth: 0.2 },
    familyWeights: { priorities: 1, judgement: 1, assumptions: 1, realism: 1, exposure: 1, capability: 1,
      plan: 1, shared: 1, themes: 1, outlook: 1 },
    minRegions: 3,       // no comparison insight with fewer regions providing the value (US-1.7.10)
    panelMax: 3,         // insights listed in a panel (US-1.2.2)
    overviewMax: 3       // insights on the Overview (US-1.5.3)
  },

  // Region colours repeat after this many regions; the data sources panel then shows a warning.
  regionColours: 8,

  // Speed targets used by tests (milliseconds).
  limits: { firstView: 2000, redraw: 500 }
};
