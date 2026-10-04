/*
 * File: tests/test-insights-p2.js
 * Purpose: Tests for the Phase 2 planted cases in the sample data, the Phase 2 insight rules and recurring themes.
 * Provides: test cases for the INSIGHTS2 stream: TPV-TC-304, 307, 308 (US-2.7.4, sample data), X-insights2-*
 * Depends on: tests/harness.js, tests/test-setup.js, tests/test-insights.js (T_INSIGHTS), the app scripts,
 *             data/sample-plan-data.js (window.PLAN_DATA), tests/fixtures/sample-expected.js (window.SAMPLE_EXPECT)
 * Used by: tests.html
 * Owner: INSIGHTS2 stream
 *
 * Planted figures come from docs/PLANTED-CASES.md (Q01 to Q06) and SAMPLE_EXPECT, or are worked out here from the
 * raw rows; never from the rules' own output. Tests that need a part another stream is still building are skipped,
 * naming that part, until it lands.
 */
(function (TAP) {
  'use strict';

  var P = window.PLAN_DATA, X = window.SAMPLE_EXPECT;
  var CH = ['direct', 'partner', 'allianceA', 'allianceB'];

  function sum(list) { return list.reduce(function (s, v) { return s + v; }, 0); }
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function reg(id) { return P.regions.filter(function (r) { return r.id === id; })[0]; }
  function stubbed(what) { return TAP.stub.list().some(function (s) { return s.what === what; }); }
  // A test that needs parts still being built is listed as skipped, naming what it waits for.
  function when(deps, id, title, fn) {
    var waiting = deps.filter(stubbed);
    if (waiting.length) T.skip(id, title, 'waits for ' + waiting.join(', '));
    else T.test(id, title, fn);
  }
  function recapShare(r, ch) {
    var all = sum(r.recap.map(function (x) { return x.value; }));
    return sum(r.recap.filter(function (x) { return x.channel === ch; }).map(function (x) { return x.value; })) / all;
  }
  function nbArr(r) { return sum(r.newBusiness.filter(function (x) { return x.arrPotential.every(num); }).map(function (x) { return sum(x.arrPotential); })); }
  function cgArr(r) { return sum(r.customerGrowth.accounts.map(function (a) { return sum(a.incrementalArr); })); }
  function key(s) { return String(s).trim().toLowerCase().replace(/\s+/g, ' '); }

  T.suite('insights-p2', function () {
    /* ---------- US-2.7.4: the Phase 2 planted cases (docs/PLANTED-CASES.md) ---------- */

    T.test('TPV-TC-304', 'Q01 and Q02: the channel and plan make-up cases are in the sample data as listed', function (a) {
      // Every row with figures; G1's row with a blank hit rate has no potential, so no channel
      reg('seu').newBusiness.filter(function (row) { return num(row.hitRate); }).forEach(function (row) {
        a.deepEqual(CH.map(function (c) { return row.channelSplit[c]; }), [0.2, 0.65, 0.1, 0.05], 'Southern Europe row ' + row.sourceRow + ' split');
      });
      var seu = recapShare(reg('seu'), 'partner');
      a.near(seu, X.q01.share, 1e-6, 'partner share from the recap rows');
      a.near(seu, 0.4, 0.005, 'about 40% through partners');
      var rest = P.regions.filter(function (r) { return r.id !== 'seu'; });
      var others = sum(rest.map(function (r) { return recapShare(r, 'partner') * sum(r.recap.map(function (x) { return x.value; })); })) /
        sum(rest.map(function (r) { return sum(r.recap.map(function (x) { return x.value; })); }));
      a.near(others, X.q01.others, 1e-6, 'the others combined');
      a.ok(seu - others >= 0.2, 'gap of at least 20 points');
      a.deepEqual(X.q01.flagged, [{ region: 'seu', channel: 'partner' }], 'no other region is 20 points from the others on any channel');
      var apac = reg('apac'), share = nbArr(apac) / (nbArr(apac) + cgArr(apac));
      a.near(share, X.q02.share, 1e-6, 'Asia Pacific new business share of ARR ambition');
      a.near(share, 0.36, 0.005, 'about 36%');
      a.ok(X.q02.others - share >= 0.2, 'at least 20 points below the others (' + X.q02.others + ')');
      a.equal(X.q02.shares.ceu, null, 'Central Europe (no customer growth) is not counted');
      a.deepEqual(X.q02.flagged, ['apac'], 'no other region is 20 points from the others');
    });

    T.test('TPV-TC-304', 'Q03 and Q04: one sub-industry and one partner are named by two regions', function (a) {
      var names = function (id) { return reg(id).newBusiness.map(function (x) { return x.subVertical; }); };
      a.ok(names('na').indexOf('Acute care hospitals') >= 0, 'North America');
      a.ok(names('apac').indexOf('Acute care Hospitals') >= 0, 'Asia Pacific, with a capital H');
      var by = {};
      P.regions.forEach(function (r) {
        r.newBusiness.forEach(function (x) { var k = key(x.subVertical); by[k] = by[k] || []; if (by[k].indexOf(r.id) < 0) by[k].push(r.id); });
      });
      a.deepEqual(Object.keys(by).filter(function (k) { return by[k].length > 1; }), ['acute care hospitals'], 'the only shared sub-industry');
      var pt = {};
      P.regions.forEach(function (r) { r.partners.forEach(function (p) { pt[key(p.name)] = (pt[key(p.name)] || []).concat([r.id]); }); });
      a.deepEqual(Object.keys(pt).filter(function (k) { return pt[k].length > 1; }), ['donvocombe systems'], 'the only shared partner');
      a.deepEqual(pt['donvocombe systems'], ['na', 'latam']);
    });

    T.test('TPV-TC-304', 'Q05 and Q06: one partner well above the average per FTE, and a theme in two regions', function (a) {
      var list = [];
      P.regions.forEach(function (r) {
        r.partners.forEach(function (p) {
          var fte = sum([p.fteSales, p.fteConsultants].filter(num));
          if (fte > 0) list.push({ r: r.id, p: p, fte: fte, oi: sum(p.arr.concat(p.services).filter(num)) });
        });
      });
      a.ok(list.length >= 5, 'at least 5 partners with FTE');
      var avg = sum(list.map(function (x) { return x.oi; })) / sum(list.map(function (x) { return x.fte; }));
      a.near(avg, X.q05.average, 1e-6, 'average across partners: total order intake / total FTE');
      var high = list.filter(function (x) { return x.oi / x.fte >= 2 * avg; });
      a.equal(high.length, 1, 'one partner at 2x or more');
      a.equal(high[0].p.name, 'Horviby Solutions Partner');
      a.equal(high[0].r, 'mea');
      a.near(high[0].oi / high[0].fte / avg, X.q05.flagged[0].multiple, 1e-6, 'its multiple');
      a.near(high[0].oi / high[0].fte / avg, 3, 0.25, 'about 3x');
      var pricing = P.regions.filter(function (r) {
        return r.newBusiness.some(function (x) { return x.successFactors === 'Competitive pricing for multi-site deals'; });
      }).map(function (r) { return r.id; });
      a.deepEqual(pricing, ['latam', 'ceu'], 'the pricing theme in two regions');
    });

    when(['TAP.themes'], 'TPV-TC-307', 'The theme keyword rules find at least two themes in at least three regions each', function (a) {
      TAP.data.load(JSON.parse(JSON.stringify(P)));
      var found = TAP.themes.all().filter(function (t) { return t.regions.length >= 3; });
      a.ok(found.length >= 2, found.length + ' themes in three regions or more');
    });

    T.test('TPV-TC-308', 'The contract check passes on the Phase 1 mini fixture and on the Phase 2 sample data', function (a) {
      var mini = TAP.check.run(T_FIXTURE('mini')), sample = TAP.check.run(JSON.parse(JSON.stringify(P)));
      a.deepEqual(mini.errors, [], 'mini fixture: no errors');
      a.deepEqual(sample.errors, [], 'sample data: no errors');
      a.deepEqual(sample.warnings.map(function (w) { return w.path; }), ['regions[4].customerGrowth.accounts'],
        'sample data: only the planted empty section (G2) is a warning');
    });

    when(['Phase 2 measures (js/engine/measures-p2.js)'], 'X-insights2-planted-measures',
      'The planted Q01 and Q02 figures are what the Phase 2 measures give', function (a) {
        TAP.data.load(JSON.parse(JSON.stringify(P)));
        var rest = function (id, ids) { return { kind: 'combined', regionIds: ids.filter(function (r) { return r !== id; }), how: 'average' }; };
        var all = X.regions, both = all.filter(function (r) { return X.q02.shares[r] !== null; });
        a.near(TAP.measures.get('rc.share.partner')('seu', { year: null }).v, X.q01.share, 1e-6, 'rc.share.partner, Southern Europe');
        a.near(TAP.measures.combined('rc.share.partner', rest('seu', all), { year: null }).v, X.q01.others, 1e-6, 'the others');
        a.near(TAP.measures.get('amb.nbShare')('apac', { year: null }).v, X.q02.share, 1e-6, 'amb.nbShare, Asia Pacific');
        a.near(TAP.measures.combined('amb.nbShare', rest('apac', both), { year: null }).v, X.q02.others, 1e-6, 'the others');
      });
  });
})(window.TAP);
