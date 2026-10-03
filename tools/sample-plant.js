/*
 * File: tools/sample-plant.js
 * Purpose: Plants the cases of docs/PLANTED-CASES.md (P01 to P16, G1 to G6) into the generated base data, keeps
 *          other rows from producing near-duplicate findings, then recomputes every derived value.
 * Provides: module.exports.apply(plan, ctx)
 * Depends on: tools/sample-planted.js (the values), tools/sample-build.js, tools/sample-derive.js, tools/sample-names.js
 * Used by: tools/generate-sample-data.js
 *
 * P01, P02 and the blank tier in G1 come straight from the tier settings in tools/sample-settings.js.
 */
'use strict';

const PL = require('./sample-planted');
const B = require('./sample-build');
const D = require('./sample-derive');
const NAMES = require('./sample-names');

const RATINGS = B.RATINGS;
const ABILITY = ['references', 'productFit', 'expertise'];

function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }
function mean(list) { return sum(list) / list.length; }
function num(v) { return typeof v === 'number' && isFinite(v); }

function scores(row) {
  const v = RATINGS.map(function (f) { return row[f]; });
  if (!v.every(num)) return null;
  return { a: mean(v.slice(0, 3)), b: mean(v.slice(3)) };
}

function planter(plan) {
  const byId = {};
  plan.regions.forEach(function (r) { byId[r.id] = r; });
  const protect = {};
  const moneyFixed = {};
  return {
    region: function (id) { return byId[id]; },
    mc: function (id, ind) { return byId[id].marketCoverage.filter(function (m) { return m.industryId === ind; })[0]; },
    protect: function (id, ind, f) { protect[id + '|' + ind + '|' + f] = true; },
    isProtected: function (id, ind, f) { return !!protect[id + '|' + ind + '|' + f]; },
    fixMoney: function (id, ind) { moneyFixed[id + '|' + ind] = true; },
    moneyFixed: function (id, ind) { return !!moneyFixed[id + '|' + ind]; }
  };
}

function plantRatings(p) {
  Object.keys(PL.ratings).forEach(function (ind) {
    Object.keys(PL.ratings[ind]).forEach(function (id) {
      const row = p.mc(id, ind);
      RATINGS.forEach(function (f, i) { row[f] = PL.ratings[ind][id][i]; p.protect(id, ind, f); });
    });
  });
  PL.single.concat(PL.blanks.map(function (b) { return Object.assign({ value: null }, b); })).forEach(function (s) {
    p.mc(s.region, s.industry)[s.field] = s.value;
    p.protect(s.region, s.industry, s.field);
  });
}

function plantMoney(plan, p) {
  const zero = function (id, ind, fields) { fields.forEach(function (f) { p.mc(id, ind)[f] = 0; }); p.fixMoney(id, ind); };
  zero(PL.nothingInSystem.region, PL.nothingInSystem.industry, ['currentArr', 'pipelineTotal', 'pipelineCreated12m']);
  PL.noPipeline.forEach(function (x) { zero(x.region, x.industry, ['pipelineTotal', 'pipelineCreated12m']); });
  zero(PL.zeroArr.region, PL.zeroArr.industry, ['currentArr']);
  p.mc(PL.blankArr.region, PL.blankArr.industry).currentArr = null;
  p.fixMoney(PL.blankArr.region, PL.blankArr.industry);

  const L = PL.largestArr;
  p.region(L.region).marketCoverage.forEach(function (m) { m.currentArr = m.industryId === L.industry ? L.value : Math.min(m.currentArr, L.othersMax); });
  p.fixMoney(L.region, L.industry);

  const S = PL.pipelineShare;
  const others = sum(p.region(S.region).marketCoverage.filter(function (m) { return m.industryId !== S.industry && num(m.pipelineTotal); })
    .map(function (m) { return m.pipelineTotal; }));
  const row = p.mc(S.region, S.industry);
  row.pipelineTotal = Math.round(others * S.share / (1 - S.share));
  row.pipelineCreated12m = Math.round(row.pipelineTotal * 0.45);
  p.fixMoney(S.region, S.industry);

  // Accounts can't sit in an industry where the region holds no current ARR.
  plan.regions.forEach(function (r) {
    r.customerGrowth.accounts.forEach(function (a) {
      const m = p.mc(r.id, a.industryId);
      if (m && m.currentArr === 0) a.industryId = 'other';
    });
  });
}

// Raises unprotected ability ratings until the ability score reaches 2.0.
function makeAble(p, id, row) {
  ABILITY.forEach(function (f) {
    if (scores(row).b < 2 && !p.isProtected(id, row.industryId, f) && row[f] < 3) row[f] = Math.min(3, row[f] + 2);
  });
}

