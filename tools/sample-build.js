/*
 * File: tools/sample-build.js
 * Purpose: Builds one fictional region's four sections from the settings: Market Coverage, New Business,
 *          Customer Growth and Partners (with the recap). Values are invented but plausible and consistent.
 * Provides: module.exports ({region, assignGrowth, finish})
 * Depends on: tools/sample-derive.js (the template's formulas), tools/sample-names.js
 * Used by: tools/generate-sample-data.js and the planted-case step
 *
 * Fields starting with "_" are working values for the generator; the writer leaves them out.
 */
'use strict';

const D = require('./sample-derive');
const NAMES = require('./sample-names');

const RATINGS = ['growthPotential', 'criticality', 'competitiveIntensity', 'references', 'expertise', 'productFit'];
const SPLITS = [[1, 0, 0, 0], [0.7, 0.3, 0, 0], [0.5, 0.5, 0, 0], [0.6, 0.2, 0.2, 0], [0.4, 0.3, 0, 0.3],
  [0.5, 0, 0.3, 0.2], [0.4, 0.6, 0, 0], [0.8, 0, 0.2, 0]];

function mean(list) { return list.reduce(function (a, b) { return a + b; }, 0) / list.length; }
function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }

// The smallest round number v with lo <= v < hi (fewest significant figures first).
function niceIn(lo, hi) {
  for (let sig = 1; sig <= 6; sig++) {
    const step = Math.pow(10, Math.floor(Math.log10(Math.max(hi, 1))) - sig + 1);
    const v = Math.ceil(lo / step) * step;
    if (v < hi) return Math.round(v * 100) / 100;
  }
  return lo;
}

function weightedPick(rnd, items, weightOf) {
  const total = sum(items.map(weightOf));
  let x = rnd.next() * total;
  for (let i = 0; i < items.length; i++) { x -= weightOf(items[i]); if (x < 0) return items[i]; }
  return items[items.length - 1];
}

function marketCoverage(rs, ri, ctx) {
  const rnd = ctx.rnd;
  const weights = ctx.S.industries.map(function (ind) { return ind.unrated ? rnd.between(0.1, 0.3) : rnd.between(0.3, 1); });
  const total = sum(weights);
  return ctx.S.industries.map(function (ind, k) {
    const tierChar = ind.group ? '1' : ind.unrated ? '-' : ind.tiers.charAt(ri);
    const currentArr = Math.round(rs.scale * weights[k] / total);
    const pipelineTotal = Math.round(currentArr * rnd.between(0.4, 1.2));
    const row = { sourceRow: ctx.S.firstRow.marketCoverage + k, industryId: ind.id, currentArr: currentArr,
      pipelineTotal: pipelineTotal, pipelineCreated12m: Math.round(pipelineTotal * rnd.between(0.35, 0.6)),
      tier: tierChar === '-' ? null : Number(tierChar), commentary: null };
    RATINGS.forEach(function (f, i) {
      if (ind.unrated) { row[f] = null; return; }
      if (i < 3) row[f] = row.tier === 3 ? rnd.pick([1, 2, 2, 3]) : rnd.pick([2, 3, 3]);
      else row[f] = ind.group ? rnd.pick([2, 3]) : rnd.pick([1, 2, 2, 3]);
    });
    return row;
  });
}

// Commentary follows the ratings, so it reads true to the row.
function commentary(row, ind, rnd) {
  if (ind.unrated || !rnd.chance(ind.group ? 0.6 : 0.4)) return null;
  const vals = RATINGS.map(function (f) { return row[f]; });
  if (vals.some(function (v) { return v == null; })) return null;
  const a = mean(vals.slice(0, 3)), b = mean(vals.slice(3));
  const kind = ind.group ? 'group' : a >= 2 && b >= 2 ? 'strong' : a >= 2 ? 'notYet' : 'weak';
  return rnd.pick(NAMES.commentary[kind]);
}

