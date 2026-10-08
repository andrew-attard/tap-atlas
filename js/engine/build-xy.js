/*
 * File: js/engine/build-xy.js
 * Purpose: Generic chart builder for two measures, with optional bubble size (scatter, bubble), and the shared
 *          point-chart drawing that the parts builder's bubble view also uses.
 * Provides: chart builder 'xy' (registered with TAP.builders; also serves the 'xyz' shape), TAP.shapes.kit.points
 * Depends on: js/engine/registry.js, js/engine/prepare.js, js/engine/shapes.js (drawing kit), js/core/format.js
 * Used by: js/panel/panel-chart.js, js/engine/build-parts.js (bubble view)
 */
(function (TAP) {
  'use strict';

  // Display offsets for points sitting on exactly the same spot, so none hides another. Values never move:
  // tooltips and tables read the cells, and raw keeps the exact numbers.
  function nudges(pts) {
    var spots = {}, xs = pts.map(function (p) { return p.x.v; });
    var span = (Math.max.apply(null, xs) - Math.min.apply(null, xs)) || Math.abs(xs[0]) || 1;
    pts.forEach(function (p) { var key = p.x.v + '|' + p.y.v; (spots[key] = spots[key] || []).push(p); });
    Object.keys(spots).forEach(function (key) {
      var same = spots[key];
      same.forEach(function (p, i) { p.dx = same.length > 1 ? (i - (same.length - 1) / 2) * span * 0.015 : 0; });
    });
  }

  // Room past the largest value so the biggest bubble and its label are not cut off. Scales 1 to 3 keep their range.
  function roomy(col, extra) {
    if (col.unit !== 'rating' && col.unit !== 'score') {
      extra.max = function (v) { return v.max + (v.max - Math.min(v.min, 0)) * 0.15; };
      extra.axisLabel = { fontSize: TAP.shapes.kit.th().type.chart, formatter: TAP.shapes.kit.axisFormatter(col.unit), showMaxLabel: false };
    }
    return extra;
  }

  /*
   * A scatter or bubble chart over prepared rows. keys: {x, y, size|null}. Rows whose x or y is blank can't be
   * placed, so they are left off and named in the notes. A blank size draws an outlined empty mark.
   */
  function points(def, ctx, ds, keys) {
    var k = TAP.shapes.kit, th = k.th(), np = th.echarts.tap.notProvided, hl = ctx.highlight;
    var cx = k.colOf(ds, keys.x), cy = k.colOf(ds, keys.y), cs = keys.size ? k.colOf(ds, keys.size) : null;
    var rows = k.visibleRows(ds, [keys.x, keys.y]), notes = [], pts = [], max = 0;
    rows.forEach(function (r) {
      var x = r.cells[keys.x], y = r.cells[keys.y], s = cs ? r.cells[keys.size] : null;
      if (x.state !== 'value' || y.state !== 'value') {
        var lost = x.state === 'notProvided' ? cx : y.state === 'notProvided' ? cy : null;
        if (lost) notes.push(k.t('chart.notPlaced', { name: r.label, measure: k.lower(lost.label) }));
        return;
      }
      if (s && s.state === 'value' && s.v > max) max = s.v;
      pts.push({ r: r, x: x, y: y, s: s });
    });
    if (pts.length) nudges(pts);
    // Labels sit left of points in the right half, so they stay inside the chart.
    var midX = pts.length ? (Math.max.apply(null, pts.map(function (p) { return p.x.v; })) + Math.min.apply(null, pts.map(function (p) { return p.x.v; }).concat([0]))) / 2 : 0;
    var size = cs ? k.sizeScale(max) : function () { return th.space[4]; }, ring = [];
    // A point is highlighted when it matches the target's regions (if any) and its industries (if any).
    function marked(e, r) {
      var regs = (hl && hl.regionIds) || [], inds = (hl && hl.industryIds) || [];
      if (!regs.length && !inds.length) return false;
      return (!regs.length || k.highlighted(e, hl)) && (!inds.length || inds.indexOf(r.industryId) >= 0);
    }
    var series = ds.entities.map(function (e) {
      var mine = pts.filter(function (p) { return p.r.entityId === e.id; });
      if (!mine.length) return null;
      return { type: 'scatter', tapRole: 'value', name: e.label, z: e.kind === 'combined' || e.role === 'muted' ? 2 : 3,
        data: mine.map(function (p) {
          var has = !cs || (p.s && p.s.state === 'value'), d = has ? size(cs ? p.s.v : 0) : np.size;
          var at = [p.x.v + p.dx, p.y.v, cs && has ? p.s.v : 0];
          if (marked(e, p.r)) {
            ring.push({ value: at.slice(0, 2), entityId: e.id, size: d });
          }
          return { value: at, raw: [p.x.v, p.y.v, cs && has ? p.s.v : null], keys: [keys.x, keys.y, cs ? keys.size : null],
            entityId: e.id, industryId: p.r.industryId || null, name: p.r.label, symbol: has ? 'circle' : np.symbol, symbolSize: d,
            itemStyle: has ? { color: e.color } : { color: e.color, borderColor: e.color, borderWidth: th.border.rule },
            label: { show: true, position: p.x.v > midX ? 'left' : 'right', fontSize: th.type.chart, color: th.ink,
              formatter: has ? p.r.label : k.t('chart.sizeMissing', { name: p.r.label }) } };
        }),
        tooltip: { formatter: function (p) {
          var r = mine.filter(function (q) { return q.r.entityId === p.data.entityId && q.r.industryId === p.data.industryId; })[0].r;
          var title = ds.dimension === 'industry' ? r.label + ' · ' + r.entity.label : r.label;
          var lines = k.cellRows(r.cells[keys.x], cx).concat(k.cellRows(r.cells[keys.y], cy).slice(0, 1));
          if (cs) lines.push([cs.label, k.exact(r.cells[keys.size], cs)]);
          return k.tip(title, lines);
        } } };
    }).filter(Boolean);
    var option = { grid: k.grid({ bottom: th.space[8], left: th.space[8] }), tooltip: { trigger: 'item' },
      xAxis: k.valueAxis(cx, roomy(cx, { name: cx.label, nameLocation: 'middle', nameGap: th.space[8] })),
      yAxis: k.valueAxis(cy, roomy(cy, { name: cy.label, nameLocation: 'middle', nameGap: th.space[12] })),
      series: series.concat(ring.length ? [k.ringSeries(ring)] : []) };
    return { option: option, notes: notes, sizeLegend: cs && max > 0 ? k.sizeLegend(max, cs) : null,
      table: k.table(ds, [keys.x, keys.y].concat(cs ? [keys.size] : []), rows),
      legend: k.legendOf({ entities: ds.entities.filter(function (e) { return pts.some(function (p) { return p.r.entityId === e.id; }); }) }) };
  }

  function build(ctx) {
    var k = TAP.shapes.kit, def = ctx.def, ds = TAP.prepare.run(def, ctx);
    var sizeId = ctx.type === 'scatter' ? null : (ctx.sizeId || (def.size && def.size.default) || null);
    if (def.shape === 'xy' && ctx.type !== 'bubble') sizeId = null;
    var drawn = points(def, ctx, ds, { x: def.x, y: def.y, size: sizeId });
    var res = k.result(def, ds, drawn);
    res.notes = k.notes(ds, [def.x, def.y]).concat(drawn.notes);
    if (ds.empty) res.empty = true;
    if (ctx.type === 'table') res.option = null;
    return res;
  }

  TAP.shapes.kit.points = points;
  TAP.builders.register('xy', TAP.shapes.kit.safely(build));
})(window.TAP);
