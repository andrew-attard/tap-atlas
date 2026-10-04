/*
 * File: tests/test-customers.js
 * Purpose: Tests for the Customer growth view: the view itself (US-2.2.1) and its reports.
 * Provides: test cases TPV-TC-369 to TPV-TC-377 and X-cg-*; window.CGP_T (shared helpers for tests/test-partners.js)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: CGP stream
 *
 * Tests that need a piece another stream is still building (ENGINE2 measures and rows, the list builder) are
 * registered as skipped, naming what they wait for, and run as soon as that piece's stub is gone.
 */
(function (TAP) {
  'use strict';

  var MODES = [
    { mode: 'all' },
    { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' },
    { mode: 'pair', focus: 'alpha', second: 'bravo' },
    { mode: 'set', set: ['alpha', 'charlie', 'delta'] },
    { mode: 'org' }
  ];

  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c || {}); }
  function ctxFor(id, c, extra) {
    var k = cmp(c), def = TAP.reports.get(id);
    return Object.assign({ def: def, type: def.defaultType, measureId: null, sizeId: null, breakdown: null, cmp: k,
      entities: TAP.scope.entities(k), year: null, industryId: null, highlight: null, expanded: false,
      theme: window.TAP_THEME, opts: {} }, extra || {});
  }
  function builderOf(def) { return TAP.builders.get(def.builder || (def.shape === 'xyz' ? 'xy' : def.shape)); }
  function build(id, c, extra) { var ctx = ctxFor(id, c, extra); return builderOf(ctx.def)(ctx); }
  function sample() { TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA))); TAP.insights.reset(); }

  // Stubs still left among the given issues; empty when every piece a test needs is built.
  function waiting(issues) {
    return TAP.stub.list().filter(function (s) { return issues.indexOf(s.issue) >= 0; }).map(function (s) { return s.what + ' (#' + s.issue + ')'; });
  }
  // A test that runs once the pieces (and report definitions) it needs are built, and shows as skipped (pending) until then.
  // reports: definitions the test needs; a report not defined yet keeps it pending too.
  function when(issues, id, title, fn, reports) {
    var left = waiting(issues).concat((reports || []).filter(function (r) { return !TAP.reports.get(r); }).map(function (r) { return 'report ' + r; }));
    if (left.length) T.skip(id, title, 'pending: waits for ' + left.join(', '));
    else T.test(id, title, fn);
  }
  // Every table cell that holds a figure (not the entity or industry name) carries a source.
  function cellsHaveSources(a, res, label) {
    var n = 0;
    ((res.table || {}).rows || []).forEach(function (r) {
      Object.keys(r.cells).forEach(function (k) {
        var c = r.cells[k];
        if (k === 'entity' || k === 'industry' || !c || c.kind == null) return;
        a.ok(c.src, label + ': ' + (r.entityId || r.id) + ' ' + k + ' has a source');
        n++;
      });
    });
    a.ok(n > 0, label + ': checked ' + n + ' cells');
  }
  function guideLists(viewId, name) {
    var g = (window.TAP_CONTENT || {}).guide || {}, hit = false;
    ((g.planning || {}).sections || []).forEach(function (s) { if (s.link && s.link.view === viewId) hit = true; });
    return hit || JSON.stringify(g.howTo || {}).indexOf(name) >= 0;
  }
  function rule(id) { return ((window.TAP_RULES || {}).rules || []).filter(function (r) { return r.id === id; })[0]; }

  // The view's checks, shared with the Partners view (US-2.2.1 and US-2.3.1 have the same shape)
  function viewChecks(o) {
    T.test(o.ids.menu, 'Menu: "' + o.menu + '" comes straight after ' + o.after + ', titled "' + o.title + '"', function (a) {
      var order = window.TAP_VIEWS.order;
      a.equal(order.indexOf(o.view), order.indexOf(o.afterId) + 1, 'menu order');
      a.equal(TAP.views.title(o.view), o.menu, 'menu title');
      a.ok(TAP.views.get(o.view) && !TAP.views.get(o.view).__stub, 'the view is built');
      var root = T.dom.mount(), v = TAP.views.get(o.view).mount(root);
      try { a.equal(root.querySelector('h1').textContent, o.title, 'the question is the title'); } finally { v.destroy(); }
    });

    T.test(o.ids.headline, 'Headline: the most significant insight attached to the view, or no line', function (a) {
      sample();
      var c = TAP.store.get().cmp, best = null;
      window.TAP_VIEWS[o.view].reports.forEach(function (id) {
        (TAP.insights.ranked(c, { reportId: id }) || []).forEach(function (x) { if (!best || x.significance > best.significance) best = x; });
      });
      var root = T.dom.mount(), v = TAP.views.get(o.view).mount(root);
      try {
        var line = root.querySelector('.tap-vh__headline');
        a.ok(line, 'the header has a headline slot');
        if (best) a.equal(line.querySelector('.tap-vh__headline-text').textContent, best.sentence, 'the top insight');
        else a.ok(line.hidden, 'no insight attached: no headline line');
      } finally { v.destroy(); }
      var keep = TAP.insights.ranked;
      TAP.insights.ranked = function () { return []; };
      root = T.dom.mount();
      v = TAP.views.get(o.view).mount(root);
      try { a.ok(root.querySelector('.tap-vh__headline').hidden, 'with none attached, the line is hidden'); }
      finally { v.destroy(); TAP.insights.ranked = keep; }
    });

    T.test(o.ids.layout, 'The view holds the epic’s reports, at most two panels per row', function (a) {
      a.deepEqual(window.TAP_VIEWS[o.view].reports, o.reports, 'report list');
      var root = T.dom.mount(), v = TAP.views.get(o.view).mount(root);
      try {
        var slots = Array.prototype.slice.call(root.querySelectorAll('.tap-vh-slot'));
        var defined = o.reports.filter(function (id) { return !!TAP.reports.get(id); });
        a.deepEqual(slots.map(function (s) { return s.getAttribute('data-slot'); }), defined, 'one slot per defined report, in order');
        Array.prototype.forEach.call(root.querySelectorAll('.tap-vh-pair'), function (p) {
          a.ok(p.querySelectorAll(':scope > .tap-vh-slot').length <= 2, 'at most two side by side');
        });
      } finally { v.destroy(); }
      a.equal(root.querySelector('.tap-panel'), null, 'destroy removes the panels');
    });

    when(o.needs, o.ids.modes, 'Every report validates, and in all five modes builds with a table whose cells carry sources', function (a) {
      o.reports.forEach(function (id) {
        var def = TAP.reports.get(id);
        a.ok(def, id + ' is defined');
        a.deepEqual(TAP.reports.validate(def), [], id + ' is valid');
        MODES.forEach(function (m) {
          var res = build(id, m), label = id + ' ' + m.mode;
          a.equal(res.error, null, label + ': builds');
          a.ok(def.shape === 'list' ? !!res.table : TAP.shapes.types(def, 4).indexOf('table') >= 0, label + ': offers the table');
          cellsHaveSources(a, res, label);
        });
      });
    }, o.reports);

    when(o.needs, o.ids.empty, 'A region with an empty section shows "not provided", never zero', function (a) {
      var name = TAP.content.regionName(TAP.data.region(o.emptyRegion));
      o.reports.forEach(function (id) {
        var res = build(id, { mode: 'all' });
        a.ok((res.missing || []).indexOf(name) >= 0, id + ': ' + name + ' is named as not provided');
        ((res.table || {}).rows || []).forEach(function (r) {
          var mine = r.entityId === o.emptyRegion || (r.cells.region && r.cells.region.src && r.cells.region.src.regionId === o.emptyRegion);
          if (!mine) return;
          Object.keys(r.cells).forEach(function (k) {
            var c = r.cells[k];
            if (k === 'entity' || c.kind == null) return;
            a.ok(c.state === 'notProvided', id + ': ' + k + ' is not provided');
            a.ok(c.v !== 0, id + ': ' + k + ' is never zero');
          });
        });
      });
    }, o.reports);

    T.test(o.ids.explain, 'Every report has its three explanation parts', function (a) {
      o.reports.forEach(function (id) {
        var def = TAP.reports.get(id);
        if (!def) { a.ok(true, id + ' not defined yet; checked once it lands'); return; }
        ['shows', 'read', 'lookFor'].forEach(function (k) {
          a.ok(def.explain && typeof def.explain[k] === 'string' && def.explain[k].trim().length > 20, id + ' explain.' + k);
        });
      });
    });
    if (guideLists(o.view, o.menu)) {
      T.test(o.ids.guide, 'The Guide lists the view', function (a) { a.ok(guideLists(o.view, o.menu)); });
    } else T.skip(o.ids.guide, 'The Guide lists the view', 'pending: waits for the Guide content (PAGES2, wave B)');
  }

  window.CGP_T = { MODES: MODES, cmp: cmp, ctxFor: ctxFor, build: build, sample: sample, waiting: waiting, when: when,
    cellsHaveSources: cellsHaveSources, viewChecks: viewChecks };

  T.suite('customers', function () {
    /* ---------- US-2.2.1 the view ---------- */

    viewChecks({ view: 'customers', menu: 'Customer growth', title: 'How will existing customers grow?',
      after: 'New business', afterId: 'newBusiness', emptyRegion: 'charlie', needs: [194, 196, 204, 205, 206, 207, 208],
      reports: ['cg-segments', 'cg-growth', 'cg-exposure', 'cg-bubble', 'cg-accounts'],
      ids: { menu: 'TPV-TC-369', headline: 'TPV-TC-371', layout: 'TPV-TC-372', modes: 'TPV-TC-373', empty: 'TPV-TC-375', explain: 'TPV-TC-376', guide: 'X-cg-guide' } });

    var phase1 = { concentration: 'cg-exposure', atRisk: 'cg-exposure', segmentMix: 'cg-segments' };
    var attached = Object.keys(phase1).every(function (id) { var r = rule(id); return r && (r.attach || []).length; });
    if (attached) {
      T.test('TPV-TC-377', 'The concentration, at-risk and segment balance insights attach to this view’s reports', function (a) {
        Object.keys(phase1).forEach(function (id) {
          var r = rule(id);
          a.equal(r.attach[0], phase1[id], id + ' shows its report first');
          a.ok(window.TAP_VIEWS.customers.reports.indexOf(r.attach[0]) >= 0, id + ' names a report on the view');
          a.ok(r.highlight, id + ' has something to highlight');
        });
      });
    } else T.skip('TPV-TC-377', 'The concentration, at-risk and segment balance insights attach to this view’s reports',
      'pending: waits for the attach change in config/insight-rules.js (requested from the lead)');

    T.test('X-cg-layout-rows', 'Reports pair two by two; a list or a report left over takes a full row', function (a) {
      a.deepEqual(TAP.cgpLayout.rows(window.TAP_VIEWS.customers.reports), [['cg-segments', 'cg-growth'], ['cg-exposure', 'cg-bubble'], ['cg-accounts']]);
      a.deepEqual(TAP.cgpLayout.rows(window.TAP_VIEWS.partners.reports), [['pt-reliance', 'pt-capacity'], ['pt-list']]);
      a.deepEqual(TAP.cgpLayout.rows(['cg-segments', 'cg-exposure', 'cg-bubble']), [['cg-segments', 'cg-exposure'], ['cg-bubble']], 'an odd one out takes a full row');
    });
  });
})(window.TAP);
