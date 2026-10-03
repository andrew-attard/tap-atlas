/*
 * File: js/ui/explain.js
 * Purpose: Opens a report's plain-English explanation: what it shows, how to read it, what to look for, plus how
 *          any score or combined figure on it is built (US-1.6.5).
 * Provides: TAP.explain (open, sections)
 * Depends on: js/ui/layers.js, js/core/dom.js, js/core/content.js, js/core/format.js, js/core/store.js,
 *             js/core/data.js, js/engine/registry.js (reports), js/engine/scope.js, js/engine/measures.js,
 *             js/engine/aggregate.js (weightBy), config/settings.js (score weights)
 * Used by: js/panel/panel-menus.js (the explanation icon)
 *
 * open(reportId, opts) shows the side panel. opts.cmp is the panel's own comparison when it has one; otherwise the
 * shared comparison is used, and the panel follows it while open. sections(reportId, cmp) returns what the panel
 * shows as [{key, title, paras}], so it can be checked without drawing.
 */
(function (TAP) {
  'use strict';

  var SCORES = { 'ind.attractiveness': 'attractiveness', 'ind.ability': 'ability' };

  function t(key, vars) { return TAP.content.text('explain.' + key, vars); }

  // "Target accounts" reads as "target accounts" mid-sentence; acronyms such as ARR keep their capitals.
  function lower(s) {
    s = String(s || '');
    return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  }

  function label(id) {
    var m = TAP.measures.meta(id);
    return m ? m.label : id;
  }

  // Every measure id the report draws: its measures, axes, size options and stacked parts.
  function measureIds(def) {
    var ids = (def.measures || []).map(function (m) { return m.id; });
    [def.x, def.y].forEach(function (id) { if (id) ids.push(id); });
    Object.keys(def.parts || {}).forEach(function (k) { ids = ids.concat(def.parts[k]); });
    return ids.filter(function (id, i) { return ids.indexOf(id) === i; });
  }

  // How each score the report uses is built, from the weights in config/settings.js.
  function scoreParas(def) {
    var used = measureIds(def).filter(function (id) { return SCORES[id]; });
    if (!used.length) return [];
    var set = (window.TAP_SETTINGS && window.TAP_SETTINGS.scores) || {};
    var paras = used.map(function (id) {
      var w = set[SCORES[id]] || {};
      var fields = Object.keys(w).filter(function (f) { return w[f] > 0; });
      var equal = fields.every(function (f) { return w[f] === w[fields[0]]; });
      var names = fields.map(function (f) {
        var name = label('ind.' + f);
        return equal ? name : t('weightItem', { rating: name, w: TAP.format.num(w[f]) });
      });
      return t(equal ? 'scoreEqual' : 'scoreWeighted', { score: label(id), ratings: TAP.format.list(names) });
    });
    // Written as 2.0, as on the chart's dividing lines (format.num would drop the trailing zero)
    var mid = typeof set.midpoint === 'number' ? set.midpoint : 2;
    return paras.concat(t('scoreMidpoint', { midpoint: mid.toFixed(1) }), t('scoreBlank'));
  }

  // What each combined figure in this comparison means, and how this report's rates and ratings are combined.
  function combinedParas(def, cmp) {
    var combined = TAP.scope.entities(cmp).filter(function (e) { return e.kind === 'combined'; });
    if (!combined.length) return [t('noCombined')];
    var paras = combined.map(function (e) {
      var how = TAP.content.text(e.how === 'total' ? 'combined.explainTotal' : 'combined.explainAverage');
      return t('combinedLine', { label: e.label, how: how });
    });
    var weights = (def.options && def.options.weights) || {}, rating = false;
    measureIds(def).forEach(function (id) {
      var m = TAP.measures.meta(id);
      if (!m) return;
      if (m.valueKind === 'rating') rating = true;
      var wb = m.valueKind === 'rate' ? TAP.agg.weightBy(id, weights) : null;
      if (wb) paras.push(t('rateWeight', { measure: m.label, weight: lower(label(wb)) }));
    });
    if (rating) paras.push(t('ratingRange'));
    return paras;
  }

  function sections(reportId, cmp) {
    var def = TAP.reports.get(reportId);
    if (!def || !def.explain) return [];
    var out = [
      { key: 'shows', title: t('shows'), paras: [def.explain.shows] },
      { key: 'read', title: t('read'), paras: [def.explain.read] },
      { key: 'lookFor', title: t('lookFor'), paras: [def.explain.lookFor] }
    ];
    var scores = scoreParas(def);
    if (scores.length) out.push({ key: 'scores', title: t('scores'), paras: scores });
    out.push({ key: 'combined', title: t('combined'), paras: combinedParas(def, cmp || TAP.store.get().cmp) });
    return out;
  }

  // The report title, with {industry} filled in from the Industry view's choice.
  function reportTitle(def) {
    var id = TAP.store.get().industry, ind = id ? TAP.data.industry(id) : null;
    return String(def.title || '').replace('{industry}', ind ? ind.name : t('anIndustry'));
  }

  // Terms are marked once across the whole panel, so the seen list is shared by every paragraph.
  function draw(body, reportId, cmp) {
    var el = TAP.dom.el, def = TAP.reports.get(reportId), seen = {};
    TAP.dom.clear(body);
    if (!def || !def.explain) {
      body.appendChild(el('p', { class: 'tap-explain__para' }, t('unknown')));
      return;
    }
    body.appendChild(el('p', { class: 'tap-explain__report' }, reportTitle(def)));
    sections(reportId, cmp).forEach(function (s) {
      var sec = el('section', { class: 'tap-explain__sec', 'data-explain': s.key },
        el('h3', { class: 'tap-explain__head' }, s.title));
      s.paras.forEach(function (p) { sec.appendChild(TAP.dom.html(el('p', { class: 'tap-explain__para' }), TAP.content.mark(p, seen))); });
      body.appendChild(sec);
    });
  }

  // Redraws when the shared comparison changes, and stops listening once the panel is gone.
  function render(body, reportId, own) {
    var cmp = own || null;
    draw(body, reportId, cmp);
    var off = TAP.store.on(function (state, changed) {
      if (!body.isConnected) { off(); return; }
      if (changed.indexOf('cmp') < 0 && changed.indexOf('industry') < 0) return;
      if (changed.indexOf('cmp') >= 0) cmp = null;   // a panel's own comparison ends when the shared one changes
      draw(body, reportId, cmp);
    });
  }

  function open(reportId, opts) {
    var own = opts && opts.cmp;
    TAP.layers.open('explain', { title: t('title'), reportId: reportId, render: function (body) { render(body, reportId, own); } });
  }

  TAP.explain = { open: open, sections: sections };
})(window.TAP);
