/*
 * File: tests/test-sources.js
 * Purpose: Tests for source addresses and import summaries (TPV-TC-020).
 * Provides: test cases for DATA stories (#6): TPV-TC-020, X-sources-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, tests/fixtures/mini-expected.js,
 *             tests/fixtures/sample-expected.js and data/sample-plan-data.js (for the sample's check figures)
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var X = window.TEST_EXPECT.mini;

  T.suite('sources', function () {
    T.test('TPV-TC-020', 'Mini fixture: each check figure gives its expected file › sheet › cell', function (a) {
      X.sources.forEach(function (c) {
        var ad = TAP.sources.address(c.src);
        a.equal(ad.text, c.text, c.src.regionId + ' ' + c.src.field);
        a.equal(ad.calculated, c.calculated, 'calculated: ' + c.src.field);
        a.equal(ad.combined, false, 'not combined');
      });
    });

    T.test('X-sources-parts', 'An address also gives its file, sheet and cell separately, and the region', function (a) {
      var ad = TAP.sources.address(X.sources[1].src);
      a.equal(ad.file, 'Region B plan.xlsx');
      a.equal(ad.sheet, '2. New Business');
      a.equal(ad.cell, 'P21');
      a.deepEqual(ad.regions, ['Region B']);
    });

    T.test('X-sources-years', 'Fields held by year use the column for plan year 1, 2 or 3', function (a) {
      var base = { regionId: 'delta', section: 'customerGrowth', field: 'incrementalArr', row: 10, kind: 'DER' };
      var cells = [1, 2, 3].map(function (y) {
        return TAP.sources.address({ regionId: base.regionId, section: base.section, field: base.field, row: base.row, year: y, kind: 'DER' }).cell;
      });
      a.deepEqual(cells, ['N10', 'O10', 'P10']);
    });

    T.test('X-sources-combined', 'A combined figure says the app combined it and lists the regions it came from', function (a) {
      var ad = TAP.sources.address({ combined: true, how: 'mean', regionIds: ['bravo', 'charlie', 'delta'], excluded: ['charlie'] });
      a.equal(ad.combined, true);
      a.equal(ad.calculated, false);
      a.equal(ad.file, null);
      a.deepEqual(ad.regions, ['Region B', 'Region D']);
      a.deepEqual(ad.excluded, ['Region C']);
      a.equal(ad.text, TAP.content.text('sources.combined.mean', { n: 2 }));
      a.equal(ad.text, 'Combined by this app: average of 2 regions');
      var total = TAP.sources.address({ combined: true, how: 'sum', regionIds: ['alpha', 'bravo', 'charlie', 'delta'], excluded: [] });
      a.equal(total.text, 'Combined by this app: total of 4 regions');
      a.deepEqual(total.excluded, []);
    });

    T.test('X-sources-org-names', 'Region names come from the organization layer when it has a short name', function (a) {
      var saved = window.TAP_ORG;
      try {
        window.TAP_ORG = { regions: { bravo: 'B-short' } };
        var ad = TAP.sources.address({ combined: true, how: 'sum', regionIds: ['alpha', 'bravo'], excluded: [] });
        a.deepEqual(ad.regions, ['Region A', 'B-short']);
        a.equal(TAP.sources.imports()[1].name, 'B-short');
      } finally {
        window.TAP_ORG = saved;
      }
    });

    T.test('X-sources-unknown', 'An unknown region or section still gives a readable address instead of failing', function (a) {
      var ad = TAP.sources.address({ regionId: 'nowhere', section: 'marketCoverage', field: 'tier', row: 12, kind: 'IN' });
      a.equal(ad.file, TAP.content.text('sources.unknownFile'));
      a.equal(ad.cell, 'M12');
      var ad2 = TAP.sources.address({ regionId: 'alpha', section: 'pricing', field: 'value', row: 5, kind: 'IN' });
      a.equal(ad2.text, 'Region A plan.xlsx');
      a.equal(ad2.sheet, null);
      a.equal(TAP.sources.address(null), null);
    });

    T.test('X-sources-imports', 'Imports list each region with file, dates and notes; the data date is the latest import', function (a) {
      var list = TAP.sources.imports();
      a.deepEqual(list.map(function (r) { return r.regionId; }), ['alpha', 'bravo', 'charlie', 'delta']);
      a.deepEqual(Object.keys(list[0]).sort(), ['fileModified', 'fileName', 'importedAt', 'name', 'notes', 'regionId']);
      a.equal(list[2].fileName, 'Region C plan.xlsx');
      a.equal(list[3].importedAt, '2026-10-01T15:00:00Z');
      Object.keys(X.imports.notesFor).forEach(function (id) {
        var row = list.filter(function (r) { return r.regionId === id; })[0];
        a.equal(row.notes.length, X.imports.notesFor[id], 'notes for ' + id);
      });
      a.equal(TAP.sources.dataDate(), X.imports.dataDate);
      a.equal(TAP.sources.datesDiffer(), X.imports.datesDiffer);
    });

    T.test('X-sources-same-day', 'Imports on the same day at different times do not count as different dates', function (a) {
      var p = T_FIXTURE('mini');
      p.regions[3].source.importedAt = '2026-10-02T16:30:00Z';
      TAP.data.load(p);
      a.equal(TAP.sources.datesDiffer(), false);
      a.equal(TAP.sources.dataDate(), '2026-10-02T16:30:00Z');
    });
  });
})(window.TAP);
