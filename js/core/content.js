/*
 * File: js/core/content.js
 * Purpose: Gives every part of the app its wording, with the organization layer laid over the general one.
 * Provides: TAP.content (text, term, terms, guide, setting, orgError, mark)
 * Depends on: js/core/namespace.js, content/ui-text.js, content/glossary.js, content/guide.js,
 *             content/organization.js (internal edition only)
 * Used by: every module that shows words on screen
 */
(function (TAP) {
  'use strict';

  var orgError = null;

  function base() { return window.TAP_CONTENT || {}; }

  // The organization layer, or an empty one if it's missing or broken (US-1.6.6).
  function org() {
    var o = window.TAP_ORG;
    orgError = null;
    if (o == null) return {};
    if (typeof o !== 'object') { orgError = 'The organization file did not set TAP_ORG to an object.'; return {}; }
    return o;
  }

  function pick(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }

  // Wording by key, e.g. text('scope.one.average', {focus: 'Region C', n: 6}).
  // A missing key comes back as "[key]" so gaps are easy to spot.
  function text(key, vars) {
    var s = pick(org().text || {}, key);
    if (s == null) s = pick(base().text || {}, key);
    if (s == null) return '[' + key + ']';
    return String(s).replace(/\{(\w+)\}/g, function (m, name) {
      return vars && vars[name] != null ? String(vars[name]) : m;
    });
  }

  // Merged glossary: organization entries win over general ones with the same id.
  function terms() {
    var out = {}, g = base().glossary || {}, o = org().glossary || {};
    Object.keys(g).forEach(function (id) { out[id] = Object.assign({ id: id, layer: 'general' }, g[id]); });
    Object.keys(o).forEach(function (id) { out[id] = Object.assign({ id: id }, out[id] || {}, o[id], { layer: 'organization' }); });
    return out;
  }

  // A glossary entry by id, term or alias (case-insensitive).
  function term(word) {
    var all = terms(), w = String(word || '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(all, word)) return all[word];
    // Organization entries first, so they win when an alias appears in both layers
    var list = Object.keys(all).map(function (id) { return all[id]; }).sort(function (a, b) {
      return (a.layer === 'organization' ? 0 : 1) - (b.layer === 'organization' ? 0 : 1);
    });
    return list.filter(function (t) {
      return String(t.term || '').toLowerCase() === w ||
        (t.aliases || []).some(function (a) { return String(a).toLowerCase() === w; });
    })[0] || null;
  }

  function guide() {
    return Object.assign({}, base().guide || {}, org().guide || {});
  }

  // An organization setting such as 'internalLabel'. Returns the fallback when not set.
  function setting(key, fallback) {
    var v = pick(org().settings || {}, key);
    return v == null ? fallback : v;
  }

  TAP.content = {
    text: text, term: term, terms: terms, guide: guide, setting: setting,
    orgError: function () { org(); return orgError; },
    // Marks the first use of each glossary term in a piece of text (US-1.6.4). Built by the CONTENT stream (#40).
    mark: TAP.stub.fn('TAP.content.mark', 40)
  };
})(window.TAP);
