/*
 * File: tests/test-list.js
 * Purpose: Tests for list panels (US-2.7.2, panel part), value kinds on lists and tables (US-2.6.4) and drill-down
 *          (US-2.7.1). A small fake list builder stands in for the engine's, so the panel side is checked on its own.
 * Provides: test cases for the PANEL2 stream: TPV-TC-288, 290, 291, 292, X-list-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: PANEL2 stream
 */
(function (TAP) {
  'use strict';

  var calls = [];     // every ctx the fake list builder was given
  var ROWS = 6;       // rows the fake list draws

  function qs(sel, root) { return TAP.dom.qs(sel, root); }
  function qsa(sel, root) { return TAP.dom.qsa(sel, root); }
  function txt(node) { return node ? node.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function click(node) { node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
  function last() { return calls[calls.length - 1]; }
  function esc(s) { return TAP.dom.esc(s); }

  var COLS = [{ key: 'region', label: 'Region', unit: 'text', align: 'left', kind: null },
    { key: 'name', label: 'Account', unit: 'text', align: 'left', kind: 'IN' },
    { key: 'incr3', label: '3-year incremental ARR', unit: 'money', align: 'right', kind: 'DER' }];
  var REGIONS = ['alpha', 'bravo', 'charlie', 'delta'];

  // Rows as the list builder would give them: one per account, with a source naming the region file and row.
  function rowsOf(n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var r = REGIONS[i % 4], src = { regionId: r, section: 'customerGrowth', field: 'name', row: 10 + i, kind: 'IN' };
      out.push({ entityId: r + ':' + (10 + i), regionId: r, row: 10 + i, src: src, cells: {
        region: { v: 'Region ' + r, state: 'value', kind: null },
        name: { v: 'Account <' + i + '>', state: 'value', kind: 'IN', src: src },
        incr3: i === 1 ? { v: null, state: 'notProvided', kind: 'DER', src: src } : { v: 100 * (i + 1), state: 'value', kind: 'DER', src: src } } });
    }
    return out;
  }

  // The fake list builder: the HTML contract of ARCHITECTURE 17.4 (sort buttons, data-tap-row rows, filters).
  TAP.builders.register('x-fake-list', function (ctx) {
    calls.push(ctx);
    var sort = (ctx.opts && ctx.opts.sort) || 'incr3:desc', rows = rowsOf(ROWS);
    var head = COLS.map(function (c) {
      var next = sort === c.key + ':asc' ? 'desc' : 'asc';
      return '<th data-tap-col="' + c.key + '"><button type="button" class="x-sort" data-tap-opt="sort" data-tap-value="' +
        c.key + ':' + next + '">' + esc(c.label) + '</button></th>';
    }).join('');
    var body = rows.map(function (r) {
      return '<tr data-tap-region="' + r.regionId + '" data-tap-row="accounts:' + r.regionId + ':' + r.row + '">' + COLS.map(function (c) {
        return '<td>' + esc(TAP.format.cell(r.cells[c.key], { unit: c.unit, exact: true })) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return {
      option: null,
      html: '<table class="tap-list"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>' +
        '<button type="button" class="x-other" data-tap-opt="density" data-tap-value="compact">Compact</button>',
      table: { columns: COLS, rows: rows.map(function (r) { return { entityId: r.entityId, cells: r.cells, src: r.src }; }) },
      legend: [], sizeLegend: null, notes: [], missing: [], empty: false, error: null,
      controls: [{ key: 'filter:segment', label: 'Segment', kind: 'select', value: (ctx.opts && ctx.opts['filter:segment']) || 'all',
        options: [{ value: 'all', label: 'All' }, { value: 'strategic', label: 'Strategic' }] }],
      target: function (prm) {
        var d = (prm && prm.data) || {}, parts = String(d.row || '').split(':');
        if (!d.row) return null;
        return { reportId: ctx.def.id, regionIds: [parts[1]], items: [{ section: 'customerGrowth', regionId: parts[1], row: +parts[2] }] };
      }
    };
  });

  function listDef(extra) {
    return Object.assign({ id: 'x-list', view: 'customers', title: 'Which accounts carry the growth?',
      explain: { shows: 'List shows.', read: 'List read.', lookFor: 'List look.' },
      shape: 'list', builder: 'x-fake-list', defaultType: 'list', types: ['list'], rows: 'accounts',
      columns: [{ key: 'region' }, { key: 'name' }, { key: 'incr3' }], sort: { key: 'incr3', dir: 'desc' },
      filter: [{ key: 'segment' }], sources: ['IN', 'DER'], breakdowns: [], options: {} }, extra || {});
  }

  // Runs a test body with a panel helper, and always tidies up.
  function scene(fn) {
    return function (a) {
      var ids = [], panels = [];
      calls = [];
      ROWS = 6;
      var api = {
        panel: function (id, opts) { var p = TAP.panel.create(T.dom.mount(), id, opts); panels.push(p); return p; },
        report: function (def) { window.TAP_REPORTS[def.id] = def; ids.push(def.id); return def; }
      };
      function tidy() {
        panels.forEach(function (p) { try { p.destroy(); } catch (e) { /* already gone */ } });
        ids.forEach(function (id) { delete window.TAP_REPORTS[id]; });
        if (TAP.layers.top()) TAP.layers.close();
        TAP.storage.clear('chart:');
      }
      var out;
      try { out = fn(a, api); } catch (e) { tidy(); throw e; }
      if (out && typeof out.then === 'function') return out.then(function (v) { tidy(); return v; }, function (e) { tidy(); throw e; });
      tidy();
      return out;
    };
  }

  T.suite('list', function () {
    T.test('TPV-TC-292', 'A list report offers no chart type menu and no table switch', scene(function (a, s) {
      var def = s.report(listDef());
      a.deepEqual(TAP.panelMenus.types(def, 4, {}).list, [], 'no chart types to offer');
      a.equal(TAP.panelMenus.types(def, 4, {}).current, 'list', 'drawn as a list');
      var p = s.panel('x-list');
      a.equal(qs('[data-action="type"]', p.el), null, 'no chart type menu');
      a.equal(qs('[data-action="table"]', p.el), null, 'no table switch: the list is the table');
      a.ok(qs('[data-action="about"]', p.el), 'the explanation is still there');
      a.ok(qs('[data-action="more"]', p.el), 'and the More menu');
      a.equal(last().type, 'list', 'the builder is asked for a list');
      a.ok(qs('.tap-panel__html table.tap-list', p.el), 'the list is drawn');
    }));

    T.test('X-list-opt', 'A [data-tap-opt] click in builder HTML sets ctx.opts and rebuilds (sorting)', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list');
      a.deepEqual(last().opts, {}, 'starts with the default sort');
      var n = calls.length;
      click(qs('[data-tap-col="name"] [data-tap-opt]', p.el));
      a.ok(calls.length > n, 'rebuilt');
      a.equal(last().opts.sort, 'name:asc', 'ascending first');
      click(qs('[data-tap-col="name"] [data-tap-opt]', p.el));
      a.equal(last().opts.sort, 'name:desc', 'then descending');
      click(qs('.x-other', p.el));
      a.deepEqual(last().opts, { sort: 'name:desc', density: 'compact' }, 'generic: any key, not list-specific');
      TAP.store.set({ cmp: { mode: 'org' } });
      a.deepEqual(last().opts, {}, 'reset when the comparison changes');
    }));

    T.test('X-list-opt-focus', 'Keyboard focus stays on the same column heading after a sort', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list'), btn = qs('[data-tap-col="incr3"] [data-tap-opt]', p.el);
      btn.focus();
      click(btn);
      a.equal(document.activeElement && document.activeElement.getAttribute('data-tap-value'), 'incr3:desc', 'the new heading button has focus');
      a.ok(p.el.contains(document.activeElement), 'inside the panel');
    }));

    T.test('X-list-filter', 'A builder filter (key filter:<key>) is drawn as a select and reaches ctx.opts', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list'), sel = qs('select[data-control="filter:segment"]', p.el);
      a.ok(sel, 'filter drawn');
      a.equal(sel.options[0].textContent, 'All', 'All first');
      sel.value = 'strategic';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      a.equal(last().opts['filter:segment'], 'strategic');
      sel = qs('select[data-control="filter:segment"]', p.el);
      sel.value = 'all';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      a.equal(last().opts['filter:segment'], 'all', 'cleared');
    }));

    T.test('TPV-TC-288', 'A row click opens details for the builder\'s row target, not an industry selection', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list'), seen = [];
      TAP.bus.on('industry:select', function (x) { seen.push(x); });
      var tr = qsa('.tap-list tbody tr', p.el)[2];
      click(tr.children[1]);
      a.equal(TAP.layers.top(), 'details', 'details opened');
      var target = TAP.store.get().layer.payload.target;
      a.deepEqual(target.items, [{ section: 'customerGrowth', regionId: 'charlie', row: 12 }], 'that row only');
      a.deepEqual(target.regionIds, ['charlie']);
      a.equal(seen.length, 0, 'no industry event');
    }));

    T.test('TPV-TC-290', 'A long list scrolls inside the panel, the header row stays fixed and the text is 16 px', scene(function (a, s) {
      ROWS = 120;
      s.report(listDef());
      var p = s.panel('x-list'), box = qs('.tap-panel__html', p.el);
      a.equal(qsa('.tap-list tbody tr', p.el).length, 120, 'every row, no paging');
      a.ok(box.classList.contains('tap-panel__html--list'), 'marked as a list');
      a.ok(box.scrollHeight > box.clientHeight, 'scrolls inside its box');
      a.equal(getComputedStyle(box).overflowY, 'auto');
      a.ok(box.clientHeight <= window.TAP_THEME.chartHeight.normal + 4, 'no taller than a chart');
      a.equal(getComputedStyle(qs('.tap-list thead th', p.el)).position, 'sticky', 'header row stays put');
      a.equal(getComputedStyle(qs('.tap-list tbody td', p.el)).fontSize, '16px', 'body text 16 px');
      a.equal(getComputedStyle(qs('.tap-list thead [data-tap-opt]', p.el)).fontSize, '16px', 'headings 16 px');
    }));

    T.test('TPV-TC-291', 'Copy gives the list as tab-separated text with the source column and the data status label', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list'), res = TAP.builders.get('x-fake-list')(last());
      var want = TAP.panelTable.toText(res.table, { label: TAP.shell.label() }), lines = want.split('\n');
      a.equal(lines[0], TAP.shell.label().text, 'data label first');
      a.equal(lines[1].split('\t').slice(-1)[0], 'Source', 'source column');
      a.equal(lines.length, 2 + 6, 'one line per row');
      a.equal(lines[3].split('\t')[2], 'not provided', 'blank reads not provided');
      a.ok(lines[2].split('\t')[3].length > 0, 'each row names its source');
      var saved = TAP.panelTable.clipboard, got = null;
      TAP.panelTable.clipboard = function (x) { got = x; return Promise.resolve(true); };
      a.match(txt(qs('.tap-panel__table-head', p.el)), /6 rows/, 'row count over the list');
      click(qs('[data-action="copy-table"]', p.el));
      TAP.panelTable.clipboard = saved;
      return new Promise(function (done) { setTimeout(done, 0); }).then(function () {
        a.equal(got, want, 'the button copies the builder\'s table, in the order shown');
        a.match(txt(qs('.tap-panel__table-status', p.el)), /copied/i, 'says so');
      });
    }));

    T.test('X-list-image', 'Image export is not offered for a list (a list is not a chart picture)', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list');
      click(qs('[data-action="more"]', p.el));
      a.ok(qs('[data-action="save-image"]', p.el).disabled, 'save image off');
      a.ok(qs('[data-action="copy-image"]', p.el).disabled, 'copy image off');
    }));

    T.test('X-list-stale-table', 'A table choice left from an earlier report never hides a list', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list');
      TAP.store.set({ expanded: 'x-list' });
      a.ok(qs('.tap-panel__html table.tap-list', p.el), 'still a list when expanded');
      TAP.store.set({ expanded: null });
    }));
  });

  /* ---------- defaultBreakdown (#205): a report may open with a breakdown chosen ---------- */

  T.suite('list-breakdown', function () {
    function cmpDef(extra) {
      return Object.assign({ id: 'x-bd', view: 'customers', title: 'How fast do accounts grow?',
        explain: { shows: 'S.', read: 'R.', lookFor: 'L.' }, shape: 'compare', dimension: 'entity',
        measures: [{ id: 'nb.arr', label: 'ARR' }], defaultType: 'bar', types: ['bar', 'groupedBar', 'table'],
        breakdowns: ['year'], defaultBreakdown: 'year', sources: ['DER'], options: {} }, extra || {});
    }
    function pressed(p) { var b = qs('[data-control="breakdown"] [aria-pressed="true"]', p.el); return b && b.getAttribute('data-value'); }

    T.test('X-panel-default-breakdown', 'A report with defaultBreakdown opens with it chosen', scene(function (a, s) {
      s.report(cmpDef());
      var p = s.panel('x-bd');
      a.equal(pressed(p), 'year', 'year pressed');
      click(qs('[data-control="breakdown"] [data-value="none"]', p.el));
      a.equal(pressed(p), 'none', 'none can still be chosen');
      TAP.store.set({ cmp: { mode: 'org' } });
      a.equal(pressed(p), 'none', 'a choice made stays, as for any breakdown');
      TAP.bus.emit('charts:reset');
      a.equal(pressed(p), 'year', '"Reset all charts" returns to the default breakdown');
    }));

    T.test('X-panel-default-breakdown', 'A defaultBreakdown the report does not offer is ignored', scene(function (a, s) {
      s.report(cmpDef({ id: 'x-bd2', defaultBreakdown: 'industry' }));
      a.equal(pressed(s.panel('x-bd2')), 'none');
    }));
  });
})(window.TAP);
