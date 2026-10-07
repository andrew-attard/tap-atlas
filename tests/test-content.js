/*
 * File: tests/test-content.js
 * Purpose: Tests for the glossary, term marking, guide text and organization layer.
 * Provides: test cases for CONTENT stories (#38, #39, #40, #42, #60): TPV-TC-178, 179, 181 to 184, 188 to 190, 192, 215,
 *           X-content-*, X-d98-no-glossary-list (TPV-TC-180, the list search, was retired by D98)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  // Every string under an object, with its key path, so shipped wording can be scanned.
  function strings(obj, path, out) {
    out = out || [];
    if (typeof obj === 'string') out.push({ path: path, text: obj });
    else if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(function (k) { strings(obj[k], path ? path + '.' + k : k, out); });
    }
    return out;
  }

  // The wording people read: report titles, explanations and labels, view titles, all on-screen text, the guide,
  // and the insight rule templates (none until the insight rules land in Wave 2; they are scanned already).
  function shippedText() {
    var out = [], reports = window.TAP_REPORTS || {}, views = window.TAP_VIEWS || {};
    Object.keys(reports).forEach(function (id) {
      var d = reports[id];
      out.push({ path: id + '.title', text: d.title });
      strings(d.explain, id + '.explain', out);
      (d.measures || []).forEach(function (m) { out.push({ path: id + '.measure ' + m.id, text: m.label }); });
    });
    (views.order || []).forEach(function (v) { if (views[v]) out.push({ path: 'view ' + v, text: views[v].title }); });
    strings((window.TAP_CONTENT || {}).text, 'text', out);
    strings((window.TAP_CONTENT || {}).guide, 'guide', out);
    ((window.TAP_RULES || {}).rules || []).forEach(function (r) {
      out.push({ path: 'rule ' + r.id + '.template', text: r.template || '' });
      out.push({ path: 'rule ' + r.id + '.description', text: r.description || '' });
    });
    return out;
  }

  // Terms the story names, as glossary ids (US-1.6.3).
  var REQUIRED = ['arr', 'pipeline', 'pipelineCreated', 'orderIntake', 'services', 'newBusiness', 'customerGrowth',
    'hitRate', 'avgDealSize', 'arrPotential', 'servicesRatio', 'tier', 'groupPriority', 'segment', 'segStrategic',
    'segGrowth', 'segCore', 'segScaled', 'channel', 'direct', 'partner', 'alliance', 'subVertical', 'attractiveness',
    'ability', 'accountRisk', 'weightedAverage', 'cro', 'revops', 'tap', 'kAndM'];

  // Business words that must always resolve to an entry wherever they appear in shipped text.
  var WATCH = ['ARR', 'pipeline', 'order intake', 'new business', 'customer growth', 'hit rate', 'deal size',
    'services ratio', 'tier', 'group priority', 'segment', 'channel', 'sub-vertical', 'attractiveness',
    'ability to win', 'account risk', 'weighted average', 'growth potential', 'criticality', 'competitive intensity',
    'references', 'expertise', 'product fit', 'rating', 'score', 'system figure', 'leader input', 'plan year',
    'not provided', 'organization total', 'target accounts', 'commentary', 'insight', 'product line'];

  T.suite('glossary', function () {
    T.test('TPV-TC-179', 'Every glossary entry has a term, a plain definition, why it matters and related terms', function (a) {
      var g = (window.TAP_CONTENT || {}).glossary || {};
      var ids = Object.keys(g);
      a.ok(ids.length >= REQUIRED.length, 'the glossary is filled in (' + ids.length + ' entries)');
      ids.forEach(function (id) {
        var e = g[id];
        a.ok(typeof e.term === 'string' && e.term.length > 0, id + ': term');
        a.ok(Array.isArray(e.aliases), id + ': aliases is a list');
        a.ok(typeof e.short === 'string' && e.short.length > 20, id + ': plain definition');
        a.ok(typeof e.why === 'string' && e.why.length > 20, id + ': why it matters');
        a.ok(Array.isArray(e.related) && e.related.length > 0, id + ': related terms');
        (e.related || []).forEach(function (r) { a.ok(g[r], id + ': related term "' + r + '" exists'); });
      });
    });

    T.test('TPV-TC-179', 'Every term the story names is in the general glossary', function (a) {
      var g = (window.TAP_CONTENT || {}).glossary || {};
      var missing = REQUIRED.filter(function (id) { return !g[id]; });
      a.deepEqual(missing, [], 'required terms without an entry');
      ['ARR', 'pipeline', 'hit rate', 'CRO', 'RevOps', 'TAP', 'k', 'M', 'sub-vertical', 'Tier 1'].forEach(function (w) {
        a.ok(TAP.content.term(w), '"' + w + '" finds its entry');
      });
    });

    T.test('X-content-glossary-unique', 'No word belongs to two glossary entries', function (a) {
      var g = (window.TAP_CONTENT || {}).glossary || {}, owner = {}, clashes = [];
      Object.keys(g).forEach(function (id) {
        [g[id].term].concat(g[id].aliases || []).forEach(function (w) {
          var k = String(w).toLowerCase();
          if (owner[k] && owner[k] !== id) clashes.push(k + ' (' + owner[k] + ', ' + id + ')');
          owner[k] = id;
        });
      });
      a.ok(Object.keys(owner).length > 0, 'the glossary has words');
      a.deepEqual(clashes, [], 'words claimed twice');
    });

    T.test('X-content-glossary-style', 'Glossary wording keeps to the house style: no em dashes, no placeholders', function (a) {
      var list = strings((window.TAP_CONTENT || {}).glossary || {}, 'glossary');
      a.ok(list.length > 0, 'glossary text found');
      list.forEach(function (s) {
        a.ok(s.text.indexOf('—') < 0, s.path + ' has no em dash');
        a.ok(!/TODO|TBD|\{\w+\}/.test(s.text), s.path + ' has no placeholder');
      });
    });

    T.test('TPV-TC-181', 'Every measure label in the shipped reports has a glossary entry', function (a) {
      var reports = window.TAP_REPORTS || {}, n = 0;
      Object.keys(reports).forEach(function (id) {
        (reports[id].measures || []).forEach(function (m) {
          n++;
          a.ok(TAP.content.term(m.label), id + ': "' + m.label + '" has an entry');
        });
      });
      a.ok(n > 0, 'labels were scanned');
    });

    T.test('TPV-TC-181', 'Every acronym in labels, explanations and on-screen text has a glossary entry', function (a) {
      var list = shippedText();
      a.ok(list.length > 10, 'shipped text was found');
      list.forEach(function (s) {
        (s.text.match(/\b[A-Z]{2,}\b/g) || []).forEach(function (w) {
          a.ok(TAP.content.term(w), s.path + ': "' + w + '" has an entry');
        });
      });
    });

    T.test('TPV-TC-181', 'Business terms found in labels and explanations always have a glossary entry', function (a) {
      var list = shippedText(), found = 0;
      WATCH.forEach(function (w) {
        var re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b', 'i');
        var hit = list.filter(function (s) { return re.test(s.text); })[0];
        if (!hit) return;
        found++;
        a.ok(TAP.content.term(w), '"' + w + '" (used in ' + hit.path + ') has an entry');
      });
      a.ok(found > 5, 'business terms were found in the shipped text');
      // Insight templates arrive with the insight rules in Wave 2. shippedText() already scans TAP_RULES,
      // so they are covered here as soon as they exist.
    });
  });
  // Runs fn with a temporary organization layer, then puts the old one back.
  function withOrg(org, fn) {
    var saved = window.TAP_ORG;
    window.TAP_ORG = org;
    try { return fn(); } finally { window.TAP_ORG = saved; }
  }

  // The term ids marked in a piece of HTML, in order.
  function markedIds(html) {
    var box = document.createElement('div');
    TAP.dom.html(box, html);
    return Array.prototype.map.call(box.querySelectorAll('button.tap-term'), function (b) { return b.getAttribute('data-term'); });
  }

  function closePopover() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }

  T.suite('term marking', function () {
    T.test('TPV-TC-183', 'Only the first use of a term in a panel is marked, across every text in that panel', function (a) {
      var seen = {};
      var title = TAP.content.mark('Hit rate by region: hit rate again', seen);
      a.deepEqual(markedIds(title), ['hitRate'], 'second use in the same text is plain');
      var explain = TAP.content.mark('A higher hit rate means more ARR.', seen);
      a.deepEqual(markedIds(explain), ['arr'], 'already marked in the title, so not marked again');
      a.deepEqual(markedIds(TAP.content.mark('Hit rate', {})), ['hitRate'], 'a new panel marks it again');
    });

    T.test('X-content-mark-html', 'Marked text is safe HTML with a button per term', function (a) {
      var html = TAP.content.mark('<img src=x onerror=alert(1)> & ARR "quoted"', {});
      a.ok(html.indexOf('<img') < 0, 'markup in the text is escaped');
      a.ok(html.indexOf('&amp; ') >= 0 && html.indexOf('&quot;quoted&quot;') >= 0, 'special characters escaped');
      a.match(html, /<button type="button" class="tap-term" data-term="arr">ARR<\/button>/);
      a.equal(TAP.content.mark('', {}), '');
      a.equal(TAP.content.mark(null, {}), '');
    });

    T.test('X-content-mark-words', 'Terms match whole words, any case, aliases and a plural "s"', function (a) {
      a.deepEqual(markedIds(TAP.content.mark('Two tiers and three sub-verticals', {})), ['tier', 'subVertical'], 'plurals');
      a.deepEqual(markedIds(TAP.content.mark('the WIN RATE', {})), ['hitRate'], 'alias in capitals');
      a.deepEqual(markedIds(TAP.content.mark('A tiered list of pipelines created', {})), ['pipeline'], 'no match inside a longer word');
      a.deepEqual(markedIds(TAP.content.mark('Pipeline created last year', {})), ['pipelineCreated'], 'the longest term wins');
      a.deepEqual(markedIds(TAP.content.mark('Tier 1 and Tier 10', {})), ['groupPriority', 'tier'], 'Tier 10 is not Tier 1');
    });

    T.test('X-content-mark-acronyms', 'Acronyms match only in capitals, and single letters are never marked', function (a) {
      a.deepEqual(markedIds(TAP.content.mark('Tap a term to read it', {})), [], '"tap" the verb is not TAP');
      a.deepEqual(markedIds(TAP.content.mark('The TAP and the CRO', {})), ['tap', 'cro']);
      a.deepEqual(markedIds(TAP.content.mark('1.2M or 250 k, m', {})), [], 'k and M stay plain');
    });

    T.test('TPV-TC-184', 'Organization terms are marked the same way, and win over general ones', function (a) {
      withOrg({ glossary: {
        orgLine: { term: 'Widget Suite', aliases: ['WS'], short: 'An invented product line.', why: 'Example.', related: [] },
        orgRate: { term: 'Close ratio', aliases: ['win rate'], short: 'Org wording for hit rate.', why: 'Example.', related: [] }
      } }, function () {
        a.deepEqual(markedIds(TAP.content.mark('Selling Widget Suites via WS', {})), ['orgLine'], 'organization term and plural');
        a.deepEqual(markedIds(TAP.content.mark('win rate', {})), ['orgRate'], 'organization alias wins');
        a.equal(TAP.content.term('win rate').id, 'orgRate');
      });
    });

    T.test('X-content-mark-regex', 'Terms with regex characters are matched literally', function (a) {
      withOrg({ glossary: {
        rd: { term: 'R&D (lab)', aliases: ['C++ team', 'a.b'], short: 'An invented term with symbols.', why: 'Example.', related: [] }
      } }, function () {
        a.deepEqual(markedIds(TAP.content.mark('Ask the C++ team', {})), ['rd'], 'plus signs');
        a.deepEqual(markedIds(TAP.content.mark('axb is not a.b', {})), ['rd'], 'a dot is a dot');
        a.equal(markedIds(TAP.content.mark('axb', {})).length, 0);
      });
    });
  });

  T.suite('term popover', function () {
    T.test('TPV-TC-182', 'Clicking a marked term shows its definition and why it matters; Esc closes it', function (a) {
      var box = T.dom.mount();
      TAP.dom.html(box, TAP.content.mark('Hit rate', {}));
      var btn = box.querySelector('.tap-term');
      btn.click();
      var pop = document.querySelector('.tap-popover');
      a.ok(pop, 'popover open');
      a.ok(pop.textContent.indexOf(TAP.content.term('hitRate').short) >= 0, 'shows the definition');
      a.ok(pop.textContent.indexOf(TAP.content.term('hitRate').why) >= 0, 'shows why it matters');
      a.equal(btn.getAttribute('aria-expanded'), 'true');
      closePopover();
      a.equal(document.querySelector('.tap-popover'), null, 'Esc closes it');
      a.equal(btn.getAttribute('aria-expanded'), 'false');
    });

    T.test('TPV-TC-182', 'Hovering also shows the popover, and opening another term replaces it', function (a) {
      var box = T.dom.mount();
      TAP.dom.html(box, TAP.content.mark('ARR and pipeline', {}));
      var btns = box.querySelectorAll('.tap-term');
      btns[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      a.ok(document.querySelector('.tap-popover'), 'hover opens');
      TAP.glossary.popover('pipeline', btns[1]);
      a.equal(document.querySelectorAll('.tap-popover').length, 1, 'one popover at a time');
      a.ok(document.querySelector('.tap-popover').textContent.indexOf('Pipeline') >= 0);
      closePopover();
    });

    T.test('X-content-popover-unknown', 'An unknown term id opens nothing and does not throw', function (a) {
      var box = T.dom.mount();
      a.equal(TAP.glossary.popover('noSuchTerm', box), null);
      a.equal(document.querySelector('.tap-popover'), null);
    });

    /* ---------- review fix #377 (SV-11): the popover never outlives its view, and follows the Esc contract ---------- */

    T.test('X-review-SV-11', 'A pinned popover closes when the view changes', function (a) {
      var box = T.dom.mount();
      TAP.dom.html(box, TAP.content.mark('Hit rate', {}));
      box.querySelector('.tap-term').click();
      a.ok(document.querySelector('.tap-popover'), 'pinned open');
      TAP.store.set({ view: 'industry' });
      a.equal(document.querySelector('.tap-popover'), null, 'gone after the view change');
    });

    T.test('X-review-SV-11', 'A popover whose term has left the page closes at the next change', function (a) {
      var box = T.dom.mount();
      TAP.dom.html(box, TAP.content.mark('Hit rate', {}));
      box.querySelector('.tap-term').click();
      TAP.dom.clear(box);   // the panel holding the term was redrawn
      TAP.store.set({ expanded: 'ov-ambition' });
      a.equal(document.querySelector('.tap-popover'), null, 'closed');
    });

    T.test('X-review-SV-11', 'The popover handles Esc with preventDefault, so nothing else acts on the same Esc', function (a) {
      var box = T.dom.mount();
      TAP.dom.html(box, TAP.content.mark('Hit rate', {}));
      box.querySelector('.tap-term').click();
      var e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      document.dispatchEvent(e);
      a.equal(document.querySelector('.tap-popover'), null, 'closed');
      a.ok(e.defaultPrevented, 'the Esc is marked as handled');
    });
  });

  // D98: no A to Z glossary list; definitions stay where the terms appear (amends US-1.6.3 and US-1.6.4)
  T.suite('no glossary list', function () {
    T.test('X-d98-no-glossary-list', 'The Guide has no glossary section, there is no glossary side panel, and the popover has no link', function (a) {
      var root = T.dom.mount(), h = TAP.views.get('guide').mount(root);
      try {
        a.equal(root.querySelector('[data-guide="glossary"]'), null, 'no glossary section on the Guide');
        a.equal(root.querySelector('.tap-gloss'), null, 'no glossary list on the Guide');
        a.deepEqual((TAP.content.guide().contents || []).map(function (c) { return c.id; }).filter(function (id) { return id === 'glossary'; }), [],
          'no glossary entry in the contents');
      } finally { h.destroy(); }
      a.equal(typeof TAP.glossary.render, 'undefined', 'TAP.glossary has no list to draw');
      TAP.layers.open('glossary', { termId: 'arr' });
      try {
        var layer = document.querySelector('.tap-layer[data-layer="glossary"]');
        a.equal(layer && layer.querySelector('.tap-gloss'), null, 'no glossary list in a side panel');
        a.equal(layer ? layer.querySelector('.tap-layer__body').textContent.trim() : '', '', 'TAP.layers has no glossary panel to draw');
      } finally { TAP.layers.close(); }
      var box = T.dom.mount();
      TAP.dom.html(box, TAP.content.mark('Pipeline', {}));
      box.querySelector('.tap-term').click();
      var pop = document.querySelector('.tap-popover'), e = TAP.content.term('pipeline');
      try {
        a.ok(pop, 'the popover still opens');
        a.ok(pop.textContent.indexOf(e.short) >= 0, 'with the short definition');
        a.ok(pop.textContent.indexOf(e.why) >= 0, 'and why it matters');
        a.equal(pop.querySelector('[data-glossary-link], .tap-popover__link'), null, 'and no link to a full entry');
      } finally { closePopover(); }
    });
  });
  var HOW_TO = ['menu', 'compare', 'panels', 'chartTypes', 'table', 'sources', 'insights'];
  var PLANNING = ['what', 'operational', 'template', 'marketCoverage', 'newBusiness', 'customerGrowth', 'partners',
    'tiers', 'ratings', 'scores', 'segments', 'channels', 'dataKinds'];
  var TEMPLATE_SECTIONS = ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners'];

  function ids(list) { return (list || []).map(function (x) { return x.id; }); }
  function sentences(p) { return p.split(/[.!?]+(?=\s|$)/).filter(function (x) { return x.trim(); }).length; }

  T.suite('guide', function () {
    T.test('X-content-guide-contents', 'The Guide has a contents list of its two sections', function (a) {
      var g = TAP.content.guide();
      a.deepEqual(ids(g.contents), ['howTo', 'planning'], 'no glossary section (D98)');
      (g.contents || []).forEach(function (c) { a.ok(c.title && c.title.length > 3, c.id + ' has a title'); });
    });

    T.test('X-content-guide-howto', 'How to use this app covers the menu, comparison bar, panels, chart types, table, sources and insights', function (a) {
      var h = TAP.content.guide().howTo || {};
      a.ok(h.title && h.intro, 'title and intro');
      var have = ids(h.sections);
      a.deepEqual(HOW_TO.filter(function (id) { return have.indexOf(id) < 0; }), [], 'topics missing');
    });

    T.test('X-content-guide-planning', 'Planning explained covers every topic the story lists', function (a) {
      var p = TAP.content.guide().planning || {};
      a.ok(p.title, 'title');
      var have = ids(p.sections);
      a.deepEqual(PLANNING.filter(function (id) { return have.indexOf(id) < 0; }), [], 'topics missing');
    });

    T.test('X-content-guide-links', 'Every template section links to a view that exists; links are null or {view}', function (a) {
      var p = TAP.content.guide().planning || {}, views = window.TAP_VIEWS || {}, order = views.order || [];
      (p.sections || []).forEach(function (s) {
        // A view defined in config/views.js but not in the menu yet (Outlook while it is built) draws no link
        var known = s.link && (order.indexOf(s.link.view) >= 0 || (views[s.link.view] && TAP.views.get(s.link.view)));
        a.ok(s.link === null || known, s.id + ': link is null or an existing view');
        if (TEMPLATE_SECTIONS.indexOf(s.id) >= 0) a.ok(s.link && s.link.view, s.id + ' links to its view');
      });
      a.ok((p.sections || []).length > 0, 'sections found');
    });

    T.test('X-content-guide-style', 'Guide paragraphs are short: one to three sentences, no em dashes', function (a) {
      var g = TAP.content.guide(), n = 0;
      [g.howTo, g.planning].forEach(function (part) {
        ((part || {}).sections || []).forEach(function (s) {
          a.ok(s.title && Array.isArray(s.paragraphs) && s.paragraphs.length > 0, s.id + ' has a title and paragraphs');
          (s.paragraphs || []).forEach(function (p, i) {
            n++;
            var k = sentences(p);
            a.ok(k >= 1 && k <= 3, s.id + ' paragraph ' + (i + 1) + ' has ' + k + ' sentences');
            a.ok(p.indexOf('—') < 0, s.id + ' paragraph ' + (i + 1) + ' has no em dash');
          });
        });
      });
      a.ok(n > 20, 'paragraphs found (' + n + ')');
    });

    /* ---------- review polish #382: Guide, glossary and wording brought up to date ---------- */

    function guidePart(group, id) {
      return window.TAP_CONTENT.guide[group].sections.filter(function (x) { return x.id === id; })[0].paragraphs.join(' ');
    }

    T.test('X-review-SV-17', 'The Guide names every view in the menu, the extra sections and the P key, and its tier line agrees with Tier 1', function (a) {
      var menu = guidePart('howTo', 'menu');
      window.TAP_VIEWS.order.forEach(function (id) {
        var title = window.TAP_VIEWS[id].title;
        a.ok(menu.indexOf(id === 'guide' ? 'this Guide' : title) >= 0, 'the menu paragraph names ' + title);
      });
      a.match(guidePart('planning', 'template'), /Other sections/, 'the template part says where extra sections are shown');
      a.match(guidePart('howTo', 'keys'), /\bP\b/, 'the shortcuts name P for presentation mode');
      a.ok(guidePart('planning', 'tiers').indexOf('from Tier 1 to Tier 3') < 0, 'no "Tier 1 to Tier 3" when Tier 1 is set centrally');
    });

    T.test('X-review-SV-18', 'Glossary entries describe without judging, and carry no project notes (D20)', function (a) {
      var g = window.TAP_CONTENT.glossary;
      a.ok(g.ambition.short.indexOf('new business a region plans to win') < 0, 'ambition is not defined by one of its own parts');
      a.ok(g.partnerMaturity.why.indexOf('not confirmed') < 0, 'partner maturity has no project note');
      var judging = [/worth pursuing/i, /deprioriti/i, /realistic/i];
      ['quadrant', 'attractiveness', 'segGrowth'].forEach(function (id) {
        var text = g[id].short + ' ' + g[id].why;
        judging.forEach(function (re) { a.ok(!re.test(text), id + ' avoids ' + re); });
      });
    });

    T.test('X-review-SV-20', 'Wording keys nothing reads are removed', function (a) {
      var tx = window.TAP_CONTENT.text;
      a.ok(!('subtitle' in tx.app), 'app.subtitle');
      a.ok(!('shareLabel' in tx.overview.cards), 'overview.cards.shareLabel');
      a.ok(!('cardTitle' in tx.overview.source), 'overview.source.cardTitle');
    });
  });
  // Runs fn as if content/organization.js had thrown a script error while loading.
  function withOrgScriptError(org, message, fn) {
    var watch = TAP.orgWatch;
    watch.onError({ filename: 'file:///C:/plans/app/content/organization.js', message: message, lineno: 7 });
    try { return withOrg(org, fn); } finally { watch.errors.length = 0; }
  }

  T.suite('organization layer', function () {
    T.test('TPV-TC-188', 'A term defined in both layers uses the organization version, everywhere', function (a) {
      withOrg({ glossary: { hitRate: { term: 'Hit rate', aliases: ['win rate'], short: 'Organization definition of hit rate.', why: 'Org reason.', related: [] } } }, function () {
        a.equal(TAP.content.term('hit rate').short, 'Organization definition of hit rate.');
        a.equal(TAP.content.terms().hitRate.layer, 'organization');
        a.deepEqual(markedIds(TAP.content.mark('Hit rate', {})), ['hitRate'], 'still marked');
        var box = T.dom.mount();
        TAP.dom.html(box, TAP.content.mark('hit rate', {}));
        box.querySelector('.tap-term').click();
        a.ok(document.querySelector('.tap-popover').textContent.indexOf('Organization definition') >= 0, 'popover shows the organization version');
        closePopover();
      });
    });

    T.test('TPV-TC-189', 'With no organization file, or an empty one, the general layer is used with no error', function (a) {
      [undefined, null, {}].forEach(function (org, i) {
        withOrg(org, function () {
          a.equal(TAP.content.orgError(), null, 'case ' + i + ': no error');
          a.equal(TAP.content.text('banner.sample'), 'Sample data: all figures are fictional', 'case ' + i + ': general wording');
          a.equal(TAP.content.term('ARR').layer, 'general', 'case ' + i + ': general glossary');
          a.equal(TAP.content.setting('internalLabel', 'fallback'), 'fallback', 'case ' + i + ': settings fall back');
        });
      });
    });

    T.test('TPV-TC-190', 'A script error in the organization file is reported clearly, and the general layer is used', function (a) {
      withOrgScriptError({ text: { banner: { sample: 'Half-loaded wording' } } }, 'Uncaught SyntaxError: Unexpected end of input', function () {
        var msg = TAP.content.orgError();
        a.ok(msg, 'reported');
        a.match(msg, /content\/organization\.js/, 'names the file');
        a.match(msg, /Unexpected end of input/, 'says what went wrong');
        a.match(msg, /line 7/, 'says where');
        a.equal(TAP.content.text('banner.sample'), 'Sample data: all figures are fictional', 'half-loaded wording is not used');
      });
      a.equal(TAP.content.orgError(), null, 'cleared afterwards');
    });

    T.test('TPV-TC-190', 'The data sources panel gets the organization message at start-up', function (a) {
      withOrg('not an object', function () {
        var root = T.dom.mount();
        TAP.app.start({ root: root, plan: T_FIXTURE('mini') });
        var notes = TAP.notes.list('organization');
        a.equal(notes.length, 1, 'one note for the data sources panel');
        a.equal(notes[0].message, TAP.content.orgError());
      });
    });

    T.test('TPV-TC-190', 'Parts of the wrong shape are named, and the whole file falls back', function (a) {
      var cases = [
        [{ glossary: [] }, /"glossary"/],
        [{ text: 'Hello' }, /"text"/],
        [{ glossary: { odd: { term: 'Odd' } } }, /"odd"/],
        [{ regions: { north: 42 } }, /"north"/],
        [{ guide: { planning: { sections: {} } } }, /guide\.planning\.sections/],
        [{ guide: { planning: { sections: [{ title: 'No id' }] } } }, /guide\.planning\.sections/],
        [{ glosary: {} }, /"glosary"/]
      ];
      cases.forEach(function (c, i) {
        withOrg(c[0], function () {
          var msg = TAP.content.orgError() || '';
          a.match(msg, c[1], 'case ' + i + ' names the problem');
          a.match(msg, /general wording/, 'case ' + i + ' says what the app does instead');
        });
      });
      withOrg({ glossary: { arr: { term: 'ARR', short: 'Org ARR.' } }, regions: { north: 7 } }, function () {
        a.equal(TAP.content.term('ARR').layer, 'general', 'a file with any problem is not used at all');
      });
    });

    T.test('X-content-org-wording', 'Wording, tour steps and the internal label can be overridden; the rest stays general', function (a) {
      withOrg({ text: { tour: { menu: 'Organization tour step' }, banner: { internal: 'Organization label' } },
        settings: { internalLabel: { show: true, text: 'Organization only' } } }, function () {
        a.equal(TAP.content.orgError(), null, 'a valid file');
        a.equal(TAP.content.text('tour.menu'), 'Organization tour step');
        a.equal(TAP.content.text('banner.internal'), 'Organization label');
        a.equal(TAP.content.text('banner.sample'), 'Sample data: all figures are fictional', 'keys not overridden stay general');
        a.equal(TAP.content.setting('internalLabel').text, 'Organization only');
        a.equal(TAP.content.setting('internalLabel.show'), true);
      });
    });

    T.test('TPV-TC-178', 'The organization layer replaces, extends and adds Guide sections by id', function (a) {
      withOrg({ guide: { planning: { sections: [
        { id: 'what', paragraphs: ['Our own reason for planning.'] },
        { id: 'operational', addParagraphs: ['Our planning cycle starts in spring.'] },
        { id: 'orgCycle', title: 'Our planning calendar', paragraphs: ['Plans are reviewed in a joint session.'], after: 'operational' }
      ] } } }, function () {
        a.equal(TAP.content.orgError(), null, 'a valid file');
        var secs = TAP.content.guide().planning.sections, ids = secs.map(function (s) { return s.id; });
        var what = secs[ids.indexOf('what')], op = secs[ids.indexOf('operational')];
        a.deepEqual(what.paragraphs, ['Our own reason for planning.'], 'paragraphs replaced');
        a.equal(what.title, TAP_CONTENT.guide.planning.sections[0].title, 'title kept');
        a.equal(op.paragraphs[op.paragraphs.length - 1], 'Our planning cycle starts in spring.', 'paragraph added');
        a.equal(op.paragraphs.length, TAP_CONTENT.guide.planning.sections[1].paragraphs.length + 1);
        a.equal(ids[ids.indexOf('operational') + 1], 'orgCycle', 'new section placed after its anchor');
        a.equal(secs[ids.indexOf('orgCycle')].link, null, 'new section has no view link unless given');
        a.ok(TAP.content.guide().howTo.sections.length >= 7, 'the other part is untouched');
      });
      a.deepEqual(TAP.content.guide().planning.sections[0].paragraphs, TAP_CONTENT.guide.planning.sections[0].paragraphs, 'general text unchanged');
    });

    T.test('TPV-TC-192', 'Short region names come from the organization layer, else from the data', function (a) {
      withOrg({ regions: { alpha: 'A-short' } }, function () {
        a.equal(TAP.content.regionName(TAP.data.region('alpha')), 'A-short');
        a.equal(TAP.content.regionName(TAP.data.region('bravo')), 'Region B');
      });
      a.equal(TAP.content.regionName(TAP.data.region('alpha')), 'Region A');
    });

    T.test('X-content-org-messages', 'Organization messages live in the content files', function (a) {
      ['org.error', 'org.script', 'org.notObject', 'org.badPart', 'org.badList', 'org.badTerm', 'org.badRegion', 'org.unknownPart'].forEach(function (k) {
        a.ok(TAP.content.text(k).charAt(0) !== '[', k + ' is in content');
      });
    });
  });
  // Loads a script file the way a page would, and resolves once it has run.
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var tag = document.createElement('script');
      tag.src = src;
      tag.onload = function () { tag.parentNode.removeChild(tag); resolve(); };
      tag.onerror = function () { tag.parentNode.removeChild(tag); reject(new Error('Could not load ' + src)); };
      document.body.appendChild(tag);
    });
  }

  T.suite('organization starter', function () {
    T.test('TPV-TC-215', 'The starter organization file, placed as-is, loads with no errors and changes nothing', function (a) {
      var saved = window.TAP_ORG, before = Object.keys(TAP.content.terms()).length;
      window.TAP_ORG = undefined;
      return loadScript('content/organization.example.js').then(function () {
        var o = window.TAP_ORG;
        a.ok(o && typeof o === 'object', 'sets TAP_ORG to an object');
        a.equal(TAP.content.orgError(), null, 'no organization error for the data sources panel');
        ['text', 'glossary', 'guide', 'regions', 'settings'].forEach(function (k) {
          a.ok(o[k] && typeof o[k] === 'object', 'has an empty "' + k + '" part ready to fill');
        });
        a.equal(Object.keys(TAP.content.terms()).length, before, 'adds no terms until an example is uncommented');
        a.equal(TAP.content.text('banner.sample'), 'Sample data: all figures are fictional', 'general wording unchanged');
      }).then(function () { window.TAP_ORG = saved; }, function (e) { window.TAP_ORG = saved; throw e; });
    });
  });
})(window.TAP);
