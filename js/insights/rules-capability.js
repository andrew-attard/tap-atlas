/*
 * File: js/insights/rules-capability.js
 * Purpose: Insight rules on industries regions find attractive but don't yet feel able to win (US-1.7.9): the
 *          gaps several regions share, and each region's own list, with the success factors its leader named.
 * Provides: insight rules for the 'capability' family (via TAP.insights.defineRule): notYetWinnable, notYetList
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, js/engine/scores.js, js/core/data.js
 *             (success factors)
 * Used by: js/insights/engine.js
 */
(function (TAP) {
  'use strict';

  // Scores for one region and industry, and whether they land in the attractive, not-yet-able quadrant.
  function scored(r, id) {
    var a = TAP.scores.attractiveness(r, id), b = TAP.scores.ability(r, id);
    return { r: r, id: id, a: a, b: b, both: a.state === 'value' && b.state === 'value',
      notYet: TAP.scores.quadrant(a, b) === 'attractiveNotYet' };
  }

  function scoreFigures(u, x, where) {
    return [u.fig('ind.attractiveness', where, x.a), u.fig('ind.ability', where, x.b)];
  }

  // The success factors the region's new business rows name for an industry: the leader's own view of what's needed.
  function factors(u, r, id) {
    var seen = {}, out = [];
    (TAP.data.region(r).newBusiness || []).forEach(function (row) {
      var v = row.industryId === id && typeof row.successFactors === 'string' ? row.successFactors.trim() : '';
      if (!v || seen[v]) return;
      seen[v] = true;
      out.push(u.figure(u.phrase('successFactors', { region: u.name(r) }),
        { v: v, state: 'value', kind: 'IN', src: { regionId: r, section: 'newBusiness', field: 'successFactors',
          row: row.sourceRow, rows: [row.sourceRow], year: null, cell: null, kind: 'IN' } }, 'text'));
    });
    return out;
  }

  function arrShare(u, pairs) {
    var sum = 0;
    pairs.forEach(function (x) { sum += u.value(u.m('ind.currentArr', x.r, { industryId: x.id })) || 0; });
    return u.moneyShare(sum, 'arr');
  }

  TAP.insights.defineRule('notYetWinnable', function (ctx) {
    var u = ctx.util, min = ctx.params.minRegions || 3;
    return u.rated().map(function (id) {
      var all = u.regions().map(function (r) { return scored(r, id); });
      var hits = all.filter(function (x) { return x.notYet; });
      if (hits.length < min) return null;
      var figures = [];
      hits.forEach(function (x) { figures = figures.concat(scoreFigures(u, x, u.name(x.r))); });
      hits.forEach(function (x) { figures = figures.concat(factors(u, x.r, id)); });
      var provided = all.filter(function (x) { return x.both; }).length;
      return { key: id, regionIds: hits.map(function (x) { return x.r; }), industryIds: [id], quadrant: 'attractiveNotYet',
        vars: { n: hits.length, industry: u.industry(id) }, figures: figures,
        strength: u.shareStrength(hits.length / Math.max(provided, 1), min / Math.max(provided, 1)), money: arrShare(u, hits) };
    }).filter(Boolean);
  });

  // Each region's own list. Halved strength keeps the gaps several regions share above the single-region lists.
  TAP.insights.defineRule('notYetList', function (ctx) {
    var u = ctx.util, min = ctx.params.minIndustries || 1, rated = u.rated();
    return u.regions().map(function (r) {
      var hits = rated.map(function (id) { return scored(r, id); }).filter(function (x) { return x.notYet; });
      if (hits.length < min) return null;
      var names = hits.map(function (x) { return u.industry(x.id); }), figures = [];
      hits.forEach(function (x) { figures = figures.concat(scoreFigures(u, x, u.industry(x.id))); });
      hits.forEach(function (x) { figures = figures.concat(factors(u, r, x.id)); });
      return { key: r, regionIds: [r], industryIds: hits.map(function (x) { return x.id; }), quadrant: 'attractiveNotYet',
        variant: hits.length === 1 ? 'one' : null,
        vars: { region: u.name(r), n: hits.length, industries: u.list(names) }, figures: figures,
        strength: 0.5 * hits.length / rated.length, money: arrShare(u, hits) };
    }).filter(Boolean);
  });
})(window.TAP);
