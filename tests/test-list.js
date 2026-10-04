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
      TAP.store.set({ cmp: { mode: 'org' } });
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
      TAP.store.set({ cmp: { mode: 'org' } });
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
      a.deepEqual(kindsIn(qs('th[data-tap-col="name"]', p.el)), [K('IN').text], 'leader input');
      a.deepEqual(kindsIn(qs('th[data-tap-col="incr3"]', p.el)), [K('DER').text], 'calculated in the workbook');
      a.deepEqual(kindsIn(qs('th[data-tap-col="region"]', p.el)), [], 'names carry no kind');
      a.equal(txt(qs('th[data-tap-col="name"] [data-tap-opt]', p.el)), 'Account', 'the sort button keeps its own name');
      NOCOL = true;
      p.refresh();
      var th = qs('[data-tap-opt="sort"][data-tap-value^="incr3:"]', p.el).closest('th');
      a.deepEqual(kindsIn(th), [K('DER').text], 'found by the sort button when headings carry no data-tap-col');
      p.refresh();
      a.equal(qsa('.tap-kind', th.closest('table')).length, 2, 'drawn once per heading, never twice');
    }));

    T.test('TPV-TC-510', 'A one-line key to the glyphs sits under each list and table', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list'), key = qs('.tap-panel__kind-key', p.el), list = qs('.tap-panel__html--list', p.el);
      a.ok(key, 'key drawn');
      a.ok(list.compareDocumentPosition(key) & Node.DOCUMENT_POSITION_FOLLOWING, 'under the list');
      a.ok(!list.contains(key), 'outside the scrolling box, so it stays in view');
      a.deepEqual(kindsIn(key), [K('IN').text, K('DER').text], 'the kinds the list shows, each once');
      a.ok(key.offsetHeight > 0 && key.offsetHeight < 60, 'visible, on one line');
      s.report(kindDef());
      var q = s.panel('x-kinds'), tbl = showTable(q), tkey = qs('.tap-panel__kind-key', q.el);
      a.ok(tkey && (tbl.compareDocumentPosition(tkey) & Node.DOCUMENT_POSITION_FOLLOWING), 'under the table too');
      a.deepEqual(kindsIn(tkey), [K('IN').text, K('DER').text, K('APP').text]);
    }));

    T.test('TPV-TC-509', 'Kinds in headings are plain text: visible without hovering, at a readable size', scene(function (a, s) {
      s.report(listDef());
      var p = s.panel('x-list'), tag = qs('th[data-tap-col="name"] .tap-kind', p.el);
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
})(window.TAP);
