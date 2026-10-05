/*
 * File: js/insights/rules-exposure.js
 * Purpose: Insight rules on where planned customer growth depends on a few accounts, on accounts flagged at risk,
 *          or on one segment (US-1.7.8). Account names come from the data as they are, so anonymous labels show
 *          as labels (D14).
 * Provides: insight rules for the 'exposure' family (via TAP.insights.defineRule): concentration, atRisk, segmentMix
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, js/engine/measures.js and measures-p2.js
 *             (the catalogue), js/core/data.js (account rows and the segment list)
 * Used by: js/insights/engine.js
 *
 * Each share is the catalogue's own figure (cg.top3Share, cg.riskShare, the cg.seg.*.oi parts of cg.oi3), so the
 * sentence quotes what the chart shows, and each finding names that measure for "Show me" (D79). The catalogue has
 * no per-account figure, so the accounts named are summed here from the rows, with the same blank rules (a blank
 * year is skipped; an account with every year blank is left out).
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
      var top = g.list.slice().sort(function (x, y) { return y.v - x.v; }).slice(0, p.top), cell = u.m('cg.top3Share', r);
      var share = u.value(cell);
      if (share === null || share < p.share) return null;
      var flagged = top.filter(function (x) { return x.a.riskLevel === 'high' || x.a.riskLevel === 'medium'; });
      var allHigh = flagged.every(function (x) { return x.a.riskLevel === 'high'; });
      var risk = !flagged.length ? '' : u.phrase('risk.' + (allHigh ? 'high' : 'any') + (flagged.length > 1 ? 'N' : ''), { n: flagged.length });
      return { key: r, regionIds: [r], accountIds: top.map(function (x) { return x.a.id; }), measureId: 'cg.top3Share',
        vars: { share: u.pct(share), region: u.name(r), n: top.length, accounts: u.list(top.map(name)), risk: risk },
        figures: [u.fig('cg.top3Share', u.name(r), cell)].concat(top.map(function (x) { return accountFigure(u, x); }), [totalFigure(u, g)]),
        sources: [g.total.src].concat(top.map(function (x) { return x.cell.src; })),
        strength: u.shareStrength(share, p.share), money: u.moneyShare(sum(top), 'arr') };
    }).filter(Boolean);
  });

  TAP.insights.defineRule('atRisk', function (ctx) {
    var u = ctx.util, p = ctx.params, levels = p.levels || ['high', 'medium'];
    return u.regions().map(function (r) {
      var g = growth(u, r);
      if (!g) return null;
      var flagged = g.list.filter(function (x) { return levels.indexOf(x.a.riskLevel) >= 0; }), cell = u.m('cg.riskShare', r);
      var share = u.value(cell);
      if (!flagged.length || share === null || share < p.share) return null;
      return { key: r, regionIds: [r], accountIds: flagged.map(function (x) { return x.a.id; }), measureId: 'cg.riskShare',
        vars: { share: u.pct(share), region: u.name(r), amount: u.money(sum(flagged)), n: flagged.length },
        figures: [u.fig('cg.riskShare', u.name(r), cell)].concat(flagged.map(function (x) { return accountFigure(u, x); }), [totalFigure(u, g)]),
        strength: u.shareStrength(share, p.share), money: u.moneyShare(sum(flagged), 'arr') };
    }).filter(Boolean);
  });

  // Each region's segment shares of three-year order intake, as the segments chart shows them; then the region far
  // above every other region's share. A region whose accounts carry no segment gives no shares, so it is left out
  // of both sides rather than counted at 0% (#355).
  function segmentShares(u, r, segs) {
    var total = u.m('cg.oi3', r);
    if (!(u.value(total) > 0)) return null;
    var out = { total: total, parts: {} }, any = false;
    segs.forEach(function (s) {
      var c = u.m('cg.seg.' + s + '.oi', r);
      if (u.value(c) === null) return;
      out.parts[s] = { cell: c, share: c.v / total.v };
      any = any || c.v !== 0;
    });
    return any ? out : null;
  }

  TAP.insights.defineRule('segmentMix', function (ctx) {
    var u = ctx.util, p = ctx.params, mix = {};
    var segs = (((TAP.data.lookups() || {}).segments) || []).map(function (s) { return s.id; });
    u.regions().forEach(function (r) { var m = segmentShares(u, r, segs); if (m) mix[r] = m; });
    var ids = Object.keys(mix), out = [];
    function share(o, s) { return mix[o].parts[s] ? mix[o].parts[s].share : 0; }
    ids.forEach(function (r) {
      Object.keys(mix[r].parts).forEach(function (s) {
        var mine = mix[r].parts[s], rest = ids.filter(function (o) { return o !== r; });
        var shares = rest.map(function (o) { return share(o, s); });
        if (!rest.length || mine.share < p.share || mine.share - Math.max.apply(null, shares) < p.gap) return;
        var segment = (TAP.measures.meta('cg.segment.' + s) || {}).short || s;
        var what = function (o) { return u.phrase('figure', { what: segment, where: u.name(o) }); };
        var pctCell = function (o) {
          var part = mix[o].parts[s];
          return { v: share(o, s), state: 'value', kind: 'APP', src: part ? part.cell.src : mix[o].total.src };
        };
        out.push({ key: r + ':' + s, regionIds: [r], provided: ids.length, measureId: 'cg.oi3',
          vars: { region: u.name(r), segment: segment, share: u.pct(mine.share), min: u.pct(Math.min.apply(null, shares)),
            max: u.pct(Math.max.apply(null, shares)) },
          figures: [u.figure(what(r), pctCell(r), 'pct')].concat(rest.map(function (o) { return u.figure(what(o), pctCell(o), 'pct'); }),
            [u.fig('cg.oi3', u.name(r), mix[r].total)]),
          strength: u.clamp((mine.share - Math.max.apply(null, shares)) / (2 * p.gap)),
          money: u.moneyShare(mine.cell.v, 'arr') });
      });
    });
    return out;
  });
})(window.TAP);