// No near-duplicates: only E's largest industry carries a rating of 1 (P05), and no industry other than
// Field Service Management is attractive-but-not-yet-winnable in more than two regions (P16).
function avoidDuplicates(plan, p) {
  plan.regions.forEach(function (r) {
    if (r.id === PL.largestArr.region) return;
    const rated = r.marketCoverage.filter(function (m) { return scores(m) && num(m.currentArr); })
      .sort(function (x, y) { return y.currentArr - x.currentArr; });
    const top = rated[0];
    const hasOne = function (m) { return RATINGS.some(function (f) { return m[f] === 1; }); };
    if (!hasOne(top)) return;
    if (RATINGS.some(function (f) { return top[f] === 1 && p.isProtected(r.id, top.industryId, f); }) || p.moneyFixed(r.id, top.industryId)) {
      const swap = rated.filter(function (m) { return !hasOne(m) && !p.moneyFixed(r.id, m.industryId); })[0];
      // Swap current ARR only: planted pipeline figures stay where they were planted
      const t = top.currentArr; top.currentArr = swap.currentArr; swap.currentArr = t;
    } else {
      RATINGS.forEach(function (f) { if (top[f] === 1) top[f] = 2; });
    }
  });
  plan.lookups.industries.forEach(function (ind) {
    if (!ind.rated || ind.id === 'fsm' || ind.id === 'datacenters') return;
    const notYet = plan.regions.filter(function (r) { const s = scores(p.mc(r.id, ind.id)); return s && s.a >= 2 && s.b < 2; });
    notYet.slice(2).forEach(function (r) { makeAble(p, r.id, p.mc(r.id, ind.id)); });
  });
}

// Commentary must still read true after the ratings changed.
function fixCommentary(plan) {
  plan.regions.forEach(function (r) {
    r.marketCoverage.forEach(function (m) {
      const s = scores(m);
      if (!m.commentary || !s) return;
      const ind = plan.lookups.industries.filter(function (d) { return d.id === m.industryId; })[0];
      const kind = ind.groupPriority ? 'group' : s.a >= 2 && s.b >= 2 ? 'strong' : s.a >= 2 ? 'notYet' : 'weak';
      const list = NAMES.commentary[kind];
      if (list.indexOf(m.commentary) === -1) m.commentary = list[m.sourceRow % list.length];
    });
  });
}

function wins(rows) { return sum(rows.filter(function (x) { return num(x.hitRate); }).map(function (x) { return x.targetAccounts * x.hitRate; })); }
function winValue(rows) {
  return sum(rows.filter(function (x) { return num(x.hitRate); }).map(function (x) { return x.targetAccounts * x.hitRate * x.avgDealSize; }));
}

function plantNewBusiness(plan, p) {
  const mv = PL.nbMoveAway;
  const target = p.mc(mv.region, mv.to);
  p.region(mv.region).newBusiness.forEach(function (row, j) {
    if (row.industryId !== mv.industry) return;
    const subs = NAMES.subVerticals[mv.to];
    Object.assign(row, { industryId: mv.to, tier: target.tier, subVertical: subs[j % subs.length] });
  });
  Object.keys(PL.successFactors).forEach(function (id) {
    p.region(id).newBusiness.forEach(function (row) { if (row.industryId === 'fsm') row.successFactors = PL.successFactors[id]; });
  });
  PL.nbRequired.forEach(function (x) {
    if (!p.region(x.region).newBusiness.some(function (row) { return row.industryId === x.industry; })) {
      throw new Error('planted case needs New Business rows: ' + x.region + ' ' + x.industry);
    }
  });

  // P12: scale the region's target accounts so its implied wins are N times the others' simple average.
  const W = PL.winsRatio;
  const others = plan.regions.filter(function (r) { return r.id !== W.region; });
  const k = W.ratio * mean(others.map(function (r) { return wins(r.newBusiness); })) / wins(p.region(W.region).newBusiness);
  p.region(W.region).newBusiness.forEach(function (row) { row.targetAccounts = Math.max(1, Math.round(row.targetAccounts * k)); });

  // P09: scale the region's deal sizes to N times the others' (pooled, weighted by implied wins).
  const R = PL.dealSizeRatio;
  const rest = plan.regions.filter(function (r) { return r.id !== R.region; });
  const pooled = function (list) { return sum(list.map(function (r) { return winValue(r.newBusiness); })) / sum(list.map(function (r) { return wins(r.newBusiness); })); };
  const rows = p.region(R.region).newBusiness;
  const base = rows.map(function (row) { return row.avgDealSize; });
  let f = R.ratio * pooled(rest) / pooled([p.region(R.region)]);
  for (let i = 0; i < 4; i++) {
    rows.forEach(function (row, j) { row.avgDealSize = Math.round(base[j] * f); });
    f *= R.ratio * pooled(rest) / pooled([p.region(R.region)]);
  }

  // G1: one New Business row with a blank hit rate (its potential is then blank too).
  const nb = p.region(PL.nullHitRate.region).newBusiness;
  const last = nb[nb.length - 1];
  nb.push({ sourceRow: last.sourceRow + 1, industryId: last.industryId, tier: last.tier, market: last.market,
    subVertical: last.subVertical, channelSplit: { direct: 1, partner: 0, allianceA: 0, allianceB: 0 }, targetAccounts: 12,
    hitRate: null, avgDealSize: last.avgDealSize, growth: { year2: 0.1, year3: 0.08 }, successFactors: null,
    arrPotential: null, servicesPotential: null, servicesRatio: last.servicesRatio });
  plan.regions.forEach(function (r) { r.newBusiness.forEach(D.nbRow); });

  // P10: the region's pipeline created in the last 12 months is a quarter of its year-1 new business ARR.
  const Q = PL.pipelineRatio;
  const y1 = sum(p.region(Q.region).newBusiness.map(function (row) { return row.arrPotential[0]; }).filter(num));
  const mcRows = p.region(Q.region).marketCoverage.filter(function (m) { return num(m.pipelineCreated12m); });
  const want = y1 / Q.ratio;
  const scale = want / sum(mcRows.map(function (m) { return m.pipelineCreated12m; }));
  mcRows.forEach(function (m) { m.pipelineCreated12m = Math.round(m.pipelineCreated12m * scale); });
  const big = mcRows.slice().sort(function (x, y) { return y.pipelineCreated12m - x.pipelineCreated12m; })[0];
  big.pipelineCreated12m = D.r1(big.pipelineCreated12m + want - sum(mcRows.map(function (m) { return m.pipelineCreated12m; })));
}

