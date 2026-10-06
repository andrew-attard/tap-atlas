/*
 * File: js/insights/rules-outlook.js
 * Purpose: Insight rules on the Phase 4 figures: plan against the strategic plan, year 1 against the base year, pipeline coverage, books value gap and solution reliance (US-4.6.2).
 * Provides: insight rules for the 'outlook' family (via TAP.insights.defineRule): spGap, spTotal, y1Jump, lowCoverage,
 *           booksGap, solutionReliance
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, js/engine/measures-p4.js and measures-p4b.js
 *             (sp.*, by.*, bk.*, cv.oi, nb.oi.sol), js/core/data.js (the channel and solution lists)
 * Used by: js/insights/engine.js
 * Owner: INSIGHTS4 stream (#458)
 *
 * Every figure is the catalogue's own cell, so a sentence quotes what its chart shows, and each finding names that
 * measure for "Show me" (D79). Shares and ratios combine as a ratio of sums. "The others" are the other regions
 * that provide the figure, combined as the charts' rest bar. A region without the part gives no finding, never zero.
 */
(function (TAP) {
  'use strict';

  var SLACK = 1e-9;   // a figure exactly at the threshold counts, whatever the floating-point rounding

  function lookup(name) { return ((TAP.data.lookups() || {})[name]) || []; }
  // Regions that give the measure, and the combined figure over a set of them
  function giving(u, id) { return u.regions().filter(function (r) { return u.value(u.m(id, r)) !== null; }); }
  function together(id, ids, ctx) {
    return TAP.measures.combined(id, { kind: 'combined', regionIds: ids, how: 'total' }, Object.assign({ year: null }, ctx || {}));
  }
  function direction(u, v) { return u.phrase(v < 0 ? 'outlook.below' : 'outlook.above'); }
  function times(u, v) { return u.num(v, 2) + '×'; }
  // A money figure read from a ratio cell's parts (year 1, the order intake still to win), with the ratio's source
  function part(c, v) { return { v: v, state: 'value', kind: 'APP', src: c.src }; }
  function channelWords(u, id) {
    var said = u.phrase('channel.' + id);
    if (said.charAt(0) !== '[') return said;
    var ch = lookup('channels').filter(function (c) { return c.id === id; })[0];
    return ch ? ch.name : id;
  }

  /* ---------- the plan against the strategic plan ---------- */

  TAP.insights.defineRule('spGap', function (ctx) {
    var u = ctx.util, p = ctx.params;
    return giving(u, 'sp.variancePct').map(function (r) {
      var pct = u.m('sp.variancePct', r), plan = u.m('sp.plan', r), sp = u.m('sp.oi', r), gap = u.m('sp.variance', r);
      if (Math.abs(pct.v) < p.gap - SLACK) return null;
      var where = u.name(r);
      return { key: r, regionIds: [r], measureId: 'sp.variancePct',
        vars: { region: where, share: u.pct(Math.abs(pct.v)), direction: direction(u, pct.v), plan: u.money(plan.v), strategic: u.money(sp.v) },
        figures: [u.fig('sp.variancePct', where, pct), u.fig('sp.plan', where, plan), u.fig('sp.oi', where, sp), u.fig('sp.variance', where, gap)],
        strength: u.shareStrength(Math.abs(pct.v), p.gap), money: u.moneyShare(Math.abs(gap.v), 'arr') };
    }).filter(Boolean);
  });

  // One finding for the organization: every region that gives a strategic plan; the others are named, never zero
  TAP.insights.defineRule('spTotal', function (ctx) {
    var u = ctx.util, p = ctx.params, ids = giving(u, 'sp.variancePct');
    if (!ids.length) return [];
    var pct = together('sp.variancePct', ids), plan = together('sp.plan', ids), sp = together('sp.oi', ids);
    var gap = together('sp.variance', ids), missing = u.regions().filter(function (r) { return ids.indexOf(r) < 0; });
    if (u.value(pct) === null || Math.abs(pct.v) < p.gap - SLACK) return [];
    var where = u.phrase('outlook.together', { n: ids.length });
    return [{ key: 'org', regionIds: ids, provided: ids.length, measureId: 'sp.variancePct', variant: missing.length ? 'gaps' : null,
      vars: { n: ids.length, share: u.pct(Math.abs(pct.v)), direction: direction(u, pct.v), plan: u.money(plan.v), strategic: u.money(sp.v),
        regions: u.list(missing.map(u.name)) },
      figures: [u.fig('sp.variancePct', where, pct), u.fig('sp.plan', where, plan), u.fig('sp.oi', where, sp), u.fig('sp.variance', where, gap)],
      strength: u.shareStrength(Math.abs(pct.v), p.gap), money: u.moneyShare(Math.abs(gap.v), 'arr') }];
  });

  /* ---------- the base year ---------- */

  TAP.insights.defineRule('y1Jump', function (ctx) {
    var u = ctx.util, p = ctx.params, ids = giving(u, 'by.growth');
    return ids.map(function (r) {
      var g = u.m('by.growth', r), rest = u.others('by.growth', r, null, ids), base = u.m('by.forecast', r);
      if (g.v < p.jump - SLACK || u.value(rest) === null || !g.ratio) return null;
      var where = u.name(r), y1 = g.ratio.num + g.ratio.den;
      return { key: r, regionIds: [r], provided: ids.length, measureId: 'by.growth',
        vars: { region: where, share: u.pct(g.v), y1: u.money(y1), forecast: u.money(g.ratio.den), avg: u.pct(Math.abs(rest.v)),
          direction: direction(u, rest.v) },
        figures: [u.fig('by.growth', where, g), u.fig('by.growth', u.phrase('othersAvg', { n: ids.length - 1 }), rest),
          u.figure(u.phrase('outlook.year1', { where: where }), part(g, y1), 'money'), u.fig('by.forecast', where, base)],
        strength: u.shareStrength(g.v, p.jump), money: u.moneyShare(g.ratio.num, 'arr') };
    }).filter(Boolean);
  });

  TAP.insights.defineRule('lowCoverage', function (ctx) {
    var u = ctx.util, p = ctx.params, ids = giving(u, 'by.coverage');
    return ids.map(function (r) {
      var c = u.m('by.coverage', r), rest = u.others('by.coverage', r, null, ids);
      if (c.v >= p.coverage - SLACK || u.value(rest) === null || !c.ratio) return null;
      var where = u.name(r);
      return { key: r, regionIds: [r], provided: ids.length, measureId: 'by.coverage',
        vars: { region: where, pipeline: u.money(c.ratio.num), coverage: times(u, c.v), left: u.money(c.ratio.den), avg: times(u, rest.v) },
        figures: [u.fig('by.coverage', where, c), u.fig('by.coverage', u.phrase('othersAvg', { n: ids.length - 1 }), rest),
          u.fig('by.pipeline', where, u.m('by.pipeline', r)), u.figure(u.phrase('outlook.left', { where: where }), part(c, c.ratio.den), 'money'),
          u.fig('by.forecast', where, u.m('by.forecast', r)), u.fig('by.actuals', where, u.m('by.actuals', r))],
        strength: u.clamp((p.coverage - c.v) / p.coverage), money: u.moneyShare(c.ratio.den, 'arr') };
    }).filter(Boolean);
  });

  /* ---------- customer value against books value ---------- */

  // The channel most of the difference comes from (the largest amount), named when its share is above the region's
  function topChannel(u, r, share) {
    var best = null;
    lookup('channels').forEach(function (ch) {
      var g = u.m('bk.gap', r, { channel: ch.id });
      if (u.value(g) !== null && (!best || g.v > best.gap)) best = { id: ch.id, gap: g.v, cell: u.m('bk.gapShare', r, { channel: ch.id }) };
    });
    return best && u.value(best.cell) !== null && best.cell.v > share + SLACK ? best : null;
  }

  TAP.insights.defineRule('booksGap', function (ctx) {
    var u = ctx.util, p = ctx.params, ids = giving(u, 'bk.gapShare');
    return ids.map(function (r) {
      var s = u.m('bk.gapShare', r), rest = u.others('bk.gapShare', r, null, ids), gap = u.m('bk.gap', r), cv = u.m('cv.oi', r);
      if (s.v < p.share - SLACK || u.value(rest) === null || u.value(gap) === null || u.value(cv) === null) return null;
      var where = u.name(r), top = topChannel(u, r, s.v);
      var figures = [u.fig('bk.gapShare', where, s), u.fig('bk.gapShare', u.phrase('othersAvg', { n: ids.length - 1 }), rest)];
      if (top) figures.push(u.fig('bk.gapShare', u.phrase('figure', { what: where, where: channelWords(u, top.id) }), top.cell));
      return { key: r, regionIds: [r], provided: ids.length, measureId: 'bk.gapShare', variant: top ? null : 'one',
        vars: { region: where, share: u.pct(s.v), gap: u.money(gap.v), cv: u.money(cv.v), avg: u.pct(rest.v),
          channel: top ? channelWords(u, top.id) : '', channelShare: top ? u.pct(top.cell.v) : '' },
        figures: figures.concat([u.fig('bk.gap', where, gap), u.fig('cv.oi', where, cv), u.fig('bk.oi', where, u.m('bk.oi', r))]),
        strength: u.shareStrength(s.v, p.share), money: u.moneyShare(gap.v, 'arr') };
    }).filter(Boolean);
  });

  /* ---------- new business by solution ---------- */

  // The solution with the largest share of the region's new business; rows naming none count only in the total
  TAP.insights.defineRule('solutionReliance', function (ctx) {
    var u = ctx.util, p = ctx.params;
    return giving(u, 'nb.oi.sol').map(function (r) {
      var total = u.m('nb.oi.sol', r), best = null;
      if (!(total.v > 0)) return null;
      lookup('solutions').forEach(function (sol) {
        var c = u.m('nb.oi.sol', r, { solution: sol.id });
        if (u.value(c) !== null && (!best || c.v > best.cell.v)) best = { sol: sol, cell: c };
      });
      if (!best || best.cell.v / total.v < p.share - SLACK) return null;
      var where = u.name(r), share = best.cell.v / total.v, name = best.sol.name || best.sol.id;
      var shareCell = { v: share, state: 'value', kind: 'APP', src: best.cell.src };
      return { key: r + ':' + best.sol.id, regionIds: [r], measureId: 'nb.oi.sol', variant: share >= 1 - SLACK ? 'all' : null,
        vars: { solution: name, region: where, share: u.pct(share), amount: u.money(best.cell.v), total: u.money(total.v) },
        figures: [u.fig('nb.oi.sol', u.phrase('figure', { what: where, where: name }), best.cell), u.fig('nb.oi.sol', where, total),
          u.figure(u.phrase('outlook.share', { solution: name, where: where }), shareCell, 'pct')],
        strength: u.shareStrength(share, p.share), money: u.moneyShare(best.cell.v, 'arr') };
    }).filter(Boolean);
  });
})(window.TAP);
