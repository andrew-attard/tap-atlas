/*
 * File: tests/test-overview.js
 * Purpose: Tests for region cards, the Overview view and ambition chart, and the headline (no top insights, D92).
 *          TPV-TC-095 and 096 live with the engine tests (test-shapes.js, test-measures.js).
 * Provides: test cases for OVERVIEW stories (#29, #30, #31, #487): TPV-TC-087, TPV-TC-099, X-overview-*, X-d92-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures (mini, sample, insights)
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var TOL = 1e-6;
  var qs = function (sel, root) { return root.querySelector(sel); };
  var qsa = function (sel, root) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  var NP = function () { return TAP.content.text('states.notProvided'); };
  var SEGS = ['strategic', 'growth', 'core', 'scaled'];

  function sample() { TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA))); }

  function cards(cmp) {
    if (cmp) TAP.store.set({ cmp: cmp });
    var el = T.dom.mount();
    TAP.overviewCards.render(el);
    return el;
  }
  function card(el, id) { return qs('.tap-ov-card[data-entity="' + id + '"]', el); }
  function fig(el, id, measure) { var c = card(el, id); return c ? qs('[data-measure="' + measure + '"]', c) : null; }

  // A figure shows the formatted value (or "not provided") and carries the raw value for checking.
  function checkFig(a, el, id, measure, v, unit, label) {
    var f = fig(el, id, measure);
    a.ok(!!f, label + ': ' + measure + ' is on the card');
    if (!f) return;
    if (v == null) {
      a.equal(f.getAttribute('data-state'), 'notProvided', label + ' ' + measure + ' state');
      a.equal(txt(f), NP(), label + ' ' + measure + ' reads not provided');
      return;
    }
    a.near(Number(f.getAttribute('data-v')), v, TOL, label + ' ' + measure + ' value');
    a.equal(txt(f), unit === 'money' ? TAP.format.money(v) : TAP.format.num(v), label + ' ' + measure + ' text');
  }

  // Swaps a function for a recorder for the length of fn, then puts it back.
  function spy(obj, name, fn, ret) {
    var orig = obj[name], calls = [];
    obj[name] = function () { calls.push(Array.prototype.slice.call(arguments)); return ret; };
    try { fn(calls); } finally { obj[name] = orig; }
  }

  // A colour as the browser writes it, for comparing inline styles.
  function css(colour) { var d = document.createElement('div'); d.style.backgroundColor = colour; return d.style.backgroundColor; }

  T.suite('overview', function () {

    /* ---------- US-1.5.1: plan at a glance, per region (#29) ---------- */

    T.test('TPV-TC-087', 'Mini data: each card’s figures equal the hand calculation', function (a) {
      var X = window.TEST_EXPECT.mini.region, el = cards();
      // Services ambition by hand: A 451 + 50 = 501; B 400 + 12 = 412; D 712.5 + 92 = 804.5
      var services = { alpha: 501, bravo: 412, delta: 804.5 };
      ['alpha', 'bravo', 'charlie', 'delta'].forEach(function (r) {
        var e = X[r];
        checkFig(a, el, r, 'amb.arr', e['amb.arr'], 'money', r);
        checkFig(a, el, r, 'nb.arr', e['nb.arr'], 'money', r);
        checkFig(a, el, r, 'cg.arr', e['cg.arr'], 'money', r);
        if (services[r]) checkFig(a, el, r, 'amb.services', services[r], 'money', r);
        checkFig(a, el, r, 'focus.tier1', e['focus.tier1'], 'count', r);
        checkFig(a, el, r, 'focus.tier2', e['focus.tier2'], 'count', r);
        checkFig(a, el, r, 'nb.targetAccounts', e['nb.targetAccounts'], 'count', r);
        if (r !== 'charlie') SEGS.forEach(function (s) { checkFig(a, el, r, 'cg.segment.' + s, e['cg.segment.' + s], 'count', r); });
      });
    });

    T.test('TPV-TC-087', 'Sample data: each card’s figures equal the generator’s totals', function (a) {
      sample();
      var S = window.SAMPLE_EXPECT, el = cards();
      S.regions.forEach(function (r) {
        var e = S.totals[r];
        ['amb.arr', 'nb.arr', 'cg.arr', 'amb.services'].forEach(function (m) { checkFig(a, el, r, m, e[m], 'money', r); });
        ['focus.tier1', 'focus.tier2', 'nb.targetAccounts'].forEach(function (m) { checkFig(a, el, r, m, e[m], 'count', r); });
        SEGS.forEach(function (s) {
          var v = e['cg.segment.' + s];
          if (v != null) checkFig(a, el, r, 'cg.segment.' + s, v, 'count', r);
        });
      });
    });

    T.test('X-overview-card-order', 'One card per region, in file order and in each region’s own colour (TPV-TC-086)', function (a) {
      sample();
      var el = cards(), list = qsa('.tap-ov-card', el);
      a.deepEqual(list.map(function (c) { return c.getAttribute('data-entity'); }), window.SAMPLE_EXPECT.regions, 'file order');
      list.forEach(function (c) {
        var id = c.getAttribute('data-entity'), bar = qs('.tap-ov-card__bar', c);
        a.equal(bar.style.backgroundColor, css(TAP.scope.colorOf(id)), id + ' colour');
        a.match(txt(qs('.tap-ov-card__name', c)), new RegExp(TAP.content.regionName(TAP.data.region(id)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), id + ' name');
      });
    });

    T.test('X-overview-card-focus', 'A focus region’s card is emphasized; the rest gets a dark-grey card that says how it was combined (TPV-TC-088)', function (a) {
      var el = cards({ mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' });
      var list = qsa('.tap-ov-card', el);
      a.equal(list.length, 2, 'focus plus the rest');
      a.ok(list[0].classList.contains('is-focus'), 'focus card emphasized');
      a.ok(list[1].classList.contains('is-combined'), 'rest card is the combined style');
      a.equal(list[1].getAttribute('data-entity'), 'rest');
      var ent = TAP.scope.entities()[1];
      a.match(txt(list[1]), new RegExp(ent.label), 'labelled with the entity label');
      var amb = TAP.measures.combined('amb.arr', ent, {});
      a.ok(txt(list[1]).indexOf(TAP.agg.describe(amb)) >= 0, 'says how it was combined');
      checkFig(a, el, 'rest', 'amb.arr', window.TEST_EXPECT.mini.combined.restOfAlphaAverage['amb.arr'], 'money', 'rest of A');
      checkFig(a, el, 'rest', 'nb.arr', window.TEST_EXPECT.mini.combined.restOfAlphaAverage['nb.arr'], 'money', 'rest of A');
      // The rest averages counts: target accounts (50 + 15 + 100) / 3 = 55
      checkFig(a, el, 'rest', 'nb.targetAccounts', 55, 'count', 'rest of A');
    });

    T.test('X-overview-card-org', 'Organization total: one dark-grey card with summed figures and the gaps named', function (a) {
      var X = window.TEST_EXPECT.mini.combined.orgTotal, el = cards({ mode: 'org' });
      a.equal(qsa('.tap-ov-card', el).length, 1);
      a.ok(card(el, 'org').classList.contains('is-combined'));
      checkFig(a, el, 'org', 'amb.arr', X['amb.arr'], 'money', 'org');
      checkFig(a, el, 'org', 'nb.arr', X['nb.arr'], 'money', 'org');
      checkFig(a, el, 'org', 'cg.arr', X['cg.arr'].v, 'money', 'org');
      // By hand from the per-region figures: Tier 1 1+1+1+1, Tier 2 2+2+1+2, accounts 30+50+15+100, strategic 1+1+1 (C not provided)
      checkFig(a, el, 'org', 'focus.tier1', 4, 'count', 'org');
      checkFig(a, el, 'org', 'focus.tier2', 7, 'count', 'org');
      checkFig(a, el, 'org', 'nb.targetAccounts', 195, 'count', 'org');
      checkFig(a, el, 'org', 'cg.segment.strategic', 3, 'count', 'org');
      a.match(txt(card(el, 'org')), /Region C/, 'the region left out of customer growth is named');
    });

    T.test('X-overview-card-modes', 'Cards follow every comparison mode, in the scope’s order', function (a) {
      [{ mode: 'all' }, { mode: 'one', focus: 'charlie', restAs: 'individual' }, { mode: 'one', focus: 'bravo', restAgg: 'total' },
        { mode: 'pair', focus: 'delta', second: 'alpha' }, { mode: 'set', set: ['bravo', 'delta'] }, { mode: 'org' }].forEach(function (c) {
        TAP.store.reset();
        var el = cards(c);
        a.deepEqual(qsa('.tap-ov-card', el).map(function (n) { return n.getAttribute('data-entity'); }),
          TAP.scope.entities().map(function (e) { return e.id; }), JSON.stringify(c));
      });
      TAP.store.reset();
      var el = cards({ mode: 'one', focus: 'charlie', restAs: 'individual' });
      a.ok(card(el, 'charlie').classList.contains('is-focus'), 'focus first');
      a.ok(card(el, 'alpha').classList.contains('is-muted'), 'others muted');
      a.equal(qs('.tap-ov-card__bar', card(el, 'alpha')).style.backgroundColor, css(TAP_THEME.focusGrey), 'muted bar is focus grey');
    });

    T.test('X-overview-card-click', 'Clicking a card opens that region’s details and leaves the comparison alone (TPV-TC-089)', function (a) {
      var el = cards({ mode: 'pair', focus: 'bravo', second: 'delta' }), before = JSON.stringify(TAP.store.get().cmp);
      spy(TAP.layers, 'openDetails', function (calls) {
        card(el, 'delta').click();
        a.equal(calls.length, 1, 'details opened once');
        a.deepEqual(calls[0][0].regionIds, ['delta'], 'for that region');
      });
      a.equal(JSON.stringify(TAP.store.get().cmp), before, 'comparison unchanged');
      var head = qs('.tap-ov-card__open', card(el, 'bravo'));
      a.equal(head.tagName, 'BUTTON', 'a real button for the keyboard');
    });

    T.test('X-overview-card-source', 'Every card figure names its source and shows it when clicked (TPV-TC-092)', function (a) {
      var el = cards(), f = fig(el, 'alpha', 'nb.arr');
      var where = TAP.sources.address(TAP.measures.get('nb.arr')('alpha', {}).src).text;
      a.ok(f.getAttribute('title').indexOf(where) < 0, 'the title leaves the address to the data icon (D100)');
      qsa('[data-measure]', card(el, 'alpha')).forEach(function (n) {
        a.ok(!!n.getAttribute('title'), n.getAttribute('data-measure') + ' has a title');
      });
      spy(TAP.layers, 'openDetails', function (details) {
        spy(TAP.layers, 'open', function (calls) {
          f.click();
          a.equal(details.length, 0, 'a figure click does not open the card details');
          a.equal(calls.length, 1, 'a side panel opened');
          var body = T.dom.mount();
          calls[0][1].render(body);
          a.ok(txt(body).indexOf(where) < 0, 'no address as text (D100)');
          a.ok(window.T_TIP_TEXT(qs('.tap-srctip', body)).indexOf(where) >= 0, 'the panel’s data icon shows the source address');
          a.ok(txt(body).indexOf(TAP.format.moneyExact(2255)) >= 0, 'and the exact value');
        });
      });
    });

    T.test('X-overview-card-missing', 'A missing section reads "not provided", never 0, and a partial ambition says so (TPV-TC-090)', function (a) {
      var el = cards(), c = card(el, 'charlie');
      checkFig(a, el, 'charlie', 'cg.arr', null, 'money', 'C');
      var seg = qs('.tap-ov-card__segments', c);
      a.equal(txt(seg).indexOf('0'), -1, 'no zero on the customers line');
      a.ok(txt(seg).indexOf(NP()) >= 0, 'customers line reads not provided');
      a.ok(!!qs('.tap-ov-card__partial', c), 'partial note shown');
      a.match(txt(qs('.tap-ov-card__partial', c)), /customer growth/i, 'names the missing part');
      a.ok(!qs('.tap-ov-card__partial', card(el, 'alpha')), 'a complete ambition has no partial note');
    });

    T.test('X-overview-card-columns', 'Up to 8 cards share one row at 1280 px, otherwise two tidy rows (TPV-TC-091)', function (a) {
      var cols = TAP.overviewCards.columns;
      a.equal(cols(7, 1232), 7, '7 cards at 1280 px: one row');
      a.equal(cols(8, 1232), 8, '8 cards at 1280 px: one row');
      a.equal(cols(7, 940), 4, '7 cards at 125% zoom: 4 + 3');
      a.equal(cols(8, 940), 4, '8 cards at 125% zoom: 4 + 4');
      a.equal(cols(2, 1232), 2, 'two cards');
      a.ok(cols(7, 360) >= 1 && cols(7, 360) <= 2, 'narrow: one or two columns');
    });
  });

  /* ---------- US-1.5.2: ambition by region, and the Overview view (#30) ---------- */

  // Mounts the Overview view into the sandbox; the caller destroys it.
  function mountView() {
    var host = T.dom.mount();
    return { host: host, handle: TAP.views.get('overview').mount(host) };
  }
  // Runs fn with a stand-in panel module, so the view can be checked with the real panel or without it.
  function withPanel(fake, fn) {
    var orig = TAP.panel;
    TAP.panel = fake;
    try { fn(); } finally { TAP.panel = orig; }
  }

  T.suite('overview-view', function () {
    T.test('X-overview-view', 'The Overview view is registered, built and titled', function (a) {
      var v = TAP.views.get('overview');
      a.ok(!!v, 'registered');
      a.ok(!v.__stub, 'not the stub');
      a.equal(TAP.views.title('overview'), 'Overview');
    });

    T.test('X-overview-layout', 'Headline, then the cards, then the ambition panel', function (a) {
      var m = mountView();
      try {
        var order = qsa('.tap-ov > *', m.host).map(function (n) { return n.getAttribute('data-part'); });
        a.deepEqual(order, ['headline', 'cards', 'panel'], 'section order');
        a.equal(qs('[data-part="panel"]', m.host).getAttribute('data-report'), 'ov-ambition');
        a.equal(qsa('.tap-ov-card', m.host).length, 4, 'one card per region');
      } finally { m.handle.destroy(); }
    });

    T.test('X-overview-panel-guard', 'The ambition panel mounts through TAP.panel.create, and the view still works without it', function (a) {
      var made = [], destroyed = 0;
      withPanel({ create: function (el, id, opts) { made.push([el, id, opts]); return { destroy: function () { destroyed++; } }; } }, function () {
        var m = mountView();
        a.equal(made.length, 1, 'one panel');
        a.equal(made[0][1], 'ov-ambition', 'the ambition report');
        a.deepEqual(made[0][2], {}, 'no options');
        a.equal(made[0][0], qs('[data-part="panel"]', m.host), 'inside the panel slot');
        m.handle.destroy();
        a.equal(destroyed, 1, 'destroyed with the view');
      });
      withPanel({ create: function () { throw new Error('Not built yet (#14): TAP.panel.create'); } }, function () {
        var m = mountView();
        try {
          a.match(txt(qs('[data-part="panel"]', m.host)), /Not built yet/, 'the stub message shows in the slot');
          a.equal(qsa('.tap-ov-card', m.host).length, 4, 'the cards still draw');
        } finally { m.handle.destroy(); }
      });
    });

    T.test('X-overview-follows-cmp', 'Cards follow the comparison bar at once, and stop listening once the view is gone', function (a) {
      var m = mountView();
      TAP.store.set({ cmp: { mode: 'org' } });
      a.equal(qsa('.tap-ov-card', m.host).length, 1, 'organization total: one card');
      TAP.store.set({ cmp: { mode: 'pair', focus: 'bravo', second: 'alpha' } });
      a.deepEqual(qsa('.tap-ov-card', m.host).map(function (n) { return n.getAttribute('data-entity'); }), ['bravo', 'alpha'], 'pair');
      m.handle.destroy();
      TAP.store.set({ cmp: { mode: 'all' } });
      a.ok(qsa('.tap-ov-card', m.host).length <= 2, 'no redraw after destroy');
    });

    T.test('X-overview-ambition-def', 'The ambition report matches US-1.5.2 (TPV-TC-094)', function (a) {
      var d = TAP.reports.get('ov-ambition');
      a.deepEqual(TAP.reports.validate(d), [], 'valid');
      a.equal(d.view, 'overview');
      a.equal(d.title, 'How big is each region’s plan, and where does it come from?');
      a.equal(d.shape, 'parts', 'parts of a whole');
      a.equal(d.defaultType, 'stackedBar', 'stacked bar by default');
      ['stackedBar', 'stacked100', 'treemap', 'bubble', 'table'].forEach(function (k) { a.ok(d.types.indexOf(k) >= 0, k + ' offered'); });
      a.equal(d.types.indexOf('donut'), -1, 'no donut');
      a.deepEqual(d.measures.map(function (m) { return m.id; }), ['amb.arr', 'amb.services', 'amb.oi'], 'ARR, services, order intake; ARR first');
      a.deepEqual(d.parts['amb.arr'], ['nb.arr', 'cg.arr'], 'ARR split into new business and customer growth');
      a.equal(d.x, 'nb.arr', 'bubble across: new business');
      a.equal(d.y, 'cg.arr', 'bubble up: customer growth');
      a.equal(d.size.default, 'base.arr', 'bubble size: current ARR');
      a.deepEqual(d.breakdowns, ['year'], 'break down by year');
      a.ok(TAP.views.get('overview') && window.TAP_VIEWS.overview.reports.indexOf('ov-ambition') >= 0, 'listed on the Overview');
    });

    T.test('X-overview-chart-matches-cards', 'The chart’s ambition per region equals the card figure, in every mode (TPV-TC-093, 098)', function (a) {
      sample();
      var d = TAP.reports.get('ov-ambition');
      [{ mode: 'all' }, { mode: 'one', focus: 'apac', restAgg: 'average' }, { mode: 'one', focus: 'apac', restAgg: 'total' }, { mode: 'org' }]
        .forEach(function (c) {
          TAP.store.reset();
          var el = cards(c), ds = TAP.prepare.run(d, { def: d, cmp: TAP.store.get().cmp });
          ds.rows.forEach(function (r) {
            var f = fig(el, r.entityId, 'amb.arr');
            a.near(Number(f.getAttribute('data-v')), r.cells['amb.arr'].v, TOL, JSON.stringify(c) + ' ' + r.entityId);
          });
        });
    });
  });

  /* ---------- US-1.5.3: headline (#31); top insights removed by D92 (#487) ---------- */

  var H = function (key, vars) { return TAP.content.text('overview.headline.' + key, vars); };
  var words = function (n) { return TAP.content.text(n === 1 ? 'combined.region' : 'combined.regions'); };
  var nameOf = function (id) { return TAP.content.regionName(TAP.data.region(id)); };

  function headlineText() {
    var m = mountView();
    try { return txt(qs('.tap-ov__sentence', m.host)); } finally { m.handle.destroy(); }
  }

  // The industry most often placed in Tier 2, counted straight from the raw rows (ties: first in the lookup).
  function topTier2(plan, regionIds) {
    var best = null, bestN = 0;
    plan.lookups.industries.forEach(function (ind) {
      if (ind.rated === false) return;
      var n = plan.regions.filter(function (r) {
        return regionIds.indexOf(r.id) >= 0 && r.marketCoverage.some(function (m) { return m.industryId === ind.id && m.tier === 2; });
      }).length;
      if (n > bestN) { best = ind; bestN = n; }
    });
    return { industry: best, n: bestN };
  }

  // A stand-in insight engine over the fixture, for the length of fn.
  function withInsights(list, fn) {
    var orig = TAP.insights, hidden = [], calls = [];
    TAP.insights = {
      top: function (cmp, reportId, n) {
        calls.push([cmp, reportId, n]);
        return list.filter(function (x) { return hidden.indexOf(x.id) < 0; }).slice(0, n);
      },
      // The ambition panel reads its own insights through ranked
      ranked: function (cmp, opts) {
        var rid = opts && opts.reportId;
        return list.filter(function (x) { return hidden.indexOf(x.id) < 0 && (!rid || (x.attach || []).indexOf(rid) >= 0); });
      },
      all: function () { return list.slice(); },
      failures: function () { return []; },
      hide: function (id) { hidden.push(id); TAP.store.set({ hiddenInsights: hidden.slice() }); },
      unhide: function (id) { hidden.splice(hidden.indexOf(id), 1); },
      hidden: function () { return hidden.slice(); }
    };
    try { return fn(calls, hidden); } finally { TAP.insights = orig; }
  }
  function fixture() {
    var list = window.TEST_FIXTURES.insights;
    return JSON.parse(JSON.stringify(list));
  }

  // Review polish #382 (SV-19): the Overview keeps the same side gutter as every other view, so titles don't shift
  T.suite('overview-gutter', function () {
    // Every view column starts at the view area's edge, which lines up with the comparison bar (--tap-edge)
    T.test('X-review-SV-19', 'The Overview and the other view columns have the same side space', function (a) {
      var box = T.dom.mount();
      ['tap-ov', 'tap-vh-page', 'tap-ind', 'tap-ins', 'tap-guide'].forEach(function (cls) {
        var n = TAP.dom.el('div', { class: cls });
        box.appendChild(n);
        var s = getComputedStyle(n);
        a.equal(s.paddingLeft + ' ' + s.paddingRight, '0px 0px', cls + ': no gutter of its own');
      });
    });
  });

  T.suite('overview-headline', function () {
    T.test('TPV-TC-099', 'On the sample data, the headline equals the sentence built from the planted totals', function (a) {
      sample();
      var X = window.SAMPLE_EXPECT.headline, tier2 = topTier2(window.PLAN_DATA, window.SAMPLE_EXPECT.regions);
      a.equal(tier2.industry.id, 'education', 'raw count: Education is the most common Tier 2 industry');
      var expected = [
        H('group', { n: X.regions, regions: words(X.regions), amb: TAP.format.money(X.ambArr),
          nbShare: TAP.format.pct(X.nbShare), cgShare: TAP.format.pct(X.cgShare) }),
        H('cgMissing', { names: TAP.format.list(X.cgExcluded.map(nameOf)) }),
        H('tier2', { n: tier2.n, regions: words(tier2.n), industry: tier2.industry.name })
      ].join(' ');
      a.equal(headlineText(), expected);
      // Built from SAMPLE_EXPECT so it follows the generator (Q02 moved these figures in Phase 2)
      var esc = function (s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
      a.match(expected, new RegExp('^' + X.regions + ' regions plan ' + esc(TAP.format.money(X.ambArr)) + ' .* ' +
        esc(TAP.format.pct(X.nbShare)) + ' .* ' + esc(TAP.format.pct(X.cgShare)) + ' '), 'sanity: the planted figures');
    });

    T.test('TPV-TC-099', 'With no ambition figures at all, the headline says so instead of failing', function (a) {
      var p = T_FIXTURE('mini');
      p.regions.forEach(function (r) { r.newBusiness = []; r.customerGrowth.accounts = []; });
      TAP.data.load(p);
      a.equal(headlineText(), H('none'));
    });

    T.test('TPV-TC-099', 'With no Tier 2 industry, the headline leaves that sentence out', function (a) {
      var p = T_FIXTURE('mini');
      // Tier 1 rather than 3, so the new business rows on these industries stay valid for the data check
      p.regions.forEach(function (r) {
        r.marketCoverage.concat(r.newBusiness).forEach(function (m) { if (m.tier === 2) m.tier = 1; });
      });
      a.ok(TAP.data.load(p).ok, 'the changed data still loads');
      // Mini by hand: 10123 in all; new business 9405 / 10123, customer growth 718 / 10123; Region C gave no customer growth
      a.equal(headlineText(), [
        H('group', { n: 4, regions: words(4), amb: TAP.format.money(10123), nbShare: TAP.format.pct(9405 / 10123),
          cgShare: TAP.format.pct(718 / 10123) }),
        H('cgMissing', { names: 'Region C' })
      ].join(' '));
    });

    // Review fix #379 (SV-14): names from the workbooks are never marked as glossary terms
    T.test('X-review-SV-14', 'A name holding a glossary word gets no term button inside it', function (a) {
      var p = T_FIXTURE('mini');
      p.lookups.industries.filter(function (i) { return i.id === 'ind4'; })[0].name = 'Pipeline Services';   // Utilities, Tier 2 everywhere
      a.ok(TAP.data.load(p).ok, 'the renamed data loads');
      var m = mountView();
      try {
        var line = qs('.tap-ov__sentence', m.host);
        a.ok(txt(line).indexOf('make Pipeline Services a focus industry') >= 0, 'the tier sentence names the industry: ' + txt(line));
        var inName = qsa('.tap-term', line).filter(function (b) { return /Pipeline|Services/.test(b.textContent); });
        a.deepEqual(inName.map(function (b) { return b.textContent; }), [], 'no term button inside the industry name');
      } finally { m.handle.destroy(); }
    });

    T.test('X-overview-headline-focus', 'With a focus region, the headline is about it against the rest (TPV-TC-100)', function (a) {
      var R = window.TEST_EXPECT.mini.region.alpha, rest = window.TEST_EXPECT.mini.combined.restOfAlphaAverage;
      TAP.store.set({ cmp: { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' } });
      // Utilities is Tier 2 in Region B, C and D (3 of the other 3), and in Region A too
      a.equal(headlineText(), [
        H('region', { name: 'Region A', amb: TAP.format.money(R['amb.arr']), nbShare: TAP.format.pct(R['nb.arr'] / R['amb.arr']),
          cgShare: TAP.format.pct(R['cg.arr'] / R['amb.arr']) }),
        H('restAverage', { n: 3, regions: words(3), rest: TAP.format.money(rest['amb.arr']) }),
        H('cgMissing', { names: 'Region C' }),
        H('tier2FocusAll', { focus: 'Region A', m: 3, regions: words(3), industry: 'Utilities' })
      ].join(' '));
      TAP.store.set({ cmp: { restAgg: 'total' } });
      a.ok(headlineText().indexOf(H('restTotal', { n: 3, regions: words(3), rest: TAP.format.money(7150 + 418) })) >= 0,
        'as a total: 7150 new business + 418 customer growth (150 + 268)');
    });

    // Review fix #372 (SV-16): one other region reads as one region, not "the other 1 region"
    T.test('X-review-SV-1', 'With two regions, the headline names the other region in the singular', function (a) {
      var p = T_FIXTURE('mini');
      p.regions = p.regions.slice(0, 2);
      a.ok(TAP.data.load(p).ok, 'two-region data loads');
      ['average', 'total'].forEach(function (how) {
        TAP.store.set({ cmp: { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: how } });
        var s = headlineText();
        // Region B by hand: 4150 (mini-expected), the same as an average or a total of one region
        a.ok(s.indexOf(H('restOne', { rest: TAP.format.money(4150) })) >= 0, how + ': "' + s + '"');
        a.ok(!/other 1 /.test(s), how + ': no "other 1"');
      });
    });

    T.test('X-overview-headline-modes', 'Every comparison mode gives a complete sentence with no gaps', function (a) {
      sample();
      [{ mode: 'all' }, { mode: 'one', focus: 'ceu' }, { mode: 'one', focus: 'na', restAs: 'individual' }, { mode: 'pair', focus: 'na', second: 'ceu' },
        { mode: 'set', set: ['neu', 'apac'] }, { mode: 'org' }].forEach(function (c) {
        TAP.store.reset();
        TAP.store.set({ cmp: c });
        var s = headlineText();
        a.ok(s.length > 20, JSON.stringify(c) + ': ' + s);
        a.equal(s.indexOf('['), -1, 'no missing wording key');
        a.equal(s.indexOf('{'), -1, 'no unfilled placeholder');
        a.equal(/NaN|undefined/.test(s), false, 'no broken figure');
      });
    });

    T.test('X-overview-headline-follows', 'The headline follows the comparison bar at once', function (a) {
      var m = mountView();
      try {
        var before = txt(qs('.tap-ov__sentence', m.host));
        TAP.store.set({ cmp: { mode: 'pair', focus: 'bravo', second: 'delta' } });
        var after = txt(qs('.tap-ov__sentence', m.host));
        a.ok(after !== before && after.indexOf('Region B') === 0, 'now about Region B');
      } finally { m.handle.destroy(); }
    });

    T.test('X-overview-headline-source', 'Headline figures are plain bold; one Sources button lists where each comes from (TPV-TC-101)', function (a) {
      sample();
      var m = mountView();
      try {
        var nums = qsa('.tap-ov__sentence .tap-ov__num', m.host);
        a.ok(nums.length >= 4, 'ambition, both shares and the Tier 2 count are bold figures');
        a.equal(qsa('.tap-ov__sentence button', m.host).filter(function (b) { return !b.classList.contains('tap-term'); }).length, 0,
          'no figure is a button or link');
        var btn = qs('.tap-ov__sources', m.host);
        a.ok(btn && btn.tagName === 'BUTTON', 'one Sources button');
        spy(TAP.layers, 'open', function (calls) {
          btn.click();
          a.equal(calls.length, 1, 'a side panel opens');
          a.equal(calls[0][0], 'headline-sources', 'the headline sources panel');
          a.ok(!!calls[0][1].title, 'with a title');
          var body = T.dom.mount();
          calls[0][1].render(body);
          var s = txt(body), tips = qsa('.tap-srctip', body).map(window.T_TIP_TEXT).join(' | ');
          a.ok(s.indexOf(TAP.format.moneyExact(window.SAMPLE_EXPECT.headline.ambArr)) >= 0, 'the exact ambition');
          a.ok(s.indexOf(TAP.sources.address(TAP.measures.combined('amb.arr', { kind: 'combined', regionIds: window.SAMPLE_EXPECT.regions, how: 'total' }, {}).src).text) >= 0,
            'how the ambition was combined');
          var edu = TAP.measures.get('ind.tier')('na', { industryId: 'education' });
          a.ok(s.indexOf(TAP.sources.address(edu.src).text) < 0, 'no address as text (D100)');
          a.ok(tips.indexOf(TAP.sources.address(edu.src).text) >= 0, 'the file › sheet › cell behind the Tier 2 count, behind its data icon');
        });
      } finally { m.handle.destroy(); }
    });

    T.test('X-overview-headline-wording', 'The headline wording comes from the content file (TPV-TC-104)', function (a) {
      var text = window.TAP_CONTENT.text.overview.headline, saved = text.group;
      text.group = 'Plan total {amb} across {n} {regions}.';
      try { a.equal(headlineText().indexOf('Plan total ' + TAP.format.money(10123) + ' across 4 regions.'), 0); } finally { text.group = saved; }
    });
  });

  // D92 (amends US-1.5.3): the Overview no longer lists top insights. They stay on the Insights page and in each panel.
  T.suite('overview-insights', function () {
    T.test('X-d92-no-top-insights', 'The Overview has no insight list and no Show me or Hide buttons; the headline still shows', function (a) {
      sample();
      var list = fixture();
      a.ok(list.length >= 3, 'fixture has insights to show');
      withInsights(list, function () {
        var m = mountView();
        try {
          // The ambition chart's panel keeps its own insight list (D92 removes only the Overview's block), so look outside it
          var outside = function (n) { return !n.closest('.tap-ov__panel'); };
          a.equal(qsa('[data-part="insights"], [data-insight]', m.host).filter(outside).length, 0, 'no insight list or insight items');
          // The wording any insight's buttons use, on the Insights page, in a panel or under a view title
          var words = ['Show me', 'Hide for this session', TAP.content.text('insightsPage.showMe'), TAP.content.text('insightsPage.hide'),
            TAP.content.text('viewHead.showMe')];
          var buttons = qsa('button', m.host).filter(outside).map(txt).filter(function (s) { return words.indexOf(s) >= 0; });
          a.deepEqual(buttons, [], 'no Show me or Hide buttons');
          a.equal(qsa('a[href="#insights"]', m.host).length, 0, 'no link to the Insights page');
          a.ok(txt(qs('.tap-ov__sentence', m.host)).length > 0, 'the headline still shows');
          a.ok(!!qs('[data-part="headline"] .tap-ov__sentence', m.host), 'inside the headline part');
        } finally { m.handle.destroy(); }
      });
    });
  });
})(window.TAP);
