/*
 * File: js/insights/rules-exposure.js
 * Purpose: Insight rules on where planned customer growth depends on a few accounts, on accounts flagged at risk,
 *          or on one segment (US-1.7.8). Account names come from the data as they are, so anonymous labels show
 *          as labels (D14).
 * Provides: insight rules for the 'exposure' family (via TAP.insights.defineRule): concentration, atRisk, segmentMix
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, the measure catalogue
 * Used by: js/insights/engine.js
 *
 * The region total is the catalogue's cg.arr, so shares match the charts. The catalogue has no per-account or
 * per-segment figure, so those are summed here from the account rows, with the same blank rules (a blank year is
 * skipped; an account with every year blank is left out).
 */
(function (TAP) {
  'use strict';

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  // Each account's planned growth (incremental ARR over three years) as a cell, plus the region total.
  function growth(u, r) {
    var total = u.m('cg.arr', r);
    if (!(u.value(total) > 0)) return null;
    var list = [];
    (((TAP.data.region(r) || {}).customerGrowth || {}).accounts || []).forEach(function (a) {
      var years = (a.incrementalArr || []).filter(isNum);
      if (!years.length) return;
      list.push({ a: a, v: years.reduce(function (s, v) { return s + v; }, 0), cell: rowsCell(r, [a.sourceRow],
        years.reduce(function (s, v) { return s + v; }, 0), 'DER') });
    });
    return { total: total, list: list };
  }
  function rowsCell(r, rows, v, kind, field) {
    return { v: v, state: 'value', kind: kind, src: { regionId: r, section: 'customerGrowth', field: field || 'incrementalArr',
      row: rows.length === 1 ? rows[0] : null, rows: rows, year: null, cell: null, kind: kind } };
  }
  function sum(list) { return list.reduce(function (s, x) { return s + x.v; }, 0); }
  function name(x) { return x.a.name || x.a.id; }
  function accountFigure(u, x) {
    var risk = x.a.riskLevel === 'high' || x.a.riskLevel === 'medium' ? x.a.riskLevel + 'Risk' : null;
    return u.figure(risk ? u.phrase(risk, { name: name(x) }) : name(x), x.cell, 'money');
  }
  function totalFigure(u, g) { return u.figure(u.phrase('allAccounts'), g.total, 'money', null, 'cg.arr'); }

  TAP.insights.defineRule('concentration', function (ctx) {
    var u = ctx.util, p = ctx.params;
    return u.regions().map(function (r) {
      var g = growth(u, r);
      if (!g || g.list.length < p.minAccounts) return null;
      var top = g.list.slice().sort(function (x, y) { return y.v - x.v; }).slice(0, p.top), share = sum(top) / g.total.v;
      if (share < p.share) return null;
      var flagged = top.filter(function (x) { return x.a.riskLevel === 'high' || x.a.riskLevel === 'medium'; });
      var allHigh = flagged.every(function (x) { return x.a.riskLevel === 'high'; });
      var risk = !flagged.length ? '' : u.phrase('risk.' + (allHigh ? 'high' : 'any') + (flagged.length > 1 ? 'N' : ''), { n: flagged.length });
      return { key: r, regionIds: [r], accountIds: top.map(function (x) { return x.a.id; }),
        vars: { share: u.pct(share), region: u.name(r), n: top.length, accounts: u.list(top.map(name)), risk: risk },
        figures: top.map(function (x) { return accountFigure(u, x); }).concat([totalFigure(u, g)]),
        sources: [g.total.src].concat(top.map(function (x) { return x.cell.src; })),
        strength: u.shareStrength(share, p.share), money: u.moneyShare(sum(top), 'arr') };
    }).filter(Boolean);
  });

  TAP.insights.defineRule('atRisk', function (ctx) {
    var u = ctx.util, p = ctx.params, levels = p.levels || ['high', 'medium'];
    return u.regions().map(function (r) {
      var g = growth(u, r);
      if (!g) return null;
      var flagged = g.list.filter(function (x) { return levels.indexOf(x.a.riskLevel) >= 0; }), share = sum(flagged) / g.total.v;
      if (!flagged.length || share < p.share) return null;
      return { key: r, regionIds: [r], accountIds: flagged.map(function (x) { return x.a.id; }),
        vars: { share: u.pct(share), region: u.name(r), amount: u.money(sum(flagged)), n: flagged.length },
        figures: flagged.map(function (x) { return accountFigure(u, x); }).concat([totalFigure(u, g)]),
        strength: u.shareStrength(share, p.share), money: u.moneyShare(sum(flagged), 'arr') };
    }).filter(Boolean);
  });

  // Share of each region's planned growth by segment, then the region far above every other region's share.
  TAP.insights.defineRule('segmentMix', function (ctx) {
    var u = ctx.util, p = ctx.params, mix = {};
    u.regions().forEach(function (r) {
      var g = growth(u, r);
      if (!g) return;
      mix[r] = {};
      g.list.forEach(function (x) {
        var s = x.a.segment;
        if (!s) return;
        var m = mix[r][s] = mix[r][s] || { v: 0, rows: [] };
        m.v += x.v;
        m.rows.push(x.a.sourceRow);
      });
      Object.keys(mix[r]).forEach(function (s) { mix[r][s].share = mix[r][s].v / g.total.v; });
    });
    var ids = Object.keys(mix), out = [];
    ids.forEach(function (r) {
      Object.keys(mix[r]).forEach(function (s) {
        var mine = mix[r][s], rest = ids.filter(function (o) { return o !== r; });
        var shares = rest.map(function (o) { return mix[o][s] ? mix[o][s].share : 0; });
        if (!rest.length || mine.share < p.share || mine.share - Math.max.apply(null, shares) < p.gap) return;
        var segment = (TAP.measures.meta('cg.segment.' + s) || {}).short || s;
        var figures = [u.figure(u.phrase('figure', { what: segment, where: u.name(r) }), rowsCell(r, mine.rows, mine.share, 'APP', 'segment'), 'pct')]
          .concat(rest.map(function (o) {
            var m = mix[o][s] || { share: 0, rows: [] };
            return u.figure(u.phrase('figure', { what: segment, where: u.name(o) }), rowsCell(o, m.rows, m.share, 'APP', 'segment'), 'pct');
          }));
        out.push({ key: r + ':' + s, regionIds: [r], provided: ids.length,
          vars: { region: u.name(r), segment: segment, share: u.pct(mine.share), min: u.pct(Math.min.apply(null, shares)),
            max: u.pct(Math.max.apply(null, shares)) },
          figures: figures, strength: u.clamp((mine.share - Math.max.apply(null, shares)) / (2 * p.gap)),
          money: u.moneyShare(mine.v, 'arr') });
      });
    });
    return out;
  });
})(window.TAP);
