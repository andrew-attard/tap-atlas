/*
 * File: tests/test-check.js
 * Purpose: Tests for the contract check on load (TPV-TC-205, 206) and for its Phase 4 parts (US-4.1.2).
 * Provides: test cases for DATA stories (#57): TPV-TC-205, TPV-TC-206, X-check-*, X-review-DE-4, X-review-DE-5, X-review-DE-10,
 *           X-review-DE-12; for DATA4 (#437): TPV-TC-649, 650, 651, 653, 654, 655, 656 and X-p4-check-*
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

  // The mini fixture with every Phase 4 part (valid), then one thing broken
  function p4(change) {
    var p = window.TEST_FIXTURES.broken.withP4(T_FIXTURE('mini'));
    if (change) change(p);
    return p;
  }
  function messages(list) { return list.map(function (x) { return x.message; }); }
  var BASE = window.TEST_FIXTURES.broken.recorded.base;

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

    // Review DE-4: a worksheet row number used twice in a section was not reported.
    T.test('X-review-DE-4', 'A worksheet row number used twice in one section is a warning, in every list section', function (a) {
      var p = T_FIXTURE('mini'), r = p.regions[0];
      r.newBusiness[1].sourceRow = 20;                                            // row 20 twice
      r.customerGrowth.accounts[1].sourceRow = 10;                                // row 10 twice
      r.partners.push(Object.assign(copy(r.partners[0]), { name: 'Fictional Partner A2' }));   // row 10 twice
      var res = TAP.check.run(p), paths = res.warnings.map(function (w) { return w.path; });
      a.deepEqual(res.errors, [], errorList(res));
      ['regions[0].newBusiness[1].sourceRow', 'regions[0].customerGrowth.accounts[1].sourceRow', 'regions[0].partners[1].sourceRow']
        .forEach(function (path) { a.ok(paths.indexOf(path) >= 0, path + ' is warned about'); });
      a.ok(paths.indexOf('regions[0].customerGrowth.accounts[0].sourceRow') < 0, 'the first use of the number is fine');
      var w = res.warnings.filter(function (x) { return x.path === 'regions[0].customerGrowth.accounts[1].sourceRow'; })[0];
      a.ok(w && /row/.test(w.expected) && w.found === 10, 'says what it expected and what it found');
    });

    // Review DE-10: import dates that are not ISO dates loaded silently and could show the wrong day.
    T.test('X-review-DE-10', 'A date that is not an ISO date is a warning, and the data date skips it', function (a) {
      var p = T_FIXTURE('mini');
      p.meta.generatedAt = '2026/10/03';
      p.regions[0].source.fileModified = '28.09.2026';
      ['alpha', 'bravo', 'charlie'].forEach(function (id, i) { p.regions[i].source.importedAt = '12/31/2026'; });
      var res = TAP.check.run(p), paths = res.warnings.map(function (w) { return w.path; });
      a.deepEqual(res.errors, [], errorList(res));
      ['meta.generatedAt', 'regions[0].source.fileModified', 'regions[0].source.importedAt', 'regions[2].source.importedAt']
        .forEach(function (path) { a.ok(paths.indexOf(path) >= 0, path + ' is warned about'); });
      a.ok(paths.indexOf('regions[3].source.importedAt') < 0, 'an ISO date is fine');
      TAP.data.load(p);
      // A, B and C carry unreadable dates, so the latest readable import is Region D's (1 Oct), not "31 Dec 2026"
      a.equal(TAP.sources.dataDate(), '2026-10-01T15:00:00Z');
      a.equal(TAP.format.date(TAP.sources.dataDate()), '1 Oct 2026');
    });

    // Review DE-12: whole-number percentages, a repeated recap item and negative counts loaded silently.
    T.test('X-review-DE-12', 'Percentages above 150%, a repeated recap item and negative counts are warnings', function (a) {
      var p = T_FIXTURE('mini'), r = p.regions[0];
      r.newBusiness[0].hitRate = 25;                        // 25 instead of 0.25: 2,500%
      r.newBusiness[0].growth.year2 = 10;
      r.newBusiness[1].targetAccounts = -5;
      r.customerGrowth.accounts[0].growthPct = [10, 0, 0];
      r.partners[0].centralSupportPct = 10;
      r.partners[0].fteSales = -1;
      r.recap.push(copy(r.recap[0]));                       // the same year, channel, motion and type again
      var res = TAP.check.run(p), paths = res.warnings.map(function (w) { return w.path; });
      a.deepEqual(res.errors, [], errorList(res));
      ['regions[0].newBusiness[0].hitRate', 'regions[0].newBusiness[0].growth.year2', 'regions[0].newBusiness[1].targetAccounts',
        'regions[0].customerGrowth.accounts[0].growthPct[0]', 'regions[0].partners[0].centralSupportPct',
        'regions[0].partners[0].fteSales', 'regions[0].recap[2]']
        .forEach(function (path) { a.ok(paths.indexOf(path) >= 0, path + ' is warned about'); });
      a.ok(paths.indexOf('regions[0].recap[0]') < 0, 'the first recap item is fine');
      var q = T_FIXTURE('mini');
      q.regions[0].newBusiness[0].hitRate = 1.5;            // 150% is unusual but possible
      q.regions[0].customerGrowth.accounts[0].growthPct = [1.2, 0, 0];
      q.regions[0].newBusiness[1].targetAccounts = 0;
      var none = TAP.check.run(q).warnings.filter(function (w) { return /hitRate|growthPct|targetAccounts/.test(w.path); });
      a.deepEqual(none.map(function (w) { return w.path; }), [], 'up to 150% and a zero count are fine');
      var sample = TAP.check.run(copy(window.PLAN_DATA)).warnings.map(function (w) { return w.path; });
      a.deepEqual(sample, ['regions[4].customerGrowth.accounts'], 'the sample warns only about its planted empty section');
    });

    // Review DE-5: a region with the id of a combined figure ("rest", "org") shared its id with that figure.
    T.test('X-review-DE-5', 'The region ids "rest" and "org" are refused with a plain message', function (a) {
      ['rest', 'org'].forEach(function (id) {
        var p = T_FIXTURE('mini');
        p.regions[1].id = id;
        var res = TAP.check.run(p), e = res.errors.filter(function (x) { return x.path === 'regions[1].id'; })[0];
        a.ok(e, '"' + id + '" is an error at regions[1].id');
        a.ok(e && e.found === id && /rest/.test(e.expected) && /org/.test(e.expected), 'names both kept ids: ' + (e && e.message));
        a.equal(TAP.data.load(p).ok, false, 'the file does not load');
      });
      var ok = T_FIXTURE('mini');
      ok.regions[1].id = 'rest-of-world';
      a.deepEqual(TAP.check.run(ok).errors, [], 'an id that only starts with "rest" is fine');
    });

    /* ---------- Phase 4: the check covers the new parts (US-4.1.2) ---------- */

    window.TEST_FIXTURES.broken.p4Cases.forEach(function (c) {
      T.test(c.tc, 'Full template: broken file "' + c.id + '" gives a specific ' + (c.level === 'errors' ? 'error' : 'warning'), function (a) {
        var plan = p4(c.change), res = TAP.check.run(plan);
        var hit = res[c.level].filter(function (x) { return x.path === c.expect.path; })[0];
        a.ok(hit, 'an item for ' + c.expect.path + ' in ' + c.level + '; got: ' + messages(res.errors.concat(res.warnings)).join(' | '));
        if (!hit) return;
        ['region', 'item', 'expected', 'found'].forEach(function (k) { a.equal(hit[k], c.expect[k], k); });
        a.equal(hit.message, c.expect.path + ': expected ' + c.expect.expected + ', found ' +
          (typeof c.expect.found === 'string' && !/^(nothing|a list|a second|an )/.test(c.expect.found) ? JSON.stringify(c.expect.found) : c.expect.found),
          'the same form as the existing sections: path, expected, found');
        if (c.expect.message) a.equal(hit.message, c.expect.message, 'exact message');
        if (c.one) a.deepEqual(messages(res.errors), [hit.message], 'one error, and no other');
        if (c.level === 'warnings') {
          a.deepEqual(res.errors, [], 'a likely-wrong value is never an error');
          a.deepEqual(messages(res.warnings).filter(function (m) { return BASE.indexOf(m) < 0; }), [hit.message], 'one new warning');
          a.equal(TAP.data.load(plan).ok, true, 'the data still loads');
        } else {
          a.equal(TAP.data.load(plan).ok, false, 'the file does not load');
        }
      });
    });

    T.test('TPV-TC-653', 'A missing new part is never an error or a warning, alone or beside other parts', function (a) {
      var none = TAP.check.run(T_FIXTURE('mini'));
      a.deepEqual(none.errors, [], 'a file with none of the new parts');
      a.deepEqual(messages(none.warnings), BASE, 'and no warning about them');
      // Region B has a strategic plan but no base year, revenue, books value or routes
      var p = p4(), B = p.regions[1];
      a.ok(B.strategicPlan && !B.baseYear && !B.revenue && !B.booksValue && !B.routes, 'Region B: a strategic plan only');
      var res = TAP.check.run(p);
      a.deepEqual(res.errors, [], errorList(res));
      a.deepEqual(messages(res.warnings), BASE, 'no warning about the parts Region B lacks');
      // Each part on its own, in a file whose other regions have none
      ['revenue', 'booksValue', 'strategicPlan', 'baseYear', 'routes', 'outsourcingPct'].forEach(function (keep) {
        var one = p4(function (q) {
          delete q.regions[1].strategicPlan;
          ['revenue', 'booksValue', 'strategicPlan', 'baseYear', 'routes', 'outsourcingPct'].forEach(function (k) { if (k !== keep) delete q.regions[0][k]; });
        });
        var r = TAP.check.run(one);
        a.deepEqual(messages(r.errors), [], keep + ' alone: no errors');
        a.deepEqual(messages(r.warnings), BASE, keep + ' alone: no warnings');
      });
      // A part left as null or as an empty list reads as not provided
      var blank = p4(function (q) { q.regions[0].strategicPlan = null; q.regions[0].baseYear = null; q.regions[0].revenue = []; q.regions[0].routes = null; });
      var rb = TAP.check.run(blank);
      a.deepEqual(messages(rb.errors), [], 'null or empty parts: no errors');
      a.deepEqual(messages(rb.warnings), BASE, 'null or empty parts: no warnings');
    });

    T.test('TPV-TC-656', 'The broken cases from Phases 1 to 3 give the same errors and warnings, in number, level and wording, as before Phase 4', function (a) {
      var rec = window.TEST_FIXTURES.broken.recorded;
      a.equal(Object.keys(rec.cases).length, window.TEST_FIXTURES.broken.cases.length, 'every case has a record');
      window.TEST_FIXTURES.broken.cases.forEach(function (c) {
        var want = rec.cases[c.id], res = TAP.check.run(broken(c));
        a.deepEqual(messages(res.errors), want.errors || [], c.id + ': errors');
        a.deepEqual(messages(res.warnings), want.all || (want.first || []).concat(BASE, want.last || []), c.id + ': warnings');
      });
      var extras = T_FIXTURE('mini');
      window.TEST_FIXTURES.broken.extras(extras);
      a.deepEqual(messages(TAP.check.run(extras).warnings), BASE, 'unknown fields and sections are still ignored (D47)');
    });

    T.test('X-p4-check-tolerance', 'Small differences do not warn: a coverage within 5%, a variance within rounding, a direct books value above customer value', function (a) {
      var res = TAP.check.run(p4(function (p) {
        p.regions[0].baseYear.items[0].coverage = 2.6;          // 4% above 500 / 200 = 2.5
        p.regions[0].strategicPlan[0].variance = -20.4;         // books 580 - 600 = -20, within 0.5
        p.regions[0].strategicPlan[1].variance = null;          // a blank variance is not checked
      }));
      a.deepEqual(res.errors, [], errorList(res));
      a.deepEqual(messages(res.warnings), BASE);
      // Direct is not a reseller channel: 460 against a customer value of 450 is left alone.
      // The ARR variance follows the books value: 460 + 180 - 600 = 40.
      var direct = TAP.check.run(p4(function (p) { p.regions[0].booksValue[0].value = 460; p.regions[0].strategicPlan[0].variance = 40; }));
      a.deepEqual(messages(direct.warnings), BASE, 'no warning for a direct books value');
      // Perpetual software and hardware have no customer-value counterpart, so they are not compared: partner
      // hardware of 200 (ARR and services still 180 + 0 of 250) is fine. Its variance follows: 200 - 25 = 175.
      var hardware = TAP.check.run(p4(function (p) { p.regions[0].booksValue[4].value = 200; p.regions[0].strategicPlan[3].variance = 175; }));
      a.deepEqual(messages(hardware.warnings), BASE, 'no warning for hardware through a reseller channel');
      // A support share of up to 150% is unusual but possible, as for the existing shares
      var share = TAP.check.run(p4(function (p) { p.regions[0].partners[0].supportPct = [1.5, 1, 0]; p.regions[0].outsourcingPct = 1; }));
      a.deepEqual(messages(share.warnings), BASE, 'no warning for a share of 150% or less');
    });

    T.test('X-p4-check-not-compared', 'Nothing is compared where a part is missing: no recap, no books value, nothing still to win', function (a) {
      var res = TAP.check.run(p4(function (p) {
        var A = p.regions[0];
        A.recap = A.recap.filter(function (x) { return x.channel !== 'partner'; });   // no partner order intake to compare with
        A.revenue[1].value = 9999;
        A.booksValue[2].value = 9999;
        A.strategicPlan.forEach(function (x) { delete x.variance; });
        A.strategicPlan[4].variance = 77;                         // 2028: no books items for that year
        A.baseYear.items[0].actuals = 500;                        // forecast reached: no ratio to compare
        A.baseYear.items[0].coverage = 9;
      }));
      a.deepEqual(res.errors, [], errorList(res));
      a.deepEqual(messages(res.warnings), BASE);
    });

    T.test('X-p4-check-tracing', 'A new part without its sourceMap entry, sourceCell or sourceRow, or with an unreadable month, warns', function (a) {
      var res = TAP.check.run(p4(function (p) {
        delete p.meta.sourceMap.revenue;
        delete p.meta.sourceMap.baseYear.sheet;
        delete p.regions[0].routes[2].sourceCell;
        delete p.regions[0].baseYear.items[1].sourceRow;
        p.regions[0].baseYear.actualsThrough = 'August 2026';
      }));
      a.deepEqual(res.errors, [], errorList(res));
      var got = messages(res.warnings).filter(function (m) { return BASE.indexOf(m) < 0; });
      a.deepEqual(got, [
        'meta.sourceMap.revenue: expected the template map: a sheet and its columns for each section, found nothing',
        'meta.sourceMap.baseYear: expected the template map: a sheet and its columns for each section, found an object',
        'regions[0].baseYear.actualsThrough: expected a year and month, such as "2026-08", found "August 2026"',
        'regions[0].baseYear.items[1].sourceRow: expected the worksheet row number, found nothing',
        'regions[0].routes[2].sourceCell: expected the worksheet cell, for example "E5", found nothing']);
      // A file with no Phase 4 part needs no Phase 4 entry in the map
      a.deepEqual(messages(TAP.check.run(T_FIXTURE('mini')).warnings), BASE);
    });

    T.test('X-p4-check-lookups', 'The new lookups are checked like the existing ones; a maturity is free text only without its lookup', function (a) {
      var res = TAP.check.run(p4(function (p) {
        p.lookups.partnerTypes = 'see sheet 4';
        p.lookups.partnerMaturity[4].rank = 6;
        p.lookups.routes[0].id = 'webshop';
        delete p.lookups.productCategories[0].name;
      }));
      var paths = res.errors.map(function (e) { return e.path; });
      ['lookups.partnerTypes', 'lookups.partnerMaturity[4].rank', 'lookups.routes[0].id', 'lookups.productCategories[0].name']
        .forEach(function (path) { a.ok(paths.indexOf(path) >= 0, path + ' is an error; got ' + paths.join(', ')); });
      a.equal(res.errors.filter(function (e) { return e.path === 'lookups.partnerMaturity[4].rank'; })[0].expected, '1, 2, 3, 4 or 5');
      // Without lookups.partnerMaturity the mini fixture's "Developing" stays valid, as before Phase 4
      var free = T_FIXTURE('mini');
      a.equal(free.regions[0].partners[0].maturity, 'Developing');
      a.deepEqual(TAP.check.run(free).errors, []);
      // With it, an id, a name in any case, or a blank all pass
      var ok = p4(function (p) { p.regions[0].partners[0].maturity = ' skill '; p.regions[1].partners[0].maturity = null; p.regions[3].partners[0].maturity = 'ONBOARD'; });
      a.deepEqual(messages(TAP.check.run(ok).errors), []);
    });

    T.test('X-p4-check-garbage', 'Malformed Phase 4 parts give errors instead of crashing', function (a) {
      var res = TAP.check.run(p4(function (p) {
        var A = p.regions[0];
        A.revenue = 'none'; A.booksValue = [null, 7]; A.strategicPlan = {}; A.routes = [[]];
        A.baseYear = { year: '2026', items: 'n/a' };
        p.lookups.solutions = [null];
      }));
      var paths = res.errors.map(function (e) { return e.path; });
      ['regions[0].revenue', 'regions[0].booksValue[0]', 'regions[0].booksValue[1]', 'regions[0].strategicPlan', 'regions[0].routes[0]',
        'regions[0].baseYear.year', 'regions[0].baseYear.items', 'lookups.solutions[0]']
        .forEach(function (path) { a.ok(paths.indexOf(path) >= 0, path + ' is named; got ' + paths.join(', ')); });
      a.equal(TAP.data.load(p4(function (p) { p.regions[0].baseYear = 5; })).reason, 'invalid');
    });
  });
})(window.TAP);
