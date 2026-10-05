/*
 * File: js/reports/dim-stack.js
 * Purpose: The builder for a figure split by one dimension (ARCHITECTURE 19.2): one part per value of the dimension,
 *          in the lookup's order, with "none" for rows or items that name no value. A definition names the dimension
 *          in options.by ('solution', 'category', 'route', 'maturity', 'partnerType', 'channel', ...); each of its
 *          measures must list that dimension. Draws stacked bars, 100% stacked bars, a heatmap grid and a table; the
 *          panel's own breakdown (plan year, partner type) gives a stack or a line per value.
 * Provides: builder 'dimStack' (registered with TAP.builders); TAP.dimStack (model)
 * Depends on: js/reports/stack-draw.js, js/engine/prepare.js, js/engine/measures.js, js/engine/scope.js,
 *             js/engine/shapes.js (drawing kit), js/core/content.js, js/theme.js (all at call time)
 * Used by: config/reports-newbusiness.js (nb-solutions), js/panel/panel.js (through TAP.builders)
 * Owner: NBPT stream (#449)
 *
 * Clicks: a cell or a segment gives a target with the regions behind it and figure.key "<measure>@<dimension>:<value>".
 * A part of the solution dimension also sets target.solution, which the list builder filters a drill level by (17.6).
 */
