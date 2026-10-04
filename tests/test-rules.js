/*
 * File: tests/test-rules.js
 * Purpose: Tests for each insight rule against the planted cases in docs/PLANTED-CASES.md.
 *          Expected figures come from window.SAMPLE_EXPECT, never from the rules' own output.
 * Provides: test cases for INSIGHTS stories (#47 to #53): TPV-TC-144 to 147, 149 to 151, 153 to 165 X-rules-*
 *           (TPV-TC-198 is in tests/test-guardrails.js)
 * Depends on: tests/harness.js, tests/test-setup.js, tests/test-insights.js (T_INSIGHT_SHAPE), the app scripts,
 *             data/sample-plan-data.js, tests/fixtures/sample-expected.js
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var X = window.SAMPLE_EXPECT, F = TAP.format;

  function sample(change) {
    var p = JSON.parse(JSON.stringify(window.PLAN_DATA));
    if (change) change(p);
    TAP.data.load(p);
    TAP.insights.reset();
  }
  function get(id) { return TAP.insights.all().filter(function (x) { return x.id === id; })[0]; }
  function ofRule(id) { return TAP.insights.all().filter(function (x) { return x.ruleId === id; }); }
  function figure(x, measureId, nth) { return x.figures.filter(function (f) { return f.measureId === measureId; })[nth || 0]; }
  function region(id) { return TAP.data.region(id); }
  function mc(r, ind) { return region(r).marketCoverage.filter(function (row) { return row.industryId === ind; })[0]; }
  function others(map, skip) {
    return Object.keys(map).filter(function (k) { return k !== skip && map[k] != null; }).map(function (k) { return map[k]; });
  }

  var share15 = others(X.p15.strategicShare, 'apac');

  // The insight each planted case must produce: exact sentence where the wording is fixed, else the parts and figures.
  var PLANTED = [
    { p: 'P01', id: 'consensus:education', sentence: 'Education is Tier 1 or 2 in 6 of 7 regions.', regions: X.p01.tier12 },
    { p: 'P02', id: 'split:retail', sentence: 'Regions are split on Retail: 3 place it in Tier 2 and 4 in Tier 3.', regions: X.regions },
    { p: 'P03', id: 'groupPriority:datacenters:ability', regions: X.p03.lowAbility,
      sentence: 'Data Centers is a group priority, but 4 regions rate their ability to win there as low.' },
    { p: 'P04', id: 'strongRating:neu:pharma', regions: ['neu'],
      sentence: 'Northern Europe rates its references in Pharma and Biotech as strong, with no current ARR or pipeline there. Worth discussing what the rating draws on.' },
    { p: 'P05', id: 'weakRating:ceu:manufacturing', regions: ['ceu'],
      has: ['Central Europe rates its', 'expertise', 'Manufacturing holds its largest current ARR (' + F.money(X.p05.currentArr) + ')'] },
    { p: 'P06', id: 'tierVsPipeline:seu:retail', regions: ['seu'],
      has: ['Southern Europe placed Retail in Tier 3', F.pct(X.p06.share) + ' of the region', F.money(X.p06.pipelineTotal)] },
    { p: 'P07', id: 'priorityNoPipeline:mea:hospitality', regions: ['mea'],
      sentence: 'Middle East & Africa placed Hospitality in Tier 2, with no pipeline there yet. Worth discussing how that pipeline will be built.' },
    { p: 'P08', id: 'outlier:nb.hitRate:ceu', regions: ['ceu'],
      sentence: 'Central Europe plans a 35% hit rate, more than twice the average of the other regions (15%).' },
    { p: 'P09', id: 'outlier:nb.avgDealSize:latam', regions: ['latam'],
      has: ['Latin America plans an average deal size of ' + F.money(X.p09.value), 'higher than any other region', F.money(X.p09.othersAvg)] },
    { p: 'P10', id: 'pipelineCover:latam', regions: ['latam'],
      has: ['Latin America', F.money(X.p10.nbY1) + ') is ' + X.p10.ratio + '× the pipeline', F.money(X.p10.pipeline12m)] },
    { p: 'P11', id: 'noPipeline:apac:transport', regions: ['apac'], has: ['Asia Pacific plans new business in Transportation', 'no pipeline yet'] },
    { p: 'P12', id: 'winsVsPeers:na', regions: ['na'],
      has: ['North America', 'about 3×', '(' + F.num(X.p12.value, { decimals: 0 }) + ' against ' + F.num(X.p12.othersAvg, { decimals: 0 }) + ')'] },
    { p: 'P13', id: 'concentration:na', regions: ['na'], has: [F.pct(X.p13.share) + ' of North America', 'in 3 accounts', 'one of them flagged high risk'] },
    { p: 'P14', id: 'atRisk:mea', regions: ['mea'], has: [F.pct(X.p14.share) + ' of Middle East & Africa', 'flagged at risk'] },
    { p: 'P15', id: 'segmentMix:apac:strategic', regions: ['apac'],
      has: ['Asia Pacific', 'Strategic accounts (' + F.pct(X.p15.strategicShare.apac),
        F.pct(Math.min.apply(null, share15)) + ' to ' + F.pct(Math.max.apply(null, share15))] },
    { p: 'P16', id: 'notYetWinnable:fsm', regions: X.p16.regions,
      sentence: '4 regions see Field Service Management as attractive but rate their ability to win as low.' }
  ];
  function planted(p) { return PLANTED.filter(function (c) { return c.p === p; })[0]; }

  // Shared with tests/test-guardrails.js and tests/test-ranking.js.
  window.T_RULES = { sample: sample, get: get, ofRule: ofRule, mc: mc, check: check, planted: planted, PLANTED: PLANTED };

  function check(a, c) {
    var x = get(c.id);
    a.ok(x, c.p + ' produces ' + c.id);
    if (!x) return;
    if (c.sentence) a.equal(x.sentence, c.sentence, c.p + ' sentence');
    (c.has || []).forEach(function (s) { a.ok(x.sentence.indexOf(s) >= 0, c.p + ' says "' + s + '": ' + x.sentence); });
    a.deepEqual(x.regionIds, c.regions, c.p + ' regions');
    window.T_INSIGHT_SHAPE(a, x);
  }

  /* ---------- priorities (US-1.7.4) ---------- */
  T.suite('rules-priorities', function () {
    T.test('TPV-TC-144', 'The planted consensus industry gives the expected sentence', function (a) {
      sample();
      check(a, planted('P01'));
      a.equal(get('consensus:education').reportId, 'ind-tiers');
      a.equal(get('consensus:education').highlight.mark, 'industryRow');
      ['healthcare', 'ifm', 'datacenters'].forEach(function (g) { a.ok(!get('consensus:' + g), g + ': group priorities are left out'); });
    });

    T.test('TPV-TC-145', 'The planted split industry gives a split insight', function (a) {
      sample(); check(a, planted('P02'));
    });

    T.test('TPV-TC-146', 'The planted group priority rated low by 4 regions gives a group-priority insight', function (a) {
      sample();
      var x = get('groupPriority:datacenters:ability');
      check(a, planted('P03'));
      X.p03.lowAbility.forEach(function (r, i) { a.near(figure(x, 'ind.ability', i).cell.v, X.p03.scores[r].b, 1e-5, r + ' ability'); });
      a.ok(!get('notYetWinnable:datacenters'), 'the capability rule does not repeat it');
    });

    T.test('TPV-TC-147', 'With 5 regions the consensus threshold scales to ceil(5/7 x 5) = 4', function (a) {
      sample(function (p) { p.regions = p.regions.slice(0, 5); });
      var tiers = function (list) {
        list.forEach(function (t, i) { mc(X.regions[i], 'retail').tier = t; });
        TAP.insights.reset();
      };
      tiers([2, 2, 2, 2, 3]);
      a.equal((get('consensus:retail') || {}).sentence, 'Retail is Tier 1 or 2 in 4 of 5 regions.', '4 of 5 is enough');
      tiers([2, 2, 2, 3, 3]);
      a.ok(!get('consensus:retail'), '3 of 5 is not');
    });
  });

  /* ---------- judgement (US-1.7.5) ---------- */
  T.suite('rules-judgement', function () {
    T.test('TPV-TC-149', 'A planted favourable rating with no ARR or pipeline gives a strong-rating insight', function (a) {
      sample();
      var x = get('strongRating:neu:pharma');
      check(a, planted('P04'));
      a.equal(figure(x, 'ind.references').cell.v, X.p04.references);
      a.equal(figure(x, 'ind.references').field, 'references', 'the rating names its field');
      a.equal(figure(x, 'ind.currentArr').cell.v, X.p04.currentArr);
      a.equal(figure(x, 'ind.pipeline').cell.v, X.p04.pipelineTotal);
    });

    T.test('TPV-TC-150', 'A planted unfavourable ability rating with large ARR gives a weak-rating insight', function (a) {
      sample();
      var x = get('weakRating:ceu:manufacturing');
      check(a, planted('P05'));
      a.equal(figure(x, 'ind.expertise').cell.v, X.p05.expertise);
      a.equal(figure(x, 'ind.currentArr').cell.v, X.p05.currentArr);
    });

    T.test('TPV-TC-151', 'Tier 3 with a large pipeline share and Tier 2 with no pipeline both appear, with correct figures', function (a) {
      sample();
      var x = get('tierVsPipeline:seu:retail');
      check(a, planted('P06'));
      a.equal(figure(x, 'ind.pipeline').cell.v, X.p06.pipelineTotal);
      a.equal(figure(x, 'base.pipeline').cell.v, X.p06.regionPipeline, 'the region pipeline counts every row');
      check(a, planted('P07'));
      a.equal(figure(get('priorityNoPipeline:mea:hospitality'), 'ind.pipeline').cell.v, X.p07.pipelineTotal);
      a.ok(get('priorityNoPipeline:apac:transport'), 'P11 overlaps: Asia Pacific Transportation is Tier 2 with no pipeline');
    });

    T.test('X-rules-judgement-questions', 'Judgement insights end as an open point worth discussing (D51) and point at the region and industry', function (a) {
      sample();
      var list = TAP.insights.all().filter(function (x) { return x.family === 'judgement'; });
      a.ok(list.length >= 4);
      list.forEach(function (x) {
        a.match(x.sentence, /Worth discussing [^.?]+\.$/, x.id + ' ends with a point worth discussing, not a direct question');
        a.equal(x.regionIds.length, 1, x.id + ' names one region');
        a.equal(x.industryIds.length, 1, x.id + ' names one industry');
        a.ok(['ind-quad', 'ind-tiers'].indexOf(x.reportId) >= 0, x.id + ' attaches to the quadrant or tier grid');
      });
    });
  });

  /* ---------- capability (US-1.7.9) ---------- */
  T.suite('rules-capability', function () {
    T.test('TPV-TC-164', 'The industry planted as attractive but not yet winnable in 4 regions gives an insight with the count', function (a) {
      sample();
      var x = get('notYetWinnable:fsm');
      check(a, planted('P16'));
      a.equal(x.reportId, 'ind-quad');
      a.equal(x.highlight.quadrant, 'attractiveNotYet', 'highlights the quadrant');
      X.p16.regions.forEach(function (r) {
        var f = x.figures.filter(function (g) { return g.measureId === 'ind.ability' && g.cell.src.regionId === r; })[0];
        a.near(f.cell.v, X.p16.scores[r].b, 1e-5, r + ' ability');
      });
      var said = x.figures.filter(function (g) { return g.cell.src.field === 'successFactors'; });
      X.p16.regions.forEach(function (r) {
        (X.p16.successFactors[r] || []).filter(Boolean).forEach(function (sf) {
          a.ok(said.some(function (g) { return g.cell.v === sf && g.cell.src.regionId === r && g.unit === 'text'; }),
            r + ' shows its success factor "' + sf + '"');
        });
      });
      a.equal(said.length, 3, 'each success factor once: two regions repeat theirs, one row is blank');
    });

    T.test('TPV-TC-165', 'Each region’s list of attractive-but-not-yet-winnable industries is correct', function (a) {
      sample();
      X.regions.forEach(function (r) {
        var x = get('notYetList:' + r), want = X.attractiveNotYet[r];
        if (!want.length) { a.ok(!x, r + ' has no list'); return; }
        a.ok(x, r + ' has a list');
        a.deepEqual(x.industryIds, want, r + ' list');
        a.ok(x.sentence.indexOf(want.length === 1 ? '' : want.length + ' industries') >= 0, r + ' counts its industries');
      });
    });
  });

  /* ---------- assumptions (US-1.7.6) ---------- */
  T.suite('rules-assumptions', function () {
    T.test('TPV-TC-153', 'A planted hit rate at least twice the others’ weighted average gives an outlier insight with both figures', function (a) {
      sample();
      var x = get('outlier:nb.hitRate:ceu');
      check(a, planted('P08'));
      a.near(x.figures[0].cell.v, X.p08.value, 1e-9, 'Central Europe’s hit rate');
      a.near(x.figures[1].cell.v, X.p08.othersAvg, 1e-6, 'the others’ weighted average');
      a.equal(x.fallback, 'details', 'no Phase 1 report: Show me opens the region’s details');
    });

    T.test('TPV-TC-154', 'A planted value outside every other region’s range but under 2x is flagged', function (a) {
      sample();
      a.ok(X.p09.ratio < 2, 'the planted deal size is under twice the average');
      check(a, planted('P09'));
      a.near(get('outlier:nb.avgDealSize:latam').figures[1].cell.v, X.p09.othersAvg, 1e-6);
    });

    T.test('TPV-TC-155', 'A value provided by fewer than 3 regions gives no outlier insight', function (a) {
      sample(function (p) {
        p.regions.slice(2).forEach(function (r) { r.newBusiness.forEach(function (row) { row.hitRate = null; }); });
      });
      a.equal(TAP.insights.all().filter(function (x) { return x.id.indexOf('outlier:nb.hitRate:') === 0; }).length, 0,
        'two regions with a hit rate: nothing to compare');
      sample(function (p) {
        p.regions.slice(3).forEach(function (r) { r.newBusiness.forEach(function (row) { row.hitRate = null; }); });
        p.regions[2].newBusiness.forEach(function (row) { row.hitRate = 0.5; });
      });
      a.ok(get('outlier:nb.hitRate:neu'), 'with three regions providing it, the comparison runs');
    });

    T.test('TPV-TC-156', 'Outlier averages use the same weights as the combining rules (US-1.2.5)', function (a) {
      sample();
      var hit = get('outlier:nb.hitRate:ceu').figures[1].cell, deal = get('outlier:nb.avgDealSize:latam').figures[1].cell;
      var w = window.TAP_SETTINGS.combine.weights;
      a.equal(hit.src.weightBy, w['nb.hitRate'], 'hit rate weighted by target accounts with a hit rate');
      a.equal(deal.src.weightBy, w['nb.avgDealSize'], 'deal size weighted by implied wins');
      var plain = others(X.p09.dealSizes, 'latam').reduce(function (s, v) { return s + v; }, 0) / 6;
      a.ok(Math.abs(deal.v - plain) > 1, 'the weighted average differs from a plain mean');
      var ent = { kind: 'combined', regionIds: X.regions.filter(function (r) { return r !== 'latam'; }), how: 'average' };
      a.near(deal.v, TAP.measures.combined('nb.avgDealSize', ent, { year: null }).v, 1e-9, 'equals the chart’s combined figure');
    });
  });

  /* ---------- realism (US-1.7.7) ---------- */
  T.suite('rules-realism', function () {
    T.test('TPV-TC-157', 'A planted year-1 ambition 4x recent pipeline gives a realism insight with the ratio', function (a) {
      sample();
      var x = get('pipelineCover:latam');
      check(a, planted('P10'));
      a.near(figure(x, 'nb.arr').cell.v, X.p10.nbY1, 1e-6, 'year-1 new business ARR potential');
      a.equal(figure(x, 'nb.arr').cell.src.year, 1, 'traced to plan year 1');
      a.near(figure(x, 'base.pipeline12m').cell.v, X.p10.pipeline12m, 1e-6, 'pipeline created in the last 12 months');
      a.equal(x.reportId, 'ov-ambition', 'Show me opens the ambition chart');
    });

    T.test('TPV-TC-158', 'Planted ambition in an industry with no pipeline gives an insight', function (a) {
      sample();
      var x = get('noPipeline:apac:transport');
      check(a, planted('P11'));
      a.equal(figure(x, 'ind.pipeline').cell.v, X.p11.pipelineTotal);
      a.ok(figure(x, 'ind.nb.arr').cell.v > 0, 'new business is planned there');
      a.ok(!get('noPipeline:mea:hospitality'), 'P07 has no new business rows, so this rule stays quiet');
    });

    T.test('TPV-TC-159', 'A planted region needing far more implied wins than peers gives a pool-coverage insight', function (a) {
      sample();
      var x = get('winsVsPeers:na');
      check(a, planted('P12'));
      a.near(x.figures[0].cell.v, X.p12.value, 1e-6, 'North America’s implied wins');
      a.near(x.figures[1].cell.v, X.p12.othersAvg, 1e-6, 'the simple average of the other regions');
      a.equal(ofRule('winsVsPeers').length, 1, 'no other region needs twice its peers’ wins');
    });
  });

  /* ---------- exposure (US-1.7.8) ---------- */
  T.suite('rules-exposure', function () {
    T.test('TPV-TC-160', 'A planted region with over 50% of planned growth in 3 accounts gives an insight naming them and the share', function (a) {
      sample();
      var x = get('concentration:na');
      check(a, planted('P13'));
      a.deepEqual(x.accountIds, X.p13.top3, 'the three accounts, largest first');
      region('na').customerGrowth.accounts.filter(function (c) { return x.accountIds.indexOf(c.id) >= 0; })
        .forEach(function (c) { a.ok(x.sentence.indexOf(c.name) >= 0, 'names ' + c.name); });
      a.ok(x.figures.some(function (f) { return f.label.indexOf('(high risk)') > 0; }), 'the high-risk account is marked in the figures');
      a.near(figure(x, 'cg.arr').cell.v, X.totals.na['cg.arr'], 1e-6, 'the total is the chart’s customer growth figure');
    });

    T.test('TPV-TC-161', 'A planted region with over 25% of planned growth in at-risk accounts gives an at-risk insight', function (a) {
      sample(); check(a, planted('P14'));
    });

    T.test('TPV-TC-162', 'A planted region relying mostly on one segment gives a segment insight', function (a) {
      sample();
      check(a, planted('P15'));
      a.near(get('segmentMix:apac:strategic').figures[0].cell.v, X.p15.strategicShare.apac, 1e-5, 'Strategic share');
      a.ok(!TAP.insights.all().some(function (x) { return x.family === 'exposure' && x.regionIds[0] === 'ceu'; }),
        'Central Europe’s empty customer growth gives no exposure insight');
    });

    T.test('TPV-TC-163', 'With account names replaced by anonymous labels, insights use the labels', function (a) {
      sample(function (p) {
        p.regions.forEach(function (r) { r.customerGrowth.accounts.forEach(function (c, i) { c.name = 'Account ' + (i + 1); }); });
      });
      var x = get('concentration:na'), ids = region('na').customerGrowth.accounts.map(function (c) { return c.id; });
      a.ok(x, 'still found');
      x.accountIds.forEach(function (id) { a.ok(x.sentence.indexOf('Account ' + (ids.indexOf(id) + 1)) >= 0, 'uses the label for ' + id); });
    });
  });
})(window.TAP);
