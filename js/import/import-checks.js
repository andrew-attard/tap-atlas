/*
 * File: js/import/import-checks.js
 * Purpose: The import brief's section 5 cross-checks on one region, as errors or notes with sheet and cell; docs/ARCHITECTURE.md section 20.
 *          Mirrors the rules of js/core/check-rows.js and js/core/check-p4.js; where the brief differs, the brief wins.
 * Provides: TAP.importChecks (run)
 * Depends on: js/core/content.js (content/text-import.js wording), js/import/import-rows.js (label, keyWords: the words of a note's item)
 * Used by: js/import/import-region.js
 * Owner: PLAN stream (#586); the note kinds by NOTES2 (#612)
 *
 * run(region, lookups, map, ctx): every finding goes through ctx.note or ctx.error as {message, sheet, cell} plus its kind,
 * item (the industry, account, section or recap key in words), found and expected (D163), and for the rules the app's check
 * repeats (js/core/check-rows.js, check-p4.js) a ref, the rule's key in the data's own terms (D165): the section key, the
 * industry or account id, year|channel|motion, year|channel, year|type or the category, so one finding shows once. Cells come from the mapping (a
 * column plus the item's sourceRow) or from the item's own sourceCell. A missing rated industry is the only error here;
 * everything else is a note. A section the region does not carry is never reported. A comparing note (the split, the ARR
 * formula, the segment rule, the variance, revenue, books value, the coverage) also carries cells: { found, expected: [] },
 * the sheet › cell addresses behind both values, as the panels write them (D169). Revenue is compared at year, channel and
 * motion with the types added up, as the contract check does (D170).
 */
