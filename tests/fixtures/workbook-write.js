/*
 * File: tests/fixtures/workbook-write.js
 * Purpose: Writes workbooks from a plan and a mapping, the inverse of the import, for the round-trip tests and the sample
 *          workbooks tool (D156). A second, independent interpreter of the mapping (docs/ARCHITECTURE.md section 20.1 and
 *          20.2): its own axis expansion and column arithmetic, never TAP.import*. Cells hold what the importer expects to
 *          read: lookup names for ids, scale labels for ratings, High/Medium/Low for risk, nothing for null.
 * Provides: window.WORKBOOK_WRITE (workbooks, toArrayBuffer, files); module.exports in Node
 * Depends on: vendor/xlsx.mini.min.js (global XLSX in the browser, required in Node)
 * Used by: tests/test-import-plan.js, tests/test-import-fixtures.js, tools/build-sample-workbooks.js
 * Owner: FIXTURES stream
 */
(function (root) {
  'use strict';
  var X = typeof XLSX !== 'undefined' ? XLSX : require('../../vendor/xlsx.mini.min.js');

  var ROWS = ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners', 'baseYear'];
  var GRIDS = ['recap', 'revenue', 'booksValue', 'strategicPlan', 'routes'];
  var RATINGS = ['growthPotential', 'criticality', 'competitiveIntensity', 'references', 'expertise', 'productFit'];
  // Fields whose id is written as the name of the matching lookup entry.
  var LOOKUP = { industryId: 'industries', productLine: 'productLines', channel: 'channels', segment: 'segments',
    solution: 'solutions', category: 'productCategories' };
  var RISK = { high: 'High', medium: 'Medium', low: 'Low' };

  function get(obj, path) {
    return String(path).split('.').reduce(function (o, k) { return o === null || o === undefined ? undefined : o[k]; }, obj);
  }
  function colIndex(letter) { return X.utils.decode_col(letter); }
  function colLetter(index) { return X.utils.encode_col(index); }
  function rowOf(addr) { return parseInt(addr.replace(/^[A-Z]+/i, ''), 10); }
  function colOf(addr) { return addr.replace(/\d+$/, '').toUpperCase(); }

  /* ---------- one workbook under construction ---------- */

  function Book(region, map) {
    this.region = region;
    this.map = map;
    this.wb = X.utils.book_new();
    this.sheets = {};   // name -> { ws, min: {c, r}, max: {c, r} }
    var m = map.regions.filter(function (x) { return x.id === region.id; })[0];
    this.filterName = m && m.filterName ? m.filterName : region.name;
  }
  Book.prototype.sheet = function (name) {
    if (!this.sheets[name]) {
      var ws = {};
      X.utils.book_append_sheet(this.wb, ws, name);
      this.sheets[name] = { ws: ws, min: null, max: null };
    }
    return this.sheets[name];
  };
  // Writes a value at an address; null and undefined leave no cell.
  Book.prototype.put = function (sheetName, addr, value) {
    if (value === null || value === undefined) return;
    var s = this.sheet(sheetName), c = colIndex(colOf(addr)), r = rowOf(addr) - 1;
    s.ws[colOf(addr) + (r + 1)] = typeof value === 'number' ? { t: 'n', v: value }
      : typeof value === 'boolean' ? { t: 'b', v: value } : { t: 's', v: String(value) };
    if (!s.min) { s.min = { c: c, r: r }; s.max = { c: c, r: r }; return; }
    s.min = { c: Math.min(s.min.c, c), r: Math.min(s.min.r, r) };
    s.max = { c: Math.max(s.max.c, c), r: Math.max(s.max.r, r) };
  };
  Book.prototype.finish = function () {
    var self = this;
    Object.keys(this.sheets).forEach(function (name) {
      var s = self.sheets[name];
      if (s.min) s.ws['!ref'] = X.utils.encode_range({ s: s.min, e: s.max });
    });
    this.wb.Props = { ModifiedDate: new Date(this.region.source.fileModified), Title: this.region.name };
    return this.wb;
  };

  /* ---------- values by kind (section 20.2) ---------- */

  function nameOf(list, id) {
    var hit = (list || []).filter(function (e) { return e.id === id; })[0];
    return hit ? hit.name : id;
  }
  function cellValue(section, field, value, lookups) {
    if (value === null || value === undefined) return null;
    if (LOOKUP[field]) return nameOf(lookups[LOOKUP[field]], value);
    if (section === 'partners' && field === 'type') return nameOf(lookups.partnerTypes, value);
    if (field === 'maturity') {
      var level = (lookups.partnerMaturity || []).filter(function (l) { return l.id === value; })[0];
      return level ? level.name : value;
    }
    if (RATINGS.indexOf(field) >= 0) {
      var hit = ((lookups.scales || {})[field] || { levels: [] }).levels.filter(function (l) { return l.score === value; })[0];
      return hit ? hit.label : value;
    }
    if (field === 'riskLevel') return RISK[value] || value;
    return value;   // tier, text, numbers, shares, actualsThrough and so on, as they are
  }

  /* ---------- row sections ---------- */

  function itemsOf(region, key) {
    if (key === 'customerGrowth') return region.customerGrowth ? region.customerGrowth.accounts || [] : null;
    if (key === 'baseYear') return region.baseYear ? region.baseYear.items || [] : null;
    return region[key] === undefined || region[key] === null ? null : region[key];
  }
  function writeRows(book, key, spec) {
    var region = book.region, items = itemsOf(region, key), lookups = book.map.lookups;
    if (items === null) return;   // the region has no such part: no sheet for it
    book.sheet(spec.sheet);
    Object.keys(spec.headers || {}).forEach(function (field) {
      var col = spec.columns[field];
      if (col) book.put(spec.sheet, (Array.isArray(col) ? col[0] : col) + spec.headerRow, spec.headers[field]);
    });
    items.forEach(function (item) {
      Object.keys(spec.columns).forEach(function (field) {
        if (field === 'id' || (key === 'newBusiness' && field === 'tier')) return;   // never written (D154)
        var col = spec.columns[field], v = get(item, field);
        if (Array.isArray(col)) {
          col.forEach(function (c, i) { book.put(spec.sheet, c + item.sourceRow, Array.isArray(v) ? v[i] : null); });
        } else {
          book.put(spec.sheet, col + item.sourceRow, cellValue(key, field, v, lookups));
        }
      });
    });
    // Fixed cells: the section's own object (thresholds, the base year's year), or the region for a list (outsourcingPct).
    var base = Array.isArray(region[key]) ? region : region[key];
    Object.keys(spec.cells || {}).forEach(function (path) {
      book.put(spec.sheet, spec.cells[path], cellValue(key, path.split('.').pop(), get(base, path), lookups));
    });
  }

  /* ---------- grid blocks ---------- */

  // Expands a regular or enumerated axis spec into [{ at, fields }]; `at` is a row number or a column letter.
  function expand(spec, kind) {
    var out = [];
    if (Array.isArray(spec)) {
      spec.forEach(function (entry) {
        var fields = {};
        Object.keys(entry).forEach(function (k) { if (k !== 'row' && k !== 'col') fields[k] = entry[k]; });
        out.push({ at: kind === 'rows' ? entry.row : entry.col.toUpperCase(), fields: fields });
      });
      return out;
    }
    var axes = spec.axes, strides = [], i, product = 1;
    for (i = axes.length - 1; i >= 0; i--) {
      strides[i] = axes[i].stride || product;
      product *= axes[i].values.length;
    }
    var start = kind === 'rows' ? spec.first : colIndex(spec.first);
    function walk(depth, offset, fields) {
      if (depth === axes.length) {
        out.push({ at: kind === 'rows' ? start + offset : colLetter(start + offset), fields: fields });
        return;
      }
      axes[depth].values.forEach(function (v, idx) {
        var f = Object.assign({}, fields);
        f[axes[depth].field] = v;
        walk(depth + 1, offset + idx * strides[depth], f);
      });
    }
    walk(0, 0, {});
    return out;
  }
  function same(a, b) { return (a === undefined ? null : a) === (b === undefined ? null : b); }
  function find(list, item) {
    return list.filter(function (e) {
      return Object.keys(e.fields).every(function (f) { return same(e.fields[f], item[f]); });
    })[0];
  }
  function writeGrid(book, key, spec) {
    var items = book.region[key];
    if (!items) return;
    book.sheet(spec.sheet);
    if (spec.filterCell) book.put(spec.sheet, spec.filterCell, book.filterName);
    var rows = expand(spec.rows, 'rows'), cols = expand(spec.cols, 'cols');
    var vcols = spec.variance ? expand(spec.variance.cols, 'cols') : null;
    items.forEach(function (item) {
      var r = find(rows, item), c = find(cols, item);
      if (!r || !c) throw new Error(book.region.id + ' ' + key + ': no cell in the mapping for ' + JSON.stringify(item));
      var addr = c.at + r.at;
      if (item.sourceCell && item.sourceCell !== addr) {
        throw new Error(book.region.id + ' ' + key + ': the mapping puts the item at ' + addr + ' but its sourceCell is ' + item.sourceCell);
      }
      book.put(spec.sheet, addr, item.value);
      if (vcols && item.variance !== undefined) {
        var vc = find(vcols, item);
        if (vc) book.put(spec.sheet, vc.at + r.at, item.variance);
      }
    });
  }

  /* ---------- extra sections ---------- */

  function writeExtra(book, section) {
    var rows = book.region.extra ? book.region.extra[section.id] : null;
    if (!rows || !rows.length) return;
    rows.forEach(function (row) {
      (section.columns || []).forEach(function (c) {
        if (c.column) book.put(section.sheet, c.column + row.sourceRow, row[c.key]);
      });
    });
  }

  /* ---------- the API ---------- */

  function workbooks(plan, map) {
    return plan.regions.map(function (region) {
      var book = new Book(region, map);
      if (map.nameCell) book.put(map.nameCell.sheet, map.nameCell.cell, region.name);
      ROWS.forEach(function (key) { if (map.sections[key]) writeRows(book, key, map.sections[key]); });
      GRIDS.forEach(function (key) { if (map.sections[key]) writeGrid(book, key, map.sections[key]); });
      (map.extra || []).forEach(function (section) { writeExtra(book, section); });
      return { fileName: region.source.fileName, regionId: region.id, wb: book.finish() };
    });
  }

  function toArrayBuffer(wb) { return X.write(wb, { type: 'array', bookType: 'xlsx' }); }

  // File objects where File exists (browsers, recent Node); else objects with the same fields.
  function files(plan, map) {
    return workbooks(plan, map).map(function (out) {
      var region = plan.regions.filter(function (r) { return r.id === out.regionId; })[0];
      var buf = toArrayBuffer(out.wb), modified = Date.parse(region.source.fileModified);
      if (typeof File === 'function') return new File([buf], out.fileName, { lastModified: modified });
      return { name: out.fileName, lastModified: modified, arrayBuffer: function () { return Promise.resolve(buf); } };
    });
  }

  var WORKBOOK_WRITE = { workbooks: workbooks, toArrayBuffer: toArrayBuffer, files: files };
  root.WORKBOOK_WRITE = WORKBOOK_WRITE;
  if (typeof module !== 'undefined') module.exports = WORKBOOK_WRITE;
})(typeof window !== 'undefined' ? window : {});
