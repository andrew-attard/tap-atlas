/*
 * File: tests/test-overview.js
 * Purpose: Tests for region cards, the Overview view and ambition chart, the headline, and the top insights for the
 *          organization as a whole (D119, superseding D92).
 *          TPV-TC-095 and 096 live with the engine tests (test-shapes.js, test-measures.js).
 * Provides: test cases for OVERVIEW stories (#29, #30, #31, #523, #529): TPV-TC-087, TPV-TC-099, X-overview-*, X-d119-*,
 *           X-d117-* (the cards answer "will it land?")
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
    // 'whole': a count of customers reads in whole numbers (implied wins are a product of a rate)
    var want = unit === 'money' ? TAP.format.money(v) : unit === 'whole' ? TAP.format.num(v, { decimals: 0 }) : TAP.format.num(v);
    a.equal(txt(f), want, label + ' ' + measure + ' text');
  }

  // Swaps a function for a recorder for the length of fn, then puts it back.
  function spy(obj, name, fn, ret) {
    var orig = obj[name], calls = [];
    obj[name] = function () { calls.push(Array.prototype.slice.call(arguments)); return ret; };
    try { fn(calls); } finally { obj[name] = orig; }
  }

  // D117: the card no longer carries tier counts, target accounts or segment counts.
  function noOldLines(a, c, label) {
    var old = qsa('[data-measure^="focus."], [data-measure="nb.targetAccounts"], [data-measure^="cg.segment."]', c);
    a.equal(old.length, 0, label + ': no tier, target-account or segment figures');
    a.equal(qsa('.tap-ov-card__focus, .tap-ov-card__pool, .tap-ov-card__customers', c).length, 0, label + ': no such lines');
  }

  // A colour as the browser writes it, for comparing inline styles.
  function css(colour) { var d = document.createElement('div'); d.style.backgroundColor = colour; return d.style.backgroundColor; }

  T.suite('overview', function () {

    /* ---------- US-1.5.1: plan at a glance, per region (#29) ---------- */

    // D117: tier counts, target accounts and segment counts left the card; the profile's glance keeps them (TPV-TC-443).
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
        checkFig(a, el, r, 'nb.wins', e['nb.wins'], 'whole', r);
        noOldLines(a, card(el, r), r);
      });
    });

    T.test('TPV-TC-087', 'Sample data: each card’s figures equal the generator’s totals', function (a) {
      sample();
      var S = window.SAMPLE_EXPECT, el = cards();
      S.regions.forEach(function (r) {
        var e = S.totals[r];
        ['amb.arr', 'nb.arr', 'cg.arr', 'amb.services'].forEach(function (m) { checkFig(a, el, r, m, e[m], 'money', r); });
        checkFig(a, el, r, 'nb.wins', e['nb.wins'], 'whole', r);
        noOldLines(a, card(el, r), r);
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
      // The rest averages counts: implied wins (22 + 1 + 60) / 3 = 27.67, shown as 28 customers
      checkFig(a, el, 'rest', 'nb.wins', 83 / 3, 'whole', 'rest of A');
    });

    T.test('X-overview-card-org', 'Organization total: one dark-grey card with summed figures and the gaps named', function (a) {
      var X = window.TEST_EXPECT.mini.combined.orgTotal, el = cards({ mode: 'org' });
      a.equal(qsa('.tap-ov-card', el).length, 1);
      a.ok(card(el, 'org').classList.contains('is-combined'));
      checkFig(a, el, 'org', 'amb.arr', X['amb.arr'], 'money', 'org');
      checkFig(a, el, 'org', 'nb.arr', X['nb.arr'], 'money', 'org');
      checkFig(a, el, 'org', 'cg.arr', X['cg.arr'].v, 'money', 'org');
      // By hand from the per-region figures: implied wins 6 + 22 + 1 + 60
      checkFig(a, el, 'org', 'nb.wins', 89, 'whole', 'org');
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
      // D117: the growth-in-top-3-accounts check stands where the customers line was
      checkFig(a, el, 'charlie', 'cg.top3Share', null, 'pct', 'C');
      var top3 = qs('.tap-ov-card__check[data-check="top3"] .tap-ov-card__checkvalue', c);
      a.equal(txt(top3).indexOf('0'), -1, 'no zero on the top-3 check');
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

    T.test('X-overview-layout', 'Headline, top insights (D119), then the cards, then the ambition panel', function (a) {
      var m = mountView();
      try {
        var order = qsa('.tap-ov > *', m.host).map(function (n) { return n.getAttribute('data-part'); });
        a.deepEqual(order, ['headline', 'insights', 'cards', 'panel'], 'section order');
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
        a.deepEqual(made[0][2], { cmp: TAP.store.defaults().cmp, noCompare: true, broadOnly: true },
          'every region and no comparison menu (D118); broad insights only (D119)');
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

    T.test('X-overview-follows-cmp', 'D118: the cards stay on every region whatever the comparison, and stop listening once the view is gone', function (a) {
      var m = mountView();
      TAP.store.set({ cmp: { mode: 'set', set: ['charlie'] } });
      a.equal(qsa('.tap-ov-card', m.host).length, 4, 'one region selected: still four cards');
      TAP.store.set({ cmp: { mode: 'one', focus: 'bravo', restAs: 'combined', restAgg: 'average' } });
      a.deepEqual(qsa('.tap-ov-card', m.host).map(function (n) { return n.getAttribute('data-entity'); }), ['alpha', 'bravo', 'charlie', 'delta'],
        'one vs the rest: every region, in file order');
      m.handle.destroy();
      var before = m.host.querySelector('.tap-ov-card');
      TAP.store.set({ hiddenInsights: ['x:y'] });   // the cards would redraw for this while mounted (D117)
      a.equal(m.host.querySelector('.tap-ov-card'), before, 'no redraw after destroy');
      TAP.store.reset();
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

  /* ---------- US-1.5.3: headline (#31); top insights for the organization (D119, #529) ---------- */

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

    T.test('X-overview-headline-focus', 'D118: with a focus region chosen on another view, the headline stays about every region (was TPV-TC-100)', function (a) {
      TAP.store.set({ cmp: { mode: 'all' } });
      var all = headlineText();
      TAP.store.set({ cmp: { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' } });
      a.equal(headlineText(), all, 'the all-regions headline');
      TAP.store.reset();
    });


    T.test('X-overview-headline-modes', 'D118: every comparison mode leaves the complete all-regions headline, with no gaps', function (a) {
      sample();
      TAP.store.reset();
      var all = headlineText();
      a.ok(all.length > 20 && all.indexOf('[') < 0 && all.indexOf('{') < 0 && !/NaN|undefined/.test(all), 'complete: ' + all);
      [{ mode: 'one', focus: 'ceu' }, { mode: 'one', focus: 'na', restAs: 'individual' }, { mode: 'set', set: ['neu', 'apac'] }].forEach(function (c) {
        TAP.store.reset();
        TAP.store.set({ cmp: c });
        a.equal(headlineText(), all, JSON.stringify(c) + ': the same headline');
      });
      TAP.store.reset();
    });

    T.test('X-overview-headline-follows', 'D118: the headline on screen stays as it is when the comparison changes', function (a) {
      var m = mountView();
      try {
        var before = txt(qs('.tap-ov__sentence', m.host));
        TAP.store.set({ cmp: { mode: 'set', set: ['bravo', 'delta'] } });
        a.equal(txt(qs('.tap-ov__sentence', m.host)), before, 'unchanged');
      } finally { m.handle.destroy(); TAP.store.reset(); }
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

  /* ---------- D117 (#523, amends US-1.5.1): the cards answer "will it land?" ---------- */

  T.suite('overview-land', function () {
    function landCards(cmp) { sample(); TAP.store.reset(); TAP.insights.unhide(); return cards(cmp || { mode: 'all' }); }
    function check(c, id) { return qs('.tap-ov-card__check[data-check="' + id + '"]', c); }
    function value(c, id) { return qs('.tap-ov-card__checkvalue .tap-ov-fig', check(c, id)); }
    function others(c, id) { return qs('.tap-ov-card__others .tap-ov-fig', check(c, id)); }
    function markers(c) { return qsa('.tap-ov-card__discuss', c).map(function (b) { return b.getAttribute('data-rule'); }).sort(); }
    var cardText = function (k, v) { return TAP.content.text('overview.cards.' + k, v); };
    var RULES = ['spGap', 'pipelineCover', 'winsVsPeers', 'concentration'];

    T.test('X-d117-cards-land', 'North America: the plan against its strategic plan, in the spGap rule’s own figures', function (a) {
      var el = landCards(), na = card(el, 'na'), P = window.SAMPLE_EXPECT.p4.regions;
      var sp = qs('.tap-ov-card__sp .tap-ov-fig', na);
      // By hand: plan 21,732.4 against strategic plan 23,170 over three years, 6.2% below
      a.near(P.na.strategicPlan.variancePct3, -0.062046, 1e-6, 'the planted figure');
      a.equal(sp.getAttribute('data-measure'), 'sp.variancePct', 'the spGap rule’s measure');
      a.near(Number(sp.getAttribute('data-v')), P.na.strategicPlan.variancePct3, 1e-5, 'its value');
      a.equal(txt(sp), '6% below strategic plan', 'in plain words');
      a.equal(txt(qs('.tap-ov-card__sp .tap-ov-fig', card(el, 'latam'))), '25% above strategic plan', 'above, for Latin America');
      a.equal(P.neu.strategicPlan, null, 'Northern Europe has no strategic plan');
      a.equal(txt(qs('.tap-ov-card__sp', card(el, 'neu'))), cardText('sp.none'), 'and its card says so');
      a.equal(cardText('sp.none'), 'No strategic plan');
    });

    T.test('X-d117-cards-land', 'The split has one swatched line per part, value and share adding to 100%; Services has no swatch', function (a) {
      var el = landCards(), na = card(el, 'na'), e = window.SAMPLE_EXPECT.totals.na;
      var parts = qsa('.tap-ov-card__part', na), segs = qsa('.tap-ov-card__split > span', na);
      a.equal(parts.length, 2, 'two swatched lines');
      a.equal(segs.length, 2, 'two bar segments');
      parts.forEach(function (p, i) {
        var sw = qs('.tap-ov-card__swatch', p);
        a.ok(!!sw, 'line ' + i + ' has a swatch');
        a.equal(sw.style.backgroundColor, segs[i].style.backgroundColor, 'line ' + i + ' swatch matches its segment');
      });
      // By hand: 11,218.6 / 17,262.8 = 65.0% new business, 35% customer growth
      a.equal(txt(parts[0]), 'New business ' + TAP.format.money(e['nb.arr']) + ' 65%', 'new business line');
      a.equal(txt(parts[1]), 'Customer growth ' + TAP.format.money(e['cg.arr']) + ' 35%', 'customer growth line');
      a.equal(txt(parts[1]), 'Customer growth €6M 35%', 'as the owner reads it');
      window.SAMPLE_EXPECT.regions.forEach(function (r) {
        var sh = qsa('.tap-ov-card__share', card(el, r)).map(function (n) { return parseFloat(txt(n)); });
        if (sh.length === 2) a.equal(sh[0] + sh[1], 100, r + ': shares add to 100%');
      });
      var svc = qs('.tap-ov-card__row--minor', na);
      a.ok(!!svc && !qs('.tap-ov-card__swatch', svc), 'Services below, without a swatch');
      a.equal(qsa('.tap-ov-card__swatch', card(el, 'ceu')).length, 0, 'no customer growth: no bar, no swatches');
    });

    T.test('X-d117-cards-land', 'Will it land: three checks equal the measures, each with the other regions’ figure', function (a) {
      var el = landCards(), na = card(el, 'na'), S = window.SAMPLE_EXPECT, e = S.totals;
      a.equal(txt(qs('.tap-ov-card__landtitle', na)), cardText('land.title'), 'the heading');
      a.equal(cardText('land.title'), 'Will it land?');
      // Pipeline cover, year 1: pipeline created in 12 months / year-1 new business ARR = 13,275 / 3,321.4 = 4.0
      a.near(Number(value(na, 'cover').getAttribute('data-v')), e.na['base.pipeline12m'] / e.na['nb.arr.y1'], 1e-6, 'cover value');
      a.equal(txt(value(na, 'cover')), '4.0×', 'cover text');
      // The others together: (360.05 + 9,161 + 7,734 + 7,663 + 3,624 + 7,477) / (1,440.2 + 2,577 + 1,818.3 + 2,535.8 + 936.2 + 778.8)
      a.near(Number(others(na, 'cover').getAttribute('data-v')), 36019.05 / 10086.3, 1e-6, 'others cover');
      a.equal(txt(qs('.tap-ov-card__others', check(na, 'cover'))), 'others: 3.6×', 'others cover text');
      a.equal(txt(value(card(el, 'latam'), 'cover')), '0.3×', 'Latin America: 360.05 / 1,440.2');
      // New customers needed: the winsVsPeers figures, 78 against the simple average of the other six, 26
      a.near(Number(value(na, 'wins').getAttribute('data-v')), S.p12.value, 1e-6, 'wins');
      a.equal(txt(value(na, 'wins')), '78', 'wins text');
      a.near(Number(others(na, 'wins').getAttribute('data-v')), S.p12.othersAvg, 1e-5, 'others wins');
      a.equal(txt(qs('.tap-ov-card__others', check(na, 'wins'))), 'others: 26', 'others wins text');
      // Growth in top 3 accounts: the concentration figure, 60%, against the insight engine's own "others" figure
      a.near(Number(value(na, 'top3').getAttribute('data-v')), S.p13.share, 1e-5, 'top 3 share');
      a.equal(txt(value(na, 'top3')), '60%', 'top 3 text');
      a.near(Number(others(na, 'top3').getAttribute('data-v')), TAP.insights.util.others('cg.top3Share', 'na').v, 1e-9, 'others top 3');
      // A check with no data reads not provided: Central Europe has no customer growth
      a.equal(txt(value(card(el, 'ceu'), 'top3')), NP(), 'not provided');
      // The pipeline cover label is a glossary term
      var term = qs('.tap-term', check(na, 'cover'));
      a.ok(!!term && !!TAP.content.term(term.getAttribute('data-term')), 'pipeline cover opens a glossary definition');
    });

    T.test('X-d117-cards-land', 'A "discuss" marker shows exactly where a matching insight exists, and Show me opens it', function (a) {
      var el = landCards();
      // From the sample's insights (the planted cases): wins and concentration for North America; strategic plan
      // and pipeline cover for Latin America; strategic plan for Asia Pacific; concentration for Northern Europe
      var want = { na: ['concentration', 'winsVsPeers'], latam: ['pipelineCover', 'spGap'], neu: ['concentration'], seu: [], ceu: [], mea: [],
        apac: ['spGap'] };
      Object.keys(want).forEach(function (r) {
        a.deepEqual(markers(card(el, r)), want[r], r + ': markers');
        var fromEngine = TAP.insights.all().filter(function (x) {
          return RULES.indexOf(x.ruleId) >= 0 && x.regionIds.length === 1 && x.regionIds[0] === r;
        }).map(function (x) { return x.ruleId; }).sort();
        a.deepEqual(markers(card(el, r)), fromEngine, r + ': the same as the engine’s insights');
      });
      var m = qs('.tap-ov-card__discuss', check(card(el, 'na'), 'wins'));
      a.equal(m.tagName, 'BUTTON', 'a button');
      a.ok(!!qs('svg', m), 'with a glyph');
      a.equal(txt(m), cardText('land.discuss'), 'and the visible word');
      a.equal(cardText('land.discuss'), 'discuss');
      spy(TAP.layers, 'openDetails', function (details) {
        spy(TAP.bus, 'emit', function (calls) {
          m.click();
          a.equal(details.length, 0, 'the card’s details do not open');
          a.equal(calls.length, 1, 'one event');
          a.equal(calls[0][0], 'showme', 'Show me');
          a.equal(calls[0][1].insightId, 'winsVsPeers:na', 'at that insight');
        });
      });
      TAP.insights.hide('winsVsPeers:na');
      try {
        a.deepEqual(markers(card(cards(), 'na')), ['concentration'], 'a hidden insight takes its marker away');
      } finally { TAP.insights.unhide(); }
    });

    T.test('X-d117-cards-land', 'A combined card shows the same lines with no "others" lines or markers', function (a) {
      var el = landCards({ mode: 'one', focus: 'latam', restAs: 'combined', restAgg: 'average' }), rest = card(el, 'rest');
      a.ok(!!rest && rest.classList.contains('is-combined'), 'the rest is one combined card');
      a.ok(!!qs('.tap-ov-card__sp .tap-ov-fig', rest), 'strategic plan line');
      a.equal(qsa('.tap-ov-card__part', rest).length, 2, 'two swatched lines');
      ['cover', 'wins', 'top3'].forEach(function (k) { a.ok(!!value(rest, k), k + ' check'); });
      a.equal(qsa('.tap-ov-card__others', rest).length, 0, 'no others lines');
      a.equal(markers(rest).length, 0, 'no markers');
      a.equal(qsa('.tap-ov-card__others', card(el, 'latam')).length, 3, 'the focus card keeps its others lines');
      a.deepEqual(markers(card(el, 'latam')), ['pipelineCover', 'spGap'], 'and its markers');
    });

    T.test('X-d117-cards-land', 'Sections line up: every card holds the same parts in the same order', function (a) {
      var el = landCards({ mode: 'one', focus: 'na', restAs: 'combined', restAgg: 'average' });
      var order = function (c) { return Array.prototype.map.call(c.children, function (n) { return n.getAttribute('data-part'); }); };
      a.deepEqual(order(card(el, 'na')), order(card(el, 'rest')), 'region and combined card');
      a.deepEqual(order(card(el, 'na')), ['bar', 'head', 'ambition', 'mix', 'land', 'cover', 'wins', 'top3', 'profile'], 'the parts');
    });

    T.test('X-d117-cards-no-sp-part', 'A file without the strategic plan part shows no strategic plan line (D57)', function (a) {
      TAP.store.reset();
      var el = cards({ mode: 'all' });
      a.ok(!TAP.measures.available('sp.oi'), 'the mini file has no strategic plan');
      a.equal(qsa('.tap-ov-card__sp', el).length, 0, 'no strategic plan line');
      a.equal(qsa('.tap-ov-card__check', card(el, 'alpha')).length, 3, 'the three checks still show');
    });
  });

  // D119 (supersedes D92, amends US-1.5.3): a "Top insights" block for the organization as a whole. An insight qualifies
  // when it names at least overviewMinRegions regions or its rule is marked broad (built on all regions' total);
  // context insights never do. Nothing about one or two regions shows anywhere on the Overview.
  T.suite('overview-insights', function () {
    // Read by hand from the sample's insight list (dump-insights.js): the four that are not context and name 3+ regions
    // or come from a broad rule, by significance: spTotal (0.55, 6 regions, broad), notYetWinnable (0.46, 4 regions),
    // priorityVsPlan (0.44, 5 regions), groupPriority (0.43, 4 regions). Every other figure-based insight names one region.
    var EXPECT = ['spTotal:org', 'notYetWinnable:fsm', 'priorityVsPlan:manufacturing'], NEXT = 'groupPriority:datacenters:ability';
    // The figures of PLANTED-CASES R03 (SAMPLE_EXPECT.r03), as the D114 check reads them
    function spTotalSentence() {
      var R3 = window.SAMPLE_EXPECT.r03, F = TAP.format;
      return 'Together, the three-year plans of the 6 regions with a strategic plan are ' + F.pct(-R3.variancePct3) +
        ' below their strategic plans (' + F.money(R3.plans3) + ' against ' + F.money(R3.strategicPlans3) + '). Not included, with no strategic plan: Northern Europe.';
    }
    var S = function () { return window.TAP_SETTINGS.insights; };

    function fresh(cmp) {
      sample();
      TAP.store.reset();
      TAP.insights.unhide();
      if (cmp) TAP.store.set({ cmp: cmp });
    }
    function block(host) { return qs('[data-part="insights"]', host); }
    function ids(host) {
      var b = block(host);
      return b ? qsa('[data-insight]', b).map(function (n) { return n.getAttribute('data-insight'); }) : [];
    }
    function byId(id) { return TAP.insights.all().filter(function (x) { return x.id === id; })[0]; }
    function broad(x) {
      var rule = (window.TAP_RULES.rules || []).filter(function (r) { return r.id === x.ruleId; })[0] || {};
      return rule.broad === true || x.regionIds.length >= (S().overviewMinRegions || 3);
    }
    T.test('X-d119-top-insights', 'The setting and the broad rule mark exist: overviewMinRegions is 3, spTotal is broad', function (a) {
      a.equal(S().overviewMinRegions, 3, 'overviewMinRegions in config/settings.js');
      var sp = window.TAP_RULES.rules.filter(function (r) { return r.id === 'spTotal'; })[0];
      a.equal(sp && sp.broad, true, 'spTotal is marked broad in config/insight-rules.js');
    });

    T.test('X-d119-top-insights', 'On the sample, the block lists the three broad insights by significance, spTotal first', function (a) {
      fresh();
      var m = mountView();
      try {
        var b = block(m.host);
        a.ok(!!b, 'the block shows');
        a.deepEqual(ids(m.host), EXPECT, 'the three broad insights, in the engine’s order');
        a.equal(txt(qs('h2', b)), TAP.content.text('overview.insights.title'), 'titled from the content file');
        a.equal(TAP.content.text('overview.insights.title'), 'Top insights', 'block title');
        a.equal(txt(qs('.tap-ov__insights-intro', b)), 'Findings that span the organization; region findings are on each view.', 'its intro line');
        var sigs = EXPECT.map(function (id) { return byId(id).significance; });
        a.ok(sigs[0] >= sigs[1] && sigs[1] >= sigs[2], 'ordered by significance');
        EXPECT.forEach(function (id) {
          var x = byId(id), item = qs('[data-insight="' + id + '"]', b);
          a.ok(!x.context, id + ': not context');
          a.ok(broad(x), id + ': names 3+ regions or comes from a broad rule');
          a.equal(txt(qs('.tap-ov-insight__sentence', item)), x.sentence, id + ': its sentence');
          a.ok(!!x.why && txt(qs('.tap-ov-insight__why', item)) === x.why, id + ': its why line');
          var words = qsa('button', item).map(txt);
          a.ok(words.indexOf(TAP.content.text('overview.insights.showMe')) >= 0, id + ': Show me');
          a.ok(words.indexOf(TAP.content.text('overview.insights.hide')) >= 0, id + ': Hide for this session');
        });
        a.equal(txt(qs('[data-insight="spTotal:org"] .tap-ov-insight__sentence', b)), spTotalSentence(), 'spTotal reads as expected');
        // Under the headline, above the cards
        var parts = qsa('.tap-ov > [data-part]', m.host).map(function (n) { return n.getAttribute('data-part'); });
        a.deepEqual(parts.slice(0, 3), ['headline', 'insights', 'cards'], 'headline, then the block, then the cards');
      } finally { m.handle.destroy(); }
    });

    T.test('X-d119-top-insights', 'No insight about only one or two regions anywhere on the Overview: block, panel, headline', function (a) {
      fresh();
      // The ambition chart has region insights attached (pipeline cover, plan make-up), so the panel test means something
      var attached = TAP.insights.ranked(TAP.store.get().cmp, { reportId: 'ov-ambition' });
      a.ok(attached.some(function (x) { return x.regionIds.length < 3; }), 'the chart has region insights to leave out');
      var m = mountView();
      try {
        var shown = qsa('[data-insight]', m.host).map(function (n) { return byId(n.getAttribute('data-insight').replace(/:\d+$/, '')); });
        a.ok(shown.length >= 3, 'insights on the page');
        a.deepEqual(shown.filter(function (x) { return !x || !broad(x) || x.context; }), [], 'every insight shown is broad');
        var count = qs('.tap-ov__panel [data-action="insights"] .tap-panel__count', m.host);
        a.equal(count ? txt(count) : '0', String(attached.filter(broad).length), 'the panel counts broad insights only');
        var head = TAP.viewHead.headline('overview', TAP.store.get().cmp);
        a.ok(!head || broad(head), 'the Overview’s headline insight, if any, is broad');
      } finally { m.handle.destroy(); }
    });

    T.test('X-d119-top-insights', 'The Overview ranks for all regions: a focus region does not reorder or narrow the block', function (a) {
      fresh({ mode: 'one', focus: 'na', restAs: 'separate', restAgg: 'average' });
      var m = mountView();
      try { a.deepEqual(ids(m.host), EXPECT, 'the same three in the same order'); } finally { m.handle.destroy(); }
    });

    T.test('X-d119-top-insights', 'Hiding one brings in the next; hiding every one leaves the block out, with no empty text', function (a) {
      fresh();
      var m = mountView();
      try {
        qs('[data-insight="spTotal:org"] .tap-ov-insight__hide', m.host).click();
        a.ok(TAP.insights.hidden().indexOf('spTotal:org') >= 0, 'Hide goes through the engine');
        a.deepEqual(ids(m.host), EXPECT.slice(1).concat([NEXT]), 'the next broad insight comes in');
        EXPECT.slice(1).concat([NEXT]).forEach(function (id) { TAP.insights.hide(id); });
        var b = block(m.host);
        a.ok(!b || (b.hidden && !b.children.length), 'no block: left out, nothing in it');
        a.equal(txt(m.host).indexOf(TAP.content.text('overview.insights.title')), -1, 'no title and no empty-state text');
      } finally { m.handle.destroy(); TAP.insights.unhide(); }
    });

    T.test('X-d119-top-insights', 'Show me sends the insight to its chart', function (a) {
      fresh();
      var m = mountView(), got = [], off = TAP.bus.on('showme', function (e) { got.push(e); });
      try {
        qs('[data-insight="spTotal:org"] .tap-ov-insight__show', m.host).click();
        a.equal(got.length && got[0].insightId, 'spTotal:org', 'showme for spTotal');
        a.equal(got.length && got[0].target.reportId, byId('spTotal:org').reportId, 'at its chart');
      } finally { if (typeof off === 'function') off(); m.handle.destroy(); TAP.store.reset(); }
    });
  });
})(window.TAP);
