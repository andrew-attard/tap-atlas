/*
 * File: tests/test-pages.js
 * Purpose: Tests for the explanation panel (US-1.6.5), the Guide page (US-1.6.1), the Insights page (US-1.7.3) and
 *          hiding insights on it (US-1.7.11), and the welcome tour (US-1.1.11).
 * Provides: test cases for PAGES stories (#41, #37, #46, #54, #11)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, data/sample-plan-data.js, tests/fixtures/insights-fixture.js
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

  // A stand-in for the insight engine, built from the INSIGHTS fixture, until the real engine is merged.
  // It follows ARCHITECTURE section 12: scope by region, focus region first, then significance; hidden left out.
  function fakeInsights() {
    var list = T_FIXTURE('insights');
    function hidden() { return (TAP.store.get().hiddenInsights || []).slice(); }
    function ranked(cmp, f) {
      f = f || {};
      var scope = TAP.scope.regionIds(cmp), hid = hidden();
      var focus = cmp.mode === 'one' || cmp.mode === 'pair' ? cmp.focus : null;
      return list.filter(function (x) {
        return hid.indexOf(x.id) < 0 && x.regionIds.some(function (r) { return scope.indexOf(r) >= 0; }) &&
          (!f.family || x.family === f.family) && (!f.regionId || x.regionIds.indexOf(f.regionId) >= 0) &&
          (!f.reportId || x.attach.indexOf(f.reportId) >= 0);
      }).sort(function (a, b) {
        var fa = !!focus && a.regionIds.indexOf(focus) >= 0, fb = !!focus && b.regionIds.indexOf(focus) >= 0;
        if (fa !== fb) return fa ? -1 : 1;
        return b.significance - a.significance;
      });
    }
    return {
      all: function () { return list; }, ranked: ranked,
      top: function (cmp, reportId, n) { return ranked(cmp, { reportId: reportId }).slice(0, n); },
      hide: function (id) { if (hidden().indexOf(id) < 0) TAP.store.set({ hiddenInsights: hidden().concat(id) }); },
      unhide: function (id) { TAP.store.set({ hiddenInsights: hidden().filter(function (h) { return h !== id; }) }); },
      hidden: hidden, failures: function () { return []; }, reset: function () {}, defineRule: function () {}
    };
  }
  // Mounts the Insights view on the sample data with the stand-in engine, runs fn and always restores both.
  function withInsights(fn, cmp) {
    var old = TAP.insights, root = T.dom.mount(), handle = null;
    TAP.insights = fakeInsights();
    TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
    if (cmp) TAP.store.set({ cmp: cmp });
    function done() { if (handle) handle.destroy(); TAP.insights = old; }
    try {
      handle = TAP.views.get('insights').mount(root);
      var out = fn(root);
      if (out && out.then) return out.then(function (v) { done(); return v; }, function (e) { done(); throw e; });
      done();
      return out;
    } catch (e) { done(); throw e; }
  }
  function items(root) { return qsa('.tap-ins__item', root).map(function (n) { return n.getAttribute('data-insight'); }); }
  function chipCount(root, attr, id) {
    var chip = root.querySelector('.tap-ins__chip[' + attr + '="' + id + '"]');
    return chip ? Number(txt(chip.querySelector('.tap-ins__n'))) : null;
  }
  function chip(root, attr, id) { return root.querySelector('.tap-ins__chip[' + attr + '="' + id + '"]'); }
  function item(root, id) { return root.querySelector('.tap-ins__item[data-insight="' + id + '"]'); }

  // The tour: a key press, the open callout and a clean slate after each test.
  function press(key) {
    var e = new KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true });
    document.dispatchEvent(e);
    return e;
  }
  function callout() { return document.querySelector('.tap-tour__card'); }
  function welcome() { return document.querySelector('.tap-tour-welcome'); }
  function stepNo() { var c = callout(); return c ? Number(c.getAttribute('data-step')) : null; }
  function withTour(fn) {
    TAP.storage.remove('tour:done');
    var oldFs = TAP.tour.fullscreen;
    try { return fn(); } finally { TAP.tour.stop(); TAP.tour.fullscreen = oldFs; TAP.storage.remove('tour:done'); TAP.layers.close(); }
  }
  // Starts the app in the sandbox (as the shell tests do) and always stops it again.
  function withApp(fn) {
    var root = T.dom.mount();
    TAP.app.start({ root: root, plan: T_FIXTURE('mini') });
    try { return fn(root); } finally {
      try { TAP.app.start({ root: T.dom.mount(), plan: null }); } catch (e) { /* screens may differ */ }
      TAP.data.load(T_FIXTURE('mini'));
    }
  }
  // US-2.6.3 added the Phase 2 views and the region profile after the menu step (at most 10 steps, TPV-TC-507)
  var STEPS = ['purpose', 'menu', 'views', 'profile', 'compare', 'panel', 'freshness', 'glossary', 'guide'];

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
        // Sections added through TAP.guideExtras join the contents list before the glossary (ARCHITECTURE 18.1)
        var own = g.contents.map(function (c) { return c.title; }), added = (TAP.guideExtras || []).map(function (x) { return x.title; });
        a.deepEqual(links.map(txt), own.slice(0, -1).concat(added, own.slice(-1)), 'contents list titles, in order');
        var secs = qsa('.tap-guide__sec', root).map(function (n) { return n.getAttribute('data-guide'); });
        // Sections other streams add (TAP.guideExtras, ARCHITECTURE 18.1) sit after planning and before the glossary
        var extra = (TAP.guideExtras || []).map(function (x) { return x.id; });
        a.deepEqual(secs.filter(function (id) { return extra.indexOf(id) < 0; }), ['howTo', 'planning', 'glossary'], 'three sections, in order');
        a.deepEqual(secs.slice(2, secs.length - 1), extra, 'the added sections come after planning and before the glossary');
        var toc = root.querySelector('.tap-guide__toc');
        a.ok(toc.compareDocumentPosition(root.querySelector('.tap-guide__sec')) & Node.DOCUMENT_POSITION_FOLLOWING, 'contents come first');
        links[links.length - 1].click();
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
          var ext = n.parentNode && n.parentNode.closest ? n.parentNode.closest('.tap-guide__extra') : null;
          if (ext) continue;   // an added section's words (some from the data) are checked by the stream that adds it
          var s = n.nodeValue.replace(/\s+/g, ' ').trim();
          // Key numbers in the shortcut list (US-2.6.3) are numbers, not wording
          if (s && all.indexOf(s) < 0 && !isViewLink(s) && !/^\d$/.test(s)) stray.push(s);
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

    /* ---------- US-1.7.3: the Insights page (#46) ---------- */

    T.test('TPV-TC-138', 'Every insight is listed, ranked, grouped by family with a one-line explanation', function (a) {
      withInsights(function (root) {
        a.equal(items(root).length, 8, 'all 8 fixture insights listed');
        var groups = qsa('.tap-ins__group', root).map(function (g) { return g.getAttribute('data-family'); });
        a.deepEqual(groups, ['priorities', 'judgement', 'assumptions', 'realism', 'exposure', 'capability'], 'family order');
        groups.forEach(function (f) {
          var line = txt(root.querySelector('.tap-ins__group[data-family="' + f + '"] .tap-ins__gline'));
          a.equal(line, TAP.content.text('insightsPage.families.' + f + '.line'), f + ' is explained in one line');
        });
        a.deepEqual(items(root.querySelector('.tap-ins__group[data-family="priorities"]')), ['consensus:education', 'groupPriority:datacenters:ability'],
          'ranked by significance inside a family (0.62 before 0.48)');
        a.deepEqual(items(root.querySelector('.tap-ins__group[data-family="judgement"]')), ['tierVsPipeline:seu:retail', 'strongRating:neu:pharma'],
          'judgement: 0.41 before 0.37');
        var labels = qsa('.tap-ins__label', root).map(txt);
        a.ok(labels.length === 8 && labels.every(function (l) { return l === 'Observation to discuss'; }), 'every insight is labelled an observation to discuss');
      });
    });

    T.test('TPV-TC-138', 'Each insight names its regions with the organization short names', function (a) {
      withInsights(function (root) {
        var names = qsa('.tap-ins__region', item(root, 'pipelineCover:latam')).map(txt);
        a.deepEqual(names, [TAP.content.regionName(TAP.data.region('latam'))], 'the one region involved');
      });
    });

    T.test('TPV-TC-139', 'The family and region filters leave only matching insights', function (a) {
      withInsights(function (root) {
        chip(root, 'data-family', 'judgement').click();
        a.deepEqual(items(root).sort(), ['strongRating:neu:pharma', 'tierVsPipeline:seu:retail'], 'judgement only');
        a.equal(chip(root, 'data-family', 'judgement').getAttribute('aria-pressed'), 'true', 'the chip shows it is on');
        chip(root, 'data-family', 'judgement').click();
        chip(root, 'data-region', 'latam').click();
        a.deepEqual(items(root).sort(), ['consensus:education', 'groupPriority:datacenters:ability', 'pipelineCover:latam'], 'Latin America only');
        chip(root, 'data-family', 'priorities').click();
        a.deepEqual(items(root).sort(), ['consensus:education', 'groupPriority:datacenters:ability'], 'Latin America and priorities');
        chip(root, 'data-region', 'apac').click();
        a.equal(items(root).length, 2, 'two regions widen the region filter (either region): still both priorities insights');
        root.querySelector('.tap-ins__clear').click();
        a.equal(items(root).length, 8, 'Clear filters shows everything again');
      });
    });

    T.test('TPV-TC-139', 'The list follows the comparison setting, including changes while it is open', function (a) {
      withInsights(function (root) {
        a.deepEqual(items(root).sort(), ['concentration:na', 'consensus:education', 'groupPriority:datacenters:ability',
          'notYetWinnable:fsm', 'pipelineCover:latam'], 'one against one: insights about either region');
        a.deepEqual(qsa('.tap-ins__chip[data-region]', root).map(function (c) { return c.getAttribute('data-region'); }), ['na', 'latam'],
          'region filter offers the regions in scope');
        TAP.store.set({ cmp: { mode: 'set', set: ['mea', 'apac'] } });
        a.deepEqual(items(root).sort(), ['consensus:education', 'groupPriority:datacenters:ability', 'notYetWinnable:fsm'],
          'redrawn for the new comparison');
      }, { mode: 'pair', focus: 'na', second: 'latam' });
    });

    // Review fix #375 (SV-7): a region filter whose region leaves the comparison no longer applies, not even once
    T.test('X-review-SV-7', 'A region chip that leaves the comparison stops filtering at once', function (a) {
      withInsights(function (root) {
        chip(root, 'data-region', 'mea').click();
        a.equal(chip(root, 'data-region', 'mea').getAttribute('aria-pressed'), 'true', 'Middle East and Africa is pressed');
        TAP.store.set({ cmp: { mode: 'pair', focus: 'na', second: 'latam' } });
        a.ok(!chip(root, 'data-region', 'mea'), 'its chip is gone with it');
        a.deepEqual(items(root).sort(), ['concentration:na', 'consensus:education', 'groupPriority:datacenters:ability',
          'notYetWinnable:fsm', 'pipelineCover:latam'], 'every insight about either region, unfiltered');
        a.ok(!root.querySelector('.tap-ins__none'), 'no "nothing matches" message');
      });
    });

    T.test('TPV-TC-140', 'An insight expands to show its figures, rule and sources', function (a) {
      withInsights(function (root) {
        var it = item(root, 'pipelineCover:latam'), toggle = it.querySelector('.tap-ins__toggle');
        a.ok(!it.querySelector('.tap-ins__details'), 'closed at first');
        toggle.click();
        it = item(root, 'pipelineCover:latam');
        a.equal(it.querySelector('.tap-ins__toggle').getAttribute('aria-expanded'), 'true', 'the toggle says it is open');
        var d = txt(it.querySelector('.tap-ins__details'));
        a.ok(d.indexOf('Pipeline created in the last 12 months') >= 0, 'figure label');
        a.ok(d.indexOf(TAP.format.moneyExact(363.4)) >= 0, 'figure value as an exact amount');
        a.ok(d.indexOf('Year-1 new business ARR potential at least 3 times') >= 0, 'the rule behind it');
        var where = TAP.sources.address({ regionId: 'latam', section: 'marketCoverage', field: 'pipelineCreated12m', row: null, rows: [], year: null, cell: null, kind: 'PRE' }).text;
        a.ok(d.indexOf(where) >= 0, 'its sources by file, sheet and cell');
        var tiers = item(root, 'consensus:education');
        tiers.querySelector('.tap-ins__toggle').click();
        a.ok(txt(item(root, 'consensus:education').querySelector('.tap-ins__details')).indexOf('Tier 2') >= 0, 'a tier reads as Tier 2');
      });
    });

    T.test('TPV-TC-141', '"Show me" asks for the chart highlight; Phase 2 data opens the region details instead', function (a) {
      var got = [], opened = [], oldOpen = TAP.layers.openDetails;
      TAP.layers.openDetails = function (t) { opened.push(t); };
      try {
        withInsights(function (root) {
          TAP.bus.on('showme', function (p) { got.push(p); });
          item(root, 'notYetWinnable:fsm').querySelector('.tap-ins__showme').click();
          a.equal(got.length, 1, 'one showme event');
          a.equal(got[0].insightId, 'notYetWinnable:fsm', 'names the insight');
          a.equal(got[0].target.reportId, 'ind-quad', 'targets its chart');
          a.equal(got[0].target.quadrant, 'attractiveNotYet', 'with what to highlight');
          item(root, 'outlier:nb.hitRate:ceu').querySelector('.tap-ins__showme').click();
          a.equal(got.length, 1, 'no showme for an insight without a Phase 1 chart');
          a.equal(opened.length, 1, 'the details panel opens instead');
          a.deepEqual(opened[0].regionIds, ['ceu'], 'for that region');
        });
      } finally { TAP.layers.openDetails = oldOpen; }
    });

    T.test('TPV-TC-142', '"Copy" text holds the sentence, the figures, the rule and the sources', function (a) {
      withInsights(function () {
        var x = T_FIXTURE('insights').filter(function (i) { return i.id === 'tierVsPipeline:seu:retail'; })[0];
        var text = TAP.views.get('insights').copyText(x);
        a.ok(text.indexOf(x.sentence) === 0, 'starts with the sentence');
        a.ok(text.indexOf('Observation to discuss') >= 0, 'keeps the label');
        a.ok(text.indexOf('Tier, Retail: Tier 3') >= 0, 'figure with its value');
        a.ok(text.indexOf('Pipeline, Retail: ' + TAP.format.moneyExact(2935)) >= 0, 'amount figure, exact');
        a.ok(text.indexOf(x.description) >= 0, 'the rule');
        a.ok(text.indexOf(TAP.sources.address(x.sources[0]).text) >= 0, 'a source address');
        a.ok(text.indexOf('<') < 0, 'plain text, no markup');
      });
    });

    T.test('TPV-TC-142', 'The Copy button reports the result in words', function (a) {
      return withInsights(function (root) {
        item(root, 'concentration:na').querySelector('.tap-ins__copy').click();
        return new Promise(function (r) { setTimeout(r, 1500); }).then(function () {
          var s = txt(root.querySelector('.tap-ins__status'));
          a.ok(s === TAP.content.text('insightsPage.copied') || s === TAP.content.text('insightsPage.copyFailed'), 'status: ' + s);
        });
      });
    });

    T.test('TPV-TC-143', 'Counts per family and per region match the hand count of the fixture', function (a) {
      withInsights(function (root) {
        var fam = { priorities: 2, judgement: 2, assumptions: 1, realism: 1, exposure: 1, capability: 1 };
        Object.keys(fam).forEach(function (f) {
          a.equal(chipCount(root, 'data-family', f), fam[f], f + ' chip count');
          a.equal(qsa('.tap-ins__item', root.querySelector('.tap-ins__group[data-family="' + f + '"]')).length, fam[f], f + ' group size');
        });
        a.equal(txt(root.querySelector('[data-family="priorities"] .tap-ins__gcount')), TAP.content.text('insightsPage.count', { n: 2 }), 'group header count');
        var reg = { na: 3, latam: 3, neu: 3, seu: 3, ceu: 3, mea: 2, apac: 2 };
        Object.keys(reg).forEach(function (r) { a.equal(chipCount(root, 'data-region', r), reg[r], r + ' region count'); });
        a.equal(txt(root.querySelector('.tap-ins__shown')), TAP.content.text('insightsPage.shown', { n: 8, total: 8 }), 'shown of total');
        chip(root, 'data-family', 'judgement').click();
        var after = { na: 0, latam: 0, neu: 1, seu: 1, ceu: 0, mea: 0, apac: 0 };
        Object.keys(after).forEach(function (r) { a.equal(chipCount(root, 'data-region', r), after[r], r + ' count within judgement'); });
        a.equal(chipCount(root, 'data-family', 'judgement'), 2, 'family counts are not narrowed by their own filter');
      });
    });

    T.test('X-pages-insights-none', 'Filters that match nothing say so, with a way back', function (a) {
      withInsights(function (root) {
        chip(root, 'data-region', 'mea').click();
        chip(root, 'data-family', 'realism').click();
        a.equal(items(root).length, 0, 'nothing matches');
        a.equal(txt(root.querySelector('.tap-ins__none p')), TAP.content.text('insightsPage.none'), 'a plain message');
        root.querySelector('.tap-ins__none button').click();
        a.equal(items(root).length, 8, 'clearing brings everything back');
      });
    });

    T.test('X-pages-insights-wording', 'Every word on the Insights page is found in its wording file', function (a) {
      withInsights(function (root) {
        item(root, 'concentration:na').querySelector('.tap-ins__toggle').click();
        var s = txt(root);
        a.ok(s.indexOf('[insightsPage.') < 0, 'no missing wording key');
        a.ok(s.indexOf('[object') < 0, 'no object shown as text');
        a.ok(s.indexOf(TAP.content.text('insightsPage.familiesLabel')) >= 0, 'the family row is labelled');
      });
    });

    /* ---------- US-1.7.11: hide an insight for this session, Insights page side (#54) ---------- */

    T.test('TPV-TC-267', 'Every insight on the page has a "Hide for this session" control', function (a) {
      withInsights(function (root) {
        var all = qsa('.tap-ins__item', root), btns = qsa('.tap-ins__item .tap-ins__hide', root);
        a.equal(btns.length, all.length, 'one per insight');
        a.ok(btns.every(function (b) { return txt(b) === TAP.content.text('insightsPage.hide'); }), 'labelled from the content file');
      });
    });

    T.test('TPV-TC-268', 'A hidden insight leaves the page at once and the next-ranked one moves up', function (a) {
      withInsights(function (root) {
        item(root, 'consensus:education').querySelector('.tap-ins__hide').click();
        a.deepEqual(TAP.insights.hidden(), ['consensus:education'], 'the engine holds it as hidden');
        a.ok(!item(root, 'consensus:education'), 'gone from the page');
        a.deepEqual(items(root.querySelector('.tap-ins__group[data-family="priorities"]')), ['groupPriority:datacenters:ability'],
          'the next-ranked priorities insight now leads');
        a.equal(chipCount(root, 'data-family', 'priorities'), 1, 'family count drops');
        a.equal(chipCount(root, 'data-region', 'mea'), 1, 'region count drops (Middle East & Africa: 2 to 1)');
        a.equal(txt(root.querySelector('.tap-ins__shown')), TAP.content.text('insightsPage.shown', { n: 7, total: 7 }), 'shown of total');
      });
    });

    T.test('TPV-TC-268', 'An insight hidden elsewhere (a panel or the Overview) disappears from the page too', function (a) {
      withInsights(function (root) {
        TAP.insights.hide('pipelineCover:latam');
        a.ok(!item(root, 'pipelineCover:latam'), 'redrawn without it');
        a.ok(!root.querySelector('.tap-ins__group[data-family="realism"]'), 'an emptied family is left out');
      });
    });

    T.test('TPV-TC-270', 'The page shows "N hidden" with a one-click "Show hidden", and each can be shown again', function (a) {
      withInsights(function (root) {
        a.ok(!root.querySelector('.tap-ins__hidden'), 'nothing hidden: no hidden count');
        item(root, 'outlier:nb.hitRate:ceu').querySelector('.tap-ins__hide').click();
        item(root, 'concentration:na').querySelector('.tap-ins__hide').click();
        a.equal(txt(root.querySelector('.tap-ins__hidden')), TAP.content.text('insightsPage.hiddenCount', { n: 2 }), '"2 hidden"');
        var show = root.querySelector('.tap-ins__showhidden');
        a.equal(txt(show), TAP.content.text('insightsPage.showHidden'), 'a "Show hidden" button');
        show.click();
        var back = item(root, 'concentration:na');
        a.ok(back, 'hidden insights are listed again');
        a.equal(txt(back.querySelector('.tap-ins__hiddenbadge')), TAP.content.text('insightsPage.hiddenBadge'), 'marked as hidden for this session');
        a.equal(txt(back.querySelector('.tap-ins__hide')), TAP.content.text('insightsPage.unhide'), 'its control now shows it again');
        a.equal(txt(root.querySelector('.tap-ins__showhidden')), TAP.content.text('insightsPage.hideHidden'), 'the toggle can hide them again');
        back.querySelector('.tap-ins__hide').click();
        a.deepEqual(TAP.insights.hidden(), ['outlier:nb.hitRate:ceu'], 'shown again in the engine too');
        a.ok(!item(root, 'concentration:na').querySelector('.tap-ins__hiddenbadge'), 'no longer marked hidden');
        a.equal(txt(root.querySelector('.tap-ins__hidden')), TAP.content.text('insightsPage.hiddenCountOne'), '"1 hidden"');
      });
    });

    T.test('X-pages-insights-hide-focus', 'After hiding, keyboard focus lands on a control that is still there', function (a) {
      withInsights(function (root) {
        var btn = item(root, 'consensus:education').querySelector('.tap-ins__hide');
        btn.focus();
        btn.click();
        a.ok(root.contains(document.activeElement) && document.activeElement !== document.body, 'focus stays on the page');
      });
    });

    /* ---------- US-1.1.11: the guided welcome tour (#11) ---------- */

    T.test('TPV-TC-233', 'In a browser that never opened the app, a welcome card offers the tour or Skip', function (a) {
      withTour(function () {
        a.equal(TAP.tour.offer(), true, 'offered');
        var card = welcome();
        a.ok(card, 'the welcome card is shown');
        var labels = Array.prototype.slice.call(card.querySelectorAll('button')).map(txt);
        a.ok(labels.indexOf(TAP.content.text('tourUi.take')) >= 0, '"Take the 1-minute tour"');
        a.ok(labels.indexOf(TAP.content.text('tourUi.skip')) >= 0, '"Skip"');
        a.equal(TAP.content.text('tourUi.take'), 'Take the 1-minute tour', 'wording as in the story');
      });
    });

    T.test('TPV-TC-234', 'Steps of one or two sentences, in the order of the stories', function (a) {
      var ids = TAP.tour.steps().map(function (s) { return s.id; });
      a.deepEqual(ids, STEPS, 'purpose, menu, the Phase 2 views, the profile, comparison bar, report panel, data freshness, glossary, then the Guide');
      a.ok(ids.length <= 10, 'no more than 10 steps (US-2.6.3)');
      ids.forEach(function (id) {
        var s = TAP.content.text('tour.' + id, { app: 'X' });
        var n = (s.match(/[.?!](\s|$)/g) || []).length;
        a.ok(n >= 1 && n <= (id === 'purpose' ? 1 : 2), id + ': ' + n + ' sentence(s)');
      });
    });

    T.test('TPV-TC-235', 'The last step points to the Guide page, with a button that opens it', function (a) {
      withTour(function () {
        TAP.tour.start();
        for (var i = 0; i < STEPS.length - 1; i++) press('ArrowRight');
        a.equal(stepNo(), STEPS.length, 'on the last step');
        a.ok(txt(callout()).indexOf(TAP.views.title('guide')) >= 0, 'names the Guide');
        var open = callout().querySelector('.tap-tour__guide');
        a.ok(open, 'an Open the Guide button');
        open.click();
        a.equal(TAP.store.get().view, 'guide', 'it opens the Guide');
        a.ok(!callout(), 'and ends the tour');
      });
    });

    T.test('TPV-TC-236', 'Arrow keys move forward and back, Skip ends it at any step, Esc closes it', function (a) {
      withTour(function () {
        TAP.tour.start();
        a.equal(stepNo(), 1, 'starts at step 1');
        a.ok(txt(callout()).indexOf(TAP.content.text('tourUi.step', { n: 1, total: STEPS.length })) >= 0, '"Step 1 of ' + STEPS.length + '"');
        press('ArrowRight');
        press('ArrowRight');
        a.equal(stepNo(), 3, 'right arrow moves forward');
        press('ArrowLeft');
        a.equal(stepNo(), 2, 'left arrow moves back');
        callout().querySelector('.tap-tour__skip').click();
        a.ok(!callout() && !document.querySelector('.tap-tour'), 'Skip ends it');
        TAP.tour.start();
        press('ArrowLeft');
        a.equal(stepNo(), 1, 'no step before the first');
        var e = press('Escape');
        a.ok(!callout(), 'Esc closes it');
        a.ok(e.defaultPrevented, 'and uses the key, so nothing underneath also closes');
      });
    });

    T.test('TPV-TC-236', 'Esc closes the tour before an open side panel', function (a) {
      withTour(function () {
        TAP.layers.open('test', { title: 'Side panel', render: function () {} });
        TAP.tour.start();
        press('Escape');
        a.ok(!callout(), 'the tour closed');
        a.equal(TAP.layers.top(), null, 'starting the tour closed the side panel first');
      });
    });

    T.test('TPV-TC-236', 'Next walks every step and Finish ends the tour', function (a) {
      withTour(function () {
        TAP.tour.start();
        for (var i = 1; i < STEPS.length; i++) callout().querySelector('.tap-tour__next').click();
        var next = callout().querySelector('.tap-tour__next');
        a.equal(txt(next), TAP.content.text('tourUi.finish'), 'the last Next reads Finish');
        next.click();
        a.ok(!callout(), 'Finish ends it');
      });
    });

    T.test('TPV-TC-237', 'Once skipped, the card is not offered again, and "Take the tour" still replays it', function (a) {
      withTour(function () {
        TAP.tour.offer();
        welcome().querySelector('.tap-tour__skipcard').click();
        a.ok(!welcome(), 'Skip closes the card');
        a.equal(TAP.tour.offer(), false, 'not offered on the next opening');
        a.ok(!welcome(), 'no card');
        TAP.tour.start();
        a.equal(stepNo(), 1, 'the tour still replays');
      });
    });

    T.test('TPV-TC-237', 'Once completed, the card is not offered again', function (a) {
      withTour(function () {
        TAP.tour.offer();
        welcome().querySelector('.tap-tour__take').click();
        a.ok(!welcome() && stepNo() === 1, 'the card leads into the tour');
        press('Escape');
        a.equal(TAP.tour.offer(), false, 'not offered again');
      });
    });

    T.test('TPV-TC-237', 'A "Take the tour" button in the top bar replays the tour', function (a) {
      withTour(function () {
        withApp(function (root) {
          TAP.storage.set('tour:done', true);
          TAP.tour.offer();
          var btn = root.querySelector('.tap-topbar__actions .tap-tour__button');
          a.ok(btn, 'the button is in the top bar');
          a.equal(txt(btn), TAP.content.text('tourUi.button'), 'labelled from the content file');
          TAP.tour.offer();
          a.equal(root.querySelectorAll('.tap-tour__button').length, 1, 'added once only');
          btn.click();
          a.equal(stepNo(), 1, 'the tour starts');
        });
      });
    });

    T.test('TPV-TC-238', 'The tour is never offered while a chart is expanded or the page is full screen', function (a) {
      withTour(function () {
        TAP.store.set({ expanded: 'ov-ambition' });
        a.equal(TAP.tour.offer(), false, 'not offered with a chart expanded');
        a.ok(!welcome() && !callout(), 'nothing shown');
        TAP.store.set({ expanded: null });
        TAP.tour.fullscreen = function () { return true; };
        a.equal(TAP.tour.offer(), false, 'not offered in full screen');
        a.ok(!welcome(), 'nothing shown');
        TAP.tour.fullscreen = function () { return false; };
        a.equal(TAP.tour.offer(), true, 'offered once neither applies');
      });
    });

    T.test('TPV-TC-239', 'Changed step wording in the content file is what the tour shows', function (a) {
      var text = window.TAP_CONTENT.text.tour, old = text.menu;
      text.menu = 'The menu moves between the views; this sentence came from the content file.';
      try {
        withTour(function () {
          TAP.tour.start();
          press('ArrowRight');
          a.ok(txt(callout()).indexOf(text.menu) >= 0, 'new wording shown');
        });
      } finally { text.menu = old; }
    });

    T.test('X-pages-tour-target', 'A step highlights its part of the screen, and still shows when the part is missing', function (a) {
      withTour(function () {
        withApp(function () {
          TAP.tour.start();
          press('ArrowRight');
          a.ok(document.querySelector('.tap-tour__hole'), 'the menu is spotlit');
          a.equal(document.activeElement && document.activeElement.className.indexOf('tap-tour__next') >= 0, true, 'focus is on Next');
        });
        var menus = qsa('[data-tour="menu"]');
        menus.forEach(function (m) { m.style.display = 'none'; });
        try {
          TAP.tour.start();
          press('ArrowRight');
          a.ok(callout(), 'with the menu not on screen the step still shows');
          a.ok(!document.querySelector('.tap-tour__hole'), 'without a spotlight');
        } finally { menus.forEach(function (m) { m.style.display = ''; }); }
      });
    });

    T.test('X-pages-tour-priority', 'The glossary step spotlights a marked term on the view before the Guide menu item', function (a) {
      withTour(function () {
        withApp(function () {
          var term = TAP.dom.el('button', { type: 'button', class: 'tap-term', 'data-term': 'arr' }, 'ARR');
          TAP.shell.viewEl().insertBefore(term, TAP.shell.viewEl().firstChild);
          TAP.tour.start();
          for (var i = 0; i < STEPS.indexOf('glossary'); i++) press('ArrowRight');
          a.equal(stepNo(), STEPS.indexOf('glossary') + 1, 'on the glossary step');
          var hole = document.querySelector('.tap-tour__hole').getBoundingClientRect(), r = term.getBoundingClientRect();
          a.ok(Math.abs(hole.left - (r.left - 6)) < 2 && Math.abs(hole.width - (r.width + 12)) < 2, 'the spotlight is round the term');
        });
      });
    });

    /* ---------- review fix #377 (SV-11, SV-12): the tour against popovers, scrolling and view changes ---------- */

    T.test('X-review-SV-12', 'With a popover open during the tour, one Esc closes the popover only', function (a) {
      withTour(function () {
        withApp(function () {
          TAP.tour.start();
          press('ArrowRight');
          var term = TAP.dom.el('button', { type: 'button', class: 'tap-term', 'data-term': 'arr' }, 'ARR');
          document.body.appendChild(term);
          try {
            TAP.glossary.popover('arr', term);
            press('Escape');
            a.equal(document.querySelector('.tap-popover'), null, 'the popover closed');
            a.ok(callout(), 'the tour is still on');
            press('Escape');
            a.ok(!callout(), 'the next Esc ends the tour');
          } finally { term.remove(); TAP.glossary.close(); }
        });
      });
    });

    T.test('X-review-SV-12', 'The tour ends when the view changes under it (the back button)', function (a) {
      withTour(function () {
        withApp(function () {
          TAP.tour.start();
          press('ArrowRight');
          a.ok(callout(), 'the tour is on');
          TAP.store.set({ view: 'industry' });
          a.ok(!callout() && !document.querySelector('.tap-tour'), 'the tour ended with the view change');
        });
      });
    });

    T.test('X-review-SV-12', 'The spotlight follows its part of the screen when the page scrolls', function (a) {
      var spacer = TAP.dom.el('div', { style: 'height:3000px' });
      document.body.appendChild(spacer);
      var y = window.pageYOffset;
      try {
        withTour(function () {
          withApp(function () {
            TAP.tour.start();
            press('ArrowRight');   // the menu step
            var menu = qsa('[data-tour="menu"]').filter(function (m) { return m.getBoundingClientRect().width > 0; })[0];
            window.scrollBy(0, 40);
            window.dispatchEvent(new Event('scroll'));
            var hole = document.querySelector('.tap-tour__hole').getBoundingClientRect(), r = menu.getBoundingClientRect();
            a.ok(Math.abs(hole.top - (r.top - 6)) < 2, 'the spotlight moved with the page (' + Math.round(hole.top) + ' against ' + Math.round(r.top - 6) + ')');
          });
        });
      } finally { spacer.remove(); window.scrollTo(0, y); }
    });

    // Review fix #379 (SV-15): an industry name is put into the explanation title as it is, never read as a pattern
    T.test('X-review-SV-15', 'An industry name with $ patterns shows as written in the explanation title', function (a) {
      var p = T_FIXTURE('mini');
      p.lookups.industries[0].name = 'Oil $& Gas $$ $\' $`';
      a.ok(TAP.data.load(p).ok, 'the renamed data loads');
      TAP.store.set({ industry: p.lookups.industries[0].id });
      withExplain('ind-ratings', function (layer) {
        a.equal(txt(layer.querySelector('.tap-explain__report')), 'How do regions rate Oil $& Gas $$ $\' $`?', 'the title holds the name as written');
      });
    });

    T.test('X-pages-insights-engine', 'Without the insight engine the page shows a plain message', function (a) {
      var old = TAP.insights, root = T.dom.mount();
      TAP.insights = { __stub: 44, ranked: function () { throw new Error('Not built yet (#44): TAP.insights.ranked'); } };
      try {
        var h = TAP.views.get('insights').mount(root);
        a.ok(txt(root).indexOf('Not built yet') >= 0, 'says it is not built yet');
        h.destroy();
      } finally { TAP.insights = old; }
    });

    /* ---------- review fix #380: long names without spaces (SV-L) ---------- */

    // A name of about 100 characters with no space in it, as an unformatted workbook cell can hold.
    var LONG = new Array(6).join('Supercalifragilistic') + 'Name';
    function longNames() {
      var p = T_FIXTURE('mini');
      p.regions[0].name = 'Region' + LONG;
      p.lookups.industries[0].name = 'Industry' + LONG;
      p.regions.forEach(function (r) { (r.partners || []).forEach(function (x) { x.name = 'Partner' + LONG; }); });
      return p;
    }

    // Inside a box that scrolls or clips on its own (a list's body), so it can't push the page sideways.
    function clipped(n) {
      for (var p = n.parentElement; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowX !== 'visible') return true;
      }
      return false;
    }

    // The shell and each view are mounted directly, not through the app, so the test never writes to the address bar
    // (Chrome throttles frequent address changes, which would starve later routing tests of their hashchange).
    T.test('X-review-SV-L', 'Long names without spaces: no view scrolls sideways at 1280, 1024 and 853 px', function (a) {
      var root = T.dom.mount(), found = [];
      a.ok(TAP.data.load(longNames()).ok, 'the data with long names loads');
      TAP.shell.mount(root, { warnings: [] });
      try {
        [1280, 1024, 853].forEach(function (w) {
          root.style.width = w + 'px';
          [['overview'], ['industry'], ['newBusiness'], ['customers'], ['partners'], ['regions', 'alpha']].forEach(function (v) {
            TAP.store.set({ view: v[0], region: v[1] || null, industry: v[0] === 'industry' ? 'ind1' : null });
            var area = TAP.shell.viewEl(), handle = TAP.views.get(v[0]).mount(area);
            try {
              window.dispatchEvent(new Event('resize'));
              var box = root.getBoundingClientRect();
              var wide = qsa('*', root).filter(function (n) {
                var r = n.getBoundingClientRect();
                return r.width > 0 && r.right > box.right + 1 && !n.closest('canvas, svg') && !clipped(n);
              }).map(function (n) { return n.tagName.toLowerCase() + '.' + String(n.className).split(' ')[0]; });
              if (root.scrollWidth > root.clientWidth + 1 || wide.length) {
                found.push(w + ' px ' + v.join('/') + ': ' + root.scrollWidth + ' wide; ' + wide.slice(0, 6).join(' '));
              }
            } finally { handle.destroy(); TAP.dom.clear(area); }
          });
        });
        a.deepEqual(found, [], 'no sideways scroll, and nothing runs past the right edge');
      } finally {
        TAP.dom.clear(root);
        TAP.data.load(T_FIXTURE('mini'));
      }
    });
  });
})(window.TAP);