function newBusiness(rs, mc, ctx) {
  const rnd = ctx.rnd;
  const S = ctx.S;
  const eligible = mc.filter(function (r) { return r.tier === 1 || r.tier === 2; });
  const count = {};
  eligible.forEach(function (r) { count[r.industryId] = 1; });
  for (let extra = rs.nbRows - eligible.length; extra > 0; extra--) {
    const open = eligible.filter(function (r) { return count[r.industryId] < 3; });
    count[weightedPick(rnd, open, function (r) { return r.currentArr + 1; }).industryId]++;
  }
  const rows = [];
  eligible.forEach(function (m) {
    for (let j = 0; j < count[m.industryId]; j++) {
      const subs = NAMES.subVerticals[m.industryId];
      const split = rnd.pick(SPLITS);
      rows.push({ sourceRow: 0, industryId: m.industryId, tier: m.tier, market: rnd.pick(NAMES.markets[rs.id]),
        subVertical: subs[j % subs.length],
        channelSplit: { direct: split[0], partner: split[1], allianceA: split[2], allianceB: split[3] },
        targetAccounts: null, hitRate: null, avgDealSize: Math.round(rs.ads * rnd.between(0.7, 1.3)),
        growth: { year2: D.r2(rnd.between(0.04, 0.25)), year3: D.r2(rnd.between(0.03, 0.2)) },
        successFactors: rnd.chance(0.7) ? rnd.pick(NAMES.successFactors) : null,
        arrPotential: null, servicesPotential: null, servicesRatio: rs.svc });
    }
  });
  rows.forEach(function (r, i) { r.sourceRow = S.firstRow.newBusiness + i; });
  // Rows come in pairs with equal target accounts and hit rates either side of the region's rate,
  // so the region's weighted hit rate is exactly rs.hit.
  const order = rnd.shuffle(rows.map(function (r, i) { return i; }));
  const half = Math.floor(rows.length / 2);
  for (let i = 0; i < half; i++) {
    const ta = rnd.int(rs.ta[0], rs.ta[1]);
    const d = Math.min(rnd.pick([0.02, 0.03, 0.04]), rs.hit - 0.05);
    Object.assign(rows[order[i]], { targetAccounts: ta, hitRate: D.r2(rs.hit - d) });
    Object.assign(rows[order[i + half]], { targetAccounts: ta, hitRate: D.r2(rs.hit + d) });
  }
  if (rows.length % 2) Object.assign(rows[order[rows.length - 1]], { targetAccounts: rnd.int(rs.ta[0], rs.ta[1]), hitRate: rs.hit });
  return rows;
}

function customerGrowth(rs, mc, ctx) {
  const rnd = ctx.rnd;
  if (!rs.accounts) return { thresholds: { strategicArr: null, scaledArr: null, growthArr: null, growthOrderIntake: null }, accounts: [] };
  const raw = [];
  for (let i = 0; i < rs.accounts; i++) raw.push(Math.exp(rnd.normal() * 0.9));
  const k = rs.scale * 0.6 / sum(raw);
  const arrs = raw.map(function (x) { return Math.max(15, Math.round(x * k)); }).sort(function (a, b) { return b - a; });
  // Accounts belong to a known industry, or "Other"; "Unapplied industry" is for pipeline only.
  const pool = mc.filter(function (r) { return r.currentArr > 0 && r.industryId !== 'unapplied'; });
  const accounts = arrs.map(function (arr, i) {
    const ind = weightedPick(rnd, pool, function (r) { return r.currentArr; });
    const info = ctx.S.industries.filter(function (x) { return x.id === ind.industryId; })[0];
    return { sourceRow: ctx.S.firstRow.accounts + i, id: rs.id + '-a' + String(i + 1).padStart(2, '0'),
      name: ctx.name(rnd.pick(NAMES.accountKinds[ind.industryId])), industryId: ind.industryId,
      country: rnd.pick(NAMES.countries[rs.id]), productLine: info.pl || rnd.pick(['pl1', 'pl2', 'pl3']),
      currentArr: arr, riskLevel: null, growthPct: null, multiplier3y: null, servicesRatio: D.r2(rnd.between(0.1, 0.4)),
      incrementalArr: null, servicesOrderIntake: null, cumulativeOrderIntake: null, segment: null,
      _w: rnd.chance(0.1) ? 0 : Math.sqrt(arr) * rnd.between(0.5, 1.5), _mult: rnd.chance(0.12), _delta: rnd.pick([0, 0.01, 0.02]) };
  });
  const n = arrs.length, q = Math.round(n * 0.25);
  const t = { strategicArr: niceIn(arrs[rs.strategic], arrs[rs.strategic - 1]),
    scaledArr: niceIn(arrs[n - q] + 0.5, arrs[n - q - 1] + 0.5), growthArr: null, growthOrderIntake: null };
  t.growthArr = niceIn(arrs[Math.floor(n / 2)], arrs[Math.floor(n / 2) - 1] + 0.5);
  // A couple of accounts outside the Strategic group carry a risk flag.
  rnd.shuffle(accounts.filter(function (a) { return a.currentArr <= t.strategicArr && a._w > 0; })).slice(0, 2)
    .forEach(function (a, i) { a.riskLevel = i === 0 ? 'medium' : rnd.pick(['high', 'medium']); });
  const cg = { thresholds: t, accounts: accounts, _total: sum(arrs) * rs.cgRate };
  const strategic = accounts.filter(function (a) { return a.currentArr > t.strategicArr; }).map(function (a) { return a.id; });
  const rest = accounts.filter(function (a) { return strategic.indexOf(a.id) === -1; }).map(function (a) { return a.id; });
  assignGrowth(cg, [{ ids: strategic, share: rs.strategicShare }, { ids: rest, share: 1 - rs.strategicShare }]);
  return cg;
}

