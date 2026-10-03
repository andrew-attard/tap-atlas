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

  var PARTS = ['text', 'glossary', 'guide', 'regions', 'settings'];
  var cache = { src: undefined, n: -1, layer: {}, error: null };

  function base() { return window.TAP_CONTENT || {}; }
  function isObj(v) { return v != null && typeof v === 'object' && !Array.isArray(v); }

  // General wording only: used for the organization layer's own error message, so a broken layer can't hide it.
  function baseText(key, vars) {
    var s = pick(base().text || {}, key);
    if (s == null) return '[' + key + ']';
    return String(s).replace(/\{(\w+)\}/g, function (m, name) { return vars && vars[name] != null ? String(vars[name]) : m; });
  }

  // Guide sections: a list where every item has an id. Returns a problem or null.
  function badSections(g, part) {
    if (g[part] == null) return null;
    var path = 'guide.' + part + '.sections';
    if (!isObj(g[part])) return baseText('org.badPart', { part: 'guide.' + part });
    var secs = g[part].sections;
    if (secs == null) return null;
    var ok = Array.isArray(secs) && secs.every(function (x) { return isObj(x) && typeof x.id === 'string' && x.id; });
    return ok ? null : baseText('org.badList', { part: path });
  }

  // Everything wrong with an organization layer, as plain sentences. Empty when it can be used.
  function problems(o, scriptErrors) {
    var out = scriptErrors.map(function (d) { return baseText('org.script', { detail: d }); });
    if (o == null) return out;
    if (!isObj(o)) return out.concat(baseText('org.notObject'));
    Object.keys(o).forEach(function (k) {
      if (PARTS.indexOf(k) < 0) out.push(baseText('org.unknownPart', { part: k }));
      else if (!isObj(o[k])) out.push(baseText('org.badPart', { part: k }));
    });
    if (isObj(o.glossary)) {
      Object.keys(o.glossary).forEach(function (id) {
        var e = o.glossary[id];
        if (!isObj(e) || typeof e.term !== 'string' || typeof e.short !== 'string') out.push(baseText('org.badTerm', { id: id }));
      });
    }
    if (isObj(o.regions)) {
      Object.keys(o.regions).forEach(function (id) {
        if (typeof o.regions[id] !== 'string') out.push(baseText('org.badRegion', { id: id }));
      });
    }
    if (isObj(o.guide)) ['howTo', 'planning'].forEach(function (part) { var p = badSections(o.guide, part); if (p) out.push(p); });
    return out;
  }

  // The organization layer, or an empty one if it's missing or broken (US-1.6.6). A file with any problem is not
  // used at all, so half-loaded wording never mixes with the general layer. Checked once per TAP_ORG object.
  function org() {
    var o = window.TAP_ORG, errs = (TAP.orgWatch && TAP.orgWatch.errors) || [];
    if (o === cache.src && errs.length === cache.n) return cache.layer;
    var list = problems(o, errs);
    cache = { src: o, n: errs.length, layer: list.length ? {} : (o || {}), error: null };
    if (list.length) cache.error = baseText('org.error', { problems: list.join(' ') });
    return cache.layer;
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

  function indexOf(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }

  // One part of the Guide (howTo or planning) with the organization's sections laid over it, by id:
  // paragraphs replaces a section's text, addParagraphs adds to it, a new id adds a section (after: id places it).
  function mergePart(g, o) {
    var out = Object.assign({}, g, o);
    var secs = (g.sections || []).map(function (x) { return Object.assign({}, x); });
    (o.sections || []).forEach(function (x) {
      var i = indexOf(secs, x.id), add = x.addParagraphs || [];
      if (i >= 0) {
        var merged = Object.assign({}, secs[i], x, { layer: 'organization' });
        merged.paragraphs = (x.paragraphs || secs[i].paragraphs || []).concat(add);
        secs[i] = merged;
        return;
      }
      var s = Object.assign({ link: null }, x, { paragraphs: (x.paragraphs || []).concat(add), layer: 'organization' });
      var at = x.after ? indexOf(secs, x.after) : -1;
      if (at >= 0) secs.splice(at + 1, 0, s); else secs.push(s);
    });
    out.sections = secs;
    return out;
  }

  // The Guide text (content/guide.js documents the shape), with the organization layer's changes.
  function guide() {
    var g = base().guide || {}, o = org().guide || {};
    var out = Object.assign({}, g, o);
    ['howTo', 'planning'].forEach(function (part) { if (o[part]) out[part] = mergePart(g[part] || {}, o[part]); });
    return out;
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
    // The message for the data sources panel when the organization file is broken, or null.
    orgError: function () { org(); return cache.error; },
    mark: mark
  };
})(window.TAP);
