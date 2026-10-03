/*
 * File: tests/test-pages.js
 * Purpose: Tests for the explanation panel (US-1.6.5) and the Guide page (US-1.6.1); the Insights page and tour follow.
 * Provides: test cases for PAGES stories (#41, #37; later #46, #54, #11)
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

  // Mounts the Guide view, runs fn and always destroys it.
  function withGuide(fn) {
    var root = T.dom.mount(), handle = TAP.views.get('guide').mount(root);
    try { return fn(root); } finally { handle.destroy(); }
  }
  // "Open Industry priorities": the content template with a view title filled in.
  function isViewLink(s) {
    return TAP.views.order().some(function (id) {
      return s === TAP.content.text('guidePage.openView', { view: TAP.views.title(id) });
    });
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

    /* ---------- US-1.6.1: the Guide page (#37) ---------- */

    T.test('TPV-TC-172', 'The Guide has three sections with a contents list at the top that jumps to each', function (a) {
      withGuide(function (root) {
        var g = TAP.content.guide();
        var links = qsa('.tap-guide__toc button', root);
        a.deepEqual(links.map(txt), g.contents.map(function (c) { return c.title; }), 'contents list titles, in order');
        var secs = qsa('.tap-guide__sec', root).map(function (n) { return n.getAttribute('data-guide'); });
        a.deepEqual(secs, ['howTo', 'planning', 'glossary'], 'three sections, in order');
        var toc = root.querySelector('.tap-guide__toc');
        a.ok(toc.compareDocumentPosition(root.querySelector('.tap-guide__sec')) & Node.DOCUMENT_POSITION_FOLLOWING, 'contents come first');
        links[2].click();
        a.equal(document.activeElement, root.querySelector('[data-guide="glossary"] h2'), 'the glossary link moves to the glossary heading');
        links[0].click();
        a.equal(document.activeElement, root.querySelector('[data-guide="howTo"] h2'), 'the first link moves to How to use this app');
      });
    });

    T.test('TPV-TC-173', 'How to use this app covers the menu, comparison bar, panels, chart types, table view, sources and insights', function (a) {
      withGuide(function (root) {
        var ids = qsa('[data-guide="howTo"] .tap-guide__part', root).map(function (n) { return n.getAttribute('data-part'); });
        ['menu', 'compare', 'panels', 'chartTypes', 'table', 'sources', 'insights'].forEach(function (id) {
          a.ok(ids.indexOf(id) >= 0, 'covers ' + id);
        });
        var first = TAP.content.guide().howTo.sections[0].paragraphs[0];
        a.ok(txt(root.querySelector('[data-guide="howTo"]')).indexOf(first.slice(0, 30)) >= 0, 'paragraph text shown');
      });
    });

    T.test('TPV-TC-173', 'How to use this app has a "Take the tour" button that starts the tour', function (a) {
      var calls = 0, old = TAP.tour.start;
      TAP.tour.start = function () { calls++; };
      try {
        withGuide(function (root) {
          var btn = root.querySelector('[data-guide="howTo"] .tap-guide__tour');
          a.ok(btn, 'the button is in How to use this app');
          a.equal(txt(btn), TAP.content.text('guidePage.tour'), 'its label comes from the content file');
          btn.click();
          a.equal(calls, 1, 'the tour starts');
        });
      } finally { TAP.tour.start = old; }
    });

    T.test('TPV-TC-174', '"Reset all charts to default" clears every remembered chart choice and tells the charts', function (a) {
      var events = 0;
      TAP.storage.set('chart:ov-ambition', { type: 'treemap' });
      TAP.storage.set('chart:ind-quad', { type: 'scatter' });
      TAP.storage.set('x-pages-keep', true);
      TAP.bus.on('charts:reset', function () { events++; });
      try {
        withGuide(function (root) {
          var btn = root.querySelector('[data-guide="howTo"] .tap-guide__reset');
          a.equal(txt(btn), TAP.content.text('guidePage.reset'), 'labelled from the content file');
          btn.click();
          a.equal(TAP.storage.get('chart:ov-ambition', null), null, 'first chart choice cleared');
          a.equal(TAP.storage.get('chart:ind-quad', null), null, 'second chart choice cleared');
          a.equal(TAP.storage.get('x-pages-keep', null), true, 'other remembered things are kept');
          a.equal(events, 1, 'charts:reset is sent once');
          a.equal(txt(root.querySelector('.tap-guide__status')), TAP.content.text('guidePage.resetDone'), 'says it is done');
        });
      } finally { TAP.storage.remove('x-pages-keep'); }
    });

    T.test('TPV-TC-175', 'Every word on the Guide page comes from the content files', function (a) {
      var pool = [];
      (function collect(v) {
        if (typeof v === 'string') pool.push(v);
        else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { collect(v[k]); });
      })([TAP.content.guide(), window.TAP_CONTENT.text]);
      var all = pool.join('\n');
      withGuide(function (root) {
        var gloss = root.querySelector('[data-guide="glossary"] .tap-gloss');
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, stray = [];
        while ((n = walker.nextNode())) {
          if (gloss && gloss.contains(n)) continue;   // the glossary list is CONTENT's, checked in its own tests
          var s = n.nodeValue.replace(/\s+/g, ' ').trim();
          if (s && all.indexOf(s) < 0 && !isViewLink(s)) stray.push(s);
        }
        a.deepEqual(stray, [], 'no text written into the page code');
        a.ok(gloss, 'the glossary list is drawn by TAP.glossary.render');
      });
    });

    T.test('X-pages-guide-links', 'A planning section with a view link opens that view (TPV-TC-177)', function (a) {
      withGuide(function (root) {
        var secs = TAP.content.guide().planning.sections;
        var sec = secs.filter(function (x) { return x.link && x.link.view === 'industry'; })[0];
        var btn = root.querySelector('[data-part="' + sec.id + '"] .tap-guide__link');
        a.ok(btn, 'the section has a link');
        a.ok(txt(btn).indexOf(TAP.views.title('industry')) >= 0, 'it names the view');
        btn.click();
        a.equal(TAP.store.get().view, 'industry', 'the view changes');
        var none = secs.filter(function (x) { return !x.link; })[0];
        a.ok(!root.querySelector('[data-part="' + none.id + '"] .tap-guide__link'), 'a section without a view has no link');
      });
    });

    T.test('X-pages-guide-org', 'An organization paragraph replaces the general one, with a badge (TPV-TC-178)', function (a) {
      var old = window.TAP_ORG;
      window.TAP_ORG = { guide: { planning: { sections: [{ id: 'tiers', paragraphs: ['Our tiers follow the yearly group review.'] }] } } };
      try {
        withGuide(function (root) {
          var part = root.querySelector('[data-part="tiers"]');
          a.ok(txt(part).indexOf('Our tiers follow the yearly group review.') >= 0, 'organization paragraph shown');
          var general = window.TAP_CONTENT.guide.planning.sections.filter(function (x) { return x.id === 'tiers'; })[0];
          a.ok(txt(part).indexOf(general.paragraphs[0].slice(0, 30)) < 0, 'general paragraph replaced');
          a.ok(part.querySelector('.tap-badge'), 'marked as an organization section');
        });
      } finally { window.TAP_ORG = old; }
    });

    T.test('X-pages-guide-terms', 'Glossary terms in the guide text are marked', function (a) {
      withGuide(function (root) {
        a.ok(qsa('[data-guide="planning"] .tap-term', root).length > 0, 'planning text has marked terms');
      });
    });
  });
})(window.TAP);
