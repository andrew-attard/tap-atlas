/*
 * File: js/ui/shell.js
 * Purpose: Draws the page frame: data status banner, top bar with the menu (in three groups, D115), comparison bar
 *          area and the view area.
 *          Page-wide actions (Take the tour, Present) sit at the right end of the comparison bar's sentence row,
 *          beside the data date, so the menu keeps one line at 1280 px (D72).
 * Provides: TAP.shell (mount, unmount, viewEl, actionsEl, label)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/store.js, js/core/content.js, js/core/data.js (meta),
 *             js/engine/registry.js (TAP.views), config/views.js (groups), js/ui/compare-bar.js, js/ui/layers.js, js/ui/present.js (button), js/theme.js (logo)
 * Used by: js/ui/app.js; js/panel/panel.js and panel export read label() for saved images and copied tables;
 *          js/ui/tour.js (actionsEl); js/ui/present.js draws the Present button in the actions slot (US-3.1.2)
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
      logo ? el('img', { class: 'tap-topbar__logo', src: logo, alt: '', onload: function () { balance(); } }) : null,
      el('span', { class: 'tap-topbar__name' }, TAP.content.text('app.name'))
    ]);
  }

  // The menu in three groups, left to right (D115): start points, the plan's data views, then tools (the right-hand
  // group, which wraps as a whole, D104). Each is a list named for screen readers. The views come in
  // TAP.views.order(), which leaves out one the data can't show (Other sections); a view in no group joins the data views.
  function menu() {
    var nav = el('nav', { class: 'tap-menu', 'aria-label': TAP.content.text('menu.label'), 'data-tour': 'menu' });
    var groups = (window.TAP_VIEWS && window.TAP_VIEWS.groups) || { data: [] }, lists = {};
    Object.keys(groups).forEach(function (g) {
      lists[g] = el('ul', { class: 'tap-menu__group tap-menu__group--' + g + (g === 'tools' ? ' tap-menu__tools' : ''),
        'data-group': g, 'aria-label': TAP.content.text('menu.groups.' + g) });
    });
    TAP.views.order().forEach(function (id) {
      var g = Object.keys(groups).filter(function (k) { return groups[k].indexOf(id) >= 0; })[0];
      (lists[g] || lists.data || lists[Object.keys(lists)[0]]).appendChild(el('li', { class: 'tap-menu__entry' }, el('button', {
        type: 'button', class: 'tap-menu__item', 'data-view': id,
        // The Regions entry opens the region picker, not the last profile shown (US-2.4.1)
        onclick: function () { TAP.store.set(id === 'regions' ? { view: id, region: null } : { view: id }); }
      }, TAP.views.title(id))));
    });
    Object.keys(lists).forEach(function (g) { if (lists[g].children.length) nav.appendChild(lists[g]); });
    return nav;
  }

  // The centre group is centred on the whole bar, not only on the menu beside the brand: the right-hand group starts
  // as wide as the brand and its gap (css/shell.css), then both side groups grow alike. Measured, as the brand's
  // width depends on the name and logo; it is fixed, so it is measured again only when the frame is shown, the
  // window changes size (zoom) or the logo or font loads.
  function balance() {
    if (!frame) return;
    var brand = TAP.dom.qs('.tap-topbar__brand', frame.root), nav = frame.menu;
    var b = brand && brand.getBoundingClientRect(), n = nav.getBoundingClientRect();
    if (!b || !n.width) return;   // hidden: the Regions view hides the frame
    nav.style.setProperty('--tap-menu-offset', Math.max(0, Math.round(n.left - b.left)) + 'px');
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
    // Filled by other streams (the tour button, Present). The comparison bar places it beside the data date (D72);
    // the class keeps its first name, which other code and tests select by.
    var actions = el('div', { class: 'tap-topbar__actions' });
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

    frame = { root: root, view: view, menu: nav, actions: actions, layers: layers };
    banner(slot);
    markCurrent(nav, TAP.store.get().view);
    root.setAttribute('data-view', TAP.store.get().view);   // lets a view's stylesheet adjust the frame (e.g. no comparison bar)
    cleanups.push(TAP.store.on(function (state, changed) {
      if (changed.indexOf('view') >= 0) { markCurrent(nav, state.view); root.setAttribute('data-view', state.view); balance(); }
    }));
    balance();
    window.addEventListener('resize', balance);
    cleanups.push(function () { window.removeEventListener('resize', balance); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(balance);

    // Anything can ask for details by event (e.g. a chart click), and they open in a side panel
    cleanups.push(TAP.bus.on('details:open', function (p) { TAP.layers.openDetails(p && p.target); }));

    tryMount(function (slot) {
      var stopBar = TAP.compareBar.mount(slot, { actions: actions });
      if (typeof stopBar === 'function') cleanups.push(stopBar);
    }, cmp);
    tryMount(function (slot) { TAP.present.button(slot); }, actions);   // "Present" (US-3.1.2)
    return frame;
  }

  function viewEl() {
    if (!frame) throw new Error('The shell is not drawn yet: call TAP.shell.mount first.');
    return frame.view;
  }

  // The slot for page-wide actions, beside the data date (empty until another stream adds to it). The Regions view
  // hides the comparison bar, and these actions with it; P and the Guide still reach presentation mode there.
  function actionsEl() {
    if (!frame) throw new Error('The shell is not drawn yet: call TAP.shell.mount first.');
    return frame.actions;
  }

  // Drops the frame's store and bus listeners and the comparison bar's (TAP.app.stop); the elements stay where they are.
  function unmount() { teardown(); }

  TAP.shell = { mount: mount, unmount: unmount, viewEl: viewEl, actionsEl: actionsEl, label: label };
})(window.TAP);
