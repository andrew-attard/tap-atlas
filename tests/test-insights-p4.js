/*
 * File: tests/test-insights-p4.js
 * Purpose: Tests for the Phase 4 insight rules (the outlook family): plan against the strategic plan, year 1 against
 *          the base year, pipeline coverage, books value gap and solution reliance (US-4.6.2).
 * Provides: test cases for the INSIGHTS4 stream: TPV-TC-749 to 753, X-insights4-*
 * Depends on: tests/harness.js, tests/test-setup.js, tests/test-insights.js (T_INSIGHTS), the app scripts,
 *             data/sample-plan-data.js, tests/fixtures/sample-expected.js (R01 to R07), tests/fixtures/mini-p4.js
 * Used by: tests.html
 * Owner: INSIGHTS4 stream
 *
 * Sample figures are the planted values in SAMPLE_EXPECT (docs/PLANTED-CASES.md, R01 to R07). Mini figures are
 * worked by hand from tests/fixtures/mini-p4-expected.js, in the comment beside each.
 */
(function (TAP) {
  'use strict';

  var X = window.SAMPLE_EXPECT, F = TAP.format;
  // Each rule, the report that shows its figure and the measure its sentence quotes (D79)
  var RULES = { spGap: ['ol-strategic', 'sp.oi'], spTotal: ['ol-strategic', 'sp.oi'],
    y1Jump: ['ol-baseyear', 'by.growth'], lowCoverage: ['ol-coverage', 'by.coverage'], booksGap: ['pt-books', 'bk.gapShare'],
    solutionReliance: ['nb-solutions', 'nb.oi.sol'] };
  var IDS = Object.keys(RULES);

  function cfg(id) { return window.TAP_RULES.rules.filter(function (r) { return r.id === id; })[0]; }
  function all() { return TAP.insights.all(); }
  function ofRule(id) { return all().filter(function (x) { return x.ruleId === id; }); }
  function get(id) { return all().filter(function (x) { return x.id === id; })[0]; }
  function outlook() { return all().filter(function (x) { return x.family === 'outlook'; }); }
  function fig(x, measureId) { return x.figures.filter(function (f) { return f.measureId === measureId; })[0]; }
  function sample() { window.T_INSIGHTS.sample(); }
  // The miniP4 fixture, reshaped by make(plan) when given, then loaded
  function mini(make) {
    var p = T_FIXTURE('miniP4');
    if (make) make(p);
    TAP.data.load(p);
    TAP.insights.reset();
    return p;
  }
  function rg(p, id) { return p.regions.filter(function (r) { return r.id === id; })[0]; } function ids(list) { return list.map(function (x) { return x.id; }); }
  function banned(s) { return window.TAP_RULES.wording.banned.filter(function (w) { return new RegExp('(^|[^A-Za-z])' + w + '([^A-Za-z]|$)', 'i').test(s); }); }
  function times(v) { return F.num(v, { decimals: 2 }) + '×'; }
  // Runs body with the outlook rules switched off, then switches them back on
  function withoutOutlook(body) {
    var rules = IDS.map(cfg);
    rules.forEach(function (r) { r.enabled = false; });
    TAP.insights.reset();
    try { return body(); } finally { rules.forEach(function (r) { r.enabled = true; }); TAP.insights.reset(); }
  }

  T.suite('insights-p4', function () {
    T.test('TPV-TC-749', 'The configuration has a rule for each Phase 4 observation', function (a) {
      IDS.forEach(function (id) {
        var r = cfg(id);
        a.ok(r, id + ' is in config/insight-rules.js');
        if (!r) return;
        a.ok(r.family === 'outlook' && r.enabled === true, id + ' is on, in the outlook family');
        a.equal(r.optional, true, id + ' is skipped quietly on a file without the Phase 4 parts');
        a.ok(r.description.length > 40 && r.scoring.length > 20, id + ' explains itself and its scoring');
        a.ok(Object.keys(r.params).length > 0, id + ' keeps its thresholds in params');
      });
      // Below and above the strategic plan are one rule with a direction word
      a.ok(/\{direction\}/.test(cfg('spGap').template), 'spGap reads below or above');
      a.ok(window.TAP_RULES.wording.phrases.outlook.below && window.TAP_RULES.wording.phrases.outlook.above, 'with both words');
      a.ok(window.TAP_SETTINGS.insights.familyWeights.outlook > 0, 'the family has a weight');
    });

    T.test('TPV-TC-750', 'On the sample data the outlook insights rank with the other figure-based families', function (a) {
      sample();
      var list = all(), out = outlook(), firstTheme = list.map(function (x) { return x.family; }).indexOf('themes');
      a.equal(out.length, 7, 'seven outlook insights (R01 to R07)');
      out.forEach(function (x) {
        a.near(x.significance, TAP.insights.significance('outlook', x.strength, x.money, x.breadth), 1e-12, x.id + ': the same score formula');
        a.ok(list.indexOf(x) < firstTheme, x.id + ' ranks before the theme insights (D80)');
      });
      var figures = list.filter(function (x) { return x.family !== 'themes'; });
      figures.forEach(function (x, i) { if (i) a.ok(figures[i - 1].significance >= x.significance, x.id + ' is in significance order'); });
      a.ok(list.indexOf(out[out.length - 1]) > list.indexOf(out[0]), 'spread through the list, not grouped by family');
    });

    // 47 before D112, which adds one industryCover insight per region with a finding (D121) and priorityVsPlan's
    // findings (SAMPLE_EXPECT.s01, s02), one each of
    // servicesDelivery and partnerLoad, and Manufacturing's consensus; and takes away its split and the three findings of
    // the two retired rules. Latin America's year-2 growth outlier takes the place of Southern Europe's year-3 one.
    T.test('X-insights4-existing', 'The earlier sample insights keep their wording and order among themselves', function (a) {
      sample();
      function said(x) { return x.id + ' | ' + x.sentence; }
      var S = window.SAMPLE_EXPECT, n = 47 + S.s01.fired.map(function (f) { return f.region; }).filter(function (r, i, all) { return all.indexOf(r) === i; }).length + S.s02.fired.length + 2 + 1 - 1 - 3;
      var before = withoutOutlook(function () { return all().map(said); }), after = all().filter(function (x) { return x.family !== 'outlook'; }).map(said);
      a.equal(before.length, n, n + ' insights without the outlook rules');
      a.deepEqual(after, before, 'the same insights, in the same order');
    });

    T.test('TPV-TC-751', 'Each outlook insight names the report that shows its figure and the measure it quotes', function (a) {
      sample();
      IDS.forEach(function (id) {
        var r = cfg(id), report = RULES[id][0], measure = RULES[id][1];
        a.deepEqual(r.attach, [report], id + ' attaches to ' + report);
        ofRule(id).forEach(function (x) {
          a.equal(x.highlight.measureId, measure, x.id + ': Show me opens ' + measure);
          a.ok(fig(x, measure), x.id + ': the quoted figure is among its figures');
          var def = TAP.reports.get(report);
          if (!def) { a.ok(x.reportId === null && x.fallback === 'details', x.id + ': ' + report + ' not built yet, details meanwhile'); return; }
          a.equal(x.reportId, report, x.id + ': on ' + report);
          a.equal(x.highlight.mark, r.highlight, x.id + ': marks its ' + r.highlight);
          // A report that switches between measures must offer the quoted one; one showing them all together has no switch
          var listed = (def.measures || []).map(function (m) { return m.id; });
          if (listed.length > 1 && (def.options || {}).measuresAs !== 'categories') a.ok(listed.indexOf(measure) >= 0, x.id + ': ' + report + ' can show ' + measure);
        });
      });
    });

    T.test('TPV-TC-752', 'Every outlook sentence on the sample data keeps to the neutral wording', function (a) {
      sample();
      var out = outlook();
      a.ok(out.length > 0, 'there are outlook insights');
      out.forEach(function (x) {
        window.T_INSIGHT_SHAPE(a, x);
        a.deepEqual(banned(x.sentence), [], x.id + ': no banned word');
        a.ok(x.sentence.indexOf('?') < 0, x.id + ': a statement, not a question (D51)');
        a.ok(/\.$/.test(x.sentence), x.id + ': a full sentence');
      });
      a.deepEqual(TAP.insights.failures().filter(function (f) { return f.family === 'outlook'; }), [], 'no outlook rule failed');
    });

    /* ---------- TPV-TC-753: each rule on its planted case only ---------- */

    T.test('TPV-TC-753', 'R01 and R02: the plan well below and well above its strategic plan, no other region', function (a) {
      sample();
      a.deepEqual(ids(ofRule('spGap')).sort(), ['spGap:apac', 'spGap:latam'], 'Asia Pacific and Latin America only');
      var g = get('spGap:apac'), b = get('spGap:latam');
      a.equal(g.sentence, 'Asia Pacific’s three-year plan is ' + F.pct(-X.r01.variancePct3) + ' below its strategic plan (' +
        F.money(X.r01.plan3) + ' against ' + F.money(X.r01.strategicPlan3) + ').');
      a.near(fig(g, 'sp.variancePct').cell.v, X.r01.variancePct3, 1e-6, 'R01 variance share');
      a.near(fig(g, 'sp.plan').cell.v, X.r01.plan3, 1e-6, 'R01 plan');
      a.near(fig(g, 'sp.oi').cell.v, X.r01.strategicPlan3, 1e-6, 'R01 strategic plan');
      a.near(fig(g, 'sp.variance').cell.v, X.r01.variance3, 1e-6, 'R01 variance');
      a.equal(b.sentence, 'Latin America’s three-year plan is ' + F.pct(X.r02.variancePct3) + ' above its strategic plan (' +
        F.money(X.r02.plan3) + ' against ' + F.money(X.r02.strategicPlan3) + ').');
      a.near(fig(b, 'sp.variancePct').cell.v, X.r02.variancePct3, 1e-6, 'R02 variance share');
      a.near(fig(b, 'sp.variance').cell.v, X.r02.variance3, 1e-6, 'R02 variance');
    });

    T.test('TPV-TC-753', 'R03: one insight for the plans together, naming the region without a strategic plan', function (a) {
      sample();
      var x = ofRule('spTotal')[0];
      a.deepEqual(ids(ofRule('spTotal')), ['spTotal:org'], 'one finding for the organization');
      a.deepEqual(x.regionIds, X.r03.regions, 'the six regions with a strategic plan');
      a.equal(x.sentence, 'Together, the three-year plans of the 6 regions with a strategic plan are ' + F.pct(-X.r03.variancePct3) +
        ' below their strategic plans (' + F.money(X.r03.plans3) + ' against ' + F.money(X.r03.strategicPlans3) +
        '). Not included, with no strategic plan: Northern Europe.');
      a.near(fig(x, 'sp.variancePct').cell.v, X.r03.variancePct3, 1e-6, 'share of the summed parts');
      a.near(fig(x, 'sp.plan').cell.v, X.r03.plans3, 1e-6, 'plans');
      a.near(fig(x, 'sp.oi').cell.v, X.r03.strategicPlans3, 1e-6, 'strategic plans');
      a.near(fig(x, 'sp.variance').cell.v, X.r03.variance3, 1e-6, 'variance');
    });

    T.test('TPV-TC-753', 'R04: year 1 far above the base-year forecast in one region only', function (a) {
      sample();
      a.deepEqual(ids(ofRule('y1Jump')), ['y1Jump:mea'], 'Middle East & Africa only');
      var x = get('y1Jump:mea');
      a.equal(x.sentence, 'Middle East & Africa’s plan for year 1 is ' + F.pct(X.r04.growth) + ' above its base-year forecast (' +
        F.money(X.r04.year1) + ' against ' + F.money(X.r04.forecast) + '); together, the other regions with a base year plan ' +
        F.pct(X.r04.others) + ' above theirs. Worth discussing.');
      var g = x.figures.filter(function (f) { return f.measureId === 'by.growth'; });
      a.near(g[0].cell.v, X.r04.growth, 1e-6, 'growth');
      a.near(g[1].cell.v, X.r04.others, 1e-6, 'the others together');
      a.near(fig(x, 'by.forecast').cell.v, X.r04.forecast, 1e-6, 'forecast');
    });

    T.test('TPV-TC-753', 'R05: low pipeline coverage in one region only', function (a) {
      sample();
      a.deepEqual(ids(ofRule('lowCoverage')), ['lowCoverage:na'], 'North America only');
      var x = get('lowCoverage:na'), c = x.figures.filter(function (f) { return f.measureId === 'by.coverage'; });
      a.equal(x.sentence, 'North America’s base-year pipeline (' + F.money(X.r05.pipeline) + ') covers ' + times(X.r05.coverage) +
        ' the order intake still to win (' + F.money(X.r05.stillToWin) + '); together, the other regions with a base year cover ' +
        times(X.r05.others) + '. Worth discussing.');
      a.near(c[0].cell.v, X.r05.coverage, 1e-5, 'coverage as the app reads it');
      // The workbooks' rounded ratios and plain pipeline over forecast minus actuals agree to two decimals (PLANTED-CASES)
      a.near(c[1].cell.v, X.r05.others, 0.0005, 'the others together');
      a.near(fig(x, 'by.pipeline').cell.v, X.r05.pipeline, 1e-6, 'pipeline');
    });

    T.test('TPV-TC-753', 'R06: a large share of customer value outside the books in one region only', function (a) {
      sample();
      a.deepEqual(ids(ofRule('booksGap')), ['booksGap:seu'], 'Southern Europe only');
      var x = get('booksGap:seu'), s = x.figures.filter(function (f) { return f.measureId === 'bk.gapShare'; });
      // PLANTED-CASES R06: 39.5% for its Partner channel alone
      a.equal(x.sentence, F.pct(X.r06.gapShare) + ' of Southern Europe’s customer value (' + F.money(X.r06.gap3) + ' of ' +
        F.money(X.r06.cv3) + ') does not run through the organization’s books, against ' + F.pct(X.r06.others) +
        ' for the other regions together. Through partners alone it is ' + F.pct(0.395) + '.');
      a.near(s[0].cell.v, X.r06.gapShare, 1e-6, 'share of customer value');
      a.near(s[1].cell.v, X.r06.others, 1e-6, 'the others together');
      a.near(s[2].cell.v, 0.395, 0.0005, 'the Partner channel');
      a.near(fig(x, 'bk.gap').cell.v, X.r06.gap3, 1e-6, 'difference');
      a.near(fig(x, 'cv.oi').cell.v, X.r06.cv3, 1e-6, 'customer value');
    });

    T.test('TPV-TC-753', 'R07: one solution carrying most of one region’s new business, no other region', function (a) {
      sample();
      a.deepEqual(ids(ofRule('solutionReliance')), ['solutionReliance:neu:sol2'], 'Northern Europe and Solution 2 only');
      var x = get('solutionReliance:neu:sol2'), t = X.totals.neu, total = t['nb.arr'] + t['nb.services'];
      a.equal(x.sentence, 'Solution 2 carries ' + F.pct(X.r07.share) + ' of Northern Europe’s three-year new business order intake (' +
        F.money(X.r07.oi) + ' of ' + F.money(total) + ').');
      var o = x.figures.filter(function (f) { return f.measureId === 'nb.oi.sol'; });
      a.near(o[0].cell.v, X.r07.oi, 1e-6, 'Solution 2');
      a.near(o[1].cell.v, total, 1e-6, 'all new business');
      a.ok(x.figures.some(function (f) { return f.unit === 'pct' && Math.abs(f.cell.v - X.r07.share) < 1e-6; }), 'the share');
    });

    /* ---------- the rules on the mini fixture, worked by hand ---------- */

    T.test('X-insights4-mini-strategic', 'miniP4: the plan against the strategic plan, alone and together', function (a) {
      mini();
      // A -125 / 2700 = -4.6% and B +110 / 3200 = +3.4% stay under 15%; D -515 / 3100 = -16.6%
      a.deepEqual(ids(ofRule('spGap')), ['spGap:delta'], 'Region D only');
      a.equal(get('spGap:delta').sentence, 'Region D’s three-year plan is 17% below its strategic plan (€2.6M against €3.1M).');
      // Together -530 / 9000 = -5.9%: plans 8470, strategic plans 9000; Region C has none
      var x = get('spTotal:org');
      a.deepEqual(x.regionIds, ['alpha', 'bravo', 'delta']);
      a.equal(x.sentence, 'Together, the three-year plans of the 3 regions with a strategic plan are 6% below their strategic plans ' +
        '(€8.5M against €9M). Not included, with no strategic plan: Region C.');
      a.near(fig(x, 'sp.variancePct').cell.v, -0.0588889, 1e-6, 'a ratio of sums');
    });

    T.test('X-insights4-mini-baseyear', 'miniP4: year 1 against the base-year forecast, and pipeline coverage', function (a) {
      mini();
      // A 8.1%, B 2.7%, D 11.0% above their forecasts: under 30%
      a.equal(ofRule('y1Jump').length, 0, 'no year 1 far above its forecast');
      // B 530 / 460 = 1.15, D 130 / 220 = 0.59 are under 1.5; A 540 / 280 = 1.93 is not
      a.deepEqual(ids(ofRule('lowCoverage')).sort(), ['lowCoverage:bravo', 'lowCoverage:delta']);
      // Others for B: (540 + 130) / (280 + 220) = 1.34; for D: (540 + 530) / (280 + 460) = 1.45
      a.equal(get('lowCoverage:bravo').sentence, 'Region B’s base-year pipeline (€530k) covers 1.15× the order intake still to win ' +
        '(€460k); together, the other regions with a base year cover 1.34×. Worth discussing.');
      a.equal(get('lowCoverage:delta').sentence, 'Region D’s base-year pipeline (€130k) covers 0.59× the order intake still to win ' +
        '(€220k); together, the other regions with a base year cover 1.45×. Worth discussing.');
      // D's recurring forecast 550 -> 425: forecast 425 + 150 + 25 = 600, year 1 580 + 195 + 30 = 805, growth 205 / 600 = 34.2%
      // Others A and B: (865 + 1130 - 800 - 1100) / 1900 = 5%
      mini(function (p) { rg(p, 'delta').baseYear.items[0].forecast = 425; });
      a.deepEqual(ids(ofRule('y1Jump')), ['y1Jump:delta']);
      a.equal(get('y1Jump:delta').sentence, 'Region D’s plan for year 1 is 34% above its base-year forecast (€805k against €600k); ' +
        'together, the other regions with a base year plan 5% above theirs. Worth discussing.');
      a.near(fig(get('y1Jump:delta'), 'by.growth').cell.v, 0.3416667, 1e-6, 'growth');
    });

    T.test('X-insights4-mini-books', 'miniP4: customer value outside the books', function (a) {
      mini();
      // A 295 / 2820 = 10.5%, B 370 / 3680 = 10.1%, D 1000 / 3735 = 26.8%: all at 10% or more
      a.deepEqual(ids(ofRule('booksGap')).sort(), ['booksGap:alpha', 'booksGap:bravo', 'booksGap:delta']);
      // Others for D: (295 + 370) / (2820 + 3680) = 10.2%; D's partner channel (1125 - 575) / 1125 = 48.9%
      a.equal(get('booksGap:delta').sentence, '27% of Region D’s customer value (€1M of €3.7M) does not run through the organization’s ' +
        'books, against 10% for the other regions together. Through partners alone it is 49%.');
      // Others for B: (295 + 1000) / (2820 + 3735) = 19.8%; B's Alliance A (1370 - 1000) / 1370 = 27.0%
      a.equal(get('booksGap:bravo').sentence, '10% of Region B’s customer value (€370k of €3.7M) does not run through the organization’s ' +
        'books, against 20% for the other regions together. Through Alliance A alone it is 27%.');
    });

    T.test('X-insights4-mini-solutions', 'miniP4: one solution carrying most of a region’s new business', function (a) {
      mini();
      // A sol1 1986 / 2706 = 73.4%; B sol1 3740 / 4400 = 85% (row 21 names none); D sol3 3562.5, all of it; C names none
      a.deepEqual(ids(ofRule('solutionReliance')).sort(), ['solutionReliance:alpha:sol1', 'solutionReliance:bravo:sol1',
        'solutionReliance:delta:sol3']);
      a.equal(get('solutionReliance:alpha:sol1').sentence, 'Solution 1 carries 73% of Region A’s three-year new business order intake (€2M of €2.7M).');
      a.equal(get('solutionReliance:bravo:sol1').sentence, 'Solution 1 carries 85% of Region B’s three-year new business order intake (€3.7M of €4.4M).');
      a.equal(get('solutionReliance:delta:sol3').sentence, 'Solution 3 carries all of Region D’s three-year new business order intake (€3.6M).');
    });

    T.test('X-insights4-mini-blank', 'miniP4: Region C, with no Phase 4 part, is never read as zero', function (a) {
      mini();
      a.ok(outlook().length > 0, 'the rules run');
      a.ok(outlook().every(function (x) { return x.regionIds.indexOf('charlie') < 0; }), 'no outlook insight names Region C');
      outlook().forEach(function (x) { x.figures.forEach(function (f) { a.ok(f.cell.state === 'value', x.id + ': ' + f.label + ' is provided'); }); });
    });

    T.test('X-insights4-guard', 'Comparison rules stay quiet with fewer than 3 regions providing the value', function (a) {
      // Only A and D keep a base year and a strategic plan; D's forecast as in the base-year case
      mini(function (p) {
        delete rg(p, 'bravo').baseYear;
        delete rg(p, 'bravo').strategicPlan;
        rg(p, 'delta').baseYear.items[0].forecast = 425;
      });
      ['y1Jump', 'lowCoverage', 'spTotal'].forEach(function (id) {
        a.equal(cfg(id).compare, true, id + ' compares regions');
        a.equal(ofRule(id).length, 0, id + ' is quiet with 2 regions');
      });
      a.deepEqual(ids(ofRule('spGap')), ['spGap:delta'], 'a region against its own strategic plan still shows');
      a.deepEqual(TAP.insights.failures(), [], 'quiet, not failed');
    });

    T.test('X-insights4-old-file', 'A file without the Phase 4 parts shows no outlook insight and no outlook failure', function (a) {
      TAP.data.load(T_FIXTURE('mini'));
      TAP.insights.reset();
      a.equal(outlook().length, 0, 'no outlook insight');
      a.deepEqual(TAP.insights.failures(), [], 'nothing listed in the data sources panel (D57)');
      // A rule without the optional flag whose inputs are missing is still logged
      window.T_INSIGHTS.withRule({ id: 'x-insights4-missing', reads: ['strategicPlan.value'] }, window.T_INSIGHTS.perRegion('nb.arr'), function () {
        a.ok(TAP.insights.failures().some(function (f) { return f.ruleId === 'x-insights4-missing'; }), 'a non-optional rule is logged');
      });
      window.T_INSIGHTS.withRule({ id: 'x-insights4-optional', reads: ['strategicPlan.value'], optional: true },
        window.T_INSIGHTS.perRegion('nb.arr'), function () {
          a.equal(TAP.insights.failures().length, 0, 'an optional rule is skipped quietly');
          a.equal(ofRule('x-insights4-optional').length, 0, 'and finds nothing');
        });
    });
  });
})(window.TAP);
