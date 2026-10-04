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
        a.ok(got.highlight && got.highlight.reportId && reports.indexOf(got.highlight.reportId) >= 0 || got.attach.length > 0, 'it carries a target on this view');
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
        var res = build(id, { mode: 'all' }), cells = figureCells(res, 'charlie');
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
      .some(function (s) { return s.link && s.link.view === VIEW; }), 'waits for the Guide to list the view (PAGES2)')('TPV-TC-326',
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
})(window.TAP);
