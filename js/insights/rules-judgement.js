/*
 * File: js/insights/rules-judgement.js
 * Purpose: Insight rules where leader ratings and system figures tell different stories (US-1.7.5): a strong
 *          rating with nothing in the system, a weak rating where the region holds a lot, and tiers that differ
 *          from where the pipeline is. The sentences end in a question, never a verdict.
 * Provides: insight rules for the 'judgement' family (via TAP.insights.defineRule): strongRating, weakRating,
 *           tierVsPipeline, priorityNoPipeline
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, the measure catalogue
 * Used by: js/insights/engine.js
 */
(function (TAP) {
  'use strict';

  var ABILITY = ['references', 'expertise', 'productFit'];

  // Calls fn(regionId, industryId, cellOf) for every rated industry of every region.
  function each(u, fn) {
    var out = [];
    u.regions().forEach(function (r) {
      u.rated().forEach(function (id) {
        var cellOf = function (m) { return u.m(m, r, { industryId: id }); };
        var f = fn(r, id, cellOf);
        if (f) out.push(f);
      });
    });
    return out;
  }

  function ratingsAt(u, cellOf, score) {
    return ABILITY.filter(function (f) { return u.value(cellOf('ind.' + f)) === score; });
  }
  function ratingFigures(u, list, cellOf, industry) {
    return list.map(function (f) { return u.fig('ind.' + f, industry, cellOf('ind.' + f)); });
  }
  function ratingWords(u, list) { return u.list(list.map(function (f) { return u.phrase('ratings.' + f); })); }

  TAP.insights.defineRule('strongRating', function (ctx) {
    var u = ctx.util, max = ctx.params.maxAmount || 0;
    return each(u, function (r, id, cellOf) {
      var arr = cellOf('ind.currentArr'), pipe = cellOf('ind.pipeline');
      if (!u.provided(arr) || !u.provided(pipe) || arr.v > max || pipe.v > max) return null;   // a blank is not zero
      var strong = ratingsAt(u, cellOf, 3);
      if (!strong.length) return null;
      var name = u.industry(id);
      return { key: r + ':' + id, regionIds: [r], industryIds: [id], variant: arr.v || pipe.v ? 'little' : null,
        vars: { region: u.name(r), ratings: ratingWords(u, strong), industry: name, arr: u.money(arr.v), pipeline: u.money(pipe.v) },
        figures: ratingFigures(u, strong, cellOf, name).concat([u.fig('ind.currentArr', name, arr), u.fig('ind.pipeline', name, pipe)]),
        strength: 0.5 + 0.25 * (strong.length - 1), money: 0 };
    });
  });

  // Where an industry ranks in its region by a figure: 1 is the largest. Only rated industries are compared.
  function rankOf(u, r, measure, industryId, v) {
    return 1 + u.rated().filter(function (id) {
      return id !== industryId && (u.value(u.m(measure, r, { industryId: id })) || 0) > v;
    }).length;
  }

  TAP.insights.defineRule('weakRating', function (ctx) {
    var u = ctx.util, top = ctx.params.rank || 3;
    return each(u, function (r, id, cellOf) {
      var weak = ratingsAt(u, cellOf, 1);
      if (!weak.length) return null;
      var best = null;
      [['arr', 'ind.currentArr'], ['pipeline', 'ind.pipeline']].forEach(function (w) {
        var c = cellOf(w[1]), v = u.value(c);
        if (!(v > 0)) return;
        var rank = rankOf(u, r, w[1], id, v);
        if (rank <= top && (!best || rank < best.rank)) best = { what: w[0], measure: w[1], cell: c, rank: rank };
      });
      if (!best) return null;
      var name = u.industry(id);
      return { key: r + ':' + id, regionIds: [r], industryIds: [id],
        vars: { region: u.name(r), ratings: ratingWords(u, weak), industry: name, rank: u.phrase('rank.' + best.rank),
          what: u.phrase('what.' + best.what), amount: u.money(best.cell.v) },
        figures: ratingFigures(u, weak, cellOf, name).concat([u.fig(best.measure, name, best.cell)]),
        strength: (0.5 + 0.25 * (weak.length - 1)) * (1 - (best.rank - 1) / (2 * Math.max(top - 1, 1))),
        money: u.moneyShare(best.cell.v, best.what) };
    });
  });

  TAP.insights.defineRule('tierVsPipeline', function (ctx) {
    var u = ctx.util, min = ctx.params.share;
    return each(u, function (r, id, cellOf) {
      var tier = cellOf('ind.tier'), pipe = cellOf('ind.pipeline'), all = u.m('base.pipeline', r);
      if (u.value(tier) !== 3 || !(u.value(pipe) > 0) || !(u.value(all) > 0)) return null;
      var share = pipe.v / all.v;
      if (share < min) return null;
      var name = u.industry(id);
      return { key: r + ':' + id, regionIds: [r], industryIds: [id],
        vars: { region: u.name(r), industry: name, share: u.pct(share), amount: u.money(pipe.v) },
        figures: [u.fig('ind.tier', name, tier), u.fig('ind.pipeline', name, pipe),
          u.fig('base.pipeline', u.phrase('allIndustries'), all)],
        strength: u.shareStrength(share, min), money: u.moneyShare(pipe.v, 'pipeline') };
    });
  });

  TAP.insights.defineRule('priorityNoPipeline', function (ctx) {
    var u = ctx.util;
    return each(u, function (r, id, cellOf) {
      var tier = cellOf('ind.tier'), pipe = cellOf('ind.pipeline'), t = u.value(tier);
      if ((t !== 1 && t !== 2) || !u.provided(pipe) || pipe.v !== 0) return null;
      var name = u.industry(id), nb = cellOf('ind.nb.arr');
      var figures = [u.fig('ind.tier', name, tier), u.fig('ind.pipeline', name, pipe)];
      if (u.value(nb) > 0) figures.push(u.fig('ind.nb.arr', name, nb));
      return { key: r + ':' + id, regionIds: [r], industryIds: [id], vars: { region: u.name(r), industry: name, tier: t },
        figures: figures, strength: t === 1 ? 0.6 : 0.5, money: u.moneyShare(u.value(nb) || 0, 'arr') };
    });
  });
})(window.TAP);
