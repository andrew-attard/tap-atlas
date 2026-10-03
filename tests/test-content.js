/*
 * File: tests/test-content.js
 * Purpose: Tests for the glossary, term marking, guide text and organization layer (TPV-TC-179 to 184).
 * Provides: test cases for CONTENT stories (#38, #39, #40, #42, #60)
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

  // The wording people read: report titles, explanations and labels, view titles, all on-screen text,
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
    T.test('TPV-TC-182', 'Clicking a marked term shows its definition and a link to the glossary; Esc closes it', function (a) {
      var box = T.dom.mount();
      TAP.dom.html(box, TAP.content.mark('Hit rate', {}));
      var btn = box.querySelector('.tap-term');
      btn.click();
      var pop = document.querySelector('.tap-popover');
      a.ok(pop, 'popover open');
      a.ok(pop.textContent.indexOf(TAP.content.term('hitRate').short) >= 0, 'shows the definition');
      a.ok(pop.querySelector('[data-glossary-link]'), 'links to the full entry');
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
  });

  T.suite('glossary list', function () {
    T.test('X-content-glossary-az', 'The glossary list is sorted A to Z and shows every term', function (a) {
      var box = T.dom.mount();
      TAP.glossary.render(box);
      var names = Array.prototype.map.call(box.querySelectorAll('.tap-gloss__term'), function (n) { return n.textContent; });
      a.equal(names.length, Object.keys(TAP.content.terms()).length, 'every term listed');
      var sorted = names.slice().sort(function (x, y) { return x.toLowerCase().localeCompare(y.toLowerCase()); });
      a.deepEqual(names, sorted, 'A to Z');
    });

    T.test('TPV-TC-180', 'Typing in the search box filters the list as you type', function (a) {
      var box = T.dom.mount();
      TAP.glossary.render(box);
      var input = box.querySelector('input[type="search"]');
      input.value = 'hit';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      var shown = box.querySelectorAll('.tap-gloss__entry:not([hidden]) .tap-gloss__term');
      a.deepEqual(Array.prototype.map.call(shown, function (n) { return n.textContent; }), ['Hit rate']);
      input.value = 'recurring revenue';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      a.equal(box.querySelectorAll('.tap-gloss__entry:not([hidden])').length, 1, 'aliases are searched');
      input.value = 'zzzz';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      a.ok(box.querySelector('.tap-gloss__none:not([hidden])'), 'a message when nothing matches');
    });

    T.test('X-content-glossary-target', 'The list can open on one entry, and organization terms are labelled', function (a) {
      withOrg({ glossary: { orgLine: { term: 'Widget Suite', aliases: [], short: 'An invented product line.', why: 'Example.', related: ['arr'] } } }, function () {
        var box = T.dom.mount();
        TAP.glossary.render(box, { termId: 'orgLine' });
        var entry = box.querySelector('#tap-gloss-orgLine');
        a.ok(entry && entry.classList.contains('is-target'), 'target entry picked out');
        a.ok(entry.textContent.indexOf(TAP.content.text('glossary.orgBadge')) >= 0, 'organization badge');
      });
    });
  });
})(window.TAP);
