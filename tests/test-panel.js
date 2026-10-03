/*
 * File: tests/test-panel.js
 * Purpose: Tests for the report panel and its controls.
 * Provides: test cases for PANEL stories (#14, #15, #16, #5, #19, #20, #22): TPV-TC-050 to 055, X-panel-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var TH = window.TAP_THEME;
  var calls = [];          // every ctx the fake builder was given
  var FAKE = null;         // the fake builder's result for the current test

  function qs(sel, root) { return TAP.dom.qs(sel, root); }
  function qsa(sel, root) { return TAP.dom.qsa(sel, root); }
  function txt(node) { return node ? node.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function click(node) { node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
  function last() { return calls[calls.length - 1]; }

  // A small builder of the right shape, so panel behaviour is checked without depending on the engine's charts.
  TAP.builders.register('xPanelFake', function (ctx) {
    calls.push(ctx);
    return Object.assign(baseResult(ctx), FAKE ? FAKE(ctx) : {});
  });

  function baseResult(ctx) {
    return {
      option: { xAxis: { type: 'value' }, yAxis: { type: 'category', data: ['Region A'] },
        series: [{ type: 'bar', tapRole: 'value', data: [{ value: 5, raw: 5, key: 'nb.arr', entityId: 'alpha' }] }] },
      html: null,
      table: { columns: [{ key: 'entity', label: 'Region', unit: 'text', align: 'left' }, { key: 'nb.arr', label: 'ARR', unit: 'money', align: 'right' }],
        rows: [{ entityId: 'alpha', cells: { entity: { v: 'Region A', state: 'value' }, 'nb.arr': { v: 5, state: 'value', kind: 'DER' } }, src: null }] },
      legend: [{ label: 'Region A', color: TH.regions[0], role: 'region' }],
      sizeLegend: null, notes: [], missing: [], empty: false, error: null,
      target: function (p) {
        var d = (p && p.data) || {};
        var region = d.regionId || d.entityId;
        return { reportId: ctx.def.id, regionIds: region ? [region] : [], industryIds: d.industryId ? [d.industryId] : [],
          accountIds: [], mark: 'cell' };
      }
    };
  }

  function fakeDef(extra) {
    return Object.assign({ id: 'x-fake', view: 'overview', title: 'How does the fake report read?',
      explain: { shows: 'Fake shows.', read: 'Fake read.', lookFor: 'Fake look.' },
      shape: 'compare', builder: 'xPanelFake', dimension: 'entity', measures: [{ id: 'nb.arr', label: 'ARR' }],
      defaultType: 'bar', types: ['bar', 'dot', 'table'], breakdowns: [], sources: ['IN'], options: {} }, extra || {});
  }

  function insight(i, extra) {
    return Object.assign({ id: 'r' + i + ':k', ruleId: 'r' + i, family: 'priorities', sentence: 'Observation number ' + i + '.',
      figures: [{ label: 'Figure ' + i, cell: { v: 1200, state: 'value', kind: 'IN' } }], description: 'Rule text ' + i,
      regionIds: ['alpha'], industryIds: [], accountIds: [], significance: 1 - i / 10, reportId: 'x-fake', highlight: 'bar',
      label: 'Observation to discuss' }, extra || {});
  }

  function fakeInsights(list) {
    var hidden = [];
    return {
      hidden: hidden,
      ranked: function () { return list.filter(function (x) { return hidden.indexOf(x.id) < 0; }); },
      top: function (cmp, id, n) { return this.ranked().slice(0, n); },
      hide: function (id) { hidden.push(id); TAP.store.set({ hiddenInsights: hidden.slice() }); }
    };
  }

  // Runs a test body with helpers, and always tidies up: panels destroyed, swapped modules and reports restored.
  function scene(fn) {
    return function (a) {
      var saved = { insights: TAP.insights, explain: TAP.explain }, ids = [], panels = [];
      calls = [];
      FAKE = null;
      var api = {
        panel: function (id, opts) { var p = TAP.panel.create(T.dom.mount(), id, opts); panels.push(p); return p; },
        report: function (def) { window.TAP_REPORTS[def.id] = def; ids.push(def.id); return def; }
      };
      try { return fn(a, api); } finally {
        panels.forEach(function (p) { try { p.destroy(); } catch (e) { /* already gone */ } });
        ids.forEach(function (id) { delete window.TAP_REPORTS[id]; });
        TAP.insights = saved.insights;
        TAP.explain = saved.explain;
        if (TAP.layers.top()) TAP.layers.close();
        FAKE = null;
      }
    };
  }

  function chartOf(p) {
    var el = qs('.tap-panel__chart', p.el);
    return el ? window.echarts.getInstanceByDom(el) : null;
  }

  T.suite('panel', function () {
    T.test('X-panel-api', 'TAP.panel.create returns the promised handle', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake');
      a.equal(p.id, 'x-fake');
      a.ok(p.el && p.el.nodeType === 1, 'el is an element');
      ['refresh', 'highlight', 'expand', 'destroy'].forEach(function (f) { a.equal(typeof p[f], 'function', f); });
    }));

    T.test('TPV-TC-050', 'Every Phase 1 panel shows its title, takeaway, body, source line and controls', scene(function (a, s) {
      ['ov-ambition', 'ind-tiers', 'ind-quad', 'ind-ratings'].forEach(function (id) {
        var p = s.panel(id), def = TAP.reports.get(id);
        a.ok(txt(qs('.tap-panel__title', p.el)).length > 0, id + ': title');
        a.ok(txt(qs('.tap-panel__title', p.el)).indexOf('{industry}') < 0, id + ': no unfilled placeholder');
        a.ok(qs('.tap-panel__takeaway', p.el), id + ': takeaway line is always there');
        a.ok(qs('.tap-panel__chart, .tap-panel__html, .tap-panel__error, .tap-panel__empty', p.el), id + ': body');
        a.ok(qs('.tap-panel__source', p.el), id + ': source line');
        a.ok(qs('.tap-panel__tools [data-action="insights"]', p.el), id + ': insights control');
        a.ok(qs('.tap-panel__tools [data-action="about"]', p.el), id + ': explanation control');
        if (!def.builder) {
          a.ok(chartOf(p), id + ': chart drawn');
          a.ok(qsa('.tap-panel__legend-item', p.el).length > 0, id + ': legend');
        }
      });
      a.equal(txt(qs('.tap-panel__title', s.panel('ov-ambition').el)), TAP.reports.get('ov-ambition').title, 'title is the question');
    }));

    T.test('TPV-TC-050', 'The title fills {industry} and marks glossary terms once per panel', scene(function (a, s) {
      var p = s.panel('ind-ratings', { industryId: 'ind2' });
      a.equal(txt(qs('.tap-panel__title', p.el)), 'How do regions rate Education?');
      s.report(fakeDef({ title: 'How big is ARR, and ARR again?' }));
      var q = s.panel('x-fake');
      a.equal(qsa('.tap-panel__title .tap-term', q.el).length, 1, 'one marked term');
    }));

    T.test('TPV-TC-051', 'The source line names the kinds of data and the import date', scene(function (a, s) {
      var src = txt(qs('.tap-panel__source', s.panel('ov-ambition').el));
      a.ok(src.indexOf(TAP.format.kind('DER').text) >= 0, 'calculated in the workbook');
      a.ok(src.indexOf(TAP.format.kind('PRE').text) >= 0, 'system figure');
      a.match(src, /Data: 2 Oct 2026/, 'latest import date of the mini fixture');
    }));

    T.test('TPV-TC-052', 'The takeaway shows the top insight, and is empty with no placeholder when there is none', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake');
      a.equal(txt(qs('.tap-panel__takeaway', p.el)), '', 'no insights: empty line');
      TAP.insights = fakeInsights([insight(1), insight(2)]);
      p.refresh();
      a.match(txt(qs('.tap-panel__takeaway', p.el)), /^Observation number 1\./, 'top insight');
    }));

    T.test('TPV-TC-053', 'The insights icon counts every insight, lists 3 on click and links to the Insights page', scene(function (a, s) {
      s.report(fakeDef());
      TAP.insights = fakeInsights([1, 2, 3, 4, 5].map(function (i) { return insight(i); }));
      var p = s.panel('x-fake'), btn = qs('[data-action="insights"]', p.el);
      a.match(txt(btn), /5/, 'count reads 5');
      btn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      a.equal(qs('.tap-panel__pop', p.el), null, 'hover alone does not open it');
      click(qs('[data-action="insights"]', p.el));
      a.equal(qsa('.tap-panel__insight', p.el).length, 3, 'three listed');
      a.match(txt(qs('.tap-panel__insight', p.el)), /Figure 1/, 'figures shown');
      a.match(txt(qs('.tap-panel__insight', p.el)), /Rule text 1/, 'rule shown');
      click(qs('[data-action="show-all"]', p.el));
      a.equal(TAP.store.get().view, 'insights', 'opens the Insights page');
    }));

    T.test('TPV-TC-054', 'Selecting an insight highlights its data on the chart', scene(function (a, s) {
      s.report(fakeDef());
      TAP.insights = fakeInsights([insight(1, { regionIds: ['bravo'], highlight: 'bar' })]);
      var p = s.panel('x-fake');
      click(qs('[data-action="insights"]', p.el));
      click(qs('[data-action="select-insight"]', p.el));
      a.deepEqual(last().highlight, { reportId: 'x-fake', regionIds: ['bravo'], industryIds: [], accountIds: [], mark: 'bar' });
      a.match(txt(qs('.tap-panel__strip', p.el)), /Observation number 1/, 'the strip names the insight');
      p.highlight(null);
      a.equal(last().highlight, null, 'cleared');
      a.equal(qs('.tap-panel__strip', p.el), null, 'strip gone');
    }));

    T.test('TPV-TC-054', 'A "Show me" target for this report is passed to the builder', scene(function (a, s) {
      s.report(fakeDef());
      s.panel('x-fake');
      var target = { reportId: 'x-fake', regionIds: ['charlie'], mark: 'bar' };
      TAP.store.set({ highlight: target });
      a.deepEqual(last().highlight, target);
      TAP.store.set({ highlight: { reportId: 'other', regionIds: ['alpha'] } });
      a.equal(last().highlight, null, 'another report\'s target is ignored');
    }));

    T.test('TPV-TC-055', 'The explanation icon opens the explanation', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake');
      click(qs('[data-action="about"]', p.el));
      if (TAP.explain.__stub) {
        a.equal(TAP.layers.top(), 'explain', 'fallback side panel');
        a.match(txt(qs('.tap-layer')), /Fake shows\./, 'shows the definition text');
      }
      var opened = [];
      TAP.explain = { open: function (id) { opened.push(id); } };
      click(qs('[data-action="about"]', p.el));
      a.deepEqual(opened, ['x-fake'], 'TAP.explain.open(reportId)');
    }));

    T.test('X-panel-error', 'An invalid definition shows its errors in its own panel only', scene(function (a, s) {
      s.report(fakeDef({ id: 'x-bad', title: '', types: ['sankey'] }));
      s.report(fakeDef());
      var bad = s.panel('x-bad'), good = s.panel('x-fake');
      a.ok(qs('.tap-panel__error', bad.el), 'error shown');
      a.match(txt(qs('.tap-panel__error', bad.el)), /title/, 'names the problem');
      a.equal(qs('.tap-panel__error', good.el), null, 'the other panel is fine');
      a.ok(chartOf(good), 'and draws its chart');
      FAKE = function () { return { error: 'Not built yet (#32): builder tierGrid', option: null }; };
      good.refresh();
      a.match(txt(qs('.tap-panel__error', good.el)), /Not built yet/, 'a builder error shows in the panel');
    }));

    T.test('X-panel-empty', 'No data at all shows a message and names the regions without data', scene(function (a, s) {
      s.report(fakeDef());
      FAKE = function () { return { empty: true, option: null, missing: ['Region A', 'Region B'] }; };
      var p = s.panel('x-fake');
      a.match(txt(qs('.tap-panel__empty', p.el)), /No region has data/);
      a.match(txt(qs('.tap-panel__empty', p.el)), /Region A and Region B/);
      a.equal(chartOf(p), null, 'no chart drawn');
    }));

    T.test('X-panel-missing', 'Regions without data are named under a drawn chart', scene(function (a, s) {
      s.report(fakeDef());
      FAKE = function () { return { missing: ['Region D'], notes: ['A combined note.'] }; };
      var notes = txt(qs('.tap-panel__notes', s.panel('x-fake').el));
      a.match(notes, /Region D/);
      a.match(notes, /A combined note\./);
    }));

    T.test('X-panel-rerender', 'The panel redraws when the shared comparison changes', scene(function (a, s) {
      s.report(fakeDef());
      s.panel('x-fake');
      var n = calls.length;
      TAP.store.set({ cmp: { mode: 'one', focus: 'alpha' } });
      a.ok(calls.length > n, 'rebuilt');
      a.equal(last().cmp.mode, 'one');
      a.deepEqual(last().entities.map(function (e) { return e.id; }), ['alpha', 'rest']);
    }));

    T.test('X-panel-chart-click', 'A click on a chart item opens details for the builder\'s target', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake'), seen = [];
      TAP.bus.on('industry:select', function (x) { seen.push(x); });
      chartOf(p).trigger('click', { data: { entityId: 'alpha' } });
      a.equal(TAP.layers.top(), 'details', 'details opened');
      a.deepEqual(TAP.store.get().layer.payload.target.regionIds, ['alpha']);
      a.equal(seen.length, 0, 'no industry named, no industry event');
      chartOf(p).trigger('click', { data: { entityId: 'bravo', industryId: 'ind3' } });
      a.deepEqual(seen, [{ industryId: 'ind3' }], 'one industry named');
    }));

    T.test('X-panel-html-click', 'HTML results: clicks on data-tap-* elements go through the builder\'s target', scene(function (a, s) {
      s.report(fakeDef());
      var asked = [], seen = [];
      FAKE = function (ctx) {
        var base = baseResult(ctx);
        return { option: null,
          html: '<div><button type="button" class="x-cell" data-tap-region="charlie" data-tap-industry="ind2"><span>C</span></button>' +
            '<button type="button" class="x-row" data-tap-industry="ind4">Row</button></div>',
          target: function (prm) { asked.push(prm); return base.target(prm); } };
      };
      var p = s.panel('x-fake');
      TAP.bus.on('industry:select', function (x) { seen.push(x); });
      a.ok(qs('.tap-panel__html .x-cell', p.el), 'html drawn');
      click(qs('.x-row', p.el));
      a.deepEqual(asked[0], { data: { regionId: null, industryId: 'ind4' } }, 'target asked with the element\'s data');
      a.deepEqual(seen, [{ industryId: 'ind4' }], 'industry selected');
      a.equal(TAP.layers.top(), null, 'no region, no details');
      click(qs('.x-cell span', p.el));
      a.deepEqual(asked[1], { data: { regionId: 'charlie', industryId: 'ind2' } });
      a.equal(TAP.layers.top(), 'details', 'a region too: details open');
      a.deepEqual(TAP.store.get().layer.payload.target.regionIds, ['charlie']);
    }));

    T.test('X-panel-builder-controls', 'Builder controls are drawn, write ctx.opts and reset with the comparison', scene(function (a, s) {
      s.report(fakeDef());
      FAKE = function (ctx) {
        return { controls: [
          { key: 'sort', label: 'Sort by', kind: 'segmented', value: (ctx.opts && ctx.opts.sort) || 'name',
            options: [{ value: 'name', label: 'Name' }, { value: 'agreement', label: 'Agreement' }] },
          { key: 'filter', label: 'Product line', kind: 'select', value: (ctx.opts && ctx.opts.filter) || 'all',
            options: [{ value: 'all', label: 'All' }, { value: 'pl1', label: 'Product line 1' }] }] };
      };
      var p = s.panel('x-fake');
      a.deepEqual(last().opts, {}, 'starts empty');
      var seg = qs('[data-control="sort"]', p.el);
      a.ok(seg, 'segmented control drawn');
      a.equal(qs('[data-value="name"]', seg).getAttribute('aria-pressed'), 'true', 'current value pressed');
      click(qs('[data-value="agreement"]', seg));
      a.equal(last().opts.sort, 'agreement', 'choice reaches the builder');
      a.equal(qs('[data-control="sort"] [data-value="agreement"]', p.el).getAttribute('aria-pressed'), 'true');
      var sel = qs('select[data-control="filter"]', p.el);
      sel.value = 'pl1';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      a.deepEqual(last().opts, { sort: 'agreement', filter: 'pl1' }, 'both kept');
      TAP.store.set({ cmp: { mode: 'org' } });
      a.deepEqual(last().opts, {}, 'reset when the comparison changes');
    }));

    T.test('X-panel-industry', 'The industry picker lists rated industries and asks for the selection by event', scene(function (a, s) {
      var p = s.panel('ind-ratings', { industryId: 'ind3' }), seen = [];
      var sel = qs('select[data-control="industry"]', p.el);
      a.ok(sel, 'picker shown');
      a.deepEqual(qsa('option', sel).map(function (o) { return o.value; }), ['ind1', 'ind2', 'ind3', 'ind4'], 'rated only');
      a.equal(sel.value, 'ind3', 'value from opts.industryId');
      TAP.bus.on('industry:select', function (x) { seen.push(x); });
      sel.value = 'ind4';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      a.deepEqual(seen, [{ industryId: 'ind4' }]);
      TAP.store.set({ industry: 'ind2' });
      a.equal(qs('select[data-control="industry"]', p.el).value, 'ind2', 'follows state.industry');
      a.equal(txt(qs('.tap-panel__title', p.el)), 'How do regions rate Education?');
      s.report(fakeDef());
      a.equal(qs('select[data-control="industry"]', s.panel('x-fake').el), null, 'no picker unless the definition asks');
    }));

    T.test('X-panel-hide', 'Each insight has a hide control that calls TAP.insights.hide', scene(function (a, s) {
      s.report(fakeDef());
      var fake = TAP.insights = fakeInsights([insight(1), insight(2)]);
      var p = s.panel('x-fake');
      click(qs('.tap-panel__takeaway [data-action="hide-insight"]', p.el));
      a.deepEqual(fake.hidden, ['r1:k'], 'hidden');
      a.match(txt(qs('.tap-panel__takeaway', p.el)), /^Observation number 2\./, 'the next one takes its place');
      click(qs('[data-action="insights"]', p.el));
      a.equal(qsa('.tap-panel__insight [data-action="hide-insight"]', p.el).length, 1, 'list items have it too');
    }));

    T.test('X-panel-destroy', 'destroy disposes the chart and stops listening', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake'), el = qs('.tap-panel__chart', p.el);
      p.destroy();
      a.equal(window.echarts.getInstanceByDom(el), undefined, 'chart disposed');
      var n = calls.length;
      TAP.store.set({ cmp: { mode: 'org' } });
      a.equal(calls.length, n, 'no rebuild after destroy');
    }));
  });
})(window.TAP);
