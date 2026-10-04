/*
 * File: js/panel/panel-table.js
 * Purpose: Draws the table view of any report (the builder's table, so it shows the same data as the chart),
 *          sortable, with exact figures, the focus row marked and a source column, and copies it as text that
 *          pastes into Excel as cells (US-1.2.4). A list report's HTML gets the same row count and copy button (US-2.7.2).
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

  function header(col, sort, onSort) {
    var on = sort && sort.key === col.key;
    return el('th', { class: col.align === 'right' ? 'num' : null, scope: 'col',
      'aria-sort': on ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none' },
      el('button', { type: 'button', class: 'tap-panel__sort', 'data-sort': col.key, onclick: function () { onSort(col.key); } },
        [col.label, el('span', { class: 'tap-panel__arrow', 'aria-hidden': 'true' }, on ? (sort.dir > 0 ? ' ▲' : ' ▼') : '')]));
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
      el('thead', null, el('tr', null, cols.map(function (c) { return header(c, opts.sort, opts.onSort); }))), tbody
    ])));
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
    return inner;
  }

  TAP.panelTable = { render: render, list: list, toText: toText, clipboard: clipboard };
})(window.TAP);
