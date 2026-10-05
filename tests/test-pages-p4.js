/*
 * File: tests/test-pages-p4.js
 * Purpose: Tests for the Phase 4 glossary, Guide, tour, region profile lines and handover documents.
 * Provides: test cases for the PAGES4 stream: US-4.6.1 (TPV-TC-742, 745, 747), X-p4-pages-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: PAGES4 stream
 */
(function (TAP) {
  'use strict';

  var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };

  // Every string under an object, with its key path.
  function strings(obj, path, out) {
    out = out || [];
    if (typeof obj === 'string') out.push({ path: path, text: obj });
    else if (obj && typeof obj === 'object') Object.keys(obj).forEach(function (k) { strings(obj[k], path ? path + '.' + k : k, out); });
    return out;
  }
  function sentences(s) { return (String(s).match(/[.?!](\s|$)/g) || []).length; }

  // The terms US-4.6.1 names: glossary id and a word a reader sees on screen that must find the entry.
  var TERMS = { strategicPlan: 'strategic plan', baseYear: 'base year', budget: 'budget', forecast: 'forecast',
    actuals: 'actuals', pipelineCoverage: 'pipeline coverage', revenueOutlook: 'revenue outlook', revenueRelease: 'revenue release',
    customerValue: 'customer value', booksValue: 'books value', routeToMarket: 'route to market', solution: 'solution',
    productCategory: 'product category', swPerpetual: 'software perpetual', partnerType: 'partner type',
    partnerMaturity: 'partner maturity' };
  // The five maturity levels, lowest first (Data Contract, lookups.partnerMaturity)
  var LEVELS = [['maturityRecruit', 'Recruit'], ['maturityOnboard', 'Onboard'], ['maturityEnable', 'Enable'],
    ['maturitySkill', 'Skill'], ['maturityStrategic', 'Strategic']];
  // The Phase 4 reports (ARCHITECTURE 19.3), built by the OUTLOOK and NBPT streams
  var P4_REPORTS = ['ol-strategic', 'ol-baseyear', 'ol-coverage', 'ol-revenue', 'ol-revshare', 'ol-category',
    'nb-solutions', 'pt-books', 'pt-routes', 'pt-maturity'];
  // The menu as Phase 4 has it: Outlook after Partners (D87), whether or not its view is in the menu yet
  function menuOrder() {
    var order = window.TAP_VIEWS.order.slice();
    if (order.indexOf('outlook') < 0) order.splice(order.indexOf('partners') + 1, 0, 'outlook');
    return order;
  }
  function p4Entries() {
    return Object.keys(TERMS).concat(LEVELS.map(function (l) { return l[0]; }), ['variance']);
  }
  function howTo(id) { return (TAP.content.guide().howTo.sections || []).filter(function (s) { return s.id === id; })[0]; }
  function linked(part, view) {
    return (TAP.content.guide()[part].sections || []).filter(function (s) { return s.link && s.link.view === view; });
  }

  T.suite('pages-p4', function () {
    /* ---------- US-4.6.1: glossary and Guide for Phase 4 (#457) ---------- */

    T.test('TPV-TC-742', 'Every term the story names has a full glossary entry, found by the words on screen', function (a) {
      var g = window.TAP_CONTENT.glossary;
      Object.keys(TERMS).forEach(function (id) {
        var e = g[id];
        a.ok(e, id + ' exists');
        if (!e) return;
        a.ok(e.term && e.short && e.short.length > 20, id + ': term and a plain definition');
        a.ok(e.why && e.why.length > 20, id + ': why it matters');
        a.ok(Array.isArray(e.aliases), id + ': aliases is a list');
        a.ok(Array.isArray(e.related) && e.related.length > 0, id + ': related terms');
        (e.related || []).forEach(function (r) { a.ok(g[r], id + ': related "' + r + '" exists'); });
        var found = TAP.content.term(TERMS[id]);
        a.equal(found && found.id, id, '"' + TERMS[id] + '" finds the ' + id + ' entry');
      });
    });

    T.test('TPV-TC-742', 'Each maturity level has an entry, and partner maturity lists the five levels in their order', function (a) {
      var g = window.TAP_CONTENT.glossary, pm = g.partnerMaturity || {};
      LEVELS.forEach(function (l, i) {
        var e = g[l[0]];
        a.ok(e, l[1] + ' has an entry');
        if (!e) return;
        a.equal(e.term.indexOf(l[1]), 0, l[1] + ': the term starts with the level\'s name');
        a.ok(e.short.length > 20 && e.why.length > 20, l[1] + ': a definition and why it matters');
        a.ok(e.related.indexOf('partnerMaturity') >= 0, l[1] + ': related to partner maturity');
        a.ok(new RegExp('\\b' + (i + 1) + '\\b|' + ['first', 'second', 'third', 'fourth', 'fifth'][i], 'i').test(e.short),
          l[1] + ': says where it sits among the five');
      });
      var at = LEVELS.map(function (l) { return pm.short ? pm.short.indexOf(l[1]) : -1; });
      a.ok(at.every(function (x) { return x >= 0; }), 'partner maturity names every level');
      a.deepEqual(at.slice().sort(function (x, y) { return x - y; }), at, 'in the order Recruit to Strategic');
    });

    T.test('X-p4-pages-glossary-style', 'The Phase 4 entries are plain and neutral: no em dash, no verdict, no placeholder', function (a) {
      var g = window.TAP_CONTENT.glossary, banned = ((window.TAP_RULES || {}).wording || {}).banned || [];
      a.ok(banned.length > 3, 'the banned words are loaded');
      p4Entries().forEach(function (id) {
        a.ok(g[id], id + ' exists');
        strings(g[id], id).forEach(function (s) {
          a.ok(s.text.indexOf('—') < 0, s.path + ' has no em dash');
          a.ok(!/TODO|TBD|\{\w+\}/.test(s.text), s.path + ' has no placeholder');
          a.ok(!/\b(good|bad|better|worse|best|worst|healthy|weak)\b/i.test(s.text), s.path + ' passes no verdict');
          banned.forEach(function (w) { a.ok(!new RegExp('\\b' + w + '\\b', 'i').test(s.text), s.path + ' avoids "' + w + '"'); });
        });
      });
    });

    T.test('X-p4-pages-glossary-marked', 'The Phase 4 measure wording marks its term the first time it appears', function (a) {
      var cases = [['Strategic plan order intake', 'strategicPlan'], ['Order intake through the organization’s books', 'booksValue'],
        ['Order intake at customer value', 'customerValue'], ['Pipeline coverage', 'pipelineCoverage'],
        ['Base year forecast', 'forecast'], ['Revenue as a share of order intake', 'revenueOutlook'],
        ['Order intake across routes to market', 'routeToMarket'], ['Order intake across product categories (books value)', 'productCategory'],
        ['Partners across maturity levels', 'partnerMaturity'], ['Plan minus strategic plan', 'variance']];
      cases.forEach(function (c) {
        var html = TAP.content.mark(c[0], {});
        a.ok(html.indexOf('data-term="' + c[1] + '"') >= 0, '"' + c[0] + '" marks ' + c[1]);
      });
      var seen = {}, first = TAP.content.mark('Strategic plan', seen), again = TAP.content.mark('Strategic plan', seen);
      a.ok(/data-term=/.test(first) && !/data-term=/.test(again), 'marked once per panel, as for the existing terms');
    });

    T.test('X-p4-pages-glossary-everyday', 'Everyday words stay unmarked: the level names alone, market coverage, plan', function (a) {
      ['Enable the filter to skip the step and strategic choices', 'The plan for the year'].forEach(function (s) {
        a.ok(!/data-term="maturity/.test(TAP.content.mark(s, {})), '"' + s + '" marks no maturity level');
      });
      a.ok(TAP.content.mark('1. Market coverage', {}).indexOf('data-term="pipelineCoverage"') < 0, 'market coverage is not pipeline coverage');
    });

    T.test('TPV-TC-745', 'The Guide describes the Outlook view in two or three sentences, with a link to it', function (a) {
      var s = linked('howTo', 'outlook')[0], all = s ? s.paragraphs.join(' ') : '';
      a.ok(s, 'a How to use section links to the Outlook view');
      var n = sentences(all);
      a.ok(n >= 2 && n <= 3, 'Outlook: ' + n + ' sentences');
      a.ok(all.indexOf(window.TAP_VIEWS.outlook.title) >= 0, 'names the view as the menu does');
      ['strategic plan', 'base year', 'coverage', 'revenue', 'product category'].forEach(function (w) {
        a.ok(new RegExp(w, 'i').test(all), 'mentions ' + w);
      });
      a.ok(linked('planning', 'outlook').length >= 1, 'a planning section explains the Outlook figures and links to the view');
    });

    T.test('TPV-TC-745', 'The Guide describes the new reports on the New business and Partners views', function (a) {
      var nb = howTo('viewNewBusiness'), pt = howTo('viewPartners');
      var nbText = nb ? nb.paragraphs.join(' ') : '', ptText = pt ? pt.paragraphs.join(' ') : '';
      a.match(nbText, /solution/i, 'New business: the solutions report');
      [/customer value/i, /books/i, /route to market/i, /maturity/i].forEach(function (re) { a.match(ptText, re, 'Partners: ' + re); });
      [nb, pt].forEach(function (s) {
        var k = sentences(s.paragraphs.join(' '));
        a.ok(k >= 2 && k <= 3, s.id + ': still two or three sentences (' + k + ')');
      });
    });

    T.test('TPV-TC-745', 'The menu paragraph names the views in menu order, Outlook after Partners', function (a) {
      var menu = howTo('menu').paragraphs[0], last = -1;
      menuOrder().forEach(function (id) {
        var title = id === 'guide' ? 'this Guide' : window.TAP_VIEWS[id].title, at = menu.indexOf(title);
        a.ok(at > last, title + ' comes next in the menu paragraph');
        last = Math.max(last, at);
      });
    });

    T.test('TPV-TC-745', 'The tour has a step for the Outlook view, after the step for the other views', function (a) {
      var steps = TAP.tour.steps(), ids = steps.map(function (s) { return s.id; }), s = steps[ids.indexOf('outlook')];
      a.ok(s, 'an Outlook step');
      if (!s) return;
      a.equal(ids.indexOf('outlook'), ids.indexOf('views') + 1, 'it follows the views step, as Outlook follows Partners in the menu');
      a.ok(steps.length <= 10, 'the tour keeps to 10 steps (' + steps.length + ')');
      a.ok(s.text.indexOf(window.TAP_VIEWS.outlook.title) >= 0, 'the step names the view');
      a.ok(s.title && s.title.indexOf('[') !== 0 && s.text.indexOf('[') !== 0, 'title and text come from the content file');
      var n = sentences(s.text);
      a.ok(n >= 1 && n <= 2, n + ' sentence(s)');
    });

    T.test('X-p4-pages-tour-fallback', 'The Outlook step points at its menu item, falling back to the menu, never at a view\'s part', function (a) {
      var s = TAP.tour.steps().filter(function (x) { return x.id === 'outlook'; })[0];
      var parts = s ? s.sel.split(',').map(function (p) { return p.trim(); }) : [];
      a.equal(parts[0], '.tap-menu__item[data-view="outlook"]', 'the Outlook menu item first');
      a.equal(parts[parts.length - 1], '[data-tour="menu"]', 'then the menu, which every view has');
      a.ok(parts.every(function (p) { return p.indexOf('.tap-view') < 0; }), 'nothing inside a view, which may lack it');
    });

    T.test('X-p4-pages-tip', 'The Outlook view has its one-line tip in the content file', function (a) {
      var text = TAP.content.text('viewTips.outlook');
      a.ok(text && text !== '[viewTips.outlook]', 'viewTips.outlook is set');
      a.ok(text.length <= 80 && sentences(text) === 1, 'one short line: ' + text.length + ' characters');
    });

    T.test('TPV-TC-747', 'Every Phase 4 report has all three parts of its explanation', function (a) {
      var stubs = TAP.stub.list().length;
      P4_REPORTS.forEach(function (id) {
        var def = TAP.reports.get(id);
        if (!def) { a.ok(stubs > 0, id + ' is not built yet, which is allowed only while stubs remain'); return; }
        ['shows', 'read', 'lookFor'].forEach(function (k) {
          var v = def.explain && def.explain[k];
          a.ok(typeof v === 'string' && v.trim().length > 20, id + ': "' + k + '" is written');
        });
      });
    });
  });
})(window.TAP);
