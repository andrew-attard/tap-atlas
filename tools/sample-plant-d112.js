/*
 * File: tools/sample-plant-d112.js
 * Purpose: Plants the D112 cases of docs/PLANTED-CASES.md (S02 to S04; S01 is natural) into the sample data: a
 *          region whose new business grows steeply (services with it), Tier 2 industries with no plan money behind
 *          them, and a region whose partners have few sales staff.
 * Provides: module.exports ({before, after})
 * Depends on: tools/sample-planted-d112.js (the values)
 * Used by: tools/sample-plant.js (before: ahead of the derived values; after: once every figure is final)
 *
 * Draws no random numbers, so every other figure keeps its seed.
 */
'use strict';

const S = require('./sample-planted-d112');

function region(plan, id) { return plan.regions.filter(function (r) { return r.id === id; })[0]; }

// S03: the growth inputs of every New Business row; the derived values follow when the region is finished.
function before(plan) {
  const G = S.servicesDelivery;
  region(plan, G.region).newBusiness.forEach(function (row) { row.growth = { year2: G.growth.year2, year3: G.growth.year3 }; });
}

function after(plan) {
  // S02: a Tier 3 industry has no New Business rows, so it stays without any once it is Tier 2
  const T = S.priorityVsPlan;
  T.toTier2.forEach(function (id) {
    const r = region(plan, id);
    if (r.newBusiness.some(function (row) { return row.industryId === T.industry; })) throw new Error('planted case S02 needs no New Business rows in ' + id);
    r.marketCoverage.filter(function (m) { return m.industryId === T.industry; })[0].tier = 2;
  });
  // S04: the same staff per partner, fewer of them in sales (rounded as Q05 does)
  const L = S.partnerLoad;
  region(plan, L.region).partners.forEach(function (p) {
    const total = p.fteSales + p.fteConsultants;
    p.fteSales = total < 2 ? total : Math.max(1, Math.round(total * L.salesShare));
    p.fteConsultants = total - p.fteSales;
  });
}

module.exports = { before: before, after: after };
