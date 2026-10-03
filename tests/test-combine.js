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
      a.equal(TAP.agg.weightBy('nb.hitRate', { 'nb.hitRate': 'nb.wins' }), 'nb.wins', 'report override');
      a.equal(TAP.agg.weightBy('nb.growthY2', { 'nb.hitRate': 'nb.wins' }), 'nb.arr', 'other rates keep the settings');
      a.equal(TAP.agg.weightBy(null), null, 'no measure, no weight');
    });

    // A stand-in measure registry, so the weight lookup inside combine is tested on its own: values from the
    // hand calculations, labels for the describe text, and a record of the context each lookup received.
    function withMeasures(fn) {
      var saved = TAP.measures, seen = [];
      var weights = {
        'nb.targetAccountsRated': { alpha: 30, bravo: 50, charlie: 5, delta: 100 },
        'nb.arr': { alpha: 2255, bravo: 4000, charlie: 300, delta: 2850 },
        'x.blankForC': { alpha: 30, bravo: 50, charlie: null, delta: 100 },
        'x.allBlank': { alpha: null, bravo: null, charlie: null, delta: null }
      };
      TAP.measures = {
        get: function (id) {
          if (!weights[id]) return null;
          return function (r, ctx) { seen.push({ id: id, r: r, ctx: ctx }); return cell(weights[id][r], 'IN'); };
        },
        meta: function (id) { return { id: id, label: id === 'nb.targetAccountsRated' ? 'Target accounts with a hit rate' : 'ARR potential' }; },
        define: function () {}, list: function () { return Object.keys(weights); }, combined: function () {}
      };
      try { fn(seen); } finally { TAP.measures = saved; }
    }
    function rates() { return ALL.map(function (r) { return { regionId: r, cell: cell(X.region[r]['nb.hitRate'], 'IN') }; }); }

    T.test('TPV-TC-069', 'Without item weights, combine looks the weight up through the measures (settings default)', function (a) {
      withMeasures(function (seen) {
        var ctx = { year: null, industryId: 'ind1' };
        var r = TAP.agg.combine(rates(), 'rate', 'total', { measureId: 'nb.hitRate', ctx: ctx });
        a.near(r.v, X.combined.orgTotal['nb.hitRate'], TOL, '89 / 185');
        a.equal(r.src.weightBy, 'nb.targetAccountsRated');
        a.equal(r.src.weighted, true);
        a.equal(r.src.weightFallback, undefined);
        a.deepEqual(seen.map(function (s) { return s.r; }), ALL, 'one lookup per region');
        a.ok(seen.every(function (s) { return s.id === 'nb.targetAccountsRated' && s.ctx === ctx; }), 'with the caller’s context');
        a.equal(TAP.agg.describe(r), 'Weighted average of 4 regions, by target accounts with a hit rate');
      });
    });

    T.test('TPV-TC-074', 'The report’s weight override is looked up through the measures', function (a) {
      withMeasures(function () {
        var r = TAP.agg.combine(rates(), 'rate', 'average', { measureId: 'nb.hitRate', weights: { 'nb.hitRate': 'nb.arr' } });
        a.near(r.v, 0.4232855, TOL, '3981 / 9405 (hand calculation above)');
        a.equal(r.src.weightBy, 'nb.arr');
        a.equal(TAP.agg.describe(r), 'Weighted average of 4 regions, by ARR potential', 'acronyms keep their capitals');
      });
    });

    T.test('X-agg-weight-missing', 'A rate whose weight is blank is left out and named as "weight missing"', function (a) {
      withMeasures(function () {
        // (0.2 x 30 + 0.44 x 50 + 0.6 x 100) / (30 + 50 + 100) = 88 / 180 = 0.4888889
        var r = TAP.agg.combine(rates(), 'rate', 'total', { measureId: 'nb.hitRate', weights: { 'nb.hitRate': 'x.blankForC' } });
        a.near(r.v, 0.4888889, TOL);
        a.deepEqual(r.src.weightMissing, ['charlie']);
        a.deepEqual(r.src.excluded, [], 'Region C provided its hit rate');
        a.equal(TAP.agg.describe(r), 'Weighted average of 3 regions, by ARR potential; Region C not included: weight missing');
        // No region has a weight: never drop them all; each counts equally. (0.2 + 0.44 + 0.2 + 0.6) / 4 = 0.36
        var none = TAP.agg.combine(rates(), 'rate', 'total', { measureId: 'nb.hitRate', weights: { 'nb.hitRate': 'x.allBlank' } });
        a.near(none.v, 0.36, TOL);
        a.equal(none.src.weightFallback, true);
        a.deepEqual(none.src.weightMissing, []);
        a.equal(TAP.agg.describe(none), 'Average of 4 regions');
      });
    });

    T.test('X-agg-weight-unresolved', 'A weight that can’t be found falls back to a plain average with a note', function (a) {
      TAP.notes.clear();
      withMeasures(function () {
        var r = TAP.agg.combine(rates(), 'rate', 'total', { measureId: 'nb.hitRate', weights: { 'nb.hitRate': 'nb.typo' } });
        a.near(r.v, 0.36, TOL, '(0.2 + 0.44 + 0.2 + 0.6) / 4');
        a.equal(r.src.weightFallback, true);
        a.deepEqual(r.src.excluded, []);
        a.equal(TAP.agg.describe(r), 'Average of 4 regions');
      });
      a.equal(TAP.notes.list('data').length, 1, 'a note for the data sources panel');
      a.match(TAP.notes.list('data')[0].message, /nb\.typo/);
      var saved = TAP.measures;
      TAP.measures = { __stub: 13, get: function () { throw new Error('stub'); }, meta: function () { throw new Error('stub'); } };
      try {
        var s = TAP.agg.combine(rates(), 'rate', 'total', { measureId: 'nb.hitRate' });
        a.near(s.v, 0.36, TOL, 'measures not built yet: still a figure');
        a.equal(s.src.weightFallback, true);
      } finally { TAP.measures = saved; }
      TAP.notes.clear();
    });

    T.test('X-agg-zero-weights', 'When every weight is zero, each region counts equally', function (a) {
      var items = rates().map(function (it) { return Object.assign(it, { weight: 0 }); });
      var r = TAP.agg.combine(items, 'rate', 'total');
      a.near(r.v, 0.36, TOL);
      a.equal(r.src.weightFallback, true);
      a.equal(TAP.agg.describe(r), 'Average of 4 regions');
      var w = TAP.agg.combine(rates().map(function (it, i) { return Object.assign(it, { weight: i + 1 }); }), 'rate', 'total');
      a.equal(TAP.agg.describe(w), 'Weighted average of 4 regions', 'weights given directly, no weight measure named');
    });

    T.test('X-agg-text', 'Text is listed by region, never combined', function (a) {
      var r = TAP.agg.combine(mcItems('ind1', 'commentary').map(function (it, i) {
        if (i === 2) it.cell = cell(null, 'IN');
        return it;
      }), 'text', 'total');
      a.deepEqual(r.items, [{ regionId: 'alpha', v: 'Strong base in clinics.' }, { regionId: 'bravo', v: 'Group priority, strong fit.' },
        { regionId: 'delta', v: 'Group priority, but no references yet.' }]);
      a.deepEqual(r.v, ['Strong base in clinics.', 'Group priority, strong fit.', 'Group priority, but no references yet.']);
      a.equal(r.src.how, 'list');
      a.deepEqual(r.src.excluded, ['charlie']);
      a.equal(TAP.agg.describe(r), 'Listed by region (3 regions); Region C not included: not provided');
    });

    T.test('X-agg-kind', 'An unknown kind of value is an error, never quietly treated as an amount', function (a) {
      a.throws(function () { TAP.agg.combine(planted('nb.arr', ALL), 'amounts', 'total'); });
      a.throws(function () { TAP.agg.combine(planted('nb.arr', ALL), undefined, 'total'); });
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

    T.test('X-scope-fallback', 'After a fallback the sentence says what is drawn: all regions', function (a) {
      [{ mode: 'set', set: [] }, { mode: 'set', set: ['nowhere'] }, { mode: 'one', focus: 'nowhere' },
        { mode: 'pair', focus: null, second: 'alpha' }, { mode: 'mystery' }].forEach(function (c) {
        a.equal(TAP.scope.sentence(cmp(c)), 'Showing all 4 regions side by side', JSON.stringify(c));
      });
      a.equal(TAP.scope.sentence(cmp({ mode: 'pair', focus: 'bravo', second: 'nowhere' })), 'Showing Region B only');
    });

    T.test('X-scope-plural', 'Sentences and labels say "region" for one and "regions" for more', function (a) {
      var plan = T_FIXTURE('mini');
      plan.regions = plan.regions.slice(0, 2);
      TAP.data.load(plan);
      a.equal(TAP.scope.sentence(cmp({ mode: 'one', focus: 'alpha' })), 'Showing Region A against the average of the other 1 region');
      a.equal(TAP.scope.entities(cmp({ mode: 'one', focus: 'alpha', restAgg: 'total' }))[1].label, 'Total of the other 1 region');
      a.equal(TAP.scope.sentence(cmp({ mode: 'one', focus: 'alpha', restAs: 'individual' })), 'Showing Region A against the other 1 region');
      a.equal(TAP.scope.sentence(cmp({ mode: 'set', set: ['bravo'] })), 'Showing 1 chosen region: Region B');
      plan.regions = plan.regions.slice(0, 1);
      TAP.data.load(plan);
      a.equal(TAP.scope.sentence(cmp({ mode: 'all' })), 'Showing all 1 region side by side');
      a.equal(TAP.scope.sentence(cmp({ mode: 'org' })), 'Showing the organization total across all 1 region');
      a.equal(TAP.scope.sentence(cmp({ mode: 'one', focus: 'alpha' })), 'Showing Region A only');
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
