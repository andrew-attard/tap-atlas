/*
 * File: js/insights/rules-priorities.js
 * Purpose: Insight rules on where regions agree and disagree about industry priorities (US-1.7.4): consensus,
 *          split, and group priorities that a region's own ratings place in the less able or less attractive half.
 * Provides: insight rules for the 'priorities' family (via TAP.insights.defineRule): consensus, split, groupPriority
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, the measure catalogue
 * Used by: js/insights/engine.js
 */
(function (TAP) {
  'use strict';

  // Each region's tier for an industry. A blank tier is left out, never read as Tier 3.
  function tiers(u, industryId) {
    var t = { provided: [], cells: [], 1: [], 2: [], 3: [] };
    u.regions().forEach(function (r) {
      var c = u.m('ind.tier', r, { industryId: industryId });
      if (!u.provided(c) || !t[c.v]) return;
      t.provided.push(r);
      t[c.v].push(r);
      t.cells.push(u.fig('ind.tier', u.name(r), c));
    });
    return t;
  }

  // Money at stake: the industry's pipeline or current ARR in the regions involved, as a share of the organization's,
  // whichever share is larger. It sets apart priorities that otherwise score alike, such as two even splits.
  function arrShare(u, industryId, regionIds) {
    var pipe = 0, arr = 0;
    regionIds.forEach(function (r) {
      pipe += u.value(u.m('ind.pipeline', r, { industryId: industryId })) || 0;
      arr += u.value(u.m('ind.currentArr', r, { industryId: industryId })) || 0;
    });
    return Math.max(u.moneyShare(pipe, 'pipeline'), u.moneyShare(arr, 'arr'));
  }

  function inOrder(u, ids) { return u.regions().filter(function (r) { return ids.indexOf(r) >= 0; }); }

  // Tier 1 or 2 in at least ceil(share x regions that gave a tier): 5 of 7, 4 of 5, 3 of 4...
  TAP.insights.defineRule('consensus', function (ctx) {
    var u = ctx.util, p = ctx.params, total = u.regions().length;
    return u.rated().map(function (id) {
      if (p.skipGroupPriority && TAP.data.industry(id).groupPriority) return null;
      var t = tiers(u, id), n = t.provided.length, hi = inOrder(u, t[1].concat(t[2]));
      if (!n || hi.length < Math.ceil(p.share * n - 1e-9)) return null;
      return { key: id, regionIds: hi, industryIds: [id], provided: n,
        variant: n < total ? 'gaps' : hi.length === n ? 'all' : null,
        vars: { industry: u.industry(id), n: hi.length, total: n },
        figures: t.cells, strength: u.shareStrength(hi.length / n, p.share), money: arrShare(u, id, hi) };
    }).filter(Boolean);
  });

  // Tiers spread over all three, or two groups that differ by at most evenGap regions (each of two or more).
  TAP.insights.defineRule('split', function (ctx) {
    var u = ctx.util, p = ctx.params;
    return u.rated().map(function (id) {
      var t = tiers(u, id), n = t.provided.length;
      var used = [1, 2, 3].filter(function (k) { return t[k].length; });
      var three = used.length === 3;
      var a = used.length === 2 ? t[used[0]].length : 0, b = used.length === 2 ? t[used[1]].length : 0;
      var even = used.length === 2 && Math.min(a, b) >= 2 && Math.abs(a - b) <= p.evenGap;
      if (!three && !even) return null;
      var parts = used.map(function (k, i) { return u.phrase(i ? 'splitNext' : 'splitFirst', { n: t[k].length, tier: k }); });
      return { key: id, regionIds: t.provided, industryIds: [id], provided: n,
        vars: { industry: u.industry(id), parts: u.list(parts) },
        figures: t.cells, strength: three ? 1 : 0.5 * (1 - Math.abs(a - b) / n), money: arrShare(u, id, t.provided) };
    }).filter(Boolean);
  });

  // A group priority that regions' own scores place below the midpoint. Low ability is reported first; a region
  // low only on attractiveness gets its own finding, so one region is never counted twice.
  TAP.insights.defineRule('groupPriority', function (ctx) {
    var u = ctx.util, p = ctx.params, mid = (ctx.settings.scores || {}).midpoint || 2;
    var out = [];
    u.rated().forEach(function (id) {
      if (!TAP.data.industry(id).groupPriority) return;
      var low = { ability: [], attractiveness: [] }, provided = 0;
      u.regions().forEach(function (r) {
        var a = TAP.scores.attractiveness(r, id), b = TAP.scores.ability(r, id);
        if (u.provided(b)) provided++;
        if (u.provided(b) && b.v < mid - 1e-9) low.ability.push({ r: r, c: b });
        else if (u.provided(a) && a.v < mid - 1e-9) low.attractiveness.push({ r: r, c: a });
      });
      ['ability', 'attractiveness'].forEach(function (which) {
        var list = low[which], n = list.length;
        if (n < Math.max(1, p.minRegions)) return;
        var ids = list.map(function (x) { return x.r; });
        var depth = list.reduce(function (s, x) { return s + (mid - x.c.v) / (mid - 1); }, 0) / n;
        out.push({ key: id + ':' + which, regionIds: ids, industryIds: [id],
          variant: which === 'ability' ? (n === 1 ? 'abilityOne' : null) : (n === 1 ? 'attractivenessOne' : 'attractiveness'),
          vars: { industry: u.industry(id), n: n, region: u.name(ids[0]) },
          figures: list.map(function (x) { return u.fig('ind.' + which, u.name(x.r), x.c); }),
          strength: 0.5 * n / Math.max(provided, 1) + 0.5 * depth, money: arrShare(u, id, ids) });
      });
    });
    return out;
  });
})(window.TAP);
