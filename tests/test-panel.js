/*
 * File: tests/test-panel.js
 * Purpose: Tests for the report panel and its controls.
 * Provides: test cases for PANEL stories (#14, #15, #16, #5, #19, #20, #22): TPV-TC-050 to 055, 057 to 061, 063 to
 *           067, 228 to 232, 241 to 250, 256 to 258, X-panel-*, X-table-*, X-export-*
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
      regionIds: ['alpha'], industryIds: [], accountIds: [], significance: 1 - i / 10, reportId: 'x-fake', highlight: { reportId: 'x-fake', mark: 'bar' },
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
      var saved = { insights: TAP.insights, explain: TAP.explain, storage: TAP.storage }, ids = [], panels = [];
      TAP.storage.clear('chart:');
      calls = [];
      FAKE = null;
      var api = {
        panel: function (id, opts) { var p = TAP.panel.create(T.dom.mount(), id, opts); panels.push(p); return p; },
        report: function (def) { window.TAP_REPORTS[def.id] = def; ids.push(def.id); return def; }
      };
      function tidy() {
        panels.forEach(function (p) { try { p.destroy(); } catch (e) { /* already gone */ } });
        ids.forEach(function (id) { delete window.TAP_REPORTS[id]; });
        TAP.insights = saved.insights;
        TAP.explain = saved.explain;
        if (TAP.layers.top()) TAP.layers.close();
        TAP.storage = saved.storage;
        TAP.storage.clear('chart:');
        FAKE = null;
      }
      var out;
      try { out = fn(a, api); } catch (e) { tidy(); throw e; }
      // An async body tidies up once it has finished
      if (out && typeof out.then === 'function') return out.then(function (v) { tidy(); return v; }, function (e) { tidy(); throw e; });
      tidy();
      return out;
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
      TAP.insights = fakeInsights([insight(1, { regionIds: ['bravo'], highlight: { reportId: 'x-fake', regionIds: ['bravo'], mark: 'bar' } })]);
      var p = s.panel('x-fake');
      click(qs('[data-action="insights"]', p.el));
      click(qs('[data-action="select-insight"]', p.el));
      a.deepEqual(last().highlight, { reportId: 'x-fake', regionIds: ['bravo'], industryIds: [], accountIds: [], mark: 'bar', quadrant: null });
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

    T.test('X-panel-legend-parts', 'Stacked parts are named in words by shade, with no grey swatches', scene(function (a, s) {
      var p = s.panel('ov-ambition');
      a.equal(qsa('.tap-panel__legend-item--part', p.el).length, 0, 'no swatch for a part');
      var line = txt(qs('.tap-panel__parts', p.el));
      a.match(line, /Darker: New business ARR potential/, 'the first part is the darker shade');
      a.match(line, /lighter: Customer growth ARR/, 'the second the lighter');
      s.report(fakeDef());
      FAKE = function () {
        return { legend: [{ label: 'Region A', color: TH.regions[0], role: 'region' }, { label: 'One', color: TH.ink, role: 'part' },
          { label: 'Two', color: TH.ink, role: 'part' }, { label: 'Three', color: TH.ink, role: 'part' }] };
      };
      a.match(txt(qs('.tap-panel__parts', s.panel('x-fake').el)), /darkest first: One, Two and Three/, 'three parts');
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

  /* ---------- US-1.2.3: switch chart type (#15) ---------- */

  function openTypes(p) {
    if (!qs('[data-type]', p.el)) click(qs('[data-action="type"]', p.el));
    return qsa('[data-type]', p.el);
  }
  function pickType(p, type) { openTypes(p); click(qs('[data-type="' + type + '"]', p.el)); }

  T.suite('panel-types', function () {
    T.test('X-panel-types', 'The chart-type menu offers only the types allowed for the shape and comparison', scene(function (a, s) {
      var p = s.panel('ind-ratings'), def = TAP.reports.get('ind-ratings');
      var want = TAP.shapes.types(def, TAP.scope.entities().length, {}).filter(function (x) { return x !== 'table'; });
      a.deepEqual(openTypes(p).map(function (b) { return b.getAttribute('data-type'); }), want, 'all regions: no radar');
      a.ok(want.indexOf('radar') < 0, 'radar left out with 4 regions');
      TAP.store.set({ cmp: { mode: 'pair', focus: 'alpha', second: 'bravo' } });
      a.ok(openTypes(p).some(function (b) { return b.getAttribute('data-type') === 'radar'; }), 'radar offered for one vs one');
    }));

    T.test('TPV-TC-059', 'The default type is marked, and one click returns to it', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake'), items = openTypes(p);
      var def = items.filter(function (b) { return qs('.tap-panel__default', b); });
      a.equal(def.length, 1, 'one default');
      a.equal(def[0].getAttribute('data-type'), 'bar');
      a.equal(def[0].getAttribute('aria-checked'), 'true', 'default is current');
      click(qs('[data-type="dot"]', p.el));
      a.equal(last().type, 'dot', 'switched');
      a.equal(qs('.tap-panel__pop', p.el), null, 'menu closes after a choice');
      pickType(p, 'bar');
      a.equal(last().type, 'bar', 'back to the default in one click');
      a.match(txt(qs('[data-action="type"]', p.el)), /Bar/, 'button names the current type');
    }));

    T.test('TPV-TC-057', 'Switching type keeps the comparison, focus and measure', scene(function (a, s) {
      s.report(fakeDef({ measures: [{ id: 'nb.arr', label: 'ARR' }, { id: 'cg.arr', label: 'Growth' }] }));
      TAP.store.set({ cmp: { mode: 'one', focus: 'charlie' } });
      var p = s.panel('x-fake');
      click(qs('[data-control="measure"] [data-value="cg.arr"]', p.el));
      pickType(p, 'dot');
      var c = last();
      a.equal(c.type, 'dot');
      a.equal(c.cmp.mode, 'one');
      a.equal(c.cmp.focus, 'charlie');
      a.equal(c.measureId, 'cg.arr', 'measure kept');
    }));

    T.test('TPV-TC-058', 'A switch on the sample data redraws within half a second', scene(function (a, s) {
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      var p = s.panel('ov-ambition');
      ['stacked100', 'treemap', 'bubble', 'stackedBar'].forEach(function (type) {
        openTypes(p);
        var t0 = performance.now();
        click(qs('[data-type="' + type + '"]', p.el));
        var ms = performance.now() - t0;
        a.ok(ms < 500, type + ' drew in ' + Math.round(ms) + ' ms');
        a.ok(chartOf(p), type + ' chart present');
      });
    }));

    T.test('TPV-TC-060', 'The choice is remembered per report, and "Reset all charts" returns every chart to its default', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake');
      pickType(p, 'dot');
      a.equal(TAP.storage.get('chart:x-fake'), 'dot', 'stored under chart:<reportId>');
      p.destroy();
      s.panel('x-fake');
      a.equal(last().type, 'dot', 'a new panel opens on the stored type');
      TAP.bus.emit('charts:reset');
      a.equal(last().type, 'bar', 'back to the default');
      a.equal(TAP.storage.get('chart:x-fake', null), null, 'stored choice cleared');
    }));

    T.test('TPV-TC-061', 'With browser storage failing, switching still works with defaults', scene(function (a, s) {
      s.report(fakeDef());
      var boom = function () { throw new Error('blocked'); };
      TAP.storage = { available: function () { return false; }, get: boom, set: boom, remove: boom, clear: boom };
      var p = s.panel('x-fake');
      a.equal(last().type, 'bar', 'opens on the default');
      pickType(p, 'dot');
      a.equal(last().type, 'dot', 'switches anyway');
      TAP.bus.emit('charts:reset');
      a.equal(last().type, 'bar', 'reset still works');
    }));

    T.test('X-panel-stale-type', 'A stored type the comparison can\'t use falls back to the default, and comes back when it can', scene(function (a, s) {
      TAP.storage.set('chart:ind-ratings', 'radar');
      var p = s.panel('ind-ratings');
      a.match(txt(qs('[data-action="type"]', p.el)), /Dot plot/, 'four regions: dot plot');
      TAP.store.set({ cmp: { mode: 'pair', focus: 'alpha', second: 'bravo' } });
      a.match(txt(qs('[data-action="type"]', p.el)), /Radar/, 'two regions: radar again');
    }));

    T.test('X-panel-measure', 'A measure switch appears when a report has several measures, not for categories', scene(function (a, s) {
      var p = s.panel('ov-ambition'), seg = qs('[data-control="measure"]', p.el);
      a.ok(seg, 'shown on the ambition report');
      a.deepEqual(qsa('[data-value]', seg).map(function (b) { return txt(b); }), ['ARR', 'Services', 'Total order intake']);
      a.equal(qs('[data-value="amb.arr"]', seg).getAttribute('aria-pressed'), 'true', 'first is the default');
      a.equal(qs('[data-control="measure"]', s.panel('ind-ratings').el), null, 'none when measures are the categories');
    }));

    T.test('X-panel-size', 'A bubble-size switch appears for bubble types with more than one size option', scene(function (a, s) {
      s.report(fakeDef({ id: 'x-fake', shape: 'xyz', x: 'ind.ability', y: 'ind.attractiveness', dimension: 'industry',
        measures: [{ id: 'ind.ability', label: 'Ability' }], defaultType: 'bubble', types: ['bubble', 'scatter', 'table'],
        size: { options: ['ind.pipeline', 'ind.currentArr'], default: 'ind.pipeline' } }));
      var p = s.panel('x-fake');
      var seg = qs('[data-control="size"]', p.el);
      a.ok(seg, 'size switch shown');
      click(qs('[data-value="ind.currentArr"]', seg));
      a.equal(last().sizeId, 'ind.currentArr');
      pickType(p, 'scatter');
      a.equal(qs('[data-control="size"]', p.el), null, 'no size switch for scatter');
    }));
  });

  /* ---------- US-1.2.4: table view (#16) ---------- */

  // A table of four regions: real cells with real sources, one left blank, plus a text column.
  function tableResult(n) {
    var ids = ['alpha', 'bravo', 'charlie', 'delta'], f = TAP.measures.get('nb.arr');
    var rows = [];
    for (var i = 0; i < (n || 4); i++) {
      var id = ids[i % 4], c = f(id, { year: null });
      if (i === 1) c = { v: null, state: 'notProvided', kind: c.kind, src: c.src };
      rows.push({ entityId: id, cells: { entity: { v: 'Row ' + i, state: 'value', kind: null }, 'nb.arr': c }, src: c.src });
    }
    return { columns: [{ key: 'entity', label: 'Region', unit: 'text', align: 'left' },
      { key: 'nb.arr', label: 'ARR', unit: 'money', align: 'right' }], rows: rows };
  }
  function showTable(p) { if (!qs('.tap-panel__table', p.el)) click(qs('[data-action="table"]', p.el)); return qs('.tap-panel__table', p.el); }
  function column(tbl, i) { return qsa('tbody tr', tbl).map(function (tr) { return txt(tr.children[i]); }); }

  T.suite('panel-table', function () {
    T.test('X-table-toggle', 'The Table button shows the same data as a table and back, keeping the chart type', scene(function (a, s) {
      s.report(fakeDef());
      FAKE = function () { return { table: tableResult() }; };
      var p = s.panel('x-fake');
      pickType(p, 'dot');
      a.ok(showTable(p), 'table shown');
      a.equal(qs('[data-action="table"]', p.el).getAttribute('aria-pressed'), 'true');
      a.equal(qs('.tap-panel__body .tap-panel__chart', p.el), null, 'no chart beside it');
      a.equal(last().type, 'dot', 'built with the chosen chart type, so the data matches');
      click(qs('[data-action="table"]', p.el));
      a.ok(qs('.tap-panel__body .tap-panel__chart', p.el), 'chart back');
      openTypes(p);
      a.match(txt(qs('.tap-panel__pop', p.el)), /table of the same data/i, 'the type menu points to the table');
    }));

    T.test('X-table-same', 'The table shows the builder\'s table: every row and exact value, on the sample data', scene(function (a, s) {
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      var p = s.panel('ov-ambition'), tbl = showTable(p), def = TAP.reports.get('ov-ambition'), c = TAP.store.get().cmp;
      var res = TAP.builders.get('parts')({ def: def, type: def.defaultType, measureId: null, sizeId: null, breakdown: null, cmp: c,
        entities: TAP.scope.entities(c), year: null, industryId: null, highlight: null, expanded: false, theme: TH, opts: {} });
      a.equal(qsa('tbody tr', tbl).length, res.table.rows.length, 'same rows');
      res.table.columns.forEach(function (col, i) {
        a.equal(txt(qsa('thead th', tbl)[i]).replace(/[▲▼]/g, '').trim(), col.label, 'header ' + col.label);
        a.deepEqual(column(tbl, i), res.table.rows.map(function (r) {
          return TAP.format.cell(r.cells[col.key], { unit: col.unit, exact: true, field: col.field });
        }), 'column ' + col.label);
      });
    }));

    T.test('TPV-TC-063', 'Column headers sort ascending, then descending', scene(function (a, s) {
      s.report(fakeDef());
      FAKE = function () { return { table: tableResult() }; };
      var p = s.panel('x-fake'), f = TAP.measures.get('nb.arr');
      var v = { alpha: f('alpha', {}).v, charlie: f('charlie', {}).v, delta: f('delta', {}).v };
      var asc = ['alpha', 'charlie', 'delta'].sort(function (x, y) { return v[x] - v[y]; });
      showTable(p);
      click(qs('[data-sort="nb.arr"]', p.el));
      var tbl = qs('.tap-panel__table', p.el);
      a.deepEqual(qsa('tbody tr', tbl).map(function (tr) { return tr.getAttribute('data-entity'); }), asc.concat(['bravo']), 'ascending, blank last');
      a.equal(qs('[data-sort="nb.arr"]', p.el).parentNode.getAttribute('aria-sort'), 'ascending');
      click(qs('[data-sort="nb.arr"]', p.el));
      tbl = qs('.tap-panel__table', p.el);
      a.deepEqual(qsa('tbody tr', tbl).map(function (tr) { return tr.getAttribute('data-entity'); }), asc.slice().reverse().concat(['bravo']), 'descending, blank still last');
      a.equal(qs('[data-sort="nb.arr"]', p.el).parentNode.getAttribute('aria-sort'), 'descending');
    }));

    T.test('TPV-TC-064', 'Blanks read "not provided", numbers are exact, and the focus row is highlighted', scene(function (a, s) {
      s.report(fakeDef());
      FAKE = function () { return { table: tableResult() }; };
      TAP.store.set({ cmp: { mode: 'one', focus: 'charlie' } });
      var tbl = showTable(s.panel('x-fake')), vals = column(tbl, 1);
      a.equal(vals[1], 'not provided');
      a.equal(vals[0], TAP.format.moneyExact(TAP.measures.get('nb.arr')('alpha', {}).v), 'exact money');
      var focus = qsa('tbody tr.is-focus', tbl);
      a.equal(focus.length, 1, 'one focus row');
      a.equal(focus[0].getAttribute('data-entity'), 'charlie');
      a.ok(qs('.tap-panel__focus-mark', focus[0]), 'marked in words too, not by colour alone');
    }));

    T.test('TPV-TC-065', 'Each row shows its source as file › sheet › cell', scene(function (a, s) {
      s.report(fakeDef());
      var t0 = tableResult();
      FAKE = function () { return { table: t0 }; };
      var tbl = showTable(s.panel('x-fake')), last = qsa('thead th', tbl).length - 1;
      a.equal(txt(qsa('thead th', tbl)[last]).replace(/[▲▼]/g, '').trim(), 'Source');
      a.deepEqual(column(tbl, last), t0.rows.map(function (r) { return TAP.sources.address(r.src).text; }));
      a.match(column(tbl, last)[0], /Region A plan\.xlsx › /, 'names the file');
    }));

    T.test('TPV-TC-066', 'Copy to clipboard gives tab-separated text with the source column and the data label', scene(function (a, s) {
      s.report(fakeDef());
      var t0 = tableResult();
      FAKE = function () { return { table: t0 }; };
      var p = s.panel('x-fake'), text = TAP.panelTable.toText(t0, { label: TAP.shell.label() });
      var lines = text.split('\n');
      a.equal(lines[0], TAP.shell.label().text, 'data label first');
      a.equal(lines[1], 'Region\tARR\tSource', 'headers');
      a.equal(lines.length, 2 + t0.rows.length, 'one line per row');
      a.equal(lines[3].split('\t')[1], 'not provided');
      a.equal(lines[2].split('\t')[2], TAP.sources.address(t0.rows[0].src).text, 'source column');
      var saved = TAP.panelTable.clipboard, got = null;
      TAP.panelTable.clipboard = function (x) { got = x; return Promise.resolve(true); };
      showTable(p);
      click(qs('[data-action="copy-table"]', p.el));
      TAP.panelTable.clipboard = saved;
      return new Promise(function (done) { setTimeout(done, 0); }).then(function () {
        a.equal(got, text, 'the button copies the same text');
        a.match(txt(qs('.tap-panel__table-status', p.el)), /copied/i, 'says so');
      });
    }));

    T.test('TPV-TC-067', 'A long table scrolls inside the panel with the headers fixed', scene(function (a, s) {
      s.report(fakeDef());
      FAKE = function () { return { table: tableResult(175) }; };
      var p = s.panel('x-fake'), tbl = showTable(p), wrap = qs('.tap-panel__tablewrap', p.el);
      a.equal(qsa('tbody tr', tbl).length, 175, 'every row, no paging');
      a.ok(wrap.scrollHeight > wrap.clientHeight, 'scrolls inside its box');
      a.equal(getComputedStyle(wrap).overflowY, 'auto');
      a.equal(getComputedStyle(qs('thead th', tbl)).position, 'sticky', 'headers stay put');
    }));
  });

  /* ---------- US-1.1.4: compare one chart differently (#5) ---------- */

  function openCompare(p) {
    if (!qs('.tap-panel__custom-editor', p.el)) { click(qs('[data-action="more"]', p.el)); click(qs('[data-action="compare"]', p.el)); }
    return qs('.tap-panel__custom-editor', p.el);
  }
  function choose(p, control, value) {
    var sel = qs('select[data-control="' + control + '"]', p.el);
    sel.value = value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  T.suite('panel-compare', function () {
    T.test('TPV-TC-228', '"Compare differently" offers the same five modes as the comparison bar', scene(function (a, s) {
      s.report(fakeDef());
      var ed = openCompare(s.panel('x-fake'));
      a.ok(ed, 'editor opens');
      var opts = qsa('select[data-control="cmp-mode"] option', ed);
      a.deepEqual(opts.map(function (o) { return o.value; }), ['all', 'one', 'pair', 'set', 'org']);
      a.deepEqual(opts.map(function (o) { return txt(o); }), ['all', 'one', 'pair', 'set', 'org'].map(function (m) {
        return TAP.content.text('compare.modes.' + m);
      }), 'same words');
    }));

    T.test('TPV-TC-229', 'A panel with its own comparison shows a badge and its own sentence; the page keeps its setting', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake');
      openCompare(p);
      choose(p, 'cmp-mode', 'one');
      choose(p, 'cmp-focus', 'bravo');
      var c = last().cmp;
      a.equal(c.mode, 'one');
      a.equal(c.focus, 'bravo');
      a.deepEqual(last().entities.map(function (e) { return e.id; }), ['bravo', 'rest']);
      a.equal(TAP.store.get().cmp.mode, 'all', 'shared comparison untouched');
      var badge = qs('.tap-panel__custom', p.el);
      a.match(txt(badge), /Custom comparison/);
      a.ok(txt(badge).indexOf(TAP.scope.sentence(c)) >= 0, 'its own sentence');
      choose(p, 'cmp-mode', 'pair');
      a.equal(last().cmp.second !== last().cmp.focus && !!last().cmp.second, true, 'one vs one gets a second region');
      choose(p, 'cmp-mode', 'set');
      a.ok(last().cmp.set.length >= 2, 'a set starts with two regions');
      click(qs('[data-control="cmp-set"] [data-value="delta"]', p.el));
      a.ok(last().cmp.set.indexOf('delta') >= 0, 'region added to the set');
      click(qs('[data-action="custom-done"]', p.el));
      a.equal(qs('.tap-panel__custom-editor', p.el), null, 'editor closed');
      a.ok(qs('.tap-panel__custom', p.el), 'badge stays');
    }));

    T.test('TPV-TC-230', 'One click on reset follows the shared setting again', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake');
      openCompare(p);
      choose(p, 'cmp-mode', 'org');
      a.equal(last().cmp.mode, 'org');
      click(qs('[data-action="custom-reset"]', p.el));
      a.deepEqual(last().cmp, TAP.store.get().cmp, 'shared comparison');
      a.equal(qs('.tap-panel__custom', p.el), null, 'badge gone');
    }));

    T.test('TPV-TC-231', 'Changing the shared comparison clears the panel\'s own', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake');
      openCompare(p);
      choose(p, 'cmp-mode', 'org');
      TAP.store.set({ cmp: { mode: 'one', focus: 'charlie' } });
      a.equal(last().cmp.mode, 'one');
      a.equal(last().cmp.focus, 'charlie');
      a.equal(qs('.tap-panel__custom', p.el), null);
    }));

    T.test('TPV-TC-232', 'Leaving the view clears the panel\'s own comparison', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake');
      openCompare(p);
      choose(p, 'cmp-mode', 'org');
      TAP.store.set({ view: 'industry' });
      TAP.store.set({ view: 'overview' });
      a.equal(last().cmp.mode, 'all');
      a.equal(qs('.tap-panel__custom', p.el), null);
    }));
  });

  /* ---------- US-1.2.8: full-screen chart (#20) ---------- */

  function more(p, action) {
    if (!qs('[data-action="' + action + '"]', p.el)) click(qs('[data-action="more"]', p.el));
    click(qs('[data-action="' + action + '"]', p.el));
  }
  function key(name, target) {
    var e = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    (target || document.body).dispatchEvent(e);
    return e;
  }
  function expanded(p) { return p.el.classList.contains('tap-panel--expanded'); }

  T.suite('panel-expand', function () {
    T.test('TPV-TC-245', 'Expand fills the window under a strip with the comparison sentence and the data label', scene(function (a, s) {
      s.report(fakeDef());
      TAP.store.set({ cmp: { mode: 'one', focus: 'bravo' } });
      var p = s.panel('x-fake');
      more(p, 'expand');
      a.equal(TAP.store.get().expanded, 'x-fake', 'state.expanded');
      a.ok(expanded(p), 'panel expanded');
      a.equal(getComputedStyle(p.el).position, 'fixed', 'fills the window');
      var strip = txt(qs('.tap-panel__expand-strip', p.el));
      a.ok(strip.indexOf(TAP.scope.sentence(TAP.store.get().cmp)) >= 0, 'comparison sentence');
      a.ok(strip.indexOf(TAP.shell.label().text) >= 0, 'data label');
      a.match(strip, /Data: 2 Oct 2026/, 'data date');
      a.ok(document.documentElement.classList.contains('tap-noscroll'), 'page scrolling locked');
    }));

    T.test('TPV-TC-246', 'True full screen asks the browser for full screen and expands the chart', scene(function (a, s) {
      s.report(fakeDef());
      var root = document.documentElement, asked = 0, had = Object.prototype.hasOwnProperty.call(root, 'requestFullscreen');
      root.requestFullscreen = function () { asked++; return Promise.resolve(); };
      try {
        var p = s.panel('x-fake');
        more(p, 'fullscreen');
        a.equal(asked, 1, 'Fullscreen API called');
        a.equal(TAP.store.get().expanded, 'x-fake', 'and expanded');
      } finally { if (!had) delete root.requestFullscreen; }
    }));

    T.test('TPV-TC-247', 'Esc or the close button returns the view as it was', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake');
      more(p, 'expand');
      click(qs('[data-action="more"]', p.el));
      key('Escape');
      a.ok(expanded(p), 'the first Esc closes the open menu only');
      a.equal(qs('.tap-panel__pop', p.el), null);
      key('Escape');
      a.equal(TAP.store.get().expanded, null, 'Esc collapses');
      a.ok(!expanded(p), 'panel back in place');
      a.ok(!document.documentElement.classList.contains('tap-noscroll'), 'scrolling back');
      more(p, 'expand');
      click(qs('[data-action="collapse"]', p.el));
      a.equal(TAP.store.get().expanded, null, 'close button collapses');
      a.equal(qs('.tap-panel__expand-strip', p.el), null, 'strip gone');
    }));

    T.test('TPV-TC-248', 'Left and right arrows step through the view\'s charts, still expanded', scene(function (a, s) {
      s.report(fakeDef());
      s.report(fakeDef({ id: 'x-fake2', title: 'What does the second fake show?' }));
      var p1 = s.panel('x-fake'), p2 = s.panel('x-fake2');
      more(p1, 'expand');
      a.match(txt(qs('.tap-panel__expand-strip', p1.el)), /Chart 1 of 2/);
      key('ArrowRight');
      a.equal(TAP.store.get().expanded, 'x-fake2', 'next chart');
      a.ok(expanded(p2) && !expanded(p1), 'only the next one is expanded');
      key('ArrowRight');
      a.equal(TAP.store.get().expanded, 'x-fake', 'wraps round');
      key('ArrowLeft');
      a.equal(TAP.store.get().expanded, 'x-fake2', 'previous chart');
      var sel = TAP.dom.el('select');
      p2.el.appendChild(sel);
      key('ArrowLeft', sel);
      a.equal(TAP.store.get().expanded, 'x-fake2', 'arrows in a field are left alone');
    }));

    T.test('TPV-TC-249', 'Every panel control still works while expanded', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake');
      more(p, 'expand');
      pickType(p, 'dot');
      a.equal(last().type, 'dot', 'chart type');
      a.ok(expanded(p), 'still expanded');
      a.ok(showTable(p), 'table');
      click(qs('[data-action="about"]', p.el));
      a.ok(TAP.layers.top(), 'explanation');
      TAP.layers.close();
      a.ok(expanded(p), 'still expanded after closing the side panel');
    }));

    T.test('TPV-TC-250', 'Chart text is larger in the expanded view', scene(function (a, s) {
      s.report(fakeDef());
      var size = TH.type.chart;
      FAKE = function () {
        return { option: { xAxis: { type: 'value', axisLabel: { fontSize: size } }, yAxis: { type: 'category', data: ['Region A'], axisLabel: { fontSize: size } },
          series: [{ type: 'bar', data: [{ value: 5, raw: 5, key: 'nb.arr', entityId: 'alpha' }] }] } };
      };
      var p = s.panel('x-fake');
      a.equal(chartOf(p).getOption().yAxis[0].axisLabel.fontSize, size, 'normal size');
      more(p, 'expand');
      a.equal(last().expanded, true, 'the builder knows');
      a.ok(chartOf(p).getOption().yAxis[0].axisLabel.fontSize > size, 'larger chart labels');
      a.ok(parseFloat(getComputedStyle(qs('.tap-panel__title', p.el)).fontSize) > TH.type.h2, 'larger title');
    }));
  });

  /* ---------- US-1.2.10: copy a chart for slides (#22) ---------- */

  // Swaps the export module's two outlets (download and image clipboard) for the length of fn.
  function capture(fn) {
    var E = TAP.panelExport, saved = { download: E.download, clipboardImage: E.clipboardImage }, got = {};
    E.download = function (url, name) { got.url = url; got.name = name; };
    E.clipboardImage = function (blob) { got.blob = blob; return Promise.resolve(true); };
    return Promise.resolve(fn(got)).then(function (v) { Object.assign(E, saved); return v; },
      function (e) { Object.assign(E, saved); throw e; });
  }
  // Waits until check() is true (image encoding is asynchronous), for up to about 2 seconds.
  function until(check) {
    return new Promise(function (done) {
      var n = 0;
      (function poll() { if (check() || ++n > 40) done(); else setTimeout(poll, 50); })();
    });
  }

  T.suite('panel-export', function () {
    T.test('TPV-TC-256', 'Save image writes a PNG that includes the title, the legend and the data label', scene(function (a, s) {
      var p = s.panel('ov-ambition');
      return capture(function (got) {
        more(p, 'save-image');
        return until(function () { return !!got.url; }).then(function () {
          a.equal(got.name, 'ov-ambition.png', 'file name');
          a.match(got.url || '', /^data:image\/png;base64,/, 'a PNG');
        });
      }).then(function () {
        return TAP.panelExport.compose(TAP.panelExport.specOf(p.el));
      }).then(function (out) {
        var text = out.texts.join(' | ');
        a.ok(out.canvas.width > 0 && out.canvas.height > 0, 'drawn');
        a.ok(text.indexOf(TAP.reports.get('ov-ambition').title) >= 0, 'title');
        a.ok(text.indexOf(TAP.content.regionName(TAP.data.region('alpha'))) >= 0, 'legend names the regions');
        a.ok(/Darker: /.test(text), 'legend names the parts');
        a.ok(text.indexOf(TAP.shell.label().text) >= 0, 'data label');
      });
    }));

    T.test('TPV-TC-257', 'Copy image puts a PNG on the clipboard and says so', scene(function (a, s) {
      var p = s.panel('ov-ambition');
      return capture(function (got) {
        more(p, 'copy-image');
        return until(function () { return !!txt(qs('.tap-panel__status', p.el)); }).then(function () {
          a.ok(got.blob, 'something copied');
          a.equal(got.blob && got.blob.type, 'image/png');
          a.match(txt(qs('.tap-panel__status', p.el)), /copied/i);
        });
      });
    }));

    T.test('TPV-TC-258', 'The image carries the sample or the internal label, whichever applies', scene(function (a, s) {
      var plan = T_FIXTURE('mini');
      plan.meta.isSample = false;
      TAP.data.load(plan);
      var p = s.panel('ov-ambition');
      return TAP.panelExport.compose(TAP.panelExport.specOf(p.el)).then(function (out) {
        a.equal(TAP.shell.label().kind, 'internal');
        a.ok(out.texts.indexOf(TAP.shell.label().text) >= 0, 'internal label drawn');
      });
    }));

    T.test('X-export-disabled', 'Image export is offered on chart views only', scene(function (a, s) {
      s.report(fakeDef());
      var p = s.panel('x-fake');
      click(qs('[data-action="more"]', p.el));
      a.ok(!qs('[data-action="save-image"]', p.el).disabled, 'chart: enabled');
      click(qs('[data-action="table"]', p.el));
      click(qs('[data-action="more"]', p.el));
      a.ok(qs('[data-action="save-image"]', p.el).disabled, 'table: disabled');
      a.ok(qs('[data-action="copy-image"]', p.el).disabled);
      a.match(txt(qs('.tap-panel__pop', p.el)), /chart views/, 'says why');
    }));
  });

  /* ---------- US-1.2.7: break down by a second dimension (#19) ---------- */

  function breakdownOpts(p) { return qsa('[data-control="breakdown"] [data-value]', p.el).map(function (b) { return b.getAttribute('data-value'); }); }
  function breakDown(p, v) { click(qs('[data-control="breakdown"] [data-value="' + v + '"]', p.el)); }
  function seriesNames(p) {
    return chartOf(p).getOption().series.filter(function (x) { return x.tapRole === 'value'; }).map(function (x) { return x.name; });
  }

  T.suite('panel-breakdown', function () {
    T.test('TPV-TC-241', '"Break down by" lists exactly the definition\'s breakdowns, plus none', scene(function (a, s) {
      a.deepEqual(breakdownOpts(s.panel('ov-ambition')), ['none', 'year'], 'ambition: by plan year');
      s.report(fakeDef({ breakdowns: ['year', 'channel'] }));
      a.deepEqual(breakdownOpts(s.panel('x-fake')), ['none', 'year', 'channel']);
      a.equal(qs('[data-control="breakdown"]', s.panel('ind-ratings').el), null, 'none offered when the definition has none');
    }));

    T.test('TPV-TC-242', 'A breakdown adapts the chart and updates the allowed types', scene(function (a, s) {
      var p = s.panel('ov-ambition'), def = TAP.reports.get('ov-ambition'), years = TAP.data.meta().years.map(String);
      a.ok(openTypes(p).every(function (b) { return b.getAttribute('data-type') !== 'groupedBar'; }), 'no grouped bars before');
      breakDown(p, 'year');
      a.deepEqual(seriesNames(p), years, 'one part per plan year');
      var types = openTypes(p).map(function (b) { return b.getAttribute('data-type'); });
      a.ok(types.indexOf('bubble') < 0, 'bubble, which can\'t show a breakdown, is left out');
      a.deepEqual(types, TAP.shapes.types(def, TAP.scope.entities().length, { breakdown: 'year' })
        .filter(function (x) { return x !== 'table' && x !== 'bubble'; }), 'the engine\'s list for a breakdown');
      // Grouped bars appear with a breakdown wherever the definition lists them
      s.report(Object.assign({}, def, { id: 'x-amb', types: def.types.concat(['groupedBar']) }));
      var q = s.panel('x-amb');
      a.ok(openTypes(q).every(function (b) { return b.getAttribute('data-type') !== 'groupedBar'; }), 'not without a breakdown');
      breakDown(q, 'year');
      a.ok(openTypes(q).some(function (b) { return b.getAttribute('data-type') === 'groupedBar'; }), 'offered with one');
      click(qs('[data-type="groupedBar"]', q.el));
      a.deepEqual(seriesNames(q), years, 'grouped by year');
    }));

    T.test('TPV-TC-243', 'Removing the breakdown returns the original chart, type and series', scene(function (a, s) {
      var def = TAP.reports.get('ov-ambition');
      s.report(Object.assign({}, def, { id: 'x-amb', types: def.types.concat(['groupedBar']) }));
      var p = s.panel('x-amb'), before = seriesNames(p);
      breakDown(p, 'year');
      breakDown(p, 'none');
      a.deepEqual(seriesNames(p), before, 'same series');
      breakDown(p, 'year');
      pickType(p, 'groupedBar');
      breakDown(p, 'none');
      a.deepEqual(seriesNames(p), before, 'same series after grouped bars');
      a.match(txt(qs('[data-action="type"]', p.el)), /^Stacked bar/, 'grouped bars need a breakdown: back to the default type');
      a.equal(qs('[data-control="breakdown"] [data-value="none"]', p.el).getAttribute('aria-pressed'), 'true');
    }));

    T.test('TPV-TC-244', 'Choosing another breakdown replaces the first; never two at once', scene(function (a, s) {
      s.report(fakeDef({ breakdowns: ['year', 'channel'] }));
      var p = s.panel('x-fake');
      breakDown(p, 'year');
      a.equal(last().breakdown, 'year');
      breakDown(p, 'channel');
      a.equal(last().breakdown, 'channel', 'replaced');
      a.equal(qsa('[data-control="breakdown"] [aria-pressed="true"]', p.el).length, 1, 'one pressed');
    }));

    T.test('TPV-TC-057', 'Switching type keeps the breakdown', scene(function (a, s) {
      var p = s.panel('ov-ambition');
      breakDown(p, 'year');
      pickType(p, 'stacked100');
      a.equal(qs('[data-control="breakdown"] [data-value="year"]', p.el).getAttribute('aria-pressed'), 'true', 'still by year');
      a.deepEqual(seriesNames(p), TAP.data.meta().years.map(String));
    }));

    T.test('X-panel-measure-xy', 'No measure switch where the axes come from x and y', scene(function (a, s) {
      s.report(fakeDef({ shape: 'xyz', x: 'ind.ability', y: 'ind.attractiveness', dimension: 'industry', defaultType: 'bubble',
        measures: [{ id: 'ind.attractiveness', label: 'Attractiveness' }, { id: 'ind.ability', label: 'Ability to win' }],
        types: ['bubble', 'scatter', 'table'], size: { options: ['ind.pipeline'], default: 'ind.pipeline' } }));
      a.equal(qs('[data-control="measure"]', s.panel('x-fake').el), null, 'xyz: none');
      a.equal(qs('[data-control="measure"]', s.panel('ind-quad').el), null, 'the quadrant report: none');
      a.ok(qs('[data-control="measure"]', s.panel('ov-ambition').el), 'a parts report keeps it');
    }));
    // QA-1: the takeaway follows the comparison, on the sample data with the real insight engine.
    T.test('X-panel-takeaway-scope', 'The takeaway never names a region that is only inside the rest or the organization total', scene(function (a, s) {
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      TAP.insights.reset();
      try {
        var all = TAP.insights.ranked({ mode: 'all' }, { reportId: 'ov-ambition' });
        a.ok(all.length > 0, 'the ambition chart has an insight in All regions');
        var who = all[0].regionIds[0], name = TAP.content.regionName(TAP.data.region(who));
        var other = TAP.data.regions().map(function (r) { return r.id; }).filter(function (id) { return all[0].regionIds.indexOf(id) < 0; })[0];
        var p = s.panel('ov-ambition'), take = function () { return txt(qs('.tap-panel__takeaway', p.el)); };
        a.ok(take().indexOf(name) >= 0, 'All regions: the insight leads');
        TAP.store.set({ cmp: { mode: 'org' } });
        a.equal(take().indexOf(name), -1, 'organization total: not named');
        TAP.store.set({ cmp: { mode: 'one', focus: other, restAs: 'combined' } });
        a.equal(take().indexOf(name), -1, 'one against the rest: not named when inside the rest');
        TAP.store.set({ cmp: { mode: 'one', focus: who } });
        a.ok(take().indexOf(name) >= 0, 'its own region in focus: it leads');
        TAP.store.set({ cmp: { mode: 'one', focus: other, restAs: 'individual' } });
        a.ok(take().indexOf(name) >= 0, 'the rest drawn one by one: it may lead');
        a.match(txt(qs('[data-action="insights"]', p.el)), /\d/, 'the list still counts it');
      } finally {
        TAP.data.load(T_FIXTURE('mini'));
        TAP.insights.reset();
      }
    }));

    T.test('X-panel-chart-size', 'A builder that places labels for the chart size gets that size, and again after a resize', scene(function (a, s) {
      s.report(fakeDef());
      FAKE = function () { return { sized: true }; };
      var p = s.panel('x-fake'), chart = qs('.tap-panel__chart', p.el);
      a.ok(chart && chart.clientWidth > 0, 'the chart has a size');
      a.deepEqual(last().size, { w: chart.clientWidth, h: chart.clientHeight }, 'the last build was given the real size');
      var n = calls.length;
      FAKE = null;
      p.refresh();
      a.equal(calls.length, n + 1, 'a builder that does not ask is built once per draw');
      FAKE = function () { return { sized: true }; };
      p.refresh();
      n = calls.length;
      window.dispatchEvent(new Event('resize'));
      a.equal(calls.length, n, 'a resize that leaves the chart the same size builds nothing');
      chart.style.width = '300px';
      window.dispatchEvent(new Event('resize'));
      a.ok(calls.length > n, 'a resize that changes the chart builds it again');
      a.equal(last().size.w, 300, 'with the new size');
    }));
    T.test('X-panel-height-hint', 'Polish (b): the chart is at least as tall as the builder asks', scene(function (a, s) {
      s.report(fakeDef());
      FAKE = function () { return { height: 900 }; };
      var p = s.panel('x-fake'), chart = qs('.tap-panel__chart', p.el);
      a.equal(chart.style.minHeight, '900px', 'minimum height from the hint');
      a.ok(chart.clientHeight >= 900, 'drawn that tall');
      FAKE = null;
      p.refresh();
      a.equal(qs('.tap-panel__chart', p.el).style.minHeight, '', 'no hint: the normal height');
      var grid = s.panel('ind-tiers');
      click(qs('[data-action="type"]', grid.el));
      click(qs('[data-type="bubbleGrid"]', grid.el));
      var g = qs('.tap-panel__chart', grid.el), rows = TAP.data.industries({ rated: true }).length;
      a.ok(g.clientHeight >= rows * TH.space[8], 'the bubble grid gets a row of room per industry (' + g.clientHeight + ' px)');
    }));

    T.test('X-panel-legend-keys', 'Polish (c), QA-4: keys without a colour, and numbered keys', scene(function (a, s) {
      s.report(fakeDef());
      FAKE = function () { return { legend: [{ label: 'A note', color: null, role: 'note' }, { label: 'Not provided', color: null, role: 'notProvided' },
        { label: 'Region A', color: TH.regions[0], role: 'region', mark: 1 }, { label: 'Region B', color: TH.focusGrey, role: 'muted', mark: 2 }] }; };
      var p = s.panel('x-fake'), items = qsa('.tap-panel__legend-item', p.el);
      a.equal(items.length, 4, 'four items');
      a.equal(getComputedStyle(qs('.tap-panel__key', items[0])).display, 'none', 'a note shows words only');
      var np = getComputedStyle(qs('.tap-panel__key', items[1]));
      a.equal(np.borderTopStyle, 'dashed', 'not provided is an outlined key');
      a.equal(np.backgroundColor, 'rgba(0, 0, 0, 0)', 'with no fill');
      a.equal(txt(items[2]), '1Region A', 'a numbered key reads its number before the name');
      a.ok(qs('.tap-panel__key--num', items[2]), 'drawn as a numbered disc');
      a.ok(qs('.tap-panel__key--light', items[3]), 'dark number on a light grey key');
    }));
    T.test('X-panel-ratings-height', 'QA-4b: the ratings dot plot in All regions keeps the normal chart height', scene(function (a, s) {
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      try {
        var p = s.panel('ind-ratings', { industryId: TAP.data.industries({ rated: true })[0].id }), chart = qs('.tap-panel__chart', p.el);
        a.equal(chart.style.minHeight, '', 'no minimum height from the builder');
        a.ok(chart.clientHeight <= TH.chartHeight.tall, 'at most the tall chart height (' + chart.clientHeight + ' px)');
      } finally { TAP.data.load(T_FIXTURE('mini')); }
    }));
  });
})(window.TAP);
