/*
 * File: js/engine/prepare.js
 * Purpose: Runs a report's measures over the comparison scope into one dataset for the chart and the table, so
 *          both always read the same cells (US-1.2.4), and works out which regions have no data (US-1.2.11).
 * Provides: TAP.prepare (run, primaryIds, selected)
 * Depends on: js/engine/measures.js, js/engine/scope.js, js/core/data.js, js/core/content.js, js/core/store.js
 * Used by: every builder, js/panel/panel.js
 */
(function (TAP) {
  'use strict';

  // The measure shown first: the one asked for if the report lists it, else the report's first measure.
  function selected(def, ctx) {
    var ms = def.measures || [], want = ctx && ctx.measureId;
    if (want && ms.some(function (m) { return m.id === want; })) return want;
    return ms[0] ? ms[0].id : null;
  }

  // The measures that decide whether a region "has data" for this report.
  function primaryIds(def, ctx) {
    var o = def.options || {};
    if (o.measuresAs === 'categories') return (def.measures || []).map(function (m) { return m.id; });
    if (def.shape === 'xy' || def.shape === 'xyz') return [def.x, def.y].filter(Boolean);
    var sel = selected(def, ctx);
    if (!sel) return [];
    return def.shape === 'parts' ? [sel].concat((def.parts || {})[sel] || []) : [sel];
  }

  function yearLabel(y) {
    var ys = (TAP.data.meta() || {}).years;
    return ys && ys[y - 1] ? String(ys[y - 1]) : TAP.content.text('chart.year', { n: y });
  }

  function column(def, id, year) {
    var m = TAP.measures.meta(id) || { label: id, short: id, unit: 'text', valueKind: 'text', kind: 'APP' };
    var own = (def.measures || []).filter(function (x) { return x.id === id; })[0];
    return { key: year ? id + '@y' + year : id, measureId: id, year: year || null,
      label: year ? yearLabel(year) : (own && own.label) || m.label, short: m.short,
      unit: m.unit, valueKind: m.valueKind, kind: m.kind, scale: m.scale || null };
  }

  // Every measure the report names, plus one column per plan year when broken down by year.
  function columns(def, ctx) {
    var cols = TAP.reports.measureIds(def).map(function (id) { return column(def, id); });
    var sel = selected(def, ctx), m = sel && TAP.measures.meta(sel);
    if (ctx.breakdown === 'year' && m && m.dims.indexOf('year') >= 0) {
      [1, 2, 3].forEach(function (y) { cols.push(column(def, sel, y)); });
    }
    return cols;
  }

  // The industry a one-industry report reads (e.g. the six ratings): the one asked for, the one selected on
  // the Industry view, else the first rated industry.
  function industryOf(def, ctx) {
    if (def.dimension === 'industry') return null;
    if (ctx.industryId) return ctx.industryId;
    var o = def.options || {};
    if (!o.industryPicker && def.dimension !== 'rating') return null;
    var picked = TAP.store.get().industry, rated = TAP.data.industries({ rated: true });
    return picked || (rated[0] ? rated[0].id : null);
  }

  function cellsFor(cols, entity, mctx, industryId) {
    var cells = {};
    cols.forEach(function (c) {
      var x = Object.assign({}, mctx);
      if (c.year) x.year = c.year;
      if (industryId) x.industryId = industryId;
      cells[c.key] = TAP.measures.combined(c.measureId, entity, x);
    });
    return cells;
  }

  function run(def, ctx) {
    ctx = ctx || {};
    var entities = ctx.entities || TAP.scope.entities(ctx.cmp);
    var mctx = { year: ctx.year || null, industryId: industryOf(def, ctx), channel: ctx.channel || null,
      weights: (def.options && def.options.weights) || null };
    var cols = columns(def, ctx), rows = [], dim = def.dimension || 'entity';
    var industries = dim === 'industry' ? TAP.data.industries({ rated: true }) : null;

    entities.forEach(function (e) {
      if (industries) {
        industries.forEach(function (ind) {
          rows.push({ id: e.id + ':' + ind.id, entityId: e.id, entity: e, industryId: ind.id, label: ind.name,
            cells: cellsFor(cols, e, mctx, ind.id) });
        });
      } else {
        rows.push({ id: e.id, entityId: e.id, entity: e, industryId: null, label: e.label, cells: cellsFor(cols, e, mctx, null) });
      }
    });

    var gaps = missing(def, ctx, entities, mctx, industries);
    return { def: def, dimension: dim, entities: entities, rows: rows, columns: cols, primary: primaryIds(def, ctx),
      missing: gaps.names, missingIds: gaps.ids, empty: gaps.empty, ctx: mctx };
  }

  // A region is missing when none of the report's main figures has a value and at least one is blank.
  // Not applicable never makes a region missing. Empty means no region in scope has any value.
  function missing(def, ctx, entities, mctx, industries) {
    var keys = primaryIds(def, ctx), seen = {}, ids = [], any = false;
    entities.forEach(function (e) { e.regionIds.forEach(function (r) { seen[r] = true; }); });
    var inds = industries ? industries.map(function (d) { return d.id; }) : [mctx.industryId];
    TAP.data.regions().forEach(function (reg) {
      if (!seen[reg.id]) return;
      var states = [];
      keys.forEach(function (k) {
        var fn = TAP.measures.get(k);
        if (!fn) return;
        inds.forEach(function (ind) { states.push(fn(reg.id, Object.assign({}, mctx, { industryId: ind })).state); });
      });
      if (states.indexOf('value') >= 0) any = true;
      else if (states.indexOf('notProvided') >= 0) ids.push(reg.id);
    });
    return { ids: ids, empty: !any,
      names: ids.map(function (id) { return TAP.content.regionName(TAP.data.region(id)); }) };
  }

  TAP.prepare = { run: run, primaryIds: primaryIds, selected: selected };
})(window.TAP);
