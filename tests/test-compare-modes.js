/*
 * File: tests/test-compare-modes.js
 * Purpose: Tests for the comparison modes: All regions, Selected regions (one region or more) and One vs the rest
 *          (D99, D114). "One vs one" and "All regions combined" are gone from the screen; an old 'pair' setting is read
 *          as a selection of its regions, an old 'org' as All regions.
 * Provides: test cases X-d99-compare-modes, X-d114-no-combined
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

    T.test(D114, 'The organization total insight on the strategic plan still fires on the sample', function (a) {
      TAP.data.load(sample());
      try {
        var x = TAP.insights.all().filter(function (i) { return i.ruleId === 'spTotal'; });
        a.equal(x.length, 1, 'one finding');
        a.equal(x[0] && x[0].sentence, 'Together, the three-year plans of the 6 regions with a strategic plan are 8% below their ' +
          'strategic plans (€71.4M against €77.6M). Not included, with no strategic plan: Northern Europe.', 'as on the sample');
      } finally { TAP.data.load(T_FIXTURE('mini')); }
    });
  });
})(window.TAP);
