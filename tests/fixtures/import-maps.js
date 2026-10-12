/*
 * File: tests/fixtures/import-maps.js
 * Purpose: Mappings for the mini fixtures (mini, miniP4), matching their layouts exactly, for the import tests (docs/ARCHITECTURE.md
 *          section 20.1). Built from the fixtures themselves (regions, lookups, meta, columns) so the two stay in step; only the
 *          layout facts the fixtures do not carry (first rows, grid axes, blanks) are spelled out here.
 * Provides: window.TEST_IMPORT_MAPS (mini, miniP4)
 * Depends on: tests/fixtures/mini-data.js, tests/fixtures/mini-p4.js
 * Used by: tests/test-import-*.js
 * Owner: FIXTURES stream
 */
window.TEST_IMPORT_MAPS = window.TEST_IMPORT_MAPS || {};
(function () {
  'use strict';
  var YEARS = [2027, 2028, 2029], CHANNELS = ['direct', 'partner', 'allianceA', 'allianceB'];
  var MOTIONS = ['newBusiness', 'customerGrowth'], TYPES = ['arr', 'services', 'swPerpetual', 'hardware'];

  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function axis(field, values, stride) { return stride ? { field: field, values: values, stride: stride } : { field: field, values: values }; }
  // The recap-shaped grids: row = first + motion x motionStride + type x typeStride + year (the strides default to the
  // product of the inner axes' sizes), columns E to H by channel.
  function grid(sheet, first, types, blank, filterCell, strides) {
    var st = strides || {}, g = { sheet: sheet, blank: blank, cols: { first: 'E', axes: [axis('channel', CHANNELS)] },
      rows: { first: first, axes: [axis('motion', MOTIONS, st.motion), axis('type', types, st.type), axis('year', YEARS)] } };
    if (filterCell) g.filterCell = filterCell;
    return g;
  }
  function section(src, firstRow, key, extra) {
    return Object.assign({ sheet: src.sheet, firstRow: firstRow, key: key, columns: copy(src.columns) }, src.cells ? { cells: copy(src.cells) } : {}, extra || {});
  }

  // The shared part: regions, lookups and meta from the fixture; row sections from its meta.sourceMap.
  function base(fixture) {
    var m = fixture.meta, src = m.sourceMap;
    return {
      meta: { templateVersion: m.templateVersion, currency: m.currency, years: m.years, isSample: m.isSample },
      regions: fixture.regions.map(function (r) { return { id: r.id, name: r.name, file: r.source.fileName, filterName: r.name }; }),
      lookups: copy(fixture.lookups),
      aliases: {},
      sections: {
        marketCoverage: section(src.marketCoverage, 10, 'industryId'),            // rows 10 to 14, one per industry
        newBusiness: section(src.newBusiness, 20, 'industryId'),                  // rows 20 and 21
        customerGrowth: section(src.customerGrowth, 10, 'name', { idPattern: '{initial}{n}' }),   // rows 10 and on, ids a1.., b1.., d1..; thresholds N3 to N6
        partners: section(src.partners, 10, 'name'),                              // rows 10 and on
        // recap on the partner sheet: rows 5 + motion x 16 + type x 8 + year (rows 5 to 7, 13 to 15, 21 to 23, 29 to 31,
        // stepping over the partner rows 10 to 12), columns E to H by channel; the mini recaps are a few cells of row 5, so
        // a blank cell is no item (miniP4, with full grids and a planted blank, switches to 'null' below)
        recap: grid(src.recap.sheet, 5, TYPES.slice(0, 2), 'skip', null, { motion: 16, type: 8 })
      },
      extra: []
    };
  }

  var mini = base(window.TEST_FIXTURES.mini);

  var p4 = window.TEST_FIXTURES.miniP4, miniP4 = base(p4), s4 = miniP4.sections, src4 = p4.meta.sourceMap;
  // One section with a header check (the Market Coverage sheet: a header row above the first data row) and the name cell.
  s4.marketCoverage.headerRow = 9;
  s4.marketCoverage.headers = { industryId: 'Industry' };
  miniP4.nameCell = { sheet: src4.marketCoverage.sheet, cell: 'C3' };
  // The partner sheet's outsourcing cell and the base year's fixed cells (mini-p4.js carries the values).
  s4.partners.cells = { outsourcingPct: 'I3' };
  // miniP2's recap grids are full, with one planted blank (Region A, new business ARR, alliance B, 2029: H7): a null
  // item, so blank: 'null'; Region C's recap: [] has only all-blank rows, which add no item under either rule
  s4.recap.blank = 'null';
  s4.baseYear = section(src4.baseYear, 7, 'category', { cells: { year: 'C4', actualsThrough: 'C5' } });   // rows 7 and on
  // Revenue at row 30 and books value at row 60: row = first + motion x 12 + type x 3 + year; blanks are planted null items.
  s4.revenue = grid(src4.revenue.sheet, 30, TYPES, 'null', 'C2');
  s4.booksValue = grid(src4.booksValue.sheet, 60, TYPES, 'null', 'C2');
  // Strategic plan: rows 90 to 93 by type, years in E to G, no variance cells.
  s4.strategicPlan = { sheet: src4.strategicPlan.sheet, filterCell: 'C2', blank: 'null',
    rows: { first: 90, axes: [axis('type', TYPES)] }, cols: { first: 'E', axes: [axis('year', YEARS)] } };
  // Routes: enumerated rows from 100, one per (route, type, solution) in the fixture's order, years in E to G.
  var routeRows = [];
  p4.regions.forEach(function (r) {
    (r.routes || []).forEach(function (it) {
      var row = parseInt(it.sourceCell.replace(/^[A-Z]+/, ''), 10);
      if (!routeRows.some(function (x) { return x.row === row; })) routeRows.push({ row: row, route: it.route, type: it.type, solution: it.solution });
    });
  });
  routeRows.sort(function (a, b) { return a.row - b.row; });
  s4.routes = { sheet: src4.routes.sheet, filterCell: 'C2', blank: 'null', rows: routeRows, cols: { first: 'E', axes: [axis('year', YEARS)] } };

  window.TEST_IMPORT_MAPS.mini = mini;
  window.TEST_IMPORT_MAPS.miniP4 = miniP4;
})();
