/*
 * File: js/panel/panel-expand.js
 * Purpose: Expanded and full-screen charts: the slim strip, arrow-key stepping and scroll lock.
 * Provides: TAP.panelExpand (add, remove, steps, syncScroll, collapse, fullscreen, strip, keys)
 * Depends on: js/core/store.js, js/core/dom.js, js/core/content.js, js/core/format.js, js/engine/scope.js,
 *             js/core/sources.js, js/ui/shell.js, js/ui/layers.js, js/core/icons.js
 * Used by: js/panel/panel.js
 */
(function (TAP) {
  'use strict';
  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }


  var live = [];   // panels on the page, in the order made: the charts the arrow keys step through

  function steps() { return live.filter(function (q) { return q.live && q.root.isConnected; }).map(function (q) { return q.id; }); }

  // Page scrolling is locked while any panel on the page is expanded.
  function syncScroll() {
    var id = TAP.store.get().expanded;
    var on = !!id && live.some(function (q) { return q.live && q.id === id; });
    document.documentElement.classList.toggle('tap-noscroll', on);
  }

  function collapse() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () { /* already out */ });
    TAP.store.set({ expanded: null });
  }

  function fullscreen(id) {
    var r = document.documentElement;
    try {
      var asked = r.requestFullscreen ? r.requestFullscreen() : null;
      if (asked && asked.catch) asked.catch(function () { /* refused: expanded in the page still works */ });
    } catch (e) { /* refused */ }
    TAP.store.set({ expanded: id });
  }

  // The slim strip over an expanded chart: data label, comparison sentence, data date, position, Close.
  function strip(p, s) {
    var list = steps(), lab = TAP.shell.label();
    return el('div', { class: 'tap-panel__expand-strip' }, [
      lab ? el('div', { class: 'tap-panel__expand-label tap-panel__expand-label--' + lab.kind, role: 'note' }, lab.text) : null,
      el('div', { class: 'tap-panel__expand-row' }, [
        el('span', { class: 'tap-panel__expand-sentence' }, TAP.scope.sentence(p.cmp())),
        el('span', { class: 'tap-panel__date' }, t('dataDate', { date: TAP.format.date(TAP.sources.dataDate()) })),
        list.length > 1 ? el('span', { class: 'tap-muted' }, t('chartOf', { i: list.indexOf(p.id) + 1, n: list.length })) : null,
        el('button', { type: 'button', class: 'tap-btn tap-panel__tool', 'data-action': 'collapse', onclick: collapse },
          [TAP.icons.svg('x', { size: 18 }), el('span', null, t('closeExpanded'))])
      ])
    ]);
  }

  // Esc (after any popover or side panel) closes the expanded chart; the arrows step to the next or previous one.
  function keys(p, e) {
    if (TAP.store.get().expanded !== p.id || e.defaultPrevented) return;
    if (e.key === 'Escape') {
      if (TAP.layers.top()) return;
      e.preventDefault();
      collapse();
      return;
    }
    var tag = ((e.target && e.target.tagName) || '').toLowerCase(), list = steps(), i = list.indexOf(p.id);
    if ((e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') || /^(input|select|textarea)$/.test(tag) || e.altKey || e.ctrlKey || e.metaKey) return;
    if (list.length < 2) return;
    e.preventDefault();
    TAP.store.set({ expanded: list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length] });
  }

  function add(p) { live.push(p); }
  function remove(p) { live = live.filter(function (q) { return q !== p; }); syncScroll(); }

  TAP.panelExpand = { add: add, remove: remove, steps: steps, syncScroll: syncScroll, collapse: collapse,
    fullscreen: fullscreen, strip: strip, keys: keys };
})(window.TAP);
