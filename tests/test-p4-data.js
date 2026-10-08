/*
 * File: tests/test-p4-data.js
 * Purpose: Tests for the Phase 4 Data Contract additions (US-4.1.1): the new lookups, the revenue, books value,
 *          strategic plan, base year and route parts, the partner and solution fields, and their source-map entries;
 *          and for the sample data's full-template parts and planted cases R01 to R10 (US-4.1.3).
 * Provides: test cases TPV-TC-634 to 643, 645, 646, 647 (US-4.1.1); TPV-TC-635, 639, 645, 657, 658, 659, 661, 663, 665,
 *           666 and X-p4-sample-* (US-4.1.3)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, tests/fixtures/mini-data.js,
 *             tests/fixtures/broken-cases.js (withP4: the mini fixture with every Phase 4 part), data/sample-plan-data.js,
 *             tests/fixtures/sample-expected.js (SAMPLE_EXPECT.p4 and r01 to r10, written by the generator)
 * Used by: tests.html
 * Owner: DATA4 stream
 */
(function (TAP) {
  'use strict';

  // The mini fixture's own planted gaps (Region C's empty sections): the only warnings a valid file may give
  var MINI_WARNINGS = ['regions[2].partners', 'regions[2].recap', 'regions[2].customerGrowth.accounts'];

  function p4() { return window.TEST_FIXTURES.broken.withP4(T_FIXTURE('mini')); }
  function messages(list) { return list.map(function (x) { return x.message; }); }
  function paths(list) { return list.map(function (x) { return x.path; }); }

  // Passes the check with no errors and no warnings beyond the mini fixture's own
  function valid(a, plan, what) {
    var res = TAP.check.run(plan);
    a.deepEqual(messages(res.errors), [], what + ': no errors');
    a.deepEqual(paths(res.warnings), MINI_WARNINGS, what + ': no new warnings');
    a.equal(TAP.data.load(plan).ok, true, what + ': the file loads');
  }

  T.suite('p4-data', function () {
    T.test('TPV-TC-634', 'Lookups with solutions and product categories pass the check and are read with every field', function (a) {
      var p = p4();
      valid(a, p, 'solutions and product categories');
      var lk = TAP.data.lookups();
      a.deepEqual(lk.solutions, [{ id: 'sol1', name: 'Solution 1', category: 'recurring' }, { id: 'sol2', name: 'Solution 2', category: 'swPerpetual' }]);
      a.deepEqual(lk.productCategories.map(function (c) { return c.id; }), ['swPerpetual', 'recurring', 'hardware', 'services']);
      a.deepEqual(lk.productCategories.map(function (c) { return c.name; }), ['Software perpetual', 'Recurring', 'Hardware', 'Services']);
      lk.solutions.forEach(function (s) {
        a.ok(lk.productCategories.some(function (c) { return c.id === s.category; }), s.id + ' names a product category');
      });
    });

    T.test('TPV-TC-636', 'A risk level of "low" passes the check and is kept as low; a level outside the set is still an error', function (a) {
      var p = T_FIXTURE('mini');
      p.regions[0].customerGrowth.accounts[0].riskLevel = 'low';     // a1, which had no risk level
      valid(a, p, 'riskLevel low');
      a.equal(TAP.data.row('alpha', 'accounts', function (x) { return x.id === 'a1'; }).riskLevel, 'low', 'read as low');
      // Low is not "at risk": the share stays a2 100 (high) + a4 150 (medium) = 250 of 50 + 100 + 0 + 150 = 300
      var share = TAP.measures.get('cg.riskShare')('alpha', {});
      a.ok(Math.abs(share.v - 250 / 300) < 1e-9, 'the at-risk share counts high and medium only: ' + share.v);

      var bad = T_FIXTURE('mini');
      bad.regions[0].customerGrowth.accounts[0].riskLevel = 'none';
      var e = TAP.check.run(bad).errors;
      a.equal(e.length, 1, 'one error');
      a.equal(e[0].message, 'regions[0].customerGrowth.accounts[0].riskLevel: expected "high", "medium" or "low", found "none"');
      a.equal(e[0].region, 'Region A');
      a.equal(e[0].item, 'Fictional Account A1 (row 10)', 'the same form as before: path, region, item, expected, found');
    });

    T.test('TPV-TC-637', 'A region with revenue and books value lists in the recap item’s shape passes, every item with its six fields', function (a) {
      var p = p4();
      valid(a, p, 'revenue and booksValue');
      var r = TAP.data.region('alpha'), six = ['year', 'sourceCell', 'channel', 'motion', 'type', 'value'];
      a.equal(r.revenue.length, 2);
      a.equal(r.booksValue.length, 5);
      r.revenue.concat(r.booksValue).forEach(function (it) {
        a.deepEqual(Object.keys(it).sort(), six.slice().sort(), 'six fields at ' + it.sourceCell);
        a.equal(typeof it.value, 'number');
      });
      a.deepEqual(Object.keys(r.recap[0]).sort(), six.slice().sort(), 'the same shape as a recap item');
    });

    T.test('TPV-TC-638', 'Books value items of type swPerpetual, hardware, arr and services are all accepted', function (a) {
      var p = p4();
      valid(a, p, 'four books value types');
      var types = TAP.data.region('alpha').booksValue.map(function (it) { return it.type; });
      ['arr', 'services', 'swPerpetual', 'hardware'].forEach(function (t) { a.ok(types.indexOf(t) >= 0, t + ' is in the list'); });
      // "arr" is the recurring category: the lookup names it "recurring", and no category is called "arr"
      var cats = TAP.data.lookups().productCategories.map(function (c) { return c.id; });
      a.ok(cats.indexOf('recurring') >= 0 && cats.indexOf('arr') < 0, 'recurring stands for arr');
    });

    T.test('TPV-TC-638', 'The four item types map to the four product categories, with "arr" read as recurring', function (a) {
      a.equal(TAP.checkP4.categoryOf('arr'), 'recurring');
      a.equal(TAP.checkP4.categoryOf('services'), 'services');
      a.equal(TAP.checkP4.categoryOf('swPerpetual'), 'swPerpetual');
      a.equal(TAP.checkP4.categoryOf('hardware'), 'hardware');
      a.equal(TAP.checkP4.categoryOf('licence'), null, 'anything else is no category');
      var cats = window.TEST_FIXTURES.broken.withP4(T_FIXTURE('mini')).lookups.productCategories.map(function (c) { return c.id; });
      a.deepEqual(TAP.checkP4.TYPES.map(TAP.checkP4.categoryOf).sort(), cats.slice().sort(), 'every type has its category in the lookup');
    });

    T.test('TPV-TC-640','The recap measures give the same hand-worked figures with and without revenue and books value lists', function (a) {
      // Mini fixture, year 1 new business ARR from the recap: Region A 450 (E5) + 250 (F5) = 700; Region B 700 (E5);
      // Region C has no recap (not provided); Region D 150 (E5).
      var want = { alpha: 700, bravo: 700, charlie: null, delta: 150 };
      function read() {
        var out = {};
        Object.keys(want).forEach(function (id) {
          out[id] = ['rc.nb.arr', 'rc.all.arr', 'rc.all.oi'].map(function (m) { return TAP.measures.get(m)(id, { year: 1 }).v; });
        });
        out.direct = TAP.measures.get('rc.nb.arr.direct')('alpha', { year: 1 }).v;    // 450 (E5)
        out.org = TAP.measures.combined('rc.all.oi', { kind: 'combined', regionIds: Object.keys(want), how: 'total' }, {}).v;   // 700 + 700 + 150
        return out;
      }
      TAP.data.load(T_FIXTURE('mini'));
      var before = read();
      var p = p4();
      [1, 3].forEach(function (i) {
        p.regions[i].revenue = [{ year: 2027, sourceCell: 'E5', channel: 'direct', motion: 'newBusiness', type: 'arr', value: 90 }];
        p.regions[i].booksValue = [{ year: 2027, sourceCell: 'E20', channel: 'direct', motion: 'newBusiness', type: 'arr', value: 120 }];
      });
      a.equal(TAP.data.load(p).ok, true, 'the file with the new lists loads');
      var after = read();
      a.deepEqual(after, before, 'the same in both runs');
      Object.keys(want).forEach(function (id) { a.deepEqual(after[id], [want[id], want[id], want[id]], id + ' by hand'); });
      a.equal(after.direct, 450);
      a.equal(after.org, 1550);
      var src = window.TEST_EXPECT.mini.sources.filter(function (s) { return s.src.section === 'recap'; })[0];
      a.equal(TAP.sources.address(src.src).text, src.text, 'a recap figure still traces to its own sheet and cell');
    });

    T.test('TPV-TC-641', 'A strategic plan and a base year pass the check, with and without a coverage ratio', function (a) {
      var p = p4();
      valid(a, p, 'strategicPlan and baseYear');
      var r = TAP.data.region('alpha');
      a.deepEqual(r.strategicPlan.filter(function (x) { return x.year === 2027; }).map(function (x) { return [x.type, x.value]; }),
        [['arr', 600], ['services', 10], ['swPerpetual', 40], ['hardware', 25]], 'order intake by year and product category');
      a.equal(r.baseYear.year, 2026);
      a.equal(r.baseYear.actualsThrough, '2026-08');
      a.deepEqual(r.baseYear.items[0], { sourceRow: 8, category: 'recurring', budget: 520, forecast: 500, actuals: 300, pipeline: 500, coverage: 2.5 });
      var none = p4();
      none.regions[0].baseYear.items.forEach(function (it) { delete it.coverage; });
      valid(a, none, 'a base year with no coverage ratio');
    });

    T.test('TPV-TC-642', 'New Business rows with and without a solution, and routes for all six routes, pass the check', function (a) {
      var p = p4();
      valid(a, p, 'solutions and routes');
      var r = TAP.data.region('alpha');
      a.equal(r.newBusiness[0].solution, 'sol1');
      a.equal(r.newBusiness[1].solution, undefined, 'a row may leave the solution out');
      a.equal(TAP.data.region('bravo').newBusiness[0].solution, null, 'or leave it blank');
      var routes = TAP.data.lookups().routes.map(function (x) { return x.id; });
      a.deepEqual(routes, ['ownSales', 'customerSuccess', 'allianceBReseller', 'otherResellers', 'systemIntegrators', 'partnerExisting']);
      routes.forEach(function (id) {
        var items = r.routes.filter(function (x) { return x.route === id && x.year === 2027; });
        a.ok(items.length >= 1 && items.every(function (x) { return typeof x.value === 'number'; }), id + ' has a value for 2027');
      });
      a.ok(r.routes.some(function (x) { return x.solution === 'sol1'; }) && r.routes.some(function (x) { return x.solution == null; }),
        'with and without a solution');
      // 400 + 50 + 0 + 0 + 120 + 60 + 20 + 0, the same 650 as the books value items (400 + 50 + 180 + 0 + 20)
      a.equal(r.routes.reduce(function (t, x) { return t + x.value; }, 0), 650);
    });

    T.test('TPV-TC-643', 'Partners with a type, a maturity, support, distribution and services by year, and a region’s outsourcing %, pass', function (a) {
      var p = p4();
      valid(a, p, 'partner fields');
      var pt = TAP.data.region('alpha').partners[0];
      a.equal(pt.type, 'var');
      a.equal(pt.maturity, 'enable');
      a.deepEqual(pt.supportPct, [0.3, 0.2, 0.1]);
      a.deepEqual(pt.distribution, [100, 150, 200]);
      a.deepEqual(pt.servicesFromPartners, [6, 9, 12]);
      a.equal(TAP.data.region('alpha').outsourcingPct, 0.3);
      a.equal(TAP.data.region('bravo').partners[0].maturity, 'Strategic', 'a maturity given by its name is accepted');
      a.ok(TAP.data.lookups().partnerMaturity.some(function (m) { return m.id === pt.maturity; }), 'the maturity is in the lookup');
      a.ok(TAP.data.lookups().partnerTypes.some(function (t) { return t.id === pt.type; }), 'the type is in the lookup');
    });

    T.test('TPV-TC-645', 'Every new part has a source-map entry, and a value from each traces to file, sheet and cell', function (a) {
      var p = p4(), map = p.meta.sourceMap;
      valid(a, p, 'source map');
      ['revenue', 'booksValue', 'strategicPlan', 'routes', 'baseYear'].forEach(function (k) {
        a.ok(map[k] && typeof map[k].sheet === 'string', 'meta.sourceMap.' + k + ' names its sheet');
      });
      ['category', 'budget', 'forecast', 'actuals', 'pipeline', 'coverage'].forEach(function (f) { a.ok(map.baseYear.columns[f], 'baseYear.' + f); });
      ['type', 'supportPct', 'distribution', 'servicesFromPartners'].forEach(function (f) { a.ok(map.partners.columns[f], 'partners.' + f); });
      a.ok(map.partners.cells.outsourcingPct, 'outsourcingPct');
      a.ok(map.newBusiness.columns.solution, 'newBusiness.solution');
      var r = TAP.data.region('alpha');
      function at(src) { return TAP.sources.address(Object.assign({ regionId: 'alpha' }, src)).text; }
      a.equal(at({ section: 'revenue', field: 'value', cell: r.revenue[0].sourceCell, kind: 'DER' }), 'Region A plan.xlsx › 6. Recap › E5');
      a.equal(at({ section: 'booksValue', field: 'value', cell: r.booksValue[4].sourceCell, kind: 'DER' }), 'Region A plan.xlsx › 6. Recap › F23');
      a.equal(at({ section: 'strategicPlan', field: 'value', cell: r.strategicPlan[2].sourceCell, kind: 'PRE' }), 'Region A plan.xlsx › 6. Recap › E49');
      a.equal(at({ section: 'routes', field: 'value', cell: r.routes[1].sourceCell, kind: 'DER' }), 'Region A plan.xlsx › 6. Recap › G57');
      a.equal(at({ section: 'baseYear', field: 'forecast', row: r.baseYear.items[0].sourceRow, kind: 'PRE' }), 'Region A plan.xlsx › 7. Order Intake › D8');
      a.equal(at({ section: 'baseYear', field: 'actualsThrough', kind: 'PRE' }), 'Region A plan.xlsx › 7. Order Intake › C5');
      a.equal(at({ section: 'partners', field: 'distribution', row: 10, year: 2, kind: 'IN' }), 'Region A plan.xlsx › 4. Partner › U10');
      a.equal(at({ section: 'partners', field: 'outsourcingPct', kind: 'IN' }), 'Region A plan.xlsx › 4. Partner › I3');
      a.equal(at({ section: 'newBusiness', field: 'solution', row: 20, kind: 'IN' }), 'Region A plan.xlsx › 2. New Business › V20');
      a.equal(TAP.sources.address({ regionId: 'alpha', section: 'revenue', field: 'value', cell: 'E5', kind: 'DER' }).calculated, true);
    });

    T.test('TPV-TC-646', 'The mini fixture, which has none of the new fields, passes with no errors and no new warnings', function (a) {
      var p = T_FIXTURE('mini');
      ['revenue', 'booksValue', 'strategicPlan', 'baseYear', 'routes', 'outsourcingPct'].forEach(function (k) {
        a.ok(p.regions.every(function (r) { return r[k] === undefined; }), 'no region has ' + k);
      });
      ['solutions', 'productCategories', 'partnerTypes', 'partnerMaturity', 'routes'].forEach(function (k) {
        a.equal(p.lookups[k], undefined, 'no lookups.' + k);
      });
      var res = TAP.check.run(p);
      a.deepEqual(res.errors, []);
      a.deepEqual(messages(res.warnings), ['regions[2].partners: expected at least one item, found an empty list',
        'regions[2].recap: expected at least one item, found an empty list',
        'regions[2].customerGrowth.accounts: expected at least one item, found an empty list'], 'only the warnings it gave before Phase 4');
    });

    T.test('TPV-TC-647', 'The schema version is still "0.2" for the app, the sample data and a file with every new part', function (a) {
      a.equal(TAP.schemaVersion, '0.2');
      a.equal(window.PLAN_DATA.meta.schemaVersion, '0.2');
      var p = p4();
      a.equal(p.meta.schemaVersion, '0.2');
      var res = TAP.data.load(p);
      a.equal(res.ok, true, 'a full-template file loads under 0.2');
      a.equal(res.reason, null);
    });
  });

  /* ---------- the sample data's full-template parts (US-4.1.3) ---------- */

  var X = window.SAMPLE_EXPECT;
  var RESELLERS = ['partner', 'allianceA', 'allianceB'];

  function sample() { return JSON.parse(JSON.stringify(window.PLAN_DATA)); }
  function sum(list) { return list.reduce(function (t, v) { return t + v; }, 0); }
  function total(list, pred) { return sum((list || []).filter(pred || Boolean).map(function (x) { return x.value; })); }
  // Money in the sample is kept to one decimal, so sums agree to within rounding
  function near(a, got, want, what) { a.ok(Math.abs(got - want) < 0.051, what + ': ' + got + ' against ' + want); }
  // The types the recap and the books value both hold: perpetual software and hardware run through the books only
  function both(it) { return it.type === 'arr' || it.type === 'services'; }
  function each(fn) { sample().regions.forEach(fn); }

  T.suite('p4-sample', function () {
    T.test('TPV-TC-635', 'The sample lists the five maturity levels in order, and each partner type with its id', function (a) {
      var lk = window.PLAN_DATA.lookups;
      a.deepEqual(lk.partnerMaturity.map(function (m) { return m.name; }), ['Recruit', 'Onboard', 'Enable', 'Skill', 'Strategic']);
      a.deepEqual(lk.partnerMaturity.map(function (m) { return m.rank; }), [1, 2, 3, 4, 5]);
      a.deepEqual(lk.partnerMaturity.map(function (m) { return m.id; }), ['recruit', 'onboard', 'enable', 'skill', 'strategic']);
      a.deepEqual(lk.partnerTypes, [{ id: 'var', name: 'Value-added reseller' }, { id: 'si', name: 'System integrator' }, { id: 'referral', name: 'Referral partner' }]);
    });

    T.test('TPV-TC-639', 'Recap items count as customer value, revenue items as the revenue outlook, books value items as the books: none twice', function (a) {
      TAP.data.load(sample());
      each(function (r) {
        var x = X.p4.regions[r.id];
        near(a, total(r.recap), x.cv3, r.id + ' recap is the customer value');
        near(a, total(r.revenue), x.revenue3, r.id + ' revenue is the revenue outlook');
        near(a, total(r.booksValue), x.books3, r.id + ' books value is the books order intake');
        // The existing recap measure still reads the recap only: adding the other two lists would more than double it
        near(a, TAP.measures.get('rc.all.oi')(r.id, {}).v, x.cv3, r.id + ' rc.all.oi is unchanged');
        // Over ARR and services, the types the recap holds, the books are never above customer value
        near(a, total(r.booksValue, both), x.booksCv3, r.id + ' books value over ARR and services');
        a.ok(x.revenue3 < x.cv3 && x.booksCv3 <= x.cv3 + 0.051 && x.booksCv3 < x.books3, r.id + ' three different figures');
        a.equal(r.recap.filter(function (it) { return it.type !== 'arr' && it.type !== 'services'; }).length, 0, r.id + ' recap keeps its two types');
        a.ok(r.revenue !== r.recap && r.booksValue !== r.recap && r.revenue !== r.booksValue, 'three separate lists');
      });
      // The figures recorded before Phase 4 still hold: the organization's three-year ARR ambition (70,950.5 until D112's
      // S03 raised Latin America's new business years 2 and 3 by 1,261.0)
      a.equal(X.org['amb.arr'], 72211.5);
    });

    T.test('TPV-TC-645', 'In the sample, a value from each new part traces to its region file, sheet and cell', function (a) {
      TAP.data.load(sample());
      a.ok(X.p4.sources.length >= 10, 'one or more per new part');
      var sections = {};
      X.p4.sources.forEach(function (s) {
        var at = TAP.sources.address(s.src);
        a.equal(at.text, s.text, s.src.section + '.' + s.src.field);
        a.equal(at.calculated, s.calculated, s.text + ' calculated');
        sections[s.src.section] = true;
      });
      ['revenue', 'booksValue', 'strategicPlan', 'routes', 'baseYear', 'partners', 'newBusiness'].forEach(function (k) { a.ok(sections[k], k + ' is traced'); });
      var map = window.PLAN_DATA.meta.sourceMap;
      ['revenue', 'booksValue', 'strategicPlan', 'routes', 'baseYear'].forEach(function (k) { a.equal(typeof map[k].sheet, 'string', 'sourceMap.' + k); });
      a.equal(TAP.sources.address({ regionId: 'na', section: 'revenue', field: 'value', cell: 'E5', kind: 'DER' }).text, 'North America plan.xlsx \u203a 6. Recap \u203a E5');
    });

    T.test('TPV-TC-657', 'Every sample region has every new part, except the two planted blanks', function (a) {
      a.equal(X.r09.region, 'neu');
      a.equal(X.r10.region, 'ceu');
      each(function (r) {
        ['revenue', 'booksValue', 'routes'].forEach(function (k) { a.ok(Array.isArray(r[k]) && r[k].length > 0, r.id + ' has ' + k); });
        a.equal(Array.isArray(r.strategicPlan) && r.strategicPlan.length > 0, r.id !== 'neu', r.id + ' strategic plan');
        a.equal(!!r.baseYear && r.baseYear.items.length === 4, r.id !== 'ceu', r.id + ' base year');
        a.equal(typeof r.outsourcingPct === 'number', r.id !== 'ceu', r.id + ' outsourcing %');
        a.ok(r.newBusiness.every(function (row) { return row.solution !== undefined; }), r.id + ': every New Business row has the solution field');
        a.equal(r.newBusiness.filter(function (row) { return !row.solution; }).length, X.p4.regions[r.id].rowsWithoutSolution, r.id + ' rows naming no solution');
        r.partners.forEach(function (p) {
          a.ok(p.type !== undefined && Array.isArray(p.supportPct) && Array.isArray(p.distribution) && Array.isArray(p.servicesFromPartners), r.id + ' ' + p.name);
        });
      });
      // Only the planted rows name no solution: one in Southern Europe (its blank row, G1) and one in Asia Pacific
      a.deepEqual(X.regions.filter(function (id) { return X.p4.regions[id].rowsWithoutSolution; }), ['seu', 'apac']);
      a.deepEqual(X.p4.withStrategicPlan, ['na', 'latam', 'seu', 'ceu', 'mea', 'apac']);
      a.deepEqual(X.p4.withBaseYear, ['na', 'latam', 'neu', 'seu', 'mea', 'apac']);
    });

    T.test('TPV-TC-658', 'The new names are generic: Solution 1 to Solution 6, generic partner types and product categories', function (a) {
      var lk = window.PLAN_DATA.lookups;
      a.deepEqual(lk.solutions.map(function (s) { return s.name; }), ['Solution 1', 'Solution 2', 'Solution 3', 'Solution 4', 'Solution 5', 'Solution 6']);
      a.ok(lk.solutions.every(function (s) { return /^sol[1-6]$/.test(s.id); }), 'no product codes in the ids');
      a.deepEqual(lk.partnerTypes.map(function (t) { return t.name; }), ['Value-added reseller', 'System integrator', 'Referral partner']);
      a.deepEqual(lk.productCategories.map(function (c) { return c.name; }), ['Software perpetual', 'Recurring', 'Hardware', 'Services']);
      a.deepEqual(lk.channels.map(function (c) { return c.name; }), ['Direct', 'Partner', 'Alliance A', 'Alliance B'], 'the channel wording stays');
      a.deepEqual(lk.routes.map(function (x) { return x.id; }), ['ownSales', 'customerSuccess', 'allianceBReseller', 'otherResellers', 'systemIntegrators', 'partnerExisting']);
      a.deepEqual(X.p4.lookups.solutions, lk.solutions.map(function (s) { return s.name; }), 'as the generator recorded them');
      // Account and partner names still come only from the vetted list (the denylist scan itself runs in scripts/verify.sh)
      each(function (r) {
        r.partners.forEach(function (p) { a.ok(X.vettedNames.stems.indexOf(p.name.split(' ')[0]) >= 0, p.name + ' uses a vetted stem'); });
      });
    });

    T.test('TPV-TC-659', 'The sample\u2019s new figures add up', function (a) {
      var years = window.PLAN_DATA.meta.years;
      each(function (r) {
        var x = X.p4.regions[r.id], id = r.id;
        years.forEach(function (y, i) {
          var inYear = function (it) { return it.year === y; };
          // The product categories add up to each year's books total, and the routes to the same total
          near(a, sum(['arr', 'services', 'swPerpetual', 'hardware'].map(function (t) { return total(r.booksValue, function (it) { return it.year === y && it.type === t; }); })),
            x.books[i], id + ' ' + y + ' categories against the books total');
          near(a, total(r.routes, inYear), x.books[i], id + ' ' + y + ' routes against the books total');
          ['direct'].concat(RESELLERS).forEach(function (ch) {
            var cv = total(r.recap, function (it) { return it.year === y && it.channel === ch; });
            var books = total(r.booksValue, function (it) { return it.year === y && it.channel === ch && both(it); });
            // Over ARR and services: never above customer value; the same as customer value through the own sales force
            a.ok(books <= cv + 0.051, id + ' ' + y + ' ' + ch + ': books ' + books + ' within customer value ' + cv);
            if (ch === 'direct') near(a, books, cv, id + ' ' + y + ' direct books value');
            ['newBusiness', 'customerGrowth'].forEach(function (m) {
              var oi = total(r.recap, function (it) { return it.year === y && it.channel === ch && it.motion === m; });
              var rev = total(r.revenue, function (it) { return it.year === y && it.channel === ch && it.motion === m; });
              a.ok(rev <= oi + 0.051, id + ' ' + y + ' ' + ch + ' ' + m + ': revenue ' + rev + ' within order intake ' + oi);
            });
          });
        });
        // Each variance is the plan's books order intake for that year and type minus the strategic plan
        (r.strategicPlan || []).forEach(function (sp) {
          near(a, sp.variance, total(r.booksValue, function (it) { return it.year === sp.year && it.type === sp.type; }) - sp.value, id + ' variance ' + sp.sourceCell);
        });
        if (r.strategicPlan) near(a, total(r.strategicPlan), x.strategicPlan.value3, id + ' strategic plan categories against its total');
        // Where the workbook gives a coverage ratio, it is pipeline over the order intake still to win
        ((r.baseYear || {}).items || []).forEach(function (it) {
          if (it.coverage !== null) a.ok(Math.abs(it.coverage - it.pipeline / (it.forecast - it.actuals)) < 0.006, id + ' coverage ' + it.category);
        });
      });
      // And the check agrees: the sample loads with only the warning it had before Phase 4 (Central Europe's empty section, G2)
      var res = TAP.check.run(sample());
      a.deepEqual(res.errors, []);
      a.deepEqual(messages(res.warnings), ['regions[4].customerGrowth.accounts: expected at least one item, found an empty list']);
    });

    T.test('TPV-TC-661', 'Each Phase 4 planted case is in the sample as docs/PLANTED-CASES.md lists it', function (a) {
      var R = {}, years = window.PLAN_DATA.meta.years;
      each(function (r) { R[r.id] = r; });
      function plan3(id) { return total(R[id].booksValue); }
      function variancePct(id) { return (plan3(id) - total(R[id].strategicPlan)) / total(R[id].strategicPlan); }
      function field(id, f) { return sum(R[id].baseYear.items.map(function (it) { return it[f]; })); }
      function year1(id) { return total(R[id].booksValue, function (it) { return it.year === years[0]; }); }
      function gapShare(id) { return (total(R[id].recap) - total(R[id].booksValue, both)) / total(R[id].recap); }
      function close(got, want, what) { a.ok(Math.abs(got - want) < 1e-4, what + ': ' + got + ' against ' + want); }

      // R01 and R02: one region well below its strategic plan, one well above
      a.equal(X.r01.region, 'apac');
      close(variancePct('apac'), X.r01.variancePct3, 'R01');
      a.ok(X.r01.variancePct3 <= -0.25, 'R01: at least 25% below');
      a.equal(X.r02.region, 'latam');
      close(variancePct('latam'), X.r02.variancePct3, 'R02');
      a.ok(X.r02.variancePct3 >= 0.2, 'R02: at least 20% above');
      // R03: the plans together fall short of the strategic plans; the other regions are each within 10% of theirs
      var withPlan = X.r03.regions;
      close((sum(withPlan.map(plan3)) - sum(withPlan.map(function (id) { return total(R[id].strategicPlan); }))) / sum(withPlan.map(function (id) { return total(R[id].strategicPlan); })),
        X.r03.variancePct3, 'R03');
      a.ok(X.r03.variancePct3 < -0.06 && X.r03.variancePct3 > -0.1, 'R03: 6 to 10% short together');
      a.deepEqual(X.r03.notIncluded, ['neu'], 'R03: the region without a strategic plan is not counted');
      ['na', 'seu', 'ceu', 'mea'].forEach(function (id) { a.ok(Math.abs(variancePct(id)) <= 0.1, 'R03: ' + id + ' within 10%'); });
      // R04: one region whose year 1 is far above its base-year forecast
      a.equal(X.r04.region, 'mea');
      close(year1('mea') / field('mea', 'forecast') - 1, X.r04.growth, 'R04');
      a.ok(X.r04.growth >= 0.5, 'R04: at least 50% above');
      X.p4.withBaseYear.forEach(function (id) { if (id !== 'mea') a.ok(year1(id) / field(id, 'forecast') - 1 < 0.2, 'R04: ' + id + ' under 20%'); });
      // R05: one region with low pipeline coverage. Row by row, the workbook's ratio stands where it gives one (the
      // amount still to win is read back from it), else pipeline over forecast minus actuals; the region is a ratio of sums
      function coverage(id) {
        var items = R[id].baseYear.items;
        return field(id, 'pipeline') / sum(items.map(function (it) { return it.coverage !== null ? it.pipeline / it.coverage : it.forecast - it.actuals; }));
      }
      a.equal(X.r05.region, 'na');
      close(coverage('na'), X.r05.coverage, 'R05');
      close(field('na', 'pipeline') / (field('na', 'forecast') - field('na', 'actuals')), X.p4.regions.na.baseYear.pipelineOverLeft, 'R05 over forecast minus actuals');
      a.ok(Math.abs(X.r05.coverage - X.p4.regions.na.baseYear.pipelineOverLeft) < 0.005, 'R05: the two readings agree to two decimals');
      a.ok(X.r05.coverage < 1.25, 'R05: under 1.25x');
      X.p4.withBaseYear.forEach(function (id) { if (id !== 'na') a.ok(coverage(id) > 2, 'R05: ' + id + ' above 2x'); });
      // The engine agrees with the planted figure (ENGINE4's by.coverage, when it is there)
      var cov = TAP.measures.get('by.coverage');
      if (cov) { TAP.data.load(sample()); close(cov('na', {}).v, X.r05.coverage, 'R05 by.coverage'); }
      // R06: one region with a large gap between customer value and books value
      a.equal(X.r06.region, 'seu');
      close(gapShare('seu'), X.r06.gapShare, 'R06');
      a.ok(X.r06.gapShare >= 0.15, 'R06: at least 15% outside the books');
      X.regions.forEach(function (id) { if (id !== 'seu') a.ok(gapShare(id) < 0.08, 'R06: ' + id + ' under 8%'); });
      // R07: one region relying on one solution for most of its new business
      function solutionShare(id, sol) {
        var rows = R[id].newBusiness.filter(function (x) { return x.arrPotential[0] !== null; });
        var oi = function (x) { return sum(x.arrPotential) + sum(x.servicesPotential); };
        return sum(rows.filter(function (x) { return x.solution === sol; }).map(oi)) / sum(rows.map(oi));
      }
      a.equal(X.r07.region, 'neu');
      a.equal(X.r07.solution, 'sol2');
      close(solutionShare('neu', 'sol2'), X.r07.share, 'R07');
      a.ok(X.r07.share >= 0.65, 'R07: 65% or more');
      X.regions.forEach(function (id) {
        if (id === 'neu') return;
        window.PLAN_DATA.lookups.solutions.forEach(function (s) { a.ok(solutionShare(id, s.id) <= 0.45, 'R07: ' + id + ' ' + s.id + ' at most 45%'); });
      });
      // R08: partners at every maturity level and of every type, and one blank of each
      var maturity = {}, types = {};
      each(function (r) { r.partners.forEach(function (p) { maturity[p.maturity || 'none'] = (maturity[p.maturity || 'none'] || 0) + 1; types[p.type || 'none'] = (types[p.type || 'none'] || 0) + 1; }); });
      a.deepEqual(maturity, X.r08.maturity);
      a.deepEqual(types, X.r08.types);
      ['recruit', 'onboard', 'enable', 'skill', 'strategic'].forEach(function (m) { a.ok(maturity[m] >= 1, 'R08: a partner at ' + m); });
      ['var', 'si', 'referral'].forEach(function (t) { a.ok(types[t] >= 1, 'R08: a partner of type ' + t); });
      a.equal(maturity.none, 1);
      a.equal(types.none, 1);
      a.equal(X.r08.partners, 28);
    });

    T.test('TPV-TC-663', 'The region without a strategic plan and the region without a base year read "not provided", never zero', function (a) {
      TAP.data.load(sample());
      a.equal(TAP.data.region('neu').strategicPlan, undefined, 'Northern Europe carries no strategic plan');
      a.equal(TAP.data.region('ceu').baseYear, undefined, 'Central Europe carries no base year');
      a.equal(TAP.data.region('ceu').outsourcingPct, null, 'and a blank outsourcing %');
      a.equal(X.r09.strategicPlan, null);
      a.equal(X.r10.baseYear, null);
      a.equal(X.p4.regions.neu.strategicPlan, null, 'recorded as nothing, not as 0');
      a.deepEqual(X.r10.coverageNotGiven, ['latam'], 'one workbook gives no coverage ratio');
      a.ok(TAP.data.region('latam').baseYear.items.every(function (it) { return it.coverage === null; }));
      // The measures behind the strategic plan and base-year reports (ENGINE4), once they are built
      [['sp.oi', 'neu'], ['sp.variance', 'neu'], ['by.forecast', 'ceu'], ['by.growth', 'ceu'], ['by.coverage', 'ceu']].forEach(function (c) {
        var m = TAP.measures.get(c[0]);
        if (!m) return;
        var cell = m(c[1], {});
        a.equal(cell.state, 'notProvided', c[0] + ' for ' + c[1]);
        a.equal(cell.v, null, c[0] + ' is never zero');
      });
      var filled = TAP.measures.get('sp.oi');
      if (filled) near(a, filled('apac', {}).v, X.r01.strategicPlan3, 'sp.oi for a region that has one');
    });

    T.test('TPV-TC-665', 'SAMPLE_EXPECT holds the expected figures for every Phase 4 planted case', function (a) {
      ['r01', 'r02', 'r03', 'r04', 'r05', 'r06', 'r07', 'r08', 'r09', 'r10'].forEach(function (k) { a.ok(X[k] && typeof X[k] === 'object', k + ' is recorded'); });
      ['r01', 'r02', 'r04', 'r05', 'r06', 'r07', 'r09', 'r10'].forEach(function (k) { a.ok(X.regions.indexOf(X[k].region) >= 0, k + ' names its region'); });
      a.deepEqual(Object.keys(X.p4.regions), X.regions, 'figures for every region');
      ['cv3', 'books3', 'revenue3', 'gapShare', 'revenueShare3'].forEach(function (f) {
        X.regions.forEach(function (id) { a.equal(typeof X.p4.regions[id][f], 'number', id + ' ' + f); });
      });
      a.equal(typeof X.r03.variancePct3, 'number');
      a.equal(typeof X.r05.others, 'number');
    });
    T.skip('TPV-TC-665', 'node tools/generate-sample-data.js --check passes', 'Run as "sample data reproducible" in scripts/verify.sh and in CI');
    T.skip('TPV-TC-666', 'The generator run twice gives identical files that match the committed sample data',
      'Run as "sample data reproducible" in scripts/verify.sh and in CI (node tools/generate-sample-data.js --check)');

    // D112's S03 grows Latin America's new business rows 45% into year 2 and 30% into year 3: its three-year new
    // business ARR is year 1 (1,440.2) x (1 + 1.45 + 1.45 x 1.3) = 6,243.2 (rounded by row), 1,261.0 more than the 4,982.2
    // before, so the organization's totals move by the same amount and nothing else does
    T.test('X-p4-sample-figures-kept', 'The figures the sample had before Phase 4 are unchanged, but for D112’s S03', function (a) {
      a.equal(X.totals.latam['nb.arr.y1'], 1440.2, 'Latin America’s year 1 is unchanged');
      a.equal(X.totals.latam['nb.arr'], 6243.2, 'Latin America’s three years: 4,982.2 + 1,261.0');
      a.equal(X.headline.ambArr, 72211.5, '70,950.5 + 1,261.0');
      a.equal(X.org['nb.arr'], 47083.3, '45,822.3 + 1,261.0');
      a.equal(X.totals.na['nb.arr'], 11218.6);
      a.equal(X.q01.share, 0.399652);
      a.equal(X.p10.ratio, 4);
      a.equal(X.q05.flagged[0].name, 'Horviby Solutions Partner');
    });
  });
})(window.TAP);
