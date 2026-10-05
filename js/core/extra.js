/*
 * File: js/core/extra.js
 * Purpose: The data side of extra template sections (US-3.2.1): the sections the data file declares in
 *          meta.extraSections, their rows per region as a TAP.rows source ("extra:<id>"), each value as a cell with
 *          its source, and the contract check for them, which only ever warns.
 * Provides: TAP.extra (sections, section, any, is, sourceOf, list, columns, cell, rowSrc, rowName, sourceMap, check, UNITS, KINDS)
 * Depends on: js/core/data.js, js/core/content.js, content/text-extra.js and content/text-data.js (all at call time)
 * Used by: js/engine/rows.js (extra row sources), js/core/sources.js (addresses), js/core/check.js (warnings),
 *          js/views/other.js, js/reports/details-rows.js
 * Owner: EXTRA stream (#237)
 *
 * A section is {id, title, intro, columns: [{key, label, unit, kind, column}]}; each region may carry
 * extra: {<id>: [{sourceRow, <key>: value}]} (docs/DATA-CONTRACT.md). Anything malformed is warned about by
 * check() and skipped quietly everywhere else, so a broken extra section never stops the app.
 */
(function (TAP) {
  'use strict';

  var UNITS = ['money', 'pct', 'count', 'text'], KINDS = ['IN', 'PRE', 'DER'], RESERVED = ['region', 'sourceRow'];
  var NUMERIC = { money: true, pct: true, count: true };
  var PREFIX = 'extra:';

  function t(key, vars) { return TAP.content.text('extra.' + key, vars); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function isStr(v) { return typeof v === 'string'; }
  function filled(v) { return isStr(v) && v.trim() !== ''; }
  function isRow(v) { return isNum(v) && v % 1 === 0; }

  /* ---------- the sections, cleaned ---------- */

  // The usable sections in file order: a text id seen once, and the columns with a usable key.
  function cleanSections(meta) {
    var list = isObj(meta) && Array.isArray(meta.extraSections) ? meta.extraSections : [], seen = Object.create(null);
    return list.filter(function (s) {
      if (!isObj(s) || !filled(s.id) || seen[s.id] || !Array.isArray(s.columns)) return false;
      return (seen[s.id] = true);
    }).map(function (s) {
      var keys = Object.create(null);
      var columns = s.columns.filter(function (c) {
        if (!isObj(c) || !filled(c.key) || keys[c.key] || RESERVED.indexOf(c.key) >= 0) return false;
        return (keys[c.key] = true);
      }).map(function (c) {
        return { key: c.key, label: filled(c.label) ? c.label : c.key, unit: UNITS.indexOf(c.unit) >= 0 ? c.unit : 'text',
          kind: KINDS.indexOf(c.kind) >= 0 ? c.kind : 'IN', column: filled(c.column) ? c.column : null };
      });
      return { id: s.id, title: filled(s.title) ? s.title : s.id, intro: isStr(s.intro) ? s.intro : '', columns: columns };
    });
  }

  function sections() { return cleanSections(TAP.data.meta()); }
  function section(id) { return sections().filter(function (s) { return s.id === id; })[0] || null; }
  function any() { return sections().length > 0; }
  function is(source) { return isStr(source) && source.indexOf(PREFIX) === 0; }
  function idOf(source) { return is(source) ? source.slice(PREFIX.length) : null; }
  function sourceOf(id) { return PREFIX + id; }

  /* ---------- rows, columns and cells (TAP.rows delegates here for "extra:<id>") ---------- */

  function itemsOf(regionId, id) {
    var r = TAP.data.region(regionId) || {}, x = isObj(r.extra) ? r.extra[id] : null;
    return (Array.isArray(x) ? x : []).filter(function (o) { return isObj(o) && isRow(o.sourceRow); })
      .slice().sort(function (a, b) { return a.sourceRow - b.sourceRow; });
  }

  // [{id, regionId, source, sourceRow, item}] in region file order, then source row order.
  function list(source, regionIds) {
    var id = idOf(source), out = [];
    if (!section(id)) return out;
    TAP.data.regions().forEach(function (reg) {
      if (regionIds && regionIds.indexOf(reg.id) < 0) return;
      itemsOf(reg.id, id).forEach(function (it) {
        out.push({ id: reg.id + ':' + it.sourceRow, regionId: reg.id, source: source, sourceRow: it.sourceRow, item: it });
      });
    });
    return out;
  }

  // The region first, then the section's columns in the order the data file gives them.
  function columns(source) {
    var s = section(idOf(source));
    if (!s) return [];
    return [{ key: 'region', unit: 'text', kind: 'PRE', label: t('region') }].concat(s.columns.map(function (c) {
      return { key: c.key, unit: c.unit, kind: c.kind, label: c.label };
    }));
  }

  // The column that names a row: the first text column, else the first column.
  function nameColumn(s) {
    var text = s.columns.filter(function (c) { return c.unit === 'text'; })[0];
    return text || s.columns[0] || null;
  }
  function rowName(source, item) {
    var s = section(idOf(source)), c = s && nameColumn(s), v = c && item ? item[c.key] : null;
    return v == null || v === '' ? null : String(v);
  }

  function src(source, regionId, field, n, kind) {
    return { regionId: regionId, section: source, field: field, row: n, rows: [n], year: null, cell: null, kind: kind };
  }
  function rowSrc(source, regionId, n) {
    var s = section(idOf(source)), c = s && nameColumn(s);
    return src(source, regionId, c ? c.key : null, n, c ? c.kind : 'IN');
  }

  // A full cell (ARCHITECTURE section 7). A value of the wrong type for its unit reads as not provided.
  function cell(source, key, row) {
    var s = section(idOf(source)), regionId = row && row.regionId;
    var n = row ? (row.sourceRow != null ? row.sourceRow : row.row) : null;
    var it = row && row.item ? row.item : itemsOf(regionId, idOf(source)).filter(function (o) { return o.sourceRow === n; })[0];
    var c = key === 'region' ? { key: 'region', unit: 'text', kind: 'PRE' } : s && s.columns.filter(function (x) { return x.key === key; })[0];
    var field = key === 'region' && s ? (nameColumn(s) || {}).key || null : key;
    var out = { v: null, state: 'notProvided', kind: c ? c.kind : 'IN', src: src(source, regionId, field, n, c ? c.kind : 'IN') };
    if (!c || !it) return out;
    var v = key === 'region' ? TAP.content.regionName(TAP.data.region(regionId)) : it[key];
    if (NUMERIC[c.unit] ? !isNum(v) : !(filled(v) || isNum(v))) return out;
    out.v = NUMERIC[c.unit] ? v : String(v);
    out.state = 'value';
    return out;
  }

  // The source map for an extra section: the title is the sheet, each column its letter (TAP.sources.address).
  function sourceMap(sectionName) {
    var s = section(idOf(sectionName)), cols = {};
    if (!s) return null;
    s.columns.forEach(function (c) { if (c.column) cols[c.key] = c.column; });
    return { sheet: s.title, columns: cols, extra: true };
  }

  /* ---------- the contract check: warnings only, never errors (US-3.2.1) ---------- */

  function described(v) {
    var say = function (k, vars) { return TAP.content.text('check.found.' + k, vars); };
    if (v === undefined) return say('nothing');
    if (Array.isArray(v)) return v.length ? say('list', { n: v.length }) : say('emptyList');
    if (isObj(v)) return say('object');
    return typeof v === 'number' && !isFinite(v) ? String(v) : JSON.stringify(v);
  }
  function orList(list) { return list.slice(0, -1).join(', ') + TAP.content.text('check.or') + list[list.length - 1]; }

  // [{path, region, item, expected, found, message}], in the shape TAP.check.run gives its warnings.
  function check(plan) {
    var out = [], known = Object.create(null);   // section id -> {name, keys}; ids from the file, so no prototype
    function warn(path, sec, expected, v, opts) {
      opts = opts || {};
      var plain = opts.plain || isObj(v) || Array.isArray(v) || v === undefined, text = opts.plain ? String(v) : described(v);
      var vars = { path: path, section: sec, expected: expected, found: text };
      out.push({ path: path, region: opts.region || null, item: opts.item || sec || null, expected: expected, found: plain ? text : v,
        message: sec ? t('check.message', vars) : TAP.content.text('check.message', vars) });
    }
    if (!isObj(plan) || !isObj(plan.meta)) return out;
    var list = plan.meta.extraSections;
    if (list !== undefined && !Array.isArray(list)) warn('meta.extraSections', null, t('check.list'), list);
    (Array.isArray(list) ? list : []).forEach(function (s, i) {
      var p = 'meta.extraSections[' + i + ']';
      if (!isObj(s)) return warn(p, null, t('check.section'), s);
      var name = filled(s.title) ? s.title : filled(s.id) ? s.id : '#' + (i + 1), keys = Object.create(null);
      if (!filled(s.id) || known[s.id]) warn(p + '.id', name, t('check.id'), s.id); else known[s.id] = { name: name, keys: keys };
      if (!filled(s.title)) warn(p + '.title', name, t('check.title'), s.title);
      if (s.intro != null && !isStr(s.intro)) warn(p + '.intro', name, t('check.intro'), s.intro);
      if (!Array.isArray(s.columns) || !s.columns.length) return warn(p + '.columns', name, t('check.columns'), s.columns);
      s.columns.forEach(function (c, k) {
        var cp = p + '.columns[' + k + ']';
        if (!isObj(c)) return warn(cp, name, t('check.column'), c);
        if (!filled(c.key) || keys[c.key] || RESERVED.indexOf(c.key) >= 0) warn(cp + '.key', name, t('check.key'), c.key); else keys[c.key] = c;
        if (!filled(c.label)) warn(cp + '.label', name, t('check.label'), c.label);
        if (UNITS.indexOf(c.unit) < 0) warn(cp + '.unit', name, t('check.unit', { list: orList(UNITS) }), c.unit);
        if (KINDS.indexOf(c.kind) < 0) warn(cp + '.kind', name, t('check.kind', { list: orList(KINDS) }), c.kind);
        if (c.column != null && !(isStr(c.column) && /^[A-Z]{1,3}$/.test(c.column))) warn(cp + '.column', name, t('check.letter'), c.column);
      });
    });
    (Array.isArray(plan.regions) ? plan.regions : []).forEach(function (r, i) {
      if (!isObj(r) || r.extra === undefined) return;
      var rp = 'regions[' + i + '].extra', region = isStr(r.name) ? r.name : isStr(r.id) ? r.id : null;
      if (!isObj(r.extra)) return warn(rp, null, t('check.extra'), r.extra, { region: region });
      Object.keys(r.extra).forEach(function (id) {
        var sp = rp + '.' + id, s = known[id], rows = r.extra[id];
        if (!s) return warn(sp, id, t('check.known'), id, { region: region, plain: true });
        var name = s.name, keys = s.keys;
        if (!Array.isArray(rows)) return warn(sp, name, t('check.rows'), rows, { region: region });
        rows.forEach(function (o, k) {
          var op = sp + '[' + k + ']', item = isObj(o) && isRow(o.sourceRow) ? t('sourceRow', { row: o.sourceRow }) : null;
          var at = { region: region, item: item };
          if (!isObj(o)) return warn(op, name, t('check.row'), o, at);
          if (!isRow(o.sourceRow)) warn(op + '.sourceRow', name, TAP.content.text('check.expect.sourceRow'), o.sourceRow, at);
          Object.keys(o).forEach(function (key) {
            if (key === 'sourceRow') return;
            var c = keys[key], v = o[key];
            if (!c) return warn(op, name, t('check.rowKey'), key, { region: region, item: item, plain: true });
            if (v === null || UNITS.indexOf(c.unit) < 0) return;
            if (NUMERIC[c.unit] ? !isNum(v) : !isStr(v)) warn(op + '.' + key, name, t(NUMERIC[c.unit] ? 'check.number' : 'check.text'), v, at);
          });
        });
      });
    });
    return out;
  }

  TAP.extra = { sections: sections, section: section, any: any, is: is, sourceOf: sourceOf, list: list, columns: columns,
    cell: cell, rowSrc: rowSrc, rowName: rowName, sourceMap: sourceMap, check: check, UNITS: UNITS, KINDS: KINDS,
    clean: cleanSections };
})(window.TAP);
