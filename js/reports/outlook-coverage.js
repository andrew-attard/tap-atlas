/*
 * File: js/reports/outlook-coverage.js
 * Purpose: Chart builder for pipeline coverage (US-4.2.4). The generic compare builder draws the coverage per region
 *          (and per product category as a breakdown) with the reference line at 1; this adds the two figures the
 *          ratio is made of, the pipeline and the order intake still to win, to the table, and a note naming the
 *          regions whose ratio this app works out because the workbook gives none.
 * Provides: chart builder 'olCoverage' (registered with TAP.builders)
 * Depends on: js/engine/build-compare.js (builder 'compare'), js/engine/registry.js, js/engine/scope.js, js/core/data.js, js/core/content.js,
 *             js/core/format.js (all at call time)
 * Used by: config/reports-outlook.js (ol-coverage)
 * Owner: OUTLOOK stream (#444)
 */
(function (TAP) {
  'use strict';

  var M = 'by.coverage';
  function t(key, vars) { return TAP.content.text('olCoverage.' + key, vars); }

  // A part of a coverage cell's ratio as a money cell: num is the pipeline, den the amount still to win.
  function part(c, which) {
    if (!c || c.state === 'notApplicable') return { v: null, state: 'notApplicable', kind: null };
    if (c.state !== 'value' || !c.ratio) return { v: null, state: 'notProvided', kind: 'APP', src: c.src || null };
    return { v: c.ratio[which], state: 'value', kind: c.kind === 'PRE' ? 'PRE' : 'APP', src: c.src || null, partial: c.partial };
  }

  // Regions in scope where some base-year item has no coverage ratio of the workbook's: the app works those out.
  function workedOut(lists) {
    var ids = [];
    lists.forEach(function (list) {
      list.forEach(function (id) {
        var by = (TAP.data.region(id) || {}).baseYear;
        if (!by || ids.indexOf(id) >= 0) return;
        if ((by.items || []).some(function (it) { return typeof it.coverage !== 'number'; })) ids.push(id);
      });
    });
    return ids.map(function (id) { return TAP.content.regionName(TAP.data.region(id)); });
  }

  function build(ctx) {
    var res = TAP.builders.get('compare')(ctx);
    if (res.error || !res.table) return res;
    var tb = res.table, rows = tb.rows;
    rows.forEach(function (r) { if (r.id == null) r.id = r.entityId; });   // one row per entity: named by it
    var app = workedOut(rows.map(function (r) { return regionsOf(ctx, r.entityId); }));
    if (app.length) res.notes = res.notes.concat(t('workedOut', { names: TAP.format.list(app) }));
    // Without a breakdown the table shows what the ratio is made of, before the ratio itself
    var on = tb.columns.filter(function (c) { return c.key === M; })[0];
    if (on && tb.columns.length === 2) {
      tb.columns.splice(1, 0, { key: 'pipeline', label: t('pipeline'), unit: 'money', align: 'right' },
        { key: 'left', label: t('left'), unit: 'money', align: 'right' });
      rows.forEach(function (r) { r.cells.pipeline = part(r.cells[M], 'num'); r.cells.left = part(r.cells[M], 'den'); });
    }
    return res;
  }

  // The regions behind a table row (a region, or the regions of a combined figure).
  function regionsOf(ctx, entityId) {
    var e = (ctx.entities || TAP.scope.entities(ctx.cmp)).filter(function (x) { return x.id === entityId; })[0];
    return e ? e.regionIds : [];
  }

  TAP.builders.register('olCoverage', TAP.shapes.kit.safely(build));
})(window.TAP);
