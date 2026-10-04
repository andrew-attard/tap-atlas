/*
 * File: js/panel/panel-table.js
 * Purpose: Draws the table view of any report (the builder's table, so it shows the same data as the chart),
 *          sortable, with exact figures, the focus row marked and a source column, and copies it as text that
 *          pastes into Excel as cells (US-1.2.4). A list report's HTML gets the same row count and copy button (US-2.7.2).
 *          Headings of both carry the value kind glyph and word, with a one-line key underneath (US-2.6.4).
 * Provides: TAP.panelTable (render, list, toText, clipboard)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/content.js, js/core/format.js, js/core/sources.js,
 *             js/panel/panel-chart.js (html, at call time)
 * Used by: js/panel/panel.js
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }
  var SRC = '__source';

  function columns(table) { return table.columns.concat([{ key: SRC, label: t('source'), unit: 'text', align: 'left' }]); }

  function sourceText(src) {
    if (!src) return '';
    try { return TAP.sources.address(src).text || ''; } catch (e) { return ''; }
  }

  // Exact figures, "not provided" for blanks; category counts read as "Tier 1: 3, Tier 2: 1".
  function cellText(row, col) {
    if (col.key === SRC) return sourceText(row.src);
    var c = row.cells[col.key];
    if (c && c.state === 'value' && Array.isArray(c.v)) {
      return c.v.map(function (x) { return (x && x.value != null ? TAP.format.cell({ v: x.value, state: 'value' }, { unit: col.unit }) + ': ' + x.n : String(x)); }).join(', ');
    }
    return TAP.format.cell(c, { unit: col.unit, exact: true, field: col.field });
  }

  // What a column sorts by: the number itself, or the words; blanks have none and always go last.
  function sortValue(row, col) {
    if (col.key === SRC) return sourceText(row.src) || null;
    var c = row.cells[col.key];
    if (!c || c.state !== 'value' || c.v == null || Array.isArray(c.v)) return null;
    return c.v;
  }

  function sorted(table, sort) {
    var rows = table.rows.slice(), col = sort && columns(table).filter(function (x) { return x.key === sort.key; })[0];
    if (!col) return rows;
    return rows.sort(function (x, y) {
      var a = sortValue(x, col), b = sortValue(y, col);
      if (a == null || b == null) return a == null && b == null ? 0 : a == null ? 1 : -1;
      var d = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
      return d * sort.dir;
    });
  }

  function clean(s) { return String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' '); }

  // Tab-separated text: the data label, the headers (with Source), then one line per row, in the order shown.
  function toText(table, opts) {
    opts = opts || {};
    var cols = columns(table), lines = [];
    if (opts.label && opts.label.text) lines.push(clean(opts.label.text));
    lines.push(cols.map(function (c) { return clean(c.label); }).join('\t'));
    sorted(table, opts.sort).forEach(function (r) {
      lines.push(cols.map(function (c) { return clean(cellText(r, c)); }).join('\t'));
    });
    return lines.join('\n');
  }

  // Copies text. The clipboard API can be refused on file://, so the older copy command is tried next.
  // Resolves to true when the text reached the clipboard.
  function clipboard(text) {
    function fallback() {
      var ta = el('textarea', { class: 'tap-sr', 'aria-hidden': 'true' });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
    }
    return Promise.resolve(fallback());
  }

  /* ---------- value kinds (US-2.6.4) ---------- */

  var KINDS = ['IN', 'PRE', 'DER', 'APP'];

  // The kinds a column shows: the one it names, else those of its cells (blank cells count), in a fixed order.
  function kindsOf(table, col) {
    if (col.key === SRC) return [];
    if (col.kind) return [col.kind];
    var seen = {};
    table.rows.forEach(function (r) { var c = r.cells[col.key]; if (c && c.kind) seen[c.kind] = true; });
    return KINDS.filter(function (k) { return seen[k]; });
  }

  function kindTag(k) {
    var f = TAP.format.kind(k);
    return el('span', { class: 'tap-kind' }, [el('span', { class: 'tap-kind__glyph', 'aria-hidden': 'true' }, f.glyph), ' ', f.label]);
  }

  // The glyph and word under a heading's name; null for a column of names.
  function kindLine(kinds) { return kinds.length ? el('span', { class: 'tap-panel__colkind' }, kinds.map(kindTag)) : null; }

  // The one-line key under a list or table: every kind its columns show, each once. Null when there are none.
  function kindKey(table) {
    var all = {};
    table.columns.forEach(function (c) { kindsOf(table, c).forEach(function (k) { all[k] = true; }); });
    var list = KINDS.filter(function (k) { return all[k]; });
    return list.length ? el('p', { class: 'tap-panel__kind-key' }, [el('span', { class: 'tap-panel__kind-key-label' }, t('kindKey'))].concat(list.map(kindTag))) : null;
  }

  // Adds the kinds to a list's headings, found by data-tap-col or else by the column's sort button (17.4).
  function markHeadings(box, table) {
    TAP.dom.qsa('th', box).forEach(function (th) {
      var key = th.getAttribute('data-tap-col'), b = key ? null : TAP.dom.qs('[data-tap-opt="sort"]', th), v = b && b.getAttribute('data-tap-value');
      if (!key && v) key = v.slice(0, v.lastIndexOf(':') > 0 ? v.lastIndexOf(':') : v.length);
      var col = table.columns.filter(function (c) { return c.key === key; })[0], line = col && kindLine(kindsOf(table, col));
      if (line) th.appendChild(line);
    });
  }

  function header(table, col, sort, onSort) {
    var on = sort && sort.key === col.key;
    return el('th', { class: col.align === 'right' ? 'num' : null, scope: 'col',
      'aria-sort': on ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none' }, [
      el('button', { type: 'button', class: 'tap-panel__sort', 'data-sort': col.key, onclick: function () { onSort(col.key); } },
        [col.label, el('span', { class: 'tap-panel__arrow', 'aria-hidden': 'true' }, on ? (sort.dir > 0 ? ' ▲' : ' ▼') : '')]),
      kindLine(kindsOf(table, col))
    ]);
  }

  // The row count and the copy button over a table or a list, and the status line for the copy message.
  // The copied text is the builder's table in the order shown (opts.sort), with the data label first.
  function head(box, table, opts, countKey) {
    var status = el('p', { class: 'tap-panel__table-status', role: 'status' });
    var copy = el('button', { type: 'button', class: 'tap-btn tap-panel__tool', 'data-action': 'copy-table', onclick: function () {
      var text = toText(table, { label: opts.label, sort: opts.sort });
      TAP.panelTable.clipboard(text).then(function (ok) {
        TAP.dom.clear(status);
        TAP.dom.append(status, ok ? t('copied') : [t('copyManual'), manual(text)]);
      });
    } }, [TAP.icons.svg('copy', { size: 18 }), el('span', null, t('copy'))]);
    box.appendChild(el('div', { class: 'tap-panel__table-head' }, [
      el('span', { class: 'tap-muted' }, t(countKey || 'tableCount', { n: table.rows.length })), copy
    ]));
    box.appendChild(status);
  }

  /*
   * Draws the table into box. opts: {sort: {key, dir}, onSort(key), focusIds: [], label: {text}}
   */
  function render(box, table, opts) {
    opts = opts || {};
    var cols = columns(table), focus = opts.focusIds || [], rows = sorted(table, opts.sort);
    head(box, table, opts);
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var isFocus = focus.indexOf(r.entityId) >= 0;
      tbody.appendChild(el('tr', { class: isFocus ? 'is-focus' : null, 'data-entity': r.entityId }, cols.map(function (c, i) {
        return el('td', { class: (c.align === 'right' ? 'num' : '') + (c.key === SRC ? ' tap-panel__src' : '') || null }, [
          i === 0 && isFocus ? el('span', { class: 'tap-panel__focus-mark', title: t('focusRow') }, ['▸ ', el('span', { class: 'tap-sr' }, t('focusRow') + ': ')]) : null,
          cellText(r, c)
        ]);
      })));
    });
    box.appendChild(el('div', { class: 'tap-panel__tablewrap' }, el('table', { class: 'tap-table tap-panel__table' }, [
      el('thead', null, el('tr', null, cols.map(function (c) { return header(table, c, opts.sort, opts.onSort); }))), tbody
    ])));
    var key = kindKey(table);
    if (key) box.appendChild(key);
    return box;
  }

  // When copying is blocked: the text, selected, ready for Ctrl+C.
  function manual(text) {
    var ta = el('textarea', { class: 'tap-field tap-panel__manual', readonly: true, rows: '4' });
    ta.value = text;
    setTimeout(function () { ta.focus(); ta.select(); }, 0);
    return ta;
  }

  /*
   * A list report (US-2.7.2): the builder's HTML list under the row count and the copy button, which copies the
   * builder's table. The list scrolls inside the panel under its sticky header row (css/panel.css).
   * opts: {label, onPick(data), onOpt(key, value)}
   */
  function list(box, res, opts) {
    opts = opts || {};
    if (res.table) head(box, res.table, { label: opts.label }, 'listCount');
    var inner = TAP.panelChart.html(box, res.html, opts.onPick, opts.onOpt);
    inner.classList.add('tap-panel__html--list');
    if (res.table) {
      markHeadings(inner, res.table);
      var key = kindKey(res.table);
      if (key) box.appendChild(key);
    }
    reveal(inner);
    return inner;
  }

  // "Show me" on a list: the first highlighted row is scrolled into view inside the list, under its sticky
  // header, without moving the page.
  function reveal(inner) {
    var tr = TAP.dom.qs('tr.is-highlight', inner), th = TAP.dom.qs('thead', inner);
    if (!tr || !inner.isConnected) return;
    var gap = tr.getBoundingClientRect().top - inner.getBoundingClientRect().top - (th ? th.offsetHeight : 0);
    inner.scrollTop = Math.max(0, inner.scrollTop + gap);
  }

  TAP.panelTable = { render: render, list: list, toText: toText, clipboard: clipboard };
})(window.TAP);
