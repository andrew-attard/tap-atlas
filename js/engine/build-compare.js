/*
 * File: js/engine/build-compare.js
 * Purpose: Generic chart builder for one value per region or category (bar, dot, radar). With
 *          options.measuresAs 'categories' (e.g. the six ratings) the measures are the categories and each
 *          region or combined figure is one group; otherwise the regions are the categories.
 * Provides: chart builder 'compare' (registered with TAP.builders)
 * Depends on: js/engine/registry.js, js/engine/prepare.js, js/engine/shapes.js (drawing kit), js/core/format.js
 * Used by: js/panel/panel-chart.js
 */
(function (TAP) {
  'use strict';

  function build(ctx) {
    var k = TAP.shapes.kit, def = ctx.def, ds = TAP.prepare.run(def, ctx);
    var cats = (def.options || {}).measuresAs === 'categories';
    var keys = cats ? ds.primary : ds.primary.slice(0, 1);
    var rows = k.visibleRows(ds, keys);
    var res = k.result(def, ds, { table: k.table(ds, keys, rows), legend: k.legendOf({ entities: rows.map(function (r) { return r.entity; }) }),
      notes: k.notes({ rows: rows, columns: ds.columns }, keys) });
    if (ds.empty || !rows.length) { res.empty = true; return res; }
    var type = ctx.type || def.defaultType;
    if (type === 'table') return res;
    if (type === 'radar' && (!cats || rows.length > 3)) type = cats ? 'dot' : 'bar';   // a stale choice falls back
    var draw = { cats: cats, keys: keys, rows: rows, ds: ds, ctx: ctx, k: k, res: res };
    res.option = type === 'radar' ? radar(draw) : type === 'dot' ? dot(draw) : bars(draw);
    return res;
  }

  // The row a mark belongs to: same region (or combined figure) and same industry, if the rows are per industry.
  function rowFor(rows, d) {
    return rows.filter(function (r) { return r.entityId === d.entityId && (r.industryId || null) === (d.industryId || null); })[0];
  }
  function cellOf(draw, d) {
    var row = rowFor(draw.rows, d);
    return { row: row, col: draw.k.colOf(draw.ds, d.key), cell: row.cells[d.key] };
  }
  function tooltip(draw) {
    return { formatter: function (p) {
      var x = cellOf(draw, p.data || {});
      var title = x.row.industryId ? x.row.label + ' · ' + x.row.entity.label : x.row.label;
      return draw.k.tip(title, draw.k.cellRows(x.cell, x.col));
    } };
  }
  function npText(draw, row) {
    var many = draw.cats && draw.rows.length > 1;
    return many ? draw.k.t('chart.npFor', { name: row.label }) : draw.k.t('states.notProvided');
  }
  function item(row, key, cell, extra) {
    return Object.assign({ value: cell.v, raw: cell.v, key: key, entityId: row.entityId, industryId: row.industryId || null,
      name: row.label }, extra || {});
  }
  function catLabels(draw) { return draw.keys.map(function (key) { return draw.k.colOf(draw.ds, key).label; }); }
  function isRating(col) { return col.unit === 'rating' || col.unit === 'score'; }

  // Dot plot. Groups sit side by side within a category; the nudge moves only the category position,
  // never the value, and tooltips read the cell itself.
  function dot(draw) {
    var k = draw.k, th = k.th(), col = k.colOf(draw.ds, draw.keys[0]), rating = isRating(col);
    var G = draw.cats ? draw.rows.length : 1, np = [], ring = [];
    var off = function (gi) { return G > 1 ? (gi - (G - 1) / 2) * Math.min(0.12, 0.72 / G) : 0; };
    var npX = rating ? 0.5 : 0, size = G > 4 ? th.space[3] : th.space[4];
    var groups = draw.cats ? draw.rows.map(function (r) { return [r]; }) : [draw.rows];
    var series = groups.map(function (rs, gi) {
      var data = [];
      rs.forEach(function (row, ri) {
        draw.keys.forEach(function (key, j) {
          var c = row.cells[key], y = draw.cats ? j + off(gi) : ri;
          if (c.state === 'value') {
            data.push(item(row, key, c, { value: [c.v, y], itemStyle: { color: row.entity.color } }));
            if (k.highlighted(row.entity, draw.ctx.highlight)) ring.push({ value: [c.v, y], entityId: row.entityId, size: size });
          } else if (c.state === 'notProvided') {
            np.push({ value: [npX, y], entityId: row.entityId, text: npText(draw, row), title: row.label, what: k.colOf(draw.ds, key).label });
          }
        });
      });
      return { type: 'scatter', tapRole: 'value', name: draw.cats ? rs[0].entity.label : col.label, symbolSize: size, z: 3,
        itemStyle: { color: draw.cats ? rs[0].entity.color : th.ink, opacity: 1 }, data: data, tooltip: tooltip(draw) };
    });
    var labels = draw.cats ? catLabels(draw) : draw.rows.map(function (r) { return r.label; });
    var xAxis = rating ? k.valueAxis(col, { min: 0.5, max: 3.5, interval: 0.5,
      axisLabel: { fontSize: th.type.chart, formatter: function (v) { return v % 1 === 0 ? String(v) : ''; } } }) : k.valueAxis(col);
    return { grid: k.grid(), tooltip: { trigger: 'item' }, xAxis: xAxis,
      yAxis: { type: 'value', inverse: true, min: -0.5, max: labels.length - 0.5, interval: 1, splitLine: { show: false },
        axisLine: { show: true }, axisTick: { show: false },
        axisLabel: { fontSize: th.type.chart, customValues: labels.map(function (l, i) { return i; }),
          formatter: function (v) { return labels[Math.round(v)] || ''; } } },
      series: series.concat(np.length ? [k.npSeries(np)] : [], ring.length ? [k.ringSeries(ring)] : []) };
  }

  // Horizontal bars: one bar per region (or per group within each category).
  function bars(draw) {
    var k = draw.k, th = k.th(), col = k.colOf(draw.ds, draw.keys[0]), np = [], hl = th.echarts.tap.highlight;
    function style(row) {
      var on = k.highlighted(row.entity, draw.ctx.highlight);
      return { color: row.entity.color, borderColor: on ? hl.color : th.ground, borderWidth: on ? hl.width : th.border.control };
    }
    function valueItem(row, key, i, j) {
      var c = row.cells[key];
      if (c.state === 'value') return item(row, key, c, { itemStyle: style(row) });
      if (c.state === 'notProvided') {
        np.push({ value: [0, draw.cats ? j : i], entityId: row.entityId, text: npText(draw, row), title: row.label, what: k.colOf(draw.ds, key).label });
      }
      return { value: null };
    }
    var label = { show: draw.rows.length <= 3 || !draw.cats, position: 'right', fontSize: th.type.chart, color: th.ink,
      formatter: function (p) { return p.data && p.data.raw != null ? TAP.format.cell({ v: p.data.raw, state: 'value' }, { unit: col.unit }) : ''; } };
    var series = draw.cats ? draw.rows.map(function (row) {
      return { type: 'bar', tapRole: 'value', name: row.label, barMaxWidth: th.space[6], itemStyle: { color: row.entity.color },
        data: draw.keys.map(function (key, j) { return valueItem(row, key, 0, j); }), label: label, tooltip: tooltip(draw) };
    }) : [{ type: 'bar', tapRole: 'value', name: col.label, barMaxWidth: th.space[12],
      data: draw.rows.map(function (row, i) { return valueItem(row, draw.keys[0], i, 0); }), label: label, tooltip: tooltip(draw) }];
    var labels = draw.cats ? catLabels(draw) : draw.rows.map(function (r) { return r.label; });
    return { grid: k.grid(), tooltip: { trigger: 'item' }, xAxis: k.valueAxis(col),
      yAxis: { type: 'category', inverse: true, data: labels, axisLabel: { fontSize: th.type.chart, interval: 0 } },
      series: series.concat(np.length ? [k.npSeries(np)] : []) };
  }

  // Radar: only for categories with 3 or fewer groups. A radar can't show a gap (it would draw it at the centre,
  // reading as a very low rating), so a group with a blank is left off the radar and named in the notes.
  function radar(draw) {
    var k = draw.k, th = k.th(), col = k.colOf(draw.ds, draw.keys[0]), max = isRating(col) ? 3 : 0, hl = th.echarts.tap.highlight;
    var whole = draw.rows.filter(function (row) {
      var gaps = draw.keys.filter(function (key) { return row.cells[key].state !== 'value'; });
      draw.keys.forEach(function (key) {
        var c = row.cells[key];
        if (c.state === 'value' && !isRating(col)) max = Math.max(max, c.v);
      });
      if (gaps.length) {
        draw.res.notes.push(k.t('chart.notOnRadar', { name: row.label,
          measures: TAP.format.list(gaps.map(function (key) { return k.lower(k.colOf(draw.ds, key).label); })) }));
      }
      return !gaps.length;
    });
    var data = whole.map(function (row) {
      var vals = draw.keys.map(function (key) { return row.cells[key].v; });
      var on = k.highlighted(row.entity, draw.ctx.highlight);
      return { name: row.label, value: vals.slice(), raw: vals, keys: draw.keys.slice(),
        entityId: row.entityId, itemStyle: { color: row.entity.color },
        lineStyle: { color: on ? hl.color : row.entity.color, width: on ? hl.width : th.border.rule } };
    });
    return { tooltip: { trigger: 'item' },
      radar: { radius: '66%', splitNumber: isRating(col) ? 3 : 4, axisName: { fontSize: th.type.chart },
        indicator: catLabels(draw).map(function (n) { return { name: n, min: 0, max: max || 1 }; }) },
      series: [{ type: 'radar', tapRole: 'value', symbolSize: th.space[3], data: data, tooltip: { formatter: function (p) {
        var row = rowFor(draw.rows, p.data), lines = [];
        draw.keys.forEach(function (key) { lines.push([k.colOf(draw.ds, key).label, k.exact(row.cells[key], k.colOf(draw.ds, key))]); });
        return k.tip(row.label, lines);
      } } }] };
  }

  TAP.builders.register('compare', TAP.shapes.kit.safely(build));
})(window.TAP);
