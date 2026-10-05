/*
 * File: tests/test-pages-p2.js
 * Purpose: Tests for Phase 2 glossary, guide, tips, tour and shortcuts.
 * Provides: test cases for the PAGES2 stream: US-2.6.1 (TPV-TC-496 to 498), US-2.6.2 (TPV-TC-500, 501),
 *           US-2.6.3 (TPV-TC-503, 504, 506, 507), X-pages2-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: PAGES2 stream
 */
(function (TAP) {
  'use strict';

  var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  var P2_VIEWS = ['newBusiness', 'customers', 'partners', 'regions'];

  // Every string under an object, with its key path.
  function strings(obj, path, out) {
    out = out || [];
    if (typeof obj === 'string') out.push({ path: path, text: obj });
    else if (obj && typeof obj === 'object') Object.keys(obj).forEach(function (k) { strings(obj[k], path ? path + '.' + k : k, out); });
    return out;
  }
  function sentences(s) { return (String(s).match(/[.?!](\s|$)/g) || []).length; }

  // Reports on the Phase 2 views (and on the profile), as defined so far.
  function p2Reports() {
    var all = window.TAP_REPORTS || {}, prof = ((window.TAP_PROFILE || {}).reports) || [];
    return Object.keys(all).filter(function (id) {
      return P2_VIEWS.indexOf(all[id].view) >= 0 || prof.indexOf(id) >= 0;
    }).map(function (id) { return all[id]; });
  }

  // The wording people read on the Phase 2 screens: report titles, explanations and labels, the Phase 2 wording
  // keys, list headings and the Phase 2 insight templates.
  var P2_TEXT_KEYS = ['nbView', 'nbGrid', 'nbFactors', 'customerView', 'partnerView', 'cgGrowth', 'cgExposure',
    'detailsRows', 'rows', 'breakdown', 'viewTips'];
  var P2_FAMILIES = ['plan', 'shared', 'themes'];
  function p2Text() {
    var out = [], text = (window.TAP_CONTENT || {}).text || {};
    p2Reports().forEach(function (d) {
      out.push({ path: d.id + '.title', text: d.title });
      strings(d.explain, d.id + '.explain', out);
      (d.measures || []).forEach(function (m) { out.push({ path: d.id + '.measure ' + m.id, text: m.label }); });
    });
    P2_TEXT_KEYS.forEach(function (k) { strings(text[k], 'text.' + k, out); });
    ['rc', 'nb', 'cg', 'pt', 'amb'].forEach(function (k) { strings((text.measures || {})[k], 'text.measures.' + k, out); });
    ((window.TAP_RULES || {}).rules || []).filter(function (r) { return P2_FAMILIES.indexOf(r.family) >= 0; }).forEach(function (r) {
      out.push({ path: 'rule ' + r.id + '.template', text: r.template || '' });
      out.push({ path: 'rule ' + r.id + '.description', text: r.description || '' });
    });
    return out;
  }

  // The terms US-2.6.1 names, as words a reader sees on screen.
  var STORY_TERMS = ['Strategic segment', 'Growth segment', 'Core segment', 'Scaled segment', 'risk level', 'multiplier',
    'incremental ARR', 'order intake', 'Direct channel', 'Partner', 'Alliance A', 'Alliance B', 'motion', 'FTE',
    'central support', 'partner maturity', 'expected wins', 'recurring theme', 'concentration'];

  // Phase 2 business words that must resolve to an entry wherever they appear on the Phase 2 screens.
  var WATCH_P2 = ['incremental ARR', 'multiplier', 'motion', 'full-time equivalent', 'FTE', 'central support',
    'maturity', 'recurring theme', 'concentration', 'at-risk share', 'expected wins', 'order intake per head',
    'risk level', 'sub-industry', 'success factors', 'segment', 'alliance', 'partner'];

  // List headings that are everyday words, not business terms. "Risk" alone would mark every use of the word, so
  // the risk column relies on the details panel and the "risk level" entry (the heading's wording is ENGINE2's).
  var PLAIN_HEADINGS = ['region', 'name', 'country', 'market', 'alsoTargeted', 'alsoNamed', 'riskLevel'];

  function withGuide(fn) {
    var root = T.dom.mount(), handle = TAP.views.get('guide').mount(root);
    try { return fn(root); } finally { handle.destroy(); }
  }
  // Mounts a view, runs fn with its root and always destroys it. Tips are shown again afterwards, as on a reload.
  function withView(id, fn) {
    var root = T.dom.mount(), handle = TAP.views.get(id).mount(root);
    try { return fn(root); } finally { if (handle && handle.destroy) handle.destroy(); TAP.viewHead.showTips(); }
  }
  function tipOf(root, id) { return root.querySelector('.tap-vh__tip[data-view="' + id + '"]'); }
  function shows(node) { return !!node && !node.hidden && node.getClientRects().length > 0; }
  function storageKeys() {
    var out = [];
    [window.localStorage, window.sessionStorage].forEach(function (st, i) {
      try { for (var k = 0; k < st.length; k++) out.push(i + ':' + st.key(k)); } catch (e) { /* storage blocked */ }
    });
    return out.sort();
  }

  function howToFor(view) {
    return (TAP.content.guide().howTo.sections || []).filter(function (s) { return s.link && s.link.view === view; })[0];
  }

  T.suite('pages-p2', function () {
    /* ---------- US-2.6.1: glossary and guide cover Phase 2 (#224) ---------- */

    T.test('TPV-TC-496', 'FTE and its spellings on the partner reports find the FTE entry', function (a) {
      ['FTE', 'full-time equivalent', 'full-time equivalents', 'sales FTE', 'consultant FTE'].forEach(function (w) {
        var e = TAP.content.term(w);
        a.ok(e && e.id === 'fte', '"' + w + '" finds the FTE entry');
      });
    });

    T.test('TPV-TC-496', 'Every term the story names has a full glossary entry', function (a) {
      STORY_TERMS.forEach(function (w) {
        var e = TAP.content.term(w);
        a.ok(e, '"' + w + '" has an entry');
        if (!e) return;
        a.ok(e.term && e.short && e.short.length > 20, w + ': term and plain definition');
        a.ok(e.why && e.why.length > 20, w + ': why it matters');
        a.ok(Array.isArray(e.related) && e.related.length > 0, w + ': related terms');
      });
    });

    T.test('TPV-TC-496', 'The new entries keep the house style: no em dashes, related terms that exist', function (a) {
      var g = window.TAP_CONTENT.glossary;
      ['incrementalArr', 'multiplier', 'motion', 'recurringTheme', 'fte', 'oiPerFte', 'centralSupport', 'partnerMaturity',
        'partnerExpertise'].forEach(function (id) {
        a.ok(g[id], id + ' exists');
        strings(g[id], id).forEach(function (s) { a.ok(s.text.indexOf('—') < 0, s.path + ' has no em dash'); });
        ((g[id] || {}).related || []).forEach(function (r) { a.ok(g[r], id + ': related "' + r + '" exists'); });
      });
    });

    T.test('TPV-TC-497', 'Every measure label on the Phase 2 reports is a glossary term or alias', function (a) {
      var n = 0;
      p2Reports().forEach(function (d) {
        (d.measures || []).forEach(function (m) { n++; a.ok(TAP.content.term(m.label), d.id + ': "' + m.label + '" has an entry'); });
      });
      a.ok(n > 5, 'Phase 2 labels were scanned (' + n + ')');
    });

    T.test('TPV-TC-497', 'Every acronym and Phase 2 business word in Phase 2 labels, explanations and templates has an entry', function (a) {
      var list = p2Text(), found = 0;
      a.ok(list.length > 20, 'Phase 2 text was found');
      list.forEach(function (s) {
        (s.text.match(/\b[A-Z]{2,}\b/g) || []).forEach(function (w) { a.ok(TAP.content.term(w), s.path + ': "' + w + '" has an entry'); });
      });
      WATCH_P2.forEach(function (w) {
        var re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b', 'i');
        var hit = list.filter(function (s) { return re.test(s.text); })[0];
        if (!hit) return;
        found++;
        a.ok(TAP.content.term(w), '"' + w + '" (used in ' + hit.path + ') has an entry');
      });
      a.ok(found > 8, 'Phase 2 business words were found (' + found + ')');
    });

    T.test('TPV-TC-497', 'Every business heading of the account, partner and new business lists marks a glossary term', function (a) {
      var n = 0;
      ['newBusiness', 'accounts', 'partners'].forEach(function (src) {
        TAP.rows.columns(src).forEach(function (c) {
          if (PLAIN_HEADINGS.indexOf(c.key) >= 0) return;
          n++;
          a.ok(/data-term=/.test(TAP.content.mark(c.label, {})), src + '.' + c.key + ': "' + c.label + '" marks a term');
        });
      });
      a.ok(n > 20, 'list headings were scanned (' + n + ')');
    });

    T.test('TPV-TC-498', 'The Guide explains each Phase 2 view in two or three sentences, with a link to it', function (a) {
      P2_VIEWS.forEach(function (v) {
        var s = howToFor(v);
        a.ok(s, v + ' has a How to use section');
        if (!s) return;
        var n = sentences(s.paragraphs.join(' '));
        a.ok(n >= 2 && n <= 3, v + ': ' + n + ' sentences');
      });
    });

    T.test('TPV-TC-498', 'The Guide says how to open a region profile', function (a) {
      var s = howToFor('regions'), all = s ? s.paragraphs.join(' ') : '';
      a.ok(all.indexOf(TAP.views.title('regions')) >= 0, 'names the Regions menu entry');
      a.ok(/Open profile/.test(all), 'names the "Open profile" link');
    });

    T.test('TPV-TC-498', 'Each view section on the Guide page opens its view', function (a) {
      withGuide(function (root) {
        P2_VIEWS.forEach(function (v) {
          var s = howToFor(v), btn = s && root.querySelector('[data-guide="howTo"] [data-part="' + s.id + '"] .tap-guide__link');
          a.ok(btn, v + ': an Open button');
          if (!btn) return;
          a.ok(txt(btn).indexOf(TAP.views.title(v)) >= 0, v + ': it names the view');
          btn.click();
          a.equal(TAP.store.get().view, v, v + ': it opens the view');
        });
      });
    });

    T.test('X-pages2-guide-planning', 'Planning sections link to the Phase 2 views and no longer promise a later phase', function (a) {
      var secs = TAP.content.guide().planning.sections, by = {};
      secs.forEach(function (s) { by[s.id] = s; });
      a.equal(by.newBusiness.link.view, 'newBusiness', 'new business');
      a.equal(by.customerGrowth.link.view, 'customers', 'customer growth');
      a.equal(by.partners.link.view, 'partners', 'partners and recap');
      a.equal(by.segments.link.view, 'customers', 'segments');
      strings(TAP.content.guide(), 'guide').forEach(function (s) { a.ok(!/later phase/i.test(s.text), s.path + ' promises nothing for later'); });
      var menu = TAP.content.guide().howTo.sections.filter(function (s) { return s.id === 'menu'; })[0];
      a.ok(/New business, Customer growth, Partners, Regions/.test(menu.paragraphs[0]), 'the menu paragraph lists the new views');
    });

    T.test('X-pages2-explain-ratio', 'Shares combined from parts say so, instead of calling themselves weighted', function (a) {
      var cmp = { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average', second: null, set: [] };
      var paras = TAP.explain.sections('cg-exposure', cmp).filter(function (s) { return s.key === 'combined'; })[0].paras;
      ['cg.top3Share', 'cg.riskShare'].forEach(function (id) {
        var want = TAP.content.text('explain.rateRatio', { measure: TAP.measures.meta(id).label });
        a.ok(paras.indexOf(want) >= 0, id + ' is worked out from the combined totals');
      });
      a.ok(!paras.some(function (p) { return /weighted average/.test(p); }), 'no share is called a weighted average');
      var levers = TAP.explain.sections('nb-levers', cmp).filter(function (s) { return s.key === 'combined'; })[0].paras;
      a.ok(levers.some(function (p) { return /^Hit rate is a weighted average/.test(p); }), 'a weighted rate still says it is weighted');
    });

    /* ---------- US-2.6.2: a "how to read this view" line (#225) ---------- */

    TAP.views.order().forEach(function (id) {
      var title = 'The ' + id + ' view has its tip line in the content files, under its title';
      if (TAP.views.get(id).__stub) { T.skip('TPV-TC-500', title, 'pending: the ' + id + ' view is still a stub'); return; }
      T.test('TPV-TC-500', title, function (a) {
        var text = TAP.content.text('viewTips.' + id);
        a.ok(text && text !== '[viewTips.' + id + ']', 'a line in content/text-pages.js');
        // Short enough to sit on one line with its button at 1280 px and 150% zoom
        a.ok(text.length <= 80 && sentences(text) === 1, 'one short line: ' + text.length + ' characters');
        withView(id, function (root) {
          var tip = tipOf(root, id), h1 = root.querySelector('h1');
          a.ok(shows(tip), 'the line shows');
          a.ok(tip && txt(tip).indexOf(text) === 0, 'with the content text');
          a.ok(h1 && tip && (h1.compareDocumentPosition(tip) & Node.DOCUMENT_POSITION_FOLLOWING), 'under the title');
          a.equal(root.querySelectorAll('.tap-vh__tip[data-view]').length, 1, 'once');
        });
      });
    });

    T.test('TPV-TC-501', '"Hide tips" hides the line on every view for the session, and stores nothing', function (a) {
      var before = storageKeys();
      withView('overview', function (root) {
        var btn = tipOf(root, 'overview').querySelector('.tap-vh__tiphide');
        a.equal(txt(btn), TAP.content.text('viewTips.hide'), 'the button reads "Hide tips"');
        btn.click();
        a.ok(!shows(tipOf(root, 'overview')), 'the line on screen hides at once');
        a.ok(TAP.viewHead.tipsHidden(), 'hidden for the session');
        TAP.views.order().filter(function (id) { return !TAP.views.get(id).__stub; }).forEach(function (id) {
          var r = T.dom.mount(), h = TAP.views.get(id).mount(r);
          a.ok(!shows(tipOf(r, id)), id + ': no line');
          if (h && h.destroy) h.destroy();
        });
        a.deepEqual(storageKeys(), before, 'nothing was stored, so a reload shows the tips again');
      });
      a.ok(!TAP.viewHead.tipsHidden(), 'a fresh start (as on reload) shows them');
    });

    T.test('X-pages2-tip-size', 'The tip line and its button are at least 16 px and need no hover', function (a) {
      withView('newBusiness', function (root) {
        var tip = tipOf(root, 'newBusiness');
        [tip.querySelector('.tap-vh__tiptext'), tip.querySelector('.tap-vh__tiphide')].forEach(function (n) {
          a.ok(parseFloat(getComputedStyle(n).fontSize) >= 16, n.className + ': ' + getComputedStyle(n).fontSize);
          a.ok(getComputedStyle(n).visibility === 'visible' && shows(n), n.className + ' shows without hover');
        });
      });
    });

    /* ---------- US-2.6.3: tour and shortcuts cover the new views (#226) ---------- */

    T.test('TPV-TC-503', 'Number keys 1 to 8 open the views in menu order, one key per view', function (a) {
      var order = TAP.views.order();
      a.equal(order.length, 8, 'eight views in the menu');
      order.forEach(function (id, i) { a.equal(TAP.keys.viewFor(String(i + 1)), id, 'key ' + (i + 1) + ' opens ' + id); });
      a.equal(TAP.keys.viewFor('9'), null, 'key 9 opens nothing while there are eight views');
      a.equal(TAP.keys.viewFor('0'), null, 'key 0 opens nothing');
    });

    T.test('TPV-TC-503', 'Pressing a number key switches the view', function (a) {
      TAP.keys.bind();
      try {
        [4, 6, 1].forEach(function (n) {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: String(n), bubbles: true, cancelable: true }));
          a.equal(TAP.store.get().view, TAP.views.order()[n - 1], 'key ' + n);
        });
      } finally { TAP.keys.unbind(); }
    });

    T.test('TPV-TC-504', 'The Guide lists all eight number-key shortcuts, built from the menu order', function (a) {
      withGuide(function (root) {
        var items = qsa('[data-guide="howTo"] .tap-guide__key', root), order = TAP.views.order();
        a.equal(items.length, order.length, 'one line per view');
        items.forEach(function (li, i) {
          a.equal(txt(li.querySelector('kbd')), String(i + 1), 'key ' + (i + 1));
          a.equal(txt(li.querySelector('span')), TAP.views.title(order[i]), 'names ' + order[i]);
          a.equal(li.getAttribute('data-view'), TAP.keys.viewFor(String(i + 1)), 'the same view the key opens');
        });
      });
    });

    T.test('TPV-TC-504', 'A view added to the menu is listed without a content change', function (a) {
      var order = window.TAP_VIEWS.order, saved = order.slice();
      order.splice(5, 0, 'insights');   // a stand-in ninth entry, removed again below
      try {
        withGuide(function (root) {
          a.equal(qsa('.tap-guide__key', root).length, 9, 'nine keys');
          a.equal(TAP.keys.viewFor('9'), 'guide', 'the last view moves to key 9');
        });
      } finally { order.length = 0; Array.prototype.push.apply(order, saved); }
    });

    T.test('TPV-TC-506', 'The tour has one step for the Phase 2 views and one for the region profile', function (a) {
      var steps = TAP.tour.steps(), ids = steps.map(function (s) { return s.id; });
      a.ok(ids.indexOf('views') === ids.indexOf('menu') + 1, 'the views step follows the menu step');
      a.ok(ids.indexOf('profile') === ids.indexOf('views') + 1, 'then the profile step');
      var views = steps[ids.indexOf('views')], prof = steps[ids.indexOf('profile')];
      ['newBusiness', 'customers', 'partners'].forEach(function (v) {
        a.ok(views.text.indexOf(TAP.views.title(v)) >= 0, 'the views step names ' + TAP.views.title(v));
      });
      a.ok(prof.text.indexOf(TAP.views.title('regions')) >= 0, 'the profile step names the Regions view');
      [views, prof].forEach(function (s) {
        a.ok(s.title && s.title.indexOf('[') !== 0, s.id + ' has a title from the content file');
        var n = sentences(s.text);
        a.ok(n >= 1 && n <= 2, s.id + ': ' + n + ' sentence(s)');
      });
    });

    T.test('TPV-TC-507', 'The tour still has 10 steps or fewer', function (a) {
      var n = TAP.tour.steps().length;
      a.ok(n <= 10, n + ' steps');
      a.ok(n >= 9, 'and keeps the Phase 1 steps');
    });

    /* ---------- review polish #381 (POL-head): a chart on the first screen of the newer views ---------- */

    // A stand-in insight engine with fixed insights per report, for the length of fn.
    function withFakeInsights(list, fn) {
      var old = TAP.insights;
      TAP.insights = { __stub: false, all: function () { return list.slice(); }, failures: function () { return []; },
        ranked: function (cmp, opts) {
          return list.filter(function (x) { return !opts || !opts.reportId || x.attach.indexOf(opts.reportId) >= 0; });
        },
        top: function (cmp, id, n) { return this.ranked(cmp, { reportId: id }).slice(0, n || 3); },
        hidden: function () { return []; }, hide: function () {}, unhide: function () {}, reset: function () {} };
      try { return fn(); } finally { TAP.insights = old; }
    }
    function fake(id, family, significance, reportId) {
      return { id: id, ruleId: id, family: family, significance: significance, sentence: 'Sentence ' + id + '.', regionIds: ['alpha'],
        industryIds: [], accountIds: [], attach: [reportId], reportId: reportId, highlight: { reportId: reportId }, figures: [], label: 'Observation to discuss' };
    }

    // Refs #353 (D80): the view headline takes insights in the engine's order, so a theme never leads a view
    T.test('X-review-D80-headline', 'A theme insight that out-scores the figure-based ones never becomes the view headline', function (a) {
      var reports = window.TAP_VIEWS.newBusiness.reports;
      var list = [fake('theme:1', 'themes', 0.95, 'nb-themes'), fake('fig:1', 'plan', 0.4, reports[1]), fake('fig:2', 'shared', 0.6, reports[3])];
      withFakeInsights(list, function () {
        var x = TAP.viewHead.headline('newBusiness', TAP.store.get().cmp);
        a.equal(x && x.id, 'fig:2', 'the most significant figure-based insight');
        var only = [fake('theme:1', 'themes', 0.95, 'nb-themes')];
        TAP.insights.ranked = function () { return only; };
        a.equal((TAP.viewHead.headline('newBusiness', TAP.store.get().cmp) || {}).id, 'theme:1', 'a theme still leads when it is the only one');
      });
    });

    T.test('X-review-POL-head', 'The headline\'s Show me sits on the headline line, after the sentence', function (a) {
      var reports = window.TAP_VIEWS.newBusiness.reports;
      var x = fake('fig:2', 'shared', 0.6, reports[1]);
      x.sentence = new Array(9).join('A sentence long enough to wrap onto a second line of the header. ');
      withFakeInsights([x], function () {
        var root = T.dom.mount();
        root.style.width = '1280px';
        var h = TAP.viewHead.render(root, { viewId: 'newBusiness', kicker: 'K', title: 'T', lead: 'L' });
        try {
          var text = root.querySelector('.tap-vh__headline-text'), btn = root.querySelector('.tap-vh__showme');
          a.equal(text.textContent, x.sentence, 'the sentence as the insight says it');
          var t = text.getClientRects(), last = t[t.length - 1], b = btn.getBoundingClientRect();
          a.ok(b.top < last.bottom && b.bottom > last.top, 'Show me shares the last line of the sentence');
          a.ok(parseFloat(getComputedStyle(btn).fontSize) >= 16, 'at body text size (D24)');
        } finally { h.destroy(); }
      });
    });

    // D83: a headline that repeats the first panel's takeaway word for word is left out; a different one stays
    T.test('X-review-POL-head', 'The headline is left out when it is the first panel\'s takeaway, and shown when it differs (D83)', function (a) {
      var reports = window.TAP_VIEWS.customers.reports;
      function lineFor(list) {
        return withFakeInsights(list, function () {
          var root = T.dom.mount(), h = TAP.viewHead.render(root, { viewId: 'customers', kicker: 'K', title: 'T', lead: 'L' });
          try { var line = root.querySelector('.tap-vh__headline'); return { hidden: line.hidden, text: txt(line.querySelector('.tap-vh__headline-text')) }; }
          finally { h.destroy(); }
        });
      }
      var same = lineFor([fake('first:1', 'exposure', 0.8, reports[0]), fake('other:1', 'plan', 0.5, reports[1])]);
      a.ok(same.hidden, 'the most significant insight leads the first panel: no headline line');
      var differs = lineFor([fake('first:1', 'exposure', 0.5, reports[0]), fake('other:1', 'plan', 0.8, reports[1])]);
      a.ok(!differs.hidden, 'an insight from another panel: the headline shows');
      a.equal(differs.text, 'Sentence other:1.', 'with its sentence');
    });

    T.test('X-review-POL-head', 'The profile\'s top row carries the page buttons: Present and Take the tour (D72)', function (a) {
      TAP.store.set({ view: 'regions', region: 'alpha' });
      var root = T.dom.mount(), v = TAP.views.get('regions').mount(root);
      try {
        var top = root.querySelector('.tap-pf__top');
        a.ok(top.querySelector('.tap-present__button'), 'Present');
        a.ok(top.querySelector('.tap-tour__button'), 'Take the tour');
      } finally { v.destroy(); }
    });
  });
})(window.TAP);
