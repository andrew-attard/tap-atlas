/*
 * File: tests/test-import-ui.js
 * Purpose: Tests of the in-app import, UI stream (docs/ARCHITECTURE.md section 20): the Import panel as a layer and
 *          under the start-up screens, the report drawn from a canned result, the three actions, the Import button.
 *          The engine (TAP.importPlan, TAP.importMap, TAP.importWrite) is swapped for stand-ins and restored after.
 * Provides: test cases TPV-TC-852 to TPV-TC-867 (TPV-TC-855 also covers the grouped warnings, US-1.8.8, and the notes by kind, US-1.8.9), TPV-TC-905,
 *           X-owner-ui-* (the folded warnings heading, US-1.8.10, and the reports for workbook owners, US-1.8.11; the lead assigns Test Plan ids)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, tests/fixtures/mini-data.js, config/import-map.js
 * Used by: tests.html
 * Owner: UI stream (#587); the X-owner-ui-* cases by REPORTS (#615, #616)
 */
(function (TAP) {
  'use strict';

  var qs = function (sel, root) { return root.querySelector(sel); };
  var qsa = function (sel, root) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  var t = function (key, vars) { return TAP.content.text('importPanel.' + key, vars); };
  function click(node) { node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
  function px(node) { return parseFloat(getComputedStyle(node).fontSize); }
  // A turn of the event loop, so promise chains inside the panel have settled.
  function tick() { return new Promise(function (resolve) { setTimeout(resolve, 0); }); }

  // The app in a sandbox, stopped again afterwards (as tests/test-shell.js does).
  function startApp(plan) {
    var root = T.dom.mount();
    TAP.app.start({ root: root, plan: plan || T_FIXTURE('mini') });
    return root;
  }
  function stopApp() {
    try { TAP.app.start({ root: T.dom.mount(), plan: null }); } catch (e) { /* screens may be a stub */ }
    TAP.data.load(T_FIXTURE('mini'));
  }
  function withApp(fn) {
    var out;
    try { out = fn(); } catch (e) { stopApp(); throw e; }
    if (out && out.then) return out.then(function (v) { stopApp(); return v; }, function (e) { stopApp(); throw e; });
    stopApp();
    return out;
  }

  // Swaps functions for stand-ins while fn runs (fn may return a promise), then puts every one back.
  // fakes: [[object, key, replacement], ...]
  function withFakes(fakes, fn) {
    var saved = fakes.map(function (f) { return f[0][f[1]]; });
    function restore() { fakes.forEach(function (f, i) { f[0][f[1]] = saved[i]; }); }
    fakes.forEach(function (f) { f[0][f[1]] = f[2]; });
    var out;
    try { out = fn(); } catch (e) { restore(); throw e; }
    if (out && out.then) return out.then(function (v) { restore(); return v; }, function (e) { restore(); throw e; });
    restore();
    return out;
  }
  // The mapping module as the READ stream will build it, far enough for the panel: the shipped sample mapping, no problems.
  function mapFakes() {
    return [[TAP.importMap, 'get', function () { return window.IMPORT_MAP || null; }], [TAP.importMap, 'problems', function () { return []; }]];
  }
  function spy(ret) {
    var fn = function () { fn.calls.push(Array.prototype.slice.call(arguments)); return typeof ret === 'function' ? ret() : ret; };
    fn.calls = [];
    return fn;
  }

  var NOW = '2026-10-12T09:30:00Z';
  function reading(id, name, extra) {
    return Object.assign({
      ok: true, id: id, name: name, fileName: name + ' plan.xlsx',
      region: { id: id, name: name, source: { fileName: name + ' plan.xlsx', fileModified: '2026-09-30T10:15:00Z', importedAt: NOW, notes: [] } },
      errors: [], notes: [],
      parts: { marketCoverage: 'read', newBusiness: 'read', customerGrowth: 'read', partners: 'read', recap: 'read' }
    }, extra || {});
  }
  // Two regions read, one left out with an error and two notes, one mapped region without a workbook, one warning.
  function canned() {
    return {
      mapProblems: [],
      regions: [
        reading('alpha', 'Region A'),
        reading('bravo', 'Region B', { notes: [{ message: 'The recap block is empty.', sheet: '4. Partner', cell: null, kind: 'emptySection', item: 'Recap', found: null, expected: null }], parts: { marketCoverage: 'read', newBusiness: 'read', customerGrowth: 'read', partners: 'read', recap: 'empty' } }),
        reading('charlie', 'Region C', {
          ok: false, region: null,
          errors: [{ message: 'The sheet is missing.', sheet: '2. New Business', cell: null, kind: 'missingSheet', item: 'New Business', found: null, expected: '2. New Business' }],
          // Two notes with kinds (D163) and one from an older file without
          notes: [{ message: 'The rating is not one of the allowed options.', sheet: '1. Market Coverage', cell: 'D12', kind: 'badValue', item: 'Healthcare, growth potential', found: '"Great"', expected: null },
            { message: 'The channel split adds up to 95%.', sheet: '2. New Business', cell: 'E12:H12', kind: 'splitSum', item: 'Healthcare', found: '95%', expected: '100%' },
            { message: 'An older note without a kind.', sheet: '1. Market Coverage', cell: 'F12' }],
          parts: { marketCoverage: 'read', newBusiness: 'missing', customerGrowth: 'read', partners: 'empty', recap: 'read' }
        })
      ],
      missing: [{ id: 'delta', name: 'Region D' }],
      plan: T_FIXTURE('mini'),
      check: { errors: [], warnings: [{ path: 'regions[1].partners', region: 'Region B', item: null, field: 'partners', kind: 'items', expected: 'at least one item',
        found: 'an empty list', message: 'regions[1].partners: expected at least one item, found an empty list' }] },
      usable: true
    };
  }
  function unusable() {
    var r = canned();
    r.check.errors = [{ path: 'regions[0].marketCoverage[2].tier', region: 'Region A', item: 'Retail', expected: '1, 2, 3 or blank', found: 'Tier 1-2', message: 'The tier is not 1, 2 or 3.' }];
    r.usable = false;
    return r;
  }
  function buttons(host) {
    return { use: qs('[data-action="use"]', host), save: qs('[data-action="save"]', host), copy: qs('[data-action="copy"]', host) };
  }
  function layer() { return qs('.tap-layer', document); }

  // Renders the panel on its own into the sandbox, with the mapping module stood in.
  function panel(fn, opts) {
    return withFakes(mapFakes(), function () {
      var host = T.dom.mount();
      TAP.importPanel.render(host, opts || {});
      return fn(host);
    });
  }

  T.suite('import-ui', function () {
    T.test('TPV-TC-852', 'Import opens as a wide layer: the title, the file input, the live status, the three buttons disabled with the reason, the sample badge', function (a) {
      withApp(function () {
        withFakes(mapFakes(), function () {
          startApp();
          TAP.importPanel.open();
          a.equal(TAP.layers.top(), 'import', 'the import layer is open');
          var l = layer();
          a.ok(l.classList.contains('tap-layer--wide'), 'wide');
          a.equal(txt(qs('.tap-layer__title', l)), t('title'), 'the title from the wording file');
          var input = qs('.tap-imp__pick input[type=file]', l);
          a.ok(input && input.multiple && input.getAttribute('accept') === '.xlsx', 'a multiple .xlsx file input inside the label');
          a.ok(!input.disabled, 'enabled with the sample mapping');
          a.equal(txt(qs('.tap-imp__pick', l)), t('pick'), 'the label says what to choose');
          var status = qs('.tap-imp__status', l);
          a.equal(status.getAttribute('role'), 'status');
          a.equal(status.getAttribute('aria-live'), 'polite');
          a.equal(txt(status), t('statusIdle'), 'idle status');
          var b = buttons(l);
          a.ok(b.use.disabled && b.save.disabled && b.copy.disabled, 'the three buttons wait for a result');
          a.equal(txt(b.use), t('use'));
          a.equal(txt(b.save), t('save'));
          a.equal(txt(b.copy), t('copy'));
          a.equal(txt(qs('.tap-imp__why', l)), t('whyNoResult'), 'the reason they are disabled');
          a.equal(txt(qs('.tap-imp__intro .tap-badge', l)), t('sampleBadge'), 'the sample mapping is marked');
          a.ok(txt(qs('.tap-imp__intro', l)).indexOf('sample-template-1') >= 0, 'the mapping is named');
          a.deepEqual(TAP.importPanel.state(), { phase: 'idle', result: null });
          TAP.layers.close();
          a.equal(TAP.layers.top(), null);
        });
      });
    });

    T.test('TPV-TC-853', 'Without the mapping, the panel says so and the file input is disabled', function (a) {
      var saved = window.IMPORT_MAP;
      try {
        window.IMPORT_MAP = undefined;
        panel(function (host) {
          a.ok(txt(host).indexOf(t('mapMissing')) >= 0, 'the missing-mapping message');
          a.ok(qs('.tap-imp__pick input', host).disabled, 'the input is disabled');
          a.ok(!qs('.tap-imp__intro .tap-badge', host), 'no sample badge');
        });
      } finally { window.IMPORT_MAP = saved; }
    });

    T.test('TPV-TC-854', 'A mapping with problems lists them and the file input is disabled', function (a) {
      withFakes([[TAP.importMap, 'problems', function () { return ['The region list is empty.', 'Sheet 9 is not in the template.']; }]], function () {
        withFakes([[TAP.importMap, 'get', function () { return window.IMPORT_MAP; }]], function () {
          var host = T.dom.mount();
          TAP.importPanel.render(host, {});
          a.ok(txt(host).indexOf(t('mapProblems')) >= 0, 'the problems message');
          a.deepEqual(qsa('.tap-imp__mapproblems li', host).map(txt), ['The region list is empty.', 'Sheet 9 is not in the template.'], 'one sentence each');
          a.ok(qs('.tap-imp__pick input', host).disabled, 'the input is disabled');
        });
      });
    });

    T.test('TPV-TC-855', 'A result draws the summary, a section per region with facts, errors and notes, the warnings, and enables the buttons', function (a) {
      panel(function (host) {
        var r = canned();
        TAP.importPanel.show(r);
        var h = qs('.tap-imp__h', host);
        a.equal(h.tagName, 'H3');
        a.equal(h.getAttribute('tabindex'), '-1');
        a.equal(document.activeElement, h, 'focus moves to the summary');
        a.equal(txt(h), [t('report.summary', { k: 2, n: 3 }), t('report.leftOutOne'), t('report.missingOne')].join(', '), 'the summary line');
        var secs = qsa('.tap-imp__region', host);
        a.deepEqual(secs.map(function (s) { return s.getAttribute('data-region'); }), ['alpha', 'bravo', 'charlie'], 'one section per reading, in order');
        a.equal(txt(qs('h4', secs[0])), 'Region A');
        a.equal(txt(qs('h4 .tap-badge', secs[2])), t('report.leftOut'), 'the failed region is marked');
        a.ok(!qs('h4 .tap-badge', secs[0]), 'a read region is not');
        var facts = qsa('dd', qs('.tap-imp__facts', secs[0])).map(txt);
        a.equal(facts[0], 'Region A plan.xlsx', 'the file');
        a.equal(facts[1], TAP.format.date('2026-09-30T10:15:00Z', { time: true }), 'the saved date with time');
        a.equal(facts[2], ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners', 'recap'].map(function (k) { return t('parts.' + k); }).join(', '), 'the parts read');
        a.equal(facts[3], '0', 'the notes count');
        a.equal(qsa('dd', qs('.tap-imp__facts', secs[2]))[3].textContent, '3', 'the notes count of a region with notes');
        a.equal(qsa('dd', qs('.tap-imp__facts', secs[2]))[2].textContent.indexOf(t('parts.newBusiness')), -1, 'a missing part is not listed as read');
        var err = qsa('.tap-imp__errors li', secs[2]);
        a.equal(err.length, 1, 'one error');
        a.ok(qs('.tap-icon', err[0]), 'with the warning icon');
        a.equal(txt(err[0]), 'The sheet is missing. 2. New Business', 'message, then the sheet (no cell)');
        // The notes grouped by kind, each group a table (US-1.8.9, D163, D164); a note without a kind groups by its message
        var groups = qsa('.tap-imp__notes details.tap-wg__kind', secs[2]);
        a.deepEqual(groups.map(function (d) { return d.getAttribute('data-kind'); }), ['badValue', 'splitSum', ''], 'one group per kind, the kindless note last');
        a.equal(txt(qs(':scope > summary', groups[0])), t('notePlain.badValue.title') + ' (1)', 'the plain title with its count');
        a.equal(txt(qs(':scope > summary', groups[2])), 'An older note without a kind. (1)', 'the message as the title when there is no kind');
        a.equal(qsa('.tap-imp__notes tbody tr', secs[2]).length, 3, 'one table row per note');
        a.deepEqual(qsa('td', groups[1]).map(txt), ['Healthcare 2. New Business › E12:H12', '95%', '100%'], 'where with sheet › cell, found, expected');
        a.equal(txt(qs('.tap-wg__cell', groups[0])), '1. Market Coverage › D12', 'sheet › cell');
        a.ok(txt(qs('.tap-imp__notes', secs[2])).indexOf(t('notePlain.badValue.intro')) >= 0, 'the intro under the heading');
        a.equal(qsa('.tap-imp__errors li', secs[0]).length + qsa('.tap-imp__notes tr', secs[0]).length, 0, 'a clean region lists nothing');
        a.equal(txt(qs('.tap-imp__check-warnings h4', host)), t('report.checkWarnings'));
        // The warnings grouped by workbook, then kind, in plain words (US-1.8.8): no data path on screen
        var wg = qsa('.tap-imp__check-warnings details.tap-wg', host);
        a.equal(wg.length, 1, 'one workbook group');
        a.equal(wg[0].getAttribute('data-region'), 'Region B');
        a.equal(txt(qs(':scope > summary', wg[0])), 'Region B · Region B plan.xlsx: 1 warning', 'region, its file and the count');
        a.ok(wg[0].open, 'open: three warnings or fewer');
        var kind = qs('details.tap-wg__kind', wg[0]);
        a.equal(kind.getAttribute('data-kind'), 'items');
        a.equal(txt(qs(':scope > summary', kind)), TAP.content.text('check.plain.items.title') + ' (1)', 'the kind in plain words with its count');
        a.deepEqual(qsa('.tap-imp__check-warnings td', host).map(txt), [TAP.content.text('check.fields.partners')], 'the row in words: the section, no found or expected column');
        a.equal(txt(qs('.tap-imp__check-warnings .tap-wg__intro', host)), TAP.content.text('check.plain.items.intro'), 'the intro once');
        a.ok(txt(qs('.tap-imp__check-warnings', host)).indexOf('regions[') < 0, 'no data path');
        a.ok(!qs('.tap-imp__check-errors', host), 'no contract errors, no table');
        var b = buttons(host);
        a.ok(!b.use.disabled && !b.save.disabled && !b.copy.disabled, 'the three buttons are enabled');
        a.equal(txt(b.use), t('useSome', { k: 2, n: 3 }), 'the Use label carries the count');
        a.equal(txt(qs('.tap-imp__why', host)), '', 'no reason shown');
        a.equal(txt(qs('.tap-imp__status', host)), t('statusDone', { k: 2, n: 3 }), 'the status sums it up');
        a.deepEqual(TAP.importPanel.state(), { phase: 'done', result: r });
      });
    });

    T.test('TPV-TC-856', 'A result the contract check refuses keeps Use and Save disabled, says why, and tables the errors', function (a) {
      panel(function (host) {
        TAP.importPanel.show(unusable());
        var b = buttons(host);
        a.ok(b.use.disabled && b.save.disabled, 'Use and Save disabled');
        a.ok(!b.copy.disabled, 'Copy report still works');
        a.equal(txt(qs('.tap-imp__why', host)), t('whyErrors', { n: 2 }), 'the region error and the contract error counted');
        a.equal(txt(qs('.tap-imp__check-errors h4', host)), t('report.checkErrors'));
        var rows = qsa('.tap-imp__check-errors tbody tr', host);
        a.equal(rows.length, 1);
        a.deepEqual(qsa('td', rows[0]).map(txt), ['1', 'Region A · Retail', 'regions[0].marketCoverage[2].tier', '1, 2, 3 or blank', 'Tier 1-2'], 'number, region, where, expected, found');
        a.deepEqual(qsa('.tap-imp__check-errors th', host).map(txt), ['colNumber', 'colRegion', 'colWhere', 'colExpected', 'colFound'].map(function (k) { return t('report.' + k); }));
        a.equal(txt(b.use), t('use'), 'no count while nothing can be used');
      });
    });

    T.test('TPV-TC-857', 'Use these plans now closes the layer and starts the app on the imported plan', function (a) {
      withApp(function () {
        withFakes(mapFakes(), function () {
          startApp();
          TAP.importPanel.open();
          var r = canned();
          TAP.importPanel.show(r);
          var start = spy({ ok: true });
          withFakes([[TAP.app, 'start', start]], function () {
            click(qs('[data-action="use"]', layer()));
          });
          a.equal(TAP.layers.top(), null, 'the layer is closed');
          a.equal(start.calls.length, 1, 'the app starts once');
          a.equal(start.calls[0][0].plan, r.plan, 'with the imported plan');
          a.ok(!('root' in start.calls[0][0]), 'no root: a fresh start on the page');
        });
      });
    });

    T.test('TPV-TC-858', 'Under a start-up screen, Use starts the app directly and tells the caller', function (a) {
      var onUse = spy(), start = spy({ ok: true });
      withFakes(mapFakes().concat([[TAP.app, 'start', start]]), function () {
        var host = T.dom.mount();
        TAP.importPanel.render(host, { inline: true, onUse: onUse });
        var r = canned();
        TAP.importPanel.show(r);
        click(qs('[data-action="use"]', host));
        a.equal(start.calls.length, 1, 'the app starts');
        a.equal(start.calls[0][0].plan, r.plan, 'on the plan');
        a.equal(onUse.calls.length, 1, 'onUse called');
        a.equal(TAP.layers.top(), null, 'no layer involved');
      });
    });

    T.test('TPV-TC-859', 'Save data/plan-data.js downloads the plan and says where the file went', function (a) {
      var download = spy();
      withFakes([[TAP.importWrite, 'download', download]], function () {
        panel(function (host) {
          var r = canned();
          TAP.importPanel.show(r);
          click(qs('[data-action="save"]', host));
          a.equal(download.calls.length, 1, 'one download');
          a.equal(download.calls[0][0], r.plan, 'of the plan');
          a.equal(txt(qs('.tap-imp__status', host)), t('saved'), 'the status says what to do with the file');
        });
      });
    });

    T.test('TPV-TC-860', 'Copy report copies the plain-text report; when the clipboard refuses, the text is shown to copy by hand', function (a) {
      var clip = spy(function () { return Promise.resolve(true); });
      return withFakes([[TAP.importWrite, 'report', function () { return 'REPORT TEXT'; }], [TAP.panelTable, 'clipboard', clip]], function () {
        return panel(function (host) {
          TAP.importPanel.show(canned());
          click(qs('[data-action="copy"]', host));
          a.equal(clip.calls.length, 1, 'the clipboard is asked once');
          a.equal(clip.calls[0][0], 'REPORT TEXT', 'with the report text');
          return tick().then(function () {
            a.equal(txt(qs('.tap-imp__status', host)), t('copied'));
            a.ok(qs('.tap-imp__text', host).hidden, 'no text box needed');
            TAP.panelTable.clipboard = function () { return Promise.resolve(false); };
            click(qs('[data-action="copy"]', host));
            return tick();
          }).then(function () {
            var box = qs('.tap-imp__text', host);
            a.ok(!box.hidden, 'the text box shows');
            a.equal(box.value, 'REPORT TEXT', 'with the report');
            a.ok(box.readOnly, 'read only');
            a.equal(txt(qs('.tap-imp__status', host)), t('copyManual'));
          });
        });
      });
    });

    T.test('TPV-TC-861', 'Picking workbooks runs the import with the mapping, shows progress, then the report', function (a) {
      var calls = [];
      function run(files, map, opts) {
        calls.push({ files: files, map: map, opts: opts });
        opts.onProgress(1, files.length, files[0].name);
        return Promise.resolve(canned());
      }
      return withFakes(mapFakes().concat([[TAP.importPlan, 'run', run]]), function () {
        var host = T.dom.mount(), before = storageKeys();
        TAP.importPanel.render(host, {});
        var input = qs('.tap-imp__pick input', host), dt = new DataTransfer();
        dt.items.add(new File(['not a workbook'], 'Region A plan.xlsx'));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        a.equal(calls.length, 1, 'the import runs once');
        a.ok(Array.isArray(calls[0].files) && calls[0].files.length === 1 && calls[0].files[0].name === 'Region A plan.xlsx', 'with the picked files as a list');
        a.equal(calls[0].map, window.IMPORT_MAP, 'and the mapping');
        a.ok(TAP.sources.isoDate(calls[0].opts.now), 'opts.now is an ISO date');
        a.equal(txt(qs('.tap-imp__status', host)), t('statusReading', { i: 1, n: 1, name: 'Region A plan.xlsx' }), 'progress in the status line');
        a.equal(TAP.importPanel.state().phase, 'reading');
        a.ok(buttons(host).use.disabled, 'nothing to use yet');
        return tick().then(function () {
          a.equal(TAP.importPanel.state().phase, 'done');
          a.ok(qs('.tap-imp__h', host), 'the report is drawn');
          a.ok(!buttons(host).use.disabled, 'Use enabled');
          a.deepEqual(storageKeys(), before, 'nothing kept in browser storage');
        });
      });
    });

    function storageKeys() {
      var out = [];
      try { for (var i = 0; i < window.localStorage.length; i++) out.push(window.localStorage.key(i)); } catch (e) { /* blocked */ }
      return out.sort();
    }

    T.test('TPV-TC-862', 'An import that throws leaves a message in the status, not a broken panel', function (a) {
      return withFakes(mapFakes().concat([[TAP.importPlan, 'run', function () { return Promise.reject(new Error('The library did not load.')); }]]), function () {
        var host = T.dom.mount();
        TAP.importPanel.render(host, {});
        var input = qs('.tap-imp__pick input', host), dt = new DataTransfer();
        dt.items.add(new File(['x'], 'a.xlsx'));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return tick().then(function () {
          a.equal(txt(qs('.tap-imp__status', host)), t('statusFailed', { message: 'The library did not load.' }));
          a.equal(TAP.importPanel.state().phase, 'idle');
          a.ok(buttons(host).use.disabled, 'nothing to use');
        });
      });
    });

    T.test('TPV-TC-863', 'The no-data and invalid screens carry an Import button that draws the panel under the text, once', function (a) {
      withFakes(mapFakes(), function () {
        ['missing', 'invalid'].forEach(function (reason) {
          var root = T.dom.mount();
          TAP.screens.show(root, { ok: false, reason: reason, errors: [], warnings: [] });
          var btn = qs('.tap-screen [data-action="import"]', root);
          a.ok(btn && btn.classList.contains('tap-btn--primary'), reason + ': a primary Import button');
          a.equal(txt(btn), TAP.content.text('screens.importButton'), reason + ': its label');
          a.ok(!qs('.tap-imp__inline', root), reason + ': the panel waits for the click');
          click(btn);
          var inline = qsa('.tap-imp__inline', root);
          a.equal(inline.length, 1, reason + ': the panel host is added');
          a.ok(qs('.tap-screen', root).contains(inline[0]), reason + ': under the screen');
          a.ok(qs('.tap-imp__pick input', inline[0]), reason + ': the panel is drawn');
          a.equal(document.activeElement, qs('.tap-imp__pick input', inline[0]), reason + ': the first control has focus');
          click(btn);
          a.equal(qsa('.tap-imp__inline', root).length, 1, reason + ': once');
        });
        var root = T.dom.mount();
        TAP.screens.show(root, { ok: false, reason: 'missing', errors: [], warnings: [] });
        a.ok(txt(root).indexOf(TAP.content.text('screens.missingBody')) >= 0 && /Import workbooks/.test(TAP.content.text('screens.missingBody')), 'the no-data text points at the button');
      });
    });

    T.test('TPV-TC-864', 'button(slot) adds the Import button once, with the full name as its label', function (a) {
      var slot = T.dom.mount();
      TAP.importPanel.button(slot);
      TAP.importPanel.button(slot);
      var b = qsa('.tap-imp__button', slot);
      a.equal(b.length, 1, 'once');
      a.equal(txt(b[0]), t('button'), 'the short word shows');
      a.equal(b[0].getAttribute('aria-label'), t('buttonLabel'), 'the full name is its label');
      a.ok(qs('.tap-icon svg', b[0]), 'with an icon');
    });

    T.test('TPV-TC-865', 'The comparison bar\'s buttons are Data, Present, Tour and Import, and Import opens the panel', function (a) {
      withApp(function () {
        withFakes(mapFakes(), function () {
          var root = startApp(), slot = TAP.shell.actionsEl();
          var names = Array.prototype.map.call(slot.children, function (c) { return c.className.split(' ').filter(function (k) { return /^tap-(present|tour|imp)__/.test(k); })[0]; });
          a.deepEqual(names, ['tap-present__start', 'tap-tour__button', 'tap-imp__button'], 'Present, Tour, Import');
          a.ok(qs('.tap-cmp__row', root).contains(slot), 'in the bar');
          click(qs('.tap-imp__button', slot));
          a.equal(TAP.layers.top(), 'import', 'Import opens the panel');
          TAP.layers.close();
        });
      });
    });

    T.test('TPV-TC-905', 'The copied report groups each region\u2019s notes by kind with the plain row and the technical line under it', function (a) {
      var text = TAP.importWrite.report(canned()), lines = text.split('\n').map(function (l) { return l.trim(); });
      var at = function (s) { var i = lines.indexOf(s); a.ok(i >= 0, 'line: ' + s); return i; };
      var region = at('Region C: left out'), err = at('Error 2. New Business: The sheet is missing.');
      var kind = at(t('notePlain.badValue.title') + ' (1)'), intro = at(t('notePlain.badValue.intro'));
      var plain = at('Healthcare, growth potential, found "Great", 1. Market Coverage › D12'), tech = at('The rating is not one of the allowed options.');
      var split = at('Healthcare, found 95%, expected 100%, 2. New Business › E12:H12'), old = at('An older note without a kind. (1)');
      a.ok(region < err && err < kind && kind < intro && intro < plain && plain < tech && tech < split && split < old, 'in order: region, error, kind, intro, plain row, technical line, next kind, the kindless group');
      var raw = text.split('\n');
      a.ok(raw[tech].search(/\S/) > raw[plain].search(/\S/) && raw[plain].search(/\S/) > raw[kind].search(/\S/), 'technical under plain, plain under kind');
      var recap = at(t('notePlain.emptySection.title') + ' (1)');
      a.ok(recap > at('Region B: imported') && recap < region, 'Region B\u2019s empty recap grouped too, under its region');
      a.equal(lines[at('Recap, 4. Partner') + 1], 'The recap block is empty.', 'a note without a cell: the sheet alone, the technical line under it');
      var notesPart = text.slice(0, text.indexOf(t('check.report.checkErrors', { n: 0 })));
      a.ok(text.indexOf('[importPanel') < 0 && notesPart.indexOf('regions[') < 0, 'every phrase has wording; no data path among the notes (the check\u2019s technical lines keep theirs)');
    });

    /* ---------- US-1.8.10 (D165) and US-1.8.11 (D166): one entry per problem, and the reports for workbook owners ---------- */

    // The canned result with Region B's empty recap noted by the import (with its ref) and warned about by the check (same
    // ref), plus a warning no note matches
    function paired() {
      var r = canned();
      r.regions[1].notes = [{ message: 'The Recap section is empty.', sheet: '4. Partner', cell: 'E5', kind: 'emptySection', item: 'Recap', found: null, expected: null, ref: 'recap' }];
      r.check.warnings = [
        { path: 'regions[1].recap', region: 'Region B', item: null, field: 'recap', kind: 'items', expected: 'at least one item', found: 'an empty list', vars: null, ref: 'recap',
          message: 'regions[1].recap: expected at least one item, found an empty list' },
        { path: 'regions[1].partners[0].supportPct[0]', region: 'Region B', item: 'Fictional Partner B1 (row 10)', field: 'supportPct', kind: 'share',
          expected: 'a share written as a decimal, for example 0.25 for 25%', found: 2.33, vars: null, ref: null, message: 'regions[1].partners[0].supportPct[0]: expected a share written as a decimal, for example 0.25 for 25%, found 2.33' }
      ];
      return r;
    }
    function today() { return new Date().toISOString().slice(0, 10); }

    T.test('X-owner-ui-folded', 'A warning the import already noted shows once, under the notes; the warnings heading says how many were folded; an unmatched warning still shows', function (a) {
      panel(function (host) {
        TAP.importPanel.show(paired());
        var sec = qs('.tap-imp__check-warnings', host), h = qs('h4', sec);
        a.ok(sec, 'the warnings section');
        a.ok(txt(h).indexOf(t('report.checkWarnings')) === 0, 'the heading');
        a.equal(txt(qs('.tap-wg__folded', h)), t('report.checkFolded', { n: 1 }), 'one listed under the notes above');
        a.ok(px(qs('.tap-wg__folded', h)) >= 16, 'at body size');
        var kinds = qsa('details.tap-wg__kind', sec).map(function (d) { return d.getAttribute('data-kind'); });
        a.deepEqual(kinds, ['share'], 'the unmatched warning alone');
        a.equal(qsa('.tap-imp__region[data-region="bravo"] details.tap-wg__kind[data-kind="emptySection"]', host).length, 1, 'the note stays under its region');
        // Nothing unmatched: the heading still says what was folded, with no groups under it
        var r = paired();
        r.check.warnings = r.check.warnings.slice(0, 1);
        TAP.importPanel.show(r);
        sec = qs('.tap-imp__check-warnings', host);
        a.ok(sec && qs('.tap-wg__folded', sec), 'the heading with the count');
        a.equal(qsa('details.tap-wg', sec).length, 0, 'no group');
        // No fold: no count
        TAP.importPanel.show(canned());
        a.ok(!qs('.tap-wg__folded', host), 'no count when nothing folded');
      });
    });

    T.test('X-owner-ui-list', 'The reports for workbook owners: the section after the summary and before the regions, a row per workbook with its count, Download and Copy as text, then All workbooks', function (a) {
      panel(function (host) {
        TAP.importPanel.show(paired());
        var sec = qs('.tap-imp__owners', host);
        a.ok(sec && sec.classList.contains('tap-own'), 'the section');
        a.equal(txt(qs('h4', sec)), TAP.content.text('ownerReport.ui.title'));
        a.equal(txt(qs('.tap-own__intro', sec)), TAP.content.text('ownerReport.ui.intro'));
        var all = qsa('.tap-imp__h, .tap-imp__owners, .tap-imp__region, .tap-imp__check', host).map(function (n) { return n.className.split(' ')[0]; });
        a.deepEqual(all.slice(0, 3), ['tap-imp__h', 'tap-imp__owners', 'tap-imp__region'], 'after the summary, before the first region');
        var rows = qsa('.tap-own__row', sec);
        a.deepEqual(rows.map(function (r) { return r.getAttribute('data-region'); }), ['Region A', 'Region B', 'Region C', null], 'a row per reading, then all workbooks');
        a.deepEqual(rows.map(function (r) { return txt(qs('.tap-own__count', r)); }), [TAP.content.text('ownerReport.ui.none'), TAP.content.text('ownerReport.ui.count', { n: 2 }), TAP.content.text('ownerReport.ui.count', { n: 3 }), ''], 'nothing; two (the note and the unmatched warning, the folded one not counted twice); three (a left-out region keeps its notes)');
        a.deepEqual(rows.slice(0, 3).map(function (r) { return qsa('.tap-btn', r).map(txt); }), [[TAP.content.text('ownerReport.ui.download'), TAP.content.text('ownerReport.ui.copy')], [TAP.content.text('ownerReport.ui.download'), TAP.content.text('ownerReport.ui.copy')], [TAP.content.text('ownerReport.ui.download'), TAP.content.text('ownerReport.ui.copy')]], 'Download and Copy as text per workbook');
        a.equal(txt(qs('.tap-own__name', rows[3])), TAP.content.text('ownerReport.ui.all'));
        a.deepEqual(qsa('.tap-btn', rows[3]).map(txt), [TAP.content.text('ownerReport.ui.download')], 'All workbooks: Download alone');
        a.equal(qs('.tap-btn', rows[1]).getAttribute('aria-label'), TAP.content.text('ownerReport.ui.downloadOne', { region: 'Region B' }), 'the button names its workbook');
        qsa('.tap-btn, .tap-own__name, .tap-own__count, .tap-own__intro', sec).forEach(function (n) { a.ok(px(n) >= 16, n.className + ': ' + px(n) + ' px (D24)'); });
        a.ok(txt(sec).indexOf('[ownerReport') < 0, 'every word has wording');
        // The regions handed to the writer: notes plus the unmatched warnings, normalized
        var regions = TAP.importReport.ownerRegions(paired());
        a.deepEqual(regions.map(function (r) { return r.name + ':' + r.items.length; }), ['Region A:0', 'Region B:2', 'Region C:3']);
        a.deepEqual(regions[1].items.map(function (it) { return it.kind; }), ['emptySection', 'share'], 'the note, then the unmatched warning');
        a.equal(regions[1].fileModified, '2026-09-30T10:15:00Z', 'the facts from the reading');
        a.equal(regions[1].importedAt, NOW);
      });
    });

    T.test('X-owner-ui-download', 'Download hands a text/html Blob with the workbook\u2019s file name to TAP.panelExport.download, and All workbooks the combined one', function (a) {
      var download = spy(), blobs = [], savedUrl = URL.createObjectURL;
      URL.createObjectURL = function (b) { blobs.push(b); return 'blob:test-' + blobs.length; };
      try {
        withFakes([[TAP.panelExport, 'download', download]], function () {
          panel(function (host) {
            TAP.importPanel.show(paired());
            var rows = qsa('.tap-imp__owners .tap-own__row', host);
            click(qsa('.tap-btn', rows[2])[0]);
            a.equal(download.calls.length, 1, 'one download');
            a.deepEqual(download.calls[0], ['blob:test-1', 'Region C data review ' + today() + '.html'], 'the URL and the file name');
            a.equal(blobs[0].type, 'text/html', 'an HTML page');
            a.ok(blobs[0].size > 500, 'with content');
            a.equal(txt(qs('.tap-own__status', host)), TAP.content.text('ownerReport.ui.saved', { name: 'Region C data review ' + today() + '.html' }), 'the status says where it went');
            click(qs('.tap-btn', rows[3]));
            a.equal(download.calls[1][1], 'All workbooks data review ' + today() + '.html', 'the all-workbooks file');
            a.equal(blobs[1].type, 'text/html');
          });
        });
      } finally { URL.createObjectURL = savedUrl; }
    });

    T.test('X-owner-ui-copy', 'Copy as text puts the workbook\u2019s report as text on the clipboard; when the clipboard refuses, the text is shown to copy by hand', function (a) {
      var clip = spy(function () { return Promise.resolve(true); });
      return withFakes([[TAP.panelTable, 'clipboard', clip]], function () {
        return panel(function (host) {
          TAP.importPanel.show(paired());
          var rows = qsa('.tap-imp__owners .tap-own__row', host);
          click(qsa('.tap-btn', rows[2])[1]);
          a.equal(clip.calls.length, 1, 'the clipboard is asked once');
          var text = clip.calls[0][0];
          a.ok(text.indexOf(TAP.content.text('ownerReport.title', { region: 'Region C' })) > 0, 'the title');
          a.ok(text.indexOf('Healthcare') > 0 && text.indexOf('2. New Business \u203a E12:H12') > 0, 'the items with sheet \u203a cell');
          a.ok(text.indexOf('regions[') < 0 && text.indexOf('<') < 0, 'plain text, no data path');
          return tick().then(function () {
            a.equal(txt(qs('.tap-own__status', host)), TAP.content.text('ownerReport.ui.copied'));
            a.ok(qs('.tap-own__text', host).hidden, 'no text box needed');
            TAP.panelTable.clipboard = function () { return Promise.resolve(false); };
            click(qsa('.tap-btn', rows[2])[1]);
            return tick();
          }).then(function () {
            var box = qs('.tap-own__text', host);
            a.ok(!box.hidden, 'the text box shows');
            a.equal(box.value, text, 'with the report');
            a.ok(box.readOnly, 'read only');
            a.equal(txt(qs('.tap-own__status', host)), TAP.content.text('ownerReport.ui.copyManual'));
          });
        });
      });
    });

    T.test('TPV-TC-866', 'Every word on the panel and its report is found in the wording file', function (a) {
      panel(function (host) {
        TAP.importPanel.show(unusable());
        var s = txt(host);
        a.ok(s.indexOf('[importPanel.') < 0, 'no missing key: ' + s.slice(0, 200));
        a.ok(s.indexOf('[object') < 0, 'no object shown as text');
        a.ok(s.indexOf('—') < 0, 'no em dashes');
      });
    });

    T.test('TPV-TC-867', 'The status, the buttons, the facts and the sheet › cell lines are body text, 16 px and up (D24)', function (a) {
      withApp(function () {
        withFakes(mapFakes(), function () {
          startApp();
          TAP.importPanel.open();
          TAP.importPanel.show(unusable());
          var l = layer();
          [qs('.tap-imp__status', l), qs('.tap-imp__why', l), qs('.tap-imp__pick', l), qs('.tap-imp__intro', l), qs('.tap-imp__facts dd', l),
            qs('.tap-imp__notes .tap-wg__cell', l), qs('.tap-imp__notes td', l), qs('.tap-imp__notes summary', l), qs('.tap-imp__check-errors td', l), qs('.tap-imp__check-warnings td', l)]
            .concat(qsa('.tap-imp__actions .tap-btn', l)).forEach(function (n) {
              a.ok(n && px(n) >= 16, (n ? n.className : 'missing node') + ': ' + (n ? px(n) : '') + ' px');
            });
          TAP.layers.close();
        });
      });
    });
  });
})(window.TAP);
