/*
 * File: js/engine/registry.js
 * Purpose: Keeps the lists of reports, chart builders and views, and checks report definitions before use.
 * Provides: TAP.reports (get, list, all, validate, measureIds, SHAPES, TYPES, SHAPE_TYPES), TAP.builders (register, get, names), TAP.views (register, get, order, list)
 * Depends on: js/core/namespace.js, config/reports-*.js (window.TAP_REPORTS), config/views.js (window.TAP_VIEWS),
 *             js/engine/measures.js (validate, at call time)
 * Used by: js/panel/panel.js, js/ui/app.js, js/ui/shell.js, js/ui/explain.js, js/engine/prepare.js,
 *          js/engine/shapes.js, js/insights/engine.js, every builder and view file
 */
(function (TAP) {
  'use strict';

  var SHAPES = ['compare', 'parts', 'xy', 'xyz', 'grid', 'years', 'spread', 'list'];
  var TYPES = ['bar', 'groupedBar', 'stackedBar', 'stacked100', 'treemap', 'dot', 'radar', 'scatter', 'bubble',
    'heatmap', 'bubbleGrid', 'line', 'table', 'list'];

  // The chart types each data shape allows (D18). 'groupedBar' appears once a breakdown is chosen.
  var SHAPE_TYPES = {
    compare: ['bar', 'groupedBar', 'dot', 'radar', 'table'],
    parts: ['stackedBar', 'stacked100', 'groupedBar', 'treemap', 'bubble', 'table'],
    xy: ['scatter', 'table'],
    xyz: ['bubble', 'scatter', 'table'],
    grid: ['heatmap', 'bubbleGrid', 'table'],
    years: ['line', 'groupedBar', 'table'],
    spread: ['dot', 'table'],
    list: ['list']              // a list of rows is its own table (US-2.7.2): no chart types, no table switch
  };

  /* ---------- reports ---------- */

  function all() { return window.TAP_REPORTS || {}; }
  function get(id) { return all()[id] || null; }

  // Report definitions for a view, in the order the view lists them.
  function list(viewId) {
    var v = (window.TAP_VIEWS || {})[viewId];
    return v && v.reports ? v.reports.map(get).filter(Boolean) : [];
  }

  // Returns a list of plain error messages; an empty list means the definition can be used.
  function validate(def) {
    var e = [];
    if (!def || typeof def !== 'object') return ['The report definition is missing.'];
    ['id', 'view', 'title', 'shape', 'defaultType'].forEach(function (k) {
      if (!def[k]) e.push('"' + k + '" is required.');
    });
    if (def.shape && SHAPES.indexOf(def.shape) < 0) e.push('"shape" must be one of: ' + SHAPES.join(', ') + '.');
    if (!def.explain || !def.explain.shows || !def.explain.read || !def.explain.lookFor) {
      e.push('"explain" needs "shows", "read" and "lookFor".');
    }
    if (!Array.isArray(def.types) || !def.types.length) e.push('"types" must list at least one chart type.');
    else {
      def.types.forEach(function (t) {
        if (TYPES.indexOf(t) < 0) e.push('Unknown chart type "' + t + '".');
        else if (SHAPE_TYPES[def.shape] && SHAPE_TYPES[def.shape].indexOf(t) < 0) {
          e.push('Chart type "' + t + '" doesn’t suit the "' + def.shape + '" shape.');
        }
      });
      if (def.types.indexOf('table') < 0 && def.shape !== 'list') e.push('"types" must include "table" (a table view is always available).');
      if (def.defaultType && def.types.indexOf(def.defaultType) < 0) e.push('"defaultType" must be one of "types".');
    }
    if (!def.builder && def.shape !== 'list' && (!Array.isArray(def.measures) || !def.measures.length)) e.push('"measures" must list at least one measure.');
    if (def.shape === 'list') {
      if (['newBusiness', 'accounts', 'partners'].indexOf(def.rows) < 0) e.push('A list needs "rows": newBusiness, accounts or partners.');
      if (!Array.isArray(def.columns) || !def.columns.length) e.push('A list needs "columns".');
    }
    if (def.builder && !TAP.builders.get(def.builder)) e.push('No chart builder called "' + def.builder + '".');
    if (Array.isArray(def.breakdowns) && def.breakdowns.length > 0 && typeof def.breakdowns[0] !== 'string') {
      e.push('"breakdowns" must be a list of names.');
    }
    if (def.types && def.types.indexOf('bubble') >= 0 && !(def.size && def.size.options && def.size.options.length)) {
      e.push('A bubble chart needs "size.options".');
    }
    if (def.shape === 'parts' && def.types && def.types.indexOf('bubble') >= 0 && !(def.x && def.y)) {
      e.push('A bubble view of a "parts" report needs "x" and "y".');
    }
    if (TAP.measures && !TAP.measures.__stub) {
      measureIds(def).forEach(function (id) {
        if (!TAP.measures.meta(id)) e.push('Unknown measure "' + id + '".');
      });
    }
    return e;
  }

  // Every measure id a definition names: measures, parts, axes and sizes.
  function measureIds(def) {
    var ids = (def.measures || []).map(function (m) { return m.id; });
    Object.keys(def.parts || {}).forEach(function (k) { ids = ids.concat(def.parts[k]); });
    if (def.x) ids.push(def.x);
    if (def.y) ids.push(def.y);
    if (def.size && def.size.options) ids = ids.concat(def.size.options);
    return ids.filter(function (id, i) { return ids.indexOf(id) === i; });
  }

  /* ---------- builders ---------- */

  var builders = {};
  var builderApi = {
    register: function (name, fn) { builders[name] = fn; },
    get: function (name) { return builders[name] || null; },
    names: function () { return Object.keys(builders); }
  };

  /* ---------- views ---------- */

  var views = {};
  var viewApi = {
    register: function (id, spec) { views[id] = spec; },
    get: function (id) { return views[id] || null; },
    // View ids in menu order: the configured order, keeping only views that exist.
    order: function () {
      var cfg = (window.TAP_VIEWS && window.TAP_VIEWS.order) || Object.keys(views);
      return cfg.filter(function (id) { return !!views[id]; });
    },
    // Menu title: the configured title wins, then the view's own.
    title: function (id) {
      var cfg = window.TAP_VIEWS && window.TAP_VIEWS[id];
      return (cfg && cfg.title) || (views[id] && views[id].title) || id;
    },
    list: function () { return Object.keys(views); }
  };

  TAP.reports = { get: get, list: list, all: all, validate: validate, measureIds: measureIds,
    SHAPES: SHAPES, TYPES: TYPES, SHAPE_TYPES: SHAPE_TYPES };
  TAP.builders = builderApi;
  TAP.views = viewApi;
})(window.TAP);
