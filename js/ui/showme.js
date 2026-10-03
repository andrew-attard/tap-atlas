/*
 * File: js/ui/showme.js
 * Purpose: Wires "Show me" across views: opens the right view and chart, widens the comparison if needed,
 *          and highlights the data the insight refers to. The highlight clears when the comparison or view changes.
 * Provides: TAP.showme (go, widen, bind, unbind)
 * Depends on: js/core/store.js, js/engine/registry.js, js/engine/scope.js, js/ui/layers.js,
 *             js/insights/engine.js (all read at call time)
 * Used by: js/ui/app.js (bind at start-up, unbind on stop), js/panel/panel-insights.js (widen)
 */
(function (TAP) {
  'use strict';

  var offBus = null, offStore = null;

  function has(list, x) { return (list || []).indexOf(x) >= 0; }

  function find(id) {
    if (!id || !TAP.insights || TAP.insights.__stub) return null;
    try { return (TAP.insights.all() || []).filter(function (x) { return x.id === id; })[0] || null; } catch (e) { return null; }
  }

  /*
   * True when the comparison cmp can't show every region of the target: a region is out of scope, or, on charts
   * that draw one mark per entity (mark 'bar'), a region is only inside a combined figure.
   */
  function widen(target, cmp, regionIds) {
    var ids = regionIds || (target && target.regionIds) || [];
    if (!ids.length) return false;
    var scope = TAP.scope.regionIds(cmp);
    if (ids.some(function (r) { return !has(scope, r); })) return true;
    if (target && target.mark === 'bar') {
      var own = TAP.scope.entities(cmp).filter(function (e) { return e.kind === 'region'; }).map(function (e) { return e.regionIds[0]; });
      return ids.some(function (r) { return !has(own, r); });
    }
    return false;
  }

  // Brings the panel up to just below the sticky top bar. No smooth scrolling (D24: no animation).
  function reveal(reportId) {
    var view;
    try { view = TAP.shell.viewEl(); } catch (e) { view = document; }
    var node = (view || document).querySelector('.tap-panel[data-report="' + String(reportId).replace(/["\\]/g, '') + '"]');
    if (!node || !node.getBoundingClientRect) return null;
    var stack = document.querySelector('.tap-stack'), top = stack ? Math.max(0, stack.getBoundingClientRect().bottom) : 0;
    var r = node.getBoundingClientRect();
    if (r.top < top || r.top > window.innerHeight * 0.5) window.scrollBy(0, r.top - top - 16);
    return node;
  }

  /*
   * req: {insightId, target}. Returns {to: 'view'|'details'|null, view, widened} so callers and tests can tell
   * where it landed.
   */
  function go(req) {
    req = req || {};
    var ins = find(req.insightId), target = req.target || (ins && ins.highlight) || null;
    var def = target && target.reportId ? TAP.reports.get(target.reportId) : null;
    if (!def || !def.view || !TAP.views.get(def.view)) {
      // No Phase 1 chart: the region's details instead (ARCHITECTURE section 12)
      if (target && (!ins || ins.fallback === 'details' || !target.reportId)) { TAP.layers.openDetails(target); return { to: 'details' }; }
      return { to: null };
    }
    listen();
    var s = TAP.store.get(), regions = (ins && ins.regionIds) || target.regionIds || [];
    var widened = widen(target, s.cmp, regions);
    if (TAP.layers.top()) TAP.layers.close();
    if (s.expanded && s.expanded !== def.id) TAP.store.set({ expanded: null });
    if (widened) TAP.store.set({ cmp: { mode: 'all' } });
    TAP.store.set({ view: def.view });
    // One industry on the Industry view: select it, so the ratings and commentary follow
    var inds = target.industryIds || [];
    if (def.view === 'industry' && inds.length === 1 && TAP.store.get().industry !== inds[0]) TAP.store.set({ industry: inds[0] });
    // Set after the view is mounted, so the panel draws it; a fresh object, so the same target still redraws
    TAP.store.set({ highlight: Object.assign({}, target, { widened: widened }) });
    reveal(def.id);
    return { to: 'view', view: def.view, widened: widened };
  }

  // Any change of comparison or view clears the highlight (it belonged to the screen it was set on).
  function onState(state, changed) {
    if (!state.highlight || has(changed, 'highlight')) return;
    if (has(changed, 'cmp') || has(changed, 'view')) TAP.store.set({ highlight: null });
  }

  function listen() { if (!offStore) offStore = TAP.store.on(onState); }

  // Listens for the 'showme' event; safe to call again (start-up runs more than once in tests).
  function bind() {
    unbind();
    listen();
    offBus = TAP.bus.on('showme', function (p) { go(p); });
  }

  function unbind() {
    if (offBus) { offBus(); offBus = null; }
    if (offStore) { offStore(); offStore = null; }
  }

  TAP.showme = { go: go, widen: widen, bind: bind, unbind: unbind };
})(window.TAP);
