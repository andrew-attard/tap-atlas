/*
 * File: js/reports/quadrant.js
 * Purpose: Draws attractiveness against ability to win (US-1.5.5) with four neutral labelled areas split at the
 *          midpoint. By default one bubble per industry, its scores averaged over the regions in scope by the
 *          rating rule; "Show every region" or an industry filter shows one point per region and industry,
 *          nudged apart for display only. Each bubble carries its industry's number from the key (QA-3) and a name
 *          where one fits cleanly. Tooltips and the table always read the exact cells.
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
  // An industry's number on the bubbles, the key and the table: its place in the lookup list, so it never changes (QA-3).
  function industryNo(id) { return TAP.data.industries({ rated: true }).map(function (d) { return d.id; }).indexOf(id) + 1; }
  function regionNo(g) { return TAP.data.regionIndex(g.regionIds[0]) + 1; }

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
      same.forEach(function (p, i) { var a = -Math.PI / 2 + 2 * Math.PI * i / same.length, on = same.length > 1; p.dx = on ? r * Math.cos(a) : 0; p.dy = on ? r * Math.sin(a) : 0; });
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
  // Both axes always show the whole score scale, so the midpoint lines sit in the middle and the four areas are equal.
  var SCALE = { min: 1, max: 3, interval: 0.5 };

  // The four area names, outside the plot: the upper two above it, the lower two under the axis numbers.
  function areaNames(F, hl) {
    var th = k().th(), Q = th.echarts.tap.quadrant, top = F.y0 - 20, low = F.y0 + F.h + Math.round(30 * F.f), x1 = F.x0 + F.w;
    var at = { attractiveNotYet: [F.x0, top, 'left', 'bottom'], attractiveAble: [x1, top, 'right', 'bottom'],
      lessBoth: [F.x0, low, 'left', 'top'], lessAttractiveAble: [x1, low, 'right', 'top'] };
    return AREAS.map(function (q) {
      var on = !!hl && hl.mark === 'quadrant' && hl.quadrant === q;
      return { type: 'text', x: at[q][0], y: at[q][1], silent: true, tapQuadrant: q, style: { text: areaLabel(q), fill: on ? th.accentDeep : Q.label,
        fontSize: Q.labelSize, fontWeight: on ? 800 : 600, align: at[q][2], verticalAlign: at[q][3] } };
    });
  }
  // The areas keep their outline for a "Show me" on a quadrant; their names are drawn by areaNames.
  function areas(mid, X, Y, hl) {
    var th = k().th();
    var spec = { attractiveNotYet: [[X.min, mid], [mid, Y.max]], attractiveAble: [[mid, mid], [X.max, Y.max]],
      lessBoth: [[X.min, Y.min], [mid, mid]], lessAttractiveAble: [[mid, Y.min], [X.max, mid]] };
    return { silent: true, itemStyle: { color: 'transparent' }, label: { show: false },
      data: AREAS.map(function (q) {
        var on = hl && hl.quadrant === q;
        return [{ coord: spec[q][0], name: areaLabel(q), tapQuadrant: q,
          itemStyle: on ? { borderColor: th.accent, borderWidth: th.border.highlight, borderType: 'solid' } : { borderWidth: 0 } }, { coord: spec[q][1] }];
      }) };
  }
  function axis(meta, gap, r, fs) {
    return { type: 'value', min: r.min, max: r.max, interval: r.interval, name: meta.label, nameLocation: 'middle', nameGap: gap,
      nameTextStyle: { fontSize: fs }, splitLine: { show: false }, axisLabel: { fontSize: fs,
        formatter: function (v) { return Math.abs(v * 2 - Math.round(v * 2)) < 1e-9 ? TAP.format.num(v) : ''; } } };
  }

  // Bubbles here run smaller than on the other charts, so close scores stay apart.
  function sizer(max) {
    var lo = k().th().space[2], hi = k().th().space[6] + k().th().space[1];
    return function (v) { return lo + (hi - lo) * Math.sqrt(Math.max(v, 0) / (max || 1)); };
  }
  // Which points may carry a name: with every region shown, not the grey ones; with two groups (one against the rest,
  // or a pair) the first group's point, a thin line joining the two; with an industry filter, each point (its region).
  function naming(pts, gs, perRegion, filtered) {
    var paired = !perRegion && !filtered && gs.length > 1, first = {};
    pts.forEach(function (p) {
      p.text = filtered ? p.g.label : p.ind.name;
      if (filtered) p.named = true;
      else if (perRegion) p.named = p.g.role !== 'muted';
      else p.named = !paired || !first[p.ind.id];
      if (paired && p.named) first[p.ind.id] = p;
    });
    return paired;
  }
  function links(pts) {
    var th = k().th(), first = {}, out = [], at = function (p) { return { coord: [p.x.v + p.dx, p.y.v + p.dy] }; };
    pts.forEach(function (p) { if (first[p.ind.id]) out.push([at(first[p.ind.id]), at(p)]); else first[p.ind.id] = p; });
    return { type: 'scatter', tapRole: 'link', silent: true, data: [], z: 1,
      markLine: { silent: true, symbol: 'none', z: 1, label: { show: false }, lineStyle: { color: th.grid, width: th.border.control, type: 'solid' }, data: out } };
  }

  // The line over the chart says what one bubble stands for in this comparison.
  function caption(gs, perRegion) {
    if (perRegion || gs.every(function (g) { return g.kind === 'region'; })) return t('quadrant.everyStatement');
    return gs[0] && gs[0].role === 'focus' ? t('quadrant.focusStatement', { focus: gs[0].label }) : t('quadrant.averageStatement');
  }
  function zOf(g) { return g.role === 'focus' ? 8 : g.kind === 'combined' || g.role === 'muted' ? 6 : 7; }
  function chart(ctx, rows, gs, sizeCol, perRegion, filtered) {
    var K = k(), th = K.th(), def = ctx.def, mid = midpoint(), hit = marker(ctx.highlight), L = TAP.quadrantLabels, F;
    var pts = rows.filter(function (r) { return r.x.state === 'value' && r.y.state === 'value'; });
    nudge(pts);
    var max = 0;
    if (sizeCol) pts.forEach(function (p) { if (p.s && p.s.state === 'value' && p.s.v > max) max = p.s.v; });
    var size = sizeCol ? sizer(max) : function () { return th.space[4]; }, ring = [];
    pts.forEach(function (p) { p.d = !sizeCol ? th.space[4] : p.s && p.s.state === 'value' ? size(p.s.v) : th.space[2]; });
    var paired = naming(pts, gs, perRegion, filtered);
    // Every bubble carries a number (its region's, when one industry is filtered), so none is named by hover only.
    // Smaller bubbles are drawn over bigger ones, so none is buried; rank is the drawing order.
    pts.forEach(function (p) { p.num = filtered ? regionNo(p.g) : industryNo(p.ind.id); p.light = p.g.role === 'muted'; });
    pts.forEach(function (p, i) { p.i = i; });
    pts.sort(function (a, b) { return zOf(a.g) - zOf(b.g) || b.d - a.d || a.i - b.i; }).forEach(function (p, i) { p.rank = i; });
    F = L.place(pts, ctx, { scale: SCALE, near: perRegion || paired });   // many bubbles: names right beside, else numbers
    var series = gs.map(function (g) {
      var mine = pts.filter(function (p) { return p.g === g; });
      if (!mine.length) return null;
      return { type: 'scatter', tapRole: 'value', name: g.label, z: zOf(g),
        // Placement is done above; ECharts still hides any label that overlaps on the actual canvas, as a last resort.
        labelLayout: { hideOverlap: true }, clip: false,
        labelLine: { show: true, length2: th.space[1], lineStyle: { color: th.muted, width: th.border.control } },
        data: mine.map(function (p) {
          var hasSize = !sizeCol || (p.s && p.s.state === 'value'), d = p.d;
          var at = [p.x.v + p.dx, p.y.v + p.dy];
          if (hit(p)) ring.push({ value: at, entityId: g.id, size: d });
          return { value: at.concat([sizeCol && hasSize ? p.s.v : 0]), raw: [p.x.v, p.y.v, sizeCol ? (hasSize ? p.s.v : null) : null],
            keys: [def.x, def.y, sizeCol ? sizeCol.key : null], entityId: g.id, industryId: p.ind.id, name: p.ind.name, symbolSize: d,
            itemStyle: { color: g.color }, labelLine: { show: !!p.lab && (p.lab.gap > 6 || Math.abs(p.lab.dy) >= F.lh) },
            label: Object.assign({ show: !!p.lab }, L.at(p, d),
              { fontSize: th.type.chart, color: th.ink, backgroundColor: th.ground, padding: [1, 2], formatter: p.label || p.text }) };
        }),
        tooltip: { formatter: function (prm) { return tooltip(def, mine.filter(function (q) { return q.ind.id === prm.data.industryId; })[0], sizeCol); } } };
    }).filter(Boolean);
    if (!series.length) series.push({ type: 'scatter', tapRole: 'value', data: [], clip: false });
    // The midpoint lines sit under the bubbles (z 6 and up), so a label's background breaks a line instead of being struck
    series[0].markLine = { silent: true, symbol: 'none', z: 1, label: { show: false }, data: [{ xAxis: mid }, { yAxis: mid }],
      lineStyle: { color: th.echarts.tap.quadrant.line, width: th.echarts.tap.quadrant.lineWidth, type: 'solid' } };
    series[0].markArea = areas(mid, SCALE, SCALE, ctx.highlight);
    if (paired) series.push(links(pts));
    series.push(L.numbers(pts));
    if (ring.length) series.push(K.ringSeries(ring));
    var mx = TAP.measures.meta(def.x), my = TAP.measures.meta(def.y), fs = th.type.chart;
    var option = { tooltip: { trigger: 'item' }, grid: { left: F.m.left, right: F.m.right, top: F.m.top, bottom: F.m.bottom, containLabel: false },
      title: { text: caption(gs, perRegion), left: 0, top: 0, textStyle: { fontSize: th.type.label, fontWeight: 600, color: th.muted } },
      graphic: areaNames(F, ctx.highlight),
      xAxis: axis(mx, Math.round(36 * F.f) + F.lh + 8, SCALE, fs), yAxis: axis(my, Math.round(30 * F.f) + 4, SCALE, fs), series: series };
    return { option: option, pts: pts, paired: paired, frame: F, sizeLegend: sizeCol && max > 0 ? sizeLegend(max, sizeCol) : null };
  }
  function sizeLegend(max, col) {
    var f = sizer(max);
    return { label: t('quadrant.sizeLegend', { measure: k().lower(col.label) }), kind: TAP.format.kind(col.kind).text,
      items: [max, max / 4, max / 16].map(function (v) { return { d: Math.round(f(v)), text: TAP.format.cell({ v: v, state: 'value' }, { unit: col.unit }) }; }) };
  }
  function table(def, rows, sizeCol) {
    var C = function (key, label, unit, align) { return { key: key, label: label, unit: unit, align: align }; };
    var cols = [C('entity', t('chart.entityColumn'), 'text', 'left'), C('num', t('quadrant.numberColumn'), 'text', 'right'), C('industry', t('chart.industryColumn'), 'text', 'left'),
      C(def.y, TAP.measures.meta(def.y).label, 'score', 'right'), C(def.x, TAP.measures.meta(def.x).label, 'score', 'right')]
      .concat(sizeCol ? [C(sizeCol.key, sizeCol.label, sizeCol.unit, 'right')] : [], [C('quadrant', t('quadrant.area'), 'text', 'left')]);
    return { columns: cols, rows: rows.map(function (r) {
      var q = TAP.scores.quadrant(r.y, r.x), cells = { entity: { v: r.g.label, state: 'value', kind: null },
        industry: { v: r.ind.name, state: 'value', kind: null }, num: { v: String(industryNo(r.ind.id)), state: 'value', kind: null },
        quadrant: q ? { v: areaLabel(q), state: 'value', kind: 'APP' } : { v: null, state: 'notProvided', kind: 'APP' } };
      cells[def.y] = r.y; cells[def.x] = r.x;
      if (sizeCol) cells[sizeCol.key] = r.s;
      return { entityId: r.g.id, industryId: r.ind.id, cells: cells, src: r.y.src || null };
    }) };
  }
  function notes(def, rows, perRegion, gs, paired) {
    var K = k(), out = !perRegion && gs.some(function (g) { return g.kind === 'combined'; }) ? [t('quadrant.averageNote')] : [];
    if (paired) out.push(t('quadrant.joinNote', { first: gs[0].label }));
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

  // The Show switch only appears where averaging applies: a pair or one region already shows each region's own bubble.
  function controls(opts, inds, gs, perRegion) {
    var own = !perRegion && gs.every(function (g) { return g.kind === 'region'; });
    return (own ? [] : [{ key: 'everyRegion', label: t('quadrant.show'), kind: 'segmented', value: !!opts.everyRegion,
      options: [{ value: false, label: t('quadrant.showAverage') }, { value: true, label: t('quadrant.showEvery') }] }]).concat([
    { key: 'industryFilter', label: t('quadrant.filter'), kind: 'select', value: opts.industryFilter || '',
      options: [{ value: '', label: t('quadrant.allIndustries') }].concat(inds.map(function (d) { return { value: d.id, label: d.name }; })) }]);
  }
  // The region keys (numbered when one industry is filtered), then the numbered key of the industries drawn.
  function legend(gs, all, pts, filtered) {
    var shown = gs.filter(function (g) { return pts.some(function (p) { return p.g === g; }); });
    return k().legendOf({ entities: shown }).map(function (l, i) { return filtered ? Object.assign(l, { mark: regionNo(shown[i]) }) : l; })
      .concat(filtered ? [] : all.filter(function (d) { return pts.some(function (p) { return p.ind === d; }); })
        .map(function (d) { return { label: d.name, color: null, mark: industryNo(d.id), role: 'industry' }; }));
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
    var res = K.result(def, null, { table: table(def, rows, sizeCol), notes: notes(def, rows, perRegion, gs, drawn.paired), missing: gap.names, empty: gap.empty,
      legend: legend(gs, all, drawn.pts, !!filter),
      sizeLegend: drawn.sizeLegend, controls: controls(opts, all, gs, perRegion), takeaway: takeaway(gs, drawn.pts, perRegion),
      target: function (prm) {
        var d = prm && prm.data, g = d && gs.filter(function (x) { return x.id === d.entityId; })[0];
        return g ? { reportId: def.id, regionIds: g.regionIds.slice(), industryIds: d.industryId ? [d.industryId] : [], accountIds: [], mark: 'points' } : null;
      } });
    if (type !== 'table') { res.option = drawn.option; res.sized = true; }   // labels are placed for ctx.size
    return res;
  }

  TAP.builders.register('quadrant', TAP.shapes.kit.safely(build));
})(window.TAP);
