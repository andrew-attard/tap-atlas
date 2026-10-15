/*
 * File: tests/test-import-core.js
 * Purpose: Tests of the in-app import, READ stream (docs/ARCHITECTURE.md section 20): the workbook reader, the mapping,
 *          the value kinds, the field tables, the row sections and the grid blocks. Tiny workbooks are built here with
 *          SheetJS itself, so nothing depends on the workbook writer fixture.
 * Provides: test cases TPV-TC-798 to TPV-TC-826, X-notes2-read-kinds (the readers' note kinds, D163), TPV-TC-868 to 871 (D158, D160)
 * Depends on: tests/harness.js, the app scripts, vendor/xlsx.mini.min.js, config/import-map.js, data/sample-plan-data.js
 * Used by: tests.html
 * Owner: READ stream (#585)
 */
(function (TAP) {
  'use strict';

  var ERR = { cell: { t: 'e', v: 23 } };                 // a #REF! error cell
  var FORMULA = { cell: { t: 'n', f: 'A1+1' } };         // a formula with no stored result

  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  function sampleMap() { return copy(window.IMPORT_MAP); }

  // A cell of the right type for a plain value, or the typed cell given as { cell: {...} }
  function typed(v) {
    if (v && typeof v === 'object' && v.cell) return v.cell;
    return { t: typeof v === 'number' ? 'n' : typeof v === 'boolean' ? 'b' : 's', v: v };
  }

  // sheets: { name: [[row], ...] } or { name: { 'B9': value, ... } }; opts: { name, modified, sheets }
  function open(sheets, opts) {
    opts = opts || {};
    var wb = XLSX.utils.book_new();
    Object.keys(sheets).forEach(function (name) {
      var def = sheets[name], ws;
      if (Array.isArray(def)) ws = XLSX.utils.aoa_to_sheet(def);
      else {
        ws = {};
        var range = { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };
        Object.keys(def).forEach(function (a) {
          if (def[a] === null) return;
          ws[a] = typed(def[a]);
          var p = XLSX.utils.decode_cell(a);
          range.e.c = Math.max(range.e.c, p.c);
          range.e.r = Math.max(range.e.r, p.r);
        });
        ws['!ref'] = XLSX.utils.encode_range(range);
      }
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    if (opts.modified) wb.Props = { ModifiedDate: opts.modified };
    var buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return TAP.xlsxBook.open(buf, opts.name || 'North America plan.xlsx', opts.sheets);
  }

  // A reading context over a normalized mapping, collecting notes and errors
  function ctx(map, over) {
    var m = TAP.importMap.normalize(map || window.IMPORT_MAP);
    var V = TAP.importValues.create(m.lookups, m.aliases, m.meta.numberFormat, m.placeholders);
    var c = { regionId: 'na', years: m.meta.years, V: V, map: m, notes: [], errors: [] };
    c.note = function (message, sheet, cell) { c.notes.push({ message: message, sheet: sheet, cell: cell }); };
    c.error = function (message, sheet, cell) { c.errors.push({ message: message, sheet: sheet, cell: cell }); };
    return Object.assign(c, over || {});
  }
  function at(list, cell) { return list.filter(function (n) { return n.cell === cell; }); }
  function wordy(a, list) {
    list.forEach(function (n) {
      a.equal(typeof n.message, 'string', 'a message');
      a.ok(n.message.indexOf('[importPanel') < 0, 'wording key exists: ' + n.message);
    });
  }

  var MC_SHEET = {
    C3: 'North America', B9: 'Industry',
    B10: 'Healthcare', D10: 3, E10: 'Core, business critical', F10: 2, G10: '1,200', H10: 500, I10: 100, J10: 1, K10: 2, L10: 3, M10: 1, N10: 'Note',
    B11: 'Retail', D11: 'Great', E11: 2, F11: 2, G11: 300, H11: 100, I11: 50, J11: 2, K11: 2, L11: 2, M11: 'Focus', N11: null,
    G12: 999,                                                    // a spare row: blank industry, a stray value
    B13: 'Other', G13: 50, H13: 0, I13: 0,
    B14: 'Nowhere', D14: 1, M14: 2                               // an industry that is not in the list
  };
  var MC_ITEM = { sourceRow: 10, industryId: 'healthcare', growthPotential: 3, criticality: 3, competitiveIntensity: 2, references: 1,
    expertise: 2, productFit: 3, currentArr: 1200, pipelineTotal: 500, pipelineCreated12m: 100, tier: 1, commentary: 'Note' };

  T.suite('import-core', function () {
    /* ---------- the workbook reader ---------- */

    T.test('TPV-TC-798', 'Stored values come back as they are; blanks, empty text and spaces are null', function (a) {
      var book = open({ S1: [['Text', 5, '', '  ', true, null, 2.5], [null, 'x']] });
      a.ok(TAP.xlsxBook.available(), 'SheetJS is loaded');
      a.deepEqual(book.sheetNames, ['S1']);
      a.equal(book.fileName, 'North America plan.xlsx');
      var s = book.sheet('S1');
      a.equal(s.name, 'S1');
      a.equal(s.loose, false);
      a.equal(s.lastRow, 2);
      a.equal(s.value('A1'), 'Text');
      a.equal(s.value('B1'), 5);
      a.equal(s.value('C1'), null, 'empty text');
      a.equal(s.value('D1'), null, 'spaces');
      a.equal(s.value('E1'), true);
      a.equal(s.value('F1'), null, 'no cell');
      a.equal(s.value('G1'), 2.5);
      a.equal(s.value('a1'), 'Text', 'a lower-case address');
      a.equal(s.value('Z99'), null, 'outside the range');
      a.equal(s.cell('B1').t, 'n');
      a.equal(s.cell('Z99'), null);
    });

    T.test('TPV-TC-799', 'An error cell and a formula without a stored result are marked, not read', function (a) {
      var s = open({ S1: { A1: ERR, B1: FORMULA, C1: 7 } }).sheet('S1');
      a.deepEqual(s.value('A1'), { error: true, found: '#REF!' });
      a.deepEqual(s.value('B1'), { error: true, formula: true });
      a.equal(s.value('C1'), 7);
    });

    T.test('TPV-TC-800', 'A sheet matches exactly, else loosely with a flag, else null; sheets can be restricted', function (a) {
      var book = open({ '1. Market Coverage': [['a']], '6. Recap': [['b']] });
      a.equal(book.sheet('1. Market Coverage').loose, false);
      var loose = book.sheet('  1. market  coverage ');
      a.ok(loose, 'loose match');
      a.equal(loose.loose, true);
      a.equal(loose.name, '1. Market Coverage', 'the sheet keeps its real name');
      a.equal(book.sheet('5. Events'), null);
      var part = open({ '1. Market Coverage': [['a']], '6. Recap': [['b']] }, { sheets: ['6. recap'] });
      a.deepEqual(part.sheetNames, ['1. Market Coverage', '6. Recap'], 'every name is still listed');
      a.equal(part.sheet('1. Market Coverage'), null, 'a sheet left out of the restriction is not loaded');
      a.equal(part.sheet('6. Recap').value('A1'), 'b', 'a loosely named restriction still loads the sheet');
    });

    T.test('TPV-TC-801', 'The saved date is ISO at seconds precision, or null when the workbook has none', function (a) {
      var when = new Date(Date.UTC(2026, 9, 1, 12, 30, 15, 700));
      a.equal(open({ S1: [[1]] }, { modified: when }).modified, '2026-10-01T12:30:15Z');
      a.equal(open({ S1: [[1]] }).modified, null);
    });

    T.test('TPV-TC-802', 'Column helpers, including two- and three-letter columns, serial dates and iso()', function (a) {
      var X = TAP.xlsxBook;
      a.equal(X.colIndex('A'), 1);
      a.equal(X.colIndex('E'), 5);
      a.equal(X.colIndex('Z'), 26);
      a.equal(X.colIndex('AA'), 27);
      a.equal(X.colIndex('AB'), 28);
      a.equal(X.colIndex('aa'), 27, 'lower case');
      a.equal(X.colLetter(5), 'E');
      a.equal(X.colLetter(26), 'Z');
      a.equal(X.colLetter(27), 'AA');
      a.equal(X.colLetter(702), 'ZZ');
      a.equal(X.colLetter(703), 'AAA');
      a.equal(X.addr('E', 5), 'E5');
      a.equal(X.addr(27, 10), 'AA10');
      a.deepEqual(X.split('AA10'), { col: 'AA', row: 10 });
      a.deepEqual(X.split('e5'), { col: 'E', row: 5 });
      a.equal(X.split('5E'), null);
      a.equal(X.serialToDate(25569).toISOString(), '1970-01-01T00:00:00.000Z');
      a.equal(X.serialToDate(46235).toISOString().slice(0, 10), '2026-08-01');
      a.equal(X.iso(new Date(Date.UTC(2026, 9, 1, 12, 0, 0, 500))), '2026-10-01T12:00:00Z');
      a.equal(X.iso(Date.UTC(2026, 0, 2)), '2026-01-02T00:00:00Z', 'a timestamp');
      a.equal(X.iso('not a date'), null);
    });

    /* ---------- the mapping ---------- */

    T.test('TPV-TC-803', 'The sample mapping has no problems and derives the sample data’s sourceMap and lookups exactly', function (a) {
      var M = TAP.importMap;
      a.deepEqual(M.problems(window.IMPORT_MAP), []);
      a.deepEqual(M.sourceMap(window.IMPORT_MAP), window.PLAN_DATA.meta.sourceMap);
      a.deepEqual(window.IMPORT_MAP.lookups, window.PLAN_DATA.lookups);
      a.deepEqual(M.extraSections(window.IMPORT_MAP), []);
      a.equal(M.get(), window.IMPORT_MAP);
      a.deepEqual(M.REQUIRED, ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners', 'recap']);
    });

    T.test('TPV-TC-804', 'Every kind of mapping problem gives one plain sentence', function (a) {
      var M = TAP.importMap;
      function one(label, change) {
        var m = sampleMap();
        var alt = change(m);
        var list = M.problems(alt === undefined ? m : alt);
        a.equal(list.length, 1, label + ': ' + list.join(' | '));
        a.match(list[0] || '', /\.$/, label + ' is a sentence');
        a.ok((list[0] || '[').indexOf('[') < 0, label + ' has its wording: ' + list[0]);
        return list[0];
      }
      one('not an object', function () { return 'x'; });
      one('null', function () { return null; });
      one('no meta', function (m) { delete m.meta; });
      one('years repeat', function (m) { m.meta.years = [2027, 2027, 2028]; });
      one('two years', function (m) { m.meta.years = [2027, 2028]; });
      one('years text', function (m) { m.meta.years = ['2027', '2028', '2029']; });
      one('regions not a list', function (m) { m.regions = {}; });
      one('region without id', function (m) { delete m.regions[2].id; });
      one('duplicate region', function (m) { m.regions[1].id = 'na'; });
      one('region without file', function (m) { delete m.regions[0].file; });
      one('no lookups', function (m) { delete m.lookups; });
      one('no channels', function (m) { delete m.lookups.channels; });
      one('no scales', function (m) { delete m.lookups.scales; });
      one('no sections', function (m) { delete m.sections; });
      one('required section missing', function (m) { delete m.sections.partners; });
      one('section not an object', function (m) { m.sections.newBusiness = 'sheet 2'; });
      one('no sheet', function (m) { delete m.sections.marketCoverage.sheet; });
      one('no firstRow', function (m) { delete m.sections.marketCoverage.firstRow; });
      one('no columns', function (m) { delete m.sections.marketCoverage.columns; });
      one('bad column', function (m) { m.sections.marketCoverage.columns.tier = 'm1'; });
      one('two year columns', function (m) { m.sections.newBusiness.columns.arrPotential = ['O', 'P']; });
      one('cells not an object', function (m) { m.sections.customerGrowth.cells = 'N3'; });
      one('cell not an address', function (m) { m.sections.customerGrowth.cells['thresholds.scaledArr'] = 'N'; });
      one('filterCell not an address', function (m) { m.sections.revenue.filterCell = 'C'; });
      one('no rows', function (m) { delete m.sections.recap.rows; });
      one('no cols', function (m) { delete m.sections.recap.cols; });
      one('rows without first', function (m) { delete m.sections.recap.rows.first; });
      one('unknown axis field', function (m) { m.sections.recap.rows.axes[0].field = 'quarter'; });
      one('unknown channel', function (m) { m.sections.recap.cols.axes[0].values = ['direct', 'web']; });
      one('unknown solution', function (m) { m.sections.routes.rows.axes[1].values[1] = 'sol9'; });
      one('unknown type', function (m) { m.sections.strategicPlan.rows.axes[0].values[0] = 'licences'; });
      one('unknown route', function (m) { m.sections.routes.rows.axes[0].values[0] = 'webshop'; });
      one('unknown motion', function (m) { m.sections.recap.rows.axes[1].values = ['newBusiness', 'renewals']; });
      one('year not a plan year', function (m) { m.sections.recap.rows.axes[0].values = [2027, 2028, 2030]; });
      one('bad blank rule', function (m) { m.sections.recap.blank = 'zero'; });
      one('enumerated row without row', function (m) { m.sections.recap.rows = [{ year: 2027, motion: 'newBusiness', type: 'arr' }]; });
      one('enumerated col with unknown field', function (m) { m.sections.recap.cols = [{ col: 'E', partner: 'x' }]; });
      one('extra not a list', function (m) { m.extra = 'none'; });
      one('extra entry incomplete', function (m) { m.extra = [{ id: 'events', title: '5. Events' }]; });
      one('nameCell incomplete', function (m) { m.nameCell = { sheet: '1. Market Coverage' }; });
      // Optional parts may be left out; enumerated axes and a full extra entry are fine
      var ok = sampleMap();
      delete ok.sections.baseYear; delete ok.sections.routes; delete ok.sections.strategicPlan; delete ok.nameCell; delete ok.aliases;
      ok.sections.recap.rows = [{ row: 5, year: 2027, motion: 'newBusiness', type: 'arr' }, { row: 6, year: 2027, motion: 'newBusiness', type: 'services' }];
      ok.sections.recap.cols = [{ col: 'E', channel: 'direct' }];
      ok.extra = [{ id: 'events', title: '5. Events', sheet: '5. Events', firstRow: 8, key: 'event', columns: [{ key: 'event', label: 'Event', unit: 'text', kind: 'IN', column: 'B' }] }];
      a.deepEqual(M.problems(ok), []);
      // Several problems are all listed
      var many = sampleMap();
      delete many.meta; delete many.sections.recap; many.regions[1].id = 'na';
      a.equal(M.problems(many).length, 3);
    });

    T.test('TPV-TC-805', 'normalize() copies the mapping and fills the defaults', function (a) {
      var m = sampleMap();
      delete m.sections.recap.blank; delete m.sections.marketCoverage.key; delete m.sections.customerGrowth.idPattern;
      delete m.aliases; delete m.regions[0].filterName;
      var before = copy(m), n = TAP.importMap.normalize(m);
      a.deepEqual(m, before, 'the mapping given is not changed');
      a.ok(n !== m && n.sections !== m.sections, 'a copy');
      a.equal(n.sections.recap.blank, 'null');
      a.equal(n.sections.strategicPlan.blank, 'null');
      a.equal(n.sections.revenue.blank, 'skip', 'a given rule is kept');
      a.equal(n.sections.marketCoverage.key, 'industryId');
      a.equal(n.sections.customerGrowth.idPattern, '{region}-a{nn}');
      a.deepEqual(n.sections.marketCoverage.scale, {});
      a.deepEqual(n.sections.baseYear.headers, {});
      a.deepEqual(n.sections.marketCoverage.headers, { industryId: 'Industry' }, 'given headers are kept');
      a.deepEqual(n.aliases, {});
      a.equal(n.regions[0].filterName, 'North America');
      a.equal(n.regions[5].filterName, 'Middle East & Africa');
    });

    T.test('TPV-TC-806', 'matchRegion finds a region by exact file name, by a pattern with *, in any case', function (a) {
      var M = TAP.importMap, m = sampleMap();
      var hit = M.matchRegion(m, 'North America plan.xlsx');
      a.ok(hit, 'exact');
      a.equal(hit.id, 'na');
      a.equal(hit.name, 'North America');
      a.equal(hit.filterName, 'North America');
      a.equal(hit.spec, m.regions[0]);
      a.equal(M.matchRegion(m, 'NORTH AMERICA PLAN.XLSX').id, 'na', 'case');
      a.equal(M.matchRegion(m, 'Middle East & Africa plan.xlsx').id, 'mea', 'a name with a special character');
      a.equal(M.matchRegion(m, 'Antarctica plan.xlsx'), null);
      m.regions[0].file = 'NA*.xlsx';
      m.regions[1].file = '*Latin America*';
      a.equal(M.matchRegion(m, 'NA 2027 v2.xlsx').id, 'na');
      a.equal(M.matchRegion(m, 'na.XLSX').id, 'na', 'an empty run and a different case');
      a.equal(M.matchRegion(m, 'TAP Latin America (final).xlsx').id, 'latam');
      a.equal(M.matchRegion(m, 'NB.xlsx'), null);
      a.equal(M.glob('*.xlsx', 'a.xlsx'), true);
      a.equal(M.glob('a?.xlsx', 'ab.xlsx'), false, 'only * is a wildcard');
      a.equal(M.glob('plan (1).xlsx', 'Plan (1).XLSX'), true, 'regex characters are literal');
    });

    T.test('TPV-TC-807', 'extraSections() keeps the on-screen parts of each extra entry', function (a) {
      var m = sampleMap();
      m.extra = [{ id: 'events', title: '5. Events', intro: 'Field events.', sheet: '5. Events', firstRow: 8, key: 'event',
        columns: [{ key: 'event', label: 'Event', unit: 'text', kind: 'IN', column: 'B' }, { key: 'budget', label: 'Budget', unit: 'money', kind: 'IN', column: 'F' }] }];
      a.deepEqual(TAP.importMap.extraSections(m), [{ id: 'events', title: '5. Events', intro: 'Field events.',
        columns: [{ key: 'event', label: 'Event', unit: 'text', kind: 'IN', column: 'B' }, { key: 'budget', label: 'Budget', unit: 'money', kind: 'IN', column: 'F' }] }]);
      a.deepEqual(TAP.importMap.extraSections({}), []);
    });

    /* ---------- the value kinds ---------- */

    function values(aliases, numberFormat) {
      return TAP.importValues.create(window.IMPORT_MAP.lookups, aliases || {}, numberFormat || window.IMPORT_MAP.meta.numberFormat);
    }

    T.test('TPV-TC-808', 'Numbers: text with separators and percent signs, a decimal comma, a scale; text and booleans are bad', function (a) {
      var V = values();
      a.equal(V.number(1250.5), 1250.5);
      a.equal(V.number(0), 0, 'zero is a value');
      a.equal(V.number('1,250.5'), 1250.5);
      a.equal(V.number(' 1 250 '), 1250);
      a.equal(V.number('25%'), 0.25);
      a.equal(V.number('-3.5'), -3.5);
      a.equal(V.number(5, 1000), 5000, 'scale');
      a.equal(V.number('1,000', 1000), 1000000, 'scale on text');
      a.ok(V.isBad(V.number('abc')), 'text');
      a.ok(V.isBad(V.number(true)), 'boolean');
      a.ok(V.isBad(V.number(new Date(2026, 0, 1))), 'date');
      a.equal(V.number(null), null);
      a.equal(V.number('   '), null, 'spaces');
      a.equal(V.share('12.5%'), 0.125);
      a.equal(V.share(0.3), 0.3);
      a.equal(V.count('3'), 3);
      var D = values({}, { decimal: ',', thousands: '.' });
      a.equal(D.number('1.250,5'), 1250.5);
      a.equal(D.number('12,5%'), 0.125);
      a.equal(D.number(7), 7);
      a.ok(V.isBad(V.BAD) && !V.isBad(null) && !V.isBad(0) && !V.isBad(''), 'isBad');
    });

    T.test('TPV-TC-809', 'Ratings: a score, its text, a level’s label in any case, an alias; anything else is bad', function (a) {
      var V = values({ scales: { growthPotential: { Strong: 3 } } });
      a.equal(V.rating(3, 'growthPotential'), 3);
      a.equal(V.rating('2', 'growthPotential'), 2);
      a.equal(V.rating('Strong dynamics, business to take', 'growthPotential'), 3);
      a.equal(V.rating('  healthy DYNAMICS,  large untapped base ', 'growthPotential'), 2);
      a.equal(V.rating('Strong', 'growthPotential'), 3, 'alias');
      a.ok(V.isBad(V.rating('Strong', 'criticality')), 'an alias of another scale');
      a.ok(V.isBad(V.rating(4, 'growthPotential')));
      a.ok(V.isBad(V.rating(0, 'growthPotential')));
      a.ok(V.isBad(V.rating(1.5, 'growthPotential')));
      a.ok(V.isBad(V.rating('Tier 2', 'growthPotential')));
      a.equal(V.rating(null, 'growthPotential'), null);
      a.equal(V.read('rating:criticality', 'Core, business critical'), 3, 'read() splits the kind');
    });

    T.test('TPV-TC-810', 'Tiers: 1 to 3, their text, a tier’s name, an alias; "Tier 2" is bad without one', function (a) {
      var V = values();
      a.equal(V.tier(2), 2);
      a.equal(V.tier('1'), 1);
      a.equal(V.tier('Focus'), 2);
      a.equal(V.tier('group PRIORITY'), 1);
      a.equal(V.tier('Opportunistic'), 3);
      a.ok(V.isBad(V.tier('Tier 2')));
      a.ok(V.isBad(V.tier(4)));
      a.ok(V.isBad(V.tier(true)));
      a.equal(V.tier(null), null);
      a.equal(values({ tiers: { 'Tier 2': 2 } }).tier('Tier 2'), 2, 'alias');
    });

    T.test('TPV-TC-811', 'Lookup ids: the id, the name in any case or spacing, an alias; maturity stays text without its lookup', function (a) {
      var V = values({ industries: { 'Health care': 'healthcare' } });
      a.equal(V.id('healthcare', 'industries'), 'healthcare');
      a.equal(V.id('Healthcare', 'industries'), 'healthcare');
      a.equal(V.id(' HEALTHCARE ', 'industries'), 'healthcare');
      a.equal(V.id('Health care', 'industries'), 'healthcare', 'alias');
      a.ok(V.isBad(V.id('Nowhere', 'industries')));
      a.equal(V.id('Alliance  A', 'channels'), 'allianceA');
      a.equal(V.id('Strategic', 'partnerMaturity'), 'strategic');
      a.equal(V.read('industry', 'Retail'), 'retail');
      a.equal(V.read('productLine', 'Product line 2'), 'pl2');
      a.equal(V.read('segment', 'Core'), 'core');
      a.equal(V.read('solution', 'Solution 2'), 'sol2');
      a.equal(V.read('partnerType', 'System integrator'), 'si');
      a.equal(V.read('category', 'Recurring'), 'recurring');
      a.equal(V.read('route', 'Own sales force'), 'ownSales');
      a.equal(V.read('partnerChannel', 'Partner'), 'partner');
      a.ok(V.isBad(V.read('partnerChannel', 'Direct')), 'a partner is never direct');
      a.ok(V.isBad(V.read('maturity', 'Developing')), 'unknown with the lookup');
      var lk = copy(window.IMPORT_MAP.lookups);
      delete lk.partnerMaturity;
      delete lk.solutions;
      var free = TAP.importValues.create(lk, {}, null);
      a.equal(free.read('maturity', ' Developing '), 'Developing', 'kept as text, trimmed');
      a.ok(free.isBad(free.read('solution', 'Solution 1')), 'other lookups that are missing give bad');
    });

    T.test('TPV-TC-812', 'Risk levels, months from a serial, a date or text, and years', function (a) {
      var V = values({ riskLevel: { H: 'high' } });
      a.equal(V.risk('High'), 'high');
      a.equal(V.risk('LOW'), 'low');
      a.equal(V.risk('medium'), 'medium');
      a.equal(V.risk('H'), 'high', 'alias');
      a.ok(V.isBad(V.risk('Severe')));
      a.equal(V.risk(null), null);
      a.equal(V.month(46235), '2026-08', 'a serial');
      a.equal(V.month('2026-08'), '2026-08');
      a.equal(V.month('2026-08-15'), '2026-08');
      a.equal(V.month(new Date(2026, 7, 15)), '2026-08', 'a date');
      a.ok(V.isBad(V.month('August 2026')));
      a.ok(V.isBad(V.month(true)));
      a.equal(V.year(2026), 2026);
      a.equal(V.year('2026'), 2026);
      a.ok(V.isBad(V.year('next year')));
      a.ok(V.isBad(V.year(2026.5)));
      a.equal(V.year(null), null);
    });

    T.test('TPV-TC-813', 'read() dispatches by kind, keeps text as written, and carries an error marker as bad', function (a) {
      var V = values();
      a.equal(V.read('money', null), null);
      a.equal(V.read('text', null), null);
      a.equal(V.read('text', ''), null);
      a.equal(V.read('text', 'As written  '), 'As written  ');
      a.equal(V.read('text', 12), '12');
      a.equal(V.read('money', '1,000', 1000), 1000000);
      a.equal(V.read('share', '40%'), 0.4);
      a.equal(V.read('count', 3), 3);
      a.equal(V.read('number', 1.5), 1.5);
      a.equal(V.read('tier', 'Focus'), 2);
      a.equal(V.read('risk', 'Low'), 'low');
      a.equal(V.read('month', '2026-08'), '2026-08');
      a.equal(V.read('year', '2026'), 2026);
      var bad = V.read('money', { error: true, found: '#REF!' });
      a.ok(V.isBad(bad), 'an error cell is bad');
      a.equal(bad.found, '#REF!', 'and keeps what the cell shows');
      a.ok(V.isBad(V.read('text', { error: true, formula: true })), 'a formula without a value is bad for every kind');
      a.equal(V.norm('  A  b\tc '), 'a b c');
      a.equal(V.text('x'), 'x');
    });

    /* ---------- placeholders: the template's dropdown texts (D158, #599) ---------- */

    var PH = ['Select channel', 'Choose…', 'Select industry', '(select)'];

    T.test('TPV-TC-868', 'A dropdown placeholder reads as null for every kind, matched in any case or spacing', function (a) {
      var V = TAP.importValues.create(window.IMPORT_MAP.lookups, {}, window.IMPORT_MAP.meta.numberFormat, PH);
      a.equal(V.read('number', 'Select channel'), null, 'a number');
      a.equal(V.read('money', '  select  CHANNEL ', 1000), null, 'in any case or spacing, with a scale');
      a.equal(V.read('text', 'Select industry'), null, 'a text');
      a.equal(V.read('rating:growthPotential', '(select)'), null, 'a rating');
      a.equal(V.read('partnerChannel', 'Select channel'), null, 'a partner channel');
      a.equal(V.read('industry', 'Select industry'), null, 'a lookup name');
      a.equal(V.read('tier', 'Choose…'), null, 'a tier');
      a.equal(V.read('risk', '(select)'), null, 'a risk level');
      a.equal(V.placeholder('Select channel'), true);
      a.equal(V.placeholder(' SELECT channel '), true);
      a.equal(V.placeholder('Partner'), false);
      a.equal(V.placeholder(5), false, 'only text');
      a.equal(V.placeholder(null), false);
      a.equal(V.read('text', 'Select'), 'Select', 'a text that is not listed is read as written');
      a.ok(V.isBad(V.read('number', 'Select')), 'and is still bad where a number belongs');
      a.equal(V.read('partnerChannel', 'Partner'), 'partner', 'a real value still reads');
      var none = TAP.importValues.create(window.IMPORT_MAP.lookups, {}, null);
      a.equal(none.read('text', 'Select channel'), 'Select channel', 'without placeholders the text is read as written');
      a.ok(none.isBad(none.read('partnerChannel', 'Select channel')), 'and is bad where a channel belongs');
      a.equal(none.placeholder('Select channel'), false);
    });

    T.test('TPV-TC-869', 'In a section a placeholder in a number, name, rating or channel cell is null with no note; in the key column it marks a spare row', function (a) {
      var m = sampleMap();
      m.placeholders = ['Select channel', 'Select level', 'Select partner', 'Enter a number', 'Select rating', 'Select industry'];
      var pt = { B19: 'Partner',
        B20: 'Fictional Partner 1', C20: 'Select channel', D20: 'Select level', E20: 'Home', G20: 'Enter a number', H20: 3, J20: 80, K20: 80, L20: 80,
        B21: 'Select partner', C21: 'Partner', G21: 2,              // a spare row: its key cell shows the placeholder
        B22: 'Fictional Partner 3', C22: 'Alliance A', G22: 1 };
      var c = ctx(m), book = open({ '4. Partner': pt });
      var raw = TAP.importRows.read(book.sheet('4. Partner'), c.map.sections.partners, TAP.importFields.SECTIONS.partners, c);
      a.equal(raw.skipped, 1, 'the placeholder row is a spare row, counted');
      a.deepEqual(raw.items.map(function (p) { return p.sourceRow; }), [20, 22], 'and left out');
      a.equal(raw.items[0].channel, null, 'a channel placeholder');
      a.equal(raw.items[0].maturity, null, 'a maturity placeholder');
      a.equal(raw.items[0].fteSales, null, 'a number placeholder');
      a.equal(raw.items[0].fteConsultants, 3, 'a value beside it');
      a.equal(raw.items[1].channel, 'allianceA');
      a.deepEqual(c.notes, [], 'no note for a placeholder');
      a.deepEqual(c.errors, []);
      // A rating cell and the key column on Market Coverage; a name (an industry) and a number on Customer Growth
      var mc = copy(MC_SHEET);
      mc.D10 = 'Select rating';
      mc.B11 = 'Select industry';
      var c2 = ctx(m), book2 = open({ '1. Market Coverage': mc, '3. Customer Growth': Object.assign(copy(CG_SHEET), { D10: 'Select industry', G10: 'Enter a number' }) });
      var mcRead = TAP.importRows.read(book2.sheet('1. Market Coverage'), c2.map.sections.marketCoverage, TAP.importFields.SECTIONS.marketCoverage, c2);
      a.equal(mcRead.skipped, 2, 'the blank spare row and the placeholder row');
      a.deepEqual(mcRead.items.map(function (r) { return r.sourceRow; }), [10, 13, 14]);
      a.equal(mcRead.items[0].growthPotential, null, 'a rating placeholder');
      a.equal(mcRead.items[0].criticality, 3, 'the rating beside it');
      var cg = TAP.importRows.customerGrowth(book2, c2.map, c2);
      a.equal(cg.accounts[0].industryId, null, 'an industry placeholder');
      a.equal(cg.accounts[0].currentArr, null, 'a number placeholder');
      a.equal(cg.accounts[0].riskLevel, 'high');
      a.deepEqual(at(c2.notes, 'D10'), [], 'no note on the rating');
      a.deepEqual(c2.notes.filter(function (n) { return n.sheet === '3. Customer Growth'; }), [], 'no note on Customer Growth');
      a.equal(at(c2.notes, 'B14').length, 1, 'an industry that is not listed is still noted');
      // Without the placeholders in the mapping the same cells are unknown values: notes, and the row is read
      var c3 = ctx();
      var plain = TAP.importRows.read(book2.sheet('1. Market Coverage'), c3.map.sections.marketCoverage, TAP.importFields.SECTIONS.marketCoverage, c3);
      a.equal(plain.skipped, 1);
      a.equal(at(c3.notes, 'D10').length, 1, 'the rating placeholder is noted as an unknown value');
      a.equal(at(c3.notes, 'B11').length, 1, 'and the key placeholder as an unknown industry');
    });

    T.test('TPV-TC-870', 'normalize() defaults placeholders to []; problems() refuses a list that is not of texts', function (a) {
      var M = TAP.importMap;
      a.deepEqual(M.normalize(sampleMap()).placeholders, []);
      a.equal(Object.prototype.hasOwnProperty.call(window.IMPORT_MAP, 'placeholders'), false, 'the sample mapping lists none');
      a.deepEqual(M.problems(window.IMPORT_MAP), []);
      var given = sampleMap();
      given.placeholders = ['Select channel', 'Choose…'];
      a.deepEqual(M.normalize(given).placeholders, ['Select channel', 'Choose…'], 'a given list is kept');
      a.deepEqual(M.problems(given), [], 'a list of texts is fine');
      var empty = sampleMap();
      empty.placeholders = [];
      a.deepEqual(M.problems(empty), [], 'an empty list is fine');
      ['x', ['a', 1], {}, [null], [''], 7].forEach(function (bad) {
        var m = sampleMap();
        m.placeholders = bad;
        var list = M.problems(m);
        a.equal(list.length, 1, JSON.stringify(bad) + ': ' + list.join(' | '));
        a.match(list[0] || '', /\.$/, 'a sentence');
        a.ok((list[0] || '[').indexOf('[') < 0, 'has its wording: ' + list[0]);
        a.match(list[0] || '', /placeholders/, 'names the key');
      });
    });

    /* ---------- the field tables ---------- */

    T.test('TPV-TC-814', 'SECTIONS gives every row section its kinds, key, by-year fields and order', function (a) {
      var S = TAP.importFields.SECTIONS;
      a.deepEqual(Object.keys(S).sort(), ['baseYear', 'customerGrowth', 'marketCoverage', 'newBusiness', 'partners']);
      Object.keys(S).forEach(function (k) {
        a.deepEqual(S[k].order, Object.keys(S[k].fields), k + ': order is the field order');
        a.ok(S[k].fields[S[k].key], k + ': the key is a field');
        S[k].byYear.forEach(function (f) { a.ok(S[k].fields[f], k + '.' + f + ' is a field'); });
      });
      var mc = S.marketCoverage.fields;
      a.equal(mc.industryId, 'industry');
      a.equal(mc.growthPotential, 'rating:growthPotential');
      a.equal(mc.productFit, 'rating:productFit');
      a.equal(mc.currentArr, 'money');
      a.equal(mc.tier, 'tier');
      a.equal(mc.commentary, 'text');
      a.equal(S.marketCoverage.key, 'industryId');
      a.deepEqual(S.marketCoverage.byYear, []);
      var nb = S.newBusiness.fields;
      a.equal(nb['channelSplit.direct'], 'share');
      a.equal(nb['growth.year3'], 'share');
      a.equal(nb.targetAccounts, 'count');
      a.equal(nb.hitRate, 'share');
      a.equal(nb.avgDealSize, 'number');
      a.equal(nb.arrPotential, 'money');
      a.equal(nb.servicesRatio, 'share');
      a.equal(nb.solution, 'solution');
      a.equal(nb.tier, 'tier');
      a.deepEqual(S.newBusiness.byYear, ['arrPotential', 'servicesPotential']);
      var cg = S.customerGrowth.fields;
      a.equal(cg.name, 'text');
      a.equal(cg.productLine, 'productLine');
      a.equal(cg.riskLevel, 'risk');
      a.equal(cg.multiplier3y, 'number');
      a.equal(cg.segment, 'segment');
      a.deepEqual(S.customerGrowth.byYear, ['growthPct', 'incrementalArr', 'servicesOrderIntake']);
      a.equal(S.customerGrowth.key, 'name');
      var pt = S.partners.fields;
      a.equal(pt.channel, 'partnerChannel');
      a.equal(pt.maturity, 'maturity');
      a.equal(pt.type, 'partnerType');
      a.equal(pt.fteConsultants, 'count');
      a.equal(pt.centralSupportPct, 'share');
      a.equal(pt.supportPct, 'share');
      a.equal(pt.distribution, 'money');
      a.deepEqual(S.partners.byYear, ['arr', 'services', 'supportPct', 'distribution', 'servicesFromPartners']);
      a.equal(S.baseYear.fields.category, 'category');
      a.equal(S.baseYear.fields.coverage, 'number');
      a.equal(S.baseYear.fields.budget, 'money');
      a.equal(S.baseYear.key, 'category');
      // Every column the sample mapping maps is a known field
      ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners', 'baseYear'].forEach(function (k) {
        Object.keys(window.IMPORT_MAP.sections[k].columns).forEach(function (f) { a.ok(S[k].fields[f], k + '.' + f + ' is known'); });
      });
      a.deepEqual(TAP.importFields.EXTRA_UNITS, { money: 'money', pct: 'share', count: 'count', text: 'text' });
    });

    /* ---------- the row sections ---------- */

    T.test('TPV-TC-815', 'Market Coverage rows: values by kind, a spare row skipped, a bad rating noted, an unknown industry left out', function (a) {
      var c = ctx(), book = open({ '1. Market Coverage': MC_SHEET });
      var res = TAP.importRows.section(book, c.map, 'marketCoverage', c);
      a.equal(res.present, true);
      a.equal(res.items.length, 3, 'Healthcare, Retail and Other');
      a.deepEqual(res.items[0], MC_ITEM);
      a.deepEqual(Object.keys(res.items[0]), Object.keys(MC_ITEM), 'the Data Contract’s field order');
      a.equal(res.items[1].sourceRow, 11);
      a.equal(res.items[1].growthPotential, null, 'an unknown rating is null');
      a.equal(res.items[1].tier, 2, 'a tier by name');
      a.equal(res.items[1].commentary, null);
      a.deepEqual(res.items[2], { sourceRow: 13, industryId: 'other', growthPotential: null, criticality: null, competitiveIntensity: null,
        references: null, expertise: null, productFit: null, currentArr: 50, pipelineTotal: 0, pipelineCreated12m: 0, tier: null, commentary: null });
      var d11 = at(c.notes, 'D11');
      a.equal(d11.length, 1, 'one note for the bad rating');
      a.equal(d11[0].sheet, '1. Market Coverage');
      a.match(d11[0].message, /Great/, 'the note names the value');
      a.match(d11[0].message, /growthPotential/, 'and the field');
      var b14 = at(c.notes, 'B14');
      a.equal(b14.length, 1, 'one note for the unknown industry');
      a.match(b14[0].message, /Nowhere/);
      a.equal(c.notes.length, 2, 'no other notes');
      a.deepEqual(c.errors, []);
      wordy(a, c.notes);
      var raw = TAP.importRows.read(book.sheet('1. Market Coverage'), c.map.sections.marketCoverage, TAP.importFields.SECTIONS.marketCoverage, ctx());
      a.equal(raw.skipped, 1, 'the spare row is counted');
      a.equal(raw.items.length, 4, 'read() keeps the unknown industry row; section() drops it');
      a.deepEqual(TAP.importRows.section(book, c.map, 'partners', ctx()), { present: false, items: [] }, 'a missing sheet');
    });

    T.test('TPV-TC-816', 'A heading not where the mapping says is an error naming the cell, and the sheet is not read', function (a) {
      var c = ctx(), bad = copy(MC_SHEET);
      bad.B9 = 'Sector';
      var res = TAP.importRows.section(open({ '1. Market Coverage': bad }), c.map, 'marketCoverage', c);
      a.deepEqual(res, { present: true, items: [] });
      a.equal(c.errors.length, 1);
      a.equal(c.errors[0].cell, 'B9');
      a.equal(c.errors[0].sheet, '1. Market Coverage');
      a.match(c.errors[0].message, /Industry/, 'names the heading expected');
      a.match(c.errors[0].message, /Sector/, 'and the one found');
      a.deepEqual(c.notes, []);
      var loose = copy(MC_SHEET);
      loose.B9 = '  industry ';
      var c2 = ctx();
      TAP.importRows.section(open({ '1. Market Coverage': loose }), c2.map, 'marketCoverage', c2);
      a.deepEqual(c2.errors, [], 'case and spacing do not matter');
      var none = copy(MC_SHEET);
      delete none.B9;
      var c3 = ctx();
      TAP.importRows.section(open({ '1. Market Coverage': none }), c3.map, 'marketCoverage', c3);
      a.equal(c3.errors.length, 1, 'a blank heading cell is a mismatch too');
      wordy(a, c.errors);
    });

    var NB_SHEET = {
      B14: 'Industry', D14: 'Sub-industry',
      B15: 'Healthcare', C15: 'East', D15: 'Labs', E15: '60%', F15: 0.4, G15: 0, H15: 0, I15: 10, J15: 0.2, K15: 80, L15: 0.1, M15: 0.1,
      N15: 'Refs', O15: 160, P15: 176, Q15: 193.6, R15: 32, S15: 35.2, T15: 38.72, U15: 0.2, V15: 'Solution 1', W15: 2,
      B16: 'Retail', C16: 'West', D16: 'Stores', E16: 1, F16: 0, G16: 0, H16: 0, I16: 5, J16: 0.5, K16: '20', O16: 50, P16: 50, Q16: 50, U16: 0.1,
      B17: 'Utilities', C17: 'North', I17: 1
    };
    var NB_ITEM = { sourceRow: 15, industryId: 'healthcare', tier: 1, market: 'East', subVertical: 'Labs',
      channelSplit: { direct: 0.6, partner: 0.4, allianceA: 0, allianceB: 0 }, targetAccounts: 10, hitRate: 0.2, avgDealSize: 80,
      growth: { year2: 0.1, year3: 0.1 }, successFactors: 'Refs', arrPotential: [160, 176, 193.6], servicesPotential: [32, 35.2, 38.72],
      servicesRatio: 0.2, solution: 'sol1' };

    T.test('TPV-TC-817', 'New Business rows: dotted paths, by-year lists, the tier from Market Coverage and the cross-check note', function (a) {
      var m = sampleMap();
      m.sections.newBusiness.columns.tier = 'W';
      var book = open({ '1. Market Coverage': MC_SHEET, '2. New Business': NB_SHEET }), c = ctx(m);
      c.marketCoverage = TAP.importRows.section(book, c.map, 'marketCoverage', c).items;
      var res = TAP.importRows.section(book, c.map, 'newBusiness', c);
      a.equal(res.present, true);
      a.equal(res.items.length, 3);
      a.deepEqual(res.items[0], NB_ITEM);
      a.deepEqual(Object.keys(res.items[0]), Object.keys(NB_ITEM), 'tier follows industryId, as in the Data Contract');
      var w15 = at(c.notes, 'W15');
      a.equal(w15.length, 1, 'the mapped tier (2) differs from Market Coverage (1): one note');
      a.match(w15[0].message, /2/);
      a.equal(w15[0].sheet, '2. New Business');
      a.equal(res.items[1].tier, 2, 'a blank tier column: the Market Coverage tier');
      a.equal(res.items[1].avgDealSize, 20, 'a number written as text');
      a.equal(res.items[1].solution, null, 'a blank solution');
      a.deepEqual(res.items[1].servicesPotential, [null, null, null], 'blank by-year cells');
      a.equal(res.items[1].successFactors, null);
      a.equal(res.items[2].tier, null, 'no Market Coverage row: null, for the contract check');
      a.equal(at(c.notes, 'W16').length, 0, 'no note when the column is blank');
      a.equal(at(c.notes, 'W17').length, 0);
      wordy(a, c.notes);
      // Without a mapped tier column, the tier is still derived and sits in the same place
      var c2 = ctx();
      c2.marketCoverage = c.marketCoverage;
      var plain = TAP.importRows.section(book, c2.map, 'newBusiness', c2);
      a.deepEqual(plain.items[0], NB_ITEM);
      a.deepEqual(Object.keys(plain.items[0]), Object.keys(NB_ITEM));
      a.deepEqual(c2.notes, [], 'nothing to cross-check');
    });

    T.test('TPV-TC-871', 'A New Business row for a Tier 3 industry takes tier 3 from Market Coverage, with no note (D160)', function (a) {
      var mc = copy(MC_SHEET);
      mc.M11 = 'Opportunistic';                                   // Retail is Tier 3 in this region
      var book = open({ '1. Market Coverage': mc, '2. New Business': NB_SHEET }), c = ctx();
      c.marketCoverage = TAP.importRows.section(book, c.map, 'marketCoverage', c).items;
      a.equal(c.marketCoverage[1].tier, 3);
      var res = TAP.importRows.section(book, c.map, 'newBusiness', c);
      a.equal(res.items[1].industryId, 'retail');
      a.equal(res.items[1].tier, 3, 'the Market Coverage tier, whatever it is');
      a.equal(res.items[0].tier, 1);
      a.deepEqual(c.notes.filter(function (n) { return n.sheet === '2. New Business'; }), [], 'no note on the New Business sheet');
      // With a mapped tier column that holds 3 too, nothing differs: still no note
      var m = sampleMap();
      m.sections.newBusiness.columns.tier = 'W';
      var sheet = copy(NB_SHEET);
      sheet.W16 = 3;
      delete sheet.W15;
      var c2 = ctx(m), book2 = open({ '1. Market Coverage': mc, '2. New Business': sheet });
      c2.marketCoverage = TAP.importRows.section(book2, c2.map, 'marketCoverage', c2).items;
      var mapped = TAP.importRows.section(book2, c2.map, 'newBusiness', c2);
      a.equal(mapped.items[1].tier, 3);
      a.deepEqual(c2.notes.filter(function (n) { return n.sheet === '2. New Business'; }), []);
    });

    var CG_SHEET = {
      N3: 750, N4: '100', N5: 200, N6: 300, C9: 'Account',
      C10: 'Fictional Account 1', D10: 'Healthcare', E10: 'Country 1', F10: 'Product line 1', G10: 500, H10: 'High', I10: 0.1, J10: 0.1, K10: 0,
      M10: 0.25, N10: 50, O10: 55, P10: 0, Q10: 12.5, R10: 13.75, S10: 0, T10: 131.25, U10: 'Strategic',
      G11: 5,
      C12: 'Fictional Account 2', D12: 'Retail', E12: 'Country 2', F12: 'Product line 2', G12: 80, L12: 1.5, M12: 0.1, N12: 20, O12: 0, P12: 0,
      Q12: 2, R12: 0, S12: 0, T12: 22, U12: 'core'
    };

    T.test('TPV-TC-818', 'Customer Growth: thresholds from cells, accounts with ids from the pattern, a spare row skipped', function (a) {
      var c = ctx(), res = TAP.importRows.customerGrowth(open({ '3. Customer Growth': CG_SHEET }), c.map, c);
      a.equal(res.present, true);
      a.deepEqual(res.thresholds, { strategicArr: 750, scaledArr: 100, growthArr: 200, growthOrderIntake: 300 });
      a.equal(res.accounts.length, 2);
      var first = { sourceRow: 10, id: 'na-a01', name: 'Fictional Account 1', industryId: 'healthcare', country: 'Country 1', productLine: 'pl1',
        currentArr: 500, riskLevel: 'high', growthPct: [0.1, 0.1, 0], multiplier3y: null, servicesRatio: 0.25, incrementalArr: [50, 55, 0],
        servicesOrderIntake: [12.5, 13.75, 0], cumulativeOrderIntake: 131.25, segment: 'strategic' };
      a.deepEqual(res.accounts[0], first);
      a.deepEqual(Object.keys(res.accounts[0]), Object.keys(first), 'sourceRow, id, then the fields');
      a.equal(res.accounts[1].id, 'na-a02', 'numbered over the non-blank rows');
      a.equal(res.accounts[1].sourceRow, 12);
      a.equal(res.accounts[1].riskLevel, null);
      a.equal(res.accounts[1].growthPct, null, 'the multiplier was used: growthPct is null, as the contract says');
      a.equal(res.accounts[1].multiplier3y, 1.5);
      var noMult = copy(CG_SHEET);
      delete noMult.L12;
      var c5 = ctx(), both = TAP.importRows.customerGrowth(open({ '3. Customer Growth': noMult }), c5.map, c5);
      a.deepEqual(both.accounts[1].growthPct, [null, null, null], 'neither given: three blanks');
      a.equal(both.accounts[1].multiplier3y, null);
      a.equal(res.accounts[1].segment, 'core', 'an id as written');
      a.deepEqual(c.notes, []);
      a.deepEqual(c.errors, []);
      var m = sampleMap();
      m.sections.customerGrowth.idPattern = 'acc-{n}';
      var c2 = ctx(m), alt = TAP.importRows.customerGrowth(open({ '3. Customer Growth': CG_SHEET }), c2.map, c2);
      a.deepEqual(alt.accounts.map(function (x) { return x.id; }), ['acc-1', 'acc-2']);
      m.sections.customerGrowth.idPattern = '{initial}{n}';
      var c3 = ctx(m, { regionId: 'alpha' }), ini = TAP.importRows.customerGrowth(open({ '3. Customer Growth': CG_SHEET }), c3.map, c3);
      a.deepEqual(ini.accounts.map(function (x) { return x.id; }), ['a1', 'a2'], '{initial} is the first character of the region id');
      var c4 = ctx(m, { regionId: 'delta' });
      a.deepEqual(TAP.importRows.customerGrowth(open({ '3. Customer Growth': CG_SHEET }), c4.map, c4).accounts.map(function (x) { return x.id; }), ['d1', 'd2']);
      var missing = TAP.importRows.customerGrowth(open({ S1: [[1]] }), c.map, ctx());
      a.equal(missing.present, false);
      a.deepEqual(missing.accounts, []);
    });

    var PT_SHEET = {
      I3: '30%', B19: 'Partner',
      B20: 'Fictional Partner 1', C20: 'Partner', D20: 'Enable', E20: 'Home', F20: 'PL1', G20: 2, H20: '3', I20: 0.1, J20: 80, K20: 80, L20: 80,
      M20: 0, N20: 0, O20: 0, P20: 'Value-added reseller', Q20: 0.1, R20: 0.1, S20: 0.2, T20: 200, U20: 300, V20: 400, W20: 10, X20: 10, Y20: 10,
      B21: 'Fictional Partner 2', C21: 'Direct', D21: 'Unknown level', G21: 1, H21: ERR, J21: FORMULA, K21: 5, L21: 5
    };

    T.test('TPV-TC-819', 'Partners: lookup names to ids, bad values noted with their cells, fixed cells read by kind', function (a) {
      var c = ctx(), book = open({ '4. Partner': PT_SHEET });
      var res = TAP.importRows.section(book, c.map, 'partners', c);
      a.deepEqual(res.items[0], { sourceRow: 20, name: 'Fictional Partner 1', channel: 'partner', maturity: 'enable', expertiseGeo: 'Home',
        expertiseProduct: 'PL1', fteSales: 2, fteConsultants: 3, centralSupportPct: 0.1, arr: [80, 80, 80], services: [0, 0, 0], type: 'var',
        supportPct: [0.1, 0.1, 0.2], distribution: [200, 300, 400], servicesFromPartners: [10, 10, 10] });
      var p2 = res.items[1];
      a.equal(p2.channel, null, 'Direct is not a partner channel');
      a.equal(p2.maturity, null, 'an unknown level with the lookup present');
      a.equal(p2.fteConsultants, null, 'an error cell');
      a.deepEqual(p2.arr, [null, 5, 5], 'a formula without a value');
      a.equal(p2.type, null);
      a.deepEqual(p2.supportPct, [null, null, null]);
      a.equal(at(c.notes, 'C21').length, 1);
      a.equal(at(c.notes, 'D21').length, 1);
      a.match(at(c.notes, 'H21')[0].message, /#REF!/, 'the error cell’s text');
      a.equal(at(c.notes, 'J21').length, 1, 'the formula without a value');
      a.ok(at(c.notes, 'J21')[0].message !== at(c.notes, 'H21')[0].message, 'its own wording');
      a.equal(c.notes.length, 4);
      c.notes.forEach(function (n) { a.equal(n.sheet, '4. Partner'); });
      wordy(a, c.notes);
      var S = TAP.importFields.SECTIONS;
      a.deepEqual(TAP.importRows.cells(book.sheet('4. Partner'), c.map.sections.partners.cells, S.partners.cells, c), { outsourcingPct: 0.3 });
      a.deepEqual(TAP.importRows.cells(book.sheet('4. Partner'), { 'thresholds.strategicArr': 'Z1', 'thresholds.scaledArr': 'I3' },
        S.customerGrowth.cells, c), { thresholds: { strategicArr: null, scaledArr: 0.3 } }, 'dotted cell paths nest; a blank cell is null');
    });

    var BY_SHEET = { C4: 2026, C5: '2026-08', B8: 'Recurring', C8: 520, D8: 500, E8: 300, F8: 500, G8: 2.5, B9: 'Services', C9: 100, D9: 90, E9: 50, F9: 100 };

    T.test('TPV-TC-820', 'The base year: header cells, one item per category, coverage only when mapped', function (a) {
      var c = ctx(), res = TAP.importRows.baseYear(open({ '7. Order Intake': BY_SHEET }), c.map, c);
      a.equal(res.present, true);
      a.deepEqual(res.value, { year: 2026, actualsThrough: '2026-08', items: [
        { sourceRow: 8, category: 'recurring', budget: 520, forecast: 500, actuals: 300, pipeline: 500, coverage: 2.5 },
        { sourceRow: 9, category: 'services', budget: 100, forecast: 90, actuals: 50, pipeline: 100, coverage: null }] });
      a.deepEqual(Object.keys(res.value.items[0]), ['sourceRow', 'category', 'budget', 'forecast', 'actuals', 'pipeline', 'coverage']);
      var m = sampleMap();
      delete m.sections.baseYear.columns.coverage;
      var c2 = ctx(m), serial = copy(BY_SHEET);
      serial.C5 = 46235;
      var alt = TAP.importRows.baseYear(open({ '7. Order Intake': serial }), c2.map, c2);
      a.equal(Object.prototype.hasOwnProperty.call(alt.value.items[0], 'coverage'), false, 'no coverage column: no key');
      a.equal(alt.value.actualsThrough, '2026-08', 'a month from a serial date');
      a.deepEqual(TAP.importRows.baseYear(open({ S1: [[1]] }), c.map, ctx()), { present: false, value: null }, 'sheet missing');
      var none = sampleMap();
      delete none.sections.baseYear;
      a.deepEqual(TAP.importRows.baseYear(open({ '7. Order Intake': BY_SHEET }), TAP.importMap.normalize(none), ctx(none)), { present: false, value: null }, 'not mapped');
      a.deepEqual(c.notes, []);
    });

    T.test('TPV-TC-821', 'Extra sections: rows in the extra-section shape, units read as kinds, a missing sheet gives no entry', function (a) {
      var m = sampleMap();
      m.extra = [{ id: 'events', title: '5. Events', intro: 'x', sheet: '5. Events', firstRow: 8, key: 'event', columns: [
        { key: 'event', label: 'Event', unit: 'text', kind: 'IN', column: 'B' }, { key: 'invited', label: 'Accounts invited', unit: 'count', kind: 'IN', column: 'E' },
        { key: 'budget', label: 'Budget', unit: 'money', kind: 'IN', column: 'F' }, { key: 'share', label: 'Share', unit: 'pct', kind: 'DER', column: 'G' }] },
      { id: 'risks', title: '8. Risks', sheet: '8. Risks', firstRow: 5, columns: [{ key: 'risk', label: 'Risk', unit: 'text', kind: 'IN', column: 'B' }] }];
      var c = ctx(m);
      var book = open({ '5. Events': { B8: 'Customer day', E8: 60, F8: 45, G8: '50%', B9: 'Roundtable', E9: 15, E10: 3, B11: 'Webinar', E11: 'many' } });
      var res = TAP.importRows.extra(book, c.map, c);
      a.deepEqual(res, { events: [
        { sourceRow: 8, event: 'Customer day', invited: 60, budget: 45, share: 0.5 },
        { sourceRow: 9, event: 'Roundtable', invited: 15, budget: null, share: null },
        { sourceRow: 11, event: 'Webinar', invited: null, budget: null, share: null }] });
      a.equal(at(c.notes, 'E11').length, 1, 'text in a count column is noted');
      a.equal(at(c.notes, 'E11')[0].sheet, '5. Events');
      a.deepEqual(TAP.importRows.extra(book, TAP.importMap.normalize(window.IMPORT_MAP), ctx()), {}, 'no extra sections mapped');
    });

    /* ---------- the grid blocks ---------- */

    T.test('TPV-TC-822', 'The sample mapping’s axes expand to the sample’s cells: recap, strategic plan and routes', function (a) {
      var G = TAP.importGrid, S = window.IMPORT_MAP.sections;
      var rows = G.expand(S.recap.rows, 'rows');
      a.equal(rows.length, 12);
      a.deepEqual(rows[0], { at: 5, fields: { year: 2027, motion: 'newBusiness', type: 'arr' } });
      a.deepEqual(rows[1], { at: 6, fields: { year: 2027, motion: 'newBusiness', type: 'services' } });
      a.deepEqual(rows[2].fields, { year: 2027, motion: 'customerGrowth', type: 'arr' });
      a.equal(rows[2].at, 7);
      a.deepEqual(rows[4], { at: 9, fields: { year: 2028, motion: 'newBusiness', type: 'arr' } });
      a.equal(rows[11].at, 16);
      a.deepEqual(G.expand(S.recap.cols, 'cols'), [{ at: 'E', fields: { channel: 'direct' } }, { at: 'F', fields: { channel: 'partner' } },
        { at: 'G', fields: { channel: 'allianceA' } }, { at: 'H', fields: { channel: 'allianceB' } }]);
      a.deepEqual(G.expand(S.strategicPlan.rows, 'rows').map(function (r) { return r.at; }), [47, 48, 49, 50]);
      a.deepEqual(G.expand(S.strategicPlan.variance.cols, 'cols').map(function (r) { return r.at; }), ['I', 'J', 'K']);
      var books = G.expand(S.booksValue.rows, 'rows');
      a.equal(books.length, 24);
      a.deepEqual(books[3], { at: 23, fields: { year: 2027, motion: 'newBusiness', type: 'hardware' } });
      a.equal(books[23].at, 43);
      var routes = G.expand(S.routes.rows, 'rows');
      a.equal(routes.length, 42);
      a.deepEqual(routes[0], { at: 55, fields: { route: 'ownSales', solution: null } });
      a.deepEqual(routes[1], { at: 56, fields: { route: 'ownSales', solution: 'sol1' } });
      a.deepEqual(routes[7], { at: 63, fields: { route: 'customerSuccess', solution: null } }, 'stride 8 on the route axis');
      a.equal(routes[41].at, 55 + 5 * 8 + 6);
      var cols = G.expand(S.routes.cols, 'cols');
      a.equal(cols.length, 12);
      a.deepEqual(cols[0], { at: 'E', fields: { year: 2027, type: 'arr' } });
      a.deepEqual(cols[4], { at: 'I', fields: { year: 2028, type: 'arr' } });
      a.deepEqual(cols[11], { at: 'P', fields: { year: 2029, type: 'hardware' } });
    });

    T.test('TPV-TC-823', 'Explicit strides, the mini layouts, columns past Z and enumerated axes', function (a) {
      var G = TAP.importGrid, years = [2027, 2028, 2029];
      var tiny = { first: 5, axes: [{ field: 'motion', values: ['newBusiness', 'customerGrowth'] }, { field: 'type', values: ['arr', 'services'] }, { field: 'year', values: years }] };
      var rows = G.expand(tiny, 'rows');
      a.equal(rows.length, 12);
      a.deepEqual(rows[11], { at: 16, fields: { motion: 'customerGrowth', type: 'services', year: 2029 } }, 'implicit strides: 5 + 6 + 3 + 2');
      // The mini fixture's recap: rows 5 + motion x 16 + type x 8 + year (rows 5 to 7, 13 to 15, 21 to 23, 29 to 31)
      var mini = { first: 5, axes: [{ field: 'motion', values: ['newBusiness', 'customerGrowth'], stride: 16 }, { field: 'type', values: ['arr', 'services'], stride: 8 }, { field: 'year', values: years }] };
      a.deepEqual(G.expand(mini, 'rows').map(function (r) { return r.at; }), [5, 6, 7, 13, 14, 15, 21, 22, 23, 29, 30, 31]);
      var p4 = { first: 30, axes: [{ field: 'motion', values: ['newBusiness', 'customerGrowth'], stride: 12 },
        { field: 'type', values: ['arr', 'services', 'swPerpetual', 'hardware'], stride: 3 }, { field: 'year', values: years }] };
      var hit = G.expand(p4, 'rows').filter(function (r) { return r.fields.motion === 'customerGrowth' && r.fields.type === 'hardware' && r.fields.year === 2028; })[0];
      a.equal(hit.at, 30 + 12 + 9 + 1, 'explicit strides');
      var wide = G.expand({ first: 'Y', axes: [{ field: 'year', values: years }] }, 'cols');
      a.deepEqual(wide.map(function (c) { return c.at; }), ['Y', 'Z', 'AA'], 'past column Z');
      a.deepEqual(G.expand([{ row: 100, route: 'ownSales', type: 'arr', solution: 'sol1' }, { row: 101, route: 'customerSuccess', type: 'arr', solution: null }], 'rows'),
        [{ at: 100, fields: { route: 'ownSales', type: 'arr', solution: 'sol1' } }, { at: 101, fields: { route: 'customerSuccess', type: 'arr', solution: null } }]);
      a.deepEqual(G.expand([{ col: 'E', year: 2027 }, { col: 'G', year: 2029 }], 'cols'), [{ at: 'E', fields: { year: 2027 } }, { at: 'G', fields: { year: 2029 } }]);
      a.deepEqual(G.expand({ first: 'E', axes: [] }, 'cols'), [{ at: 'E', fields: {} }], 'no axis: the one cell');
    });

    var RECAP_SHEET = { E5: 400, F5: 200, G5: 0, H5: 0, E6: 80, F6: '40', H6: ERR, E8: 100 };
    var RECAP_ORDER = ['year', 'sourceCell', 'channel', 'motion', 'type', 'value'];

    T.test('TPV-TC-824', 'A grid block: items in the recap shape with sourceCell, blank cells skipped or null by the rule, an all-blank row adds nothing', function (a) {
      var c = ctx(), book = open({ '4. Partner': RECAP_SHEET });
      var res = TAP.importGrid.block(book, c.map, 'recap', c, 'North America');
      a.equal(res.present, true);
      a.equal(res.items.length, 8, 'E5 to H5, E6, F6, H6 and E8');
      a.deepEqual(res.items[0], { year: 2027, sourceCell: 'E5', channel: 'direct', motion: 'newBusiness', type: 'arr', value: 400 });
      a.deepEqual(Object.keys(res.items[0]), RECAP_ORDER);
      a.deepEqual(res.items[5], { year: 2027, sourceCell: 'F6', channel: 'partner', motion: 'newBusiness', type: 'services', value: 40 }, 'a number as text');
      a.deepEqual(res.items[6], { year: 2027, sourceCell: 'H6', channel: 'allianceB', motion: 'newBusiness', type: 'services', value: null }, 'an error cell is null');
      a.deepEqual(res.items[7], { year: 2027, sourceCell: 'E8', channel: 'direct', motion: 'customerGrowth', type: 'services', value: 100 });
      a.equal(at(c.notes, 'H6').length, 1, 'with a note');
      a.equal(at(c.notes, 'H6')[0].sheet, '4. Partner');
      a.equal(c.notes.length, 1);
      a.deepEqual(c.errors, []);
      wordy(a, c.notes);
      var m = sampleMap();
      m.sections.recap.blank = 'null';
      var c2 = ctx(m), full = TAP.importGrid.block(book, c2.map, 'recap', c2, 'North America');
      a.equal(full.items.length, 12, 'rows 5, 6 and 8 in full; the all-blank rows add nothing');
      a.deepEqual(full.items[6], { year: 2027, sourceCell: 'G6', channel: 'allianceA', motion: 'newBusiness', type: 'services', value: null }, 'a blank cell is null');
      a.deepEqual(full.items[9].sourceCell, 'F8');
      a.equal(full.items[9].value, null);
      var empty = TAP.importGrid.block(open({ '4. Partner': { A1: 'x' } }), c.map, 'recap', ctx(), 'North America');
      a.deepEqual(empty, { present: true, items: [] }, 'a sheet with nothing in the grid');
    });

    T.test('TPV-TC-825', 'The recap sheet’s region filter must name the region, loosely; otherwise an error names the cell', function (a) {
      var c = ctx(), book = open({ '6. Recap': { C2: 'north  AMERICA', E5: 10 } });
      var ok = TAP.importGrid.block(book, c.map, 'revenue', c, 'North America');
      a.equal(ok.items.length, 1);
      a.deepEqual(c.errors, []);
      var other = open({ '6. Recap': { C2: 'All regions', E5: 10 } }), c2 = ctx();
      var res = TAP.importGrid.block(other, c2.map, 'revenue', c2, 'North America');
      a.deepEqual(res, { present: true, items: [], failed: true });
      a.equal(c2.errors.length, 1);
      a.equal(c2.errors[0].cell, 'C2');
      a.equal(c2.errors[0].sheet, '6. Recap');
      a.match(c2.errors[0].message, /All regions/);
      a.match(c2.errors[0].message, /North America/);
      wordy(a, c2.errors);
      var blank = open({ '6. Recap': { E5: 10 } }), c3 = ctx();
      TAP.importGrid.block(blank, c3.map, 'revenue', c3, 'North America');
      a.equal(c3.errors.length, 1, 'a blank filter cell is a mismatch');
      a.deepEqual(TAP.importGrid.block(open({ S1: [[1]] }), c.map, 'revenue', ctx(), 'North America'), { present: false, items: [] }, 'sheet missing');
      a.deepEqual(TAP.importGrid.block(book, c.map, 'nothing', ctx(), 'North America'), { present: false, items: [] }, 'block not mapped');
    });

    T.test('TPV-TC-826', 'The strategic plan reads its variance cells beside the values; routes carry route, type and solution', function (a) {
      var c = ctx(), book = open({ '6. Recap': { C2: 'North America', E47: 600, F47: 650, I47: -20, K47: 5, E100: 400, F100: 400, G100: '500' } });
      var res = TAP.importGrid.block(book, c.map, 'strategicPlan', c, 'North America');
      a.deepEqual(res.items, [
        { year: 2027, sourceCell: 'E47', type: 'arr', value: 600, variance: -20 },
        { year: 2028, sourceCell: 'F47', type: 'arr', value: 650, variance: null },
        { year: 2029, sourceCell: 'G47', type: 'arr', value: null, variance: 5 }], 'row 47 only: the other rows are blank');
      a.deepEqual(Object.keys(res.items[0]), ['year', 'sourceCell', 'type', 'value', 'variance']);
      var m = sampleMap();
      delete m.sections.strategicPlan.variance;
      m.sections.routes.rows = [{ row: 100, route: 'ownSales', type: 'arr', solution: 'sol1' }];
      m.sections.routes.cols = { first: 'E', axes: [{ field: 'year', values: [2027, 2028, 2029] }] };
      var c2 = ctx(m), plain = TAP.importGrid.block(book, c2.map, 'strategicPlan', c2, 'North America');
      a.deepEqual(plain.items[0], { year: 2027, sourceCell: 'E47', type: 'arr', value: 600 }, 'no variance mapping: no key');
      a.deepEqual(plain.items[2], { year: 2029, sourceCell: 'G47', type: 'arr', value: null }, 'blank null: a blank cell in a row with values is an item');
      a.equal(plain.items.length, 3, 'row 47 only');
      var routes = TAP.importGrid.block(book, c2.map, 'routes', c2, 'North America');
      a.deepEqual(routes.items, [
        { route: 'ownSales', year: 2027, sourceCell: 'E100', type: 'arr', value: 400, solution: 'sol1' },
        { route: 'ownSales', year: 2028, sourceCell: 'F100', type: 'arr', value: 400, solution: 'sol1' },
        { route: 'ownSales', year: 2029, sourceCell: 'G100', type: 'arr', value: 500, solution: 'sol1' }]);
      a.deepEqual(Object.keys(routes.items[0]), ['route', 'year', 'sourceCell', 'type', 'value', 'solution']);
      a.deepEqual(c.notes, []);
      a.deepEqual(c2.notes, []);
    });

    // US-1.8.9 (D163): every note the readers raise carries its kind, the row and field in words, and what the cell held
    T.test('X-notes2-read-kinds', 'Reading notes and errors carry kind, item (row and field in words), found and expected', function (a) {
      function kept() {
        var c = ctx(sampleMap());
        c.note = function (m, s, cell, x) { c.notes.push(Object.assign({ message: m, sheet: s, cell: cell }, x || {})); };
        c.error = function (m, s, cell, x) { c.errors.push(Object.assign({ message: m, sheet: s, cell: cell }, x || {})); };
        return c;
      }
      function parts(n) { return [n.kind, n.item, n.found, n.expected]; }
      var c = kept(), book = open({ '1. Market Coverage': MC_SHEET, '4. Partner': PT_SHEET });
      TAP.importRows.section(book, c.map, 'marketCoverage', c);
      a.deepEqual(parts(at(c.notes, 'D11')[0]), ['badValue', 'Retail, ' + TAP.content.text('check.fields.growthPotential'), '"Great"', undefined], 'a bad rating: the row and the field in words, the text found');
      a.deepEqual(parts(at(c.notes, 'B14')[0]), ['unknownIndustry', 'Nowhere, ' + TAP.content.text('check.fields.industryId'), '"Nowhere"', undefined], 'an unknown industry');
      TAP.importRows.section(book, c.map, 'partners', c);
      a.deepEqual(parts(at(c.notes, 'C21')[0]).slice(0, 3), ['badValue', 'Fictional Partner 2, ' + TAP.content.text('check.fields.channel'), '"Direct"'], 'a channel that is not a partner channel');
      a.deepEqual(parts(at(c.notes, 'H21')[0]).slice(0, 3), ['errorCell', 'Fictional Partner 2, ' + TAP.content.text('check.fields.fteConsultants'), '#REF!'], 'an error cell');
      a.deepEqual(parts(at(c.notes, 'J21')[0]).slice(0, 3), ['formulaNoValue', 'Fictional Partner 2, ' + TAP.content.text('check.fields.arr'), TAP.content.text('importPanel.read.noResult')], 'a formula without a value');
      // The tier cross-check names the industry; a heading in the wrong place names the heading expected and found
      var m = sampleMap();
      m.sections.newBusiness.columns.tier = 'W';
      var c2 = kept(); c2.map = TAP.importMap.normalize(m);
      var nb = open({ '1. Market Coverage': MC_SHEET, '2. New Business': NB_SHEET });
      c2.marketCoverage = TAP.importRows.section(nb, c2.map, 'marketCoverage', c2).items;
      TAP.importRows.section(nb, c2.map, 'newBusiness', c2);
      a.deepEqual(parts(at(c2.notes, 'W15')[0]), ['tierDiffers', 'Healthcare', '2', '1'], 'the tier column against Market Coverage, the industry by name');
      var bad = copy(MC_SHEET); bad.B9 = 'Sector';
      var c3 = kept();
      TAP.importRows.section(open({ '1. Market Coverage': bad }), c3.map, 'marketCoverage', c3);
      a.deepEqual(parts(c3.errors[0]), ['headerMismatch', TAP.content.text('check.fields.industryId'), '"Sector"', 'Industry'], 'a heading not where the mapping says');
      // A sheet matched loosely, and a grid cell that is not a number: the item names the axes in words
      var c4 = kept(), loose = open({ '1. market coverage': MC_SHEET, '4. Partner': { E5: 'lots', F5: 10 } });
      TAP.importRows.section(loose, c4.map, 'marketCoverage', c4);
      a.deepEqual(parts(at(c4.notes, null).filter(function (n) { return n.kind === 'looseSheet'; })[0]), ['looseSheet', undefined, '1. market coverage', '1. Market Coverage'], 'the loose sheet: found and expected names');
      TAP.importGrid.block(loose, c4.map, 'recap', c4, 'North America');
      a.deepEqual(parts(at(c4.notes, 'E5')[0]).slice(0, 3), ['badValue', '2027, Direct, new business, ARR', '"lots"'], 'a grid cell: year, channel name, motion and type in words');
      c.notes.concat(c2.notes, c3.errors, c4.notes).forEach(function (n) { a.ok(typeof n.kind === 'string' && n.kind, 'a kind on: ' + n.message); });
      wordy(a, c.notes.concat(c2.notes, c4.notes));
    });
  });
})(window.TAP);
