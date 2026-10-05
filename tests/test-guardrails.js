/*
 * File: tests/test-guardrails.js
 * Purpose: Tests for neutral wording and guardrails on the sample data, and every planted case found
 *          (US-1.7.10, US-1.3.2): TPV-TC-167 to 169 and TPV-TC-198.
 * Provides: test cases TPV-TC-167, 168, 169, 198; X-review-RI-9 to 15 (awkward names and repeated ids, #356)
 * Depends on: tests/harness.js, tests/test-setup.js, tests/test-rules.js (window.T_RULES), tests/test-insights.js
 *             (window.T_INSIGHTS), the app scripts,
 *             data/sample-plan-data.js, tests/fixtures/sample-expected.js
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var R = window.T_RULES;

  function all() { return TAP.insights.all(); }
  function about(regionId, industryId) {
    return all().filter(function (x) { return x.regionIds.indexOf(regionId) >= 0 && x.industryIds.indexOf(industryId) >= 0; });
  }
  function word(text, w) {
    var esc = String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^A-Za-z])' + esc + '([^A-Za-z]|$)', 'i').test(text);
  }

  T.suite('guardrails', function () {
    T.test('TPV-TC-167', 'No insight from the sample data contains a banned word from the wording guide', function (a) {
      R.sample();
      var banned = window.TAP_RULES.wording.banned;
      a.ok(all().length >= 16, 'the sample gives insights to check');
      all().forEach(function (x) {
        banned.forEach(function (w) { a.ok(!word(x.sentence, w), x.id + ' avoids "' + w + '"'); });
        ['NaN', 'undefined', 'null', 'Infinity', 'not provided'].forEach(function (w) { a.ok(!word(x.sentence, w), x.id + ' has no gap: ' + w); });
        a.equal(x.label, 'Observation to discuss', x.id + ' is labelled as an observation');
      });
      window.TAP_RULES.rules.forEach(function (r) {
        [r.template].concat(Object.keys(r.templates || {}).map(function (k) { return r.templates[k]; })).forEach(function (t) {
          banned.forEach(function (w) { a.ok(!word(t, w), r.id + ' template avoids "' + w + '"'); });
        });
      });
    });

    T.test('TPV-TC-168', 'A planted blank value is never treated as low or zero', function (a) {
      R.sample();
      all().forEach(function (x) {
        x.figures.forEach(function (f) { a.ok(f.cell.state !== 'notProvided', x.id + ': ' + f.label + ' is a provided figure'); });
      });
      a.equal(about('neu', 'finance').filter(function (x) { return x.family === 'capability' || x.ruleId === 'groupPriority'; }).length, 0,
        'Northern Europe Financial Services: blank criticality, so no score-based insight');
      a.ok(R.get('notYetList:neu').industryIds.indexOf('property') < 0, 'blank product fit keeps Property Management off the list');
      a.equal(about('mea', 'government').length, 0, 'Middle East & Africa Government: blank tier, no tier insight');
      a.equal(about('neu', 'culture').filter(function (x) { return x.family === 'judgement' || x.family === 'realism'; }).length, 0,
        'Northern Europe Culture and Tourism: blank current ARR is not "no ARR"');
      a.ok(!all().some(function (x) { return x.family === 'exposure' && x.regionIds[0] === 'ceu'; }), 'empty customer growth is not zero growth');
      a.ok(R.get('strongRating:neu:pharma'), 'with its zero figures entered, P04 fires');
      R.mc('neu', 'pharma').currentArr = null;
      TAP.insights.reset();
      a.ok(!R.get('strongRating:neu:pharma'), 'with current ARR left blank, it does not');
    });

    T.test('TPV-TC-169', 'No comparison insight when fewer than 3 regions provide the value', function (a) {
      R.sample(function (p) { p.regions = p.regions.slice(0, 2); });
      var compare = window.TAP_RULES.rules.filter(function (r) { return r.compare; });
      a.ok(compare.length >= 5, 'the comparison rules are known');
      compare.forEach(function (r) { a.equal(R.ofRule(r.id).length, 0, r.id + ' stays quiet with 2 regions'); });
      a.deepEqual(TAP.insights.failures(), [], 'quiet, not failed');
      a.ok(all().length > 0, 'rules that need no comparison still run');
    });

    R.PLANTED.forEach(function (c) {
      T.test('TPV-TC-198', c.p + ': the planted case produces its expected insight (' + c.id + ')', function (a) {
        R.sample();
        R.check(a, c);
      });
    });
  });

  /* ---------- review pass: awkward names and repeated ids (#356) ---------- */

  var CAP = window.SAMPLE_EXPECT.q05.flagged[0], CAP_NA = window.SAMPLE_EXPECT.p13.highRisk[0];
  function capacity() { return all().filter(function (x) { return x.ruleId === 'partnerCapacity'; }); }
  function renamePartner(name) {
    return function (p) {
      p.regions.forEach(function (r) { r.partners.forEach(function (x) { if (x.name === CAP.name) x.name = name; }); });
    };
  }
  function failed(ruleId) { return TAP.insights.failures().filter(function (f) { return f.ruleId === ruleId; }); }

  T.suite('insight-guards', function () {
    T.test('X-review-RI-9', 'Two findings with the same key get their own ids, so hiding one keeps the other', function (a) {
      R.sample();
      window.T_INSIGHTS.withRule({ id: 'x-guard-twice' }, function (ctx) {
        return ['na', 'latam'].map(function (r) {
          return { key: 'same', regionIds: [r], vars: { region: ctx.util.name(r), v: '1' },
            figures: [ctx.util.fig('base.arr', ctx.util.name(r), ctx.util.m('base.arr', r))], strength: 0.5, money: 0 };
        });
      }, function () {
        var list = all().filter(function (x) { return x.ruleId === 'x-guard-twice'; }), ids = list.map(function (x) { return x.id; });
        a.equal(list.length, 2, 'both findings are kept');
        a.ok(ids[0] !== ids[1], 'with different ids: ' + ids.join(', '));
        TAP.insights.hide(ids[0]);
        try {
          a.deepEqual(TAP.insights.ranked(null, { family: 'realism' }).filter(function (x) { return x.ruleId === 'x-guard-twice'; })
            .map(function (x) { return x.id; }), [ids[1]], 'hiding one leaves the other');
        } finally { TAP.insights.unhide(); }
      });
      R.sample();
      var seen = {};
      all().forEach(function (x) { a.ok(!seen[x.id], 'sample: ' + x.id + ' is used once'); seen[x.id] = true; });
    });

    T.test('X-review-RI-10', 'A partner with no name is named by its row, as on the capacity chart', function (a) {
      R.sample(renamePartner('  '));
      var x = capacity()[0];
      a.ok(x, 'the planted partner is still flagged');
      if (x) a.equal(x.sentence.indexOf('Row ' + CAP.row + ' (Middle East & Africa) is planned at'), 0, 'the sentence starts with its row: ' + x.sentence);
    });

    T.test('X-review-RI-11', 'A name holding braces is quoted as written, not taken for a gap', function (a) {
      R.sample(renamePartner('Horviby {EMEA} Partner'));
      var x = capacity()[0];
      a.ok(x, 'the insight is kept');
      if (x) a.equal(x.sentence.indexOf('Horviby {EMEA} Partner (Middle East & Africa)'), 0, 'with the name as written: ' + x.sentence);
      a.deepEqual(failed('partnerCapacity'), [], 'and no "gap" note');
    });

    T.test('X-review-RI-14', 'A missing phrase left in brackets counts as a gap, and the insight is set aside', function (a) {
      R.sample();
      window.T_INSIGHTS.withRule({ id: 'x-guard-phrase', template: '{region} holds {v} figure.' }, function (ctx) {
        return [{ key: 'na', regionIds: ['na'], vars: { region: ctx.util.name('na'), v: ctx.util.phrase('rank.4') },
          figures: [ctx.util.fig('base.arr', 'na', ctx.util.m('base.arr', 'na'))], strength: 0.5, money: 0 }];
      }, function () {
        a.equal(all().filter(function (x) { return x.ruleId === 'x-guard-phrase'; }).length, 0, 'no sentence with "[rank.4]"');
        var f = failed('x-guard-phrase');
        a.ok(f.length === 1 && f[0].message.indexOf('[rank.4]') >= 0, 'the data sources panel names the gap: ' + (f[0] || {}).message);
      });
    });

    T.test('X-review-RI-15', 'A channel named in the data is the data’s word, not checked against the wording guide', function (a) {
      R.sample();
      window.T_INSIGHTS.withRule({ id: 'x-guard-channel', template: '{region} plans through {channel}.' }, function (ctx) {
        return [{ key: 'na', regionIds: ['na'], vars: { region: ctx.util.name('na'), channel: 'Bad Wolf Alliance' },
          figures: [ctx.util.fig('base.arr', 'na', ctx.util.m('base.arr', 'na'))], strength: 0.5, money: 0 }];
      }, function () {
        a.equal(all().filter(function (x) { return x.ruleId === 'x-guard-channel'; }).length, 1, 'the insight is kept');
        a.deepEqual(failed('x-guard-channel'), [], 'with no banned-word note');
      });
    });

    T.test('X-review-RI-13', 'One flagged account reads in the singular', function (a) {
      var rule = window.TAP_RULES.rules.filter(function (r) { return r.id === 'atRisk'; })[0], saved = rule.params.share;
      // North America: only na-a05 (high risk, 20% of the growth, P13) is flagged; a 10% threshold raises it
      rule.params.share = 0.1;
      try {
        R.sample(function (p) {
          p.regions[0].customerGrowth.accounts.forEach(function (c) { c.riskLevel = c.id === CAP_NA ? 'high' : null; });
        });
        var x = all().filter(function (i) { return i.id === 'atRisk:na'; })[0];
        a.ok(x, 'North America has one flagged account');
        if (x) {
          a.ok(x.sentence.indexOf('1 accounts') < 0, 'never "1 accounts": ' + x.sentence);
          a.ok(/in one account flagged at risk/.test(x.sentence), 'the singular wording: ' + x.sentence);
        }
      } finally { rule.params.share = saved; TAP.insights.reset(); }
    });
  });
})(window.TAP);
