/*
 * File: js/engine/measures-pt.js
 * Purpose: The Phase 2 partner measures and the plan make-up share (US-2.7.4), made with the same cell helpers as
 *          js/engine/measures-p2.js, so shares carry their parts (D60).
 * Provides: adds measures to TAP.measures (pt.*, amb.nbShare; catalogue in docs/ARCHITECTURE.md section 17.5)
 * Depends on: js/engine/measures.js (define, kit), js/engine/measures-p2.js (kit2), js/core/data.js, js/core/content.js
 * Used by: Phase 2 report definitions, js/insights/rules-*.js
 */
(function (TAP) {
  'use strict';

  var M = TAP.measures, k = M.kit, k2 = M.kit2;
  var region = k2.region, sum = k2.sum, rows = k2.rows, partialYears = k2.partialYears, rate = k2.rate;
  var ratioCell = k2.ratioCell, share = k2.share, markPartial = k2.markPartial, one = k2.one;

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
  // A partner's order intake is partly provided when a year of ARR or services, or one of the two, is blank
  function oiPartial(p) {
    var a = k.byYear(p.arr, null), b = k.byYear(p.services, null);
    return !!(a.partial || b.partial || !k.isNum(a.v) || !k.isNum(b.v));
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
    return markPartial(ratioCell(sum(staffed.map(oi)), sum(staffed.map(fte)), s), staffed.some(oiPartial));
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
