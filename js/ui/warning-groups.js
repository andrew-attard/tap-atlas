/*
 * File: js/ui/warning-groups.js
 * Purpose: The contract check's warnings grouped by workbook (region and file), then by kind, as nested details in
 *          plain words (US-1.8.8, D161). The Import report and the data sources panel draw them with it; the copied
 *          report takes the same grouping and lines as text. Every word comes from content/text-data.js (check.plain,
 *          check.fields, check.groups).
 * Provides: TAP.warningGroups (render, groups, title, line, label)
 * Depends on: js/core/dom.js, js/core/content.js
 * Used by: js/ui/import-report.js, js/ui/sources-panel.js, js/import/import-write.js (all at call time)
 * Owner: WARN stream (#605)
 *
 * A warning is a check entry: {path, region, item, field, kind, expected, found, message}. The data path never
 * reaches the screen: a line names the row or cell in words (item), the field in words and the value found.
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function say(key, vars) { return TAP.content.text('check.' + key, vars); }
  // TAP.content.text gives "[key]" for a key with no wording
  function known(key) { return TAP.content.text('check.' + key).charAt(0) !== '['; }
  function hasPlain(kind) { return !!kind && known('plain.' + kind + '.title') && known('plain.' + kind + '.line'); }

  // A field in words: the key as written, else without its index (supportPct for supportPct[0]), else the key itself
  function fieldLabel(field) {
    if (field == null || field === '') return '';
    var bare = String(field).replace(/\[\d+\]$/, '');
    if (known('fields.' + field)) return say('fields.' + field);
    return known('fields.' + bare) ? say('fields.' + bare) : String(field);
  }

  // The value found, in words: a blank, nothing, or the value as it is (text unquoted)
  function foundText(w) {
    if (w.found === null) return say('plain.fallback.blank');
    if (w.found === undefined) return say('found.nothing');
    return typeof w.found === 'object' ? JSON.stringify(w.found) : String(w.found);
  }

  // The group title for a warning: its kind's plain title, else the expected sentence, else the message
  function title(w) {
    if (hasPlain(w.kind)) return say('plain.' + w.kind + '.title');
    return w.expected || w.message || '';
  }

  // A line whose row or field is unknown loses its empty lead-in (": ..." or ", ...") and any empty brackets
  function tidy(s) { return s.replace(/^[\s,:]+/, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim(); }

  // One warning in words
  function line(w) {
    var item = w.item == null ? '' : String(w.item), field = fieldLabel(w.field);
    var where = [item, field].filter(Boolean).join(', ');
    var vars = { item: item, field: field, where: where, found: foundText(w), expected: w.expected || '' };
    if (hasPlain(w.kind)) return tidy(say('plain.' + w.kind + '.line', vars));
    return tidy((where ? where + ': ' : '') + say('plain.fallback.found', vars));
  }

  // A workbook group's label: "Region A · Region A plan.xlsx", the region alone when its file is unknown
  function label(region, files) {
    if (region == null || region === '') return say('groups.wholeFile');
    var file = files && Object.prototype.hasOwnProperty.call(files, region) ? files[region] : null;
    return file ? say('groups.bookFile', { region: region, file: file }) : String(region);
  }

  // [{region, label, n, kinds: [{kind, title, items}]}]: regions in the order the warnings come, the warnings about the
  // whole file (no region) last; kinds in first-seen order. A warning without a kind groups with others of its sentence.
  function groups(warnings, files) {
    var out = [], by = Object.create(null), whole = null;
    function group(region) { return { region: region, label: label(region, files), n: 0, kinds: [], index: Object.create(null) }; }
    (warnings || []).forEach(function (w) {
      var region = w.region == null || w.region === '' ? null : String(w.region), g;
      if (region === null) g = whole = whole || group(null);
      else { g = by[region]; if (!g) { g = by[region] = group(region); out.push(g); } }
      var key = w.kind ? 'k:' + w.kind : 't:' + title(w), k = g.index[key];
      if (!k) { k = g.index[key] = { kind: w.kind || null, title: title(w), items: [] }; g.kinds.push(k); }
      k.items.push(w);
      g.n++;
    });
    if (whole) out.push(whole);
    out.forEach(function (g) { delete g.index; });
    return out;
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

  // The groups as nested details; null when there is nothing to show. opts.files maps a region name to its file name;
  // opts.openUpTo (default 3): a group with that many warnings or fewer starts open.
  function render(warnings, opts) {
    opts = opts || {};
    var list = groups(warnings, opts.files), upTo = opts.openUpTo == null ? 3 : opts.openUpTo;
    if (!list.length) return null;
    var root = el('div', { class: 'tap-wgs' });
    if (list.length > 1) root.appendChild(tools(root));
    list.forEach(function (g) {
      var book = el('details', { class: 'tap-wg', 'data-region': g.region || '', open: g.n <= upTo }, el('summary', null, heading(g)));
      g.kinds.forEach(function (k) {
        book.appendChild(el('details', { class: 'tap-wg__kind', 'data-kind': k.kind || '', open: k.items.length <= upTo }, [
          el('summary', null, say('groups.kind', { title: k.title, n: k.items.length })),
          el('ul', null, k.items.map(function (w) { return el('li', null, line(w)); }))
        ]));
      });
      root.appendChild(book);
    });
    return root;
  }

  TAP.warningGroups = { render: render, groups: groups, title: title, line: line, label: label };
})(window.TAP);
