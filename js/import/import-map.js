/*
 * File: js/import/import-map.js
 * Purpose: Reads and validates the template mapping (config/import-map.js), fills its defaults, derives meta.sourceMap and
 *          meta.extraSections from it and matches a workbook's file name to a region; docs/ARCHITECTURE.md section 20.1.
 * Provides: TAP.importMap (get, problems, normalize, sourceMap, extraSections, matchRegion, glob, ROWS, GRIDS, REQUIRED)
 * Depends on: config/import-map.js, js/core/content.js, js/import/import-fields.js, content/text-import.js
 * Used by: js/import/import-plan.js, js/import/import-region.js, js/ui/import-panel.js
 * Owner: READ stream (#585)
 */
(function (TAP) {
  'use strict';

  var ROWS = ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners', 'baseYear'];
  var GRIDS = ['recap', 'revenue', 'booksValue', 'strategicPlan', 'routes'];
  var REQUIRED = ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners', 'recap'];
  // The order of meta.sourceMap, as the sample data writes it
  var ORDER = ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners', 'recap', 'revenue', 'booksValue', 'strategicPlan', 'routes', 'baseYear'];
  var BASE_LISTS = ['industries', 'productLines', 'channels', 'tiers', 'segments', 'scales'];
  var TYPES = ['arr', 'services', 'swPerpetual', 'hardware'], MOTIONS = ['newBusiness', 'customerGrowth'];
  var COL = /^[A-Z]{1,3}$/, CELL = /^[A-Z]{1,3}[1-9]\d*$/;
  var AXIS_FIELDS = { channel: 1, type: 1, route: 1, solution: 1, motion: 1, year: 1 };

  function t(key, vars) { return TAP.content.text('importPanel.read.map.' + key, vars); }
  function isObj(v) { return v != null && typeof v === 'object' && !Array.isArray(v); }
  function filled(v) { return typeof v === 'string' && v.trim() !== ''; }
  function isRow(v) { return typeof v === 'number' && isFinite(v) && v % 1 === 0 && v >= 1; }
  function isCol(v) { return typeof v === 'string' && COL.test(v); }
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  function ids(list) { return (Array.isArray(list) ? list : []).map(function (e) { return e && e.id; }); }

  function get() { return window.IMPORT_MAP || null; }

  // Three different whole numbers
  function goodYears(y) {
    if (!Array.isArray(y) || y.length !== 3 || !y.every(isRow)) return false;
    return y.filter(function (v, i) { return y.indexOf(v) === i; }).length === 3;
  }

  // The ids an axis field may take, or null for an unknown field
  function axisValues(field, map) {
    var lk = isObj(map.lookups) ? map.lookups : null;
    if (!lk) return field in AXIS_FIELDS ? false : null;   // no lookups at all: reported once, nothing to check against
    switch (field) {
      case 'channel': return Array.isArray(lk.channels) ? ids(lk.channels) : false;
      case 'type': return TYPES;
      case 'route': return ids(lk.routes);
      case 'solution': return [null].concat(ids(lk.solutions));
      case 'motion': return MOTIONS;
      // Without usable plan years (reported once already) the year values cannot be checked: false skips them
      case 'year': return isObj(map.meta) && goodYears(map.meta.years) ? map.meta.years : false;
      default: return null;
    }
  }

  // The fields and values of one axis (regular or enumerated), checked against the lookups
  function checkAxisFields(out, map, section, part, fields) {
    Object.keys(fields).forEach(function (field) {
      var allowed = axisValues(field, map);
      if (allowed === null) return out.push(t('axisField', { section: section, part: part, field: field }));
      if (!allowed) return;
      var values = Array.isArray(fields[field]) ? fields[field] : [fields[field]];
      values.forEach(function (v) {
        if (allowed.indexOf(v) < 0) out.push(t('axisValue', { section: section, field: field, value: String(v) }));
      });
    });
  }

  function checkAxes(out, map, section, part, spec) {
    var at = part === 'rows' ? 'row' : 'col';
    if (Array.isArray(spec)) {
      spec.forEach(function (e) {
        if (!isObj(e) || !(at === 'row' ? isRow(e.row) : isCol(e.col))) return out.push(t('axisEntry', { section: section, part: part, at: at }));
        var rest = Object.assign({}, e);
        delete rest[at];
        checkAxisFields(out, map, section, part, rest);
      });
      return;
    }
    if (!isObj(spec)) return out.push(t('axis', { section: section, part: part }));
    var firstOk = at === 'row' ? isRow(spec.first) : isCol(spec.first);
    if (!firstOk || !Array.isArray(spec.axes)) return out.push(t('axisFirst', { section: section, part: part }));
    spec.axes.forEach(function (ax) {
      if (!isObj(ax) || !filled(ax.field) || !Array.isArray(ax.values)) return out.push(t('axisFirst', { section: section, part: part }));
      var f = {};
      f[ax.field] = ax.values;
      checkAxisFields(out, map, section, part, f);
    });
  }

  function checkCells(out, section, cells) {
    if (cells === undefined || cells === null) return;
    var ok = isObj(cells) && Object.keys(cells).every(function (k) { return typeof cells[k] === 'string' && CELL.test(cells[k]); });
    if (!ok) out.push(t('cells', { section: section }));
  }

  function checkRowSection(out, map, name, s) {
    if (!filled(s.sheet)) out.push(t('sheet', { section: name }));
    if (!isRow(s.firstRow)) out.push(t('firstRow', { section: name }));
    if (!isObj(s.columns)) out.push(t('columns', { section: name }));
    else {
      Object.keys(s.columns).forEach(function (field) {
        var c = s.columns[field];
        var ok = isCol(c) || (Array.isArray(c) && c.length === 3 && c.every(isCol));
        if (!ok) out.push(t('column', { section: name, field: field }));
      });
    }
    checkCells(out, name, s.cells);
  }

  function checkGrid(out, map, name, s) {
    if (!filled(s.sheet)) out.push(t('sheet', { section: name }));
    if (s.filterCell != null && !(typeof s.filterCell === 'string' && CELL.test(s.filterCell))) out.push(t('filterCell', { section: name }));
    checkAxes(out, map, name, 'rows', s.rows);
    checkAxes(out, map, name, 'cols', s.cols);
    if (s.blank != null && s.blank !== 'null' && s.blank !== 'skip') out.push(t('blank', { section: name }));
    if (s.variance != null) {
      if (!isObj(s.variance)) out.push(t('axis', { section: name, part: 'variance' }));
      else checkAxes(out, map, name, 'variance.cols', s.variance.cols);
    }
  }

  // Everything wrong with a mapping, as plain sentences. Empty when it can be used.
  function problems(map) {
    var out = [];
    if (!isObj(map)) return [t('notObject')];
    if (!isObj(map.meta)) out.push(t('noMeta'));
    else if (!goodYears(map.meta.years)) out.push(t('years'));
    if (!Array.isArray(map.regions)) out.push(t('regions'));
    else {
      var seen = {};
      map.regions.forEach(function (r, i) {
        if (!isObj(r) || !filled(r.id)) return out.push(t('regionId', { n: i + 1 }));
        if (seen[r.id]) out.push(t('duplicateRegion', { id: r.id }));
        seen[r.id] = true;
        if (!filled(r.file)) out.push(t('regionFile', { id: r.id }));
      });
    }
    if (!isObj(map.lookups)) out.push(t('lookups'));
    else BASE_LISTS.forEach(function (list) {
      var v = map.lookups[list];
      if (list === 'scales' ? !isObj(v) : !Array.isArray(v)) out.push(t('lookupList', { list: list }));
    });
    if (!isObj(map.sections)) out.push(t('sections'));
    else {
      REQUIRED.forEach(function (name) { if (map.sections[name] == null) out.push(t('required', { section: name })); });
      ROWS.concat(GRIDS).forEach(function (name) {
        var s = map.sections[name];
        if (s == null) return;
        if (!isObj(s)) return out.push(t('badSection', { section: name }));
        if (ROWS.indexOf(name) >= 0) checkRowSection(out, map, name, s); else checkGrid(out, map, name, s);
      });
    }
    if (map.nameCell != null && !(isObj(map.nameCell) && filled(map.nameCell.sheet) && typeof map.nameCell.cell === 'string' && CELL.test(map.nameCell.cell))) {
      out.push(t('nameCell'));
    }
    // The dropdown placeholder texts (D158): optional, a list of texts
    if (map.placeholders != null && !(Array.isArray(map.placeholders) && map.placeholders.every(filled))) out.push(t('placeholders'));
    if (map.extra != null) {
      if (!Array.isArray(map.extra)) out.push(t('extra'));
      else map.extra.forEach(function (e, i) {
        if (!isObj(e) || !filled(e.id) || !filled(e.title) || !filled(e.sheet) || !isRow(e.firstRow) || !Array.isArray(e.columns)) {
          out.push(t('extraEntry', { n: i + 1 }));
        }
      });
    }
    return out;
  }

  // A deep copy with the defaults filled in
  function normalize(map) {
    var m = copy(isObj(map) ? map : {}), S = TAP.importFields.SECTIONS;
    m.aliases = isObj(m.aliases) ? m.aliases : {};
    m.placeholders = Array.isArray(m.placeholders) ? m.placeholders : [];
    m.extra = Array.isArray(m.extra) ? m.extra : [];
    m.sections = isObj(m.sections) ? m.sections : {};
    (Array.isArray(m.regions) ? m.regions : []).forEach(function (r) {
      if (isObj(r) && r.filterName == null) r.filterName = r.name;
    });
    ROWS.forEach(function (name) {
      var s = m.sections[name];
      if (!isObj(s)) return;
      if (s.key == null) s.key = (S[name] || {}).key || Object.keys(s.columns || {})[0];
      if (!isObj(s.scale)) s.scale = {};
      if (!isObj(s.headers)) s.headers = {};
      if (name === 'customerGrowth' && !filled(s.idPattern)) s.idPattern = '{region}-a{nn}';
    });
    GRIDS.forEach(function (name) {
      var s = m.sections[name];
      if (isObj(s) && s.blank == null) s.blank = 'null';
    });
    return m;
  }

  // meta.sourceMap: row sections copy { sheet, columns, cells? }, grid blocks { sheet }
  function sourceMap(map) {
    var out = {}, sections = isObj(map) && isObj(map.sections) ? map.sections : {};
    ORDER.forEach(function (name) {
      var s = sections[name];
      if (!isObj(s)) return;
      if (GRIDS.indexOf(name) >= 0) { out[name] = { sheet: s.sheet }; return; }
      var entry = { sheet: s.sheet, columns: copy(s.columns || {}) };
      if (isObj(s.cells)) entry.cells = copy(s.cells);
      out[name] = entry;
    });
    return out;
  }

  // meta.extraSections: each extra entry without sheet, firstRow and key; a column keeps its worksheet letter so the
  // app can name the cell of every value (docs/DATA-CONTRACT.md, Extra sections)
  function extraSections(map) {
    var list = isObj(map) && Array.isArray(map.extra) ? map.extra : [];
    return list.filter(isObj).map(function (e) {
      var out = { id: e.id, title: e.title };
      if (e.intro != null) out.intro = e.intro;
      out.columns = (Array.isArray(e.columns) ? e.columns : []).filter(isObj).map(function (c) {
        var col = { key: c.key, label: c.label, unit: c.unit, kind: c.kind };
        if (c.column != null) col.column = c.column;
        return col;
      });
      return out;
    });
  }

  // A file name pattern: * matches any run of characters, everything else is literal, case does not matter
  function glob(pattern, name) {
    var re = String(pattern || '').split('*').map(function (p) { return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('.*');
    return new RegExp('^' + re + '$', 'i').test(String(name || ''));
  }

  // The region a workbook belongs to, by exact file name first, then by pattern; null when none matches
  function matchRegion(map, fileName) {
    var regions = isObj(map) && Array.isArray(map.regions) ? map.regions.filter(isObj) : [];
    var hit = regions.filter(function (r) { return r.file === fileName; })[0] ||
      regions.filter(function (r) { return filled(r.file) && glob(r.file, fileName); })[0];
    return hit ? { id: hit.id, name: hit.name, filterName: hit.filterName != null ? hit.filterName : hit.name, spec: hit } : null;
  }

  TAP.importMap = { get: get, problems: problems, normalize: normalize, sourceMap: sourceMap, extraSections: extraSections,
    matchRegion: matchRegion, glob: glob, ROWS: ROWS, GRIDS: GRIDS, REQUIRED: REQUIRED };
})(window.TAP);