(function (TAP) {
  'use strict';

  var CHANNELS = ['direct', 'partner', 'allianceA', 'allianceB'], RESELLERS = ['partner', 'allianceA', 'allianceB'];
  var EMPTY = ['marketCoverage', 'newBusiness', 'customerGrowth.accounts', 'partners', 'recap'];

  function say(key, vars) { return TAP.content.text('importPanel.check.' + key, vars); }
  function sectionName(key) { return say('sections.' + key); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function round2(x) { return Math.round(x * 100) / 100; }
  function near(found, want, pct) { return Math.abs(found - want) <= Math.max(0.5, Math.abs(want) * pct); }
  function spec(map, key) { return map && map.sections && map.sections[key] ? map.sections[key] : null; }
  function label(list, group, id) { return TAP.importRows.label(list, group, id); }
  function keyWords(lookups, f) { return TAP.importRows.keyWords(lookups, f); }
  function sheetOf(map, key) { var s = spec(map, key); return s ? s.sheet : null; }

  // The column of a field in a row section; by-year fields hold one column per plan year
  function column(map, key, field, yi) {
    var s = spec(map, key), c = s && s.columns ? s.columns[field] : null;
    if (Array.isArray(c)) c = c[yi || 0];
    return typeof c === 'string' ? c : null;
  }
  function cellOf(map, key, field, row, yi) {
    var c = column(map, key, field, yi);
    return c && isNum(row) ? c + row : null;
  }
  function rowOf(cell) { var m = /\d+$/.exec(String(cell || '')); return m ? +m[0] : null; }
  // A fixed cell of a section from the mapping's cells ('thresholds.strategicArr': 'N3')
  function fixedCell(map, key, path) { var s = spec(map, key), c = s && s.cells ? s.cells[path] : null; return typeof c === 'string' ? c : null; }

  // An address as the panels write it (sheet › cell), null without both parts; a list of cells on one sheet as addresses;
  // and the cells behind both values of a comparing note (D169)
  function addr(sheet, cell) { return sheet && cell ? sheet + TAP.content.text('sources.sep') + cell : null; }
  function addrs(sheet, cells) { return (cells || []).map(function (c) { return addr(sheet, c); }).filter(Boolean); }
  function cellsOf(found, expected) { return { found: found, expected: expected.filter(Boolean) }; }

  // Column letters, as the workbook writes them
  function colIndex(letters) {
    var n = 0, s = String(letters).toUpperCase();
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n;
  }
  function colLetter(n) { var s = ''; while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }

  // Expands a grid block's column axes to [{col, fields}], as section 20.1 describes: regular axes with strides, or an enumerated list
  function expandCols(cols) {
    if (Array.isArray(cols)) {
      return cols.map(function (e) { var f = Object.assign({}, e); delete f.col; return { col: e.col, fields: f }; });
    }
    if (!cols || !Array.isArray(cols.axes)) return [];
    var out = [{ offset: 0, fields: {} }];
    cols.axes.forEach(function (axis, i) {
      var stride = isNum(axis.stride) ? axis.stride : cols.axes.slice(i + 1).reduce(function (n, a) { return n * a.values.length; }, 1), next = [];
      out.forEach(function (o) {
        axis.values.forEach(function (v, k) {
          var f = Object.assign({}, o.fields); f[axis.field] = v;
          next.push({ offset: o.offset + k * stride, fields: f });
        });
      });
      out = next;
    });
    var first = colIndex(cols.first);
    return out.map(function (o) { return { col: colLetter(first + o.offset), fields: o.fields }; });
  }

  // Where an empty section's note points: its key column at the first row, or the grid's first cell
  function firstCell(map, key) {
    var s = spec(map, key === 'customerGrowth.accounts' ? 'customerGrowth' : key);
    if (!s) return null;
    if (s.rows) {
      var r = Array.isArray(s.rows) ? (s.rows[0] || {}).row : s.rows.first, c = Array.isArray(s.cols) ? (s.cols[0] || {}).col : (s.cols || {}).first;
      return typeof c === 'string' && isNum(r) ? c + r : null;
    }
    var col = s.columns ? s.columns[s.key || Object.keys(s.columns)[0]] : null;
    return typeof col === 'string' && isNum(s.firstRow) ? col + s.firstRow : null;
  }

  /* ---------- the sections of the first template ---------- */

  function industries(region, lookups, map, ctx) {
    var rows = region.marketCoverage;
    if (!Array.isArray(rows) || !Array.isArray(lookups.industries)) return;
    var have = {};
    rows.forEach(function (o) { if (o && o.industryId != null) have[o.industryId] = true; });
    var missing = lookups.industries.filter(function (ind) { return ind.rated !== false && !have[ind.id]; });
    if (!missing.length) return;
    var names = missing.map(function (ind) { return ind.name; }).join(', ');
    ctx.error(say('missingIndustries', { n: missing.length, names: names }), sheetOf(map, 'marketCoverage'), null,
      { kind: 'missingIndustries', item: sectionName('marketCoverage'), expected: names });
  }

  function empties(region, map, ctx) {
    EMPTY.forEach(function (key) {
      var list = key === 'customerGrowth.accounts' ? region.customerGrowth && region.customerGrowth.accounts : region[key];
      if (!Array.isArray(list) || list.length) return;
      var sheetKey = key === 'customerGrowth.accounts' ? 'customerGrowth' : key;
      ctx.note(say('emptySection', { section: sectionName(sheetKey) }), sheetOf(map, sheetKey), firstCell(map, key), { kind: 'emptySection', item: sectionName(sheetKey), ref: key });
    });
  }

  function newBusiness(region, lookups, map, ctx) {
    var sheet = sheetOf(map, 'newBusiness');
    (Array.isArray(region.newBusiness) ? region.newBusiness : []).forEach(function (o) {
      if (!o) return;
      var split = o.channelSplit, sum = 0, any = false, industry = label(lookups.industries, null, o.industryId);
      if (split && typeof split === 'object') {
        CHANNELS.forEach(function (ch) { if (isNum(split[ch])) { sum += split[ch]; any = true; } });
        if (any && Math.abs(sum - 1) > 0.01) {
          var first = cellOf(map, 'newBusiness', 'channelSplit.' + CHANNELS[0], o.sourceRow), last = cellOf(map, 'newBusiness', 'channelSplit.' + CHANNELS[3], o.sourceRow);
          var pct = Math.round(sum * 1000) / 10, range = first && last ? first + ':' + last : first;
          ctx.note(say('splitSum', { sum: pct }), sheet, range, { kind: 'splitSum', item: industry, found: pct + '%', expected: '100%', ref: o.industryId, cells: cellsOf(addr(sheet, range), []) });
        }
      }
      var a = Array.isArray(o.arrPotential) ? o.arrPotential[0] : null, want = o.targetAccounts * o.hitRate * o.avgDealSize;
      if ([o.targetAccounts, o.hitRate, o.avgDealSize, a].every(isNum) && !near(a, want, 0.01)) {
        var at = cellOf(map, 'newBusiness', 'arrPotential', o.sourceRow, 0);
        var parts = ['targetAccounts', 'hitRate', 'avgDealSize'].map(function (f) { return addr(sheet, cellOf(map, 'newBusiness', f, o.sourceRow)); });
        ctx.note(say('arrFormula', { found: round2(a), value: round2(want) }), sheet, at,
          { kind: 'arrFormula', item: industry, found: round2(a), expected: round2(want), ref: o.industryId, cells: cellsOf(addr(sheet, at), parts) });
      }
    });
  }

  // The template's segment rule (docs/DATA-CONTRACT.md), or null when a threshold or figure is blank
  function segmentFor(acc, t) {
    if (!t || ![acc.currentArr, t.strategicArr, t.scaledArr, t.growthArr, t.growthOrderIntake].every(isNum)) return null;
    if (acc.currentArr > t.strategicArr) return 'strategic';
    if (acc.currentArr < t.scaledArr) return 'scaled';
    if (!isNum(acc.cumulativeOrderIntake)) return null;
    return acc.cumulativeOrderIntake > t.growthOrderIntake && acc.currentArr > t.growthArr ? 'growth' : 'core';
  }

  var THRESHOLDS = ['strategicArr', 'scaledArr', 'growthArr', 'growthOrderIntake'];
  // The cells the segment rule read for an account (D169): current ARR, the cumulative order intake when the rule reached
  // it (an ARR between the scaled and strategic thresholds), then the four threshold cells
  function segmentCells(map, acc, t) {
    var sheet = sheetOf(map, 'customerGrowth'), fields = ['currentArr'];
    if (acc.currentArr <= t.strategicArr && acc.currentArr >= t.scaledArr) fields.push('cumulativeOrderIntake');
    return fields.map(function (f) { return addr(sheet, cellOf(map, 'customerGrowth', f, acc.sourceRow)); })
      .concat(THRESHOLDS.map(function (k) { return addr(sheet, fixedCell(map, 'customerGrowth', 'thresholds.' + k)); }));
  }

  function segments(region, lookups, map, ctx) {
    var cg = region.customerGrowth, sheet = sheetOf(map, 'customerGrowth');
    if (!cg || !Array.isArray(cg.accounts)) return;
    cg.accounts.forEach(function (acc) {
      if (!acc) return;
      var want = segmentFor(acc, cg.thresholds);
      if (want && acc.segment !== want) {
        var at = cellOf(map, 'customerGrowth', 'segment', acc.sourceRow);
        ctx.note(say('segmentRule', { found: acc.segment == null ? 'blank' : String(acc.segment), segment: want }), sheet, at,
          { kind: 'segmentRule', item: acc.name == null ? null : String(acc.name), expected: label(lookups.segments, null, want), ref: acc.id,
            found: acc.segment == null ? TAP.content.text('importPanel.read.blankCell') : label(lookups.segments, null, acc.segment),
            cells: cellsOf(addr(sheet, at), segmentCells(map, acc, cg.thresholds)) });
      }
    });
  }

  /* ---------- the full template (Phase 4) ---------- */

  // Sums a list's values by a key built from the named fields; also keeps the cells behind each key
  function totals(list, keys) {
    var out = {}, cells = {};
    (Array.isArray(list) ? list : []).forEach(function (o) {
      if (!o || !isNum(o.value)) return;
      var key = keys.map(function (f) { return o[f]; }).join(', ');
      out[key] = (out[key] || 0) + o.value;
      cells[key] = (cells[key] || []).concat(o.sourceCell ? [o.sourceCell] : []);
    });
    return { sum: out, cells: cells };
  }

  // Revenue against the order intake at the Data Contract's key, year, channel and motion, the types added up on both
  // sides as the contract check does (D170), so the note and the check's warning carry the same two figures
  function revenue(region, lookups, map, ctx) {
    if (!Array.isArray(region.revenue)) return;
    var found = totals(region.revenue, ['year', 'channel', 'motion']), intake = totals(region.recap, ['year', 'channel', 'motion']);
    var sheet = sheetOf(map, 'revenue'), recapSheet = sheetOf(map, 'recap');
    Object.keys(found.sum).forEach(function (key) {
      if (!isNum(intake.sum[key]) || found.sum[key] <= intake.sum[key] + 0.5) return;
      var parts = key.split(', '), list = found.cells[key].join(', ') || null;
      ctx.note(say('revenueAbove', { found: round2(found.sum[key]), value: round2(intake.sum[key]), key: key }), sheet, list,
        { kind: 'revenueAbove', item: keyWords(lookups, { year: parts[0], channel: parts[1], motion: parts[2] }), found: round2(found.sum[key]), expected: round2(intake.sum[key]),
          ref: parts.join('|'), cells: cellsOf(addr(sheet, list), addrs(recapSheet, intake.cells[key])) });
    });
  }

  // Books value against customer value over ARR and services, for the reseller channels, by year and channel
  function books(region, lookups, map, ctx) {
    if (!Array.isArray(region.booksValue)) return;
    var both = region.booksValue.filter(function (o) { return o && (o.type === 'arr' || o.type === 'services'); });
    var found = totals(both, ['year', 'channel']), customer = totals(region.recap, ['year', 'channel']), sheet = sheetOf(map, 'booksValue'), recapSheet = sheetOf(map, 'recap');
    Object.keys(found.sum).forEach(function (key) {
      var parts = key.split(', '), ch = parts[1], list = found.cells[key].join(', ') || null;
      if (RESELLERS.indexOf(ch) === -1 || !isNum(customer.sum[key]) || found.sum[key] <= customer.sum[key] + 0.5) return;
      ctx.note(say('booksAbove', { found: round2(found.sum[key]), value: round2(customer.sum[key]), key: key }), sheet, list,
        { kind: 'booksAbove', item: keyWords(lookups, { year: parts[0], channel: ch }), found: round2(found.sum[key]), expected: round2(customer.sum[key]), ref: parts[0] + '|' + ch,
          cells: cellsOf(addr(sheet, list), addrs(recapSheet, customer.cells[key])) });
    });
  }

  // The workbook's variance against books order intake minus the strategic plan, when the mapping has variance cells
  function variance(region, lookups, map, ctx) {
    var s = spec(map, 'strategicPlan');
    if (!Array.isArray(region.strategicPlan) || !s || !s.variance) return;
    var booked = totals(region.booksValue, ['year', 'type']), cols = expandCols(s.variance.cols), booksSheet = sheetOf(map, 'booksValue');
    region.strategicPlan.forEach(function (o) {
      if (!o || !isNum(o.variance) || !isNum(o.value)) return;
      var key = o.year + ', ' + o.type, want = booked.sum[key] - o.value;
      if (!isNum(booked.sum[key]) || near(o.variance, want, 0)) return;
      var col = cols.filter(function (c) { return c.fields.year === o.year; })[0], row = rowOf(o.sourceCell), at = col && row ? col.col + row : o.sourceCell || null;
      ctx.note(say('variance', { found: round2(o.variance), value: round2(want) }), s.sheet, at,
        { kind: 'variance', item: keyWords(lookups, { year: o.year, type: o.type }), found: round2(o.variance), expected: round2(want), ref: o.year + '|' + o.type,
          cells: cellsOf(addr(s.sheet, at), addrs(booksSheet, booked.cells[key]).concat([addr(s.sheet, o.sourceCell)])) });
    });
  }

  function coverage(region, lookups, map, ctx) {
    var by = region.baseYear;
    if (!by || !Array.isArray(by.items)) return;
    by.items.forEach(function (o) {
      if (!o) return;
      var left = o.forecast - o.actuals;
      if (![o.coverage, o.pipeline, o.forecast, o.actuals].every(isNum) || left <= 0) return;
      var want = o.pipeline / left;
      if (Math.abs(o.coverage - want) <= Math.abs(want) * 0.05) return;
      var sheet = sheetOf(map, 'baseYear'), at = cellOf(map, 'baseYear', 'coverage', o.sourceRow);
      var parts = ['pipeline', 'forecast', 'actuals'].map(function (f) { return addr(sheet, cellOf(map, 'baseYear', f, o.sourceRow)); });
      ctx.note(say('coverage', { found: round2(o.coverage), value: round2(want) }), sheet, at,
        { kind: 'coverage', item: label(lookups.productCategories, 'types', o.category), found: round2(o.coverage), expected: round2(want), ref: o.category, cells: cellsOf(addr(sheet, at), parts) });
    });
  }

  function run(region, lookups, map, ctx) {
    if (!region || typeof region !== 'object') return;
    lookups = lookups || {};
    industries(region, lookups, map, ctx);
    empties(region, map, ctx);
    newBusiness(region, lookups, map, ctx);
    segments(region, lookups, map, ctx);
    revenue(region, lookups, map, ctx);
    books(region, lookups, map, ctx);
    variance(region, lookups, map, ctx);
    coverage(region, lookups, map, ctx);
  }

  TAP.importChecks = { run: run };
})(window.TAP);
