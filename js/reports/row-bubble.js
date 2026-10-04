/*
 * File: js/reports/row-bubble.js
 * Purpose: A bubble chart with one bubble per row (account or partner) in its region's colour, the largest labelled
 *          (US-2.2.4, US-2.3.3). The definition's x, y and size name TAP.rows column keys; options.label is 'all'
 *          (every bubble named) or 'top' (the largest by options.labelBy, up to TAP_SETTINGS.rowBubble.labelMax).
 * Provides: builder 'rowBubble'
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
  // The organization total has no region colours of its own; rows are not combined, so each keeps its region's.
  function byRegion(entities) {
    if (!(entities.length === 1 && entities[0].id === 'org')) return entities;
    return entities[0].regionIds.map(function (r) {
      return { id: r, kind: 'region', regionIds: [r], how: null, role: 'region', color: TAP.scope.colorOf(r), label: rname(r) };
    });
  }

  function isMarked(hl, p) {
    if (!hl) return false;
    var items = hl.items || [], regs = hl.regionIds || [];
    if (items.length) return items.some(function (i) { return i.regionId === p.regionId && i.row === p.row.sourceRow; });
    return regs.length > 0 && regs.indexOf(p.regionId) >= 0;
  }

  function build(ctx) {
    var k = TAP.shapes.kit, th = k.th(), def = ctx.def, source = def.rows, opts = def.options || {};
    var sizeKey = ctx.sizeId || (def.size && def.size.default) || null;
    var cx = colOf(source, def.x), cy = colOf(source, def.y), cs = sizeKey ? colOf(source, sizeKey) : null, cn = colOf(source, 'name');
    var entities = byRegion(ctx.entities || TAP.scope.entities(ctx.cmp)), regions = regionsOf(ctx);
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

    // Which bubbles carry a name: every one, or the largest by labelBy up to the limit in settings.
    var named = {};
    if (opts.label === 'all') pts.forEach(function (p) { named[p.row.id] = true; });
    else {
      var by = opts.labelBy || def.y, limit = ((window.TAP_SETTINGS || {}).rowBubble || {}).labelMax;
      limit = typeof limit === 'number' ? limit : 10;
      pts.map(function (p) { var c = TAP.rows.cell(source, by, p.row); return { p: p, v: c.state === 'value' ? c.v : -Infinity }; })
        .sort(function (a, b) { return b.v - a.v; }).slice(0, limit).forEach(function (x) { named[x.p.row.id] = true; });
    }

    var size = cs ? k.sizeScale(max) : function () { return th.space[4]; }, hl = th.echarts.tap.highlight, ring = [];
    var order = { muted: 0, combined: 1, region: 2, second: 3, focus: 4 };
    var groups = entities.filter(function (e) { return pts.some(function (p) { return p.e === e; }); });
    var series = groups.map(function (e) {
      var mine = pts.filter(function (p) { return p.e === e; });
      return { type: 'scatter', tapRole: 'value', name: e.label, z: 2 + (order[e.role] || 0),
        labelLayout: { moveOverlap: 'shiftY' }, labelLine: { show: true, lineStyle: { color: th.muted } },
        data: mine.map(function (p) {
          var d = size(p.s && p.s.state === 'value' ? p.s.v : 0), on = isMarked(ctx.highlight, p);
          if (on) ring.push({ value: [p.x.v, p.y.v], entityId: e.id, size: d });
          return { value: [p.x.v, p.y.v], raw: [p.x.v, p.y.v, p.s ? p.s.v : null], keys: [def.x, def.y, sizeKey],
            entityId: e.id, regionId: p.regionId, row: p.row.sourceRow, rowId: p.row.id, name: p.label, symbolSize: d,
            itemStyle: { color: e.color, opacity: e.role === 'muted' ? 0.85 : 0.8, borderColor: th.ground, borderWidth: th.border.control },
            label: { show: !!named[p.row.id], position: 'right', fontSize: th.type.chart, color: th.ink, formatter: function () { return p.label; } } };
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
      legend: groups.map(function (e) { return { label: e.label, color: e.color, role: e.role }; }),
      sizeLegend: cs && max > 0 ? k.sizeLegend(max, cs) : null });
    res.target = function (params) {
      var d = params && params.data;
      if (!d || !d.regionId || d.row == null) return null;
      return { reportId: def.id, regionIds: [d.regionId], industryIds: [], accountIds: [], mark: 'points',
        items: [{ section: SECTION[source], regionId: d.regionId, row: d.row }] };
    };
    if (!pts.length || (ctx.type || def.defaultType) === 'table') return res;
    res.option = { grid: k.grid({ right: th.space[12] * 3 }), tooltip: { trigger: 'item' },
      xAxis: k.valueAxis(cx, { name: cx.label, nameLocation: 'middle', nameGap: th.space[8], nameTextStyle: { fontSize: th.type.chart } }),
      yAxis: k.valueAxis(cy, { name: cy.label, nameLocation: 'end', nameTextStyle: { fontSize: th.type.chart, align: 'left' } }),
      series: series };
    return res;
  }

  TAP.builders.register('rowBubble', TAP.shapes.kit.safely(build));
})(window.TAP);
