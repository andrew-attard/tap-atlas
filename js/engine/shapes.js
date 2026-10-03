/*
 * File: js/engine/shapes.js
 * Purpose: Decides which chart types suit a report's data shape and the current comparison (D18), and holds the
 *          small drawing kit the generic builders share: escaped tooltips, the not-provided mark, highlight rings,
 *          axes, bubble sizes, tables, notes and the builder result.
 * Provides: TAP.shapes (types, label, kit)
 * Depends on: js/engine/registry.js, js/theme.js, js/core/dom.js, js/core/format.js, js/core/content.js,
 *             js/engine/aggregate.js (combined-figure labels)
 * Used by: js/panel/panel-menus.js, js/engine/build-compare.js, build-parts.js, build-xy.js
 */
(function (TAP) {
  'use strict';

  function th() { return window.TAP_THEME; }
  function t(key, vars) { return TAP.content.text(key, vars); }
  function esc(s) { return TAP.dom.esc(s); }
  // Lower-cases the first letter for use mid-sentence, but leaves acronyms such as ARR alone.
  function lower(s) { return !s ? '' : /^[A-Z][A-Z0-9]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); }

  /* ---------- chart types (D18) ---------- */

  // Table always; radar only with 3 or fewer entities; bubble types only with a size measure;
  // grouped bars only once a breakdown is chosen (except for the 'years' shape, where they are native).
  function types(def, entityCount, opts) {
    var allowed = TAP.reports.SHAPE_TYPES[def.shape] || [];
    var hasSize = !!(def.size && def.size.options && def.size.options.length);
    var out = (def.types || []).filter(function (x) {
      if (allowed.indexOf(x) < 0) return false;
      if (x === 'radar') return entityCount <= 3;
      if (x === 'bubble' || x === 'bubbleGrid') return hasSize && (def.shape !== 'parts' || !!(def.x && def.y));
      if (x === 'groupedBar') return def.shape === 'years' || !!(opts && opts.breakdown);
      return true;
    });
    if (out.indexOf('table') < 0) out.push('table');
    return out;
  }

  function label(type) { return t('chartTypes.' + type); }

  /* ---------- drawing kit ---------- */

  function colOf(ds, key) { return ds.columns.filter(function (c) { return c.key === key; })[0]; }

  // Rows worth drawing: a row whose every cell is not applicable is left out quietly (US-1.2.11).
  function visibleRows(ds, keys) {
    return ds.rows.filter(function (r) {
      return keys.some(function (k) { return r.cells[k] && r.cells[k].state !== 'notApplicable'; });
    });
  }

  // Tooltip HTML from a fixed template. Every value passes through TAP.dom.esc: names come from the workbooks.
  function tip(title, rows) {
    return '<div class="tap-tip"><div class="tap-tip-title">' + esc(title) + '</div>' + rows.filter(Boolean).map(function (r) {
      return '<div class="tap-tip-row"><span>' + esc(r[0]) + '</span> <b>' + esc(r[1]) + '</b></div>';
    }).join('') + '</div>';
  }

  function exact(c, col) { return TAP.format.cell(c, { unit: col.unit, exact: true, field: col.scale }); }

  // Tooltip rows for one cell: the exact value, the kind of value and, for combined figures, how they were made.
  function cellRows(c, col) {
    var rows = [[col.label, exact(c, col)]];
    if (!c || c.state !== 'value') return rows;
    rows.push([t('chart.kind'), TAP.format.kind(c.kind).text]);
    var how = TAP.agg.describe(c);
    if (how) rows.push([t('chart.how'), how]);
    if (c.partial && c.note) rows.push([t('chart.partial'), c.note]);
    return rows;
  }

  function axisFormatter(unit) {
    if (unit === 'money') return function (v) { return v === 0 ? '0' : TAP.format.money(v); };
    if (unit === 'pct') return function (v) { return TAP.format.pct(v); };
    return function (v) { return TAP.format.num(v); };
  }

  function valueAxis(col, extra) {
    var ax = { type: 'value', axisLabel: { formatter: axisFormatter(col.unit), fontSize: th().type.chart } };
    if (col.unit === 'rating' || col.unit === 'score') { ax.min = 0; ax.max = 3; ax.interval = 1; }
    return Object.assign(ax, extra || {});
  }

  function grid(extra) {
    var s = th().space;
    return Object.assign({ left: s[4], right: s[12], top: s[6], bottom: s[4], containLabel: true }, extra || {});
  }

  // The outlined empty mark for every not-provided value: no fill, no hatching, and a "not provided" label.
  // points: [{value: [x, y], entityId, text, title, what}]
  function npSeries(points) {
    var np = th().echarts.tap.notProvided;
    return {
      type: 'scatter', tapRole: 'notProvided', symbol: np.symbol, symbolSize: np.size, z: 4,
      itemStyle: { color: th().notProvided.border, borderColor: th().notProvided.border, borderWidth: th().border.rule },
      label: { show: true, position: 'right', color: th().notProvided.fg, fontSize: th().type.chart,
        formatter: function (p) { return p.data.text; } },
      tooltip: { formatter: function (p) { return tip(p.data.title, [[p.data.what, t('states.notProvided')]]); } },
      data: points.map(function (p) { return Object.assign({ np: true }, p); })
    };
  }

  // A highlight ring round each highlighted mark, for every group. points: [{value, entityId, size}]
  function ringSeries(points) {
    var h = th().echarts.tap.highlight;
    return {
      type: 'scatter', tapRole: 'highlight', silent: true, z: 10, tooltip: { show: false },
      symbolSize: function (v, p) { return (p.data.size || th().space[4]) + h.ringGap * 2; },
      itemStyle: { color: 'transparent', borderColor: h.color, borderWidth: h.width, opacity: 1 },
      data: points
    };
  }

  function highlighted(entity, target) {
    var ids = (target && target.regionIds) || [];
    if (!entity || !ids.length) return false;
    return ids.indexOf(entity.id) >= 0 || (entity.kind === 'region' && ids.indexOf(entity.regionIds[0]) >= 0);
  }

  function sizeScale(max) {
    var b = th().echarts.tap.bubble;
    return function (v) { return b.min + (b.max - b.min) * Math.sqrt(Math.max(v, 0) / (max || 1)); };
  }

  function sizeLegend(max, col) {
    var f = sizeScale(max);
    return { label: t('chart.sizeLegend', { measure: lower(col.label) }), kind: TAP.format.kind(col.kind).text,
      items: [max, max / 4, max / 16].map(function (v) {
        return { d: Math.round(f(v)), text: TAP.format.cell({ v: v, state: 'value' }, { unit: col.unit }) };
      }) };
  }

  // The table: one row per drawn row, the same cells the chart reads (TPV-TC-062).
  function table(ds, keys, rows) {
    var cols = [{ key: 'entity', label: t('chart.entityColumn'), unit: 'text', align: 'left' }];
    if (ds.dimension === 'industry') cols.push({ key: 'industry', label: t('chart.industryColumn'), unit: 'text', align: 'left' });
    keys.forEach(function (k) {
      var c = colOf(ds, k);
      cols.push({ key: k, label: c.label, unit: c.unit, align: c.unit === 'text' ? 'left' : 'right', field: c.scale });
    });
    return { columns: cols, rows: (rows || ds.rows).map(function (r) {
      var cells = { entity: { v: r.entity.label, state: 'value', kind: null } };
      if (ds.dimension === 'industry') cells.industry = { v: r.label, state: 'value', kind: null };
      keys.forEach(function (k) { cells[k] = r.cells[k]; });
      return { entityId: r.entityId, industryId: r.industryId || null, cells: cells, src: (r.cells[keys[0]] || {}).src || null };
    }) };
  }

  // Notes under the chart: how combined figures left regions out, and partly provided figures.
  function notes(ds, keys) {
    var out = [];
    ds.rows.forEach(function (r) {
      keys.forEach(function (k) {
        var c = r.cells[k], col = colOf(ds, k), msg = null;
        if (!c || c.state !== 'value') return;
        var s = c.src || {};
        var gap = s.combined && ((s.excluded || []).length || (s.parts || []).some(function (p) { return (p.src.excluded || []).length; }));
        if (gap) msg = TAP.agg.describe(c);
        else if (c.partial && c.note) msg = c.note;
        if (msg) msg = t('chart.note', { label: r.label, measure: lower(col.label), text: msg });
        if (msg && out.indexOf(msg) < 0) out.push(msg);
      });
    });
    return out;
  }

  function legendOf(ds) {
    return ds.entities.map(function (e) { return { label: e.label, color: e.color, role: e.role }; });
  }

  // Maps a click on a mark to a details target, or null.
  function targetFn(def, ds) {
    return function (params) {
      var d = params && params.data;
      if (!d || !d.entityId) return null;
      var e = ds.entities.filter(function (x) { return x.id === d.entityId; })[0];
      if (!e) return null;
      var ind = d.industryId || ds.ctx.industryId;
      return { reportId: def.id, regionIds: e.regionIds.slice(), industryIds: ind ? [ind] : [], accountIds: [], mark: d.mark || 'points' };
    };
  }

  function result(def, ds, extra) {
    return Object.assign({ option: null, html: null, table: null, legend: [], sizeLegend: null, notes: [],
      missing: ds ? ds.missing : [], empty: ds ? ds.empty : false, error: null,
      target: ds ? targetFn(def, ds) : function () { return null; } }, extra || {});
  }

  // A builder that fails shows its error in its own panel instead of breaking the view.
  function safely(fn) {
    return function (ctx) {
      try { return fn(ctx); } catch (e) {
        return result(ctx && ctx.def, null, { error: t('chart.buildError', { message: e.message }) });
      }
    };
  }

  TAP.shapes = { types: types, label: label, kit: {
    th: th, t: t, lower: lower, colOf: colOf, visibleRows: visibleRows, tip: tip, exact: exact, cellRows: cellRows,
    axisFormatter: axisFormatter, valueAxis: valueAxis, grid: grid, npSeries: npSeries, ringSeries: ringSeries,
    highlighted: highlighted, sizeScale: sizeScale, sizeLegend: sizeLegend, table: table, notes: notes, legendOf: legendOf,
    result: result, safely: safely
  } };
})(window.TAP);
