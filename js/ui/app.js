/*
 * File: js/ui/app.js
 * Purpose: Starts the app: checks the data, draws the shell, and swaps views when the menu or back button is used.
 * Provides: TAP.app (start, stop, mountView, current)
 * Depends on: every other module (loads last); TAP.data, TAP.store, TAP.shell, TAP.screens, TAP.views
 * Used by: index.html, index-sample.html (starts on load); tests.html (calls TAP.app.start itself)
 */
(function (TAP) {
  'use strict';

  var mounted = null;   // {id, handle} of the view on screen
  var root = null;
  var unsubscribe = null;
  var hashBound = false;

  // Opening state for screenshots only (?screenshot=1&view=industry&mode=one&focus=north). Ignored otherwise.
  function screenshotState() {
    var q = new URLSearchParams(window.location.search);
    if (q.get('screenshot') !== '1') return null;
    var cmp = {};
    if (q.get('mode')) cmp.mode = q.get('mode');
    if (q.get('focus')) cmp.focus = q.get('focus');
    if (q.get('second')) cmp.second = q.get('second');
    if (q.get('set')) cmp.set = q.get('set').split(',');
    if (q.get('rest')) cmp.restAgg = q.get('rest');
    var patch = { cmp: cmp };
    if (q.get('view')) patch.view = q.get('view');
    if (q.get('region')) patch.region = q.get('region');
    return patch;
  }

  // '#industry' gives the view; '#regions/north' also gives the region for the profile (US-2.4.1).
  function fromHash() {
    var parts = (window.location.hash || '').replace(/^#\/?/, '').split('/');
    var id = TAP.views.get(parts[0]) ? parts[0] : null;
    return { view: id, region: id === 'regions' && parts[1] ? decodeURIComponent(parts[1]) : null };
  }
  function hashFor(state) {
    return state.view + (state.view === 'regions' && state.region ? '/' + encodeURIComponent(state.region) : '');
  }

  // Shows a view in the shell's view area, removing the previous one.
  function mountView(id) {
    if (!TAP.views.get(id)) id = TAP.views.order()[0];
    if (mounted && mounted.id === id) return;
    if (mounted && mounted.handle && mounted.handle.destroy) mounted.handle.destroy();
    var el = shellViewEl();
    TAP.dom.clear(el);
    mounted = { id: id, handle: TAP.views.get(id).mount(el) };
  }

  function shellViewEl() {
    try { return TAP.shell.viewEl(); } catch (e) { return root; }   // shell not built yet: use the page root
  }

  // Store -> address bar and view. The address bar follows the view so the back button works (US-1.1.2).
  function onState(state, changed) {
    var viewChanged = changed.indexOf('view') >= 0;
    if (!viewChanged && changed.indexOf('region') < 0) return;
    if (viewChanged && state.expanded) TAP.store.set({ expanded: null });   // an expanded chart belongs to the view it was on
    if (window.location.hash.replace(/^#\/?/, '') !== hashFor(state)) window.location.hash = hashFor(state);
    if (viewChanged) mountView(state.view);
  }

  function start(opts) {
    opts = opts || {};
    root = opts.root || document.getElementById('app') || document.body;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }   // start() can run more than once (tests)
    if (mounted && mounted.handle && mounted.handle.destroy) mounted.handle.destroy();
    mounted = null;

    TAP.notes.clear();
    var res = TAP.data.load(opts.plan);
    res.warnings.forEach(function (w) { TAP.notes.add(Object.assign({ source: 'data' }, w)); });
    if (TAP.content.orgError()) TAP.notes.add({ source: 'organization', message: TAP.content.orgError() });
    if (!res.ok) {
      TAP.screens.show(root, res);
      return res;
    }

    // Always open on Overview with All regions, whatever was used last time (US-1.1.3).
    TAP.store.reset();
    var shot = screenshotState();
    TAP.store.set(Object.assign({ view: TAP.views.order()[0] || 'overview' }, shot || {}));

    try {
      TAP.shell.mount(root, { warnings: res.warnings });
    } catch (e) {
      TAP.dom.clear(root);
      root.appendChild(TAP.dom.el('p', { class: 'tap-stub' }, e.message));
    }

    try { TAP.showme.bind(); } catch (e) { /* "Show me" not available: insights still list, without jumping */ }
    try { TAP.keys.bind(); } catch (e) { /* shortcuts are a convenience; never block start-up */ }
    mounted = null;   // the shell was just drawn, so the view goes into the new view area
    unsubscribe = TAP.store.on(onState);
    if (!hashBound) {
      hashBound = true;
      window.addEventListener('hashchange', function () {
        if (!unsubscribe) return;   // the app isn't running (error screen or not started)
        var h = fromHash(), s = TAP.store.get();
        if (h.view && (h.view !== s.view || h.region !== s.region)) TAP.store.set({ view: h.view, region: h.region });
      });
    }

    var first = TAP.store.get().view, firstHash = hashFor(TAP.store.get());
    if (window.location.hash.replace('#', '') !== firstHash) {
      // replaceState keeps the opening view out of the back-button history
      history.replaceState(null, '', window.location.pathname + window.location.search + '#' + firstHash);
    }
    // Insights are worked out afresh for this data (they are cached per plan)
    if (TAP.insights && !TAP.insights.__stub) TAP.insights.reset();
    mountView(first);
    // The welcome card, only on the real page: never in screenshots or test sandboxes
    if (!shot && !opts.root) {
      try { TAP.tour.offer(); } catch (e) { /* the tour is optional (Should); never block start-up */ }
    }
    return res;
  }

  // Unmounts the running app and drops its listeners; tests use it between runs.
  function stop() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    try { TAP.tour.stop(); } catch (e) { /* no tour running */ }
    try { TAP.showme.unbind(); } catch (e) { /* not bound */ }
    try { TAP.keys.unbind(); } catch (e) { /* not bound */ }
    if (mounted && mounted.handle && mounted.handle.destroy) mounted.handle.destroy();
    mounted = null;
  }

  TAP.app = { start: start, stop: stop, mountView: mountView, current: function () { return mounted && mounted.id; } };

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.getAttribute('data-autostart') === 'false') return;
    start();
  });
})(window.TAP);
