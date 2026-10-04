/*
 * File: tests/test-partners.js
 * Purpose: Tests for the Partners view: the view itself (US-2.3.1) and its reports.
 * Provides: test cases TPV-TC-411 to TPV-TC-433 (automated ones) and X-pt-*
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

    /* ---------- US-2.3.3 partner capacity ---------- */

    // From the mini data: sales plus consultant FTE, three-year ARR, three-year services
    // A1: 2 + 3 = 5, 100 + 150 + 200 = 450, 20 + 30 + 40 = 90; B1: 5, 150, 30; D1: 5, 240, 0. Region C has no partners.
    var PARTNERS = { 'alpha:10': [5, 450, 90], 'bravo:10': [5, 150, 30], 'delta:10': [5, 240, 0] };

    T.test('TPV-TC-424', 'One bubble per partner: FTE across, three-year ARR up, three-year services as size', function (a) {
      var res = H.build('pt-capacity', { mode: 'all' }), seen = H.bubbles(res);
      a.equal(res.error, null, 'draws');
      a.deepEqual(seen.map(function (b) { return b.rowId; }).sort(), Object.keys(PARTNERS), 'every partner once');
      seen.forEach(function (b) { a.deepEqual([b.x, b.y, b.size], PARTNERS[b.rowId], b.rowId); });
      a.deepEqual(res.missing, ['Region C'], 'the region with no partner list is named, not drawn at zero');
    });

    T.test('X-pt-capacity-names', 'Every partner is named beside its bubble or numbered in the key, in its region’s colour', function (a) {
      var res = H.build('pt-capacity', { mode: 'all' });
      H.bubbles(res).forEach(function (b) {
        var d = b.series.data.filter(function (x) { return x.rowId === b.rowId; })[0], text = d.label.formatter();
        var key = res.legend.filter(function (l) { return l.mark != null && String(l.mark) === text; })[0];
        a.ok(d.label.show && (text === b.name || (key && key.label.indexOf(b.name) === 0)), b.rowId + ' is named');
        a.equal(b.color, TAP.scope.colorOf(b.regionId), b.rowId + ' region colour');
      });
    });

    T.test('X-pt-capacity-crowded', 'Many partners: names where they fit, at most the label limit numbered, and a note for the rest', function (a) {
      H.sample();
      var res = H.build('pt-capacity', { mode: 'all' }, { size: { w: 560, h: 440 } }), seen = H.bubbles(res);
      var keys = res.legend.filter(function (l) { return l.mark != null; });
      a.ok(keys.length <= window.TAP_SETTINGS.rowBubble.labelMax, keys.length + ' numbers, within the limit');
      keys.forEach(function (l) { a.ok(l.color, l.label + ': the number sits on a coloured key, readable'); });
      var shown = seen.filter(function (b) { return b.labelled; }).length, rest = seen.length - shown;
      a.ok(shown > 0, shown + ' partners named or numbered');
      if (rest) a.ok(res.notes.some(function (n) { return n.indexOf(rest + ' more partners') === 0; }), 'a note says how many are not named');
      a.equal(res.table.rows.length, seen.length, 'the table lists every one');
    });

    T.test('TPV-TC-426', 'A partner’s details: channel, maturity, expertise, FTE, central support, ARR and services by year, order intake per FTE', function (a) {
      var d = TAP.details.build({ reportId: 'pt-capacity', items: [{ section: 'partners', regionId: 'alpha', row: 10 }] });
      a.equal(d.title, 'Fictional Partner A1, Region A', 'title');
      var rows = [];
      d.groups.forEach(function (g) { rows = rows.concat(g.rows); });
      var labels = {};
      TAP.rows.columns('partners').forEach(function (c) { labels[c.key] = c.label; });
      var byLabel = function (key) { return rows.filter(function (r) { return r.label === labels[key]; })[0]; };
      a.equal(byLabel('channel').cell.v, 'Partner', 'channel');
      a.equal(byLabel('maturity').cell.v, 'Developing', 'maturity as given (D61)');
      a.equal(byLabel('expertiseGeo').cell.v, 'Home market', 'geography expertise');
      a.equal(byLabel('expertiseProduct').cell.v, 'Product line 1', 'product expertise');
      a.equal(byLabel('fte').cell.v, 5, 'sales plus consultant FTE');
      a.equal(byLabel('centralSupportPct').cell.v, 0.1, 'central support %');
      var oi = byLabel('oiPerFte');
      a.near(oi.cell.v, (450 + 90) / 5, 1e-9, 'order intake per FTE = (ARR + services) / FTE');
      a.equal(oi.cell.kind, 'APP', 'marked as calculated by this app');
      var year = function (field, y) { return rows.filter(function (r) { return r.cell && r.cell.src && r.cell.src.field === field && r.cell.src.year === y; })[0]; };
      a.deepEqual([1, 2, 3].map(function (y) { return year('arr', y).cell.v; }), [100, 150, 200], 'ARR by year');
      a.deepEqual([1, 2, 3].map(function (y) { return year('services', y).cell.v; }), [20, 30, 40], 'services by year');
      a.match(TAP.sources.address(year('arr', 2).cell.src).text, /Region A plan\.xlsx › 4\. Partner › K10$/, 'year 2 ARR has its own cell');
    });

    T.test('TPV-TC-428', 'Partners with no FTE given are left out and named in a note', function (a) {
      var plan = window.T_FIXTURE('mini');
      plan.regions[1].partners[0].fteSales = null;
      plan.regions[1].partners[0].fteConsultants = null;
      a.ok(TAP.data.load(plan).ok, 'the changed fixture loads');
      var res = H.build('pt-capacity', { mode: 'all' });
      a.ok(!H.bubbles(res).some(function (b) { return b.rowId === 'bravo:10'; }), 'B1 not drawn');
      a.ok(res.notes.some(function (n) { return /^Fictional Partner B1 \(Region B\) is not on the chart/.test(n); }), 'named: ' + res.notes.join(' | '));
    });

    T.test('TPV-TC-429', 'Table view: its rows match the bubbles', function (a) {
      a.deepEqual(TAP.shapes.types(TAP.reports.get('pt-capacity'), 7), ['bubble', 'table'], 'bubble and table');
      H.MODES.forEach(function (m) {
        var res = H.build('pt-capacity', m), seen = H.bubbles(res);
        a.equal(res.table.rows.length, seen.length, m.mode + ': one row per bubble');
        seen.forEach(function (b) {
          var r = res.table.rows.filter(function (x) { return x.rowId === b.rowId; })[0];
          a.deepEqual([r.cells.fte.v, r.cells.arr3.v, r.cells.services3.v], [b.x, b.y, b.size], m.mode + ' ' + b.rowId);
        });
      });
    });

    /* ---------- US-2.3.4 the partner list ---------- */

    var PT_COLS = ['region', 'name', 'channel', 'maturity', 'expertiseGeo', 'expertiseProduct', 'fteSales', 'fteConsultants',
      'centralSupportPct', 'arr3', 'services3', 'oiPerFte', 'alsoNamed'];
    function ids(res) { return res.table.rows.map(function (r) { return r.id; }); }

    T.test('TPV-TC-430', 'Columns: region, partner, channel, maturity, expertise, sales and consultant FTE, central support, ARR, services, order intake per FTE', function (a) {
      a.deepEqual(TAP.reports.get('pt-list').columns.map(function (c) { return c.key; }), PT_COLS, 'definition');
      var res = H.build('pt-list', { mode: 'all' });
      a.equal(res.error, null, 'builds');
      a.deepEqual(res.table.columns.map(function (c) { return c.key; }), PT_COLS, 'table');
      a.equal(res.table.rows.length, 3, 'every partner on the mini data');
      a.deepEqual(res.missing, ['Region C'], 'the region with no partner list is named');
    });

    T.test('TPV-TC-431', 'Sorted by three-year ARR, highest first; the channel filter keeps only that channel', function (a) {
      // A1 450, D1 240, B1 150
      a.deepEqual(ids(H.build('pt-list', { mode: 'all' })), ['alpha:10', 'delta:10', 'bravo:10'], 'by ARR, highest first');
      a.deepEqual(TAP.reports.get('pt-list').filter.map(function (f) { return f.key; }), ['channel'], 'one filter: channel');
      var partner = TAP.rows.cell('partners', 'channel', { regionId: 'alpha', row: 10 }).v;
      a.deepEqual(ids(H.build('pt-list', { mode: 'all' }, { opts: { 'filter:channel': partner } })), ['alpha:10', 'delta:10'], 'partner channel only');
      var alliance = TAP.rows.cell('partners', 'channel', { regionId: 'bravo', row: 10 }).v;
      a.deepEqual(ids(H.build('pt-list', { mode: 'all' }, { opts: { 'filter:channel': alliance } })), ['bravo:10'], 'alliance A only');
    });

    T.test('TPV-TC-432', 'A partner named by two regions, ignoring case and spaces, shows "also named by"; different names don’t', function (a) {
      var plan = window.T_FIXTURE('mini');
      plan.regions[1].partners[0].name = '  fictional   PARTNER a1 ';   // B1 now names A1, with other case and spacing
      a.ok(TAP.data.load(plan).ok, 'the changed fixture loads');
      var res = H.build('pt-list', { mode: 'all' }), row = function (id) { return res.table.rows.filter(function (r) { return r.id === id; })[0]; };
      a.equal(row('alpha:10').cells.alsoNamed.v, 'Region B', 'A1 is also named by Region B');
      a.equal(row('bravo:10').cells.alsoNamed.v, 'Region A', 'and the other way round');
      a.ok(row('delta:10').cells.alsoNamed.state !== 'value', 'D1, a different name, shows nothing');
    });

    T.test('TPV-TC-433', 'Every row names its region file and its partner row', function (a) {
      H.build('pt-list', { mode: 'all' }).table.rows.forEach(function (r) {
        var where = TAP.sources.address(r.src).text;
        a.ok(where.indexOf(TAP.data.region(r.regionId).source.fileName) === 0, r.id + ': ' + where);
        a.match(where, new RegExp('4\\. Partner › [A-Z]+' + r.sourceRow + '$'), r.id + ' names its row');
      });
    });

    T.test('X-pt-list-target', 'A row click opens that partner’s details', function (a) {
      var tg = H.build('pt-list', { mode: 'all' }).target({ data: { regionId: 'delta', row: 'partners:delta:10' } });
      a.deepEqual(tg.items, [{ section: 'partners', regionId: 'delta', row: 10 }]);
      a.equal(TAP.details.build(tg).title, 'Fictional Partner D1, Region D');
    });

    T.test('X-pt-capacity-target', 'A bubble click opens that partner’s details', function (a) {
      var res = H.build('pt-capacity', { mode: 'all' }), b = H.bubbles(res).filter(function (x) { return x.rowId === 'delta:10'; })[0];
      var d = b.series.data.filter(function (x) { return x.rowId === 'delta:10'; })[0];
      a.deepEqual(res.target({ data: d }).items, [{ section: 'partners', regionId: 'delta', row: 10 }]);
    });
  });
})(window.TAP);
