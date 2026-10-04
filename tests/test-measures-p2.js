/*
 * File: tests/test-measures-p2.js
 * Purpose: Tests for Phase 2 measures and breakdowns, checked against the hand calculations in
 *          tests/fixtures/mini-p2-expected.js (never against the measures' own output).
 * Provides: test cases TPV-TC-299 to 302, X-measures-p2-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: ENGINE2 stream
 */
(function (TAP) {
  'use strict';

  var X = window.TEST_EXPECT.miniP2;
  var TOL = 1e-6;
  var CH = ['direct', 'partner', 'allianceA', 'allianceB'], SEGS = ['strategic', 'growth', 'core', 'scaled'];

  // Every id in ARCHITECTURE 17.5
  function catalogue() {
    var ids = [];
    ['nb', 'cg', 'all'].forEach(function (m) {
      ['arr', 'services', 'oi'].forEach(function (t) {
        ids.push('rc.' + m + '.' + t);
        CH.forEach(function (c) { ids.push('rc.' + m + '.' + t + '.' + c); });
      });
    });
    CH.forEach(function (c) { ids.push('rc.share.' + c); });
    ['arr', 'services', 'oi'].forEach(function (t) { ids.push('nb.' + t + '.tier1', 'nb.' + t + '.tier2'); });
    ids.push('nb.oi', 'ind.nb.services', 'ind.nb.oi', 'cg.accounts', 'cg.currentArr', 'cg.oi3');
    SEGS.forEach(function (s) {
      ['accounts', 'arr', 'oi'].forEach(function (v) { ids.push('cg.seg.' + s + '.' + v); });
    });
    ['all'].concat(SEGS).forEach(function (s) { ids.push('cg.growth.' + s); });
    return ids.concat(['cg.multiplierAccounts', 'cg.top3Share', 'cg.riskShare', 'pt.count', 'pt.fte', 'pt.fteSales',
      'pt.fteConsultants', 'pt.arr', 'pt.services', 'pt.oiPerFte', 'amb.nbShare']);
  }

  function load() { TAP.data.load(window.T_FIXTURE('miniP2')); }
  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c); }
  function org() { return TAP.scope.entities(cmp({ mode: 'org' }))[0]; }
  function rest(focus, how) { return TAP.scope.entities(cmp({ mode: 'one', focus: focus, restAgg: how }))[1]; }
  function parse(key) {
    var y = /^(.*)\.y(\d)$/.exec(key);
    return { id: y ? y[1] : key, year: y ? +y[2] : null };
  }

  // Checks a cell against a hand-calculated value: a number, null (not provided) or 'na' (not applicable).
  function expectCell(a, c, exp, what) {
    a.ok(c && c.src, what + ' returns a cell with a source');
    if (exp === null) { a.equal(c.state, 'notProvided', what + ' is not provided'); a.equal(c.v, null); return; }
    if (exp === 'na') { a.equal(c.state, 'notApplicable', what + ' is not applicable'); return; }
    a.equal(c.state, 'value', what + ' has a value');
    a.near(c.v, exp, TOL, what);
  }

  // Region figures for the ids matching a pattern
  function checkRegions(a, re) {
    var n = 0;
    Object.keys(X.region).forEach(function (r) {
      Object.keys(X.region[r]).forEach(function (key) {
        var k = parse(key);
        if (!re.test(k.id)) return;
        var fn = TAP.measures.get(k.id);
        a.ok(fn, k.id + ' is defined');
        expectCell(a, fn(r, { year: k.year }), X.region[r][key], r + ' ' + key);
        n++;
      });
    });
    a.ok(n > 0, 'some figures were checked');
  }

  function checkCombined(a, re) {
    var ents = { orgTotal: org(), restOfAlphaAverage: rest('alpha', 'average') };
    Object.keys(X.combined).forEach(function (name) {
      Object.keys(X.combined[name]).forEach(function (key) {
        var k = parse(key);
        if (!re.test(k.id)) return;
        expectCell(a, TAP.measures.combined(k.id, ents[name], { year: k.year }), X.combined[name][key], name + ' ' + key);
      });
    });
  }

  T.suite('measures-p2', function () {
    T.test('TPV-TC-299', 'Every Phase 2 measure is in the registry with label, unit, value kind, kind and source', function (a) {
      load();
      catalogue().forEach(function (id) {
        var m = TAP.measures.meta(id);
        a.ok(m, id + ' is defined');
        a.ok(m.label && m.label.charAt(0) !== '[', id + ' has a label');
        a.ok(m.short && m.short.charAt(0) !== '[', id + ' has a short label');
        a.ok(['money', 'pct', 'count'].indexOf(m.unit) >= 0, id + ' unit');
        a.ok(['amount', 'rate', 'count'].indexOf(m.valueKind) >= 0, id + ' valueKind');
        a.ok(['IN', 'PRE', 'DER', 'APP'].indexOf(m.kind) >= 0, id + ' kind');
        a.ok(Array.isArray(m.dims), id + ' dims');
        if (m.valueKind === 'rate') a.equal(m.combine, 'ratioOfSums', id + ' is combined from summed parts');
        var c = TAP.measures.get(id)('alpha', { year: null, industryId: 'ind1' });
        a.ok(c && c.src && c.src.regionId === 'alpha', id + ' carries its source');
        a.equal(c.kind, m.kind, id + ' cell kind matches its meta');
      });
    });

    T.test('TPV-TC-300', 'New business by channel and order intake by channel and motion equal the hand calculations', function (a) {
      load();
      checkRegions(a, /^rc\./);
      checkCombined(a, /^rc\./);
      X.context.filter(function (x) { return /^rc\./.test(x.id); }).forEach(function (x) {
        expectCell(a, TAP.measures.get(x.id)(x.region, x.ctx), x.v, x.region + ' ' + x.id + ' ' + JSON.stringify(x.ctx));
      });
    });

    T.test('TPV-TC-300', 'A share by channel is combined from the summed parts, never by averaging shares', function (a) {
      load();
      var c = TAP.measures.combined('rc.share.direct', org(), {});
      a.near(c.v, 5595 / 10235, TOL);
      a.equal(c.src.how, 'ratio');
      a.deepEqual(c.src.excluded, ['charlie'], 'Region C has no recap and is named');
      a.match(TAP.agg.describe(c), /3 regions/);
      a.ok(TAP.agg.describe(c).indexOf('[') < 0, 'the combined label reads as words');
    });

    T.test('TPV-TC-301', 'Customer growth by segment, top 3 share and at-risk share equal the hand calculations', function (a) {
      load();
      checkRegions(a, /^cg\./);
      checkCombined(a, /^cg\./);
      X.context.filter(function (x) { return /^cg\./.test(x.id); }).forEach(function (x) {
        expectCell(a, TAP.measures.get(x.id)(x.region, x.ctx), x.v, x.region + ' ' + x.id + ' ' + JSON.stringify(x.ctx));
      });
    });

    T.test('TPV-TC-301', 'The organization top 3 is the top 3 accounts across the scope (D60)', function (a) {
      load();
      var c = TAP.measures.combined('cg.top3Share', org(), {});
      a.near(c.v, 438 / 738, TOL, 'd1 168 + a4 150 + b1 120 of 738');
      a.ok(Math.abs(c.v - (0.9375 + 1 + 1) / 3) > 0.1, 'not the mean of the regions’ shares');
    });

    T.test('TPV-TC-302', 'Partner FTE, ARR, services and order intake per FTE equal the hand calculations', function (a) {
      load();
      checkRegions(a, /^pt\./);
      checkCombined(a, /^pt\./);
      a.equal(TAP.measures.meta('pt.oiPerFte').kind, 'APP', 'order intake per FTE is calculated by this app');
      a.equal(TAP.measures.get('pt.oiPerFte')('alpha', {}).kind, 'APP');
      a.equal(TAP.format.kind(TAP.measures.get('pt.oiPerFte')('alpha', {}).kind).text,
        TAP.format.kind('APP').text, 'its cell reads as calculated by this app');
    });

    T.test('X-measures-p2-nb', 'New business order intake, by tier and by industry, equals the hand calculations', function (a) {
      load();
      checkRegions(a, /^nb\./);
      checkCombined(a, /^nb\./);
      X.context.filter(function (x) { return /^(nb|ind)\./.test(x.id); }).forEach(function (x) {
        expectCell(a, TAP.measures.get(x.id)(x.region, x.ctx), x.v, x.region + ' ' + x.id + ' ' + JSON.stringify(x.ctx));
      });
    });

    T.test('X-measures-p2-share', 'The new business share of the ambition equals the hand calculations', function (a) {
      load();
      checkRegions(a, /^amb\./);
      checkCombined(a, /^amb\./);
    });

    T.test('X-measures-p2-source', 'A recap figure for one channel and year names its own cell', function (a) {
      load();
      var c = TAP.measures.get('rc.nb.arr.direct')('alpha', { year: 1 });
      a.equal(c.v, 400);
      a.equal(c.src.section, 'recap');
      a.equal(c.src.cell, 'E5');
      a.equal(TAP.sources.address(c.src).text, 'Region A plan.xlsx › 4. Partner › E5');
      var t = TAP.measures.get('cg.top3Share')('alpha', {});
      a.deepEqual(t.src.rows.slice().sort(), [10, 11, 13], 'the top 3 accounts are the rows it names (a1, a2, a4)');
    });

    T.test('X-measures-p2-partial', 'A blank inside a sum, a share or a ratio marks the figure partly provided', function (a) {
      load();
      Object.keys(X.partial).forEach(function (name) {
        ['yes', 'no'].forEach(function (want) {
          X.partial[name][want].forEach(function (key) {
            var k = parse(key);
            var c = name === 'orgTotal' ? TAP.measures.combined(k.id, org(), { year: k.year }) : TAP.measures.get(k.id)(name, { year: k.year });
            a.equal(c.state, 'value', name + ' ' + key + ' has a value');
            a.equal(!!c.partial, want === 'yes', name + ' ' + key + (want === 'yes' ? ' is' : ' is not') + ' partly provided');
            if (c.partial) a.ok(c.note && c.note.charAt(0) !== '[', name + ' ' + key + ' says why');
          });
        });
      });
      a.match(TAP.measures.get('nb.arr.tier2')('alpha', {}).note, /Education/, 'the tier names the industry not provided');
    });

    T.test('X-measures-p2-tier', 'A tier with no industry in Market Coverage is not applicable (D48)', function (a) {
      var p = window.T_FIXTURE('miniP2'), c = p.regions[2];
      c.marketCoverage[3].tier = 3;                        // Region C's ind4 moves to Tier 3 ...
      c.newBusiness = c.newBusiness.slice(0, 1);           // ... and loses its new business row
      TAP.data.load(p);
      a.equal(TAP.measures.get('nb.arr.tier2')('charlie', {}).state, 'notApplicable', 'no Tier 2 industry left');
      a.equal(TAP.measures.combined('nb.arr.tier2', org(), {}).src.notApplicable.indexOf('charlie') >= 0, true, 'left out quietly');
    });

    T.test('X-measures-p2-fixture', 'The miniP2 fixture passes the contract check, and mini is unchanged', function (a) {
      var res = TAP.data.load(window.T_FIXTURE('miniP2'));
      a.ok(res.ok, 'miniP2 loads');
      a.deepEqual(res.errors, [], 'no contract errors');
      TAP.data.load(window.T_FIXTURE('mini'));
      a.equal(TAP.measures.get('cg.arr')('alpha', {}).v, window.TEST_EXPECT.mini.region.alpha['cg.arr'], 'the Phase 1 figure is unchanged');
    });
  });
})(window.TAP);
