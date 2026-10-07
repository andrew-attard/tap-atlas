/*
 * File: js/reports/ratings-grid.js
 * Purpose: Draws the six ratings for one industry as a grid (US-1.5.6, D101): one row per region or combined figure
 *          in the comparison, the three ratings behind attractiveness and then their average, the three behind
 *          ability to win and then theirs. The averages are the scores the attractiveness chart plots (the same
 *          measures, so the two can never disagree). Bars and the table come through the same builder.
 * Provides: chart builder 'ratingsGrid' (registered with TAP.builders)
 * Depends on: js/engine/registry.js, scope.js, measures.js, scores.js (the ind.* measures), shapes.js (drawing kit),
 *             build-compare.js (bars), js/core/dom.js, format.js, content.js, data.js, config/settings.js (score weights)
 * Used by: config/reports-industry.js (ind-ratings)
 */
(function (TAP) {
  'use strict';

  var GROUPS = ['attractiveness', 'ability'];
  function k() { return TAP.shapes.kit; }
  function t(key, vars) { return TAP.content.text('ratingsGrid.' + key, vars); }
  function esc(s) { return TAP.dom.esc(s); }
  function weights(which) { return ((window.TAP_SETTINGS && window.TAP_SETTINGS.scores) || {})[which] || {}; }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* ---------- columns and cells ---------- */

  // Each group: the definition's ratings that carry weight in that score, in the definition's order, then the score.
  function columns(def) {
    var out = [];
    GROUPS.forEach(function (g) {
      var w = weights(g);
      (def.measures || []).forEach(function (m) {
        var f = m.id.replace(/^ind\./, '');
        if (w[f] > 0) out.push({ key: m.id, label: m.label, head: m.label, short: t('short.' + f), unit: 'rating', field: f, group: g });
      });
      out.push({ key: 'ind.' + g, label: t('averageOf', { group: t('groups.' + g) }), head: t('average'), short: t('short.average'),
        unit: 'score', group: g, avg: true });
    });
    // The first column of the second group starts with a gap, so the two groups read apart
    out.forEach(function (c, i) { c.start = i > 0 && out[i - 1].group !== c.group; });
    return out;
  }

  // One row per comparison entity; every cell from the measure registry, combined by the rating rule where needed.
  function model(ctx) {
    var cols = columns(ctx.def), ents = ctx.entities || TAP.scope.entities(ctx.cmp), c = { industryId: ctx.industryId };
    var rows = ents.map(function (e) {
      var cells = {};
      cols.forEach(function (col) { cells[col.key] = ctx.industryId ? TAP.measures.combined(col.key, e, c) : { v: null, state: 'notApplicable' }; });
      return { entity: e, entityId: e.id, label: e.label, cells: cells };
    });
    return { cols: cols, rows: rows };
  }

  // The highlight (D102): the named regions' rows, in the columns of the measures the target names (all when none),
  // and only while the chart shows the target's industry.
  function marker(hl, industryId) {
    var inds = (hl && hl.industryIds) || [], ms = (hl && hl.measureIds) || [];
    if (!hl || (inds.length && inds.indexOf(industryId) < 0)) return function () { return false; };
    return function (row, col) { return k().highlighted(row.entity, hl) && (!ms.length || ms.indexOf(col.key) >= 0); };
  }

  /* ---------- the grid (HTML) ---------- */

  function shade(v) { return Math.min(3, Math.max(1, Math.round(v))); }
  function shown(cell, col, combined) {
    // Always one decimal, "3.0" included (format.num drops trailing zeros); scores run from 1 to 3, so no grouping
    if (col.avg || combined || !Number.isInteger(cell.v)) return (Math.round(cell.v * 10) / 10).toFixed(1);
    return String(cell.v);
  }

  function cellHtml(m, row, col, ind, hit) {
    var cell = row.cells[col.key], ok = cell.state === 'value' && isNum(cell.v), combined = row.entity.kind === 'combined';
    var words = TAP.format.cell(cell, { unit: col.unit, field: col.field, exact: true });
    var cls = 'tap-rg__cell' + (col.avg ? ' tap-rg__cell--avg' : '') + (ok && !col.avg ? ' tap-rg__cell--r' + shade(cell.v) : '') +
      (ok ? '' : ' tap-rg__cell--np') + (col.start ? ' is-start' : '') + (hit(row, col) ? ' is-hl' : '');
    var aria = t('cellAria', { name: row.label, measure: col.label, value: words });
    return '<button type="button" role="cell" class="' + cls + '" data-tap-region="' + esc(row.entityId) + '" data-tap-industry="' + esc(ind) +
      '" data-key="' + esc(col.key) + '" aria-label="' + esc(aria) + '">' + (ok ? esc(shown(cell, col, combined)) :
        '<span class="tap-rg__npword">' + esc(t('notProvided')) + '</span><span class="tap-rg__npdash" aria-hidden="true">–</span>') + '</button>';
  }

  function head(m) {
    var groups = GROUPS.map(function (g) {
      var n = m.cols.filter(function (c) { return c.group === g; }).length;
      return '<span class="tap-rg__group' + (g !== GROUPS[0] ? ' is-start' : '') + '" role="columnheader" style="grid-column: span ' + n + '">' + esc(t('groups.' + g)) + '</span>';
    }).join('');
    var cols = m.cols.map(function (c) {
      return '<span class="tap-rg__col' + (c.avg ? ' tap-rg__col--avg' : '') + (c.start ? ' is-start' : '') + '" role="columnheader" data-col="' + esc(c.key) + '">' +
        '<span class="tap-rg__full">' + esc(c.head) + '</span><span class="tap-rg__short" aria-hidden="true">' + esc(c.short) + '</span></span>';
    }).join('');
    return '<div class="tap-rg__row tap-rg__row--groups" role="row"><span class="tap-rg__corner" aria-hidden="true"></span>' + groups + '</div>' +
      '<div class="tap-rg__row tap-rg__row--head" role="row"><span class="tap-rg__corner" role="columnheader">' + esc(t('corner')) + '</span>' + cols + '</div>';
  }

  function rowHtml(m, row, ind, hit, i) {
    var e = row.entity, first = e.kind === 'combined' && i > 0 && m.rows[i - 1].entity.kind !== 'combined';
    var cls = 'tap-rg__row is-' + (e.kind === 'combined' ? 'combined' : e.role) + (first ? ' is-first-combined' : '');
    return '<div class="' + cls + '" role="row" data-entity="' + esc(row.entityId) + '"><span class="tap-rg__name" role="rowheader">' +
      '<span class="tap-rg__bar" style="background:' + esc(e.color) + '" aria-hidden="true"></span><span>' + esc(row.label) + '</span></span>' +
      m.cols.map(function (c) { return cellHtml(m, row, c, ind, hit); }).join('') + '</div>';
  }

  function key() {
    return '<p class="tap-rg__key"><span>' + esc(t('keyScale')) + '</span> <span>' + esc(t('keyCompetitive')) + '</span> <span>' +
      esc(t('keyAverage')) + '</span> <span>' + esc(t('keyNp')) + '</span> <span class="tap-rg__key-short">' + esc(t('keyShort')) + '</span></p>';
  }

  function grid(ctx, m) {
    var hit = marker(ctx.highlight, ctx.industryId);
    var ind = ctx.industryId && TAP.data.industry(ctx.industryId), title = String(ctx.def.title || '').replace(/\{industry\}/g, ind ? ind.name : '');
    return '<div class="tap-rg-box"><div class="tap-rg" role="table" aria-label="' + esc(title) +
      '" style="--tap-rg-cols:' + m.cols.length + '">' + head(m) + m.rows.map(function (r, i) { return rowHtml(m, r, ctx.industryId, hit, i); }).join('') +
      '</div>' + key() + '</div>';
  }

  /* ---------- table, notes, missing, target ---------- */

  function table(m) {
    var cols = [{ key: 'entity', label: k().t('chart.entityColumn'), unit: 'text', align: 'left' }].concat(m.cols.map(function (c) {
      return { key: c.key, label: c.label, unit: c.unit, align: 'right', field: c.field || null };
    }));
    return { columns: cols, rows: m.rows.map(function (r) {
      var cells = Object.assign({ entity: { v: r.label, state: 'value', kind: null } }, r.cells);
      return { entityId: r.entityId, industryId: null, cells: cells, src: (r.cells[m.cols[0].key] || {}).src || null };
    }) };
  }

  // Regions in scope with no rating at all for the industry; empty when no region has one.
  function missing(ctx, m) {
    var ids = TAP.scope.regionIds(ctx.cmp), any = false, gone = [], c = { industryId: ctx.industryId };
    var keys = m.cols.filter(function (col) { return !col.avg; }).map(function (col) { return col.key; });
    ids.forEach(function (id) {
      var states = keys.map(function (key) { return ctx.industryId ? TAP.measures.get(key)(id, c).state : 'notApplicable'; });
      if (states.indexOf('value') >= 0) any = true; else if (states.indexOf('notProvided') >= 0) gone.push(id);
    });
    return { names: gone.map(function (id) { return TAP.content.regionName(TAP.data.region(id)); }), empty: !any };
  }

  function targetFn(ctx, m) {
    return function (params) {
      var d = params && params.data, row = d && m.rows.filter(function (r) { return r.entityId === (d.regionId || d.entityId); })[0];
      if (!row) return null;
      var e = row.entity;
      return { reportId: ctx.def.id, regionIds: e.regionIds.slice(), industryIds: ctx.industryId ? [ctx.industryId] : [], accountIds: [],
        mark: 'ratingCell' };
    };
  }

  function build(ctx) {
    var type = ctx.type || ctx.def.defaultType;
    if (type === 'bar') return TAP.builders.get('compare')(ctx);   // bars stay with the generic builder
    var K = k(), m = model(ctx), gap = missing(ctx, m);
    var notes = K.notes({ rows: m.rows, columns: m.cols }, m.cols.map(function (c) { return c.key; }));
    var res = K.result(ctx.def, null, { table: table(m), notes: notes, missing: gap.names, empty: gap.empty, target: targetFn(ctx, m) });
    if (type !== 'table' && !gap.empty) res.html = grid(ctx, m);
    return res;
  }

  TAP.builders.register('ratingsGrid', TAP.shapes.kit.safely(build));
})(window.TAP);