function setGrowthInputs(a, inc) {
  a.growthPct = null;
  a.multiplier3y = null;
  if (inc <= 0) { a.growthPct = [0, 0, 0]; return; }
  if (a._mult) { a.multiplier3y = D.r2(1 + inc / a.currentArr); return; }
  const g0 = Math.pow(1 + inc / a.currentArr, 1 / 3) - 1;
  const d = g0 > a._delta ? a._delta : 0;
  a.growthPct = [g0 + d, g0, g0 - d].map(function (g) { return Math.round(g * 1000) / 1000; });
}

// Shares out the region's customer growth over groups of accounts ({ids, share}), by each account's weight,
// then nudges the groups until each group's share of the total three-year growth is on target.
function assignGrowth(cg, groups) {
  const byId = {};
  cg.accounts.forEach(function (a) { byId[a.id] = a; setGrowthInputs(a, 0); });
  const scale = groups.map(function () { return 1; });
  for (let iter = 0; iter < 8; iter++) {
    groups.forEach(function (g, gi) {
      const members = g.ids.map(function (id) { return byId[id]; });
      const wsum = sum(members.map(function (a) { return a._w; })) || 1;
      members.forEach(function (a) { setGrowthInputs(a, cg._total * g.share * scale[gi] * a._w / wsum); });
    });
    cg.accounts.forEach(D.account);
    const inc = function (a) { return sum(a.incrementalArr); };
    const all = sum(cg.accounts.map(inc));
    groups.forEach(function (g, gi) {
      const got = sum(g.ids.map(function (id) { return inc(byId[id]); })) / all;
      if (got > 0) scale[gi] *= g.share / got;
    });
  }
}

function partners(rs, nb, ctx) {
  const rnd = ctx.rnd;
  const used = ['partner', 'allianceA', 'allianceB'].filter(function (ch) {
    return nb.some(function (r) { return r.channelSplit[ch] > 0; });
  });
  if (!used.length) used.push('partner');
  const out = [];
  for (let i = 0; i < rs.partners; i++) {
    out.push({ sourceRow: ctx.S.firstRow.partners + i, name: ctx.name(rnd.pick(NAMES.partnerKinds)),
      channel: i < used.length ? used[i] : rnd.pick(used.concat(['partner'])), maturity: rnd.pick(NAMES.maturity),
      expertiseGeo: rnd.pick(NAMES.markets[rs.id]), expertiseProduct: rnd.pick(NAMES.expertiseProduct),
      fteSales: rnd.int(1, 8), fteConsultants: rnd.int(1, 12), centralSupportPct: rnd.pick([0, 0.05, 0.1, 0.15]),
      arr: null, services: null, _w: rnd.between(0.5, 1.5) });
  }
  return out;
}

// Recomputes every derived value from the inputs. Safe to run again after the planted cases change inputs.
function finish(region, ctx) {
  region.newBusiness.forEach(D.nbRow);
  const cg = region.customerGrowth;
  cg.accounts.forEach(D.account);
  const t = cg.thresholds;
  if (cg.accounts.length) {
    const cands = cg.accounts.filter(function (a) { return a.currentArr <= t.strategicArr && a.currentArr >= t.scaledArr && a.currentArr > t.growthArr; })
      .map(function (a) { return a.cumulativeOrderIntake; }).sort(function (a, b) { return b - a; });
    // About 40% of the mid-sized accounts plan enough order intake to count as Growth.
    const g = Math.min(Math.max(1, Math.round(cands.length * 0.4)), cands.length - 1);
    t.growthOrderIntake = cands.length > 1 ? niceIn(cands[g], cands[g - 1]) : niceIn(0, (cands[0] || 1) + 1);
    cg.accounts.forEach(function (a) { a.segment = D.segmentFor(a, t); });
  }
  region.recap = D.recap(region, ctx.S.years, ctx.S.recapGrid);
  D.partnerAmounts(region, region.partners.map(function (p) { return p._w; }), ctx.S.years);
  return region;
}

function region(rs, ri, ctx) {
  const mc = marketCoverage(rs, ri, ctx);
  mc.forEach(function (row, k) { row.commentary = commentary(row, ctx.S.industries[k], ctx.rnd); });
  const nb = newBusiness(rs, mc, ctx);
  const imp = ctx.S.imports[rs.id];
  const r = { id: rs.id, name: rs.name,
    source: { fileName: rs.name + ' plan.xlsx', fileModified: imp[0], importedAt: imp[1], notes: [] },
    marketCoverage: mc, newBusiness: nb, partners: partners(rs, nb, ctx), recap: [],
    customerGrowth: customerGrowth(rs, mc, ctx) };
  return finish(r, ctx);
}

module.exports = { region: region, assignGrowth: assignGrowth, finish: finish, RATINGS: RATINGS };
