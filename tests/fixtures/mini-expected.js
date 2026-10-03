/*
 * File: tests/fixtures/mini-expected.js
 * Purpose: Hand-calculated results for the mini fixture, with the working shown, so tests never check code against itself.
 * Provides: window.TEST_EXPECT.mini
 * Depends on: tests/fixtures/mini-data.js (the numbers below come from it)
 * Used by: tests/test-*.js (combining, measures, scores, sources)
 *
 * Money is in thousands. Region order: alpha (A), bravo (B), charlie (C), delta (D).
 * Rule for blanks inside a sum: blank rows are skipped; a region whose every row is blank is "not provided".
 */
window.TEST_EXPECT = window.TEST_EXPECT || {};
window.TEST_EXPECT.mini = {
  // Per region, three-year totals unless a year is named.
  region: {
    alpha: {
      'base.arr': 1800,          // 1000 + 500 + 0 + 200 + 100 (the Other row counts towards totals)
      'base.pipeline': 3400,     // 2000 + 1000 + 0 + 300 + 100
      'base.pipeline12m': 1350,  // 800 + 400 + 0 + 100 + 50
      'nb.arr': 2255,            // row 20: 500 + 550 + 605; row 21: 200 x 3
      'nb.arr.y1': 700,          // 500 + 200
      'nb.services': 451,        // 100 + 110 + 121 + 40 x 3
      'nb.targetAccounts': 30,   // 20 + 10
      'nb.wins': 6,              // 20 x 0.25 + 10 x 0.1
      'nb.hitRate': 0.2,         // 6 wins / 30 accounts
      'cg.arr': 300,             // a1 50 + a2 100 + a3 0 + a4 150 (multiplier 2.0 on 150)
      'cg.services': 50,         // 10 + 10 + 0 + 30
      'amb.arr': 2555,           // 2255 + 300
      'focus.tier1': 1, 'focus.tier2': 2, 'focus.tier3': 1,
      'cg.segment.strategic': 1, 'cg.segment.growth': 1, 'cg.segment.core': 1, 'cg.segment.scaled': 1
    },
    bravo: {
      'base.arr': 1200, 'base.pipeline': 2750, 'base.pipeline12m': 1000,
      'nb.arr': 4000,            // 1000 + 1200 + 1200 + 200 x 3
      'nb.arr.y1': 1200,
      'nb.targetAccounts': 50, 'nb.wins': 22, 'nb.hitRate': 0.44,   // (40 x 0.5 + 10 x 0.2) / 50
      'cg.arr': 150, 'cg.services': 12, 'amb.arr': 4150,
      'focus.tier1': 1, 'focus.tier2': 2, 'focus.tier3': 1,
      'cg.segment.strategic': 1, 'cg.segment.growth': 0, 'cg.segment.core': 1, 'cg.segment.scaled': 0
    },
    charlie: {
      'base.arr': 500, 'base.pipeline': 900, 'base.pipeline12m': 350,
      'nb.arr': 300,             // row 20 is blank (no hit rate), row 21: 100 x 3
      'nb.arr.y1': 100,
      'nb.targetAccounts': 15,   // 10 + 5: target accounts were entered on both rows
      'nb.wins': 1,              // only row 21 has a hit rate: 5 x 0.2
      'nb.hitRate': 0.2,         // 1 win / 5 accounts on the rows that have a hit rate
      'cg.arr': null,            // not provided: the Customer Growth section is empty
      'cg.services': null,
      'amb.arr': 300,            // new business only, marked partial (customer growth not provided)
      'focus.tier1': 1, 'focus.tier2': 1, 'focus.tier3': 1,          // ind2's tier is blank
      'cg.segment.strategic': null
    },
    delta: {
      'base.arr': 1550, 'base.pipeline': 1800, 'base.pipeline12m': 800,
      'nb.arr': 2850,            // 600 + 900 + 1350
      'nb.arr.y1': 600,
      'nb.services': 712.5,      // 150 + 225 + 337.5
      'nb.targetAccounts': 100, 'nb.wins': 60, 'nb.hitRate': 0.6,
      'cg.arr': 268,             // d1 80 + 88 + 0, d2 100, d3 0
      'cg.services': 92, 'amb.arr': 3118,
      'focus.tier1': 1, 'focus.tier2': 2, 'focus.tier3': 1,
      'cg.segment.strategic': 1, 'cg.segment.growth': 0, 'cg.segment.core': 1, 'cg.segment.scaled': 1
    }
  },

  // Combined figures (US-1.2.5).
  combined: {
    orgTotal: {
      'base.arr': 5050,          // 1800 + 1200 + 500 + 1550
      'nb.arr': 9405,            // 2255 + 4000 + 300 + 2850
      'amb.arr': 10123,          // 2555 + 4150 + 300 + 3118
      'cg.arr': { v: 718, excluded: ['charlie'] },           // 300 + 150 + 268
      'nb.hitRate': 0.4666667    // weighted by target accounts: (0.2x30 + 0.44x50 + 0.2x15 + 0.6x100) / 195 = 91 / 195
    },
    restOfAlphaAverage: {
      'nb.arr': 2383.3333333,    // (4000 + 300 + 2850) / 3
      'amb.arr': 2522.6666667,   // (4150 + 300 + 3118) / 3
      'nb.hitRate': 0.5151515    // (0.44x50 + 0.2x15 + 0.6x100) / 165 = 85 / 165
    },
    restOfDeltaAverage: {
      'cg.arr': { v: 225, excluded: ['charlie'] }             // (300 + 150) / 2
    },
    restOfAlphaTotal: {
      'nb.arr': 7150             // 4000 + 300 + 2850
    }
  },

  // Ratings and scores per industry (higher is better, 1 to 3).
  ratings: {
    // All four regions, rating rule = mean plus range.
    'ind.growthPotential@ind1': { v: 2.75, min: 2, max: 3 },                          // 3, 3, 2, 3
    'ind.references@ind1': { v: 2.3333333, min: 1, max: 3, excluded: ['charlie'] }   // 3, 3, blank, 1
  },
  scores: {
    alpha: { ind1: { a: 2.6666667, b: 3 }, ind4: { a: 3, b: 1, quadrant: 'attractiveNotYet' } },
    bravo: { ind1: { a: 3, b: 3, quadrant: 'attractiveAble' }, ind2: { a: 2.6666667, b: 1.3333333, quadrant: 'attractiveNotYet' },
             ind4: { a: 2.6666667, b: 1.3333333, quadrant: 'attractiveNotYet' } },
    charlie: { ind1: { a: 2.3333333, b: null }, ind4: { a: 2.6666667, b: 1.3333333, quadrant: 'attractiveNotYet' } },
    delta: { ind1: { a: 3, b: 1, quadrant: 'attractiveNotYet' }, ind3: { a: 2, b: 3 }, ind4: { a: 3, b: 1, quadrant: 'attractiveNotYet' } },
    unrated: 'other'             // ind 'other' gives notApplicable for every rating and score
  },
  // Categories are counted, never averaged.
  tierCounts: { ind2: { counts: { 2: 2, 3: 1 }, excluded: ['charlie'] } },

  // Source addresses (US-1.1.5, D26).
  sources: [
    { src: { regionId: 'alpha', section: 'marketCoverage', field: 'growthPotential', row: 10 },
      text: 'Region A plan.xlsx › 1. Market Coverage › D10', calculated: false },
    { src: { regionId: 'bravo', section: 'newBusiness', field: 'arrPotential', row: 21, year: 2 },
      text: 'Region B plan.xlsx › 2. New Business › P21', calculated: true },
    { src: { regionId: 'delta', section: 'customerGrowth', field: 'riskLevel', row: 11 },
      text: 'Region D plan.xlsx › 3. Customer Growth › H11', calculated: false },
    { src: { regionId: 'charlie', section: 'customerGrowth', field: 'thresholds.strategicArr' },
      text: 'Region C plan.xlsx › 3. Customer Growth › N3', calculated: false }
  ],
  imports: { dataDate: '2026-10-02T09:00:00Z', datesDiffer: true, notesFor: { charlie: 1 } }
};
