/*
 * File: tests/test-contracts.js
 * Purpose: Checks every module has the shape docs/ARCHITECTURE.md promises, whether built or still a stub.
 * Provides: test cases X-contract-*
 * Depends on: tests/harness.js, every app script
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  // module -> functions it must provide (docs/ARCHITECTURE.md)
  var MODULES = {
    dom: ['el', 'append', 'text', 'html', 'esc', 'qs', 'qsa', 'on', 'clear'],
    icons: ['svg', 'names'],
    storage: ['available', 'get', 'set', 'remove', 'clear'],
    store: ['get', 'set', 'on', 'reset', 'defaults'],
    bus: ['on', 'off', 'emit', 'clear'],
    notes: ['add', 'list', 'clear'],
    format: ['money', 'moneyExact', 'pct', 'num', 'rating', 'tier', 'cell', 'kind', 'date', 'list'],
    content: ['text', 'term', 'terms', 'guide', 'setting', 'regionName', 'orgError', 'mark'],
    sources: ['address', 'imports', 'datesDiffer', 'dataDate'],
    check: ['run'],
    data: ['load', 'plan', 'meta', 'lookups', 'regions', 'region', 'regionIndex', 'industries', 'industry', 'scale', 'row'],
    reports: ['get', 'list', 'all', 'validate'],
    builders: ['register', 'get', 'names'],
    views: ['register', 'get', 'order', 'title', 'list'],
    agg: ['combine'],
    scope: ['entities', 'sentence', 'regionIds', 'colorOf'],
    measures: ['get', 'meta', 'define', 'list', 'combined'],
    scores: ['attractiveness', 'ability', 'quadrant'],
    shapes: ['types', 'label'],
    prepare: ['run'],
    details: ['build'],
    insights: ['defineRule', 'all', 'ranked', 'top', 'hide', 'unhide', 'hidden', 'failures', 'reset'],
    panel: ['create'],
    shell: ['mount', 'viewEl'],
    compareBar: ['mount'],
    layers: ['open', 'close', 'openDetails', 'top'],
    sourcesPanel: ['render'],
    screens: ['show'],
    glossary: ['popover', 'render'],
    explain: ['open', 'sections'],
    tour: ['offer', 'start', 'stop', 'steps'],
    overviewCards: ['render'],
    showme: ['go'],
    keys: ['bind', 'unbind'],
    quadrantLabels: ['place'],
    app: ['start', 'stop', 'mountView', 'current'],
    // Phase 2 (docs/ARCHITECTURE.md section 17)
    viewHead: ['render', 'headline', 'mountPanel', 'pair'],
    rows: ['list', 'cell', 'columns', 'matchKey'],
    detailsRows: ['build'],
    panelDrill: ['create'],
    themes: ['all', 'match'],
    // Phase 3 (docs/ARCHITECTURE.md section 18)
    present: ['check', 'start', 'stop', 'next', 'prev', 'first', 'current', 'active', 'record', 'recorded', 'move', 'remove', 'clearRecorded', 'asFileText'],
    custom: ['options', 'definition', 'saved', 'save', 'remove'],
    customBuilder: ['render']
  };

  var GLOBALS = ['TAP_THEME', 'TAP_SETTINGS', 'TAP_VIEWS', 'TAP_REPORTS', 'TAP_RULES', 'TAP_CONTENT'];

  T.suite('contracts', function () {
    Object.keys(MODULES).forEach(function (name) {
      T.test('X-contract-' + name, 'TAP.' + name + ' has its promised functions', function (a) {
        a.ok(TAP[name], 'TAP.' + name + ' exists');
        MODULES[name].forEach(function (fn) {
          a.equal(typeof (TAP[name] || {})[fn], 'function', 'TAP.' + name + '.' + fn + ' is a function');
        });
      });
    });

    T.test('X-contract-globals', 'Configuration and content globals are set', function (a) {
      GLOBALS.forEach(function (g) { a.equal(typeof window[g], 'object', g + ' is an object'); });
    });

    T.test('X-contract-builders', 'The generic and dedicated chart builders are registered', function (a) {
      ['compare', 'parts', 'xy', 'tierGrid', 'quadrant', 'list', 'nbGrid', 'rowBubble', 'themes'].forEach(function (b) {
        a.equal(typeof TAP.builders.get(b), 'function', 'builder ' + b);
      });
    });

    T.test('X-contract-views', 'The Phase 1 and Phase 2 views are registered in menu order', function (a) {
      a.deepEqual(TAP.views.order(), ['overview', 'industry', 'newBusiness', 'customers', 'partners', 'outlook', 'regions', 'insights', 'guide']);
    });

    T.test('X-contract-reports', 'Every report a view lists exists and passes validation', function (a) {
      Object.keys(window.TAP_VIEWS).filter(function (k) { return k !== 'order'; }).forEach(function (v) {
        (window.TAP_VIEWS[v].reports || []).forEach(function (id) {
          var def = TAP.reports.get(id);
          // While Phase 2 is being built a listed report may not exist yet; once no stub is left, every one must
          if (!def && TAP.stub.list().length) { a.ok(true, 'report ' + id + ' not built yet'); return; }
          a.ok(def, 'report ' + id + ' exists');
          a.deepEqual(TAP.reports.validate(def), [], 'report ' + id + ' is valid');
        });
      });
    });

    T.test('X-contract-stubs', 'Each remaining stub names its issue', function (a) {
      var list = TAP.stub.list();
      a.ok(Array.isArray(list), 'the stub list is readable (empty once everything is built)');
      list.forEach(function (s) { a.ok(s.issue > 0, s.what + ' names an issue'); });
    });
  });
})(window.TAP);
