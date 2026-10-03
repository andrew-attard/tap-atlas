/*
 * File: tests/test-core.js
 * Purpose: Tests for the core modules: store and events, storage, page helpers, data loading, wording, report checks.
 * Provides: test cases TPV-TC-047, TPV-TC-185 and X-core-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, tests/fixtures/mini-data.js
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  T.suite('store', function () {
    T.test('X-core-store-defaults', 'The store opens on Overview with All regions and no focus', function (a) {
      var s = TAP.store.get();
      a.equal(s.view, 'overview');
      a.deepEqual(s.cmp, { mode: 'all', focus: null, second: null, set: [], restAs: 'combined', restAgg: 'average' });
      a.deepEqual(s.hiddenInsights, []);
    });

    T.test('X-core-store-merge', 'Setting part of the comparison keeps the rest', function (a) {
      TAP.store.set({ cmp: { mode: 'one', focus: 'bravo' } });
      var c = TAP.store.get().cmp;
      a.equal(c.mode, 'one');
      a.equal(c.focus, 'bravo');
      a.equal(c.restAgg, 'average');
    });

    T.test('X-core-store-epoch', 'Comparison and view changes raise scopeEpoch; other changes don’t', function (a) {
      var e0 = TAP.store.get().scopeEpoch;
      TAP.store.set({ industry: 'ind2' });
      a.equal(TAP.store.get().scopeEpoch, e0, 'industry change');
      TAP.store.set({ cmp: { mode: 'org' } });
      a.equal(TAP.store.get().scopeEpoch, e0 + 1, 'comparison change');
      TAP.store.set({ view: 'industry' });
      a.equal(TAP.store.get().scopeEpoch, e0 + 2, 'view change');
      TAP.store.set({ view: 'industry' });
      a.equal(TAP.store.get().scopeEpoch, e0 + 2, 'no change, no raise');
    });

    T.test('X-core-store-notify', 'Subscribers hear each change once, with the changed keys', function (a) {
      var calls = [];
      var off = TAP.store.on(function (s, changed) { calls.push(changed.slice().sort()); });
      TAP.store.set({ cmp: { mode: 'pair', focus: 'alpha', second: 'delta' } });
      TAP.store.set({ highlight: { reportId: 'ind-tiers', industryIds: ['ind1'] } });
      off();
      TAP.store.set({ industry: 'ind3' });
      a.deepEqual(calls, [['cmp', 'scopeEpoch'], ['highlight']]);
    });

    T.test('X-core-bus', 'Bus events reach their handlers and can be removed', function (a) {
      var got = [];
      var off = TAP.bus.on('industry:select', function (p) { got.push(p.industryId); });
      TAP.bus.emit('industry:select', { industryId: 'ind4' });
      off();
      TAP.bus.emit('industry:select', { industryId: 'ind1' });
      a.deepEqual(got, ['ind4']);
    });
  });

  T.suite('storage', function () {
    T.test('X-core-storage', 'Stored choices come back, and clearing by prefix removes only those', function (a) {
      TAP.storage.set('chart:test-a', 'bubble');
      TAP.storage.set('chart:test-b', { t: 'table' });
      TAP.storage.set('other:test', 1);
      a.equal(TAP.storage.get('chart:test-a'), 'bubble');
      a.deepEqual(TAP.storage.get('chart:test-b'), { t: 'table' });
      TAP.storage.clear('chart:');
      a.equal(TAP.storage.get('chart:test-a', 'none'), 'none');
      a.equal(TAP.storage.get('other:test'), 1);
      TAP.storage.remove('other:test');
      a.equal(TAP.storage.get('other:test', null), null);
    });
  });

  T.suite('dom', function () {
    T.test('X-core-dom-esc', 'Text is escaped before it becomes HTML', function (a) {
      a.equal(TAP.dom.esc('<b>"A" & \'B\'</b>'), '&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;');
      a.equal(TAP.dom.esc(null), '');
    });

    T.test('X-core-dom-el', 'Elements are built with attributes, text and children', function (a) {
      var clicked = 0;
      var n = TAP.dom.el('button', { class: 'x', 'data-id': 'r1', onclick: function () { clicked++; } }, ['Go ', TAP.dom.el('b', { text: 'now' })]);
      a.equal(n.className, 'x');
      a.equal(n.getAttribute('data-id'), 'r1');
      a.equal(n.textContent, 'Go now');
      n.click();
      a.equal(clicked, 1);
    });

    T.test('X-core-icons', 'Icons are inline SVG and decorative unless labelled', function (a) {
      var i = TAP.icons.svg('info');
      a.ok(i.querySelector('svg'), 'has an svg');
      a.equal(i.querySelector('svg').getAttribute('aria-hidden'), 'true');
      var l = TAP.icons.svg('info', { label: 'Explain' });
      a.equal(l.querySelector('svg').getAttribute('aria-label'), 'Explain');
    });
  });

  T.suite('data', function () {
    T.test('X-core-data-missing', 'No data file gives the "missing" reason', function (a) {
      var r = TAP.data.load(null);
      a.equal(r.ok, false);
      a.equal(r.reason, 'missing');
    });

    T.test('X-core-data-version', 'A different contract version gives the "version" reason, naming both versions', function (a) {
      var p = T_FIXTURE('mini');
      p.meta.schemaVersion = '0.1';
      var r = TAP.data.load(p);
      a.equal(r.reason, 'version');
      a.equal(r.errors[0].found, '0.1');
      a.equal(r.errors[0].expected, TAP.schemaVersion);
    });

    T.test('X-core-data-read', 'Loaded data is read in file order, and unrated industries can be left out', function (a) {
      a.equal(TAP.data.load(T_FIXTURE('mini')).ok, true);
      a.deepEqual(TAP.data.regions().map(function (r) { return r.id; }), ['alpha', 'bravo', 'charlie', 'delta']);
      a.equal(TAP.data.regionIndex('charlie'), 2);
      a.equal(TAP.data.region('delta').name, 'Region D');
      a.equal(TAP.data.industries().length, 5);
      a.equal(TAP.data.industries({ rated: true }).length, 4);
      a.equal(TAP.data.scale('expertise').levels[0].score, 3);
      a.equal(TAP.data.row('alpha', 'accounts', function (x) { return x.id === 'a4'; }).multiplier3y, 2);
    });
  });

  T.suite('content', function () {
    T.test('X-core-content-text', 'Wording is filled in, and a missing key is shown in brackets', function (a) {
      a.equal(TAP.content.text('scope.oneAverage', { focus: 'Region C', n: 3 }), 'Showing Region C against the average of the other 3 regions');
      a.equal(TAP.content.text('no.such.key'), '[no.such.key]');
    });

    T.test('X-core-content-org', 'The organization layer overrides wording and glossary entries, and is optional', function (a) {
      var saved = window.TAP_ORG;
      try {
        window.TAP_ORG = { text: { banner: { internal: 'Org label' } }, glossary: { arr: { term: 'ARR', short: 'Org meaning' } } };
        a.equal(TAP.content.text('banner.internal'), 'Org label');
        a.equal(TAP.content.term('ARR').short, 'Org meaning');
        a.equal(TAP.content.term('arr').layer, 'organization');
        window.TAP_ORG = undefined;
        a.equal(TAP.content.text('banner.sample'), 'Sample data: all figures are fictional');
        window.TAP_ORG = 'broken';
        a.equal(TAP.content.text('banner.sample'), 'Sample data: all figures are fictional');
        a.ok(TAP.content.orgError(), 'a broken organization file is reported');
      } finally {
        window.TAP_ORG = saved;
      }
    });
  });

  T.suite('report definitions', function () {
    T.test('TPV-TC-047', 'Every shipped report definition has all required fields and only allowed values', function (a) {
      var all = TAP.reports.all();
      a.ok(Object.keys(all).length >= 4, 'the Phase 1 reports are defined');
      Object.keys(all).forEach(function (id) {
        a.deepEqual(TAP.reports.validate(all[id]), [], id);
        a.equal(all[id].id, id, id + ' is filed under its own id');
      });
    });

    T.test('TPV-TC-047', 'An invalid definition is caught with plain messages', function (a) {
      var errs = TAP.reports.validate({ id: 'x', view: 'overview', title: 'X', shape: 'pie', defaultType: 'donut',
        types: ['donut'], explain: { shows: 'a' }, measures: [] });
      a.ok(errs.some(function (e) { return /shape/.test(e); }), 'bad shape');
      a.ok(errs.some(function (e) { return /Unknown chart type "donut"/.test(e); }), 'bad type');
      a.ok(errs.some(function (e) { return /table/.test(e); }), 'missing table');
      a.ok(errs.some(function (e) { return /explain/.test(e); }), 'incomplete explanation');
      a.ok(errs.some(function (e) { return /measures/.test(e); }), 'no measures');
      a.deepEqual(TAP.reports.validate(null), ['The report definition is missing.']);
    });

    T.test('TPV-TC-185', 'Every report definition has all three explanation texts, none empty', function (a) {
      var all = TAP.reports.all();
      Object.keys(all).forEach(function (id) {
        var e = all[id].explain || {};
        ['shows', 'read', 'lookFor'].forEach(function (k) {
          a.ok(typeof e[k] === 'string' && e[k].trim().length > 20, id + ' explain.' + k);
        });
      });
    });
  });
})(window.TAP);
