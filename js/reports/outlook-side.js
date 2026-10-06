/*
 * File: js/reports/outlook-side.js
 * Purpose: Chart builder for figures that sit side by side: for each region or combined figure, two to four bars
 *          (the strategic plan and the plan, say) and one closing line that compares them (variance, growth, share).
 *          The generic compare builder shows one measure per region, or the measures as categories with no switch
 *          and no breakdown, so these reports have their own. The drawing is in js/reports/outlook-side-draw.js.
 * Provides: chart builder 'olSide' (registered with TAP.builders); TAP.olSide (columns, sliceKey)
 * Depends on: js/engine/prepare.js (scope, breakdown values, missing regions), js/engine/measures.js (combined),
 *             js/engine/measures-p4.js (kit4.made), js/engine/shapes.js (kit), js/engine/aggregate.js (describe),
 *             js/core/content.js, js/reports/outlook-side-draw.js (all at call time)
 * Used by: config/reports-outlook.js (ol-strategic, ol-baseyear, ol-revshare)
 * Owner: OUTLOOK stream (#442)
 *
 * A definition sets options.side:
 *   bars      [{id, label}]: the measures drawn as bars, in order; the last one takes the region's full colour.
 *   end       {label, amount, rate, signed}: the closing line, e.g. "Variance -€125k (-4.6%)". amount and rate are
 *             measure ids (either may be left out); label is a text, or one text per value of the "against" option.
 *   category  {measureId: categoryId}: the product category a measure of the switch stands for; every figure is
 *             then read for that category.
 *   share     {of, label}: a table column with each region's share of a combined total's figure (the gap).
 *   against   {label, options: [{value, label}]}: a switch for the base-year figure growth is measured against.
 */
