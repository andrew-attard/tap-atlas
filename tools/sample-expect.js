/*
 * File: tools/sample-expect.js
 * Purpose: Works out, from the finished sample data, the figures tests check against: per-region totals,
 *          organization totals and the headline sentence's figures. Written to tests/fixtures/sample-expected.js.
 * Provides: module.exports ({build, comment})
 * Depends on: nothing (reads the plan object only)
 * Used by: tools/generate-sample-data.js
 *
 * These figures are computed straight from the raw rows here, never by the app's own code.
 */
'use strict';

function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }
function num(v) { return typeof v === 'number' && isFinite(v); }
function clean(x) { return x == null ? null : Number(x.toFixed(6)); }
function sumOf(rows, f) { return sum(rows.map(f).filter(num)); }

function regionTotals(r) {
  const mc = r.marketCoverage, nb = r.newBusiness, acc = r.customerGrowth.accounts;
  const rated = nb.filter(function (x) { return num(x.hitRate) && num(x.targetAccounts); });
  const wins = sum(rated.map(function (x) { return x.targetAccounts * x.hitRate; }));
  const winsValue = sum(rated.filter(function (x) { return num(x.avgDealSize); }).map(function (x) { return x.targetAccounts * x.hitRate * x.avgDealSize; }));
  const nbArr = sumOf(nb, function (x) { return x.arrPotential.every(num) ? sum(x.arrPotential) : null; });
  const nbSvc = sumOf(nb, function (x) { return x.servicesPotential.every(num) ? sum(x.servicesPotential) : null; });
  const cgArr = acc.length ? sum(acc.map(function (a) { return sum(a.incrementalArr); })) : null;
  const cgSvc = acc.length ? sum(acc.map(function (a) { return sum(a.servicesOrderIntake); })) : null;
  const tiers = function (t) { return mc.filter(function (x) { return x.tier === t; }).length; };
  const seg = function (s) { return acc.length ? acc.filter(function (a) { return a.segment === s; }).length : null; };
  return {
    'base.arr': sumOf(mc, function (x) { return x.currentArr; }),
    'base.pipeline': sumOf(mc, function (x) { return x.pipelineTotal; }),
    'base.pipeline12m': sumOf(mc, function (x) { return x.pipelineCreated12m; }),
    'nb.arr': clean(nbArr),
    'nb.arr.y1': clean(sumOf(nb, function (x) { return x.arrPotential[0]; })),
    'nb.services': clean(nbSvc),
    'nb.targetAccounts': sumOf(nb, function (x) { return x.targetAccounts; }),
    'nb.targetAccountsRated': sum(rated.map(function (x) { return x.targetAccounts; })),
    'nb.wins': clean(wins),
    'nb.hitRate': clean(wins / sum(rated.map(function (x) { return x.targetAccounts; }))),
    'nb.avgDealSize': clean(winsValue / wins),
    'cg.arr': clean(cgArr),
    'cg.services': clean(cgSvc),
    'amb.arr': clean(nbArr + (cgArr || 0)),
    'amb.services': clean(nbSvc + (cgSvc || 0)),
    'amb.oi': clean(nbArr + (cgArr || 0) + nbSvc + (cgSvc || 0)),
    'focus.tier1': tiers(1), 'focus.tier2': tiers(2), 'focus.tier3': tiers(3),
    'cg.segment.strategic': seg('strategic'), 'cg.segment.growth': seg('growth'),
    'cg.segment.core': seg('core'), 'cg.segment.scaled': seg('scaled'),
    accounts: acc.length, nbRows: nb.length, partners: r.partners.length
  };
}

function build(plan) {
  const totals = {};
  plan.regions.forEach(function (r) { totals[r.id] = regionTotals(r); });
  const ids = plan.regions.map(function (r) { return r.id; });
  const org = {};
  ['base.arr', 'nb.arr', 'cg.arr', 'amb.arr', 'nb.wins'].forEach(function (k) {
    org[k] = clean(sum(ids.map(function (id) { return totals[id][k]; }).filter(num)));
  });
  const groupIds = plan.lookups.industries.filter(function (d) { return d.groupPriority; }).map(function (d) { return d.id; });
  const tier1 = {};
  groupIds.forEach(function (ind) {
    tier1[ind] = plan.regions.filter(function (r) {
      return r.marketCoverage.some(function (x) { return x.industryId === ind && x.tier === 1; });
    }).length;
  });
  return {
    regions: ids,
    totals: totals,
    org: org,
    // US-1.5.3: "{n} regions plan {amb} of new ARR over three years: {nbShare} from new business and {cgShare} from existing customers."
    headline: { regions: ids.length, ambArr: org['amb.arr'], nbArr: org['nb.arr'], cgArr: org['cg.arr'],
      nbShare: clean(org['nb.arr'] / org['amb.arr']), cgShare: clean(org['cg.arr'] / org['amb.arr']),
      cgExcluded: ids.filter(function (id) { return totals[id]['cg.arr'] === null; }), tier1: tier1 }
  };
}

// Plain lines for the comment block at the top of the data file.
function comment(x) {
  const lines = ['Headline: ' + x.headline.regions + ' regions, 3-year ARR ambition ' + x.headline.ambArr + ' (new business ' +
    x.headline.nbArr + ', customer growth ' + x.headline.cgArr + '; not provided: ' + (x.headline.cgExcluded.join(', ') || 'none') + ')'];
  x.regions.forEach(function (id) {
    const t = x.totals[id];
    lines.push(id + ': ARR ' + t['base.arr'] + ', NB 3-yr ' + t['nb.arr'] + ', CG 3-yr ' + t['cg.arr'] + ', hit rate ' +
      t['nb.hitRate'] + ', wins ' + t['nb.wins'] + ', deal size ' + t['nb.avgDealSize']);
  });
  return lines;
}

module.exports = { build: build, comment: comment };
