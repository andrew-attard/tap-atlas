/*
 * File: tests/test-insights.js
 * Purpose: Tests for the insight engine: rule checks, scoring, ranking, guardrails (TPV-TC-128 to 137, 167 to 169).
 * Provides: test cases for INSIGHTS stories (#44, #45, #53, #54), X-insights-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var FAMILIES = ['priorities', 'judgement', 'assumptions', 'realism', 'exposure', 'capability'];
  var MARKS = ['industryRow', 'regionColumn', 'cell', 'points', 'quadrant', 'bar', null];
  var STATES = ['value', 'notProvided', 'notApplicable'];
  var UNITS = ['money', 'pct', 'rating', 'score', 'count', 'tier', 'text'];

  // Checks one insight against the insight object contract (ARCHITECTURE section 12).
  function checkShape(a, x) {
    var tag = x.id + ': ';
    a.equal(x.id, x.ruleId + ':' + x.id.slice(x.ruleId.length + 1), tag + 'id is ruleId:key');
    a.ok(FAMILIES.indexOf(x.family) >= 0, tag + 'family');
    a.ok(typeof x.sentence === 'string' && x.sentence.length > 10 && !/[{}]/.test(x.sentence), tag + 'sentence is filled in');
    a.ok(typeof x.description === 'string' && x.description.length > 10, tag + 'rule description');
    a.ok(Array.isArray(x.regionIds) && x.regionIds.length > 0, tag + 'regions');
    a.ok(Array.isArray(x.industryIds) && Array.isArray(x.accountIds), tag + 'items');
    a.ok(Array.isArray(x.figures) && x.figures.length > 0, tag + 'figures');
    x.figures.forEach(function (f) {
      a.ok(typeof f.label === 'string' && f.label.length > 0, tag + 'figure label');
      a.ok(f.cell && STATES.indexOf(f.cell.state) >= 0 && f.cell.src, tag + 'figure is a cell with a source');
      a.ok(UNITS.indexOf(f.unit) >= 0, tag + f.label + ' has a unit');
      if (f.unit === 'rating') a.ok(f.field, tag + f.label + ' names its rating field');
      if (f.measureId) a.equal(TAP.measures.meta(f.measureId).unit, f.unit, tag + f.label + ' unit matches its measure');
    });
    a.ok(typeof x.significance === 'number' && x.significance >= 0 && x.significance <= 1, tag + 'significance 0..1');
    a.ok(Array.isArray(x.sources) && x.sources.length > 0, tag + 'sources');
    a.ok(x.highlight && MARKS.indexOf(x.highlight.mark) >= 0, tag + 'highlight target with a mark');
    a.equal(x.highlight.reportId, x.reportId, tag + 'highlight names the same report');
    a.ok(Array.isArray(x.attach), tag + 'attach list');
    if (x.reportId) a.equal(x.attach[0], x.reportId, tag + 'reportId is the first attached report');
    else a.equal(x.fallback, 'details', tag + 'no report: Show me opens the details');
    a.equal(x.label, 'Observation to discuss', tag + 'labelled as an observation');
  }

  var REQUIRED = ['id', 'family', 'enabled', 'description', 'reads', 'params', 'scoring', 'template', 'attach', 'highlight', 'fallback'];

  function sample() { TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA))); TAP.insights.reset(); }
  function cfg(id) { return window.TAP_RULES.rules.filter(function (r) { return r.id === id; })[0]; }
  function built(family) {
    return !TAP.stub.list().some(function (s) { return s.what === 'insight rules: ' + family; });
  }
  function ofRule(id) { return TAP.insights.all().filter(function (x) { return x.ruleId === id; }); }

  // A throwaway rule for engine tests: a config entry plus its code, both removed afterwards.
  function withRule(def, fn, body) {
    var rule = Object.assign({ enabled: true, family: 'realism', description: 'A test rule that marks each region.',
      reads: [], params: {}, scoring: 'Fixed.', template: '{region} has a test figure of {v}.', templates: {},
      attach: ['ov-ambition'], highlight: 'bar', fallback: 'details', compare: false }, def);
    window.TAP_RULES.rules.push(rule);
    TAP.insights.defineRule(rule.id, fn);
    try { body(rule); } finally {
      window.TAP_RULES.rules.splice(window.TAP_RULES.rules.indexOf(rule), 1);
      TAP.insights.defineRule(rule.id, null);
      TAP.insights.reset();
    }
  }
  // One finding per region from a measure, so test rules work on real figures.
  function perRegion(measureId, extra) {
    return function (ctx) {
      return ctx.util.regions().map(function (r) {
        var c = ctx.util.m(measureId, r);
        return Object.assign({ key: r, regionIds: [r], vars: { region: ctx.util.name(r), v: TAP.format.cell(c, { unit: 'money' }) },
          figures: [ctx.util.fig(measureId, ctx.util.name(r), c)], strength: 0.5, money: 0.1, provided: 7 }, extra || {});
      });
    };
  }

  T.suite('insights', function () {
    T.test('TPV-TC-128', 'Every shipped rule definition has all the required fields', function (a) {
      var rules = window.TAP_RULES.rules, ids = {};
      a.ok(rules.length >= 16, 'every rule is in the configuration file');
      rules.forEach(function (r) {
        REQUIRED.forEach(function (k) { a.ok(Object.prototype.hasOwnProperty.call(r, k), r.id + ' has ' + k); });
        a.ok(FAMILIES.indexOf(r.family) >= 0, r.id + ' family');
        a.equal(typeof r.enabled, 'boolean', r.id + ' can be switched off with one setting');
        a.ok(r.description.length > 20 && r.scoring.length > 10, r.id + ' explains itself and its scoring');
        a.ok(Array.isArray(r.reads) && r.reads.length > 0, r.id + ' names the data it reads');
        a.ok(/\{\w+\}/.test(r.template), r.id + ' has a sentence template');
        a.ok(Array.isArray(r.attach), r.id + ' attach list');
        r.attach.forEach(function (rep) { a.ok(TAP.reports.get(rep), r.id + ' attaches to a real report: ' + rep); });
        a.ok(MARKS.indexOf(r.highlight) >= 0, r.id + ' highlight mark');
        a.ok(r.attach.length > 0 || r.fallback === 'details', r.id + ' without a report falls back to details');
        a.ok(!ids[r.id], r.id + ' is unique');
        ids[r.id] = true;
      });
      FAMILIES.forEach(function (f) { a.ok(rules.some(function (r) { return r.family === f; }), 'family ' + f + ' has rules'); });
      var w = window.TAP_RULES.wording;
      a.ok(w.guide.length >= 4, 'the wording guide is in the configuration file');
      ['unrealistic', 'wrong', 'poor', 'inconsistent'].forEach(function (b) { a.ok(w.banned.indexOf(b) >= 0, 'bans ' + b); });
    });

    T.test('TPV-TC-129', 'On the sample data every insight carries its sentence, figures, rule, regions, score, sources and target', function (a) {
      sample();
      withRule({ id: 'x-test-ambition' }, perRegion('nb.arr'), function () {
        var list = TAP.insights.all();
        a.ok(list.length >= 7, 'the rules found something');
        list.forEach(function (x) { checkShape(a, x); });
        var mine = ofRule('x-test-ambition');
        a.equal(mine.length, 7, 'one per region');
        a.equal(mine[0].reportId, 'ov-ambition');
        a.equal(mine[0].highlight.mark, 'bar');
        a.equal(mine[0].description, cfg('x-test-ambition').description);
      });
    });

    T.test('TPV-TC-129', 'An insight with no Phase 1 report falls back to the region’s details', function (a) {
      sample();
      withRule({ id: 'x-test-phase2', attach: [], highlight: null }, perRegion('cg.arr'), function () {
        var x = ofRule('x-test-phase2')[0];
        a.equal(x.reportId, null);
        a.equal(x.fallback, 'details');
        a.deepEqual(x.highlight.regionIds, x.regionIds, 'the details target names the region');
        a.equal(x.highlight.mark, null);
      });
    });

    T.test('TPV-TC-131', 'A rule switched off produces nothing and the other rules are unaffected', function (a) {
      sample();
      withRule({ id: 'x-test-a' }, perRegion('nb.arr'), function () {
        withRule({ id: 'x-test-b' }, perRegion('base.arr'), function (b) {
          var before = ofRule('x-test-a').map(function (x) { return x.sentence; });
          a.equal(ofRule('x-test-b').length, 7);
          b.enabled = false;
          a.equal(ofRule('x-test-b').length, 0, 'the switched-off rule is gone');
          a.deepEqual(ofRule('x-test-a').map(function (x) { return x.sentence; }), before, 'the other rule is unchanged');
          a.equal(TAP.insights.failures().filter(function (f) { return f.ruleId === 'x-test-b'; }).length, 0, 'not logged as a failure');
        });
      });
    });

    T.test('TPV-TC-132', 'A rule whose input data is missing, or that fails, is skipped and logged; the others still run', function (a) {
      sample();
      TAP.notes.clear();
      TAP.data.plan().regions.forEach(function (r) { delete r.partners; });
      withRule({ id: 'x-test-ok' }, perRegion('nb.arr'), function () {
        withRule({ id: 'x-test-nodata', reads: ['partners.arr'] }, perRegion('nb.arr'), function () {
          withRule({ id: 'x-test-throws' }, function () { throw new Error('broken on purpose'); }, function () {
            a.equal(ofRule('x-test-ok').length, 7, 'the healthy rule still produces insights');
            a.equal(ofRule('x-test-nodata').length, 0);
            var f = TAP.insights.failures(), ids = f.map(function (x) { return x.ruleId; });
            a.ok(ids.indexOf('x-test-nodata') >= 0, 'missing input is logged');
            a.ok(ids.indexOf('x-test-throws') >= 0, 'a rule that throws is logged');
            a.match(f[ids.indexOf('x-test-throws')].message, /broken on purpose/);
            var notes = TAP.notes.list('insights').map(function (n) { return n.message; }).join(' | ');
            a.match(notes, /x-test-nodata/, 'noted for the data sources panel');
            a.match(notes, /x-test-throws/);
          });
        });
      });
    });

    if (FAMILIES.some(built)) {
      T.test('TPV-TC-133', 'On the sample data every built rule produces at least one insight', function (a) {
        sample();
        window.TAP_RULES.rules.filter(function (r) { return r.enabled && built(r.family); }).forEach(function (r) {
          a.ok(ofRule(r.id).length > 0, r.id + ' fires on the sample data');
        });
        a.deepEqual(TAP.insights.failures(), [], 'no rule failed');
      });
    } else {
      T.skip('TPV-TC-133', 'On the sample data every built rule produces at least one insight', 'waits for the rule families (#47 to #52)');
    }

    T.test('X-insights-guardrails', 'Blank figures, too few regions and banned words never reach an insight', function (a) {
      sample();
      withRule({ id: 'x-test-blank' }, perRegion('cg.arr'), function () {
        a.equal(ofRule('x-test-blank').length, 6, 'Central Europe’s empty customer growth is dropped, not read as zero');
        a.ok(ofRule('x-test-blank').every(function (x) { return x.regionIds[0] !== 'ceu'; }));
      });
      withRule({ id: 'x-test-few', compare: true }, perRegion('nb.arr', { provided: 2 }), function () {
        a.equal(ofRule('x-test-few').length, 0, 'a comparison with 2 regions providing the value is skipped');
      });
      withRule({ id: 'x-test-word', template: '{region} has an unrealistic figure of {v}.' }, perRegion('nb.arr'), function () {
        a.equal(ofRule('x-test-word').length, 0, 'a sentence with a banned word is refused');
        a.ok(TAP.insights.failures().some(function (f) { return f.ruleId === 'x-test-word' && /unrealistic/.test(f.message); }));
      });
      withRule({ id: 'x-test-name' }, perRegion('nb.arr', { vars: { region: 'Bad Harbour', v: '1' } }), function () {
        a.equal(ofRule('x-test-name').length, 7, 'a banned word inside a workbook name is the data’s, not ours');
      });
    });

    T.test('X-insights-reload', 'The list is worked out once and again when the data reloads', function (a) {
      sample();
      var calls = 0;
      withRule({ id: 'x-test-count' }, function (ctx) { calls++; return perRegion('nb.arr')(ctx); }, function () {
        TAP.insights.all();
        TAP.insights.all();
        TAP.insights.ranked(TAP.store.get().cmp);
        a.equal(calls, 1, 'computed once');
        TAP.data.load(T_FIXTURE('mini'));
        a.equal(ofRule('x-test-count').length, 4, 'recomputed for the new data (four regions)');
        a.equal(calls, 2);
      });
    });

    T.test('X-insights-fixture', 'The insight fixture covers every family in the final insight shape', function (a) {
      var list = window.TEST_FIXTURES.insights;
      a.ok(list.length >= 8, 'about eight insights');
      list.forEach(function (x) { checkShape(a, x); });
      FAMILIES.forEach(function (f) {
        a.ok(list.some(function (x) { return x.family === f; }), 'family ' + f + ' is covered');
      });
      a.ok(list.some(function (x) { return x.fallback === 'details'; }), 'one insight falls back to the details panel');
      var ids = list.map(function (x) { return x.id; });
      a.equal(ids.filter(function (id, i) { return ids.indexOf(id) === i; }).length, ids.length, 'ids are unique');
    });
  });

  // Shared with tests/test-rules.js.
  window.T_INSIGHT_SHAPE = checkShape;
})(window.TAP);
