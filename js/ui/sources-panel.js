/*
 * File: js/ui/sources-panel.js
 * Purpose: The data sources panel body: per region the file, its saved date, the import date and the import notes;
 *          whether import dates differ; then other notes worth checking and insight rules that were skipped.
 *          Import notes appear here and nowhere else (US-1.1.5).
 * Provides: TAP.sourcesPanel (render)
 * Depends on: js/core/sources.js (imports, datesDiffer, dataDate), js/core/store.js (TAP.notes), js/core/data.js,
 *             js/core/format.js, js/core/content.js, js/core/icons.js, js/engine/scope.js (colorOf),
 *             js/insights/engine.js (failures)
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

  function colour(id) {
    try { return TAP.scope.colorOf(id); } catch (e) { return window.TAP_THEME.regionColor(TAP.data.regionIndex(id)); }
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

  function region(imp) {
    var notes = imp.notes || [];
    return el('section', { class: 'tap-src__region', 'data-region': imp.regionId }, [
      el('h3', { class: 'tap-src__name' }, [el('span', { class: 'tap-swatch', style: 'background:' + colour(imp.regionId) }), imp.name]),
      facts([
        [t('sourcesPanel.file'), imp.fileName || t('states.notProvided')],
        [t('sourcesPanel.fileDate'), TAP.format.date(imp.fileModified)],
        [t('sourcesPanel.imported'), TAP.format.date(imp.importedAt, { time: true })]
      ]),
      notes.length
        ? el('div', { class: 'tap-src__box' }, [
          el('h4', null, t('sourcesPanel.notes')),
          el('ul', null, notes.map(function (n) { return note(n.message, where(imp.fileName, n.sheet, n.cell)); }))
        ])
        : el('p', { class: 'tap-src__none' }, t('sourcesPanel.noNotes'))
    ]);
  }

  // Notes from the app itself (data checks, colours, the organization file, insights), placed by region if given.
  function otherNotes(imports) {
    var list = TAP.notes.list();
    if (!list.length) return null;
    var files = {};
    imports.forEach(function (i) { files[i.regionId] = i.fileName; });
    return el('section', { class: 'tap-src__notes' }, [
      el('h3', null, t('sourcesPanel.other')),
      el('ul', null, list.map(function (n) {
        var place = n.sheet || n.cell ? where(files[n.regionId], n.sheet, n.cell) : (n.regionId ? files[n.regionId] : '');
        return note(n.message, place);
      }))
    ]);
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

  function render(root) {
    TAP.dom.clear(root);
    var imports = TAP.sources.imports();
    var n = imports.reduce(function (sum, i) { return sum + (i.notes || []).length; }, 0);
    var meta = TAP.data.meta() || {};
    TAP.dom.append(root, [
      el('p', { class: 'tap-src__kicker' }, t(meta.isSample ? 'sourcesPanel.kindSample' : 'sourcesPanel.kindPlan', { v: meta.schemaVersion })),
      el('p', { class: 'tap-src__summary' }, t(n === 1 ? 'sourcesPanel.summaryOne' : 'sourcesPanel.summary', { date: TAP.format.date(TAP.sources.dataDate()), n: n })),
      TAP.sources.datesDiffer()
        ? el('p', { class: 'tap-src__differ', role: 'note' }, [TAP.icons.svg('warning', { size: 18 }), t('sourcesPanel.datesDiffer')])
        : null
    ]);
    imports.forEach(function (imp) { root.appendChild(region(imp)); });
    TAP.dom.append(root, [otherNotes(imports), failures()]);
    return root;
  }

  TAP.sourcesPanel = { render: render };
})(window.TAP);
