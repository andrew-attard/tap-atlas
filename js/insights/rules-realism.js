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
  function covers(u, p, r, id) {
    var at = { industryId: id }, t = u.value(u.m('ind.tier', r, at));
    if (t !== 1 && t !== 2) return null;
    var goal = u.m('ind.nb.arr', r, { industryId: id, year: 1 }), pipe = u.m('ind.pipeline', r, at), p12 = u.m('ind.pipeline12m', r, at);
    if (!(u.value(goal) >= p.minGoal) || !u.provided(pipe)) return null;
    var g = goal.v, made = u.value(p12), variant = pipe.v === 0 ? 'none' : g > pipe.v ? 'above' : 'created';
    if (variant === 'created' && !(made > 0 && g / made >= p.ratio - 1e-9)) return null;
    var ratio = variant === 'created' ? g / made : variant === 'above' ? g / pipe.v : null;
    return { id: id, name: u.industry(id), variant: variant, goal: goal, g: g, pipe: pipe, p12: p12, against: variant === 'created' ? made : pipe.v,
      strength: variant === 'none' ? 1 : variant === 'above' ? u.clamp(0.6 + 0.4 * (ratio - 1)) : u.ratioStrength(ratio, p.ratio), ratio: ratio };
  }
  var RANK = { none: 3, above: 2, created: 1 };
  // One insight per region (D121): one industry reads as before; two or more read as one sentence for the region, worded
  // by the strongest variant among them, counting every one and naming the two with the largest goals.
  TAP.insights.defineRule('industryCover', function (ctx) {
    var u = ctx.util, p = ctx.params;
    return u.regions().map(function (r) {
      var hit = u.rated().map(function (id) { return covers(u, p, r, id); }).filter(Boolean);
      if (!hit.length) return null;
      var f = { key: r, regionIds: [r], industryIds: hit.map(function (x) { return x.id; }), measureId: p.measure || null,
        money: u.moneyShare(hit.reduce(function (t, x) { return t + x.g; }, 0), 'arr'),
        strength: Math.max.apply(null, hit.map(function (x) { return x.strength; })) };
      if (hit.length === 1) {
        var x = hit[0];
        f.variant = x.variant === 'created' ? null : x.variant;
        f.vars = { region: u.name(r), industry: x.name, goal: u.money(x.g), pipeline: u.money(x.against), ratio: x.ratio && x.variant === 'created' ? u.ratio(x.ratio) : '' };
        f.figures = [u.fig('ind.nb.arr', x.name + ', ' + u.phrase('year1'), x.goal), u.fig('ind.pipeline', x.name, x.pipe)];
        if (u.provided(x.p12)) f.figures.push(u.fig('ind.pipeline12m', x.name, x.p12));
        return f;
      }
      var top = hit.slice().sort(function (a, b) { return RANK[b.variant] - RANK[a.variant]; })[0].variant;
      var named = hit.slice().sort(function (a, b) { return b.g - a.g; }).slice(0, 2);
      f.variant = { none: 'manyNone', above: 'manyAbove', created: 'many' }[top];
      f.vars = { region: u.name(r), n: hit.length, k: hit.filter(function (x) { return x.variant === top; }).length, ratio: u.ratio(p.ratio),
        industries: u.list(named.map(function (x) {
          return u.phrase(x.variant === 'none' ? 'cover.namedNone' : 'cover.named', { industry: x.name, goal: u.money(x.g), pipeline: u.money(x.against) });
        })) };
      f.figures = [];
      named.forEach(function (x) {
        f.figures.push(u.fig('ind.nb.arr', x.name + ', ' + u.phrase('year1'), x.goal));
        f.figures.push(x.variant === 'created' ? u.fig('ind.pipeline12m', x.name, x.p12) : u.fig('ind.pipeline', x.name, x.pipe));
      });
      return f;
    }).filter(Boolean);
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
