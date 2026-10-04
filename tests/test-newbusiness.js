/*
 * File: tests/test-newbusiness.js
 * Purpose: Tests for the New business view (Epic 2.1): the view and its header, the industry grid, channels,
 *          levers, sub-industries and success factors.
 * Provides: test cases TPV-TC-317 to TPV-TC-368 (automated ones), X-nb-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: NB stream
 *
 * Some cases need pieces other streams are still building (Phase 2 measures, the list builder, the Guide). Those
 * are registered with T.skip and the reason until the piece is on main; the check that decides runs at load time,
 * so they switch on by themselves once it lands.
 */
(function (TAP) {
  'use strict';

  var TH = window.TAP_THEME;
  var VIEW = 'newBusiness';
  var MODES = [{ mode: 'all' }, { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' },
    { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'total' }, { mode: 'one', focus: 'alpha', restAs: 'individual' },
    { mode: 'pair', focus: 'alpha', second: 'charlie' }, { mode: 'set', set: ['bravo', 'delta'] }, { mode: 'org' }];

  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c || {}); }
  function sample() { TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA))); }
  function viewReports() { return (window.TAP_VIEWS[VIEW] || {}).reports || []; }
  function defined() { return viewReports().filter(function (id) { return !!TAP.reports.get(id); }); }
  function nbRuleAttached() {
    return ((window.TAP_RULES || {}).rules || []).some(function (r) { return (r.attach || []).some(function (id) { return /^nb-/.test(id); }); });
  }
  // A case that needs something not yet on main is registered as skipped, with the reason.
  function when(ready, reason) { return ready ? T.test : function (id, title) { T.skip(id, title, reason); }; }
  var withReports = when(viewReports().some(function (id) { return !!TAP.reports.get(id); }), 'waits for the first New business report (#198)');

  function ctxFor(def, c, extra) {
    var k = cmp(c);
    return Object.assign({ def: def, type: def.defaultType, measureId: null, sizeId: null, breakdown: null, cmp: k,
      entities: TAP.scope.entities(k), year: null, industryId: null, highlight: null, expanded: false, theme: TH, opts: {} }, extra || {});
  }
  function builderOf(def) { return TAP.builders.get(def.builder || (def.shape === 'xyz' ? 'xy' : def.shape)); }
  function build(id, c, extra) { var def = TAP.reports.get(id); return builderOf(def)(ctxFor(def, c, extra)); }
  // The cells a table holds for figures (text columns such as names carry no kind).
  function figureCells(res, entityId) {
    var out = [];
    ((res.table || {}).rows || []).forEach(function (r) {
      if (entityId && r.entityId !== entityId && (r.cells.region || {}).v !== entityId) return;
      Object.keys(r.cells).forEach(function (k) { var c = r.cells[k]; if (c && c.kind) out.push({ key: k, row: r, cell: c }); });
    });
    return out;
  }
  function withView(fn) {
    var root = T.dom.mount(), view = TAP.views.get(VIEW).mount(root);
    try { fn(root); } finally { view.destroy(); }
  }
  function panelIds(root) {
    return Array.prototype.map.call(root.querySelectorAll('.tap-panel'), function (p) { return p.getAttribute('data-report'); });
  }

  T.suite('newbusiness-view', function () {
    /* ---------- US-2.1.1 the view ---------- */

    T.test('TPV-TC-317', 'New business comes straight after Industry priorities, titled with its question', function (a) {
      var order = window.TAP_VIEWS.order;
      a.equal(order.indexOf(VIEW), order.indexOf('industry') + 1, 'menu order');
      a.deepEqual(TAP.views.order().slice(0, 3), ['overview', 'industry', VIEW], 'registered and shown in the menu');
      a.equal(TAP.views.title(VIEW), 'New business', 'menu title');
      withView(function (root) {
        a.equal(root.querySelector('h1').textContent, 'Where will new business come from?', 'the question is the title');
        a.equal(root.querySelector('.tap-stub'), null, 'not the stub');
      });
    });

    when(nbRuleAttached(), 'waits for insight rules attached to New business reports (INSIGHTS2)')('TPV-TC-319',
      'Sample data: the headline is the most significant insight attached to the view, with a Show me target', function (a) {
        sample();
        var reports = viewReports(), best = null;
        TAP.insights.all().forEach(function (x) {
          if (x.attach.some(function (id) { return reports.indexOf(id) >= 0; }) && (!best || x.significance > best.significance)) best = x;
        });
        a.ok(best, 'the sample data has an insight for this view');
        var got = TAP.viewHead.headline(VIEW, cmp());
        a.equal(got && got.id, best.id, 'the most significant one');
        a.ok(!!got && (got.highlight && got.highlight.reportId && reports.indexOf(got.highlight.reportId) >= 0 || got.attach.length > 0), 'it carries a target on this view');
        withView(function (root) {
          var line = root.querySelector('[data-part="headline"]');
          a.ok(!line.hidden, 'headline shown');
          a.equal(line.querySelector('.tap-vh__headline-text').textContent, best.sentence, 'its sentence');
          a.equal(line.querySelector('[data-insight]').getAttribute('data-insight'), best.id, 'and its Show me button');
        });
      });

    T.test('TPV-TC-320', 'With every insight for the view hidden, no headline line is shown', function (a) {
      sample();
      var reports = viewReports();
      TAP.insights.all().forEach(function (x) {
        if (x.attach.some(function (id) { return reports.indexOf(id) >= 0; })) TAP.insights.hide(x.id);
      });
      a.equal(TAP.viewHead.headline(VIEW, cmp()), null, 'no headline insight');
      withView(function (root) {
        var line = root.querySelector('[data-part="headline"]');
        a.ok(line, 'the header has a headline slot');
        a.ok(line.hidden, 'and it is hidden');
        a.equal(line.textContent, '', 'with nothing in it');
      });
    });

    T.test('TPV-TC-321', 'The view holds the Epic 2.1 reports, never more than two panels in a row', function (a) {
      a.deepEqual(viewReports(), ['nb-industries', 'nb-channels', 'nb-levers', 'nb-rows', 'nb-themes'], 'the reports, in order');
      withView(function (root) {
        var layout = TAP.newBusinessView.layout(), flat = [].concat.apply([], layout);
        a.ok(layout.every(function (r) { return r.length <= 2; }), 'the layout puts at most two reports in a row');
        a.ok(viewReports().every(function (id) { return flat.indexOf(id) >= 0; }), 'and places every report');
        var rows = root.querySelectorAll('.tap-vh-pair');
        Array.prototype.forEach.call(rows, function (r) { a.ok(r.children.length <= 2, 'at most two side by side'); });
        a.deepEqual(panelIds(root), defined(), 'a panel for every report defined so far, in order');
      });
    });

    withReports('TPV-TC-323', 'Every report validates, offers its table and gives every cell a source, in every mode', function (a) {
      defined().forEach(function (id) {
        var def = TAP.reports.get(id);
        a.deepEqual(TAP.reports.validate(def), [], id + ' validates');
        a.ok(def.shape === 'list' ? def.types.indexOf('list') >= 0 : TAP.shapes.types(def, 7).indexOf('table') >= 0, id + ' offers a table');
        MODES.forEach(function (m) {
          var res = build(id, m), cells = figureCells(res);
          a.equal(res.error, null, id + ' ' + m.mode + ': builds');
          a.ok(res.table && res.table.rows.length > 0, id + ' ' + m.mode + ': has table rows');
          a.ok(cells.every(function (x) { return !!x.cell.src; }), id + ' ' + m.mode + ': every cell has a source');
        });
      });
    });

    withReports('TPV-TC-325', 'A region with no new business rows is "not provided", never zero', function (a) {
      var plan = T_FIXTURE('mini');
      plan.regions[2].newBusiness = [];
      plan.regions[2].recap = [];
      TAP.data.load(plan);
      defined().forEach(function (id) {
        // The tier is the region's Market Coverage choice, not a new business figure
        var res = build(id, { mode: 'all' }), cells = figureCells(res, 'charlie').filter(function (x) { return x.key !== 'tier'; });
        a.ok(cells.every(function (x) { return x.cell.state !== 'value'; }), id + ': no value for Region C');
        a.ok(cells.every(function (x) { return x.cell.v !== 0; }), id + ': never zero');
        if (TAP.reports.get(id).shape !== 'list') a.ok((res.missing || []).indexOf('Region C') >= 0, id + ': Region C named as missing');
        else a.equal(cells.length, 0, id + ': no rows for Region C');
      });
    });

    withReports('TPV-TC-326', 'Every report on the view has its three-part explanation', function (a) {
      defined().forEach(function (id) {
        var ex = TAP.reports.get(id).explain || {};
        ['shows', 'read', 'lookFor'].forEach(function (k) { a.ok(typeof ex[k] === 'string' && ex[k].trim().length > 10, id + ' explain.' + k); });
      });
    });

    when(((TAP.content.guide() || {}).planning || { sections: [] }).sections.concat(((TAP.content.guide() || {}).howTo || { sections: [] }).sections)
      .some(function (s) { return s.link && s.link.view === VIEW; }), 'waits for the Guide to list the view (PAGES2)')('X-nb-tc326-guide',
      'The Guide lists the New business view', function (a) {
        var g = TAP.content.guide(), all = g.planning.sections.concat(g.howTo.sections);
        a.ok(all.some(function (s) { return s.link && s.link.view === VIEW; }), 'a Guide section opens the view');
      });

    when(nbRuleAttached(), 'waits for insight rules attached to New business reports (INSIGHTS2)')('TPV-TC-327',
      'Phase 1 new business rules show their insights on this view, not in details', function (a) {
        var nb = ['outlier', 'noPipeline', 'winsVsPeers'];
        window.TAP_RULES.rules.filter(function (r) { return nb.indexOf(r.id) >= 0; }).forEach(function (r) {
          a.ok(r.attach.length > 0 && r.attach.some(function (id) { return viewReports().indexOf(id) >= 0; }), r.id + ' attaches to a report on this view');
          a.ok(!!r.highlight, r.id + ' has a highlight');
        });
      });

    withReports('TPV-TC-329', 'Sample data: every report on the view draws, with at least one region with a value', function (a) {
      sample();
      defined().forEach(function (id) {
        var res = build(id, { mode: 'all' });
        a.equal(res.error, null, id + ' builds');
        a.ok(!res.empty, id + ' is not empty');
        a.ok(figureCells(res).some(function (x) { return x.cell.state === 'value'; }), id + ' has a value');
      });
    });

    T.test('X-nb-view-head', 'The header shows the kicker, the question and the lead line, then the panels', function (a) {
      withView(function (root) {
        var head = root.querySelector('.tap-vh[data-view="newBusiness"]');
        a.ok(head, 'the shared view header');
        a.equal(head.querySelector('.tap-vh__kicker').textContent, TAP.content.text('nbView.kicker'), 'kicker');
        a.equal(head.querySelector('.tap-vh__lead').textContent, TAP.content.text('nbView.lead'), 'lead line');
        a.ok(root.querySelector('.tap-vh-page.tap-nb'), 'the page column');
      });
    });

    T.test('X-nb-view-destroy', 'Destroying the view removes its panels and stops listening', function (a) {
      var root = T.dom.mount(), view = TAP.views.get(VIEW).mount(root);
      view.destroy();
      a.equal(root.querySelector('.tap-panel'), null, 'no panel left');
      TAP.store.set({ industry: 'ind1' });
      a.ok(true, 'a store change after destroy does not throw');
    });

    T.test('X-nb-view-missing-report', 'A report not defined yet takes no slot; the others still draw', function (a) {
      var keep = window.TAP_VIEWS[VIEW].reports;
      window.TAP_VIEWS[VIEW].reports = keep.concat(['nb-not-a-report']);
      try {
        withView(function (root) {
          a.equal(root.querySelector('[data-slot="nb-not-a-report"]'), null, 'no slot for it');
          a.deepEqual(panelIds(root), defined(), 'the defined reports still draw');
        });
      } finally { window.TAP_VIEWS[VIEW].reports = keep; }
    });
  });

  /* ---------- US-2.1.2 which industries carry each region's new business ---------- */

  var IND = 'nb-industries';
  var p2 = function (id) { return !!TAP.measures.meta(id); };
  var withP2 = when(p2('ind.nb.oi') && p2('nb.arr.tier1'), 'waits for the Phase 2 measures (ENGINE2, #196)');
  // Hand-calculated from tests/fixtures/mini-data.js: three-year sums of each row's arrPotential (and servicesPotential).
  // np = not provided (Tier 1 or 2, or a blank tier, with no usable row), na = not applicable (Tier 3).
  var MINI_ARR = {
    alpha: { ind1: 1655, ind2: 'np', ind3: 'na', ind4: 600 },       // row 20: 500 + 550 + 605; row 21: 200 x 3
    bravo: { ind1: 3400, ind2: 600, ind3: 'na', ind4: 'np' },       // row 20: 1000 + 1200 + 1200; row 21: 200 x 3
    charlie: { ind1: 'np', ind2: 'np', ind3: 'na', ind4: 300 },     // row 20 has no hit rate, so no ARR; row 21: 100 x 3
    delta: { ind1: 'np', ind2: 'na', ind3: 2850, ind4: 'np' }       // row 20: 600 + 900 + 1350
  };
  var MINI_SERVICES = { alpha: { ind1: 331, ind4: 120 }, bravo: { ind1: 340, ind2: 60 }, charlie: { ind4: 60 }, delta: { ind3: 712.5 } };
  var MINI_TIER = { alpha: { ind1: 1, ind4: 2 }, bravo: { ind1: 1, ind2: 2 }, charlie: { ind4: 2 }, delta: { ind3: 2 } };

  function grid(c, extra) { return build(IND, c, extra); }
  function gcell(res, entityId, industryId, key) {
    var row = res.table.rows.filter(function (r) { return r.entityId === entityId && r.industryId === industryId; })[0];
    return row ? row.cells[key || 'ind.nb.arr'] : null;
  }
  function parse(html) { var box = document.createElement('div'); TAP.dom.html(box, html); return box; }
  function gridCells(box) { return Array.prototype.slice.call(box.querySelectorAll('.tap-nbg__cell')); }
  function industriesOf(res) {
    var seen = [];
    res.table.rows.forEach(function (r) { if (seen.indexOf(r.industryId) < 0) seen.push(r.industryId); });
    return seen.sort();
  }

  T.suite('newbusiness-industries', function () {
    T.test('TPV-TC-330', 'Mini data: each region and industry cell equals the hand-calculated ARR potential', function (a) {
      var res = grid({ mode: 'all' }), n = 0;
      a.equal(res.error, null, 'builds');
      Object.keys(MINI_ARR).forEach(function (r) {
        Object.keys(MINI_ARR[r]).forEach(function (i) {
          var want = MINI_ARR[r][i], c = gcell(res, r, i);
          a.ok(c, r + ' ' + i + ': a cell');
          if (typeof want === 'number') { a.equal(c.state, 'value', r + ' ' + i); a.near(c.v, want, 1e-9, r + ' ' + i + ' value'); }
          else a.equal(c.state, want === 'np' ? 'notProvided' : 'notApplicable', r + ' ' + i + ' state');
          n++;
        });
      });
      a.equal(n, 16, 'four regions by four industries');
    });

    T.test('TPV-TC-332', 'Sample data: each cell shows the region’s tier for that industry from the data file', function (a) {
      sample();
      var res = grid({ mode: 'all' }), box = parse(res.html), seen = 0;
      gridCells(box).forEach(function (el) {
        var r = el.getAttribute('data-tap-region'), i = el.getAttribute('data-tap-industry');
        var mc = TAP.data.region(r).marketCoverage.filter(function (d) { return d.industryId === i; })[0];
        var badge = el.querySelector('.tap-nbg__tier');
        if (el.getAttribute('data-tap-value') === '' || !mc || mc.tier == null) return;
        a.ok(badge, r + ' ' + i + ': shows a tier');
        a.equal(badge.textContent, 'T' + mc.tier, r + ' ' + i + ': the data file’s tier');
        a.equal(gcell(res, r, i, 'tier').v, mc.tier, r + ' ' + i + ': and the table holds it');
        seen++;
      });
      a.ok(seen >= 7 * 3, 'checked ' + seen + ' cells');
    });

    // The stacked bar by tier is offered once its Tier 1 and Tier 2 measures exist (ENGINE2)
    withP2('TPV-TC-333', 'Grid by default; stacked bar by tier and table offered', function (a) {
      var def = TAP.reports.get(IND), types = TAP.shapes.types(def, 7);
      a.equal(def.defaultType, 'heatmap', 'grid is the default');
      a.ok(types.indexOf('stackedBar') >= 0, 'stacked bar offered');
      a.ok(types.indexOf('table') >= 0, 'table offered');
      a.equal(def.builder, 'nbGrid', 'the dedicated builder');
    });

    withP2('TPV-TC-334', 'Mini data: Tier 1 and Tier 2 parts equal the hand sums and add up to each region’s total', function (a) {
      var res = grid({ mode: 'all' }, { type: 'stackedBar' });
      a.equal(res.error, null, 'builds');
      a.ok(res.option, 'draws a chart');
      // Tier 1: alpha ind1 1655, bravo ind1 3400; Tier 2: alpha ind4 600, bravo ind2 600, charlie ind4 300, delta ind3 2850
      var want = { alpha: [1655, 600, 2255], bravo: [3400, 600, 4000], delta: [null, 2850, 2850] };
      Object.keys(want).forEach(function (r) {
        var row = res.table.rows.filter(function (x) { return x.entityId === r; })[0];
        var t1 = row.cells['nb.arr.tier1'], t2 = row.cells['nb.arr.tier2'], tot = row.cells['nb.arr'];
        if (want[r][0] == null) a.ok(t1.state !== 'value' || t1.v === 0, r + ': no Tier 1 new business');
        else a.near(t1.v, want[r][0], 1e-9, r + ' Tier 1');
        a.near(t2.v, want[r][1], 1e-9, r + ' Tier 2');
        a.near(tot.v, want[r][2], 1e-9, r + ' total');
        a.near((t1.state === 'value' ? t1.v : 0) + t2.v, tot.v, 1e-9, r + ': parts add up');
      });
    });

    withP2('TPV-TC-335', 'Measure switch: ARR, Services, Total order intake (ARR default); order intake is ARR plus services', function (a) {
      var def = TAP.reports.get(IND);
      a.deepEqual(def.measures.map(function (m) { return m.label; }), ['ARR', 'Services', 'Total order intake'], 'the three measures');
      a.equal(TAP.prepare.selected(def, {}), 'ind.nb.arr', 'ARR by default');
      var oi = grid({ mode: 'all' }, { measureId: 'ind.nb.oi' }), sv = grid({ mode: 'all' }, { measureId: 'ind.nb.services' });
      Object.keys(MINI_SERVICES).forEach(function (r) {
        Object.keys(MINI_SERVICES[r]).forEach(function (i) {
          a.near(gcell(sv, r, i, 'ind.nb.services').v, MINI_SERVICES[r][i], 1e-9, r + ' ' + i + ' services');
          a.near(gcell(oi, r, i, 'ind.nb.oi').v, MINI_ARR[r][i] + MINI_SERVICES[r][i], 1e-9, r + ' ' + i + ' ARR + services');
        });
      });
    });

    T.test('TPV-TC-336', 'Three-year totals by default; by year, the years add up to each total', function (a) {
      var res = grid({ mode: 'all' });
      a.near(gcell(res, 'alpha', 'ind1').v, 1655, 1e-9, 'three-year total by default');
      var by = grid({ mode: 'all' }, { breakdown: 'year' }), n = 0;
      a.near(gcell(by, 'alpha', 'ind1', 'ind.nb.arr@y1').v, 500, 1e-9, 'alpha ind1 year 1');
      a.near(gcell(by, 'alpha', 'ind1', 'ind.nb.arr@y3').v, 605, 1e-9, 'alpha ind1 year 3');
      by.table.rows.forEach(function (r) {
        var tot = r.cells['ind.nb.arr'];
        if (tot.state !== 'value') return;
        var sum = [1, 2, 3].reduce(function (s, y) { var c = r.cells['ind.nb.arr@y' + y]; return s + (c.state === 'value' ? c.v : 0); }, 0);
        a.near(sum, tot.v, 1e-9, r.entityId + ' ' + r.industryId + ': years add up');
        n++;
      });
      a.ok(n >= 6, 'checked ' + n + ' cells');
      a.equal(parse(by.html).querySelectorAll('.tap-nbg__cell[data-tap-year="3"]').length, 16, 'the grid shows a line per plan year');
    });

    T.test('TPV-TC-337', 'Only industries with new business in at least one region are listed', function (a) {
      a.deepEqual(industriesOf(grid({ mode: 'all' })), ['ind1', 'ind2', 'ind3', 'ind4'], 'every rated industry has a row somewhere');
      var plan = T_FIXTURE('mini');
      plan.regions[3].newBusiness = [];     // delta's only row is the only Retail (ind3) row
      TAP.data.load(plan);
      var res = grid({ mode: 'all' });
      a.deepEqual(industriesOf(res), ['ind1', 'ind2', 'ind4'], 'Retail drops out');
      a.equal(parse(res.html).querySelector('[data-tap-industry="ind3"]'), null, 'and is not drawn');
      a.equal(parse(res.html).querySelector('[data-tap-industry="other"]'), null, 'unrated rows never appear');
    });

    T.test('TPV-TC-338', 'A cell’s details hold exactly that region’s new business rows for that industry', function (a) {
      var res = grid({ mode: 'all' });
      [['alpha', 'ind1', ['New business: North · Clinics']], ['bravo', 'ind2', ['New business: South · Universities']],
        ['delta', 'ind3', ['New business: West · Stores']]].forEach(function (x) {
        var tg = res.target({ data: { regionId: x[0], industryId: x[1] } });
        a.deepEqual([tg.regionIds, tg.industryIds], [[x[0]], [x[1]]], x[0] + ' ' + x[1] + ': target');
        var groups = TAP.details.build(tg).groups.map(function (g) { return g.title; }).filter(function (s) { return /^New business:/.test(s); });
        a.deepEqual(groups, x[2], x[0] + ' ' + x[1] + ': its rows, no others');
      });
    });

    T.test('TPV-TC-339', 'Against the rest and as organization total, cells are the hand-calculated sum or simple average', function (a) {
      // Rest of Region C: ind1 = alpha 1655 and bravo 3400 (delta not provided); ind4 = alpha 600 only
      var avg = grid({ mode: 'one', focus: 'charlie', restAs: 'combined', restAgg: 'average' });
      a.near(gcell(avg, 'rest', 'ind1').v, 2527.5, 1e-9, 'average of the rest, ind1: (1655 + 3400) / 2');
      a.deepEqual(gcell(avg, 'rest', 'ind1').src.excluded, ['delta'], 'Region D named as not provided');
      a.near(gcell(avg, 'rest', 'ind4').v, 600, 1e-9, 'average of the rest, ind4');
      var tot = grid({ mode: 'one', focus: 'charlie', restAs: 'combined', restAgg: 'total' });
      a.near(gcell(tot, 'rest', 'ind1').v, 5055, 1e-9, 'rest as total, ind1: 1655 + 3400');
      var org = grid({ mode: 'org' });
      a.near(gcell(org, 'org', 'ind1').v, 5055, 1e-9, 'organization ind1');
      a.near(gcell(org, 'org', 'ind4').v, 900, 1e-9, 'organization ind4: 600 + 300');
      a.near(gcell(org, 'org', 'ind3').v, 2850, 1e-9, 'organization ind3: Region D only, the others not applicable');
      a.near(gcell(org, 'org', 'ind2').v, 600, 1e-9, 'organization ind2');
      a.equal(gcell(org, 'org', 'ind1', 'tier').state, 'notApplicable', 'a combined figure carries no tier');
    });

    T.test('X-nb-grid-tiers', 'Mini data: every cell with a value shows its tier; combined columns show none', function (a) {
      var box = parse(grid({ mode: 'all' }).html);
      Object.keys(MINI_TIER).forEach(function (r) {
        Object.keys(MINI_TIER[r]).forEach(function (i) {
          var el = box.querySelector('.tap-nbg__cell[data-tap-region="' + r + '"][data-tap-industry="' + i + '"]');
          a.equal(el.querySelector('.tap-nbg__tier').textContent, 'T' + MINI_TIER[r][i], r + ' ' + i);
        });
      });
      var np = box.querySelector('.tap-nbg__cell[data-tap-region="charlie"][data-tap-industry="ind1"]');
      a.match(np.textContent, /not provided/, 'a blank shows "not provided"');
      var rest = parse(grid({ mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' }).html);
      a.equal(rest.querySelectorAll('.tap-nbg__cell[data-tap-region="rest"] .tap-nbg__tier').length, 0, 'no tier on the rest');
    });

    T.test('X-nb-grid-same-as-table', 'Every grid value equals the table value, in every mode, on mini and sample data', function (a) {
      [false, true].forEach(function (big) {
        if (big) sample();
        MODES.forEach(function (m) {
          var S = window.SAMPLE_EXPECT.regions;
          if (big && (m.focus || m.set)) m = Object.assign({}, m, { focus: S[2], second: S[3], set: [S[0], S[5]] });
          var res = grid(m), n = 0;
          gridCells(parse(res.html)).forEach(function (el) {
            var c = gcell(res, el.getAttribute('data-tap-region'), el.getAttribute('data-tap-industry'));
            a.equal(el.getAttribute('data-tap-value'), c.state === 'value' ? String(c.v) : '', m.mode + ' ' + el.getAttribute('aria-label'));
            n++;
          });
          a.ok(n > 0, (big ? 'sample ' : 'mini ') + m.mode + ': compared ' + n);
        });
      });
    });

    T.test('X-nb-grid-shade', 'Larger values get a stronger shade; the value is always written in the cell', function (a) {
      var box = parse(grid({ mode: 'all' }).html);
      function cellOf(r, i) { return box.querySelector('.tap-nbg__cell[data-tap-region="' + r + '"][data-tap-industry="' + i + '"]'); }
      var big = parseFloat(cellOf('bravo', 'ind1').style.getPropertyValue('--tap-nbg-shade'));
      var small = parseFloat(cellOf('charlie', 'ind4').style.getPropertyValue('--tap-nbg-shade'));
      a.ok(big > small, 'bravo ind1 (3400) is shaded stronger than charlie ind4 (300)');
      a.match(cellOf('bravo', 'ind1').textContent, /3\.4M/, 'the value is written, not only shaded');
      a.ok(box.querySelector('.tap-nbg__col'), 'columns carry their region name');
    });

    T.test('X-nb-grid-click', 'A row name selects its industry; a cell names its region and industry; the rest names its regions', function (a) {
      var res = grid({ mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'total' });
      var row = res.target({ data: { industryId: 'ind4' } });
      a.deepEqual([row.regionIds, row.industryIds], [[], ['ind4']], 'row: the industry alone');
      var rest = res.target({ data: { regionId: 'rest', industryId: 'ind1' } });
      a.deepEqual([rest.regionIds, rest.industryIds], [['bravo', 'charlie', 'delta'], ['ind1']], 'the rest: its regions');
      a.equal(res.target({ data: {} }), null, 'nothing named, nothing opened');
    });

    T.test('X-nb-grid-highlight', 'A highlight marks the industry row or the cell', function (a) {
      var box = parse(grid({ mode: 'all' }, { highlight: { reportId: IND, regionIds: ['delta'], industryIds: ['ind3'], mark: 'cell' } }).html);
      var hl = box.querySelectorAll('.tap-nbg__cell.is-hl');
      a.equal(hl.length, 1, 'one cell');
      a.equal(hl[0].getAttribute('data-tap-region'), 'delta', 'the right one');
      box = parse(grid({ mode: 'all' }, { highlight: { reportId: IND, industryIds: ['ind1'], mark: 'industryRow' } }).html);
      a.equal(box.querySelectorAll('.tap-nbg__row.is-hl').length, 1, 'one row');
    });

    T.test('X-nb-grid-escape', 'Names in the grid are escaped', function (a) {
      var plan = T_FIXTURE('mini');
      plan.lookups.industries[0].name = '<img src=x onerror=alert(1)>';
      plan.regions[0].name = '<b>Region A</b>';
      TAP.data.load(plan);
      var box = parse(grid({ mode: 'all' }).html);
      a.equal(box.querySelector('img, b'), null, 'no markup from the data');
      a.ok(box.textContent.indexOf('<img src=x') >= 0, 'shown as text');
    });

    T.test('X-nb-grid-missing', 'A region with no value anywhere is named as missing; no value at all is empty', function (a) {
      var plan = T_FIXTURE('mini');
      plan.regions[2].newBusiness.forEach(function (r) { r.arrPotential = [null, null, null]; });
      TAP.data.load(plan);
      a.deepEqual(grid({ mode: 'all' }).missing, ['Region C'], 'Region C missing');
      plan.regions.forEach(function (reg) { reg.newBusiness = []; });
      TAP.data.load(plan);
      a.ok(grid({ mode: 'all' }).empty, 'nothing to draw');
    });
  });

  /* ---------- US-2.1.6 what leaders say they need to win ---------- */

  function entries(root) { return Array.prototype.slice.call(root.querySelectorAll('.tap-nbf__entry')); }
  function entryRegions(root) { return entries(root).map(function (e) { return e.getAttribute('data-region'); }); }

  T.suite('newbusiness-factors', function () {
    T.test('TPV-TC-362', 'Sample data: every success factor written for the industry, labelled with region and sub-industry', function (a) {
      sample();
      var ind = window.SAMPLE_EXPECT.p16.industry, want = [];
      TAP.data.regions().forEach(function (r) {
        (r.newBusiness || []).forEach(function (row) {
          if (row.industryId === ind && row.successFactors && String(row.successFactors).trim()) want.push({ r: r, row: row });
        });
      });
      a.ok(want.length >= 2, 'the planted industry has success factors in the data file');
      withView(function (root) {
        TAP.store.set({ industry: ind });
        var got = entries(root);
        a.equal(got.length, want.length, 'one entry per written success factor');
        want.forEach(function (w, i) {
          var e = got[i];
          a.equal(e.getAttribute('data-region'), w.r.id, 'entry ' + i + ': region, in file order');
          a.ok(e.textContent.indexOf(TAP.content.regionName(w.r)) >= 0, 'entry ' + i + ': labelled with the region');
          a.ok(e.textContent.indexOf(w.row.subVertical) >= 0, 'entry ' + i + ': labelled with the sub-industry');
          a.equal(e.querySelector('.tap-nbf__text').textContent, String(w.row.successFactors), 'entry ' + i + ': the words as written');
        });
      });
    });

    T.test('TPV-TC-364', 'With no industry selected the panel asks for one and lists nothing', function (a) {
      withView(function (root) {
        a.equal(TAP.store.get().industry, null, 'nothing selected');
        a.ok(root.querySelector('.tap-nbf__ask'), 'asks for an industry');
        a.equal(root.querySelector('.tap-nbf__ask').textContent, TAP.content.text('nbFactors.ask'), 'in its wording');
        a.equal(entries(root).length, 0, 'no entries');
      });
    });

    T.test('TPV-TC-365', 'With a focus region, its entries come first', function (a) {
      withView(function (root) {
        TAP.store.set({ industry: 'ind4', cmp: { mode: 'one', focus: 'charlie' } });
        // ind4: alpha row 21 "Specialist partner", charlie row 21 "Product gaps"
        a.deepEqual(entryRegions(root), ['charlie', 'alpha'], 'focus first, then file order');
        a.match(entries(root)[0].textContent, /Focus region/, 'marked as the focus');
        TAP.store.set({ cmp: { mode: 'all' } });
        a.deepEqual(entryRegions(root), ['alpha', 'charlie'], 'file order without a focus');
        TAP.store.set({ cmp: { mode: 'set', set: ['bravo', 'charlie'] } });
        a.deepEqual(entryRegions(root), ['charlie'], 'only regions in scope');
      });
    });

    T.test('TPV-TC-366', 'Only entries that exist are listed, with no "no comment" label or count', function (a) {
      withView(function (root) {
        TAP.store.set({ industry: 'ind1' });   // alpha and bravo wrote one each; charlie's row is blank
        a.deepEqual(entryRegions(root), ['alpha', 'bravo'], 'the two written entries');
        var text = root.querySelector('.tap-nbf').textContent;
        a.ok(!/no comment|not provided|0 entries|no success factor/i.test(text), 'no label for the blank');
        a.equal(text.indexOf('Region C'), -1, 'Region C is not named');
      });
    });

    T.test('TPV-TC-367', 'Each entry names its source cell', function (a) {
      withView(function (root) {
        TAP.store.set({ industry: 'ind1' });
        var src = entries(root).map(function (e) { return e.querySelector('.tap-nbf__src').textContent; });
        a.ok(src[0].indexOf('Region A plan.xlsx › 2. New Business › N20') >= 0, 'Region A row 20, column N');
        a.ok(src[1].indexOf('Region B plan.xlsx › 2. New Business › N20') >= 0, 'Region B row 20, column N');
        a.ok(src[0].indexOf(TAP.format.kind('IN').text) >= 0, 'with the kind of value');
      });
    });

    T.test('X-nb-factors-select', 'A grid row, a grid cell or industry:select updates the panel', function (a) {
      withView(function (root) {
        root.querySelector('.tap-panel[data-report="nb-industries"] .tap-nbg__name[data-tap-industry="ind3"]').click();
        a.equal(TAP.store.get().industry, 'ind3', 'the grid row selects the industry');
        a.deepEqual(entryRegions(root), ['delta'], 'and the panel shows it');
        a.match(root.querySelector('.tap-nbf__title').textContent, /Retail/, 'named in the title');
        TAP.bus.emit('industry:select', { industryId: 'ind4' });
        a.deepEqual(entryRegions(root), ['alpha', 'charlie'], 'industry:select');
      });
    });

    when(!!TAP.reports.get('nb-rows'), 'waits for the sub-industry list (#201)')('X-nb-factors-filter', 'The list’s industry filter updates the panel', function (a) {
      withView(function (root) {
        var sel = root.querySelector('[data-slot="nb-rows"] select[data-control="filter:industry"]');
        a.ok(sel, 'the list offers an industry filter');
        sel.value = 'ind1';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        a.equal(TAP.store.get().industry, 'ind1', 'the filter selects the industry');
        a.deepEqual(entryRegions(root), ['alpha', 'bravo'], 'and the panel follows');
      });
    });

    T.test('X-nb-factors-none', 'An industry nobody wrote about shows one plain line naming no region', function (a) {
      var plan = T_FIXTURE('mini');
      plan.regions[3].newBusiness[0].successFactors = '  ';
      TAP.data.load(plan);
      withView(function (root) {
        TAP.store.set({ industry: 'ind3' });
        a.equal(entries(root).length, 0, 'a blank of spaces is not an entry');
        var none = root.querySelector('.tap-nbf__none');
        a.equal(none && none.textContent, TAP.content.text('nbFactors.none', { industry: 'Retail' }), 'one plain line');
        TAP.data.regions().forEach(function (r) { a.equal(none.textContent.indexOf(r.name), -1, 'does not name ' + r.name); });
      });
    });

    T.test('X-nb-factors-long', 'A long entry is shown in full, as text, and the list scrolls', function (a) {
      var plan = T_FIXTURE('mini'), long = new Array(120).join('A long planted success factor that keeps going. ') + 'The very end.';
      plan.regions[0].newBusiness[0].successFactors = long;
      plan.regions[1].newBusiness[0].successFactors = '<img src=x onerror=alert(1)>';
      TAP.data.load(plan);
      withView(function (root) {
        TAP.store.set({ industry: 'ind1' });
        var text = root.querySelector('.tap-nbf__entry[data-region="alpha"] .tap-nbf__text');
        a.equal(text.textContent, long, 'every word, nothing cut off');
        a.equal(getComputedStyle(root.querySelector('.tap-nbf__list')).overflowY, 'auto', 'the list scrolls');
        a.equal(getComputedStyle(text).overflow, 'visible', 'the text itself is never clipped');
        a.equal(root.querySelector('.tap-nbf img'), null, 'shown as text');
      });
    });
  });
})(window.TAP);
