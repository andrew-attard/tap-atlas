/*
 * File: tests/test-measures-p2.js
 * Purpose: Tests for Phase 2 measures and breakdowns, checked against the hand calculations in
 *          tests/fixtures/mini-p2-expected.js (never against the measures' own output).
 * Provides: test cases TPV-TC-299 to 302, X-measures-p2-*, X-review-DE-9
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

    // Review DE-9, D77: one planned decline pushed the top 3 share over 100% and the risk share below zero.
    T.test('X-review-DE-9', 'Exposure shares are taken over planned increases; declines are named in the note', function (a) {
      var p = window.T_FIXTURE('mini'), acc = p.regions[0].customerGrowth.accounts;
      acc[0].incrementalArr = [50, 0, 0];    // a1, no risk
      acc[1].incrementalArr = [30, 0, 0];    // a2, high risk
      acc[2].incrementalArr = [20, 0, 0];    // a3, no risk
      acc[3].incrementalArr = [-40, 0, 0];   // a4, medium risk, a planned decline
      TAP.data.load(p);
      // Increases only: 50 + 30 + 20 = 100. Top 3: 100 / 100 = 100% (net, 100 / 60 was 167%)
      var t = TAP.measures.get('cg.top3Share')('alpha', {});
      a.near(t.v, 1, TOL);
      // At risk: a2's 30 / 100 = 30%; a4's decline is left out (net, (30 - 40) / 60 was -17%)
      var r = TAP.measures.get('cg.riskShare')('alpha', {});
      a.near(r.v, 0.3, TOL);
      a.match(r.note || '', /Fictional Account A4/, 'the note names the account with a decline');
      a.ok(!r.partial, 'a decline is not a blank: the figure is not partly provided');
      // Organization, pooled increases: A 50, 30, 20; B 120, 30; D 168, 100 (and d3's 0) -> 518.
      //   Top 3: 168 + 120 + 100 = 388 / 518; at risk: a2 30 + b2 30 + d2 100 = 160 / 518
      a.near(TAP.measures.combined('cg.top3Share', org(), {}).v, 388 / 518, TOL);
      var o = TAP.measures.combined('cg.riskShare', org(), {});
      a.near(o.v, 160 / 518, TOL);
      a.match(o.note || '', /Fictional Account A4/, 'the combined figure names it too');
      // The note reaches the chart: under it, and in the tooltip
      var d = TAP.reports.get('cg-exposure'), k = cmp({ mode: 'all' });
      var res = TAP.builders.get(d.builder)({ def: d, type: d.defaultType, cmp: k, entities: TAP.scope.entities(k), measureId: 'cg.riskShare' });
      a.ok(res.notes.some(function (n) { return /Fictional Account A4/.test(n); }), 'a note under the chart: ' + res.notes.join(' | '));
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

    T.test('X-measures-p2-channel-names', 'Channel measures are named from the channel lookup, read when asked', function (a) {
      var p = window.T_FIXTURE('miniP2');
      p.lookups.channels[0].name = 'Own sales force';
      TAP.data.load(p);
      a.equal(TAP.measures.meta('rc.nb.arr.direct').label, 'New business ARR, Own sales force');
      a.equal(TAP.measures.meta('rc.nb.arr.direct').short, 'Own sales force');
      a.equal(TAP.measures.meta('rc.all.oi.direct').label, 'Order intake, Own sales force');
      a.equal(TAP.measures.meta('rc.share.direct').short, 'Own sales force share');
      a.equal(TAP.measures.meta('rc.share.direct').label, 'Share of order intake through Own sales force');
      a.equal(TAP.measures.meta('rc.nb.arr.partner').short, 'Partner', 'the other channels keep their lookup names');
      TAP.data.lookups().channels.pop();   // no allianceB in the lookup (changed after loading): the fixed words stand
      a.equal(TAP.measures.meta('rc.nb.arr.allianceB').short, 'Alliance B');
      a.equal(TAP.measures.meta('rc.nb.arr.allianceB').label, 'New business ARR, alliance b');
    });

    T.test('X-measures-p2-channel-motion', 'Both-motion channel parts split by motion and add up (hand figures)', function (a) {
      load();
      a.ok(TAP.measures.meta('rc.all.oi.direct').dims.indexOf('motion') >= 0, 'rc.all.<t>.<channel> lists motion');
      a.ok(TAP.measures.meta('rc.nb.oi.direct').dims.indexOf('motion') < 0, 'a one-motion part does not');
      var d = TAP.measures.get('rc.all.oi.direct');
      // Region A direct: new business ARR 400 + 400 + 500, services 80 + 80 + 100; customer growth 100 + 50 + 50, 20 + 10 + 10
      a.equal(d('alpha', { motion: 'nb' }).v, 1560);
      a.equal(d('alpha', { motion: 'cg' }).v, 240);
      a.equal(d('alpha', {}).v, 1800, '1560 + 240');
      // Organization: new business A 1560 + B 2200 + D 1125; customer growth A 240 + B 110 + D 360
      a.equal(TAP.measures.combined('rc.all.oi.direct', org(), { motion: 'nb' }).v, 4885);
      a.equal(TAP.measures.combined('rc.all.oi.direct', org(), { motion: 'cg' }).v, 710);
      a.equal(TAP.measures.combined('rc.all.oi.direct', org(), {}).v, 5595, '4885 + 710');
      a.equal(TAP.measures.get('rc.nb.oi.direct')('alpha', { motion: 'cg' }).v, 1560, 'a one-motion part keeps its own motion');
    });

    T.test('X-measures-p2-fixture', 'The miniP2 fixture passes the contract check, and mini is unchanged', function (a) {
      var res = TAP.data.load(window.T_FIXTURE('miniP2'));
      a.ok(res.ok, 'miniP2 loads');
      a.deepEqual(res.errors, [], 'no contract errors');
      TAP.data.load(window.T_FIXTURE('mini'));
      a.equal(TAP.measures.get('cg.arr')('alpha', {}).v, window.TEST_EXPECT.mini.region.alpha['cg.arr'], 'the Phase 1 figure is unchanged');
    });
  });

  /* ---------- breakdowns (US-2.7.5) ---------- */

  var DIMS = ['year', 'industry', 'channel', 'motion', 'segment', 'risk'];
  function def(shape, ids, bds, parts) {
    return { id: 'x-breakdown', view: 'overview', title: 'Test', explain: { shows: 's', read: 'r', lookFor: 'l' }, shape: shape,
      defaultType: shape === 'parts' ? 'stackedBar' : 'bar', types: shape === 'parts' ? ['stackedBar', 'groupedBar', 'table'] : ['bar', 'groupedBar', 'dot', 'table'],
      measures: ids.map(function (id) { return { id: id }; }), parts: parts || {}, breakdowns: bds || DIMS, sources: ['DER'], options: {} };
  }
  function entity(name) {
    if (name === 'org') return org();
    if (name === 'restOfAlphaAverage') return rest('alpha', 'average');
    return TAP.scope.entities(cmp({ mode: 'all' })).filter(function (e) { return e.id === name; })[0];
  }
  function bdCols(ds, dim) { return ds.columns.filter(function (c) { return c.breakdown && c.breakdown.dim === dim; }); }
  function build(d, extra) {
    return TAP.builders.get(d.shape)(Object.assign({ def: d, cmp: cmp({ mode: 'org' }), entities: [org()] }, extra));
  }
  function values(opt) { return opt.series.filter(function (s) { return s.tapRole === 'value'; }); }

  // Every breakdown value against the hand figure, and the values add up to the figure without a breakdown.
  function checkBreakdown(a, b) {
    var ds = TAP.prepare.run(def('compare', [b.id]), { entities: [entity(b.entity)], breakdown: b.dim });
    var cols = bdCols(ds, b.dim), row = ds.rows[0], sum = 0, what = b.dim + ' ' + b.id + ' ' + b.entity;
    Object.keys(b.values).forEach(function (v) {
      var col = cols.filter(function (c) { return String(c.breakdown.value) === v; })[0];
      a.ok(col, what + ': a column for ' + v);
      a.equal(col.key, b.dim === 'year' ? b.id + '@y' + v : b.id + '@' + b.dim + ':' + v, what + ' column key');
      expectCell(a, row.cells[col.key], b.values[v], what + ' ' + v);
    });
    cols.forEach(function (c) { if (row.cells[c.key].state === 'value') sum += row.cells[c.key].v; });
    a.near(sum, b.total, TOL, what + ': the parts add up');
    a.near(row.cells[b.id].v, b.total, TOL, what + ': the total without a breakdown');
    return cols;
  }

  T.suite('breakdowns', function () {
    T.test('TPV-TC-310', 'A report may allow all six breakdowns', function (a) {
      load();
      a.deepEqual(TAP.reports.BREAKDOWNS, DIMS);
      a.deepEqual(TAP.reports.validate(def('compare', ['rc.all.arr'])), [], 'year, industry, channel, motion, segment and risk are accepted');
    });
    T.test('TPV-TC-310', 'An unknown breakdown fails validation', function (a) {
      load();
      var errs = TAP.reports.validate(def('compare', ['rc.all.arr'], ['year', 'colour']));
      a.equal(errs.length, 1, 'one error');
      a.match(errs[0], /colour/, 'it names the unknown breakdown');
    });

    T.test('TPV-TC-311', 'Only breakdowns the selected measure lists are offered, and they follow the measure switch', function (a) {
      load();
      var d = def('compare', ['rc.all.arr', 'cg.currentArr']);
      a.deepEqual(TAP.prepare.breakdowns(d, { measureId: 'rc.all.arr' }), ['year', 'channel', 'motion']);
      a.deepEqual(TAP.prepare.breakdowns(d, { measureId: 'cg.currentArr' }), ['segment', 'risk']);
      a.deepEqual(TAP.prepare.breakdowns(def('compare', ['rc.all.arr'], ['channel', 'segment']), {}), ['channel'], 'and only those the report allows');
      var p = def('parts', ['rc.all.oi'], DIMS, { 'rc.all.oi': ['rc.nb.oi', 'rc.cg.oi'] });
      a.deepEqual(TAP.prepare.breakdowns(p, {}), ['year', 'channel'], 'a parts report needs every part to support it (the motion parts have no motion)');
      var ds = TAP.prepare.run(d, { entities: [org()], breakdown: 'segment' });
      a.equal(ds.columns.filter(function (c) { return c.breakdown; }).length, 0, 'an unsupported breakdown adds no columns');
    });

    T.test('TPV-TC-312', 'With a breakdown, compare draws grouped bars and every group is labelled', function (a) {
      load();
      ['bar', 'groupedBar'].forEach(function (type) {
        var opt = build(def('compare', ['rc.nb.arr']), { type: type, breakdown: 'channel' }).option, s = values(opt);
        a.deepEqual(s.map(function (x) { return x.name; }), ['Direct', 'Partner', 'Alliance A', 'Alliance B'], type + ': one series per channel');
        a.ok(s.every(function (x) { return x.type === 'bar' && !x.stack; }), type + ': grouped, not stacked');
        s.forEach(function (x) {
          a.match(x.label.formatter({ data: x.data[0], seriesName: x.name }), new RegExp(x.name), x.name + ' is written on its bar');
        });
        a.near(s[0].data[0].raw, 4200, TOL, 'direct bar is the hand figure');
      });
    });

    T.test('TPV-TC-312', 'With a breakdown, parts draws one stack per region and value, each labelled', function (a) {
      load();
      var p = def('parts', ['rc.all.oi'], DIMS, { 'rc.all.oi': ['rc.all.arr', 'rc.all.services'] });
      var res = build(p, { type: 'stackedBar', breakdown: 'channel' }), opt = res.option, X2 = X.partsByChannel.direct;
      a.equal(opt.yAxis.data.length, 4, 'one stack per region and channel');
      a.match(opt.yAxis.data[0], /Direct/);
      a.match(opt.yAxis.data[3], /Alliance B/);
      var s = values(opt);
      a.near(s[0].data[0].raw, X2['rc.all.arr'], TOL, 'ARR part of the direct stack');
      a.near(s[1].data[0].raw, X2['rc.all.services'], TOL, 'services part of the direct stack');
      var total = opt.series.filter(function (x) { return x.tapRole === 'total'; })[0];
      a.equal(total.label.formatter({ dataIndex: 0 }), TAP.format.cell({ v: X2['rc.all.oi'], state: 'value' }, { unit: 'money' }), 'the stack total');
      a.near(res.table.rows[0].cells['rc.all.oi@channel:direct'].v, X2['rc.all.oi'], TOL, 'the table column for direct');
    });

    T.test('TPV-TC-314', 'Each breakdown gives one table column per value, adding up to the total (hand figures)', function (a) {
      load();
      X.breakdowns.forEach(function (b) { checkBreakdown(a, b); });
      var ind = X.breakdowns.filter(function (b) { return b.dim === 'industry' && b.entity === 'org'; })[0];
      var cols = checkBreakdown(a, ind);
      a.deepEqual(cols.map(function (c) { return c.breakdown.value; }), Object.keys(ind.values), 'only industries with a value get a column');
      var t = build(def('compare', ['rc.nb.arr']), { type: 'table', breakdown: 'channel' }).table;
      a.deepEqual(t.columns.map(function (c) { return c.key; }), ['entity', 'rc.nb.arr', 'rc.nb.arr@channel:direct', 'rc.nb.arr@channel:partner',
        'rc.nb.arr@channel:allianceA', 'rc.nb.arr@channel:allianceB'], 'the table shows the total and one column per value');
    });

    T.test('TPV-TC-315', 'Combined figures follow the combining rules for each breakdown value', function (a) {
      load();
      X.breakdowns.filter(function (b) { return b.entity === 'org' || b.entity === 'restOfAlphaAverage'; }).forEach(function (b) {
        var cols = checkBreakdown(a, b);
        var ds = TAP.prepare.run(def('compare', [b.id]), { entities: [entity(b.entity)], breakdown: b.dim });
        var c = ds.rows[0].cells[cols[0].key];
        a.equal(c.src.how, b.entity === 'org' ? 'sum' : 'mean', b.dim + ': ' + (b.entity === 'org' ? 'total' : 'average'));
      });
    });

    T.test('X-breakdowns-np', 'Grouped bars give each row one not-provided mark naming the missing values', function (a) {
      load();
      var opt = build(def('compare', ['nb.arr']), { type: 'groupedBar', breakdown: 'industry', cmp: cmp({ mode: 'all' }),
        entities: TAP.scope.entities(cmp({ mode: 'all' })) }).option;
      var np = opt.series.filter(function (s) { return s.tapRole === 'notProvided'; })[0].data;
      function marks(r) { return np.filter(function (d) { return d.entityId === r; }); }
      ['alpha', 'bravo', 'charlie', 'delta'].forEach(function (r) { a.equal(marks(r).length, 1, r + ' has one mark'); });
      a.match(marks('alpha')[0].text, /Education$/, 'A: ind2 is Tier 2 with no row (ind3 is not applicable, so not named)');
      a.match(marks('bravo')[0].text, /Utilities$/);
      a.match(marks('charlie')[0].text, /Healthcare and Education$/, 'C: ind1 blank row, ind2 blank tier');
      var all = build(def('compare', ['rc.nb.arr']), { type: 'groupedBar', breakdown: 'channel', cmp: cmp({ mode: 'all' }),
        entities: TAP.scope.entities(cmp({ mode: 'all' })) }).option;
      var c = all.series.filter(function (s) { return s.tapRole === 'notProvided'; })[0].data;
      a.equal(c.length, 1, 'only Region C, with no recap');
      a.equal(c[0].text, TAP.content.text('states.notProvided'), 'everything missing reads simply "not provided"');
    });

    T.test('X-breakdowns-parts', 'A broken-down parts table has unique columns, and not-applicable stacks are left out', function (a) {
      load();
      var p = def('parts', ['rc.all.oi'], DIMS, { 'rc.all.oi': ['rc.all.arr', 'rc.all.services'] });
      var cols = build(p, { type: 'table', breakdown: 'channel' }).table.columns;
      a.deepEqual(cols.map(function (c) { return c.key; }), ['entity', 'rc.all.arr', 'rc.all.services', 'rc.all.oi', 'rc.all.oi@channel:direct',
        'rc.all.oi@channel:partner', 'rc.all.oi@channel:allianceA', 'rc.all.oi@channel:allianceB'], 'one column per value of the selected measure');
      var labels = cols.map(function (c) { return c.label; });
      a.equal(labels.filter(function (l, i) { return labels.indexOf(l) === i; }).length, labels.length, 'no repeated heading');
      var nb = def('parts', ['nb.oi'], DIMS, { 'nb.oi': ['nb.arr', 'nb.services'] }), all = cmp({ mode: 'all' });
      var y = build(nb, { type: 'stackedBar', breakdown: 'industry', cmp: all, entities: TAP.scope.entities(all) }).option.yAxis.data;
      a.equal(y.length, 12, 'each region keeps 3 of its 4 industries: the Tier 3 one is not applicable');
      a.ok(y.indexOf('Region A · Retail') < 0 && y.indexOf('Region D · Education') < 0, 'left out quietly');
      a.ok(y.indexOf('Region A · Education') >= 0, 'a not-provided stack stays, as a gap');
    });

    T.test('X-breakdowns-dot', 'A dot chart with a breakdown draws one labelled dot per value (US-2.7.3)', function (a) {
      load();
      var s = values(build(def('compare', ['rc.nb.arr']), { type: 'dot', breakdown: 'channel' }).option);
      a.deepEqual(s.map(function (x) { return x.name; }), ['Direct', 'Partner', 'Alliance A', 'Alliance B']);
      a.ok(s.every(function (x) { return x.type === 'scatter'; }), 'dots, not bars');
      a.equal(s[0].label.formatter({ data: s[0].data[0] }), 'Direct', 'each dot names its value');
      a.near(s[0].data[0].value[0], 4200, TOL, 'organization direct, as in the hand figures');
    });

    T.test('TPV-TC-316', 'Another breakdown replaces the first; removing it restores the original chart', function (a) {
      load();
      var d = def('compare', ['rc.all.arr']);
      a.equal(values(build(d, { type: 'groupedBar', breakdown: 'channel' }).option).length, 4);
      var motion = values(build(d, { type: 'groupedBar', breakdown: 'motion' }).option);
      a.deepEqual(motion.map(function (x) { return x.name; }), ['New business', 'Customer growth'], 'motion replaces channel');
      var plain = build(d, { type: 'bar', breakdown: null }), again = values(plain.option);
      a.equal(again.length, 1, 'one series again');
      a.near(again[0].data[0].raw, 8668, TOL, 'the organization total without a breakdown');
      a.deepEqual(plain.table.columns.map(function (c) { return c.key; }), ['entity', 'rc.all.arr'], 'the table drops the value columns');
    });
  });

  /* ---------- reference lines on compare charts (17.7, e.g. the exposure thresholds) ---------- */

  T.suite('reflines', function () {
    function refDef(lines) {
      return { id: 'x-ref', view: 'customers', title: 'Test', explain: { shows: 's', read: 'r', lookFor: 'l' }, shape: 'compare',
        defaultType: 'bar', types: ['bar', 'dot', 'table'], measures: [{ id: 'cg.top3Share' }], breakdowns: [], sources: ['APP'],
        options: { refLines: lines } };
    }
    function chart(d, type) {
      var c = Object.assign(TAP.store.defaults().cmp, { mode: 'all' });
      return TAP.builders.get('compare')({ def: d, type: type, cmp: c, entities: TAP.scope.entities(c) }).option;
    }

    T.test('X-engine-reflines', 'A compare chart draws each reference line where it is set, with its label', function (a) {
      load();
      var lines = [{ value: 0.5, label: 'Concentration flag (50%)' }, { value: 0.25, label: 'At-risk flag (25%)' }];
      ['bar', 'dot'].forEach(function (type) {
        var opt = chart(refDef(lines), type);
        var ml = opt.series.filter(function (s) { return s.markLine; })[0].markLine;
        a.deepEqual(ml.data.map(function (d) { return d.xAxis; }), [0.5, 0.25], type + ': at 50% and 25%');
        a.deepEqual(ml.data.map(function (d) { return ml.label.formatter({ data: d, name: d.name }); }),
          ['Concentration flag (50%)', 'At-risk flag (25%)'], type + ': each line is labelled');
        a.equal(ml.lineStyle.type, 'dashed', type + ': dashed, not told apart by colour alone');
        a.ok(ml.silent, type + ': never in the way of a click');
      });
      var none = chart(refDef(undefined), 'bar');
      a.equal(none.series.filter(function (s) { return s.markLine; }).length, 0, 'no lines unless asked');
    });

    T.test('X-engine-reflines', 'The axis reaches every line, even above the largest value', function (a) {
      load();
      var opt = chart(refDef([{ value: 2, label: 'Far line' }]), 'bar');
      // top 3 shares on miniP2 are at most 1 (Regions B and D), so the axis must stretch to 2 for the line
      a.equal(typeof opt.xAxis.max, 'function');
      a.equal(opt.xAxis.max({ min: 0, max: 1 }), 2);
      a.equal(opt.xAxis.max({ min: 0, max: 3 }), 3, 'a larger value keeps its own end');
    });
  });

  /* ---------- dot plot (US-2.7.3), on the mini fixture ---------- */

  T.suite('dot', function () {
    var M = window.TEST_EXPECT.mini;
    function dots(id, mode, extra) {
      var d = def('compare', [id], ['year']), c = cmp(mode);
      return TAP.builders.get('compare')(Object.assign({ def: d, type: 'dot', cmp: c, entities: TAP.scope.entities(c) }, extra || {}));
    }
    function points(opt) {
      var out = [];
      values(opt).forEach(function (s) { s.data.forEach(function (d) { out.push({ s: s, d: d }); }); });
      return out;
    }

    T.test('TPV-TC-293', 'Dot plot is offered for compare reports and not for other shapes', function (a) {
      a.ok(TAP.shapes.types(def('compare', ['nb.arr']), 4).indexOf('dot') >= 0);
      a.ok(TAP.shapes.types(def('parts', ['amb.arr'], [], { 'amb.arr': ['nb.arr', 'cg.arr'] }), 4).indexOf('dot') < 0);
      a.equal(TAP.shapes.label('dot'), 'Dot plot');
    });

    T.test('TPV-TC-294', 'One row per entity, a dot at its value, the value written next to it (hand figures)', function (a) {
      var opt = dots('nb.arr', { mode: 'all' }).option, pts = points(opt);
      a.equal(pts.length, 4, 'one dot per region');
      ['alpha', 'bravo', 'charlie', 'delta'].forEach(function (r, i) {
        var p = pts.filter(function (x) { return x.d.entityId === r; })[0];
        a.near(p.d.value[0], M.region[r]['nb.arr'], TOL, r + ' value');
        a.equal(p.d.value[1], i, r + ' sits on its own row');
        a.equal(p.s.label.formatter({ data: p.d }), TAP.format.cell({ v: M.region[r]['nb.arr'], state: 'value' }, { unit: 'money' }), r + ' value is written');
      });
    });

    T.test('TPV-TC-295', 'The rest and the organization total are their own row in dark grey, as on bars', function (a) {
      var grey = window.TAP_THEME.combined;
      var rest = points(dots('nb.arr', { mode: 'one', focus: 'alpha', restAgg: 'average' }).option).filter(function (x) { return x.d.entityId === 'rest'; });
      a.equal(rest.length, 1, 'the rest has one row');
      a.near(rest[0].d.value[0], M.combined.restOfAlphaAverage['nb.arr'], 1e-6);
      a.equal(rest[0].d.itemStyle.color, grey);
      var bar = values(TAP.builders.get('compare')({ def: def('compare', ['nb.arr']), type: 'bar', cmp: cmp({ mode: 'org' }), entities: [org()] }).option)[0].data[0];
      var o = points(dots('nb.arr', { mode: 'org' }).option)[0];
      a.near(o.d.value[0], M.combined.orgTotal['nb.arr'], 1e-6);
      a.equal(o.d.itemStyle.color, grey);
      a.equal(o.d.itemStyle.color, bar.itemStyle.color, 'the same colour as its bar');
    });

    T.test('TPV-TC-296', 'With a year breakdown each row has one dot per year, labelled Y1, Y2 and Y3', function (a) {
      var opt = dots('nb.arr', { mode: 'all' }, { breakdown: 'year' }).option;
      var alpha = points(opt).filter(function (x) { return x.d.entityId === 'alpha'; });
      a.equal(alpha.length, 3);
      // Region A by plan year: rows 20 and 21: 500 + 200, 550 + 200, 605 + 200
      [700, 750, 805].forEach(function (v, i) {
        a.near(alpha[i].d.value[0], v, TOL, 'year ' + (i + 1));
        a.equal(alpha[i].d.value[1], 0, 'on Region A’s row');
        a.equal(alpha[i].s.label.formatter({ data: alpha[i].d }), 'Y' + (i + 1));
      });
      a.equal(points(opt).length, 12, 'four regions, three years each (Region C from its row 21; row 20 is blank)');
    });

    T.test('TPV-TC-298', 'The axis starts at zero for amounts; for rates it may start at the smallest value, written on the axis', function (a) {
      a.equal(dots('nb.arr', { mode: 'all' }).option.xAxis.min, 0);
      a.equal(dots('nb.targetAccounts', { mode: 'all' }).option.xAxis.min, 0, 'counts too');
      var ax = dots('nb.hitRate', { mode: 'all' }).option.xAxis;   // hit rates 0.2, 0.44, 0.2, 0.6
      a.ok(ax.min > 0 && ax.min <= 0.2, 'starts above zero, at or below the smallest rate');
      a.equal(ax.axisLabel.showMinLabel, true, 'the start is written on the axis');
    });
  });
})(window.TAP);
