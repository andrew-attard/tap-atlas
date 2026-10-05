/*
 * File: js/insights/rules-realism.js
 * Purpose: Insight rules that set ambition against the evidence in the plan (US-1.7.7): year-1 new business
 *          against recent pipeline, new business where there is no pipeline, and wins needed against peers.
 *          The wording describes the step up; it never judges the plan.
 * Provides: insight rules for the 'realism' family (via TAP.insights.defineRule): pipelineCover, noPipeline, winsVsPeers
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

  // New business planned in an industry with no pipeline at all. A blank pipeline is not zero, so it never fires.
  TAP.insights.defineRule('noPipeline', function (ctx) {
    var u = ctx.util, out = [];
    u.regions().forEach(function (r) {
      var total = u.value(u.m('nb.arr', r));
      u.rated().forEach(function (id) {
        var nb = u.m('ind.nb.arr', r, { industryId: id }), pipe = u.m('ind.pipeline', r, { industryId: id });
        if (!(u.value(nb) > 0) || !u.provided(pipe) || pipe.v !== 0) return;
        var name = u.industry(id), share = total > 0 ? nb.v / total : 0;
        out.push({ key: r + ':' + id, regionIds: [r], industryIds: [id], measureId: ctx.params.measure || null,
          vars: { region: u.name(r), industry: name, nb: u.money(nb.v) },
          figures: [u.fig('ind.nb.arr', name, nb), u.fig('ind.pipeline', name, pipe)],
          strength: 0.5 + 0.5 * u.clamp(share / 0.2), money: u.moneyShare(nb.v, 'arr') });
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
