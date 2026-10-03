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
    'nb.servicesRatio', 'cg.growthY1', 'cg.growthY2', 'cg.growthY3',
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
