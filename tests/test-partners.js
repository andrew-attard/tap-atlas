/*
 * File: tests/test-partners.js
 * Purpose: Tests for the Partners view: the view itself (US-2.3.1) and its reports.
 * Provides: test cases TPV-TC-411 to TPV-TC-417 and X-pt-*
 * Depends on: tests/harness.js, tests/test-setup.js, tests/test-customers.js (window.CGP_T), the app scripts and fixtures
 * Used by: tests.html
 * Owner: CGP stream
 */
(function (TAP) {
  'use strict';

  var H = window.CGP_T;

  T.suite('partners', function () {
    /* ---------- US-2.3.1 the view ---------- */

    H.viewChecks({ view: 'partners', menu: 'Partners', title: 'Which partners carry each plan?',
      after: 'Customer growth', afterId: 'customers', emptyRegion: 'charlie', needs: [194, 196, 206, 208],
      reports: ['pt-reliance', 'pt-capacity', 'pt-list'],
      ids: { menu: 'TPV-TC-411', headline: 'TPV-TC-413', layout: 'X-pt-layout', modes: 'TPV-TC-414', empty: 'TPV-TC-416', explain: 'TPV-TC-417', guide: 'X-pt-guide' } });

    /* ---------- US-2.3.2 reliance on partners and alliances ---------- */

    var CHANNELS = ['direct', 'partner', 'allianceA', 'allianceB'];
    var TYPES = { 'rc.all.arr': 'arr', 'rc.all.services': 'services', 'rc.all.oi': 'oi' };
    function row(res, id) { return res.table.rows.filter(function (r) { return r.entityId === id; })[0]; }
    function num(c) { return c && c.state === 'value' ? c.v : 0; }

    H.when([196], 'TPV-TC-418', 'Order intake by region and channel from the recap, both motions, per the hand calculation', function (a) {
      // Mini recap (all plan year 1, new business ARR): alpha direct 450 + partner 250 = 700; bravo direct 700;
      // delta direct 150; charlie has no recap, so not provided
      var res = H.build('pt-reliance', { mode: 'all' }, { type: 'table' });
      var want = { alpha: { direct: 450, partner: 250, total: 700 }, bravo: { direct: 700, total: 700 }, delta: { direct: 150, total: 150 } };
      Object.keys(want).forEach(function (r) {
        a.near(row(res, r).cells['rc.all.arr'].v, want[r].total, 1e-9, r + ' total');
        a.near(num(row(res, r).cells['rc.all.arr.direct']), want[r].direct, 1e-9, r + ' direct');
        a.near(num(row(res, r).cells['rc.all.arr.partner']), want[r].partner || 0, 1e-9, r + ' partner');
        a.near(num(row(res, r).cells['rc.all.arr.allianceA']) + num(row(res, r).cells['rc.all.arr.allianceB']), 0, 1e-9, r + ' alliances');
      });
      a.equal(row(res, 'charlie').cells['rc.all.arr'].state, 'notProvided', 'charlie is not provided');
      var cg = TAP.measures.get('rc.cg.arr'), nb = TAP.measures.get('rc.nb.arr');
      a.near(num(nb('alpha', {})) + num(cg('alpha', {})), 700, 1e-9, 'both motions are in the total');
    });

    T.test('TPV-TC-420', 'Chart types: 100% stacked bar by default, also stacked bar and table', function (a) {
      var def = TAP.reports.get('pt-reliance');
      a.equal(def.defaultType, 'stacked100');
      [1, 4, 7].forEach(function (n) { a.deepEqual(TAP.shapes.types(def, n), ['stacked100', 'stackedBar', 'table'], n + ' regions'); });
      a.deepEqual(def.parts['rc.all.arr'], CHANNELS.map(function (c) { return 'rc.all.arr.' + c; }), 'the four channels, in lookup order');
    });

    H.when([196], 'TPV-TC-421', 'Measure switch: ARR, Services, Total order intake; order intake is ARR plus services', function (a) {
      var def = TAP.reports.get('pt-reliance');
      a.deepEqual(def.measures.map(function (m) { return m.label; }), ['ARR', 'Services', 'Total order intake']);
      H.sample();
      var get = function (id) { return TAP.measures.get(id); };
      TAP.data.regions().forEach(function (reg) {
        var r = reg.id;
        a.near(num(get('rc.all.oi')(r, {})), num(get('rc.all.arr')(r, {})) + num(get('rc.all.services')(r, {})), 1e-6, r + ' total');
        CHANNELS.forEach(function (c) {
          a.near(num(get('rc.all.oi.' + c)(r, {})), num(get('rc.all.arr.' + c)(r, {})) + num(get('rc.all.services.' + c)(r, {})), 1e-6, r + ' ' + c);
        });
      });
    });

    H.when([196], 'TPV-TC-422', 'Broken down by motion or by year, the parts add up to each region’s total', function (a) {
      H.sample();
      var def = TAP.reports.get('pt-reliance');
      a.deepEqual(def.breakdowns, ['motion', 'year']);
      Object.keys(TYPES).forEach(function (m) {
        var fn = TAP.measures.get(m);
        a.ok(TAP.measures.meta(m).dims.indexOf('motion') >= 0 && TAP.measures.meta(m).dims.indexOf('year') >= 0, m + ' breaks down by motion and year');
        TAP.data.regions().forEach(function (reg) {
          var total = num(fn(reg.id, {}));
          a.near(num(fn(reg.id, { motion: 'nb' })) + num(fn(reg.id, { motion: 'cg' })), total, 1e-6, reg.id + ' ' + m + ' by motion');
          a.near([1, 2, 3].reduce(function (s, y) { return s + num(fn(reg.id, { year: y })); }, 0), total, 1e-6, reg.id + ' ' + m + ' by year');
        });
      });
      var res = H.build('pt-reliance', { mode: 'all' }, { breakdown: 'year', type: 'table' });
      a.equal(res.error, null, 'builds broken down by year');
    });
  });
})(window.TAP);
