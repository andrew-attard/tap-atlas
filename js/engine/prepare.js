/*
 * File: js/engine/prepare.js
 * Purpose: Runs a report's measures over the comparison scope into one dataset for the chart and the table, so
 *          both always read the same cells (US-1.2.4), and works out which regions have no data (US-1.2.11).
 * Provides: TAP.prepare (run, primaryIds, selected, breakdowns)
 * Depends on: js/engine/registry.js (measureIds), js/engine/measures.js, measures-p4.js (kit4), js/engine/scope.js, js/core/data.js,
 *             js/core/content.js, js/core/store.js
 * Used by: the generic builders (build-compare, build-parts, build-xy), js/panel/panel-menus.js
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

  // Breakdown dimensions are listed in TAP.reports.BREAKDOWNS (ARCHITECTURE 17.3, 19.2); each sets one measure context key.
  var CTX_KEY = { year: 'year', industry: 'industryId', channel: 'channel', motion: 'motion', segment: 'segment', risk: 'risk',
    solution: 'solution', category: 'category', route: 'route', maturity: 'maturity', partnerType: 'partnerType' };
  // The Phase 4 dimensions and the lookup each takes its values from
  var LOOKUP = { solution: 'solutions', category: 'productCategories', route: 'routes', maturity: 'partnerMaturity', partnerType: 'partnerTypes' };

  // bd: {dim, value, label} for a breakdown column. Year columns keep the Phase 1 key <id>@y1..3.
  function column(def, id, bd) {
    var m = TAP.measures.meta(id) || { label: id, short: id, unit: 'text', valueKind: 'text', kind: 'APP' };
    var own = (def.measures || []).filter(function (x) { return x.id === id; })[0];
    var year = bd && bd.dim === 'year' ? bd.value : null;
    return { key: !bd ? id : year ? id + '@y' + year : id + '@' + bd.dim + ':' + bd.value, measureId: id, year: year,
      breakdown: bd || null, label: bd ? bd.label : (own && own.label) || m.label, short: m.short,
      unit: m.unit, valueKind: m.valueKind, kind: m.kind, scale: m.scale || null };
  }

  // The measures a breakdown splits: the selected one and, on a parts report, its parts.
  function brokenIds(def, ctx) {
    var sel = selected(def, ctx);
    return !sel ? [] : def.shape === 'parts' ? [sel].concat((def.parts || {})[sel] || []) : [sel];
  }
  function supports(id, dim) { var m = TAP.measures.meta(id); return !!m && (m.dims || []).indexOf(dim) >= 0; }

  // The breakdowns to offer: allowed by the report and listed in the selected measure's dims (and every part's,
  // except for year, which splits only the total, as in Phase 1).
  function breakdowns(def, ctx) {
    var ids = brokenIds(def, ctx || {});
    if (!ids.length || (def.options || {}).measuresAs === 'categories') return [];
    return (def.breakdowns || []).filter(function (d) {
      if ((TAP.reports.BREAKDOWNS || []).indexOf(d) < 0 || (d === 'industry' && def.dimension === 'industry')) return false;
      return (d === 'year' ? ids.slice(0, 1) : ids).every(function (id) { return supports(id, d); });
    });
  }

  function lookupValues(list) { return (list || []).map(function (x) { return { value: x.id, label: x.name }; }); }
  function words(dim, ids) { return ids.map(function (v) { return { value: v, label: TAP.content.text('breakdown.' + dim + '.' + v) }; }); }

  // A Phase 4 dimension: the lookup's values in its order, then "none" when some row or item in scope names no value.
  function lookupValuesOf(dim, ids, entities, mctx) {
    var none = {};
    none[CTX_KEY[dim]] = 'none';
    var used = entities.some(function (e) {
      return ids.some(function (id) {
        var c = TAP.measures.combined(id, e, Object.assign({}, mctx, none));
        return c.state === 'value' && c.v !== 0;
      });
    });
    return lookupValues(TAP.measures.kit4.lookup(LOOKUP[dim])).concat(used ? words(dim, ['none']) : []);
  }

  // The values of a dimension. Industries are those with a value for some entity in scope; the rest are fixed lists.
  function valuesOf(dim, ids, entities, mctx) {
    var lk = TAP.data.lookups() || {};
    if (LOOKUP[dim]) return lookupValuesOf(dim, ids, entities, mctx);
    if (dim === 'year') return [1, 2, 3].map(function (y) { return { value: y, label: yearLabel(y) }; });
    if (dim === 'channel') return lookupValues(lk.channels);
    if (dim === 'segment') return lookupValues(lk.segments);
    if (dim === 'motion') return words('motion', ['nb', 'cg']);
    if (dim === 'risk') return words('risk', ['high', 'medium', 'none']);
    return TAP.data.industries().filter(function (ind) {
      return entities.some(function (e) {
        return ids.some(function (id) {
          return TAP.measures.combined(id, e, Object.assign({}, mctx, { industryId: ind.id })).state === 'value';
        });
      });
    }).map(function (ind) { return { value: ind.id, label: ind.name }; });
  }

  // Every measure the report names, plus one column per breakdown value for the measures it splits.
  function columns(def, ctx, entities, mctx) {
    var cols = TAP.reports.measureIds(def).map(function (id) { return column(def, id); });
    var dim = ctx.breakdown;
    if (!dim || breakdowns(def, ctx).indexOf(dim) < 0) return cols;
    var ids = dim === 'year' ? brokenIds(def, ctx).slice(0, 1) : brokenIds(def, ctx);
    valuesOf(dim, ids, entities, mctx).forEach(function (v) {
      ids.forEach(function (id) { cols.push(column(def, id, { dim: dim, value: v.value, label: v.label })); });
    });
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
      if (industryId) x.industryId = industryId;
      if (c.breakdown) x[CTX_KEY[c.breakdown.dim]] = c.breakdown.value;
      cells[c.key] = TAP.measures.combined(c.measureId, entity, x);
    });
    return cells;
  }

  function run(def, ctx) {
    ctx = ctx || {};
    var entities = ctx.entities || TAP.scope.entities(ctx.cmp);
    var mctx = { year: ctx.year || null, industryId: industryOf(def, ctx), channel: ctx.channel || null,
      weights: (def.options && def.options.weights) || null };
    // Which base-year figure growth is measured against (by.growth): the panel's choice, else the report's
    var against = (ctx.opts && ctx.opts.against) || (def.options && def.options.against);
    if (against) mctx.against = against;
    var cols = columns(def, ctx, entities, mctx), rows = [], dim = def.dimension || 'entity';
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

    var gaps = missing(def, ctx, entities, mctx, industries, cols);
    return { def: def, dimension: dim, entities: entities, rows: rows, columns: cols, primary: primaryIds(def, ctx),
      missing: gaps.names, missingIds: gaps.ids, empty: gaps.empty, ctx: mctx };
  }

  // The contexts a figure is looked at in: the report's own, then each breakdown value drawn. A figure that exists
  // only per industry (ind.*, broken down by industry) has a value in the breakdown alone (#361).
  function patches(cols) {
    var out = [{}], seen = {};
    (cols || []).forEach(function (c) {
      var b = c.breakdown, k = b && b.dim + ':' + b.value, x = {};
      if (!b || seen[k]) return;
      seen[k] = true;
      x[CTX_KEY[b.dim]] = b.value;
      out.push(x);
    });
    return out;
  }

  // A region is missing when none of the report's main figures has a value and at least one is blank.
  // Not applicable never makes a region missing. Empty means no region in scope has any value.
  function missing(def, ctx, entities, mctx, industries, cols) {
    var keys = primaryIds(def, ctx), seen = {}, ids = [], any = false, more = patches(cols);
    entities.forEach(function (e) { e.regionIds.forEach(function (r) { seen[r] = true; }); });
    var inds = industries ? industries.map(function (d) { return d.id; }) : [mctx.industryId];
    TAP.data.regions().forEach(function (reg) {
      if (!seen[reg.id]) return;
      var states = [];
      keys.forEach(function (k) {
        var fn = TAP.measures.get(k);
        if (!fn) return;
        inds.forEach(function (ind) {
          more.forEach(function (x) { states.push(fn(reg.id, Object.assign({}, mctx, { industryId: ind }, x)).state); });
        });
      });
      if (states.indexOf('value') >= 0) any = true;
      else if (states.indexOf('notProvided') >= 0) ids.push(reg.id);
    });
    return { ids: ids, empty: !any,
      names: ids.map(function (id) { return TAP.content.regionName(TAP.data.region(id)); }) };
  }

  TAP.prepare = { run: run, primaryIds: primaryIds, selected: selected, breakdowns: breakdowns };
})(window.TAP);
