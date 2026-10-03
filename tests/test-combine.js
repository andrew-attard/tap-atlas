/*
 * File: tests/test-combine.js
 * Purpose: Tests for combining regions and the comparison scope (TPV-TC-068 to 075), checked against the
 *          hand calculations in tests/fixtures/mini-expected.js.
 * Provides: test cases TPV-TC-068 to TPV-TC-075, X-scope-*, X-agg-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var X = window.TEST_EXPECT.mini;
  var ALL = ['alpha', 'bravo', 'charlie', 'delta'];
  var TOL = 1e-6;

  // A cell as a measure would return it: a number, or blank (not provided).
  function cell(v, kind) {
    return v == null ? { v: null, state: 'notProvided', kind: kind || 'DER' } : { v: v, state: 'value', kind: kind || 'DER' };
  }
  // Items for TAP.agg.combine from the hand-calculated region figures.
  function planted(key, ids) {
    return ids.map(function (r) { return { regionId: r, cell: cell(X.region[r][key]) }; });
  }
  // Items from a raw fixture field on the Market Coverage row of one industry.
  function mcItems(industryId, field) {
    return ALL.map(function (r) {
      var row = TAP.data.row(r, 'marketCoverage', function (d) { return d.industryId === industryId; });
      return { regionId: r, cell: cell(row[field], 'IN') };
    });
  }
  function without(id) { return ALL.filter(function (r) { return r !== id; }); }

  T.suite('combine', function () {
    T.test('TPV-TC-068', 'Organization totals are sums and the average of the rest is a simple average', function (a) {
      ['base.arr', 'nb.arr', 'amb.arr'].forEach(function (k) {
        var r = TAP.agg.combine(planted(k, ALL), 'amount', 'total');
        a.near(r.v, X.combined.orgTotal[k], TOL, 'organization total ' + k);
        a.equal(r.state, 'value');
        a.equal(r.kind, 'APP', 'combined figures are calculated by the app');
        a.equal(r.src.combined, true);
        a.equal(r.src.how, 'sum');
        a.deepEqual(r.src.regionIds, ALL);
      });
      // amb.arr averages are sums of combined parts (ARCHITECTURE section 9), checked in test-measures.js
      var r = TAP.agg.combine(planted('nb.arr', without('alpha')), 'amount', 'average');
      a.near(r.v, X.combined.restOfAlphaAverage['nb.arr'], TOL, 'average of the rest of A');
      a.equal(r.src.how, 'mean');
      a.near(TAP.agg.combine(planted('nb.arr', without('alpha')), 'amount', 'total').v,
        X.combined.restOfAlphaTotal['nb.arr'], TOL, 'total of the rest of A');
    });

    T.test('TPV-TC-068', 'A partly provided figure keeps its "partial" mark when combined', function (a) {
      var items = planted('amb.arr', ALL);
      items[2].cell.partial = true;      // Region C: new business only
      var r = TAP.agg.combine(items, 'amount', 'total');
      a.near(r.v, X.combined.orgTotal['amb.arr'], TOL);
      a.equal(r.partial, true);
      a.match(r.note, /Region C/);
    });

    T.test('TPV-TC-069', 'Hit rates combine as a weighted average by target accounts on rows with a hit rate', function (a) {
      // Weights: target accounts on rows that have a hit rate (A 30, B 50, C 5, D 100; see mini-expected.js)
      var w = { alpha: 30, bravo: 50, charlie: 5, delta: 100 };
      function items(ids) {
        return ids.map(function (r) { return { regionId: r, cell: cell(X.region[r]['nb.hitRate'], 'IN'), weight: w[r] }; });
      }
      ['total', 'average'].forEach(function (how) {
        var org = TAP.agg.combine(items(ALL), 'rate', how);
        a.near(org.v, X.combined.orgTotal['nb.hitRate'], TOL, 'all regions, ' + how);
        a.equal(org.src.how, 'wmean');
        a.near(TAP.agg.combine(items(without('alpha')), 'rate', how).v, X.combined.restOfAlphaAverage['nb.hitRate'], TOL,
          'rest of A, ' + how);
      });
      // Not a simple average: (0.2 + 0.44 + 0.2 + 0.6) / 4 = 0.36
      a.ok(Math.abs(TAP.agg.combine(items(ALL), 'rate', 'total').v - 0.36) > 0.1, 'differs from the simple average');
    });

    T.test('TPV-TC-070', 'Ratings combine as the average with the lowest and highest rating', function (a) {
      var gp = X.ratings['ind.growthPotential@ind1'], ref = X.ratings['ind.references@ind1'];
      ['total', 'average'].forEach(function (how) {
        var r = TAP.agg.combine(mcItems('ind1', 'growthPotential'), 'rating', how);
        a.near(r.v, gp.v, TOL, 'growth potential mean, ' + how);
        a.deepEqual(r.range, { min: gp.min, max: gp.max });
        a.equal(r.src.how, 'rating');
        var s = TAP.agg.combine(mcItems('ind1', 'references'), 'rating', how);
        a.near(s.v, ref.v, TOL, 'references mean, blank left out');
        a.deepEqual(s.range, { min: ref.min, max: ref.max });
        a.deepEqual(s.src.excluded, ref.excluded);
      });
    });

    T.test('TPV-TC-071', 'Tiers and segments are counted, never averaged', function (a) {
      var exp = X.tierCounts.ind2;
      ['total', 'average'].forEach(function (how) {
        var r = TAP.agg.combine(mcItems('ind2', 'tier'), 'category', how);
        a.deepEqual(r.counts, exp.counts, 'tier counts, ' + how);
        a.deepEqual(r.src.excluded, exp.excluded);
        a.equal(r.src.how, 'count');
        a.ok(typeof r.v !== 'number', 'no averaged tier');
      });
      var seg = [cell('strategic', 'DER'), cell('core', 'DER'), cell(null, 'DER'), cell('strategic', 'DER')];
      var s = TAP.agg.combine(ALL.map(function (r, i) { return { regionId: r, cell: seg[i] }; }), 'category', 'average');
      a.deepEqual(s.counts, { strategic: 2, core: 1 });
      a.deepEqual(s.src.excluded, ['charlie']);
    });

    T.test('TPV-TC-072', 'Counts: the total is the sum, the average of the rest a simple average', function (a) {
      var ta = TAP.agg.combine(planted('nb.targetAccounts', ALL), 'count', 'total');
      a.equal(ta.v, 195, '30 + 50 + 15 + 100');
      a.equal(ta.src.how, 'sum');
      var avg = TAP.agg.combine(planted('nb.targetAccounts', without('alpha')), 'count', 'average');
      a.near(avg.v, 55, TOL, '(50 + 15 + 100) / 3');
      a.equal(avg.src.how, 'mean');
      a.equal(TAP.agg.combine(planted('focus.tier2', ALL), 'count', 'total').v, 7, '2 + 2 + 1 + 2');
      a.near(TAP.agg.combine(planted('focus.tier2', without('delta')), 'count', 'average').v, 5 / 3, TOL, '(2 + 2 + 1) / 3');
    });

    T.test('TPV-TC-073', 'A region with no value is left out of the combined figure and named in the note', function (a) {
      var org = TAP.agg.combine(planted('cg.arr', ALL), 'amount', 'total');
      a.equal(org.v, X.combined.orgTotal['cg.arr'].v);
      a.deepEqual(org.src.excluded, X.combined.orgTotal['cg.arr'].excluded);
      a.match(TAP.agg.describe(org), /Region C/, 'the note names Region C');
      a.match(TAP.agg.describe(org), /3 regions/, 'and counts only the regions used');
      var rest = TAP.agg.combine(planted('cg.arr', without('delta')), 'amount', 'average');
      a.equal(rest.v, X.combined.restOfDeltaAverage['cg.arr'].v, '(300 + 150) / 2, not divided by 3');
      a.deepEqual(rest.src.excluded, X.combined.restOfDeltaAverage['cg.arr'].excluded);
    });

    T.test('TPV-TC-073', 'Nothing left gives "not provided"; not applicable is never counted as a gap', function (a) {
      var none = TAP.agg.combine([{ regionId: 'charlie', cell: cell(null) }], 'amount', 'total');
      a.equal(none.state, 'notProvided');
      a.equal(none.v, null);
      var na = { v: null, state: 'notApplicable', kind: 'IN' };
      var mixed = TAP.agg.combine([{ regionId: 'alpha', cell: cell(2, 'IN') }, { regionId: 'bravo', cell: na }], 'rating', 'total');
      a.equal(mixed.v, 2);
      a.deepEqual(mixed.src.excluded, [], 'not applicable is not a gap');
      a.deepEqual(mixed.src.notApplicable, ['bravo']);
      a.ok(!/Region B/.test(TAP.agg.describe(mixed)), 'and is not named as missing');
      var allNa = TAP.agg.combine([{ regionId: 'alpha', cell: na }, { regionId: 'bravo', cell: na }], 'rating', 'total');
      a.equal(allNa.state, 'notApplicable');
      var zero = TAP.agg.combine([{ regionId: 'alpha', cell: cell(0) }, { regionId: 'bravo', cell: cell(5) }], 'amount', 'average');
      a.equal(zero.v, 2.5, 'zero is a value and counts');
    });

    T.test('TPV-TC-074', 'With the hit-rate weight changed to ARR potential, the result follows the new weight', function (a) {
      // Hand calculation, weights = 3-year new business ARR potential (A 2255, B 4000, C 300, D 2850):
      //   all regions: (0.2 x 2255 + 0.44 x 4000 + 0.2 x 300 + 0.6 x 2850) / (2255 + 4000 + 300 + 2850)
      //              = (451 + 1760 + 60 + 1710) / 9405 = 3981 / 9405 = 0.4232855
      //   rest of A:   (1760 + 60 + 1710) / (4000 + 300 + 2850) = 3530 / 7150 = 0.4937063
      function items(ids) {
        return ids.map(function (r) { return { regionId: r, cell: cell(X.region[r]['nb.hitRate'], 'IN'), weight: X.region[r]['nb.arr'] }; });
      }
      a.near(TAP.agg.combine(items(ALL), 'rate', 'total').v, 0.4232855, TOL);
      a.near(TAP.agg.combine(items(without('alpha')), 'rate', 'average').v, 0.4937063, TOL);
    });

    T.test('TPV-TC-074', 'Rate weights come from the report first, then the settings', function (a) {
      a.equal(TAP.agg.weightBy('nb.hitRate'), 'nb.targetAccountsRated', 'settings default');
      a.equal(TAP.agg.weightBy('nb.hitRate', { 'nb.hitRate': 'nb.arr' }), 'nb.arr', 'report override');
      a.equal(TAP.agg.weightBy('nb.growthY2', { 'nb.hitRate': 'nb.arr' }), 'nb.arr', 'other rates keep the settings');
    });

    T.test('X-agg-describe', 'A combined figure says how it was combined', function (a) {
      a.equal(TAP.agg.describe(TAP.agg.combine(planted('nb.arr', ALL), 'amount', 'total')), 'Total of 4 regions');
      a.equal(TAP.agg.describe(TAP.agg.combine(planted('nb.arr', without('alpha')), 'amount', 'average')), 'Average of 3 regions');
      a.equal(TAP.agg.describe(TAP.agg.combine(mcItems('ind1', 'growthPotential'), 'rating', 'total')),
        'Average of 4 regions, ranging from 2 to 3');
      a.equal(TAP.agg.describe({ v: 5, state: 'value', kind: 'DER', src: { regionId: 'alpha' } }), '', 'not combined');
    });
  });

  T.suite('scope', function () {
    var TH = window.TAP_THEME;
    function pick(list) {
      return list.map(function (e) {
        return { id: e.id, kind: e.kind, regionIds: e.regionIds, how: e.how, role: e.role, color: e.color, label: e.label };
      });
    }
    function region(id, role, i, label) {
      return { id: id, kind: 'region', regionIds: [id], how: null, role: role,
        color: role === 'muted' ? TH.focusGrey : TH.regions[i], label: label };
    }
    function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c); }

    T.test('TPV-TC-075', 'Each of the five comparison modes gives exactly the expected regions and combined figures', function (a) {
      a.deepEqual(pick(TAP.scope.entities(cmp({ mode: 'all' }))), [region('alpha', 'region', 0, 'Region A'),
        region('bravo', 'region', 1, 'Region B'), region('charlie', 'region', 2, 'Region C'), region('delta', 'region', 3, 'Region D')], 'all');

      a.deepEqual(pick(TAP.scope.entities(cmp({ mode: 'one', focus: 'bravo' }))), [region('bravo', 'focus', 1, 'Region B'),
        { id: 'rest', kind: 'combined', regionIds: ['alpha', 'charlie', 'delta'], how: 'average', role: 'combined', color: TH.combined,
          label: 'Average of the other 3 regions' }], 'one, rest as an average');
      a.deepEqual(pick(TAP.scope.entities(cmp({ mode: 'one', focus: 'bravo', restAgg: 'total' })))[1],
        { id: 'rest', kind: 'combined', regionIds: ['alpha', 'charlie', 'delta'], how: 'total', role: 'combined', color: TH.combined,
          label: 'Total of the other 3 regions' }, 'one, rest as a total');
      a.deepEqual(pick(TAP.scope.entities(cmp({ mode: 'one', focus: 'bravo', restAs: 'individual' }))), [
        region('bravo', 'focus', 1, 'Region B'), region('alpha', 'muted', 0, 'Region A'), region('charlie', 'muted', 2, 'Region C'),
        region('delta', 'muted', 3, 'Region D')], 'one, rest shown individually in grey');

      a.deepEqual(pick(TAP.scope.entities(cmp({ mode: 'pair', focus: 'charlie', second: 'alpha' }))), [
        region('charlie', 'focus', 2, 'Region C'), region('alpha', 'second', 0, 'Region A')], 'pair');

      a.deepEqual(pick(TAP.scope.entities(cmp({ mode: 'set', set: ['delta', 'alpha'] }))), [
        region('alpha', 'region', 0, 'Region A'), region('delta', 'region', 3, 'Region D')], 'set, in file order');

      a.deepEqual(pick(TAP.scope.entities(cmp({ mode: 'org' }))), [{ id: 'org', kind: 'combined', regionIds: ALL, how: 'total',
        role: 'combined', color: TH.combined, label: 'Organization total (4 regions)' }], 'org');
    });

    T.test('TPV-TC-075', 'The comparison sentence and the regions in scope follow the mode', function (a) {
      var cases = [
        [{ mode: 'all' }, 'Showing all 4 regions side by side', ALL],
        [{ mode: 'one', focus: 'charlie' }, 'Showing Region C against the average of the other 3 regions', ALL],
        [{ mode: 'one', focus: 'charlie', restAgg: 'total' }, 'Showing Region C against the total of the other 3 regions', ALL],
        [{ mode: 'one', focus: 'charlie', restAs: 'individual' }, 'Showing Region C against the other 3 regions', ALL],
        [{ mode: 'pair', focus: 'delta', second: 'bravo' }, 'Showing Region D against Region B', ['bravo', 'delta']],
        [{ mode: 'set', set: ['charlie', 'alpha', 'bravo'] }, 'Showing 3 chosen regions: Region A, Region B and Region C',
          ['alpha', 'bravo', 'charlie']],
        [{ mode: 'org' }, 'Showing the organization total across all 4 regions', ALL]
      ];
      cases.forEach(function (c) {
        a.equal(TAP.scope.sentence(cmp(c[0])), c[1]);
        a.deepEqual(TAP.scope.regionIds(cmp(c[0])), c[2], c[1]);
      });
    });

    T.test('X-scope-default', 'With no comparison given, the scope reads the shared state', function (a) {
      TAP.store.set({ cmp: { mode: 'pair', focus: 'alpha', second: 'delta' } });
      a.deepEqual(TAP.scope.entities().map(function (e) { return e.id; }), ['alpha', 'delta']);
    });

    T.test('X-scope-fallback', 'An incomplete comparison falls back to all regions instead of an empty chart', function (a) {
      a.equal(TAP.scope.entities(cmp({ mode: 'one', focus: 'nowhere' })).length, 4, 'unknown focus');
      a.equal(TAP.scope.entities(cmp({ mode: 'set', set: [] })).length, 4, 'empty set');
      a.deepEqual(TAP.scope.entities(cmp({ mode: 'pair', focus: 'bravo', second: null })).map(function (e) { return e.role; }),
        ['focus'], 'pair without a second region');
    });

    T.test('X-scope-colours', 'Each region keeps its colour by file order; past 8 regions colours repeat with a note', function (a) {
      ALL.forEach(function (r, i) { a.equal(TAP.scope.colorOf(r), TH.regions[i], r); });
      TAP.notes.clear();
      var plan = T_FIXTURE('mini');
      for (var i = 0; i < 6; i++) {
        var extra = JSON.parse(JSON.stringify(plan.regions[0]));
        extra.id = 'extra' + i;
        extra.name = 'Region X' + i;
        plan.regions.push(extra);
      }
      TAP.data.load(plan);
      a.equal(TAP.data.regions().length, 10);
      a.equal(TAP.scope.colorOf('extra4'), TH.regions[0], 'region 9 takes colour 1');
      a.equal(TAP.scope.colorOf('extra5'), TH.regions[1], 'region 10 takes colour 2');
      TAP.scope.entities(cmp({ mode: 'all' })).forEach(function (e) { a.ok(/^#[0-9a-f]{6}$/i.test(e.color), e.id + ' has a colour'); });
      a.equal(TAP.notes.list('colours').length, 1, 'one note for the data sources panel');
      TAP.notes.clear();
    });

    T.test('X-scope-colours', 'With 8 regions or fewer there is no colour note', function (a) {
      TAP.notes.clear();
      TAP.scope.entities(cmp({ mode: 'all' }));
      a.equal(TAP.notes.list('colours').length, 0);
    });

    T.test('X-scope-names', 'Labels use the organization layer’s short region names', function (a) {
      var saved = window.TAP_ORG;
      window.TAP_ORG = { regions: { alpha: 'Short A' } };
      try {
        a.equal(TAP.scope.entities(cmp({ mode: 'all' }))[0].label, 'Short A');
        a.equal(TAP.scope.sentence(cmp({ mode: 'pair', focus: 'alpha', second: 'bravo' })), 'Showing Short A against Region B');
      } finally {
        window.TAP_ORG = saved;
      }
    });
  });
})(window.TAP);
