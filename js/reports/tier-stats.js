/*
 * File: js/reports/tier-stats.js
 * Purpose: Tier agreement figures per industry (counts, spread, sort orders), shared by the tier grid and the views.
 * Provides: TAP.tierStats (forIndustry, all, mostSplit, plIndex, SORTS)
 * Depends on: js/engine/measures.js, js/core/data.js
 * Used by: js/reports/tier-grid.js, js/views/industry.js
 */
(function (TAP) {
  'use strict';
  function tierCell(regionId, industryId) { return TAP.measures.get('ind.tier')(regionId, { industryId: industryId }); }

  /* ---------- tier statistics (also used by the view for its default industry) ---------- */

  // How the given regions placed one industry: counts per tier, blanks, and how far they agree.
  function forIndustry(industryId, regionIds) {
    var n = { 1: 0, 2: 0, 3: 0 }, np = [], sum = 0;
    regionIds.forEach(function (r) {
      var c = tierCell(r, industryId);
      if (c.state === 'value' && n[c.v] != null) { n[c.v]++; sum += c.v; } else if (c.state === 'notProvided') np.push(r);
    });
    var provided = n[1] + n[2] + n[3], top = Math.max(n[1], n[2], n[3]);
    return { industryId: industryId, n: n, np: np, provided: provided, mean: provided ? sum / provided : null,
      share: provided ? top / provided : 1, distinct: [1, 2, 3].filter(function (x) { return n[x] > 0; }).length };
  }

  function all(regionIds) {
    return TAP.data.industries({ rated: true }).map(function (ind, i) { return Object.assign(forIndustry(ind.id, regionIds), { idx: i, ind: ind }); });
  }

  /* ---------- sorts ---------- */

  function plIndex(id) {
    var pls = (TAP.data.lookups().productLines || []).map(function (p) { return p.id; }), i = pls.indexOf(id);
    return i < 0 ? pls.length : i;
  }
  function meanOf(s) { return s.mean == null ? 9 : s.mean; }
  var SORTS = {
    // Group priorities first, then the industries regions placed highest on average.
    groupPriority: function (a, b) { return (b.ind.groupPriority ? 1 : 0) - (a.ind.groupPriority ? 1 : 0) || meanOf(a) - meanOf(b) || a.idx - b.idx; },
    // Largest share of regions on one tier first.
    agreement: function (a, b) {
      return b.share - a.share || b.provided - a.provided || (b.ind.groupPriority ? 1 : 0) - (a.ind.groupPriority ? 1 : 0) || a.idx - b.idx;
    },
    // Smallest share on one tier first, then more distinct tiers.
    disagreement: function (a, b) { return a.share - b.share || b.distinct - a.distinct || a.idx - b.idx; },
    productLine: function (a, b) { return plIndex(a.ind.productLine) - plIndex(b.ind.productLine) || SORTS.groupPriority(a, b); }
  };

  // The industry regions disagree on most (the ratings panel's default, US-1.5.6).
  function mostSplit(regionIds) { var list = all(regionIds).sort(SORTS.disagreement); return list.length ? list[0].industryId : null; }

  TAP.tierStats = { forIndustry: forIndustry, all: all, mostSplit: mostSplit, plIndex: plIndex, SORTS: SORTS };
})(window.TAP);
