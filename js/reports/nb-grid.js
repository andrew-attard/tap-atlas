/*
 * File: js/reports/nb-grid.js
 * Purpose: The new business industry grid (US-2.1.2): the regions in scope (or combined figures) across, the
 *          industries with new business down, each cell the value written out and shaded by size, with the region's
 *          tier for that industry. With a year breakdown each industry gets a line per plan year. The stacked bar by
 *          tier is drawn by the parts builder from a derived definition (nb.<t> split into Tier 1 and Tier 2).
 * Provides: builder 'nbGrid' (registered with TAP.builders)
 * Depends on: js/engine/shapes.js (drawing kit), js/engine/measures.js, js/engine/prepare.js, js/engine/scope.js,
 *             js/engine/build-parts.js, js/core/dom.js, js/core/format.js, js/core/content.js, js/core/data.js,
 *             js/core/store.js, js/theme.js (all at call time)
 * Used by: config/reports-newbusiness.js (nb-industries), js/panel/panel.js (through TAP.builders)
 * Owner: NB stream (#198)
 */
(function (TAP) {
  'use strict';

  function k() { return TAP.shapes.kit; }
  function t(key, vars) { return TAP.content.text('nbGrid.' + key, vars); }
  function esc(s) { return TAP.dom.esc(s); }
  function has(list, x) { return (list || []).indexOf(x) >= 0; }
  function text(v) { return { v: v, state: 'value', kind: null }; }
  var NO_TIER = { v: null, state: 'notApplicable', kind: null };

  // The whole-region figure behind an industry measure: ind.nb.arr -> nb.arr (and its parts nb.arr.tier1, .tier2).
  function totalOf(id) { return id.replace(/^ind\./, ''); }

  function yearLabel(y) {
    var ys = (TAP.data.meta() || {}).years;
    return ys && ys[y - 1] ? String(ys[y - 1]) : TAP.content.text('chart.year', { n: y });
  }

  /* ---------- the grid's data ---------- */

  // One column per scope entity. With one region against the others shown one by one, the others are grey.
  function columns(ctx) {
    var th = k().th();
    return (ctx.entities || TAP.scope.entities(ctx.cmp)).map(function (e) {
      return { id: e.id, e: e, label: e.label, role: e.role, region: e.kind === 'region' ? e.regionIds[0] : null,
        color: e.role === 'muted' ? th.focusGrey : e.color };
    });
  }

  // Industries named on at least one new business row of a region in scope, in lookup order.
  function industries(regionIds) {
    var used = {};
    regionIds.forEach(function (r) { ((TAP.data.region(r) || {}).newBusiness || []).forEach(function (row) { used[row.industryId] = true; }); });
    return TAP.data.industries().filter(function (d) { return used[d.id]; });
  }

  function model(ctx) {
    var def = ctx.def, m = TAP.prepare.selected(def, ctx), meta = TAP.measures.meta(m);
    var cols = columns(ctx), ids = TAP.scope.regionIds(ctx.cmp), weights = (def.options || {}).weights || null;
    var years = ctx.breakdown === 'year' && has(meta.dims, 'year') ? [1, 2, 3] : [];
    var rows = industries(ids).map(function (ind, order) {
      var at = function (c, y) { return TAP.measures.combined(m, c.e, { industryId: ind.id, year: y || null, weights: weights }); };
      var size = ids.reduce(function (s, r) { var c = TAP.measures.get(m)(r, { industryId: ind.id }); return s + (c.state === 'value' ? c.v : 0); }, 0);
      return { ind: ind, id: ind.id, order: order, size: size, total: cols.map(function (c) { return at(c); }),
        years: years.map(function (y) { return cols.map(function (c) { return at(c, y); }); }),
        tiers: cols.map(function (c) { return c.region ? TAP.measures.get('ind.tier')(c.region, { industryId: ind.id }) : NO_TIER; }) };
    });
    // The industries carrying the most new business come first
    rows.sort(function (a, b) { return b.size - a.size || a.order - b.order; });
    var max = 0;
    rows.forEach(function (r) {
      (years.length ? [].concat.apply([], r.years) : r.total).forEach(function (c) { if (c.state === 'value' && c.v > max) max = c.v; });
    });
    return { def: def, m: m, meta: meta, cols: cols, ids: ids, years: years, rows: rows, max: max, hl: marker(ctx.highlight),
      selected: ctx.industryId || TAP.store.get().industry };
  }

  function marker(hl) {
    var regs = (hl && hl.regionIds) || [], inds = (hl && hl.industryIds) || [];
    var mark = hl && hl.mark || (regs.length && inds.length ? 'cell' : inds.length ? 'industryRow' : null);
    return {
      row: function (i) { return mark === 'industryRow' && has(inds, i); },
      cell: function (c, i) { return mark !== 'industryRow' && has(inds, i) && (has(regs, c.id) || (!!c.region && has(regs, c.region))); }
    };
  }

  /* ---------- grid (HTML) ---------- */

  function cellHtml(m, r, ci, cell, year) {
    var c = m.cols[ci], ok = cell.state === 'value', tier = r.tiers[ci], np = cell.state === 'notProvided';
    var showTier = ok && tier.state === 'value', value = ok ? TAP.format.cell(cell, { unit: m.meta.unit }) : '';
    var s = ok && m.max > 0 ? Math.max(cell.v, 0) / m.max : 0, th = k().th();
    var words = ok ? value : np ? TAP.content.text('states.notProvided') : t('notApplicable');
    var aria = t('cellAria', { region: c.label, industry: r.ind.name, value: words }) + (year ? ', ' + yearLabel(year) : '') +
      (showTier ? ', ' + TAP.format.tier(tier.v) : '');
    var cls = 'tap-nbg__cell' + (np ? ' tap-nbg__cell--np' : ok ? '' : ' tap-nbg__cell--na') + (m.hl.cell(c, r.id) ? ' is-hl' : '') +
      (c.role === 'focus' && (ok || np) ? ' is-focus' : '');
    var style = ok ? ' style="background:' + esc(th.mix(c.color, 0.92 - 0.47 * s)) + ';--tap-nbg-shade:' + s.toFixed(3) + '"' : '';
    return '<button type="button" role="cell" class="' + cls + '" data-tap-region="' + esc(c.id) + '" data-tap-industry="' + esc(r.id) +
      '"' + (year ? ' data-tap-year="' + year + '"' : '') + ' data-tap-value="' + (ok ? esc(cell.v) : '') + '" aria-label="' + esc(aria) + '"' + style + '>' +
      (ok ? '<span class="tap-nbg__value">' + esc(value) + '</span>' : np ? '<span class="tap-nbg__np">' + esc(words) + '</span>' : '') +
      (showTier ? '<span class="tap-nbg__tier tap-nbg__tier--t' + esc(tier.v) + '">' + esc(t('tierShort', { tier: tier.v })) + '</span>' : '') + '</button>';
  }

  function nameHtml(m, r) {
    var sel = r.id === m.selected;
    return '<button type="button" role="rowheader" class="tap-nbg__name" data-tap-industry="' + esc(r.id) + '" aria-pressed="' + sel + '">' +
      '<span class="tap-nbg__pick" aria-hidden="true">' + (sel ? '▸' : '') + '</span><span class="tap-nbg__label">' + esc(r.ind.name) + '</span></button>';
  }

  function rowHtml(m, r) {
    var cls = 'tap-nbg__row' + (r.id === m.selected ? ' is-selected' : '') + (m.hl.row(r.id) ? ' is-hl' : '');
    if (!m.years.length) {
      return '<div class="' + cls + '" role="row">' + nameHtml(m, r) + r.total.map(function (cell, ci) { return cellHtml(m, r, ci, cell); }).join('') + '</div>';
    }
    // By year: the industry heads a group, then one line per plan year
    return '<div class="' + cls + ' tap-nbg__row--group" role="row">' + nameHtml(m, r) + '</div>' + m.years.map(function (y, yi) {
      return '<div class="tap-nbg__row tap-nbg__row--year' + (m.hl.row(r.id) ? ' is-hl' : '') + '" role="row"><span class="tap-nbg__year" role="rowheader">' +
        esc(yearLabel(y)) + '</span>' + r.years[yi].map(function (cell, ci) { return cellHtml(m, r, ci, cell, y); }).join('') + '</div>';
    }).join('');
  }

  function html(m) {
    var head = '<div class="tap-nbg__row tap-nbg__row--head" role="row"><span class="tap-nbg__corner" role="columnheader">' + esc(t('corner')) + '</span>' +
      m.cols.map(function (c) {
        return '<span class="tap-nbg__col is-' + esc(c.role) + '" role="columnheader"><span class="tap-nbg__bar" style="background:' + esc(c.color) +
          '"></span><span class="tap-nbg__colname">' + esc(c.label) + '</span></span>';
      }).join('') + '</div>';
    return '<div class="tap-nbg" role="table" aria-label="' + esc(m.def.title) + '" style="--tap-nbg-cols:' + m.cols.length + '">' + head +
      m.rows.map(function (r) { return rowHtml(m, r); }).join('') + '</div>';
  }

  /* ---------- table, legend, missing, target ---------- */

  // One row per column and industry: the region (or combined figure), the industry, its tier, the value and any years.
  function table(m) {
    var C = function (key, label, unit, align) { return { key: key, label: label, unit: unit, align: align }; };
    var cols = [C('entity', TAP.content.text('chart.entityColumn'), 'text', 'left'), C('industry', TAP.content.text('chart.industryColumn'), 'text', 'left'),
      C('tier', t('tierColumn'), 'tier', 'left'), C(m.m, m.meta.label, m.meta.unit, 'right')]
      .concat(m.years.map(function (y) { return C(m.m + '@y' + y, yearLabel(y), m.meta.unit, 'right'); }));
    var rows = [];
    m.rows.forEach(function (r) {
      m.cols.forEach(function (c, ci) {
        var cells = { entity: text(c.label), industry: text(r.ind.name), tier: r.tiers[ci] };
        cells[m.m] = r.total[ci];
        m.years.forEach(function (y, yi) { cells[m.m + '@y' + y] = r.years[yi][ci]; });
        rows.push({ entityId: c.id, industryId: r.id, cells: cells, src: r.total[ci].src || null });
      });
    });
    return { columns: cols, rows: rows };
  }

  function legend() {
    var th = k().th();
    return [{ label: t('legendShade'), color: null, role: 'note' }].concat([1, 2].map(function (x) {
      return { label: t('legendTier', { short: t('tierShort', { tier: x }), tier: th.tiers[x].label }), color: th.tiers[x].bg, role: 'tier' };
    })).concat([{ label: t('legendNp'), color: null, role: 'notProvided' }]);
  }

  // A region is missing when it has no value for any listed industry and at least one is blank. Empty: no value at all.
  function missing(m) {
    var any = false, ids = m.ids.filter(function (id) {
      var states = m.rows.map(function (r) { return TAP.measures.get(m.m)(id, { industryId: r.id }).state; });
      if (has(states, 'value')) { any = true; return false; }
      return has(states, 'notProvided');
    });
    return { names: ids.map(function (id) { return TAP.content.regionName(TAP.data.region(id)); }), empty: !any };
  }

  function targetFn(def, cols) {
    return function (params) {
      var d = params && params.data;
      if (!d) return null;
      var i = d.industryId || null, c = cols.filter(function (x) { return x.id === (d.regionId || d.entityId); })[0];
      var regs = c ? c.e.regionIds.slice() : d.regionId && TAP.data.region(d.regionId) ? [d.regionId] : [];
      if (!regs.length && !i) return null;
      // label names the drill level in the panel's breadcrumb (17.6): the industry, and the region when there is one
      var ind = i ? TAP.data.industry(i) : null, label = ind ? (c && c.region ? t('drillLabel', { industry: ind.name, region: c.label }) : ind.name) : null;
      return { reportId: def.id, regionIds: regs, industryIds: i ? [i] : [], accountIds: [], mark: regs.length && i ? 'cell' : 'industryRow', label: label };
    };
  }

  /* ---------- stacked bar by tier ---------- */

  // The parts builder draws it from a derived definition: the region's total, split into its Tier 1 and Tier 2 industries.
  function byTier(ctx) {
    var def = ctx.def, m = TAP.prepare.selected(def, ctx), total = totalOf(m), own = def.measures.filter(function (x) { return x.id === m; })[0];
    var parts = [total + '.tier1', total + '.tier2'];
    if (!parts.concat([total]).every(function (id) { return TAP.measures.meta(id); })) {
      return k().result(def, null, { error: t('noTierParts') });
    }
    var pdef = Object.assign({}, def, { shape: 'parts', builder: null, dimension: 'entity', parts: {},
      measures: [{ id: total, label: own ? own.label : TAP.measures.meta(total).label }].concat(parts.map(function (id, i) {
        return { id: id, label: t('tierPart', { tier: i + 1 }) };
      })) });
    pdef.parts[total] = parts;
    return TAP.builders.get('parts')(Object.assign({}, ctx, { def: pdef, type: 'stackedBar', measureId: total }));
  }

  function build(ctx) {
    var type = ctx.type || ctx.def.defaultType;
    if (type === 'stackedBar') return byTier(ctx);
    var m = model(ctx), gap = missing(m);
    var res = k().result(ctx.def, null, { missing: gap.names, empty: gap.empty || !m.rows.length, target: targetFn(ctx.def, m.cols),
      table: table(m), legend: legend() });
    if (m.cols.some(function (c) { return !c.region; })) res.notes = [t('combinedNoTier')];
    if (type !== 'table') res.html = html(m);
    return res;
  }

  TAP.builders.register('nbGrid', TAP.shapes.kit.safely(build));
})(window.TAP);
