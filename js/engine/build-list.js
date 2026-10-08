/*
 * File: js/engine/build-list.js
 * Purpose: The list builder: one row per item with sortable columns, filters (a select, or a dropdown with counts, D134)
 *          and the comparison scope applied to rows (US-2.7.2).
 * Provides: builder 'list'
 * Depends on: js/engine/rows.js, js/engine/shapes.js, js/engine/scope.js, js/core/format.js, js/core/dom.js,
 *             js/core/content.js, js/core/store.js, js/ui/source-tip.js (the source column's data icon) (at call time)
 * Used by: js/panel/panel.js (through TAP.builders)
 * Owner: ENGINE2 stream (#194)
 */
(function (TAP) {
  'use strict';

  var NUMERIC = { money: true, pct: true, count: true, rating: true, score: true };
  function t(key, vars) { return TAP.content.text(key, vars); }
  function esc(s) { return TAP.dom.esc(s); }

  // The definition's columns with each one's unit and kind; an unknown key is left out and named in the notes.
  function columnsOf(def, notes) {
    var all = TAP.rows.columns(def.rows);
    return (def.columns || []).map(function (c) {
      var known = all.filter(function (x) { return x.key === c.key; })[0];
      // A column the file has no data for (a Phase 4 addition) is left out quietly; an unknown one is named
      if (!known) { if (!TAP.rows.optional(def.rows, c.key)) notes.push(t('rows.unknownColumn', { key: c.key })); return null; }
      var out = { key: c.key, label: c.label || known.label, unit: known.unit, kind: known.kind,
        align: NUMERIC[known.unit] ? 'right' : 'left' };
      if (known.decimals != null) out.decimals = known.decimals;
      return out;
    }).filter(Boolean);
  }

  // The sort in use: the clicked heading ("incr3:desc"), else the definition's sort (one or a list of them).
  function sortsOf(def, opts) {
    var m = /^([^:]+):(asc|desc)$/.exec((opts && opts.sort) || '');
    if (m) return [{ key: m[1], dir: m[2] }];
    return [].concat(def.sort || []).filter(function (s) { return s && s.key; });
  }
  function natural(col) { return NUMERIC[col.unit] ? 'desc' : 'asc'; }

  // Blanks and not-applicable cells go last whichever way the column is sorted.
  function compare(x, y, dir) {
    // A cell with a rank (partner maturity) sorts by it, so levels follow the lookup's order, not the alphabet
    var a = x && x.state === 'value' ? (x.rank != null ? x.rank : x.v) : null, b = y && y.state === 'value' ? (y.rank != null ? y.rank : y.v) : null;
    if (a == null || b == null) return a == null && b == null ? 0 : a == null ? 1 : -1;
    var d = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
    return dir === 'desc' ? -d : d;
  }

  function sourceText(entry) {
    var reg = TAP.data.region(entry.regionId) || {}, file = (reg.source || {}).fileName || TAP.content.regionName(reg);
    var n = entry.sourceRow;   // a row with no usable row number names its file only
    return typeof n === 'number' && n % 1 === 0 ? t('rows.source', { file: file, row: n }) : file;
  }

  function build(ctx) {
    var k = TAP.shapes.kit, def = ctx.def, opts = ctx.opts || {}, notes = [];
    var cmp = ctx.cmp || TAP.store.get().cmp, scopeIds = TAP.scope.regionIds(cmp), source = def.rows;
    var cols = columnsOf(def, notes), entries = TAP.rows.list(source, scopeIds);
    var missing = scopeIds.filter(function (r) { return !entries.some(function (e) { return e.regionId === r; }); });

    // Drill context (17.6): only the regions and industries of the mark clicked a level above
    var drill = ctx.drill || null;
    if (drill) {
      entries = entries.filter(function (e) {
        var rs = drill.regionIds || [], is = drill.industryIds || [];
        // Partners have no industry, so only the regions apply to them
        return (!rs.length || rs.indexOf(e.regionId) >= 0) && (!is.length || source === 'partners' || is.indexOf(e.item.industryId) >= 0) &&
          (drill.solution == null || source !== 'newBusiness' || TAP.measures.kit4.valueOf('solutions', e.item.solution) === drill.solution);   // a solution's rows (US-4.4.1)
      });
    }
    var rows = entries.map(function (e) {
      var cells = {};
      cols.forEach(function (c) { cells[c.key] = TAP.rows.cell(source, c.key, e); });
      return { entry: e, cells: cells, memo: Object.assign({}, cells) };
    });
    // Each row's cell for a key, worked out once ("also" columns scan every region)
    function cellOf(r, key) { return r.memo[key] || (r.memo[key] = TAP.rows.cell(source, key, r.entry)); }

    // A row passes a filter when its value is the one picked, or one of those ticked in a dropdown (D134); 'all' or
    // nothing ticked passes every row
    function passes(r, c) {
      var want = c.value === 'all' ? [] : [].concat(c.value);
      if (!want.length) return true;
      var x = cellOf(r, c.field);
      return x.state === 'value' && want.indexOf(String(x.v)) >= 0;
    }
    var controls = (def.filter || []).map(function (f) { return filterControl(source, f, rows, opts, cols, cellOf); });
    // A dropdown counts, for each option, the rows it would list within the other filters
    controls.forEach(function (c, i) {
      if (c.kind !== 'multi') return;
      var others = rows.filter(function (r) { return controls.every(function (o, j) { return j === i || passes(r, o); }); });
      c.options.forEach(function (o) { o.count = others.filter(function (r) { return passes(r, { field: c.field, value: [o.value] }); }).length; });
    });
    rows = rows.filter(function (r) { return controls.every(function (c) { return passes(r, c); }); });

    var sorts = sortsOf(def, opts), focus = cmp.mode === 'one' || cmp.mode === 'pair' ? cmp.focus : null;
    rows = rows.map(function (r, i) { return { r: r, i: i }; }).sort(function (x, y) {
      var fx = x.r.entry.regionId === focus ? 0 : 1, fy = y.r.entry.regionId === focus ? 0 : 1;
      if (fx !== fy) return fx - fy;
      for (var s = 0; s < sorts.length; s++) {
        var d = compare(cellOf(x.r, sorts[s].key), cellOf(y.r, sorts[s].key), sorts[s].dir);
        if (d) return d;
      }
      return x.i - y.i;
    }).map(function (x) { return x.r; });

    var table = { columns: cols.map(function (c) { return Object.assign({}, c); }),
      rows: rows.map(function (r) {
        var e = r.entry;
        return { id: e.id, entityId: e.regionId, regionId: e.regionId, sourceRow: e.sourceRow, cells: r.cells,
          src: TAP.rows.rowSrc(source, e.regionId, e.sourceRow) };
      }) };
    var res = k.result(def, null, { table: table, notes: notes, controls: controls,
      html: html(def, cols, rows, sorts[0] || null, ctx.highlight) });
    res.missing = missing.map(function (r) { return TAP.content.regionName(TAP.data.region(r)); });
    res.empty = !entries.length;
    res.target = targetFn(def);
    return res;
  }

  // One select per filter, "All" first, then the values found in scope, in alphabetical order. With f.multi, a dropdown
  // of checkboxes instead (kind 'multi', TAP.multiSelect, D134): its value is the values ticked, none meaning all.
  function filterControl(source, f, rows, opts, cols, cellOf) {
    var unit = (TAP.rows.columns(source).filter(function (c) { return c.key === f.key; })[0] || {}).unit, seen = {};
    rows.forEach(function (r) {
      var c = cellOf(r, f.key);
      if (c.state === 'value') seen[String(c.v)] = TAP.format.cell(c, { unit: unit });
    });
    var options = Object.keys(seen).map(function (v) { return { value: v, label: seen[v] }; })
      .sort(function (a, b) { return a.label.localeCompare(b.label); });
    var want = opts['filter:' + f.key], has = function (v) { return options.some(function (o) { return o.value === v; }); };
    var col = cols.filter(function (c) { return c.key === f.key; })[0];
    var out = { key: 'filter:' + f.key, field: f.key, label: f.label || (col ? col.label : t('rows.' + source + '.' + f.key)), kind: 'select',
      value: has(want) ? want : 'all', options: [{ value: 'all', label: t('rows.all') }].concat(options) };
    // A single value kept from before the dropdown still counts as ticked
    if (f.multi) Object.assign(out, { kind: 'multi', value: [].concat(want == null ? [] : want).filter(has), options: options });
    return out;
  }

  // The table: a sort button per heading carrying the direction the next click gives, one row per item.
  function html(def, cols, rows, active, highlight) {
    var items = (highlight && highlight.items) || [], section = TAP.rows.section(def.rows);
    var head = cols.map(function (c) {
      var on = active && active.key === c.key, next = on ? (active.dir === 'asc' ? 'desc' : 'asc') : natural(c);
      return '<th data-tap-col="' + esc(c.key) + '" aria-sort="' + (on ? (active.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '"' +
        (c.align === 'right' ? ' class="tap-list__num"' : '') + '><button type="button" class="tap-list__sort" data-tap-opt="sort" data-tap-value="' +
        esc(c.key + ':' + next) + '">' + esc(c.label) + (on ? ' <span class="tap-list__dir">' + esc(t('rows.sorted.' + active.dir)) + '</span>' : '') +
        '</button></th>';
    }).join('') + '<th data-tap-col="source">' + esc(t('rows.sourceHeading')) + '</th>';
    var body = rows.map(function (r) {
      var e = r.entry, hl = items.some(function (x) { return x.section === section && x.regionId === e.regionId && String(x.row) === String(e.key); });
      return '<tr data-tap-region="' + esc(e.regionId) + '" data-tap-row="' + esc(e.source + ':' + e.regionId + ':' + e.key) + '"' +
        (hl ? ' class="is-highlight is-hl"' : '') + '>' + cols.map(function (c) {
          return '<td data-tap-col="' + esc(c.key) + '"' + (c.align === 'right' ? ' class="tap-list__num"' : '') + '>' +
            esc(TAP.format.cell(r.cells[c.key], { unit: c.unit, decimals: c.decimals, exact: true })) + '</td>';
        }).join('') + '<td data-tap-col="source" class="tap-list__src">' +   // the file and row behind the data icon (D100)
        TAP.sourceTip.html(null, null, { where: sourceText(e), label: cols[0] ? TAP.format.cell(r.cells[cols[0].key], { unit: cols[0].unit }) : '' }) + '</td></tr>';
    }).join('');
    return '<table class="tap-list"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  // A row click ({row: "<source>:<regionId>:<key>"}) opens that row's details. The key is the row number, or
  // "p<position>" for a row whose number is missing or repeated (TAP.rows.list).
  function targetFn(def) {
    return function (params) {
      var d = (params && params.data) || {}, m = /^(extra:[^:]+|[^:]+):(.+):(\d+|p\d+)$/.exec(d.row || '');   // an extra section's source keeps its own colon
      if (!m) return null;
      var source = m[1], regionId = m[2];
      var e = TAP.rows.list(source, [regionId]).filter(function (x) { return String(x.key) === m[3]; })[0];
      if (!e) return null;
      return { reportId: def.id, regionIds: [regionId], industryIds: e.item.industryId ? [e.item.industryId] : [],
        accountIds: source === 'accounts' && e.item.id ? [e.item.id] : [], mark: 'row',
        items: [{ section: TAP.rows.section(source), regionId: regionId, row: e.key }] };
    };
  }

  TAP.builders.register('list', TAP.shapes.kit.safely(build));
})(window.TAP);
