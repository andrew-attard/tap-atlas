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

  // The Build a chart section, drawn into the sandbox from a known choice.
  function builder(spec) {
    var host = T.dom.mount(), h = TAP.customBuilder.render(host, { spec: spec || null });
    return { host: host, h: h,
      measures: function () { return qsa('select[data-custom="measure"] option', host).map(function (o) { return o.value; }); },
      by: function () { return qsa('[data-control="custom-by"] button', host).map(function (b) { return b.getAttribute('data-value'); }); },
      types: function () { return qsa('[data-control="custom-type"] button', host).map(function (b) { return b.getAttribute('data-value'); }); },
      pick: function (id) {
        var sel = qs('select[data-custom="measure"]', host);
        sel.value = id;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      },
      panel: function () { return qs('.tap-panel', host); } };
  }
  function click(node) { node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
  // PRESENT builds the recording (US-3.1.3); until then the running-order case waits.
  var recordReady = !!(TAP.present && !TAP.present.__stub && TAP.present.record && !TAP.present.record.__stub);

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
      // Every measure that is not text or category is offered (ARCHITECTURE 18.3), except the two per-industry
      // figures whose dims ['year'] leave nothing to show them by (section 17.5: ind.nb.services, ind.nb.oi)
      var none = ['ind.nb.services', 'ind.nb.oi'];
      TAP.measures.list().forEach(function (id) {
        var vk = TAP.measures.meta(id).valueKind;
        if (vk === 'text' || vk === 'category') return;
        a.equal(!!byId(opts, id), none.indexOf(id) < 0, id + (none.indexOf(id) < 0 ? ' is offered' : ' is not offered'));
      });
      opts.forEach(function (o) { a.ok(o.by.length > 0, o.measureId + ' can be shown by something'); });
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
      // The probe lives in a copy of the registry for this test only, so it never reaches later tests
      var real = TAP.measures, probe = { id: 'xCustomProbe', label: 'Probe amount', short: 'Probe', unit: 'money',
        valueKind: 'amount', kind: 'IN', dims: ['year', 'channel'] };
      TAP.measures = Object.assign({}, real, {
        list: function () { return real.list().concat(['xCustomProbe']); },
        meta: function (id) { return id === 'xCustomProbe' ? Object.assign({}, probe) : real.meta(id); }
      });
      try {
        var o = byId(TAP.custom.options(), 'xCustomProbe');
        a.ok(!!o, 'listed');
        a.deepEqual(o.dims, ['year', 'channel']);
        a.deepEqual(o.by, ['entity', 'year', 'channel']);
        a.equal(o.unit, 'money');
        a.equal(o.label, 'Probe amount');
        var def = TAP.custom.definition({ measure: 'xCustomProbe', by: 'channel' });
        a.ok(!def.errors, 'a definition can be built for it');
        a.deepEqual(def.breakdowns, ['channel']);
      } finally { TAP.measures = real; }
      a.ok(!byId(TAP.custom.options(), 'xCustomProbe'), 'gone again after the test');
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

    T.test('X-custom-explain', 'About this chart says how combined figures are made, by the measure’s own rule', function (a) {
      function look(id) { return TAP.custom.definition({ measure: id, by: 'entity' }).explain.lookFor; }
      a.equal(look('nb.arr'), TAP.content.text('custom.explain.combine.sum'), 'an amount');
      a.equal(look('nb.hitRate'), TAP.content.text('custom.explain.combine.rate'), 'a rate: weighted mean');
      a.equal(look('amb.nbShare'), TAP.content.text('custom.explain.combine.ratio'), 'a share: parts added up, then divided');
      a.match(look('amb.nbShare'), /added up first, then divided/);
      a.equal(TAP.custom.definition({ measure: 'ind.growthPotential', by: 'industry' }).explain.lookFor,
        TAP.content.text('custom.explain.combine.rating'), 'a rating');
    });

    T.test('X-custom-all-valid', 'Every offered combination gives a definition that passes validation', function (a) {
      TAP.custom.options().forEach(function (o) {
        o.by.forEach(function (by) {
          var d = TAP.custom.definition({ measure: o.measureId, by: by });
          a.ok(!d.errors && TAP.reports.validate(d).length === 0, o.measureId + ' by ' + by + (d.errors ? ': ' + d.errors.join(' ') : ''));
        });
      });
    });

    /* ---------- US-3.5.1: build your own chart ---------- */

    T.test('TPV-TC-552', 'The Measure picker offers only measures from TAP.custom.options(), and every one with a choice', scene(function (a) {
      var b = builder({ measure: 'nb.arr', by: 'entity' }), opts = TAP.custom.options();
      var listed = b.measures();
      a.ok(listed.length > 10, 'measures offered');
      listed.forEach(function (id) { a.ok(!!byId(opts, id), id + ' comes from options()'); });
      // Each label once: a per-industry copy of a figure (for example ind.currentArr, "Current ARR") is not listed twice
      var labels = qsa('select[data-custom="measure"] option', b.host).map(function (o) { return o.textContent; });
      labels.forEach(function (l, i) { a.equal(labels.indexOf(l), i, 'one entry for ' + l); });
      a.ok(listed.indexOf('base.arr') >= 0 && listed.indexOf('ind.currentArr') < 0, 'the per-industry copy of current ARR adds nothing');
      a.ok(listed.indexOf('cg.segment.strategic') >= 0 && listed.indexOf('cg.seg.strategic.accounts') >= 0,
        'two figures that share a name (by industry, by risk level) are both offered, told apart');
      a.ok(listed.indexOf('nb.hitRate') >= 0 && listed.indexOf('ind.growthPotential') >= 0, 'rates and ratings are offered');
      a.ok(listed.indexOf('ind.commentary') < 0 && listed.indexOf('ind.tier') < 0, 'no text or category');
      b.h.destroy();
    }));

    T.test('TPV-TC-553', 'The By picker offers only what the measure allows, and follows a change of measure', scene(function (a) {
      var b = builder({ measure: 'nb.arr', by: 'entity' });
      a.deepEqual(b.by(), ['entity', 'year', 'industry'], 'new business ARR: regions, plan year, industry');
      b.pick('nb.hitRate');
      a.deepEqual(b.by(), ['entity', 'industry'], 'hit rate: regions, industry');
      b.pick('ind.growthPotential');
      a.deepEqual(b.by(), ['industry'], 'a per-industry rating: industry only');
      a.equal(b.h.spec().by, 'industry', 'the choice moved to one the measure allows');
      b.h.destroy();
    }));

    T.test('TPV-TC-554', 'Chart types follow the shape rules (D18) for every combination, with the table always there', function (a) {
      var compare = TAP.reports.SHAPE_TYPES.compare;
      TAP.custom.options().forEach(function (o) {
        o.by.forEach(function (by) {
          var list = TAP.custom.definition({ measure: o.measureId, by: by }).types;
          a.ok(list.indexOf('table') >= 0, o.measureId + ' by ' + by + ': table');
          list.forEach(function (x) { a.ok(compare.indexOf(x) >= 0, x + ' suits the compare shape'); });
          a.equal(list.indexOf('groupedBar') >= 0, by !== 'entity', 'grouped bars only with a second dimension');
          a.ok(list.indexOf('bubble') < 0, 'no bubble without a size measure');
        });
      });
    });

    T.test('TPV-TC-554', 'The Chart type picker shows the types for the choice, and follows it', scene(function (a) {
      var b = builder({ measure: 'nb.arr', by: 'entity' });
      a.deepEqual(b.types(), ['bar', 'dot', 'table']);
      click(qs('[data-control="custom-by"] button[data-value="year"]', b.host));
      a.deepEqual(b.types(), ['groupedBar', 'dot', 'table']);
      click(qs('[data-control="custom-type"] button[data-value="dot"]', b.host));
      a.deepEqual(b.h.spec(), { measure: 'nb.arr', by: 'year', type: 'dot' });
      b.h.destroy();
    }));

    T.test('TPV-TC-555', 'One vs the rest: the entities follow the scope and the rest equals the hand figure', scene(function (a) {
      var def = TAP.custom.definition({ measure: 'nb.arr', by: 'entity' });
      var ds = TAP.prepare.run(def, { cmp: cmpOne('alpha', 'average') });
      a.deepEqual(ds.entities.map(function (e) { return e.id; }), ['alpha', 'rest']);
      a.equal(rowOf(ds, 'alpha').cells['nb.arr'].v, EX().region.alpha['nb.arr'], 'Region A: 2255');
      a.near(rowOf(ds, 'rest').cells['nb.arr'].v, EX().combined.restOfAlphaAverage['nb.arr'], 1e-6, 'average of the other three: 7150 / 3');
      var tot = TAP.prepare.run(def, { cmp: cmpOne('alpha', 'total') });
      a.equal(rowOf(tot, 'rest').cells['nb.arr'].v, EX().combined.restOfAlphaTotal['nb.arr'], 'as a total: 7150');
    }));

    T.test('TPV-TC-556', 'Every cell carries its source, and a blank region reads "not provided", never zero', scene(function (a) {
      var def = TAP.custom.definition({ measure: 'cg.arr', by: 'entity' });
      var ds = TAP.prepare.run(def, { cmp: { mode: 'all', focus: null, second: null, set: [], restAs: 'combined', restAgg: 'average' } });
      ds.rows.forEach(function (r) { a.ok(!!r.cells['cg.arr'].src, r.entityId + ' has a source'); });
      a.equal(rowOf(ds, 'alpha').cells['cg.arr'].src.section, 'customerGrowth');
      var c = rowOf(ds, 'charlie').cells['cg.arr'];
      a.equal(c.state, 'notProvided', 'Region C has no customer growth');
      a.equal(c.v, null, 'not zero');
      a.equal(TAP.format.cell(c, { unit: 'money' }), TAP.format.cell({ v: null, state: 'notProvided' }, { unit: 'money' }));
      a.ok(ds.missing.length === 1, 'named as missing');
    }));

    T.test('TPV-TC-558', 'Only the custom chart carries the "Custom chart" badge', scene(function (a, s) {
      var mine = s.panel(TAP.custom.definition({ measure: 'nb.hitRate', by: 'industry' }));
      var preset = s.panel('ov-ambition');
      var badge = qs('[data-custom-chart]', mine.el);
      a.ok(!!badge, 'the custom chart has the badge');
      a.equal(badge.textContent.trim(), TAP.content.text('custom.badge'));
      a.equal(TAP.content.text('custom.badge'), 'Custom chart');
      a.ok(!qs('[data-custom-chart]', preset.el), 'the preset report has none');
    }));

    T.test('X-custom-builder-panel', 'The section draws a panel with the custom definition, and redraws on a new choice', scene(function (a) {
      var b = builder({ measure: 'nb.hitRate', by: 'industry', type: 'dot' });
      a.equal(b.panel().getAttribute('data-report'), 'custom:nb.hitRate:industry');
      a.ok(!!qs('[data-custom-chart]', b.panel()), 'with its badge');
      a.match(qs('.tap-panel__title', b.panel()).textContent, /Hit rate by industry/);
      b.pick('nb.arr');
      a.equal(b.panel().getAttribute('data-report'), 'custom:nb.arr:industry', 'the same dimension kept when allowed');
      a.equal(qsa('.tap-panel', b.host).length, 1, 'one panel at a time');
      b.h.destroy();
    }));

    T.test('X-custom-builder-type-memory', 'A chart type chosen in the panel follows into the picker, and is not kept in the browser', scene(function (a) {
      var b = builder({ measure: 'nb.arr', by: 'entity', type: 'bar' });
      click(qs('.tap-panel [data-action="type"]', b.host));
      click(qs('.tap-panel [data-type="dot"]', b.host));
      a.equal(b.h.spec().type, 'dot', 'the picker follows');
      a.equal(qs('[data-control="custom-type"] [aria-pressed="true"]', b.host).getAttribute('data-value'), 'dot');
      a.equal(TAP.storage.get('chart:custom:nb.arr:entity', null), null, 'nothing remembered');
      b.h.destroy();
    }));

    T.test('X-custom-guide', 'Build a chart is a Guide section, not a menu entry', function (a) {
      var x = (TAP.guideExtras || []).filter(function (g) { return g.id === 'buildChart'; })[0];
      a.ok(!!x, 'registered as a Guide extra');
      a.equal(x.title, TAP.content.text('custom.heading'));
      a.ok(TAP.views.order().indexOf('buildChart') < 0, 'the number keys do not shift');
    });

    (recordReady ? T.test : T.skip)('TPV-TC-559', 'Add to running order records the custom chart, and the step passes the check',
      recordReady ? scene(function (a, s) {
        TAP.present.clearRecorded();
        try {
          var p = s.panel(TAP.custom.definition({ measure: 'nb.hitRate', by: 'industry', type: 'dot' }));
          click(qs('[data-action="more"]', p.el));
          click(qs('[data-action="record"]', p.el));
          var step = TAP.present.recorded()[0];
          a.deepEqual(step.custom, { measure: 'nb.hitRate', by: 'industry', type: 'dot' });
          a.equal(TAP.present.check([step]).skipped.length, 0, 'passes the step check');
        } finally { TAP.present.clearRecorded(); }
      }) : 'Waits for the running-order recording (US-3.1.3, PRESENT).');
  });
})(window.TAP);
