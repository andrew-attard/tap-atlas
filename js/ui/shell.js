/*
 * File: js/ui/shell.js
 * Purpose: Draws the page frame: data status banner, top bar with the menu, comparison bar area and the view area.
 * Provides: TAP.shell (mount, viewEl, label)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/store.js, js/core/content.js, js/core/data.js (meta),
 *             js/engine/registry.js (TAP.views), js/ui/compare-bar.js, js/ui/layers.js, js/theme.js (logo)
 * Used by: js/ui/app.js; panel export reads label() for saved images and copied tables
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var frame = null;     // {root, view, menu}
  var cleanups = [];

  function teardown() {
    cleanups.forEach(function (fn) { try { fn(); } catch (e) { /* already gone */ } });
    cleanups = [];
    frame = null;
  }

  // Sample data always says so. Real data shows the organization's confidentiality label unless the
  // organization layer switches it off (US-1.1.8). Returns {kind, text} or null; also used by image and table export.
  function label() {
    var meta = {};
    try { meta = TAP.data.meta() || {}; } catch (e) { return null; }
    if (meta.isSample) return { kind: 'sample', text: TAP.content.text('banner.sample') };
    var s = TAP.content.setting('internalLabel', { show: true }) || {};
    if (s.show === false) return null;
    return { kind: 'internal', text: s.text || TAP.content.text('banner.internal') };
  }

  // The banner itself: drawn once, at the top, and never dismissible.
  function banner(slot) {
    var l = label();
    if (!l) return;
    slot.appendChild(el('div', { class: 'tap-banner tap-banner--' + l.kind, role: 'note' }, [
      TAP.icons.svg(l.kind === 'sample' ? 'info' : 'warning', { size: 18 }),
      el('span', null, l.text)
    ]));
  }

  // Logo (only when the theme names one, so there is no gap without it) and the app name.
  function brand() {
    var logo = window.TAP_THEME && window.TAP_THEME.logo;
    return el('div', { class: 'tap-topbar__brand', 'data-tour': 'brand' }, [
      logo ? el('img', { class: 'tap-topbar__logo', src: logo, alt: '' }) : null,
      el('span', { class: 'tap-topbar__name' }, TAP.content.text('app.name'))
    ]);
  }

  // One button per view. Clicking sets state.view; app.js keeps the address bar in step for the back button.
  function menu() {
    var nav = el('nav', { class: 'tap-menu', 'aria-label': TAP.content.text('menu.label'), 'data-tour': 'menu' });
    TAP.views.order().forEach(function (id) {
      nav.appendChild(el('button', {
        type: 'button', class: 'tap-menu__item', 'data-view': id,
        onclick: function () { TAP.store.set({ view: id }); }
      }, TAP.views.title(id)));
    });
    return nav;
  }

  function markCurrent(nav, view) {
    TAP.dom.qsa('.tap-menu__item', nav).forEach(function (b) {
      if (b.getAttribute('data-view') === view) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
  }

  // A part another stream has not built yet must not stop the frame from drawing.
  function tryMount(fn, slot) {
    try { fn(slot); } catch (e) {
      if (!/Not built yet/.test(e.message)) throw e;
    }
  }

  function mount(root, opts) {
    teardown();
    opts = opts || {};
    TAP.dom.clear(root);
    root.classList.add('tap-app');

    var nav = menu();
    var slot = el('div', { class: 'tap-banner-slot' });
    var cmp = el('div', { class: 'tap-cmp', 'data-tour': 'compare' });
    var stack = el('div', { class: 'tap-stack' }, [
      slot,
      el('header', { class: 'tap-topbar' }, [brand(), nav]),
      cmp
    ]);
    var view = el('main', { class: 'tap-view', id: 'tap-view', tabindex: '-1' });
    var layers = el('div', { class: 'tap-layers' });
    TAP.dom.append(root, [stack, view, layers]);

    frame = { root: root, view: view, menu: nav, layers: layers };
    banner(slot);
    markCurrent(nav, TAP.store.get().view);
    cleanups.push(TAP.store.on(function (state, changed) {
      if (changed.indexOf('view') >= 0) markCurrent(nav, state.view);
    }));

    // Anything can ask for details by event (e.g. a chart click), and they open in a side panel
    cleanups.push(TAP.bus.on('details:open', function (p) { TAP.layers.openDetails(p && p.target); }));

    tryMount(function (slot) { TAP.compareBar.mount(slot); }, cmp);
    return frame;
  }

  function viewEl() {
    if (!frame) throw new Error('The shell is not drawn yet: call TAP.shell.mount first.');
    return frame.view;
  }

  TAP.shell = { mount: mount, viewEl: viewEl, label: label };
})(window.TAP);
