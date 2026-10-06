/*
 * File: js/engine/measures-p4b.js
 * Purpose: The Phase 4 measures read from rows: the base year, year 1 growth over it and pipeline coverage, new
 *          business by solution, order intake by route to market, and partners by maturity and type (US-4.1.4; ids in
 *          docs/ARCHITECTURE.md section 19.2).
 * Provides: measures registered with TAP.measures (by.* including by.plan, nb.<t>.sol, rt.oi, pt.count.maturity, pt.oi.maturity)
 * Depends on: js/engine/measures.js (define, derive, kit), measures-p2.js (kit2), measures-p4.js (kit4), js/core/content.js
 * Used by: reports, insights, the region profile and Build a chart
 * Owner: ENGINE4 stream (#439)
 */
(function (TAP) {
  'use strict';

  var M = TAP.measures, k = M.kit, k2 = M.kit2, k4 = M.kit4;

  function partialCategories() { return { partial: true, note: TAP.content.text('measures.partialCategories') }; }

  /* ---------- the base year ---------- */

  // The base-year items in context. An item whose category is not a product category counts under 'none'.
  function baseRows(r, ctx) {
    var all = (k4.region(r).baseYear || {}).items || [];
    return !ctx.category ? all : all.filter(function (it) { return k4.valueOf('productCategories', it.category) === ctx.category; });
  }
  function baseSum(field) {
    return function (r, ctx) {
      ctx = ctx || {};
      var rows = baseRows(r, ctx), used = rows.filter(function (it) { return k.isNum(it[field]); });
      var s = k.src(r, 'baseYear', field, k2.rows(used.length ? used : rows), null, 'PRE');
      if (!used.length) return k.blank('PRE', s);
      return k.cell(k2.sum(used.map(function (it) { return it[field]; })), 'PRE', s, used.length < rows.length ? partialCategories() : null);
    };
  }
  ['budget', 'forecast', 'actuals', 'pipeline'].forEach(function (f) {
    M.define('by.' + f, k4.p4(k.amount('PRE', ['category'])), baseSum(f));
  });

  // The base-year figure growth is measured against: the forecast unless ctx.against says 'budget'
  function againstOf(ctx) { return ctx.against === 'budget' ? 'budget' : 'forecast'; }
  // Plan year 1 on the base year's basis: the books value of the categories the base-year figure is given for,
  // so the two are like for like (as sp.plan is for the strategic plan).
  M.define('by.plan', k4.p4(k.amount('DER', ['category'])), function (r, ctx) {
    ctx = ctx || {};
    var against = againstOf(ctx);
    var types = baseRows(r, ctx).filter(function (it) { return k.isNum(it[against]); }).map(function (it) { return k4.CAT_TYPE[it.category]; });
    return k4.items(r, 'booksValue', 'DER', { year: 1 }, function (it) { return types.indexOf(it.type) >= 0; });
  });
  // Plan year 1 (by.plan) over the base year, minus 1.
  M.define('by.growth', k4.p4(k2.rate('APP', 'by.forecast', ['category'])), function (r, ctx) {
    ctx = ctx || {};
    var against = againstOf(ctx), base = M.get('by.' + against)(r, ctx), y1 = M.get('by.plan')(r, ctx);
    var s = k4.made(r, 'by.growth', {}, [['by.plan', y1], ['by.' + against, base]]);
    if (y1.state !== 'value' || base.state !== 'value') return k.blank('APP', s);
    var out = k2.ratioCell(y1.v - base.v, base.v, s);
    if (out.state === 'value' && (y1.partial || base.partial)) { out.partial = true; out.note = y1.note || base.note; }
    return out;
  });

  // What one item adds to coverage: its pipeline, over the order intake still to win (forecast minus actuals). The
  // workbook's own ratio stands when it gives one, and the amount still to win is read back from it.
  function cover(it) {
    var p = it.pipeline, c = it.coverage, left = k.isNum(it.forecast) && k.isNum(it.actuals) ? it.forecast - it.actuals : null;
    if (k.isNum(c)) {
      if (k.isNum(p) && c > 0) return { given: c, num: p, den: p / c };
      return left > 0 ? { given: c, num: c * left, den: left } : { given: c };
    }
    return k.isNum(p) && left != null ? { num: p, den: left } : null;
  }
  // One item with the workbook's ratio is that figure (a system figure). Anything else is worked out by this app:
  // the summed pipeline over the summed amount still to win. Nothing still to win has no coverage: not applicable.
  M.define('by.coverage', k4.p4(k2.rate('APP', 'by.forecast', ['category'], 'ratio')), function (r, ctx) {
    ctx = ctx || {};
    var rows = baseRows(r, ctx);
    var parts = rows.map(function (it) { return { it: it, c: cover(it) }; }).filter(function (x) { return x.c; });
    if (rows.length === 1 && parts.length === 1 && parts[0].c.given != null) {
      var g = parts[0].c;
      return k.cell(g.given, 'PRE', k.src(r, 'baseYear', 'coverage', k2.rows(rows), null, 'PRE'),
        g.den != null ? { ratio: { num: g.num, den: g.den } } : null);
    }
    var used = parts.filter(function (x) { return x.c.den != null; });
    var s = k.src(r, 'baseYear', 'pipeline', k2.rows(used.length ? used.map(function (x) { return x.it; }) : rows), null, 'APP');
    if (!used.length) return k.blank('APP', s);
    var out = k2.ratioCell(k2.sum(used.map(function (x) { return x.c.num; })), k2.sum(used.map(function (x) { return x.c.den; })), s);
    return out.state === 'value' && used.length < rows.length ? Object.assign(out, partialCategories()) : out;
  });

  /* ---------- new business by solution ---------- */

  function named(row) { return row.solution != null && row.solution !== ''; }
  // The new business figure (nb.arr, nb.services), for all rows or those of ctx.solution, read by the same rule so
  // the two can never disagree. A region where no row names a solution has not filled the column: not provided.
  function bySolution(id, field) {
    return function (r, ctx) {
      ctx = ctx || {};
      if (!(k4.region(r).newBusiness || []).some(named)) return k.blank('DER', k.src(r, 'newBusiness', field, [], ctx.year, 'DER'));
      return M.get(id)(r, { year: ctx.year || null, solution: ctx.solution || null });
    };
  }
  var YS = ['year', 'solution'];
  M.define('nb.arr.sol', k4.p4(k.amount('DER', YS)), bySolution('nb.arr', 'arrPotential'));
  M.define('nb.services.sol', k4.p4(k.amount('DER', YS)), bySolution('nb.services', 'servicesPotential'));
  // A sum made by this app, as nb.oi is: its parts always add up, also when combined
  M.derive('nb.oi.sol', ['nb.arr.sol', 'nb.services.sol'], k4.p4(k.amount('APP', YS)));

  /* ---------- order intake by route to market ---------- */

  M.define('rt.oi', k4.p4(k.amount('DER', ['year', 'route', 'solution'])), function (r, ctx) {
    ctx = ctx || {};
    return k4.items(r, 'routes', 'DER', ctx, function (it) {
      return (!ctx.route || k4.valueOf('routes', it.route) === ctx.route) &&
        (!ctx.solution || k4.valueOf('solutions', it.solution) === ctx.solution);
    });
  });

  /* ---------- partners by maturity and type ---------- */

  function maturityOf(p) { var m = k4.maturity(p.maturity); return m ? m.id : 'none'; }
  // A partner's three-year order intake (ARR plus services); partly provided when a year or one of the two is blank
  function orderIntake(p) {
    var a = k.byYear(p.arr, null), b = k.byYear(p.services, null);
    if (!k.isNum(a.v) && !k.isNum(b.v)) return null;
    return { v: (a.v || 0) + (b.v || 0), partial: !!(a.partial || b.partial || !k.isNum(a.v) || !k.isNum(b.v)) };
  }
  // Sums a value over the partners in context (ctx.maturity, ctx.partnerType; 'none' for partners without one).
  // A file without the maturity and type lookups, or a region with no partners, is not provided; a level or type
  // no partner has is zero.
  function partners(field, pick) {
    return function (r, ctx) {
      ctx = ctx || {};
      var all = k4.region(r).partners || [], used = [], total = 0, partial = false;
      var rows = all.filter(function (p) {
        return (!ctx.maturity || maturityOf(p) === ctx.maturity) && (!ctx.partnerType || k4.valueOf('partnerTypes', p.type) === ctx.partnerType);
      });
      rows.forEach(function (p) {
        var v = pick(p);
        if (v && typeof v === 'object') { partial = partial || v.partial; v = v.v; }
        if (!k.isNum(v)) return;
        total += v;
        used.push(p.sourceRow);
      });
      var s = k.src(r, 'partners', field, used.length ? used : k2.rows(rows.length ? rows : all), null, 'IN');
      var known = k4.lookup('partnerMaturity').length || k4.lookup('partnerTypes').length;
      if (!known || !all.length || (rows.length && !used.length)) return k.blank('IN', s);
      return k.cell(total, 'IN', s, partial ? k2.partialYears() : null);
    };
  }
  var MT = ['maturity', 'partnerType'];
  M.define('pt.count.maturity', k4.p4(k.count('IN', MT)), partners('maturity', k2.one));
  M.define('pt.oi.maturity', k4.p4(k.amount('IN', MT)), partners('arr', orderIntake));
})(window.TAP);
