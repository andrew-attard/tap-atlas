/*
 * File: js/insights/rules-realism.js
 * Purpose: Insight rules that set ambition against the evidence in the plan (US-1.7.7): year-1 new business
 *          against recent pipeline, a priority industry's year-1 goal against its pipeline (D112), and wins needed
 *          against peers.
 *          The wording describes the step up; it never judges the plan.
 * Provides: insight rules for the 'realism' family (via TAP.insights.defineRule): pipelineCover, industryCover,
 *           winsVsPeers
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, the measure catalogue
 * Used by: js/insights/engine.js
 */
(function (TAP) {
  'use strict';

  TAP.insights.defineRule('pipelineCover', function (ctx) {
    var u = ctx.util, min = ctx.params.ratio;
    return u.regions().map(function (r) {
      var nb = u.m('nb.arr', r, { year: 1 }), pipe = u.m('base.pipeline12m', r);
      if (!(u.value(nb) > 0) || u.value(pipe) == null) return null;
      var none = pipe.v === 0, ratio = none ? null : nb.v / pipe.v;
      if (!none && ratio < min) return null;
      return { key: r, regionIds: [r], variant: none ? 'none' : null, measureId: 'amb.arr',
        vars: { region: u.name(r), nb: u.money(nb.v), pipeline: u.money(pipe.v), ratio: none ? '' : u.ratio(ratio) },
        figures: [u.fig('nb.arr', u.phrase('year1'), nb), u.fig('base.pipeline12m', u.name(r), pipe)],
        strength: none ? 1 : u.ratioStrength(ratio, min), money: u.moneyShare(nb.v, 'arr') };
    }).filter(Boolean);
  });

  // A Tier 1 or 2 industry's year-1 goal against its whole pipeline, or against the pipeline created there in the last
  // 12 months (D112). A blank pipeline is not zero, so it never fires; no pipeline at all is the 'none' variant.
  TAP.insights.defineRule('industryCover', function (ctx) {
    var u = ctx.util, p = ctx.params, out = [];
    u.regions().forEach(function (r) {
      u.rated().forEach(function (id) {
        var at = { industryId: id }, t = u.value(u.m('ind.tier', r, at));
        if (t !== 1 && t !== 2) return;
        var goal = u.m('ind.nb.arr', r, { industryId: id, year: 1 }), pipe = u.m('ind.pipeline', r, at), p12 = u.m('ind.pipeline12m', r, at);
        if (!(u.value(goal) >= p.minGoal) || !u.provided(pipe)) return;
        var g = goal.v, made = u.value(p12), variant = pipe.v === 0 ? 'none' : g > pipe.v ? 'above' : null;
        if (!variant && !(made > 0 && g / made >= p.ratio - 1e-9)) return;
        var name = u.industry(id), byMade = !variant, ratio = byMade ? g / made : variant === 'above' ? g / pipe.v : null;
        var figures = [u.fig('ind.nb.arr', name + ', ' + u.phrase('year1'), goal), u.fig('ind.pipeline', name, pipe)];
        if (u.provided(p12)) figures.push(u.fig('ind.pipeline12m', name, p12));
        out.push({ key: r + ':' + id, regionIds: [r], industryIds: [id], variant: variant, measureId: p.measure || null,
          vars: { region: u.name(r), industry: name, goal: u.money(g), pipeline: u.money(byMade ? made : pipe.v), ratio: byMade ? u.ratio(ratio) : '' },
          figures: figures, money: u.moneyShare(g, 'arr'),
          strength: variant === 'none' ? 1 : variant === 'above' ? u.clamp(0.6 + 0.4 * (ratio - 1)) : u.ratioStrength(ratio, p.ratio) });
      });
    });
    return out;
  });

  // Implied wins against the simple average of the other regions (wins are a count, so they average plainly).
  TAP.insights.defineRule('winsVsPeers', function (ctx) {
    var u = ctx.util, min = ctx.params.ratio;
    var cells = {};
    u.regions().forEach(function (r) { cells[r] = u.m('nb.wins', r); });
    var provided = u.regions().filter(function (r) { return u.value(cells[r]) != null; });
    return provided.map(function (r) {
      var avg = u.others('nb.wins', r), a = u.value(avg), v = cells[r].v;
      if (!(a > 0) || v / a < min) return null;
      return { key: r, regionIds: [r], provided: provided.length, measureId: ctx.params.measure || null,
        vars: { region: u.name(r), ratio: u.ratio(v / a), wins: u.num(v, 0), avg: u.num(a, 0) },
        figures: [u.fig('nb.wins', u.name(r), cells[r]),
          u.fig('nb.wins', u.phrase('othersAvg', { n: provided.length - 1 }), avg)],
        strength: u.ratioStrength(v / a, min), money: u.moneyShare(u.value(u.m('nb.arr', r)) || 0, 'arr') };
    }).filter(Boolean);
  });
})(window.TAP);
