/*
 * File: js/engine/scores.js
 * Purpose: Builds the attractiveness and ability-to-win scores from the leaders' ratings (US-1.5.5), and defines
 *          the per-industry measures (tier, the six ratings, the two scores, system figures, new business,
 *          commentary) in the measure registry.
 * Provides: TAP.scores (attractiveness, ability, quadrant); measures ind.* (registered with TAP.measures)
 * Depends on: js/core/data.js, config/settings.js, js/engine/measures.js (loads first)
 * Used by: measures, the quadrant chart, insights
 */
(function (TAP) {
  'use strict';

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function settings() { return (window.TAP_SETTINGS && window.TAP_SETTINGS.scores) || {}; }
  function mcRow(regionId, industryId) {
    return TAP.data.row(regionId, 'marketCoverage', function (d) { return d.industryId === industryId; });
  }
  function src(regionId, field, row, kind) {
    var n = row ? [row.sourceRow] : [];
    return { regionId: regionId, section: 'marketCoverage', field: field, row: row ? row.sourceRow : null, rows: n,
      year: null, cell: null, kind: kind };
  }
  function state(st, kind, s) { return { v: null, state: st, kind: kind, src: s }; }

  /* ---------- scores ---------- */

  // Weighted average of the ratings that make up a score. Unrated industries are not applicable; a blank
  // rating that carries weight makes the score not provided (never a guess).
  function score(which, regionId, industryId, weights) {
    var w = weights || settings()[which] || {};
    var ind = TAP.data.industry(industryId), row = mcRow(regionId, industryId);
    var s = src(regionId, which, row, 'APP');
    s.fields = Object.keys(w).filter(function (f) { return w[f] > 0; });
    if (!ind || ind.rated === false) return state('notApplicable', 'APP', s);
    if (!row || !s.fields.length) return state('notProvided', 'APP', s);
    var sw = 0, sv = 0;
    for (var i = 0; i < s.fields.length; i++) {
      var f = s.fields[i], v = row[f];
      if (!isNum(v)) return state('notProvided', 'APP', s);
      sv += v * w[f];
      sw += w[f];
    }
    return { v: sv / sw, state: 'value', kind: 'APP', src: s };
  }

  function attractiveness(regionId, industryId, weights) { return score('attractiveness', regionId, industryId, weights); }
  function ability(regionId, industryId, weights) { return score('ability', regionId, industryId, weights); }

  // The quadrant for two scores (numbers or cells). A score equal to the midpoint counts as attractive or able.
  function quadrant(a, b) {
    a = a && typeof a === 'object' ? (a.state === 'value' ? a.v : null) : a;
    b = b && typeof b === 'object' ? (b.state === 'value' ? b.v : null) : b;
    if (!isNum(a) || !isNum(b)) return null;
    var mid = isNum(settings().midpoint) ? settings().midpoint : 2;
    var att = a >= mid - 1e-9, able = b >= mid - 1e-9;   // tolerance: weighted sums can land a hair under 2.0
    if (att) return able ? 'attractiveAble' : 'attractiveNotYet';
    return able ? 'lessAttractiveAble' : 'lessBoth';
  }

  TAP.scores = { attractiveness: attractiveness, ability: ability, quadrant: quadrant };

  /* ---------- per-industry measures ---------- */

  var IND = ['industry'];

  // One field from the industry's Market Coverage row. ratedOnly: not applicable on rows the template never rates.
  function fieldCell(regionId, ctx, field, kind, ratedOnly) {
    var id = ctx && ctx.industryId, ind = id ? TAP.data.industry(id) : null, row = ind ? mcRow(regionId, id) : null;
    var s = src(regionId, field, row, kind);
    var unrated = ind && ind.rated === false;
    if (!ind || (ratedOnly && unrated)) return state('notApplicable', kind, s);
    var v = row ? row[field] : null;
    if (v == null || v === '') return state(unrated && kind === 'IN' ? 'notApplicable' : 'notProvided', kind, s);
    return { v: v, state: 'value', kind: kind, src: s };
  }

  function industryMeasure(id, meta, field, ratedOnly) {
    TAP.measures.define(id, meta, function (r, ctx) { return fieldCell(r, ctx, field, meta.kind, ratedOnly); });
  }

  industryMeasure('ind.tier', { unit: 'tier', valueKind: 'category', kind: 'IN', dims: IND }, 'tier', true);
  ['growthPotential', 'criticality', 'competitiveIntensity', 'references', 'expertise', 'productFit'].forEach(function (f) {
    industryMeasure('ind.' + f, { unit: 'rating', valueKind: 'rating', kind: 'IN', scale: f, dims: IND }, f, true);
  });
  industryMeasure('ind.currentArr', { unit: 'money', valueKind: 'amount', kind: 'PRE', dims: IND }, 'currentArr', false);
  industryMeasure('ind.pipeline', { unit: 'money', valueKind: 'amount', kind: 'PRE', dims: IND }, 'pipelineTotal', false);
  industryMeasure('ind.pipeline12m', { unit: 'money', valueKind: 'amount', kind: 'PRE', dims: IND }, 'pipelineCreated12m', false);
  industryMeasure('ind.commentary', { unit: 'text', valueKind: 'text', kind: 'IN', dims: IND }, 'commentary', false);

  ['attractiveness', 'ability'].forEach(function (which) {
    TAP.measures.define('ind.' + which, { unit: 'score', valueKind: 'rating', kind: 'APP', dims: IND }, function (r, ctx) {
      if (!ctx || !ctx.industryId) return state('notApplicable', 'APP', src(r, which, null, 'APP'));
      return score(which, r, ctx.industryId);
    });
  });

  // New business in one industry: exactly nb.arr for that industry, so the two can never disagree (D48).
  TAP.measures.define('ind.nb.arr', { unit: 'money', valueKind: 'amount', kind: 'DER', dims: ['industry', 'year'] }, function (r, ctx) {
    ctx = ctx || {};
    if (!ctx.industryId) return state('notApplicable', 'DER', { regionId: r, section: 'newBusiness', field: 'arrPotential', row: null,
      rows: [], year: ctx.year || null, cell: null, kind: 'DER' });
    return TAP.measures.get('nb.arr')(r, ctx);
  });
})(window.TAP);
