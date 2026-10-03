/*
 * File: js/engine/measures.js
 * Purpose: One registry of every figure the app can show, read the same way by reports, cards and insights, so
 *          figures can't drift apart. Each measure returns a full cell with its source (ARCHITECTURE section 7).
 * Provides: TAP.measures (get, meta, define, list, combined)
 * Depends on: js/core/data.js, js/core/content.js, js/engine/aggregate.js, js/engine/scores.js (at call time)
 * Used by: prepare, builders, cards, headline, insights, details
 */
(function (TAP) {
  'use strict';

  var reg = {}, order = [];

  function define(id, meta, fn) {
    reg[id] = { meta: meta, fn: fn };
    if (order.indexOf(id) < 0) order.push(id);
  }
  function get(id) { return reg[id] ? reg[id].fn : null; }
  function list() { return order.slice(); }
  // Labels are read at call time, so the organization layer can rename any measure.
  function meta(id) {
    if (!reg[id]) return null;
    var t = 'measures.' + id;
    return Object.assign({ id: id, label: TAP.content.text(t + '.label'), short: TAP.content.text(t + '.short') }, reg[id].meta);
  }

  /* ---------- cells ---------- */

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function add(a, b) { return a + b; }
  function src(regionId, section, field, rows, year, kind) {
    return { regionId: regionId, section: section, field: field, row: rows.length === 1 ? rows[0] : null, rows: rows,
      year: year || null, cell: null, kind: kind };
  }
  function cell(v, kind, s, extra) { return Object.assign({ v: v, state: 'value', kind: kind, src: s }, extra || {}); }
  function blank(kind, s) { return { v: null, state: 'notProvided', kind: kind, src: s }; }
  function notApplicable(kind, s) { return { v: null, state: 'notApplicable', kind: kind, src: s }; }

  function region(id) { return TAP.data.region(id) || {}; }
  function inIndustry(rows, ctx) {
    return (rows || []).filter(function (r) { return !ctx.industryId || r.industryId === ctx.industryId; });
  }
  function nbRows(id, ctx) { return inIndustry(region(id).newBusiness, ctx); }
  function accounts(id, ctx) { return inIndustry((region(id).customerGrowth || {}).accounts, ctx); }
  function mcRows(id, ctx) { return inIndustry(region(id).marketCoverage, ctx); }
  function rowNums(rows) { return rows.map(function (r) { return r.sourceRow; }); }

  // One plan year from a three-year list, or the three-year sum (marked partial if a year is blank).
  function byYear(list, year) {
    if (!Array.isArray(list)) return { v: null };
    if (year) return { v: isNum(list[year - 1]) ? list[year - 1] : null };
    var nums = list.filter(isNum);
    return nums.length ? { v: nums.reduce(add, 0), partial: nums.length < list.length } : { v: null };
  }

  // Sums a value over rows. Blank rows are skipped; if every row is blank the figure is not provided.
  function sumRows(regionId, section, field, kind, rows, ctx, pick) {
    var used = [], total = 0, partial = false;
    rows.forEach(function (row) {
      var v = pick(row);
      if (v && typeof v === 'object') { partial = partial || !!v.partial; v = v.v; }
      if (!isNum(v)) return;
      total += v;
      used.push(row.sourceRow);
    });
    var s = src(regionId, section, field, used.length ? used : rowNums(rows), ctx.year, kind);
    if (!used.length) return blank(kind, s);
    return cell(total, kind, s, partial ? { partial: true, note: TAP.content.text('measures.partialYears') } : null);
  }
  function yearSum(field) { return function (ctx) { return function (row) { return byYear(row[field], ctx.year); }; }; }
  function plain(field) { return function () { return function (row) { return row[field]; }; }; }

  // A rate averaged over rows, weighted by each row's size. With no weight at all, rows count equally.
  function weightedRows(regionId, section, field, kind, rows, ctx, val, wt) {
    var used = [], sv = 0, sw = 0, sp = 0;
    rows.forEach(function (row) {
      var v = val(row), w = wt(row);
      if (!isNum(v) || !isNum(w) || w < 0) return;
      used.push(row.sourceRow);
      sv += v * w; sw += w; sp += v;
    });
    var s = src(regionId, section, field, used.length ? used : rowNums(rows), ctx.year, kind);
    if (!used.length) return blank(kind, s);
    return cell(sw > 0 ? sv / sw : sp / used.length, kind, s);
  }

  function wins(row) { return isNum(row.targetAccounts) && isNum(row.hitRate) ? row.targetAccounts * row.hitRate : null; }
  function arr3(row) { return byYear(row.arrPotential, null).v; }

  /* ---------- region measures ---------- */

  function amount(kind, dims) { return { unit: 'money', valueKind: 'amount', kind: kind, dims: dims }; }
  function count(kind, dims) { return { unit: 'count', valueKind: 'count', kind: kind, dims: dims }; }
  function rate(kind, weightBy, dims) { return { unit: 'pct', valueKind: 'rate', kind: kind, weightBy: weightBy, dims: dims }; }
  var NB = ['year', 'industry'], ROWS = ['industry'];

  function sums(id, m, getRows, section, field, pick) {
    define(id, m, function (r, ctx) { ctx = ctx || {}; return sumRows(r, section, field, m.kind, getRows(r, ctx), ctx, pick(ctx)); });
  }
  sums('nb.arr', amount('DER', NB), nbRows, 'newBusiness', 'arrPotential', yearSum('arrPotential'));
  sums('nb.services', amount('DER', NB), nbRows, 'newBusiness', 'servicesPotential', yearSum('servicesPotential'));
  sums('cg.arr', amount('DER', NB), accounts, 'customerGrowth', 'incrementalArr', yearSum('incrementalArr'));
  sums('cg.services', amount('DER', NB), accounts, 'customerGrowth', 'servicesOrderIntake', yearSum('servicesOrderIntake'));
  sums('base.arr', amount('PRE', ROWS), mcRows, 'marketCoverage', 'currentArr', plain('currentArr'));
  sums('base.pipeline', amount('PRE', ROWS), mcRows, 'marketCoverage', 'pipelineTotal', plain('pipelineTotal'));
  sums('base.pipeline12m', amount('PRE', ROWS), mcRows, 'marketCoverage', 'pipelineCreated12m', plain('pipelineCreated12m'));
  sums('nb.targetAccounts', count('IN', ROWS), nbRows, 'newBusiness', 'targetAccounts', plain('targetAccounts'));
  sums('nb.targetAccountsRated', count('IN', ROWS), nbRows, 'newBusiness', 'targetAccounts', function () {
    return function (row) { return isNum(row.hitRate) ? row.targetAccounts : null; };
  });
  sums('nb.wins', count('APP', ROWS), nbRows, 'newBusiness', 'hitRate', function () { return wins; });

  function rates(id, m, getRows, section, field, val, wt) {
    define(id, m, function (r, ctx) { ctx = ctx || {}; return weightedRows(r, section, field, m.kind, getRows(r, ctx), ctx, val, wt); });
  }
  rates('nb.hitRate', rate('IN', 'nb.targetAccountsRated', ROWS), nbRows, 'newBusiness', 'hitRate',
    function (row) { return row.hitRate; }, function (row) { return row.targetAccounts; });
  define('nb.avgDealSize', { unit: 'money', valueKind: 'rate', kind: 'IN', weightBy: 'nb.wins', dims: ROWS }, function (r, ctx) {
    ctx = ctx || {};
    return weightedRows(r, 'newBusiness', 'avgDealSize', 'IN', nbRows(r, ctx), ctx, function (row) { return row.avgDealSize; }, wins);
  });
  [2, 3].forEach(function (y) {
    rates('nb.growthY' + y, rate('IN', 'nb.arr', ROWS), nbRows, 'newBusiness', 'growth.year' + y,
      function (row) { return row.growth ? row.growth['year' + y] : null; }, arr3);
  });
  rates('nb.servicesRatio', rate('PRE', 'nb.arr', ROWS), nbRows, 'newBusiness', 'servicesRatio',
    function (row) { return row.servicesRatio; }, arr3);
  [1, 2, 3].forEach(function (y) {
    define('cg.growthY' + y, rate('IN', 'base.arr', ROWS), function (r, ctx) {
      ctx = ctx || {};
      var c = weightedRows(r, 'customerGrowth', 'growthPct', 'IN', accounts(r, ctx), ctx,
        function (a) { return Array.isArray(a.growthPct) ? a.growthPct[y - 1] : null; }, function (a) { return a.currentArr; });
      c.src.year = y;
      return c;
    });
  });

  // Counts of rows in a category. No rows with a value at all means not provided.
  function counts(id, m, getRows, section, field, match) {
    define(id, m, function (r, ctx) {
      ctx = ctx || {};
      var rows = getRows(r, ctx).filter(function (row) { return row[field] != null; });
      var s = src(r, section, field, rowNums(rows), null, m.kind);
      return rows.length ? cell(rows.filter(match).length, m.kind, s) : blank(m.kind, s);
    });
  }
  [1, 2, 3].forEach(function (t) {
    counts('focus.tier' + t, count('IN', []), function (r, ctx) {
      return mcRows(r, ctx).filter(function (row) { var d = TAP.data.industry(row.industryId); return !d || d.rated !== false; });
    }, 'marketCoverage', 'tier', function (row) { return row.tier === t; });
  });
  ['strategic', 'growth', 'core', 'scaled'].forEach(function (seg) {
    counts('cg.segment.' + seg, count('DER', ROWS), accounts, 'customerGrowth', 'segment', function (a) { return a.segment === seg; });
  });

  /* ---------- derived sums: ambition (amounts calculated by this app) ---------- */

  var DERIVED = {
    'amb.arr': ['nb.arr', 'cg.arr'],
    'amb.services': ['nb.services', 'cg.services'],
    'amb.oi': ['nb.arr', 'cg.arr', 'nb.services', 'cg.services']
  };
  Object.keys(DERIVED).forEach(function (id) {
    define(id, amount('APP', NB), function (r, ctx) {
      ctx = ctx || {};
      var parts = DERIVED[id].map(function (p) { return { id: p, cell: get(p)(r, ctx) }; });
      return sumParts(parts, { regionId: r, section: null, field: id, row: null, rows: [], year: ctx.year || null, cell: null, kind: 'APP' });
    });
  });

  // Adds the parts that have a value. A missing part makes the sum partial, with a note naming it.
  function sumParts(parts, s) {
    s.parts = parts.map(function (p) { return { measureId: p.id, src: p.cell.src }; });
    var have = parts.filter(function (p) { return p.cell.state === 'value'; });
    if (!have.length) {
      var allNa = parts.every(function (p) { return p.cell.state === 'notApplicable'; });
      return allNa ? notApplicable('APP', s) : blank('APP', s);
    }
    var out = cell(have.reduce(function (t, p) { return t + p.cell.v; }, 0), 'APP', s);
    var lost = parts.filter(function (p) { return p.cell.state === 'notProvided'; });
    if (lost.length) {
      out.partial = true;
      out.note = TAP.content.text('measures.partNotProvided', { parts: TAP.format.list(lost.map(function (p) { return lower(meta(p.id).label); })) });
    } else if (have.some(function (p) { return p.cell.partial; })) {
      out.partial = true;
      out.note = TAP.content.text('measures.partialYears');
    }
    return out;
  }
  // Lower-cases the first letter for use mid-sentence, but leaves acronyms such as ARR alone.
  function lower(s) { return !s ? '' : /^[A-Z][A-Z0-9]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); }

  /* ---------- combined figures for scope entities ---------- */

  // A region's own cell, or the regions combined by the US-1.2.5 rules. Derived sums add their combined parts,
  // so stacked parts always add up and a missing part is never averaged in as zero (ARCHITECTURE section 9).
  function combined(id, entity, ctx) {
    var m = meta(id);
    if (!m) return null;
    ctx = ctx || {};
    if (entity.kind !== 'combined' && entity.regionIds.length === 1) return get(id)(entity.regionIds[0], ctx);
    var how = entity.how === 'average' ? 'average' : 'total';
    if (DERIVED[id]) return combinedParts(id, entity, how, ctx);
    var items = entity.regionIds.map(function (r) { return { regionId: r, cell: get(id)(r, ctx) }; });
    return TAP.agg.combine(items, m.valueKind, how, { measureId: id, weights: ctx.weights, ctx: ctx });
  }

  function combinedParts(id, entity, how, ctx) {
    var parts = DERIVED[id].map(function (p) { return { id: p, cell: combined(p, entity, ctx) }; });
    var ids = entity.regionIds;
    var inAny = function (key) {
      return ids.filter(function (r) { return parts.some(function (p) { return (p.cell.src[key] || []).indexOf(r) >= 0; }); });
    };
    var s = { combined: true, how: how === 'average' ? 'mean' : 'sum', regionIds: ids.slice(), excluded: inAny('excluded'),
      notApplicable: ids.filter(function (r) { return parts.every(function (p) { return (p.cell.src.notApplicable || []).indexOf(r) >= 0; }); }),
      weightBy: null, year: ctx.year || null };
    var out = sumParts(parts, s);
    out.kind = 'APP';
    if (out.state === 'value' && !out.partial && parts.some(function (p) { return p.cell.partial; })) {
      out.partial = true;
      out.note = parts.filter(function (p) { return p.cell.note; }).map(function (p) { return p.cell.note; })[0];
    }
    return out;
  }

  TAP.measures = { get: get, meta: meta, define: define, list: list, combined: combined, DERIVED: DERIVED };
})(window.TAP);
