/*
 * File: js/reports/row-bubble.js
 * Purpose: A bubble chart with one bubble per row (account or partner) in its region's colour, the largest labelled
 *          (US-2.2.4, US-2.3.3). The definition's x, y and size name TAP.rows column keys; options.label is 'all'
 *          (names where they fit, up to TAP_SETTINGS.rowBubble.labelMax more numbered in the key, a note for the rest)
 *          or 'top' (the largest by options.labelBy, up to labelMax).
 * Provides: builder 'rowBubble'; TAP.bubbleLabels (MARGIN, frame, range, place, labelOf: the name placement, also
 *           used by the levers bubble in js/reports/nb-levers.js)
 * Depends on: js/engine/rows.js, js/engine/shapes.js (drawing kit), js/engine/scope.js, js/core/data.js,
 *             js/core/content.js, js/core/format.js, config/settings.js (all at call time)
 * Used by: js/panel/panel.js (through TAP.builders), config/reports-customers.js (cg-bubble), config/reports-partners.js (pt-capacity)
 * Owner: CGP stream (#206)
 */
(function (TAP) {
  'use strict';

  var SECTION = { accounts: 'customerGrowth', partners: 'partners', newBusiness: 'newBusiness' };

  function rname(id) { return TAP.content.regionName(TAP.data.region(id)); }
  function colOf(source, key) {
    var c = TAP.rows.columns(source).filter(function (x) { return x.key === key; })[0];
    return c || { key: key, label: key, unit: 'text', kind: null };
  }

  // The regions whose rows are drawn, in scope order: the focus (and second) region first, as on the list.
  function regionsOf(ctx) {
    var ids = TAP.scope.regionIds(ctx.cmp), cmp = ctx.cmp || {}, first = [];
    if ((cmp.mode === 'one' || cmp.mode === 'pair') && cmp.focus) first.push(cmp.focus);
    if (cmp.mode === 'pair' && cmp.second) first.push(cmp.second);
    ids = first.filter(function (r) { return ids.indexOf(r) >= 0; }).concat(ids.filter(function (r) { return first.indexOf(r) < 0; }));
    var drill = ctx.drill && ctx.drill.regionIds;
    return drill && drill.length ? ids.filter(function (r) { return drill.indexOf(r) >= 0; }) : ids;
  }

  // The entity a region belongs to in this comparison, for its colour and role (focus on top, the rest underneath).
  function entityOf(entities, regionId) {
    return entities.filter(function (e) { return e.regionIds.indexOf(regionId) >= 0; })[0] || null;
  }
  // Rows are never combined, so combined entities are redrawn for single rows: under the organization total each
  // row keeps its region's colour; "the rest" becomes the other regions in the light grey of other muted regions,
  // so the focus region stands out as on other charts.
  function drawEntities(entities, source) {
    var th = window.TAP_THEME;
    if (entities.length === 1 && entities[0].id === 'org') {
      return entities[0].regionIds.map(function (r) {
        return { id: r, kind: 'region', regionIds: [r], how: null, role: 'region', color: TAP.scope.colorOf(r), label: rname(r) };
      });
    }
    return entities.map(function (e) {
      if (e.kind !== 'combined') return e;
      return { id: e.id, kind: 'combined', regionIds: e.regionIds, how: null, role: 'muted', color: th.focusGrey,
        label: TAP.content.text('rowBubble.' + (e.regionIds.length === 1 ? 'othersOne.' : 'others.') + source, { n: e.regionIds.length }) };
    });
  }

  // A name beside the bubble, a number on it (named in the key), or nothing. A bubble too small to hold its number
  // carries it just to its right, in ink.
  function labelOf(p, e, th) {
    if (p.lab) return { show: true, position: p.lab, align: 'left', verticalAlign: 'top', fontSize: th.type.chart, color: th.ink, formatter: function () { return p.label; } };
    if (!p.num) return { show: false };
    var fits = p.d >= th.type.chartMin * 1.4 && !p.noSize;
    return { show: true, position: fits ? 'inside' : 'right', distance: 2, fontSize: th.type.chartMin, fontWeight: 700,
      color: !fits || e.role === 'muted' ? th.ink : th.onColour, formatter: function () { return String(p.num); } };
  }
  // A bubble whose size is not provided is drawn as an empty outline, as not-provided marks are elsewhere.
  function styleOf(p, e, th) {
    if (p.noSize) return { color: th.echarts.backgroundColor, borderColor: th.notProvided.border, borderWidth: th.border.rule, opacity: 1 };
    return { color: e.color, opacity: e.role === 'muted' ? 0.85 : 0.8, borderColor: th.ground, borderWidth: th.border.control };
  }

  function isMarked(hl, p, section) {
    if (!hl) return false;
    var items = hl.items || [], regs = hl.regionIds || [];
    if (items.length) {
      return items.some(function (i) { return (!i.section || i.section === section) && i.regionId === p.regionId && String(i.row) === String(p.row.key); });
    }
    return regs.length > 0 && regs.indexOf(p.regionId) >= 0;
  }

  /* ---------- names: beside the bubble where one fits, else a number with the name in the key (as QA-3) ---------- */

  var MARGIN = { left: 84, right: 24, top: 44, bottom: 64 };

  // The plot in screen pixels: the panel passes the chart's size (ctx.size) once drawn; until then a typical panel.
  function frame(ctx) {
    var z = ctx.size && ctx.size.w > 200 ? ctx.size : { w: 560, h: window.TAP_THEME.chartHeight.normal };
    return { x0: MARGIN.left, y0: MARGIN.top, w: Math.max(120, z.w - MARGIN.left - MARGIN.right), h: Math.max(120, z.h - MARGIN.top - MARGIN.bottom) };
  }
  // An axis range from zero (or the lowest value, if below zero) to a round number past the highest.
  function nice(v) { if (!(v > 0)) return 1; var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)); return Math.ceil(v * 1.08 / p) * p; }
  function range(vals) { var lo = Math.min.apply(null, vals.concat([0])), hi = Math.max.apply(null, vals.concat([0])); return { min: lo < 0 ? -nice(-lo) : 0, max: nice(hi) }; }

  function meet(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
  function inside(b, F) { return b.x >= F.x0 && b.y >= F.y0 - 8 && b.x + b.w <= F.x0 + F.w + MARGIN.right && b.y + b.h <= F.y0 + F.h; }

  // Each named point (in priority order) gets p.lab, the name's offset from its symbol's corner, at the first spot
  // (right, left, above, below) that is inside the plot, clear of names already placed and of other bubbles' centres.
  // A point with no clean spot gets p.num instead: a number on the bubble, with the name in the key.
  function place(named, all, F, fs, maxNums) {
    var boxes = [], n = 0;
    named.forEach(function (p) {
      var w = Math.ceil(p.label.length * fs * 0.56) + 4, h = fs + 4, r = p.d / 2, g = 4;
      var spots = [[p.px + r + g, p.py - h / 2], [p.px - r - g - w, p.py - h / 2], [p.px - w / 2, p.py - r - g - h], [p.px - w / 2, p.py + r + g]];
      var hit = spots.map(function (s) { return { x: s[0], y: s[1], w: w, h: h }; }).filter(function (b) {
        return inside(b, F) && !boxes.some(function (o) { return meet(o, b); }) &&
          !all.some(function (q) { return q !== p && q.px > b.x && q.px < b.x + b.w && q.py > b.y && q.py < b.y + b.h; });
      })[0];
      if (hit) { boxes.push(hit); p.lab = [Math.round(hit.x - (p.px - r)), Math.round(hit.y - (p.py - r))]; }
      else if (n < maxNums) p.num = ++n;   // past the limit the name stays in the tooltip and the table
    });
  }

  function build(ctx) {
    var k = TAP.shapes.kit, th = k.th(), def = ctx.def, source = def.rows, opts = def.options || {};
    var sizeKey = ctx.sizeId || (def.size && def.size.default) || null;
    var cx = colOf(source, def.x), cy = colOf(source, def.y), cs = sizeKey ? colOf(source, sizeKey) : null, cn = colOf(source, 'name');
    var entities = drawEntities(ctx.entities || TAP.scope.entities(ctx.cmp), source), regions = regionsOf(ctx);
    var pts = [], notes = [], missing = [], max = 0;
    regions.forEach(function (r) {
      var list = TAP.rows.list(source, [r]);
      if (!list.length) { missing.push(rname(r)); return; }   // an empty section is not provided, never zero
      list.forEach(function (row) {
        var x = TAP.rows.cell(source, def.x, row), y = TAP.rows.cell(source, def.y, row);
        var s = cs ? TAP.rows.cell(source, sizeKey, row) : null, name = TAP.rows.cell(source, 'name', row);
        var label = name.state === 'value' ? String(name.v) : TAP.content.text('rowBubble.noName', { row: row.sourceRow });
        if (x.state !== 'value' || y.state !== 'value') {
          var lost = x.state !== 'value' ? cx : cy;
          notes.push(TAP.content.text('rowBubble.left', { name: label, region: rname(r), measure: k.lower(lost.label) }));
          return;
        }
        if (s && s.state === 'value' && s.v > max) max = s.v;
        pts.push({ row: row, regionId: r, x: x, y: y, s: s, name: name, label: label, e: entityOf(entities, r) });
      });
    });

    // Which bubbles carry a name, largest by labelBy (default the y value) first: every one ('all'), or up to the limit in
    // settings ('top'). The same limit caps the numbers, so the key stays short on a shared screen.
    var by = opts.labelBy || def.y, max0 = ((window.TAP_SETTINGS || {}).rowBubble || {}).labelMax;
    var labelMax = typeof max0 === 'number' ? max0 : 10, limit = opts.label === 'all' ? pts.length : labelMax;
    var named = pts.map(function (p) { var c = by ? TAP.rows.cell(source, by, p.row) : {}; return { p: p, v: c.state === 'value' ? c.v : -Infinity }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, limit).map(function (x) { return x.p; });

    // Where each bubble is drawn, in pixels, so the names can be placed without overlapping
    var size = cs ? k.sizeScale(max) : function () { return th.space[4]; }, ring = [];
    var F = frame(ctx), rx = range(pts.map(function (p) { return p.x.v; })), ry = range(pts.map(function (p) { return p.y.v; }));
    pts.forEach(function (p) {
      p.noSize = !!cs && (!p.s || p.s.state !== 'value');
      if (p.noSize) notes.push(TAP.content.text('rowBubble.noSize', { name: p.label, region: rname(p.regionId), measure: k.lower(cs.label) }));
      p.d = size(p.noSize ? 0 : p.s.v);
      p.px = F.x0 + (p.x.v - rx.min) / (rx.max - rx.min) * F.w;
      p.py = F.y0 + F.h - (p.y.v - ry.min) / (ry.max - ry.min) * F.h;
    });
    place(named, pts, F, th.type.chart, labelMax);
    var unnamed = named.filter(function (p) { return !p.lab && !p.num; }).length;
    if (unnamed) notes.push(TAP.content.text('rowBubble.unnamed.' + source, { n: unnamed }));
    var order = { muted: 0, combined: 1, region: 2, second: 3, focus: 4 };
    var groups = entities.filter(function (e) { return pts.some(function (p) { return p.e === e; }); });
    var series = groups.map(function (e) {
      var mine = pts.filter(function (p) { return p.e === e; });
      return { type: 'scatter', tapRole: 'value', name: e.label, z: 2 + (order[e.role] || 0),
        data: mine.map(function (p) {
          var d = p.d, on = isMarked(ctx.highlight, p, SECTION[source]);
          if (on) ring.push({ value: [p.x.v, p.y.v], entityId: e.id, size: d });
          return { value: [p.x.v, p.y.v], raw: [p.x.v, p.y.v, p.s ? p.s.v : null], keys: [def.x, def.y, sizeKey],
            entityId: e.id, regionId: p.regionId, row: p.row.key, rowId: p.row.id, name: p.label, symbolSize: d,
            itemStyle: styleOf(p, e, th),
            label: labelOf(p, e, th) };
        }),
        tooltip: { formatter: function (q) {
          var p = pts.filter(function (x) { return x.row.id === q.data.rowId; })[0];
          return k.tip(p.label + ' · ' + rname(p.regionId), [[cx.label, k.exact(p.x, cx)], [cy.label, k.exact(p.y, cy)],
            cs ? [cs.label, k.exact(p.s, cs)] : null, [TAP.content.text('rowBubble.sourceRow'), String(p.row.sourceRow)]]);
        } } };
    });
    if (ring.length) series.push(k.ringSeries(ring));

    var tableCols = [{ key: 'region', label: colOf(source, 'region').label, unit: 'text', align: 'left' },
      { key: 'name', label: cn.label, unit: 'text', align: 'left' },
      { key: def.x, label: cx.label, unit: cx.unit, align: 'right' }, { key: def.y, label: cy.label, unit: cy.unit, align: 'right' }]
      .concat(cs ? [{ key: sizeKey, label: cs.label, unit: cs.unit, align: 'right' }] : []);
    var table = { columns: tableCols, rows: pts.map(function (p) {
      var cells = { region: TAP.rows.cell(source, 'region', p.row), name: p.name };
      cells[def.x] = p.x; cells[def.y] = p.y;
      if (cs) cells[sizeKey] = p.s;
      return { entityId: p.e ? p.e.id : p.regionId, rowId: p.row.id, cells: cells, src: p.x.src };
    }) };

    var res = k.result(def, null, { table: table, notes: notes, missing: missing, empty: !pts.length,
      // A numbered key in the bubble's own colour, so its number reads as it does on the chart
      legend: groups.map(function (e) { return { label: e.label, color: e.color, role: e.role }; }).concat(named.filter(function (p) { return p.num; })
        .map(function (p) { return { label: TAP.content.text('rowBubble.key', { name: p.label, region: rname(p.regionId) }), color: p.noSize ? null : p.e.color,
          mark: p.num, role: p.e.role === 'muted' ? 'muted' : 'key' }; })),
      sizeLegend: cs && max > 0 ? k.sizeLegend(max, cs) : null });
    res.target = function (params) {
      var d = params && params.data;
      if (!d || !d.regionId || d.row == null) return null;
      return { reportId: def.id, regionIds: [d.regionId], industryIds: [], accountIds: [], mark: 'points',
        items: [{ section: SECTION[source], regionId: d.regionId, row: d.row }] };
    };
    if (!pts.length || (ctx.type || def.defaultType) === 'table') return res;
    res.sized = true;   // names are placed for the chart's real size, so build again once it is known
    res.option = { grid: { left: MARGIN.left, right: MARGIN.right, top: MARGIN.top, bottom: MARGIN.bottom, containLabel: false },
      tooltip: { trigger: 'item' },
      xAxis: k.valueAxis(cx, { min: rx.min, max: rx.max, name: cx.label, nameLocation: 'middle', nameGap: th.space[8], nameTextStyle: { fontSize: th.type.chart } }),
      yAxis: k.valueAxis(cy, { min: ry.min, max: ry.max, name: cy.label, nameLocation: 'end', nameTextStyle: { fontSize: th.type.chart, align: 'left' } }),
      series: series };
    return res;
  }

  TAP.builders.register('rowBubble', TAP.shapes.kit.safely(build));
  TAP.bubbleLabels = { MARGIN: MARGIN, frame: frame, range: range, place: place, labelOf: labelOf };
})(window.TAP);
