/*
 * File: tests/fixtures/mini-p4.js
 * Purpose: The mini fixture with the Phase 4 parts added, small enough to work out by hand (strategic plan, base year, revenue, books value, routes, solutions, partner types and maturity).
 * Provides: window.TEST_FIXTURES.miniP4
 * Depends on: tests/fixtures/mini-data.js, tests/fixtures/mini-p2.js
 * Used by: tests/test-measures-p4.js and other Phase 4 tests
 * Owner: ENGINE4 stream
 *
 * Copies miniP2 and adds to it (hand calculations in tests/fixtures/mini-p4-expected.js):
 * - lookups: product categories, three solutions, three partner types, the five maturity levels and the six routes.
 * - Regions A, B and D get every Phase 4 part. Region C gets none, so every Phase 4 figure is "not provided" there.
 * - Partners: maturity becomes a lookup id (A2 keeps the name "Strategic" as text, A3 has none), each gets a type
 *   (A3 has none), and Region B gets a second partner, B2.
 * - Blanks on purpose: Region A's revenue for new business ARR, alliance B, 2027 (it would be 0); Region D's
 *   strategic plan for services in 2029, its base-year pipeline for services, and its last route figure for 2029.
 * - Books value holds software perpetual and hardware, which the customer value recap does not.
 */
