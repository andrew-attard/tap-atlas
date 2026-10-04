/*
 * File: tests/fixtures/mini-p2.js
 * Purpose: Extra rows for Phase 2 tests: recap, accounts and partners small enough to work out by hand. Copies the mini fixture and adds to it.
 * Provides: window.TEST_FIXTURES.miniP2
 * Depends on: tests/fixtures/mini-data.js
 * Used by: tests/test-measures-p2.js, tests/test-rows.js and other Phase 2 tests
 * Owner: ENGINE2 stream
 *
 * Changes from mini, all additions (hand calculations in tests/fixtures/mini-p2-expected.js):
 * - recap: a full grid (3 plan years x 2 motions x 2 types x 4 channels) for Regions A, B and D; Region C stays empty.
 * - Region A gets account a5 (core, no risk) so its top 3 accounts are not all of its growth.
 * - Region A gets two more partners: A2 with a blank consultant FTE, A3 with no FTE at all.
 * - Three blanks where the mini fixture has a zero, so partly provided figures are tested without changing any sum:
 *   Region A's recap New business ARR, alliance B, 2029; account a1's year 3 incremental ARR; partner D1's year 3 services.
 * Everything else (market coverage, new business, the other accounts and partners) is exactly the mini fixture.
 */
window.TEST_FIXTURES = window.TEST_FIXTURES || {};
(function () {
  'use strict';
  var p = JSON.parse(JSON.stringify(window.TEST_FIXTURES.mini));
  var CH = ['direct', 'partner', 'allianceA', 'allianceB'], COLS = ['E', 'F', 'G', 'H'];
  var MOTIONS = ['newBusiness', 'customerGrowth'], TYPES = ['arr', 'services'];

  // Recap values per motion and type: one line per plan year (2027, 2028, 2029), one figure per channel
  // in the order direct, partner, allianceA, allianceB.
  var RECAP = {
    alpha: {
      newBusiness: { arr: [[400, 200, 0, 0], [400, 300, 0, 0], [500, 300, 0, null]],
        services: [[80, 40, 0, 0], [80, 60, 0, 0], [100, 60, 0, 0]] },
      customerGrowth: { arr: [[100, 50, 0, 0], [50, 0, 0, 0], [50, 0, 0, 0]],
        services: [[20, 10, 0, 0], [10, 0, 0, 0], [10, 0, 0, 0]] }
    },
    bravo: {
      newBusiness: { arr: [[600, 0, 400, 0], [600, 0, 400, 0], [800, 0, 400, 0]],
        services: [[60, 0, 40, 0], [60, 0, 40, 0], [80, 0, 40, 0]] },
      customerGrowth: { arr: [[100, 0, 50, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        services: [[10, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] }
    },
    delta: {
      newBusiness: { arr: [[200, 200, 100, 100], [300, 300, 150, 150], [400, 400, 200, 200]],
        services: [[50, 50, 25, 25], [75, 75, 40, 35], [100, 100, 50, 50]] },
      customerGrowth: { arr: [[180, 0, 0, 0], [88, 0, 0, 0], [0, 0, 0, 0]],
        services: [[70, 0, 0, 0], [22, 0, 0, 0], [0, 0, 0, 0]] }
    }
  };

  // Flattens the grid into Data Contract recap items, each with its own cell (column by channel, row by line).
  function recap(grid) {
    var out = [];
    MOTIONS.forEach(function (m, mi) {
      TYPES.forEach(function (t, ti) {
        grid[m][t].forEach(function (line, yi) {
          line.forEach(function (v, ci) {
            out.push({ year: p.meta.years[yi], sourceCell: COLS[ci] + (5 + mi * 6 + ti * 3 + yi), channel: CH[ci],
              motion: m, type: t, value: v });
          });
        });
      });
    });
    return out;
  }

  p.regions.forEach(function (r) {
    r.recap = RECAP[r.id] ? recap(RECAP[r.id]) : [];
    if (r.id === 'delta') r.partners[0].services = [0, 0, null];
    if (r.id !== 'alpha') return;
    r.customerGrowth.accounts[0].incrementalArr = [50, 0, null];
    r.customerGrowth.accounts.push({ sourceRow: 14, id: 'a5', name: 'Fictional Account A5', industryId: 'ind2', country: 'Country 1',
      productLine: 'pl1', currentArr: 80, riskLevel: null, growthPct: [0.25, 0, 0], multiplier3y: null, servicesRatio: 0.1,
      incrementalArr: [20, 0, 0], servicesOrderIntake: [2, 0, 0], cumulativeOrderIntake: 22, segment: 'core' });
    r.partners.push(
      { sourceRow: 11, name: 'Fictional Partner A2', channel: 'allianceA', maturity: 'Established', expertiseGeo: 'Home market',
        expertiseProduct: 'Product line 2', fteSales: 1, fteConsultants: null, centralSupportPct: 0.2, arr: [50, 50, 50], services: [10, 10, 10] },
      { sourceRow: 12, name: 'Fictional Partner A3', channel: 'partner', maturity: null, expertiseGeo: null,
        expertiseProduct: null, fteSales: null, fteConsultants: null, centralSupportPct: null, arr: [30, 30, 30], services: [0, 0, 0] });
  });
  window.TEST_FIXTURES.miniP2 = p;
})();
