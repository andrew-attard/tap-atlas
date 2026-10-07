/*
 * File: js/panel/panel-build.js
 * Purpose: What a report panel draws: validates the report at the panel's drill level, works out its comparison,
 *          industry, chart types and highlight, and runs the builder. Every problem stays inside the panel.
 * Provides: TAP.panelBuild (build, builderOf, industryOf, oneIndustry, titleOf, cmpOf, highlightOf, ownMeasure, tabled)
 * Depends on: js/engine/registry.js, scope.js, js/core/data.js, content.js, js/panel/panel-menus.js,
 *             js/panel/panel-drill.js, js/theme.js (all at call time)
 * Used by: js/panel/panel.js, which passes its panel object p (p.id, p.opts, p.st, p.drill, p.size)
 */
(function (TAP) {
  'use strict';
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }

  function builderOf(def) { return TAP.builders.get(def.builder || (def.shape === 'xyz' ? 'xy' : def.shape)); }

  // Whether a report shows one industry at a time (the ratings).
  function oneIndustry(def) {
    var o = (def && def.options) || {};
    return !!def && (!!o.industryPicker || def.dimension === 'rating' || String(def.title || '').indexOf('{industry}') >= 0);
  }

  // The industry a panel shows or marks: its own (a step's, opts.industryId), else the one its page has in focus
  // (opts.industryOf(cmp), D105), else for a one-industry report the one selected, else the first rated.
  function industryOf(p, def, s) {
    if (!def) return null;
    var one = oneIndustry(def), rated = TAP.data.industries({ rated: true });
    var ok = function (id) { return !!id && rated.some(function (d) { return d.id === id; }); };
    var id = p.opts.industryId || (p.opts.industryOf ? p.opts.industryOf(cmpOf(p, s)) : null) || (one ? s.industry : null);
    if (ok(id)) return id;
    return one && rated[0] ? rated[0].id : null;
  }

  function titleOf(def, industryId) {
    if (!def || !def.title) return def ? def.id : '';
    var ind = industryId ? TAP.data.industry(industryId) : null;
    return def.title.replace(/\{industry\}/g, ind ? ind.name : '');
  }

  // The panel's comparison: its own override, else the one its page fixed (opts.cmp, #216), else the shared one.
  function cmpOf(p, s) { return p.st.custom || p.opts.cmp || s.cmp; }

  function ownMeasure(id, m) { var d = TAP.reports.get(id); return !!m && !!d && (d.measures || []).some(function (x) { return x.id === m; }); }

  // The panel's own highlight, else a "Show me" for this report. A panel kept apart from the shared state
  // (opts.local: a presentation step, D74) never takes one from the store.
  function highlightOf(p, s) {
    if (p.st.highlight) return p.st.highlight;
    return !p.opts.local && !p.drill.depth() && s.highlight && s.highlight.reportId === p.id ? s.highlight : null;
  }

  // Validates and builds. Returns {def, ctx, res, errors, types, ...}; every problem stays inside this panel.
  function build(p, s) {
    var cmp = cmpOf(p, s), key = JSON.stringify(cmp);
    if (p.cmpKey && p.cmpKey !== key) p.drill.top({ quiet: true });   // any comparison change: back to the top level
    p.cmpKey = key;
    var def = TAP.reports.get(p.drill.current()), errors = TAP.reports.validate(def);
    if (def && def.drill && !errors.length) errors = TAP.panelDrill.levels(def).errors;
    var industryId = errors.length ? null : industryOf(p, def, s), entities = TAP.scope.entities(cmp);
    if (def && !errors.length) TAP.panelMenus.fitBreakdown(def, p.st);   // a breakdown the measure doesn't list is dropped
    var types = def && !errors.length ? TAP.panelMenus.types(def, entities.length, p.st) : null;
    var ctx = def ? { def: def, type: types ? types.current : def.defaultType, measureId: p.st.measureId,
      sizeId: p.st.sizeId, breakdown: p.st.breakdown, cmp: cmp, entities: entities, year: null, industryId: industryId,
      highlight: highlightOf(p, s), expanded: s.expanded === p.id, theme: window.TAP_THEME, opts: Object.assign({}, p.st.opts),
      size: p.size || null, drill: p.drill.target() } : null;
    var res = null, fn = !errors.length && builderOf(def);
    if (!errors.length && !fn) errors = [t('noBuilder', { shape: def.shape })];
    if (fn) {
      try { res = fn(ctx) || {}; } catch (e) { errors = [e.message]; }
      if (res && res.error) errors = [res.error];
    }
    return { def: def, ctx: ctx, res: res, errors: errors, types: types, title: titleOf(def, industryId), industryId: industryId };
  }

  // The table view, unless the report is a list: a list is its own table (US-2.7.2).
  function tabled(p, b) { return !!(p.st.table && b.res && b.res.table && b.ctx.type !== 'list'); }

  TAP.panelBuild = { build: build, builderOf: builderOf, industryOf: industryOf, oneIndustry: oneIndustry, titleOf: titleOf, cmpOf: cmpOf,
    highlightOf: highlightOf, ownMeasure: ownMeasure, tabled: tabled };
})(window.TAP);
