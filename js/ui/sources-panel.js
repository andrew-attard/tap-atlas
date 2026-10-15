/*
 * File: js/ui/sources-panel.js
 * Purpose: The data sources panel body: per region the file, its saved date, the import date and the import notes grouped
 *          by kind as tables (US-1.8.9, D163, D164); whether import dates differ; the reports for workbook owners
 *          (US-1.8.11); then other notes worth checking (the contract check's warnings grouped by workbook and kind,
 *          US-1.8.8, a warning the import already noted folded into the note and counted in the heading, US-1.8.10, D165),
 *          insight rules that were skipped and running order steps that were left out (US-3.1.1). Import notes appear here
 *          and nowhere else (US-1.1.5).
 * Provides: TAP.sourcesPanel (render, ownerRegions)
 * Depends on: js/core/sources.js (imports, datesDiffer, dataDate), js/core/store.js (TAP.notes), js/core/data.js,
 *             js/core/dom.js, js/core/format.js, js/core/content.js, js/core/icons.js, js/engine/scope.js (colorOf),
 *             js/ui/warning-groups.js, js/ui/warning-table.js, js/ui/owner-report-ui.js, js/insights/engine.js (failures)
 * Used by: js/ui/layers.js (the 'sources' side panel)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var t = function (key, vars) { return TAP.content.text(key, vars); };

  // "Region C plan.xlsx › 3. Customer Growth › A10", leaving out parts that are missing.
  function where(file, sheet, cell) {
    return [file, sheet, cell].filter(function (x) { return x != null && x !== ''; }).join(' › ');
  }

  function note(message, place) {
    return el('li', { class: 'tap-src__note' }, [
      el('span', null, message),
      place ? el('span', { class: 'tap-src__where' }, place) : null
    ]);
  }

  function facts(rows) {
    var dl = el('dl', { class: 'tap-src__facts' });
    rows.forEach(function (r) { TAP.dom.append(dl, [el('dt', null, r[0]), el('dd', null, r[1])]); });
    return dl;
  }

  // One region: its facts, then its import notes by kind (a note without a kind, from an older file, groups by its message)
  function region(imp) {
    var notes = imp.notes || [], W = TAP.warningGroups;
    return el('section', { class: 'tap-src__region', 'data-region': imp.regionId }, [
      el('h3', { class: 'tap-src__name' }, [el('span', { class: 'tap-swatch', style: 'background:' + TAP.scope.colorOf(imp.regionId) }), imp.name]),
      facts([
        [t('sourcesPanel.file'), imp.fileName || t('states.notProvided')],
        [t('sourcesPanel.fileDate'), TAP.format.date(imp.fileModified)],
        [t('sourcesPanel.imported'), TAP.format.date(imp.importedAt, { time: true })]
      ]),
      notes.length
        ? el('div', { class: 'tap-src__box' }, [el('h4', null, t('sourcesPanel.notes')), W.renderKinds(W.fromImport(notes, imp.name))])
        : el('p', { class: 'tap-src__none' }, t('sourcesPanel.noNotes'))
    ]);
  }

  // The check's warnings (the data notes with a kind) with those the import already noted folded away (US-1.8.10, D165).
  // The check names a region as the file writes it (region.name), which the organization layer may shorten elsewhere, so
  // the saved notes are keyed by that name too.
  function foldedChecks() {
    var notes = {};
    TAP.data.regions().forEach(function (r) { if (r.name) notes[r.name] = (r.source && r.source.notes) || []; });
    return TAP.warningGroups.fold(notes, TAP.notes.list('data').filter(function (n) { return !!n.kind; }));
  }

  // Notes from the app itself: the contract check's warnings grouped by workbook and kind (US-1.8.8), then the rest
  // (colours, the organization file, data notes without a kind), placed by region if given.
  function otherNotes(imports) {
    var list = TAP.notes.list().filter(function (n) { return n.source !== 'presentation'; });   // listed on their own
    if (!list.length) return null;
    var f = foldedChecks(), checks = f.warnings;
    var rest = list.filter(function (n) { return !(n.source === 'data' && n.kind); });
    var files = {}, byName = {};
    imports.forEach(function (i) { files[i.regionId] = i.fileName; });
    TAP.data.regions().forEach(function (r) { if (r.name) byName[r.name] = r.source && r.source.fileName ? r.source.fileName : null; });
    if (!checks.length && !rest.length && !f.folded) return null;
    return el('section', { class: 'tap-src__notes' }, [
      el('h3', null, [t('sourcesPanel.other'), f.folded ? el('span', { class: 'tap-wg__folded' }, t('importPanel.report.checkFolded', { n: f.folded })) : null]),
      checks.length ? TAP.warningGroups.render(checks, { files: byName }) : null,
      rest.length ? el('ul', null, rest.map(function (n) {
        var place = n.sheet || n.cell ? where(files[n.regionId], n.sheet, n.cell) : (n.regionId ? files[n.regionId] : '');
        return note(n.message, place);
      })) : null
    ]);
  }

  // One entry per region for the owners' reports (US-1.8.11): its facts and items, the saved import notes and the check's
  // unmatched warnings about it
  function ownerRegions(imports) {
    var W = TAP.warningGroups, unmatched = foldedChecks().warnings, names = {};
    TAP.data.regions().forEach(function (r) { names[r.id] = r.name; });
    return imports.map(function (imp) {
      var mine = unmatched.filter(function (w) { return w.region != null && String(w.region) === String(names[imp.regionId]); });
      return { name: imp.name, fileName: imp.fileName, fileModified: imp.fileModified, importedAt: imp.importedAt,
        items: W.fromImport(imp.notes || [], imp.name).concat(W.fromCheck(mine)) };
    });
  }
  function owners(imports) {
    var list = ownerRegions(imports);
    return list.length && TAP.ownerReportUi ? TAP.ownerReportUi.render(list, { level: 'h3', className: 'tap-src__owners' }) : null;
  }

  // Insight rules that threw. Left out quietly while the insights engine isn't built.
  function failures() {
    if (!TAP.insights || TAP.insights.__stub) return null;
    var list = TAP.insights.failures() || [];
    if (!list.length) return null;
    return el('section', { class: 'tap-src__failures' }, [
      el('h3', null, t('sourcesPanel.failures')),
      el('ul', null, list.map(function (f) {
        return note(String(f.ruleId || f.id || ''), f.message || f.error || '');
      }))
    ]);
  }

  // Running order steps left out when presentation mode started (US-3.1.1), under their own heading.
  function presentNotes() {
    var list = TAP.notes.list('presentation');
    if (!list.length) return null;
    return el('section', { class: 'tap-src__notes tap-src__present' }, [
      el('h3', null, t('present.sourcesTitle')),
      el('p', null, t('present.sourcesIntro')),
      el('ul', null, list.map(function (n) { return note(n.message, ''); }))
    ]);
  }

  function render(root) {
    TAP.dom.clear(root);
    var imports = TAP.sources.imports();
    var n = imports.reduce(function (sum, i) { return sum + (i.notes || []).length; }, 0);
    var meta = TAP.data.meta() || {};
    TAP.dom.append(root, [
      el('p', { class: 'tap-src__kicker' }, t(meta.isSample ? 'sourcesPanel.kindSample' : 'sourcesPanel.kindPlan', { v: meta.schemaVersion })),
      el('p', { class: 'tap-src__summary' }, t(n === 1 ? 'sourcesPanel.summaryOne' : 'sourcesPanel.summary', { date: TAP.format.date(TAP.sources.dataDate()), n: n })),
      // How to find a single figure's file, sheet and cells: the data icon beside it (D100)
      el('p', { class: 'tap-src__how' }, [TAP.icons.svg('data', { size: 18 }), el('span', null, t('sourcesPanel.iconHelp'))]),
      TAP.sources.datesDiffer()
        ? el('p', { class: 'tap-src__differ', role: 'note' }, [TAP.icons.svg('warning', { size: 18 }), t('sourcesPanel.datesDiffer')])
        : null
    ]);
    imports.forEach(function (imp) { root.appendChild(region(imp)); });
    TAP.dom.append(root, [owners(imports), otherNotes(imports), failures(), presentNotes()]);
    return root;
  }

  TAP.sourcesPanel = { render: render, ownerRegions: ownerRegions };
})(window.TAP);
