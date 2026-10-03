/*
 * File: js/insights/rules-assumptions.js
 * Purpose: Insight rules on planning assumptions far from the other regions' (US-1.7.6): hit rate, deal size,
 *          growth, services ratio and customer growth, each against the others' average combined by the US-1.2.5
 *          rules (TAP.agg, the same weights as the charts).
 * Provides: insight rules for the 'assumptions' family (via TAP.insights.defineRule): outlier
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, the measure catalogue, js/engine/aggregate.js
 * Used by: js/insights/engine.js
 */
(function (TAP) {
  'use strict';

  function show(u, measureId, v) {
    var unit = (TAP.measures.meta(measureId) || {}).unit;
    return unit === 'pct' ? u.pct(v) : unit === 'money' ? u.money(v) : u.num(v);
  }

  // "twice", "three times"... from the whole part of the ratio.
  function times(u, ratio) {
    var n = Math.floor(ratio), word = u.phrase('times.' + n);
    return word.charAt(0) === '[' ? u.phrase('times.n', { n: n }) : word;
  }

  // Which way a value stands out, if it does: high or low against the average, or outside every other value by
  // more than rangeGap of the average (with seven regions one is always the highest, so a margin is needed).
  function kind(v, avg, rest, p) {
    var ratio = v / avg, max = Math.max.apply(null, rest), min = Math.min.apply(null, rest);
    if (ratio >= p.high) return 'high';
    if (ratio <= p.low) return 'low';
    if (v > max && (v - max) / avg >= p.rangeGap) return 'above';
    if (v < min && (min - v) / avg >= p.rangeGap) return 'below';
    return null;
  }

  TAP.insights.defineRule('outlier', function (ctx) {
    var u = ctx.util, p = ctx.params, minRegions = (ctx.settings.insights || {}).minRegions || 3, out = [];
    (p.measures || []).forEach(function (id) {
      var cells = {};
      u.regions().forEach(function (r) { cells[r] = u.m(id, r); });
      var provided = u.regions().filter(function (r) { return u.value(cells[r]) != null; });
      if (provided.length < minRegions) return;                    // too few regions to compare
      var motion = id.indexOf('cg.') === 0 ? 'cg.arr' : 'nb.arr';
      provided.forEach(function (r) {
        var v = cells[r].v, avg = u.others(id, r), a = u.value(avg);
        var rest = provided.filter(function (o) { return o !== r; }).map(function (o) { return cells[o].v; });
        if (!(a > 0) || !(v > 0)) return;
        var k = kind(v, a, rest, p);
        if (!k) return;
        var ratio = v / a, up = k === 'high' || k === 'above';
        out.push({ key: id + ':' + r, regionIds: [r], provided: provided.length, variant: k === 'high' ? null : k,
          vars: { region: u.name(r), what: u.phrase('measures.' + id, { value: show(u, id, v) }), times: times(u, ratio),
            avg: show(u, id, a) },
          figures: [u.fig(id, u.name(r), cells[r]), u.fig(id, u.phrase('othersAvg', { n: rest.length }), avg)],
          strength: up ? u.ratioStrength(ratio, p.high) : u.ratioStrength(1 / ratio, 1 / p.low),
          money: u.moneyShare(u.value(u.m(motion, r)) || 0, 'arr') });
      });
    });
    return strongestYear(out);
  });

  // Growth assumptions come one per plan year. When several years of the same assumption stand out for a region,
  // only the strongest is kept, so one cautious or bold plan is raised once, not three times.
  function strongestYear(list) {
    var best = {};
    list.forEach(function (f) {
      var k = f.key.replace(/Y\d:/, ':');
      if (!best[k] || f.strength > best[k].strength) best[k] = f;
    });
    return list.filter(function (f) { return best[f.key.replace(/Y\d:/, ':')] === f; });
  }
})(window.TAP);
