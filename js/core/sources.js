/*
 * File: js/core/sources.js
 * Purpose: Turns a figure's source reference into file › sheet › cell, and summarises each region's import.
 * Provides: TAP.sources (address, imports, datesDiffer, dataDate)
 * Depends on: js/core/namespace.js, js/core/data.js, js/core/content.js (regionName, content/text-data.js wording)
 * Used by: tooltips, tables, details, the data sources panel, insights
 *
 * A source reference (src) is described in docs/ARCHITECTURE.md section 7 and docs/DATA-CONTRACT.md.
 * The cell comes from meta.sourceMap: a fixed cell (src.cell or the section's cells map), or the field's
 * column (one per plan year for fields held by year) plus the item's row.
 */
(function (TAP) {
  'use strict';

  function say(key, vars) { return TAP.content.text('sources.' + key, vars); }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }

  function regionNames(ids) {
    return (ids || []).map(function (id) {
      var r = TAP.data.region(id);
      return r ? TAP.content.regionName(r) : String(id);
    });
  }

  function cellFor(src, map) {
    if (src.cell) return src.cell;
    if (!map) return null;
    if (has(map.cells, src.field)) return map.cells[src.field];
    var col = has(map.columns, src.field) ? map.columns[src.field] : null;
    if (Array.isArray(col)) col = src.year >= 1 && src.year <= col.length ? col[src.year - 1] : null;
    return col && src.row != null ? col + src.row : null;
  }

  function combinedAddress(src) {
    var excluded = src.excluded || [];
    var used = (src.regionIds || []).filter(function (id) { return excluded.indexOf(id) === -1; });
    return { file: null, sheet: null, cell: null, calculated: false, combined: true,
      text: say('combined.' + (src.how || 'mean'), { n: used.length }),
      regions: regionNames(used), excluded: regionNames(excluded) };
  }

  // {file, sheet, cell, text, calculated, combined, regions}, or null without a source.
  function address(src) {
    if (!src) return null;
    if (src.combined) return combinedAddress(src);
    var region = TAP.data.region(src.regionId);
    var file = region && region.source && region.source.fileName ? region.source.fileName : say('unknownFile');
    var maps = (TAP.data.meta() || {}).sourceMap || {};
    var map = has(maps, src.section) ? maps[src.section] : null;
    var sheet = map && map.sheet ? map.sheet : null;
    var cell = cellFor(src, map);
    return { file: file, sheet: sheet, cell: cell, calculated: src.kind === 'DER', combined: false,
      text: [file, sheet, cell].filter(Boolean).join(say('sep')),
      regions: region ? [TAP.content.regionName(region)] : [] };
  }

  // Per region, in file order: where its data came from and any import notes.
  function imports() {
    return TAP.data.regions().map(function (r) {
      var s = r.source || {};
      return { regionId: r.id, name: TAP.content.regionName(r), fileName: s.fileName || null,
        fileModified: s.fileModified || null, importedAt: s.importedAt || null, notes: (s.notes || []).slice() };
    });
  }

  function importDates() {
    return imports().map(function (r) { return r.importedAt; }).filter(Boolean);
  }

  // True when regions were imported on different days (times on the same day don't count).
  function datesDiffer() {
    var days = {};
    importDates().forEach(function (d) { days[String(d).slice(0, 10)] = true; });
    return Object.keys(days).length > 1;
  }

  // The latest import, as stored (ISO date-time), for "Data: 2 Oct 2026". Null if no region has one.
  function dataDate() {
    return importDates().reduce(function (best, d) {
      return best === null || Date.parse(d) > Date.parse(best) ? d : best;
    }, null);
  }

  TAP.sources = { address: address, imports: imports, datesDiffer: datesDiffer, dataDate: dataDate };
})(window.TAP);
