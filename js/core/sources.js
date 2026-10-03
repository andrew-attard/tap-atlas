/*
 * File: js/core/sources.js
 * Purpose: Turns a figure's source reference into file › sheet › cell, and summarises each region's import.
 * Provides: TAP.sources (address, imports, datesDiffer, dataDate)
 * Depends on: js/core/namespace.js, js/core/data.js, js/core/content.js (regionName, content/text-data.js wording)
 * Used by: tooltips, tables, details, the data sources panel, insights
 *
 * A source reference (src) is described in docs/ARCHITECTURE.md section 7 and docs/DATA-CONTRACT.md.
 * The cell comes from meta.sourceMap: a fixed cell (src.cell or the section's cells map), or the field's
 * column (one per plan year for fields held by year) plus the item's row. A sum over several rows
 * (src.rows) or over all three years (year null on a by-year field) gives a range such as "G10:G14".
 */
(function (TAP) {
  'use strict';

  function say(key, vars) { return TAP.content.text('sources.' + key, vars); }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function num(v) { return typeof v === 'number' && isFinite(v); }

  function regionNames(ids) {
    return (ids || []).map(function (id) {
      var r = TAP.data.region(id);
      return r ? TAP.content.regionName(r) : String(id);
    });
  }

  function regionCount(n) { return n === 1 ? say('regionOne') : say('regionMany', { n: n }); }

  // The rows a figure was read from: src.row, or src.rows for a sum over several rows.
  function rowsOf(src) {
    if (src.row != null) return [src.row];
    return (src.rows || []).filter(num).slice().sort(function (a, b) { return a - b; });
  }

  function cellFor(src, map) {
    if (src.cell) return src.cell;
    if (!map) return null;
    if (has(map.cells, src.field)) return map.cells[src.field];
    var col = has(map.columns, src.field) ? map.columns[src.field] : null;
    var first = col, last = col;
    if (Array.isArray(col)) {
      if (src.year == null) { first = col[0]; last = col[col.length - 1]; } else first = last = col[src.year - 1];
    }
    var rows = rowsOf(src);
    if (!first || !rows.length) return null;
    var lo = rows[0], hi = rows[rows.length - 1];
    if (first === last && lo === hi) return first + lo;
    var range = first + lo + ':' + last + hi;
    return rows.length > 1 && hi - lo + 1 !== rows.length ? say('someRows', { range: range, n: rows.length }) : range;
  }

  function combinedAddress(src) {
    var excluded = src.excluded || [], notApplicable = src.notApplicable || [];
    var used = (src.regionIds || []).filter(function (id) { return excluded.indexOf(id) === -1 && notApplicable.indexOf(id) === -1; });
    return { file: null, sheet: null, cell: null, calculated: false, combined: true,
      text: say('combined.' + (src.how || 'mean'), { regions: regionCount(used.length) }),
      regions: regionNames(used), excluded: regionNames(excluded), notApplicable: regionNames(notApplicable) };
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

  // Readable import dates only: [{iso, time}]
  function importDates() {
    return imports().map(function (r) { return { iso: r.importedAt, time: r.importedAt ? new Date(r.importedAt).getTime() : NaN }; })
      .filter(function (d) { return !isNaN(d.time); });
  }

  // True when regions were imported on different UTC days (as TAP.format.date shows them).
  function datesDiffer() {
    var days = {};
    importDates().forEach(function (d) { days[new Date(d.time).toISOString().slice(0, 10)] = true; });
    return Object.keys(days).length > 1;
  }

  // The latest import, as stored, for "Data: 2 Oct 2026". Null if no region has a readable one.
  function dataDate() {
    var latest = importDates().reduce(function (best, d) { return !best || d.time > best.time ? d : best; }, null);
    return latest ? latest.iso : null;
  }

  TAP.sources = { address: address, imports: imports, datesDiffer: datesDiffer, dataDate: dataDate };
})(window.TAP);
