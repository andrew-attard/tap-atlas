/*
 * File: tests/test-rules.js
 * Purpose: Tests for each insight rule against the planted cases in docs/PLANTED-CASES.md (TPV-TC-144 to 165, 198).
 *          Expected figures come from window.SAMPLE_EXPECT, never from the rules' own output.
 * Provides: test cases for INSIGHTS stories (#47 to #53)
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
  function rerun() { TAP.insights.reset(); }
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
      sentence: 'Northern Europe rates its references in Pharma and Biotech as strong, with no current ARR or pipeline there. What does the rating draw on?' },
    { p: 'P05', id: 'weakRating:ceu:manufacturing', regions: ['ceu'],
      has: ['Central Europe rates its', 'expertise', 'Manufacturing holds its largest current ARR (' + F.money(X.p05.currentArr) + ')'] },
    { p: 'P06', id: 'tierVsPipeline:seu:retail', regions: ['seu'],
      has: ['Southern Europe placed Retail in Tier 3', F.pct(X.p06.share) + ' of the region', F.money(X.p06.pipelineTotal)] },
    { p: 'P07', id: 'priorityNoPipeline:mea:hospitality', regions: ['mea'],
      sentence: 'Middle East & Africa placed Hospitality in Tier 2, with no pipeline there yet. How will that pipeline be built?' },
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
      sample();
      check(a, planted('P02'));
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
        rerun();
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

    T.test('X-rules-judgement-questions', 'Judgement insights are framed as questions and point at the region and industry', function (a) {
      sample();
      var list = TAP.insights.all().filter(function (x) { return x.family === 'judgement'; });
      a.ok(list.length >= 4);
      list.forEach(function (x) {
        a.match(x.sentence, /\?$/, x.id + ' ends with a question');
        a.equal(x.regionIds.length, 1, x.id + ' names one region');
        a.equal(x.industryIds.length, 1, x.id + ' names one industry');
        a.ok(['ind-quad', 'ind-tiers'].indexOf(x.reportId) >= 0, x.id + ' attaches to the quadrant or tier grid');
      });
    });
  });
})(window.TAP);
