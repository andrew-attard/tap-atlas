/*
 * File: tests/test-rules.js
 * Purpose: Tests for each insight rule against the planted cases in docs/PLANTED-CASES.md.
 *          Expected figures come from window.SAMPLE_EXPECT, never from the rules' own output.
 * Provides: test cases for INSIGHTS stories (#47 to #53): TPV-TC-144 to 147, 149 to 151, 153 to 165 X-rules-*
 *           (TPV-TC-198 is in tests/test-guardrails.js); the D112 rules (#521): X-d112-industryCover,
 *           X-d112-priorityVsPlan, X-d112-servicesDelivery, X-d112-partnerLoad
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

  // Shares of three-year order intake, the figure the segments chart shows (D79)
  var share15 = others(X.p15.strategicOiShare, 'apac');

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
    // D112: a Tier 2 industry with no pipeline and no goal there has nothing to cover, so P07 now gives no insight
    // (Middle East & Africa's one industryCover insight, D121, is about another industry)
    { p: 'P07', id: 'industryCover:mea', without: 'hospitality' },
    { p: 'P08', id: 'outlier:nb.hitRate:ceu', regions: ['ceu'],
      sentence: 'Central Europe plans a 35% hit rate, more than twice the average of the other regions (15%).' },
    { p: 'P09', id: 'outlier:nb.avgDealSize:latam', regions: ['latam'],
      has: ['Latin America plans an average deal size of ' + F.money(X.p09.value), 'higher than any other region', F.money(X.p09.othersAvg)] },
    { p: 'P10', id: 'pipelineCover:latam', regions: ['latam'],
      has: ['Latin America', F.money(X.p10.nbY1) + ') is ' + X.p10.ratio + '× the pipeline', F.money(X.p10.pipeline12m)] },
    { p: 'P11', id: 'industryCover:apac', regions: ['apac'],
      sentence: 'Asia Pacific’s year-1 goal in Transportation (' + F.money(X.s01.none.goal) + ') has no pipeline behind it yet.' },
    { p: 'P12', id: 'winsVsPeers:na', regions: ['na'],
      has: ['North America', 'about 3×', '(' + F.num(X.p12.value, { decimals: 0 }) + ' against ' + F.num(X.p12.othersAvg, { decimals: 0 }) + ')'] },
    { p: 'P13', id: 'concentration:na', regions: ['na'], has: [F.pct(X.p13.share) + ' of North America', 'in 3 accounts', 'one of them flagged high risk'] },
    { p: 'P14', id: 'atRisk:mea', regions: ['mea'], has: [F.pct(X.p14.share) + ' of Middle East & Africa', 'flagged at risk'] },
    { p: 'P15', id: 'segmentMix:apac:strategic', regions: ['apac'],
      has: ['Asia Pacific’s planned three-year order intake from existing customers', 'Strategic accounts (' + F.pct(X.p15.strategicOiShare.apac),
        F.pct(Math.min.apply(null, share15)) + ' to ' + F.pct(Math.max.apply(null, share15))] },
    { p: 'P16', id: 'notYetWinnable:fsm', regions: X.p16.regions,
      sentence: '4 regions see Field Service Management as attractive but rate their ability to win as low.' }
  ];
  function planted(p) { return PLANTED.filter(function (c) { return c.p === p; })[0]; }

  // Shared with tests/test-guardrails.js and tests/test-ranking.js.
  window.T_RULES = { sample: sample, get: get, ofRule: ofRule, mc: mc, check: check, planted: planted, PLANTED: PLANTED };

  function check(a, c) {
    var x = get(c.id);
    if (c.without) { a.ok(!x || x.industryIds.indexOf(c.without) < 0, c.p + ': ' + c.id + ' leaves out ' + c.without); return; }
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

    T.test('X-review-RI-7', 'The weak-rating description and scoring describe the rule as configured (the largest figure only)', function (a) {
      var rule = window.TAP_RULES.rules.filter(function (r) { return r.id === 'weakRating'; })[0];
      a.equal(rule.params.rank, 1, 'the rule looks at the largest figure only');
      a.ok(/the region’s largest current ARR or pipeline figure/.test(rule.description), 'the description says the largest: ' + rule.description);
      a.ok(!/three|second|third/.test(rule.description + ' ' + rule.scoring), 'neither text mentions the second or third largest');
    });

    T.test('TPV-TC-150', 'A planted unfavourable ability rating with large ARR gives a weak-rating insight', function (a) {
      sample();
      var x = get('weakRating:ceu:manufacturing');
      check(a, planted('P05'));
      a.equal(figure(x, 'ind.expertise').cell.v, X.p05.expertise);
      a.equal(figure(x, 'ind.currentArr').cell.v, X.p05.currentArr);
    });

    // D112: a Tier 1 or 2 industry with no pipeline is industryCover's 'no pipeline yet' variant, when a goal sits there
    T.test('TPV-TC-151', 'Tier 3 with a large pipeline share and Tier 2 with no pipeline both appear, with correct figures', function (a) {
      sample();
      var x = get('tierVsPipeline:seu:retail');
      check(a, planted('P06'));
      a.equal(figure(x, 'ind.pipeline').cell.v, X.p06.pipelineTotal);
      a.equal(figure(x, 'base.pipeline').cell.v, X.p06.regionPipeline, 'the region pipeline counts every row');
      check(a, planted('P11'));
      a.equal(figure(get('industryCover:apac'), 'ind.pipeline').cell.v, X.p11.pipelineTotal, 'Tier 2 with no pipeline');
      a.equal(X.p11.tier, 2, 'Asia Pacific placed Transportation in Tier 2');
      check(a, planted('P07'));
      a.ok(!window.TAP_RULES.rules.some(function (r) { return r.id === 'priorityNoPipeline'; }), 'the retired rule is gone');
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
      a.equal(x.reportId, TAP.reports.get('nb-levers') ? 'nb-levers' : null, 'Show me goes to the levers report (US-2.5.6)');
      a.equal(x.highlight.measureId, 'nb.hitRate', 'on Hit rate');
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

    // D112: industryCover replaces noPipeline; the planted case is its 'no pipeline yet' variant
    T.test('TPV-TC-158', 'Planted ambition in an industry with no pipeline gives an insight', function (a) {
      sample();
      var x = get('industryCover:apac');
      check(a, planted('P11'));
      a.equal(figure(x, 'ind.pipeline').cell.v, X.p11.pipelineTotal);
      a.near(figure(x, 'ind.nb.arr').cell.v, X.s01.none.goal, 1e-6, 'the year-1 goal planned there');
      a.equal(figure(x, 'ind.nb.arr').cell.src.year, 1, 'traced to plan year 1');
      a.ok(get('industryCover:mea').industryIds.indexOf('hospitality') < 0, 'P07 has no new business rows, so this rule leaves it out');
      a.ok(!window.TAP_RULES.rules.some(function (r) { return r.id === 'noPipeline'; }), 'the retired rule is gone');
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
      a.near(get('segmentMix:apac:strategic').figures[0].cell.v, X.p15.strategicOiShare.apac, 1e-5, 'Strategic share of order intake');
      a.ok(!TAP.insights.all().some(function (x) { return x.family === 'exposure' && x.regionIds[0] === 'ceu'; }),
        'Central Europe’s empty customer growth gives no exposure insight');
    });

    T.test('X-review-RI-8', 'A region whose accounts carry no segment is left out of the segment comparison, not counted at 0%', function (a) {
      sample(function (p) {
        p.regions.filter(function (r) { return r.id === 'neu'; })[0].customerGrowth.accounts.forEach(function (c) { c.segment = null; });
      });
      var x = get('segmentMix:apac:strategic');
      a.ok(x, 'Asia Pacific’s segment insight is still found');
      if (!x) return;
      // Hand-worked shares of the regions that still give segments (Central Europe has no accounts, G2)
      var rest = ['na', 'latam', 'seu', 'mea'].map(function (k) { return X.p15.strategicOiShare[k]; });
      var range = F.pct(Math.min.apply(null, rest)) + ' to ' + F.pct(Math.max.apply(null, rest));
      a.ok(x.sentence.indexOf('against ' + range) >= 0, 'the range is ' + range + ': ' + x.sentence);
      a.ok(!x.figures.some(function (f) { return f.label.indexOf(region('neu').name) >= 0; }), 'Northern Europe is not among the figures');
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

  /* ---------- D112: goals against pipeline, priorities against plan, sales against delivery (#521) ---------- */
  // Figures are the generator's own (SAMPLE_EXPECT.s01 to s04, worked out from the raw rows), or hand-worked below.
  T.suite('rules-d112', function () {
    function cfg(id) { return window.TAP_RULES.rules.filter(function (r) { return r.id === id; })[0]; }
    // Runs fn with one rule's params changed, then puts them back
    function withParams(id, change, fn) {
      var r = cfg(id), keep = JSON.parse(JSON.stringify(r.params));
      Object.assign(r.params, change);
      TAP.insights.reset();
      try { fn(); } finally { r.params = keep; TAP.insights.reset(); }
    }
    function nbRows(p, r, ind) { return p.regions.filter(function (x) { return x.id === r; })[0].newBusiness.filter(function (x) { return x.industryId === ind; }); }
    function mcOf(p, r, ind) { return p.regions.filter(function (x) { return x.id === r; })[0].marketCoverage.filter(function (x) { return x.industryId === ind; })[0]; }
    var BANNED = window.TAP_RULES.wording.banned;
    function neutral(a, text, what) {
      BANNED.forEach(function (w) { a.ok(!new RegExp('(^|[^A-Za-z])' + w + '([^A-Za-z]|$)', 'i').test(text), what + ' avoids "' + w + '"'); });
    }
    function common(a, id, family, attach) {
      var r = cfg(id);
      a.ok(r, id + ' is configured');
      a.equal(r.family, family, id + ': family');
      a.deepEqual(r.attach, attach, id + ': attaches to ' + attach.join(', '));
      a.ok(typeof r.why === 'string' && r.why.length > 20, id + ' says why it matters');
      neutral(a, r.why + ' ' + r.template + ' ' + JSON.stringify(r.templates || {}), id + '’s wording');
      ofRule(id).forEach(function (x) { neutral(a, x.sentence, x.id); window.T_INSIGHT_SHAPE(a, x); });
    }

    // One insight per region (D121): the industries a region's insight covers, or [] with none
    function covered(r) { var x = get('industryCover:' + r); return x ? x.industryIds : []; }

    T.test('X-d112-industryCover', 'A priority industry’s year-1 goal well above its pipeline gives one insight per region', function (a) {
      sample();
      var S = X.s01, x = get('industryCover:latam');
      common(a, 'industryCover', 'realism', ['ind-tiers', 'ind-quad', 'nb-industries']);
      a.ok(x, 'Latin America is flagged');
      if (!x) return;
      var mine = S.fired.filter(function (f) { return f.region === 'latam'; });
      // Hand-worked: 8 industries at 5x or more; the two largest goals are Retail (259.6, 22 created) and Education (225.4, 18)
      a.equal(mine.length, 8);
      a.equal(x.sentence, 'Latin America’s year-1 goals in 8 priority industries are 5× or more the pipeline it created there in the last 12 months, ' +
        'led by Retail (€259.6k against €22k) and Education (€225.4k against €18k).');
      a.deepEqual(x.industryIds.slice().sort(), mine.map(function (f) { return f.industry; }).sort(), 'every industry that fired, for Show me');
      a.deepEqual(x.highlight.industryIds.slice().sort(), x.industryIds.slice().sort(), 'Show me marks them all');
      a.deepEqual(x.figures.map(function (f) { return f.measureId + ' ' + f.cell.v; }),
        ['ind.nb.arr 259.6', 'ind.pipeline12m 22', 'ind.nb.arr 225.4', 'ind.pipeline12m 18'],
        'a goal and a pipeline for each named industry');
      a.equal(x.figures[0].cell.src.year, 1, 'goals traced to plan year 1');
      // Strength from the largest ratio (Education 225.4 / 18 = 12.5, past twice the threshold's distance: 1); money the
      // goals together, 189.2 + 83.5 + 96.4 + 113.5 + 259.6 + 218.9 + 225.4 + 94.4 = 1,280.9 of the organization's ARR
      a.equal(x.strength, 1);
      a.near(x.money, 1280.9 / X.org['base.arr'], 1e-6);
      a.equal(x.reportId, 'ind-tiers', 'Show me opens the tier grid');
      a.equal(x.highlight.mark, 'cell', 'on the region’s cells');
      // One insight per region with a finding, each covering exactly the industries the generator finds from the rows
      var regs = S.fired.map(function (f) { return f.region; }).filter(function (r, i, all) { return all.indexOf(r) === i; });
      a.deepEqual(ofRule('industryCover').map(function (i) { return i.regionIds[0]; }).sort(), regs.slice().sort(), 'one per region');
      regs.forEach(function (r) {
        a.deepEqual(covered(r).slice().sort(), S.fired.filter(function (f) { return f.region === r; }).map(function (f) { return f.industry; }).sort(), r + ': its industries');
      });
      // One industry reads as before: above the whole pipeline, hand-worked 251.6 > 138
      a.equal(get('industryCover:mea').sentence, 'Middle East & Africa’s year-1 goal in Facility Services (€251.6k) is above its whole pipeline there (€138k).');
      a.equal(S.byVariant.none + S.byVariant.above + S.byVariant.created, S.fired.length);
    });

    T.test('X-d112-industryCover', 'Two or more industries take the strongest variant’s wording and count them all; one reads as before', function (a) {
      // Only Retail left in Latin America: the other seven get pipeline created equal to their goal
      sample(function (p) {
        X.s01.fired.filter(function (f) { return f.region === 'latam' && f.industry !== 'retail'; }).forEach(function (f) {
          mcOf(p, 'latam', f.industry).pipelineCreated12m = f.goal;
        });
      });
      // Hand-worked: 259.6 / 22 = 11.8
      a.equal(get('industryCover:latam').sentence, 'Latin America’s year-1 goal in Retail (€259.6k) is 11.8× the pipeline it created there in the last 12 months (€22k).');
      a.deepEqual(get('industryCover:latam').figures.map(function (f) { return f.measureId; }), ['ind.nb.arr', 'ind.pipeline', 'ind.pipeline12m']);
      // Middle East & Africa: Facility Services above its whole pipeline, and Healthcare 38.8 / 5 = 7.8x created: the
      // stronger variant words it, both count, the larger goal first
      sample(function (p) { mcOf(p, 'mea', 'healthcare').pipelineCreated12m = 5; });
      a.equal(get('industryCover:mea').sentence, 'Middle East & Africa’s year-1 goals in 2 priority industries run ahead of their pipeline (1 above the whole pipeline there), ' +
        'led by Facility Services (€251.6k against €138k) and Healthcare (€38.8k against €5k).');
      a.deepEqual(get('industryCover:mea').figures.map(function (f) { return f.measureId; }), ['ind.nb.arr', 'ind.pipeline', 'ind.nb.arr', 'ind.pipeline12m']);
      // Asia Pacific: Culture and Tourism (175.4) with no pipeline either; a name holding "and" makes the list use semicolons
      sample(function (p) { var m = mcOf(p, 'apac', 'culture'); m.pipelineTotal = 0; m.pipelineCreated12m = 0; });
      a.equal(get('industryCover:apac').sentence, 'Asia Pacific’s year-1 goals in 2 priority industries run ahead of their pipeline (2 with no pipeline yet), ' +
        'led by Culture and Tourism (€175.4k with no pipeline yet); and Transportation (€27k with no pipeline yet).');
      a.equal(get('industryCover:apac').strength, 1, 'no pipeline: the strongest');
      a.deepEqual(TAP.insights.failures(), [], 'no rule failed');
    });

    T.test('X-d112-industryCover', 'Just under each threshold, industryCover stays quiet; a blank pipeline is not zero', function (a) {
      var c = X.s01.case;
      // 5x the pipeline created in 12 months: just above 1/5 of the goal is under 5x; exactly 1/5 is 5x
      sample(function (p) { mcOf(p, c.region, c.industry).pipelineCreated12m = c.goal / 5 + 0.1; });
      a.ok(covered('latam').indexOf('retail') < 0, 'just under 5x: Retail is left out');
      a.equal(covered('latam').length, 7, 'the other seven still count');
      sample(function (p) { mcOf(p, c.region, c.industry).pipelineCreated12m = c.goal / 5; });
      a.ok(covered('latam').indexOf('retail') >= 0, 'at 5x: counted');
      // Above the whole pipeline (Northern Europe's Financial Services, 2.6x in 12 months): a pipeline just over the goal is quiet
      var nf = X.s01.fired.filter(function (f) { return f.key === 'neu:finance'; })[0];
      a.equal(nf.variant, 'above', 'Northern Europe’s Financial Services goal is above its whole pipeline');
      sample(function (p) { mcOf(p, 'neu', 'finance').pipelineTotal = nf.goal + 0.1; });
      a.ok(!get('industryCover:neu'), 'a pipeline just over the goal: quiet');
      sample(function (p) { mcOf(p, 'neu', 'finance').pipelineTotal = nf.goal - 0.1; });
      a.ok(get('industryCover:neu'), 'a goal just above the pipeline: flagged');
      // The goal floor (25k): Asia Pacific's Transportation goal is one row
      sample(function (p) { var r = nbRows(p, 'apac', 'transport')[0]; r.arrPotential = [24.9].concat(r.arrPotential.slice(1)); });
      a.ok(!get('industryCover:apac'), 'a goal of €24.9k: under the floor');
      sample(function (p) { var r = nbRows(p, 'apac', 'transport')[0]; r.arrPotential = [25].concat(r.arrPotential.slice(1)); });
      a.ok(get('industryCover:apac'), 'a goal of €25k: flagged');
      sample(function (p) { mcOf(p, 'apac', 'transport').pipelineTotal = null; });
      a.ok(!get('industryCover:apac'), 'a blank pipeline is not zero');
      a.deepEqual(TAP.insights.failures(), [], 'no rule failed');
    });

    T.test('X-d112-priorityVsPlan', 'A priority with little of its regions’ new business plan behind it gives an insight', function (a) {
      sample();
      var S = X.s02.fired[0], x = get('priorityVsPlan:' + S.industry);
      common(a, 'priorityVsPlan', 'priorities', ['ind-tiers', 'nb-industries']);
      a.ok(x, 'Manufacturing is flagged');
      if (!x) return;
      // Hand-worked: 1,035.8 of 34,553.5 is 3.0%
      a.equal(x.sentence, 'Manufacturing is Tier 1 or 2 in 5 of 7 regions but holds 3% of their new business plan (' + F.money(S.amount) + ' of ' +
        F.money(S.plan) + ').');
      a.deepEqual(x.regionIds, S.regions, 'the regions placing it in Tier 1 or 2');
      a.near(figure(x, 'ind.nb.arr').cell.v, S.amount, 0.05, 'its new business ARR in those regions');
      a.near(figure(x, 'nb.arr').cell.v, S.plan, 0.05, 'their whole new business ARR');
      a.equal(x.reportId, 'ind-tiers');
      a.equal(x.highlight.mark, 'industryRow');
      a.deepEqual(ofRule('priorityVsPlan').map(function (i) { return i.id; }), ['priorityVsPlan:manufacturing'], 'the only one on the sample');
      a.equal(get('consensus:education').sentence, 'Education is Tier 1 or 2 in 6 of 7 regions.', 'consensus is unchanged');
      a.equal(get('consensus:manufacturing').sentence, 'Manufacturing is Tier 1 or 2 in 5 of 7 regions.', 'and reads Manufacturing too');
    });

    T.test('X-d112-priorityVsPlan', 'Just under each threshold, priorityVsPlan stays quiet; a group priority has its own wording', function (a) {
      var S = X.s02.fired[0];
      sample();
      withParams('priorityVsPlan', { maxShare: S.share - 0.0001 }, function () { a.ok(!get('priorityVsPlan:manufacturing'), 'a threshold just under its share: quiet'); });
      withParams('priorityVsPlan', { maxShare: S.share + 0.0001 }, function () { a.ok(get('priorityVsPlan:manufacturing'), 'just above: flagged'); });
      // 4 of 7 is under the consensus share (5 of 7)
      sample(function (p) { mcOf(p, 'apac', 'manufacturing').tier = 3; });
      a.ok(!get('priorityVsPlan:manufacturing'), '4 of 7 regions: not a priority by consensus');
      // Healthcare, a group priority, holds 10.5% of the plan (4,922.4 of 47,083.3): under an 11% threshold
      sample();
      var hc = X.s02.candidates.filter(function (c) { return c.industry === 'healthcare'; })[0];
      withParams('priorityVsPlan', { maxShare: 0.11 }, function () {
        a.equal((get('priorityVsPlan:healthcare') || {}).sentence, 'Healthcare is a group priority but holds 10% of the regions’ new business plan (' +
          F.money(hc.amount) + ' of ' + F.money(hc.plan) + ').', 'the group priority variant');
      });
    });

    T.test('X-d112-servicesDelivery', 'Services growing well beyond what partners deliver gives an insight', function (a) {
      sample();
      var S = X.s03.regions.latam, x = get('servicesDelivery:latam');
      common(a, 'servicesDelivery', 'plan', ['pt-reliance', 'pt-books']);
      a.ok(x, 'Latin America is flagged');
      if (!x) return;
      // Hand-worked: 782.4 / 489.5 = 1.598, so 60% more; 52.6 / 782.4 = 6.7%
      a.equal(x.sentence, 'Latin America plans ' + F.money(S.y3) + ' of services in year 3, 60% more than in year 1 (' + F.money(S.y1) +
        '); its partners deliver ' + F.money(S.delivered) + ' of it (7%), so the rest relies on the region’s own consultants.');
      a.near(x.figures[0].cell.v, S.y1, 0.05, 'year 1');
      a.near(x.figures[1].cell.v, S.y3, 0.05, 'year 3');
      a.near(x.figures[2].cell.v, S.delivered, 0.05, 'what partners deliver in year 3');
      a.equal(x.figures[2].cell.src.field, 'servicesFromPartners', 'traced to the partners’ own figures');
      a.equal(x.reportId, 'pt-reliance');
      a.equal(x.highlight.measureId, 'rc.all.services', 'Show me opens the services split');
      a.deepEqual(ofRule('servicesDelivery').map(function (i) { return i.id; }), X.s03.fired.map(function (r) { return 'servicesDelivery:' + r; }));
    });

    T.test('X-d112-servicesDelivery', 'Just under each threshold, servicesDelivery stays quiet; no partner delivery figures, no insight', function (a) {
      var S = X.s03.regions.latam;
      sample();
      withParams('servicesDelivery', { growth: S.growth + 0.001 }, function () { a.ok(!get('servicesDelivery:latam'), 'growth just under the threshold: quiet'); });
      withParams('servicesDelivery', { growth: S.growth - 0.001 }, function () { a.ok(get('servicesDelivery:latam'), 'just over: flagged'); });
      withParams('servicesDelivery', { partnerShare: S.share }, function () { a.ok(!get('servicesDelivery:latam'), 'a partner share at the threshold: quiet'); });
      // With no thresholds at all, every region with partner delivery figures is flagged, and Central Europe (none, R10) never is
      withParams('servicesDelivery', { growth: -1, partnerShare: 1.01 }, function () {
        var ids = ofRule('servicesDelivery').map(function (i) { return i.regionIds[0]; }).sort();
        a.deepEqual(ids, Object.keys(X.s03.regions).filter(function (r) { return X.s03.regions[r].delivered !== null; }).sort(), 'regions with partner delivery figures');
        a.ok(ids.indexOf('ceu') < 0, 'Central Europe gives none');
      });
      sample(function (p) { p.regions.forEach(function (r) { r.partners.forEach(function (x) { delete x.servicesFromPartners; }); }); });
      a.equal(ofRule('servicesDelivery').length, 0, 'a file without partner delivery: no insight');
      a.deepEqual(TAP.insights.failures(), [], 'skipped quietly');
    });

    T.test('X-d112-partnerLoad', 'Partner order intake per partner salesperson far above the other regions gives an insight', function (a) {
      sample();
      var S = X.s04.regions.seu, x = get('partnerLoad:seu');
      common(a, 'partnerLoad', 'shared', ['pt-capacity', 'pt-reliance']);
      a.ok(x, 'Southern Europe is flagged');
      if (!x) return;
      // Hand-worked: 1,774.7 / 11 = 161.3 per person; 161.3 / 59.0 = 2.7
      a.equal(x.sentence, 'Southern Europe plans ' + F.money(S.oi) + ' of year-1 order intake through partners with 11 partner sales staff, ' +
        F.money(S.perPerson) + ' per person, 2.7× the other regions together (' + F.money(S.others) + ').');
      a.near(x.figures[0].cell.v, S.oi, 0.05, 'year-1 order intake through partners and alliances');
      a.equal(x.figures[1].cell.v, S.fteSales, 'partner sales staff');
      a.equal(x.reportId, 'pt-capacity');
      a.deepEqual(ofRule('partnerLoad').map(function (i) { return i.id; }), ['partnerLoad:seu'], 'the only one on the sample');
      a.equal(ofRule('partnerCapacity').length, 1, 'partner capacity (Q05) still flags one partner: each partner’s total staff is unchanged');
    });

    T.test('X-d112-partnerLoad', 'Just under the threshold, partnerLoad stays quiet; it needs 3 regions', function (a) {
      var S = X.s04.regions.seu;
      sample();
      withParams('partnerLoad', { ratio: S.ratio + 0.01 }, function () { a.ok(!get('partnerLoad:seu'), 'a threshold just over its ratio: quiet'); });
      withParams('partnerLoad', { ratio: S.ratio - 0.01 }, function () { a.ok(get('partnerLoad:seu'), 'just under: flagged'); });
      sample(function (p) { p.regions = p.regions.filter(function (r) { return r.id === 'seu' || r.id === 'na'; }); });
      a.equal(ofRule('partnerLoad').length, 0, 'two regions: no comparison');
    });
  });
})(window.TAP);
