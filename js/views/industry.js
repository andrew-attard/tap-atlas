/*
 * File: js/views/industry.js
 * Purpose: The Industry priorities view: the tier grid at full width, then attractiveness vs ability and the
 *          ratings side by side, then the leaders' commentary. Each chart sits in a report panel (TAP.panel).
 * Provides: view 'industry' (registered with TAP.views)
 * Depends on: js/engine/registry.js, js/core/dom.js, js/core/store.js, js/core/content.js, js/panel/panel.js
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text(key, vars); }

  // A report panel. If the panel can't be drawn, the slot says so instead of breaking the view.
  function mountPanel(slot, reportId, opts) {
    try { return TAP.panel.create(slot, reportId, opts || {}); } catch (e) {
      TAP.dom.clear(slot);
      slot.appendChild(el('p', { class: 'tap-stub' }, e.message));
      return null;
    }
  }

  /* ---------- the view ---------- */

  function mount(root) {
    TAP.dom.clear(root);
    var page = el('div', { class: 'tap-ind' });
    page.appendChild(el('header', { class: 'tap-ind__head' }, [
      el('span', { class: 'tap-ind__kicker' }, t('industryView.kicker')),
      el('h1', { class: 'tap-ind__title' }, t('industryView.title'))
    ]));
    var tiers = el('div', { class: 'tap-ind__slot tap-ind__slot--wide' });
    var quad = el('div', { class: 'tap-ind__slot' });
    page.appendChild(tiers);
    page.appendChild(el('div', { class: 'tap-ind__pair' }, [quad]));
    root.appendChild(page);
    var panels = [mountPanel(tiers, 'ind-tiers'), mountPanel(quad, 'ind-quad')];
    var offs = [TAP.bus.on('industry:select', function (p) {
      if (p && p.industryId && p.industryId !== TAP.store.get().industry) TAP.store.set({ industry: p.industryId });
    })];
    return { destroy: function () {
      panels.forEach(function (p) { if (p && p.destroy) p.destroy(); });
      offs.forEach(function (f) { if (typeof f === 'function') f(); });
    } };
  }

  TAP.views.register('industry', { title: 'Industry priorities', mount: mount });
})(window.TAP);
