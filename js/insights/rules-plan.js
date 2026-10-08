/*
 * File: js/insights/rules-plan.js
 * Purpose: Channel reliance (US-2.5.2) and plan make-up (US-2.5.5) insight rules: a region whose channel mix, or whose
 *          split between new business and existing customers, sits far from the other regions'; and services growth
 *          beyond what partners deliver (D112).
 * Provides: insight rules for the 'plan' family (via TAP.insights.defineRule): channelReliance, planMakeup,
 *           servicesDelivery
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, js/engine/measures-p2.js (rc.share.*,
 *             rc.all.oi.*, rc.all.services, amb.nbShare), js/core/data.js (the channel list, partners' servicesFromPartners)
 * Used by: js/insights/engine.js
 *
 * "Elsewhere" is the other regions' combined figure, their summed parts over their summed totals, as the charts'
 * "rest" bar shows it (D69). Only regions that provide the figure take part, on both sides of the comparison.
 */
(function (TAP) {
  'use strict';

  var SLACK = 1e-9;   // a gap of exactly the threshold counts, whatever the floating-point rounding

  // The region's figure, the others' combined figure, and the gap between them.
  function compare(u, measureId, r, ids) {
    var mine = u.m(measureId, r), rest = u.others(measureId, r, null, ids);
    if (u.value(mine) === null || u.value(rest) === null) return null;
    return { id: measureId, mine: mine, rest: rest, gap: mine.v - rest.v };
  }
  function figures(u, c, r, n) {
    return [u.fig(c.id, u.name(r), c.mine), u.fig(c.id, u.phrase('othersAvg', { n: n }), c.rest)];
  }
  function channelWords(u, id) {
    var said = u.phrase('channel.' + id);
    if (said.charAt(0) !== '[') return said;
    var ch = ((TAP.data.lookups() || {}).channels || []).filter(function (c) { return c.id === id; })[0];
    return ch ? ch.name : id;
  }

  // One finding per region: the channel furthest from the others, when that gap reaches the threshold.
  TAP.insights.defineRule('channelReliance', function (ctx) {
    var u = ctx.util, p = ctx.params;
    var channels = ((TAP.data.lookups() || {}).channels || []).map(function (c) { return c.id; });
    if (!channels.length) return [];
    // Only regions whose share is whole for every channel take part: a blank recap item would shift every share
    var ids = u.regions().filter(function (r) {
      return channels.every(function (c) { var s = u.m('rc.share.' + c, r); return u.value(s) !== null && !s.partial; });
    });
    if (ids.length < 2) return [];
    return ids.map(function (r) {
      var best = null;
      channels.forEach(function (c) {
        var x = compare(u, 'rc.share.' + c, r, ids);
        if (x && (!best || Math.abs(x.gap) > Math.abs(best.gap))) { best = x; best.channel = c; }
      });
      if (!best || Math.abs(best.gap) < p.gap - SLACK) return null;
      var amount = u.value(u.m('rc.all.oi.' + best.channel, r)) || 0;
      return { key: r + ':' + best.channel, regionIds: [r], provided: ids.length, measureId: 'rc.all.oi',
        vars: { region: u.name(r), share: u.pct(best.mine.v), channel: channelWords(u, best.channel), avg: u.pct(best.rest.v) },
        figures: figures(u, best, r, ids.length - 1),
        strength: u.clamp(Math.abs(best.gap) / (2 * p.gap)), money: u.moneyShare(amount, 'arr') };
    }).filter(Boolean);
  });

  // Regions without both new business and customer growth give no share, so they are left out of both sides.
  TAP.insights.defineRule('planMakeup', function (ctx) {
    var u = ctx.util, p = ctx.params;
    var ids = u.regions().filter(function (r) { var c = u.m('amb.nbShare', r); return u.value(c) !== null && !c.partial; });
    if (ids.length < 2) return [];
    return ids.map(function (r) {
      var x = compare(u, 'amb.nbShare', r, ids);
      if (!x || Math.abs(x.gap) < p.gap - SLACK) return null;
      var amb = u.m('amb.arr', r);
      // A region left out is said in the sentence, since the chart's rest bar still counts it (D79)
      return { key: r, regionIds: [r], provided: ids.length, measureId: 'amb.arr', variant: ids.length < u.regions().length ? 'gaps' : null,
        vars: { region: u.name(r), share: u.pct(x.mine.v), avg: u.pct(x.rest.v) },
        figures: figures(u, x, r, ids.length - 1).concat([u.fig('nb.arr', u.name(r), u.m('nb.arr', r)),
          u.fig('cg.arr', u.name(r), u.m('cg.arr', r))]),
        strength: u.clamp(Math.abs(x.gap) / (2 * p.gap)), money: u.moneyShare(u.value(amb) || 0, 'arr') };
    }).filter(Boolean);
  });

  // The services a region's partners deliver themselves in plan year 3 (servicesFromPartners, Phase 4), summed over the
  // partners that give it; null when none does, so a region without the figures gives no finding.
  function delivered(r) {
    var k = TAP.measures.kit, given = ((TAP.data.region(r) || {}).partners || []).filter(function (x) {
      return Array.isArray(x.servicesFromPartners) && k.isNum(x.servicesFromPartners[2]);
    });
    if (!given.length) return null;
    var v = given.reduce(function (t, x) { return t + x.servicesFromPartners[2]; }, 0);
    return k.cell(v, 'DER', k.src(r, 'partners', 'servicesFromPartners', given.map(function (x) { return x.sourceRow; }), 3, 'DER'));
  }

  // Services order intake (the recap, both motions) growing strongly from year 1 to year 3, while partners deliver
  // little of year 3: the rest falls to the region's own consultants, whom the template does not count (D112, D113).
  TAP.insights.defineRule('servicesDelivery', function (ctx) {
    var u = ctx.util, p = ctx.params;
    return u.regions().map(function (r) {
      var y1 = u.m('rc.all.services', r, { year: 1 }), y3 = u.m('rc.all.services', r, { year: 3 }), d = delivered(r);
      if (!d || !(u.value(y1) > 0) || !(u.value(y3) > 0)) return null;
      var growth = y3.v / y1.v - 1, share = d.v / y3.v;
      if (growth < p.growth - SLACK || share >= p.partnerShare - SLACK) return null;
      return { key: r, regionIds: [r], measureId: 'rc.all.services',
        vars: { region: u.name(r), y1: u.money(y1.v), y3: u.money(y3.v), growth: u.pct(growth), delivered: u.money(d.v), share: u.pct(share) },
        figures: [u.fig('rc.all.services', u.name(r) + ', ' + u.phrase('year1'), y1), u.fig('rc.all.services', u.name(r) + ', ' + u.phrase('cover.year3'), y3),
          u.figure(u.phrase('cover.delivered', { where: u.name(r) }), d, 'money')],
        strength: 0.5 * u.shareStrength(growth, p.growth) + 0.5 * u.clamp(1 - share / p.partnerShare),
        money: u.moneyShare(y3.v - d.v, 'arr') };
    }).filter(Boolean);
  });
})(window.TAP);
