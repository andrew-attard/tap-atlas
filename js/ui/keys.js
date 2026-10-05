/*
 * File: js/ui/keys.js
 * Purpose: Keyboard shortcuts for presenting: 1 to 9 open the views in menu order (TAP.views.order(), so a new
 *          view needs no change here; the Guide lists the keys from the same order), P starts presentation mode
 *          (US-3.1.2), and one Esc order across popovers, side panels and expanded charts.
 * Provides: TAP.keys (bind, unbind, viewFor)
 * Depends on: js/core/store.js, js/engine/registry.js (TAP.views), js/ui/layers.js, js/ui/present.js (all read at call time)
 * Used by: js/ui/app.js (bound at start-up)
 *
 * The Esc order: a glossary popover closes first (it listens in the capture phase), then a panel's or the
 * comparison bar's popover (they mark the Esc as handled), then the side panel, then the expanded chart. The tour
 * handles its own keys in the capture phase. Whoever handles an Esc calls preventDefault, so each Esc closes one thing.
 * The arrow keys that step through expanded charts belong to the panel (js/panel/panel.js). While presentation mode
 * runs, its keys are its own (D70), so nothing here acts.
 */
(function (TAP) {
  'use strict';

  var bound = null;

  // Typing in a field never switches views.
  function typing(node) {
    if (!node || !node.tagName) return false;
    return /^(input|select|textarea)$/i.test(node.tagName) || !!node.isContentEditable;
  }

  function tourOn() { return !!document.querySelector('.tap-tour, .tap-tour-welcome'); }

  // The view a digit key opens, or null.
  function viewFor(key) {
    if (!/^[1-9]$/.test(String(key))) return null;
    return TAP.views.order()[Number(key) - 1] || null;
  }

  function closeExpanded() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () { /* already out */ });
    TAP.store.set({ expanded: null });
  }

  function presenting() { return !!(TAP.present && !TAP.present.__stub && TAP.present.active()); }

  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || presenting()) return;
    if (e.key === 'Escape') {
      if (TAP.layers.top()) { e.preventDefault(); TAP.layers.close(); return; }
      if (TAP.store.get().expanded) { e.preventDefault(); closeExpanded(); }
      return;
    }
    if ((e.key === 'p' || e.key === 'P') && !typing(e.target) && !tourOn()) {
      e.preventDefault();
      TAP.present.start();   // the file's running order; if there is nothing to show, the Present button says why
      return;
    }
    var id = viewFor(e.key);
    if (!id || typing(e.target) || tourOn()) return;
    e.preventDefault();
    if (TAP.layers.top()) TAP.layers.close();
    if (TAP.store.get().view !== id) TAP.store.set({ view: id });
  }

  // Listens on window, after popovers on the document; safe to call again.
  function bind() {
    unbind();
    window.addEventListener('keydown', onKey);
    bound = onKey;
  }

  // Also ends a running presentation, so stopping the app (TAP.app.stop) never leaves its layer or keys behind.
  function unbind() {
    if (bound) window.removeEventListener('keydown', bound);
    bound = null;
    if (presenting()) TAP.present.stop();
  }

  TAP.keys = { bind: bind, unbind: unbind, viewFor: viewFor };
})(window.TAP);
