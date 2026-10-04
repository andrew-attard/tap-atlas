/*
 * File: tools/sample-plant-p2.js
 * Purpose: Plants the Phase 2 cases of docs/PLANTED-CASES.md (Q01 to Q06) into the sample data: a region with an
 *          outlying channel mix, one leaning on existing customers, sub-industry names leaders might type, one
 *          shared sub-industry and partner, partner FTE that follows planned order intake, and a theme below
 *          the threshold.
 * Provides: module.exports ({before, after})
 * Depends on: tools/sample-planted-p2.js (the values), tools/sample-names.js, tools/sample-derive.js
 * Used by: tools/sample-plant.js (before: ahead of the Phase 1 calibrations; after: once every figure is final)
 *
 * Nothing here draws a random number before the Phase 1 cases are planted, so their figures keep the same seed.
 */
'use strict';

const Q = require('./sample-planted-p2');
const NAMES = require('./sample-names');
const D = require('./sample-derive');

function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }
function num(v) { return typeof v === 'number' && isFinite(v); }
function region(plan, id) { return plan.regions.filter(function (r) { return r.id === id; })[0]; }
function oi(p) { return sum((p.arr || []).concat(p.services || []).filter(num)); }

// Q01 and Q02 change inputs that the Phase 1 calibrations (P09, P12) and the recap build on.
function before(plan) {
  const C = Q.channelReliance;
  region(plan, C.region).newBusiness.forEach(function (row) {
    row.channelSplit = {};
    D.CHANNELS.forEach(function (ch, i) { row.channelSplit[ch] = C.split[i]; });
  });
  // Rows come in pairs with equal target accounts, so the region's weighted hit rate (P08) is unchanged.
  region(plan, Q.planMakeup.region).newBusiness.forEach(function (row) {
    if (num(row.targetAccounts)) row.targetAccounts = Math.max(1, Math.round(row.targetAccounts * Q.planMakeup.targetAccounts));
  });
}

// Each industry's names are handed out in turn across the regions, so no two regions share one by chance (Q03).
function subIndustries(plan) {
  const next = {};
  plan.regions.forEach(function (r) {
    r.newBusiness.forEach(function (row) {
      const pool = NAMES.subVerticals[row.industryId];
      const i = next[row.industryId] || 0;
      row.subVertical = pool[i % pool.length];
      next[row.industryId] = i + 1;
    });
  });
  const S = Q.sharedSubIndustry;
  Object.keys(S.names).forEach(function (id) {
    region(plan, id).newBusiness.filter(function (row) { return row.industryId === S.industry; })[0].subVertical = S.names[id];
  });
}

// Q05: FTE follows each partner's planned order intake, rounded up so nobody passes the top rate by rounding;
// the planted partner gets the FTE that puts it at the planted multiple of the average across partners.
function partnerCapacity(plan, rnd) {
  const P = Q.partnerCapacity;
  const all = [];
  plan.regions.forEach(function (r) { r.partners.forEach(function (p) { all.push({ r: r.id, p: p }); }); });
  const set = function (p, total) {
    p.fteSales = total < 2 ? total : Math.max(1, Math.round(total * P.salesShare));
    p.fteConsultants = total - p.fteSales;
  };
  all.forEach(function (x) { set(x.p, Math.max(1, Math.ceil(oi(x.p) / rnd.between(P.perFte[0], P.perFte[1])))); });
  const target = all.filter(function (x) { return x.r === P.region && x.p.channel === P.channel; })[0].p;
  const rest = all.filter(function (x) { return x.p !== target; });
  const restOi = sum(rest.map(function (x) { return oi(x.p); }));
  const restFte = sum(rest.map(function (x) { return x.p.fteSales + x.p.fteConsultants; }));
  set(target, Math.max(1, Math.round(oi(target) * restFte / (P.multiple * (restOi + oi(target)) - oi(target)))));
}

// Q04: the first Alliance A partner of one region also appears, by the same name, in another region.
function sharedPartner(plan) {
  const S = Q.sharedPartner;
  const first = function (id) { return region(plan, id).partners.filter(function (p) { return p.channel === S.channel; })[0]; };
  first(S.to).name = first(S.from).name;
}

// Q06: a theme mentioned in two regions only, on rows that had no success factor.
function themeText(plan) {
  const B = Q.themes.below;
  B.regions.forEach(function (id) {
    const row = region(plan, id).newBusiness.filter(function (x) {
      return !x.successFactors && num(x.hitRate) && x.industryId !== 'fsm';
    })[0];
    if (!row) throw new Error('planted case Q06 needs a row without success factors in ' + id);
    row.successFactors = B.text;
  });
}

function after(plan, ctx) {
  subIndustries(plan);
  sharedPartner(plan);
  themeText(plan);
  partnerCapacity(plan, ctx.rnd);
}

module.exports = { before: before, after: after };
