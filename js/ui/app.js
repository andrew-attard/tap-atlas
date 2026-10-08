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
  var correcting = false;   // the address bar is being brought in line with what it asked for (no new history entry)

  // Only views in the menu are reachable by address or screenshot query (D76); anything else opens the first view.
  function known(id) { return TAP.views.order().indexOf(id) >= 0; }
  function firstView() { return TAP.views.order()[0] || 'overview'; }
  function knownRegion(id) { return id != null && !!TAP.data.region(id); }

  // Opening state for screenshots only (?screenshot=1&view=industry&mode=one&focus=north). Ignored otherwise.
  // Unknown values are left out; unknown region ids in the comparison are repaired by the comparison bar.
  // An old mode=pair opens as a selection of its two regions (D99), an old mode=org as all regions (D114).
  function screenshotState() {
    var q = new URLSearchParams(window.location.search);
    if (q.get('screenshot') !== '1') return null;
    var cmp = {};
    if (['all', 'one', 'pair', 'set', 'org'].indexOf(q.get('mode')) >= 0) cmp.mode = q.get('mode');
    if (q.get('focus')) cmp.focus = q.get('focus');
    if (q.get('second')) cmp.second = q.get('second');
    if (q.get('set')) cmp.set = q.get('set').split(',');
    if (['average', 'total'].indexOf(q.get('rest')) >= 0) cmp.restAgg = q.get('rest');
    var patch = { cmp: TAP.scope.upgrade(cmp) };
    if (known(q.get('view'))) patch.view = q.get('view');
    if (knownRegion(q.get('region'))) patch.region = q.get('region');
    return patch;
  }

  // '#industry' gives the view; '#regions/north' also gives the region for the profile (US-2.4.1). An address naming
  // no view in the menu, or one that can't be read, gives the first view; a region the data lacks gives the picker.
  function fromHash() {
    var parts = (window.location.hash || '').replace(/^#\/?/, '').split('/'), region = null;
    if (!known(parts[0])) return { view: firstView(), region: null };
    if (parts[0] === 'regions' && parts[1]) {
      try { region = decodeURIComponent(parts[1]); } catch (e) { return { view: firstView(), region: null }; }
    }
    return { view: parts[0], region: knownRegion(region) ? region : null };
  }
  function hashFor(state) {
    return state.view + (state.view === 'regions' && state.region ? '/' + encodeURIComponent(state.region) : '');
  }
  function hashIs(h) { return window.location.hash.replace(/^#\/?/, '') === h; }
  // replaceState keeps a corrected address out of the back-button history
  function replaceHash(h) { history.replaceState(null, '', window.location.pathname + window.location.search + '#' + h); }

  // Shows a view in the shell's view area, removing the previous one. A view that throws shows its error there,
  // and still counts as mounted, so the menu can leave it.
  function mountView(id) {
    if (!known(id)) id = firstView();
    if (mounted && mounted.id === id) return;
    var old = mounted;
    mounted = null;
    if (old && old.handle && old.handle.destroy) old.handle.destroy();
    var el = shellViewEl();
    TAP.dom.clear(el);
    mounted = { id: id, handle: null };
    try { mounted.handle = TAP.views.get(id).mount(el); } catch (e) {
      TAP.dom.clear(el);
      el.appendChild(TAP.dom.el('p', { class: 'tap-stub', role: 'alert' }, TAP.content.text('screens.viewFailed', { message: e.message })));
      console.error(e);
    }
  }

  function shellViewEl() {
    try { return TAP.shell.viewEl(); } catch (e) { return root; }   // shell not built yet: use the page root
  }

  // Store -> address bar and view. The address bar follows the view so the back button works (US-1.1.2).
  function onState(state, changed) {
    var viewChanged = changed.indexOf('view') >= 0;
    if (!viewChanged && changed.indexOf('region') < 0) return;
    if (viewChanged && state.expanded) TAP.store.set({ expanded: null });   // an expanded chart belongs to the view it was on
    if (!hashIs(hashFor(state))) {
      if (correcting) replaceHash(hashFor(state)); else window.location.hash = hashFor(state);
    }
    // A new view starts at its top; scrolled first, so a view that scrolls while mounting (a Guide section) wins (D110)
    if (viewChanged) { window.scrollTo(0, 0); mountView(state.view); }
  }

  function start(opts) {
    opts = opts || {};
    root = opts.root || document.getElementById('app') || document.body;
    stop();   // start() can run more than once (tests): nothing of the last run keeps listening, even if this load fails

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
    TAP.store.set(Object.assign({ view: firstView() }, shot || {}));

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
        correcting = true;
        try {
          if (h.view !== s.view || h.region !== s.region) TAP.store.set({ view: h.view, region: h.region });
        } finally { correcting = false; }
        // An address the app could not follow as written (#foo, #other without extra sections) is corrected
        if (!hashIs(hashFor(TAP.store.get()))) replaceHash(hashFor(TAP.store.get()));
      });
    }

    var first = TAP.store.get().view, firstHash = hashFor(TAP.store.get());
    if (!hashIs(firstHash)) replaceHash(firstHash);   // keeps the opening view out of the back-button history
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
    var old = mounted;
    mounted = null;
    if (old && old.handle && old.handle.destroy) old.handle.destroy();
    try { TAP.shell.unmount(); } catch (e) { /* no shell drawn */ }
  }

  TAP.app = { start: start, stop: stop, mountView: mountView, current: function () { return mounted && mounted.id; } };

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.getAttribute('data-autostart') === 'false') return;
    start();
  });
})(window.TAP);
