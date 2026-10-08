/*
 * File: tests/test-partners.js
 * Purpose: Tests for the Partners view: the view itself (US-2.3.1) and its reports.
 * Provides: test cases TPV-TC-411 to TPV-TC-433 (automated ones), X-pt-*, and X-d135-partner-colours, X-d137-capacity-top,
 *           X-d138-partner-filter (v0.4.1, D135, D137, D138)
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
      reports: ['pt-reliance', 'pt-capacity', 'pt-books', 'pt-routes', 'pt-maturity', 'pt-list'],
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

    T.test('X-pt-capacity-names', 'Every partner is named beside its bubble, in its region’s colour, with no numbered key (D137)', function (a) {
      var res = H.build('pt-capacity', { mode: 'all' });
      a.ok(!res.legend.some(function (l) { return l.mark != null; }), 'no numbered key');
      H.bubbles(res).forEach(function (b) {
        var d = b.series.data.filter(function (x) { return x.rowId === b.rowId; })[0];
        a.ok(d.label.show && d.label.formatter() === b.name, b.rowId + ' is named beside its bubble');
        a.equal(b.color, TAP.scope.colorOf(b.regionId), b.rowId + ' region colour');
      });
    });

    T.test('X-pt-capacity-crowded', 'Many partners in a small panel: every one still named beside its bubble, none numbered, no "more partners" note', function (a) {
      H.sample();
      var res = H.build('pt-capacity', { mode: 'all' }, { size: { w: 560, h: 440 } }), seen = H.bubbles(res);
      a.ok(!res.legend.some(function (l) { return l.mark != null; }), 'no numbered key');
      a.equal(seen.filter(function (b) { return b.labelled; }).length, seen.length, 'all ' + seen.length + ' partners named');
      a.ok(!res.notes.some(function (n) { return /more partners/.test(n); }), 'no note about unnamed partners: ' + res.notes.join(' | '));
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
    // The definition also lists the Phase 4 columns (US-4.5.3); a file without them shows the Phase 2 columns only
    var PT_COLS_DEF = PT_COLS.slice(0, 3).concat(['type']).concat(PT_COLS.slice(3, 11)).concat(['distribution']).concat(PT_COLS.slice(11));
    function ids(res) { return res.table.rows.map(function (r) { return r.id; }); }

    T.test('TPV-TC-430', 'Columns: region, partner, channel, maturity, expertise, sales and consultant FTE, central support, ARR, services, order intake per FTE', function (a) {
      a.deepEqual(TAP.reports.get('pt-list').columns.map(function (c) { return c.key; }), PT_COLS_DEF, 'definition');
      var res = H.build('pt-list', { mode: 'all' });
      a.equal(res.error, null, 'builds');
      a.deepEqual(res.table.columns.map(function (c) { return c.key; }), PT_COLS, 'table');
      a.equal(res.table.rows.length, 3, 'every partner on the mini data');
      a.deepEqual(res.missing, ['Region C'], 'the region with no partner list is named');
    });

    T.test('TPV-TC-431', 'Sorted by three-year ARR, highest first; the channel filter (a dropdown, D138) keeps only that channel', function (a) {
      // A1 450, D1 240, B1 150
      a.deepEqual(ids(H.build('pt-list', { mode: 'all' })), ['alpha:10', 'delta:10', 'bravo:10'], 'by ARR, highest first');
      a.deepEqual(TAP.reports.get('pt-list').filter.map(function (f) { return [f.key, f.multi]; }), [['channel', true]], 'one filter: channel, as a dropdown');
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

  /* ---------- v0.4.1: colours by what is compared (D135), the top partners (D137), the list's dropdown (D138).
     Checked against the fixtures (worked by hand) and the raw sample file, never against the builders' output. ---------- */

  T.suite('partners-v041', function () {
    var TH = window.TAP_THEME;
    var RT = ['ownSales', 'customerSuccess', 'allianceBReseller', 'otherResellers', 'systemIntegrators', 'partnerExisting'];
    var ROUTE_NAMES = ['Own sales force', 'Customer success', 'Alliance B as reseller', 'Other resellers', 'System integrators', 'Partner existing business'];
    var LEVELS = ['recruit', 'onboard', 'enable', 'skill', 'strategic', 'none'];
    var LEVEL_NAMES = ['Recruit', 'Onboard', 'Enable', 'Skill', 'Strategic', 'Maturity not provided'];
    var CATS = ['swPerpetual', 'recurring', 'hardware', 'services'], CAT_NAMES = ['Software perpetual', 'Recurring', 'Hardware', 'Services'];
    function miniP4() { TAP.data.load(window.T_FIXTURE('miniP4')); }
    function valueSeries(res) { return ((res.option || {}).series || []).filter(function (s) { return s.tapRole === 'value'; }); }
    function drawn(s) { return (s.data || []).filter(function (d) { return d && d.raw != null; }); }
    function txt(n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
    function qsa(sel, root) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
    function keys(res) { return res.legend.map(function (l) { return [l.label, l.color, l.mark == null ? null : l.mark, l.role]; }); }
    function tipTitle(s, d) {
      var div = document.createElement('div');
      div.innerHTML = s.tooltip.formatter({ data: d });   // html-ok: test reads the tooltip the chart would show
      return txt(div.querySelector('.tap-tip-title'));
    }
    // Every drawn segment of each series takes the palette's fill and label colour for its part
    function paletted(a, res, pal, ids, what) {
      var ss = valueSeries(res);
      a.equal(ss.length, ids.length, what + ': one series per part');
      ss.forEach(function (s, i) {
        var items = drawn(s);
        a.ok(items.length > 0, what + ' ' + ids[i] + ': drawn');
        items.forEach(function (d) {
          a.equal(d.itemStyle.color, pal[ids[i]].bg, what + ' ' + ids[i] + ' ' + d.rowId + ': the part’s colour');
          a.equal(d.label.color, pal[ids[i]].fg, what + ' ' + ids[i] + ' ' + d.rowId + ': its label colour');
        });
      });
    }

    /* D135: the three charts */

    T.test('X-d135-partner-colours', 'pt-books split by product category: each category in its own colour, named in the key, no region shades', function (a) {
      miniP4();
      var res = H.build('pt-books', { mode: 'all' }, { opts: { split: 'category' } });
      a.equal(res.error, null, 'draws');
      paletted(a, res, TH.categories, CATS, 'category');
      a.deepEqual(keys(res), CATS.map(function (c, i) { return [CAT_NAMES[i], TH.categories[c].bg, null, 'category']; }), 'four category keys, no region, no number');
      var s = valueSeries(res)[1], d = drawn(s).filter(function (x) { return x.rowId === 'alpha:bk'; })[0];
      // Region A books value: recurring 2140 of 2625 (the hand-worked figures in tests/test-p4-reports.js)
      a.equal(tipTitle(s, d).indexOf('Recurring · Region A · Books value:'), 0, 'the tooltip names the category first: ' + tipTitle(s, d));
      a.ok(tipTitle(s, d).indexOf(TAP.format.pct(2140 / 2625)) > 0, 'with its share of the bar');
      var ch = H.build('pt-books', { mode: 'all' });
      paletted(a, ch, TH.channels, ['direct', 'partner', 'allianceA', 'allianceB'], 'channel');
    });

    T.test('X-d135-partner-colours', 'pt-routes: each route in its own colour in every bar, a key of swatches and names, the Amount / Share switch', function (a) {
      miniP4();
      var def = TAP.reports.get('pt-routes'), res = H.build('pt-routes', { mode: 'all' });
      a.equal(def.options.partColors, 'route', 'the report asks for the route palette');
      a.equal(def.defaultType, 'stacked100', 'the default stays the 100% view');
      paletted(a, res, TH.routes, RT, 'route');
      a.deepEqual(keys(res), RT.map(function (r, i) { return [ROUTE_NAMES[i], TH.routes[r].bg, null, 'route']; }), 'six route keys, no region, no number');
      var sw = (res.controls || []).filter(function (c) { return c.key === 'type'; })[0];
      a.ok(sw, 'the switch is offered');
      a.deepEqual(sw && sw.options.map(function (o) { return o.value; }), ['stackedBar', 'stacked100'], 'Amount and Share of total');
      a.equal(sw && sw.value, 'stacked100', 'share is picked by default');
      a.equal((H.build('pt-routes', { mode: 'all' }, { type: 'stackedBar' }).controls || []).filter(function (c) { return c.key === 'type'; })[0].value, 'stackedBar', 'amount when stacked');
      // Region A: own sales force 1560 of 2400 (the hand-worked figures in tests/test-p4-reports.js)
      var s = valueSeries(res)[0], d = drawn(s)[0];
      a.equal(tipTitle(s, d).indexOf('Own sales force · Region A:'), 0, 'the tooltip names the route first: ' + tipTitle(s, d));
      a.ok(tipTitle(s, d).indexOf('65%') > 0, 'with its share');
      var year = H.build('pt-routes', { mode: 'all' }, { breakdown: 'year' });
      a.equal(year.error, null, 'by year: draws');
      drawn(valueSeries(year)[0]).forEach(function (x) { a.equal(x.itemStyle.color, TH.routes.ownSales.bg, 'by year, ' + x.rowId + ': still the route colour'); });
    });

    T.test('X-d135-partner-colours', 'pt-maturity: the levels in the ordered palette, Recruit lightest, named in the key, the switch, stacked amount by default', function (a) {
      miniP4();
      var def = TAP.reports.get('pt-maturity'), res = H.build('pt-maturity', { mode: 'all' });
      a.equal(def.options.partColors, 'maturity', 'the report asks for the maturity palette');
      a.equal(def.defaultType, 'stackedBar', 'the default stays the stacked amount');
      a.deepEqual(valueSeries(res).map(function (s) { return s.name; }), LEVEL_NAMES, 'the levels in order');
      a.deepEqual(keys(res), LEVELS.map(function (l, i) { return [LEVEL_NAMES[i], TH.maturity[l].bg, null, 'maturity']; }), 'six keys: the five levels and not provided, no region, no number');
      valueSeries(res).forEach(function (s, i) {
        drawn(s).forEach(function (d) {
          a.equal(d.itemStyle.color, TH.maturity[LEVELS[i]].bg, LEVELS[i] + ' ' + d.rowId + ': the level’s colour');
          a.equal(d.label.color, TH.maturity[LEVELS[i]].fg, LEVELS[i] + ' ' + d.rowId + ': its label colour');
        });
      });
      var sw = (res.controls || []).filter(function (c) { return c.key === 'type'; })[0];
      a.ok(sw && sw.value === 'stackedBar', 'the switch is offered, on Amount');
      // Region A: 1 partner at Enable of 3 (the hand-worked counts in tests/test-p4-reports.js)
      var s = valueSeries(res)[2], d = drawn(s).filter(function (x) { return x.rowId === 'alpha'; })[0];
      a.equal(tipTitle(s, d).indexOf('Enable · Region A:'), 0, 'the tooltip names the level first: ' + tipTitle(s, d));
      a.ok(tipTitle(s, d).indexOf(TAP.format.pct(1 / 3)) > 0, 'with its share');
      var byType = H.build('pt-maturity', { mode: 'set', set: ['alpha'] }, { breakdown: 'partnerType' });
      a.equal(byType.error, null, 'by partner type: draws');
      drawn(valueSeries(byType)[2]).forEach(function (x) { a.equal(x.itemStyle.color, TH.maturity.enable.bg, 'by type, ' + x.rowId + ': still the level’s colour'); });
    });

    T.test('X-d135-partner-colours', 'The explanations speak of colours, not of shades or numbered keys', function (a) {
      ['pt-books', 'pt-routes', 'pt-maturity', 'pt-capacity'].forEach(function (id) {
        var read = TAP.reports.get(id).explain.read;
        a.ok(!/numbered|shades of/i.test(read), id + ': ' + read);
        a.match(read, /colour/i, id + ' says what the colours mean');
      });
    });

    /* D137: the capacity bubble */

    function names(res) {
      return H.bubbles(res).map(function (b) {
        var d = b.series.data.filter(function (x) { return x.rowId === b.rowId; })[0];
        return { b: b, beside: !!(d.label && d.label.show && d.label.formatter() === b.name) };
      });
    }
    function rowsOf(list, r) { return list.filter(function (b) { return b.regionId === r; }).map(function (b) { return b.row; }).sort(function (x, y) { return x - y; }); }

    T.test('X-d137-capacity-top', 'Seven regions: no region has more than 5 partners, so every one of the 28 is drawn, named beside its bubble, in region colours', function (a) {
      H.sample();
      var def = TAP.reports.get('pt-capacity');
      a.equal(def.options.topPerRegion, 5, 'the number is an option of the report');
      a.deepEqual(def.options.topBy, ['arr3', 'services3'], 'ranked by three-year ARR plus services, the planned order intake');
      var res = H.build('pt-capacity', { mode: 'all' }, { size: { w: 1100, h: 560 } }), seen = H.bubbles(res);
      a.equal(seen.length, 28, 'all 28 partners (SAMPLE_EXPECT r08)');
      a.deepEqual(rowsOf(seen, 'na'), [20, 21, 22, 23, 24], 'North America: its five');
      a.ok(names(res).every(function (x) { return x.beside; }), 'every partner named beside its bubble');
      a.ok(!res.legend.some(function (l) { return l.mark != null; }), 'no numbered key');
      a.equal(res.legend.length, 7, 'seven region keys');
      seen.forEach(function (b) { a.equal(b.color, TAP.scope.colorOf(b.regionId), b.rowId + ': region colour'); });
      a.ok(!res.notes.some(function (n) { return /Showing/.test(n); }), 'nothing left out, so no line about it: ' + res.notes.join(' | '));
      a.equal(res.table.rows.length, 28, 'the table lists every one');
    });

    T.test('X-d137-capacity-top', 'One vs the rest: the focus region’s partners and the rest’s 5 largest by ARR plus services, with one line', function (a) {
      H.sample();
      var res = H.build('pt-capacity', { mode: 'one', focus: 'na', restAs: 'combined', restAgg: 'average' }), seen = H.bubbles(res);
      a.deepEqual(rowsOf(seen, 'na'), [20, 21, 22, 23, 24], 'North America: its five');
      // The rest's largest by ARR plus services, from the sample file: seu 20 (4985.3), neu 20 (3017.9), ceu 20 (2200.2),
      // ceu 22 (1150.6), neu 21 (1052.1); latam 20 (963.9) is sixth and left out
      a.deepEqual(seen.filter(function (b) { return b.regionId !== 'na'; }).map(function (b) { return b.rowId; }).sort(),
        ['ceu:20', 'ceu:22', 'neu:20', 'neu:21', 'seu:20'], 'the rest: five partners in all');
      a.ok(res.notes.indexOf('Showing the 5 partners with the most planned order intake for North America and for the other regions together; the list below has all 28.') >= 0,
        'the line under the chart: ' + res.notes.join(' | '));
      a.ok(names(res).every(function (x) { return x.beside; }), 'every one named beside its bubble');
      a.equal(res.table.rows.length, 10, 'the table lists the bubbles drawn');
    });

    T.test('X-d137-capacity-top', 'Several regions, one with seven partners: its 5 largest by ARR plus services, not by ARR alone; the line counts all', function (a) {
      var plan = window.T_FIXTURE('mini'), alpha = plan.regions[0];
      // Rows 11 to 16, [ARR, services] over three years: by ARR plus services the order is A1 540, row 14 400, row 12 350,
      // row 11 300, row 15 280 (services blank, so ARR alone), row 13 270, row 16 60; by ARR alone row 13 (250) would
      // beat row 14 (100)
      [[11, [300, 0, 0], [0, 0, 0]], [12, [200, 0, 0], [150, 0, 0]], [13, [250, 0, 0], [20, 0, 0]], [14, [100, 0, 0], [300, 0, 0]],
        [15, [280, 0, 0], [null, null, null]], [16, [50, 0, 0], [10, 0, 0]]].forEach(function (p) {
        alpha.partners.push({ sourceRow: p[0], name: 'Fictional Partner A' + (p[0] - 9), channel: 'partner', maturity: 'Developing',
          expertiseGeo: 'Home market', expertiseProduct: 'Product line 1', fteSales: 1, fteConsultants: 1, centralSupportPct: 0.1, arr: p[1], services: p[2] });
      });
      a.ok(TAP.data.load(plan).ok, 'the changed fixture loads');
      var res = H.build('pt-capacity', { mode: 'all' }), seen = H.bubbles(res);
      a.deepEqual(rowsOf(seen, 'alpha'), [10, 11, 12, 14, 15], 'Region A: A1 and rows 11, 12, 14, 15');
      a.deepEqual(rowsOf(seen, 'bravo').concat(rowsOf(seen, 'delta')), [10, 10], 'the other regions keep their one partner');
      a.ok(res.notes.indexOf('Showing each region’s 5 partners with the most planned order intake; the list below has all 9.') >= 0,
        'the line under the chart: ' + res.notes.join(' | '));
      a.ok(res.notes.some(function (n) { return /^Fictional Partner A6 \(Region A\) is drawn as an empty outline/.test(n); }), 'row 15, with no services, is an outline');
      TAP.data.load(window.T_FIXTURE('mini'));
    });

    T.test('X-d137-capacity-top', 'One region: every partner, coloured by channel, with a channel legend and the channel in the tooltip', function (a) {
      H.sample();
      var res = H.build('pt-capacity', { mode: 'set', set: ['mea'] }), seen = H.bubbles(res);
      // Middle East & Africa's three partners and their channels, from the sample file
      var want = { 20: 'partner', 21: 'allianceA', 22: 'allianceB' };
      a.deepEqual(rowsOf(seen, 'mea'), [20, 21, 22], 'all three');
      seen.forEach(function (b) { a.equal(b.color, TH.channels[want[b.row]].bg, b.rowId + ': the ' + want[b.row] + ' colour'); });
      a.deepEqual(keys(res), [['Partner', TH.channels.partner.bg, null, 'channel'], ['Alliance A', TH.channels.allianceA.bg, null, 'channel'],
        ['Alliance B', TH.channels.allianceB.bg, null, 'channel']], 'the channels present, in the palette’s order, and no region key');
      a.ok(!res.notes.some(function (n) { return /Showing/.test(n); }), 'no top-5 line');
      a.ok(names(res).every(function (x) { return x.beside; }), 'every one named beside its bubble');
      var b = seen.filter(function (x) { return x.row === 20; })[0], d = b.series.data.filter(function (x) { return x.row === 20; })[0];
      a.ok(b.series.tooltip.formatter({ data: d }).indexOf('<span>Channel</span> <b>Partner</b>') >= 0, 'the tooltip names the channel');
    });

    T.test('X-d137-capacity-top', 'A partner without staff figures stays named below the chart, whatever the comparison', function (a) {
      var plan = window.T_FIXTURE('mini');
      plan.regions[1].partners[0].fteSales = null;
      plan.regions[1].partners[0].fteConsultants = null;
      a.ok(TAP.data.load(plan).ok, 'the changed fixture loads');
      [{ mode: 'all' }, { mode: 'set', set: ['bravo'] }].forEach(function (m) {
        var res = H.build('pt-capacity', m);
        a.ok(!H.bubbles(res).some(function (b) { return b.rowId === 'bravo:10'; }), m.mode + ': B1 not drawn');
        a.ok(res.notes.some(function (n) { return /^Fictional Partner B1 \(Region B\) is not on the chart/.test(n); }), m.mode + ': named below: ' + res.notes.join(' | '));
      });
      TAP.data.load(window.T_FIXTURE('mini'));
    });

    /* D138: the partner list's channel dropdown */

    function listIds(res) { return res.table.rows.map(function (r) { return r.id; }).sort(); }
    function counts(c) { var o = {}; c.options.forEach(function (x) { o[x.label] = x.count; }); return o; }

    T.test('X-d138-partner-filter', 'One dropdown, "Channels", with a count per channel', function (a) {
      var res = H.build('pt-list', { mode: 'all' }), c = res.controls;
      a.deepEqual(c.map(function (x) { return [x.key, x.kind, x.label]; }), [['filter:channel', 'multi', 'Channels']]);
      a.deepEqual(c[0].value, [], 'nothing ticked: all channels');
      // Mini: A1 and D1 through partners, B1 through alliance A
      a.deepEqual(counts(c[0]), { 'Alliance A': 1, Partner: 2 }, 'the channels found, counted');
    });

    T.test('X-d138-partner-filter', 'The dropdown filters as the select did: one channel, several, none', function (a) {
      var f = function (opts) { return listIds(H.build('pt-list', { mode: 'all' }, { opts: opts })); };
      a.deepEqual(f({ 'filter:channel': ['Partner'] }), ['alpha:10', 'delta:10'], 'partners: A1, D1');
      a.deepEqual(f({ 'filter:channel': ['Alliance A'] }), ['bravo:10'], 'alliance A: B1');
      a.deepEqual(f({ 'filter:channel': ['Alliance A', 'Partner'] }), ['alpha:10', 'bravo:10', 'delta:10'], 'both: every partner');
      a.deepEqual(f({ 'filter:channel': [] }), ['alpha:10', 'bravo:10', 'delta:10'], 'none ticked: every partner');
      a.deepEqual(f({ 'filter:channel': 'Partner' }), ['alpha:10', 'delta:10'], 'a single value kept from before still filters');
    });

    T.test('X-d138-partner-filter', 'On screen: the dropdown reads "Channels: All", stays open while ticking, and closes on Esc', function (a) {
      var root = T.dom.mount(), p = TAP.panel.create(root, 'pt-list', {});
      function rows() { return qsa('.tap-list tbody tr', root).length; }
      function box() { return root.querySelector('.tap-panel__controls .tap-ms'); }
      try {
        a.ok(box(), 'one dropdown in the controls row');
        a.equal(qsa('.tap-panel__controls .tap-ms', root).length, 1, 'and only one');
        a.equal(txt(box().querySelector('.tap-ms__btn')), 'Channels: All', 'the button names the choice');
        a.equal(rows(), 3, 'every partner to start');
        box().querySelector('.tap-ms__btn').click();
        var open = root.querySelector('.tap-ms__panel:not([hidden])');
        a.ok(open, 'the checklist opens');
        if (!open) return;
        a.ok(/2/.test(txt(open.querySelector('[data-value="Partner"]').closest('label'))), 'Partner carries its count');
        open.querySelector('[data-value="Partner"]').click();
        a.equal(rows(), 2, 'partners: two rows');
        a.equal(txt(box().querySelector('.tap-ms__btn')), 'Channels: Partner', 'the button names it');
        a.ok(root.querySelector('.tap-ms__panel:not([hidden])'), 'still open, to tick another');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        a.equal(root.querySelector('.tap-ms__panel:not([hidden])'), null, 'Esc closes it');
        a.equal(rows(), 2, 'and the choice stays');
      } finally { p.destroy(); TAP.storage.clear('chart:'); }
    });
  });
})(window.TAP);
