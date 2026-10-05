/*
 * File: tests/test-custom.js
 * Purpose: Tests for custom charts: the combinations each measure allows, the definitions built from them
 *          (US-3.5.2), the Build a chart section (US-3.5.1) and the session list (US-3.5.3).
 * Provides: test cases TPV-TC-552 to 556, 558, 559, 561 to 565, 567, 568, 570, 572, X-custom-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures (mini-data, mini-expected)
 * Used by: tests.html
 * Owner: CUSTOM stream
 */
(function (TAP) {
  'use strict';

  var EX = function () { return window.TEST_EXPECT.mini; };
  function qs(sel, root) { return TAP.dom.qs(sel, root); }
  function qsa(sel, root) { return TAP.dom.qsa(sel, root); }
  function byId(list, id) { return list.filter(function (o) { return o.measureId === id; })[0]; }
  function rowOf(ds, id) { return ds.rows.filter(function (r) { return r.entityId === id; })[0]; }
  function cmpOne(focus, agg) { return { mode: 'one', focus: focus, second: null, set: [], restAs: 'combined', restAgg: agg }; }

  // Runs a body and always removes the definitions it registered and the panels it made.
  function scene(fn) {
    return function (a) {
      var before = Object.keys(window.TAP_REPORTS), panels = [];
      var api = { panel: function (def, opts) { var p = TAP.panel.create(T.dom.mount(), def, opts); panels.push(p); return p; } };
      function tidy() {
        panels.forEach(function (p) { try { p.destroy(); } catch (e) { /* already gone */ } });
        Object.keys(window.TAP_REPORTS).forEach(function (id) { if (before.indexOf(id) < 0) delete window.TAP_REPORTS[id]; });
        TAP.storage.clear('chart:custom:');
      }
      try { fn(a, api); } finally { tidy(); }
    };
  }

  T.suite('custom', function () {

    /* ---------- US-3.5.2: combination rules from measure metadata ---------- */

    T.test('TPV-TC-561', 'Each option lists the measure’s own dims, unit and value kind from its metadata', function (a) {
      var opts = TAP.custom.options();
      a.ok(opts.length > 10, 'the catalogue is offered');
      opts.forEach(function (o) {
        var m = TAP.measures.meta(o.measureId);
        a.ok(!!m, o.measureId + ' is a catalogue measure');
        a.deepEqual(o.dims, m.dims || [], o.measureId + ' dims');
        a.equal(o.unit, m.unit, o.measureId + ' unit');
        a.equal(o.valueKind, m.valueKind, o.measureId + ' value kind');
        a.equal(o.label, m.label, o.measureId + ' label');
      });
      // Every measure that is not text or category is offered (ARCHITECTURE 18.3)
      TAP.measures.list().forEach(function (id) {
        var vk = TAP.measures.meta(id).valueKind;
        if (vk !== 'text' && vk !== 'category') a.ok(!!byId(opts, id), id + ' is offered');
      });
    });

    T.test('TPV-TC-561', 'The "by" choices follow the catalogue: regions, then each breakdown the measure lists', function (a) {
      var opts = TAP.custom.options();
      // From ARCHITECTURE sections 9 and 17.5: nb.arr has year and industry; nb.hitRate industry; focus.tier1 none;
      // rc.all.oi year, channel and motion; ind.* figures exist only per industry.
      a.deepEqual(byId(opts, 'nb.arr').by, ['entity', 'year', 'industry']);
      a.deepEqual(byId(opts, 'nb.hitRate').by, ['entity', 'industry']);
      a.deepEqual(byId(opts, 'focus.tier1').by, ['entity']);
      a.deepEqual(byId(opts, 'rc.all.oi').by, ['entity', 'year', 'channel', 'motion']);
      a.deepEqual(byId(opts, 'cg.accounts').by, ['entity', 'segment', 'risk']);
      a.deepEqual(byId(opts, 'ind.growthPotential').by, ['industry']);
    });

    T.test('TPV-TC-562', 'A measure defined at run time is offered with its dimensions, with no code change', function (a) {
      a.ok(!byId(TAP.custom.options(), 'xCustomProbe'), 'not there before');
      TAP.measures.define('xCustomProbe', { unit: 'money', valueKind: 'amount', kind: 'IN', dims: ['year', 'channel'],
        words: function () { return { label: 'Probe amount', short: 'Probe' }; } }, function (r) {
        return { v: 1, state: 'value', kind: 'IN', src: { regionId: r, section: 'recap', field: 'value', row: null, year: null, cell: null, kind: 'IN' } };
      });
      var o = byId(TAP.custom.options(), 'xCustomProbe');
      a.ok(!!o, 'listed');
      a.deepEqual(o.dims, ['year', 'channel']);
      a.deepEqual(o.by, ['entity', 'year', 'channel']);
      a.equal(o.unit, 'money');
      a.equal(o.label, 'Probe amount');
      var def = TAP.custom.definition({ measure: 'xCustomProbe', by: 'channel' });
      a.ok(!def.errors, 'a definition can be built for it');
      a.deepEqual(def.breakdowns, ['channel']);
    });

    T.test('TPV-TC-563', 'A rate with the rest as a total is the weighted mean of the rest, never a sum', scene(function (a) {
      var def = TAP.custom.definition({ measure: 'nb.hitRate', by: 'entity', type: 'bar' });
      a.deepEqual(def.errors, undefined, 'valid');
      var ds = TAP.prepare.run(def, { cmp: cmpOne('alpha', 'total') });
      a.near(rowOf(ds, 'alpha').cells['nb.hitRate'].v, EX().region.alpha['nb.hitRate'], 1e-6, 'Region A');
      var rest = rowOf(ds, 'rest').cells['nb.hitRate'];
      // (22 + 1 + 60) wins / (50 + 5 + 100) accounts with a hit rate = 83 / 155 (mini-expected)
      a.near(rest.v, EX().combined.restOfAlphaAverage['nb.hitRate'], 1e-6, 'rest of A, as a total');
      a.ok(Math.abs(rest.v - (0.44 + 0.2 + 0.6)) > 0.5, 'not the sum of the three rates (1.24)');
      a.equal(rest.src.how, 'wmean', 'combined as a weighted mean');
    }));

    T.test('TPV-TC-563', 'A rating by industry is the mean with its range, as a total and for the organization', scene(function (a) {
      var def = TAP.custom.definition({ measure: 'ind.growthPotential', by: 'industry' });
      a.deepEqual(def.errors, undefined, 'valid');
      var key = 'ind.growthPotential@industry:ind1';
      var org = TAP.prepare.run(def, { breakdown: 'industry', cmp: { mode: 'org', focus: null, second: null, set: [], restAs: 'combined', restAgg: 'average' } });
      var c = rowOf(org, 'org').cells[key], want = EX().ratings['ind.growthPotential@ind1'];
      a.near(c.v, want.v, 1e-6, 'all four regions: 3, 3, 2, 3');
      a.deepEqual([c.range.min, c.range.max], [want.min, want.max], 'range');
      var one = TAP.prepare.run(def, { breakdown: 'industry', cmp: cmpOne('alpha', 'total') });
      var r = rowOf(one, 'rest').cells[key];
      a.near(r.v, 8 / 3, 1e-6, 'rest of A as a total: (3 + 2 + 3) / 3, never 8');
      a.deepEqual([r.range.min, r.range.max], [2, 3]);
    }));

    T.test('TPV-TC-564', 'Text and category measures are never offered as chart values', function (a) {
      var opts = TAP.custom.options();
      opts.forEach(function (o) { a.ok(o.valueKind !== 'text' && o.valueKind !== 'category', o.measureId); });
      a.ok(!byId(opts, 'ind.commentary'), 'leader commentary');
      a.ok(!byId(opts, 'ind.tier'), 'tier');
      a.ok(!!TAP.custom.definition({ measure: 'ind.tier', by: 'industry' }).errors, 'tier is refused by definition too');
      a.ok(!!TAP.custom.definition({ measure: 'ind.commentary', by: 'industry' }).errors, 'commentary is refused');
    });

    T.test('TPV-TC-565', 'A generated definition is validated before use, and passes', function (a) {
      var real = TAP.reports.validate, seen = [];
      TAP.reports.validate = function (def) { var e = real(def); seen.push({ id: def && def.id, errors: e }); return e; };
      try {
        var def = TAP.custom.definition({ measure: 'nb.arr', by: 'year', type: 'groupedBar' });
        a.equal(seen.length, 1, 'validate ran once');
        a.equal(seen[0].id, 'custom:nb.arr:year');
        a.deepEqual(seen[0].errors, [], 'and passed');
        a.equal(def.id, 'custom:nb.arr:year');
      } finally { TAP.reports.validate = real; }
    });

    T.test('TPV-TC-565', 'A failing definition shows its error in its own panel; the other panel still draws', scene(function (a, s) {
      var good = TAP.custom.definition({ measure: 'nb.arr', by: 'entity', type: 'bar' });
      var bad = Object.assign({}, good, { id: 'custom:xBroken:entity', types: ['pie', 'table'] });
      var p1 = s.panel(bad), p2 = s.panel(good);
      var err = qs('.tap-panel__error', p1.el);
      a.ok(!!err, 'the error is in the failing panel');
      a.match(err.textContent, /pie/, 'it names the problem in words');
      a.ok(!qs('.tap-panel__error', p2.el), 'no error in the other panel');
      a.ok(qs('.tap-panel__body', p2.el).children.length > 0, 'the other panel drew');
    }));

    T.test('TPV-TC-565', 'Choices a measure does not allow are refused with plain words', function (a) {
      var e1 = TAP.custom.definition({ measure: 'nb.hitRate', by: 'year' }).errors;
      a.ok(e1 && e1.length === 1, 'hit rate has no plan years');
      a.ok(!/\[/.test(e1[0]), 'worded: ' + e1[0]);
      a.ok(!!TAP.custom.definition({ measure: 'xNoSuchMeasure', by: 'entity' }).errors, 'unknown measure');
      a.ok(!!TAP.custom.definition({ measure: 'nb.arr', by: 'entity', type: 'radar' }).errors, 'radar: one measure');
      a.ok(!!TAP.custom.definition({ measure: 'nb.arr', by: 'entity', type: 'bubble' }).errors, 'bubble: no size');
      a.ok(!!TAP.custom.definition({ measure: 'ind.growthPotential', by: 'entity' }).errors, 'a per-industry figure has no region total');
    });

    T.test('X-custom-types', 'Chart types follow the compare shape (D18): grouped bars only with a second dimension', function (a) {
      a.deepEqual(TAP.custom.definition({ measure: 'nb.arr', by: 'entity' }).types, ['bar', 'dot', 'table']);
      a.deepEqual(TAP.custom.definition({ measure: 'nb.arr', by: 'industry' }).types, ['groupedBar', 'dot', 'table']);
      a.equal(TAP.custom.definition({ measure: 'nb.arr', by: 'entity' }).defaultType, 'bar', 'first type by default');
      a.equal(TAP.custom.definition({ measure: 'nb.arr', by: 'year', type: 'table' }).defaultType, 'table', 'the type asked for');
    });

    T.test('X-custom-definition', 'A definition is the same for the same choice, and is marked custom', function (a) {
      var d1 = TAP.custom.definition({ measure: 'nb.hitRate', by: 'industry', type: 'dot' });
      var d2 = TAP.custom.definition({ measure: 'nb.hitRate', by: 'industry', type: 'dot' });
      a.deepEqual(d1, d2, 'deterministic, so a running-order step can carry it (D70)');
      a.equal(d1.id, 'custom:nb.hitRate:industry');
      a.equal(d1.custom, true);
      a.equal(d1.shape, 'compare');
      a.deepEqual(d1.spec, { measure: 'nb.hitRate', by: 'industry', type: 'dot' });
      a.deepEqual(d1.breakdowns, ['industry']);
      a.equal(d1.defaultBreakdown, 'industry');
      a.deepEqual(d1.measures.map(function (m) { return m.id; }), ['nb.hitRate']);
      a.equal(d1.title, 'Hit rate by industry');
      a.deepEqual(TAP.custom.definition({ measure: 'nb.arr', by: 'entity' }).breakdowns, []);
    });

    T.test('X-custom-all-valid', 'Every offered combination gives a definition that passes validation', function (a) {
      TAP.custom.options().forEach(function (o) {
        o.by.forEach(function (by) {
          var d = TAP.custom.definition({ measure: o.measureId, by: by });
          a.ok(!d.errors && TAP.reports.validate(d).length === 0, o.measureId + ' by ' + by + (d.errors ? ': ' + d.errors.join(' ') : ''));
        });
      });
    });
  });
})(window.TAP);
