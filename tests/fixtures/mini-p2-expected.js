/*
 * File: tests/fixtures/mini-p2-expected.js
 * Purpose: Hand-calculated results for the miniP2 fixture, with the working shown.
 * Provides: window.TEST_EXPECT.miniP2
 * Depends on: tests/fixtures/mini-p2.js
 * Used by: Phase 2 tests
 * Owner: ENGINE2 stream
 *
 * Money in thousands. Channels in the order direct, partner, allianceA (aA), allianceB (aB).
 * Keys: '<measure id>' is the three-year figure; '<id>.y1' is plan year 1. null means "not provided".
 * Recap per region, from the grids in mini-p2.js (year 1 / 2 / 3):
 *   A: NB ARR 600 / 700 / 800 (direct 400+400+500 = 1300, partner 200+300+300 = 800)
 *      NB services 120 / 140 / 160 (direct 260, partner 160)
 *      CG ARR 150 / 50 / 50 (direct 200, partner 50); CG services 30 / 10 / 10 (direct 40, partner 10)
 *   B: NB ARR 1000 / 1000 / 1200 (direct 2000, aA 1200); NB services 100 / 100 / 120 (direct 200, aA 120)
 *      CG ARR 150 / 0 / 0 (direct 100, aA 50); CG services 10 / 0 / 0 (direct 10)
 *   D: NB ARR 600 / 900 / 1200 (direct 900, partner 900, aA 450, aB 450)
 *      NB services 150 / 225 / 300 (direct 225, partner 225, aA 25+40+50 = 115, aB 25+35+50 = 110)
 *      CG ARR 180 / 88 / 0 (direct 268); CG services 70 / 22 / 0 (direct 92)
 *   C: no recap at all, so every recap figure is not provided and combined figures leave it out.
 * Accounts (three-year incremental ARR, current ARR, cumulative order intake, segment, risk):
 *   A: a1 50, 500, 60, strategic, -; a2 100, 200, 110, core, high; a3 0, 30, 0, scaled, -;
 *      a4 150, 150, 180, growth, medium (3-year multiplier); a5 20, 80, 22, core, -   -> incremental 320
 *   B: b1 120, 600, 132, strategic, -; b2 30, 100, 30, core, high                       -> incremental 150
 *   D: d1 168, 800, 210, strategic, -; d2 100, 400, 150, core, medium; d3 0, 50, 0, scaled, -  -> 268
 *   C: no accounts (not provided).
 * Partners (sales FTE, consultant FTE, three-year ARR, three-year services):
 *   A: A1 2, 3, 450, 90; A2 1, blank, 150, 30; A3 blank, blank, 90, 0.  B: B1 2, 3, 150, 30.  D: D1 2, 3, 240, 0.  C: none.
 */
