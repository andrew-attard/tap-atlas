/*
 * File: js/views/new-business.js
 * Purpose: The New business view (US-2.1.1): the shared header with its headline, then the industry grid and the
 *          channels side by side, the levers at full width, the sub-industry list, and the recurring themes.
 *          A report not defined yet takes no slot, so the view grows as the reports land.
 * Provides: view 'newBusiness' (registered with TAP.views), TAP.newBusinessView (layout)
 * Depends on: js/ui/view-head.js, js/panel/panel.js, js/engine/registry.js, js/core/dom.js, js/core/content.js,
 *             js/core/store.js (all at call time)
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 * Owner: NB stream (#197)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('nbView.' + key, vars); }
  var VIEW = 'newBusiness';

  // Rows of the page: two items side by side at most (D24); one item takes the full width.
  var LAYOUT = [['nb-industries', 'nb-channels'], ['nb-levers'], ['nb-rows'], ['nb-themes']];

  function listed(id) { return (((window.TAP_VIEWS || {})[VIEW] || {}).reports || []).indexOf(id) >= 0; }

  // Reports the view lists that are not in the layout go at the end, one per row, so none is ever lost.
  function rows() {
    var placed = [], out = LAYOUT.map(function (r) { placed = placed.concat(r); return r.filter(listed); });
    ((window.TAP_VIEWS[VIEW] || {}).reports || []).forEach(function (id) { if (placed.indexOf(id) < 0) out.push([id]); });
    return out.map(function (r) { return r.filter(function (id) { return !!TAP.reports.get(id); }); })
      .filter(function (r) { return r.length; });
  }

  function mount(root) {
    TAP.dom.clear(root);
    var page = el('div', { class: 'tap-vh-page tap-nb' });
    root.appendChild(page);
    var head = TAP.viewHead.render(page, { viewId: VIEW, kicker: t('kicker'), title: t('title'), lead: t('lead') });
    var panels = [];
    rows().forEach(function (r) {
      var slots = r.map(function (id) { return el('div', { class: 'tap-vh-slot', 'data-slot': id }); });
      page.appendChild(slots.length > 1 ? TAP.viewHead.pair(slots) : el('div', { class: 'tap-nb__wide' }, slots));
      r.forEach(function (id, i) { panels.push(TAP.viewHead.mountPanel(slots[i], id)); });
    });
    var dead = false;
    return { destroy: function () {
      if (dead) return;
      dead = true;
      panels.forEach(function (p) { if (p && p.destroy) p.destroy(); });
      head.destroy();
    } };
  }

  TAP.newBusinessView = { layout: function () { return LAYOUT.map(function (r) { return r.slice(); }); } };
  TAP.views.register(VIEW, { title: 'New business', mount: mount });
})(window.TAP);