window.TEST_FIXTURES = window.TEST_FIXTURES || {};
(function () {
  'use strict';
  var p = JSON.parse(JSON.stringify(window.TEST_FIXTURES.miniP2));
  var CH = ['direct', 'partner', 'allianceA', 'allianceB'], COLS = ['E', 'F', 'G', 'H'];
  var MOTIONS = ['newBusiness', 'customerGrowth'], TYPES = ['arr', 'services', 'swPerpetual', 'hardware'];

  Object.assign(p.lookups, {
    productCategories: [{ id: 'swPerpetual', name: 'Software perpetual' }, { id: 'recurring', name: 'Recurring' },
      { id: 'hardware', name: 'Hardware' }, { id: 'services', name: 'Services' }],
    solutions: [{ id: 'sol1', name: 'Solution 1', category: 'recurring' }, { id: 'sol2', name: 'Solution 2', category: 'recurring' },
      { id: 'sol3', name: 'Solution 3', category: 'hardware' }],
    partnerTypes: [{ id: 'var', name: 'Value-added reseller' }, { id: 'si', name: 'System integrator' },
      { id: 'referral', name: 'Referral partner' }],
    partnerMaturity: [{ id: 'recruit', name: 'Recruit', rank: 1 }, { id: 'onboard', name: 'Onboard', rank: 2 },
      { id: 'enable', name: 'Enable', rank: 3 }, { id: 'skill', name: 'Skill', rank: 4 }, { id: 'strategic', name: 'Strategic', rank: 5 }],
    routes: [{ id: 'ownSales', name: 'Own sales force' }, { id: 'customerSuccess', name: 'Customer success' },
      { id: 'allianceBReseller', name: 'Alliance B as reseller' }, { id: 'otherResellers', name: 'Other resellers' },
      { id: 'systemIntegrators', name: 'System integrators' }, { id: 'partnerExisting', name: 'Partner existing business' }]
  });

  var map = p.meta.sourceMap;
  ['revenue', 'booksValue', 'strategicPlan', 'routes'].forEach(function (s) { map[s] = { sheet: '5. Recap' }; });
  map.baseYear = { sheet: '6. Order Intake', columns: { category: 'B', budget: 'C', forecast: 'D', actuals: 'E', pipeline: 'F', coverage: 'G' } };
  map.newBusiness.columns.solution = 'V';
  Object.assign(map.partners.columns, { type: 'P', supportPct: ['Q', 'R', 'S'], distribution: ['T', 'U', 'V'],
    servicesFromPartners: ['W', 'X', 'Y'] });

  // Grids as in mini-p2.js: per motion and type, one line per plan year (2027, 2028, 2029), one figure per channel
  // in the order direct, partner, allianceA, allianceB. A motion or type left out has no items at all.
  var REVENUE = {
    alpha: {
      newBusiness: { arr: [[200, 100, 0, null], [400, 200, 0, 0], [500, 300, 0, 0]],
        services: [[40, 20, 0, 0], [60, 40, 0, 0], [80, 60, 0, 0]] },
      customerGrowth: { arr: [[50, 25, 0, 0], [50, 0, 0, 0], [50, 0, 0, 0]],
        services: [[10, 5, 0, 0], [10, 0, 0, 0], [10, 0, 0, 0]] }
    },
    bravo: {
      newBusiness: { arr: [[300, 0, 200, 0], [600, 0, 400, 0], [700, 0, 400, 0]],
        services: [[30, 0, 20, 0], [60, 0, 40, 0], [80, 0, 40, 0]] },
      customerGrowth: { arr: [[50, 0, 25, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        services: [[10, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] }
    },
    delta: {
      newBusiness: { arr: [[100, 100, 50, 50], [200, 200, 100, 100], [400, 400, 200, 200]],
        services: [[50, 50, 25, 25], [50, 50, 20, 20], [100, 100, 50, 50]] },
      customerGrowth: { arr: [[90, 0, 0, 0], [88, 0, 0, 0], [0, 0, 0, 0]],
        services: [[70, 0, 0, 0], [22, 0, 0, 0], [0, 0, 0, 0]] }
    }
  };
  var BOOKS = {
    alpha: {
      newBusiness: { arr: [[400, 150, 0, 0], [400, 225, 0, 0], [500, 225, 0, 0]],
        services: [[80, 20, 0, 0], [80, 30, 0, 0], [100, 30, 0, 0]],
        swPerpetual: [[50, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        hardware: [[20, 0, 0, 0], [20, 0, 0, 0], [10, 0, 0, 0]] },
      customerGrowth: { arr: [[100, 40, 0, 0], [50, 0, 0, 0], [50, 0, 0, 0]],
        services: [[20, 5, 0, 0], [10, 0, 0, 0], [10, 0, 0, 0]] }
    },
    bravo: {
      newBusiness: { arr: [[600, 0, 300, 0], [600, 0, 300, 0], [800, 0, 300, 0]],
        services: [[60, 0, 20, 0], [60, 0, 20, 0], [80, 0, 20, 0]] },
      customerGrowth: { arr: [[100, 0, 40, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        services: [[10, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] }
    },
    delta: {
      newBusiness: { arr: [[200, 100, 50, 50], [300, 150, 75, 75], [400, 200, 100, 100]],
        services: [[50, 25, 25, 25], [75, 50, 40, 35], [100, 50, 50, 50]],
        hardware: [[0, 30, 0, 0], [0, 30, 0, 0], [0, 40, 0, 0]] },
      customerGrowth: { arr: [[180, 0, 0, 0], [88, 0, 0, 0], [0, 0, 0, 0]],
        services: [[70, 0, 0, 0], [22, 0, 0, 0], [0, 0, 0, 0]] }
    }
  };
  // Strategic plan per type: one figure per plan year
  var STRATEGIC = {
    alpha: { arr: [700, 700, 800], services: [150, 150, 150], swPerpetual: [50, 0, 0] },
    bravo: { arr: [1000, 900, 1000], services: [100, 100, 100] },
    delta: { arr: [800, 800, 900], services: [200, 250, null], hardware: [50, 50, 50] }
  };
  // Base year items: [category, budget, forecast, actuals, pipeline, coverage (the workbook's own, when it gives one)]
  var BASE = {
    alpha: [['swPerpetual', 40, 50, 50, 0, null], ['recurring', 600, 640, 400, 480, 2], ['services', 120, 110, 70, 60, null]],
    bravo: [['recurring', 900, 1000, 600, 500, 1.25], ['services', 100, 100, 40, 30, 0.5]],
    delta: [['recurring', 500, 550, 350, 100, null], ['services', 150, 150, 100, null, null], ['hardware', 20, 25, 5, 30, null]]
  };
  // Routes: [route, type, solution or null, one figure per plan year]
  var ROUTES = {
    alpha: [['ownSales', 'arr', 'sol1', [400, 400, 500]], ['ownSales', 'services', 'sol1', [80, 80, 100]],
      ['customerSuccess', 'arr', null, [100, 50, 50]], ['customerSuccess', 'services', null, [20, 10, 10]],
      ['otherResellers', 'arr', 'sol2', [150, 225, 225]]],
    bravo: [['ownSales', 'arr', 'sol1', [600, 600, 800]], ['customerSuccess', 'arr', null, [100, 0, 0]],
      ['systemIntegrators', 'arr', 'sol3', [300, 300, 300]], ['systemIntegrators', 'services', 'sol3', [20, 20, 20]]],
    delta: [['ownSales', 'arr', null, [200, 300, 400]], ['allianceBReseller', 'arr', 'sol2', [50, 75, 100]],
      ['otherResellers', 'arr', 'sol2', [100, 150, 200]], ['partnerExisting', 'services', null, [30, 30, null]]]
  };
  // The solution each new business row names, by source row (Region B's row 21 names none)
  var SOLUTIONS = { alpha: { 20: 'sol1', 21: 'sol2' }, bravo: { 20: 'sol1', 21: null }, delta: { 20: 'sol3' } };
  // Partner additions by name: type, maturity, distribution at customer value per plan year
  var PARTNERS = {
    'Fictional Partner A1': { type: 'var', maturity: 'enable', supportPct: [0.1, 0.1, 0.2], distribution: [200, 300, 400],
      servicesFromPartners: [10, 10, 10] },
    'Fictional Partner A2': { type: 'si', maturity: 'Strategic', distribution: [100, 100, null] },
    'Fictional Partner A3': { type: null, maturity: null },
    'Fictional Partner B1': { type: 'si', maturity: 'onboard', distribution: [80, 80, 80] },
    'Fictional Partner D1': { type: 'referral', maturity: 'recruit', distribution: [100, 100, 100] }
  };

  // Flattens a grid into items with the recap item's shape, each with its own cell: column by channel, one row per line.
  function grid(g, first) {
    var out = [];
    MOTIONS.forEach(function (m, mi) {
      TYPES.forEach(function (t, ti) {
        ((g[m] || {})[t] || []).forEach(function (line, yi) {
          line.forEach(function (v, ci) {
            out.push({ year: p.meta.years[yi], sourceCell: COLS[ci] + (first + mi * 12 + ti * 3 + yi), channel: CH[ci],
              motion: m, type: t, value: v });
          });
        });
      });
    });
    return out;
  }
  // One item per plan year, in columns E to G of the given row
  function byYear(values, row, extra) {
    return values.map(function (v, yi) {
      return Object.assign({ year: p.meta.years[yi], value: v, sourceCell: COLS[yi] + row }, extra);
    });
  }

  p.regions.forEach(function (r) {
    if (!REVENUE[r.id]) return;   // Region C: no Phase 4 part at all
    r.revenue = grid(REVENUE[r.id], 30);
    r.booksValue = grid(BOOKS[r.id], 60);
    r.strategicPlan = [];
    TYPES.forEach(function (t, ti) {
      if (STRATEGIC[r.id][t]) r.strategicPlan = r.strategicPlan.concat(byYear(STRATEGIC[r.id][t], 90 + ti, { type: t }));
    });
    r.baseYear = { year: 2026, actualsThrough: '2026-08', items: BASE[r.id].map(function (b, i) {
      return { category: b[0], budget: b[1], forecast: b[2], actuals: b[3], pipeline: b[4], coverage: b[5], sourceRow: 7 + i };
    }) };
    r.routes = [];
    ROUTES[r.id].forEach(function (x, i) {
      r.routes = r.routes.concat(byYear(x[3], 100 + i, { route: x[0], type: x[1], solution: x[2] }));
    });
    r.outsourcingPct = r.id === 'alpha' ? 0.2 : r.id === 'bravo' ? 0.1 : null;
    r.newBusiness.forEach(function (row) { row.solution = SOLUTIONS[r.id][row.sourceRow]; });
    if (r.id === 'bravo') {
      r.partners.push({ sourceRow: 11, name: 'Fictional Partner B2', channel: 'partner', type: 'var', maturity: 'enable',
        expertiseGeo: 'Home market', expertiseProduct: 'Product line 2', fteSales: 1, fteConsultants: 1, centralSupportPct: 0.1,
        arr: [20, 20, 20], services: [5, 5, 5], distribution: [30, 30, 30] });
    }
    r.partners.forEach(function (pt) { Object.assign(pt, PARTNERS[pt.name] || {}); });
  });
  window.TEST_FIXTURES.miniP4 = p;
})();
