/*
 * File: tests/test-pages.js
 * Purpose: Tests for the explanation panel (US-1.6.5). The Guide, Insights page and tour add theirs below.
 * Provides: test cases for PAGES stories (#41; later #37, #46, #54, #11)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };

  function layerEl() { return document.querySelector('.tap-layer[data-layer="explain"]'); }
  // Opens the explanation, runs fn with the panel and always closes it again.
  function withExplain(reportId, fn, opts) {
    TAP.explain.open(reportId, opts);
    try { return fn(layerEl()); } finally { TAP.layers.close(); }
  }
  // Swaps in other settings for one test.
  function withSettings(path, value, fn) {
    var keys = path.split('.'), obj = window.TAP_SETTINGS;
    for (var i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    var last = keys[keys.length - 1], old = obj[last];
    obj[last] = value;
    try { return fn(); } finally { obj[last] = old; }
  }
  function sectionText(sections, key) {
    var s = sections.filter(function (x) { return x.key === key; })[0];
    return s ? s.paras.join(' ') : '';
  }

  /* ---------- US-1.6.5: an explanation for every report (#41) ---------- */
  T.suite('pages', function () {
    T.test('TPV-TC-186', 'The explanation icon opens a side panel with the three texts from the report definition', function (a) {
      var def = TAP.reports.get('ov-ambition');
      withExplain('ov-ambition', function (panel) {
        a.ok(panel, 'an explanation side panel is open');
        a.equal(TAP.layers.top(), 'explain', 'it is the open side panel');
        var heads = qsa('.tap-explain__head', panel).map(txt);
        a.deepEqual(heads.slice(0, 3), [TAP.content.text('explain.shows'), TAP.content.text('explain.read'), TAP.content.text('explain.lookFor')],
          'the three headings, in order');
        var body = txt(panel);
        a.ok(body.indexOf(def.explain.shows.slice(0, 40)) >= 0, '"What this shows" text');
        a.ok(body.indexOf(def.explain.read.slice(0, 40)) >= 0, '"How to read it" text');
        a.ok(body.indexOf(def.explain.lookFor.slice(0, 40)) >= 0, '"What to look for" text');
        a.ok(body.indexOf(def.title) >= 0, 'names the chart it explains');
      });
    });

    T.test('TPV-TC-186', 'The explanation stays open when the comparison or view changes, until it is closed', function (a) {
      TAP.explain.open('ind-tiers');
      try {
        TAP.store.set({ cmp: { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' } });
        a.ok(layerEl(), 'still open after a comparison change');
        TAP.store.set({ industry: 'ind2' });
        a.ok(layerEl(), 'still open after another state change');
        var close = layerEl().querySelector('.tap-layer__close');
        close.click();
        a.ok(!layerEl(), 'closed by its close button');
      } finally { TAP.layers.close(); }
    });

    T.test('TPV-TC-187', 'A report using the scores says how each score is built from the score weights in the settings', function (a) {
      var s = TAP.explain.sections('ind-quad', { mode: 'all' });
      var built = sectionText(s, 'scores');
      a.ok(built.indexOf('Attractiveness is the average of Growth potential, Criticality and Competitive intensity') >= 0,
        'attractiveness: the three market ratings, equal weights');
      a.ok(built.indexOf('Ability to win is the average of References, Expertise and Product fit') >= 0,
        'ability to win: the three region ratings, equal weights');
      a.ok(built.indexOf('2.0') >= 0, 'names the midpoint from the settings');
    });

    T.test('TPV-TC-187', 'Unequal score weights are named with their weights', function (a) {
      withSettings('scores.attractiveness', { growthPotential: 2, criticality: 1, competitiveIntensity: 0 }, function () {
        var built = sectionText(TAP.explain.sections('ind-quad', { mode: 'all' }), 'scores');
        a.ok(built.indexOf('Attractiveness is a weighted average of Growth potential (weight 2) and Criticality (weight 1)') >= 0,
          'weighted wording, a zero weight left out: ' + built);
      });
    });

    T.test('TPV-TC-187', 'Reports without scores have no score section', function (a) {
      a.equal(sectionText(TAP.explain.sections('ov-ambition', { mode: 'all' }), 'scores'), '', 'no score text for the ambition chart');
    });

    T.test('TPV-TC-187', 'A combined figure is explained: average of the rest, total of the rest, organization total', function (a) {
      var avg = sectionText(TAP.explain.sections('ov-ambition', { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' }), 'combined');
      a.ok(avg.indexOf('Average of the other 3 regions') >= 0, 'names the average of the rest: ' + avg);
      a.ok(avg.indexOf(TAP.content.text('combined.explainAverage')) >= 0, 'says what the average means');
      var tot = sectionText(TAP.explain.sections('ov-ambition', { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'total' }), 'combined');
      a.ok(tot.indexOf('Total of the other 3 regions') >= 0, 'names the total of the rest');
      a.ok(tot.indexOf(TAP.content.text('combined.explainTotal')) >= 0, 'says what the total means');
      var org = sectionText(TAP.explain.sections('ov-ambition', { mode: 'org' }), 'combined');
      a.ok(org.indexOf(TAP.content.text('combined.explainTotal')) >= 0, 'the organization total is explained as a total');
    });

    T.test('TPV-TC-187', 'Without a combined figure the panel says nothing is combined', function (a) {
      var all = sectionText(TAP.explain.sections('ov-ambition', { mode: 'all' }), 'combined');
      a.equal(all, TAP.content.text('explain.noCombined'), 'all regions side by side');
      var pair = sectionText(TAP.explain.sections('ov-ambition', { mode: 'pair', focus: 'alpha', second: 'bravo' }), 'combined');
      a.equal(pair, TAP.content.text('explain.noCombined'), 'one against one');
    });

    T.test('TPV-TC-187', 'Combined ratings say they are averaged with a range', function (a) {
      var c = sectionText(TAP.explain.sections('ind-ratings', { mode: 'org' }), 'combined');
      a.ok(c.indexOf(TAP.content.text('explain.ratingRange')) >= 0, 'rating averages show their range: ' + c);
    });

    T.test('TPV-TC-187', 'The open panel follows the shared comparison while it is open', function (a) {
      withExplain('ov-ambition', function (panel) {
        a.ok(txt(panel).indexOf(TAP.content.text('explain.noCombined')) >= 0, 'all regions: nothing combined');
        TAP.store.set({ cmp: { mode: 'org' } });
        a.ok(txt(layerEl()).indexOf(TAP.content.text('combined.explainTotal')) >= 0, 'organization total: explained as a total');
      });
    });

    T.test('TPV-TC-187', 'A panel with its own comparison is explained for that comparison', function (a) {
      withExplain('ov-ambition', function (panel) {
        a.ok(txt(panel).indexOf(TAP.content.text('combined.explainTotal')) >= 0, 'explains the panel comparison, not the shared one');
      }, { cmp: { mode: 'org' } });
    });

    T.test('X-pages-explain-terms', 'Glossary terms are marked once in the whole panel', function (a) {
      withExplain('ind-quad', function (panel) {
        var ids = qsa('.tap-term', panel).map(function (b) { return b.getAttribute('data-term'); });
        a.ok(ids.indexOf('attractiveness') >= 0, 'attractiveness is marked');
        var dupes = ids.filter(function (id, i) { return ids.indexOf(id) !== i; });
        a.deepEqual(dupes, [], 'no term marked twice');
      });
    });

    T.test('X-pages-explain-industry', 'A title with {industry} names the chosen industry', function (a) {
      TAP.store.set({ industry: 'ind2' });
      var name = TAP.data.industry('ind2').name;
      withExplain('ind-ratings', function (panel) {
        var p = panel.querySelector('.tap-explain__report');
        a.ok(txt(p).indexOf(name) >= 0, 'the industry name is filled in');
        a.ok(txt(p).indexOf('{industry}') < 0, 'no placeholder left');
      });
    });

    T.test('X-pages-explain-unknown', 'An unknown report shows a plain message instead of failing', function (a) {
      withExplain('no-such-report', function (panel) {
        a.ok(panel, 'the panel still opens');
        a.ok(txt(panel).indexOf(TAP.content.text('explain.unknown')) >= 0, 'says there is no explanation');
      });
    });
  });
})(window.TAP);
