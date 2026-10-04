/*
 * File: js/reports/details-rows.js
 * Purpose: Details for row targets: a new business row, an account or a partner, every field with its source
 *          (US-2.7.2), its figures by plan year and its source row. An item with no row stands for a region's
 *          customer growth section and lists its segment thresholds, since they differ by region (US-2.2.2).
 * Provides: TAP.detailsRows (build)
 * Depends on: js/engine/rows.js, js/core/data.js, js/core/content.js, js/core/sources.js (all at call time)
 * Used by: js/reports/details.js
 * Owner: CGP stream (#208)
 */
(function (TAP) {
  'use strict';

  function t(key, vars) { return TAP.content.text('detailsRows.' + key, vars); }
  function rname(id) { var r = TAP.data.region(id); return r ? TAP.content.regionName(r) : String(id); }
  function isBlank(v) { return v == null || v === ''; }

  // The TAP.rows source for each Data Contract section.
  var SOURCE = { newBusiness: 'newBusiness', customerGrowth: 'accounts', partners: 'partners' };

  // Fields held by plan year, shown one row per year: [field, label key, kind, unit].
  var YEARLY = {
    newBusiness: [['arrPotential', 'arr', 'DER', 'money'], ['servicesPotential', 'services', 'DER', 'money']],
    accounts: [['growthPct', 'growthPct', 'IN', 'pct'], ['incrementalArr', 'incrementalArr', 'DER', 'money'],
      ['servicesOrderIntake', 'servicesOi', 'DER', 'money']],
    partners: [['arr', 'arr', 'IN', 'money'], ['services', 'services', 'IN', 'money']]
  };

  var THRESHOLDS = [['strategicArr', 'money'], ['scaledArr', 'money'], ['growthArr', 'money'], ['growthOrderIntake', 'money']];

  function cellOf(v, kind, src) {
    return { v: isBlank(v) ? null : v, state: isBlank(v) ? 'notProvided' : 'value', kind: kind, src: src };
  }
  function yearLabel(n) {
    var ys = (TAP.data.meta() || {}).years;
    return ys && ys[n - 1] ? String(ys[n - 1]) : t('year', { n: n });
  }

  /* ---------- one row: an account, a partner or a new business row ---------- */

  function find(source, regionId, row) {
    return TAP.rows.list(source, [regionId]).filter(function (r) { return r.sourceRow === row; })[0] || null;
  }

  function titleOf(source, r) {
    var it = r.item || {};
    if (source === 'newBusiness') return t('nbTitle', { name: [it.subVertical, it.market].filter(Boolean).join(', '), region: rname(r.regionId) });
    return t('title', { name: isBlank(it.name) ? t('noName') : it.name, region: rname(r.regionId) });
  }

  // Every column a list can show, each a full cell with its source (the region is the group's own title).
  function fieldRows(source, r) {
    return TAP.rows.columns(source).filter(function (c) { return c.key !== 'region'; }).map(function (c) {
      return { label: c.label, cell: TAP.rows.cell(source, c.key, r), unit: c.unit };
    });
  }

  function yearRows(source, r, section) {
    var out = [];
    (YEARLY[source] || []).forEach(function (f) {
      var list = (r.item || {})[f[0]];
      if (!Array.isArray(list)) return;   // e.g. an account planned with a multiplier has no growth % by year
      [1, 2, 3].forEach(function (n) {
        out.push({ label: t('perYear', { label: t('yearly.' + f[1]), year: yearLabel(n) }), unit: f[3],
          cell: cellOf(list[n - 1], f[2], { regionId: r.regionId, section: section, field: f[0], row: r.sourceRow, rows: [r.sourceRow], year: n, cell: null, kind: f[2] }) });
      });
    });
    return out;
  }

  function sourceRow(r, section) {
    var where = TAP.sources.address({ regionId: r.regionId, section: section, field: null, row: r.sourceRow, kind: null });
    return { label: t('sourceRow'), text: t('rowText', { where: where ? where.text : rname(r.regionId), row: r.sourceRow }), cell: {} };
  }

  function rowGroups(item, many) {
    var source = SOURCE[item.section], r = source ? find(source, item.regionId, item.row) : null;
    if (!r) return [{ title: t('missing', { region: rname(item.regionId), row: item.row }), rows: [] }];
    var title = titleOf(source, r);
    return [
      { title: many ? title : t('fields'), rows: fieldRows(source, r).concat([sourceRow(r, item.section)]) },
      { title: many ? t('byYearOf', { name: title }) : t('byYear'), rows: yearRows(source, r, item.section) }
    ].filter(function (g) { return g.rows.length; });
  }

  /* ---------- a region's customer growth section: its segment thresholds ---------- */

  function thresholdGroup(regionId) {
    var reg = TAP.data.region(regionId) || {}, th = (reg.customerGrowth || {}).thresholds || {};
    return { title: t('thresholdsTitle', { region: rname(regionId) }), rows: THRESHOLDS.map(function (f) {
      var field = 'thresholds.' + f[0];
      return { label: t('thresholds.' + f[0]), unit: f[1],
        cell: cellOf(th[f[0]], 'IN', { regionId: regionId, section: 'customerGrowth', field: field, row: null, rows: [], year: null, cell: null, kind: 'IN' }) };
    }) };
  }

  /* ---------- entry ---------- */

  // {title, groups} for a target with items (ARCHITECTURE 17.4).
  function build(target) {
    var items = (target && target.items) || [], groups = [];
    var rowItems = items.filter(function (i) { return i.row != null; }), many = rowItems.length > 1;
    items.forEach(function (i) {
      groups = groups.concat(i.row == null ? [thresholdGroup(i.regionId)] : rowGroups(i, many));
    });
    var regions = items.map(function (i) { return i.regionId; }).filter(function (r, k, a) { return a.indexOf(r) === k; });
    var title = '';
    if (rowItems.length === 1 && items.length === 1) {
      var src = SOURCE[items[0].section], r = src ? find(src, items[0].regionId, items[0].row) : null;
      title = r ? titleOf(src, r) : rname(items[0].regionId);
    } else if (rowItems.length) title = t('several', { n: rowItems.length, regions: TAP.format.list(regions.map(rname)) });
    else if (items.length) title = t('thresholdsHead', { regions: TAP.format.list(regions.map(rname)) });
    return { title: title, groups: groups };
  }

  TAP.detailsRows = { build: build };
})(window.TAP);
