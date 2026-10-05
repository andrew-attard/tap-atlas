/*
 * File: js/reports/nb-levers.js
 * Purpose: The levers report's builder (US-2.1.4): bars, dots and table through the compare builder, and the bubble
 *          view (target accounts across, hit rate up, size = average deal size) through the shared point drawing.
 * Provides: builder 'nbLevers'
 * Depends on: js/engine/build-compare.js, js/engine/build-xy.js (TAP.shapes.kit.points), js/engine/prepare.js,
 *             js/engine/shapes.js, js/reports/row-bubble.js (TAP.bubbleLabels) (all at call time)
 * Used by: config/reports-newbusiness.js (nb-levers)
 * Owner: NB stream (#200)
 */
(function (TAP) {
  'use strict';

  // One bubble per region (or combined figure): the definition's x and y, sized by the chosen size measure.
  function bubble(ctx) {
    var k = TAP.shapes.kit, def = ctx.def, ds = TAP.prepare.run(def, ctx);
    var drawn = k.points(def, ctx, ds, { x: def.x, y: def.y, size: ctx.sizeId || (def.size && def.size.default) || null });
    var res = k.result(def, ds, drawn);
    res.notes = k.notes(ds, [def.x, def.y]).concat(drawn.notes);
    if (ds.empty) res.empty = true;
    if (res.option) placeNames(ctx, res, ds);
    return res;
  }

  // Names beside the bubbles where they fit, as on the row bubbles; a region with no clear spot gets a number on its
  // bubble, named against that number in the key, so names never overlap where regions bunch (shared screen, D24).
  function placeNames(ctx, res, ds) {
    var L = TAP.bubbleLabels, th = TAP.shapes.kit.th(), o = res.option, F = L.frame(ctx), pts = [];
    o.series.filter(function (s) { return s.tapRole === 'value'; }).forEach(function (s) {
      (s.data || []).forEach(function (d) {
        var e = ds.entities.filter(function (x) { return x.id === d.entityId; })[0] || { role: 'region' };
        pts.push({ data: d, e: e, d: d.symbolSize, label: String(d.label.formatter), noSize: d.symbol !== 'circle' });
      });
    });
    if (!pts.length) return;
    var rx = L.range(pts.map(function (p) { return p.data.value[0]; })), ry = L.range(pts.map(function (p) { return p.data.value[1]; }));
    pts.forEach(function (p) {
      p.px = F.x0 + (p.data.value[0] - rx.min) / (rx.max - rx.min) * F.w;
      p.py = F.y0 + F.h - (p.data.value[1] - ry.min) / (ry.max - ry.min) * F.h;
    });
    L.place(pts.slice().sort(function (a, b) { return b.d - a.d; }), pts, F, th.type.chart, pts.length);
    pts.forEach(function (p) { p.data.label = L.labelOf(p, p.e, th); });
    o.grid = { left: L.MARGIN.left, right: L.MARGIN.right, top: L.MARGIN.top, bottom: L.MARGIN.bottom, containLabel: false };
    Object.assign(o.xAxis, { min: rx.min, max: rx.max });
    Object.assign(o.yAxis, { min: ry.min, max: ry.max });
    res.legend = res.legend.map(function (l) {
      var p = pts.filter(function (q) { return q.num && q.e.label === l.label; })[0];
      return p ? Object.assign({}, l, { mark: p.num }) : l;
    });
    res.sized = true;   // names are placed for the chart's real size, so build again once it is known
  }

  function build(ctx) {
    return (ctx.type || ctx.def.defaultType) === 'bubble' ? bubble(ctx) : TAP.builders.get('compare')(ctx);
  }

  TAP.builders.register('nbLevers', TAP.shapes.kit.safely(build));
})(window.TAP);
