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
  var NOCOL = false;  // true: headings without data-tap-col, so the panel finds them by their sort button

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
      return '<th' + (NOCOL ? '' : ' data-tap-col="' + c.key + '"') + '><button type="button" class="x-sort" data-tap-opt="sort" data-tap-value="' +
        c.key + ':' + next + '">' + esc(c.label) + '</button></th>';
    }).join('');
    var items = (ctx.highlight && ctx.highlight.items) || [];
    var body = rows.map(function (r) {
      var on = items.some(function (x) { return x.regionId === r.regionId && x.row === r.row; });
      return '<tr' + (on ? ' class="is-highlight"' : '') + ' data-tap-region="' + r.regionId + '" data-tap-row="accounts:' + r.regionId + ':' + r.row + '">' + COLS.map(function (c) {
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
      var ids = [], panels = [], offs = [];
      calls = [];
      ROWS = 6;
      NOCOL = false;
      var api = {
        panel: function (id, opts) { var p = TAP.panel.create(T.dom.mount(), id, opts); panels.push(p); return p; },
        report: function (def) { window.TAP_REPORTS[def.id] = def; ids.push(def.id); return def; },
        on: function (name, fn) { offs.push(TAP.bus.on(name, fn)); }
      };
      function tidy() {
        offs.forEach(function (off) { off(); });
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
      TAP.store.set({ cmp: { mode: 'one', focus: 'bravo' } });
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
      s.on('industry:select', function (x) { seen.push(x); });
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
      // Nearly a screen tall (about 8 rows at 1280 x 800, #194), never less than 360 px or more than 1200 px
      var want = Math.min(1200, Math.max(360, window.innerHeight - 64));
      a.ok(Math.abs(parseFloat(getComputedStyle(box).maxHeight) - want) < 2, 'box height follows the window: ' + want);
      a.ok(box.clientHeight <= window.innerHeight, 'never taller than the window');
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

    T.test('X-list-highlight', '"Show me" on a list scrolls the first highlighted row into view inside the list', scene(function (a, s) {
      ROWS = 120;
      s.report(listDef());
      var p = s.panel('x-list'), y = window.scrollY;
      TAP.store.set({ highlight: { reportId: 'x-list', regionIds: ['alpha'], items: [{ section: 'customerGrowth', regionId: 'alpha', row: 110 }] } });
      var box = qs('.tap-panel__html--list', p.el), tr = qs('tr.is-highlight', box);
      a.ok(tr, 'the builder marked the row');
      var top = box.getBoundingClientRect().top + qs('thead', box).offsetHeight, r = tr.getBoundingClientRect();
      a.ok(box.scrollTop > 0, 'the list scrolled');
      a.ok(r.top >= top - 1 && r.bottom <= box.getBoundingClientRect().bottom + 1, 'the row is in view, below the sticky header');
      a.equal(window.scrollY, y, 'the page itself did not move');
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
      TAP.store.set({ cmp: { mode: 'one', focus: 'bravo' } });
      a.equal(pressed(p), 'year', 'a change of comparison returns to the default breakdown');
      click(qs('[data-control="breakdown"] [data-value="none"]', p.el));
      TAP.bus.emit('charts:reset');
      a.equal(pressed(p), 'year', '"Reset all charts" returns to it too');
    }));

    T.test('X-panel-default-breakdown', 'Without defaultBreakdown a chosen breakdown stays across comparisons (Phase 1)', scene(function (a, s) {
      s.report(cmpDef({ id: 'x-bd3', defaultBreakdown: undefined }));
      var p = s.panel('x-bd3');
      a.equal(pressed(p), 'none', 'opens with none');
      click(qs('[data-control="breakdown"] [data-value="year"]', p.el));
      TAP.store.set({ cmp: { mode: 'one', focus: 'bravo' } });
      a.equal(pressed(p), 'year', 'kept');
    }));

    T.test('X-panel-default-breakdown', 'A defaultBreakdown the report does not offer is an error in its own panel', scene(function (a, s) {
      s.report(cmpDef({ id: 'x-bd2', defaultBreakdown: 'industry' }));
      a.match(txt(qs('.tap-panel__error', s.panel('x-bd2').el)), /defaultBreakdown/);
    }));

    // US-2.7.5 (#229): the breakdowns on offer follow the selected measure, through TAP.prepare.breakdowns.
    TAP.builders.register('x-fake-bd', function (ctx) {
      calls.push(ctx);
      return { option: { xAxis: { type: 'value' }, yAxis: { type: 'category', data: ['A'] }, series: [{ type: 'bar', data: [1] }] },
        table: { columns: [], rows: [] }, legend: [], notes: [], missing: [], empty: false, error: null, target: function () { return null; } };
    });
    function offered(p) { return qsa('[data-control="breakdown"] [data-value]', p.el).map(function (b) { return b.getAttribute('data-value'); }); }
    function withDims(fn) {
      return function (a, s) {
        var saved = TAP.prepare.breakdowns, asked = [];
        // A stand-in for ENGINE2's TAP.prepare.breakdowns: cg.arr lists only year in its dims
        TAP.prepare.breakdowns = function (def, o) {
          asked.push(o.measureId);
          var m = o.measureId || def.measures[0].id;
          return def.breakdowns.filter(function (x) { return m === 'nb.arr' || x === 'year'; });
        };
        try { return fn(a, s, asked); } finally { TAP.prepare.breakdowns = saved; }
      };
    }

    T.test('TPV-TC-311', 'Break down by offers only what the selected measure lists, and follows a measure switch', scene(withDims(function (a, s, asked) {
      s.report(cmpDef({ id: 'x-bd4', builder: 'x-fake-bd', breakdowns: ['year', 'industry'], defaultBreakdown: undefined,
        measures: [{ id: 'nb.arr', label: 'New' }, { id: 'cg.arr', label: 'Growth' }] }));
      var p = s.panel('x-bd4');
      a.deepEqual(offered(p), ['none', 'year', 'industry'], 'the first measure lists both');
      click(qs('[data-control="breakdown"] [data-value="industry"]', p.el));
      a.equal(last().breakdown, 'industry');
      click(qs('[data-control="measure"] [data-value="cg.arr"]', p.el));
      a.deepEqual(offered(p), ['none', 'year'], 'the second lists only year');
      a.equal(asked[asked.length - 1], 'cg.arr', 'asked for the selected measure');
      a.equal(pressed(p), 'none', 'a breakdown no longer offered is dropped');
      a.equal(last().breakdown, null, 'and the builder is not asked for it');
      click(qs('[data-control="measure"] [data-value="nb.arr"]', p.el));
      a.deepEqual(offered(p), ['none', 'year', 'industry'], 'options follow the measure back');
      a.equal(pressed(p), 'none', 'the dropped breakdown does not come back by itself');
    })));

    T.test('TPV-TC-311', 'A breakdown both measures list is kept across a measure switch', scene(withDims(function (a, s) {
      s.report(cmpDef({ id: 'x-bd5', builder: 'x-fake-bd', breakdowns: ['year', 'industry'], defaultBreakdown: undefined,
        measures: [{ id: 'nb.arr', label: 'New' }, { id: 'cg.arr', label: 'Growth' }] }));
      var p = s.panel('x-bd5');
      click(qs('[data-control="breakdown"] [data-value="year"]', p.el));
      click(qs('[data-control="measure"] [data-value="cg.arr"]', p.el));
      a.equal(pressed(p), 'year');
      a.equal(last().breakdown, 'year');
    })));

    T.test('X-panel-breakdown-labels', 'Every Phase 2 breakdown dimension has a label', function (a) {
      ['year', 'industry', 'channel', 'motion', 'segment', 'risk'].forEach(function (d) {
        a.ok(!/^\[/.test(TAP.content.text('panel.breakdowns.' + d)), d);
      });
    });
  });

  /* ---------- US-2.6.4: value kinds on every list and table (#227) ---------- */

  // A chart whose table mixes kinds in one column: a region's own figure (DER) and a combined one (APP).
  TAP.builders.register('x-fake-kinds', function (ctx) {
    var cols = [{ key: 'entity', label: 'Region', unit: 'text', align: 'left' }, { key: 'nb.arr', label: 'ARR', unit: 'money', align: 'right' },
      { key: 'acc', label: 'Target accounts', unit: 'count', align: 'right', kind: 'IN' }];
    if (ctx.opts.pre) cols.push({ key: 'base', label: 'Current ARR', unit: 'money', align: 'right' });
    function row(id, label, k) {
      return { entityId: id, src: null, cells: { entity: { v: label, state: 'value', kind: null }, 'nb.arr': { v: 10, state: 'value', kind: k },
        acc: { v: 3, state: 'value', kind: 'APP' }, base: { v: null, state: 'notProvided', kind: 'PRE' } } };
    }
    return { option: { xAxis: { type: 'value' }, yAxis: { type: 'category', data: ['A'] }, series: [{ type: 'bar', data: [1] }] },
      table: { columns: cols, rows: [row('alpha', 'Region A', 'DER'), row('rest', 'The rest', 'APP')] },
      legend: [], notes: [], missing: [], empty: false, error: null, target: function () { return null; } };
  });

  function kindDef(extra) {
    return Object.assign({ id: 'x-kinds', view: 'overview', title: 'How big is the plan?', explain: { shows: 'S.', read: 'R.', lookFor: 'L.' },
      shape: 'compare', builder: 'x-fake-kinds', dimension: 'entity', measures: [{ id: 'nb.arr', label: 'ARR' }],
      defaultType: 'bar', types: ['bar', 'table'], breakdowns: [], sources: ['DER'], options: {} }, extra || {});
  }
  function K(k) { return TAP.format.kind(k); }
  function headTo(root, key) { return qs('th[data-tap-col="' + key + '"]', root) || qs('[data-sort="' + key + '"]', root).closest('th'); }
  function kindsIn(th) { return qsa('.tap-kind', th).map(txt); }
  function showTable(p) { click(qs('[data-action="table"]', p.el)); return qs('.tap-panel__table', p.el); }

  T.suite('kinds', function () {
    T.test('TPV-TC-508', 'Table headings carry the glyph and word for the kinds of their cells', scene(function (a, s) {
      s.report(kindDef());
      var p = s.panel('x-kinds'), tbl = showTable(p);
      a.deepEqual(kindsIn(headTo(tbl, 'nb.arr')), [K('DER').text, K('APP').text], 'both kinds in the column, in a fixed order');
      a.deepEqual(kindsIn(headTo(tbl, 'acc')), [K('IN').text], 'a column that names its kind uses it');
      a.deepEqual(kindsIn(headTo(tbl, 'entity')), [], 'names carry no kind');
      a.deepEqual(kindsIn(headTo(tbl, '__source')), [], 'nor does the source column');
      a.match(K('APP').text, /calculated by this app/i, 'the word, not only the glyph');
    }));

    T.test('TPV-TC-508', 'A blank cell still tells the kind of its column', scene(function (a, s) {
      var box = T.dom.mount();
      TAP.panelTable.render(box, TAP.builders.get('x-fake-kinds')({ opts: { pre: true } }).table, {});
      a.deepEqual(kindsIn(headTo(box, 'base')), [K('PRE').text], 'system figure, though every value is not provided');
    }));

    T.test('TPV-TC-508', 'Every Phase 1 table carries kinds on its figure columns', scene(function (a, s) {
      ['ov-ambition', 'ind-tiers', 'ind-quad', 'ind-ratings'].forEach(function (id) {
        var p = s.panel(id), tbl = showTable(p), def = TAP.reports.get(id), c = TAP.store.get().cmp;
        // The builder's own table says which columns hold figures of a kind (a "No." index column holds none)
        var res = TAP.builders.get(def.builder || def.shape)({ def: def, type: def.defaultType, cmp: c, entities: TAP.scope.entities(c),
          year: null, industryId: TAP.data.industries({ rated: true })[0].id, highlight: null, expanded: false, theme: window.TAP_THEME, opts: {} });
        var figures = res.table.columns.filter(function (col) {
          return res.table.rows.some(function (r) { return r.cells[col.key] && r.cells[col.key].kind; });
        });
        a.ok(figures.length > 0, id + ': has figure columns');
        figures.forEach(function (col) { a.ok(kindsIn(headTo(tbl, col.key)).length > 0, id + ': ' + col.label + ' carries a kind'); });
      });
    }));

    T.test('TPV-TC-508', 'List headings carry the glyph and word from the builder\'s table columns', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list');
      a.deepEqual(kindsIn(qs('th[data-tap-col="name"]', p.el)), [], 'a name column carries no kind, even with one set');
      a.deepEqual(kindsIn(qs('th[data-tap-col="incr3"]', p.el)), [K('DER').text], 'calculated in the workbook');
      a.deepEqual(kindsIn(qs('th[data-tap-col="region"]', p.el)), [], 'names carry no kind');
      a.equal(txt(qs('th[data-tap-col="name"] [data-tap-opt]', p.el)), 'Account', 'the sort button keeps its own name');
      NOCOL = true;
      p.refresh();
      var th = qs('[data-tap-opt="sort"][data-tap-value^="incr3:"]', p.el).closest('th');
      a.deepEqual(kindsIn(th), [K('DER').text], 'found by the sort button when headings carry no data-tap-col');
      p.refresh();
      a.equal(qsa('.tap-kind', th.closest('table')).length, 1, 'drawn once per heading, never twice');
    }));

    T.test('TPV-TC-510', 'A one-line key to the glyphs sits under each list and table', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list'), key = qs('.tap-panel__kind-key', p.el), list = qs('.tap-panel__html--list', p.el);
      a.ok(key, 'key drawn');
      a.ok(list.compareDocumentPosition(key) & Node.DOCUMENT_POSITION_FOLLOWING, 'under the list');
      a.ok(!list.contains(key), 'outside the scrolling box, so it stays in view');
      a.deepEqual(kindsIn(key), [K('DER').text], 'the kinds the list shows, each once');
      a.ok(key.offsetHeight > 0 && key.offsetHeight < 60, 'visible, on one line');
      s.report(kindDef());
      var q = s.panel('x-kinds'), tbl = showTable(q), tkey = qs('.tap-panel__kind-key', q.el);
      a.ok(tkey && (tbl.compareDocumentPosition(tkey) & Node.DOCUMENT_POSITION_FOLLOWING), 'under the table too');
      a.deepEqual(kindsIn(tkey), [K('IN').text, K('DER').text, K('APP').text]);
    }));

    T.test('TPV-TC-509', 'Kinds in headings are plain text: visible without hovering, at a readable size', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list'), tag = qs('th[data-tap-col="incr3"] .tap-kind', p.el);
      a.ok(tag.offsetHeight > 0, 'shown');
      a.equal(tag.getAttribute('title'), null, 'not a tooltip');
      a.ok(parseFloat(getComputedStyle(tag).fontSize) >= 14, 'label size or larger');
    }));
  });

  /* ---------- follow-ups: measure switch on a compare bubble (#200), insight targets keep their fields (#220) ---------- */

  T.suite('panel-followups', function () {
    TAP.builders.register('x-fake-fu', function (ctx) {
      calls.push(ctx);
      return { option: { xAxis: { type: 'value' }, yAxis: { type: 'value' }, series: [{ type: 'scatter', data: [[1, 2]] }] },
        table: { columns: [], rows: [] }, legend: [], notes: [], missing: [], empty: false, error: null, target: function () { return null; } };
    });

    T.test('X-panel-measure-bubble', 'No measure switch on the bubble view of a compare report with x and y', scene(function (a, s) {
      s.report({ id: 'x-lev', view: 'newBusiness', title: 'Which levers carry the plan?', explain: { shows: 'S.', read: 'R.', lookFor: 'L.' },
        shape: 'compare', builder: 'x-fake-fu', dimension: 'entity', measures: [{ id: 'nb.arr', label: 'New' }, { id: 'cg.arr', label: 'Growth' }],
        x: 'nb.arr', y: 'cg.arr', size: { options: ['base.arr'], default: 'base.arr' },
        defaultType: 'bubble', types: ['bar', 'bubble', 'table'], breakdowns: [], sources: ['DER'], options: {} });
      var p = s.panel('x-lev');
      a.equal(last().type, 'bubble');
      a.equal(qs('[data-control="measure"]', p.el), null, 'the axes come from x and y: no switch');
      click(qs('[data-action="type"]', p.el));
      click(qs('[data-type="bar"]', p.el));
      a.ok(qs('[data-control="measure"]', p.el), 'the bar view keeps its measure switch');
    }));

    T.test('X-panel-insight-target', 'A panel "Show me" keeps the insight target\'s list rows and theme', function (a) {
      var ins = { regionIds: ['alpha'], industryIds: [], accountIds: [],
        highlight: { mark: 'row', items: [{ section: 'partners', regionId: 'alpha', row: 12 }], theme: 'skills' } };
      var tg = TAP.panelInsights.target(ins, 'pt-list');
      a.deepEqual(tg.items, [{ section: 'partners', regionId: 'alpha', row: 12 }], 'items');
      a.equal(tg.theme, 'skills', 'theme');
      a.equal(tg.reportId, 'pt-list');
      tg.items[0].row = 99;
      a.equal(ins.highlight.items[0].row, 12, 'a copy, so the insight is never changed');
      var plain = TAP.panelInsights.target({ regionIds: ['alpha'], highlight: { mark: 'bar' } }, 'x');
      a.ok(!('items' in plain) && !('theme' in plain), 'left out when the insight has none');
    });

    // #72: a theme clicked earlier must not hide the theme a "Show me" points at.
    TAP.builders.register('x-fake-theme', function (ctx) {
      calls.push(ctx);
      return { option: null, html: '<button type="button" data-tap-opt="theme" data-tap-value="pricing">Pricing</button>',
        table: { columns: [], rows: [] }, legend: [], notes: [], missing: [], empty: false, error: null, target: function () { return null; } };
    });
    T.test('X-panel-showme-theme', 'A "Show me" for the panel clears a theme chosen earlier, so its own theme shows', scene(function (a, s) {
      s.report({ id: 'x-themes', view: 'newBusiness', title: 'Which themes recur?', explain: { shows: 'S.', read: 'R.', lookFor: 'L.' },
        shape: 'compare', builder: 'x-fake-theme', dimension: 'entity', measures: [{ id: 'nb.arr', label: 'New' }],
        defaultType: 'bar', types: ['bar', 'table'], breakdowns: [], sources: ['DER'], options: {} });
      var p = s.panel('x-themes');
      click(qs('[data-tap-opt="theme"]', p.el));
      a.equal(last().opts.theme, 'pricing', 'the clicked theme is chosen');
      try {
        TAP.store.set({ highlight: { reportId: 'x-themes', theme: 'skills' } });
        a.ok(!('theme' in last().opts), 'the earlier choice is cleared');
        a.equal(last().highlight.theme, 'skills', 'the Show me theme reaches the builder');
      } finally { TAP.store.set({ highlight: null }); }
    }));
  });

  /* ---------- US-2.7.1: multi-level drill-down (#75) ---------- */

  // A chart builder for every drill level. A click's data becomes the target; `label` names a level below
  // industry (a sub-industry), as a builder may do.
  TAP.builders.register('x-fake-drill', function (ctx) {
    calls.push(ctx);
    return { option: { xAxis: { type: 'value' }, yAxis: { type: 'category', data: ['A'] },
      series: [{ type: 'bar', tapRole: 'value', data: [{ value: 5, raw: 5, key: 'nb.arr', entityId: 'alpha' }] }] },
      table: { columns: [{ key: 'entity', label: 'Region', unit: 'text', align: 'left' }], rows: [] },
      legend: [], notes: [], missing: [], empty: false, error: null,
      target: function (prm) {
        var d = (prm && prm.data) || {};
        return { reportId: ctx.def.id, regionIds: d.regionId ? [d.regionId] : [], industryIds: d.industryId ? [d.industryId] : [],
          label: d.label || undefined, mark: 'cell' };
      } };
  });

  function drillDef(id, extra) {
    return Object.assign({ id: id, view: 'newBusiness', title: 'Level ' + id + ': where does it come from?',
      explain: { shows: 'S.', read: 'R.', lookFor: 'L.' }, shape: 'compare', builder: 'x-fake-drill', dimension: 'entity',
      measures: [{ id: 'nb.arr', label: 'ARR' }], defaultType: 'bar', types: ['bar', 'dot', 'table'], breakdowns: [],
      sources: ['DER'], options: {} }, extra || {});
  }
  // Three levels: region and industry, then sub-industry, then rows.
  function levels(s) {
    s.report(drillDef('x-d1', { drill: { next: 'x-d2', label: 'Industry' } }));
    s.report(drillDef('x-d2', { drill: { next: 'x-d3', label: 'Sub-industry' } }));
    s.report(drillDef('x-d3'));
  }
  function chartOf(p) { var c = qs('.tap-panel__chart', p.el); return c ? window.echarts.getInstanceByDom(c) : null; }
  function hit(p, data) { chartOf(p).trigger('click', { data: data }); }
  function down2(p) {
    hit(p, { regionId: 'alpha', industryId: 'ind2' });
    hit(p, { regionId: 'alpha', industryId: 'ind2', label: 'Hospitals' });
  }
  function crumbs(p) { return qsa('.tap-panel__crumbs .tap-panel__crumb', p.el).map(txt); }
  function root() { return TAP.scope.sentence(TAP.store.get().cmp); }   // the top crumb says what is compared
  function key(name, target, alt) {
    var e = new KeyboardEvent('keydown', { key: name, altKey: !!alt, bubbles: true, cancelable: true });
    (target || document.body).dispatchEvent(e);
    return e;
  }

  T.suite('drill', function () {
    T.test('X-drill-api', 'TAP.panelDrill.create returns the promised handle', function (a) {
      a.ok(!TAP.panelDrill.__stub, 'built');
      var d = TAP.panelDrill.create({ id: 'x', root: document.createElement('section'), render: function () {}, st: {} });
      ['push', 'up', 'top', 'path', 'destroy'].forEach(function (f) { a.equal(typeof d[f], 'function', f); });
      d.destroy();
    });

    T.test('TPV-TC-271', 'Drill levels are read in their set order; an unknown level is an error in its own panel only', scene(function (a, s) {
      levels(s);
      a.deepEqual(TAP.panelDrill.levels(TAP.reports.get('x-d1')).ids, ['x-d1', 'x-d2', 'x-d3'], 'in order');
      a.deepEqual(TAP.panelDrill.levels(TAP.reports.get('x-d3')).ids, ['x-d3'], 'no drill: one level');
      s.report(drillDef('x-bad', { drill: { next: 'x-nope', label: 'Missing' } }));
      var bad = s.panel('x-bad'), good = s.panel('x-d1');
      a.match(txt(qs('.tap-panel__error', bad.el)), /x-nope/, 'names the unknown level');
      a.equal(qs('.tap-panel__error', good.el), null, 'the other panel is fine');
      s.report(drillDef('x-loop', { drill: { next: 'x-loop', label: 'Again' } }));
      a.ok(TAP.panelDrill.levels(TAP.reports.get('x-loop')).errors.length > 0, 'a level that leads back to itself is an error');
    }));

    // TC-272's figures come with NB's drill report; this is the panel part
    T.test('X-drill-next', 'A click on a mark opens the next level for that item in the same panel, with ctx.drill', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1'), target = { reportId: 'x-d1', regionIds: ['alpha'], industryIds: ['ind2'], label: undefined, mark: 'cell' };
      hit(p, { regionId: 'alpha', industryId: 'ind2' });
      a.equal(last().def.id, 'x-d2', 'the next level is built');
      a.deepEqual(last().drill, target, 'with the clicked target as ctx.drill');
      a.equal(TAP.layers.top(), null, 'no details panel');
      a.equal(txt(qs('.tap-panel__title', p.el)), 'Level x-d2: where does it come from?', 'its own title');
      a.equal(p.el.getAttribute('data-report'), 'x-d1', 'still the same panel');
      a.ok(chartOf(p), 'drawn as a chart');
    }));

    T.test('TPV-TC-274', 'Two levels down the breadcrumb reads the comparison › industry › sub-industry, each step a level', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      a.equal(qs('.tap-panel__crumbs', p.el), null, 'no breadcrumb at the top level');
      down2(p);
      a.deepEqual(crumbs(p), [root(), 'Education', 'Hospitals']);
      var steps = qsa('.tap-panel__crumbs button', p.el);
      a.deepEqual(steps.map(function (b) { return b.getAttribute('data-drill-level'); }), ['0', '1'], 'buttons back to levels 0 and 1');
      a.equal(qs('.tap-panel__crumbs [aria-current]', p.el) && txt(qs('.tap-panel__crumbs [aria-current]', p.el)), 'Hospitals', 'the current level is marked, not a button');
      a.ok(qs('.tap-panel__crumbs', p.el).closest('.tap-panel__head'), 'in the panel header');
    }));

    T.test('X-drill-hint', 'A level that drills further says so under its title; the last level does not', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      a.match(txt(qs('.tap-panel__drill-hint', p.el)), /step down to industry/, 'names the next level');
      down2(p);
      a.equal(qs('.tap-panel__drill-hint', p.el), null, 'none at the last level');
      a.match(txt(qs('.tap-panel__crumbs', p.el)), /Backspace/, 'the breadcrumb says how to go back up');
      a.equal(qs('.tap-panel__drill-hint', s.panel('x-d3').el), null, 'none on a report without drill');
    }));

    T.test('TPV-TC-275','Each breadcrumb step returns the panel to that level', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      down2(p);
      click(qs('[data-drill-level="1"]', p.el));
      a.equal(last().def.id, 'x-d2', 'back to level 1');
      a.deepEqual(crumbs(p), [root(), 'Education']);
      a.deepEqual(last().drill.industryIds, ['ind2'], 'still for the item chosen there');
      click(qs('[data-drill-level="0"]', p.el));
      a.equal(last().def.id, 'x-d1', 'back to the top');
      a.equal(last().drill, null, 'no drill context at the top');
      a.equal(qs('.tap-panel__crumbs', p.el), null, 'breadcrumb gone');
    }));

    T.test('TPV-TC-276', 'Backspace and Alt + Left go up one level while the panel has focus, not otherwise', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      down2(p);
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      key('Backspace');
      a.equal(last().def.id, 'x-d3', 'focus outside the panel: unchanged');
      qs('[data-action="about"]', p.el).focus();
      var e = key('Backspace', document.activeElement);
      a.equal(last().def.id, 'x-d2', 'Backspace: up one');
      a.ok(e.defaultPrevented, 'handled');
      a.ok(p.el.contains(document.activeElement), 'focus stays in the panel');
      e = key('ArrowLeft', document.activeElement, true);
      a.equal(last().def.id, 'x-d1', 'Alt + Left: up one');
      a.ok(e.defaultPrevented, 'the browser does not go back a page');
      e = key('Backspace', document.activeElement);
      a.equal(last().def.id, 'x-d1', 'at the top nothing happens');
      a.ok(!e.defaultPrevented, 'and the key is left alone');
    }));

    T.test('TPV-TC-276', 'Clicking a mark puts focus in the panel, so Backspace works after a mouse drill', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      qs('.tap-panel__chart', p.el).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      hit(p, { regionId: 'alpha', industryId: 'ind2' });
      a.ok(p.el.contains(document.activeElement), 'the panel has focus');
      key('Backspace', document.activeElement);
      a.equal(last().def.id, 'x-d1');
    }));

    T.test('TPV-TC-277', 'Each level keeps the chart type menu and the table view, with its own choice', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      click(qs('[data-action="type"]', p.el));
      click(qs('[data-type="dot"]', p.el));
      hit(p, { regionId: 'alpha', industryId: 'ind2' });
      a.ok(qs('[data-action="type"]', p.el), 'type menu at level 1');
      a.ok(qs('[data-action="table"]', p.el), 'table at level 1');
      a.deepEqual(TAP.panelMenus.types(TAP.reports.get('x-d2'), 4, {}).list, ['bar', 'dot'], 'the child\'s own types');
      a.equal(last().type, 'bar', 'the level opens on its own default');
      click(qs('[data-action="table"]', p.el));
      a.ok(qs('.tap-panel__table', p.el), 'table view at level 1');
      click(qs('[data-drill-level="0"]', p.el));
      a.equal(last().type, 'dot', 'the top level keeps its own type');
      a.equal(qs('.tap-panel__table', p.el), null, 'and its own chart view');
    }));

    // TC-278's figures come with NB's drill report; this is the panel part
    T.test('X-drill-cmp', 'The comparison still applies one level down', scene(function (a, s) {
      levels(s);
      TAP.store.set({ cmp: { mode: 'one', focus: 'charlie' } });
      var p = s.panel('x-d1');
      hit(p, { regionId: 'charlie', industryId: 'ind1' });
      a.equal(last().def.id, 'x-d2');
      a.equal(last().cmp.mode, 'one');
      a.equal(last().cmp.focus, 'charlie');
      a.deepEqual(last().entities.map(function (e) { return e.id; }), TAP.scope.entities(TAP.store.get().cmp).map(function (e) { return e.id; }));
      a.deepEqual(last().entities.map(function (e) { return e.id; }), ['charlie', 'rest'], 'focus then the rest');
    }));

    T.test('TPV-TC-279', 'A change of comparison or view returns the panel to its top level', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      down2(p);
      TAP.store.set({ cmp: { mode: 'one', focus: 'bravo' } });
      a.equal(last().def.id, 'x-d1', 'comparison changed: top');
      a.equal(qs('.tap-panel__crumbs', p.el), null);
      down2(p);
      TAP.store.set({ view: 'industry' });
      TAP.store.set({ view: 'overview' });
      a.equal(last().def.id, 'x-d1', 'view left and back: top');
    }));

    T.test('X-drill-custom', 'A change of the panel\'s own comparison also returns it to the top level', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      down2(p);
      click(qs('[data-action="more"]', p.el));
      click(qs('[data-action="compare"]', p.el));
      var sel = qs('select[data-control="cmp-mode"]', p.el);
      sel.value = 'one';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      a.equal(last().def.id, 'x-d1');
      a.equal(last().cmp.mode, 'one', 'with the panel\'s own comparison');
    }));

    T.test('TPV-TC-280', 'Without drill levels a click opens details, as in Phase 1', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d3');
      hit(p, { regionId: 'alpha', industryId: 'ind2' });
      a.equal(TAP.layers.top(), 'details', 'details opened');
      a.equal(last().def.id, 'x-d3', 'no level change');
      TAP.layers.close();
      var q = s.panel('x-d1'), seen = [], off = TAP.bus.on('industry:select', function (x) { seen.push(x); });
      hit(q, { industryId: 'ind4' });
      off();
      a.equal(last().def.id, 'x-d1', 'a target naming no region does not drill');
      a.deepEqual(seen, [{ industryId: 'ind4' }], 'it follows the Phase 1 rule instead');
    }));

    T.test('X-drill-showme', '"Show me" for the panel\'s report returns it to the top level first', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      down2(p);
      TAP.store.set({ highlight: { reportId: 'x-d1', regionIds: ['alpha'], mark: 'bar' } });
      a.equal(last().def.id, 'x-d1');
      a.deepEqual(last().highlight.regionIds, ['alpha'], 'with the highlight');
    }));

    T.test('X-drill-focus', 'After a keyboard step the focus is on the last breadcrumb button, or the title at the top', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      down2(p);
      qs('[data-action="about"]', p.el).focus();
      key('Backspace', document.activeElement);
      a.equal(document.activeElement, qs('.tap-panel__crumbs [data-drill-level="0"]', p.el), 'the last crumb button');
      key('ArrowLeft', document.activeElement, true);
      a.equal(last().def.id, 'x-d1');
      a.equal(document.activeElement, qs('.tap-panel__title', p.el), 'the title at the top level');
      a.equal(getComputedStyle(qs('.tap-panel__title', p.el)).outlineStyle, 'none', 'the title draws no ring');
      a.ok(document.activeElement !== p.el, 'never the whole panel, so no ring wraps it');
    }));

    T.test('X-drill-typing', 'Backspace and Alt + Left are left alone while typing, in a field or editable text', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      down2(p);
      var ed = document.createElement('div');
      ed.contentEditable = 'true';
      p.el.appendChild(ed);
      ed.focus();
      var e = key('Backspace', ed);
      a.ok(!e.defaultPrevented && last().def.id === 'x-d3', 'Backspace in editable text');
      e = key('ArrowLeft', ed, true);
      a.ok(!e.defaultPrevented && last().def.id === 'x-d3', 'Alt + Left in editable text');
      var inp = document.createElement('input');
      p.el.appendChild(inp);
      inp.focus();
      e = key('ArrowLeft', inp, true);
      a.ok(!e.defaultPrevented && last().def.id === 'x-d3', 'Alt + Left in a field');
    }));

    T.test('X-drill-keys-off', 'TAP.panelDrill.keys(false) turns off the drill keys and the panel\'s own Esc (D70)', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      down2(p);
      try {
        TAP.panelDrill.keys(false);
        a.equal(TAP.panelKeys.enabled, false, 'one shared switch');
        qs('[data-action="about"]', p.el).focus();
        var e = key('Backspace', document.activeElement);
        a.ok(!e.defaultPrevented && last().def.id === 'x-d3', 'no drill step');
        click(qs('[data-action="more"]', p.el));
        a.ok(qs('.tap-panel__pop', p.el), 'a popover is open');
        e = key('Escape');
        a.ok(!e.defaultPrevented && qs('.tap-panel__pop', p.el), 'Esc leaves the popover to the new owner');
        click(qs('[data-action="more"]', p.el));
        p.expand(true);
        e = key('Escape');
        a.ok(!e.defaultPrevented && TAP.store.get().expanded === 'x-d1', 'Esc leaves the expanded chart open');
        TAP.panelDrill.keys(true);
        e = key('Escape');
        a.equal(TAP.store.get().expanded, null, 'back on: Esc closes it');
      } finally { TAP.panelDrill.keys(true); TAP.store.set({ expanded: null }); }
    }));

    T.test('X-drill-insights', 'While drilled the insights are the current level\'s, and selecting one stays on that level', scene(function (a, s) {
      levels(s);
      var saved = TAP.insights, asked = [];
      var ins = { id: 'r:d3', ruleId: 'r', family: 'priorities', sentence: 'Level three observation.', figures: [], description: '',
        regionIds: ['alpha'], industryIds: [], accountIds: [], significance: 1, reportId: 'x-d3', highlight: { mark: 'bar' }, label: 'L' };
      TAP.insights = { ranked: function (cmp, o) { asked.push(o.reportId); return o.reportId === 'x-d3' ? [ins] : []; },
        top: function (cmp, id) { asked.push(id); return id === 'x-d3' ? [ins] : []; }, hide: function () {} };
      try {
        var p = s.panel('x-d1');
        down2(p);
        a.equal(asked[asked.length - 1], 'x-d3', 'asked for the current level');
        click(qs('[data-action="insights"]', p.el));
        click(qs('[data-action="select-insight"]', p.el));
        a.equal(last().def.id, 'x-d3', 'still on the same level');
        a.equal(last().highlight && last().highlight.reportId, 'x-d3', 'the highlight names that level');
      } finally { TAP.insights = saved; }
    }));

    T.test('X-drill-merge', 'A deeper level keeps the regions and industries chosen above it', scene(function (a, s) {
      levels(s);
      var p = s.panel('x-d1');
      hit(p, { regionId: 'alpha', industryId: 'ind2' });
      hit(p, { label: 'Hospitals' });
      a.equal(last().def.id, 'x-d3', 'a sub-industry click with no region still drills, inside the region above');
      a.deepEqual(last().drill.regionIds, ['alpha'], 'region kept');
      a.deepEqual(last().drill.industryIds, ['ind2'], 'industry kept');
      a.equal(last().drill.label, 'Hospitals');
    }));

    T.test('X-drill-hint-list', 'The hint on a list level says to pick a row of the list', function (a) {
      var d = TAP.panelDrill.create({ id: 'x', root: document.createElement('section'), render: function () {}, st: {} });
      window.TAP_REPORTS['x-hl2'] = { id: 'x-hl2', title: 'Rows' };
      try {
        a.match(txt(d.hint({ shape: 'list', drill: { next: 'x-hl2', label: 'Accounts' } })), /list/, 'a list');
        a.match(txt(d.hint({ shape: 'compare', drill: { next: 'x-hl2', label: 'Accounts' } })), /chart/, 'a chart');
      } finally { delete window.TAP_REPORTS['x-hl2']; d.destroy(); }
    });
  });

  T.suite('list-reveal', function () {
    T.test('X-list-reveal-visible', 'A highlighted row already in view does not scroll the list', scene(function (a, s) {
      ROWS = 120;
      s.report(listDef());
      var p = s.panel('x-list');
      TAP.store.set({ highlight: { reportId: 'x-list', regionIds: ['charlie'], items: [{ section: 'customerGrowth', regionId: 'charlie', row: 12 }] } });
      try {
        var box = qs('.tap-panel__html--list', p.el);
        a.ok(qs('tr.is-highlight', box), 'the builder marked the row');
        a.equal(box.scrollTop, 0, 'the third row is in view: no scroll');
      } finally { TAP.store.set({ highlight: null }); }
    }));
  });

  /* ---------- identity columns carry no kind (#227) ---------- */

  T.suite('kinds-identity', function () {
    T.test('X-kinds-identity', 'Region, name, industry, sub-industry, market and channel columns show no kind, even when set', function (a) {
      var ids = ['region', 'name', 'industry', 'subVertical', 'market', 'channel'];
      var cols = ids.map(function (k) { return { key: k, label: k, unit: 'text', align: 'left', kind: 'PRE' }; })
        .concat([{ key: 'currentArr', label: 'Current ARR', unit: 'money', align: 'right', kind: 'PRE' }]);
      var cells = {};
      ids.forEach(function (k) { cells[k] = { v: 'x', state: 'value', kind: 'PRE' }; });
      cells.currentArr = { v: 10, state: 'value', kind: 'PRE' };
      var box = T.dom.mount();
      TAP.panelTable.render(box, { columns: cols, rows: [{ entityId: 'alpha:1', src: null, cells: cells }] }, {});
      ids.forEach(function (k) { a.equal(qsa('.tap-kind', qs('[data-sort="' + k + '"]', box).closest('th')).length, 0, k); });
      a.equal(qsa('.tap-kind', qs('[data-sort="currentArr"]', box).closest('th')).length, 1, 'a figure column keeps its kind');
    });
  });

  /* ---------- list height on a shared screen (#194) ---------- */

  T.suite('list-height', function () {
    T.test('X-list-height', 'List rows are compact and an expanded list fills the window under its strip', scene(function (a, s) {
      ROWS = 120;
      s.report(listDef());
      var p = s.panel('x-list'), td = qs('.tap-list tbody td', p.el);
      a.ok(parseFloat(getComputedStyle(td).paddingTop) <= 6, 'compact cell padding');
      a.equal(getComputedStyle(td).fontSize, '16px', 'still 16 px text');
      try {
        p.expand(true);
        var box = qs('.tap-panel__html--list', p.el), want = Math.max(260, window.innerHeight - 120);
        a.ok(Math.abs(parseFloat(getComputedStyle(box).maxHeight) - want) < 2, 'expanded: the window less the strip');
      } finally { TAP.store.set({ expanded: null }); }
    }));
  });

  /* ---------- US-2.7.1: drilled figures on the real reports, mini fixture (TPV-TC-272, TPV-TC-278; #371) ---------- */

  // Hand-worked from tests/fixtures/mini-data.js, newBusiness rows (arrPotential is by plan year 1, 2, 3):
  //   Region A row 20  Healthcare  Clinics    500 + 550 + 605    = 1655
  //   Region B row 20  Healthcare  Hospitals  1000 + 1200 + 1200 = 3400   (target accounts 40)
  //   Region C row 20  Healthcare  Labs       arrPotential blank       -> not provided
  //   Region D         no Healthcare row                                -> not provided
  // Healthcare for "the rest" of Region A, as an average: only Region B gives a figure, so 3400 / 1 = 3400,
  // with Regions C and D named as not provided. Drilling that cell lists the rest's Healthcare rows: B 20, C 20.
  T.suite('drill-figures', function () {
    var HC = { alpha: 1655, bravo: 3400 };
    function grid(cmp) {
      var def = TAP.reports.get('nb-industries'), ents = TAP.scope.entities(cmp);
      return TAP.builders.get(def.builder)({ def: def, type: def.defaultType, cmp: cmp, entities: ents, opts: {}, theme: window.TAP_THEME, highlight: null });
    }
    function cellOf(res, entityId) {
      var row = res.table.rows.filter(function (r) { return r.entityId === entityId && r.cells.industry && /Healthcare/.test(String(r.cells.industry.v)); })[0];
      return row ? row.cells['ind.nb.arr'] : null;
    }
    // The panel at its top level, a click on one grid cell, then what the level below lists.
    function drill(fn) {
      var p = TAP.panel.create(T.dom.mount(), 'nb-industries', {});
      try {
        fn(p, function (region, industry) {
          var c = qs('[data-tap-region="' + region + '"][data-tap-industry="' + industry + '"]', p.el);
          if (c) c.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return qsa('tr[data-tap-row]', p.el).map(function (tr) { return tr.getAttribute('data-tap-row'); });
        });
      } finally { p.destroy(); }
    }
    function arr3(rowKey) {
      var parts = rowKey.split(':'), item = TAP.rows.list('newBusiness', [parts[1]]).filter(function (x) { return String(x.sourceRow) === parts[2]; })[0];
      return item ? TAP.rows.cell('newBusiness', 'arr3', item) : null;
    }

    T.test('TPV-TC-272', 'One region and industry: the level below lists that item only, with the hand-worked figures', function (a) {
      var res = grid(TAP.store.get().cmp);
      a.equal((cellOf(res, 'bravo') || {}).v, HC.bravo, 'the grid cell: Region B Healthcare 1000 + 1200 + 1200 = 3400');
      drill(function (p, click) {
        var rows = click('bravo', 'ind1');
        a.equal(p.el.getAttribute('data-report'), 'nb-industries', 'still the same panel');
        a.ok(qs('.tap-panel__crumbs', p.el), 'one level down');
        a.deepEqual(rows, ['newBusiness:bravo:20'], 'only Region B\'s Healthcare row');
        a.equal((arr3(rows[0]) || {}).v, HC.bravo, 'its 3-year ARR potential is 3400');
        var tr = qs('tr[data-tap-row]', p.el);
        a.match(txt(tr), /Hospitals/, 'the Hospitals sub-industry');
        a.match(txt(tr), /South/, 'in the South market');
      });
    });

    T.test('TPV-TC-278', 'One vs the rest: the entities follow the scope and the rest\'s drilled figures are the hand-worked ones', function (a) {
      TAP.store.set({ cmp: { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' } });
      var res = grid(TAP.store.get().cmp), rest = cellOf(res, 'rest');
      a.deepEqual(TAP.scope.entities(TAP.store.get().cmp).map(function (e) { return e.id; }), ['alpha', 'rest'], 'Region A and the rest');
      a.equal((cellOf(res, 'alpha') || {}).v, HC.alpha, 'Region A Healthcare 500 + 550 + 605 = 1655');
      a.equal((rest || {}).v, HC.bravo, 'the rest, as an average: 3400 / 1 region giving a figure');
      a.deepEqual(((rest || {}).src || {}).excluded, ['charlie', 'delta'], 'Regions C and D not provided');
      drill(function (p, click) {
        var rows = click('rest', 'ind1');
        a.deepEqual(rows, ['newBusiness:bravo:20', 'newBusiness:charlie:20'], 'the rest\'s Healthcare rows, Region B then C, none of Region A');
        a.equal((arr3(rows[0]) || {}).v, HC.bravo, 'Region B 3400');
        a.equal((arr3(rows[1]) || {}).state, 'notProvided', 'Region C not provided');
      });
      drill(function (p, click) {
        a.deepEqual(click('alpha', 'ind1'), ['newBusiness:alpha:20'], 'the focus cell: Region A\'s row only');
      });
    });
  });
})(window.TAP);
