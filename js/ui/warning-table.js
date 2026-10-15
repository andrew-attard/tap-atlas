/*
 * File: js/ui/warning-table.js
 * Purpose: Draws the warning and note groups (US-1.8.8, US-1.8.9, D161, D164): one details per workbook, one per kind
 *          inside, the kind's one-sentence intro, then a table of where (the row or item, the sheet and cell under it),
 *          found and expected, with only the columns the group fills. The Import report and the data sources panel draw
 *          the contract warnings with render and a region's import notes with renderKinds. Every word comes from
 *          content/text-data.js (check.groups); the items from js/ui/warning-groups.js.
 * Provides: TAP.warningTable (render, renderKinds, table)
 * Depends on: js/core/dom.js, js/core/content.js, js/ui/warning-groups.js (normalize, groups, kindGroups)
 * Used by: js/ui/warning-groups.js (render, renderKinds), js/ui/import-report.js, js/ui/sources-panel.js
 * Owner: NOTES2 stream (#612)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function say(key, vars) { return TAP.content.text('check.' + key, vars); }
  var HEAD = { where: 'colWhere', found: 'colFound', expected: 'colExpected' };

  // The Where cell: the row or item in words, the sheet and cell on a muted line under it
  function whereCell(it, hasCell) {
    return el('td', { class: 'tap-wg__where' }, [
      it.where ? el('span', null, it.where) : null,
      hasCell && it.cell ? el('span', { class: 'tap-wg__cell tap-muted' }, it.cell) : null
    ]);
  }

  // The items of one kind group as a table, with the columns the group fills (g.cols) and headed by the group's title
  function table(g) {
    return el('table', { class: 'tap-table tap-wg__table', 'aria-label': g.title }, [
      el('thead', null, el('tr', null, g.cols.map(function (c) { return el('th', { scope: 'col' }, say('groups.' + HEAD[c])); }))),
      el('tbody', null, g.items.map(function (it) {
        return el('tr', null, g.cols.map(function (c) { return c === 'where' ? whereCell(it, g.hasCell) : el('td', null, it[c] || ''); }));
      }))
    ]);
  }

  // One kind group: the title with its count, the intro once, then the table; open with upTo items or fewer
  function kind(g, upTo) {
    return el('details', { class: 'tap-wg__kind', 'data-kind': g.kind || '', open: g.items.length <= upTo }, [
      el('summary', null, say('groups.kind', { title: g.title, n: g.items.length })),
      g.intro ? el('p', { class: 'tap-wg__intro' }, g.intro) : null,
      table(g)
    ]);
  }

  function heading(g) { return g.n === 1 ? say('groups.bookOne', { label: g.label }) : say('groups.book', { label: g.label, n: g.n }); }

  // Expand all and Collapse all, for more than one workbook group
  function tools(root) {
    function setAll(open) { TAP.dom.qsa('details', root).forEach(function (d) { d.open = open; }); }
    return el('div', { class: 'tap-wg__tools' }, [
      el('button', { type: 'button', class: 'tap-btn', 'data-action': 'expand', onclick: function () { setAll(true); } }, say('groups.expand')),
      el('button', { type: 'button', class: 'tap-btn', 'data-action': 'collapse', onclick: function () { setAll(false); } }, say('groups.collapse'))
    ]);
  }

  function upTo(opts) { return opts.openUpTo == null ? 3 : opts.openUpTo; }

  // The groups as nested details (workbook, then kind); null when there is nothing to show. opts.files maps a region name
  // to its file name; opts.openUpTo (default 3): a group with that many items or fewer starts open; opts.lookups labels ids.
  function render(items, opts) {
    opts = opts || {};
    var list = TAP.warningGroups.groups(items, opts.files, opts), n = upTo(opts);
    if (!list.length) return null;
    var root = el('div', { class: 'tap-wgs' });
    if (list.length > 1) root.appendChild(tools(root));
    list.forEach(function (g) {
      var book = el('details', { class: 'tap-wg', 'data-region': g.region || '', open: g.n <= n }, el('summary', null, heading(g)));
      g.kinds.forEach(function (k) { book.appendChild(kind(k, n)); });
      root.appendChild(book);
    });
    return root;
  }

  // The kind groups alone, for use under a region's own heading; null when there is nothing to show
  function renderKinds(items, opts) {
    opts = opts || {};
    var W = TAP.warningGroups, list = W.kindGroups(W.normalize(items, opts)), n = upTo(opts);
    if (!list.length) return null;
    return el('div', { class: 'tap-wgs tap-wgs--kinds' }, list.map(function (g) { return kind(g, n); }));
  }

  TAP.warningTable = { render: render, renderKinds: renderKinds, table: table };
})(window.TAP);
