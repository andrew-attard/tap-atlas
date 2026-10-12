/*
 * File: tests/test-import-fixtures.js
 * Purpose: Tests of the in-app import, FIXTURES stream (docs/ARCHITECTURE.md section 20): the workbook writer honours
 *          the mappings (every value at its mapped cell, names not ids, blanks as no cell, a sheet only for the parts a
 *          region carries), the fixture mappings describe the fixtures' layouts, and files() gives File objects.
 * Provides: test cases X-import-fixtures-*
 * Depends on: tests/harness.js, tests/test-setup.js, vendor/xlsx.mini.min.js, tests/fixtures/workbook-write.js,
 *             tests/fixtures/import-maps.js, tests/fixtures/mini-data.js, mini-p4.js, sample-expected.js,
 *             data/sample-plan-data.js, config/import-map.js
 * Used by: tests.html
 * Owner: FIXTURES stream
 */
(function () {
  'use strict';

  var W = window.WORKBOOK_WRITE, MAPS = window.TEST_IMPORT_MAPS;
  var RATINGS = ['growthPotential', 'criticality', 'competitiveIntensity', 'references', 'expertise', 'productFit'];
  var LISTS = { industryId: 'industries', productLine: 'productLines', channel: 'channels', segment: 'segments',
    solution: 'solutions', category: 'productCategories' };
  var ROWS = ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners', 'baseYear'];
  var GRIDS = ['recap', 'revenue', 'booksValue', 'strategicPlan', 'routes'];

  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o === null || o === undefined ? o : o[k]; }, obj);
  }
  function nameOf(list, id) {
    var hit = (list || []).filter(function (e) { return e.id === id; })[0];
    return hit ? hit.name : id;
  }
  // What the importer expects to find in a cell for a field's value (section 20.2), worked out here, not by the writer.
  function expected(section, field, value, lookups) {
    if (value === null || value === undefined) return null;
    if (LISTS[field]) return nameOf(lookups[LISTS[field]], value);
    if (section === 'partners' && field === 'type') return nameOf(lookups.partnerTypes, value);
    if (field === 'maturity') return nameOf(lookups.partnerMaturity, value);
    if (field === 'riskLevel') return value.charAt(0).toUpperCase() + value.slice(1);
    if (RATINGS.indexOf(field) >= 0) {
      return lookups.scales[field].levels.filter(function (l) { return l.score === value; })[0].label;
    }
    return value;
  }
  function itemsOf(region, key) {
    if (key === 'customerGrowth') return region.customerGrowth ? region.customerGrowth.accounts : null;
    if (key === 'baseYear') return region.baseYear ? region.baseYear.items : null;
    return region[key] === undefined ? null : region[key];
  }
  function one(plan, id) {
    var p = copy(plan);
    p.regions = p.regions.filter(function (r) { return r.id === id; });
    return p;
  }
  // Writes one region's workbook and reads it back through the library, as the importer will.
  function roundTrip(plan, map, id) {
    var out = W.workbooks(one(plan, id), map)[0];
    var wb = XLSX.read(W.toArrayBuffer(out.wb), { type: 'array' });
    return { out: out, wb: wb, region: plan.regions.filter(function (r) { return r.id === id; })[0] };
  }
  function cell(wb, sheet, addr) {
    var ws = wb.Sheets[sheet];
    return ws && ws[addr] ? ws[addr].v : undefined;
  }

  // Every item of every list sits at its mapped cell; returns how many cells were compared.
  function checkRegion(a, plan, map, id) {
    var t = roundTrip(plan, map, id), r = t.region, n = 0, filter;
    ROWS.forEach(function (key) {
      var spec = map.sections[key], items = itemsOf(r, key);
      if (!spec || items === null) return;
      items.forEach(function (item) {
        Object.keys(spec.columns).forEach(function (field) {
          var col = spec.columns[field], v = get(item, field);
          if (key === 'newBusiness' && field === 'tier') v = null;   // never written (D154)
          if (Array.isArray(col)) {
            col.forEach(function (c, i) {
              a.equal(cell(t.wb, spec.sheet, c + item.sourceRow), Array.isArray(v) && v[i] !== null ? v[i] : undefined,
                id + ' ' + key + ' ' + field + '[' + i + '] row ' + item.sourceRow);
              n++;
            });
            return;
          }
          var want = expected(key, field, v, plan.lookups);
          a.equal(cell(t.wb, spec.sheet, col + item.sourceRow), want === null ? undefined : want, id + ' ' + key + ' ' + field + ' row ' + item.sourceRow);
          n++;
        });
      });
      var base = Array.isArray(r[key]) ? r : r[key];
      Object.keys(spec.cells || {}).forEach(function (path) {
        var v = get(base, path);
        a.equal(cell(t.wb, spec.sheet, spec.cells[path]), v === null || v === undefined ? undefined : v, id + ' ' + key + ' cell ' + path);
        n++;
      });
      Object.keys(spec.headers || {}).forEach(function (field) {
        var col = spec.columns[field];
        a.equal(cell(t.wb, spec.sheet, (Array.isArray(col) ? col[0] : col) + spec.headerRow), spec.headers[field], id + ' header ' + field);
        n++;
      });
    });
    GRIDS.forEach(function (key) {
      var spec = map.sections[key], items = r[key];
      if (!spec || !items) return;
      items.forEach(function (item) {
        a.equal(cell(t.wb, spec.sheet, item.sourceCell), item.value === null ? undefined : item.value, id + ' ' + key + ' ' + item.sourceCell);
        n++;
        if (spec.variance && item.variance !== undefined) {
          var yi = spec.cols.axes[0].values.indexOf(item.year), col = XLSX.utils.encode_col(XLSX.utils.decode_col(spec.variance.cols.first) + yi);
          a.equal(cell(t.wb, spec.sheet, col + item.sourceCell.replace(/^[A-Z]+/, '')), item.variance === null ? undefined : item.variance, id + ' variance ' + item.sourceCell);
          n++;
        }
      });
      if (spec.filterCell && items.length) {
        filter = map.regions.filter(function (m) { return m.id === id; })[0];
        a.equal(cell(t.wb, spec.sheet, spec.filterCell), filter && filter.filterName ? filter.filterName : r.name, id + ' ' + key + ' filterCell');
        n++;
      }
    });
    if (map.nameCell) { a.equal(cell(t.wb, map.nameCell.sheet, map.nameCell.cell), r.name, id + ' nameCell'); n++; }
    a.equal(t.out.fileName, r.source.fileName);
    a.equal(t.out.regionId, id);
    a.equal(t.wb.Props.Title, r.name);
    a.equal(Math.floor(t.wb.Props.ModifiedDate.getTime() / 1000), Math.floor(Date.parse(r.source.fileModified) / 1000), id + ' ModifiedDate');
    return { n: n, wb: t.wb };
  }

  T.suite('import-fixtures', function () {
    T.test('X-import-fixtures-map-mini', 'the mini mapping describes the mini fixture: regions, lookups, meta, rows and the recap grid', function (a) {
      var f = T_FIXTURE('mini'), m = MAPS.mini;
      a.deepEqual(m.regions.map(function (r) { return r.id; }), ['alpha', 'bravo', 'charlie', 'delta']);
      a.deepEqual(m.regions[0], { id: 'alpha', name: 'Region A', file: 'Region A plan.xlsx', filterName: 'Region A' });
      a.deepEqual(m.lookups, f.lookups);
      a.deepEqual(m.meta, { templateVersion: 'test-fixture', currency: 'EUR', years: [2027, 2028, 2029], isSample: true });
      a.equal(m.sections.marketCoverage.sheet, '1. Market Coverage');
      a.equal(m.sections.marketCoverage.firstRow, 10);
      a.deepEqual(m.sections.marketCoverage.columns, f.meta.sourceMap.marketCoverage.columns);
      a.equal(m.sections.newBusiness.firstRow, 20);
      a.equal(m.sections.customerGrowth.idPattern, '{initial}{n}', 'ids are a1.., b1.., d1.. by the region\'s initial');
      a.deepEqual(m.sections.customerGrowth.cells, f.meta.sourceMap.customerGrowth.cells);
      a.equal(m.sections.partners.firstRow, 10);
      a.equal(m.sections.partners.cells, undefined);
      a.equal(m.sections.recap.sheet, '4. Partner');
      a.equal(m.sections.recap.blank, 'skip');
      a.deepEqual(m.sections.recap.rows, { first: 5, axes: [{ field: 'motion', values: ['newBusiness', 'customerGrowth'], stride: 16 },
        { field: 'type', values: ['arr', 'services'], stride: 8 }, { field: 'year', values: [2027, 2028, 2029] }] }, 'explicit strides step over the partner rows');
      a.deepEqual(m.sections.recap.cols, { first: 'E', axes: [{ field: 'channel', values: ['direct', 'partner', 'allianceA', 'allianceB'] }] });
      a.equal(m.sections.revenue, undefined);
      a.equal(m.sections.marketCoverage.headerRow, undefined);
    });

    T.test('X-import-fixtures-map-minip4', 'the miniP4 mapping adds the Phase 4 blocks at the fixture\'s rows, one header pair and the name cell', function (a) {
      var f = T_FIXTURE('miniP4'), m = MAPS.miniP4;
      a.deepEqual(m.lookups, f.lookups);
      a.equal(m.sections.newBusiness.columns.solution, 'V');
      a.deepEqual(m.sections.partners.columns.distribution, ['T', 'U', 'V']);
      a.deepEqual(m.sections.partners.cells, { outsourcingPct: 'I3' });
      a.deepEqual(m.sections.baseYear.cells, { year: 'C4', actualsThrough: 'C5' });
      a.equal(m.sections.baseYear.sheet, '6. Order Intake');
      a.equal(m.sections.baseYear.firstRow, 7);
      a.equal(m.sections.revenue.rows.first, 30);
      a.equal(m.sections.booksValue.rows.first, 60);
      a.equal(m.sections.revenue.blank, 'null');
      a.deepEqual(m.sections.booksValue.rows.axes.map(function (x) { return x.field + ':' + x.values.length; }), ['motion:2', 'type:4', 'year:3']);
      a.deepEqual(m.sections.strategicPlan.rows, { first: 90, axes: [{ field: 'type', values: ['arr', 'services', 'swPerpetual', 'hardware'] }] });
      a.deepEqual(m.sections.strategicPlan.cols, { first: 'E', axes: [{ field: 'year', values: [2027, 2028, 2029] }] });
      a.equal(m.sections.strategicPlan.variance, undefined);
      a.equal(m.sections.revenue.sheet, '5. Recap');
      a.ok(Array.isArray(m.sections.routes.rows), 'routes rows are enumerated');
      a.deepEqual(m.sections.routes.rows[0], { row: 100, route: 'ownSales', type: 'arr', solution: 'sol1' });
      a.deepEqual(m.sections.routes.rows[2], { row: 102, route: 'customerSuccess', type: 'arr', solution: null });
      a.deepEqual(m.sections.routes.rows[5], { row: 105, route: 'systemIntegrators', type: 'arr', solution: 'sol3' }, 'Region B\'s first new triple');
      a.deepEqual(m.sections.routes.rows[9], { row: 109, route: 'partnerExisting', type: 'services', solution: null }, 'Region D\'s last');
      a.equal(m.sections.routes.rows.length, 10, 'one row per route, type and solution across the three regions');
      var withHeaders = Object.keys(m.sections).filter(function (k) { return m.sections[k].headerRow; });
      a.equal(withHeaders.length, 1, 'one section carries the header check fixture');
      a.ok(Object.keys(m.sections[withHeaders[0]].headers).length > 0);
      a.deepEqual(m.nameCell, { sheet: '1. Market Coverage', cell: 'C3' });
      a.deepEqual(MAPS.mini.sections.recap, m.sections.recap, 'the recap grid is unchanged');
    });

    T.test('X-import-fixtures-mini-cells', 'mini: every value of every region sits at its mapped cell, the file name, title and date match', function (a) {
      var plan = T_FIXTURE('mini'), total = 0;
      plan.regions.forEach(function (r) { total += checkRegion(a, plan, MAPS.mini, r.id).n; });
      a.ok(total > 400, 'compared ' + total + ' cells');
      var all = W.workbooks(plan, MAPS.mini);
      a.deepEqual(all.map(function (o) { return o.fileName; }), ['Region A plan.xlsx', 'Region B plan.xlsx', 'Region C plan.xlsx', 'Region D plan.xlsx']);
    });

    T.test('X-import-fixtures-mini-blanks', 'mini: a null value leaves no cell, an empty recap leaves the grid empty, the sheet still exists', function (a) {
      var plan = T_FIXTURE('mini'), c = roundTrip(plan, MAPS.mini, 'charlie'), al = roundTrip(plan, MAPS.mini, 'alpha');
      a.equal(cell(c.wb, '1. Market Coverage', 'J10'), undefined, 'ind1 references is blank');
      a.equal(cell(c.wb, '1. Market Coverage', 'M11'), undefined, 'ind2 tier is blank');
      a.equal(cell(c.wb, '2. New Business', 'J20'), undefined, 'hit rate blank');
      a.equal(cell(c.wb, '2. New Business', 'O20'), undefined, 'ARR potential year 1 blank');
      a.equal(cell(c.wb, '2. New Business', 'K20'), 80);
      a.equal(cell(c.wb, '3. Customer Growth', 'N3'), undefined, 'threshold blank');
      a.ok(c.wb.Sheets['4. Partner'], 'the partner sheet exists for an empty partner list');
      a.ok(c.wb.Sheets['3. Customer Growth'], 'the customer growth sheet exists for an empty section');
      a.equal(Object.keys(c.wb.Sheets['4. Partner']).filter(function (k) { return k.charAt(0) !== '!'; }).length, 0, 'no cell on it');
      a.equal(cell(al.wb, '4. Partner', 'E5'), 450);
      a.equal(cell(al.wb, '4. Partner', 'F5'), 250);
      a.equal(cell(al.wb, '4. Partner', 'G5'), undefined, 'no item, no cell');
      var p2 = roundTrip(T_FIXTURE('miniP4'), MAPS.miniP4, 'alpha');
      a.equal(cell(p2.wb, '4. Partner', 'E5'), 400, 'full recap grid: new business ARR direct 2027');
      a.equal(cell(p2.wb, '4. Partner', 'H7'), undefined, 'new business ARR alliance B 2029 is blank in miniP2');
      a.equal(cell(p2.wb, '4. Partner', 'F13'), 40, 'services 2027 partner on row 13, past the partner rows');
      a.equal(cell(p2.wb, '4. Partner', 'E21'), 100, 'customer growth ARR 2027 direct');
      a.equal(cell(p2.wb, '4. Partner', 'E31'), 10, 'customer growth services 2029 direct');
      a.equal(cell(p2.wb, '4. Partner', 'E10'), 'Home market', 'the partner row keeps its own cells');
      a.equal(cell(al.wb, '3. Customer Growth', 'I13'), undefined, 'a4 growthPct is null: no cells');
      a.equal(cell(al.wb, '3. Customer Growth', 'L13'), 2);
      a.deepEqual(c.wb.SheetNames.slice().sort(), ['1. Market Coverage', '2. New Business', '3. Customer Growth', '4. Partner']);
    });

    T.test('X-import-fixtures-names', 'cells hold lookup names and scale labels, not ids and scores', function (a) {
      var plan = T_FIXTURE('miniP4'), t = roundTrip(plan, MAPS.miniP4, 'alpha');
      a.equal(cell(t.wb, '1. Market Coverage', 'B10'), 'Healthcare');
      a.equal(cell(t.wb, '1. Market Coverage', 'D10'), 'Strong dynamics, business to take');
      a.equal(cell(t.wb, '1. Market Coverage', 'L12'), 'Major gaps');
      a.equal(cell(t.wb, '1. Market Coverage', 'M10'), 1, 'tier stays a number');
      a.equal(cell(t.wb, '2. New Business', 'V20'), 'Solution 1');
      a.equal(cell(t.wb, '3. Customer Growth', 'H11'), 'High');
      a.equal(cell(t.wb, '3. Customer Growth', 'H13'), 'Medium');
      a.equal(cell(t.wb, '3. Customer Growth', 'F10'), 'Product line 1');
      a.equal(cell(t.wb, '3. Customer Growth', 'U10'), 'Strategic');
      a.equal(cell(t.wb, '3. Customer Growth', 'D11'), 'Education');
      a.equal(cell(t.wb, '4. Partner', 'C10'), 'Partner');
      a.equal(cell(t.wb, '4. Partner', 'D10'), 'Enable', 'maturity id becomes the level name');
      a.equal(cell(t.wb, '4. Partner', 'D11'), 'Strategic', 'text that is a level name stays as it is');
      a.equal(cell(t.wb, '4. Partner', 'D12'), undefined);
      a.equal(cell(t.wb, '4. Partner', 'P10'), 'Value-added reseller');
      a.equal(cell(t.wb, '4. Partner', 'P11'), 'System integrator');
      a.equal(cell(t.wb, '6. Order Intake', 'B8'), 'Recurring');
      a.equal(cell(t.wb, '6. Order Intake', 'C5'), '2026-08', 'actualsThrough as text');
      var mini = roundTrip(T_FIXTURE('mini'), MAPS.mini, 'alpha');
      a.equal(cell(mini.wb, '4. Partner', 'D10'), 'Developing', 'without a maturity lookup the text is written as it is');
    });

    T.test('X-import-fixtures-no-tier', 'the New Business tier is never written, even through a mapped tier column', function (a) {
      var map = copy(MAPS.mini);
      map.sections.newBusiness.columns.tier = 'W';
      var t = roundTrip(T_FIXTURE('mini'), map, 'alpha');
      a.equal(cell(t.wb, '2. New Business', 'W20'), undefined);
      a.equal(cell(t.wb, '2. New Business', 'W21'), undefined);
      a.equal(cell(t.wb, '2. New Business', 'B20'), 'Healthcare');
    });

    T.test('X-import-fixtures-minip4-cells', 'miniP4: every value of Regions A, B and D sits at its mapped cell, the Phase 4 grids included', function (a) {
      var plan = T_FIXTURE('miniP4'), total = 0;
      ['alpha', 'bravo', 'delta'].forEach(function (id) { total += checkRegion(a, plan, MAPS.miniP4, id).n; });
      a.ok(total > 900, 'compared ' + total + ' cells');
    });

    T.test('X-import-fixtures-minip4-blanks', 'miniP4: planted nulls leave no cell; the header pair, name cell and outsourcing cell are written', function (a) {
      var plan = T_FIXTURE('miniP4'), al = roundTrip(plan, MAPS.miniP4, 'alpha'), d = roundTrip(plan, MAPS.miniP4, 'delta');
      a.equal(cell(al.wb, '5. Recap', 'H30'), undefined, 'revenue new business ARR alliance B 2027 is null');
      a.equal(cell(al.wb, '5. Recap', 'E30'), 200);
      a.equal(cell(al.wb, '5. Recap', 'E60'), 400);
      a.equal(cell(al.wb, '5. Recap', 'E66'), 50, 'books value sw perpetual 2027 direct');
      a.equal(cell(al.wb, '5. Recap', 'E90'), 700);
      a.equal(cell(al.wb, '5. Recap', 'G92'), 0);
      a.equal(cell(d.wb, '5. Recap', 'G91'), undefined, 'strategic plan services 2029 is null');
      a.equal(cell(d.wb, '5. Recap', 'F91'), 250);
      a.equal(cell(d.wb, '6. Order Intake', 'F8'), undefined, 'base year services pipeline is null');
      a.equal(cell(d.wb, '6. Order Intake', 'G8'), undefined, 'coverage not given');
      a.equal(cell(d.wb, '6. Order Intake', 'E9'), 5);
      a.equal(cell(d.wb, '6. Order Intake', 'C4'), 2026);
      a.equal(cell(d.wb, '5. Recap', 'G109'), undefined, 'last route figure 2029 is null');
      a.equal(cell(d.wb, '5. Recap', 'E109'), 30);
      a.equal(cell(d.wb, '5. Recap', 'E107'), 200, 'Region D own sales without a solution has its own row');
      a.equal(cell(d.wb, '5. Recap', 'E100'), undefined, 'and nothing on Region A\'s own sales row');
      a.equal(cell(al.wb, '5. Recap', 'E104'), 150, 'Region A fifth route');
      a.equal(cell(al.wb, '4. Partner', 'I3'), 0.2);
      a.equal(cell(d.wb, '4. Partner', 'I3'), undefined, 'Region D outsourcing is null');
      a.equal(cell(al.wb, '4. Partner', 'V11'), undefined, 'A2 distribution year 3 is null');
      a.equal(cell(al.wb, '4. Partner', 'U11'), 100);
      a.equal(cell(al.wb, '1. Market Coverage', 'C3'), 'Region A');
      a.equal(cell(al.wb, '5. Recap', MAPS.miniP4.sections.revenue.filterCell), 'Region A');
      var hk = Object.keys(MAPS.miniP4.sections).filter(function (k) { return MAPS.miniP4.sections[k].headerRow; })[0], hs = MAPS.miniP4.sections[hk];
      Object.keys(hs.headers).forEach(function (f) {
        a.equal(cell(al.wb, hs.sheet, hs.columns[f] + hs.headerRow), hs.headers[f], 'header ' + f);
      });
    });

    T.test('X-import-fixtures-minip4-no-part', 'miniP4: Region C has no Phase 4 part, so no Phase 4 sheet', function (a) {
      var t = roundTrip(T_FIXTURE('miniP4'), MAPS.miniP4, 'charlie');
      a.deepEqual(t.wb.SheetNames.slice().sort(), ['1. Market Coverage', '2. New Business', '3. Customer Growth', '4. Partner']);
      a.equal(cell(t.wb, '1. Market Coverage', 'C3'), 'Region C');
      a.equal(cell(t.wb, '4. Partner', 'I3'), undefined);
    });

    T.test('X-import-fixtures-mismatch', 'a mapping that puts a value elsewhere than its sourceCell makes the writer throw', function (a) {
      var map = copy(MAPS.mini);
      map.sections.recap.rows.first = 6;
      a.throws(function () { W.workbooks(T_FIXTURE('mini'), map); });
      var cols = copy(MAPS.mini);
      cols.sections.recap.cols.first = 'F';
      a.throws(function () { W.workbooks(T_FIXTURE('mini'), cols); });
    });

    T.test('X-import-fixtures-sample-order', 'the sample gives seven workbooks in region order, named after the regions', function (a) {
      var out = W.workbooks(window.PLAN_DATA, window.IMPORT_MAP);
      a.deepEqual(out.map(function (o) { return o.regionId; }), ['na', 'latam', 'neu', 'seu', 'ceu', 'mea', 'apac']);
      a.deepEqual(out.map(function (o) { return o.fileName; }), window.PLAN_DATA.regions.map(function (r) { return r.source.fileName; }));
      a.deepEqual(out[0].wb.SheetNames, ['1. Market Coverage', '2. New Business', '3. Customer Growth', '4. Partner', '7. Order Intake', '6. Recap']);
      a.deepEqual(out[4].wb.SheetNames, ['1. Market Coverage', '2. New Business', '3. Customer Growth', '4. Partner', '6. Recap'], 'Central Europe has no base year');
      a.equal(out[2].wb.Sheets['6. Recap'].E47, undefined, 'Northern Europe has no strategic plan');
    });

    window.PLAN_DATA.regions.forEach(function (region) {
      T.test('X-import-fixtures-sample-' + region.id, 'sample ' + region.name + ': every value sits at its mapped cell, headers, name, filter and date included', function (a) {
        var res = checkRegion(a, window.PLAN_DATA, window.IMPORT_MAP, region.id);
        a.ok(res.n > 500, 'compared ' + res.n + ' cells');
        a.equal(cell(res.wb, '1. Market Coverage', 'B9'), 'Industry');
        a.equal(cell(res.wb, '2. New Business', 'D14'), 'Sub-industry');
        a.equal(cell(res.wb, '4. Partner', 'B19'), 'Partner');
        a.equal(cell(res.wb, '6. Recap', 'C2'), region.name);
        a.equal(!!res.wb.Sheets['7. Order Intake'], !!region.baseYear, 'order intake sheet only with a base year');
      });
    });

    T.test('X-import-fixtures-extra', 'extra sections: one sheet per section with the rows at firstRow and on; none without rows', function (a) {
      var plan = window.T_WITH_EXTRA(), f = window.SAMPLE_EXPECT.extra.fixture, map = copy(window.IMPORT_MAP);
      map.extra = [Object.assign({ sheet: '5. Events', firstRow: 8 }, copy(f.section))];
      plan.regions = plan.regions.filter(function (r) { return r.id === 'na' || r.id === 'ceu'; });
      var out = W.workbooks(plan, map), na = XLSX.read(W.toArrayBuffer(out[0].wb), { type: 'array' }), ceu = XLSX.read(W.toArrayBuffer(out[1].wb), { type: 'array' });
      a.equal(cell(na, '5. Events', 'B8'), 'Customer innovation day');
      a.equal(cell(na, '5. Events', 'E8'), 60);
      a.equal(cell(na, '5. Events', 'F9'), 12);
      a.equal(cell(na, '5. Events', 'G10'), 0.67);
      a.equal(cell(na, '5. Events', 'H9'), undefined, 'a null note leaves no cell');
      a.equal(cell(na, '5. Events', 'H8'), 'Joint sessions with two partners');
      a.equal(ceu.Sheets['5. Events'], undefined, 'Central Europe has no events');
    });

    T.test('X-import-fixtures-files', 'files() gives File objects named after the regions with lastModified from the source, readable by the library', function (a) {
      var plan = one(T_FIXTURE('mini'), 'delta'), files = W.files(plan, MAPS.mini);
      a.equal(files.length, 1);
      a.ok(files[0] instanceof File, 'a File object');
      a.equal(files[0].name, 'Region D plan.xlsx');
      a.equal(files[0].lastModified, Date.parse('2026-09-28T10:00:00Z'));
      return files[0].arrayBuffer().then(function (buf) {
        var wb = XLSX.read(buf, { type: 'array' });
        a.equal(cell(wb, '4. Partner', 'E5'), 150);
        a.equal(wb.Props.Title, 'Region D');
      });
    });
  });
})();
