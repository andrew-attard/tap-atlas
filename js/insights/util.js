/*
 * File: js/insights/util.js
 * Purpose: The helpers every insight rule gets as ctx.util: region and industry names, catalogue figures (so insight
 *          figures match the charts), the other regions' combined figure, phrases from the wording guide, formatting,
 *          and the strength and money-at-stake scales (US-1.7.1, US-1.7.2).
 * Provides: TAP.insights.util
 * Depends on: js/insights/engine.js (TAP.insights), config/insight-rules.js, js/core/data.js, js/core/content.js,
 *             js/core/format.js, js/engine/measures.js (at call time)
 * Used by: js/insights/engine.js (ctx.util) and the rule files in js/insights/
 */
(function (TAP) {
  'use strict';

  function wording() { return (window.TAP_RULES && window.TAP_RULES.wording) || {}; }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function clamp(v) { return isNum(v) ? Math.max(0, Math.min(1, v)) : 0; }
  function fill(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? String(vars[k]) : m; });
  }

  // A phrase by path; a key may itself hold dots (measure ids), so the longest matching key wins.
  function lookup(obj, path) {
    if (obj == null) return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
    var i = path.indexOf('.');
    return i < 0 ? undefined : lookup(obj[path.slice(0, i)], path.slice(i + 1));
  }

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
      var s = lookup(wording().phrases, path);
      return s == null ? '[' + path + ']' : fill(s, vars);
    },
    // A figure from a catalogue measure: labelled "<measure>, <where>", with the unit (and rating field) to format it.
    fig: function (measureId, where, cell) {
      var m = TAP.measures.meta(measureId) || {};
      return util.figure(util.phrase('figure', { what: m.label || measureId, where: where }), cell, m.unit, m.scale, measureId);
    },
    // Any other figure (an account's growth, a segment share, a success factor), with its unit given.
    figure: function (label, cell, unit, field, measureId) {
      return { label: label, cell: cell, unit: unit || 'text', field: unit === 'rating' ? field || null : null,
        measureId: measureId || null };
    },
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

  TAP.insights.util = util;
})(window.TAP);
