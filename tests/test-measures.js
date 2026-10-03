/*
 * File: tests/test-measures.js
 * Purpose: Tests for the measure catalogue, combined figures through the measures, scores and the three missing
 *          states, all checked against the hand calculations in tests/fixtures/mini-expected.js.
 * Provides: test cases TPV-TC-068 to 074 (through the measures), TPV-TC-096, TPV-TC-114, X-measures-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var X = window.TEST_EXPECT.mini;
  var ALL = ['alpha', 'bravo', 'charlie', 'delta'];
  var TOL = 1e-6;
  var STATES = ['value', 'notProvided', 'notApplicable'];

  // The catalogue other streams may rely on (ARCHITECTURE section 9)
  var CATALOGUE = ['nb.arr', 'nb.services', 'cg.arr', 'cg.services', 'amb.arr', 'amb.services', 'amb.oi',
    'base.arr', 'base.pipeline', 'base.pipeline12m', 'focus.tier1', 'focus.tier2', 'focus.tier3',
    'nb.targetAccounts', 'nb.targetAccountsRated', 'nb.wins', 'nb.hitRate', 'nb.avgDealSize', 'nb.growthY2', 'nb.growthY3',
    'nb.servicesRatio', 'cg.growthY1', 'cg.growthY2', 'cg.growthY3', 'cg.baseArr',
    'cg.segment.strategic', 'cg.segment.growth', 'cg.segment.core', 'cg.segment.scaled',
    'ind.tier', 'ind.growthPotential', 'ind.criticality', 'ind.competitiveIntensity', 'ind.references', 'ind.expertise',
    'ind.productFit', 'ind.attractiveness', 'ind.ability', 'ind.currentArr', 'ind.pipeline', 'ind.pipeline12m',
    'ind.nb.arr', 'ind.commentary'];

  function m(id, regionId, ctx) { return TAP.measures.get(id)(regionId, ctx || { year: null }); }
  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c); }
  function org() { return TAP.scope.entities(cmp({ mode: 'org' }))[0]; }
  function rest(focus, how) { return TAP.scope.entities(cmp({ mode: 'one', focus: focus, restAgg: how }))[1]; }

  T.suite('measures', function () {
    T.test('X-measures-catalogue', 'Every catalogue measure exists with its description', function (a) {
      CATALOGUE.forEach(function (id) {
        var meta = TAP.measures.meta(id);
        a.ok(meta, id + ' is defined');
        a.equal(meta.id, id);
        a.ok(meta.label && meta.label.charAt(0) !== '[', id + ' has a label');
        a.ok(meta.short && meta.short.charAt(0) !== '[', id + ' has a short label');
        a.ok(['money', 'pct', 'rating', 'score', 'count', 'tier', 'segment', 'text'].indexOf(meta.unit) >= 0, id + ' unit');
        a.ok(['amount', 'rate', 'rating', 'category', 'count', 'text'].indexOf(meta.valueKind) >= 0, id + ' valueKind');
        a.ok(['IN', 'PRE', 'DER', 'APP'].indexOf(meta.kind) >= 0, id + ' kind');
        a.ok(Array.isArray(meta.dims), id + ' dims');
        if (meta.valueKind === 'rate') a.ok(TAP.measures.meta(meta.weightBy), id + ' names a weight measure');
        a.ok(TAP.measures.list().indexOf(id) >= 0);
      });
      a.equal(TAP.measures.get('no.such'), null);
      a.equal(TAP.measures.meta('no.such'), null);
    });

    T.test('X-measures-region', 'Every planted region figure equals the hand calculation', function (a) {
      ALL.forEach(function (r) {
        Object.keys(X.region[r]).forEach(function (key) {
          var y = /^(.*)\.y(\d)$/.exec(key), id = y ? y[1] : key, exp = X.region[r][key];
          var c = m(id, r, { year: y ? +y[2] : null });
          if (exp === null) {
            a.equal(c.state, 'notProvided', r + ' ' + key + ' is not provided');
            a.equal(c.v, null);
          } else {
            a.equal(c.state, 'value', r + ' ' + key);
            a.near(c.v, exp, TOL, r + ' ' + key);
          }
        });
      });
    });

    T.test('X-measures-cells', 'Every measure returns a full cell with its source for every region', function (a) {
      ALL.forEach(function (r) {
        CATALOGUE.forEach(function (id) {
          var c = m(id, r, { year: null, industryId: 'ind1' });
          a.ok(STATES.indexOf(c.state) >= 0, r + ' ' + id + ' state');
          a.equal(c.kind, TAP.measures.meta(id).kind, r + ' ' + id + ' kind');
          a.ok(c.src && c.src.regionId === r && c.src.kind === c.kind, r + ' ' + id + ' source');
          if (c.state !== 'value') a.equal(c.v, null, r + ' ' + id + ' blank has no value');
        });
      });
    });

    T.test('X-measures-src', 'Sources name the section, field, row, plan year and kind', function (a) {
      var one = m('nb.arr', 'bravo', { year: 2, industryId: 'ind2' });
      a.equal(one.v, 200);
      a.deepEqual([one.src.section, one.src.field, one.src.row, one.src.year, one.src.kind], ['newBusiness', 'arrPotential', 21, 2, 'DER']);
      var sum = m('nb.arr', 'alpha', { year: 1 });
      a.deepEqual(sum.src.rows, [20, 21]);
      a.equal(sum.src.row, null, 'a sum over several rows names them all');
      a.equal(sum.src.year, 1);
      var r = m('ind.growthPotential', 'alpha', { industryId: 'ind1' });
      a.deepEqual([r.v, r.src.section, r.src.field, r.src.row, r.src.kind], [3, 'marketCoverage', 'growthPotential', 10, 'IN']);
      a.deepEqual(m('base.arr', 'alpha').src.rows, [10, 11, 12, 13, 14]);
      a.equal(m('cg.arr', 'delta', { year: 2 }).v, 88, 'customer growth by plan year');
    });

    T.test('X-measures-states', 'Zero, blank and not applicable come back as three different states', function (a) {
      a.deepEqual([m('ind.currentArr', 'alpha', { industryId: 'ind3' }).state, m('ind.currentArr', 'alpha', { industryId: 'ind3' }).v],
        ['value', 0], 'zero is a value');
      a.equal(m('ind.references', 'charlie', { industryId: 'ind1' }).state, 'notProvided', 'blank rating');
      a.equal(m('ind.tier', 'charlie', { industryId: 'ind2' }).state, 'notProvided', 'blank tier');
      ['ind.growthPotential', 'ind.tier', 'ind.attractiveness', 'ind.ability', 'ind.commentary'].forEach(function (id) {
        a.equal(m(id, 'alpha', { industryId: 'other' }).state, 'notApplicable', id + ' on an unrated industry');
      });
      a.equal(m('ind.currentArr', 'alpha', { industryId: 'other' }).v, 100, 'system figures still exist on the Other row');
      a.equal(m('ind.nb.arr', 'alpha', { industryId: 'ind3' }).state, 'notApplicable', 'Tier 3: no new business by design');
      a.equal(m('ind.nb.arr', 'alpha', { industryId: 'ind2' }).state, 'notProvided', 'Tier 2 with no new business rows');
      a.equal(m('ind.nb.arr', 'alpha', { industryId: 'ind1' }).v, 1655, '500 + 550 + 605');
      a.equal(m('ind.nb.arr', 'charlie', { industryId: 'ind1' }).state, 'notProvided', 'row entered but blank');
    });

    T.test('X-measures-partial', 'An ambition with a part missing is marked partial with a note', function (a) {
      var c = m('amb.arr', 'charlie');
      a.equal(c.v, 300);
      a.equal(c.partial, true);
      a.match(c.note, /customer growth/i);
      a.equal(m('amb.arr', 'alpha').partial, undefined, 'complete ambition is not partial');
    });

    T.test('TPV-TC-096', 'Total order intake equals ARR plus services for each region', function (a) {
      // Hand calculation: services = new business services + customer growth services
      //   A 451 + 50 = 501;  B (100+120+120) + (20 x 3) = 400, + 12 = 412;  C 60 (customer growth not provided);  D 712.5 + 92 = 804.5
      var exp = { alpha: [501, 3056], bravo: [412, 4562], charlie: [60, 360], delta: [804.5, 3922.5] };
      ALL.forEach(function (r) {
        a.near(m('amb.services', r).v, exp[r][0], TOL, r + ' services');
        a.near(m('amb.oi', r).v, exp[r][1], TOL, r + ' total order intake');
        a.near(m('amb.oi', r).v, m('amb.arr', r).v + m('amb.services', r).v, TOL, r + ' = ARR + services');
      });
      a.equal(m('amb.oi', 'charlie').partial, true);
    });

    T.test('TPV-TC-068', 'Through the measures: totals sum, the rest averages, derived sums add their combined parts', function (a) {
      ['base.arr', 'nb.arr', 'amb.arr'].forEach(function (id) {
        a.near(TAP.measures.combined(id, org(), {}).v, X.combined.orgTotal[id], TOL, 'organization ' + id);
      });
      ['nb.arr', 'amb.arr'].forEach(function (id) {
        a.near(TAP.measures.combined(id, rest('alpha', 'average'), {}).v, X.combined.restOfAlphaAverage[id], TOL, 'rest of A ' + id);
      });
      a.near(TAP.measures.combined('nb.arr', rest('alpha', 'total'), {}).v, X.combined.restOfAlphaTotal['nb.arr'], TOL);
      a.equal(TAP.measures.combined('nb.arr', TAP.scope.entities(cmp({ mode: 'all' }))[1], {}).v, X.region.bravo['nb.arr'],
        'a region entity gives the region’s own figure');
    });

    T.test('TPV-TC-068', 'A combined ambition names the region missing a part', function (a) {
      var c = TAP.measures.combined('amb.arr', rest('alpha', 'average'), {});
      a.deepEqual(c.src.excluded, ['charlie']);
      a.equal(c.kind, 'APP');
      var d = TAP.agg.describe(c);
      a.match(d, /Average of 3 regions/, d);
      a.match(d, /customer growth ARR from 2 regions/i, d);
      a.match(d, /Region C/, d);
      // The stacked parts add up to the total
      var nb = TAP.measures.combined('nb.arr', rest('alpha', 'average'), {}).v;
      var cg = TAP.measures.combined('cg.arr', rest('alpha', 'average'), {}).v;
      a.near(nb + cg, c.v, TOL);
    });

    T.test('TPV-TC-069', 'Through the measures: hit rate is weighted by target accounts with a hit rate (settings)', function (a) {
      var o = TAP.measures.combined('nb.hitRate', org(), {});
      a.near(o.v, X.combined.orgTotal['nb.hitRate'], TOL);
      a.equal(o.src.weightBy, 'nb.targetAccountsRated');
      a.near(TAP.measures.combined('nb.hitRate', rest('alpha', 'average'), {}).v, X.combined.restOfAlphaAverage['nb.hitRate'], TOL);
      a.match(TAP.agg.describe(o), /^Weighted average of 4 regions, by /);
    });

    T.test('TPV-TC-070', 'Through the measures: ratings give the mean and range', function (a) {
      var gp = TAP.measures.combined('ind.growthPotential', org(), { industryId: 'ind1' });
      a.near(gp.v, X.ratings['ind.growthPotential@ind1'].v, TOL);
      a.deepEqual(gp.range, { min: 2, max: 3 });
      var ref = TAP.measures.combined('ind.references', org(), { industryId: 'ind1' });
      a.near(ref.v, X.ratings['ind.references@ind1'].v, TOL);
      a.deepEqual(ref.src.excluded, ['charlie']);
    });

    T.test('TPV-TC-071', 'Through the measures: tiers are counted', function (a) {
      var t = TAP.measures.combined('ind.tier', org(), { industryId: 'ind2' });
      a.deepEqual(t.counts, X.tierCounts.ind2.counts);
      a.deepEqual(t.src.excluded, X.tierCounts.ind2.excluded);
    });

    T.test('TPV-TC-073', 'Through the measures: a blank region is excluded and named', function (a) {
      var o = TAP.measures.combined('cg.arr', org(), {});
      a.equal(o.v, X.combined.orgTotal['cg.arr'].v);
      a.deepEqual(o.src.excluded, ['charlie']);
      var r = TAP.measures.combined('cg.arr', rest('delta', 'average'), {});
      a.equal(r.v, X.combined.restOfDeltaAverage['cg.arr'].v);
    });

    T.test('TPV-TC-074', 'A report’s own weight replaces the settings: hit rate by ARR potential', function (a) {
      // 3981 / 9405 = 0.4232855 (hand calculation in test-combine.js)
      var o = TAP.measures.combined('nb.hitRate', org(), { weights: { 'nb.hitRate': 'nb.arr' } });
      a.near(o.v, 0.4232855, TOL);
      a.equal(o.src.weightBy, 'nb.arr');
    });
  });

  // D48: a figure for one industry when the region has no row for it.
  T.suite('industry', function () {
    var NB_IDS = ['nb.arr', 'nb.services', 'nb.targetAccounts', 'nb.targetAccountsRated', 'nb.wins', 'nb.hitRate',
      'nb.avgDealSize', 'nb.growthY2', 'nb.growthY3', 'nb.servicesRatio'];
    function state(id, r, ind, year) { return m(id, r, { industryId: ind, year: year || null }).state; }

    T.test('X-measures-d48-nb', 'New business: Tier 3 or unrated is not applicable; Tier 1 or 2 with no rows is not provided', function (a) {
      NB_IDS.forEach(function (id) {
        a.equal(state(id, 'alpha', 'ind3'), 'notApplicable', id + ': A Retail is Tier 3');
        a.equal(state(id, 'alpha', 'other'), 'notApplicable', id + ': A Other is unrated');
        a.equal(state(id, 'alpha', 'ind2'), 'notProvided', id + ': A Education is Tier 2 with no rows');
        a.equal(state(id, 'bravo', 'ind4'), 'notProvided', id + ': B Utilities is Tier 2 with no rows');
        a.equal(state(id, 'charlie', 'ind2'), 'notProvided', id + ': C Education has a blank tier and no rows');
      });
      ['ind3', 'other', 'ind2'].forEach(function (ind) {
        a.equal(state('ind.nb.arr', 'alpha', ind), state('nb.arr', 'alpha', ind), 'ind.nb.arr agrees for A ' + ind);
      });
    });

    T.test('X-measures-d48-same', 'nb.arr and ind.nb.arr give the same answer for every region, industry and year', function (a) {
      var inds = TAP.data.industries().map(function (d) { return d.id; });
      ALL.forEach(function (r) {
        inds.forEach(function (ind) {
          [null, 1, 2, 3].forEach(function (y) {
            var x = m('nb.arr', r, { industryId: ind, year: y }), z = m('ind.nb.arr', r, { industryId: ind, year: y });
            a.deepEqual([z.state, z.v, z.src.rows], [x.state, x.v, x.src.rows], r + ' ' + ind + ' year ' + y);
          });
        });
      });
    });

    T.test('X-measures-d48-rest', 'Retail new business, average of the rest of A: only D applies (B and C are Tier 3)', function (a) {
      // B and C rate Retail Tier 3: not applicable, never a gap or a zero. D: 600 + 900 + 1350 = 2850
      [['ind.nb.arr'], ['nb.arr']].forEach(function (p) {
        var c = TAP.measures.combined(p[0], rest('alpha', 'average'), { industryId: 'ind3' });
        a.equal(c.v, 2850, p[0]);
        a.deepEqual(c.src.notApplicable, ['bravo', 'charlie']);
        a.deepEqual(c.src.excluded, []);
        a.equal(TAP.agg.describe(c), 'Average of 1 region');
      });
    });

    T.test('X-measures-d48-blank', 'A whole new business section left blank is not provided', function (a) {
      var plan = T_FIXTURE('mini');
      plan.regions[0].newBusiness = [];
      TAP.data.load(plan);
      a.equal(state('nb.arr', 'alpha'), 'notProvided');
      a.equal(state('nb.arr', 'alpha', 'ind1'), 'notProvided', 'Tier 1');
      a.equal(state('nb.arr', 'alpha', 'ind3'), 'notApplicable', 'Tier 3 stays not applicable');
      a.equal(state('ind.nb.arr', 'alpha', 'ind1'), 'notProvided');
    });

    T.test('X-measures-d48-cg', 'Customer growth: a filled accounts list with no account in an industry gives 0', function (a) {
      // D has accounts, none in Healthcare; C left its accounts list empty
      ['cg.arr', 'cg.services', 'cg.baseArr', 'cg.segment.core'].forEach(function (id) {
        var d = m(id, 'delta', { industryId: 'ind1' });
        a.deepEqual([d.state, d.v], ['value', 0], id + ' D Healthcare');
        a.equal(state(id, 'charlie', 'ind1'), 'notProvided', id + ' C has no accounts at all');
      });
      a.equal(m('cg.arr', 'delta', { industryId: 'ind1', year: 2 }).v, 0, 'by year too');
    });
  });

  // Every rate measure against a hand calculation.
  T.suite('rates', function () {
    T.test('X-measures-rates-nb', 'New business rates follow their row weights', function (a) {
      // Deal size weighted by implied wins. A: row 20 5 wins x 100, row 21 1 win x 200 -> 700 / 6 = 116.67
      a.near(m('nb.avgDealSize', 'alpha').v, 700 / 6, TOL);
      // B: 20 wins x 50 + 2 wins x 100 = 1200 / 22 = 54.55
      a.near(m('nb.avgDealSize', 'bravo').v, 1200 / 22, TOL);
      // C: only row 21 has a hit rate (1 win x 100) = 100
      a.near(m('nb.avgDealSize', 'charlie').v, 100, TOL);
      // Growth weighted by 3-year ARR potential. A year 2: (0.1 x 1655 + 0 x 600) / 2255 = 165.5 / 2255 = 0.0733925
      a.near(m('nb.growthY2', 'alpha').v, 165.5 / 2255, TOL);
      // B year 2: (0.2 x 3400 + 0 x 600) / 4000 = 0.17; D year 3: 0.5
      a.near(m('nb.growthY2', 'bravo').v, 0.17, TOL);
      a.near(m('nb.growthY3', 'delta').v, 0.5, TOL);
      // Services ratio weighted by 3-year ARR potential. A: (0.2 x 1655 + 0.2 x 600) / 2255 = 0.2
      a.near(m('nb.servicesRatio', 'alpha').v, 0.2, TOL);
      // C: row 20's ARR potential is blank, so only row 21 counts: 0.2
      a.near(m('nb.servicesRatio', 'charlie').v, 0.2, TOL);
      // Organization, weighted by each region's 3-year ARR potential:
      //   (0.2 x 2255 + 0.1 x 4000 + 0.2 x 300 + 0.25 x 2850) / 9405 = (451 + 400 + 60 + 712.5) / 9405 = 1623.5 / 9405 = 0.1726209
      a.near(TAP.measures.combined('nb.servicesRatio', org(), {}).v, 1623.5 / 9405, TOL);
      // Organization deal size, weighted by implied wins: (116.67 x 6 + 54.55 x 22 + 100 x 1 + 10 x 60) / 89 = 2600 / 89
      a.near(TAP.measures.combined('nb.avgDealSize', org(), {}).v, 2600 / 89, TOL);
    });

    T.test('X-measures-rates-cg', 'Customer growth % is incremental ARR over the accounts’ current ARR, every account counted', function (a) {
      // A: current ARR 500 + 200 + 30 + 150 = 880 (a4 uses the multiplier and still counts)
      //   year 1: (50 + 100 + 0 + 50) / 880 = 0.2272727; years 2 and 3: (0 + 0 + 0 + 50) / 880 = 0.0568182
      a.near(m('cg.growthY1', 'alpha').v, 200 / 880, TOL);
      a.near(m('cg.growthY2', 'alpha').v, 50 / 880, TOL);
      a.near(m('cg.growthY3', 'alpha').v, 50 / 880, TOL);
      a.equal(m('cg.growthY1', 'alpha').partial, undefined, 'nothing is missing');
      // B: 150 / 700; D: year 1 (80 + 100 + 0) / 1250 = 0.144, year 2 88 / 1250 = 0.0704, year 3 0
      a.near(m('cg.growthY1', 'bravo').v, 150 / 700, TOL);
      a.near(m('cg.growthY1', 'delta').v, 0.144, TOL);
      a.near(m('cg.growthY2', 'delta').v, 0.0704, TOL);
      a.deepEqual([m('cg.growthY3', 'delta').state, m('cg.growthY3', 'delta').v], ['value', 0]);
      a.equal(m('cg.growthY1', 'charlie').state, 'notProvided');
      a.equal(m('cg.baseArr', 'alpha').v, 880);
      // Organization, weighted by the accounts' current ARR: (200 + 150 + 180) / (880 + 700 + 1250) = 530 / 2830 = 0.1872792
      var o = TAP.measures.combined('cg.growthY1', org(), {});
      a.near(o.v, 530 / 2830, TOL);
      a.equal(o.src.weightBy, 'cg.baseArr');
      a.deepEqual(o.src.excluded, ['charlie']);
    });

    T.test('X-measures-rates-partial', 'A customer growth % is partial only when an account’s figure is truly missing', function (a) {
      var plan = T_FIXTURE('mini');
      plan.regions[0].customerGrowth.accounts[1].incrementalArr = [null, 0, 0];
      TAP.data.load(plan);
      var c = m('cg.growthY1', 'alpha');
      // a2 left out of year 1: (50 + 0 + 50) / (500 + 30 + 150) = 100 / 680
      a.near(c.v, 100 / 680, TOL);
      a.equal(c.partial, true);
      a.equal(m('cg.growthY2', 'alpha').partial, undefined, 'year 2 is complete');
    });
  });

  T.suite('scores', function () {
    function check(a, label) {
      Object.keys(X.scores).forEach(function (r) {
        if (r === 'unrated') return;
        Object.keys(X.scores[r]).forEach(function (ind) {
          var e = X.scores[r][ind], at = TAP.scores.attractiveness(r, ind), ab = TAP.scores.ability(r, ind);
          a.near(at.v, e.a, TOL, label + ' ' + r + ' ' + ind + ' attractiveness');
          if (e.b === null) a.equal(ab.state, 'notProvided', r + ' ' + ind + ' ability not provided');
          else a.near(ab.v, e.b, TOL, label + ' ' + r + ' ' + ind + ' ability');
          if (e.quadrant) a.equal(TAP.scores.quadrant(at.v, ab.v), e.quadrant, r + ' ' + ind + ' quadrant');
          a.equal(m('ind.attractiveness', r, { industryId: ind }).v, at.v, 'the measure reads the same score');
        });
      });
    }

    T.test('TPV-TC-114', 'With default weights each score is the average of its three ratings', function (a) {
      check(a, 'default');
      a.equal(TAP.scores.attractiveness('alpha', X.scores.unrated).state, 'notApplicable');
      a.equal(TAP.scores.ability('alpha', X.scores.unrated).state, 'notApplicable');
      a.equal(TAP.scores.attractiveness('alpha', 'ind1').kind, 'APP');
    });

    T.test('TPV-TC-114', 'With changed weights the scores follow the weighted hand calculation', function (a) {
      var saved = window.TAP_SETTINGS.scores;
      window.TAP_SETTINGS.scores = { attractiveness: { growthPotential: 2, criticality: 1, competitiveIntensity: 1 },
        ability: { references: 1, expertise: 2, productFit: 1 }, midpoint: 2.0 };
      try {
        a.near(TAP.scores.attractiveness('alpha', 'ind1').v, 2.75, TOL, '(3x2 + 3 + 2) / 4');
        a.near(TAP.scores.attractiveness('charlie', 'ind1').v, 2.25, TOL, '(2x2 + 3 + 2) / 4');
        a.near(TAP.scores.attractiveness('delta', 'ind3').v, 2, TOL, '(2x2 + 2 + 2) / 4');
        a.near(TAP.scores.ability('bravo', 'ind2').v, 1.25, TOL, '(1 + 1x2 + 2) / 4');
        a.near(TAP.scores.ability('alpha', 'ind4').v, 1, TOL, '(1 + 1x2 + 1) / 4');
        window.TAP_SETTINGS.scores.ability = { references: 0, expertise: 1, productFit: 1 };
        a.near(TAP.scores.ability('charlie', 'ind1').v, 2, TOL, 'a rating with weight 0 is not used, so its blank does not matter');
      } finally {
        window.TAP_SETTINGS.scores = saved;
      }
    });

    T.test('X-scores-midpoint', 'A score equal to the midpoint counts as attractive and able', function (a) {
      a.equal(TAP.scores.quadrant(2, 2), 'attractiveAble');
      a.equal(TAP.scores.quadrant(1.99, 2), 'lessAttractiveAble');
      a.equal(TAP.scores.quadrant(2, 1.99), 'attractiveNotYet');
      a.equal(TAP.scores.quadrant(1, 1), 'lessBoth');
      a.equal(TAP.scores.quadrant(null, 2), null, 'no quadrant without both scores');
      a.equal(TAP.scores.quadrant(TAP.scores.attractiveness('delta', 'ind3'), TAP.scores.ability('delta', 'ind3')), 'attractiveAble',
        'cells work too');
    });
  });
})(window.TAP);
