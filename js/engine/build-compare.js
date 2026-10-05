/*
 * File: js/engine/build-compare.js
 * Purpose: Generic chart builder for one value per region or category (bar, dot, radar), and grouped bars for a
 *          breakdown (US-2.7.5). With
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
    // Breakdown columns of the measure shown (US-2.7.5): one per year, industry, channel, motion, segment or risk
    var bd = cats ? [] : ds.columns.filter(function (c) { return c.breakdown && c.measureId === keys[0]; }).map(function (c) { return c.key; });
    var rows = k.visibleRows(ds, keys.concat(bd));   // a per-industry figure has values in its breakdown only (#361)
    var res = k.result(def, ds, { table: k.table(ds, keys.concat(bd), rows), legend: k.legendOf({ entities: rows.map(function (r) { return r.entity; }) }),
      notes: k.notes({ rows: rows, columns: ds.columns }, keys) });
    if (ds.empty || !rows.length) { res.empty = true; return res; }
    var type = ctx.type || def.defaultType;
    if (type === 'table') return res;
    if (type === 'radar' && (!cats || rows.length > 3)) type = cats ? 'dot' : 'bar';   // a stale choice falls back
    var draw = { cats: cats, keys: keys, bd: bd, rows: rows, ds: ds, ctx: ctx, k: k, res: res };
    // A dot plot draws its own dots per breakdown value (US-2.7.3)
    res.option = type === 'radar' ? radar(draw) : type === 'dot' ? dot(draw) : bd.length ? grouped(draw) : bars(draw);
    if (type !== 'radar') k.refLines(res.option, ctx.refLines || (def.options || {}).refLines);   // labelled lines (17.7)
    return res;
  }

  // Grouped bars for a breakdown: one bar per value within each region, each bar named on the bar itself as well
  // as in the legend, so the values are told apart without colour.
  function grouped(draw) {
    var k = draw.k, th = k.th(), hl = th.echarts.tap.highlight, np = [];
    var series = draw.bd.map(function (key, i) {
      var col = k.colOf(draw.ds, key);
      return { type: 'bar', tapRole: 'value', name: col.label, barMaxWidth: th.space[6], barGap: '10%',
        data: draw.rows.map(function (row, ri) {
          var c = row.cells[key], on = k.highlighted(row.entity, draw.ctx.highlight);
          if (c.state === 'value') {
            return item(row, key, c, { itemStyle: { color: th.shade(row.entity.color, i), borderColor: on ? hl.color : th.ground,
              borderWidth: on ? hl.width : th.border.control } });
          }
          return { value: null };
        }),
        label: { show: true, position: 'right', fontSize: th.type.chart, color: th.ink, formatter: function (p) {
          return p.data && p.data.raw != null ? col.label + '  ' + TAP.format.cell({ v: p.data.raw, state: 'value' }, { unit: col.unit }) : '';
        } },
        tooltip: tooltip(draw) };
    });
    // One not-provided mark per row, naming the values left blank (all blank reads simply "not provided")
    draw.rows.forEach(function (row, ri) {
      var gaps = draw.bd.filter(function (key) { return row.cells[key].state === 'notProvided'; });
      if (!gaps.length) return;
      var some = draw.bd.some(function (key) { return row.cells[key].state === 'value'; });
      var names = TAP.format.list(gaps.map(function (key) { return k.colOf(draw.ds, key).label; }));
      np.push({ value: [0, ri], entityId: row.entityId, text: some ? k.t('chart.npSome', { names: names }) : k.t('states.notProvided'),
        title: row.label, what: names });
    });
    draw.res.legend = draw.res.legend.concat(draw.bd.map(function (key, i) {
      return { label: k.colOf(draw.ds, key).label, color: th.shade(th.ink, i), role: 'part' };
    }));
    return { grid: k.grid({ right: th.space[12] * 2 }), tooltip: { trigger: 'item' }, xAxis: k.valueAxis(k.colOf(draw.ds, draw.keys[0])),
      yAxis: { type: 'category', inverse: true, data: draw.rows.map(function (r) { return r.label; }), axisLabel: { fontSize: th.type.chart, interval: 0 } },
      series: series.concat(np.length ? [k.npSeries(np)] : []) };
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

  // The number a region's dots carry when many groups share a row (QA-4): its place in the file, so it never changes.
  function numberOf(e) { return e.kind === 'region' ? TAP.data.regionIndex(e.regionIds[0]) + 1 : null; }

  /*
   * With many groups, dots that share a rating in a row are spread as a small swarm round their score: up to 4 side by
   * side, then a second line. The spread is a pixel offset of the drawn symbol only (symbolOffset), so the value, the
   * tooltip and the table stay exact and the row stays compact.
   */
  function swarm(draw, size) {
    var spots = {}, out = {}, per = 4, step = size + 2;
    draw.rows.forEach(function (row, gi) {
      draw.keys.forEach(function (key, j) {
        var c = row.cells[key];
        if (c.state === 'value') (spots[j + '|' + c.v] = spots[j + '|' + c.v] || []).push(gi);
      });
    });
    Object.keys(spots).forEach(function (sk) {
      var list = spots[sk], lines = Math.ceil(list.length / per), j = sk.split('|')[0];
      list.forEach(function (gi, i) {
        var line = Math.floor(i / per), inLine = Math.min(per, list.length - line * per), at = i - line * per;
        out[gi + '|' + j] = [Math.round((at - (inLine - 1) / 2) * step), Math.round((line - (lines - 1) / 2) * step)];
      });
    });
    return out;
  }

  // Dot plot. Groups sit side by side within a category; the nudge moves only the category position,
  // never the value, and tooltips read the cell itself. With more than 3 groups each dot carries its region's number,
  // matching the legend, so dots that share a rating are told apart without colour.
  function dot(draw) {
    if (!draw.cats && !isRating(draw.k.colOf(draw.ds, draw.keys[0]))) return rowDots(draw);
    var k = draw.k, th = k.th(), col = k.colOf(draw.ds, draw.keys[0]), rating = isRating(col);
    var G = draw.cats ? draw.rows.length : 1, np = [], ring = [], many = draw.cats && G > 3;
    var off = function (gi) { return G < 2 || many ? 0 : (gi - (G - 1) / 2) * Math.min(0.12, 0.72 / G); };
    var npX = rating ? 0.5 : 0, size = many ? 18 : G > 4 ? th.space[3] : th.space[4];
    var groups = draw.cats ? draw.rows.map(function (r) { return [r]; }) : [draw.rows], spread = many ? swarm(draw, size) : {};
    var series = groups.map(function (rs, gi) {
      var data = [], e = rs[0].entity, n = many ? numberOf(e) : null;
      rs.forEach(function (row, ri) {
        draw.keys.forEach(function (key, j) {
          var c = row.cells[key], y = draw.cats ? j + off(gi) : ri;
          if (c.state === 'value') {
            var so = spread[gi + '|' + j] || undefined;
            data.push(item(row, key, c, { value: [c.v, y], itemStyle: { color: row.entity.color }, symbolOffset: so }));
            if (k.highlighted(row.entity, draw.ctx.highlight)) ring.push({ value: [c.v, y], entityId: row.entityId, size: size, symbolOffset: so });
          } else if (c.state === 'notProvided') {
            np.push({ value: [npX, y], entityId: row.entityId, text: npText(draw, row), title: row.label, what: k.colOf(draw.ds, key).label });
          }
        });
      });
      // Grey regions sit underneath, so the focus region stays visible where dots overlap (US-1.1.6)
      var under = draw.cats && e.role === 'muted';
      return { type: 'scatter', tapRole: 'value', name: draw.cats ? e.label : col.label, symbolSize: size, z: under ? 2 : 3,
        itemStyle: { color: draw.cats ? e.color : th.ink, opacity: 1 }, data: data, tooltip: tooltip(draw),
        label: n ? { show: true, position: 'inside', formatter: String(n), fontSize: th.type.chartMin, fontWeight: 700,
          color: e.role === 'muted' ? th.ink : th.onColour } : undefined };
    });
    if (many) draw.res.legend = draw.res.legend.map(function (l, i) { return Object.assign({}, l, { mark: numberOf(draw.rows[i].entity) }); });
    var labels = draw.cats ? catLabels(draw) : draw.rows.map(function (r) { return r.label; });
    var xAxis = rating ? k.valueAxis(col, { min: 0.5, max: 3.5, interval: 0.5,
      axisLabel: { fontSize: th.type.chart, formatter: function (v) { return v % 1 === 0 ? String(v) : ''; } } }) : k.valueAxis(col);
    return { grid: k.grid(), tooltip: { trigger: 'item' }, xAxis: xAxis,
      yAxis: { type: 'value', inverse: true, min: -0.5, max: labels.length - 0.5, interval: 1, splitLine: { show: many, lineStyle: { color: th.grid } },
        axisLine: { show: true }, axisTick: { show: false },
        axisLabel: { fontSize: th.type.chart, customValues: labels.map(function (l, i) { return i; }),
          formatter: function (v) { return labels[Math.round(v)] || ''; } } },
      series: series.concat(np.length ? [k.npSeries(np)] : [], ring.length ? [k.ringSeries(ring)] : []) };
  }

  /*
   * Dot plot of one value (US-2.7.3): one row per region or combined figure, a dot at its value with the value
   * written beside it. With a breakdown, one dot per value on the row, each labelled ("Y1") rather than told apart by
   * colour. Amounts and counts start at zero; a rate may start at the smallest value shown, and that start is labelled.
   */
  function rowDots(draw) {
    var k = draw.k, th = k.th(), col = k.colOf(draw.ds, draw.keys[0]), keys = draw.bd.length ? draw.bd : draw.keys;
    var np = [], ring = [], shown = [], size = th.space[4];
    var series = keys.map(function (key, i) {
      var kc = k.colOf(draw.ds, key), bd = draw.bd.length ? kc.breakdown : null;
      var tag = !bd ? null : bd.dim === 'year' ? k.t('chart.yearShort', { n: bd.value }) : kc.label, data = [];
      draw.rows.forEach(function (row, ri) {
        var c = row.cells[key];
        if (c.state === 'value') {
          shown.push(c.v);
          data.push(item(row, key, c, { value: [c.v, ri], itemStyle: { color: tag ? th.shade(row.entity.color, i) : row.entity.color,
            borderColor: row.entity.color, borderWidth: th.border.control } }));
          if (k.highlighted(row.entity, draw.ctx.highlight)) ring.push({ value: [c.v, ri], entityId: row.entityId, size: size });
        } else if (c.state === 'notProvided') {
          np.push({ value: [0, ri], entityId: row.entityId, text: tag ? k.t('chart.npFor', { name: tag }) : k.t('states.notProvided'),
            title: row.label, what: kc.label });
        }
      });
      return { type: 'scatter', tapRole: 'value', name: tag || col.label, symbolSize: size, z: 3, itemStyle: { color: th.ink, opacity: 1 },
        data: data, tooltip: tooltip(draw), label: { show: true, position: tag ? 'top' : 'right', fontSize: th.type.chart, color: th.ink,
          formatter: function (p) {
            if (tag) return tag;
            return p.data && p.data.raw != null ? TAP.format.cell({ v: p.data.raw, state: 'value' }, { unit: col.unit }) : '';
          } } };
    });
    if (draw.bd.length) {
      draw.res.legend = draw.res.legend.concat(series.map(function (s, i) { return { label: s.name, color: th.shade(th.ink, i), role: 'part' }; }));
    }
    var low = shown.length ? Math.min.apply(null, shown) : 0;
    var min = col.unit === 'pct' && low > 0 ? Math.floor(low * 100) / 100 : Math.min(0, low);
    var labels = draw.rows.map(function (r) { return r.label; });
    return { grid: k.grid({ right: th.space[12] * 2 }), tooltip: { trigger: 'item' },
      xAxis: k.valueAxis(col, { min: min, axisLabel: { formatter: k.axisFormatter(col.unit), fontSize: th.type.chart, showMinLabel: true } }),
      yAxis: { type: 'value', inverse: true, min: -0.5, max: labels.length - 0.5, interval: 1, splitLine: { show: true, lineStyle: { color: th.grid } },
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

  // A long axis name breaks at the space nearest its middle (display only; the name itself is unchanged).
  function twoLines(name) {
    var n = String(name), mid = n.length / 2, best = -1;
    if (n.length <= 12) return n;
    for (var i = 0; i < n.length; i++) if (n[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    return best < 0 ? n : n.slice(0, best) + '\n' + n.slice(best + 1);
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
    // A radar draws groups in data order: grey and combined first, then the second region, the focus last on top.
    var rank = { muted: 0, combined: 1, region: 2, second: 3, focus: 4 };
    whole = whole.slice().sort(function (x, y) { return rank[x.entity.role] - rank[y.entity.role]; });
    var data = whole.map(function (row) {
      var vals = draw.keys.map(function (key) { return row.cells[key].v; });
      var on = k.highlighted(row.entity, draw.ctx.highlight);
      return { name: row.label, value: vals.slice(), raw: vals, keys: draw.keys.slice(),
        entityId: row.entityId, itemStyle: { color: row.entity.color },
        lineStyle: { color: on ? hl.color : row.entity.color, width: on ? hl.width : th.border.rule } };
    });
    return { tooltip: { trigger: 'item' },
      // A smaller radius and names on two lines keep long names such as "Competitive intensity" inside a half-width panel
      radar: { radius: '58%', splitNumber: isRating(col) ? 3 : 4, axisName: { fontSize: th.type.chart, lineHeight: th.type.chart + 4, formatter: twoLines },
        indicator: catLabels(draw).map(function (n) { return { name: n, min: 0, max: max || 1 }; }) },
      series: [{ type: 'radar', tapRole: 'value', symbolSize: th.space[3], data: data, tooltip: { formatter: function (p) {
        var row = rowFor(draw.rows, p.data), lines = [];
        draw.keys.forEach(function (key) { lines.push([k.colOf(draw.ds, key).label, k.exact(row.cells[key], k.colOf(draw.ds, key))]); });
        return k.tip(row.label, lines);
      } } }] };
  }

  TAP.builders.register('compare', TAP.shapes.kit.safely(build));
})(window.TAP);
