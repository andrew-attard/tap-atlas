/*
 * File: tests/test-extra.js
 * Purpose: Tests for extra template sections (US-3.2.1) and the Other sections view.
 * Provides: test cases TPV-TC-574 to TPV-TC-579 (automated ones) and X-extra-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, tests/fixtures/mini-data.js,
 *             data/sample-plan-data.js (window.PLAN_DATA), tests/fixtures/sample-expected.js (SAMPLE_EXPECT.extra)
 * Used by: tests.html
 * Owner: EXTRA stream
 */
(function (TAP) {
  'use strict';

  var SRC = 'extra:events';
  function E() { return window.SAMPLE_EXPECT.extra; }
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  function sample() { return copy(window.PLAN_DATA); }
  function loadSample() { var r = TAP.data.load(sample()); if (TAP.insights && TAP.insights.reset) TAP.insights.reset(); return r; }
  function about(list) { return list.filter(function (w) { return /extra/i.test(w.path); }); }
  function messages(list) { return list.map(function (w) { return w.message; }).join(' | '); }
  function regionIndex(p, id) { return p.regions.map(function (r) { return r.id; }).indexOf(id); }

  // Broken extra sections: each must give one warning at the path, naming the section and the field, and still load.
  var BROKEN = [
    { id: 'unknown unit', tc: 'TPV-TC-576', path: 'meta.extraSections[0].columns[4].unit', field: 'unit', found: 'euros',
      change: function (p) { p.meta.extraSections[0].columns[4].unit = 'euros'; } },
    { id: 'unknown kind', tc: 'TPV-TC-576', path: 'meta.extraSections[0].columns[1].kind', field: 'kind', found: 'MANUAL',
      change: function (p) { p.meta.extraSections[0].columns[1].kind = 'MANUAL'; } },
    { id: 'row naming an unknown column', tc: 'TPV-TC-576', path: 'regions[0].extra.events[1]', field: 'venue', found: 'venue',
      change: function (p) { p.regions[0].extra.events[1].venue = 'Hall B'; } },
    { id: 'extra sections not a list', tc: 'X-extra-check', path: 'meta.extraSections', field: 'extraSections', section: null,
      change: function (p) { p.meta.extraSections = { events: true }; } },
    { id: 'duplicate section id', tc: 'X-extra-check', path: 'meta.extraSections[1].id', field: 'id',
      change: function (p) { p.meta.extraSections.push(copy(p.meta.extraSections[0])); } },
    { id: 'reserved column key', tc: 'X-extra-check', path: 'meta.extraSections[0].columns[0].key', field: 'key',
      change: function (p) { p.meta.extraSections[0].columns[0].key = 'region'; } },
    { id: 'region names a section not listed', tc: 'X-extra-check', path: 'regions[0].extra.pricing', field: 'pricing', section: 'pricing',
      change: function (p) { p.regions[0].extra.pricing = []; } },
    { id: 'row without its source row', tc: 'X-extra-check', path: 'regions[0].extra.events[0].sourceRow', field: 'sourceRow',
      change: function (p) { delete p.regions[0].extra.events[0].sourceRow; } },
    { id: 'text in a money column', tc: 'X-extra-check', path: 'regions[0].extra.events[0].budget', field: 'budget',
      change: function (p) { p.regions[0].extra.events[0].budget = '45k'; } }
  ];

  T.suite('extra', function () {
    /* ---------- US-3.2.1 extra sections in the Data Contract ---------- */

    T.test('TPV-TC-574', 'The mini fixture has no extra sections and the check says nothing about them', function (a) {
      var res = TAP.check.run(T_FIXTURE('mini'));
      a.deepEqual(res.errors, [], messages(res.errors));
      a.deepEqual(about(res.warnings), [], messages(about(res.warnings)));
      a.equal(TAP.extra.sections().length, 0, 'no sections');
      a.equal(TAP.extra.any(), false, 'any() is false');
      a.deepEqual(TAP.rows.list(SRC), [], 'no rows');
    });

    T.test('TPV-TC-575', 'The sample data with its extra section passes the check with no errors and no extra-section warnings', function (a) {
      var res = TAP.check.run(sample());
      a.deepEqual(res.errors, [], messages(res.errors));
      a.deepEqual(about(res.warnings), [], messages(about(res.warnings)));
      a.ok(loadSample().ok, 'the sample loads');
    });

    BROKEN.forEach(function (c) {
      T.test(c.tc, 'Broken extra section, ' + c.id + ': a warning naming the section and the field; the data still loads', function (a) {
        var p = sample();
        c.change(p);
        var res = TAP.check.run(copy(p)), hit = res.warnings.filter(function (w) { return w.path === c.path; })[0];
        a.deepEqual(res.errors, [], 'no errors: ' + messages(res.errors));
        a.ok(hit, 'a warning at ' + c.path + '; got: ' + messages(about(res.warnings)));
        if (hit) {
          var section = c.section !== undefined ? c.section : E().title;
          if (section) a.ok(hit.message.indexOf('"' + section + '"') > 0, 'names the section: ' + hit.message);
          a.ok(hit.message.indexOf(c.field) >= 0, 'names the field: ' + hit.message);
          a.ok(hit.message.indexOf(c.path + ' ') === 0 || hit.message.indexOf(c.path + ':') === 0, 'starts with the path: ' + hit.message);
          if (c.found) a.equal(hit.found, c.found, 'found');
          a.ok(hit.expected, 'says what was expected');
        }
        var load = TAP.data.load(p);
        a.ok(load.ok, 'the app still loads');
        a.ok(load.warnings.some(function (w) { return w.path === c.path; }), 'the warning reaches the data sources panel list');
        a.ok(Array.isArray(TAP.extra.sections()) && Array.isArray(TAP.rows.list(SRC)), 'reading the sections never throws');
      });
    });

    T.test('X-extra-check', 'Every extra-section warning has path, region, item, expected, found and message', function (a) {
      BROKEN.forEach(function (c) {
        var p = sample();
        c.change(p);
        about(TAP.check.run(p).warnings).forEach(function (w) {
          ['path', 'region', 'item', 'expected', 'found', 'message'].forEach(function (k) { a.ok(k in w, c.id + ': ' + k); });
        });
      });
      var p = sample();
      p.regions[regionIndex(p, 'neu')].extra = 'events';
      var w = TAP.check.run(p).warnings.filter(function (x) { return x.path === 'regions[2].extra'; })[0];
      a.ok(w && w.region === 'Northern Europe', 'a region-level warning names the region');
    });

    T.test('X-extra-tolerant', 'Malformed sections are skipped quietly when reading; a good one next to them still reads', function (a) {
      var p = sample();
      p.meta.extraSections.unshift(null, { id: '', columns: [] }, { id: 'x', title: 'X' });
      p.meta.extraSections[3].columns.push({ key: 'region' }, null);
      TAP.data.load(p);
      a.deepEqual(TAP.extra.sections().map(function (s) { return s.id; }), ['events'], 'only the usable section');
      a.deepEqual(TAP.rows.columns(SRC).map(function (c) { return c.key; }), ['region'].concat(E().columns), 'bad columns left out');
      a.equal(TAP.rows.list(SRC).length, E().total, 'rows still listed');
    });

    T.test('TPV-TC-579', 'The sample data has one extra section, with rows for at least one region', function (a) {
      loadSample();
      var list = TAP.extra.sections();
      a.equal(list.length, 1, 'one section');
      a.equal(list[0].id, E().id, 'id');
      a.equal(list[0].title, E().title, 'title');
      a.equal(list[0].intro, E().intro, 'intro');
      a.ok(TAP.extra.any(), 'any() is true');
      var counts = {};
      TAP.data.regions().forEach(function (r) { counts[r.id] = TAP.rows.list(SRC, [r.id]).length; });
      a.deepEqual(counts, E().rows, 'rows per region');
      a.ok(Object.keys(counts).some(function (k) { return counts[k] > 0; }), 'some region has rows');
    });

    T.test('X-extra-rows', 'TAP.rows serves the section: the region then its columns in order, every row, values as cells', function (a) {
      loadSample();
      var raw = window.PLAN_DATA.meta.extraSections[0].columns, cols = TAP.rows.columns(SRC);
      a.deepEqual(cols.map(function (c) { return c.key; }), ['region'].concat(E().columns), 'column keys in order');
      a.deepEqual(cols.slice(1).map(function (c) { return c.label; }), E().labels, 'labels');
      raw.forEach(function (c, i) { a.equal(cols[i + 1].unit, c.unit, c.key + ' unit'); a.equal(cols[i + 1].kind, c.kind, c.key + ' kind'); });
      var all = TAP.rows.list(SRC);
      a.equal(all.length, E().total, 'every row');
      var order = TAP.data.regions().map(function (r) { return r.id; });
      a.ok(all.every(function (e, i) {
        var b = all[i - 1];
        return !b || order.indexOf(b.regionId) < order.indexOf(e.regionId) || (b.regionId === e.regionId && b.sourceRow < e.sourceRow);
      }), 'region file order, then row order');
      a.equal(all[0].id, all[0].regionId + ':' + all[0].sourceRow, 'row id');
      E().values.forEach(function (v) {
        var c = TAP.rows.cell(SRC, v[2], { regionId: v[0], row: v[1] });
        a.equal(c.state, 'value', v.join(' ') + ' state');
        a.equal(c.v, v[3], v.join(' ') + ' value');
      });
      var b = E().blank, blank = TAP.rows.cell(SRC, b[2], { regionId: b[0], row: b[1] });
      a.equal(blank.state, 'notProvided', 'a blank budget is not provided');
      a.equal(TAP.rows.cell(SRC, 'perAccount', { regionId: 'na', row: 8 }).kind, 'DER', 'calculated in the workbook');
      a.equal(TAP.rows.cell(SRC, 'region', all[0]).v, TAP.content.regionName(TAP.data.region(all[0].regionId)), 'region name');
      a.equal(TAP.rows.section(SRC), SRC, 'the section is the source itself');
      a.equal(TAP.rows.rowSrc(SRC, 'na', 9).field, 'event', 'a row is addressed by its first text column');
      a.deepEqual(TAP.rows.list('extra:nothing'), [], 'an unknown section has no rows');
      a.deepEqual(TAP.rows.columns('extra:nothing'), [], 'and no columns');
    });

    T.test('TPV-TC-577', 'Every value in the sample extra section traces to file, section (as the sheet) and its source row', function (a) {
      loadSample();
      E().sources.forEach(function (s) {
        var c = TAP.rows.cell(SRC, s.src.field, { regionId: s.src.regionId, row: s.src.row });
        var ad = TAP.sources.address(c.src);
        a.equal(ad.text, s.text, s.text);
        a.equal(ad.calculated, s.calculated, s.text + ' calculated');
      });
      var n = 0;
      TAP.rows.list(SRC).forEach(function (e) {
        var file = TAP.data.region(e.regionId).source.fileName;
        TAP.rows.columns(SRC).forEach(function (col) {
          var ad = TAP.sources.address(TAP.rows.cell(SRC, col.key, e).src);
          n++;
          a.ok(ad.file === file && ad.sheet === E().title && new RegExp('[A-Z]' + e.sourceRow + '$').test(ad.cell),
            e.id + ' ' + col.key + ': ' + ad.text);
        });
      });
      a.ok(n > E().total, 'checked ' + n + ' values');
      var p = sample();
      delete p.meta.extraSections[0].columns[0].column;
      TAP.data.load(p);
      var ad = TAP.sources.address(TAP.rows.cell(SRC, 'event', { regionId: 'na', row: 9 }).src);
      a.equal(ad.text, 'North America plan.xlsx › ' + E().title + ' › row 9', 'without a column letter the row is named');
    });
  });
})(window.TAP);
