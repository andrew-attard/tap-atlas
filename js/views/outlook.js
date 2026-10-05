/*
 * File: js/views/outlook.js
 * Purpose: The Outlook view (US-4.2.1): the plans against the strategic plan and the base year, pipeline coverage,
 *          the revenue outlook and order intake by product category (Epics 4.2 and 4.3, US-4.4.2), under the shared
 *          view header. The strategic plan report comes first at full width, so a chart is on the first screen.
 *          A file without these parts of the template shows one plain line instead of empty panels.
 * Provides: view 'outlook' (registered with TAP.views), TAP.outlookView (layout, shown, hasData)
 * Depends on: js/ui/view-head.js, js/panel/panel.js, js/engine/registry.js, js/engine/measures-p4.js
 *             (TAP.measures.available), js/core/dom.js, js/core/content.js, js/core/format.js (all at call time)
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 * Owner: OUTLOOK stream (#441)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('outlookView.' + key, vars); }
  var VIEW = 'outlook';

  // Rows of the page: at most two side by side (D24). The strategic plan report leads at full width.
  var LAYOUT = [['ol-strategic'], ['ol-baseyear', 'ol-coverage'], ['ol-revenue', 'ol-revshare'], ['ol-category']];
  // The figures the view rests on: with none of them in the file, there is nothing to show.
  var DATA = ['sp.oi', 'by.budget', 'by.forecast', 'by.actuals', 'by.pipeline', 'rv.all.oi', 'oi.cat'];

  function listed() { return ((window.TAP_VIEWS || {})[VIEW] || {}).reports || []; }
  function available(id) { try { return TAP.measures.available(id); } catch (e) { return false; } }

  // Every report the view lists, in rows. One the layout doesn't place gets a row of its own, so none is lost.
  function layout() {
    var all = listed(), placed = [].concat.apply([], LAYOUT), out = LAYOUT.map(function (r) { return r.slice(); });
    all.forEach(function (id) { if (placed.indexOf(id) < 0) out.push([id]); });
    return out.map(function (r) { return r.filter(function (id) { return all.indexOf(id) >= 0; }); }).filter(function (r) { return r.length; });
  }
  // A report has data when some region gives a figure for one of the measures it leads with.
  function hasData(id) {
    var def = TAP.reports.get(id);
    return !!def && (def.measures || []).some(function (m) { return available(m.id); });
  }
  // The rows drawn: reports that are built and have data. A report not built yet takes no slot.
  function shown() {
    return layout().map(function (r) { return r.filter(hasData); }).filter(function (r) { return r.length; });
  }

  function mount(root) {
    TAP.dom.clear(root);
    var page = el('div', { class: 'tap-vh-page tap-ol', 'data-view': VIEW });
    root.appendChild(page);
    var head = TAP.viewHead.render(page, { viewId: VIEW, kicker: t('kicker'), title: t('title'), lead: t('lead') });
    var body = el('section', { class: 'tap-ol__body', 'aria-label': t('label') }), panels = [];
    page.appendChild(body);
    if (!DATA.some(available)) {
      body.appendChild(el('p', { class: 'tap-ol__none', role: 'status' }, t('none')));
    } else {
      shown().forEach(function (row) {
        var slots = row.map(function (id) { return el('div', { class: 'tap-vh-slot', 'data-slot': id }); });
        body.appendChild(slots.length > 1 ? TAP.viewHead.pair(slots) : el('div', { class: 'tap-ol__wide' }, slots));
        slots.forEach(function (slot, i) { panels.push(TAP.viewHead.mountPanel(slot, row[i])); });
      });
      // Built reports whose part of the template no region gives are named once, in place of empty panels
      var gaps = listed().filter(function (id) { return !!TAP.reports.get(id) && !hasData(id); });
      if (gaps.length) {
        body.appendChild(el('p', { class: 'tap-ol__some' },
          t('some', { names: TAP.format.list(gaps.map(function (id) { return t('names.' + id); })) })));
      }
    }
    return { destroy: function () {
      panels.forEach(function (p) { if (p && p.destroy) p.destroy(); });
      head.destroy();
    } };
  }

  TAP.outlookView = { layout: layout, shown: shown, hasData: hasData };
  TAP.views.register(VIEW, { title: 'Outlook', mount: mount });
})(window.TAP);
