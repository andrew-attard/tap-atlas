/*
 * File: js/core/sources.js
 * Purpose: Turns a figure's source reference into file › sheet › cell, and summarises each region's import.
 * Provides: TAP.sources (address, imports, datesDiffer, dataDate, isoDate)
 * Depends on: js/core/namespace.js, js/core/data.js, js/core/content.js (regionName, content/text-data.js wording),
 *             js/core/extra.js (extra sections, at call time)
 * Used by: tooltips and tables (js/panel/), side panels and details (js/ui/layers.js), the data sources panel, the
 *          comparison bar (data date), region cards, the Industry and Insights views
 *
 * A source reference (src) is described in docs/ARCHITECTURE.md section 7 and docs/DATA-CONTRACT.md.
 * The cell comes from meta.sourceMap: a fixed cell (src.cell or the section's cells map), or the field's
 * column (one per plan year for fields held by year) plus the item's row. A sum over several rows
 * (src.rows) or over all three years (year null on a by-year field) gives a range such as "G10:G14".
 * The Phase 4 lists (revenue, books value, strategic plan, routes) hold a fixed cell per item: a sum over
 * several of them (src.cells) names the block they fill, or the first and last cell and how many.
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

  // Lists of items with a fixed cell each (ARCHITECTURE 19.1). The recap keeps its Phase 2 address: file and sheet.
  var CELL_LISTS = { revenue: true, booksValue: true, strategicPlan: true, routes: true };
  function colNum(letters) { return letters.split('').reduce(function (n, ch) { return n * 26 + ch.charCodeAt(0) - 64; }, 0); }

  // Several fixed cells as one address: "E90:G91" when they fill a block, else "E90 to G93 (8 cells)".
  function cellsText(cells) {
    var at = cells.filter(function (c, i) { return cells.indexOf(c) === i; }).map(function (c) {
      var m = /^([A-Z]+)(\d+)$/.exec(c);
      return m ? { c: colNum(m[1]), r: +m[2], text: c } : null;
    });
    if (at.some(function (x) { return !x; })) return null;
    at.sort(function (x, y) { return x.r - y.r || x.c - y.c; });
    var cols = at.map(function (x) { return x.c; }), first = at[0], last = at[at.length - 1];
    var block = (Math.max.apply(null, cols) - Math.min.apply(null, cols) + 1) * (last.r - first.r + 1) === at.length;
    return block ? first.text + ':' + last.text : say('someCells', { first: first.text, last: last.text, n: at.length });
  }

  function cellFor(src, map) {
    if (src.cell) return src.cell;
    if (CELL_LISTS[src.section] && src.cells && src.cells.length > 1) return cellsText(src.cells);
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
    // An extra section (US-3.2.1): its title is the sheet; without a column letter the cell is its row
    if (!map && TAP.extra && TAP.extra.is(src.section)) map = TAP.extra.sourceMap(src.section);
    var sheet = map && map.sheet ? map.sheet : null;
    var cell = cellFor(src, map);
    if (!cell && map && map.extra && src.row != null) cell = TAP.content.text('extra.sourceRow', { row: src.row });
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

  // An ISO date, with or without a time and zone ("2026-10-02", "2026-10-02T09:00:00Z"). Other text is never guessed
  // at: "02/10/2026" could be day first or month first (review DE-10).
  var ISO = /^\d{4}-(\d{2})-(\d{2})(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;
  function isoDate(text) {
    var m = typeof text === 'string' ? ISO.exec(text) : null;
    return !!m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31 && !isNaN(new Date(text).getTime());
  }

  // Readable import dates only: [{iso, time}]
  function importDates() {
    return imports().map(function (r) { return { iso: r.importedAt, time: isoDate(r.importedAt) ? new Date(r.importedAt).getTime() : NaN }; })
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

  TAP.sources = { address: address, imports: imports, datesDiffer: datesDiffer, dataDate: dataDate, isoDate: isoDate };
})(window.TAP);
