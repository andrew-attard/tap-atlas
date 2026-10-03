/*
 * File: js/engine/build-parts.js
 * Purpose: Generic chart builder for parts of a whole (stacked bars, 100% stacked bars, grouped bars, treemap)
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
    var res = k.result(def, ds, { table: k.table(ds, keys, rows), legend: legend(k, ds, parts, rows),
      notes: k.notes({ rows: rows, columns: ds.columns }, [m]) });
    if (ds.empty || !rows.length) { res.empty = true; return res; }
    if (type === 'table') return res;
    var draw = { k: k, ds: ds, ctx: ctx, m: m, parts: parts, rows: rows, res: res };
    res.option = type === 'treemap' ? treemap(draw) : bars(draw, type);
    return res;
  }

  function bubble(k, def, ctx, ds) {
    var drawn = k.points(def, ctx, ds, { x: def.x, y: def.y, size: ctx.sizeId || (def.size && def.size.default) || null });
    var res = k.result(def, ds, drawn);
    res.notes = k.notes(ds, [def.x, def.y]).concat(drawn.notes);
    if (ds.empty) res.empty = true;
    return res;
  }

  // Colour shows the region; shade shows the part. The legend says both.
  function legend(k, ds, parts, rows) {
    var th = k.th();
    return k.legendOf({ entities: rows.map(function (r) { return r.entity; }) }).concat(parts.length > 1 ? parts.map(function (p, i) {
      return { label: k.colOf(ds, p).label, color: th.shade(th.ink, i), role: 'part' };
    }) : []);
  }

  // Tooltip: the part hovered (exact value, kind, how combined), the other parts, then the total.
  function tipFor(draw, row, key) {
    var k = draw.k, lines = k.cellRows(row.cells[key], k.colOf(draw.ds, key));
    draw.parts.forEach(function (p) {
      if (p !== key) lines.push([k.colOf(draw.ds, p).label, k.exact(row.cells[p], k.colOf(draw.ds, p))]);
    });
    if (draw.parts.indexOf(draw.m) < 0) {
      lines.push([k.t('chart.total'), k.exact(row.cells[draw.m], k.colOf(draw.ds, draw.m))]);
      var how = TAP.agg.describe(row.cells[draw.m]);
      if (how) lines.push([k.t('chart.how'), how]);
    }
    return k.tip(row.label, lines);
  }

  function chartValue(v, unit) { return TAP.format.cell({ v: v, state: 'value' }, { unit: unit }); }

  function bars(draw, type) {
    var k = draw.k, th = k.th(), hl = th.echarts.tap.highlight, pct = type === 'stacked100', stack = type !== 'groupedBar';
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
          var on = k.highlighted(r.entity, draw.ctx.highlight), dark = pi === 0 && r.entity.role !== 'muted';
          return { value: pct ? (tot ? c.v / tot * 100 : 0) : c.v, raw: c.v, key: key, entityId: r.entityId, name: r.label, mark: 'bar',
            itemStyle: { color: th.shade(r.entity.color, pi), borderColor: on ? hl.color : th.ground, borderWidth: on ? hl.width : th.border.control },
            label: { color: dark ? th.onColour : th.ink } };
        }),
        label: { show: true, position: 'inside', fontSize: th.type.chart, formatter: function (p) {
          var d = p.data;
          if (!d || d.raw == null) return '';
          if (pct) return p.value >= 9 ? TAP.format.pct(p.value / 100) : '';
          return d.raw >= maxT * 0.09 ? chartValue(d.raw, col.unit) : '';
        } },
        tooltip: { formatter: function (p) {
          var row = draw.rows.filter(function (r) { return r.entityId === p.data.entityId; })[0];
          return tipFor(draw, row, key);
        } } };
    });
    if (stack && !pct) series.push(totalSeries(draw, totals, mc));
    if (np.length) series.push(k.npSeries(np));
    var vax = pct ? { type: 'value', max: 100, axisLabel: { fontSize: th.type.chart, formatter: function (v) { return TAP.format.pct(v / 100); } } }
      : k.valueAxis(mc);
    return { grid: k.grid({ right: th.space[12] * 2 }), tooltip: { trigger: 'item' }, xAxis: vax,
      yAxis: { type: 'category', inverse: true, data: draw.rows.map(function (r) { return r.label; }),
        axisLabel: { fontSize: th.type.chart, interval: 0 } },
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
        draw.res.notes.push(k.t(c.state === 'value' ? 'chart.zeroTile' : 'chart.notPlaced', { name: r.label, measure: k.lower(mc.label) }));
      }
      return false;
    }).map(function (r) {
      var on = k.highlighted(r.entity, draw.ctx.highlight);
      return { name: r.label, entityId: r.entityId, mark: 'bar',
        itemStyle: on ? { color: r.entity.color, borderColor: hl.color, borderWidth: hl.width } : { color: r.entity.color },
        children: draw.parts.map(function (key, pi) {
          var c = r.cells[key];
          if (c.state !== 'value' || !(c.v > 0)) return null;
          return { name: k.colOf(draw.ds, key).label, value: c.v, raw: c.v, key: key, entityId: r.entityId,
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
          var row = draw.rows.filter(function (r) { return r.entityId === p.data.entityId; })[0];
          return row ? tipFor(draw, row, p.data.key || draw.m) : '';
        } } }] };
  }

  TAP.builders.register('parts', TAP.shapes.kit.safely(build));
})(window.TAP);
