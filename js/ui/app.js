/*
 * File: js/ui/app.js
 * Purpose: Starts the app: checks the data, draws the shell, and swaps views when the menu or back button is used.
 * Provides: TAP.app (start, mountView, current)
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
    return patch;
  }

  function viewFromHash() {
    var id = (window.location.hash || '').replace(/^#\/?/, '');
    return TAP.views.get(id) ? id : null;
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
    if (changed.indexOf('view') < 0) return;
    if (viewFromHash() !== state.view) window.location.hash = state.view;
    mountView(state.view);
  }

  function start(opts) {
    opts = opts || {};
    root = opts.root || document.getElementById('app') || document.body;
    if (mounted && mounted.handle && mounted.handle.destroy) mounted.handle.destroy();
    mounted = null;

    var res = TAP.data.load(opts.plan);
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

    if (unsubscribe) unsubscribe();   // start() can run more than once (tests)
    unsubscribe = TAP.store.on(onState);
    if (!hashBound) {
      hashBound = true;
      window.addEventListener('hashchange', function () {
        var id = viewFromHash();
        if (id && id !== TAP.store.get().view) TAP.store.set({ view: id });
      });
    }

    var first = TAP.store.get().view;
    if (window.location.hash.replace('#', '') !== first) {
      // replaceState keeps the opening view out of the back-button history
      history.replaceState(null, '', window.location.pathname + window.location.search + '#' + first);
    }
    mountView(first);
    return res;
  }

  TAP.app = { start: start, mountView: mountView, current: function () { return mounted && mounted.id; } };

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.getAttribute('data-autostart') === 'false') return;
    start();
  });
})(window.TAP);
