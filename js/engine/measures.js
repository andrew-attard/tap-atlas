/*
 * File: js/engine/measures.js
 * Purpose: One registry of every figure the app can show, read the same way by reports, cards and insights, so
 *          figures can't drift apart. Each measure returns a full cell with its source (ARCHITECTURE section 7).
 * Provides: TAP.measures (get, meta, define, list, combined, derive, DERIVED: the derived sums and their parts,
 *           kit: cell helpers for js/engine/measures-p2.js)
 * Depends on: js/core/data.js, js/core/content.js, js/core/format.js, js/engine/aggregate.js, js/engine/measures-p4.js
 *             (kit4: the solution a new business row names) (at call time).
 *             js/engine/scores.js adds the ind.* measures
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
    var m = reg[id].meta, words = typeof m.words === 'function' ? m.words() : null;   // names that follow the data, e.g. channel names
    return Object.assign({ id: id, label: TAP.content.text(t + '.label'), short: TAP.content.text(t + '.short') }, m, words);
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
  // New business rows in context: the industry and, from Phase 4, the solution a row names ('none': it names none)
  function nbRows(id, ctx) {
    var rows = inIndustry(region(id).newBusiness, ctx);
    return !ctx.solution ? rows : rows.filter(function (r) { return TAP.measures.kit4.valueOf('solutions', r.solution) === ctx.solution; });
  }
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

  // A rate averaged over rows, weighted by each row's size (D78). Rows with a value but a blank weight are left out
  // and the cell is partly provided; when no row has a weight, the rows count equally. A weighted cell keeps its
  // sums (ratio {num, den}), so a combined figure weighs each region by the rows its own figure used.
  function weightedRows(regionId, section, field, kind, rows, ctx, val, wt) {
    var given = rows.filter(function (row) { return isNum(val(row)); });
    var weighted = given.filter(function (row) { var w = wt(row); return isNum(w) && w >= 0; });
    var used = weighted.length ? weighted : given, sv = 0, sw = 0, sp = 0;
    used.forEach(function (row) {
      var v = val(row), w = weighted.length ? wt(row) : 1;
      sv += v * w; sw += w; sp += v;
    });
    var s = src(regionId, section, field, rowNums(used.length ? used : rows), ctx.year, kind);
    if (!used.length) return blank(kind, s);
    if (!weighted.length) return cell(sp / used.length, kind, s);
    var extra = { ratio: { num: sv, den: sw } };
    if (weighted.length < given.length) { extra.partial = true; extra.note = TAP.content.text('measures.partialWeights'); }
    return cell(sw > 0 ? sv / sw : sp / used.length, kind, s, extra);
  }

  /*
   * D48: a figure for one industry when the region has no row for it.
   * New business: Tier 3 or unrated is not applicable (never counted, never a gap); Tier 1 or 2, a blank tier or
   * an empty section is not provided. Customer growth: a filled accounts list with no account in the industry is
   * zero; an empty list is not provided (the normal path). Returns null when the rows decide.
   */
  function nbGap(r, ctx, kind, field) {
    if (!ctx.industryId || inIndustry(region(r).newBusiness, ctx).length) return null;
    var ind = TAP.data.industry(ctx.industryId);
    var mc = TAP.data.row(r, 'marketCoverage', function (d) { return d.industryId === ctx.industryId; });
    var s = src(r, 'newBusiness', field, [], ctx.year, kind);
    return !ind || ind.rated === false || (mc && mc.tier === 3) ? notApplicable(kind, s) : blank(kind, s);
  }
  function cgGap(r, ctx, kind, field) {
    if (!ctx.industryId || accounts(r, ctx).length || !accounts(r, {}).length) return null;
    return cell(0, kind, src(r, 'customerGrowth', field, [], ctx.year, kind));
  }
  function gap(section, r, ctx, kind, field) {
    return section === 'newBusiness' ? nbGap(r, ctx, kind, field) : section === 'customerGrowth' ? cgGap(r, ctx, kind, field) : null;
  }

  function wins(row) { return isNum(row.targetAccounts) && isNum(row.hitRate) ? row.targetAccounts * row.hitRate : null; }
  function arr3(row) { return byYear(row.arrPotential, null).v; }

  /* ---------- region measures ---------- */

  function amount(kind, dims) { return { unit: 'money', valueKind: 'amount', kind: kind, dims: dims }; }
  function count(kind, dims) { return { unit: 'count', valueKind: 'count', kind: kind, dims: dims }; }
  function rate(kind, weightBy, dims) { return { unit: 'pct', valueKind: 'rate', kind: kind, weightBy: weightBy, dims: dims }; }
  var NB = ['year', 'industry'], ROWS = ['industry'], NBS = NB.concat('solution');

  function sums(id, m, getRows, section, field, pick) {
    define(id, m, function (r, ctx) {
      ctx = ctx || {};
      var none = gap(section, r, ctx, m.kind, field), rows = none ? [] : getRows(r, ctx);
      // Rows exist, none for the solution in context: zero, so the solutions add up to the figure
      if (!none && ctx.solution && !rows.length && getRows(r, Object.assign({}, ctx, { solution: null })).length) {
        return cell(0, m.kind, src(r, section, field, [], ctx.year, m.kind));
      }
      return none || sumRows(r, section, field, m.kind, rows, ctx, pick(ctx));
    });
  }
  sums('nb.arr', amount('DER', NBS), nbRows, 'newBusiness', 'arrPotential', yearSum('arrPotential'));
  sums('nb.services', amount('DER', NBS), nbRows, 'newBusiness', 'servicesPotential', yearSum('servicesPotential'));
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
  sums('cg.baseArr', amount('PRE', ROWS), accounts, 'customerGrowth', 'currentArr', plain('currentArr'));

  function rates(id, m, section, field, val, wt) {
    m.combine = 'rowWeights';
    define(id, m, function (r, ctx) {
      ctx = ctx || {};
      return gap(section, r, ctx, m.kind, field) || weightedRows(r, section, field, m.kind, nbRows(r, ctx), ctx, val, wt);
    });
  }
  rates('nb.hitRate', rate('IN', 'nb.targetAccountsRated', ROWS), 'newBusiness', 'hitRate',
    function (row) { return row.hitRate; }, function (row) { return row.targetAccounts; });
  rates('nb.avgDealSize', { unit: 'money', valueKind: 'rate', kind: 'IN', weightBy: 'nb.wins', dims: ROWS }, 'newBusiness',
    'avgDealSize', function (row) { return row.avgDealSize; }, wins);
  [2, 3].forEach(function (y) {
    rates('nb.growthY' + y, rate('IN', 'nb.arr', ROWS), 'newBusiness', 'growth.year' + y,
      function (row) { return row.growth ? row.growth['year' + y] : null; }, arr3);
  });
  rates('nb.servicesRatio', rate('PRE', 'nb.arr', ROWS), 'newBusiness', 'servicesRatio', function (row) { return row.servicesRatio; }, arr3);

  // Customer growth % for a plan year is cg.growth.all for that year (js/engine/measures-p2.js): incremental ARR over
  // the accounts' current ARR, combined from the summed parts. One rule, so an insight and its chart agree (D78).
  [1, 2, 3].forEach(function (y) {
    define('cg.growthY' + y, Object.assign(rate('APP', 'cg.baseArr', ROWS), { combine: 'ratioOfSums' }), function (r, ctx) {
      return get('cg.growth.all')(r, Object.assign({}, ctx || {}, { year: y }));
    });
  });

  // Counts of rows in a category. No rows with a value at all means not provided.
  function counts(id, m, getRows, section, field, match) {
    define(id, m, function (r, ctx) {
      ctx = ctx || {};
      var rows = getRows(r, ctx).filter(function (row) { return row[field] != null; });
      var s = src(r, section, field, rowNums(rows), null, m.kind);
      var none = gap(section, r, ctx, m.kind, field);
      if (none) return none;
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
  // A sum of other measures: per region the sum of its parts, combined as the sum of the combined parts.
  function derive(id, parts, m) {
    DERIVED[id] = parts.slice();
    define(id, m || amount('APP', NB), function (r, ctx) {
      ctx = ctx || {};
      var cells = DERIVED[id].map(function (p) { return { id: p, cell: get(p)(r, ctx) }; });
      return sumParts(cells, { regionId: r, section: null, field: id, row: null, rows: [], year: ctx.year || null, cell: null, kind: 'APP' });
    });
  }
  Object.keys(DERIVED).forEach(function (id) { derive(id, DERIVED[id]); });

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
      out.note = have.filter(function (p) { return p.cell.partial; })[0].cell.note || TAP.content.text('measures.partialYears');
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
    // Shares and ratios: the summed numerators over the summed denominators, never a mean of ratios (17.5)
    if (m.combine === 'ratioOfSums') return TAP.agg.ratio(items);
    if (m.combine === 'rowWeights' && !(ctx.weights && ctx.weights[id])) return rowWeighted(id, items, how, ctx);
    return TAP.agg.combine(items, m.valueKind, how, { measureId: id, weights: ctx.weights, ctx: ctx });
  }

  // Row-weighted rates (D78): each region weighs the summed weight of the rows its own figure used, so the result
  // is the ratio of the summed rows. A region whose rows had no weight is named as "weight missing"; when no region
  // has a weight, the regions count equally.
  function rowWeighted(id, items, how, ctx) {
    var any = items.some(function (it) { return it.cell.state === 'value' && it.cell.ratio; });
    items.forEach(function (it) { it.weight = !any ? 1 : it.cell.ratio ? it.cell.ratio.den : null; });
    var out = TAP.agg.combine(items, 'rate', how, { measureId: id, ctx: ctx });
    if (!any && out.state === 'value') out.src.weightFallback = true;
    return out;
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

  // Shared with js/engine/measures-p2.js, so Phase 2 cells are made by the same rules.
  var kit = { isNum: isNum, src: src, cell: cell, blank: blank, notApplicable: notApplicable, byYear: byYear, gap: gap,
    amount: amount, count: count };
  TAP.measures = { get: get, meta: meta, define: define, list: list, combined: combined, derive: derive, DERIVED: DERIVED, kit: kit };
})(window.TAP);
