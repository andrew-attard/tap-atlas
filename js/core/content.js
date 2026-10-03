/*
 * File: js/core/content.js
 * Purpose: Gives every part of the app its wording, with the organization layer laid over the general one.
 * Provides: TAP.content (text, term, terms, guide, setting, regionName, orgError, mark)
 * Depends on: js/core/namespace.js, js/core/dom.js, content/ui-text.js, content/glossary.js, content/guide.js,
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

  // A region's display name: the organization layer's short name if it gives one, else the name in the data.
  function regionName(region) {
    if (!region) return '';
    var short = (org().regions || {})[region.id];
    return typeof short === 'string' && short ? short : region.name;
  }

  // ---- term marking (US-1.6.4) ----

  var WORD = 'A-Za-z0-9_\\u00C0-\\u024F';

  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // An acronym (two or more letters, all capitals, like ARR) matches only in capitals,
  // so "tap" the verb is never read as TAP.
  function isAcronym(w) { return /[A-Z].*[A-Z]/.test(w) && w === w.toUpperCase(); }

  // Every word that points at a glossary entry: lower-case form -> {id, exact}.
  // Organization entries go last, so they win when both layers use the same word.
  function wordMap() {
    var all = terms(), map = {};
    var ids = Object.keys(all).sort(function (x, y) {
      return (all[x].layer === 'organization' ? 1 : 0) - (all[y].layer === 'organization' ? 1 : 0);
    });
    ids.forEach(function (id) {
      [all[id].term].concat(all[id].aliases || []).forEach(function (w) {
        w = String(w || '').trim();
        if (w.length < 2) return;   // single letters (k, M) would mark too much
        map[w.toLowerCase()] = { id: id, exact: isAcronym(w) ? w : null };
      });
    });
    return map;
  }

  // Safe HTML for text, with the first use of each glossary term wrapped in a button.
  // seen is shared by every text in one panel, so a term is marked once per panel.
  function mark(text, seen) {
    var s = text == null ? '' : String(text), esc = TAP.dom.esc;
    seen = seen || {};
    var map = wordMap();
    var forms = Object.keys(map).sort(function (x, y) { return y.length - x.length; });   // longest first
    if (!s || !forms.length) return esc(s);
    var re = new RegExp('(?<![' + WORD + '])(' + forms.map(escRe).join('|') + ')(s?)(?![' + WORD + '])', 'gi');
    var out = '', last = 0, m;
    while ((m = re.exec(s))) {
      var hit = map[m[1].toLowerCase()];
      if (!hit || seen[hit.id] || (hit.exact && m[1] !== hit.exact)) continue;
      seen[hit.id] = true;
      out += esc(s.slice(last, m.index)) +
        '<button type="button" class="tap-term" data-term="' + esc(hit.id) + '">' + esc(m[0]) + '</button>';
      last = m.index + m[0].length;
    }
    return out + esc(s.slice(last));
  }

  TAP.content = {
    text: text, term: term, terms: terms, guide: guide, setting: setting, regionName: regionName,
    orgError: function () { org(); return orgError; },
    mark: mark
  };
})(window.TAP);
