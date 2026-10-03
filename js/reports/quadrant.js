/*
 * File: js/reports/quadrant.js
 * Purpose: Draws attractiveness against ability to win (US-1.5.5) with four neutral labelled areas split at the
 *          midpoint. By default one bubble per industry, its scores averaged over the regions in scope by the
 *          rating rule; "Show every region" or an industry filter shows one point per region and industry,
 *          nudged apart for display only. Tooltips and the table always read the exact cells.
 * Provides: chart builder 'quadrant' (registered with TAP.builders)
 * Depends on: js/engine/registry.js, scope.js, measures.js, scores.js, aggregate.js, shapes.js (drawing kit),
 *             js/core/format.js, content.js, data.js, config/settings.js (midpoint)
 * Used by: config/reports-industry.js (ind-quad)
 */
(function (TAP) {
  'use strict';

  var AREAS = ['attractiveAble', 'attractiveNotYet', 'lessAttractiveAble', 'lessBoth'];
  function k() { return TAP.shapes.kit; }
  function t(key, vars) { return TAP.content.text(key, vars); }
  function has(list, x) { return (list || []).indexOf(x) >= 0; }
  function settings() { return (window.TAP_SETTINGS && window.TAP_SETTINGS.scores) || {}; }
  function midpoint() { var m = settings().midpoint; return typeof m === 'number' ? m : 2; }
  function regionsWord(n) { return t(n === 1 ? 'combined.region' : 'combined.regions'); }
  function areaLabel(q) { return q ? t('quadrant.areas.' + q) : t('states.notProvided'); }

  /* ---------- what is drawn ---------- */

  function region(id, role) {
    return { id: id, kind: 'region', regionIds: [id], how: null, role: role, label: TAP.content.regionName(TAP.data.region(id)),
      color: role === 'muted' ? k().th().focusGrey : TAP.scope.colorOf(id) };
  }
  function average(id, ids, label) {
    return { id: id, kind: 'combined', regionIds: ids, how: 'average', role: 'combined', color: k().th().combined, label: label };
  }

  // The groups of points: an average per industry by default (the focus region apart), or every region.
  function groups(ctx, perRegion) {
    var ents = ctx.entities || TAP.scope.entities(ctx.cmp), ids = TAP.scope.regionIds(ctx.cmp);
    var focus = ents[0] && ents[0].role === 'focus' ? ents[0] : null;
    var oneVsRest = !!focus && ents.some(function (e) { return e.role === 'muted' || e.role === 'combined'; });
    if (perRegion) return ids.map(function (id) { return region(id, focus && id === focus.id ? 'focus' : oneVsRest ? 'muted' : 'region'); });
    if (focus) {
      if (!oneVsRest) return ents.slice();
      var rest = ents.filter(function (e) { return e.role === 'combined'; })[0];
      var others = ids.filter(function (id) { return id !== focus.id; });
      return [focus, rest || average('rest', others, t('combined.restAverage', { n: others.length, regions: regionsWord(others.length) }))];
    }
    if (ents.length === 1) return ents.slice();
    return [average('avg', ids, t('quadrant.average', { n: ids.length, regions: regionsWord(ids.length) }))];
  }

  function ratingFields(which) { var w = settings()[which] || {}; return Object.keys(w).filter(function (f) { return w[f] > 0; }); }

  // Every row for the table, and the points that can be placed (both scores provided).
  function collect(def, gs, inds, sizeId) {
    var rows = [];
    gs.forEach(function (g) {
      inds.forEach(function (ind) {
        var c = { industryId: ind.id };
        rows.push({ g: g, ind: ind, x: TAP.measures.combined(def.x, g, c), y: TAP.measures.combined(def.y, g, c),
          s: sizeId ? TAP.measures.combined(sizeId, g, c) : null });
      });
    });
    return rows.filter(function (r) { return r.x.state !== 'notApplicable' || r.y.state !== 'notApplicable'; });
  }

  // Points on exactly the same spot are spread on a small circle round it, for display only.
  function nudge(pts) {
    var spots = {};
    pts.forEach(function (p) { var key = p.x.v.toFixed(6) + '|' + p.y.v.toFixed(6); (spots[key] = spots[key] || []).push(p); });
    Object.keys(spots).forEach(function (key) {
      var same = spots[key], r = 0.03 + 0.008 * same.length;
      same.forEach(function (p, i) {
        var a = -Math.PI / 2 + 2 * Math.PI * i / same.length, on = same.length > 1;
        p.dx = on ? r * Math.cos(a) : 0; p.dy = on ? r * Math.sin(a) : 0;
      });
    });
  }

  function marker(hl) {
    var regs = (hl && hl.regionIds) || [], inds = (hl && hl.industryIds) || [];
    return function (r) {
      if (!hl || hl.mark === 'quadrant' || (!regs.length && !inds.length)) return false;
      var inRegion = !regs.length || r.g.regionIds.some(function (id) { return has(regs, id); });
      return inRegion && (!inds.length || has(inds, r.ind.id));
    };
  }

  /* ---------- tooltip ---------- */

  function tooltip(def, r, sizeCol) {
    var K = k(), lines = [[t('quadrant.area'), areaLabel(TAP.scores.quadrant(r.y, r.x))]];
    [[def.y, 'attractiveness'], [def.x, 'ability']].forEach(function (pair) {
      var meta = TAP.measures.meta(pair[0]), cell = pair[0] === def.x ? r.x : r.y;
      lines.push([meta.label, TAP.format.cell(cell, { unit: 'score', exact: true })]);
      ratingFields(pair[1]).forEach(function (f) {
        var c = TAP.measures.combined('ind.' + f, r.g, { industryId: r.ind.id });
        lines.push(['· ' + TAP.measures.meta('ind.' + f).label, c.state === 'value' ? TAP.format.rating(c.v, f) : TAP.format.cell(c, {})]);
      });
    });
    if (sizeCol) lines.push([sizeCol.label, K.exact(r.s, sizeCol)], [K.t('chart.kind'), TAP.format.kind(sizeCol.kind).text]);
    var how = TAP.agg.describe(r.y);
    if (how) lines.push([K.t('chart.how'), how]);
    return K.tip(r.ind.name + ' · ' + r.g.label, lines);
  }

  /* ---------- chart ---------- */

  function areas(mid, X, Y, hl) {
    var th = k().th(), Q = th.echarts.tap.quadrant;
    var spec = { attractiveNotYet: [[X.min, mid], [mid, Y.max], 'insideTopLeft'], attractiveAble: [[mid, mid], [X.max, Y.max], 'insideTopRight'],
      lessBoth: [[X.min, Y.min], [mid, mid], 'insideBottomLeft'], lessAttractiveAble: [[mid, Y.min], [X.max, mid], 'insideBottomRight'] };
    return { silent: true, itemStyle: { color: 'transparent' },
      label: { color: Q.label, fontSize: Q.labelSize, fontWeight: 600, padding: th.space[2] },
      data: AREAS.map(function (q) {
        var on = hl && hl.quadrant === q;
        return [{ coord: spec[q][0], name: areaLabel(q), tapQuadrant: q, label: { position: spec[q][2] },
          itemStyle: on ? { borderColor: th.accent, borderWidth: th.border.highlight, borderType: 'solid' } : { borderWidth: 0 } }, { coord: spec[q][1] }];
      }) };
  }

  // Both axes always show the whole score scale, so the midpoint lines sit in the middle and the four areas are equal.
  var SCALE = { min: 1, max: 3, interval: 0.5 };
  function axis(meta, gap, r) {
    var th = k().th(); return { type: 'value', min: r.min, max: r.max, interval: r.interval, name: meta.label, nameLocation: 'middle', nameGap: gap,
      splitLine: { show: false }, axisLabel: { fontSize: th.type.chart,
        formatter: function (v) { return Math.abs(v * 2 - Math.round(v * 2)) < 1e-9 ? TAP.format.num(v) : ''; } } };
  }

  /*
   * Places labels on a nominal plot in screen pixels: the narrowest the panel draws this chart, so a wider chart only
   * gains room. Each label tries right, left, then steps up and down (a short leader line joins it to its bubble).
   * A label with no free spot is left off; its point stays in the table and opens its details on click. The corners stay
   * free for the area labels, and a label may touch another bubble's rim or cross the unlabelled grey ones.
   */
  var PLOT = { w: 480, h: 440 };
  function placeLabels(pts, fs) {
    var lh = fs + 4, cw = PLOT.w * 0.4, placed = [{ x: 0, y: 0, w: cw, h: lh * 2 }, { x: PLOT.w - cw, y: 0, w: cw, h: lh * 2 },
      { x: 0, y: PLOT.h - lh * 2, w: cw, h: lh * 2 }, { x: PLOT.w - cw, y: PLOT.h - lh * 2, w: cw, h: lh * 2 }];
    function at(p) { return { x: (p.x.v + p.dx - SCALE.min) / 2 * PLOT.w, y: (SCALE.max - p.y.v - p.dy) / 2 * PLOT.h, r: p.d / 2 }; }
    var dots = pts.filter(function (p) { return p.named; }).map(function (p) { var c = at(p); c.r *= 0.6; return c; });
    function free(b) {
      if (b.x < 0 || b.y < 0 || b.x + b.w > PLOT.w || b.y + b.h > PLOT.h) return false;
      return !placed.some(function (q) { return b.x < q.x + q.w && q.x < b.x + b.w && b.y < q.y + q.h && q.y < b.y + b.h; }) &&
        !dots.some(function (d) { return d.x + d.r > b.x && d.x - d.r < b.x + b.w && d.y + d.r > b.y && d.y - d.r < b.y + b.h; });
    }
    pts.filter(function (p) { return p.named; }).sort(function (a, b) { return b.d - a.d || a.y.v - b.y.v; }).forEach(function (p) {
      var c = at(p), w = p.text.length * fs * 0.56, sides = c.x > PLOT.w / 2 ? ['left', 'right'] : ['right', 'left'];
      p.lab = null;
      [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5].some(function (k) {
        return sides.some(function (side) {
          var b = { x: side === 'right' ? c.x + c.r + 6 : c.x - c.r - 6 - w, y: c.y - lh / 2 + k * lh, w: w, h: lh };
          if (!free(b)) return false;
          placed.push(b); p.lab = { side: side, dy: k * lh };
          return true;
        });
      });
    });
  }

  // The label's spot beside its bubble (d px wide), as a position inside the symbol's box, stepped by dy.
  function labelAt(p, d) {
    var lab = p.lab || { side: 'right', dy: 0 }, right = lab.side === 'right';
    return { position: [right ? d + 6 : -6, d / 2 + lab.dy], align: right ? 'left' : 'right', verticalAlign: 'middle', side: lab.side, dy: lab.dy };
  }

  // Bubbles here run smaller than on the other charts, so close scores stay apart.
  function sizer(max) {
    var lo = k().th().space[2], hi = k().th().space[6] + k().th().space[1];
    return function (v) { return lo + (hi - lo) * Math.sqrt(Math.max(v, 0) / (max || 1)); };
  }

  function chart(ctx, rows, gs, sizeCol, perRegion, filtered) {
    var K = k(), th = K.th(), def = ctx.def, mid = midpoint(), hit = marker(ctx.highlight);
    var pts = rows.filter(function (r) { return r.x.state === 'value' && r.y.state === 'value'; });
    nudge(pts);
    var max = 0;
    if (sizeCol) pts.forEach(function (p) { if (p.s && p.s.state === 'value' && p.s.v > max) max = p.s.v; });
    var size = sizeCol ? sizer(max) : function () { return th.space[4]; }, ring = [];
    // With every region shown against the rest, only the focus region's points carry labels (the grey ones stay unlabelled).
    pts.forEach(function (p) {
      var hasSize = !sizeCol || (p.s && p.s.state === 'value');
      p.d = sizeCol && hasSize ? size(p.s.v) : sizeCol ? th.space[2] : th.space[4];
      p.named = filtered || !perRegion || p.g.role !== 'muted';
      p.text = filtered ? p.g.label : p.ind.name;
    });
    placeLabels(pts, th.type.chart);
    var series = gs.map(function (g) {
      var mine = pts.filter(function (p) { return p.g === g; });
      if (!mine.length) return null;
      return { type: 'scatter', tapRole: 'value', name: g.label, z: g.role === 'focus' ? 4 : g.kind === 'combined' || g.role === 'muted' ? 2 : 3,
        // Placement is done above; ECharts still hides any label that overlaps on the actual canvas, as a last resort.
        labelLayout: { hideOverlap: true }, clip: false,
        labelLine: { show: true, length2: th.space[1], lineStyle: { color: th.muted, width: th.border.control } },
        data: mine.map(function (p) {
          var hasSize = !sizeCol || (p.s && p.s.state === 'value'), d = p.d;
          var at = [p.x.v + p.dx, p.y.v + p.dy];
          if (hit(p)) ring.push({ value: at, entityId: g.id, size: d });
          return { value: at.concat([sizeCol && hasSize ? p.s.v : 0]), raw: [p.x.v, p.y.v, sizeCol ? (hasSize ? p.s.v : null) : null],
            keys: [def.x, def.y, sizeCol ? sizeCol.key : null], entityId: g.id, industryId: p.ind.id, name: p.ind.name, symbolSize: d,
            itemStyle: { color: g.color }, label: Object.assign({ show: !!p.lab }, labelAt(p, d),
              { fontSize: th.type.chart, color: th.ink, formatter: p.text }) };
        }),
        tooltip: { formatter: function (prm) { return tooltip(def, mine.filter(function (q) { return q.ind.id === prm.data.industryId; })[0], sizeCol); } } };
    }).filter(Boolean);
    if (!series.length) series.push({ type: 'scatter', tapRole: 'value', data: [] });
    series[0].markLine = { silent: true, symbol: 'none', label: { show: false },
      lineStyle: { color: th.echarts.tap.quadrant.line, width: th.echarts.tap.quadrant.lineWidth, type: 'solid' }, data: [{ xAxis: mid }, { yAxis: mid }] };
    series[0].markArea = areas(mid, SCALE, SCALE, ctx.highlight);
    if (ring.length) series.push(K.ringSeries(ring));
    var mx = TAP.measures.meta(def.x), my = TAP.measures.meta(def.y);
    var option = { tooltip: { trigger: 'item' }, grid: K.grid({ top: th.space[12], left: th.space[8], bottom: th.space[12] }),
      title: { text: perRegion ? t('quadrant.everyStatement') : t('quadrant.averageStatement'), left: 0, top: 0,
        textStyle: { fontSize: th.type.label, fontWeight: 600, color: th.muted } },
      xAxis: axis(mx, th.space[8], SCALE), yAxis: axis(my, th.space[8], SCALE), series: series };
    return { option: option, pts: pts, sizeLegend: sizeCol && max > 0 ? sizeLegend(max, sizeCol) : null };
  }

  function sizeLegend(max, col) {
    var f = sizer(max);
    return { label: t('quadrant.sizeLegend', { measure: k().lower(col.label) }), kind: TAP.format.kind(col.kind).text,
      items: [max, max / 4, max / 16].map(function (v) { return { d: Math.round(f(v)), text: TAP.format.cell({ v: v, state: 'value' }, { unit: col.unit }) }; }) };
  }

  /* ---------- table, notes, takeaway ---------- */

  function table(def, rows, sizeCol) {
    var C = function (key, label, unit, align) { return { key: key, label: label, unit: unit, align: align }; };
    var cols = [C('entity', t('chart.entityColumn'), 'text', 'left'), C('industry', t('chart.industryColumn'), 'text', 'left'),
      C(def.y, TAP.measures.meta(def.y).label, 'score', 'right'), C(def.x, TAP.measures.meta(def.x).label, 'score', 'right')]
      .concat(sizeCol ? [C(sizeCol.key, sizeCol.label, sizeCol.unit, 'right')] : [], [C('quadrant', t('quadrant.area'), 'text', 'left')]);
    return { columns: cols, rows: rows.map(function (r) {
      var q = TAP.scores.quadrant(r.y, r.x), cells = { entity: { v: r.g.label, state: 'value', kind: null },
        industry: { v: r.ind.name, state: 'value', kind: null },
        quadrant: q ? { v: areaLabel(q), state: 'value', kind: 'APP' } : { v: null, state: 'notProvided', kind: 'APP' } };
      cells[def.y] = r.y; cells[def.x] = r.x;
      if (sizeCol) cells[sizeCol.key] = r.s;
      return { entityId: r.g.id, industryId: r.ind.id, cells: cells, src: r.y.src || null };
    }) };
  }

  function notes(def, rows, perRegion) {
    var K = k(), out = perRegion ? [] : [t('quadrant.averageNote')];
    function add(m) { if (m && out.indexOf(m) < 0) out.push(m); }
    rows.forEach(function (r) {
      [[def.y, r.y], [def.x, r.x]].forEach(function (p) {
        var c = p[1], label = K.lower(TAP.measures.meta(p[0]).label), s = c.src || {};
        if (c.state === 'value' && s.combined && (s.excluded || []).length) add(K.t('chart.note', { label: r.ind.name, measure: label, text: TAP.agg.describe(c) }));
      });
      var lost = r.y.state === 'notProvided' ? def.y : r.x.state === 'notProvided' ? def.x : null;
      if (lost) add(K.t('chart.notPlaced', { name: r.ind.name + ' · ' + r.g.label, measure: K.lower(TAP.measures.meta(lost).label) }));
    });
    return out;
  }

  // Counts the points of the first group (the focus region, or the average) in the "not yet able" area.
  function takeaway(gs, pts, perRegion) {
    var g = gs[0], focus = g && g.role === 'focus', mine = perRegion && !focus ? pts : pts.filter(function (p) { return p.g === g; });
    if (!mine.length) return null;
    var n = mine.filter(function (p) { return TAP.scores.quadrant(p.y, p.x) === 'attractiveNotYet'; }).length;
    return t(perRegion && !focus ? 'quadrant.takeawayEvery' : 'quadrant.takeaway', { who: g.label, n: n, total: mine.length, area: areaLabel('attractiveNotYet') });
  }

  /* ---------- build ---------- */

  function controls(opts, inds) {
    return [{ key: 'everyRegion', label: t('quadrant.show'), kind: 'segmented', value: !!opts.everyRegion,
      options: [{ value: false, label: t('quadrant.showAverage') }, { value: true, label: t('quadrant.showEvery') }] },
    { key: 'industryFilter', label: t('quadrant.filter'), kind: 'select', value: opts.industryFilter || '',
      options: [{ value: '', label: t('quadrant.allIndustries') }].concat(inds.map(function (d) { return { value: d.id, label: d.name }; })) }];
  }

  function missing(ctx, def) {
    var ids = TAP.scope.regionIds(ctx.cmp), inds = TAP.data.industries({ rated: true }), any = false, gone = [];
    ids.forEach(function (id) {
      var states = [];
      inds.forEach(function (d) { [def.x, def.y].forEach(function (m) { states.push(TAP.measures.get(m)(id, { industryId: d.id }).state); }); });
      if (states.indexOf('value') >= 0) any = true; else if (states.indexOf('notProvided') >= 0) gone.push(id);
    });
    return { names: gone.map(function (id) { return TAP.content.regionName(TAP.data.region(id)); }), empty: !any };
  }

  function build(ctx) {
    var K = k(), def = ctx.def, opts = ctx.opts || {}, type = ctx.type || def.defaultType, all = TAP.data.industries({ rated: true });
    var filter = all.filter(function (d) { return d.id === opts.industryFilter; })[0] || null;
    var perRegion = !!opts.everyRegion || !!filter, gs = groups(ctx, perRegion);
    var sizeId = type === 'scatter' ? null : (ctx.sizeId || (def.size && def.size.default) || null);
    var sm = sizeId && TAP.measures.meta(sizeId), sizeCol = sm ? { key: sizeId, label: sm.label, unit: sm.unit, kind: sm.kind } : null;
    var rows = collect(def, gs, filter ? [filter] : all, sizeId), drawn = chart(ctx, rows, gs, sizeCol, perRegion, !!filter), gap = missing(ctx, def);
    var res = K.result(def, null, { table: table(def, rows, sizeCol), notes: notes(def, rows, perRegion), missing: gap.names, empty: gap.empty,
      legend: K.legendOf({ entities: gs.filter(function (g) { return drawn.pts.some(function (p) { return p.g === g; }); }) }),
      sizeLegend: drawn.sizeLegend, controls: controls(opts, all), takeaway: takeaway(gs, drawn.pts, perRegion),
      target: function (prm) {
        var d = prm && prm.data, g = d && gs.filter(function (x) { return x.id === d.entityId; })[0];
        return g ? { reportId: def.id, regionIds: g.regionIds.slice(), industryIds: d.industryId ? [d.industryId] : [], accountIds: [], mark: 'points' } : null;
      } });
    if (type !== 'table') res.option = drawn.option;
    return res;
  }

  TAP.builders.register('quadrant', TAP.shapes.kit.safely(build));
})(window.TAP);
