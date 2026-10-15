/*
 * File: js/ui/import-report.js
 * Purpose: Draws the import report: the summary, each region's file, parts, errors, and its notes grouped by kind as tables
 *          (US-1.8.9, D163, D164), then the contract check (its errors as the invalid screen's table, its warnings grouped by
 *          workbook and kind, US-1.8.8); docs/ARCHITECTURE.md section 20. Modelled on the data sources panel
 *          (js/ui/sources-panel.js). Every word comes from content/text-import.js and, for the groups, content/text-data.js.
 * Provides: TAP.importReport (render)
 * Depends on: js/core/dom.js, js/core/content.js, js/core/format.js, js/core/icons.js, js/ui/warning-groups.js, js/ui/warning-table.js
 * Used by: js/ui/import-panel.js
 * Owner: UI stream (#587)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var t = function (key, vars) { return TAP.content.text('importPanel.report.' + key, vars); };

  function str(v) {
    if (v == null) return '';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }

  // "1. Market Coverage › D12", leaving out a part that is missing.
  function where(sheet, cell) {
    return [sheet, cell].filter(function (x) { return x != null && x !== ''; }).join(' › ');
  }

  // A part of the workbook by its label; an extra section's id stands as it is.
  function partLabel(key) {
    var s = TAP.content.text('importPanel.parts.' + key);
    return s.charAt(0) === '[' ? key : s;
  }

  // One error or note: an icon, the message, then where it was found. Whitespace between the spans keeps the
  // copied text readable.
  function line(icon, item) {
    var place = where(item.sheet, item.cell);
    return el('li', null, [
      TAP.icons.svg(icon, { size: 18 }),
      el('span', null, item.message),
      place ? ' ' : null,
      place ? el('span', { class: 'tap-muted' }, place) : null
    ]);
  }

  function facts(rows) {
    var dl = el('dl', { class: 'tap-imp__facts' });
    rows.forEach(function (r) { TAP.dom.append(dl, [el('dt', null, r[0]), el('dd', null, r[1])]); });
    return dl;
  }

  // "{k} of {n} workbooks imported, 1 left out, 2 mapped regions without a workbook"
  function summary(result) {
    var regions = result.regions || [], ok = regions.filter(function (r) { return r.ok; }).length;
    var out = regions.length - ok, miss = (result.missing || []).length;
    var parts = [t('summary', { k: ok, n: regions.length })];
    if (out) parts.push(out === 1 ? t('leftOutOne') : t('leftOutMany', { m: out }));
    if (miss) parts.push(miss === 1 ? t('missingOne') : t('missingMany', { p: miss }));
    return el('h3', { class: 'tap-imp__h', tabindex: '-1' }, parts.join(', '));
  }

  function missing(list) {
    if (!list || !list.length) return null;
    return el('p', { class: 'tap-imp__missing tap-muted' }, t('missingList', { names: TAP.format.list(list.map(function (m) { return m.name || m.id; })) }));
  }

  function mapProblems(list) {
    if (!list || !list.length) return null;
    return el('section', { class: 'tap-imp__mapsection' }, [
      el('h4', null, t('mapProblems')),
      el('ul', null, list.map(function (s) { return el('li', null, s); }))
    ]);
  }

  // One region's reading: the name (and "left out" when it failed), the facts, its errors as a short list (they say why
  // the region was left out), then its notes grouped by kind, each group a table (D163, D164).
  function region(r, result) {
    var src = (r.region && r.region.source) || {}, parts = r.parts || {}, W = TAP.warningGroups;
    var read = Object.keys(parts).filter(function (k) { return parts[k] === 'read'; }).map(partLabel);
    var errors = r.errors || [], notes = r.notes || [], lookups = result.plan ? result.plan.lookups : null;
    return el('section', { class: 'tap-imp__region', 'data-region': r.id }, [
      el('h4', null, [r.name || r.fileName, r.ok ? null : el('span', { class: 'tap-badge' }, t('leftOut'))]),
      facts([
        [t('file'), r.fileName || ''],
        [t('saved'), TAP.format.date(src.fileModified, { time: true })],
        [t('parts'), read.length ? read.join(', ') : t('partsNone')],
        [t('notes'), String(notes.length)]
      ]),
      errors.length ? el('ul', { class: 'tap-imp__errors', 'aria-label': t('errorsTitle') }, errors.map(function (e) { return line('warning', e); })) : null,
      notes.length ? el('div', { class: 'tap-imp__notes', role: 'group', 'aria-label': t('notesTitle') }, W.renderKinds(W.fromImport(notes, r.name), { lookups: lookups })) : null
    ]);
  }

  /* ---------- the contract check (TAP.check.run on the built plan) ---------- */

  // Region and item ("Region C · Retail"), as the invalid screen writes it.
  function regionOf(e) { return [e.region, e.item].filter(function (x) { return x != null && x !== ''; }).join(' · '); }

  function table(errors) {
    var cols = ['colNumber', 'colRegion', 'colWhere', 'colExpected', 'colFound'];
    return el('table', { class: 'tap-table tap-imp__table' }, [
      el('thead', null, el('tr', null, cols.map(function (c) { return el('th', { scope: 'col' }, t(c)); }))),
      el('tbody', null, errors.map(function (e, i) {
        var detailed = !!(e.path || e.expected);
        return el('tr', null, [el('td', { class: 'num' }, String(i + 1))].concat(detailed ? [
          el('td', null, regionOf(e)),
          el('td', { class: 'tap-imp__path' }, str(e.path)),
          el('td', null, str(e.expected)),
          el('td', null, str(e.found))
        ] : [el('td', { colspan: '4' }, str(e.message))]));
      }))
    ]);
  }

  // The warnings grouped by workbook, then kind, in plain words (US-1.8.8); the files by the regions' names, the ids
  // labelled with the imported plan's lookups
  function warnings(list, result) {
    var files = {};
    (result.regions || []).forEach(function (r) { if (r.name) files[r.name] = r.fileName || null; });
    return TAP.warningGroups.render(list, { files: files, lookups: result.plan ? result.plan.lookups : null });
  }

  function check(c, result) {
    if (!c) return [];
    var errors = c.errors || [], warns = c.warnings || [];
    return [
      errors.length ? el('section', { class: 'tap-imp__check tap-imp__check-errors' }, [el('h4', null, t('checkErrors')), table(errors)]) : null,
      warns.length ? el('section', { class: 'tap-imp__check tap-imp__check-warnings' }, [el('h4', null, t('checkWarnings')), warnings(warns, result)]) : null
    ];
  }

  function render(host, result) {
    result = result || {};
    TAP.dom.clear(host);
    TAP.dom.append(host, [summary(result), missing(result.missing), mapProblems(result.mapProblems)]);
    (result.regions || []).forEach(function (r) { host.appendChild(region(r, result)); });
    TAP.dom.append(host, check(result.check, result));
    return host;
  }

  TAP.importReport = { render: render };
})(window.TAP);
