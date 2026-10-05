/*
 * File: tools/sample-expect-planted.js
 * Purpose: Works out every figure the planted cases rely on (docs/PLANTED-CASES.md) from the finished sample data,
 *          and checks each case holds, so the generator refuses to write a file where one doesn't.
 * Provides: module.exports ({build, check, comment})
 * Depends on: nothing (reads the plan object only)
 * Used by: tools/generate-sample-data.js (figures go to tests/fixtures/sample-expected.js and the data file's comment)
 */
'use strict';

function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }
function mean(list) { return sum(list) / list.length; }
function num(v) { return typeof v === 'number' && isFinite(v); }
function clean(x) { return num(x) ? Number(x.toFixed(6)) : x; }
const RATINGS = ['growthPotential', 'criticality', 'competitiveIntensity', 'references', 'expertise', 'productFit'];

function build(plan) {
  const R = {};
  plan.regions.forEach(function (r) { R[r.id] = r; });
  const ids = plan.regions.map(function (r) { return r.id; });
  const mc = function (id, ind) { return R[id].marketCoverage.filter(function (m) { return m.industryId === ind; })[0]; };
  const score = function (id, ind) {
    const row = mc(id, ind), v = RATINGS.map(function (f) { return row[f]; });
    return v.every(num) ? { a: clean(mean(v.slice(0, 3))), b: clean(mean(v.slice(3))) } : null;
  };
  const tiers = function (ind, t) { return ids.filter(function (id) { return t.indexOf(mc(id, ind).tier) !== -1; }); };
  const rated = function (id) { return R[id].newBusiness.filter(function (x) { return num(x.hitRate); }); };
  const wins = function (id) { return sum(rated(id).map(function (x) { return x.targetAccounts * x.hitRate; })); };
  const accounts = function (id) { return R[id].newBusiness.length ? sum(rated(id).map(function (x) { return x.targetAccounts; })) : 0; };
  const value = function (id) { return sum(rated(id).map(function (x) { return x.targetAccounts * x.hitRate * x.avgDealSize; })); };
  const per = function (fn) { const o = {}; ids.forEach(function (id) { o[id] = clean(fn(id)); }); return o; };
  const others = function (id) { return ids.filter(function (x) { return x !== id; }); };
  const growth = function (a) { return sum(a.incrementalArr); };
  const cgShare = function (id, pred) {
    const acc = R[id].customerGrowth.accounts;
    return acc.length ? clean(sum(acc.filter(pred).map(growth)) / sum(acc.map(growth))) : null;
  };
  const strat = function (id) { return function (a) { return a.currentArr > R[id].customerGrowth.thresholds.strategicArr; }; };
  // Share of three-year order intake from accounts in a segment, as the segments chart shows it (D79)
  const oiShare = function (id, seg) {
    const acc = R[id].customerGrowth.accounts, oi = function (a) { return num(a.cumulativeOrderIntake) ? a.cumulativeOrderIntake : 0; };
    return acc.length ? clean(sum(acc.filter(function (a) { return a.segment === seg; }).map(oi)) / sum(acc.map(oi))) : null;
  };
  const pipe = function (id) { return sum(R[id].marketCoverage.map(function (m) { return m.pipelineTotal; }).filter(num)); };
  const pipe12 = function (id) { return sum(R[id].marketCoverage.map(function (m) { return m.pipelineCreated12m; }).filter(num)); };
  const y1 = function (id) { return sum(R[id].newBusiness.map(function (x) { return x.arrPotential[0]; }).filter(num)); };
  const nbRows = function (id, ind) { return R[id].newBusiness.filter(function (x) { return x.industryId === ind; }).length; };
  const top3 = R.na.customerGrowth.accounts.slice().sort(function (a, b) { return growth(b) - growth(a); }).slice(0, 3);
  const e = R.ceu.marketCoverage.filter(function (m) { return num(m.currentArr); }).sort(function (a, b) { return b.currentArr - a.currentArr; });
  const notYet = {};
  ids.forEach(function (id) {
    notYet[id] = plan.lookups.industries.filter(function (d) { const s = d.rated && score(id, d.id); return s && s.a >= 2 && s.b < 2; })
      .map(function (d) { return d.id; });
  });
  const pooledHit = function (list) { return sum(list.map(wins)) / sum(list.map(accounts)); };
  const pooledDeal = function (list) { return sum(list.map(value)) / sum(list.map(wins)); };
  const hit = per(function (id) { return wins(id) / accounts(id); });
  const deal = per(function (id) { return value(id) / wins(id); });
  const w = per(wins);
  return {
    p01: { industry: 'education', tier12: tiers('education', [1, 2]), tier3: tiers('education', [3]) },
    p02: { industry: 'retail', tier2: tiers('retail', [2]), tier3: tiers('retail', [3]) },
    p03: { industry: 'datacenters', scores: per(function (id) { return score(id, 'datacenters'); }),
      lowAbility: ids.filter(function (id) { return score(id, 'datacenters').b < 2; }) },
    p04: Object.assign({ region: 'neu', industry: 'pharma' }, pick(mc('neu', 'pharma'), ['references', 'currentArr', 'pipelineTotal', 'pipelineCreated12m'])),
    p05: { region: 'ceu', industry: 'manufacturing', expertise: mc('ceu', 'manufacturing').expertise,
      currentArr: mc('ceu', 'manufacturing').currentArr, largest: e[0].industryId, next: e[1].currentArr },
    p06: { region: 'seu', industry: 'retail', tier: mc('seu', 'retail').tier, pipelineTotal: mc('seu', 'retail').pipelineTotal,
      regionPipeline: pipe('seu'), share: clean(mc('seu', 'retail').pipelineTotal / pipe('seu')) },
    p07: Object.assign({ region: 'mea', industry: 'hospitality', nbRows: nbRows('mea', 'hospitality') },
      pick(mc('mea', 'hospitality'), ['tier', 'pipelineTotal', 'pipelineCreated12m'])),
    p08: { region: 'ceu', hitRates: hit, value: hit.ceu, othersAvg: clean(pooledHit(others('ceu'))) },
    p09: { region: 'latam', dealSizes: deal, value: deal.latam, othersAvg: clean(pooledDeal(others('latam'))),
      ratio: clean(deal.latam / pooledDeal(others('latam'))) },
    p10: { region: 'latam', nbY1: clean(y1('latam')), pipeline12m: clean(pipe12('latam')), ratio: clean(y1('latam') / pipe12('latam')) },
    p11: { region: 'apac', industry: 'transport', tier: mc('apac', 'transport').tier, nbRows: nbRows('apac', 'transport'),
      pipelineTotal: mc('apac', 'transport').pipelineTotal },
    p12: { region: 'na', wins: w, value: w.na, othersAvg: clean(mean(others('na').map(wins))), ratio: clean(wins('na') / mean(others('na').map(wins))) },
    p13: { region: 'na', top3: top3.map(function (a) { return a.id; }), share: cgShare('na', function (a) { return top3.indexOf(a) !== -1; }),
      highRisk: top3.filter(function (a) { return a.riskLevel === 'high'; }).map(function (a) { return a.id; }) },
    p14: { region: 'mea', share: cgShare('mea', function (a) { return a.riskLevel === 'high' || a.riskLevel === 'medium'; }) },
    p15: { region: 'apac', strategicShare: per(function (id) { return cgShare(id, strat(id)); }),
      strategicOiShare: per(function (id) { return oiShare(id, 'strategic'); }) },
    p16: { industry: 'fsm', scores: per(function (id) { return score(id, 'fsm'); }),
      regions: ids.filter(function (id) { const s = score(id, 'fsm'); return s.a >= 2 && s.b < 2; }),
      successFactors: per(function (id) { return R[id].newBusiness.filter(function (x) { return x.industryId === 'fsm'; }).map(function (x) { return x.successFactors; }); }) },
    attractiveNotYet: notYet,
    gaps: { blankRatings: [['neu', 'finance', 'criticality', mc('neu', 'finance').criticality], ['neu', 'property', 'productFit', mc('neu', 'property').productFit]],
      blankTier: ['mea', 'government', mc('mea', 'government').tier],
      blankHitRateRows: per(function (id) { return R[id].newBusiness.filter(function (x) { return x.hitRate === null; }).length; }),
      emptySection: ids.filter(function (id) { return !R[id].customerGrowth.accounts.length; }),
      notes: per(function (id) { return R[id].source.notes.length; }),
      zeroArr: ['na', 'culture', mc('na', 'culture').currentArr], blankArr: ['neu', 'culture', mc('neu', 'culture').currentArr],
      importedAt: per(function (id) { return R[id].source.importedAt; }) },
    sources: sources(plan, R)
  };
}

