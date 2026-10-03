/*
 * File: js/reports/quadrant.js
 * Purpose: Draws attractiveness against ability to win (US-1.5.5) with four neutral labelled areas split at the
 *          midpoint. By default one bubble per industry, its scores averaged over the regions in scope by the
 *          rating rule; "Show every region" or an industry filter shows one point per region and industry,
 *          nudged apart for display only. Tooltips and the table always read the exact cells.
 * Provides: chart builder 'quadrant' (registered with TAP.builders)
 * Depends on: js/engine/registry.js, js/engine/scope.js, js/engine/measures.js, js/engine/scores.js,
 *             js/engine/aggregate.js, js/engine/shapes.js (drawing kit), js/core/format.js, js/core/content.js
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
    var th = k().th();
    return { id: id, kind: 'region', regionIds: [id], how: null, role: role, label: TAP.content.regionName(TAP.data.region(id)),
      color: role === 'muted' ? th.focusGrey : TAP.scope.colorOf(id) };
  }
  function average(id, ids, label) {
    return { id: id, kind: 'combined', regionIds: ids, how: 'average', role: 'combined', color: k().th().combined, label: label };
  }

  // The groups of points: an average per industry by default (the focus region apart), or every region.
  function groups(ctx, perRegion) {
    var ents = ctx.entities || TAP.scope.entities(ctx.cmp), ids = TAP.scope.regionIds(ctx.cmp);
    var focus = ents[0] && ents[0].role === 'focus' ? ents[0] : null;
    var oneVsRest = !!focus && ents.some(function (e) { return e.role === 'muted' || e.role === 'combined'; });
    if (perRegion) {
      return ids.map(function (id) {
        return region(id, focus && id === focus.id ? 'focus' : oneVsRest ? 'muted' : 'region');
      });
    }
    if (focus) {
      if (!oneVsRest) return ents.slice();
      var rest = ents.filter(function (e) { return e.role === 'combined'; })[0];
      var others = ids.filter(function (id) { return id !== focus.id; });
      return [focus, rest || average('rest', others, t('combined.restAverage', { n: others.length, regions: regionsWord(others.length) }))];
    }
    if (ents.length === 1) return ents.slice();
    return [average('avg', ids, t('quadrant.average', { n: ids.length, regions: regionsWord(ids.length) }))];
  }

  function ratingFields(which) {
    var w = settings()[which] || {};
    return Object.keys(w).filter(function (f) { return w[f] > 0; });
  }

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
        var a = -Math.PI / 2 + 2 * Math.PI * i / same.length;
        p.dx = same.length > 1 ? r * Math.cos(a) : 0;
        p.dy = same.length > 1 ? r * Math.sin(a) : 0;
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

  // The axis range: the points plus some room, always both sides of the midpoint, within the 1 to 3 scale.
  // Averages bunch together, so a fixed 1 to 3 axis would stack their labels on top of each other.
  function range(vals, mid) {
    var lo = vals.length ? Math.min.apply(null, vals) : 1, hi = vals.length ? Math.max.apply(null, vals) : 3;
    lo = Math.max(0.5, Math.min(lo - 0.2, mid - 0.25));
    hi = Math.min(3.5, Math.max(hi + 0.2, mid + 0.25));
    var step = hi - lo > 1.5 ? 0.5 : 0.25;   // ticks start at the minimum, so both ends sit on a step
    return { min: Math.floor(lo / step) * step, max: Math.ceil(hi / step) * step, interval: step };
  }

  function axis(meta, gap, r) {
    var th = k().th();
    return { type: 'value', min: r.min, max: r.max, interval: r.interval, name: meta.label, nameLocation: 'middle', nameGap: gap,
      splitLine: { show: false }, axisLabel: { fontSize: th.type.chart,
        formatter: function (v) { return Math.abs(v * 2 - Math.round(v * 2)) < 1e-9 ? TAP.format.num(v) : ''; } } };
  }

  // Bubbles here run smaller than on the other charts, so close scores stay apart.
  function sizer(max) {
    var th = k().th(), lo = th.space[2], hi = th.space[8] + th.space[2];
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
    var series = gs.map(function (g) {
      var mine = pts.filter(function (p) { return p.g === g; }), named = filtered || !perRegion || g.role !== 'muted';
      if (!mine.length) return null;
      return { type: 'scatter', tapRole: 'value', name: g.label, z: g.role === 'focus' ? 4 : g.kind === 'combined' || g.role === 'muted' ? 2 : 3,
        labelLayout: { hideOverlap: true },
        data: mine.map(function (p) {
          var hasSize = !sizeCol || (p.s && p.s.state === 'value'), d = sizeCol && hasSize ? size(p.s.v) : sizeCol ? th.space[2] : th.space[4];
          var at = [p.x.v + p.dx, p.y.v + p.dy];
          if (hit(p)) ring.push({ value: at, entityId: g.id, size: d });
          return { value: at.concat([sizeCol && hasSize ? p.s.v : 0]), raw: [p.x.v, p.y.v, sizeCol ? (hasSize ? p.s.v : null) : null],
            keys: [def.x, def.y, sizeCol ? sizeCol.key : null], entityId: g.id, industryId: p.ind.id, name: p.ind.name, symbolSize: d,
            itemStyle: { color: g.color }, label: { show: named, position: p.x.v > mid ? 'left' : 'right', fontSize: th.type.chart, color: th.ink,
              formatter: filtered ? g.label : p.ind.name } };
        }),
        tooltip: { formatter: function (prm) {
          var r = mine.filter(function (q) { return q.ind.id === prm.data.industryId; })[0];
          return tooltip(def, r, sizeCol);
        } } };
    }).filter(Boolean);
    if (!series.length) series.push({ type: 'scatter', tapRole: 'value', data: [] });
    series[0].markLine = { silent: true, symbol: 'none', label: { show: false },
      lineStyle: { color: th.echarts.tap.quadrant.line, width: th.echarts.tap.quadrant.lineWidth, type: 'solid' }, data: [{ xAxis: mid }, { yAxis: mid }] };
    var X = range(pts.map(function (p) { return p.x.v + p.dx; }), mid), Y = range(pts.map(function (p) { return p.y.v + p.dy; }), mid);
    series[0].markArea = areas(mid, X, Y, ctx.highlight);
    if (ring.length) series.push(K.ringSeries(ring));
    var mx = TAP.measures.meta(def.x), my = TAP.measures.meta(def.y);
    var option = { tooltip: { trigger: 'item' }, grid: K.grid({ top: th.space[12], left: th.space[8], bottom: th.space[12] }),
      title: { text: perRegion ? t('quadrant.everyStatement') : t('quadrant.averageStatement'), left: 0, top: 0,
        textStyle: { fontSize: th.type.label, fontWeight: 600, color: th.muted } },
      xAxis: axis(mx, th.space[8], X), yAxis: axis(my, th.space[8], Y), series: series };
    return { option: option, pts: pts, sizeLegend: sizeCol && max > 0 ? sizeLegend(max, sizeCol) : null };
  }

  function sizeLegend(max, col) {
    var f = sizer(max);
    return { label: t('quadrant.sizeLegend', { measure: k().lower(col.label) }), kind: TAP.format.kind(col.kind).text,
      items: [max, max / 4, max / 16].map(function (v) { return { d: Math.round(f(v)), text: TAP.format.cell({ v: v, state: 'value' }, { unit: col.unit }) }; }) };
  }

  /* ---------- table, notes, takeaway ---------- */

  function table(def, rows, sizeCol) {
    var cols = [{ key: 'entity', label: t('chart.entityColumn'), unit: 'text', align: 'left' },
      { key: 'industry', label: t('chart.industryColumn'), unit: 'text', align: 'left' },
      { key: def.y, label: TAP.measures.meta(def.y).label, unit: 'score', align: 'right' },
      { key: def.x, label: TAP.measures.meta(def.x).label, unit: 'score', align: 'right' }];
    if (sizeCol) cols.push({ key: sizeCol.key, label: sizeCol.label, unit: sizeCol.unit, align: 'right' });
    cols.push({ key: 'quadrant', label: t('quadrant.area'), unit: 'text', align: 'left' });
    return { columns: cols, rows: rows.map(function (r) {
      var q = TAP.scores.quadrant(r.y, r.x), cells = { entity: { v: r.g.label, state: 'value', kind: null },
        industry: { v: r.ind.name, state: 'value', kind: null },
        quadrant: q ? { v: areaLabel(q), state: 'value', kind: 'APP' } : { v: null, state: 'notProvided', kind: 'APP' } };
      cells[def.y] = r.y;
      cells[def.x] = r.x;
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
    var g = gs[0], focus = g && g.role === 'focus';
    var mine = perRegion && !focus ? pts : pts.filter(function (p) { return p.g === g; });
    if (!mine.length) return null;
    var n = mine.filter(function (p) { return TAP.scores.quadrant(p.y, p.x) === 'attractiveNotYet'; }).length;
    var key = perRegion && !focus ? 'quadrant.takeawayEvery' : 'quadrant.takeaway';
    return t(key, { who: g.label, n: n, total: mine.length, area: areaLabel('attractiveNotYet') });
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
