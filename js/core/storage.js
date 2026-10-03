/*
 * File: js/core/storage.js
 * Purpose: Remembers small choices (like chart types) in this browser, and keeps working if storage is blocked.
 * Provides: TAP.storage (available, get, set, remove, clear)
 * Depends on: js/core/namespace.js
 * Used by: js/panel (chart-type choice), js/ui/tour.js, js/views/guide.js (reset)
 */
(function (TAP) {
  'use strict';

  var PREFIX = 'tap-atlas:';
  var memory = {};   // used when the browser blocks storage, so the session still behaves the same

  function store() {
    try {
      var s = window.localStorage;
      s.setItem(PREFIX + '_probe', '1');
      s.removeItem(PREFIX + '_probe');
      return s;
    } catch (e) {
      return null;
    }
  }

  function available() { return !!store(); }

  function get(key, fallback) {
    var s = store(), raw = memory[key];
    // This session's copy wins: it holds the latest value even if saving to the browser failed (storage full)
    if (raw == null && s) { try { raw = s.getItem(PREFIX + key); } catch (e) { raw = null; } }
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function set(key, value) {
    var raw = JSON.stringify(value), s = store();
    memory[key] = raw;
    try { if (s) s.setItem(PREFIX + key, raw); } catch (e) { /* storage full or blocked: memory copy is enough */ }
  }

  function remove(key) {
    var s = store();
    delete memory[key];
    try { if (s) s.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
  }

  // Removes every key starting with the given prefix (all of ours if none).
  function clear(prefix) {
    var full = PREFIX + (prefix || ''), s = store();
    Object.keys(memory).forEach(function (k) { if ((PREFIX + k).indexOf(full) === 0) delete memory[k]; });
    if (!s) return;
    try {
      for (var i = s.length - 1; i >= 0; i--) {
        var k = s.key(i);
        if (k && k.indexOf(full) === 0) s.removeItem(k);
      }
    } catch (e) { /* ignore */ }
  }

  TAP.storage = { available: available, get: get, set: set, remove: remove, clear: clear };
})(window.TAP);