function pick(o, keys) { const out = {}; keys.forEach(function (k) { out[k] = o[k]; }); return out; }

// Planted check figures and their file › sheet › cell (TPV-TC-020), worked out from the sourceMap here.
function sources(plan, R) {
  const map = plan.meta.sourceMap;
  const row = function (id, ind) { return R[id].marketCoverage.filter(function (m) { return m.industryId === ind; })[0].sourceRow; };
  const at = function (src) {
    const m = map[src.section];
    let cell = src.cell || (m.cells && m.cells[src.field]);
    if (!cell) { const col = m.columns[src.field]; cell = (Array.isArray(col) ? col[src.year - 1] : col) + src.row; }
    return R[src.regionId].source.fileName + ' › ' + m.sheet + ' › ' + cell;
  };
  const list = [
    { regionId: 'neu', section: 'marketCoverage', field: 'criticality', row: row('neu', 'finance'), kind: 'IN' },
    { regionId: 'ceu', section: 'marketCoverage', field: 'currentArr', row: row('ceu', 'manufacturing'), kind: 'PRE' },
    { regionId: 'seu', section: 'marketCoverage', field: 'pipelineTotal', row: row('seu', 'retail'), kind: 'PRE' },
    { regionId: 'latam', section: 'newBusiness', field: 'arrPotential', row: R.latam.newBusiness[0].sourceRow, year: 1, kind: 'DER' },
    { regionId: 'na', section: 'customerGrowth', field: 'incrementalArr', row: R.na.customerGrowth.accounts[0].sourceRow, year: 3, kind: 'DER' },
    { regionId: 'apac', section: 'customerGrowth', field: 'thresholds.strategicArr', kind: 'IN' },
    { regionId: 'mea', section: 'partners', field: 'arr', row: R.mea.partners[0].sourceRow, year: 2, kind: 'IN' },
    { regionId: 'na', section: 'recap', field: 'value', cell: R.na.recap[0].sourceCell, kind: 'DER' }
  ];
  return list.map(function (src) { return { src: src, text: at(src), calculated: src.kind === 'DER' }; });
}

