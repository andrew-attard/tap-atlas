/*
 * File: tests/test-overview.js
 * Purpose: Tests for region cards, the Overview view and ambition chart, the headline, and the top insights for the
 *          organization as a whole (D119, superseding D92).
 *          TPV-TC-095 and 096 live with the engine tests (test-shapes.js, test-measures.js).
 * Provides: test cases for OVERVIEW stories (#29, #30, #31, #529, #546): TPV-TC-087, TPV-TC-099, X-overview-*, X-d119-*,
 *           X-d127-card-snapshot (the cards are a snapshot again), X-d117-cards-swatch (the split's swatches, kept)
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

  // D127: the card no longer carries the strategic plan line, "Will it land?" or its "discuss" markers (D117).
  function noLandParts(a, c, label) {
    a.equal(qsa('.tap-ov-card__sp, .tap-ov-card__landtitle, .tap-ov-card__check, .tap-ov-card__others, .tap-ov-card__discuss', c).length, 0,
      label + ': no strategic plan line, checks or markers');
    a.equal(qsa('[data-measure^="sp."], [data-measure="nb.wins"], [data-measure="cg.top3Share"], [data-measure="cover.y1"]', c).length, 0,
      label + ': none of their figures');
  }

  // A colour as the browser writes it, for comparing inline styles.
  function css(colour) { var d = document.createElement('div'); d.style.backgroundColor = colour; return d.style.backgroundColor; }

  T.suite('overview', function () {

    /* ---------- US-1.5.1: plan at a glance, per region (#29) ---------- */

    // D127: tier counts, target accounts and segment counts are back on the card; "Will it land?" (D117) has left it.
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
        noLandParts(a, card(el, r), r);
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
        noLandParts(a, card(el, r), r);
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

    T.test('X-overview-card-source', 'Every card figure names itself in its title and shows its source when clicked (TPV-TC-092, D129)', function (a) {
      var el = cards(), f = fig(el, 'alpha', 'nb.arr');
      var where = TAP.sources.address(TAP.measures.get('nb.arr')('alpha', {}).src).text;
      a.ok(f.getAttribute('title').indexOf(where) < 0, 'the title leaves the address to the popover (D100)');
      qsa('[data-measure]', card(el, 'alpha')).forEach(function (n) {
        a.ok(!!n.getAttribute('title'), n.getAttribute('data-measure') + ' has a title');
      });
      try {
        spy(TAP.layers, 'openDetails', function (details) {
          spy(TAP.layers, 'open', function (calls) {
            f.click();
            a.equal(details.length, 0, 'a figure click does not open the card details');
            a.equal(calls.length, 0, 'nor a side panel (D129)');
          });
        });
        var p = qs('.tap-figpop', document);
        a.ok(!!p, 'a popover opened');
        a.ok(txt(p).indexOf(where) >= 0, 'it shows the source address');
        a.ok(txt(p).indexOf(TAP.format.moneyExact(2255)) >= 0, 'and the exact value');
      } finally { TAP.sourceTip.close(); }
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

  /* ---------- D127 (#546, supersedes D117 except its swatches): the cards are a quick snapshot again ---------- */

  T.suite('overview-snapshot', function () {
    function snapCards(cmp) { sample(); TAP.store.reset(); TAP.insights.unhide(); return cards(cmp || { mode: 'all' }); }
    function line(c, part) { return qs('[data-part="' + part + '"]', c); }

    T.test('X-d127-card-snapshot', 'North America reads as a snapshot, in order: name, ambition, split, Services, Focus, pool, Customers, Open profile', function (a) {
      var el = snapCards(), na = card(el, 'na'), e = window.SAMPLE_EXPECT.totals.na;
      var order = Array.prototype.map.call(na.children, function (n) { return n.getAttribute('data-part'); });
      a.deepEqual(order, ['bar', 'head', 'ambition', 'mix', 'focus', 'pool', 'customers', 'profile'], 'the parts, in order');
      a.equal(txt(qs('.tap-ov-card__name', na)), 'North America', 'the region name');
      a.equal(txt(qs('.tap-ov-card__label', line(na, 'ambition'))), '3-year ambition (ARR)', 'the ambition label');
      a.equal(txt(qs('.tap-ov-fig--big', na)), TAP.format.money(e['amb.arr']), 'the ambition figure');
      a.equal(txt(qs('.tap-ov-card__row--minor', na)), 'Services ' + TAP.format.money(e['amb.services']), 'Services');
      // By hand from the sample's totals: Tier 1 3, Tier 2 7; 520 target accounts; 4 Strategic, 4 Growth, 13 Core, 7 Scaled
      a.equal(txt(line(na, 'focus')), 'Focus 3 Tier 1 · 7 Tier 2', 'Focus');
      a.equal(txt(line(na, 'pool')), 'New business pool 520 target accounts', 'New business pool');
      a.equal(txt(line(na, 'customers')), 'Customers 4 Strategic · 4 Growth · 13 Core · 7 Scaled', 'Customers');
      a.equal(txt(line(na, 'profile')), TAP.content.text('profile.openProfile'), 'Open profile last');
    });

    T.test('X-d127-card-snapshot', 'No card carries the strategic plan line, "Will it land?" or a "discuss" marker, though the sample has insights for them', function (a) {
      var el = snapCards();
      a.ok(TAP.measures.available('sp.oi'), 'the sample has a strategic plan part');
      a.ok(TAP.insights.all().some(function (x) { return x.ruleId === 'winsVsPeers' && x.regionIds[0] === 'na'; }), 'and a wins insight for North America');
      window.SAMPLE_EXPECT.regions.forEach(function (r) { noLandParts(a, card(el, r), r); });
      a.ok(txt(el).indexOf('Will it land?') < 0, 'no "Will it land?" heading');
      a.ok(!/strategic plan/i.test(txt(el)), 'no strategic plan line');
      a.ok(!/\bdiscuss\b/.test(txt(el)), 'no discuss marker');
    });

    T.test('X-d117-cards-swatch', 'The split keeps one swatched line per part, value and share adding to 100%; Services has no swatch', function (a) {
      var el = snapCards(), na = card(el, 'na'), e = window.SAMPLE_EXPECT.totals.na;
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

    T.test('X-d117-cards-swatch', 'A combined card keeps the swatched lines and holds the same parts in the same order', function (a) {
      var el = snapCards({ mode: 'one', focus: 'na', restAs: 'combined', restAgg: 'average' }), rest = card(el, 'rest');
      var order = function (c) { return Array.prototype.map.call(c.children, function (n) { return n.getAttribute('data-part'); }); };
      a.ok(!!rest && rest.classList.contains('is-combined'), 'the rest is one combined card');
      a.equal(qsa('.tap-ov-card__part', rest).length, 2, 'two swatched lines');
      a.deepEqual(order(rest), order(card(el, 'na')), 'region and combined card line up part by part');
    });
  });

  /* ---------- D129 (#547): one figure opens a small popover beside it, not the side panel ---------- */

  T.suite('figure-popover', function () {
    var ID = 'X-d129-figure-popover';
    function pop() { return document.querySelector('.tap-figpop'); }
    function esc() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); }
    function vw() { return document.documentElement.clientWidth; }
    function vh() { return document.documentElement.clientHeight; }
    // The cards on the sample, in a box fixed on screen at (left, top), so where the popover lands can be measured.
    function onScreen(left, top, width) {
      sample();
      TAP.store.reset();
      var host = T.dom.mount();
      host.style.cssText = 'position:fixed;z-index:50;width:' + (width || 300) + 'px;left:' + left + 'px;top:' + top + 'px';
      TAP.overviewCards.render(host, { mode: 'set', set: ['na'] });
      return host;
    }
    function naFig(host) { return qs('.tap-ov-card[data-entity="na"] [data-measure="nb.arr"]', host); }
    // "North America plan.xlsx › 2. New Business", read from the sample's source map, not the app.
    function naAddress() {
      var p = window.PLAN_DATA, reg = p.regions.filter(function (r) { return r.id === 'na'; })[0];
      return reg.source.fileName + ' › ' + p.meta.sourceMap.newBusiness.sheet + ' › ';
    }
    function inWindow(a, r, label) {
      a.ok(r.left >= 0 && r.top >= 0 && r.right <= vw() && r.bottom <= vh(), label + ': inside the window ' + JSON.stringify([r.left, r.top, r.right, r.bottom]));
    }
    // Starts the app on the sample data (the Overview), runs fn(root) and always stops it again.
    function withApp(fn) {
      var root = T.dom.mount();
      TAP.app.start({ root: root, plan: JSON.parse(JSON.stringify(window.PLAN_DATA)) });
      try { fn(root); } finally { TAP.sourceTip.close(); TAP.layers.close(); TAP.app.stop(); }
    }

    T.test(ID, 'North America’s new business figure opens a popover beside it, with the label, exact value and address', function (a) {
      var host = onScreen(40, 120), f = naFig(host), e = window.SAMPLE_EXPECT.totals.na;
      try {
        spy(TAP.layers, 'open', function (calls) {
          spy(TAP.layers, 'openDetails', function (details) {
            f.click();
            a.equal(calls.length + details.length, 0, 'no side panel opens');
          });
        });
        var p = pop(), r = p && p.getBoundingClientRect(), b = f.getBoundingClientRect();
        a.ok(!!p, 'a popover opens');
        if (!p) return;
        a.equal(qsa('.tap-figpop, .tap-srcpop', document).length, 1, 'one popover');
        a.equal(txt(qs('.tap-figpop__title', p)), TAP.measures.meta('nb.arr').label, 'titled with the figure’s label');
        a.ok(txt(p).indexOf(TAP.format.moneyExact(e['nb.arr'])) >= 0, 'the exact value: ' + txt(p));
        a.ok(txt(p).indexOf(naAddress()) >= 0, 'the file › sheet › cell from the source map: ' + txt(p));
        a.ok(!!qs('svg', qs('.tap-figpop__src', p)), 'with the data icon');
        a.ok(r.left >= b.right && r.left - b.right <= 16, 'beside it, to the right (gap ' + (r.left - b.right) + ' px)');
        a.ok(r.top < b.bottom && r.bottom > b.top, 'level with it');
        inWindow(a, r, 'the popover');
        a.equal(getComputedStyle(qs('.tap-figpop__value', p)).fontSize, '16px', '16 px text (D24)');
        a.equal(getComputedStyle(p).animationName, 'none', 'no animation');
        a.ok(p.contains(document.activeElement), 'focus moves into the popover');
        a.equal(f.getAttribute('aria-expanded'), 'true', 'the figure says it is open');
        var x = qs('.tap-figpop__close', p);
        a.equal(x.getAttribute('aria-label'), 'Close', 'a close button named Close');
        x.click();
        a.equal(pop(), null, 'the close button closes it');
        a.equal(document.activeElement, f, 'focus goes back to the figure');
        a.equal(f.getAttribute('aria-expanded'), 'false', 'and it says it is closed');
      } finally { TAP.sourceTip.close(); }
    });

    T.test(ID, 'Near the right or bottom edge the popover flips left or up and stays inside the window', function (a) {
      try {
        var right = onScreen(vw() - 190, 120, 180), f = naFig(right);
        f.click();
        var r = pop().getBoundingClientRect(), b = f.getBoundingClientRect();
        a.ok(b.right <= vw() && b.left >= 0, 'the figure is on screen, near the right edge');
        a.ok(r.right <= b.left, 'the popover opens to its left');
        inWindow(a, r, 'right edge');
        TAP.sourceTip.close();
        // The figure itself a few pixels above the bottom edge, so the popover cannot open below its top
        var low = onScreen(40, 0), g = naFig(low), gr = g.getBoundingClientRect();
        low.style.top = (vh() - (gr.bottom - low.getBoundingClientRect().top) - 4) + 'px';
        g.click();
        var q = pop().getBoundingClientRect(), gb = g.getBoundingClientRect();
        a.ok(gb.bottom <= vh() && gb.bottom > vh() - 40, 'the figure sits at the bottom edge');
        a.ok(q.top < gb.top, 'the popover rises above the figure’s top');
        inWindow(a, q, 'bottom edge');
      } finally { TAP.sourceTip.close(); }
    });

    T.test(ID, 'Esc closes the popover before any side panel; a click elsewhere closes it; another figure swaps it', function (a) {
      withApp(function (root) {
        TAP.layers.openDetails({ regionIds: ['latam'] });
        a.equal(TAP.layers.top(), 'details', 'a side panel is open underneath');
        var na = qs('.tap-ov-card[data-entity="na"]', root);
        qs('[data-measure="nb.arr"]', na).click();
        a.ok(!!pop(), 'the popover opens');
        esc();
        a.equal(pop(), null, 'Esc closes the popover');
        a.equal(TAP.layers.top(), 'details', 'and leaves the side panel open');
        esc();
        a.equal(TAP.layers.top(), null, 'the next Esc closes the side panel');
        qs('[data-measure="nb.arr"]', na).click();
        qs('[data-measure="cg.arr"]', na).click();
        a.equal(qsa('.tap-figpop', document).length, 1, 'selecting another figure swaps the popover');
        a.ok(txt(pop()).indexOf(TAP.measures.meta('cg.arr').label) >= 0, 'to the new figure');
        document.body.click();
        a.equal(pop(), null, 'a click elsewhere closes it');
        a.equal(TAP.layers.top(), null, 'without opening anything');
      });
    });

    T.test(ID, 'A combined figure says how it was combined; the headline Sources still opens the side panel', function (a) {
      try {
        sample();
        TAP.store.reset();
        var el = cards({ mode: 'one', focus: 'na', restAs: 'combined', restAgg: 'average' });
        var f = fig(el, 'rest', 'nb.arr'), cell = TAP.measures.combined('nb.arr', TAP.scope.entities()[1], {});
        f.click();
        a.ok(!!pop(), 'a popover for the combined figure');
        a.ok(txt(pop()).indexOf(TAP.agg.describe(cell)) >= 0, 'how it was combined: ' + TAP.agg.describe(cell));
        a.ok(txt(pop()).indexOf(TAP.format.moneyExact(cell.v)) >= 0, 'its exact value');
        TAP.sourceTip.close();
      } finally { TAP.sourceTip.close(); TAP.store.reset(); }
      withApp(function (root) {
        qs('.tap-ov__sources', root).click();
        a.equal(TAP.layers.top(), 'headline-sources', 'the headline Sources lists its figures in the side panel');
        a.equal(pop(), null, 'not in a popover');
      });
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
