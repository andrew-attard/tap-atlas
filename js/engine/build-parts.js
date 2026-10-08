/*
 * File: js/engine/build-parts.js
 * Purpose: Generic chart builder for parts of a whole (stacked bars, 100% stacked bars, grouped bars, treemap),
 *          with one stack per region and value when broken down (US-2.7.5), parts that are channels in the channel colours
 *          with an Amount / Share of total switch (D124),
 *          and the parts bubble view, drawn from the definition's x, y and size.
 * Provides: chart builder 'parts' (registered with TAP.builders)
 * Depends on: js/engine/registry.js, js/engine/prepare.js, js/engine/shapes.js (drawing kit), js/engine/aggregate.js
 *             (describe), js/core/format.js, js/engine/build-xy.js (TAP.shapes.kit.points, read at call time)
 * Used by: js/panel/panel-chart.js
 */
(function (TAP) {
  'use strict';

  function build(ctx) {
    var k = TAP.shapes.kit, def = ctx.def, ds = TAP.prepare.run(def, ctx);
    var type = ctx.type || def.defaultType;
    if (type === 'bubble') return bubble(k, def, ctx, ds);

    var m = TAP.prepare.selected(def, ctx);
    var byYear = ctx.breakdown === 'year' && !!k.colOf(ds, m + '@y1');
    var parts = byYear ? [1, 2, 3].map(function (y) { return m + '@y' + y; }) : ((def.parts || {})[m] || [m]);
    var keys = parts.indexOf(m) >= 0 ? parts : parts.concat([m]);
    var rows = k.visibleRows(ds, [m].concat(parts));
    // Other breakdowns (US-2.7.5): the table gains a column per value; the chart draws one stack per region and value
    var bd = byYear ? [] : ds.columns.filter(function (c) { return c.breakdown && c.breakdown.dim === ctx.breakdown; });
    // The table shows the selected measure per value, so every heading is unique; the chart reads the parts too
    var bdTable = bd.filter(function (c) { return c.measureId === m; });
    // D124: parts that are channels take the channel colours (not with the year breakdown, whose parts are years)
    var paints = byYear ? null : k.channelPaints(def, parts);
    var res = k.result(def, ds, { table: k.table(ds, keys.concat(bdTable.map(function (c) { return c.key; })), rows),
      legend: paints ? k.channelLegend(parts.map(function (p) { return partName(k, ds, p); }), paints) : legend(k, ds, parts, rows),
      notes: k.notes({ rows: rows, columns: ds.columns }, [m]).concat(short(k, ds, m, parts, rows)), controls: k.shareSwitch(def, type) });
    if (ds.empty || !rows.length) { res.empty = true; return res; }
    if (type === 'table') return res;
    if (bd.length) rows = split(k, rows, bd, keys);
    var draw = { k: k, ds: ds, ctx: ctx, m: m, parts: parts, rows: rows, res: res, paints: paints };
    res.option = type === 'treemap' ? treemap(draw) : bars(draw, type);
    return res;
  }

  // A note for each stack whose parts add up to less than its total, for example accounts with no segment (review
  // DE-15), so the gap is never silent. Only when the total and every part have a value.
  function short(k, ds, m, parts, rows) {
    if (parts.indexOf(m) >= 0) return [];
    var col = k.colOf(ds, m), out = [];
    rows.forEach(function (r) {
      var total = r.cells[m], cells = parts.map(function (p) { return r.cells[p]; });
      if (!total || total.state !== 'value' || !cells.every(function (c) { return c && c.state === 'value'; })) return;
      var sum = cells.reduce(function (t, c) { return t + c.v; }, 0);
      if (total.v - sum <= Math.max(1e-9, Math.abs(total.v) * 1e-9)) return;
      out.push(k.t('chart.partsShort', { label: r.label, measure: k.lower(col.label),
        parts: k.exact({ v: sum, state: 'value' }, col), total: k.exact(total, col) }));
    });
    return out;
  }

  // One row per region and breakdown value, its cells read from that value's columns under the plain measure keys,
  // so the stacks, totals and tooltips draw it like any other row. Labelled "Region A · Direct".
  function split(k, rows, bd, keys) {
    var values = [], out = [];
    bd.forEach(function (c) { if (!values.some(function (v) { return v.value === c.breakdown.value; })) values.push(c.breakdown); });
    rows.forEach(function (r) {
      values.forEach(function (v) {
        var cells = {};
        keys.forEach(function (key) { cells[key] = r.cells[key + '@' + v.dim + ':' + v.value] || r.cells[key]; });
        // A stack whose every figure is not applicable is left out quietly (US-1.2.11)
        if (keys.every(function (key) { return cells[key].state === 'notApplicable'; })) return;
        out.push({ id: r.id + ':' + v.value, entityId: r.entityId, entity: r.entity, industryId: r.industryId,
          label: k.t('breakdown.entityValue', { entity: r.label, value: v.label }), cells: cells });
      });
    });
    return out;
  }

  function bubble(k, def, ctx, ds) {
    var drawn = k.points(def, ctx, ds, { x: def.x, y: def.y, size: ctx.sizeId || (def.size && def.size.default) || null });
    var res = k.result(def, ds, drawn);
    res.notes = k.notes(ds, [def.x, def.y]).concat(drawn.notes);
    if (ds.empty) res.empty = true;
    return res;
  }

  // A part's short name ("Partner"), for the channel key and tooltips.
  function partName(k, ds, key) { var c = k.colOf(ds, key); return c.short || c.label; }

  // Colour shows the region; shade shows the part. The legend says both.
  function legend(k, ds, parts, rows) {
    var th = k.th();
    return k.legendOf({ entities: rows.map(function (r) { return r.entity; }) }).concat(parts.length > 1 ? parts.map(function (p, i) {
      return { label: k.colOf(ds, p).label, color: th.shade(th.ink, i), role: 'part' };
    }) : []);
  }

  // Tooltip: the part hovered (exact value, kind, how combined), the other parts, then the total.
  // With channel colours the title names the channel first, then the row, the value and its share (D124).
  function tipFor(draw, row, key) {
    var k = draw.k, col = k.colOf(draw.ds, key), lines = k.cellRows(row.cells[key], col), title = row.label;
    if (draw.paints) {
      title = k.channelTitle(partName(k, draw.ds, key), row.label, row.cells[key], col, row.cells[draw.m]);
      lines = lines.slice(1);
    }
    draw.parts.forEach(function (p) {
      if (p !== key) lines.push([k.colOf(draw.ds, p).label, k.exact(row.cells[p], k.colOf(draw.ds, p))]);
    });
    if (draw.parts.indexOf(draw.m) < 0) {
      lines.push([k.t('chart.total'), k.exact(row.cells[draw.m], k.colOf(draw.ds, draw.m))]);
      var how = TAP.agg.describe(row.cells[draw.m]);
      if (how) lines.push([k.t('chart.how'), how]);
    }
    return k.tip(title, lines);
  }

  // The row a mark belongs to: by row id (a region has several rows once broken down), else by region.
  function rowOf(draw, d) {
    d = d || {};
    return draw.rows.filter(function (r) { return d.rowId != null ? r.id === d.rowId : r.entityId === d.entityId; })[0];
  }

  function chartValue(v, unit) { return TAP.format.cell({ v: v, state: 'value' }, { unit: unit }); }

  function bars(draw, type) {
    var k = draw.k, th = k.th(), pct = type === 'stacked100', stack = type !== 'groupedBar';
    var mc = k.colOf(draw.ds, draw.m), totals = draw.rows.map(function (r) { return r.cells[draw.m]; });
    var maxT = Math.max.apply(null, totals.map(function (c) { return c.state === 'value' ? c.v : 0; }).concat([0]));
    var np = [];
    draw.rows.forEach(function (r, i) {
      if (totals[i].state === 'notProvided') {
        np.push({ value: [0, i], entityId: r.entityId, text: k.t('states.notProvided'), title: r.label, what: mc.label });
      }
    });
    var series = draw.parts.map(function (key, pi) {
      var col = k.colOf(draw.ds, key);
      return { type: 'bar', tapRole: 'value', name: col.label, stack: stack ? 'parts' : undefined, barMaxWidth: th.space[12],
        data: draw.rows.map(function (r, i) {
          var c = r.cells[key], tot = totals[i].state === 'value' ? totals[i].v : 0;
          if (c.state !== 'value') return { value: null };
          var on = k.highlighted(r.entity, draw.ctx.highlight), dark = pi === 0 && r.entity.role !== 'muted', paint = draw.paints && draw.paints[pi];
          return { value: pct ? (tot ? c.v / tot * 100 : 0) : c.v, raw: c.v, key: key, entityId: r.entityId, rowId: r.id, name: r.label, mark: 'bar',
            itemStyle: Object.assign({ color: paint ? paint.bg : th.shade(r.entity.color, pi) }, k.partBorder(r.entity, on, draw.paints)),
            label: { color: paint ? paint.fg : dark ? th.onColour : th.ink } };
        }),
        label: { show: true, position: 'inside', fontSize: th.type.chart, formatter: function (p) {
          var d = p.data;
          if (!d || d.raw == null) return '';
          if (pct) return p.value >= 9 ? TAP.format.pct(p.value / 100) : '';
          return d.raw >= maxT * 0.09 ? chartValue(d.raw, col.unit) : '';
        } },
        tooltip: { formatter: function (p) { return tipFor(draw, rowOf(draw, p.data), key); } } };
    });
    if (stack && !pct) series.push(totalSeries(draw, totals, mc));
    if (np.length) series.push(k.npSeries(np));
    var vax = pct ? { type: 'value', max: 100, axisLabel: { fontSize: th.type.chart, formatter: function (v) { return TAP.format.pct(v / 100); } } }
      : k.valueAxis(mc);
    return { grid: k.grid({ right: th.space[12] * 2 }), tooltip: { trigger: 'item' }, xAxis: vax,
      yAxis: { type: 'category', inverse: true, data: draw.rows.map(function (r) { return r.label; }),
        axisLabel: draw.paints ? k.axisEmphasis(draw.rows) : { fontSize: th.type.chart, interval: 0 } },
      series: series };
  }

  // An invisible bar at the end of each stack that carries the total as its label.
  function totalSeries(draw, totals, mc) {
    var k = draw.k, th = k.th();
    return { type: 'bar', tapRole: 'total', stack: 'parts', silent: true, data: draw.rows.map(function () { return 0; }),
      itemStyle: { color: th.echarts.backgroundColor }, tooltip: { show: false },
      label: { show: true, position: 'right', fontSize: th.type.chart, color: th.ink, formatter: function (p) {
        var c = totals[p.dataIndex];
        if (!c || c.state !== 'value') return '';
        return chartValue(c.v, mc.unit) + (c.partial ? ' ' + k.t('chart.partialMark') : '');
      } } };
  }

  // Treemap tiles can't show a blank or a zero, so those regions are named in the notes instead of vanishing.
  function treemap(draw) {
    var k = draw.k, th = k.th(), hl = th.echarts.tap.highlight, mc = k.colOf(draw.ds, draw.m);
    var data = draw.rows.filter(function (r) {
      var c = r.cells[draw.m];
      if (c.state === 'value' && c.v > 0) return true;
      if (c.state !== 'notApplicable') {
        var why = c.state !== 'value' ? 'chart.notPlaced' : c.v < 0 ? 'chart.negativeTile' : 'chart.zeroTile';
        draw.res.notes.push(k.t(why, { name: r.label, measure: k.lower(mc.label) }));
      }
      return false;
    }).map(function (r) {
      var on = k.highlighted(r.entity, draw.ctx.highlight);
      return { name: r.label, entityId: r.entityId, rowId: r.id, mark: 'bar',
        itemStyle: on ? { color: r.entity.color, borderColor: hl.color, borderWidth: hl.width } : { color: r.entity.color },
        children: draw.parts.map(function (key, pi) {
          var c = r.cells[key];
          if (c.state !== 'value' || !(c.v > 0)) return null;
          return { name: k.colOf(draw.ds, key).label, value: c.v, raw: c.v, key: key, entityId: r.entityId, rowId: r.id,
            itemStyle: { color: th.shade(r.entity.color, pi) }, label: { color: pi === 0 && r.entity.role !== 'muted' ? th.onColour : th.ink } };
        }).filter(Boolean) };
    });
    return { tooltip: { trigger: 'item' },
      series: [{ type: 'treemap', tapRole: 'value', roam: false, nodeClick: false, breadcrumb: { show: false },
        width: '100%', height: '100%', top: 0, left: 0,
        label: { show: true, fontSize: th.type.chart, color: th.ink, formatter: function (p) {
          return p.data.raw != null ? p.name + '\n' + chartValue(p.data.raw, k.colOf(draw.ds, p.data.key).unit) : p.name;
        } },
        upperLabel: { show: true, height: th.space[8], fontSize: th.type.chart, color: th.ink },
        levels: [{ itemStyle: { borderColor: th.ground, borderWidth: th.border.rule, gapWidth: th.border.rule } },
          { itemStyle: { borderColor: th.ground, borderWidth: th.border.control, gapWidth: th.border.control } }],
        data: data,
        tooltip: { formatter: function (p) {
          var row = rowOf(draw, p.data);
          return row ? tipFor(draw, row, p.data.key || draw.m) : '';
        } } }] };
  }

  TAP.builders.register('parts', TAP.shapes.kit.safely(build));
})(window.TAP);