function plantCustomerGrowth(p) {
  const strategicOf = function (cg) { return cg.accounts.filter(function (a) { return a.currentArr > cg.thresholds.strategicArr; }); };
  const ids = function (list) { return list.map(function (a) { return a.id; }); };
  const without = function (list, drop) { return list.filter(function (a) { return drop.indexOf(a) === -1; }); };
  const grows = function (list) { list.forEach(function (a) { a._w = Math.max(a._w, Math.sqrt(a.currentArr)); }); return list; };

  // P13: 60% of the region's growth in its top 3 accounts, one flagged high risk; Strategic share stays 30-50%.
  const C = PL.concentration;
  let cg = p.region(C.region).customerGrowth;
  let S = strategicOf(cg);
  let N = without(cg.accounts, S).filter(function (a) { return a.currentArr >= cg.thresholds.scaledArr; });
  const top = grows([S[0], N[0], N[1]]);
  cg.accounts.forEach(function (a) { a.riskLevel = null; });
  top[1].riskLevel = 'high';
  without(cg.accounts, S.concat(top)).filter(function (a) { return a._w > 0; }).slice(-3, -2).forEach(function (a) { a.riskLevel = 'medium'; });
  const restA = without(without(cg.accounts, S), top);
  B.assignGrowth(cg, top.map(function (a, i) { return { ids: [a.id], share: C.top[i] }; }).concat([
    { ids: ids(without(S, top)), share: C.otherStrategic },
    { ids: ids(restA), share: 1 - sum(C.top) - C.otherStrategic }]));

  // P14: 40% of the region's growth in accounts flagged high or medium risk; Strategic share 40%.
  const R = PL.atRisk;
  cg = p.region(R.region).customerGrowth;
  S = strategicOf(cg);
  N = without(cg.accounts, S);
  const sr = grows([S[1], S[3]]), nr = grows([N[1], N[4], N[7]]);
  cg.accounts.forEach(function (a) { a.riskLevel = null; });
  ['high', 'medium'].forEach(function (lvl, i) { sr[i].riskLevel = lvl; });
  ['medium', 'high', 'medium'].forEach(function (lvl, i) { nr[i].riskLevel = lvl; });
  B.assignGrowth(cg, [{ ids: ids(sr), share: R.strategicRisk }, { ids: ids(without(S, sr)), share: R.strategic - R.strategicRisk },
    { ids: ids(nr), share: R.otherRisk }, { ids: ids(without(N, nr)), share: 1 - R.strategic - R.otherRisk }]);

  // P15: the region's growth relies on Strategic accounts.
  const H = PL.strategicHeavy;
  cg = p.region(H.region).customerGrowth;
  S = grows(strategicOf(cg));
  B.assignGrowth(cg, [{ ids: ids(S), share: H.share }, { ids: ids(without(cg.accounts, S)), share: 1 - H.share }]);
}

function apply(plan, ctx) {
  const p = planter(plan);
  plantRatings(p);
  plantMoney(plan, p);
  avoidDuplicates(plan, p);
  fixCommentary(plan);
  plantNewBusiness(plan, p);
  plantCustomerGrowth(p);
  Object.keys(PL.notes).forEach(function (id) { p.region(id).source.notes = PL.notes[id].slice(); });
  plan.regions.forEach(function (r) { B.finish(r, ctx); });
  return plan;
}

module.exports = { apply: apply, scores: scores };
