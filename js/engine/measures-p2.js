/*
 * File: js/engine/measures-p2.js
 * Purpose: The Phase 2 measures: recap by channel and motion, new business by tier and industry, customer growth by
 *          segment, exposure, partners and plan make-up (US-2.7.4). Shares and ratios carry their numerator and
 *          denominator (cell.ratio), so combined figures are the summed parts, never a mean of shares (D60).
 * Provides: adds measures to TAP.measures (catalogue in docs/ARCHITECTURE.md section 17.5)
 * Depends on: js/engine/measures.js (define, derive, kit), js/core/data.js, js/core/content.js, js/engine/aggregate.js
 * Used by: Phase 2 report definitions, js/insights/rules-*.js
 * Owner: ENGINE2 stream (#196)
 */
(function (TAP) {
  'use strict';

  var M = TAP.measures, k = M.kit;
  var CH = ['direct', 'partner', 'allianceA', 'allianceB'], SEGS = ['strategic', 'growth', 'core', 'scaled'];
  var MOTION = { nb: 'newBusiness', cg: 'customerGrowth' }, BOTH = ['newBusiness', 'customerGrowth'];
  var TYPES = { arr: ['arr'], services: ['services'], oi: ['arr', 'services'] };

  function region(id) { return TAP.data.region(id) || {}; }
  function sum(list) { return list.reduce(function (t, v) { return t + v; }, 0); }
  function rows(list) { return list.map(function (x) { return x.sourceRow; }); }
  function partialYears() { return { partial: true, note: TAP.content.text('measures.partialYears') }; }
  function rate(kind, weightBy, dims, unit) {
    return { unit: unit || 'pct', valueKind: 'rate', kind: kind, weightBy: weightBy, combine: 'ratioOfSums', dims: dims };
  }

  // A share or ratio cell that keeps its parts. A zero denominator has no share: not applicable, never a gap.
  function ratioCell(num, den, s, extra) {
    var r = Object.assign({ num: num, den: den }, extra || {});
    if (!(den > 0)) return Object.assign(k.notApplicable('APP', s), { ratio: r });
    return k.cell(num / den, 'APP', s, { ratio: r });
  }
  // A ratio of two cells: blank if either is blank, partial if either is partial.
  function share(n, d, s) {
    if (n.state !== 'value' || d.state !== 'value') {
      return n.state === 'notApplicable' && d.state === 'notApplicable' ? k.notApplicable('APP', s) : k.blank('APP', s);
    }
    var out = ratioCell(n.v, d.v, s);
    if (out.state === 'value' && (n.partial || d.partial)) { out.partial = true; out.note = n.note || d.note; }
    return out;
  }

  /* ---------- recap: order intake by motion, type and channel ---------- */

  // Sums the recap items that match. Recap years are calendar years; ctx.year is the plan year 1 to 3.
  function recap(r, ctx, motions, types, channel) {
    var years = (TAP.data.meta() || {}).years || [], want = ctx.year ? [years[ctx.year - 1]] : years;
    var hit = (region(r).recap || []).filter(function (it) {
      return motions.indexOf(it.motion) >= 0 && types.indexOf(it.type) >= 0 && (!channel || it.channel === channel) &&
        want.indexOf(it.year) >= 0 && k.isNum(it.value);
    });
    var s = k.src(r, 'recap', 'value', [], ctx.year, 'DER');
    s.cells = hit.map(function (it) { return it.sourceCell; });
    s.cell = s.cells.length === 1 ? s.cells[0] : null;
    if (!hit.length) return k.blank('DER', s);
    var gap = want.some(function (y) { return !hit.some(function (it) { return it.year === y; }); });
    return k.cell(sum(hit.map(function (it) { return it.value; })), 'DER', s, gap ? partialYears() : null);
  }
  ['nb', 'cg', 'all'].forEach(function (m) {
    var fixed = m === 'all' ? BOTH : [MOTION[m]];
    Object.keys(TYPES).forEach(function (t) {
      var id = 'rc.' + m + '.' + t;
      M.define(id, k.amount('DER', m === 'all' ? ['year', 'channel', 'motion'] : ['year', 'channel']), function (r, ctx) {
        ctx = ctx || {};
        var ms = m === 'all' && MOTION[ctx.motion] ? [MOTION[ctx.motion]] : fixed;
        return recap(r, ctx, ms, TYPES[t], ctx.channel || null);
      });
      CH.forEach(function (c) {
        M.define(id + '.' + c, k.amount('DER', ['year']), function (r, ctx) { return recap(r, ctx || {}, fixed, TYPES[t], c); });
      });
    });
  });
  CH.forEach(function (c) {
    M.define('rc.share.' + c, rate('APP', 'rc.all.oi', ['year']), function (r, ctx) {
      ctx = ctx || {};
      var n = recap(r, ctx, BOTH, TYPES.oi, c), d = recap(r, ctx, BOTH, TYPES.oi, null);
      var s = k.src(r, 'recap', 'value', [], ctx.year, 'APP');
      s.cells = n.src.cells;
      return share(n, d, s);
    });
  });

  /* ---------- new business: order intake, tiers and industries ---------- */

  M.derive('nb.oi', ['nb.arr', 'nb.services'], k.amount('APP', ['year', 'industry']));

  // New business in the region's Tier 1 or Tier 2 rows. A filled section with no row in the tier is zero.
  function nbTier(r, ctx, tier, field) {
    var all = region(r).newBusiness || [], mine = all.filter(function (row) { return row.tier === tier; });
    if (!all.length) return k.blank('DER', k.src(r, 'newBusiness', field, [], ctx.year, 'DER'));
    if (!mine.length) return k.cell(0, 'DER', k.src(r, 'newBusiness', field, [], ctx.year, 'DER'));
    var used = [], partial = false, tot = 0;
    mine.forEach(function (row) {
      var b = k.byYear(row[field], ctx.year);
      if (!k.isNum(b.v)) return;
      tot += b.v;
      partial = partial || !!b.partial;
      used.push(row.sourceRow);
    });
    var s = k.src(r, 'newBusiness', field, used.length ? used : rows(mine), ctx.year, 'DER');
    return used.length ? k.cell(tot, 'DER', s, partial ? partialYears() : null) : k.blank('DER', s);
  }
  [1, 2].forEach(function (tier) {
    M.define('nb.arr.tier' + tier, k.amount('DER', ['year']), function (r, ctx) { return nbTier(r, ctx || {}, tier, 'arrPotential'); });
    M.define('nb.services.tier' + tier, k.amount('DER', ['year']), function (r, ctx) { return nbTier(r, ctx || {}, tier, 'servicesPotential'); });
    M.derive('nb.oi.tier' + tier, ['nb.arr.tier' + tier, 'nb.services.tier' + tier], k.amount('APP', ['year']));
  });

  // One industry (ctx.industryId), read exactly as nb.services, so the two can never disagree (D48).
  M.define('ind.nb.services', k.amount('DER', ['year']), function (r, ctx) {
    ctx = ctx || {};
    if (!ctx.industryId) return k.notApplicable('DER', k.src(r, 'newBusiness', 'servicesPotential', [], ctx.year, 'DER'));
    return M.get('nb.services')(r, ctx);
  });
  M.derive('ind.nb.oi', ['ind.nb.arr', 'ind.nb.services'], k.amount('APP', ['year']));

  /* ---------- customer growth: segments, risk, growth and exposure ---------- */

  function riskOf(a) { return a.riskLevel === 'high' || a.riskLevel === 'medium' ? a.riskLevel : 'none'; }
  // The accounts in context: segment (fixed by the measure, or ctx.segment), risk level and industry.
  function accounts(r, ctx, seg) {
    var all = ((region(r).customerGrowth || {}).accounts) || [];
    seg = seg || ctx.segment;
    return { all: all, rows: all.filter(function (a) {
      return (!seg || a.segment === seg) && (!ctx.risk || riskOf(a) === ctx.risk) && (!ctx.industryId || a.industryId === ctx.industryId);
    }) };
  }
  function incr3(a) { var b = k.byYear(a.incrementalArr, null); return k.isNum(b.v) ? b.v : null; }

  // Sums (or counts, with pick returning 1) over the accounts in context. An empty list is not provided;
  // a filled list with no account in context is zero.
  function cgSum(field, kind, pick, seg) {
    return function (r, ctx) {
      ctx = ctx || {};
      var acc = accounts(r, ctx, seg), used = [], tot = 0;
      if (!acc.all.length) return k.blank(kind, k.src(r, 'customerGrowth', field, [], null, kind));
      acc.rows.forEach(function (a) {
        var v = pick(a);
        if (!k.isNum(v)) return;
        tot += v;
        used.push(a.sourceRow);
      });
      var s = k.src(r, 'customerGrowth', field, used.length ? used : rows(acc.rows), null, kind);
      return used.length || !acc.rows.length ? k.cell(tot, kind, s) : k.blank(kind, s);
    };
  }
  function one() { return 1; }
  function current(a) { return a.currentArr; }
  function oi3(a) { return a.cumulativeOrderIntake; }
  var SR = ['segment', 'risk'];
  M.define('cg.accounts', k.count('PRE', SR), cgSum('id', 'PRE', one));
  M.define('cg.currentArr', k.amount('PRE', SR), cgSum('currentArr', 'PRE', current));
  M.define('cg.oi3', k.amount('DER', SR), cgSum('cumulativeOrderIntake', 'DER', oi3));
  M.define('cg.multiplierAccounts', k.count('IN', ['segment']), cgSum('multiplier3y', 'IN', function (a) {
    return k.isNum(a.multiplier3y) ? 1 : 0;
  }));
  SEGS.forEach(function (seg) {
    M.define('cg.seg.' + seg + '.accounts', k.count('PRE', ['risk']), cgSum('id', 'PRE', one, seg));
    M.define('cg.seg.' + seg + '.arr', k.amount('PRE', ['risk']), cgSum('currentArr', 'PRE', current, seg));
    M.define('cg.seg.' + seg + '.oi', k.amount('DER', ['risk']), cgSum('cumulativeOrderIntake', 'DER', oi3, seg));
  });

  // Growth % (the cg.growthY* rule): incremental ARR over current ARR of the accounts that have both. Year null
  // takes the three-year incremental ARR. Partial when an account's figure is blank.
  ['all'].concat(SEGS).forEach(function (seg) {
    M.define('cg.growth.' + seg, rate('APP', 'cg.currentArr', ['year']), function (r, ctx) {
      ctx = ctx || {};
      var acc = accounts(r, ctx, seg === 'all' ? null : seg), used = [], inc = 0, base = 0;
      acc.rows.forEach(function (a) {
        var v = ctx.year ? (Array.isArray(a.incrementalArr) ? a.incrementalArr[ctx.year - 1] : null) : incr3(a);
        if (!k.isNum(v) || !k.isNum(a.currentArr)) return;
        used.push(a.sourceRow);
        inc += v;
        base += a.currentArr;
      });
      var s = k.src(r, 'customerGrowth', 'incrementalArr', used.length ? used : rows(acc.rows), ctx.year, 'APP');
      if (!acc.all.length || (acc.rows.length && !used.length)) return k.blank('APP', s);
      var out = ratioCell(inc, base, s);
      if (out.state === 'value' && used.length < acc.rows.length) {
        out.partial = true;
        out.note = TAP.content.text('measures.partialAccounts');
      }
      return out;
    });
  });

  // Exposure: shares of the three-year incremental ARR. The top 3 keeps every account's figure, so combined
  // figures take the top 3 accounts across the scope (D60).
  function exposure(r, which) {
    var all = ((region(r).customerGrowth || {}).accounts) || [];
    var list = all.map(function (a) { return { a: a, v: incr3(a) }; }).filter(function (x) { return x.v != null; });
    var s = k.src(r, 'customerGrowth', 'incrementalArr', rows(all), null, 'APP');
    if (!list.length) return k.blank('APP', s);
    var den = sum(list.map(function (x) { return x.v; }));
    if (which === 'top3') {
      var top = list.slice().sort(function (x, y) { return y.v - x.v; }).slice(0, 3);
      s = k.src(r, 'customerGrowth', 'incrementalArr', top.map(function (x) { return x.a.sourceRow; }), null, 'APP');
      return ratioCell(sum(top.map(function (x) { return x.v; })), den, s, { items: list.map(function (x) { return x.v; }), top: 3 });
    }
    var risky = list.filter(function (x) { return riskOf(x.a) !== 'none'; });
    if (risky.length) s = k.src(r, 'customerGrowth', 'incrementalArr', risky.map(function (x) { return x.a.sourceRow; }), null, 'APP');
    return ratioCell(sum(risky.map(function (x) { return x.v; })), den, s);
  }
  M.define('cg.top3Share', rate('APP', 'cg.arr', []), function (r) { return exposure(r, 'top3'); });
  M.define('cg.riskShare', rate('APP', 'cg.arr', []), function (r) { return exposure(r, 'risk'); });

  /* ---------- partners ---------- */

  // Sums a value over the region's partners. No partners at all is not provided, as for an empty section.
  function ptSum(field, kind, pick) {
    return function (r, ctx) {
      ctx = ctx || {};
      var list = region(r).partners || [], used = [], tot = 0, partial = false;
      list.forEach(function (p) {
        var v = pick(p, ctx);
        if (v && typeof v === 'object') { partial = partial || !!v.partial; v = v.v; }
        if (!k.isNum(v)) return;
        tot += v;
        used.push(p.sourceRow);
      });
      var s = k.src(r, 'partners', field, used.length ? used : rows(list), ctx.year, kind);
      return used.length ? k.cell(tot, kind, s, partial ? partialYears() : null) : k.blank(kind, s);
    };
  }
  function fte(p) {
    var v = [p.fteSales, p.fteConsultants].filter(k.isNum);
    return v.length ? sum(v) : null;
  }
  function oi(p) {
    var a = k.byYear(p.arr, null).v, b = k.byYear(p.services, null).v;
    return k.isNum(a) || k.isNum(b) ? (a || 0) + (b || 0) : null;
  }
  M.define('pt.count', k.count('IN', []), ptSum('name', 'IN', one));
  M.define('pt.fteSales', k.count('IN', []), ptSum('fteSales', 'IN', function (p) { return p.fteSales; }));
  M.define('pt.fteConsultants', k.count('IN', []), ptSum('fteConsultants', 'IN', function (p) { return p.fteConsultants; }));
  M.define('pt.fte', k.count('IN', []), ptSum('fteSales', 'IN', fte));
  M.define('pt.arr', k.amount('IN', ['year']), ptSum('arr', 'IN', function (p, ctx) { return k.byYear(p.arr, ctx.year); }));
  M.define('pt.services', k.amount('IN', ['year']), ptSum('services', 'IN', function (p, ctx) { return k.byYear(p.services, ctx.year); }));
  // Three-year order intake per FTE, over the partners that have FTE (D61)
  M.define('pt.oiPerFte', rate('APP', 'pt.fte', [], 'money'), function (r) {
    var list = region(r).partners || [], staffed = list.filter(function (p) { return fte(p) > 0 && oi(p) != null; });
    var s = k.src(r, 'partners', 'arr', rows(staffed.length ? staffed : list), null, 'APP');
    if (!staffed.length) return k.blank('APP', s);
    return ratioCell(sum(staffed.map(oi)), sum(staffed.map(fte)), s);
  });

  /* ---------- plan make-up ---------- */

  // New business share of the three-year ARR ambition. Needs both parts: a share of a partial total would mislead.
  M.define('amb.nbShare', rate('APP', 'amb.arr', []), function (r) {
    var n = M.get('nb.arr')(r, {}), c = M.get('cg.arr')(r, {});
    var s = { regionId: r, section: null, field: 'amb.nbShare', row: null, rows: [], year: null, cell: null, kind: 'APP',
      parts: [{ measureId: 'nb.arr', src: n.src }, { measureId: 'cg.arr', src: c.src }] };
    if (n.state !== 'value' || c.state !== 'value') return share(n, c, s);
    var out = ratioCell(n.v, n.v + c.v, s);
    if (out.state === 'value' && (n.partial || c.partial)) { out.partial = true; out.note = n.note || c.note; }
    return out;
  });
})(window.TAP);