(function (TAP) {
  'use strict';

  // The measure context key a breakdown sets (the dimensions these reports offer)
  var CTX_KEY = { year: 'year', category: 'category', channel: 'channel', motion: 'motion' };

  function side(def) { return (def.options || {}).side || {}; }
  // The key a figure has in a slice, as the generic charts write it: <id>, <id>@y2 or <id>@<dim>:<value>
  function sliceKey(id, s) { return !s ? id : s.dim === 'year' ? id + '@y' + s.value : id + '@' + s.dim + ':' + s.value; }

  // The columns: each bar, then the closing amount and rate. Labels come from the definition, units from the measures.
  function columns(def, against) {
    var sd = side(def), end = sd.end || {}, out = [];
    function add(id, label, role) {
      var m = TAP.measures.meta(id) || { label: id, unit: 'text', valueKind: 'text', kind: 'APP' };
      out.push({ key: id, measureId: id, label: label || m.label, short: m.short, unit: m.unit, valueKind: m.valueKind, kind: m.kind, role: role });
    }
    (sd.bars || []).forEach(function (b) { add(b.id, b.label, 'bar'); });
    var word = end.label && typeof end.label === 'object' ? end.label[against] || end.label[Object.keys(end.label)[0]] : end.label;
    if (end.amount) add(end.amount, end.rate ? TAP.content.text('olSide.amountOf', { label: word }) : word, 'end');
    if (end.rate) add(end.rate, end.amount ? TAP.content.text('olSide.rateOf', { label: word }) : word, 'end');
    return { list: out, endLabel: word || '' };
  }

  // The breakdown values on screen, read from the generic dataset so they follow the same rules everywhere.
  function slices(ds) {
    var out = [];
    ds.columns.forEach(function (c) {
      var b = c.breakdown;
      if (b && !out.some(function (x) { return x.dim === b.dim && String(x.value) === String(b.value); })) out.push(b);
    });
    return out;
  }

  // One row per region (or combined figure) and breakdown value, each cell read from the catalogue measure.
  // env: {cols, ctx (the measure context), own (the category the selected measure stands for), cuts (breakdown values)}
  function rows(env, entities) {
    var out = [];
    entities.forEach(function (e) {
      (env.cuts.length ? env.cuts : [null]).forEach(function (s) {
        // A measure that stands for one category has nothing to show under another
        if (s && s.dim === 'category' && env.own && s.value !== env.own) return;
        var x = Object.assign({}, env.ctx), cells = {};
        if (s) x[CTX_KEY[s.dim] || s.dim] = s.value;
        if (env.own) x.category = env.own;
        env.cols.forEach(function (c) { cells[c.key] = TAP.measures.combined(c.measureId, e, x); });
        if (env.cols.every(function (c) { return cells[c.key].state === 'notApplicable'; })) return;   // left out quietly (US-1.2.11)
        out.push({ id: e.id + (s ? ':' + s.value : ''), entityId: e.id, entity: e, industryId: null, slice: s, ctx: x, cells: cells,
          cut: s || (env.own ? { dim: 'category', value: env.own } : null),
          label: s ? TAP.content.text('breakdown.entityValue', { entity: e.label, value: s.label }) : e.label });
      });
    });
    return out;
  }

  // Each region's share of a combined total's figure (the gap), as rows under that total in the table.
  function shareRows(def, env, entities, table, list) {
    var sh = side(def).share, k4 = TAP.measures.kit4, out = [];
    if (!sh || !entities.some(function (e) { return e.kind === 'combined' && e.how === 'total'; })) return;
    table.columns.push({ key: 'share', label: sh.label, unit: 'pct', align: 'right' });
    list.forEach(function (r, i) {
      out.push(table.rows[i]);
      table.rows[i].cells.share = { v: null, state: 'notApplicable', kind: null };   // a share is a region's, under its total
      if (r.entity.kind !== 'combined' || r.entity.how !== 'total') return;
      var total = r.cells[sh.of];
      var parts = r.entity.regionIds.map(function (id) {
        return { id: id, kind: 'region', regionIds: [id], how: null, role: 'region', color: TAP.scope.colorOf(id), label: TAP.content.regionName(TAP.data.region(id)) };
      });
      rows(Object.assign({}, env, { cuts: r.slice ? [r.slice] : [] }), parts).forEach(function (p) {
        var c = p.cells[sh.of], src = k4.made(p.entityId, sh.of, p.ctx, [[sh.of, c], [sh.of, total]]);
        var ok = c.state === 'value' && total.state === 'value' && total.v !== 0;
        var cells = { entity: { v: TAP.content.text('olSide.partOf', { region: p.entity.label, total: r.label }), state: 'value', kind: null },
          share: ok ? { v: c.v / total.v, state: 'value', kind: 'APP', src: src }
            : { v: null, state: c.state === 'notProvided' ? 'notProvided' : 'notApplicable', kind: 'APP', src: src } };
        env.cols.forEach(function (col) { cells[col.key] = p.cells[col.key]; });
        out.push({ id: r.id + '/' + p.entityId, entityId: p.entityId, industryId: null, cells: cells, src: c.src || null });
      });
    });
    table.rows = out;
  }

  function table(k, cols, list) {
    return { columns: [{ key: 'entity', label: k.t('chart.entityColumn'), unit: 'text', align: 'left' }].concat(cols.map(function (c) {
      return { key: c.key, label: c.label, unit: c.unit, align: 'right' };
    })), rows: list.map(function (r) {
      var cells = { entity: { v: r.label, state: 'value', kind: null } };
      cols.forEach(function (c) { cells[c.key] = r.cells[c.key]; });
      return { id: r.id, entityId: r.entityId, industryId: null, cells: cells, src: (r.cells[cols[0].key] || {}).src || null };
    }) };
  }

  // Notes: a combined figure that left regions out, and partly provided figures, each said once per row.
  function notes(k, cols, list) {
    var out = [];
    list.forEach(function (r) {
      var said = {};
      cols.forEach(function (c) {
        var cell = r.cells[c.key], s = (cell && cell.src) || {}, msg = null;
        if (!cell || cell.state !== 'value') return;
        if (s.combined && (s.excluded || []).length) msg = TAP.agg.describe(cell);
        else if (cell.partial && cell.note) msg = cell.note;
        if (!msg || said[msg]) return;
        said[msg] = true;
        msg = k.t('chart.note', { label: r.label, measure: k.lower(c.label), text: msg });
        if (out.indexOf(msg) < 0) out.push(msg);
      });
    });
    return out;
  }

  function build(ctx) {
    var k = TAP.shapes.kit, def = ctx.def, sd = side(def), ds = TAP.prepare.run(def, ctx);
    var opt = sd.against, against = opt ? ds.ctx.against || opt.options[0].value : null;
    var cols = columns(def, against);
    var env = { cols: cols.list, ctx: ds.ctx, cuts: slices(ds), own: (sd.category || {})[TAP.prepare.selected(def, ctx)] || null };
    var list = rows(env, ds.entities), tb = table(k, cols.list, list);
    shareRows(def, env, ds.entities, tb, list);
    var bars = cols.list.filter(function (c) { return c.role === 'bar'; });
    var res = k.result(def, ds, { table: tb, notes: notes(k, cols.list, list),
      legend: k.legendOf({ entities: ds.entities }).concat(bars.slice().reverse().map(function (c, i) {
        return { label: c.label, color: k.th().shade(k.th().ink, i), role: 'part' };
      })) });
    if (opt) res.controls = [{ key: 'against', label: opt.label, kind: 'segmented', value: against, options: opt.options }];
    if (ds.empty || !list.length) { res.empty = true; return res; }
    if ((ctx.type || def.defaultType) === 'table') return res;
    var drawn = TAP.olSideDraw.option({ k: k, ctx: ctx, rows: list, bars: bars, end: sd.end || {}, endLabel: cols.endLabel, cols: cols.list });
    res.option = drawn.option;
    res.height = drawn.height;
    return res;
  }

  TAP.olSide = { columns: columns, sliceKey: sliceKey };
  TAP.builders.register('olSide', TAP.shapes.kit.safely(build));
})(window.TAP);
