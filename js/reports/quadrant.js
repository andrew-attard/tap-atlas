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

  /*
   * The plot in screen pixels: the panel passes the chart's size (ctx.size), so labels are placed where they will be
   * drawn. The margins are fixed (no containLabel) and hold the axis labels and the four area names, which sit
   * outside the plot so no bubble can cover them. f grows everything with the expanded view's larger text.
   */
  function frame(ctx) {
    var th = k().th(), f = ctx.expanded ? 1.3 : 1, fs = th.type.chart * f, lh = Math.round(fs + 6);
    var size = ctx.size && ctx.size.w > 200 ? ctx.size : { w: 520, h: th.chartHeight.tall };
    var m = { top: Math.round(28 * f) + lh + 22, right: 16, bottom: Math.round(36 * f) + lh * 2 + 8, left: Math.round(40 * f) + lh };
    return { f: f, fs: fs, lh: lh, m: m, x0: m.left, y0: m.top, w: Math.max(120, size.w - m.left - m.right), h: Math.max(120, size.h - m.top - m.bottom) };
  }
  function px(F, x, y) { return { x: F.x0 + (x - SCALE.min) / 2 * F.w, y: F.y0 + (SCALE.max - y) / 2 * F.h }; }

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

  /*
   * Places labels in screen pixels, the largest bubbles first so they win. A label never covers a labelled bubble and
   * stays in the plot; with no free spot it is left off (the point stays in the table and opens its details on click).
   */
  function placeLabels(pts, F) {
    var lh = F.lh, placed = [], cw = F.fs * 0.56, tries = [];
    var dots = pts.filter(function (p) { return p.named; }).map(function (p) { var c = at(p); c.r *= 0.8; return c; });
    function at(p) { var c = px(F, p.x.v + p.dx, p.y.v + p.dy); c.r = p.d / 2; return c; }
    function gp(p) { return p.ind.groupPriority ? 1 : 0; }   // equal sizes: group priorities first
    function free(b) {
      if (b.x < F.x0 || b.y < F.y0 - 4 || b.x + b.w > F.x0 + F.w + F.m.right - 4 || b.y + b.h > F.y0 + F.h) return false;
      return !placed.some(function (q) { return b.x < q.x + q.w && q.x < b.x + b.w && b.y < q.y + q.h && q.y < b.y + b.h; }) &&
        !dots.some(function (d) { return d.x + d.r > b.x && d.x - d.r < b.x + b.w && d.y + d.r > b.y && d.y - d.r < b.y + b.h; });
    }
    // Spots by distance: beside the bubble first, then a line up or down, then further out on a longer leader line
    [6, 28, 56, 90].forEach(function (g) { [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5].forEach(function (st) { tries.push([g, st, g / lh + Math.abs(st)]); }); });
    tries.sort(function (a, b) { return a[2] - b[2]; });
    var order = pts.filter(function (p) { return p.named; }).sort(function (a, b) { return Math.round(b.d) - Math.round(a.d) || gp(b) - gp(a) || b.y.v - a.y.v; });
    // Two rounds: every label first tries the spots close to its bubble, and only then the far ones
    [tries.filter(function (tr) { return tr[2] <= 2; }), tries].forEach(function (list, round) {
      order.forEach(function (p) {
        if (round && p.lab) return;
        var c = at(p), wr = wrap(p.text, Math.max(110, F.w * 0.34) / cw), w = wr.width * cw + 6, h = lh * wr.lines;
        var sides = c.x > F.x0 + F.w * 0.6 ? ['left', 'right'] : ['right', 'left'];
        p.label = wr.text; p.lab = null;
        list.some(function (tr) {
          return sides.some(function (side) {
            var bx = { x: side === 'right' ? c.x + c.r + tr[0] : c.x - c.r - tr[0] - w, y: c.y - h / 2 + tr[1] * lh, w: w, h: h };
            if (!free(bx)) return false;
            placed.push(bx); p.lab = { side: side, dy: tr[1] * lh, gap: tr[0] };
            return true;
          });
        });
      });
    });
  }
  // Long names break onto a second line, so they fit where one long line would not.
  function wrap(text, max) {
    var lines = [''];
    String(text).split(' ').forEach(function (wd) {
      var l = lines[lines.length - 1];
      if (l && (l + ' ' + wd).length > max) lines.push(wd); else lines[lines.length - 1] = l ? l + ' ' + wd : wd;
    });
    return { lines: lines.length, width: Math.max.apply(null, lines.map(function (l) { return l.length; })), text: lines.join('\n') };
  }
  // The label's spot beside its bubble (d px wide), as a position inside the symbol's box, stepped by dy.
  function labelAt(p, d) {
    var lab = p.lab || { side: 'right', dy: 0, gap: 6 }, r = lab.side === 'right';
    return { position: [r ? d + lab.gap : -lab.gap, d / 2 + lab.dy], align: r ? 'left' : 'right', verticalAlign: 'middle', side: lab.side, dy: lab.dy };
  }
  // Bubbles here run smaller than on the other charts, so close scores stay apart.
  function sizer(max) {
    var lo = k().th().space[2], hi = k().th().space[6] + k().th().space[1];
    return function (v) { return lo + (hi - lo) * Math.sqrt(Math.max(v, 0) / (max || 1)); };
  }
  /*
   * Which points carry a label. Every region shown: the focus region's points only, when there is one. Two groups
   * (one against the rest, or a pair): each industry is named once, at the first group's point, and a thin line joins
   * its two bubbles. An industry filter labels each point with its region.
   */
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
  function chart(ctx, rows, gs, sizeCol, perRegion, filtered) {
    var K = k(), th = K.th(), def = ctx.def, mid = midpoint(), hit = marker(ctx.highlight), F = frame(ctx);
    var pts = rows.filter(function (r) { return r.x.state === 'value' && r.y.state === 'value'; });
    nudge(pts);
    var max = 0;
    if (sizeCol) pts.forEach(function (p) { if (p.s && p.s.state === 'value' && p.s.v > max) max = p.s.v; });
    var size = sizeCol ? sizer(max) : function () { return th.space[4]; }, ring = [];
    pts.forEach(function (p) { p.d = !sizeCol ? th.space[4] : p.s && p.s.state === 'value' ? size(p.s.v) : th.space[2]; });
    var paired = naming(pts, gs, perRegion, filtered);
    placeLabels(pts, F);
    var series = gs.map(function (g) {
      var mine = pts.filter(function (p) { return p.g === g; });
      if (!mine.length) return null;
      return { type: 'scatter', tapRole: 'value', name: g.label, z: g.role === 'focus' ? 8 : g.kind === 'combined' || g.role === 'muted' ? 6 : 7,
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
    var res = K.result(def, null, { table: table(def, rows, sizeCol), notes: notes(def, rows, perRegion, gs, drawn.paired), missing: gap.names, empty: gap.empty,
      legend: K.legendOf({ entities: gs.filter(function (g) { return drawn.pts.some(function (p) { return p.g === g; }); }) }),
      sizeLegend: drawn.sizeLegend, controls: controls(opts, all), takeaway: takeaway(gs, drawn.pts, perRegion),
      target: function (prm) {
        var d = prm && prm.data, g = d && gs.filter(function (x) { return x.id === d.entityId; })[0];
        return g ? { reportId: def.id, regionIds: g.regionIds.slice(), industryIds: d.industryId ? [d.industryId] : [], accountIds: [], mark: 'points' } : null;
      } });
    if (type !== 'table') { res.option = drawn.option; res.sized = true; }   // labels are placed for ctx.size
    return res;
  }

  TAP.builders.register('quadrant', TAP.shapes.kit.safely(build));
})(window.TAP);
