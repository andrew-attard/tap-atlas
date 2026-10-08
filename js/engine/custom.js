/*
 * File: js/engine/custom.js
 * Purpose: Custom charts: the measure and dimension pairs each measure allows, a report definition built from a choice, and the session list (Epic 3.5).
 *          Everything is read from measure metadata (D68), so a new measure is offered without code. A choice starts
 *          from the question (D140): compare regions, break one region down, or see the plan years. The definition
 *          depends only on {ask, measure, by, type, region}, so a running-order step can carry it (D70); an older
 *          step with {measure, by, type} alone still reads.
 * Provides: TAP.custom (options, definition, types, byLabel, askOf, byFor, fits, ASKS, saved, save, remove)
 * Depends on: js/engine/measures.js, measures-p4.js (available), js/engine/prepare.js (dimHasData), js/engine/registry.js,
 *             js/engine/shapes.js, js/core/data.js, js/core/store.js (defaults), js/core/content.js (at call time)
 * Used by: js/ui/custom-builder.js, custom-controls.js, js/ui/present-steps.js (custom steps), js/engine/build-custom-one.js
 * Owner: CUSTOM stream (#250)
 */
(function (TAP) {
  'use strict';

  function t(key, vars) { return TAP.content.text('custom.' + key, vars); }
  function lower(s) { return TAP.shapes.kit.lower(s); }   // mid-sentence lower case, acronyms kept (one copy, in the kit)

  // The three questions a chart can start from (D140), in screen order
  var ASKS = ['regions', 'one', 'years'];
  // Text and categories can't be drawn as a value on an axis (US-3.5.2).
  var NOT_VALUES = ['text', 'category'];
  // The chart of each question: plain bars, or grouped bars with one bar per plan year. "Bar" on screen means
  // either; a dot plot asked for by an older kept chart or step draws as bars too (D140).
  var CHART = { regions: 'bar', one: 'bar', years: 'groupedBar' }, BARS = ['bar', 'groupedBar', 'dot'];

  // Figures that exist only for one industry (ctx.industryId): the ind.* measures, or any measure whose
  // metadata says it needs an industry. They have no region total, so they are offered by industry only.
  function perIndustry(m) { return (m.needs || []).indexOf('industry') >= 0 || /^ind\./.test(m.id); }

  // What a measure can be shown by: regions, then each breakdown dimension it lists in meta.dims.
  function byOf(m) {
    // A Phase 4 dimension only when the file has data under it for this measure (e.g. new business by solution)
    var dims = (m.dims || []).filter(function (d) { return TAP.reports.BREAKDOWNS.indexOf(d) >= 0 && TAP.prepare.dimHasData(m.id, d); });
    if (perIndustry(m)) return dims.indexOf('industry') >= 0 ? ['industry'] : [];
    return ['entity'].concat(dims);
  }

  // A measure for a part of the template a file may not have (meta.optional, Phase 4) is offered only when some
  // region has a value for it, so no choice ever draws an empty chart and an earlier file reads as before.
  function hasData(m) { return !m.optional || TAP.measures.available(m.id); }

  function options() {
    return TAP.measures.list().map(TAP.measures.meta).filter(function (m) {
      return m && NOT_VALUES.indexOf(m.valueKind) < 0 && hasData(m);
    }).map(function (m) {
      return { measureId: m.id, label: m.label, short: m.short, dims: (m.dims || []).slice(), unit: m.unit,
        valueKind: m.valueKind, kind: m.kind, by: byOf(m) };
    }).filter(function (o) { return o.by.length > 0; });   // nothing to show it by: not offered
  }

  // The question a spec starts from: its own, else the one its dimension implies (an older spec, before D140).
  function askOf(spec) {
    spec = spec || {};
    if (ASKS.indexOf(spec.ask) >= 0) return spec.ask;
    return spec.by === 'year' ? 'years' : spec.by && spec.by !== 'entity' ? 'one' : 'regions';
  }
  // What a list of "by" choices (an option's, or a measure's) offers for a question: regions, the measure's own
  // dimensions, or the plan years. Empty when the measure has no fit.
  function byFor(by, ask) {
    by = Array.isArray(by) ? by : (by && by.by) || [];
    if (ask === 'regions') return by.indexOf('entity') >= 0 ? ['entity'] : [];
    if (ask === 'years') return by.indexOf('year') >= 0 ? ['year'] : [];
    return by.filter(function (b) { return b !== 'entity'; });
  }
  function fits(by, ask) { return byFor(by, ask).length > 0; }

  // The chart types for a question (or for an older spec's "by"): its bars, and the table.
  function types(ask) {
    if (ASKS.indexOf(ask) < 0) ask = askOf({ by: ask });
    return [CHART[ask], 'table'];
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
  function regionName(id) { return TAP.content.regionName(TAP.data.region(id)); }

  // The one region a "Break one region down" chart is fixed to, as a comparison the panel takes (opts.cmp).
  function fixedCmp(region) { return Object.assign({}, TAP.store.defaults().cmp, { mode: 'set', set: [region], focus: region }); }

  function title(ask, m, by, region) {
    if (ask === 'years') return t('titleYears', { measure: m.label });
    if (region) return t('titleOne', { region: regionName(region), measure: lower(m.label), by: lower(byLabel(by)) });
    return t('title', { measure: m.label, by: lower(byLabel(by)) });
  }
  function explain(ask, m, by, region) {
    var vars = { measure: lower(m.label), by: lower(byLabel(by)), region: region ? regionName(region) : '' };
    return {
      shows: t('explain.shows', vars),
      read: t(ask === 'regions' ? 'explain.readEntity' : region ? 'explain.readOne' : 'explain.readBy', vars),
      lookFor: t('explain.combine.' + combineWord(m))
    };
  }

  /*
   * A report definition for {ask, measure, by, type, region}, or {errors} in plain words. The shape is compare: by
   * regions, with the plan years as a breakdown, or with the measure's dimension as its breakdown for one region
   * (its own builder sorts the bars, build-custom-one.js; a fixed comparison in def.cmp). Combined values follow
   * the measure's own US-1.2.5 rule, so rates and ratings are never summed. The definition passes
   * TAP.reports.validate before it is returned. def.spec is the choice in full, as a step or kept chart stores it.
   */
  function definition(spec) {
    spec = spec || {};
    var m = spec.measure ? TAP.measures.meta(spec.measure) : null;
    if (!m) return { errors: [t('errors.measure', { id: String(spec.measure || '') })] };
    if (NOT_VALUES.indexOf(m.valueKind) >= 0) return { errors: [t('errors.notValue', { measure: m.label })] };
    var ask = askOf(spec), bys = byFor(byOf(m), ask), by = spec.by && ask !== 'regions' && ask !== 'years' ? spec.by : bys[0];
    if (!bys.length) return { errors: [t(ask === 'years' ? 'errors.noYears' : ask === 'one' ? 'errors.noDims' : 'errors.noRegions', { measure: m.label })] };
    if (bys.indexOf(by) < 0) return { errors: [t('errors.by', { measure: m.label, by: lower(byLabel(by)) })] };
    var chart = CHART[ask], type = spec.type == null || BARS.indexOf(spec.type) >= 0 ? chart : spec.type;
    if (type !== chart && type !== 'table') return { errors: [t('errors.type', { type: typeLabel(type), by: lower(byLabel(by)) })] };
    var region = ask === 'one' && spec.region != null ? String(spec.region) : null;
    if (region && !TAP.data.region(region)) return { errors: [t('errors.region', { id: region })] };
    var out = { ask: ask, measure: m.id, by: by, type: type };
    if (region) out.region = region;
    var bd = by === 'entity' ? [] : [by];
    var def = {
      id: 'custom:' + m.id + ':' + by + (region ? ':' + region : ''), custom: true, spec: out,
      view: 'guide', title: title(ask, m, by, region), explain: explain(ask, m, by, region),
      shape: 'compare', builder: ask === 'one' ? 'customOne' : null, dimension: 'entity', measures: [{ id: m.id, label: m.label }],
      defaultType: type, types: [chart, 'table'], breakdowns: bd, defaultBreakdown: bd[0] || null,
      sources: [m.kind], options: {}
    };
    if (region) def.cmp = fixedCmp(region);
    var errors = TAP.reports.validate(def);
    return errors.length ? { errors: errors } : def;
  }

  /* ---------- the session list (US-3.5.3) ---------- */

  // Held in memory only, never in browser storage, so nothing is kept after the tab closes.
  var MAX = 6, kept = [];

  function saved() { return kept.map(function (x) { return Object.assign({}, x); }); }
  function sameSpec(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // Keeps a chart that can be drawn. The same chart twice is kept once. A seventh is refused with a message.
  // Returns {ok, index} or {ok: false, message}.
  function save(spec) {
    var def = definition(spec);
    if (def.errors) return { ok: false, message: def.errors[0] };
    var s = def.spec, at = -1;
    kept.forEach(function (x, i) { if (sameSpec(x, s)) at = i; });
    if (at >= 0) return { ok: true, index: at };
    if (kept.length >= MAX) return { ok: false, message: t('list.full', { n: MAX }) };
    kept.push(Object.assign({}, s));
    return { ok: true, index: kept.length - 1 };
  }

  // Removes the chart at place i and returns it, or null when there is none.
  function remove(i) { return i >= 0 && i < kept.length ? kept.splice(i, 1)[0] : null; }

  TAP.custom = { options: options, definition: definition, types: types, byLabel: byLabel, askOf: askOf, byFor: byFor, fits: fits,
    ASKS: ASKS.slice(), saved: saved, save: save, remove: remove };
})(window.TAP);
