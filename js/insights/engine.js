/*
 * File: js/insights/engine.js
 * Purpose: Runs the insight rules, applies the guardrails (no blanks, enough regions, neutral words), scores and
 *          ranks what they find, and keeps the session's hidden list (US-1.7.1, 1.7.2, 1.7.10, 1.7.11).
 * Provides: TAP.insights (defineRule, all, ranked, top, hide, unhide, hidden, failures, reset, significance); the
 *           helpers rule files get as ctx.util are in js/insights/util.js
 * Depends on: config/insight-rules.js, config/settings.js, js/core/store.js, js/core/data.js, js/core/content.js,
 *             js/core/format.js, js/engine/aggregate.js, scope.js, measures.js, scores.js, registry.js (at call time)
 * Used by: panels, the Overview, the Insights page, the data sources panel, the rule files in js/insights/
 */
(function (TAP) {
  'use strict';

  var code = {};                      // rule id -> fn(ctx)
  var cache = null;                   // {key, plan, list, failures}
  // Vars holding names from the workbooks. They are the data's words, not ours, so the banned-word check skips them.
  var NAME_VARS = ['region', 'industry', 'industries', 'accounts', 'segment', 'regions', 'partner', 'subIndustry'];
  // Words that only reach a sentence when a figure went missing on the way.
  var GAP_WORDS = ['NaN', 'undefined', 'null', 'Infinity'];

  function rules() { return (window.TAP_RULES && window.TAP_RULES.rules) || []; }
  function wording() { return (window.TAP_RULES && window.TAP_RULES.wording) || {}; }
  function settings() { return (window.TAP_SETTINGS && window.TAP_SETTINGS.insights) || {}; }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function clamp(v) { return isNum(v) ? Math.max(0, Math.min(1, v)) : 0; }
  function fill(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? String(vars[k]) : m; });
  }

  function defineRule(id, fn) {
    if (typeof fn === 'function') code[id] = fn; else delete code[id];
    cache = null;
  }

  /* ---------- running the rules ---------- */

  // A family whose rule file is still a stub is simply not built yet: its rules are left out without a note.
  function stubbed(family) {
    return TAP.stub.list().some(function (s) { return s.what === 'insight rules: ' + family; });
  }

  // True when at least one region has at least one of the fields the rule reads (paths like section.field).
  function hasInput(rule) {
    var reads = rule.reads || [];
    if (!reads.length) return true;
    return reads.some(function (path) {
      return TAP.data.regions().some(function (r) { return present(r, path.split('.')); });
    });
  }
  function present(obj, parts) {
    if (obj == null) return false;
    if (Array.isArray(obj)) return obj.some(function (x) { return present(x, parts); });
    if (!parts.length) return obj !== undefined;
    return Object.prototype.hasOwnProperty.call(obj, parts[0]) && present(obj[parts[0]], parts.slice(1));
  }

  // A skipped rule is reported once, through failures(), which the data sources panel lists.
  function fail(out, rule, reason) {
    out.failures.push({ ruleId: rule.id, family: rule.family, message: fill(wording().phrases.failed, { rule: rule.id, reason: reason }) });
  }

  // Why a rule's findings can't be used, or null. One malformed finding sets aside the whole rule, never the session.
  function malformed(rule, found) {
    var ph = wording().phrases;
    if (!Array.isArray(found)) return ph.notList;
    for (var i = 0; i < found.length; i++) {
      var f = found[i];
      if (!f || typeof f !== 'object' || f.key == null || !Array.isArray(f.regionIds) || !Array.isArray(f.figures) ||
          f.figures.some(function (g) { return !g || typeof g !== 'object'; })) return ph.badFinding;
      if (rule.compare && typeof f.provided !== 'number') return ph.noProvided;
    }
    return null;
  }

  function run() {
    var out = { list: [], failures: [] };
    var ph = wording().phrases;
    rules().forEach(function (rule) {
      if (rule.enabled === false) return;
      if (!code[rule.id]) { if (!stubbed(rule.family)) fail(out, rule, ph.noCode); return; }
      try {
        if (!hasInput(rule)) { fail(out, rule, fill(ph.noData, { fields: (rule.reads || []).join(', ') })); return; }
        var found = code[rule.id](context(rule)), bad = malformed(rule, found), mine = [];
        if (bad) { fail(out, rule, bad); return; }
        found.forEach(function (f) {
          var x = build(rule, f, out);
          if (x) mine.push(x);
        });
        out.list = out.list.concat(mine);
      } catch (e) {
        fail(out, rule, String((e && e.message) || e));
      }
    });
    out.list.sort(bySignificance);
    return out;
  }

  function context(rule) {
    return { params: rule.params || {}, data: TAP.data, measures: TAP.measures, agg: TAP.agg, scores: TAP.scores,
      settings: window.TAP_SETTINGS || {}, rule: rule, util: TAP.insights.util };
  }

  /* ---------- one finding -> one insight ---------- */

  function blankFigure(f) {
    return f.figures.some(function (g) { return !g.cell || g.cell.state === 'notProvided'; });
  }

  // The sentence in our own words: the template filled with every var except the names from the workbooks.
  function ownWords(template, vars) {
    var own = {};
    Object.keys(vars || {}).forEach(function (k) { own[k] = NAME_VARS.indexOf(k) >= 0 ? '' : vars[k]; });
    return ' ' + fill(template, own) + ' ';
  }
  function wordIn(text, w, flags) {
    var esc = String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^A-Za-z])' + esc + '([^A-Za-z]|$)', flags).test(text);
  }
  // The first banned word (any case), or the first word that shows a figure went missing (exact case).
  function bannedWord(text) {
    return (wording().banned || []).filter(function (w) { return wordIn(text, w, 'i'); })[0] || null;
  }
  function gapWord(text) {
    var missing = TAP.content.text('states.notProvided');
    return GAP_WORDS.concat([missing]).filter(function (w) { return wordIn(text, w, ''); })[0] || null;
  }

  // The "Show me" target. Phase 2 findings may also name list rows (items, 17.4), a theme (the themes report) or the
  // measure the insight is about, which the report then shows (US-2.5.6).
  function target(f, reportId, regionIds, mark) {
    var hl = { reportId: reportId, regionIds: regionIds, industryIds: f.industryIds || [], accountIds: f.accountIds || [],
      quadrant: f.quadrant || null, mark: mark };
    ['items', 'theme', 'measureId'].forEach(function (k) { if (f[k]) hl[k] = f[k]; });
    return hl;
  }

  function build(rule, f, out) {
    var ph = wording().phrases, min = settings().minRegions || 3;
    if (blankFigure(f)) return null;                                     // never built from a blank
    if (rule.compare && f.provided < min) return null;                   // too few regions to compare
    var template = (f.variant && rule.templates && rule.templates[f.variant]) || rule.template;
    var sentence = fill(template, f.vars), own = ownWords(template, f.vars);
    var gap = /\{(\w+)\}/.exec(sentence), lost = gapWord(own);
    if (gap || lost) { fail(out, rule, fill(ph.unfilled, { gap: gap ? gap[0] : lost })); return null; }
    var word = bannedWord(own);
    if (word) { fail(out, rule, fill(ph.banned, { word: word })); return null; }

    var regionIds = f.regionIds, n = TAP.data.regions().length;
    // Only reports that exist count: while a view is being built, the next attached report that exists takes over
    // A finding may narrow the rule's reports to the ones that show its own figure (an outlier hit rate: the levers)
    var attach = (Array.isArray(f.attach) ? f.attach : rule.attach || []).filter(function (id) { return !!TAP.reports.get(id); });
    var reportId = attach.length ? attach[0] : null;
    // A finding may say how many of its regions really count (a split counts the regions that depart from the rest).
    var strength = clamp(f.strength), money = clamp(f.money);
    var breadth = clamp(typeof f.breadth === 'number' ? f.breadth : n ? regionIds.length / n : 0);
    return {
      id: rule.id + ':' + f.key, ruleId: rule.id, family: rule.family, sentence: sentence, figures: f.figures,
      description: rule.description, regionIds: regionIds, industryIds: f.industryIds || [], accountIds: f.accountIds || [],
      significance: significance(rule.family, strength, money, breadth),
      strength: strength, money: money, breadth: breadth,
      sources: f.sources && f.sources.length ? f.sources : f.figures.map(function (g) { return g.cell.src; }),
      reportId: reportId, attach: reportId ? attach : [],
      highlight: target(f, reportId, regionIds, reportId ? rule.highlight || null : null),
      fallback: reportId ? null : 'details',
      label: ph.label
    };
  }

  /* ---------- significance (US-1.7.2) ---------- */

  // Family weight x the weighted mix of strength, money and breadth. Family weights are divided by the largest,
  // and the three weights by their sum, so every score stays between 0 and 1 and families stay comparable.
  function significance(family, strength, money, breadth) {
    var s = settings(), w = s.weights || {}, fw = s.familyWeights || {};
    var ws = isNum(w.strength) ? w.strength : 0.5, wm = isNum(w.money) ? w.money : 0.3, wb = isNum(w.breadth) ? w.breadth : 0.2;
    var top = Math.max.apply(null, Object.keys(fw).map(function (k) { return fw[k]; }).filter(isNum).concat([1]));
    var f = isNum(fw[family]) ? fw[family] / top : 1 / top;
    var sum = ws + wm + wb || 1;
    return clamp(f * (ws * strength + wm * money + wb * breadth) / sum);
  }

  // Theme findings come from words, not figures, so they rank after every other family whatever their score (D80).
  function late(x) { return x.family === 'themes' ? 1 : 0; }
  function bySignificance(a, b) { return late(a) - late(b) || b.significance - a.significance || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }

  /* ---------- the cached list and what is built on it ---------- */

  // Worked out once per data file; a reload (a new plan object) or a change to the rules or weights recomputes it.
  function key() {
    return JSON.stringify([rules().map(function (r) { return [r.id, r.enabled, r.params]; }), settings(), Object.keys(code)]);
  }
  function state() {
    var plan = TAP.data.plan(), k = key();
    if (!cache || cache.plan !== plan || cache.key !== k) {
      var res = run();                                   // assigned only once the run has finished
      cache = { plan: plan, key: k, list: res.list, failures: res.failures };
    }
    return cache;
  }

  function all() { return state().list.slice(); }
  function failures() { return state().failures.slice(); }

  function hidden() { return (TAP.store.get().hiddenInsights || []).slice(); }
  function hide(id) {
    var h = hidden();
    if (h.indexOf(id) < 0) TAP.store.set({ hiddenInsights: h.concat([id]) });
  }
  function unhide(id) {
    var h = hidden();
    if (id == null) { if (h.length) TAP.store.set({ hiddenInsights: [] }); return; }
    if (h.indexOf(id) >= 0) TAP.store.set({ hiddenInsights: h.filter(function (x) { return x !== id; }) });
  }

  // Insights in scope, hidden ones left out: figure-based, then themes, the focus region's first in each group.
  function ranked(cmp, opts) {
    cmp = cmp || TAP.store.get().cmp;
    opts = opts || {};
    var scope = TAP.scope.regionIds(cmp), off = hidden();
    var focus = (cmp.mode === 'one' || cmp.mode === 'pair') && scope.indexOf(cmp.focus) >= 0 ? cmp.focus : null;
    var list = state().list.filter(function (x) {
      if (off.indexOf(x.id) >= 0) return false;
      if (!x.regionIds.some(function (r) { return scope.indexOf(r) >= 0; })) return false;
      if (opts.reportId && x.attach.indexOf(opts.reportId) < 0) return false;
      if (opts.family && x.family !== opts.family) return false;
      return !opts.regionId || x.regionIds.indexOf(opts.regionId) >= 0;
    });
    var rank = function (x) { return 2 * late(x) + (focus && x.regionIds.indexOf(focus) < 0 ? 1 : 0); };
    return [0, 1, 2, 3].reduce(function (out, k) { return out.concat(list.filter(function (x) { return rank(x) === k; })); }, []);
  }

  function top(cmp, reportId, n) {
    var max = n != null ? n : settings().panelMax || 3;
    return ranked(cmp, { reportId: reportId }).slice(0, max);
  }

  function reset() { cache = null; }

  TAP.insights = { defineRule: defineRule, all: all, ranked: ranked, top: top, hide: hide, unhide: unhide, hidden: hidden,
    failures: failures, reset: reset, significance: significance };
})(window.TAP);
