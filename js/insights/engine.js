/*
 * File: js/insights/engine.js
 * Purpose: Runs the insight rules, applies the guardrails (no blanks, enough regions, neutral words), scores and
 *          ranks what they find, and keeps the session's hidden list (US-1.7.1, 1.7.2, 1.7.10, 1.7.11).
 * Provides: TAP.insights (defineRule, all, ranked, top, hide, unhide, hidden, failures, reset)
 * Depends on: config/insight-rules.js, config/settings.js, js/core/store.js, js/core/data.js, js/core/content.js,
 *             js/core/format.js, js/engine/aggregate.js, scope.js, measures.js, scores.js, registry.js (at call time)
 * Used by: panels, the Overview, the Insights page, the data sources panel, the rule files in js/insights/
 */
(function (TAP) {
  'use strict';

  var code = {};                      // rule id -> fn(ctx)
  var cache = null;                   // {key, plan, list, failures}
  // Vars holding names from the workbooks. They are the data's words, not ours, so the banned-word check skips them.
  var NAME_VARS = ['region', 'industry', 'industries', 'accounts', 'segment'];

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

  function fail(out, rule, reason) {
    var message = fill(wording().phrases.failed, { rule: rule.id, reason: reason });
    out.failures.push({ ruleId: rule.id, family: rule.family, message: message });
    TAP.notes.add({ source: 'insights', message: message });
  }

  function run() {
    var out = { list: [], failures: [] };
    var ph = wording().phrases;
    rules().forEach(function (rule) {
      if (rule.enabled === false) return;
      if (!code[rule.id]) { if (!stubbed(rule.family)) fail(out, rule, ph.noCode); return; }
      if (!hasInput(rule)) { fail(out, rule, fill(ph.noData, { fields: (rule.reads || []).join(', ') })); return; }
      var found;
      try {
        found = code[rule.id](context(rule)) || [];
      } catch (e) {
        fail(out, rule, String((e && e.message) || e));
        return;
      }
      found.forEach(function (f) {
        var x = build(rule, f, out);
        if (x) out.list.push(x);
      });
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
    return (f.figures || []).some(function (g) { return !g.cell || g.cell.state === 'notProvided'; });
  }

  // The first banned word in the sentence, leaving out the names that came from the workbooks.
  function bannedWord(template, vars) {
    var own = {};
    Object.keys(vars || {}).forEach(function (k) { own[k] = NAME_VARS.indexOf(k) >= 0 ? '' : vars[k]; });
    var text = ' ' + fill(template, own).toLowerCase() + ' ';
    return (wording().banned || []).filter(function (w) {
      var esc = String(w).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(^|[^a-z])' + esc + '([^a-z]|$)').test(text);
    })[0] || null;
  }

  function build(rule, f, out) {
    var ph = wording().phrases, min = settings().minRegions || 3;
    if (blankFigure(f)) return null;                                     // never built from a blank
    if (rule.compare && !(f.provided >= min)) return null;               // too few regions to compare
    var template = (f.variant && rule.templates && rule.templates[f.variant]) || rule.template;
    var sentence = fill(template, f.vars);
    var gap = /\{(\w+)\}/.exec(sentence);
    if (gap) { fail(out, rule, fill(ph.unfilled, { gap: gap[0] })); return null; }
    var word = bannedWord(template, f.vars);
    if (word) { fail(out, rule, fill(ph.banned, { word: word })); return null; }

    var regionIds = f.regionIds || [], n = TAP.data.regions().length;
    var attach = (rule.attach || []).slice();
    var reportId = attach.length && TAP.reports.get(attach[0]) ? attach[0] : null;
    var strength = clamp(f.strength), money = clamp(f.money), breadth = clamp(n ? regionIds.length / n : 0);
    return {
      id: rule.id + ':' + f.key, ruleId: rule.id, family: rule.family, sentence: sentence, figures: f.figures || [],
      description: rule.description, regionIds: regionIds, industryIds: f.industryIds || [], accountIds: f.accountIds || [],
      significance: significance(rule.family, strength, money, breadth),
      strength: strength, money: money, breadth: breadth,
      sources: f.sources && f.sources.length ? f.sources : (f.figures || []).map(function (g) { return g.cell.src; }),
      reportId: reportId, attach: reportId ? attach : [],
      highlight: { reportId: reportId, regionIds: regionIds, industryIds: f.industryIds || [], accountIds: f.accountIds || [],
        quadrant: f.quadrant || null, mark: reportId ? rule.highlight || null : null },
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

  function bySignificance(a, b) { return b.significance - a.significance || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }

  /* ---------- the cached list and what is built on it ---------- */

  // Worked out once per data file; a reload (a new plan object) or a change to the rules or weights recomputes it.
  function key() {
    return JSON.stringify([rules().map(function (r) { return [r.id, r.enabled, r.params]; }), settings(), Object.keys(code)]);
  }
  function state() {
    var plan = TAP.data.plan(), k = key();
    if (!cache || cache.plan !== plan || cache.key !== k) {
      cache = { plan: plan, key: k };
      var res = run();
      cache.list = res.list;
      cache.failures = res.failures;
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

  // Insights about regions in the comparison scope, hidden ones left out, the focus region's first.
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
    if (!focus) return list;
    var mine = list.filter(function (x) { return x.regionIds.indexOf(focus) >= 0; });
    return mine.concat(list.filter(function (x) { return x.regionIds.indexOf(focus) < 0; }));
  }

  function top(cmp, reportId, n) {
    var max = n != null ? n : settings().panelMax || 3;
    return ranked(cmp, { reportId: reportId }).slice(0, max);
  }

  function reset() { cache = null; }

  /* ---------- helpers for the rule files (ctx.util) ---------- */

  // Every figure comes from the measure catalogue, so insight figures match the charts exactly.
  var util = {
    regions: function () { return TAP.data.regions().map(function (r) { return r.id; }); },
    name: function (id) { return TAP.content.regionName(TAP.data.region(id)); },
    industry: function (id) { var d = TAP.data.industry(id); return d ? d.name : id; },
    rated: function () { return TAP.data.industries({ rated: true }).map(function (d) { return d.id; }); },
    m: function (id, regionId, ctx) { return TAP.measures.get(id)(regionId, Object.assign({ year: null }, ctx || {})); },
    // The organization total, as the charts combine it.
    org: function (id, ctx) {
      return TAP.measures.combined(id, { kind: 'combined', regionIds: util.regions(), how: 'total' }, Object.assign({ year: null }, ctx || {}));
    },
    // The other regions' figure, combined by the US-1.2.5 rules (weighted averages for rates).
    others: function (id, regionId, ctx, ids) {
      var rest = (ids || util.regions()).filter(function (r) { return r !== regionId; });
      return TAP.measures.combined(id, { kind: 'combined', regionIds: rest, how: 'average' }, Object.assign({ year: null }, ctx || {}));
    },
    value: function (c) { return c && c.state === 'value' && isNum(c.v) ? c.v : null; },
    provided: function (c) { return !!c && c.state === 'value' && c.v != null; },
    phrase: function (path, vars) {
      var s = path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, wording().phrases);
      return s == null ? '[' + path + ']' : fill(s, vars);
    },
    fig: function (what, where, cell) { return { label: util.phrase('figure', { what: what, where: where }), cell: cell }; },
    label: function (measureId) { var m = TAP.measures.meta(measureId); return m ? m.label : measureId; },
    money: function (v) { return TAP.format.money(v); },
    pct: function (v) { return TAP.format.pct(v); },
    num: function (v, d) { return TAP.format.num(v, d == null ? null : { decimals: d }); },
    ratio: function (v) { return TAP.format.num(Math.round(v * 10) / 10) + '×'; },
    list: function (items) { return TAP.format.list(items); },
    // Strength: 0 at the threshold's starting point, 1 when a value sits twice as far past it as the threshold.
    shareStrength: function (share, threshold) { return clamp(share / (2 * threshold)); },
    ratioStrength: function (ratio, threshold) { return clamp((ratio - 1) / (2 * (threshold - 1))); },
    // Money at stake: the share of the organization's current ARR (or pipeline) an amount stands for.
    moneyShare: function (amount, base) {
      var total = util.value(util.org(base === 'pipeline' ? 'base.pipeline' : 'base.arr'));
      return total > 0 && isNum(amount) ? clamp(amount / total) : 0;
    },
    clamp: clamp
  };

  TAP.insights = { defineRule: defineRule, all: all, ranked: ranked, top: top, hide: hide, unhide: unhide, hidden: hidden,
    failures: failures, reset: reset, significance: significance, util: util };
})(window.TAP);
