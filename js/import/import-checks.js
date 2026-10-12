/*
 * File: js/import/import-checks.js
 * Purpose: The import brief's section 5 cross-checks on one region, as errors or notes with sheet and cell; docs/ARCHITECTURE.md section 20.
 *          Mirrors the rules of js/core/check-rows.js and js/core/check-p4.js; where the brief differs, the brief wins.
 * Provides: TAP.importChecks (run)
 * Depends on: js/core/content.js (content/text-import.js wording)
 * Used by: js/import/import-region.js
 * Owner: PLAN stream (#586)
 *
 * run(region, lookups, map, ctx): every finding goes through ctx.note or ctx.error as {message, sheet, cell}. Cells come
 * from the mapping (a column plus the item's sourceRow) or from the item's own sourceCell. A missing rated industry is
 * the only error here; everything else is a note. A section the region does not carry is never reported.
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
    ctx.error(say('missingIndustries', { n: missing.length, names: missing.map(function (ind) { return ind.name; }).join(', ') }), sheetOf(map, 'marketCoverage'), null);
  }

  function empties(region, map, ctx) {
    EMPTY.forEach(function (key) {
      var list = key === 'customerGrowth.accounts' ? region.customerGrowth && region.customerGrowth.accounts : region[key];
      if (!Array.isArray(list) || list.length) return;
      var sheetKey = key === 'customerGrowth.accounts' ? 'customerGrowth' : key;
      ctx.note(say('emptySection', { section: sectionName(sheetKey) }), sheetOf(map, sheetKey), firstCell(map, key));
    });
  }

  function newBusiness(region, map, ctx) {
    var sheet = sheetOf(map, 'newBusiness');
    (Array.isArray(region.newBusiness) ? region.newBusiness : []).forEach(function (o) {
      if (!o) return;
      var split = o.channelSplit, sum = 0, any = false;
      if (split && typeof split === 'object') {
        CHANNELS.forEach(function (ch) { if (isNum(split[ch])) { sum += split[ch]; any = true; } });
        if (any && Math.abs(sum - 1) > 0.01) {
          var first = cellOf(map, 'newBusiness', 'channelSplit.' + CHANNELS[0], o.sourceRow), last = cellOf(map, 'newBusiness', 'channelSplit.' + CHANNELS[3], o.sourceRow);
          ctx.note(say('splitSum', { sum: Math.round(sum * 1000) / 10 }), sheet, first && last ? first + ':' + last : first);
        }
      }
      var a = Array.isArray(o.arrPotential) ? o.arrPotential[0] : null, want = o.targetAccounts * o.hitRate * o.avgDealSize;
      if ([o.targetAccounts, o.hitRate, o.avgDealSize, a].every(isNum) && !near(a, want, 0.01)) {
        ctx.note(say('arrFormula', { found: round2(a), value: round2(want) }), sheet, cellOf(map, 'newBusiness', 'arrPotential', o.sourceRow, 0));
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

  function segments(region, map, ctx) {
    var cg = region.customerGrowth;
    if (!cg || !Array.isArray(cg.accounts)) return;
    cg.accounts.forEach(function (acc) {
      if (!acc) return;
      var want = segmentFor(acc, cg.thresholds);
      if (want && acc.segment !== want) {
        ctx.note(say('segmentRule', { found: acc.segment == null ? 'blank' : String(acc.segment), segment: want }), sheetOf(map, 'customerGrowth'), cellOf(map, 'customerGrowth', 'segment', acc.sourceRow));
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

  function revenue(region, map, ctx) {
    if (!Array.isArray(region.revenue)) return;
    var intake = totals(region.recap, ['year', 'channel', 'motion', 'type']).sum, sheet = sheetOf(map, 'revenue');
    region.revenue.forEach(function (o) {
      if (!o || !isNum(o.value)) return;
      var key = [o.year, o.channel, o.motion, o.type].join(', ');
      if (!isNum(intake[key]) || o.value <= intake[key] + 0.5) return;
      ctx.note(say('revenueAbove', { found: round2(o.value), value: round2(intake[key]), key: key }), sheet, o.sourceCell || null);
    });
  }

  // Books value against customer value over ARR and services, for the reseller channels, by year and channel
  function books(region, map, ctx) {
    if (!Array.isArray(region.booksValue)) return;
    var both = region.booksValue.filter(function (o) { return o && (o.type === 'arr' || o.type === 'services'); });
    var found = totals(both, ['year', 'channel']), customer = totals(region.recap, ['year', 'channel']).sum;
    Object.keys(found.sum).forEach(function (key) {
      var ch = key.split(', ')[1];
      if (RESELLERS.indexOf(ch) === -1 || !isNum(customer[key]) || found.sum[key] <= customer[key] + 0.5) return;
      ctx.note(say('booksAbove', { found: round2(found.sum[key]), value: round2(customer[key]), key: key }), sheetOf(map, 'booksValue'), found.cells[key].join(', ') || null);
    });
  }

  // The workbook's variance against books order intake minus the strategic plan, when the mapping has variance cells
  function variance(region, map, ctx) {
    var s = spec(map, 'strategicPlan');
    if (!Array.isArray(region.strategicPlan) || !s || !s.variance) return;
    var booked = totals(region.booksValue, ['year', 'type']).sum, cols = expandCols(s.variance.cols);
    region.strategicPlan.forEach(function (o) {
      if (!o || !isNum(o.variance) || !isNum(o.value)) return;
      var key = o.year + ', ' + o.type;
      if (!isNum(booked[key]) || near(o.variance, booked[key] - o.value, 0)) return;
      var col = cols.filter(function (c) { return c.fields.year === o.year; })[0], row = rowOf(o.sourceCell);
      ctx.note(say('variance', { found: round2(o.variance), value: round2(booked[key] - o.value) }), s.sheet, col && row ? col.col + row : o.sourceCell || null);
    });
  }

  function coverage(region, map, ctx) {
    var by = region.baseYear;
    if (!by || !Array.isArray(by.items)) return;
    by.items.forEach(function (o) {
      if (!o) return;
      var left = o.forecast - o.actuals;
      if (![o.coverage, o.pipeline, o.forecast, o.actuals].every(isNum) || left <= 0) return;
      var want = o.pipeline / left;
      if (Math.abs(o.coverage - want) <= Math.abs(want) * 0.05) return;
      ctx.note(say('coverage', { found: round2(o.coverage), value: round2(want) }), sheetOf(map, 'baseYear'), cellOf(map, 'baseYear', 'coverage', o.sourceRow));
    });
  }

  function run(region, lookups, map, ctx) {
    if (!region || typeof region !== 'object') return;
    industries(region, lookups || {}, map, ctx);
    empties(region, map, ctx);
    newBusiness(region, map, ctx);
    segments(region, map, ctx);
    revenue(region, map, ctx);
    books(region, map, ctx);
    variance(region, map, ctx);
    coverage(region, map, ctx);
  }

  TAP.importChecks = { run: run };
})(window.TAP);
