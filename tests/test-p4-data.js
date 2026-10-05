/*
 * File: tests/test-p4-data.js
 * Purpose: Tests for the Phase 4 Data Contract additions (US-4.1.1): the new lookups, the revenue, books value,
 *          strategic plan, base year and route parts, the partner and solution fields, and their source-map entries.
 * Provides: test cases TPV-TC-634, 636, 637, 638, 640, 641, 642, 643, 645, 646, 647
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, tests/fixtures/mini-data.js,
 *             tests/fixtures/broken-cases.js (withP4: the mini fixture with every Phase 4 part), data/sample-plan-data.js
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
})(window.TAP);
