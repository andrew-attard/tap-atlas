/*
 * File: tests/test-content.js
 * Purpose: Tests for the glossary, term marking, guide text and organization layer (TPV-TC-179, 181).
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
})(window.TAP);
