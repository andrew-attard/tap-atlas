/*
 * File: tests/test-custom-ask.js
 * Purpose: Tests for Build a chart starting from the question (D140): the three choices, the Region dropdown and
 *          By list of "Break one region down", the one-region chart, the plan-years filter, the Bar / Table switch,
 *          dot plots drawn as bars, kept charts as chips, and older specs without ask or region.
 * Provides: test cases X-d140-builder-question
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures (mini-data)
 * Used by: tests.html
 * Owner: CUSTOM stream
 */
(function (TAP) {
  'use strict';

  var ID = 'X-d140-builder-question';
  function qs(sel, root) { return TAP.dom.qs(sel, root); }
  function qsa(sel, root) { return TAP.dom.qsa(sel, root); }
  function txt(n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function click(node) { node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
  function values(sel, root) { return qsa(sel + ' button', root).map(function (b) { return b.getAttribute('data-value'); }); }
  function pressed(sel, root) { var b = qs(sel + ' [aria-pressed="true"]', root); return b && b.getAttribute('data-value'); }
  function cmpWith(patch) { return Object.assign({}, TAP.store.defaults().cmp, patch); }
  function emptyList() { while (TAP.custom.saved().length) TAP.custom.remove(0); }

  // The builder on the mini fixture from a known choice, with the comparison bar set as the test needs; the session
  // list starts and ends empty, and everything is taken down afterwards.
  function scene(spec, cmp, fn) {
    return function (a) {
      var host = T.dom.mount(), h = null, before = TAP.store.get().cmp;
      emptyList();
      try {
        if (cmp) TAP.store.set({ cmp: cmp });
        h = TAP.customBuilder.render(host, { spec: spec });
        fn(a, host, h);
      } finally {
        if (h) h.destroy();
        TAP.store.set({ cmp: before });
        emptyList();
        Object.keys(window.TAP_REPORTS).forEach(function (id) { if (/^custom:/.test(id)) delete window.TAP_REPORTS[id]; });
        TAP.storage.clear('chart:custom:');
      }
    };
  }
  function radios(host) { return qsa('input[type="radio"][data-custom="measure"]', host).map(function (r) { return r.value; }); }
  // Every measure the picker offers: each topic in turn, with "Show all" pressed where it has more
  function everyMeasure(host) {
    var out = [];
    values('[data-control="custom-topic"]', host).forEach(function (tid) {
      click(qs('[data-control="custom-topic"] button[data-value="' + tid + '"]', host));
      var more = qs('button[data-action="custom-more"][aria-expanded="false"]', host);
      if (more) click(more);
      out = out.concat(radios(host));
    });
    return out;
  }
  function panel(host) { return qs('.tap-custom__panel .tap-panel', host); }
  function legendCount(host) { return qsa('.tap-panel__legend-item', panel(host)).length; }

  T.suite('custom-ask', function () {

    T.test(ID, 'Step 1 offers the three choices, each with a line of help, and the default is Compare regions', scene(null, null, function (a, host, h) {
      a.deepEqual(values('[data-control="custom-ask"]', host), ['regions', 'one', 'years'], 'Compare regions, Break one region down, See the plan years');
      qsa('[data-control="custom-ask"] button', host).forEach(function (b) {
        a.ok(/\S/.test(txt(qs('.tap-custom__ask-label', b))), b.getAttribute('data-value') + ' has a name');
        a.ok(/\S/.test(txt(qs('.tap-custom__ask-help', b))), b.getAttribute('data-value') + ' has a line of help');
      });
      a.equal(pressed('[data-control="custom-ask"]', host), 'regions', 'the default choice');
      a.equal(h.spec().ask, 'regions');
      a.equal(qs('[data-control="custom-region"]', host), null, 'no Region dropdown for Compare regions');
      a.equal(qs('[data-control="custom-by"]', host), null, 'no By choice for Compare regions');
      a.ok(!!panel(host), 'the chart is drawn');
    }));

    T.test(ID, 'Break one region down: the Region dropdown is preset from a one-region comparison, and By lists the measure’s own dimensions',
      scene({ ask: 'one', measure: 'nb.arr' }, cmpWith({ mode: 'set', set: ['bravo'] }), function (a, host, h) {
        var sel = qs('select[data-control="custom-region"]', host);
        a.ok(!!sel, 'a Region dropdown');
        a.equal(sel.value, 'bravo', 'preset to the one region compared');
        a.deepEqual(qsa('option', sel).map(function (o) { return o.value; }), ['alpha', 'bravo', 'charlie', 'delta'], 'every region, in file order');
        a.ok(/\S/.test(txt(qs('.tap-custom__region-note', host))), 'a note says the chart ignores the comparison bar');
        // nb.arr lists year and industry (ARCHITECTURE 9 and 17.5): those, and never "Region"
        a.deepEqual(values('[data-control="custom-by"]', host), ['year', 'industry'], 'By: the dimensions of new business ARR');
        a.equal(pressed('[data-control="custom-by"]', host), 'year', 'the first one by default');
        a.deepEqual(h.spec(), { ask: 'one', measure: 'nb.arr', by: 'year', type: 'bar', region: 'bravo' });
        // Another region, chosen in the builder
        sel.value = 'delta';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        a.equal(h.spec().region, 'delta', 'the choice follows the dropdown');
        a.equal(qs('select[data-control="custom-region"]', host).value, 'delta', 'and stays after the redraw');
      }));

    T.test(ID, 'Break one region down: with several regions compared, the first region in the data is preset',
      scene({ ask: 'one', measure: 'nb.hitRate' }, cmpWith({ mode: 'all' }), function (a, host, h) {
        a.equal(qs('select[data-control="custom-region"]', host).value, 'alpha', 'Region A, first in the file');
        a.deepEqual(values('[data-control="custom-by"]', host), ['industry'], 'hit rate: by industry only');
        a.equal(h.spec().region, 'alpha');
      }));

    T.test(ID, 'The one-region chart draws that region only, whatever the comparison bar says',
      scene({ ask: 'one', measure: 'nb.arr', by: 'industry', region: 'bravo' }, cmpWith({ mode: 'all' }), function (a, host, h) {
        var def = TAP.custom.definition(h.spec());
        a.deepEqual(def.cmp && { mode: def.cmp.mode, set: def.cmp.set }, { mode: 'set', set: ['bravo'] }, 'a fixed comparison of one region');
        a.equal(legendCount(host), 1, 'one entity in the legend');
        a.equal(txt(qs('.tap-panel__legend-item', panel(host))), 'Region B', 'Region B');
        a.match(txt(qs('.tap-panel__title', panel(host))), /Region B/, 'the title names the region');
        click(qs('[data-action="more"]', panel(host)));
        a.ok(!!qs('[data-action="record"]', panel(host)), 'the More menu is open');
        a.equal(qs('[data-action="compare"]', panel(host)), null, 'no "Compare differently" on a chart that ignores the comparison');
        click(qs('[data-action="more"]', panel(host)));
        // The comparison bar moves: the chart stays with Region B
        TAP.store.set({ cmp: cmpWith({ mode: 'one', focus: 'alpha' }) });
        a.equal(legendCount(host), 1, 'still one entity');
        a.equal(txt(qs('.tap-panel__legend-item', panel(host))), 'Region B', 'still Region B');
      }));

    T.test(ID, 'The one-region bars are sorted largest first, with the value on each bar', scene({ ask: 'one', measure: 'nb.arr', by: 'industry', region: 'alpha' }, null, function (a, host, h) {
      var def = TAP.custom.definition(h.spec()), cmp = def.cmp;
      var ctx = { def: def, type: 'bar', measureId: null, sizeId: null, breakdown: 'industry', cmp: cmp, entities: TAP.scope.entities(cmp),
        year: null, industryId: null, highlight: null, expanded: false, theme: window.TAP_THEME, opts: {}, size: null, drill: null };
      var res = TAP.builders.get(def.builder)(ctx);
      a.ok(res && !res.error && !res.empty, 'drawn');
      var s = res.option.series.filter(function (x) { return x.tapRole === 'value'; })[0];
      var vals = s.data.map(function (d) { return d.value; }).filter(function (v) { return v != null; });
      // Region A plans new business in Healthcare (500 + 550 + 605) and Utilities (200 + 200 + 200) only (mini fixture)
      a.deepEqual(vals, [1655, 600], 'Healthcare first, then Utilities');
      a.deepEqual(res.option.yAxis.data.slice(0, 2), ['Healthcare', 'Utilities'], 'named on the axis');
      a.equal(s.label.show, true, 'the value is written on each bar');
      a.equal(s.label.formatter({ data: s.data[0] }), TAP.format.cell({ v: 1655, state: 'value' }, { unit: 'money' }), 'as the formatted value');
      a.deepEqual(res.table.columns.map(function (c) { return c.key; }).slice(0, 2), ['category', 'value'], 'the table has one row per industry');
      a.equal(res.table.rows.length, res.option.yAxis.data.length, 'the same rows as the chart');
    }));

    T.test(ID, 'See the plan years lists only measures with a year dimension, and draws grouped bars for the comparison',
      scene({ ask: 'years', measure: 'nb.arr' }, cmpWith({ mode: 'set', set: ['alpha', 'charlie'] }), function (a, host, h) {
        var listed = everyMeasure(host);
        a.ok(listed.length > 5, 'measures offered (' + listed.length + ')');
        listed.forEach(function (id) { a.ok((TAP.measures.meta(id).dims || []).indexOf('year') >= 0, id + ' has plan years'); });
        a.ok(listed.indexOf('nb.hitRate') < 0, 'the hit rate has no plan years');
        a.ok(listed.indexOf('nb.arr') >= 0, 'new business ARR has');
        a.equal(qs('[data-control="custom-by"]', host), null, 'no By choice: the years are the breakdown');
        a.equal(qs('[data-control="custom-region"]', host), null, 'no Region dropdown');
        a.deepEqual(h.spec(), { ask: 'years', measure: 'nb.arr', by: 'year', type: 'groupedBar' });
        a.equal(legendCount(host), 2 + 3, 'two regions and three plan years in the legend');
        a.ok(!TAP.custom.definition(h.spec()).cmp, 'follows the comparison bar');
      }));

    T.test(ID, 'Compare regions follows the comparison bar', scene({ ask: 'regions', measure: 'nb.arr' }, cmpWith({ mode: 'one', focus: 'alpha' }), function (a, host, h) {
      a.equal(legendCount(host), 2, 'Region A and the rest');
      a.deepEqual(h.spec(), { ask: 'regions', measure: 'nb.arr', by: 'entity', type: 'bar' });
      TAP.store.set({ cmp: cmpWith({ mode: 'all' }) });
      a.equal(legendCount(host), 4, 'all four regions once the bar says so');
      // Only measures with a region total: a per-industry rating is not offered here
      a.ok(everyMeasure(host).indexOf('ind.growthPotential') < 0, 'no per-industry figure');
    }));

    T.test(ID, 'Changing the choice keeps the measure when it still fits, else picks the topic’s first', scene({ ask: 'regions', measure: 'nb.hitRate' }, null, function (a, host, h) {
      click(qs('[data-control="custom-ask"] button[data-value="one"]', host));
      a.equal(h.spec().measure, 'nb.hitRate', 'the hit rate can be broken down by industry');
      a.equal(h.spec().by, 'industry');
      click(qs('[data-control="custom-ask"] button[data-value="years"]', host));
      a.equal(h.spec().ask, 'years');
      a.equal(h.spec().measure, 'nb.arr', 'no plan years for the hit rate: the first key measure of New business');
      a.equal(pressed('[data-control="custom-topic"]', host), 'newBusiness', 'the topic stays');
      click(qs('[data-control="custom-ask"] button[data-value="regions"]', host));
      a.equal(h.spec().measure, 'nb.arr', 'kept again');
    }));

    T.test(ID, 'Show as offers Bar and Table only; a spec asking for a dot plot draws as a bar', scene({ measure: 'nb.arr', by: 'entity', type: 'dot' }, null, function (a, host, h) {
      a.deepEqual(values('[data-control="custom-type"]', host), ['bar', 'table'], 'two choices');
      a.equal(pressed('[data-control="custom-type"]', host), 'bar', 'the dot plot became a bar');
      a.equal(h.spec().type, 'bar');
      a.equal(txt(qs('.tap-panel [data-action="type"]', host)), TAP.shapes.label('bar'), 'the panel draws bars');
      a.ok(!!qs('.tap-panel__chart', panel(host)), 'a chart, not a table');
      click(qs('[data-control="custom-type"] button[data-value="table"]', host));
      a.equal(h.spec().type, 'table');
      a.ok(!!qs('.tap-panel__table', panel(host)), 'the table');
      // The definition itself never offers a dot plot, whatever the choice
      ['regions', 'one', 'years'].forEach(function (ask) {
        var d = TAP.custom.definition({ ask: ask, measure: 'nb.arr', region: 'alpha', type: 'dot' });
        a.ok(!d.errors, ask + ': a dot plot is accepted');
        a.ok(d.types.indexOf('dot') < 0, ask + ': and never offered');
        a.equal(d.defaultType, ask === 'years' ? 'groupedBar' : 'bar', ask + ': drawn as bars');
      });
      a.deepEqual(TAP.custom.types('years'), ['groupedBar', 'table']);
      a.deepEqual(TAP.custom.types('one'), ['bar', 'table']);
    }));

    T.test(ID, 'A kept chart is a chip at the top that reopens it with the same choice; × removes it', scene({ ask: 'one', measure: 'nb.arr', by: 'industry', region: 'bravo' }, null, function (a, host, h) {
      var kept = qs('.tap-custom__kept', host);
      a.ok(!!kept && !!(kept.compareDocumentPosition(qs('[data-control="custom-ask"]', host)) & Node.DOCUMENT_POSITION_FOLLOWING), 'the kept charts row comes before the controls');
      a.ok(!!(kept.compareDocumentPosition(panel(host)) & Node.DOCUMENT_POSITION_FOLLOWING), 'and before the chart');
      a.equal(qsa('.tap-custom__chip', host).length, 0, 'no chips yet');
      click(qs('[data-action="custom-keep"]', host));
      var chip = qs('.tap-custom__chip', host);
      a.ok(!!chip, 'one chip');
      var open = qs('[data-custom-open="0"]', chip), rm = qs('[data-custom-remove="0"]', chip);
      a.equal(txt(open), 'Region B new business ARR potential by industry', 'named for the chart');
      a.equal(rm.getAttribute('aria-label'), 'Remove Region B new business ARR potential by industry', 'the × has an accessible name');
      click(qs('[data-control="custom-ask"] button[data-value="regions"]', host));
      a.equal(h.spec().ask, 'regions', 'moved on');
      click(open);
      a.deepEqual(h.spec(), { ask: 'one', measure: 'nb.arr', by: 'industry', type: 'bar', region: 'bravo' }, 'reopened as kept');
      a.equal(pressed('[data-control="custom-ask"]', host), 'one', 'the choice is pressed again');
      a.equal(qs('select[data-control="custom-region"]', host).value, 'bravo', 'with its region');
      click(qs('[data-custom-remove="0"]', host));
      a.equal(qsa('.tap-custom__chip', host).length, 0, 'removed');
      a.equal(TAP.custom.saved().length, 0);
    }));

    T.test(ID, 'An older spec without ask or region still opens, as the choice its dimension implies', function (a) {
      var old = TAP.custom.definition({ measure: 'nb.hitRate', by: 'industry', type: 'dot' });
      a.ok(!old.errors, 'accepted');
      a.deepEqual(old.spec, { ask: 'one', measure: 'nb.hitRate', by: 'industry', type: 'bar' }, 'read as Break one region down, no region fixed');
      a.ok(!old.cmp, 'without a region it follows the comparison, as it did');
      a.equal(old.defaultType, 'bar');
      a.deepEqual(TAP.custom.definition({ measure: 'nb.arr', by: 'year', type: 'groupedBar' }).spec, { ask: 'years', measure: 'nb.arr', by: 'year', type: 'groupedBar' });
      a.deepEqual(TAP.custom.definition({ measure: 'nb.arr', by: 'entity', type: 'table' }).spec, { ask: 'regions', measure: 'nb.arr', by: 'entity', type: 'table' });
      a.deepEqual(TAP.custom.definition({ measure: 'nb.arr' }).spec, { ask: 'regions', measure: 'nb.arr', by: 'entity', type: 'bar' }, 'a measure alone: by region');
      a.ok(!!TAP.custom.definition({ ask: 'one', measure: 'nb.arr', by: 'industry', region: 'nowhere' }).errors, 'an unknown region is refused');
      a.ok(!!TAP.custom.definition({ ask: 'years', measure: 'nb.hitRate' }).errors, 'no plan years for the hit rate');
      a.ok(!!TAP.custom.definition({ ask: 'regions', measure: 'ind.growthPotential' }).errors, 'a per-industry figure has no region total');
      // In the builder the old spec gets a region, so the chart reads as one region
      var host = T.dom.mount(), h = TAP.customBuilder.render(host, { spec: { measure: 'nb.hitRate', by: 'industry', type: 'dot' } });
      try {
        a.equal(pressed('[data-control="custom-ask"]', host), 'one');
        a.equal(h.spec().region, 'alpha', 'the first region in the data');
        a.ok(!!qs('.tap-panel__chart', panel(host)), 'drawn');
      } finally {
        h.destroy();
        Object.keys(window.TAP_REPORTS).forEach(function (id) { if (/^custom:/.test(id)) delete window.TAP_REPORTS[id]; });
      }
    });

    T.test(ID, 'A presentation step with a one-region spec shows that region; an older step still plays', function (a) {
      if (!TAP.present || TAP.present.__stub) { a.ok(true, 'no presentation mode here'); return; }
      var res = TAP.present.check([
        { custom: { ask: 'one', measure: 'nb.arr', by: 'industry', region: 'charlie' } },
        { custom: { measure: 'nb.hitRate', by: 'industry', type: 'dot' } },
        { custom: { ask: 'one', measure: 'nb.arr', by: 'industry', region: 'charlie' }, cmp: { mode: 'one', focus: 'alpha' } }
      ]);
      a.deepEqual(res.skipped, [], 'every step plays');
      a.equal(res.ok[0].cmp.mode, 'set', 'the step takes the chart’s own region');
      a.deepEqual(res.ok[0].cmp.set, ['charlie']);
      a.equal(res.ok[1].def.defaultType, 'bar', 'the dot plot plays as bars');
      a.equal(res.ok[2].cmp.mode, 'one', 'a comparison written on the step wins');
      a.ok(!window.TAP_REPORTS['custom:nb.arr:industry:charlie'], 'checking registers nothing');
    });
  });
})(window.TAP);
