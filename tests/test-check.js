/*
 * File: tests/test-check.js
 * Purpose: Tests for the contract check on load (TPV-TC-205, 206).
 * Provides: test cases for DATA stories (#57): TPV-TC-205, TPV-TC-206, X-check-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, tests/fixtures/mini-data.js,
 *             tests/fixtures/broken-cases.js, data/sample-plan-data.js (window.PLAN_DATA)
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var KEYS = ['path', 'region', 'item', 'expected', 'found', 'message'];

  function copy(x) { return JSON.parse(JSON.stringify(x)); }

  function broken(c) {
    var p = T_FIXTURE('mini');
    c.change(p);
    return p;
  }

  function errorList(res) {
    return res.errors.map(function (e) { return e.message; }).join('\n');
  }

  T.suite('check', function () {
    T.test('TPV-TC-205', 'The mini fixture passes the contract check with no errors', function (a) {
      var res = TAP.check.run(T_FIXTURE('mini'));
      a.deepEqual(res.errors, [], errorList(res));
      a.ok(Array.isArray(res.warnings), 'warnings is a list');
    });

    T.test('TPV-TC-205', 'The sample data file passes the contract check with no errors', function (a) {
      a.ok(window.PLAN_DATA, 'the sample data file is loaded');
      var res = TAP.check.run(copy(window.PLAN_DATA));
      a.deepEqual(res.errors, [], errorList(res));
    });

    window.TEST_FIXTURES.broken.cases.forEach(function (c) {
      T.test('TPV-TC-206', 'Broken file "' + c.id + '" gives a specific ' + (c.level === 'errors' ? 'error' : 'warning'), function (a) {
        var res = TAP.check.run(broken(c));
        var hit = res[c.level].filter(function (x) { return x.path === c.expect.path; })[0];
        a.ok(hit, 'an item for ' + c.expect.path + ' in ' + c.level + '; got: ' +
          res.errors.concat(res.warnings).map(function (x) { return x.message; }).join(' | '));
        if (!hit) return;
        a.equal(hit.region, c.expect.region, 'region');
        a.equal(hit.item, c.expect.item, 'item');
        a.equal(hit.expected, c.expect.expected, 'expected');
        a.equal(hit.found, c.expect.found, 'found');
        a.ok(hit.message.indexOf(c.expect.path + ': ') === 0, 'message starts with the path: ' + hit.message);
        a.ok(hit.message.indexOf(c.expect.expected) > 0, 'message names the expectation: ' + hit.message);
        if (c.expect.message) a.equal(hit.message, c.expect.message, 'exact message');
        if (c.level === 'warnings') a.deepEqual(res.errors, [], 'a warning case has no errors');
      });
    });

    T.test('X-check-shape', 'Every reported item has path, region, item, expected, found and message', function (a) {
      var all = [];
      window.TEST_FIXTURES.broken.cases.forEach(function (c) {
        var res = TAP.check.run(broken(c));
        all = all.concat(res.errors, res.warnings);
      });
      a.ok(all.length >= window.TEST_FIXTURES.broken.cases.length, 'items were reported');
      all.forEach(function (x) {
        KEYS.forEach(function (k) { a.ok(Object.prototype.hasOwnProperty.call(x, k), k + ' in ' + x.message); });
        a.equal(typeof x.message, 'string');
      });
    });

    T.test('X-check-load', 'Errors stop loading; warnings load and come back from TAP.data.load', function (a) {
      var bad = window.TEST_FIXTURES.broken.cases.filter(function (c) { return c.id === 'tier-as-text'; })[0];
      var r1 = TAP.data.load(broken(bad));
      a.equal(r1.ok, false);
      a.equal(r1.reason, 'invalid');
      a.ok(r1.errors.length >= 1, 'errors listed');

      var warn = window.TEST_FIXTURES.broken.cases.filter(function (c) { return c.id === 'split-not-100'; })[0];
      var r2 = TAP.data.load(broken(warn));
      a.equal(r2.ok, true);
      a.ok(r2.warnings.some(function (w) { return w.path === warn.expect.path; }), 'the warning is returned');
    });

    T.test('X-check-garbage', 'A badly malformed file gives errors instead of crashing', function (a) {
      var res = TAP.check.run({ meta: { schemaVersion: '0.2' }, lookups: 'none', regions: 'x' });
      a.ok(res.errors.length > 0, 'errors listed');
      a.ok(res.errors.some(function (e) { return e.path === 'regions'; }), 'regions named');
      var res2 = TAP.check.run({ meta: copy(window.TEST_FIXTURES.mini.meta), lookups: copy(window.TEST_FIXTURES.mini.lookups),
        regions: [null, { id: 'x' }] });
      a.ok(res2.errors.some(function (e) { return e.path === 'regions[0]'; }), 'a null region is named');
      a.ok(res2.errors.some(function (e) { return e.path === 'regions[1].marketCoverage'; }), 'a missing section is named');
    });

    T.test('X-check-extra-fields', 'Fields and sections the contract does not name add no errors and no warnings (D47)', function (a) {
      var base = TAP.check.run(T_FIXTURE('mini'));
      var p = T_FIXTURE('mini');
      window.TEST_FIXTURES.broken.extras(p);
      var res = TAP.check.run(p);
      a.deepEqual(res.errors, [], errorList(res));
      // The mini fixture's own planted empty sections (Region C) are its only warnings; the extras add none
      a.deepEqual(res.warnings, base.warnings, 'no warnings beyond the fixture\u2019s planted ones');
      a.ok(res.warnings.every(function (w) { return w.region === 'Region C'; }), 'only Region C\u2019s planted gaps');
    });

    T.test('X-check-years-broken', 'Broken or missing plan years are reported once, not once per recap row', function (a) {
      var p = T_FIXTURE('mini');
      p.meta.years = 'soon';
      var res = TAP.check.run(p);
      a.deepEqual(res.errors.map(function (e) { return e.path; }), ['meta.years'], errorList(res));
      var p2 = T_FIXTURE('mini');
      delete p2.meta;
      var res2 = TAP.check.run(p2);
      a.deepEqual(res2.errors.map(function (e) { return e.path; }), ['meta'], errorList(res2));
    });

    T.test('X-check-empty-split', 'An empty channel split names each missing channel', function (a) {
      var p = T_FIXTURE('mini');
      p.regions[0].newBusiness[0].channelSplit = {};
      var paths = TAP.check.run(p).errors.map(function (e) { return e.path; });
      a.deepEqual(paths, ['direct', 'partner', 'allianceA', 'allianceB'].map(function (c) { return 'regions[0].newBusiness[0].channelSplit.' + c; }));
    });

    T.test('X-check-proto-ids', 'Ids that match built-in object names are not mistaken for duplicates', function (a) {
      var p = T_FIXTURE('mini');
      p.regions[0].id = 'constructor';
      p.regions[1].id = 'toString';
      ['__proto__', 'constructor', 'toString', 'hasOwnProperty'].forEach(function (id, i) { p.regions[0].customerGrowth.accounts[i].id = id; });
      var res = TAP.check.run(p);
      a.deepEqual(res.errors, [], errorList(res));
    });

    T.test('X-check-mc-not-list', 'A Market Coverage section that is not a list gives one error, not one per New Business row', function (a) {
      var p = T_FIXTURE('mini');
      p.regions[0].marketCoverage = 'see sheet 1';
      var paths = TAP.check.run(p).errors.map(function (e) { return e.path; });
      a.deepEqual(paths, ['regions[0].marketCoverage']);
    });

    T.test('X-check-duplicates', 'Duplicate region ids and duplicate industries in a region are errors', function (a) {
      var p = T_FIXTURE('mini');
      p.regions[1].id = 'alpha';
      p.regions[0].marketCoverage[1].industryId = 'ind1';
      var res = TAP.check.run(p);
      a.ok(res.errors.some(function (e) { return e.path === 'regions[1].id'; }), 'duplicate region id');
      a.ok(res.errors.some(function (e) { return e.path === 'regions[0].marketCoverage[1].industryId'; }), 'duplicate industry');
    });

    T.test('X-check-blanks', 'Blanks (null) are allowed for leader inputs and system figures', function (a) {
      var p = T_FIXTURE('mini');
      var row = p.regions[0].marketCoverage[0];
      ['growthPotential', 'currentArr', 'tier', 'commentary'].forEach(function (k) { row[k] = null; });
      p.regions[0].newBusiness[0].hitRate = null;
      p.regions[0].newBusiness[0].arrPotential = [null, null, null];
      var res = TAP.check.run(p);
      a.deepEqual(res.errors, [], errorList(res));
    });
  });
})(window.TAP);
