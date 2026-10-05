/*
 * File: tests/fixtures/mini-p4-expected.js
 * Purpose: Hand-calculated results for the miniP4 fixture, with the working shown.
 * Provides: window.TEST_EXPECT.miniP4
 * Depends on: tests/fixtures/mini-p4.js
 * Used by: Phase 4 tests
 * Owner: ENGINE4 stream
 *
 * Money in thousands. Channels in the order direct, partner, allianceA (aA), allianceB (aB).
 * Keys: '<measure id>' is the three-year figure; '<id>.y1' is plan year 1. null means "not provided", 'na' "not applicable".
 * Region C has no Phase 4 part: every figure is not provided and combined figures leave it out.
 *
 * Customer value (the recap, from mini-p2-expected.js), year 1 / 2 / 3 and by channel:
 *   A 900 / 900 / 1020 = 2820 (direct 1800, partner 1020)        B 1260 / 1100 / 1320 = 3680 (direct 2310, aA 1370)
 *   D 1000 / 1235 / 1500 = 3735 (direct 1485, partner 1125, aA 565, aB 560)                  together 10235
 * Books value, from the grids in mini-p4.js (year 1 / 2 / 3):
 *   A: recurring NB 550 / 625 / 725 + CG 140 / 50 / 50 = 690 / 675 / 775 = 2140; services NB 100 / 110 / 130 + CG 25 / 10 / 10
 *      = 125 / 120 / 140 = 385; software perpetual 50 / 0 / 0 = 50; hardware 20 / 20 / 10 = 50
 *      all: 885 / 815 / 925 = 2625. Direct 1300 + 260 + 50 + 50 + 200 + 40 = 1900; partner 600 + 80 + 40 + 5 = 725
 *   B: recurring NB 900 / 900 / 1100 + CG 140 / 0 / 0 = 3040; services 80 / 80 / 100 + 10 / 0 / 0 = 270; nothing else
 *      all: 1130 / 980 / 1200 = 3310. Direct 2000 + 200 + 100 + 10 = 2310; aA 900 + 60 + 40 = 1000
 *   D: recurring NB 400 / 600 / 800 + CG 180 / 88 / 0 = 580 / 688 / 800 = 2068; services 125 / 200 / 250 + 70 / 22 / 0
 *      = 195 / 222 / 250 = 667; hardware 30 / 30 / 40 = 100 (partner); no software perpetual
 *      all: 805 / 940 / 1090 = 2835. Direct 900 + 225 + 268 + 92 = 1485; partner 450 + 125 + 100 = 675; aA 340; aB 335
 * Revenue (year 1 / 2 / 3):
 *   A: NB ARR 300 / 600 / 800 = 1700, NB services 60 / 100 / 140 = 300, CG ARR 75 / 50 / 50 = 175, CG services 15 / 10 / 10 = 35
 *      all: 450 / 760 / 1000 = 2210. Direct 1100 + 180 + 150 + 30 = 1460; partner 600 + 120 + 25 + 5 = 750
 *   B: NB ARR 500 / 1000 / 1100 = 2600, NB services 50 / 100 / 120 = 270, CG ARR 75, CG services 10
 *      all: 635 / 1100 / 1220 = 2955. Direct 1600 + 170 + 50 + 10 = 1830; aA 1000 + 100 + 25 = 1125
 *   D: NB ARR 300 / 600 / 1200 = 2100, NB services 150 / 140 / 300 = 590, CG ARR 90 / 88 / 0 = 178, CG services 70 / 22 / 0 = 92
 *      all: 610 / 850 / 1500 = 2960. Direct 700 + 200 + 178 + 92 = 1170
 * Strategic plan (year 1 / 2 / 3), and the plan on the same basis: the books value of each year and category the
 * strategic plan gives a figure for.
 *   A: recurring 700 / 700 / 800 = 2200, services 150 x 3 = 450, software perpetual 50 / 0 / 0 = 50; no hardware
 *      strategic plan 900 / 850 / 950 = 2700. Plan: 2140 + 385 + 50 = 2575 (865 / 795 / 915); A's hardware 50 is left out
 *   B: recurring 1000 / 900 / 1000 = 2900, services 100 x 3 = 300 -> 1100 / 1000 / 1100 = 3200. Plan: 3040 + 270 = 3310
 *   D: recurring 800 / 800 / 900 = 2500, services 200 / 250 / blank = 450, hardware 50 x 3 = 150 -> 1050 / 1100 / 950 = 3100
 *      Plan: recurring 2068 + services years 1 and 2 only 195 + 222 = 417 + hardware 100 = 2585 (805 / 940 / 840)
 * Base year, per category: budget, forecast, actuals, pipeline, the workbook's coverage:
 *   A: software perpetual 40, 50, 50, 0, -; recurring 600, 640, 400, 480, 2; services 120, 110, 70, 60, -
 *   B: recurring 900, 1000, 600, 500, 1.25; services 100, 100, 40, 30, 0.5
 *   D: recurring 500, 550, 350, 100, -; services 150, 150, 100, blank, -; hardware 20, 25, 5, 30, -
 * Routes (three-year figures), with the solution named:
 *   A: own sales 1300 + 260 = 1560 (sol1); customer success 200 + 40 = 240 (none); other resellers 600 (sol2)   -> 2400
 *   B: own sales 2000 (sol1); customer success 100 (none); system integrators 900 + 60 = 960 (sol3)              -> 3060
 *   D: own sales 900 (none); Alliance B as reseller 225 (sol2); other resellers 450 (sol2);
 *      partner existing business 30 + 30 + blank = 60 (none)                                                     -> 1635
 * New business rows and their solution (three-year ARR, services):
 *   A: row 20 sol1 1655, 331; row 21 sol2 600, 120.  B: row 20 sol1 3400, 340; row 21 no solution 600, 60.
 *   D: row 20 sol3 2850, 712.5.  C: no row names a solution, so not provided.
 * Partners (type, maturity, three-year order intake = ARR + services, distribution):
 *   A: A1 reseller, Enable, 450 + 90 = 540, 900; A2 integrator, Strategic, 150 + 30 = 180, 100 + 100 + blank = 200;
 *      A3 no type, no maturity, 90 + 0 = 90, none
 *   B: B1 integrator, Onboard, 150 + 30 = 180, 240; B2 reseller, Enable, 60 + 15 = 75, 90
 *   D: D1 referral, Recruit, 240 + 0 = 240 (year 3 services blank), 300
 */
