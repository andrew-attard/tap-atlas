/*
 * File: tools/sample-planted-p4.js
 * Purpose: The Phase 4 settings and planted cases of docs/PLANTED-CASES.md (R01 to R10) for the sample data: the
 *          new lookups, and per region the figures the full-template parts are built from. Change the doc first.
 * Provides: module.exports (the Phase 4 settings)
 * Depends on: nothing
 * Used by: tools/sample-p4.js, tools/sample-expect-p4.js
 *
 * Money is in thousands of EUR; rates and shares are decimals. Every name is generic and every figure invented.
 */
'use strict';

module.exports = {
  lookups: {
    productCategories: [{ id: 'swPerpetual', name: 'Software perpetual' }, { id: 'recurring', name: 'Recurring' },
      { id: 'hardware', name: 'Hardware' }, { id: 'services', name: 'Services' }],
    // Solutions 1 to 4 are sold as recurring business, Solution 5 as perpetual software, Solution 6 as hardware
    solutions: [{ id: 'sol1', name: 'Solution 1', category: 'recurring' }, { id: 'sol2', name: 'Solution 2', category: 'recurring' },
      { id: 'sol3', name: 'Solution 3', category: 'recurring' }, { id: 'sol4', name: 'Solution 4', category: 'recurring' },
      { id: 'sol5', name: 'Solution 5', category: 'swPerpetual' }, { id: 'sol6', name: 'Solution 6', category: 'hardware' }],
    partnerTypes: [{ id: 'var', name: 'Value-added reseller' }, { id: 'si', name: 'System integrator' }, { id: 'referral', name: 'Referral partner' }],
    partnerMaturity: [{ id: 'recruit', name: 'Recruit', rank: 1 }, { id: 'onboard', name: 'Onboard', rank: 2 }, { id: 'enable', name: 'Enable', rank: 3 },
      { id: 'skill', name: 'Skill', rank: 4 }, { id: 'strategic', name: 'Strategic', rank: 5 }],
    routes: [{ id: 'ownSales', name: 'Own sales force' }, { id: 'customerSuccess', name: 'Customer success' },
      { id: 'allianceBReseller', name: 'Alliance B as reseller' }, { id: 'otherResellers', name: 'Other resellers' },
      { id: 'systemIntegrators', name: 'System integrators' }, { id: 'partnerExisting', name: 'Partner existing business' }]
  },

  // Where the new parts sit in the sample workbooks (meta.sourceMap)
  sheets: { recap: '6. Recap', baseYear: '7. Order Intake' },
  grid: { revenue: 5, booksValue: 20, strategicPlan: 47, routes: 55, baseYear: 8, firstCol: 'E' },
  columns: { solution: 'V', type: 'P', supportPct: ['Q', 'R', 'S'], distribution: ['T', 'U', 'V'], servicesFromPartners: ['W', 'X', 'Y'],
    outsourcingPct: 'I3', baseYear: { category: 'B', budget: 'C', forecast: 'D', actuals: 'E', pipeline: 'F', coverage: 'G' },
    baseYearCells: { year: 'C4', actualsThrough: 'C5' } },

  baseYear: 2026,
  actualsThrough: '2026-08',

  // The share of a year's order intake released as revenue in that year, by plan year
  release: { arr: [0.4, 0.48, 0.55], services: [0.7, 0.78, 0.85] },
  // The share of a partner's ARR it distributes itself, by partner type (a blank type counts as an integrator)
  distributes: { var: 1, si: 0.5, referral: 0 },
  // Support % by plan year for each maturity level: less support as a partner matures
  support: { recruit: [0.6, 0.5, 0.4], onboard: [0.5, 0.4, 0.3], enable: [0.35, 0.25, 0.2], skill: [0.2, 0.15, 0.1], strategic: [0.1, 0.05, 0.05] },
  // Small fixed differences between product categories, so the categories do not all move alike
  categoryMix: { strategicPlan: { arr: 1, services: 1.03, swPerpetual: 0.94, hardware: 0.97 },
    forecast: { recurring: 1, services: 0.98, swPerpetual: 1.04, hardware: 1.02 },
    coverage: { recurring: 1, services: 0.95, swPerpetual: 1.08, hardware: 1.04 } },

  // Per region.
  // solutions: target shares of new business order intake for Solution 1 to 6 (R07: Northern Europe leans on Solution 2).
  // types, maturity: one per partner, in sheet order (R08: every type and level; one blank of each).
  // margin: the reseller's margin on what it distributes. outsourcing: share of partner services the partner delivers (R10: one blank).
  // release: the region's revenue release against the standard rates. viaPartners: share of existing-customer order intake through partners.
  // plan: the plan's books order intake against the strategic plan (R01, R02; null: no strategic plan, R09).
  // base: year 1 against the base-year forecast (growth), budget and actuals against the forecast, pipeline coverage
  //       (R04, R05), and whether the workbook gives the ratio (null: no base year, R10).
  regions: {
    na: { solutions: [0.3, 0.25, 0.15, 0.1, 0.12, 0.08], types: ['var', 'si', 'var', 'var', 'referral'], maturity: ['enable', 'strategic', 'recruit', 'skill', null],
      margin: 0.2, outsourcing: 0.3, release: 1, viaPartners: 0.05, plan: -0.06,
      base: { growth: 0.08, budget: 1.04, actuals: 0.62, coverage: 1.1, given: true } },
    latam: { solutions: [0.35, 0, 0.25, 0.2, 0.1, 0.1], types: ['var', 'si', 'var', 'referral'], maturity: ['onboard', 'strategic', 'skill', 'enable'],
      margin: 0.25, outsourcing: 0.5, release: 0.9, viaPartners: 0.1, plan: 0.25,
      base: { growth: 0.12, budget: 1.08, actuals: 0.58, coverage: 2.6, given: false } },
    neu: { solutions: [0.1, 0.7, 0.06, 0, 0.08, 0.06], types: ['si', 'var', 'var', 'var'], maturity: ['enable', 'skill', 'recruit', 'strategic'],
      margin: 0.18, outsourcing: 0.2, release: 1.05, viaPartners: 0, plan: null,
      base: { growth: 0.06, budget: 0.98, actuals: 0.66, coverage: 3.2, given: true } },
    seu: { solutions: [0.2, 0.3, 0.2, 0.1, 0.1, 0.1], types: ['var', 'si', 'var'], maturity: ['skill', 'strategic', 'enable'],
      margin: 0.35, outsourcing: 0.6, release: 0.95, viaPartners: 0.15, plan: -0.08,
      base: { growth: 0.1, budget: 1.02, actuals: 0.6, coverage: 2.8, given: true } },
    ceu: { solutions: [0.25, 0.2, 0, 0.3, 0.15, 0.1], types: ['var', 'referral', 'var', 'si'], maturity: ['strategic', 'skill', 'onboard', 'recruit'],
      margin: 0.2, outsourcing: null, release: 1, viaPartners: 0, plan: -0.09, base: null },
    mea: { solutions: [0.38, 0.25, 0.17, 0, 0.1, 0.1], types: ['referral', 'si', 'var'], maturity: ['skill', 'recruit', 'enable'],
      margin: 0.22, outsourcing: 0.4, release: 0.85, viaPartners: 0, plan: -0.05,
      base: { growth: 0.6, budget: 1.1, actuals: 0.55, coverage: 2.4, given: true } },
    apac: { solutions: [0.15, 0.2, 0.35, 0.1, 0.1, 0.1], types: ['var', 'si', 'var', null, 'var'], maturity: ['onboard', 'recruit', 'strategic', 'skill', 'enable'],
      margin: 0.2, outsourcing: 0.25, release: 1.1, viaPartners: 0.08, plan: -0.3,
      base: { growth: 0.04, budget: 1.05, actuals: 0.64, coverage: 3.5, given: true } }
  },

  // New Business rows that name no solution: this region's smallest row (and any row with a blank potential)
  unnamedSolution: ['apac'],

  // The planted cases, as the generator checks them (docs/PLANTED-CASES.md)
  cases: {
    r01: { region: 'apac', below: -0.25 },                 // plan at least 25% below its strategic plan
    r02: { region: 'latam', above: 0.2 },                  // plan at least 20% above
    r03: { total: [-0.1, -0.06], others: 0.1 },            // the plans together 6 to 10% short; every other region within 10%
    r04: { region: 'mea', growth: 0.5, others: 0.2 },      // year 1 at least 50% above the base-year forecast; the others under 20%
    r05: { region: 'na', coverage: 1.25, others: 2 },      // pipeline under 1.25x the order intake still to win; the others above 2x
    r06: { region: 'seu', gapShare: 0.15, others: 0.08 },  // at least 15% of customer value outside the books; the others under 8%
    r07: { region: 'neu', solution: 'sol2', share: 0.65, others: 0.45 },   // one solution at 65% or more; no other region above 45%
    r09: { region: 'neu' },                                // no strategic plan
    r10: { region: 'ceu', noCoverage: 'latam' }            // no base year (and no outsourcing %); one workbook without a coverage ratio
  }
};
