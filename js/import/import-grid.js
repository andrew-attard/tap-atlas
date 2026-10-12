/*
 * File: js/import/import-grid.js
 * Purpose: Expands a grid block's row and column axes (regular with strides, or enumerated) and reads its cells into
 *          recap-shaped items with a sourceCell each; checks the recap sheet's region filter; docs/ARCHITECTURE.md section 20.1.
 * Provides: TAP.importGrid (expand, block)
 * Depends on: js/import/xlsx-book.js, js/import/import-values.js, js/core/content.js, content/text-import.js
 * Used by: js/import/import-region.js
 * Owner: READ stream (#585)
 */
(function (TAP) {
  'use strict';

  // The keys of each list's items, in the Data Contract's order
  var RECAP = ['year', 'sourceCell', 'channel', 'motion', 'type', 'value'];
  var ORDER = { recap: RECAP, revenue: RECAP, booksValue: RECAP,
    strategicPlan: ['year', 'sourceCell', 'type', 'value', 'variance'],
    routes: ['route', 'year', 'sourceCell', 'type', 'value', 'solution'] };

  function t(key, vars) { return TAP.content.text('importPanel.read.' + key, vars); }
  function show(raw) {
    if (raw === null || raw === undefined) return t('blankCell');
    if (raw && raw.error) return raw.formula ? t('noResult') : String(raw.found);
    return typeof raw === 'string' ? JSON.stringify(raw) : String(raw);
  }

  // Every cell position of one axis set. kind: 'rows' (at = a row number) or 'cols' (at = a column letter).
  // Regular: { first, axes: [{ field, values, stride? }] }, the outermost axis first; a stride defaults to the product of
  // the inner axes' sizes. Enumerated: [{ row: 5, year: 2027, ... }] or [{ col: 'E', channel: 'direct' }].
  function expand(spec, kind) {
    var X = TAP.xlsxBook, rows = kind === 'rows', atKey = rows ? 'row' : 'col';
    if (Array.isArray(spec)) {
      return spec.map(function (e) {
        var fields = Object.assign({}, e);
        delete fields[atKey];
        return { at: e[atKey], fields: fields };
      });
    }
    var axes = (spec && spec.axes) || [], strides = [], prod = 1;
    for (var i = axes.length - 1; i >= 0; i--) {
      strides[i] = axes[i].stride != null ? axes[i].stride : prod;
      prod *= axes[i].values.length;
    }
    var base = rows ? spec.first : X.colIndex(spec.first), out = [];
    function walk(i, offset, fields) {
      if (i === axes.length) return out.push({ at: rows ? base + offset : X.colLetter(base + offset), fields: fields });
      axes[i].values.forEach(function (v, k) {
        var f = Object.assign({}, fields);
        f[axes[i].field] = v;
        walk(i + 1, offset + k * strides[i], f);
      });
    }
    walk(0, 0, {});
    return out;
  }

  // A cell's number; anything else is noted and null
  function readNumber(ctx, sheet, cell, raw, field) {
    var v = ctx.V.number(raw);
    if (!ctx.V.isBad(v)) return v;
    var key = raw && raw.error ? (raw.formula ? 'formulaNoValue' : 'errorCell') : 'badValue';
    ctx.note(t(key, { field: field, found: show(raw) }), sheet.name, cell);
    return null;
  }

  // One item with its keys in the list's order; axis fields the list does not name are appended
  function shape(key, fields, cell, value, variance, hasVariance) {
    var order = ORDER[key] || Object.keys(fields).concat(['sourceCell', 'value']), out = {};
    order.forEach(function (k) {
      if (k === 'sourceCell') out.sourceCell = cell;
      else if (k === 'value') out.value = value;
      else if (k === 'variance') { if (hasVariance) out.variance = variance; }
      else if (Object.prototype.hasOwnProperty.call(fields, k)) out[k] = fields[k];
    });
    Object.keys(fields).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = fields[k]; });
    return out;
  }

  // The items of one grid block for a region. filterName: the text the sheet's region filter must hold (filterCell).
  // blank 'skip': a blank cell gives no item; 'null': an item with value null. A row with every cell blank adds nothing.
  function block(book, map, key, ctx, filterName) {
    var spec = map.sections[key], sheet = spec && spec.sheet ? book.sheet(spec.sheet) : null;
    if (!sheet) return { present: false, items: [] };
    var V = ctx.V;
    if (sheet.loose) {
      ctx.looseNoted = ctx.looseNoted || {};
      if (!ctx.looseNoted[sheet.name]) {
        ctx.looseNoted[sheet.name] = true;
        ctx.note(t('looseSheet', { expected: spec.sheet, found: sheet.name }), sheet.name, null);
      }
    }
    if (spec.filterCell) {
      var fraw = sheet.value(spec.filterCell);
      if (V.norm(fraw && fraw.error ? '' : fraw) !== V.norm(filterName)) {
        ctx.error(t('filterMismatch', { found: show(fraw), expected: String(filterName) }), sheet.name, spec.filterCell);
        return { present: true, items: [], failed: true };
      }
    }
    var rows = expand(spec.rows, 'rows'), cols = expand(spec.cols, 'cols');
    var vcols = spec.variance && spec.variance.cols ? expand(spec.variance.cols, 'cols') : null;
    var skip = spec.blank === 'skip', items = [];
    rows.forEach(function (r) {
      var found = [], any = false;
      cols.forEach(function (c, i) {
        var cell = c.at + r.at, raw = sheet.value(cell), variance = null;
        if (raw !== null) any = true;
        if (vcols && vcols[i]) {
          var vcell = vcols[i].at + r.at, vraw = sheet.value(vcell);
          if (vraw !== null) any = true;
          variance = vraw === null ? null : readNumber(ctx, sheet, vcell, vraw, 'variance');
        }
        if (raw === null && skip) return;
        var value = raw === null ? null : readNumber(ctx, sheet, cell, raw, 'value');
        found.push(shape(key, Object.assign({}, r.fields, c.fields), cell, value, variance, !!vcols));
      });
      if (any) items = items.concat(found);
    });
    return { present: true, items: items };
  }

  TAP.importGrid = { expand: expand, block: block };
})(window.TAP);
