/*
 * File: tests/test-import-plan.js
 * Purpose: Tests of the in-app import, PLAN stream (docs/ARCHITECTURE.md section 20): the section 5 checks, the region
 *          order and duplicates of the plan build, the contract check, the data file text and the plain-text report, on
 *          hand-built regions and readings; and the round trips through the workbook writer on mini, miniP4 and the sample.
 * Provides: test cases X-import-plan-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, tests/fixtures/mini-data.js, tests/fixtures/mini-p4.js,
 *             tests/fixtures/workbook-write.js, tests/fixtures/import-maps.js, config/import-map.js, data/sample-plan-data.js
 * Used by: tests.html
 * Owner: PLAN stream (#586)
 *
 * The round trips need TAP.xlsxBook (READ stream, #585), WORKBOOK_WRITE and TEST_IMPORT_MAPS (FIXTURES stream, #584);
 * while those are stubs the round-trip cases are registered as skipped and say so.
 */
(function (TAP) {
  'use strict';

  var NOW = '2026-10-12T09:00:00Z', YEARS = [2027, 2028, 2029];
  var CH = ['direct', 'partner', 'allianceA', 'allianceB'];
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function text(key) { return TAP.content.text('importPanel.check.' + key); }

  // A mapping in the section 20.1 shape for a mini fixture, from its own sourceMap (sheets and columns) plus the grids
  function testMap(fixture) {
    var sm = fixture.meta.sourceMap, sections = {};
    ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners'].forEach(function (k) {
      sections[k] = Object.assign(copy(sm[k]), { firstRow: k === 'newBusiness' ? 20 : 10, key: k === 'marketCoverage' || k === 'newBusiness' ? 'industryId' : 'name' });
    });
    sections.customerGrowth.idPattern = 'a{n}';
    sections.recap = { sheet: sm.recap.sheet, blank: 'skip',
      rows: { first: 5, axes: [{ field: 'year', values: YEARS }, { field: 'motion', values: ['newBusiness', 'customerGrowth'] }, { field: 'type', values: ['arr', 'services'] }] },
      cols: { first: 'E', axes: [{ field: 'channel', values: CH }] } };
    if (sm.revenue) {
      ['revenue', 'booksValue'].forEach(function (k) { sections[k] = { sheet: sm[k].sheet, blank: 'null', rows: { first: k === 'revenue' ? 30 : 60, axes: [] }, cols: { first: 'E', axes: [{ field: 'channel', values: CH }] } }; });
      sections.strategicPlan = { sheet: sm.strategicPlan.sheet, rows: { first: 90, axes: [{ field: 'type', values: ['arr', 'services', 'swPerpetual', 'hardware'] }] },
        cols: { first: 'E', axes: [{ field: 'year', values: YEARS }] }, variance: { cols: { first: 'I', axes: [{ field: 'year', values: YEARS }] } } };
      sections.routes = { sheet: sm.routes.sheet, rows: [], cols: [] };
      sections.baseYear = Object.assign(copy(sm.baseYear), { firstRow: 7, key: 'category', cells: { year: 'C4', actualsThrough: 'C5' } });
    }
    return { meta: { templateVersion: fixture.meta.templateVersion, currency: 'EUR', years: YEARS, isSample: true },
      regions: fixture.regions.map(function (r) { return { id: r.id, name: r.name, file: r.source.fileName, filterName: r.name }; }),
      lookups: copy(fixture.lookups), aliases: {}, sections: sections, extra: [] };
  }

  // A ctx that collects what the checks say
  function collect(map, regionId) {
    var c = { regionId: regionId, years: map.meta.years, V: null, map: map, notes: [], errors: [] };
    c.note = function (m, s, cell) { c.notes.push({ message: m, sheet: s, cell: cell }); };
    c.error = function (m, s, cell) { c.errors.push({ message: m, sheet: s, cell: cell }); };
    return c;
  }
  function checks(fixture, region, map) {
    var c = collect(map, region.id);
    TAP.importChecks.run(region, fixture.lookups, map, c);
    return c;
  }
  function region(fixture, id) { return fixture.regions.filter(function (r) { return r.id === id; })[0]; }
  function reading(r) { return { ok: true, id: r.id, name: r.name, fileName: r.source.fileName, region: r, errors: [], notes: [], parts: { marketCoverage: 'read' } }; }

  // While TAP.importMap is a stub, build() gets a stand-in for the derived source map; the round trips test the real one
  function withMap(fn) {
    var M = TAP.importMap, saved = { sourceMap: M.sourceMap, extraSections: M.extraSections };
    if (M.sourceMap.__stub) { M.sourceMap = function (map) { return {}; }; M.extraSections = function () { return []; }; }
    try { return fn(); } finally { M.sourceMap = saved.sourceMap; M.extraSections = saved.extraSections; }
  }
  function noKeys(a, list) { list.forEach(function (x) { a.ok(!/^\[importPanel/.test(x.message), 'wording found: ' + x.message); }); }

  T.suite('import-plan', function () {
    T.test('X-import-plan-slug', 'slug makes a lower-case id with dashes and never rest or org', function (a) {
      a.equal(TAP.importRegion.slug('Middle East & Africa'), 'middle-east-africa');
      a.equal(TAP.importRegion.slug('  North America plan '), 'north-america-plan');
      a.equal(TAP.importRegion.slug('Rest'), 'rest-region');
      a.equal(TAP.importRegion.slug('ORG'), 'org-region');
      a.equal(TAP.importRegion.slug(''), 'region');
    });

    T.test('X-import-plan-check-industries', 'A rated industry without a Market Coverage row is an error on the sheet naming the industry', function (a) {
      var f = T_FIXTURE('mini'), map = testMap(f), r = region(f, 'alpha');
      a.deepEqual(checks(f, r, map).errors, [], 'a complete region has no error');
      r.marketCoverage = r.marketCoverage.filter(function (o) { return o.industryId !== 'ind3' && o.industryId !== 'other'; });
      var c = checks(f, r, map);
      a.equal(c.errors.length, 1, 'one error for the missing rated industry; "other" is not rated');
      a.equal(c.errors[0].sheet, '1. Market Coverage');
      a.equal(c.errors[0].cell, null);
      a.match(c.errors[0].message, /Retail/);
      a.match(c.errors[0].message, /1 rated/);
      noKeys(a, c.errors);
    });

    T.test('X-import-plan-check-empty', 'A section present but empty gives a note naming the section, its sheet and first cell', function (a) {
      var f = T_FIXTURE('mini'), map = testMap(f), c = checks(f, region(f, 'charlie'), map);
      var empty = c.notes.filter(function (n) { return /is empty/.test(n.message); });
      a.deepEqual(empty.map(function (n) { return n.sheet + ' ' + n.cell; }).sort(), ['3. Customer Growth C10', '4. Partner B10', '4. Partner E5'].sort());
      a.ok(empty.some(function (n) { return /Partner section/.test(n.message); }));
      a.ok(empty.some(function (n) { return /Recap section/.test(n.message); }));
      a.ok(empty.some(function (n) { return /Customer Growth section/.test(n.message); }));
      a.deepEqual(c.errors, [], 'an empty section is not an error');
      a.equal(checks(f, region(f, 'alpha'), map).notes.filter(function (n) { return /is empty/.test(n.message); }).length, 0);
    });

    T.test('X-import-plan-check-split', 'A channel split off 100% by more than a point is a note with the four cells', function (a) {
      var f = T_FIXTURE('mini'), map = testMap(f), r = region(f, 'alpha');
      a.deepEqual(checks(f, r, map).notes, [], 'Region A is clean');
      r.newBusiness[0].channelSplit = { direct: 0.5, partner: 0.45, allianceA: 0, allianceB: 0 };
      var c = checks(f, r, map);
      a.equal(c.notes.length, 1);
      a.equal(c.notes[0].sheet, '2. New Business');
      a.equal(c.notes[0].cell, 'E20:H20');
      a.match(c.notes[0].message, /95%/);
      r.newBusiness[0].channelSplit = { direct: 0.5, partner: 0.495, allianceA: 0, allianceB: 0 };
      a.equal(checks(f, r, map).notes.length, 0, 'half a point is within rounding');
    });

    T.test('X-import-plan-check-arr', 'ARR potential year 1 off target accounts × hit rate × deal size is a note on the year 1 cell', function (a) {
      var f = T_FIXTURE('mini'), map = testMap(f), r = region(f, 'alpha');
      r.newBusiness[1].arrPotential[0] = 250;   // 10 × 0.1 × 200 = 200
      var c = checks(f, r, map);
      a.equal(c.notes.length, 1);
      a.deepEqual([c.notes[0].sheet, c.notes[0].cell], ['2. New Business', 'O21']);
      a.match(c.notes[0].message, /250/);
      a.match(c.notes[0].message, /200/);
      r.newBusiness[1].arrPotential[0] = 201.5;
      a.equal(checks(f, r, map).notes.length, 0, 'within 1%');
      a.equal(checks(f, region(f, 'charlie'), map).notes.filter(function (n) { return /ARR potential/.test(n.message); }).length, 0, 'a blank hit rate is not checked');
    });

    T.test('X-import-plan-check-segment', 'A segment that disagrees with the thresholds rule is a note on the segment cell', function (a) {
      var f = T_FIXTURE('mini'), map = testMap(f), r = region(f, 'alpha');
      r.customerGrowth.accounts[1].segment = 'growth';   // a2: ARR 200, cumulative 110 under 150 gives core
      var c = checks(f, r, map);
      a.equal(c.notes.length, 1);
      a.deepEqual([c.notes[0].sheet, c.notes[0].cell], ['3. Customer Growth', 'U11']);
      a.match(c.notes[0].message, /growth/);
      a.match(c.notes[0].message, /core/);
      var ch = region(f, 'charlie');
      ch.customerGrowth.accounts = [Object.assign(copy(r.customerGrowth.accounts[0]), { segment: 'scaled' })];
      a.equal(checks(f, ch, map).notes.filter(function (n) { return /segment/.test(n.message); }).length, 0, 'blank thresholds: no check');
    });

    T.test('X-import-plan-check-variance', 'A strategic plan variance off books minus plan is a note on the variance cell, when the mapping has one', function (a) {
      var f = T_FIXTURE('miniP4'), map = testMap(f), r = region(f, 'alpha');
      // 2027 arr: books 400 + 150 + 100 + 40 = 690, plan 700, variance -10
      var item = r.strategicPlan.filter(function (o) { return o.type === 'arr' && o.year === 2027; })[0];
      item.variance = -10;
      a.equal(checks(f, r, map).notes.length, 0, 'a right variance: no note');
      item.variance = 25;
      var c = checks(f, r, map);
      a.equal(c.notes.length, 1);
      a.deepEqual([c.notes[0].sheet, c.notes[0].cell], ['5. Recap', 'I90']);
      a.match(c.notes[0].message, /-10/);
      delete map.sections.strategicPlan.variance;
      a.equal(checks(f, r, map).notes.length, 0, 'no variance cells in the mapping: not checked');
    });

    T.test('X-import-plan-check-revenue', 'Revenue above the order intake of the same year, channel, motion and type is a note on the revenue cell', function (a) {
      var f = T_FIXTURE('miniP4'), map = testMap(f), r = region(f, 'alpha');
      var item = r.revenue.filter(function (o) { return o.sourceCell === 'E30'; })[0];   // 2027 direct new business arr: 200 of 400
      item.value = 400.4;
      a.equal(checks(f, r, map).notes.length, 0, 'equal within half a unit');
      item.value = 450;
      var c = checks(f, r, map);
      a.equal(c.notes.length, 1);
      a.deepEqual([c.notes[0].sheet, c.notes[0].cell], ['5. Recap', 'E30']);
      a.match(c.notes[0].message, /450/);
      a.match(c.notes[0].message, /400/);
    });

    T.test('X-import-plan-check-books', 'Books value above the customer value for a reseller channel, over ARR and services, is a note with the cells', function (a) {
      var f = T_FIXTURE('miniP4'), map = testMap(f), r = region(f, 'alpha');
      // 2027 partner: books 150 + 20 + 40 + 5 = 215, customer 200 + 40 + 50 + 10 = 300
      var item = r.booksValue.filter(function (o) { return o.sourceCell === 'F60'; })[0];
      item.value = 250;   // 315 of 300
      var c = checks(f, r, map);
      a.equal(c.notes.length, 1);
      a.equal(c.notes[0].sheet, '5. Recap');
      a.match(c.notes[0].cell, /F60/);
      a.match(c.notes[0].message, /315/);
      a.match(c.notes[0].message, /300/);
      item.value = 150;
      r.booksValue.filter(function (o) { return o.sourceCell === 'E60'; })[0].value = 900;   // direct is not a reseller
      a.equal(checks(f, r, map).notes.length, 0);
    });

    T.test('X-import-plan-check-coverage', 'A coverage ratio more than 5% from pipeline over forecast minus actuals is a note on the coverage cell', function (a) {
      var f = T_FIXTURE('miniP4'), map = testMap(f), r = region(f, 'alpha');
      a.equal(checks(f, r, map).notes.length, 0, 'recurring: 480 / (640 - 400) = 2, as the workbook says');
      r.baseYear.items[1].coverage = 2.2;
      var c = checks(f, r, map);
      a.equal(c.notes.length, 1);
      a.deepEqual([c.notes[0].sheet, c.notes[0].cell], ['6. Order Intake', 'G8']);
      a.match(c.notes[0].message, /2\.2/);
      r.baseYear.items[1].coverage = 2.05;
      a.equal(checks(f, r, map).notes.length, 0, 'within 5%');
    });

    T.test('X-import-plan-build-order', 'build puts regions in mapping order, then unmatched workbooks in file order; missing lists the rest', function (a) {
      var f = T_FIXTURE('mini'), map = testMap(f);
      var zulu = Object.assign(copy(region(f, 'alpha')), { id: 'zulu', name: 'Region Z' }), yankee = Object.assign(copy(region(f, 'alpha')), { id: 'yankee', name: 'Region Y' });
      var readings = [reading(zulu), reading(region(f, 'delta')), reading(yankee), reading(region(f, 'alpha'))];
      var res = withMap(function () { return TAP.importPlan.finish(readings, map, NOW); });
      a.deepEqual(res.plan.regions.map(function (r) { return r.id; }), ['alpha', 'delta', 'zulu', 'yankee']);
      a.deepEqual(res.missing, [{ id: 'bravo', name: 'Region B' }, { id: 'charlie', name: 'Region C' }]);
      a.equal(res.regions.length, 4, 'every reading is kept');
      a.equal(res.mapProblems.length, 0);
      a.equal(withMap(function () { return TAP.importPlan.build([], map, NOW); }), null, 'no region: no plan');
    });

    T.test('X-import-plan-duplicates', 'Two workbooks for one region error both and neither is used', function (a) {
      var f = T_FIXTURE('mini'), map = testMap(f);
      var again = reading(copy(region(f, 'alpha')));
      again.fileName = 'Region A plan (copy).xlsx';
      var readings = [reading(region(f, 'alpha')), reading(region(f, 'bravo')), again];
      var res = withMap(function () { return TAP.importPlan.finish(readings, map, NOW); });
      a.deepEqual(res.plan.regions.map(function (r) { return r.id; }), ['bravo']);
      a.equal(res.regions[0].ok, false);
      a.equal(res.regions[2].ok, false);
      a.equal(res.regions[0].region, null);
      a.match(res.regions[0].errors[0].message, /Region A plan\.xlsx, Region A plan \(copy\)\.xlsx/);
      a.equal(res.regions[1].ok, true);
      a.deepEqual(res.missing, [{ id: 'charlie', name: 'Region C' }, { id: 'delta', name: 'Region D' }], 'a region with a failed reading is not missing');
    });

    T.test('X-import-plan-meta', 'meta carries the schema version, the time, the mapping\'s template, currency, years and sample flag, and lookups are a copy', function (a) {
      var f = T_FIXTURE('mini'), map = testMap(f);
      var plan = withMap(function () { return TAP.importPlan.build([reading(region(f, 'alpha'))], map, NOW); });
      a.equal(plan.meta.schemaVersion, TAP.schemaVersion);
      a.equal(plan.meta.generatedAt, NOW);
      a.equal(plan.meta.templateVersion, 'test-fixture');
      a.equal(plan.meta.currency, 'EUR');
      a.deepEqual(plan.meta.years, YEARS);
      a.equal(plan.meta.isSample, true);
      a.ok(isObj(plan.meta.sourceMap), 'a source map object');
      a.equal(plan.meta.extraSections, undefined, 'no extra sections without any in the mapping');
      a.deepEqual(plan.lookups, f.lookups);
      a.ok(plan.lookups !== map.lookups && plan.lookups.industries !== map.lookups.industries, 'a deep copy');
      a.deepEqual(Object.keys(plan), ['meta', 'lookups', 'regions']);
    });

    T.test('X-import-plan-usable', 'A plan with a contract error (a tier of 4) checks as not usable; a clean plan is usable', function (a) {
      var f = T_FIXTURE('mini'), map = testMap(f);
      var clean = withMap(function () { return TAP.importPlan.finish(f.regions.map(reading), map, NOW); });
      a.equal(clean.usable, true, TAP.importWrite.report(clean));
      a.deepEqual(clean.check.errors, []);
      var bad = T_FIXTURE('mini');
      bad.regions[0].marketCoverage[0].tier = 4;
      var res = withMap(function () { return TAP.importPlan.finish(bad.regions.map(reading), map, NOW); });
      a.equal(res.usable, false);
      a.ok(res.plan, 'the plan is still there to report on');
      a.equal(res.check.errors.length, 1);
      a.match(res.check.errors[0].message, /regions\[0\]\.marketCoverage\[0\]\.tier/);
    });

    T.test('X-import-plan-sheets', 'sheetsOf lists every sheet the mapping names once', function (a) {
      var map = testMap(T_FIXTURE('miniP4'));
      map.nameCell = { sheet: '1. Market Coverage', cell: 'C3' };
      a.deepEqual(TAP.importPlan.sheetsOf(map).sort(), ['1. Market Coverage', '2. New Business', '3. Customer Growth', '4. Partner', '5. Recap', '6. Order Intake']);
    });

    ['mini', 'miniP4'].forEach(function (name) {
      T.test('X-import-plan-text-' + name.toLowerCase(), 'text() writes window.PLAN_DATA = {...}; that parses back to the ' + name + ' plan, one list item per line', function (a) {
        var plan = T_FIXTURE(name), s = TAP.importWrite.text(plan), lines = s.split('\n');
        a.match(s, /^\/\*\n \* File: data\/plan-data\.js\n/);
        a.match(s, /\nwindow\.PLAN_DATA = \{\n/);
        a.match(s, /\n\};\n$/);
        a.deepEqual(JSON.parse(TAP.importWrite.jsonPart(s)), plan);
        var items = 0;
        plan.regions.forEach(function (r) {
          ['marketCoverage', 'newBusiness', 'partners', 'recap', 'revenue', 'booksValue', 'strategicPlan', 'routes'].forEach(function (k) { items += (r[k] || []).length; });
          items += r.customerGrowth.accounts.length + (r.baseYear ? r.baseYear.items.length : 0);
        });
        a.equal(lines.filter(function (l) { return /^   \{/.test(l); }).length, items, 'one line per list item of the regions');
        a.equal(lines.filter(function (l) { return /^  \{"id": /.test(l); }).length, plan.lookups.industries.length + plan.lookups.productLines.length + plan.lookups.channels.length +
          plan.lookups.tiers.length + plan.lookups.segments.length + ['productCategories', 'solutions', 'partnerTypes', 'partnerMaturity', 'routes'].reduce(function (n, k) { return n + (plan.lookups[k] || []).length; }, 0), 'one line per lookup entry');
        a.ok(lines.indexOf(' "scales": {') >= 0, 'scales start their own line');
      });
    });

    T.test('X-import-plan-text-literals', 'text() writes JSON literals: a non-finite number becomes null, the key order of a region follows the sample', function (a) {
      var plan = T_FIXTURE('miniP4');
      plan.regions[0].marketCoverage[0].currentArr = Infinity;
      plan.regions[0].outsourcingPct = NaN;
      var back = JSON.parse(TAP.importWrite.jsonPart(TAP.importWrite.text(plan)));
      a.equal(back.regions[0].marketCoverage[0].currentArr, null);
      a.equal(back.regions[0].outsourcingPct, null);
      var s = TAP.importWrite.text(T_FIXTURE('mini'));
      a.ok(s.indexOf('"customerGrowth": {"thresholds": {') > 0, 'thresholds inline before the accounts list');
      a.ok(s.indexOf('\n  "recap": [\n') > 0, 'each section starts its own line');
      a.equal(TAP.importWrite.jsonPart('nothing here'), '');
    });

    T.test('X-import-plan-download', 'download makes a blob URL and hands it to TAP.panelExport.download as plan-data.js', function (a) {
      var saved = TAP.panelExport.download, calls = [];
      TAP.panelExport.download = function (url, name) { calls.push({ url: url, name: name }); };
      try {
        TAP.importWrite.download(T_FIXTURE('mini'));
        TAP.importWrite.download(T_FIXTURE('mini'), 'other.js');
      } finally { TAP.panelExport.download = saved; }
      a.equal(calls.length, 2);
      a.equal(calls[0].name, 'plan-data.js');
      a.equal(calls[1].name, 'other.js');
      a.match(calls[0].url, /^blob:/);
    });

    T.test('X-import-plan-report', 'report names every region with its state, each note and error with sheet › cell, the missing regions and the contract check', function (a) {
      var f = T_FIXTURE('mini'), map = testMap(f), readings = [reading(region(f, 'alpha')), reading(region(f, 'charlie'))];
      readings[1].ok = false; readings[1].region = null; readings[1].parts = { marketCoverage: 'read', recap: 'error' };
      readings[1].errors.push({ message: 'The filter is set to another region.', sheet: '4. Partner', cell: 'C2' });
      readings[1].notes.push({ message: 'The Partner section is empty.', sheet: '4. Partner', cell: 'B10' });
      readings[0].notes.push({ message: 'A whole-sheet note.', sheet: '1. Market Coverage', cell: null });
      var res = withMap(function () { return TAP.importPlan.finish(readings, map, NOW); });
      res.mapProblems = ['The mapping names no years.'];
      var out = TAP.importWrite.report(res);
      a.match(out, /^Region A: imported\n  file Region A plan\.xlsx, saved 2026-09-28T10:00:00Z, parts: Market Coverage read\n/);
      a.match(out, /\nRegion C: left out\n/);
      a.match(out, /\n  ERROR 4\. Partner › C2: The filter is set to another region\.\n/);
      a.match(out, /\n  note 4\. Partner › B10: The Partner section is empty\.\n/);
      a.match(out, /\n  note 1\. Market Coverage: A whole-sheet note\.\n/);
      a.match(out, /\nMissing workbook: Region B \(bravo\)\n/);
      a.match(out, /\nMapping: The mapping names no years\.\n/);
      a.match(out, /\nContract check: 0 errors\n/);
      a.match(out, /\nContract check: \d+ warnings\n/);
      a.ok(out.indexOf('[importPanel') < 0, 'every phrase has wording');
    });

    /* ---------- round trips through the workbook writer (READ and FIXTURES streams) ---------- */

    var W = window.WORKBOOK_WRITE, MAPS = window.TEST_IMPORT_MAPS;
    var READY = !TAP.xlsxBook.open.__stub && !TAP.importMap.problems.__stub && !!(W && typeof W.files === 'function') && !!(MAPS && MAPS.mini && MAPS.miniP4);
    function rt(id, title, fn) {
      if (READY) T.test(id, title, fn); else T.skip(id, title, 'waits for the READ (#585) and FIXTURES (#584) pull requests');
    }
    function strip(plan) { var p = copy(plan); p.regions.forEach(function (r) { delete r.source; }); return p; }
    function expectP4() {
      var p = T_FIXTURE('miniP4');
      p.regions.forEach(function (r) { r.partners.forEach(function (pt) { if (pt.maturity === 'Strategic') pt.maturity = 'strategic'; }); });
      return p;
    }
    // The imported plan equals the source: regions without source, meta without generatedAt, lookups, and the source files
    function same(a, res, plan, what) {
      a.deepEqual(res.mapProblems, [], what + ': no mapping problems');
      a.equal(res.usable, true, what + ': usable. ' + TAP.importWrite.report(res));
      a.deepEqual(strip(res.plan).regions, strip(plan).regions, what + ': regions');
      var m1 = copy(res.plan.meta), m2 = copy(plan.meta);
      delete m1.generatedAt; delete m2.generatedAt;
      a.deepEqual(m1, m2, what + ': meta');
      a.deepEqual(res.plan.lookups, plan.lookups, what + ': lookups');
      res.plan.regions.forEach(function (r, i) {
        a.equal(r.source.fileName, plan.regions[i].source.fileName, what + ': file name of ' + r.id);
        a.equal(r.source.fileModified, plan.regions[i].source.fileModified, what + ': saved date of ' + r.id);
        a.equal(r.source.importedAt, NOW);
      });
    }
    var sampleRun = null;
    function sample() {
      if (!sampleRun) sampleRun = TAP.importPlan.run(W.files(window.PLAN_DATA, window.IMPORT_MAP), window.IMPORT_MAP, { now: NOW });
      return sampleRun;
    }

    rt('X-import-plan-roundtrip-mini', 'The mini fixture written as workbooks and imported again is the same plan', function (a) {
      var plan = T_FIXTURE('mini');
      return TAP.importPlan.run(W.files(plan, MAPS.mini), MAPS.mini, { now: NOW }).then(function (res) { same(a, res, plan, 'mini'); });
    });

    rt('X-import-plan-roundtrip-minip4', 'The miniP4 fixture round-trips; partner A2\'s maturity "Strategic" comes back as its id', function (a) {
      return TAP.importPlan.run(W.files(T_FIXTURE('miniP4'), MAPS.miniP4), MAPS.miniP4, { now: NOW }).then(function (res) {
        same(a, res, expectP4(), 'miniP4');
        var r = res.plan.regions[0];
        a.deepEqual(Object.keys(r).slice(0, 8), ['id', 'name', 'source', 'marketCoverage', 'newBusiness', 'partners', 'recap', 'customerGrowth'], 'the sample\'s key order');
      });
    });

    rt('X-import-plan-roundtrip-sample', 'The sample data round-trips through its own mapping', function (a) {
      return sample().then(function (res) { same(a, res, window.PLAN_DATA, 'sample'); });
    });

    rt('X-import-plan-roundtrip-reverse', 'Reading the workbooks in reverse order gives the regions in mapping order all the same', function (a) {
      var files = W.files(T_FIXTURE('miniP4'), MAPS.miniP4).reverse();
      return TAP.importPlan.run(files, MAPS.miniP4, { now: NOW }).then(function (res) {
        a.deepEqual(res.plan.regions.map(function (r) { return r.id; }), T_FIXTURE('miniP4').regions.map(function (r) { return r.id; }));
        same(a, res, expectP4(), 'reversed');
      });
    });

    rt('X-import-plan-roundtrip-filter', 'A recap sheet filtered to another region fails that region only; the plan holds the rest and is usable', function (a) {
      var plan = T_FIXTURE('miniP4'), books = W.workbooks(plan, MAPS.miniP4), spec = MAPS.miniP4.sections.revenue;
      var files = books.map(function (b) {
        if (b.regionId === 'bravo') b.wb.Sheets[spec.sheet][spec.filterCell] = { t: 's', v: 'Region A' };
        return new File([W.toArrayBuffer(b.wb)], b.fileName, { lastModified: Date.parse('2026-09-28T10:00:00Z') });
      });
      return TAP.importPlan.run(files, MAPS.miniP4, { now: NOW }).then(function (res) {
        var bravo = res.regions.filter(function (r) { return r.id === 'bravo'; })[0];
        a.equal(bravo.ok, false, 'Region B is left out');
        a.ok(bravo.errors.some(function (e) { return e.sheet === spec.sheet && e.cell === spec.filterCell; }), 'the error names the filter cell');
        a.deepEqual(res.plan.regions.map(function (r) { return r.id; }), ['alpha', 'charlie', 'delta']);
        a.equal(res.usable, true, TAP.importWrite.report(res));
        a.deepEqual(res.missing, []);
      });
    });

    rt('X-import-plan-roundtrip-repeat', 'Running the import twice gives identical plans apart from the times', function (a) {
      var plan = T_FIXTURE('miniP4'), files = W.files(plan, MAPS.miniP4);
      return TAP.importPlan.run(files, MAPS.miniP4, { now: NOW }).then(function (first) {
        return TAP.importPlan.run(files, MAPS.miniP4, { now: '2026-10-13T09:00:00Z' }).then(function (second) {
          var t1 = TAP.importWrite.text(first.plan).split(NOW).join('T'), t2 = TAP.importWrite.text(second.plan).split('2026-10-13T09:00:00Z').join('T');
          a.equal(t1, t2, 'the data file text is the same apart from generatedAt and importedAt');
        });
      });
    });
  });
})(window.TAP);
