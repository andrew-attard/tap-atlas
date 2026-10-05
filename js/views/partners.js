/*
 * File: js/views/partners.js
 * Purpose: The Partners view: reliance on partners and alliances, partner capacity, customer value against books
 *          value and the partner list (Epic 2.3, Epic 4.5), under the shared view header. Reports sit two by two
 *          (D24), as on the Customer growth view; a list, and a report that needs the width, take a full row.
 *          A report not defined yet takes no slot.
 * Provides: view 'partners' (registered with TAP.views), TAP.partnersView (rows)
 * Depends on: js/views/customers.js (TAP.cgpLayout.rows, at call time), js/ui/view-head.js, js/panel/panel.js,
 *             js/engine/registry.js, js/core/dom.js, js/core/content.js
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 * Owner: CGP stream (#209); Phase 4 layout: NBPT stream (#453)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('partnerView.' + key, vars); }
  var VIEW = 'partners';
  // Two bars per region with the difference written at their end: it needs the full width
  var WIDE = ['pt-books'];

  // The reports in rows: the wide ones alone, the rest paired as the Customer growth view pairs them.
  function rows(ids) {
    var out = [], run = [];
    function flush() { out = out.concat(TAP.cgpLayout.rows(run)); run = []; }
    ids.forEach(function (id) {
      if (WIDE.indexOf(id) < 0) { run.push(id); return; }
      flush();
      out.push([id]);
    });
    flush();
    return out;
  }

  function mount(root) {
    TAP.dom.clear(root);
    var page = el('div', { class: 'tap-vh-page tap-cgp', 'data-view': VIEW });
    root.appendChild(page);
    var head = TAP.viewHead.render(page, { viewId: VIEW, kicker: t('kicker'), title: t('title'), lead: t('lead') });
    var body = el('section', { class: 'tap-cgp__body', 'aria-label': t('label') }), panels = [];
    page.appendChild(body);
    var ids = (((window.TAP_VIEWS || {})[VIEW] || {}).reports || []).filter(function (id) { return !!TAP.reports.get(id); });
    rows(ids).forEach(function (row) {
      var slots = row.map(function (id) { return el('div', { class: 'tap-vh-slot', 'data-slot': id }); });
      body.appendChild(slots.length > 1 ? TAP.viewHead.pair(slots) : el('div', { class: 'tap-cgp__wide' }, slots));
      slots.forEach(function (slot, i) { panels.push(TAP.viewHead.mountPanel(slot, row[i])); });
    });
    return { destroy: function () {
      panels.forEach(function (p) { if (p && p.destroy) p.destroy(); });
      head.destroy();
    } };
  }

  TAP.partnersView = { rows: rows };
  TAP.views.register(VIEW, { title: 'Partners', mount: mount });
})(window.TAP);
