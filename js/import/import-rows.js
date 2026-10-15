/*
 * File: js/import/import-rows.js
 * Purpose: Reads the row sections of one workbook through the mapping: the header check, spare rows, by-year columns, dotted
 *          fields, fixed cells, the New Business tier from Market Coverage, account ids and extra sections; docs/ARCHITECTURE.md section 20.3.
 *          Also the words a note's item is written in (D163): lookup names, motions and types, field labels.
 * Provides: TAP.importRows (read, section, customerGrowth, baseYear, cells, extra, label, keyWords, fieldLabel)
 * Depends on: js/import/xlsx-book.js, js/import/import-values.js, js/import/import-fields.js, js/core/content.js, content/text-import.js,
 *             content/text-data.js (check.fields)
 * Used by: js/import/import-region.js, js/import/import-grid.js, js/import/import-checks.js (the words)
 * Owner: READ stream (#585); the words and the note kinds by NOTES2 (#612)
 */
(function (TAP) {
  'use strict';

  function S() { return TAP.importFields.SECTIONS; }
  function t(key, vars) { return TAP.content.text('importPanel.read.' + key, vars); }
  function firstCol(c) { return Array.isArray(c) ? c[0] : c; }
  function isObj(v) { return v != null && typeof v === 'object' && !Array.isArray(v); }

  // What a cell held, for a note: text quoted, a blank or an error cell described
  function show(raw) {
    if (raw === null || raw === undefined) return t('blankCell');
    if (raw && raw.error) return raw.formula ? t('noResult') : String(raw.found);
    return typeof raw === 'string' ? JSON.stringify(raw) : String(raw);
  }

  /* ---------- the words a note's item is written in (D163) ---------- */

  function nameOf(list, id) {
    var hit = (Array.isArray(list) ? list : []).filter(function (x) { return x && x.id === id; })[0];
    return hit && hit.name ? String(hit.name) : null;
  }
  function wordOf(group, id) {
    if (!group || typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9]*$/.test(id)) return null;
    var w = TAP.content.text('importPanel.words.' + group + '.' + id);
    return w.charAt(0) === '[' ? null : w;
  }
  // An id as a label: its lookup name, else the word for it (motions, types, channels), else the id itself; null for no id
  function label(list, group, id) {
    if (id == null) return null;
    return nameOf(list, id) || wordOf(group, id) || String(id);
  }
  // A grid item's axis values in words, in the recap's order: "2027, Direct, new business, ARR"
  function keyWords(lookups, f) {
    var L = lookups || {};
    return [f.year, label(L.channels, 'channels', f.channel), label(null, 'motions', f.motion), label(L.productCategories, 'types', f.type),
      label(L.routes, null, f.route), label(L.solutions, null, f.solution), label(L.productCategories, 'types', f.category)]
      .filter(function (x) { return x != null; }).join(', ');
  }
  // A field in words (check.fields), else the key as it is
  function fieldLabel(field) {
    var w = TAP.content.text('check.fields.' + field);
    return w.charAt(0) === '[' ? String(field) : w;
  }
  function itemWords(rowName, field) { return [rowName, fieldLabel(field)].filter(Boolean).join(', '); }

  // 'channelSplit.direct' -> item.channelSplit.direct
  function setPath(obj, path, value) {
    var parts = String(path).split('.'), o = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!isObj(o[parts[i]])) o[parts[i]] = {};
      o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = value;
  }

  // A value that could not be read: a note saying what the cell held (its kind, the row and field in words), then null
  function noted(ctx, sheet, cell, field, raw, noteKey, rowName) {
    var key = raw && raw.error ? (raw.formula ? 'formulaNoValue' : 'errorCell') : (noteKey || 'badValue');
    ctx.note(t(key, { field: field, found: show(raw) }), sheet.name, cell, { kind: key, item: itemWords(rowName, field), found: show(raw) });
    return null;
  }

  // One cell by kind; a bad value is noted and null
  function readCell(ctx, sheet, cell, kind, field, scale, noteKey, rowName) {
    var raw = sheet.value(cell), v = ctx.V.read(kind, raw, scale);
    return ctx.V.isBad(v) ? noted(ctx, sheet, cell, field, raw, noteKey, rowName) : v;
  }

  // A sheet matched in another case or spacing is noted once per reading
  function sheetOf(book, spec, ctx) {
    var sh = spec && spec.sheet ? book.sheet(spec.sheet) : null;
    if (sh && sh.loose) {
      ctx.looseNoted = ctx.looseNoted || {};
      if (!ctx.looseNoted[sh.name]) {
        ctx.looseNoted[sh.name] = true;
        ctx.note(t('looseSheet', { expected: spec.sheet, found: sh.name }), sh.name, null, { kind: 'looseSheet', found: sh.name, expected: spec.sheet });
      }
    }
    return sh;
  }

  // The rows of one section. kinds: { fields, key, byYear, order, derived?, noteKey? } (TAP.importFields.SECTIONS[section]).
  // Fields are written in the table's order (a derived field as a null placeholder), then any mapped field the table does
  // not know, read as text. A row whose key cell is blank, or shows a dropdown placeholder (D158), is a spare row:
  // skipped and counted.
  function read(sheet, spec, kinds, ctx) {
    var V = ctx.V, cols = spec.columns || {}, headers = spec.headers || {}, scale = spec.scale || {};
    var hkeys = Object.keys(headers);
    for (var h = 0; h < hkeys.length; h++) {
      var hcol = firstCol(cols[hkeys[h]]);
      if (!hcol || spec.headerRow == null) continue;
      var hcell = hcol + spec.headerRow, hraw = sheet.value(hcell);
      if (V.norm(hraw && hraw.error ? '' : hraw) !== V.norm(headers[hkeys[h]])) {
        ctx.error(t('headerMismatch', { expected: headers[hkeys[h]], found: show(hraw), cell: hcell }), sheet.name, hcell,
          { kind: 'headerMismatch', item: fieldLabel(hkeys[h]), found: show(hraw), expected: headers[hkeys[h]] });
        return { items: [], skipped: 0 };
      }
    }
    var derived = kinds.derived || [], byYear = kinds.byYear || [];
    var fields = kinds.order.filter(function (f) { return cols[f] !== undefined || derived.indexOf(f) >= 0; })
      .concat(Object.keys(cols).filter(function (f) { return kinds.order.indexOf(f) < 0; }));
    var keyCol = firstCol(cols[spec.key || kinds.key]), last = spec.lastRow || sheet.lastRow;
    var items = [], skipped = 0;
    for (var row = spec.firstRow; row <= last; row++) {
      var keyRaw = keyCol ? sheet.value(keyCol + row) : undefined;
      if (keyCol && (keyRaw === null || V.placeholder(keyRaw))) { skipped++; continue; }
      // The row's name for its notes: the key cell's text, when it has one
      var item = { sourceRow: row }, rowName = typeof keyRaw === 'string' && keyRaw.trim() ? keyRaw.trim() : null;
      fields.forEach(function (f) {
        var col = cols[f], kind = kinds.fields[f] || 'text', nk = kinds.noteKey && kinds.noteKey[f];
        if (col === undefined) return setPath(item, f, null);
        if (byYear.indexOf(f) >= 0) {
          var list = Array.isArray(col) ? col : [col];
          return setPath(item, f, list.map(function (c) { return readCell(ctx, sheet, c + row, kind, f, scale[f], nk, rowName); }));
        }
        setPath(item, f, readCell(ctx, sheet, firstCol(col) + row, kind, f, scale[f], nk, rowName));
      });
      items.push(item);
    }
    return { items: items, skipped: skipped };
  }

  // The New Business tier comes from the region's Market Coverage row (D154); a mapped tier column is only cross-checked
  function deriveTier(item, spec, sheet, ctx) {
    var mc = (ctx.marketCoverage || []).filter(function (r) { return r.industryId === item.industryId; })[0];
    var derived = mc ? mc.tier : null, mapped = item.tier;
    if (spec.columns.tier && mapped !== null && mc && mapped !== derived) {
      ctx.note(t('tierDiffers', { found: show(mapped), expected: show(derived) }), sheet.name, firstCol(spec.columns.tier) + item.sourceRow,
        { kind: 'tierDiffers', item: label(ctx.map && ctx.map.lookups ? ctx.map.lookups.industries : null, null, item.industryId), found: show(mapped), expected: show(derived) });
    }
    item.tier = derived;
  }

  // marketCoverage (a row naming no known industry is left out), newBusiness (tier derived) or partners
  function section(book, map, key, ctx) {
    var spec = map.sections[key], kinds = S()[key];
    var sheet = spec && kinds ? sheetOf(book, spec, ctx) : null;
    if (!sheet) return { present: false, items: [] };
    var items = read(sheet, spec, kinds, ctx).items;
    if (key === 'marketCoverage') items = items.filter(function (it) { return it.industryId !== null; });
    if (key === 'newBusiness') items.forEach(function (it) { deriveTier(it, spec, sheet, ctx); });
    return { present: true, items: items };
  }

  // Fixed cells: { 'thresholds.strategicArr': 'N3' } with kinds by path, nested on dotted paths
  function cells(sheet, cellsSpec, kinds, ctx) {
    var out = {};
    Object.keys(cellsSpec || {}).forEach(function (path) {
      setPath(out, path, readCell(ctx, sheet, cellsSpec[path], (kinds || {})[path] || 'text', path, null));
    });
    return out;
  }

  // Account ids from idPattern: {region} the region id, {initial} its first character, {n} the account's number
  // among the non-blank rows, {nn} the same with two digits
  function accountId(pattern, regionId, n) {
    var rid = String(regionId == null ? '' : regionId);
    return String(pattern).replace(/\{region\}/g, rid).replace(/\{initial\}/g, rid.charAt(0))
      .replace(/\{nn\}/g, (n < 10 ? '0' : '') + n).replace(/\{n\}/g, String(n));
  }

  function customerGrowth(book, map, ctx) {
    var spec = map.sections.customerGrowth, kinds = S().customerGrowth, sheet = spec ? sheetOf(book, spec, ctx) : null;
    if (!sheet) return { present: false, thresholds: {}, accounts: [] };
    var fixed = cells(sheet, spec.cells, kinds.cells, ctx), pattern = spec.idPattern || '{region}-a{nn}';
    var accounts = read(sheet, spec, kinds, ctx).items.map(function (it, i) {
      // The contract: growthPct is null when the 3-year multiplier was used instead (three blank growth cells)
      if (Array.isArray(it.growthPct) && it.multiplier3y != null && it.growthPct.every(function (v) { return v === null; })) it.growthPct = null;
      return Object.assign({ sourceRow: it.sourceRow, id: accountId(pattern, ctx.regionId, i + 1) }, it);
    });
    return { present: true, thresholds: fixed.thresholds || {}, accounts: accounts };
  }

  function baseYear(book, map, ctx) {
    var spec = map.sections.baseYear, kinds = S().baseYear, sheet = spec ? sheetOf(book, spec, ctx) : null;
    if (!sheet) return { present: false, value: null };
    var value = cells(sheet, spec.cells, kinds.cells, ctx);
    value.items = read(sheet, spec, kinds, ctx).items;
    return { present: true, value: value };
  }

  // Extra sections (section 18): { <id>: [{ sourceRow, <key>: value }] }, each unit read as its kind; a missing sheet gives no entry
  function extra(book, map, ctx) {
    var out = {}, units = TAP.importFields.EXTRA_UNITS;
    (map.extra || []).forEach(function (e) {
      var sheet = sheetOf(book, e, ctx);
      if (!sheet) return;
      var cols = {}, fields = {}, order = [];
      (e.columns || []).forEach(function (c) {
        if (!isObj(c) || !c.key || !c.column) return;
        cols[c.key] = c.column;
        fields[c.key] = units[c.unit] || 'text';
        order.push(c.key);
      });
      var key = e.key && cols[e.key] ? e.key : order[0];
      var spec = { sheet: e.sheet, firstRow: e.firstRow, lastRow: e.lastRow, headerRow: e.headerRow, headers: e.headers || {}, key: key, columns: cols, scale: {} };
      out[e.id] = read(sheet, spec, { fields: fields, key: key, byYear: [], order: order }, ctx).items;
    });
    return out;
  }

  TAP.importRows = { read: read, section: section, customerGrowth: customerGrowth, baseYear: baseYear, cells: cells, extra: extra,
    label: label, keyWords: keyWords, fieldLabel: fieldLabel };
})(window.TAP);