window.TEST_EXPECT = window.TEST_EXPECT || {};
window.TEST_EXPECT.miniP4 = {
  region: {
    alpha: {
      'bk.oi': 2625, 'bk.oi.y1': 885, 'bk.arr': 2140, 'bk.services': 385, 'bk.swPerpetual': 50, 'bk.hardware': 50,
      'bk.oi.direct': 1900, 'bk.oi.partner': 725, 'bk.oi.allianceA': 0, 'bk.oi.allianceB': 0,
      'bk.oi.direct.y1': 670,        // 400 + 80 + 50 + 20 + 100 + 20
      'cv.oi': 2820, 'cv.oi.y1': 900,
      'bk.gap': 195, 'bk.gap.y1': 15,           // 2820 - 2625; 900 - 885
      'bk.gapShare': 0.0691489,      // 195 / 2820
      'sp.oi': 2700, 'sp.oi.y1': 900, 'sp.arr': 2200, 'sp.services': 450, 'sp.swPerpetual': 50, 'sp.hardware': null,
      'sp.plan': 2575, 'sp.plan.y1': 865,       // 690 + 125 + 50
      'sp.variance': -125, 'sp.variance.y1': -35,   // 2575 - 2700; 865 - 900
      'sp.variancePct': -0.0462963,  // -125 / 2700
      'sp.variancePct.y1': -0.0388889,   // -35 / 900
      'by.budget': 760, 'by.forecast': 800, 'by.actuals': 520, 'by.pipeline': 540,
      // Year 1 books value of the categories the base year gives: 50 + 690 + 125 = 865 against the forecast of 800
      'by.growth': 0.08125,          // (865 - 800) / 800
      // Pipeline over forecast minus actuals: (0 + 480 + 60) / (0 + 240 + 40); recurring uses the workbook's 2 = 480 / 240
      'by.coverage': 1.9285714,      // 540 / 280
      'rv.nb.arr': 1700, 'rv.nb.arr.y1': 300, 'rv.nb.services': 300, 'rv.nb.oi': 2000,
      'rv.cg.arr': 175, 'rv.cg.services': 35, 'rv.cg.oi': 210,
      'rv.all.arr': 1875, 'rv.all.services': 335, 'rv.all.oi': 2210, 'rv.all.oi.y2': 760,
      'rv.share': 0.7836879,         // 2210 / 2820
      'rv.share.y1': 0.5,            // 450 / 900
      'nb.arr.sol': 2255, 'nb.arr.sol.y1': 700, 'nb.services.sol': 451, 'nb.oi.sol': 2706, 'nb.oi.sol.y1': 840,
      'oi.cat': 2625, 'oi.cat.y3': 925,
      'rt.oi': 2400, 'rt.oi.y1': 750,           // 400 + 80 + 100 + 20 + 150
      'pt.count.maturity': 3, 'pt.oi.maturity': 810   // 540 + 180 + 90
    },
    bravo: {
      'bk.oi': 3310, 'bk.oi.y1': 1130, 'bk.arr': 3040, 'bk.services': 270, 'bk.swPerpetual': null, 'bk.hardware': null,
      'bk.oi.direct': 2310, 'bk.oi.allianceA': 1000, 'bk.oi.partner': 0,
      'cv.oi': 3680,
      'bk.gap': 370,                 // 3680 - 3310
      'bk.gapShare': 0.1005435,      // 370 / 3680
      'sp.oi': 3200, 'sp.arr': 2900, 'sp.services': 300, 'sp.swPerpetual': null, 'sp.hardware': null,
      'sp.plan': 3310, 'sp.variance': 110,
      'sp.variancePct': 0.034375,    // 110 / 3200
      'by.budget': 1000, 'by.forecast': 1100, 'by.actuals': 640, 'by.pipeline': 530,
      'by.growth': 0.0272727,        // year 1 books 1040 + 90 = 1130; (1130 - 1100) / 1100
      // Both items carry the workbook's ratio: 500 / 1.25 = 400 and 30 / 0.5 = 60 still to win
      'by.coverage': 1.1521739,      // 530 / 460
      'rv.nb.arr': 2600, 'rv.nb.services': 270, 'rv.nb.oi': 2870, 'rv.cg.arr': 75, 'rv.cg.services': 10, 'rv.cg.oi': 85,
      'rv.all.arr': 2675, 'rv.all.services': 280, 'rv.all.oi': 2955, 'rv.all.oi.y1': 635,
      'rv.share': 0.8029891,         // 2955 / 3680
      'rv.share.y1': 0.5039683,      // 635 / 1260
      'nb.arr.sol': 4000, 'nb.services.sol': 400, 'nb.oi.sol': 4400,
      'oi.cat': 3310,
      'rt.oi': 3060, 'rt.oi.y1': 1020,          // 600 + 100 + 300 + 20
      'pt.count.maturity': 2, 'pt.oi.maturity': 255   // 180 + 75
    },
    charlie: {
      'bk.oi': null, 'bk.arr': null, 'bk.oi.direct': null, 'cv.oi': null, 'bk.gap': null, 'bk.gapShare': null,
      'sp.oi': null, 'sp.arr': null, 'sp.plan': null, 'sp.variance': null, 'sp.variancePct': null,
      'by.budget': null, 'by.forecast': null, 'by.actuals': null, 'by.pipeline': null, 'by.growth': null, 'by.coverage': null,
      'rv.nb.arr': null, 'rv.cg.oi': null, 'rv.all.oi': null, 'rv.share': null,
      'nb.arr.sol': null, 'nb.services.sol': null, 'nb.oi.sol': null, 'oi.cat': null, 'rt.oi': null,
      'pt.count.maturity': null, 'pt.oi.maturity': null
    },
    delta: {
      'bk.oi': 2835, 'bk.oi.y1': 805, 'bk.arr': 2068, 'bk.services': 667, 'bk.swPerpetual': null, 'bk.hardware': 100,
      'bk.oi.direct': 1485, 'bk.oi.partner': 675, 'bk.oi.allianceA': 340, 'bk.oi.allianceB': 335,
      'cv.oi': 3735,
      'bk.gap': 900,                 // 3735 - 2835
      'bk.gapShare': 0.2409639,      // 900 / 3735
      'sp.oi': 3100, 'sp.oi.y3': 950, 'sp.arr': 2500, 'sp.services': 450, 'sp.swPerpetual': null, 'sp.hardware': 150,
      'sp.plan': 2585, 'sp.plan.y3': 840,       // year 3: recurring 800 + hardware 40; services has no strategic plan figure
      'sp.variance': -515, 'sp.variance.y3': -110,
      'sp.variancePct': -0.166129,   // -515 / 3100
      'by.budget': 670, 'by.forecast': 725, 'by.actuals': 455, 'by.pipeline': 130,
      'by.growth': 0.1103448,        // year 1 books 580 + 195 + 30 = 805; (805 - 725) / 725
      // Services has no pipeline, so it is left out: (100 + 30) / (200 + 20)
      'by.coverage': 0.5909091,      // 130 / 220
      'rv.nb.arr': 2100, 'rv.nb.services': 590, 'rv.nb.oi': 2690, 'rv.cg.arr': 178, 'rv.cg.services': 92, 'rv.cg.oi': 270,
      'rv.all.arr': 2278, 'rv.all.services': 682, 'rv.all.oi': 2960, 'rv.all.oi.y1': 610,
      'rv.share': 0.7925033,         // 2960 / 3735
      'rv.share.y1': 0.61,           // 610 / 1000
      'nb.arr.sol': 2850, 'nb.services.sol': 712.5, 'nb.oi.sol': 3562.5,
      'oi.cat': 2835,
      'rt.oi': 1635, 'rt.oi.y1': 380,           // 200 + 50 + 100 + 30
      'pt.count.maturity': 1, 'pt.oi.maturity': 240
    }
  },

  // Region C has nothing, so it is left out of every combined figure. Money and counts sum (or average, for the
  // rest as an average); shares and ratios are the summed parts divided, never the mean of the regions' ratios.
  combined: {
    orgTotal: {
      'bk.oi': 8770,                 // 2625 + 3310 + 2835
      'bk.arr': 7248, 'bk.services': 1322,
      'bk.swPerpetual': 50,          // Region A only
      'bk.hardware': 150,            // A 50 + D 100
      'bk.oi.direct': 5695, 'bk.oi.partner': 1400, 'bk.oi.allianceA': 1340, 'bk.oi.allianceB': 335,
      'cv.oi': 10235,
      'bk.gap': 1465,                // 195 + 370 + 900
      'bk.gapShare': 0.1431363,      // 1465 / 10235 (the mean of the three shares would be 0.1368854)
      'sp.oi': 9000, 'sp.plan': 8470,           // 2700 + 3200 + 3100; 2575 + 3310 + 2585
      'sp.variance': -530,
      'sp.variancePct': -0.0588889,  // -530 / 9000 (the mean of the three would be -0.0593501)
      'by.budget': 2430, 'by.forecast': 2625, 'by.actuals': 1615, 'by.pipeline': 1200,
      'by.growth': 0.0666667,        // (865 + 1130 + 805 - 2625) / 2625 = 175 / 2625 (mean 0.0729558)
      'by.coverage': 1.25,           // (540 + 530 + 130) / (280 + 460 + 220) = 1200 / 960 (mean 1.2238848)
      'rv.nb.arr': 6400, 'rv.all.arr': 6828, 'rv.all.services': 1297,
      'rv.all.oi': 8125,             // 2210 + 2955 + 2960
      'rv.share': 0.7938446,         // 8125 / 10235 (mean 0.7930601)
      'nb.arr.sol': 9105, 'nb.services.sol': 1563.5, 'nb.oi.sol': 10668.5,
      'oi.cat': 8770,
      'rt.oi': 7095,                 // 2400 + 3060 + 1635
      'pt.count.maturity': 6, 'pt.oi.maturity': 1305   // 810 + 255 + 240
    },
    restOfAlphaAverage: {            // Regions B and D (C has nothing)
      'bk.oi': 3072.5,               // (3310 + 2835) / 2
      'bk.gap': 635,                 // (370 + 900) / 2
      'bk.gapShare': 0.1712744,      // (370 + 900) / (3680 + 3735) = 1270 / 7415
      'sp.oi': 3150, 'sp.plan': 2947.5,
      'sp.variance': -202.5,         // (110 - 515) / 2
      'sp.variancePct': -0.0642857,  // (110 - 515) / (3200 + 3100) = -405 / 6300
      'by.forecast': 912.5,
      'by.growth': 0.060274,         // (1130 + 805 - 1825) / 1825 = 110 / 1825
      'by.coverage': 0.9705882,      // (530 + 130) / (460 + 220) = 660 / 680
      'rv.all.oi': 2957.5,
      'rv.share': 0.7977073,         // (2955 + 2960) / 7415 = 5915 / 7415
      'nb.arr.sol': 3425,            // (4000 + 2850) / 2
      'rt.oi': 2347.5,
      'pt.count.maturity': 1.5, 'pt.oi.maturity': 247.5
    }
  },

  // Figures in a context other than the plan year
  context: [
    { id: 'bk.oi', region: 'alpha', ctx: { channel: 'partner' }, v: 725 },
    { id: 'bk.oi', region: 'alpha', ctx: { motion: 'nb' }, v: 2340 },            // 1900 + 340 + 50 + 50
    { id: 'bk.oi', region: 'alpha', ctx: { motion: 'cg' }, v: 285 },             // 240 + 45
    { id: 'bk.arr', region: 'delta', ctx: { channel: 'allianceA', year: 2 }, v: 75 },
    { id: 'bk.oi.direct', region: 'alpha', ctx: { motion: 'nb' }, v: 1660 },     // 1300 + 260 + 50 + 50
    { id: 'cv.oi', region: 'delta', ctx: { channel: 'partner' }, v: 1125 },
    // Books above customer value on Region A's direct channel: books also holds software perpetual and hardware
    { id: 'bk.gap', region: 'alpha', ctx: { channel: 'direct' }, v: -100 },      // 1800 - 1900
    { id: 'bk.gap', region: 'alpha', ctx: { channel: 'partner' }, v: 295 },      // 1020 - 725
    { id: 'bk.gapShare', region: 'alpha', ctx: { channel: 'partner' }, v: 0.2892157 },   // 295 / 1020
    { id: 'bk.gapShare', region: 'delta', ctx: { channel: 'partner' }, v: 0.4 },         // (1125 - 675) / 1125
    { id: 'bk.gapShare', region: 'bravo', ctx: { channel: 'direct' }, v: 0 },            // 2310 both ways
    { id: 'sp.oi', region: 'alpha', ctx: { category: 'recurring' }, v: 2200 },
    { id: 'sp.oi', region: 'alpha', ctx: { category: 'hardware' }, v: null },
    { id: 'sp.arr', region: 'alpha', ctx: { category: 'recurring', year: 1 }, v: 700 },
    { id: 'sp.arr', region: 'alpha', ctx: { category: 'services' }, v: 'na' },   // one category's measure has no other category
    { id: 'sp.plan', region: 'alpha', ctx: { category: 'services' }, v: 385 },
    { id: 'sp.plan', region: 'alpha', ctx: { category: 'hardware' }, v: null },  // the strategic plan gives no hardware
    { id: 'sp.variance', region: 'alpha', ctx: { category: 'recurring' }, v: -60 },      // 2140 - 2200
    { id: 'sp.variancePct', region: 'alpha', ctx: { category: 'services' }, v: -0.1444444 },   // (385 - 450) / 450
    { id: 'sp.variancePct', region: 'alpha', ctx: { category: 'swPerpetual' }, v: 0 },   // 50 against 50
    { id: 'by.forecast', region: 'alpha', ctx: { category: 'recurring' }, v: 640 },
    { id: 'by.budget', region: 'bravo', ctx: { category: 'hardware' }, v: null },
    { id: 'by.pipeline', region: 'delta', ctx: { category: 'services' }, v: null },
    { id: 'by.growth', region: 'alpha', ctx: { against: 'budget' }, v: 0.1381579 },      // (865 - 760) / 760
    { id: 'by.growth', region: 'bravo', ctx: { against: 'budget' }, v: 0.13 },           // (1130 - 1000) / 1000
    { id: 'by.growth', region: 'alpha', ctx: { category: 'recurring' }, v: 0.078125 },   // (690 - 640) / 640
    { id: 'by.growth', region: 'alpha', ctx: { category: 'services' }, v: 0.1363636 },   // (125 - 110) / 110
    { id: 'by.coverage', region: 'alpha', ctx: { category: 'recurring' }, v: 2 },        // the workbook's own ratio
    { id: 'by.coverage', region: 'alpha', ctx: { category: 'services' }, v: 1.5 },       // 60 / (110 - 70)
    { id: 'by.coverage', region: 'alpha', ctx: { category: 'swPerpetual' }, v: 'na' },   // nothing still to win: 50 - 50
    { id: 'by.coverage', region: 'delta', ctx: { category: 'hardware' }, v: 1.5 },       // 30 / (25 - 5)
    { id: 'by.coverage', region: 'delta', ctx: { category: 'services' }, v: null },      // no pipeline figure
    { id: 'rv.all.oi', region: 'alpha', ctx: { channel: 'direct' }, v: 1460 },
    { id: 'rv.all.oi', region: 'alpha', ctx: { motion: 'cg' }, v: 210 },
    { id: 'rv.nb.arr', region: 'bravo', ctx: { channel: 'allianceA', year: 1 }, v: 200 },
    { id: 'rv.share', region: 'alpha', ctx: { channel: 'direct' }, v: 0.8111111 },       // 1460 / 1800
    { id: 'nb.arr.sol', region: 'alpha', ctx: { solution: 'sol1' }, v: 1655 },
    { id: 'nb.arr.sol', region: 'alpha', ctx: { solution: 'sol3' }, v: 0 },      // the column is filled, nothing is in sol3
    { id: 'nb.arr.sol', region: 'bravo', ctx: { solution: 'none' }, v: 600 },    // row 21 names no solution
    { id: 'nb.oi.sol', region: 'alpha', ctx: { solution: 'sol1' }, v: 1986 },    // 1655 + 331
    { id: 'nb.oi.sol', region: 'delta', ctx: { solution: 'sol3', year: 1 }, v: 750 },    // 600 + 150
    { id: 'oi.cat', region: 'alpha', ctx: { category: 'recurring' }, v: 2140 },
    { id: 'oi.cat', region: 'bravo', ctx: { category: 'hardware' }, v: null },
    { id: 'rt.oi', region: 'alpha', ctx: { route: 'ownSales' }, v: 1560 },
    { id: 'rt.oi', region: 'alpha', ctx: { route: 'systemIntegrators' }, v: null },      // no figure for that route
    { id: 'rt.oi', region: 'bravo', ctx: { route: 'systemIntegrators', year: 1 }, v: 320 },
    { id: 'rt.oi', region: 'delta', ctx: { solution: 'sol2' }, v: 675 },         // 225 + 450
    { id: 'rt.oi', region: 'delta', ctx: { solution: 'none' }, v: 960 },         // 900 + 60
    { id: 'pt.count.maturity', region: 'alpha', ctx: { maturity: 'enable' }, v: 1 },
    { id: 'pt.count.maturity', region: 'alpha', ctx: { maturity: 'strategic' }, v: 1 },  // A2's "Strategic", given as text
    { id: 'pt.count.maturity', region: 'alpha', ctx: { maturity: 'none' }, v: 1 },       // A3
    { id: 'pt.count.maturity', region: 'alpha', ctx: { maturity: 'recruit' }, v: 0 },
    { id: 'pt.count.maturity', region: 'bravo', ctx: { partnerType: 'si' }, v: 1 },
    { id: 'pt.oi.maturity', region: 'alpha', ctx: { maturity: 'enable' }, v: 540 },
    { id: 'pt.oi.maturity', region: 'alpha', ctx: { partnerType: 'none' }, v: 90 },
    { id: 'pt.oi.maturity', region: 'bravo', ctx: { partnerType: 'var' }, v: 75 }
  ],
  combinedContext: [
    { id: 'sp.variancePct', entity: 'orgTotal', ctx: { category: 'recurring' }, v: -0.0463158 },   // (7248 - 7600) / 7600
    { id: 'by.growth', entity: 'orgTotal', ctx: { against: 'budget' }, v: 0.1522634 },             // (2800 - 2430) / 2430
    { id: 'by.coverage', entity: 'orgTotal', ctx: { category: 'recurring' }, v: 1.2857143 },       // (480 + 500 + 100) / (240 + 400 + 200)
    { id: 'rv.share', entity: 'orgTotal', ctx: { channel: 'direct' }, v: 0.7971403 },              // (1460 + 1830 + 1170) / 5595
    { id: 'bk.gapShare', entity: 'orgTotal', ctx: { channel: 'partner' }, v: 0.3473193 },          // (295 + 0 + 450) / (1020 + 0 + 1125)
    { id: 'pt.count.maturity', entity: 'orgTotal', ctx: { maturity: 'enable' }, v: 2 },            // A1 and B2
    { id: 'pt.oi.maturity', entity: 'orgTotal', ctx: { partnerType: 'si' }, v: 360 }               // A2 180 + B1 180
  ],

  // The mean of the regions' own ratios, which a combined ratio must never be
  meanOfRatios: { 'sp.variancePct': -0.0593501, 'by.growth': 0.0729558, 'by.coverage': 1.2238848, 'rv.share': 0.7930601,
    'bk.gapShare': 0.1368854 },

  // The kind of value: the workbook's own coverage is a system figure, a worked-out one is calculated by this app
  kinds: [
    { id: 'by.coverage', region: 'alpha', ctx: { category: 'recurring' }, kind: 'PRE' },
    { id: 'by.coverage', region: 'alpha', ctx: { category: 'services' }, kind: 'APP' },
    { id: 'by.coverage', region: 'alpha', ctx: {}, kind: 'APP' },      // several categories together
    { id: 'by.coverage', region: 'bravo', ctx: { category: 'services' }, kind: 'PRE' }
  ],

  // Partly provided (a blank inside a sum): 'yes' must carry the flag, 'no' must not
  partial: {
    alpha: { yes: ['rv.nb.arr', 'rv.all.oi', 'rv.share'], no: ['rv.nb.services', 'bk.oi', 'sp.oi', 'by.pipeline', 'rt.oi'] },
    delta: { yes: ['sp.services', 'sp.oi', 'sp.variance', 'sp.variancePct', 'by.pipeline', 'by.coverage', 'rt.oi', 'pt.oi.maturity'],
      no: ['sp.arr', 'sp.plan', 'by.forecast', 'by.growth', 'bk.oi', 'rv.all.oi'] },
    orgTotal: { yes: ['sp.oi', 'rt.oi', 'by.coverage'], no: ['bk.oi', 'by.forecast'] }
  },

  // Breakdown columns: one per lookup value in the lookup's order, plus "none" when some row or item has no value.
  // total is the figure without a breakdown; the values that are provided add up to it.
  breakdowns: [
    { id: 'oi.cat', dim: 'category', entity: 'alpha', total: 2625,
      values: { swPerpetual: 50, recurring: 2140, hardware: 50, services: 385 } },
    { id: 'oi.cat', dim: 'category', entity: 'org', total: 8770,
      values: { swPerpetual: 50, recurring: 7248, hardware: 150, services: 1322 } },
    { id: 'sp.oi', dim: 'category', entity: 'org', total: 9000,
      values: { swPerpetual: 50, recurring: 7600, hardware: 150, services: 1200 } },
    { id: 'by.forecast', dim: 'category', entity: 'org', total: 2625,
      values: { swPerpetual: 50, recurring: 2190, hardware: 25, services: 360 } },
    { id: 'nb.arr.sol', dim: 'solution', entity: 'org', total: 9105,
      values: { sol1: 5055, sol2: 600, sol3: 2850, none: 600 } },
    { id: 'nb.arr.sol', dim: 'solution', entity: 'bravo', total: 4000, values: { sol1: 3400, sol2: 0, sol3: 0, none: 600 } },
    { id: 'rt.oi', dim: 'route', entity: 'org', total: 7095,
      values: { ownSales: 4460, customerSuccess: 340, allianceBReseller: 225, otherResellers: 1050, systemIntegrators: 960, partnerExisting: 60 } },
    { id: 'rt.oi', dim: 'solution', entity: 'org', total: 7095, values: { sol1: 3560, sol2: 1275, sol3: 960, none: 1300 } },
    { id: 'pt.count.maturity', dim: 'maturity', entity: 'org', total: 6,
      values: { recruit: 1, onboard: 1, enable: 2, skill: 0, strategic: 1, none: 1 } },
    { id: 'pt.oi.maturity', dim: 'maturity', entity: 'org', total: 1305,
      values: { recruit: 240, onboard: 180, enable: 615, skill: 0, strategic: 180, none: 90 } },
    { id: 'pt.count.maturity', dim: 'partnerType', entity: 'org', total: 6, values: { 'var': 2, si: 2, referral: 1, none: 1 } },
    { id: 'pt.oi.maturity', dim: 'partnerType', entity: 'restOfAlphaAverage', total: 247.5,
      values: { 'var': 37.5, si: 90, referral: 120 } },   // B2 75, B1 180, D1 240, each over the two regions
    { id: 'bk.oi', dim: 'channel', entity: 'org', total: 8770, values: { direct: 5695, partner: 1400, allianceA: 1340, allianceB: 335 } },
    { id: 'rv.all.oi', dim: 'motion', entity: 'alpha', total: 2210, values: { nb: 2000, cg: 210 } }
  ],
  // The values a breakdown lists when no row is without one: no "none" column
  noNone: [{ id: 'nb.arr.sol', dim: 'solution', entity: 'alpha', values: ['sol1', 'sol2', 'sol3'] },
    { id: 'oi.cat', dim: 'category', entity: 'org', values: ['swPerpetual', 'recurring', 'hardware', 'services'] }],

  // Where a figure reads from: file, sheet and cell (meta.sourceMap in mini-p4.js)
  sources: [
    { id: 'rv.nb.arr', region: 'alpha', ctx: { channel: 'direct', year: 1 }, text: 'Region A plan.xlsx › 5. Recap › E30' },
    { id: 'bk.arr', region: 'alpha', ctx: { channel: 'direct', motion: 'nb', year: 2 }, text: 'Region A plan.xlsx › 5. Recap › E61' },
    { id: 'sp.arr', region: 'alpha', ctx: { year: 1 }, text: 'Region A plan.xlsx › 5. Recap › E90' },
    { id: 'sp.arr', region: 'alpha', ctx: {}, text: 'Region A plan.xlsx › 5. Recap › E90:G90' },
    { id: 'by.forecast', region: 'alpha', ctx: { category: 'recurring' }, text: 'Region A plan.xlsx › 6. Order Intake › D8' },
    { id: 'by.budget', region: 'alpha', ctx: {}, text: 'Region A plan.xlsx › 6. Order Intake › C7:C9' },
    { id: 'by.coverage', region: 'alpha', ctx: { category: 'recurring' }, text: 'Region A plan.xlsx › 6. Order Intake › G8' },
    { id: 'rt.oi', region: 'alpha', ctx: { route: 'otherResellers', year: 1 }, text: 'Region A plan.xlsx › 5. Recap › E104' },
    { id: 'nb.arr.sol', region: 'alpha', ctx: { solution: 'sol1' }, text: 'Region A plan.xlsx › 2. New Business › O20:Q20' },
    { id: 'pt.count.maturity', region: 'alpha', ctx: { maturity: 'enable' }, text: 'Region A plan.xlsx › 4. Partner › D10' }
  ],

  // The partner list's new columns: [row id, type, maturity, distribution over three years]
  partnerList: [
    ['alpha:10', 'Value-added reseller', 'Enable', 900], ['alpha:11', 'System integrator', 'Strategic', 200],
    ['alpha:12', null, null, null], ['bravo:10', 'System integrator', 'Onboard', 240],
    ['bravo:11', 'Value-added reseller', 'Enable', 90], ['delta:10', 'Referral partner', 'Recruit', 300]
  ],
  // Sorted by maturity, lowest level first (the lookup's rank, not the alphabet); the partner without one comes last
  byMaturity: ['delta:10', 'bravo:10', 'alpha:10', 'bravo:11', 'alpha:11', 'alpha:12']
};