// Each planted case, as a check. Returns the cases that don't hold.
function check(x) {
  const bad = [];
  const ok = function (cond, what) { if (!cond) bad.push(what); };
  const near = function (a, b, tol) { return Math.abs(a - b) <= tol; };
  const ids = Object.keys(x.p08.hitRates);
  ok(x.p01.tier12.length === 6 && x.p01.tier3.join() === 'apac', 'P01');
  ok(x.p02.tier2.join() === 'na,latam,neu' && x.p02.tier3.length === 4, 'P02');
  ok(x.p03.lowAbility.join() === 'latam,neu,ceu,apac' && x.p03.lowAbility.every(function (id) { return x.p03.scores[id].a < 2; }), 'P03');
  ok(x.p04.references === 3 && x.p04.currentArr === 0 && x.p04.pipelineTotal === 0 && x.p04.pipelineCreated12m === 0, 'P04');
  ok(x.p05.expertise === 1 && x.p05.currentArr === 2400 && x.p05.largest === 'manufacturing' && x.p05.next < 2400, 'P05');
  ok(x.p06.tier === 3 && near(x.p06.share, 0.18, 0.0005), 'P06');
  ok(x.p07.tier === 2 && x.p07.pipelineTotal === 0 && x.p07.pipelineCreated12m === 0 && x.p07.nbRows === 0, 'P07');
  ok(near(x.p08.value, 0.35, 1e-9) && near(x.p08.othersAvg, 0.15, 0.005) &&
    ids.every(function (id) { return id === 'ceu' || (x.p08.hitRates[id] >= 0.12 && x.p08.hitRates[id] <= 0.18); }), 'P08');
  ok(near(x.p09.ratio, 1.6, 0.02) && ids.every(function (id) { return id === 'latam' || x.p09.dealSizes[id] < x.p09.value; }), 'P09');
  ok(near(x.p10.ratio, 4, 0.01), 'P10');
  ok(x.p11.tier === 2 && x.p11.nbRows > 0 && x.p11.pipelineTotal === 0, 'P11');
  ok(near(x.p12.ratio, 3, 0.05), 'P12');
  ok(near(x.p13.share, 0.6, 0.005) && x.p13.highRisk.length === 1, 'P13');
  ok(near(x.p14.share, 0.4, 0.005), 'P14');
  ok(ids.every(function (id) {
    const s = x.p15.strategicShare[id], o = x.p15.strategicOiShare[id];
    return id === 'ceu' ? s === null && o === null : id === 'apac' ? near(s, 0.8, 0.005) && near(o, 0.8, 0.005) :
      s >= 0.3 && s <= 0.5 && o >= 0.3 && o <= 0.5;
  }), 'P15');
  ok(x.p16.regions.join() === 'na,seu,mea,apac' && x.p16.regions.every(function (id) { return x.p16.scores[id].a >= 2.33 && x.p16.scores[id].b <= 1.67; }) &&
    ids.every(function (id) { return x.p16.regions.indexOf(id) !== -1 || x.p16.scores[id].b >= 2; }), 'P16');
  const counts = {};
  ids.forEach(function (id) { x.attractiveNotYet[id].forEach(function (ind) { counts[ind] = (counts[ind] || 0) + 1; }); });
  ok(!counts.datacenters && Object.keys(counts).every(function (ind) { return ind === 'fsm' || counts[ind] <= 2; }), 'P16 (no near-duplicates)');
  return bad;
}

