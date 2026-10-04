/*
 * File: js/views/customers.js
 * Purpose: The Customer growth view: segments, growth assumptions, exposure, the accounts bubble and the account list
 *          (Epic 2.2), under the shared view header. Also the page layout the Partners view uses too: the view's
 *          reports two by two (D24), with list reports and an odd last report at full width.
 * Provides: view 'customers' (registered with TAP.views), TAP.cgpLayout (rows, mount)
 * Depends on: js/ui/view-head.js, js/panel/panel.js, js/engine/registry.js, js/core/dom.js, js/core/content.js
 *             (all at call time)
 * Used by: js/ui/app.js, js/ui/shell.js (menu), js/views/partners.js (TAP.cgpLayout)
 * Owner: CGP stream (#203)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text(key, vars); }

  // The view's report ids grouped into rows: pairs side by side, a list (or a report left over) on its own row.
  function rows(viewId) {
    var ids = ((window.TAP_VIEWS || {})[viewId] || {}).reports || [], out = [], open = null;
    ids.forEach(function (id) {
      var def = TAP.reports.get(id);
      if (def && def.shape === 'list') { open = null; out.push([id]); return; }
      if (open && open.length < 2) { open.push(id); return; }
      open = [id];
      out.push(open);
    });
    return out;
  }

  // Draws the header and every report panel of a view. text is the content key holding kicker, title and lead.
  function mount(root, viewId, text) {
    TAP.dom.clear(root);
    var page = el('div', { class: 'tap-vh-page tap-cgp', 'data-view': viewId });
    root.appendChild(page);
    var head = TAP.viewHead.render(page, { viewId: viewId, kicker: t(text + '.kicker'), title: t(text + '.title'), lead: t(text + '.lead') });
    var body = el('section', { class: 'tap-cgp__body', 'aria-label': t(text + '.label') });
    page.appendChild(body);
    var panels = [];
    rows(viewId).forEach(function (ids) {
      var slots = ids.map(function (id) { return el('div', { class: 'tap-vh-slot', 'data-slot': id }); });
      body.appendChild(slots.length > 1 ? TAP.viewHead.pair(slots) : el('div', { class: 'tap-cgp__wide' }, slots));
      slots.forEach(function (slot, i) { panels.push(TAP.viewHead.mountPanel(slot, ids[i])); });
    });
    return { destroy: function () {
      panels.forEach(function (p) { if (p && p.destroy) p.destroy(); });
      head.destroy();
    } };
  }

  TAP.cgpLayout = { rows: rows, mount: mount };
  TAP.views.register('customers', { title: 'Customer growth', mount: function (root) { return mount(root, 'customers', 'customerView'); } });
})(window.TAP);
