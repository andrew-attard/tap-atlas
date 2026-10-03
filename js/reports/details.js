/*
 * File: js/reports/details.js
 * Purpose: Collects everything the data holds about one clicked item, grouped and labelled, for the details panel
 *          (US-1.2.9): a region and an industry (ratings with wording, tier, scores, system figures, commentary,
 *          new business rows), a region alone (its plan summary by section), several regions and one industry,
 *          or an account. Every value is a full cell, so the panel shows its kind and file › sheet › cell.
 * Provides: TAP.details (build)
 * Depends on: js/engine/measures.js, js/engine/scores.js (ind.* measures), js/engine/scope.js, js/core/data.js,
 *             js/core/content.js, js/core/store.js (the scope for an industry alone), config/settings.js
 * Used by: js/ui/layers.js
 */
(function (TAP) {
  'use strict';

  function t(key, vars) { return TAP.content.text('details.' + key, vars); }
  function rname(id) { var r = TAP.data.region(id); return r ? TAP.content.regionName(r) : String(id); }
  function scoreFields(which) { return Object.keys(((window.TAP_SETTINGS || {}).scores || {})[which] || {}); }
  function isBlank(v) { return v == null || v === ''; }

  // A row for one measure, for a region (or a combined entity when given one).
  function mrow(id, who, ctx) {
    var m = TAP.measures.meta(id) || { label: id, unit: 'text' };
    var cell = typeof who === 'string' ? TAP.measures.get(id)(who, ctx || {}) : TAP.measures.combined(id, who, ctx || {});
    return { label: m.label, cell: cell, unit: m.unit, field: m.scale || null };
  }

  // A row read straight from a list item (new business row, account), with its own source.
  function irow(label, regionId, section, item, field, kind, unit, opts) {
    opts = opts || {};
    var v = opts.v !== undefined ? opts.v : item[field];
    var src = { regionId: regionId, section: section, field: opts.field || field, row: item.sourceRow, rows: [item.sourceRow],
      year: opts.year || null, cell: null, kind: kind };
    return { label: label, unit: unit, field: opts.scale || null,
      cell: { v: isBlank(v) ? null : v, state: isBlank(v) ? 'notProvided' : 'value', kind: kind, src: src } };
  }

  function group(title, rows) { return { title: title, rows: rows.filter(Boolean) }; }
  function result(title, groups) { return { title: title, groups: groups.filter(function (g) { return g && g.rows.length; }) }; }

  /* ---------- one region, one industry ---------- */

  function sumOf(list) {
    var vals = (list || []).filter(function (v) { return typeof v === 'number'; });
    return vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) : null;
  }

  function nbGroup(regionId, row) {
    var NB = 'newBusiness', R = function (label, field, kind, unit, opts) { return irow(label, regionId, NB, row, field, kind, unit, opts); };
    return group(t('nbRow', { market: row.market || '', subVertical: row.subVertical || '' }), [
      R(TAP.measures.meta('nb.targetAccounts').label, 'targetAccounts', 'IN', 'count'),
      R(TAP.measures.meta('nb.hitRate').label, 'hitRate', 'IN', 'pct'),
      R(TAP.measures.meta('nb.avgDealSize').label, 'avgDealSize', 'IN', 'money'),
      R(t('growthYear', { n: 2 }), 'growth', 'IN', 'pct', { v: (row.growth || {}).year2, field: 'growth.year2' }),
      R(t('growthYear', { n: 3 }), 'growth', 'IN', 'pct', { v: (row.growth || {}).year3, field: 'growth.year3' }),
      R(t('arrPotential'), 'arrPotential', 'DER', 'money', { v: sumOf(row.arrPotential) }),
      R(t('servicesPotential'), 'servicesPotential', 'DER', 'money', { v: sumOf(row.servicesPotential) }),
      R(t('successFactors'), 'successFactors', 'IN', 'text')
    ]);
  }

  function ratingGroup(title, scoreId, which, who, ctx) {
    return group(title, [mrow(scoreId, who, ctx)].concat(scoreFields(which).map(function (f) { return mrow('ind.' + f, who, ctx); })));
  }

  function regionIndustry(regionId, industryId) {
    var ind = TAP.data.industry(industryId), ctx = { industryId: industryId }, reg = TAP.data.region(regionId);
    if (!ind || !reg) return result('', []);
    var comment = mrow('ind.commentary', regionId, ctx);
    var nb = (reg.newBusiness || []).filter(function (r) { return r.industryId === industryId; });
    return result(t('regionIndustry', { industry: ind.name, region: rname(regionId) }), [
      group(ind.groupPriority ? t('priorityCentral') : t('priority'), [mrow('ind.tier', regionId, ctx)]),
      ratingGroup(t('attractiveness'), 'ind.attractiveness', 'attractiveness', regionId, ctx),
      ratingGroup(t('ability'), 'ind.ability', 'ability', regionId, ctx),
      group(t('system'), ['ind.currentArr', 'ind.pipeline', 'ind.pipeline12m'].map(function (id) { return mrow(id, regionId, ctx); })),
      group(t('commentary'), [comment.cell.state === 'value' && !isBlank(comment.cell.v) ? comment : null])
    ].concat(nb.map(function (r) { return nbGroup(regionId, r); })));
  }

  /* ---------- several regions, one industry ---------- */

  function severalRegions(regionIds, industryId) {
    var ind = TAP.data.industry(industryId), ctx = { industryId: industryId };
    if (!ind || !regionIds.length) return result('', []);
    var all = { id: 'details', kind: 'combined', regionIds: regionIds, how: 'average', role: 'combined' };
    var combinedRows = [mrow('ind.attractiveness', all, ctx), mrow('ind.ability', all, ctx)].concat(
      scoreFields('attractiveness').concat(scoreFields('ability')).map(function (f) { return mrow('ind.' + f, all, ctx); }));
    return result(t('industryAcross', { industry: ind.name, n: regionIds.length }),
      [group(t('combinedGroup', { n: regionIds.length }), combinedRows)].concat(regionIds.map(function (r) {
        var comment = mrow('ind.commentary', r, ctx);
        return group(rname(r), [mrow('ind.tier', r, ctx), mrow('ind.attractiveness', r, ctx), mrow('ind.ability', r, ctx),
          comment.cell.state === 'value' && !isBlank(comment.cell.v) ? comment : null]);
      })));
  }

  /* ---------- a region alone: the plan summary (import notes stay in the data sources panel) ---------- */

  var SUMMARY = [
    ['marketCoverage', ['base.arr', 'base.pipeline', 'base.pipeline12m', 'focus.tier1', 'focus.tier2', 'focus.tier3']],
    ['newBusiness', ['nb.arr', 'nb.services', 'nb.targetAccounts', 'nb.wins', 'nb.hitRate', 'nb.avgDealSize']],
    ['customerGrowth', ['cg.arr', 'cg.services', 'cg.segment.strategic', 'cg.segment.growth', 'cg.segment.core', 'cg.segment.scaled']],
    ['ambition', ['amb.arr', 'amb.services', 'amb.oi']]
  ];

  function regionSummary(regionId) {
    if (!TAP.data.region(regionId)) return result('', []);
    return result(rname(regionId), SUMMARY.map(function (s) {
      return group(t('sections.' + s[0]), s[1].filter(function (id) { return TAP.measures.meta(id); })
        .map(function (id) { return mrow(id, regionId, { year: null }); }));
    }));
  }

  /* ---------- an account ---------- */

  function findAccount(id) {
    var hit = null;
    TAP.data.regions().forEach(function (r) {
      ((r.customerGrowth || {}).accounts || []).forEach(function (acc) { if (!hit && acc.id === id) hit = { region: r, acc: acc }; });
    });
    return hit;
  }

  function yearLabel(n) {
    var ys = (TAP.data.meta() || {}).years;
    return ys && ys[n - 1] ? String(ys[n - 1]) : t('year', { n: n });
  }

  function account(id) {
    var hit = findAccount(id);
    if (!hit) return result('', []);
    var acc = hit.acc, rid = hit.region.id, CG = 'customerGrowth';
    var R = function (label, field, kind, unit, opts) { return irow(label, rid, CG, acc, field, kind, unit, opts); };
    var ind = TAP.data.industry(acc.industryId), pl = ((TAP.data.lookups() || {}).productLines || []).filter(function (p) { return p.id === acc.productLine; })[0];
    var byYear = function (label, field, kind, unit) {
      return [1, 2, 3].map(function (n) {
        return R(t('perYear', { label: label, year: yearLabel(n) }), field, kind, unit, { v: (acc[field] || [])[n - 1], year: n });
      });
    };
    var growth = acc.growthPct ? byYear(t('growthPct'), 'growthPct', 'IN', 'pct') : [R(t('multiplier'), 'multiplier3y', 'IN', 'count')];
    return result(t('account', { name: acc.name, region: rname(rid) }), [
      group(t('accountGroup'), [R(t('industry'), 'industryId', 'PRE', 'text', { v: ind ? ind.name : acc.industryId }),
        R(t('country'), 'country', 'PRE', 'text'), R(t('productLine'), 'productLine', 'PRE', 'text', { v: pl ? pl.name : acc.productLine }),
        R(TAP.measures.meta('base.arr').label, 'currentArr', 'PRE', 'money'), R(t('riskLevel'), 'riskLevel', 'PRE', 'text'),
        R(t('segment'), 'segment', 'DER', 'segment')]),
      group(t('planGroup'), growth.concat([R(t('servicesRatio'), 'servicesRatio', 'IN', 'pct')],
        byYear(t('incrementalArr'), 'incrementalArr', 'DER', 'money'), byYear(t('servicesOi'), 'servicesOrderIntake', 'DER', 'money'),
        [R(t('cumulativeOi'), 'cumulativeOrderIntake', 'DER', 'money')]))
    ]);
  }

  /* ---------- entry ---------- */

  // {title, groups: [{title, rows: [{label, cell, unit, field}]}]} for a Target (ARCHITECTURE section 11).
  function build(target) {
    target = target || {};
    var regs = target.regionIds || [], inds = target.industryIds || [], accs = target.accountIds || [];
    if (accs.length) return account(accs[0]);
    if (inds.length && regs.length === 1) return regionIndustry(regs[0], inds[0]);
    if (inds.length) return severalRegions(regs.length ? regs : TAP.scope.regionIds(TAP.store.get().cmp), inds[0]);
    if (regs.length === 1) return regionSummary(regs[0]);
    if (regs.length) {
      var many = regs.map(regionSummary);
      return result(TAP.format.list(regs.map(rname)), many.map(function (m) { return group(m.title, (m.groups[3] || m.groups[0] || { rows: [] }).rows); }));
    }
    return result('', []);
  }

  TAP.details = { build: build };
})(window.TAP);
