/*
 * File: js/import/import-region.js
 * Purpose: Reads one workbook into one region: id and name, source record, every section and part, the checks; docs/ARCHITECTURE.md section 20.
 * Provides: TAP.importRegion (read, slug)
 * Depends on: js/import/xlsx-book.js, js/import/import-map.js, js/import/import-values.js, js/import/import-rows.js,
 *             js/import/import-grid.js, js/import/import-checks.js, js/core/content.js (content/text-import.js wording)
 * Used by: js/import/import-plan.js
 * Owner: PLAN stream (#586)
 *
 * read(book, map, match, opts) gives {ok, id, name, fileName, region, errors, notes, parts}. The region is null unless
 * every required section was read without an error. A note or error is {message, sheet, cell, kind, item, found, expected}
 * (D163): kind the wording key of its sentence, item the row or thing it is about in words, found and expected plain values,
 * each null when the note has none; ctx.note(message, sheet, cell, extra) and ctx.error take them as extra. Its keys follow data/sample-plan-data.js: id, name, source,
 * marketCoverage, newBusiness, partners, recap, customerGrowth, then extra, outsourcingPct, revenue, booksValue,
 * strategicPlan, baseYear and routes, each only when the workbook carries it.
 */
(function (TAP) {
  'use strict';

  var GRIDS = ['revenue', 'booksValue', 'strategicPlan', 'routes'];

  function say(key, vars) { return TAP.content.text('importPanel.check.' + key, vars); }
  function sectionName(key) { return say('sections.' + key); }
  function isStr(v) { return typeof v === 'string'; }

  // A short stable id from a name: lower case letters and digits with "-" between words; never "rest" or "org"
  function slug(name) {
    var s = String(name == null ? '' : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!s) s = 'region';
    if (s === 'rest' || s === 'org') s += '-region';
    return s;
  }

  function baseName(fileName) { return String(fileName || '').replace(/\.[^.]+$/, ''); }

  // The region's id and name: from the mapping's match, else the workbook's name cell, else the file name
  function identify(book, map, match, ctx) {
    if (match) return { id: match.id, name: match.name, filterName: match.filterName || match.name };
    var name = null, nc = map.nameCell;
    if (nc && nc.sheet && nc.cell) {
      var sheet = book.sheet(nc.sheet), v = sheet ? sheet.value(nc.cell) : null;
      if (isStr(v) && v.trim()) name = v.trim();
    }
    if (!name) name = baseName(book.fileName);
    var id = slug(name);
    ctx.note(say('unmatchedWorkbook', { file: book.fileName, name: name, id: id }), nc && nc.sheet ? nc.sheet : null, nc && nc.cell ? nc.cell : null,
      { kind: 'unmatchedWorkbook', item: book.fileName, found: name });
    return { id: id, name: name, filterName: name };
  }

  function fileModified(book, opts) {
    if (book.modified) return book.modified;
    var t = opts && opts.lastModified;
    return t == null || isNaN(new Date(t).getTime()) ? null : TAP.xlsxBook.iso(new Date(t));
  }

  function missing(ctx, map, key, parts) {
    parts[key] = 'missing';
    var sheet = map.sections[key] ? map.sections[key].sheet : null;
    ctx.error(say('missingSheet', { sheet: sheet || key, section: sectionName(key) }), sheet, null, { kind: 'missingSheet', item: sectionName(key), expected: sheet || key });
  }

  // A required row section: a missing sheet is an error; an empty one is read as [] (the checks add the note)
  function rowSection(book, map, key, ctx, region, parts) {
    var res = TAP.importRows.section(book, map, key, ctx);
    if (!res || !res.present) { missing(ctx, map, key, parts); return null; }
    region[key] = res.items;
    parts[key] = res.items.length ? 'read' : 'empty';
    return res.items;
  }

  function customerGrowth(book, map, ctx, region, parts) {
    var res = TAP.importRows.customerGrowth(book, map, ctx);
    if (!res || !res.present) { missing(ctx, map, 'customerGrowth', parts); return; }
    region.customerGrowth = { thresholds: res.thresholds, accounts: res.accounts };
    parts.customerGrowth = res.accounts.length ? 'read' : 'empty';
  }

  function grid(book, map, key, ctx, filterName, region, parts, required) {
    if (!map.sections[key]) return;
    var res = TAP.importGrid.block(book, map, key, ctx, filterName);
    if (!res || !res.present) {
      if (required) missing(ctx, map, key, parts); else parts[key] = 'missing';
      return;
    }
    parts[key] = res.items.length ? 'read' : 'empty';
    if (required) region[key] = res.items;
    else if (res.items.length) region[key] = res.items;
  }

  // The Partner sheet's outsourcing %, a single cell, only when the mapping names one
  function outsourcing(book, map, ctx, region) {
    var s = map.sections.partners, cell = s && s.cells ? s.cells.outsourcingPct : null;
    if (!cell) return;
    var sheet = book.sheet(s.sheet);
    if (!sheet) return;
    var read = TAP.importRows.cells(sheet, { outsourcingPct: cell }, { outsourcingPct: 'share' }, ctx) || {};
    region.outsourcingPct = read.outsourcingPct === undefined ? null : read.outsourcingPct;
  }

  function baseYear(book, map, ctx, region, parts) {
    if (!map.sections.baseYear) return;
    var res = TAP.importRows.baseYear(book, map, ctx);
    if (!res || !res.present) { parts.baseYear = 'missing'; return; }
    region.baseYear = res.value;
    parts.baseYear = res.value && Array.isArray(res.value.items) && res.value.items.length ? 'read' : 'empty';
  }

  // One note or error (D163): the sentence, where it was found, its kind and the plain parts the kind groups show
  function entry(message, sheet, cell, extra) {
    var x = extra || {};
    return { message: message, sheet: sheet == null ? null : sheet, cell: cell == null ? null : cell, kind: x.kind || null,
      item: x.item == null ? null : x.item, found: x.found == null ? null : x.found, expected: x.expected == null ? null : x.expected };
  }

  function read(book, map, match, opts) {
    opts = opts || {};
    var errors = [], notes = [], parts = {};
    var ctx = {
      regionId: null, years: map.meta.years, V: null, map: map, marketCoverage: null,
      note: function (message, sheet, cell, extra) { notes.push(entry(message, sheet, cell, extra)); },
      error: function (message, sheet, cell, extra) { errors.push(entry(message, sheet, cell, extra)); }
    };
    var who = identify(book, map, match, ctx);
    ctx.regionId = who.id;
    ctx.V = TAP.importValues.create(map.lookups, map.aliases, map.meta.numberFormat, map.placeholders);
    var region = { id: who.id, name: who.name,
      source: { fileName: book.fileName, fileModified: fileModified(book, opts), importedAt: opts.now || null, notes: notes } };

    ctx.marketCoverage = rowSection(book, map, 'marketCoverage', ctx, region, parts);
    rowSection(book, map, 'newBusiness', ctx, region, parts);
    rowSection(book, map, 'partners', ctx, region, parts);
    grid(book, map, 'recap', ctx, who.filterName, region, parts, true);
    customerGrowth(book, map, ctx, region, parts);
    if (map.extra && map.extra.length) {
      var extra = TAP.importRows.extra(book, map, ctx);
      if (extra && Object.keys(extra).length) region.extra = extra;
    }
    outsourcing(book, map, ctx, region);
    GRIDS.forEach(function (key) { if (key !== 'routes') grid(book, map, key, ctx, who.filterName, region, parts, false); });
    baseYear(book, map, ctx, region, parts);
    grid(book, map, 'routes', ctx, who.filterName, region, parts, false);

    TAP.importChecks.run(region, map.lookups, map, ctx);
    // A part whose sheet an error names did not read cleanly
    Object.keys(parts).forEach(function (k) {
      var sheet = map.sections[k] ? map.sections[k].sheet : null;
      if (parts[k] !== 'missing' && errors.some(function (e) { return e.sheet != null && e.sheet === sheet; })) parts[k] = 'error';
    });
    var ok = errors.length === 0;
    return { ok: ok, id: who.id, name: who.name, fileName: book.fileName, region: ok ? region : null, errors: errors, notes: notes, parts: parts };
  }

  TAP.importRegion = { read: read, slug: slug };
})(window.TAP);
