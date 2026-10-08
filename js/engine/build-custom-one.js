/*
 * File: js/engine/build-custom-one.js
 * Purpose: The chart of "Break one region down" (Build a chart, D140): one region's figure split by a dimension,
 *          one bar per value in the region's colour, largest first, with the value written on each bar, and a
 *          table with one row per value. Plan years keep their order. With several regions on the chart (an older
 *          step with no region fixed) it hands over to the compare builder's grouped bars.
 * Provides: chart builder 'customOne' (registered with TAP.builders)
 * Depends on: js/engine/registry.js, js/engine/prepare.js, js/engine/shapes.js (drawing kit), js/engine/build-compare.js,
 *             js/core/format.js, js/core/content.js
 * Used by: js/engine/custom.js (definitions with ask 'one'), through js/panel/panel-build.js
 * Owner: CUSTOM stream
 */
(function (TAP) {
  'use strict';

  // The breakdown value of a column, as the row's own label: a year reads "Y1", the rest by name.
  function nameOf(k, col) {
    var bd = col.breakdown;
    return bd && bd.dim === 'year' ? k.t('chart.yearShort', { n: bd.value }) : col.label;
  }

  // One row per value, the same cells the chart reads; the source is the cell's own (TPV-TC-062).
  function table(k, ds, items, dim, col, row) {
    return { columns: [
      { key: 'category', label: TAP.content.text('panel.breakdowns.' + dim), unit: 'text', align: 'left' },
      { key: 'value', label: col.label, unit: col.unit, align: 'right', field: col.scale }
    ], rows: items.map(function (x) {
      var ind = x.col.breakdown && x.col.breakdown.dim === 'industry' ? x.col.breakdown.value : null;
      return { entityId: row.entityId, industryId: ind, src: x.cell.src || null,
        cells: { category: { v: x.name, state: 'value', kind: null }, value: x.cell } };
    }) };
  }

  function build(ctx) {
    var k = TAP.shapes.kit, def = ctx.def, ds = TAP.prepare.run(def, ctx), key = ds.primary[0];
    var bd = ds.columns.filter(function (c) { return c.breakdown && c.measureId === key; });
    var rows = k.visibleRows(ds, [key].concat(bd.map(function (c) { return c.key; })));
    if (rows.length !== 1 || !bd.length) return TAP.builders.get('compare')(ctx);   // several regions: grouped bars
    var row = rows[0], col = k.colOf(ds, key), dim = bd[0].breakdown.dim, th = k.th();
    var items = bd.map(function (c) { return { key: c.key, col: c, cell: row.cells[c.key], name: nameOf(k, c) }; });
    var vals = items.filter(function (x) { return x.cell.state === 'value'; });
    var gaps = items.filter(function (x) { return x.cell.state === 'notProvided'; });
    if (dim !== 'year') vals.sort(function (a, b) { return b.cell.v - a.cell.v; });   // largest first; years keep their order
    var order = vals.concat(gaps);
    var res = k.result(def, ds, { table: table(k, ds, order, dim, col, row), legend: k.legendOf({ entities: [row.entity] }),
      notes: k.notes({ rows: rows, columns: ds.columns }, bd.map(function (c) { return c.key; })) });
    if (ds.empty || !order.length) { res.empty = true; return res; }
    var type = ctx.type || def.defaultType;
    if (type === 'table') return res;
    var on = k.highlighted(row.entity, ctx.highlight), hl = th.echarts.tap.highlight;
    var data = order.map(function (x) {
      if (x.cell.state !== 'value') return { value: null };
      return { value: x.cell.v, raw: x.cell.v, key: x.key, entityId: row.entityId, industryId: row.industryId || null, name: x.name,
        itemStyle: { color: row.entity.color, borderColor: on ? hl.color : th.ground, borderWidth: on ? hl.width : th.border.control } };
    });
    var np = gaps.map(function (x, i) {
      return { value: [0, vals.length + i], entityId: row.entityId, text: k.t('states.notProvided'), title: row.label + ' · ' + x.name, what: x.col.label };
    });
    function itemOf(p) { return items.filter(function (x) { return x.key === (p.data || {}).key; })[0]; }
    res.option = {
      grid: k.grid({ right: th.space[12] * 2 }), tooltip: { trigger: 'item' }, xAxis: k.valueAxis(col),
      yAxis: { type: 'category', inverse: true, data: order.map(function (x) { return x.name; }), axisLabel: { fontSize: th.type.chart, interval: 0 } },
      series: [{ type: 'bar', tapRole: 'value', name: col.label, barMaxWidth: th.space[12], data: data,
        label: { show: true, position: 'right', fontSize: th.type.chart, color: th.ink, formatter: function (p) {
          return p.data && p.data.raw != null ? TAP.format.cell({ v: p.data.raw, state: 'value' }, { unit: col.unit }) : '';
        } },
        tooltip: { formatter: function (p) {
          var x = itemOf(p);
          return x ? k.tip(row.label + ' · ' + x.name, k.cellRows(x.cell, x.col)) : '';
        } } }].concat(np.length ? [k.npSeries(np)] : [])
    };
    k.refLines(res.option, ctx.refLines || (def.options || {}).refLines);
    return res;
  }

  TAP.builders.register('customOne', TAP.shapes.kit.safely(build));
})(window.TAP);
