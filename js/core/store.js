/*
 * File: js/core/store.js
 * Purpose: Holds the shared app state (view, comparison, selections) and tells other parts when it changes.
 * Provides: TAP.store (get, set, on, reset, defaults), TAP.bus (on, off, emit)
 * Depends on: js/core/namespace.js
 * Used by: js/ui/app.js, the comparison bar, every panel and view
 */
(function (TAP) {
  'use strict';

  function defaults() {
    return {
      view: 'overview',
      cmp: { mode: 'all', focus: null, second: null, set: [], restAs: 'combined', restAgg: 'average' },
      industry: null,
      expanded: null,
      layer: null,
      highlight: null,
      hiddenInsights: [],
      scopeEpoch: 0
    };
  }

  var state = defaults();
  var subs = [];

  function get() { return state; }

  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // Merges a patch into the state. cmp is merged key by key.
  // Any change to the shared comparison or the view raises scopeEpoch, which clears per-panel overrides.
  function set(patch) {
    var next = {}, changed = [];
    Object.keys(state).forEach(function (k) { next[k] = state[k]; });
    Object.keys(patch || {}).forEach(function (k) {
      var v = patch[k];
      if (k === 'cmp') v = Object.assign({}, state.cmp, v);
      if (!same(state[k], v)) { next[k] = v; changed.push(k); }
    });
    if (!changed.length) return state;
    if (changed.indexOf('cmp') >= 0 || changed.indexOf('view') >= 0) {
      next.scopeEpoch = state.scopeEpoch + 1;
      if (changed.indexOf('scopeEpoch') < 0) changed.push('scopeEpoch');
    }
    state = next;
    notify(changed);
    return state;
  }

  function notify(changed) {
    subs.slice().forEach(function (fn) {
      try { fn(state, changed); } catch (e) { report(e); }
    });
  }

  // One failing subscriber must not stop the others; the error still reaches the console.
  function report(e) { setTimeout(function () { throw e; }, 0); }

  function on(fn) {
    subs.push(fn);
    return function () { subs = subs.filter(function (f) { return f !== fn; }); };
  }

  function reset() {
    state = defaults();
    notify(Object.keys(state));
    return state;
  }

  // Simple named events for one-off actions ("Show me", select an industry, open details, reset charts).
  var handlers = {};
  var bus = {
    on: function (name, fn) {
      (handlers[name] = handlers[name] || []).push(fn);
      return function () { bus.off(name, fn); };
    },
    off: function (name, fn) {
      handlers[name] = (handlers[name] || []).filter(function (f) { return f !== fn; });
    },
    emit: function (name, payload) {
      (handlers[name] || []).slice().forEach(function (fn) {
        try { fn(payload); } catch (e) { report(e); }
      });
    },
    clear: function () { handlers = {}; }
  };

  TAP.store = { get: get, set: set, on: on, reset: reset, defaults: defaults };
  TAP.bus = bus;
})(window.TAP);
