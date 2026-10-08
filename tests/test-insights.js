/*
 * File: tests/test-insights.js
 * Purpose: Tests for the insight engine: rule definitions, the insight shape, skipped rules and guardrails
 *          (TPV-TC-128 to 133). Ranking and hiding are in tests/test-ranking.js.
 * Provides: test cases for INSIGHTS story #44, X-insights-*, X-d111-why-context (D111: why lines and context insights); window.T_INSIGHT_SHAPE and window.T_INSIGHTS (shared helpers)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: INSIGHTS2 stream (Phase 2)
 */
(function (TAP) {
  'use strict';

  var PHASE1 = ['priorities', 'judgement', 'assumptions', 'realism', 'exposure', 'capability'];
  var FAMILIES = PHASE1.concat(['plan', 'shared', 'themes', 'outlook']);
  var MARKS = ['industryRow', 'regionColumn', 'cell', 'points', 'quadrant', 'bar', null];
  var STATES = ['value', 'notProvided', 'notApplicable'];
  var UNITS = ['money', 'pct', 'ratio', 'rating', 'score', 'count', 'tier', 'text'];   // 'ratio' ("1.09×") since Phase 4

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
  function listed(reportId) {
    var V = window.TAP_VIEWS;
    return Object.keys(V).some(function (v) { return v !== 'order' && (V[v].reports || []).indexOf(reportId) >= 0; });
  }

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
        r.attach.forEach(function (rep) {
          // While Phase 2 is being built, a report a view lists may not exist yet (as X-contract-reports)
          if (!TAP.reports.get(rep) && TAP.stub.list().length && listed(rep)) { a.ok(true, r.id + ': ' + rep + ' not built yet'); return; }
          a.ok(TAP.reports.get(rep), r.id + ' attaches to a real report: ' + rep);
        });
        a.ok(MARKS.indexOf(r.highlight) >= 0, r.id + ' highlight mark');
        a.ok(r.attach.length > 0 || r.fallback === 'details', r.id + ' without a report falls back to details');
        a.ok(!ids[r.id], r.id + ' is unique');
        ids[r.id] = true;
      });
      PHASE1.forEach(function (f) { a.ok(rules.some(function (r) { return r.family === f; }), 'family ' + f + ' has rules'); });
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
            a.equal(ids.filter(function (id) { return id === 'x-test-throws'; }).length, 1, 'logged once');
            a.ok(ids.indexOf('x-test-throws') >= 0, 'a rule that throws is logged');
            a.match(f[ids.indexOf('x-test-throws')].message, /broken on purpose/);
            a.equal(TAP.notes.list('insights').length, 0, 'reported once, through failures(), which the data sources panel lists');
          });
        });
      });
    });

    // Phase 2 families join once their rule files are built
    if (PHASE1.every(built)) {
      T.test('TPV-TC-133', 'On the sample data every rule produces at least one insight', function (a) {
        sample();
        window.TAP_RULES.rules.filter(function (r) { return r.enabled && built(r.family); }).forEach(function (r) {
          a.ok(ofRule(r.id).length > 0, r.id + ' fires on the sample data');
        });
        a.deepEqual(TAP.insights.failures(), [], 'no rule failed');
      });
    } else {
      T.skip('TPV-TC-133', 'On the sample data every rule produces at least one insight', 'waits for every rule family (#47 to #52)');
    }

    T.test('X-insights-malformed', 'A malformed finding is logged for its rule and never breaks the others', function (a) {
      sample();
      var bad = {
        'x-bad-object': function () { return { key: 'x' }; },
        'x-bad-null': function (ctx) { return perRegion('nb.arr')(ctx).concat([null]); },
        'x-bad-figure': function (ctx) { return perRegion('nb.arr', { figures: [null] })(ctx); },
        'x-bad-regions': function (ctx) { return perRegion('nb.arr', { regionIds: 'na' })(ctx); }
      };
      withRule({ id: 'x-test-ok' }, perRegion('nb.arr'), function () {
        Object.keys(bad).forEach(function (id) {
          withRule({ id: id }, bad[id], function () {
            a.equal(ofRule('x-test-ok').length, 7, id + ': the healthy rule still produces insights');
            a.equal(ofRule(id).length, 0, id + ' produces nothing');
            a.ok(TAP.insights.failures().some(function (f) { return f.ruleId === id; }), id + ' is logged');
          });
        });
      });
    });

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
      ['failed', 'errors', 'wrongly', 'mistakes', 'NaN', 'undefined', 'null', 'Infinity'].forEach(function (w) {
        withRule({ id: 'x-test-w', template: '{region} shows {w}.' }, perRegion('nb.arr', { vars: { region: 'A', w: w } }), function () {
          a.equal(ofRule('x-test-w').length, 0, '"' + w + '" is refused');
          a.ok(TAP.insights.failures().some(function (f) { return f.ruleId === 'x-test-w'; }), '"' + w + '" is logged');
        });
      });
      withRule({ id: 'x-test-noprov', compare: true }, perRegion('nb.arr', { provided: undefined }), function () {
        a.equal(ofRule('x-test-noprov').length, 0);
        a.ok(TAP.insights.failures().some(function (f) { return f.ruleId === 'x-test-noprov'; }), 'a comparison without provided is logged');
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
      PHASE1.forEach(function (f) {
        a.ok(list.some(function (x) { return x.family === f; }), 'family ' + f + ' is covered');
      });
      a.ok(list.some(function (x) { return x.fallback === 'details'; }), 'one insight falls back to the details panel');
      var ids = list.map(function (x) { return x.id; });
      a.equal(ids.filter(function (id, i) { return ids.indexOf(id) === i; }).length, ids.length, 'ids are unique');
    });
  });

  /* ---------- D111: why it matters, and context insights ---------- */

  T.suite('insight-why', function () {
    // The rules the owner's review found descriptive (D111): their insights are background, not on the charts
    var CONTEXT = ['consensus', 'split', 'strongRating', 'segmentMix', 'notYetList', 'sharedSubIndustry', 'sharedPartner', 'recurringTheme'];
    // Every insight on the sample before D111, from the dump of every sample insight: the count must not change
    var SAMPLE_ALL = 54;
    function cmpAll() { return Object.assign(TAP.store.defaults().cmp, { mode: 'all' }); }
    function txt(n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
    function visible(n) {
      if (!n) return false;
      var s = getComputedStyle(n);
      return s.display !== 'none' && s.visibility !== 'hidden' && n.offsetHeight > 0;
    }
    function banned(s) {
      return window.TAP_RULES.wording.banned.filter(function (w) { return new RegExp('(^|[^A-Za-z])' + w + '([^A-Za-z]|$)', 'i').test(s); });
    }

    T.test('X-d111-why-context', 'Every rule says why it matters or is marked as context, never both; no why line uses a banned word', function (a) {
      window.TAP_RULES.rules.forEach(function (r) {
        var why = typeof r.why === 'string' && r.why.trim().length > 0, ctx = r.context === true;
        a.ok(why !== ctx, r.id + ': exactly one of why and context');
        if (why) {
          a.deepEqual(banned(r.why), [], r.id + ': why uses no banned word');
          a.ok(/\.$/.test(r.why) && r.why.split(/\.\s/).length === 1, r.id + ': one sentence');
        }
      });
      CONTEXT.forEach(function (id) { a.equal(cfg(id) && cfg(id).context, true, id + ' is context'); });
      a.equal(cfg('spGap').why, 'The gap between a region\'s bottom-up plan and its strategic target is the first question in a planning review.',
        'the owner’s wording, word for word');
    });

    T.test('X-d111-why-context', 'Each insight carries its rule’s why (null for context) and a context flag; all() keeps every one', function (a) {
      sample();
      var list = TAP.insights.all();
      a.equal(list.length, SAMPLE_ALL, 'all() still lists every insight on the sample');
      list.forEach(function (x) {
        var r = cfg(x.ruleId);
        a.equal(x.context, r.context === true, x.id + ': context flag');
        a.equal(x.why, r.context === true ? null : r.why, x.id + ': why line');
      });
      a.ok(list.some(function (x) { return x.context; }) && list.some(function (x) { return !x.context; }), 'both kinds on the sample');
    });

    T.test('X-d111-why-context', 'A why line with a banned word sets the rule aside with a failure, like a sentence', function (a) {
      sample();
      withRule({ id: 'x-test-why', why: 'This looks wrong to the room.' }, perRegion('nb.arr'), function () {
        a.equal(ofRule('x-test-why').length, 0, 'no insight from the rule');
        var f = TAP.insights.failures().filter(function (x) { return x.ruleId === 'x-test-why'; });
        a.equal(f.length, 1, 'one failure for the rule');
        a.match(f[0] && f[0].message, /"wrong"/, 'naming the word');
      });
    });

    T.test('X-d111-why-context', 'No panel lists a context insight; the tier grid shows no consensus or split; asked for, ranked() includes them', function (a) {
      sample();
      var c = cmpAll();
      Object.keys(TAP.reports.all()).forEach(function (id) {
        var on = TAP.insights.ranked(c, { reportId: id }).filter(function (x) { return x.context; });
        a.equal(on.length, 0, id + ': no context insight in its ranked list');
        a.equal(TAP.panelInsights.get(c, id).list.filter(function (x) { return x.context; }).length, 0, id + ': none in the panel list');
      });
      var grid = TAP.panelInsights.get(c, 'ind-tiers');
      a.equal(grid.list.concat(grid.top ? [grid.top] : []).filter(function (x) { return x.ruleId === 'consensus' || x.ruleId === 'split'; }).length, 0,
        'tier grid: no consensus or split insight');
      var wide = TAP.insights.ranked(c, { context: true }), ids = wide.map(function (x) { return x.ruleId; });
      a.ok(ids.indexOf('consensus') >= 0 && ids.indexOf('split') >= 0, 'with context: true they are there');
      a.equal(wide.length, SAMPLE_ALL, 'with context: true, every insight in scope');
      a.equal(TAP.insights.ranked(c).filter(function (x) { return x.context; }).length, 0, 'by default, none');
    });

    T.test('X-d111-why-context', 'A panel takeaway, its insight list and a view headline show the why line as visible text', function (a) {
      sample();
      var p = TAP.panel.create(T.dom.mount(), 'ov-ambition', {});
      try {
        var top = TAP.panelInsights.get(TAP.store.get().cmp, 'ov-ambition').top;
        a.ok(top && top.why, 'the ambition chart leads with a kept insight');
        var line = p.el.querySelector('.tap-panel__takeaway .tap-panel__why');
        a.equal(txt(line), top && top.why, 'the takeaway shows its why line');
        a.ok(visible(line), 'as visible text');
        p.el.querySelector('[data-action="insights"]').click();
        var items = Array.prototype.slice.call(p.el.querySelectorAll('.tap-panel__insight'));
        a.ok(items.length > 0, 'the list is open');
        items.forEach(function (n, i) {
          var w = n.querySelector('.tap-panel__why');
          a.ok(w && txt(w).length > 20 && visible(w), 'list insight ' + (i + 1) + ' shows its why line');
        });
      } finally { p.destroy(); }
      var shown = 0;
      ['newBusiness', 'customers', 'partners', 'outlook'].forEach(function (view) {
        var root = T.dom.mount(), v = TAP.views.get(view).mount(root);
        try {
          var head = root.querySelector('.tap-vh__headline'), best = TAP.viewHead.headline(view, TAP.store.get().cmp);
          if (!head || head.hidden || !best) return;
          shown++;
          a.ok(!best.context, view + ': the headline is not a context insight');
          a.equal(txt(head.querySelector('.tap-vh__why')), best.why, view + ': the headline shows its why line');
          a.ok(visible(head.querySelector('.tap-vh__why')), view + ': as visible text');
        } finally { v.destroy(); }
      });
      a.ok(shown > 0, 'at least one view shows a headline on the sample');
    });

    T.test('X-d111-why-context', 'The Insights page holds the context insights in one closed group, each once; no insight appears twice', function (a) {
      sample();
      var root = T.dom.mount(), v = TAP.views.get('insights').mount(root);
      try {
        var box = root.querySelector('details[data-part="context"]');
        a.ok(box, 'a context group');
        a.ok(box && !box.open, 'closed by default');
        var want = TAP.insights.ranked(TAP.store.get().cmp, { context: true }).filter(function (x) { return x.context; }).map(function (x) { return x.id; });
        var got = Array.prototype.map.call(box ? box.querySelectorAll('[data-insight]') : [], function (n) { return n.getAttribute('data-insight'); });
        a.deepEqual(got.slice().sort(), want.slice().sort(), 'exactly the context insights');
        a.ok(txt(box && box.querySelector('summary')).indexOf(String(want.length)) >= 0, 'its count in the summary');
        var page = Array.prototype.map.call(root.querySelectorAll('.tap-ins__item[data-insight]'), function (n) { return n.getAttribute('data-insight'); });
        a.equal(page.filter(function (id, i) { return page.indexOf(id) === i; }).length, page.length, 'no insight twice on the page');
        a.equal(page.length, TAP.insights.all().length, 'every insight is on the page once');
        var outside = Array.prototype.filter.call(root.querySelectorAll('.tap-ins__item[data-insight]'), function (n) { return !box.contains(n); });
        a.equal(outside.filter(function (n) { return want.indexOf(n.getAttribute('data-insight')) >= 0; }).length, 0, 'no context insight in the ranked groups');
        var kept = outside[0];
        a.equal(txt(kept && kept.querySelector('.tap-ins__why')), cfg(kept && kept.getAttribute('data-insight').split(':')[0]).why, 'a ranked insight shows its why line');
        TAP.insights.hide(want[0]);
        box = root.querySelector('details[data-part="context"]');
        a.equal(box.querySelectorAll('[data-insight="' + want[0] + '"]').length, 0, 'a hidden context insight leaves the group');
      } finally { v.destroy(); TAP.insights.unhide(); }
    });
  });

  // Shared with tests/test-rules.js and tests/test-ranking.js.
  window.T_INSIGHT_SHAPE = checkShape;
  window.T_INSIGHTS = { sample: sample, withRule: withRule, perRegion: perRegion, ofRule: ofRule };
})(window.TAP);
