/*
 * File: tests/test-ranking.js
 * Purpose: Tests for ranking insights by significance and hiding them for the session (US-1.7.2, US-1.7.11).
 * Provides: test cases TPV-TC-134 to 137, 268, 269 (engine side), X-ranking-*
 * Depends on: tests/harness.js, tests/test-setup.js, tests/test-insights.js (window.T_INSIGHTS), the app scripts,
 *             data/sample-plan-data.js, tests/fixtures/sample-expected.js
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var H = window.T_INSIGHTS, sample = H.sample, withRule = H.withRule, perRegion = H.perRegion, ofRule = H.ofRule;
  /* ---------- ranking (US-1.7.2) ---------- */

  // Findings with fixed scores: strength by region, so the expected order is known by hand.
  var STRENGTH = { na: 0.9, latam: 0.2, neu: 0.6, seu: 0.4, ceu: 0.8, mea: 0.1, apac: 0.5 };
  function fixed(extra) {
    return function (ctx) {
      return ctx.util.regions().map(function (r) {
        return { key: r, regionIds: [r], vars: { region: ctx.util.name(r), v: '1' },
          figures: [ctx.util.fig('base.arr', ctx.util.name(r), ctx.util.m('base.arr', r))], strength: STRENGTH[r], money: 0.1, provided: 7 };
      }).concat(extra ? [extra(ctx)] : []);
    };
  }
  function cmpOf(c) { return Object.assign(TAP.store.defaults().cmp, c); }
  function mine(list, prefix) { return list.filter(function (x) { return x.ruleId.indexOf(prefix) === 0; }); }
  function withWeights(w, body) {
    var s = window.TAP_SETTINGS.insights, saved = JSON.stringify(s);
    Object.assign(s, w);
    try { body(); } finally { Object.assign(s, JSON.parse(saved)); TAP.insights.reset(); }
  }
  var PAIR = function (ctx) {
    return { key: 'pair', regionIds: ['na', 'mea'], vars: { region: ctx.util.name('na'), v: '2' },
      figures: [ctx.util.fig('base.arr', ctx.util.name('na'), ctx.util.m('base.arr', 'na'))], strength: 0.8, money: 0.1, provided: 7 };
  };

  T.suite('insights-ranking', function () {
    T.test('TPV-TC-134', 'Significance is 0.5 strength + 0.3 money + 0.2 breadth, between 0 and 1', function (a) {
      sample();
      withRule({ id: 'x-rank-a' }, fixed(PAIR), function () {
        var pair = TAP.insights.all().filter(function (x) { return x.id === 'x-rank-a:pair'; })[0];
        a.near(pair.significance, 0.5 * 0.8 + 0.3 * 0.1 + 0.2 * 2 / 7, 1e-9, 'hand calculation: 0.48714');
        a.near(pair.breadth, 2 / 7, 1e-9, 'breadth = regions involved / regions in the data');
        TAP.insights.all().forEach(function (x) {
          a.near(x.significance, 0.5 * x.strength + 0.3 * x.money + 0.2 * x.breadth, 1e-9, x.id + ' follows the formula');
          a.ok(x.significance >= 0 && x.significance <= 1, x.id + ' lies between 0 and 1');
          if (x.ruleId !== 'split') a.near(x.breadth, x.regionIds.length / 7, 1e-9, x.id + ' breadth');
        });
      });
      withRule({ id: 'x-rank-big' }, perRegion('nb.arr', { strength: 4, money: -1 }), function () {
        var x = ofRule('x-rank-big')[0];
        a.equal(x.strength, 1, 'strength is held to 1');
        a.equal(x.money, 0, 'money is held to 0');
        a.near(x.significance, 0.5 + 0.2 / 7, 1e-9);
      });
    });

    T.test('TPV-TC-134', 'A finding may set its own breadth, held to 0..1; otherwise breadth is regions involved / regions', function (a) {
      sample();
      [[0.5, 0.5], [3, 1], [-1, 0], [undefined, 1 / 7]].forEach(function (c) {
        withRule({ id: 'x-rank-breadth' }, perRegion('nb.arr', { breadth: c[0] }), function () {
          var x = ofRule('x-rank-breadth')[0];
          a.near(x.breadth, c[1], 1e-9, 'breadth ' + c[0] + ' gives ' + c[1]);
          a.near(x.significance, 0.5 * x.strength + 0.3 * x.money + 0.2 * c[1], 1e-9, 'and feeds the significance');
          a.equal(x.regionIds.length, 1, 'regionIds are unchanged');
        });
      });
    });

    T.test('TPV-TC-135', 'With a focus region, its insights come first, then by significance', function (a) {
      sample();
      withRule({ id: 'x-rank-a' }, fixed(PAIR), function () {
        var list = mine(TAP.insights.ranked(cmpOf({ mode: 'one', focus: 'mea' })), 'x-rank');
        a.deepEqual(list.slice(0, 2).map(function (x) { return x.id; }), ['x-rank-a:pair', 'x-rank-a:mea'],
          'the focus region’s two insights lead, the stronger first');
        a.deepEqual(list.slice(2).map(function (x) { return x.regionIds[0]; }), ['na', 'ceu', 'neu', 'apac', 'seu', 'latam'],
          'the rest follow by significance');
        var plain = mine(TAP.insights.ranked(cmpOf({ mode: 'all' })), 'x-rank');
        a.equal(plain[0].id, 'x-rank-a:na', 'with no focus, the most significant leads');
      });
    });

    T.test('TPV-TC-136', 'Takeaway, panel and Overview lists and the Insights page agree with one ranking', function (a) {
      sample();
      withRule({ id: 'x-rank-a' }, fixed(PAIR), function () {
        [cmpOf({ mode: 'all' }), cmpOf({ mode: 'one', focus: 'seu' }), cmpOf({ mode: 'pair', focus: 'latam', second: 'neu' })].forEach(function (c) {
          var page = TAP.insights.ranked(c), panel = TAP.insights.ranked(c, { reportId: 'ov-ambition' });
          a.equal(TAP.insights.top(c, 'ov-ambition', 1)[0].id, panel[0].id, c.mode + ': the takeaway is the top one');
          a.deepEqual(TAP.insights.top(c, 'ov-ambition').map(function (x) { return x.id; }), panel.slice(0, 3).map(function (x) { return x.id; }),
            c.mode + ': the panel shows the top three');
          a.deepEqual(TAP.insights.top(c, null, 3).map(function (x) { return x.id; }), page.slice(0, 3).map(function (x) { return x.id; }),
            c.mode + ': the Overview shows the top three');
          a.ok(page.length >= panel.length, c.mode + ': the page shows all');
        });
        var pair = TAP.insights.ranked(cmpOf({ mode: 'pair', focus: 'latam', second: 'neu' }));
        a.ok(pair.every(function (x) { return x.regionIds.indexOf('latam') >= 0 || x.regionIds.indexOf('neu') >= 0; }),
          'only insights about regions in the comparison');
      });
    });

    T.test('TPV-TC-137', 'Raising one family’s weight moves its insights up', function (a) {
      sample();
      withRule({ id: 'x-rank-real', family: 'realism' }, fixed(), function () {
        withRule({ id: 'x-rank-exp', family: 'exposure' }, function (ctx) {
          return fixed()(ctx).map(function (f) { f.strength = Math.min(1, f.strength + 0.1); return f; });
        }, function () {
          var before = mine(TAP.insights.ranked(cmpOf({ mode: 'all' })), 'x-rank');
          a.equal(before[0].ruleId, 'x-rank-exp', 'at equal weights the stronger family leads');
          withWeights({ familyWeights: Object.assign({}, window.TAP_SETTINGS.insights.familyWeights, { realism: 2 }) }, function () {
            var after = mine(TAP.insights.ranked(cmpOf({ mode: 'all' })), 'x-rank');
            a.equal(after[0].ruleId, 'x-rank-real', 'with twice the weight, realism leads');
            var sig = function (id) { return after.filter(function (x) { return x.id === id; })[0].significance; };
            a.ok(sig('x-rank-real:na') > sig('x-rank-exp:na'), 'the same finding now ranks above the other family\u2019s');
            a.ok(after.every(function (x) { return x.significance <= 1; }), 'scores stay between 0 and 1');
          });
        });
      });
    });
  });

  /* ---------- money at stake and hiding (US-1.7.2, US-1.7.11) ---------- */
  T.suite('insights-hide', function () {
    T.test('X-ranking-money', 'Money at stake is a share of the organization total, and 0 when there is none', function (a) {
      sample();
      var u = TAP.insights.util, X = window.SAMPLE_EXPECT;
      a.near(u.moneyShare(X.org['base.arr'] / 10, 'arr'), 0.1, 1e-9, 'a tenth of the organization ARR');
      var pipe = X.regions.reduce(function (s, r) { return s + X.totals[r]['base.pipeline']; }, 0);
      a.near(u.moneyShare(pipe / 4, 'pipeline'), 0.25, 1e-9, 'a quarter of the organization pipeline');
      a.equal(u.moneyShare(NaN, 'arr'), 0, 'NaN gives 0');
      a.equal(u.moneyShare(undefined, 'arr'), 0, 'a missing amount gives 0');
      a.equal(u.moneyShare(X.org['base.arr'] * 3, 'arr'), 1, 'held to 1');
      TAP.data.plan().regions.forEach(function (r) { r.marketCoverage.forEach(function (m) { m.currentArr = 0; }); });
      a.equal(u.moneyShare(100, 'arr'), 0, 'zero organization ARR gives 0');
      TAP.data.plan().regions.forEach(function (r) { r.marketCoverage.forEach(function (m) { m.currentArr = null; }); });
      a.equal(u.moneyShare(100, 'arr'), 0, 'a missing organization total gives 0');
    });

    T.test('TPV-TC-268', 'A hidden insight leaves every list at once and the next-ranked one takes its place', function (a) {
      sample();
      withRule({ id: 'x-rank-a' }, fixed(), function () {
        var c = cmpOf({ mode: 'all' }), ids = function (list) { return list.map(function (x) { return x.id; }); };
        var before = ids(TAP.insights.ranked(c, { reportId: 'ov-ambition' }));   // the panel's ranked list, any rule
        var changes = 0, off = TAP.store.on(function () { changes++; });
        try {
          TAP.insights.hide(before[0]);
          a.equal(changes, 1, 'one store change, so every list redraws together');
        } finally { off(); }
        a.deepEqual(TAP.insights.hidden(), [before[0]]);
        a.deepEqual(TAP.store.get().hiddenInsights, [before[0]], 'held in session state');
        a.deepEqual(ids(TAP.insights.top(c, 'ov-ambition')), before.slice(1, 4), 'the panel list moves up by one');
        a.equal(TAP.insights.top(c, 'ov-ambition', 1)[0].id, before[1], 'the next one becomes the takeaway');
        a.ok(TAP.insights.ranked(c).every(function (x) { return x.id !== before[0]; }), 'gone from the page too');
        a.equal(TAP.insights.all().length >= before.length, true, 'all() still holds it, for the "N hidden" count');
        TAP.insights.hide(before[0]);
        a.equal(TAP.insights.hidden().length, 1, 'hiding twice changes nothing');
        TAP.insights.unhide(before[0]);
        a.deepEqual(ids(TAP.insights.ranked(c, { reportId: 'ov-ambition' })), before, 'unhide brings it back');
        TAP.insights.hide(before[0]);
        TAP.insights.hide(before[1]);
        TAP.insights.unhide();
        a.deepEqual(TAP.insights.hidden(), [], 'unhide() with no id shows every hidden insight');
      });
    });

    T.test('TPV-TC-269', 'Hidden insights are never stored and come back on reload', function (a) {
      sample();
      var calls = 0, set = TAP.storage.set;
      TAP.storage.set = function () { calls++; return set.apply(TAP.storage, arguments); };
      try {
        withRule({ id: 'x-rank-a' }, fixed(), function () {
          var id = TAP.insights.all()[0].id;
          TAP.insights.hide(id);
          TAP.insights.unhide(id);
          TAP.insights.hide(id);
          a.equal(calls, 0, 'nothing is written to browser storage');
          TAP.store.reset();                                   // what a reload starts from
          a.deepEqual(TAP.insights.hidden(), [], 'a reload shows every insight again');
          a.equal(TAP.insights.ranked(cmpOf({ mode: 'all' }))[0].id, id);
        });
      } finally { TAP.storage.set = set; }
    });
  });
})(window.TAP);
