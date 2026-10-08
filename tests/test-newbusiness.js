/*
 * File: tests/test-newbusiness.js
 * Purpose: Tests for the New business view (Epic 2.1): the view and its header, the industry grid, channels,
 *          levers, sub-industries and success factors.
 * Provides: test cases TPV-TC-317 to TPV-TC-368 (automated ones), X-nb-*, X-d124-channel-* (channel colours, D124)
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
  function attachesNb(r) { return (r.attach || []).some(function (id) { return /^nb-/.test(id); }); }
  function rules() { return (window.TAP_RULES || {}).rules || []; }
  // TPV-TC-327 waits for the Phase 1 new business rules themselves to attach here (US-2.5.6).
  var NB_RULES = ['outlier', 'industryCover', 'winsVsPeers'];   // industryCover replaces noPipeline (D112)
  function nbRulesMoved() {
    return NB_RULES.every(function (id) { var r = rules().filter(function (x) { return x.id === id; })[0]; return !!r && attachesNb(r); });
  }
  // TPV-TC-319 waits for the sample data to give at least one insight attached to a New business report.
  // Checked once at load, only when some rule attaches here; the tests reload their own data before each case.
  function sampleHasNbInsight() {
    if (!rules().some(attachesNb)) return false;
    try {
      sample();
      return TAP.insights.all().some(function (x) { return x.attach.some(function (id) { return /^nb-/.test(id); }); });
    } catch (e) { return false; }
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

    T.test('TPV-TC-317', 'New business comes straight after Market coverage, titled with its question', function (a) {
      var order = window.TAP_VIEWS.order;
      a.equal(order.indexOf(VIEW), order.indexOf('industry') + 1, 'menu order');
      // D115: Overview and Regions come first, then the plan views
      a.deepEqual(TAP.views.order().slice(0, 4), ['overview', 'regions', 'industry', VIEW], 'registered and shown in the menu');
      a.equal(TAP.views.title(VIEW), 'New business', 'menu title');
      withView(function (root) {
        a.equal(root.querySelector('h1').textContent, 'Where will new business come from?', 'the question is the title');
        a.equal(root.querySelector('.tap-stub'), null, 'not the stub');
      });
    });

    when(sampleHasNbInsight(), 'waits for a sample insight attached to a New business report (INSIGHTS2)')('TPV-TC-319',
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
      a.deepEqual(viewReports(), ['nb-industries', 'nb-solutions', 'nb-channels', 'nb-levers', 'nb-rows', 'nb-themes'], 'the reports, in order');
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
      // Only reports that read new business figures: the themes also read Market Coverage commentary (INSIGHTS2)
      defined().filter(function (id) { return TAP.reports.get(id).builder !== 'themes'; }).forEach(function (id) {
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

    when(nbRulesMoved(), 'waits for the Phase 1 new business rules to attach here (US-2.5.6)')('TPV-TC-327',
      'Phase 1 new business rules show their insights on this view, not in details', function (a) {
        var nb = NB_RULES;
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
        // A report on a part of the template the file doesn't hold (Phase 4) shows its empty state instead
        var held = (TAP.reports.get(id).measures || []).every(function (m) { return TAP.measures.available(m.id); });
        if (!held) { a.ok(res.empty, id + ' says no region has data'); return; }
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

    T.test('TPV-TC-333', 'Grid by default; stacked bar by tier and table offered', function (a) {
      var def = TAP.reports.get(IND), types = TAP.shapes.types(def, 7);
      a.equal(def.defaultType, 'heatmap', 'grid is the default');
      a.ok(types.indexOf('stackedBar') >= 0, 'stacked bar offered');
      a.ok(types.indexOf('table') >= 0, 'table offered');
      a.equal(def.builder, 'nbGrid', 'the dedicated builder');
    });

    T.test('TPV-TC-334', 'Mini data: Tier 1 and Tier 2 parts equal the hand sums and add up to each region’s total', function (a) {
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

    T.test('TPV-TC-335', 'Measure switch: ARR, Services, Total order intake (ARR default); order intake is ARR plus services', function (a) {
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

    T.test('X-nb-grid-drill-target', 'The grid drills to the sub-industry list; a cell names its level for the breadcrumb', function (a) {
      var def = TAP.reports.get(IND);
      a.deepEqual(def.drill && def.drill.next, 'nb-rows', 'the next level is the list');
      var res = grid({ mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' });
      a.equal(res.target({ data: { regionId: 'alpha', industryId: 'ind1' } }).label, 'Healthcare, Region A', 'a region’s cell');
      a.equal(res.target({ data: { regionId: 'rest', industryId: 'ind1' } }).label, 'Healthcare', 'a combined cell: the industry');
    });

    when(!!TAP.panelDrill && !TAP.panelDrill.__stub, 'waits for drill-down in the panel (PANEL2, #269)')('X-nb-grid-drill',
      'On the view, a cell opens that region’s rows for the industry in the same panel', function (a) {
        withView(function (root) {
          var panel = root.querySelector('.tap-panel[data-report="nb-industries"]');
          panel.querySelector('.tap-nbg__cell[data-tap-region="bravo"][data-tap-industry="ind1"]').click();
          panel = root.querySelector('[data-slot="nb-industries"] .tap-panel');
          var rows = Array.prototype.map.call(panel.querySelectorAll('tr[data-tap-row]'), function (tr) { return tr.getAttribute('data-tap-row'); });
          a.deepEqual(rows, ['newBusiness:bravo:20'], 'only Region B’s Healthcare row');
          a.match(panel.querySelector('.tap-panel__crumbs').textContent, /Healthcare, Region B/, 'the breadcrumb names the level');
        });
      });

    T.test('X-nb-grid-highlight-combined', 'A cell highlight reaches the combined column that holds its region', function (a) {
      var hl = { reportId: IND, regionIds: ['delta'], industryIds: ['ind3'], mark: 'cell' };
      function marked(c) {
        return Array.prototype.map.call(parse(grid(c, { highlight: hl }).html).querySelectorAll('.tap-nbg__cell.is-hl'), function (el) {
          return el.getAttribute('data-tap-region') + ':' + el.getAttribute('data-tap-industry');
        });
      }
      a.deepEqual(marked({ mode: 'org' }), ['org:ind3'], 'organization total');
      a.deepEqual(marked({ mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' }), ['rest:ind3'], 'the rest, holding Region D');
      a.deepEqual(marked({ mode: 'one', focus: 'delta', restAs: 'combined', restAgg: 'total' }), ['delta:ind3'], 'the focus region itself, not the rest');
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

  /* ---------- US-2.1.3 which channels carry each region's new business ---------- */

  var CHN = 'nb-channels', CHANNELS = ['direct', 'partner', 'allianceA', 'allianceB'];
  // TPV-TC-347 waits for the channel measure names to come from the lookups (ENGINE2 follow-up to #196).
  function channelNamesFromLookups() {
    try {
      var plan = JSON.parse(JSON.stringify(window.TEST_FIXTURES.miniP2));
      plan.lookups.channels.forEach(function (c) { if (c.id === 'partner') c.name = 'Renamed channel'; });
      TAP.data.load(plan);
      return /Renamed channel/.test(TAP.measures.meta('rc.nb.arr.partner').label);
    } catch (e) { return false; }
  }
  // Hand-calculated from tests/fixtures/mini-p2.js: new business recap items summed over the three plan years.
  // Region A's alliance B, 2029 ARR is blank, so its ARR there is the two years given (0). Region C has no recap.
  var P2_RECAP = {
    arr: { alpha: [1300, 800, 0, 0], bravo: [2000, 0, 1200, 0], delta: [900, 900, 450, 450] },      // 400+400+500, 200+300+300 ...
    services: { alpha: [260, 160, 0, 0], bravo: [200, 0, 120, 0], delta: [225, 225, 115, 110] }   // 80+80+100, 40+60+60 ...
  };
  function miniP2() { TAP.data.load(T_FIXTURE('miniP2')); }
  function channels(c, extra) { return build(CHN, c, extra); }
  function ccell(res, entityId, key) {
    var row = res.table.rows.filter(function (r) { return r.entityId === entityId; })[0];
    return row ? row.cells[key] : null;
  }

  T.suite('newbusiness-channels', function () {
    T.test('TPV-TC-340', 'Mini data: new business order intake per region and channel equals the hand calculation', function (a) {
      miniP2();
      ['arr', 'services'].forEach(function (t) {
        var res = channels({ mode: 'all' }, { measureId: 'rc.nb.' + t });
        a.equal(res.error, null, t + ' builds');
        Object.keys(P2_RECAP[t]).forEach(function (r) {
          CHANNELS.forEach(function (c, i) { a.near(ccell(res, r, 'rc.nb.' + t + '.' + c).v, P2_RECAP[t][r][i], 1e-9, t + ' ' + r + ' ' + c); });
        });
        a.equal(ccell(res, 'charlie', 'rc.nb.' + t).state, 'notProvided', t + ': Region C has no recap, so not provided');
      });
    });

    T.test('TPV-TC-341', 'Figures follow the recap’s new business items, not the channel splits', function (a) {
      var plan = T_FIXTURE('miniP2');
      // Region D's only row splits 25% to each channel; make the recap say otherwise for 2027 direct ARR
      plan.regions[3].recap.forEach(function (it) {
        if (it.motion === 'newBusiness' && it.type === 'arr' && it.channel === 'direct' && it.year === 2027) it.value = 999;
        if (it.motion === 'customerGrowth' && it.type === 'arr' && it.channel === 'direct') it.value = 5000;
      });
      TAP.data.load(plan);
      var res = channels({ mode: 'all' }, { measureId: 'rc.nb.arr' });
      a.near(ccell(res, 'delta', 'rc.nb.arr.direct').v, 999 + 300 + 400, 1e-9, 'the recap figure, not 25% of the row');
      a.ok(ccell(res, 'delta', 'rc.nb.arr.direct').v !== 0.25 * 2850, 'not recalculated from the split');
      a.near(ccell(res, 'delta', 'rc.nb.arr').v, 1699 + 900 + 450 + 450, 1e-9, 'customer growth items are left out');
    });

    T.test('TPV-TC-342', 'Stacked bar by default; 100% stacked bar and table offered', function (a) {
      var def = TAP.reports.get(CHN), types = TAP.shapes.types(def, 7);
      a.equal(def.defaultType, 'stackedBar', 'stacked bar first');
      a.ok(types.indexOf('stacked100') >= 0, '100% stacked bar offered');
      a.ok(types.indexOf('table') >= 0, 'table offered');
      a.deepEqual(def.parts['rc.nb.arr'], CHANNELS.map(function (c) { return 'rc.nb.arr.' + c; }), 'the four channels stack');
    });

    T.test('TPV-TC-345', 'Measure switch: ARR, Services, Total order intake (ARR default); order intake is ARR plus services', function (a) {
      miniP2();
      var def = TAP.reports.get(CHN);
      a.deepEqual(def.measures.map(function (m) { return m.label; }), ['ARR', 'Services', 'Total order intake'], 'the three measures');
      a.equal(TAP.prepare.selected(def, {}), 'rc.nb.arr', 'ARR by default');
      var oi = channels({ mode: 'all' }, { measureId: 'rc.nb.oi' });
      Object.keys(P2_RECAP.arr).forEach(function (r) {
        CHANNELS.forEach(function (c, i) {
          a.near(ccell(oi, r, 'rc.nb.oi.' + c).v, P2_RECAP.arr[r][i] + P2_RECAP.services[r][i], 1e-9, r + ' ' + c + ': ARR + services');
        });
      });
    });

    T.test('TPV-TC-346', 'By year, the yearly values add up to each three-year total', function (a) {
      miniP2();
      var res = channels({ mode: 'all' }, { measureId: 'rc.nb.arr', breakdown: 'year' }), n = 0;
      res.table.rows.forEach(function (r) {
        var tot = r.cells['rc.nb.arr'], ys = [1, 2, 3].map(function (y) { return r.cells['rc.nb.arr@y' + y]; });
        if (!tot || tot.state !== 'value' || !ys.every(Boolean)) return;
        a.near(ys.reduce(function (s, c) { return s + (c.state === 'value' ? c.v : 0); }, 0), tot.v, 1e-9, r.entityId + ': years add up');
        n++;
      });
      a.ok(n >= 3, 'checked ' + n + ' regions');
      a.near(ccell(res, 'alpha', 'rc.nb.arr@y1').v, 600, 1e-9, 'Region A 2027: 400 + 200');
    });

    when(channelNamesFromLookups(), 'waits for channel names from the lookups (ENGINE2)')('TPV-TC-347', 'A renamed channel is used in the legend, the labels and the table', function (a) {
      var plan = T_FIXTURE('miniP2');
      plan.lookups.channels.filter(function (c) { return c.id === 'partner'; })[0].name = 'Resellers';
      TAP.data.load(plan);
      var res = channels({ mode: 'all' }, { measureId: 'rc.nb.arr' });
      a.ok(res.legend.some(function (l) { return /Resellers/.test(l.label); }), 'legend');
      var col = res.table.columns.filter(function (c) { return c.key === 'rc.nb.arr.partner'; })[0];
      a.match(col.label, /Resellers/, 'table column');
      var s = res.option.series.filter(function (x) { return x.data && x.data.some(function (d) { return d && d.key === 'rc.nb.arr.partner'; }); })[0];
      a.match(s.name, /Resellers/, 'the series the bar labels and tooltips use');
    });

    T.test('X-nb-channels-explain', 'The explanation says services by channel can differ slightly from services potential, and why', function (a) {
      var def = TAP.reports.get(CHN);
      a.match(def.explain.read + ' ' + def.explain.shows, /services by channel can differ slightly/i, 'the one line');
      a.match(def.explain.read + ' ' + def.explain.shows, /partner/i, 'and why: part of direct services moves to partners');
    });
  });

  /* ---------- US-2.1.4 the levers behind each region's number ---------- */

  var LEV = 'nb-levers';
  var LEVERS = ['nb.targetAccounts', 'nb.hitRate', 'nb.avgDealSize', 'nb.wins', 'nb.growthY2', 'nb.growthY3'];
  // Hand-calculated from tests/fixtures/mini-data.js (rows: targetAccounts, hitRate, avgDealSize, growth, 3-year ARR).
  var MINI_LEVERS = {
    alpha: { 'nb.targetAccounts': 30, 'nb.hitRate': 0.2, 'nb.wins': 6,                 // 20 x 0.25 + 10 x 0.1 = 6; 6 / 30
      'nb.avgDealSize': 700 / 6,                                                           // (100 x 5 + 200 x 1) / 6 wins
      'nb.growthY2': 165.5 / 2255, 'nb.growthY3': 165.5 / 2255 },                          // (0.1 x 1655 + 0 x 600) / 2255
    bravo: { 'nb.targetAccounts': 50, 'nb.hitRate': 0.44, 'nb.wins': 22, 'nb.avgDealSize': 1200 / 22,   // (50 x 20 + 100 x 2) / 22
      'nb.growthY2': 0.17, 'nb.growthY3': 0 },                                             // (0.2 x 3400 + 0 x 600) / 4000
    charlie: { 'nb.targetAccounts': 15, 'nb.hitRate': 0.2, 'nb.wins': 1, 'nb.avgDealSize': 100,         // row 20 has no hit rate
      'nb.growthY2': 0, 'nb.growthY3': 0 },                                                // row 20 has no ARR, row 21 grows 0
    delta: { 'nb.targetAccounts': 100, 'nb.hitRate': 0.6, 'nb.wins': 60, 'nb.avgDealSize': 10, 'nb.growthY2': 0.5, 'nb.growthY3': 0.5 }
  };
  function lever(c, id, extra) { return build(LEV, c, Object.assign({ measureId: id }, extra || {})); }
  function lcell(res, entityId, id) {
    var row = res.table.rows.filter(function (r) { return r.entityId === entityId; })[0];
    return row ? row.cells[id] : null;
  }

  T.suite('newbusiness-levers', function () {
    T.test('TPV-TC-350', 'Measure switch: the six levers in order, target accounts by default', function (a) {
      var def = TAP.reports.get(LEV);
      a.deepEqual(def.measures.map(function (m) { return m.id; }), LEVERS, 'the catalogue measures, in order');
      a.deepEqual(def.measures.map(function (m) { return m.label; }),
        ['Target accounts', 'Hit rate', 'Average deal size', 'Expected wins', 'Year 2 growth', 'Year 3 growth'], 'their names');
      a.equal(TAP.prepare.selected(def, {}), 'nb.targetAccounts', 'target accounts first');
      a.equal(def.title, 'How does each region build its new business number?', 'the question');
    });

    T.test('TPV-TC-351', 'Mini data: each lever per region equals the hand calculation and what the insight rules read', function (a) {
      LEVERS.forEach(function (id) {
        var res = lever({ mode: 'all' }, id);
        a.equal(res.error, null, id + ' builds');
        Object.keys(MINI_LEVERS).forEach(function (r) {
          var c = lcell(res, r, id);
          a.near(c.v, MINI_LEVERS[r][id], 1e-6, r + ' ' + id);
          a.equal(c.v, TAP.measures.get(id)(r, {}).v, r + ' ' + id + ': the same catalogue figure the rules read');
        });
      });
    });

    T.test('TPV-TC-352', 'Combined levers: counts summed or simply averaged, rates weighted by the catalogue weights', function (a) {
      var avg = { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' };
      var tot = { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'total' };
      a.near(lcell(lever(avg, 'nb.targetAccounts'), 'rest', 'nb.targetAccounts').v, 55, 1e-9, 'average of the rest: (50 + 15 + 100) / 3');
      a.near(lcell(lever(tot, 'nb.targetAccounts'), 'rest', 'nb.targetAccounts').v, 165, 1e-9, 'rest as total: 50 + 15 + 100');
      a.near(lcell(lever(avg, 'nb.wins'), 'rest', 'nb.wins').v, 83 / 3, 1e-9, 'wins, average of the rest: (22 + 1 + 60) / 3');
      a.near(lcell(lever(avg, 'nb.hitRate'), 'rest', 'nb.hitRate').v, 83 / 155, 1e-9, 'hit rate: wins 83 / rated accounts 155');
      a.near(lcell(lever(tot, 'nb.hitRate'), 'rest', 'nb.hitRate').v, 83 / 155, 1e-9, 'a rate is weighted the same as a total');
      a.near(lcell(lever(avg, 'nb.avgDealSize'), 'rest', 'nb.avgDealSize').v, 1900 / 83, 1e-9, 'deal size by wins: (1200 + 100 + 600) / 83');
      a.near(lcell(lever(avg, 'nb.growthY2'), 'rest', 'nb.growthY2').v, 2105 / 7150, 1e-9, 'year 2 growth by ARR: (0.17 x 4000 + 0 x 300 + 0.5 x 2850) / 7150');
      var org = { mode: 'org' };
      a.near(lcell(lever(org, 'nb.targetAccounts'), 'org', 'nb.targetAccounts').v, 195, 1e-9, 'organization target accounts');
      a.near(lcell(lever(org, 'nb.hitRate'), 'org', 'nb.hitRate').v, 89 / 185, 1e-9, 'organization hit rate: 89 / 185');
    });

    T.test('TPV-TC-353', 'Bar by default; dot plot and table offered; breakdown by industry allowed', function (a) {
      var def = TAP.reports.get(LEV), types = TAP.shapes.types(def, 7);
      a.equal(def.defaultType, 'bar', 'bar first');
      ['dot', 'table', 'bubble'].forEach(function (x) { a.ok(types.indexOf(x) >= 0, x + ' offered'); });
      a.ok(def.breakdowns.indexOf('industry') >= 0, 'break down by industry');
      a.ok(TAP.measures.meta('nb.targetAccounts').dims.indexOf('industry') >= 0, 'the measure supports it');
      a.ok(lever({ mode: 'all' }, 'nb.hitRate', { type: 'dot' }).option, 'the dot plot draws');
    });

    T.test('TPV-TC-354', 'Bubble: x target accounts, y hit rate, size average deal size, per region', function (a) {
      var res = lever({ mode: 'all' }, null, { type: 'bubble' }), seen = {};
      a.equal(res.error, null, 'builds');
      res.option.series.forEach(function (s) {
        (s.data || []).forEach(function (d) {
          if (!d.keys) return;
          a.deepEqual(d.keys, ['nb.targetAccounts', 'nb.hitRate', 'nb.avgDealSize'], d.entityId + ': the three measures');
          var w = MINI_LEVERS[d.entityId];
          a.near(d.raw[0], w['nb.targetAccounts'], 1e-9, d.entityId + ' x');
          a.near(d.raw[1], w['nb.hitRate'], 1e-9, d.entityId + ' y');
          a.near(d.raw[2], w['nb.avgDealSize'], 1e-6, d.entityId + ' size');
          seen[d.entityId] = true;
        });
      });
      a.deepEqual(Object.keys(seen).sort(), ['alpha', 'bravo', 'charlie', 'delta'], 'one bubble per region');
      a.ok(res.sizeLegend, 'a size legend');
    });

    T.test('X-review-POL-levers', 'Bubble view: names never overlap; a region without room is numbered and named in the key', function (a) {
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      var fs = window.TAP_THEME.type.chart;
      [{ w: 560, h: 440 }, { w: 1100, h: 560 }, { w: 380, h: 300 }].forEach(function (z) {
        var res = lever({ mode: 'all' }, null, { type: 'bubble', size: z }), o = res.option, g = o.grid, boxes = [], seen = 0;
        a.ok(res.sized, z.w + ': built again at the chart’s real size');
        var X = function (v) { return g.left + (v - o.xAxis.min) / (o.xAxis.max - o.xAxis.min) * (z.w - g.left - g.right); };
        var Y = function (v) { return z.h - g.bottom - (v - o.yAxis.min) / (o.yAxis.max - o.yAxis.min) * (z.h - g.top - g.bottom); };
        o.series.filter(function (s) { return s.tapRole === 'value'; }).forEach(function (s) {
          s.data.forEach(function (d) {
            seen++;
            var lab = d.label || {}, text = typeof lab.formatter === 'function' ? lab.formatter() : lab.formatter;
            if (Array.isArray(lab.position)) {
              var r = d.symbolSize / 2, w = Math.ceil(String(text).length * fs * 0.56) + 4;
              boxes.push({ id: d.entityId, x: X(d.value[0]) - r + lab.position[0], y: Y(d.value[1]) - r + lab.position[1], w: w, h: fs + 4 });
            } else {
              var key = res.legend.filter(function (l) { return l.mark != null && String(l.mark) === String(text); })[0];
              a.ok(lab.show && key && key.label === s.name, z.w + ': ' + d.entityId + ' is numbered and named in the key');
            }
          });
        });
        a.equal(seen, 7, z.w + ': one bubble per region');
        boxes.forEach(function (b, i) {
          boxes.slice(i + 1).forEach(function (c) {
            var meet = b.x < c.x + c.w && c.x < b.x + b.w && b.y < c.y + c.h && c.y < b.y + b.h;
            a.ok(!meet, z.w + ': the names of ' + b.id + ' and ' + c.id + ' do not overlap');
          });
        });
      });
    });

    T.test('TPV-TC-355', 'All regions: each bar takes its region’s colour; no colour depends on the value', function (a) {
      LEVERS.forEach(function (id) {
        var res = lever({ mode: 'all' }, id), n = 0;
        res.option.series.filter(function (s) { return s.tapRole === 'value'; }).forEach(function (s) {
          s.data.forEach(function (d) {
            if (d.value == null) return;
            a.equal(d.itemStyle.color, TAP.scope.colorOf(d.entityId), id + ' ' + d.entityId + ': region colour');
            n++;
          });
        });
        a.equal(n, 4, id + ': four bars');
      });
    });

    T.test('X-nb-levers-view', 'The levers panel draws next to the channels; the grid takes the full width', function (a) {
      withView(function (root) {
        var p = root.querySelector('.tap-vh-pair .tap-panel[data-report="nb-levers"]');
        a.ok(p, 'in a two-panel row');
        a.ok(p.parentNode.parentNode.querySelector('.tap-panel[data-report="nb-channels"]'), 'with the channels');
        a.equal(p.querySelector('.tap-panel__error'), null, 'with no error');
        a.ok(root.querySelector('.tap-nb__wide .tap-panel[data-report="nb-industries"]'), 'the grid at full width');
      });
    });
  });

  /* ---------- US-2.1.5 where exactly each region is looking ---------- */

  var ROWS = 'nb-rows';
  // Hand-copied from tests/fixtures/mini-data.js: region, industry, tier, sub-industry, market, target accounts,
  // three-year ARR potential (sum of arrPotential; Region C row 20 has none).
  var MINI_ROWS = {
    'alpha:20': ['Region A', 'Healthcare', 1, 'Clinics', 'North', 20, 1655],
    'alpha:21': ['Region A', 'Utilities', 2, 'Grid operators', 'North', 10, 600],
    'bravo:20': ['Region B', 'Healthcare', 1, 'Hospitals', 'South', 40, 3400],
    'bravo:21': ['Region B', 'Education', 2, 'Universities', 'South', 10, 600],
    'charlie:20': ['Region C', 'Healthcare', 1, 'Labs', 'East', 10, null],
    'charlie:21': ['Region C', 'Utilities', 2, 'Water', 'East', 5, 300],
    'delta:20': ['Region D', 'Retail', 2, 'Stores', 'West', 100, 2850]
  };
  var ROW_KEYS = ['region', 'industry', 'tier', 'subVertical', 'market', 'targetAccounts', 'arr3'];
  function list(c, opts) { return build(ROWS, c, { type: 'list', opts: opts || {} }); }
  function rowIds(res) { return res.table.rows.map(function (r) { return r.id; }); }
  function rowById(res, id) { return res.table.rows.filter(function (r) { return r.id === id; })[0]; }

  T.suite('newbusiness-rows', function () {
    T.test('TPV-TC-356', 'Mini data: one row per new business row, with the hand-copied figures', function (a) {
      var def = TAP.reports.get(ROWS), res = list({ mode: 'all' });
      a.equal(def.shape, 'list', 'a list report');
      a.equal(def.title, 'Where exactly is each region looking?', 'the question');
      a.deepEqual(res.table.columns.map(function (c) { return c.key; }).slice(0, ROW_KEYS.length), ROW_KEYS, 'the columns, in order');
      a.equal(res.table.rows.length, 7, 'seven rows');
      Object.keys(MINI_ROWS).forEach(function (id) {
        var r = rowById(res, id);
        a.ok(r, id + ': listed');
        ROW_KEYS.forEach(function (k, i) {
          var want = MINI_ROWS[id][i], c = r.cells[k];
          if (want == null) a.equal(c.state, 'notProvided', id + ' ' + k + ' not provided');
          else if (typeof want === 'number') a.near(c.v, want, 1e-9, id + ' ' + k);
          else a.equal(TAP.format.cell(c, { unit: 'text' }), want, id + ' ' + k);
        });
      });
    });

    T.test('TPV-TC-357', 'Sorted by industry, then ARR potential highest first; the industry filter keeps one industry', function (a) {
      var res = list({ mode: 'all' });
      // Education; Healthcare 3400, 1655, blank last; Retail; Utilities 600, 300
      a.deepEqual(rowIds(res), ['bravo:21', 'bravo:20', 'alpha:20', 'charlie:20', 'delta:20', 'alpha:21', 'charlie:21'], 'default order');
      var f = res.controls.filter(function (c) { return c.key === 'filter:industry'; })[0];
      a.ok(f, 'an industry filter');
      a.equal(f.value, 'all', 'showing every industry at first');
      var hc = list({ mode: 'all' }, { 'filter:industry': 'Healthcare' });
      a.deepEqual(rowIds(hc), ['bravo:20', 'alpha:20', 'charlie:20'], 'only Healthcare, still sorted');
    });

    T.test('TPV-TC-358', 'Two regions naming the same sub-industry (any case and spacing) are each "also targeted by" the other', function (a) {
      var plan = T_FIXTURE('mini');
      plan.regions[2].newBusiness[1].subVertical = '  grid   OPERATORS ';
      TAP.data.load(plan);
      var res = list({ mode: 'all' });
      a.equal(rowById(res, 'alpha:21').cells.alsoTargeted.v, 'Region C', 'Region A’s row names Region C');
      a.equal(rowById(res, 'charlie:21').cells.alsoTargeted.v, 'Region A', 'Region C’s row names Region A');
      a.ok(rowById(res, 'bravo:20').cells.alsoTargeted.state !== 'value', 'a sub-industry nobody else names shows nothing');
      a.ok(res.table.columns.some(function (c) { return c.key === 'alsoTargeted'; }), 'the column is shown');
    });

    T.test('TPV-TC-359', 'Near-duplicates such as "Universities" and "University campuses" are not matched', function (a) {
      var plan = T_FIXTURE('mini');
      plan.regions[2].newBusiness[1].subVertical = 'University campuses';
      TAP.data.load(plan);
      var res = list({ mode: 'all' });
      a.ok(rowById(res, 'bravo:21').cells.alsoTargeted.state !== 'value', 'Universities: no match');
      a.ok(rowById(res, 'charlie:21').cells.alsoTargeted.state !== 'value', 'University campuses: no match');
    });

    T.test('TPV-TC-360', 'Rows follow the comparison scope as list reports do', function (a) {
      a.equal(list({ mode: 'all' }).table.rows.length, 7, 'all regions: every row');
      a.equal(list({ mode: 'org' }).table.rows.length, 7, 'organization total: every row');
      var set = list({ mode: 'set', set: ['bravo', 'delta'] });
      a.deepEqual(set.table.rows.map(function (r) { return r.regionId; }).sort(), ['bravo', 'bravo', 'delta'], 'a chosen set: only its regions');
      var one = list({ mode: 'one', focus: 'charlie', restAs: 'combined', restAgg: 'average' });
      a.deepEqual(rowIds(one).slice(0, 2), ['charlie:20', 'charlie:21'], 'one against the rest: the focus region’s rows first');
      a.equal(one.table.rows.length, 7, 'and every other row after them');
      var pair = list({ mode: 'pair', focus: 'delta', second: 'alpha' });
      a.deepEqual(rowIds(pair), ['delta:20', 'alpha:20', 'alpha:21'], 'a pair: the focus first, then the second region');
    });

    T.test('TPV-TC-361', 'Every row names the region file and the new business row it came from', function (a) {
      var res = list({ mode: 'all' }), box = T.dom.mount();
      res.table.rows.forEach(function (r) {
        var where = TAP.sources.address(r.src).text, reg = TAP.data.region(r.regionId);
        a.ok(where.indexOf(reg.source.fileName) === 0, r.id + ': the region file');
        a.ok(where.indexOf('2. New Business') >= 0, r.id + ': the New Business sheet');
        a.ok(new RegExp('[A-Z]' + r.sourceRow + '$').test(where), r.id + ': row ' + r.sourceRow);
      });
      TAP.dom.html(box, res.html);
      var src = box.querySelector('tr[data-tap-row="newBusiness:delta:20"] [data-tap-col="source"]');
      a.ok(src && src.textContent.indexOf('plan.xlsx') < 0, 'no address as text (D100)');
      var tip = window.T_TIP_TEXT(src && src.querySelector('.tap-srctip'));
      a.ok(tip.indexOf('Region D plan.xlsx') >= 0 && /20/.test(tip), 'the list’s data icon shows the source row: ' + tip);
    });

    T.test('X-nb-rows-view', 'The list takes the full width, with the success factors straight below it', function (a) {
      withView(function (root) {
        var row = root.querySelector('[data-slot="nb-rows"]').parentNode;
        a.ok(/tap-nb__wide/.test(row.className), 'a full-width row');
        a.ok(row.querySelector('.tap-panel[data-report="nb-rows"] table.tap-list'), 'the list draws');
        var next = row.nextElementSibling;
        a.ok(next && next.querySelector('.tap-nbf'), 'the success factors come next');
      });
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
        a.equal(root.querySelectorAll('.tap-nbf__src').length, 0, 'no address line under an entry (D100)');
        var src = entries(root).map(function (e) { return window.T_TIP_TEXT(e.querySelector('.tap-srctip')); });
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
        sel.value = 'Healthcare';   // the filter offers industries by name
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

  /* ---------- D124 channel charts coloured by channel, with an amount or share switch ---------- */

  T.suite('channel-colours', function () {
    var REL = 'pt-reliance';
    function valueSeries(res) { return res.option.series.filter(function (s) { return s.tapRole === 'value'; }); }
    function chanOf(key) { return String(key).split('.').pop(); }
    function drawn(s) { return s.data.filter(function (d) { return d && d.raw != null; }); }
    // Hand sums from the sample recap: the region's items for the motions and types asked, per channel, all plan years
    function recapSums(regionId, motions, types) {
      var r = window.PLAN_DATA.regions.filter(function (x) { return x.id === regionId; })[0];
      return CHANNELS.map(function (c) {
        return r.recap.filter(function (it) {
          return it.channel === c && motions.indexOf(it.motion) >= 0 && types.indexOf(it.type) >= 0 && typeof it.value === 'number';
        }).reduce(function (s, it) { return s + it.value; }, 0);
      });
    }
    function txt(n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
    function qsa(sel, root) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

    T.test('X-d124-channel-colours', 'Each channel has one colour, the same in every region’s bar, and the four differ', function (a) {
      sample();
      [[CHN, 'stackedBar'], [CHN, 'stacked100'], [REL, 'stackedBar'], [REL, 'stacked100']].forEach(function (c) {
        var res = build(c[0], { mode: 'all' }, { type: c[1] }), seen = {}, label = c.join(' ');
        var ss = valueSeries(res);
        a.equal(ss.length, 4, label + ': four channel series');
        ss.forEach(function (s) {
          var cs = drawn(s), ch = chanOf(cs[0] && cs[0].key);
          a.equal(cs.length, 7, label + ' ' + ch + ': one part per region');
          cs.forEach(function (d) {
            a.equal(d.itemStyle.color, TH.channels[ch].bg, label + ' ' + d.entityId + ' ' + ch + ': the channel’s colour');
            a.ok(TH.regions.indexOf(d.itemStyle.color) < 0, label + ' ' + d.entityId + ': not a region colour');
          });
          seen[ch] = cs[0].itemStyle.color;
        });
        a.deepEqual(Object.keys(seen), CHANNELS, label + ': in stacking order');
        var colours = CHANNELS.map(function (ch) { return seen[ch]; });
        a.equal(colours.filter(function (x, i) { return colours.indexOf(x) === i; }).length, 4, label + ': four different colours');
        a.deepEqual(res.option.yAxis.data, TAP.scope.entities(cmp({ mode: 'all' })).map(function (e) { return e.label; }), label + ': regions named on the axis');
      });
    });

    T.test('X-d124-channel-colours', 'The legend lists the four channels with their colours, in stacking order, and no region', function (a) {
      sample();
      [CHN, REL].forEach(function (id) {
        var res = build(id, { mode: 'all' }), m = TAP.prepare.selected(TAP.reports.get(id), {});
        a.deepEqual(res.legend.map(function (l) { return [l.label, l.color, l.role]; }), CHANNELS.map(function (c) {
          return [TAP.measures.meta(m + '.' + c).short, TH.channels[c].bg, 'channel'];
        }), id + ': four channel keys');
      });
    });

    T.test('X-d124-channel-colours', 'Share of total: one region’s parts add up to 100 and equal its recap shares', function (a) {
      sample();
      // nb-channels, ARR: Southern Europe's new business recap per channel, summed by hand from the sample
      var nb = recapSums('seu', ['newBusiness'], ['arr']), nbTot = nb.reduce(function (s, v) { return s + v; }, 0);
      var res = build(CHN, { mode: 'all' }, { type: 'stacked100' }), sum = 0;
      valueSeries(res).forEach(function (s) {
        var d = s.data.filter(function (x) { return x && x.entityId === 'seu'; })[0], i = CHANNELS.indexOf(chanOf(d.key));
        a.near(d.value, nb[i] / nbTot * 100, 1e-6, 'nb-channels seu ' + CHANNELS[i]);
        sum += d.value;
      });
      a.near(sum, 100, 1e-6, 'nb-channels seu: the parts add up to 100');
      // pt-reliance, total order intake: the shares SAMPLE_EXPECT gives for Southern Europe
      var shares = window.SAMPLE_EXPECT.q01.shares.seu, rel = build(REL, { mode: 'all' }, { type: 'stacked100', measureId: 'rc.all.oi' });
      sum = 0;
      valueSeries(rel).forEach(function (s) {
        var d = s.data.filter(function (x) { return x && x.entityId === 'seu'; })[0], ch = chanOf(d.key);
        a.near(d.value, shares[ch].share * 100, 1e-3, 'pt-reliance seu ' + ch);
        sum += d.value;
      });
      a.near(sum, 100, 1e-6, 'pt-reliance seu: the parts add up to 100');
    });

    T.test('X-d124-channel-switch', 'A visible Amount / Share of total switch moves between the stacked and 100% views', function (a) {
      sample();
      [CHN, REL].forEach(function (id) {
        var root = T.dom.mount(), p = TAP.panel.create(root, id, {});
        try {
          var sw = root.querySelector('.tap-panel__controls [data-control="type"]');
          a.ok(sw, id + ': the switch is in the controls row');
          if (!sw) return;
          a.deepEqual(qsa('button', sw).map(txt), ['Amount', 'Share of total'], id + ': its two options');
          var def = TAP.reports.get(id), on = function () { return txt(sw.querySelector('[aria-pressed="true"]')); };
          a.equal(on(), def.defaultType === 'stacked100' ? 'Share of total' : 'Amount', id + ': the default view is picked');
          sw.querySelector('[data-value="' + (def.defaultType === 'stacked100' ? 'stackedBar' : 'stacked100') + '"]').click();
          sw = root.querySelector('[data-control="type"]');
          a.equal(on(), def.defaultType === 'stacked100' ? 'Amount' : 'Share of total', id + ': a click moves to the other view');
          a.match(txt(root.querySelector('[data-action="type"]')), def.defaultType === 'stacked100' ? /^Stacked bar/ : /^100% stacked bar/,
            id + ': the chart type follows');
          a.ok(qsa('.tap-panel__legend-item--channel', root).length === 4, id + ': four channel keys under the chart');
        } finally { p.destroy(); TAP.storage.clear('chart:'); }
      });
    });

    T.test('X-d124-channel-tooltip', 'A tooltip names the channel first, then the region, the value and the share', function (a) {
      sample();
      var res = build(CHN, { mode: 'all' }), nb = recapSums('seu', ['newBusiness'], ['arr']);
      var tot = nb.reduce(function (s, v) { return s + v; }, 0), s = valueSeries(res)[1];
      var d = s.data.filter(function (x) { return x && x.entityId === 'seu'; })[0];
      var div = document.createElement('div');
      div.innerHTML = s.tooltip.formatter({ data: d });   // html-ok: test reads the tooltip the chart would show
      var title = txt(div.querySelector('.tap-tip-title')), region = TAP.content.regionName(TAP.data.region('seu'));
      a.equal(title.indexOf('Partner · ' + region + ':'), 0, 'channel, then region: ' + title);
      var col = res.table.columns.filter(function (c) { return c.key === d.key; })[0], cell = ccell(res, 'seu', d.key);
      a.near(cell.v, nb[1], 1e-6, 'the partner figure is the hand sum');
      a.ok(title.indexOf(TAP.format.cell(cell, { unit: col.unit, exact: true, field: col.field })) > 0, 'the value, written as in the table');
      a.ok(title.indexOf(TAP.format.pct(nb[1] / tot)) > 0, 'the share');
    });

    T.test('X-d124-channel-focus', 'Show me and the focus region still read without the region colour', function (a) {
      sample();
      var hl = build(CHN, { mode: 'all' }, { highlight: { reportId: CHN, regionIds: ['seu'] } });
      valueSeries(hl).forEach(function (s) {
        drawn(s).forEach(function (d) {
          a.equal(d.itemStyle.borderColor === TH.echarts.tap.highlight.color, d.entityId === 'seu', 'Show me ring: ' + d.entityId);
        });
      });
      var one = build(CHN, { mode: 'one', focus: 'seu', restAs: 'individual' }), rows = one.option.yAxis.data;
      valueSeries(one).forEach(function (s) {
        drawn(s).forEach(function (d) {
          a.equal(d.itemStyle.color, TH.channels[chanOf(d.key)].bg, 'channel colour in One vs the rest: ' + d.entityId);
          a.equal(d.itemStyle.borderColor === TH.ink, d.entityId === 'seu', 'the focus region is outlined: ' + d.entityId);
        });
      });
      var fmt = one.option.yAxis.axisLabel.formatter, i = rows.indexOf(TAP.content.regionName(TAP.data.region('seu')));
      a.ok(i >= 0 && /^\{focus\|/.test(fmt(rows[i], i)), 'the focus region’s name is bold on the axis');
      a.ok(!/^\{focus\|/.test(fmt(rows[(i + 1) % rows.length], (i + 1) % rows.length)), 'the others are not');
      a.ok(one.option.yAxis.axisLabel.rich.focus.fontWeight >= 700, 'bold');
    });

    T.test('X-d124-channel-books', 'pt-books split by channel takes the channel colours; split by category the category colours (D135)', function (a) {
      sample();
      var def = TAP.reports.get('pt-books'), b = TAP.builders.get('ptBooks');
      var res = b(ctxFor(def, { mode: 'all' }));
      valueSeries(res).forEach(function (s) {
        drawn(s).forEach(function (d) { a.equal(d.itemStyle.color, TH.channels[d.part].bg, 'channel ' + d.part + ' ' + d.rowId); });
      });
      a.equal(res.legend.filter(function (l) { return l.role === 'channel'; }).length, 4, 'four channel keys');
      var cat = b(ctxFor(def, { mode: 'all' }, { opts: { split: 'category' } }));
      a.equal(cat.legend.filter(function (l) { return l.role === 'channel'; }).length, 0, 'categories: no channel keys');
      a.equal(cat.legend.filter(function (l) { return l.role === 'category'; }).length, 4, 'categories: four category keys');
    });

    T.test('X-d124-channel-explain', 'The explanation says leaders enter the split as percentages and the recap adds the amounts up', function (a) {
      var ex = TAP.reports.get(CHN).explain, all = [ex.shows, ex.read, ex.lookFor].join(' ');
      a.match(all, /percentages? (for|per|on) (each|every) new business row/i, 'the split is entered as percentages per row');
      a.match(all, /recap adds/i, 'the recap adds the amounts up');
      a.ok(!/shades of the region/i.test(all), 'no longer describes region shades');
    });
  });
})(window.TAP);