(function (TAP) {
  'use strict';

  function k() { return TAP.shapes.kit; }
  function t(key, vars) { return TAP.content.text('dimStack.' + key, vars); }
  function text(v) { return { v: v, state: 'value', kind: null }; }
  // The measure context key a dimension sets (as js/engine/prepare.js does)
  function ctxKey(dim) { return dim === 'industry' ? 'industryId' : dim; }

  // A dimension's values for the measure, as the engine lists them for a breakdown: the lookup's order, then "none"
  // when a row or item in scope names no value. Also the dataset for the measure itself (missing regions, notes).
  function valuesOf(ctx, m, dim) {
    var def = ctx.def, own = (def.measures || []).filter(function (x) { return x.id === m; });
    var d2 = Object.assign({}, def, { shape: 'compare', builder: null, dimension: 'entity', parts: {}, measures: own, breakdowns: [dim] });
    var ds = TAP.prepare.run(d2, Object.assign({}, ctx, { def: d2, measureId: m, breakdown: dim })), values = [];
    ds.columns.forEach(function (c) { if (c.breakdown && c.breakdown.dim === dim) values.push(c.breakdown); });
    return { ds: ds, values: values };
  }

  // Everything the views draw: the parts, and one row per entity (and breakdown value) with a cell per part.
  function model(ctx) {
    var def = ctx.def, o = def.options || {}, by = o.by, m = TAP.prepare.selected(def, ctx), meta = TAP.measures.meta(m) || {};
    var own = (def.measures || []).filter(function (x) { return x.id === m; })[0] || {};
    var entities = ctx.entities || TAP.scope.entities(ctx.cmp), split = valuesOf(ctx, m, by);
    var bd = ctx.breakdown && ctx.breakdown !== by && TAP.prepare.breakdowns(def, ctx).indexOf(ctx.breakdown) >= 0 ? ctx.breakdown : null;
    var groups = bd ? valuesOf(ctx, m, bd).values : [];
    var parts = split.values.map(function (v) { return { value: v.value, label: v.label, key: m + '@' + by + ':' + v.value }; });
    function cell(e, x) { return TAP.measures.combined(m, e, Object.assign({ year: null, weights: o.weights || null }, x)); }
    var rows = [];
    entities.forEach(function (e) {
      (groups.length ? groups : [null]).forEach(function (g) {
        var base = {}, cells = {};
        if (g) base[ctxKey(bd)] = g.value;
        parts.forEach(function (p) { var x = Object.assign({}, base); x[ctxKey(by)] = p.value; cells[p.key] = cell(e, x); });
        rows.push({ id: g ? e.id + ':' + g.value : e.id, entityId: e.id, entity: e, group: g ? g.value : null, groupLabel: g ? g.label : null,
          label: g ? k().t('breakdown.entityValue', { entity: e.label, value: g.label }) : e.label, cells: cells, total: cell(e, base) });
      });
    });
    // A row whose every figure is not applicable is left out quietly (US-1.2.11)
    rows = rows.filter(function (r) {
      return r.total.state !== 'notApplicable' || parts.some(function (p) { return r.cells[p.key].state !== 'notApplicable'; });
    });
    return { def: def, by: by, m: m, bd: bd, label: own.label || meta.label, unit: meta.unit, ds: split.ds, entities: entities,
      groups: groups, parts: parts, rows: rows, numbered: true, highlight: ctx.highlight };
  }

  // One table row per bar: the region, the breakdown value when there is one, each part, then the total.
  function table(mo) {
    var C = function (key, label, unit) { return { key: key, label: label, unit: unit, align: unit === 'text' ? 'left' : 'right' }; };
    var cols = [C('entity', k().t('chart.entityColumn'), 'text')]
      .concat(mo.bd ? [C('group', TAP.content.text('panel.breakdowns.' + mo.bd), 'text')] : [])
      .concat(mo.parts.map(function (p) { return C(p.key, p.label, mo.unit); }))
      .concat([C(mo.m, k().t('chart.total'), mo.unit)]);
    return { columns: cols, rows: mo.rows.map(function (r) {
      var cells = Object.assign({ entity: text(r.entity.label) }, r.cells);
      if (mo.bd) cells.group = text(r.groupLabel);
      cells[mo.m] = r.total;
      return { id: r.id, entityId: r.entityId, group: r.group, cells: cells, src: r.total.src || null };
    }) };
  }

  // A click names its entity (entityId on a chart mark, regionId on a grid cell) and its part (part on a mark,
  // row "<dimension>:<value>" on a cell). No part: the total, so the regions alone.
  function targetFn(mo) {
    return function (params) {
      var d = params && params.data;
      if (!d) return null;
      var e = mo.entities.filter(function (x) { return x.id === (d.entityId || d.regionId); })[0];
      if (!e) return null;
      var hit = /^([^:]+):(.+)$/.exec(d.row || ''), value = hit && hit[1] === mo.by ? hit[2] : d.part != null ? d.part : null;
      var part = value == null ? null : mo.parts.filter(function (p) { return String(p.value) === String(value); })[0];
      var tg = { reportId: mo.def.id, regionIds: e.regionIds.slice(), industryIds: [], accountIds: [], mark: 'bar',
        figure: { key: part ? part.key : mo.m, how: e.kind === 'combined' ? e.how : null } };
      if (!part) return tg;
      // label names the drill level in the panel's breadcrumb (17.6)
      tg.label = e.kind === 'region' ? t('drillLabel', { part: part.label, region: e.label }) : part.label;
      if (mo.by === 'solution') tg.solution = part.value;
      return tg;
    };
  }

  function build(ctx) {
    var def = ctx.def, by = (def.options || {}).by, type = ctx.type || def.defaultType, kit = k(), D = TAP.stackDraw;
    var m = TAP.prepare.selected(def, ctx), meta = TAP.measures.meta(m);
    if (!by || !meta || (meta.dims || []).indexOf(by) < 0) return kit.result(def, null, { error: t('noBy', { by: String(by || '') }) });
    var mo = model(ctx);
    var res = kit.result(def, mo.ds, { table: table(mo), notes: kit.notes(mo.ds, [mo.m]), target: targetFn(mo) });
    if (mo.ds.empty || !mo.rows.length) { res.empty = true; return res; }
    if (type === 'table') return res;
    if (type === 'heatmap') {
      res.html = D.grid(mo, def.title);
      res.legend = D.gridLegend();
      return res;
    }
    res.option = D.bars(mo, type);
    res.legend = D.legend(mo);
    // Many bars (a stack per region and breakdown value) need more room than the panel's usual chart
    var th = kit.th();
    if (mo.rows.length > 8) res.height = th.space[12] * 2 + mo.rows.length * th.space[8];
    return res;
  }

  TAP.builders.register('dimStack', TAP.shapes.kit.safely(build));
  TAP.dimStack = { model: model };
})(window.TAP);
