/*
 * File: js/engine/custom.js
 * Purpose: Custom charts: the measure and dimension pairs each measure allows, a report definition built from a choice, and the session list (Epic 3.5).
 *          Everything is read from measure metadata (D68), so a new measure is offered without code. The definition
 *          depends only on {measure, by, type}, so a running-order step can carry it (D70).
 * Provides: TAP.custom (options, definition, types, byLabel, saved, save, remove)
 * Depends on: js/engine/measures.js, js/engine/registry.js, js/engine/shapes.js, js/core/content.js (at call time)
 * Used by: js/ui/custom-builder.js, js/ui/present.js (custom steps)
 * Owner: CUSTOM stream (#250)
 */
(function (TAP) {
  'use strict';

  function t(key, vars) { return TAP.content.text('custom.' + key, vars); }
  // Lower-cases the first letter for use mid-sentence, but leaves acronyms such as ARR alone.
  function lower(s) { return !s ? '' : /^[A-Z][A-Z0-9]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); }

  // Text and categories can't be drawn as a value on an axis (US-3.5.2).
  var NOT_VALUES = ['text', 'category'];
  // Compare types a one-measure chart never offers: a radar draws several measures as its axes, a bubble needs a
  // size measure. With a second dimension, plain bars would draw the same grouped bars twice.
  var NEVER = ['radar', 'bubble'];

  // Figures that exist only for one industry (ctx.industryId): the ind.* measures, or any measure whose
  // metadata says it needs an industry. They have no region total, so they are offered by industry only.
  function perIndustry(m) { return (m.needs || []).indexOf('industry') >= 0 || /^ind\./.test(m.id); }

  // What a measure can be shown by: regions, then each breakdown dimension it lists in meta.dims.
  function byOf(m) {
    var dims = (m.dims || []).filter(function (d) { return TAP.reports.BREAKDOWNS.indexOf(d) >= 0; });
    if (perIndustry(m)) return dims.indexOf('industry') >= 0 ? ['industry'] : [];
    return ['entity'].concat(dims);
  }

  function options() {
    return TAP.measures.list().map(TAP.measures.meta).filter(function (m) {
      return m && NOT_VALUES.indexOf(m.valueKind) < 0;
    }).map(function (m) {
      return { measureId: m.id, label: m.label, short: m.short, dims: (m.dims || []).slice(), unit: m.unit,
        valueKind: m.valueKind, kind: m.kind, by: byOf(m) };
    }).filter(function (o) { return o.by.length > 0; });   // nothing to show it by: not offered
  }

  // The chart types for a choice of "by", from the compare shape's list and the D18 rules in TAP.shapes.types.
  function types(by) {
    var bd = by && by !== 'entity' ? by : null;
    var draft = { shape: 'compare', types: TAP.reports.SHAPE_TYPES.compare.slice() };
    return TAP.shapes.types(draft, 1, { breakdown: bd }).filter(function (x) {
      return NEVER.indexOf(x) < 0 && !(bd && x === 'bar');
    });
  }

  function byLabel(by) {
    return by === 'entity' ? t('by.entity') : TAP.content.text('panel.breakdowns.' + by);
  }
  // How combined figures are made, in the words of the measure's own US-1.2.5 rule.
  function combineWord(m) {
    if (m.combine === 'ratioOfSums') return 'ratio';
    return m.valueKind === 'rate' || m.valueKind === 'rating' ? m.valueKind : 'sum';
  }
  function typeLabel(type) { return TAP.reports.TYPES.indexOf(type) >= 0 ? TAP.shapes.label(type) : String(type); }

  /*
   * A report definition for {measure, by, type}, or {errors} in plain words. The shape is compare: by regions, or
   * with the dimension as its breakdown. Combined values follow the measure's own US-1.2.5 rule, so rates and
   * ratings are never summed. The definition passes TAP.reports.validate before it is returned.
   */
  function definition(spec) {
    spec = spec || {};
    var m = spec.measure ? TAP.measures.meta(spec.measure) : null;
    if (!m) return { errors: [t('errors.measure', { id: String(spec.measure || '') })] };
    if (NOT_VALUES.indexOf(m.valueKind) >= 0) return { errors: [t('errors.notValue', { measure: m.label })] };
    var bys = byOf(m), by = spec.by || bys[0];
    if (!by) return { errors: [t('errors.noBy', { measure: m.label })] };
    if (bys.indexOf(by) < 0) return { errors: [t('errors.by', { measure: m.label, by: lower(byLabel(by)) })] };
    var list = types(by), type = spec.type || list[0];
    if (list.indexOf(type) < 0) return { errors: [t('errors.type', { type: typeLabel(type), by: lower(byLabel(by)) })] };
    var bd = by === 'entity' ? [] : [by];
    var def = {
      id: 'custom:' + m.id + ':' + by, custom: true, spec: { measure: m.id, by: by, type: type },
      view: 'guide', title: t('title', { measure: m.label, by: lower(byLabel(by)) }),
      explain: {
        shows: t('explain.shows', { measure: lower(m.label), by: lower(byLabel(by)) }),
        read: t(by === 'entity' ? 'explain.readEntity' : 'explain.readBy', { by: lower(byLabel(by)) }),
        lookFor: t('explain.combine.' + combineWord(m))
      },
      shape: 'compare', builder: null, dimension: 'entity', measures: [{ id: m.id, label: m.label }],
      defaultType: type, types: list, breakdowns: bd, defaultBreakdown: bd[0] || null,
      sources: [m.kind], options: {}
    };
    var errors = TAP.reports.validate(def);
    return errors.length ? { errors: errors } : def;
  }

  /* ---------- the session list (US-3.5.3) ---------- */

  // Held in memory only, never in browser storage, so nothing is kept after the tab closes.
  var MAX = 6, kept = [];

  function saved() { return kept.map(function (x) { return Object.assign({}, x); }); }

  // Keeps a chart that can be drawn. The same chart twice is kept once. A seventh is refused with a message.
  // Returns {ok, index} or {ok: false, message}.
  function save(spec) {
    var def = definition(spec);
    if (def.errors) return { ok: false, message: def.errors[0] };
    var s = def.spec, at = -1;
    kept.forEach(function (x, i) { if (x.measure === s.measure && x.by === s.by && x.type === s.type) at = i; });
    if (at >= 0) return { ok: true, index: at };
    if (kept.length >= MAX) return { ok: false, message: t('list.full', { n: MAX }) };
    kept.push(Object.assign({}, s));
    return { ok: true, index: kept.length - 1 };
  }

  // Removes the chart at place i and returns it, or null when there is none.
  function remove(i) { return i >= 0 && i < kept.length ? kept.splice(i, 1)[0] : null; }

  TAP.custom = { options: options, definition: definition, types: types, byLabel: byLabel,
    saved: saved, save: save, remove: remove };
})(window.TAP);