window.TEST_EXPECT = window.TEST_EXPECT || {};
window.TEST_EXPECT.miniP2 = {
  region: {
    alpha: {
      'rc.nb.arr': 2100, 'rc.nb.arr.y1': 600, 'rc.nb.services': 420, 'rc.nb.oi': 2520,       // 2100 + 420
      'rc.cg.arr': 250, 'rc.cg.services': 50, 'rc.cg.oi': 300,
      'rc.all.arr': 2350, 'rc.all.services': 470, 'rc.all.oi': 2820,                             // 2520 + 300
      'rc.nb.arr.direct': 1300, 'rc.nb.arr.partner': 800, 'rc.nb.arr.allianceA': 0, 'rc.nb.arr.allianceB': 0,
      'rc.nb.arr.direct.y2': 400,
      'rc.all.oi.direct': 1800,      // NB 1300 + 260, CG 200 + 40
      'rc.all.oi.partner': 1020,     // NB 800 + 160, CG 50 + 10
      'rc.share.direct': 0.6382979,  // 1800 / 2820
      'rc.share.partner': 0.3617021, // 1020 / 2820
      'rc.share.allianceA': 0,
      'rc.share.direct.y1': 0.6666667, // year 1: direct 400 + 80 + 100 + 20 = 600 of 600 + 120 + 150 + 30 = 900
      'nb.oi': 2706,                 // nb.arr 2255 + nb.services 451
      'nb.arr.tier1': 1655,          // row 20 (Tier 1): 500 + 550 + 605
      'nb.arr.tier2': 600,           // row 21 (Tier 2): 200 x 3
      'nb.services.tier1': 331,      // 100 + 110 + 121
      'nb.oi.tier1': 1986,           // 1655 + 331
      'nb.oi.tier2': 720,            // 600 + 120
      'cg.accounts': 5, 'cg.currentArr': 960,   // 500 + 200 + 30 + 150 + 80
      'cg.oi3': 372,                 // 60 + 110 + 0 + 180 + 22
      'cg.seg.core.accounts': 2, 'cg.seg.core.arr': 280, 'cg.seg.core.oi': 132,   // a2 + a5
      'cg.seg.strategic.accounts': 1, 'cg.seg.growth.arr': 150,
      'cg.growth.all': 0.3333333,    // 320 / 960
      'cg.growth.all.y1': 0.2291667, // year 1: 50 + 100 + 0 + 50 + 20 = 220 / 960
      'cg.growth.core': 0.4285714,   // (100 + 20) / (200 + 80)
      'cg.multiplierAccounts': 1,    // a4
      'cg.top3Share': 0.9375,        // top 3: a4 150 + a2 100 + a1 50 = 300 of 320
      'cg.riskShare': 0.78125,       // a2 100 (high) + a4 150 (medium) = 250 of 320
      'pt.count': 3,
      'pt.fteSales': 3, 'pt.fteConsultants': 3,   // 2 + 1; 3 (A2's blank is skipped)
      'pt.fte': 6,                   // A1 2 + 3, A2 1; A3 has no FTE
      'pt.arr': 690, 'pt.arr.y1': 180, 'pt.services': 120,   // 450 + 150 + 90; 100 + 50 + 30; 90 + 30 + 0
      'pt.oiPerFte': 120,            // partners with FTE only: (450 + 90 + 150 + 30) / (5 + 1) = 720 / 6
      'amb.nbShare': 0.8757282       // 2255 / (2255 + 320)
    },
    bravo: {
      'rc.nb.arr': 3200, 'rc.nb.services': 320, 'rc.nb.oi': 3520, 'rc.cg.arr': 150, 'rc.cg.oi': 160, 'rc.all.oi': 3680,
      'rc.nb.arr.allianceA': 1200, 'rc.nb.arr.partner': 0,
      'rc.share.direct': 0.6277174,  // (2000 + 200 + 100 + 10) / 3680 = 2310 / 3680
      'nb.arr.tier1': 3400, 'nb.arr.tier2': 600,  // 1000 + 1200 + 1200; 200 x 3
      'cg.accounts': 2, 'cg.currentArr': 700, 'cg.oi3': 162,
      'cg.growth.all': 0.2142857,    // 150 / 700
      'cg.multiplierAccounts': 0,
      'cg.top3Share': 1,             // only two accounts
      'cg.riskShare': 0.2,           // b2 30 of 150
      'pt.count': 1, 'pt.fte': 5, 'pt.arr': 150, 'pt.oiPerFte': 36,   // 180 / 5
      'amb.nbShare': 0.9638554       // 4000 / 4150
    },
    charlie: {
      'rc.nb.arr': null, 'rc.all.oi': null, 'rc.share.direct': null,
      'nb.arr.tier1': null,          // the Tier 1 row has no hit rate, so its ARR is blank
      'nb.arr.tier2': 300,
      'cg.accounts': null, 'cg.currentArr': null, 'cg.top3Share': null, 'cg.riskShare': null,
      'pt.count': null, 'pt.fte': null, 'pt.oiPerFte': null,
      'amb.nbShare': null            // customer growth not provided, so no share can be given
    },
    delta: {
      'rc.nb.arr': 2700, 'rc.nb.services': 675, 'rc.nb.oi': 3375, 'rc.cg.arr': 268, 'rc.cg.services': 92, 'rc.all.oi': 3735,
      'rc.nb.services.allianceA': 115, 'rc.nb.services.allianceB': 110,
      'rc.share.direct': 0.3975904,  // (900 + 225 + 268 + 92) / 3735 = 1485 / 3735
      'rc.share.partner': 0.3012048, // 1125 / 3735
      'nb.arr.tier1': 0,             // new business is filled in, with no Tier 1 row
      'nb.arr.tier2': 2850,
      'cg.accounts': 3, 'cg.currentArr': 1250, 'cg.oi3': 360,
      'cg.growth.all': 0.2144,       // 268 / 1250
      'cg.top3Share': 1, 'cg.riskShare': 0.3731343,   // d2 100 of 268
      'pt.count': 1, 'pt.fte': 5, 'pt.arr': 240, 'pt.oiPerFte': 48,   // 240 / 5
      'amb.nbShare': 0.9140475       // 2850 / 3118
    }
  },

  // Figures for one context (industry, channel, motion, segment, risk). v 'na' means not applicable.
  context: [
    { id: 'cg.currentArr', region: 'alpha', ctx: { risk: 'none' }, v: 610 },        // a1 500 + a3 30 + a5 80
    { id: 'cg.accounts', region: 'alpha', ctx: { risk: 'high' }, v: 1 },            // a2
    { id: 'cg.oi3', region: 'alpha', ctx: { segment: 'core' }, v: 132 },            // a2 110 + a5 22
    { id: 'cg.seg.core.arr', region: 'alpha', ctx: { risk: 'high' }, v: 200 },      // a2
    { id: 'cg.multiplierAccounts', region: 'alpha', ctx: { segment: 'growth' }, v: 1 },
    { id: 'cg.accounts', region: 'delta', ctx: { segment: 'growth' }, v: 0 },       // accounts filled in, none in the segment
    { id: 'rc.nb.arr', region: 'delta', ctx: { channel: 'allianceB' }, v: 450 },    // 100 + 150 + 200
    { id: 'rc.all.arr', region: 'alpha', ctx: { motion: 'cg' }, v: 250 },
    { id: 'rc.all.oi', region: 'bravo', ctx: { motion: 'nb', channel: 'allianceA', year: 1 }, v: 440 },   // 400 + 40
    { id: 'nb.oi', region: 'alpha', ctx: { industryId: 'ind4' }, v: 720 },          // row 21: 600 + 120
    { id: 'ind.nb.services', region: 'alpha', ctx: { industryId: 'ind1' }, v: 331 },
    { id: 'ind.nb.oi', region: 'alpha', ctx: { industryId: 'ind1' }, v: 1986 },     // 1655 + 331
    { id: 'ind.nb.oi', region: 'delta', ctx: { industryId: 'ind1' }, v: null },     // Tier 1 with no row: not provided (D48)
    { id: 'ind.nb.oi', region: 'alpha', ctx: { industryId: 'ind3' }, v: 'na' }      // Tier 3: not applicable (D48)
  ],

  // Combined figures. Region C has no recap, accounts or partners, so it is left out (named as not provided).
  combined: {
    orgTotal: {
      'rc.nb.arr': 8000,             // 2100 + 3200 + 2700
      'rc.all.oi': 10235,            // 2820 + 3680 + 3735
      'rc.share.direct': 0.5466536,  // ratio of sums: (1800 + 2310 + 1485) / 10235 = 5595 / 10235 (the mean of shares would be 0.5545)
      'nb.arr.tier1': 5055,          // 1655 + 3400 + 0 (C not provided)
      'nb.arr.tier2': 4350,          // 600 + 600 + 300 + 2850
      'cg.accounts': 10, 'cg.currentArr': 2910, 'cg.oi3': 894,
      'cg.growth.all': 0.2536082,    // (320 + 150 + 268) / (960 + 700 + 1250) = 738 / 2910
      // The top 3 accounts across the scope (D60): d1 168, a4 150, b1 120 = 438 of 738. Averaging shares would give 0.979.
      'cg.top3Share': 0.5934959,
      'cg.riskShare': 0.5149051,     // (250 + 30 + 100) / 738 = 380 / 738
      'pt.count': 5, 'pt.fte': 16, 'pt.arr': 1080,
      'pt.oiPerFte': 71.25,          // (720 + 180 + 240) / (6 + 5 + 5) = 1140 / 16 (the mean of the three would be 68)
      'amb.nbShare': 0.9250229       // (2255 + 4000 + 2850) / (2575 + 4150 + 3118) = 9105 / 9843
    },
    restOfAlphaAverage: {
      'rc.nb.arr': 2950,             // (3200 + 2700) / 2, C not provided
      'cg.currentArr': 975,          // (700 + 1250) / 2
      'cg.top3Share': 0.9282297,     // B and D pooled: d1 168 + b1 120 + d2 100 = 388 of 418
      'cg.riskShare': 0.3110048,     // (30 + 100) / 418
      'rc.share.direct': 0.5118004   // (2310 + 1485) / (3680 + 3735) = 3795 / 7415
    }
  }
};