function comment(x) {
  const f = function (o) { return Object.keys(o).map(function (k) { return k + ' ' + o[k]; }).join(', '); };
  return ['P06 Southern Europe Retail pipeline share: ' + x.p06.share,
    'P08 hit rates: ' + f(x.p08.hitRates) + '; others ' + x.p08.othersAvg,
    'P09 deal sizes: ' + f(x.p09.dealSizes) + '; ratio ' + x.p09.ratio,
    'P10 Latin America year-1 NB ARR / pipeline created 12m: ' + x.p10.nbY1 + ' / ' + x.p10.pipeline12m + ' = ' + x.p10.ratio,
    'P12 implied wins: ' + f(x.p12.wins) + '; ratio ' + x.p12.ratio,
    'P13 North America top-3 share ' + x.p13.share + ' (' + x.p13.top3.join(', ') + ')',
    'P14 Middle East & Africa at-risk share ' + x.p14.share,
    'P15 Strategic share: ' + f(x.p15.strategicShare) + '; of three-year order intake: ' + f(x.p15.strategicOiShare),
    'Attractive but not yet winnable: ' + Object.keys(x.attractiveNotYet).map(function (id) { return id + ' [' + x.attractiveNotYet[id].join(' ') + ']'; }).join(', ')];
}

module.exports = { build: build, check: check, comment: comment };
