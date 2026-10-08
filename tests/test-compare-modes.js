/*
 * File: tests/test-compare-modes.js
 * Purpose: Tests for the comparison modes: All regions, Selected regions (one region or more) and One vs the rest
 *          (D99, D114). "One vs one" and "All regions combined" are gone from the screen; an old 'pair' setting is read
 *          as a selection of its regions, an old 'org' as All regions.
 *          D116: the bar is one row with compact Data, Present and Tour buttons, the sentence only for screen readers.
 *          D118: the Overview always shows every region and offers no comparison.
 * Provides: test cases X-d99-compare-modes, X-d114-no-combined, X-d116-bar-one-row, X-d118-overview-all
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures, data/sample-plan-data.js
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var TH = window.TAP_THEME;
  var ID = 'X-d99-compare-modes', D114 = 'X-d114-no-combined';
  var THREE = ['all', 'set', 'one'], LABELS = ['All regions', 'Selected regions', 'One vs the rest'];
  var qs = function (sel, root) { return root.querySelector(sel); };
  var qsa = function (sel, root) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  function click(node) { node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }

  function startApp(plan) {
    var root = T.dom.mount();
    TAP.app.start({ root: root, plan: plan || T_FIXTURE('mini') });
    return root;
  }
  function stopApp() {
    try { TAP.app.start({ root: T.dom.mount(), plan: null }); } catch (e) { /* screens may be a stub */ }
    TAP.data.load(T_FIXTURE('mini'));
  }
  function run(fn) { try { return fn(); } finally { stopApp(); } }
  function sample() { return JSON.parse(JSON.stringify(window.PLAN_DATA)); }

  function clickMode(root, mode) { qs('.tap-cmp__mode[data-mode="' + mode + '"]', root).click(); }
  function sentence(root) { return txt(qs('.tap-cmp__sentence', root)); }
  function shown(root, sel) { var e = qs(sel, root); return !!e && !e.hidden && !e.closest('[hidden]'); }
  function pickers(root) {
    return ['focus', 'second', 'rest', 'set'].filter(function (k) { return shown(root, '[data-picker="' + k + '"]'); });
  }

  // D116 and D118. The bar's height at 1280 px on Market coverage with All regions before D116 (two rows, D50),
  // measured on the mini data in this sandbox before the change (114 px: the controls row, then the sentence row).
  var D116 = 'X-d116-bar-one-row', D118 = 'X-d118-overview-all', TWO_ROWS_H = 114;
  function rect(n) { return n.getBoundingClientRect(); }
  function visible(n) { if (!n) return false; var r = rect(n); return r.width > 1 && r.height > 1; }
  function sameRow(x, y) { var a = rect(x), b = rect(y); return Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) <= 6; }
  // The page edge is 3% of the window (css/shell.css); the sandbox is narrower than a screen, so set it as on one.
  function screen(root, w) { root.style.width = w + 'px'; root.style.setProperty('--tap-edge', Math.max(24, Math.min(48, w * 0.03)) + 'px'); }
  function onView(root, view) { TAP.store.set({ view: view }); return qs('.tap-cmp', root); }
  function pageButtons(scope) {
    return { data: qs('.tap-cmp__date', scope), present: qs('.tap-present__button', scope), tour: qs('.tap-tour__button', scope) };
  }
  // The number of regions a panel's chart draws along its category axis.
  function chartCategories(root, reportId) {
    var box = qs('[data-report="' + reportId + '"] .tap-panel__chart', root), chart = box && window.echarts.getInstanceByDom(box);
    var o = chart ? chart.getOption() : {}, ax = [].concat(o.xAxis || [], o.yAxis || []).filter(function (x) { return x.type === 'category'; })[0];
    return ax ? ax.data.length : -1;
  }

  // Report builders, as the panels call them
  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c); }
  function build(id, type, c, extra) {
    var def = TAP.reports.get(id), k = cmp(c);
    var ctx = Object.assign({ def: def, type: type || def.defaultType, measureId: null, sizeId: null, breakdown: null, cmp: k,
      entities: TAP.scope.entities(k), year: null, industryId: null, highlight: null, expanded: false, theme: TH, opts: {} }, extra || {});
    return TAP.builders.get(def.builder || (def.shape === 'xyz' ? 'xy' : def.shape))(ctx);
  }

  // Runs fn with the app's address bar search set to `search`, then puts the address back.
  function withSearch(search, fn) {
    var before = window.location.href;
    history.replaceState(null, '', window.location.pathname + search + window.location.hash);
    try { return fn(); } finally { history.replaceState(null, '', before); }
  }

  T.suite('compare-modes', function () {
    T.test(ID, 'The bar has no one vs one mode and no second-region picker', function (a) {
      run(function () {
        var root = startApp();
        a.equal(qs('.tap-cmp__mode[data-mode="pair"]', root), null, 'no one vs one button');
        a.equal(qs('[data-picker="second"]', root), null, 'no second-region picker at all');
      });
    });

    T.test(ID, 'Selected regions starts with the focus region alone, or with the first region in the data', function (a) {
      run(function () {
        var root = startApp();
        clickMode(root, 'set');
        a.deepEqual(TAP.store.get().cmp.set, ['alpha'], 'no focus: the first region in file order, alone');
        a.deepEqual(pickers(root), ['set'], 'only the region picker');
        a.equal(txt(qs('.tap-cmp__setbtn', root)), '1 of 4 regions', 'the picker button counts one region');
        a.equal(sentence(root), 'Showing Region A only', 'the sentence names the region');
        clickMode(root, 'one');
        qs('[data-picker="focus"] select', root).value = 'charlie';
        qs('[data-picker="focus"] select', root).dispatchEvent(new Event('change', { bubbles: true }));
        clickMode(root, 'set');
        a.deepEqual(TAP.store.get().cmp.set, ['charlie'], 'the focus region alone');
        a.equal(sentence(root), 'Showing Region C only');
      });
    });

    T.test(ID, 'A selection of several regions is named in the sentence, in file order', function (a) {
      run(function () {
        var root = startApp();
        TAP.store.set({ cmp: { mode: 'set', set: ['delta', 'alpha', 'charlie'] } });
        a.equal(sentence(root), 'Showing 3 selected regions: Region A, Region C and Region D');
      });
    });

    T.test(ID, 'Unticking the last selected region is refused, with a plain note why', function (a) {
      run(function () {
        var root = startApp();
        TAP.store.set({ cmp: { mode: 'set', set: ['bravo', 'delta'] } });
        click(qs('.tap-cmp__setbtn', root));
        click(qs('[data-picker="set"] [data-region="delta"]', root));
        a.deepEqual(TAP.store.get().cmp.set, ['bravo'], 'down to one region is allowed');
        click(qs('[data-picker="set"] [data-region="bravo"]', root));
        a.deepEqual(TAP.store.get().cmp.set, ['bravo'], 'the last region stays');
        var note = txt(qs('.tap-cmp__status', root));
        a.equal(note, TAP.content.text('compare.setMin'), 'the note is shown');
        a.match(note, /one region/i, 'and says one region has to stay');
      });
    });

    T.test(ID, 'Selected regions with one region draws that region alone on a bar chart, a table and a list report', function (a) {
      var one = { mode: 'set', set: ['bravo'] };
      a.deepEqual(TAP.scope.entities(cmp(one)).map(function (e) { return e.id; }), ['bravo'], 'one entity');
      var bar = build('ov-ambition', 'stackedBar', one);
      a.deepEqual(bar.option.yAxis.data, ['Region B'], 'bar chart: Region B alone');
      var table = bar.table;
      a.deepEqual(table.rows.map(function (r) { return r.entityId; }), ['bravo'], 'table: one row, Region B');
      var list = build('nb-rows', 'list', one);
      a.deepEqual(list.table.rows.map(function (r) { return r.id; }).sort(), ['bravo:20', 'bravo:21'], 'list report: Region B’s rows only');
      a.equal(TAP.scope.sentence(cmp(one)), 'Showing Region B only', 'the sentence names it');
    });

    T.test(ID, 'With one region selected, the themes report says "Mentioned" or "Not mentioned", never "1 of 1 regions"', function (a) {
      TAP.data.load(sample());
      try {
        var def = TAP.reports.get('nb-themes'), c = cmp({ mode: 'set', set: ['na'] });
        var res = TAP.builders.get('themes')({ def: def, type: 'bar', cmp: c, entities: TAP.scope.entities(c), opts: {}, highlight: null });
        var box = document.createElement('div');
        TAP.dom.html(box, res.html || '');
        var counts = qsa('.tap-themes__n', box).map(txt);
        a.ok(counts.length > 0, counts.length + ' theme counts');
        a.deepEqual(counts.filter(function (s) { return ['Mentioned', 'Not mentioned'].indexOf(s) < 0; }), [], 'each count is a plain word');
        var all = TAP.builders.get('themes')({ def: def, type: 'bar', cmp: cmp({ mode: 'all' }), entities: TAP.scope.entities(cmp({ mode: 'all' })), opts: {}, highlight: null });
        a.match(all.html, /of 7 regions/, 'several regions still count "n of 7 regions"');
      } finally { TAP.data.load(T_FIXTURE('mini')); }
    });

    T.test(ID, 'Selected regions with one region: every insight in the lists names that region, as with a focus (D107)', function (a) {
      run(function () {
        TAP.data.load(sample());
        var id = TAP.scope.regionIds(cmp({ mode: 'all' }))[0];
        var list = TAP.insights.ranked(cmp({ mode: 'set', set: [id] }), {});
        a.ok(list.length > 0, 'the sample has insights for ' + id + ' (' + list.length + ')');
        a.equal(list.filter(function (x) { return x.regionIds.indexOf(id) < 0; }).length, 0, 'none leaves the selected region out');
      });
    });

    T.test(ID, 'The panel’s own comparison menu offers a selection of one region', function (a) {
      run(function () {
        TAP.data.load(T_FIXTURE('mini'));
        var p = TAP.panel.create(T.dom.mount(), 'ov-ambition');
        try {
          click(qs('[data-action="more"]', p.el));
          click(qs('[data-action="compare"]', p.el));
          var sel = qs('select[data-control="cmp-mode"]', p.el);
          a.equal(qs('option[value="pair"]', sel), null, 'no one vs one');
          sel.value = 'set';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          var chips = qsa('[data-control="cmp-set"] [aria-pressed="true"]', p.el);
          a.deepEqual(chips.map(function (b) { return b.getAttribute('data-value'); }), ['alpha'], 'starts with one region');
          click(qs('[data-control="cmp-set"] [data-value="alpha"]', p.el));
          a.deepEqual(qsa('[data-control="cmp-set"] [aria-pressed="true"]', p.el).map(function (b) { return b.getAttribute('data-value'); }),
            ['alpha'], 'the last region stays ticked');
        } finally { p.destroy(); }
      });
    });

    T.test(ID, 'An address with ?mode=pair opens as a selection of the two regions, in file order', function (a) {
      run(function () {
        withSearch('?screenshot=1&mode=pair&focus=delta&second=bravo', function () { startApp(); });
        var c = TAP.store.get().cmp;
        a.deepEqual([c.mode, c.set], ['set', ['bravo', 'delta']], 'a selection of both');
        withSearch('?screenshot=1&mode=pair&focus=charlie', function () { startApp(); });
        c = TAP.store.get().cmp;
        a.deepEqual([c.mode, c.set], ['set', ['charlie']], 'no second region: the focus alone');
      });
    });

    T.test(ID, 'A presentation step with pair becomes a selection of the two', function (a) {
      try {
        var res = TAP.presentSteps.check([
          { report: 'ov-ambition', cmp: { mode: 'pair', focus: 'delta', second: 'alpha' } },
          { report: 'ov-ambition', cmp: { mode: 'pair', focus: 'charlie' } },
          { report: 'ov-ambition', cmp: { mode: 'pair', focus: 'bravo', second: 'bravo' } }
        ]);
        a.deepEqual(res.skipped, [], 'none is skipped');
        a.deepEqual(res.ok.map(function (s) { return [s.cmp.mode, s.cmp.set]; }),
          [['set', ['alpha', 'delta']], ['set', ['charlie']], ['set', ['bravo']]], 'selections, in file order');
      } finally { TAP.notes.clear('presentation'); }
    });

    T.test(ID, 'The starter presentation file has no pair step; its two-region step is a selection', function (a) {
      var steps = (window.TAP_RUNNING_ORDER || {}).steps || [];
      a.ok(steps.every(function (s) { return !s.cmp || s.cmp.mode !== 'pair'; }), 'no step uses pair');
      var two = steps.filter(function (s) { return s.report === 'pt-capacity'; })[0];
      a.deepEqual(two && two.cmp, { mode: 'set', set: ['seu', 'mea'] }, 'partner capacity in two regions');
    });

    T.test(ID, 'A stored recorded pair step becomes a selection of the two; the recorder never writes pair', function (a) {
      TAP.data.load(sample());
      try {
        TAP.storage.set('runningOrder.recorded', [{ report: 'ov-ambition', cmp: { mode: 'pair', focus: 'mea', second: 'na' } }]);
        var res = TAP.presentSteps.check(TAP.presentRecord.recorded());
        a.deepEqual([res.ok[0].cmp.mode, res.ok[0].cmp.set], ['set', ['na', 'mea']], 'played as a selection of both');
        var host = T.dom.mount(), extra = TAP.guideExtras.filter(function (x) { return x.id === 'runningOrder'; })[0];
        extra.render(host);
        a.ok(txt(host).indexOf('Showing 2 selected regions: North America and Middle East & Africa') >= 0, 'the Guide describes it as a selection');
        var p = { id: 'ov-ambition', st: {}, drill: null, cmp: function () { return cmp({ mode: 'pair', focus: 'mea', second: 'na' }); } };
        var step = TAP.presentRecord.stepOf(p, { def: TAP.reports.get('ov-ambition'), title: 'T', ctx: { type: 'bar' } });
        a.deepEqual(step.cmp, { mode: 'set', set: ['na', 'mea'] }, 'recorded as a selection');
      } finally { TAP.present.clearRecorded(); TAP.notes.clear('presentation'); TAP.data.load(T_FIXTURE('mini')); }
    });

    // D114: "All regions combined" leaves the comparison choices; an old 'org' setting opens as All regions.
    T.test(D114, 'The bar offers exactly three modes, in this order, with these labels', function (a) {
      run(function () {
        var modes = qsa('.tap-cmp__mode', startApp());
        a.deepEqual(modes.map(function (b) { return b.getAttribute('data-mode'); }), THREE, 'the ids, in order');
        a.deepEqual(modes.map(txt), LABELS, 'the labels');
      });
    });

    T.test(D114, 'The panel’s own comparison menu offers the same three modes', function (a) {
      run(function () {
        var p = TAP.panel.create(T.dom.mount(), 'ov-ambition');
        try {
          click(qs('[data-action="more"]', p.el));
          click(qs('[data-action="compare"]', p.el));
          var sel = qs('select[data-control="cmp-mode"]', p.el);
          a.deepEqual(qsa('option', sel).map(function (o) { return o.value; }), THREE, 'three modes, in order');
          a.deepEqual(qsa('option', sel).map(txt), LABELS, 'the bar’s labels');
        } finally { p.destroy(); }
      });
    });

    T.test(D114, 'An address with ?mode=org opens as All regions', function (a) {
      run(function () {
        var root;
        withSearch('?screenshot=1&mode=org', function () { root = startApp(); });
        a.equal(TAP.store.get().cmp.mode, 'all', 'the mode is all');
        a.equal(qs('.tap-cmp__mode[aria-pressed="true"]', root).getAttribute('data-mode'), 'all', 'All regions is pressed');
        a.equal(sentence(root), 'Showing all 4 regions side by side', 'the sentence says all regions');
      });
    });

    T.test(D114, 'A presentation step with mode org plays as All regions', function (a) {
      try {
        var res = TAP.presentSteps.check([{ report: 'ov-ambition', cmp: { mode: 'org' } }]);
        a.deepEqual(res.skipped, [], 'not skipped');
        a.equal(res.ok[0].cmp.mode, 'all', 'all regions');
      } finally { TAP.notes.clear('presentation'); }
    });

    T.test(D114, 'A stored recorded org step plays as All regions; the recorder never writes org', function (a) {
      try {
        TAP.storage.set('runningOrder.recorded', [{ report: 'ov-ambition', cmp: { mode: 'org' } }]);
        var res = TAP.presentSteps.check(TAP.presentRecord.recorded());
        a.equal(res.ok[0].cmp.mode, 'all', 'played as all regions');
        var host = T.dom.mount(), extra = TAP.guideExtras.filter(function (x) { return x.id === 'runningOrder'; })[0];
        extra.render(host);
        a.ok(txt(host).indexOf('Showing all 4 regions side by side') >= 0, 'the Guide describes it as all regions');
        var p = { id: 'ov-ambition', st: {}, drill: null, cmp: function () { return cmp({ mode: 'org' }); } };
        var step = TAP.presentRecord.stepOf(p, { def: TAP.reports.get('ov-ambition'), title: 'T', ctx: { type: 'bar' } });
        a.deepEqual(step.cmp, { mode: 'all' }, 'recorded as all regions');
      } finally { TAP.present.clearRecorded(); TAP.notes.clear('presentation'); }
    });

    T.test(D114, 'TAP.scope.upgrade reads org as All regions; the engine still draws the combined total for internal callers', function (a) {
      a.equal(TAP.scope.upgrade(cmp({ mode: 'org' })).mode, 'all', 'org becomes all');
      a.deepEqual(TAP.scope.upgrade({ mode: 'one', focus: 'bravo' }), { mode: 'one', focus: 'bravo' }, 'other modes come back as they are');
      a.deepEqual(TAP.scope.entities(cmp({ mode: 'org' })).map(function (e) { return [e.id, e.kind]; }), [['org', 'combined']], 'the org entity stays');
    });

    T.test(D114, 'The starter presentation file has no org step', function (a) {
      var steps = (window.TAP_RUNNING_ORDER || {}).steps || [];
      a.ok(steps.length > 0, steps.length + ' steps');
      a.ok(steps.every(function (s) { return !s.cmp || s.cmp.mode !== 'org'; }), 'no step uses org');
    });

    /* ---------- D116: the comparison bar in one row; D118: the Overview has no comparison ---------- */

    T.test(D116, 'One row: Compare, the modes and the Data, Present and Tour buttons with short visible labels', function (a) {
      run(function () {
        var root = startApp(), bar = onView(root, 'industry'), b = pageButtons(bar), mode = qs('.tap-cmp__mode', bar);
        screen(root, 1280);
        a.equal(txt(b.data), 'Data · 2 Oct', 'Data with the short date (the mini data is from 2 Oct 2026)');
        a.equal(txt(b.present), 'Present', 'Present');
        a.equal(txt(b.tour), 'Tour', 'Tour');
        var parts = [qs('.tap-cmp__title', bar), mode, b.data, b.present, b.tour];
        a.ok(parts.every(visible), 'every part shown');
        a.ok(parts.every(function (n) { return sameRow(n, mode); }), 'all on one row at 1280 px');
        [b.data, b.present, b.tour].forEach(function (n) {
          a.ok(Math.abs(rect(n).height - rect(mode).height) <= 1, txt(n) + ': as high as the mode buttons');
          a.ok(parseFloat(getComputedStyle(n).fontSize) >= 16, txt(n) + ': text at least 16 px (D24)');
          a.ok(!!qs('svg', n), txt(n) + ': with its icon');
        });
        a.ok(rect(b.data).left > rect(qsa('.tap-cmp__mode', bar)[2]).right, 'the buttons come after the modes');
        a.ok(rect(b.present).left > rect(b.data).right && rect(b.tour).left > rect(b.present).right, 'in the order Data, Present, Tour');
        a.ok(rect(bar).right - rect(b.tour).right <= 50, 'pushed to the end of the row');
        var h = Math.round(rect(bar).height);
        a.ok(h < TWO_ROWS_H, 'the bar is ' + h + ' px high at 1280 px, below the ' + TWO_ROWS_H + ' px of the two-row bar');
        clickMode(root, 'set');
        a.ok(sameRow(qs('.tap-cmp__setbtn', bar), mode) && sameRow(b.tour, mode), 'Selected regions: one row');
        screen(root, 1920);
        clickMode(root, 'one');
        var rest = qs('[data-picker="rest"] .tap-seg', bar), focus = qs('[data-picker="focus"] select', bar), explain = qs('.tap-cmp__explain', bar);
        a.ok([rest, focus, explain, b.data, b.tour].every(function (n) { return visible(n) && sameRow(n, mode); }), 'One vs the rest at 1920 px: one row');
        a.ok(rect(explain).left >= rect(rest).right, 'the explanation sits beside the others control');
      });
    });

    T.test(D116, 'No visible sentence: a visually hidden live region carries it and follows a mode change', function (a) {
      run(function () {
        var root = startApp(), bar = onView(root, 'industry'), live = qs('.tap-cmp__sentence', bar);
        a.ok(!!live && live.getAttribute('aria-live') === 'polite', 'a polite live region');
        a.ok(rect(live).width <= 1 && rect(live).height <= 1, 'visually hidden');
        a.equal(txt(live), 'Showing all 4 regions side by side', 'all regions');
        clickMode(root, 'set');
        a.equal(txt(live), 'Showing Region A only', 'follows the mode change');
        var shownText = qsa('*', bar).filter(function (n) { return visible(n) && /Showing/.test(n.textContent); });
        a.deepEqual(shownText.map(txt), [], 'no visible "Showing..." text in the bar');
      });
    });

    T.test(D116, 'Data opens the data sources panel; its label holds the full date', function (a) {
      run(function () {
        var root = startApp(), b = pageButtons(onView(root, 'industry'));
        a.equal(b.data.getAttribute('data-tour'), 'datadate', 'the tour still finds it');
        var label = b.data.getAttribute('aria-label') || '';
        a.ok(label.indexOf('2 Oct 2026') >= 0 && /Where the data comes from/.test(label), 'label: ' + label);
        a.equal(b.data.getAttribute('title'), label, 'the same words as a title');
        b.data.click();
        a.equal(TAP.layers.top(), 'sources', 'the data sources panel opens');
        TAP.layers.close();
      });
    });

    T.test(D116, 'Present and Tour start their modes', function (a) {
      run(function () {
        TAP.storage.set('tour:done', true);
        var root = startApp(sample()), b = pageButtons(onView(root, 'industry'));
        a.equal(b.tour.getAttribute('aria-label'), 'Take the tour', 'the tour button says what it does');
        click(b.present);
        a.ok(TAP.present.active(), 'Present starts presentation mode');
        TAP.present.stop();
        click(b.tour);
        var card = document.querySelector('.tap-tour__card');
        a.equal(card && card.getAttribute('data-step'), '1', 'Tour starts the tour');
        TAP.tour.stop();
      });
    });

    T.test(D116, 'The region profile shows the same three buttons', function (a) {
      TAP.store.set({ view: 'regions', region: 'alpha' });
      var root = T.dom.mount(), v = TAP.views.get('regions').mount(root);
      try {
        var top = qs('.tap-pf__top', root), b = pageButtons(top);
        a.equal([b.data, b.present, b.tour].map(txt).join(' | '), 'Data · 2 Oct | Present | Tour', 'the same labels');
        a.ok(!!qs('.tap-pagebtns', top) && qs('.tap-pagebtns', top).contains(b.tour), 'from the shared builder');
        a.ok(txt(qs('.tap-pf__head', root)).length > 0, 'the header text stays');
      } finally { v.destroy(); TAP.store.reset(); }
    });

    T.test(D116, 'Narrow windows: the buttons wrap below the modes as one group, with no horizontal scroll', function (a) {
      run(function () {
        var root = startApp(sample()), bar = onView(root, 'industry'), b = pageButtons(bar), mode = qs('.tap-cmp__mode', bar);
        TAP.store.set({ cmp: { mode: 'one', focus: TAP.data.regions()[0].id } });
        [1536, 1280, 1024, 853].forEach(function (w) {
          screen(root, w);
          a.ok(bar.scrollWidth <= bar.clientWidth + 1 && root.scrollWidth <= root.clientWidth + 1, w + ' px: no horizontal scroll');
          a.ok([b.data, b.present, b.tour].every(function (n) { return rect(n).right <= rect(bar).right + 1; }), w + ' px: every button inside the bar');
          a.ok(sameRow(b.data, b.present) && sameRow(b.present, b.tour), w + ' px: the three stay together');
          a.ok(sameRow(b.data, mode) || rect(b.data).top >= rect(mode).bottom - 1, w + ' px: beside the modes or below them');
        });
      });
    });

    T.test(D116, 'Where nothing follows the comparison, the row holds only the buttons', function (a) {
      run(function () {
        var root = startApp(), bar = onView(root, 'guide'), b = pageButtons(bar);
        screen(root, 1280);
        a.ok([b.data, b.present, b.tour].every(visible), 'the three buttons show');
        a.deepEqual(qsa('.tap-cmp__title, .tap-cmp__mode, [data-picker]', bar).filter(visible).map(txt), [], 'no Compare, modes or pickers');
        a.ok(rect(bar).height <= rect(b.data).height + 24, 'one slim row (' + Math.round(rect(bar).height) + ' px)');
      });
    });

    T.test(D118, 'With Selected regions holding one region, the Overview shows all seven regions and no comparison controls', function (a) {
      run(function () {
        var root = startApp(sample()), first = TAP.data.regions()[0].id;
        var headline = txt(qs('.tap-ov__sentence', root));
        TAP.store.set({ view: 'industry', cmp: { mode: 'set', set: [first] } });
        var bar = onView(root, 'overview');
        a.equal(qsa('.tap-ov-card', root).length, 7, 'seven region cards');
        a.equal(txt(qs('.tap-ov__sentence', root)), headline, 'the all-regions headline');
        a.equal(chartCategories(root, 'ov-ambition'), 7, 'the ambition chart draws seven regions');
        a.deepEqual(qsa('.tap-cmp__title, .tap-cmp__mode, [data-picker]', bar).filter(visible).map(txt), [], 'no comparison controls');
        a.ok(visible(qs('.tap-cmp__date', bar)), 'the Data button stays');
        a.deepEqual(TAP.store.get().cmp.set, [first], 'the selection itself is kept');
        TAP.store.set({ view: 'industry' });
        a.ok(visible(qs('.tap-cmp__setbtn', bar)), 'Market coverage: the selection shows again');
        a.equal(txt(qs('.tap-cmp__setcount', bar)), '1 of 7 regions', 'with its one region');
        a.equal(txt(qs('.tap-cmp__sentence', bar)), TAP.scope.sentence(TAP.store.get().cmp), 'and the comparison it says');
      });
    });

    T.test(D118, 'The Overview chart offers no comparison menu; the other views keep theirs', function (a) {
      run(function () {
        var root = startApp();
        function menuItems(reportId) {
          var host = qs('[data-report="' + reportId + '"]', root) || qs('[data-slot="' + reportId + '"]', root);
          click(qs('[data-action="more"]', host));
          return qsa('.tap-panel__item', host).map(function (n) { return n.getAttribute('data-action'); });
        }
        var ov = menuItems('ov-ambition');
        a.ok(ov.length > 0 && ov.indexOf('compare') < 0, 'Overview: no "Compare differently" (' + ov.join(', ') + ')');
        TAP.store.set({ view: 'industry' });
        a.ok(menuItems('ind-tiers').indexOf('compare') >= 0, 'Market coverage: still offered');
      });
    });

    T.test(D118, 'A presentation step on the Overview chart drops its comparison quietly', function (a) {
      try {
        var res = TAP.presentSteps.check([{ report: 'ov-ambition', cmp: { mode: 'one', focus: 'charlie' } },
          { report: 'ind-tiers', cmp: { mode: 'one', focus: 'charlie' } }]);
        a.deepEqual(res.skipped, [], 'nothing skipped');
        a.equal(res.ok[0].cmp.mode, 'all', 'the Overview step shows all regions');
        a.equal(res.ok[1].cmp.mode, 'one', 'another step keeps its comparison');
      } finally { TAP.notes.clear('presentation'); }
    });

    T.test(D114, 'The organization total insight on the strategic plan still fires on the sample', function (a) {
      TAP.data.load(sample());
      try {
        var x = TAP.insights.all().filter(function (i) { return i.ruleId === 'spTotal'; });
        a.equal(x.length, 1, 'one finding');
        // The figures of PLANTED-CASES R03 (SAMPLE_EXPECT.r03): D112's S03 moved them from €71.4M against €77.6M (8%)
        var R3 = window.SAMPLE_EXPECT.r03, F = TAP.format;
        a.equal(x[0] && x[0].sentence, 'Together, the three-year plans of the 6 regions with a strategic plan are ' + F.pct(-R3.variancePct3) +
          ' below their strategic plans (' + F.money(R3.plans3) + ' against ' + F.money(R3.strategicPlans3) + '). Not included, with no strategic plan: Northern Europe.', 'as on the sample');
        a.equal(F.money(R3.plans3) + ' ' + F.money(R3.strategicPlans3) + ' ' + F.pct(-R3.variancePct3), '€73.1M €78.9M 7%', 'hand-checked: 73,053.1, 78,889, 7.4%');
      } finally { TAP.data.load(T_FIXTURE('mini')); }
    });
  });
})(window.TAP);
