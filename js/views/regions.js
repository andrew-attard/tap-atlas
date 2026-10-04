/*
 * File: js/views/regions.js
 * Purpose: The Regions view (Epic 2.4): with no region chosen, a list of regions to pick from; with one, that
 *          region's profile against the average of the other regions. The profile's comparison is its own (D62): it
 *          is passed to each panel and never written to the shared comparison, and the comparison bar is hidden here.
 *          The address bar names the region (#regions/<id>); js/ui/app.js keeps it and state.region in step.
 * Provides: view 'regions' (registered with TAP.views), TAP.profile (cmp, rows, href, link)
 * Depends on: js/ui/view-head.js, js/panel/panel.js, config/profile.js, js/engine/registry.js, js/engine/scope.js,
 *             js/core/dom.js, icons.js, content.js, store.js, data.js, format.js, sources.js, js/ui/layers.js (all at call time)
 * Used by: js/ui/app.js, js/ui/shell.js (menu), js/views/overview-cards.js (link)
 * Owner: PROFILE stream (#214)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('profile.' + key, vars); }
  var VIEW = 'regions';

  /* ---------- the profile's own comparison and its address ---------- */

  // One region against the average of all the others, for this page only (D62).
  function cmp(regionId) {
    return { mode: 'one', focus: regionId, second: null, set: [], restAs: 'combined', restAgg: 'average' };
  }
  function known(id) { return id != null && !!TAP.data.region(id); }
  function name(id) { return TAP.content.regionName(TAP.data.region(id)); }
  function href(id) { return '#regions/' + encodeURIComponent(id); }

  // A link to a region's profile. It carries the real address; a plain click goes through the store, which moves
  // the address bar too, so the back button returns to the page it came from.
  function link(regionId, attrs, kids) {
    return el('a', Object.assign({}, attrs || {}, { href: href(regionId), onclick: function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0) return;   // a new tab or window keeps the browser's way
      e.preventDefault();
      e.stopPropagation();   // a card would otherwise open its details as well
      TAP.store.set({ view: VIEW, region: regionId });
    } }), kids);
  }

  // The configured rows of reports, without the reports not defined yet (US-2.4.3).
  function rows() {
    return ((window.TAP_PROFILE || {}).reports || []).map(function (r) {
      return [].concat(r).filter(function (id) { return !!TAP.reports.get(id); });
    }).filter(function (r) { return r.length; });
  }

  /* ---------- the list of regions ---------- */

  function picker(page) {
    var head = TAP.viewHead.render(page, { viewId: VIEW, kicker: t('pick.kicker'), title: t('pick.title'), lead: t('pick.lead') });
    page.appendChild(el('ul', { class: 'tap-pf-pick', 'aria-label': t('pick.label') }, TAP.data.regions().map(function (r) {
      return el('li', null, link(r.id, { class: 'tap-pf-pick__item', 'data-pick-region': r.id,
        'aria-label': t('openProfileFor', { name: name(r.id) }) }, [
        el('span', { class: 'tap-pf-pick__bar', style: 'background:' + TAP.scope.colorOf(r.id), 'aria-hidden': 'true' }),
        el('span', { class: 'tap-pf-pick__name' }, name(r.id)),
        el('span', { class: 'tap-pf-pick__go' }, t('openProfile'))
      ]));
    })));
    return { destroy: head.destroy };
  }

  /* ---------- one region's profile ---------- */

  function regionSelect(id) {
    var sel = el('select', { class: 'tap-field', 'data-control': 'region', onchange: function (e) {
      if (known(e.target.value)) TAP.store.set({ region: e.target.value });
    } }, TAP.data.regions().map(function (r) {
      return el('option', { value: r.id, selected: r.id === id }, name(r.id));
    }));
    return el('label', { class: 'tap-pf__picker' }, [el('span', { class: 'tap-pf__picker-label' }, t('picker')), sel]);
  }

  // The data date and the data sources panel, which the hidden comparison bar would otherwise carry.
  function dataButton() {
    return el('button', { type: 'button', class: 'tap-btn tap-pf__date', 'data-action': 'sources', onclick: function () {
      if (!TAP.layers.__stub) TAP.layers.open('sources');
    } }, [TAP.icons.svg('data'), el('span', null, TAP.content.text('compare.dataDate', { date: TAP.format.date(TAP.sources.dataDate()) }))]);
  }

  function profile(page, id) {
    var c = cmp(id), panels = [];
    page.classList.add('tap-pf');
    page.setAttribute('data-region', id);
    var top = el('div', { class: 'tap-pf__top' }, [regionSelect(id), dataButton()]);
    var title = el('div', { class: 'tap-pf__head' }, [
      el('span', { class: 'tap-pf__bar', style: 'background:' + TAP.scope.colorOf(id), 'aria-hidden': 'true' })
    ]);
    TAP.dom.append(page, [top, title]);
    var head = TAP.viewHead.render(title, { viewId: VIEW, kicker: t('kicker'), title: name(id),
      lead: t('lead', { sentence: TAP.scope.sentence(c) }) });
    var body = el('section', { class: 'tap-pf__reports', 'aria-label': t('reports', { name: name(id) }) });
    page.appendChild(body);
    rows().forEach(function (row) {
      var slots = row.map(function (rid) { return el('div', { class: 'tap-vh-slot', 'data-slot': rid }); });
      body.appendChild(slots.length > 1 ? TAP.viewHead.pair(slots) : el('div', { class: 'tap-pf__wide' }, slots));
      slots.forEach(function (slot, i) { panels.push(TAP.viewHead.mountPanel(slot, row[i], { cmp: c })); });
    });
    return { destroy: function () {
      panels.forEach(function (p) { if (p && p.destroy) p.destroy(); });
      head.destroy();
    } };
  }

  /* ---------- the view ---------- */

  function mount(root) {
    var inner = null, dead = false, handle;
    function draw() {
      if (inner) inner.destroy();
      TAP.dom.clear(root);
      var id = TAP.store.get().region, page = el('div', { class: 'tap-vh-page tap-pf-page' });
      root.appendChild(page);
      inner = known(id) ? profile(page, id) : picker(page);
    }
    draw();
    var off = TAP.store.on(function (s, changed) {
      if (dead) return;
      if (!root.isConnected) { handle.destroy(); return; }   // off the page (removed without destroy()): stop listening
      if (changed.indexOf('region') >= 0 && s.view === VIEW) { draw(); window.scrollTo(0, 0); }
    });
    handle = { destroy: function () {
      if (dead) return;
      dead = true;
      off();
      if (inner) inner.destroy();
    } };
    return handle;
  }

  TAP.profile = { cmp: cmp, rows: rows, href: href, link: link };
  TAP.views.register(VIEW, { title: 'Regions', mount: mount });
})(window.TAP);
