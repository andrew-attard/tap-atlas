/*
 * File: tools/sample-expect-p4.js
 * Purpose: Works out every figure the Phase 4 planted cases rely on (docs/PLANTED-CASES.md, R01 to R10) from the
 *          finished sample data, and checks each case holds, so the generator refuses to write a file where one
 *          doesn't. The figures go to tests/fixtures/sample-expected.js (`p4` and `r01` to `r10`) for the tests.
 * Provides: module.exports ({build, check, comment})
 * Depends on: tools/sample-planted-p4.js (the planted cases' limits)
 * Used by: tools/generate-sample-data.js
 * Owner: DATA4 stream (#438)
 *
 * Worked out from the raw items here, never by the app's code. Shares and ratios are a ratio of sums: a region's
 * figure is its summed parts over its summed totals, and "all regions" sums the regions that have both sides.
 * The gap between customer value and books value is over ARR and services, the types both lists hold (`booksCv`).
 */
'use strict';

const P = require('./sample-planted-p4');

const TYPES = ['arr', 'services', 'swPerpetual', 'hardware'];
const CATEGORY = { arr: 'recurring', services: 'services', swPerpetual: 'swPerpetual', hardware: 'hardware' };
const RESELLERS = ['partner', 'allianceA', 'allianceB'];

function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }
function num(v) { return typeof v === 'number' && isFinite(v); }
function clean(x) { return num(x) ? Number(x.toFixed(6)) : x; }
function values(list, pred) { return sum((list || []).filter(pred || Boolean).map(function (x) { return x.value; }).filter(num)); }
function byYear(list, years, pred) {
  return years.map(function (y) { return clean(values(list, function (x) { return x.year === y && (!pred || pred(x)); })); });
}

// One region's figures. A part the region does not carry is null, never zero.
function regionFigures(r, years) {
  const cv = byYear(r.recap, years), books = byYear(r.booksValue, years), revenue = byYear(r.revenue, years);
  const both = function (x) { return x.type === 'arr' || x.type === 'services'; };
  const booksCv = byYear(r.booksValue, years, both);
  const cv3 = sum(cv), books3 = sum(books), booksCv3 = sum(booksCv);
  const out = { cv: cv, books: books, booksCv: booksCv, revenue: revenue, cv3: clean(cv3), books3: clean(books3), booksCv3: clean(booksCv3),
    revenue3: clean(sum(revenue)),
    revenueShare: years.map(function (y, i) { return clean(revenue[i] / cv[i]); }), revenueShare3: clean(sum(revenue) / cv3),
    gap3: clean(cv3 - booksCv3), gapShare: clean((cv3 - booksCv3) / cv3), outsourcingPct: r.outsourcingPct };
  out.booksByType = {};
  out.booksByCategory = {};
  TYPES.forEach(function (t) {
    out.booksByType[t] = byYear(r.booksValue, years, function (x) { return x.type === t; });
    out.booksByCategory[CATEGORY[t]] = clean(sum(out.booksByType[t]));
  });
  out.gapByChannel = {};
  ['direct'].concat(RESELLERS).forEach(function (ch) {
    const c = values(r.recap, function (x) { return x.channel === ch; }), b = values(r.booksValue, function (x) { return x.channel === ch && both(x); });
    out.gapByChannel[ch] = { cv: clean(c), books: clean(b), gap: clean(c - b), share: c ? clean((c - b) / c) : null };
  });
  out.routes = {};
  P.lookups.routes.forEach(function (rt) {
    const mine = (r.routes || []).filter(function (x) { return x.route === rt.id; });
    out.routes[rt.id] = mine.length ? clean(values(mine)) : null;
  });
  out.routes3 = clean(values(r.routes));

  // Strategic plan: the plan's books order intake against it, by year and over three years
  if (r.strategicPlan) {
    const sp = byYear(r.strategicPlan, years), sp3 = sum(sp);
    out.strategicPlan = { value: sp, value3: clean(sp3), variance: years.map(function (y, i) { return clean(books[i] - sp[i]); }),
      variance3: clean(books3 - sp3), variancePct: years.map(function (y, i) { return clean((books[i] - sp[i]) / sp[i]); }),
      variancePct3: clean((books3 - sp3) / sp3), byType: {} };
    TYPES.forEach(function (t) {
      out.strategicPlan.byType[t] = clean(values(r.strategicPlan, function (x) { return x.type === t; }));
    });
  } else out.strategicPlan = null;

  // Base year: plan year 1 (books) against the forecast and the budget; pipeline against what is still to win.
  // Coverage follows the Data Contract row by row: the workbook's ratio stands where it gives one (so the amount
  // still to win is read back from it, pipeline over the ratio), else pipeline over forecast minus actuals. The
  // region's figure is the summed pipeline over the summed amounts, which is what the app shows; the plain
  // pipeline over forecast minus actuals is kept beside it (`pipelineOverLeft`). The two agree to two decimals.
  if (r.baseYear) {
    const it = r.baseYear.items, tot = function (f) { return sum(it.map(function (x) { return x[f]; }).filter(num)); };
    const left = tot('forecast') - tot('actuals');
    const toWin = function (x) { return num(x.coverage) && x.coverage > 0 ? x.pipeline / x.coverage : x.forecast - x.actuals; };
    out.baseYear = { year: r.baseYear.year, actualsThrough: r.baseYear.actualsThrough, budget: tot('budget'), forecast: tot('forecast'),
      actuals: tot('actuals'), pipeline: tot('pipeline'), stillToWin: left, year1: books[0],
      growth: clean(books[0] / tot('forecast') - 1), growthOnBudget: clean(books[0] / tot('budget') - 1),
      coverage: clean(tot('pipeline') / sum(it.map(toWin))), pipelineOverLeft: clean(tot('pipeline') / left),
      coverageGiven: it.every(function (x) { return num(x.coverage); }), byCategory: {} };
    it.forEach(function (x) {
      const y1 = out.booksByType[x.category === 'recurring' ? 'arr' : x.category][0];
      out.baseYear.byCategory[x.category] = { forecast: x.forecast, year1: y1, growth: x.forecast ? clean(y1 / x.forecast - 1) : null,
        coverage: x.coverage, pipelineOverLeft: x.forecast > x.actuals ? clean(x.pipeline / (x.forecast - x.actuals)) : null };
    });
  } else out.baseYear = null;

  // New business by solution, from the rows (customer value): three-year ARR, services and order intake. A group
  // with no row is zero; a group whose only rows have a blank potential (the G1 row) is not provided, never zero.
  const rows = r.newBusiness.filter(function (x) { return x.arrPotential.every(num); });
  const nbOi = sum(rows.map(function (x) { return sum(x.arrPotential) + sum(x.servicesPotential); }));
  out.solutions = {};
  P.lookups.solutions.map(function (s) { return s.id; }).concat([null]).forEach(function (id) {
    const named = r.newBusiness.filter(function (x) { return (x.solution || null) === id; });
    const mine = named.filter(function (x) { return x.arrPotential.every(num); });
    const arr = sum(mine.map(function (x) { return sum(x.arrPotential); })), svc = sum(mine.map(function (x) { return sum(x.servicesPotential); }));
    const blank = named.length > 0 && !mine.length;
    out.solutions[id || 'none'] = blank ? { rows: named.length, arr: null, services: null, oi: null, share: null }
      : { rows: named.length, arr: clean(arr), services: clean(svc), oi: clean(arr + svc), share: clean((arr + svc) / nbOi) };
  });
  out.rowsWithoutSolution = r.newBusiness.filter(function (x) { return !x.solution; }).length;
  const top = Object.keys(out.solutions).filter(function (k) { return k !== 'none'; })
    .sort(function (a, b) { return out.solutions[b].oi - out.solutions[a].oi; })[0];
  out.topSolution = { id: top, share: out.solutions[top].share };
  return out;
}

function partnerFigures(plan) {
  const maturity = {}, types = {}, oiByMaturity = {};
  P.lookups.partnerMaturity.map(function (m) { return m.id; }).concat(['none']).forEach(function (id) { maturity[id] = 0; oiByMaturity[id] = 0; });
  P.lookups.partnerTypes.map(function (t) { return t.id; }).concat(['none']).forEach(function (id) { types[id] = 0; });
  const blanks = { type: [], maturity: [] };
  plan.regions.forEach(function (r) {
    r.partners.forEach(function (p) {
      maturity[p.maturity || 'none']++;
      types[p.type || 'none']++;
      oiByMaturity[p.maturity || 'none'] += sum(p.arr.concat(p.services).filter(num));
      if (!p.type) blanks.type.push([r.id, p.sourceRow, p.name]);
      if (!p.maturity) blanks.maturity.push([r.id, p.sourceRow, p.name]);
    });
  });
  Object.keys(oiByMaturity).forEach(function (k) { oiByMaturity[k] = clean(oiByMaturity[k]); });
  return { partners: sum(Object.keys(maturity).map(function (k) { return maturity[k]; })), maturity: maturity, types: types,
    oiByMaturity: oiByMaturity, blanks: blanks };
}

// Planted figures and their file › sheet › cell (TPV-TC-645), worked out from the source map here.
function sources(plan) {
  const map = plan.meta.sourceMap, R = {};
  plan.regions.forEach(function (r) { R[r.id] = r; });
  const at = function (src) {
    const m = map[src.section];
    let cell = src.cell || (m.cells && m.cells[src.field]);
    if (!cell) { const c = m.columns[src.field]; cell = (Array.isArray(c) ? c[src.year - 1] : c) + src.row; }
    return R[src.regionId].source.fileName + ' › ' + m.sheet + ' › ' + cell;
  };
  const cellOf = function (id, part, i) { return R[id][part][i].sourceCell; };
  const list = [
    { regionId: 'na', section: 'revenue', field: 'value', cell: cellOf('na', 'revenue', 0), kind: 'DER' },
    { regionId: 'seu', section: 'booksValue', field: 'value', cell: cellOf('seu', 'booksValue', 1), kind: 'DER' },
    { regionId: 'apac', section: 'strategicPlan', field: 'value', cell: cellOf('apac', 'strategicPlan', 0), kind: 'PRE' },
    { regionId: 'latam', section: 'routes', field: 'value', cell: cellOf('latam', 'routes', 0), kind: 'DER' },
    { regionId: 'mea', section: 'baseYear', field: 'forecast', row: R.mea.baseYear.items[0].sourceRow, kind: 'PRE' },
    { regionId: 'na', section: 'baseYear', field: 'coverage', row: R.na.baseYear.items[1].sourceRow, kind: 'PRE' },
    { regionId: 'na', section: 'baseYear', field: 'actualsThrough', kind: 'PRE' },
    { regionId: 'neu', section: 'newBusiness', field: 'solution', row: R.neu.newBusiness[0].sourceRow, kind: 'IN' },
    { regionId: 'seu', section: 'partners', field: 'type', row: R.seu.partners[0].sourceRow, kind: 'IN' },
    { regionId: 'seu', section: 'partners', field: 'distribution', row: R.seu.partners[0].sourceRow, year: 2, kind: 'IN' },
    { regionId: 'ceu', section: 'partners', field: 'servicesFromPartners', row: R.ceu.partners[1].sourceRow, year: 3, kind: 'DER' },
    { regionId: 'mea', section: 'partners', field: 'supportPct', row: R.mea.partners[0].sourceRow, year: 1, kind: 'IN' },
    { regionId: 'seu', section: 'partners', field: 'outsourcingPct', kind: 'IN' }
  ];
  return list.map(function (src) { return { src: src, text: at(src), calculated: src.kind === 'DER' }; });
}

function build(plan) {
  const years = plan.meta.years, regions = {}, ids = plan.regions.map(function (r) { return r.id; }), C = P.cases;
  plan.regions.forEach(function (r) { regions[r.id] = regionFigures(r, years); });
  const per = function (fn) { const o = {}; ids.forEach(function (id) { o[id] = fn(regions[id]); }); return o; };
  const withPlan = ids.filter(function (id) { return regions[id].strategicPlan; }), withBase = ids.filter(function (id) { return regions[id].baseYear; });
  const add = function (list, fn) { return sum(list.map(function (id) { return fn(regions[id]); })); };
  const plans = add(withPlan, function (x) { return x.books3; }), strategic = add(withPlan, function (x) { return x.strategicPlan.value3; });
  const variance = per(function (x) { return x.strategicPlan ? x.strategicPlan.variancePct3 : null; });
  const growth = per(function (x) { return x.baseYear ? x.baseYear.growth : null; });
  const coverage = per(function (x) { return x.baseYear ? x.baseYear.coverage : null; });
  const gap = per(function (x) { return x.gapShare; });
  const top = per(function (x) { return x.topSolution; });
  const pt = partnerFigures(plan);
  const one = function (id) { return regions[id]; };
  const others = function (id, list, top3, bottom3) {   // the other regions together, as a ratio of sums
    const rest = list.filter(function (x) { return x !== id; });
    return clean(add(rest, top3) / add(rest, bottom3));
  };
  return {
    p4: { years: years, regions: regions, withStrategicPlan: withPlan, withBaseYear: withBase,
      all: { cv3: clean(add(ids, function (x) { return x.cv3; })), books3: clean(add(ids, function (x) { return x.books3; })),
        booksCv3: clean(add(ids, function (x) { return x.booksCv3; })),
        revenue3: clean(add(ids, function (x) { return x.revenue3; })),
        gapShare: clean(add(ids, function (x) { return x.gap3; }) / add(ids, function (x) { return x.cv3; })) },
      lookups: { solutions: P.lookups.solutions.map(function (s) { return s.name; }), partnerTypes: P.lookups.partnerTypes.map(function (t) { return t.name; }),
        partnerMaturity: P.lookups.partnerMaturity.map(function (m) { return m.name; }), productCategories: P.lookups.productCategories.map(function (c) { return c.name; }),
        routes: P.lookups.routes.map(function (x) { return x.id; }) },
      sources: sources(plan) },
    r01: { region: C.r01.region, plan3: one(C.r01.region).books3, strategicPlan3: one(C.r01.region).strategicPlan.value3,
      variance3: one(C.r01.region).strategicPlan.variance3, variancePct3: variance[C.r01.region], variancePct: variance },
    r02: { region: C.r02.region, plan3: one(C.r02.region).books3, strategicPlan3: one(C.r02.region).strategicPlan.value3,
      variance3: one(C.r02.region).strategicPlan.variance3, variancePct3: variance[C.r02.region] },
    r03: { regions: withPlan, notIncluded: ids.filter(function (id) { return withPlan.indexOf(id) < 0; }), plans3: clean(plans),
      strategicPlans3: clean(strategic), variance3: clean(plans - strategic), variancePct3: clean((plans - strategic) / strategic) },
    r04: { region: C.r04.region, year1: one(C.r04.region).baseYear.year1, forecast: one(C.r04.region).baseYear.forecast,
      growth: growth[C.r04.region], growthByRegion: growth,
      others: clean(add(withBase.filter(function (x) { return x !== C.r04.region; }), function (x) { return x.baseYear.year1; }) /
        add(withBase.filter(function (x) { return x !== C.r04.region; }), function (x) { return x.baseYear.forecast; }) - 1) },
    r05: { region: C.r05.region, pipeline: one(C.r05.region).baseYear.pipeline, stillToWin: one(C.r05.region).baseYear.stillToWin,
      coverage: coverage[C.r05.region], coverageByRegion: coverage,
      others: others(C.r05.region, withBase, function (x) { return x.baseYear.pipeline; }, function (x) { return x.baseYear.stillToWin; }) },
    r06: { region: C.r06.region, cv3: one(C.r06.region).cv3, booksCv3: one(C.r06.region).booksCv3, gap3: one(C.r06.region).gap3,
      gapShare: gap[C.r06.region], gapShareByRegion: gap,
      others: others(C.r06.region, ids, function (x) { return x.gap3; }, function (x) { return x.cv3; }) },
    r07: { region: C.r07.region, solution: top[C.r07.region].id, share: top[C.r07.region].share, oi: one(C.r07.region).solutions[top[C.r07.region].id].oi,
      topByRegion: top },
    r08: pt,
    r09: { region: C.r09.region, strategicPlan: one(C.r09.region).strategicPlan, withStrategicPlan: withPlan },
    r10: { region: C.r10.region, baseYear: one(C.r10.region).baseYear, withBaseYear: withBase, outsourcingPct: one(C.r10.region).outsourcingPct,
      coverageNotGiven: withBase.filter(function (id) { return !regions[id].baseYear.coverageGiven; }) }
  };
}

// Each Phase 4 planted case, and the add-up rules, as a check. Returns the ones that don't hold.
function check(x) {
  const bad = [], C = P.cases, R = x.p4.regions, ids = Object.keys(R);
  const ok = function (cond, what) { if (!cond) bad.push(what); };
  const near = function (a, b) { return Math.abs(a - b) < 0.051; };
  const v = x.r01.variancePct;
  ok(x.r01.variancePct3 <= C.r01.below && R[C.r01.region].strategicPlan.variancePct.every(function (p) { return p <= C.r01.below; }), 'R01');
  ok(x.r02.variancePct3 >= C.r02.above, 'R02');
  ok(x.r03.variancePct3 >= C.r03.total[0] && x.r03.variancePct3 <= C.r03.total[1] && ids.every(function (id) {
    return id === C.r01.region || id === C.r02.region || v[id] === null || Math.abs(v[id]) <= C.r03.others;
  }), 'R03');
  ok(x.r04.growth >= C.r04.growth && ids.every(function (id) { const g = x.r04.growthByRegion[id]; return id === C.r04.region || g === null || (g > 0 && g < C.r04.others); }), 'R04');
  ok(x.r05.coverage < C.r05.coverage && ids.every(function (id) { const c = x.r05.coverageByRegion[id]; return id === C.r05.region || c === null || c > C.r05.others; }), 'R05');
  ok(x.r06.gapShare >= C.r06.gapShare && ids.every(function (id) { return id === C.r06.region || x.r06.gapShareByRegion[id] < C.r06.others; }), 'R06');
  ok(x.r07.solution === C.r07.solution && x.r07.share >= C.r07.share && ids.every(function (id) { return id === C.r07.region || x.r07.topByRegion[id].share <= C.r07.others; }), 'R07');
  ok(Object.keys(x.r08.maturity).every(function (k) { return x.r08.maturity[k] >= 1; }) && Object.keys(x.r08.types).every(function (k) { return x.r08.types[k] >= 1; }) &&
    x.r08.blanks.type.length === 1 && x.r08.blanks.maturity.length === 1, 'R08');
  ok(x.r09.strategicPlan === null && x.r09.withStrategicPlan.length === ids.length - 1, 'R09');
  ok(x.r10.baseYear === null && x.r10.withBaseYear.length === ids.length - 1 && x.r10.outsourcingPct === null && x.r10.coverageNotGiven.join() === C.r10.noCoverage, 'R10');
  // Adding up: routes equal books value; over ARR and services, books value is never above customer value (equal when direct);
  // revenue is below order intake
  ids.forEach(function (id) {
    const r = R[id];
    ok(near(r.routes3, r.books3), id + ': routes add up to the books value');
    ok(near(r.gapByChannel.direct.gap, 0), id + ': direct books value equals customer value');
    ok(Object.keys(r.gapByChannel).every(function (ch) { return r.gapByChannel[ch].gap > -0.051; }), id + ': books value never above customer value');
    ok(r.revenue.every(function (rev, i) { return rev > 0 && rev < r.cv[i]; }), id + ': revenue below order intake');
    ok(near(sum(Object.keys(r.booksByCategory).map(function (k) { return r.booksByCategory[k]; })), r.books3), id + ': categories add up');
  });
  return bad;
}

function comment(x) {
  const pct = function (p) { return p === null ? 'none' : (p * 100).toFixed(1) + '%'; };
  const f = function (o, fmt) { return Object.keys(o).map(function (k) { return k + ' ' + fmt(o[k]); }).join(', '); };
  return ['R01 ' + x.r01.region + ' plan ' + x.r01.plan3 + ' against a strategic plan of ' + x.r01.strategicPlan3 + ': ' + pct(x.r01.variancePct3),
    'R02 ' + x.r02.region + ' plan ' + x.r02.plan3 + ' against a strategic plan of ' + x.r02.strategicPlan3 + ': ' + pct(x.r02.variancePct3),
    'R03 plans together ' + x.r03.plans3 + ' against strategic plans of ' + x.r03.strategicPlans3 + ': ' + pct(x.r03.variancePct3) +
      ' (' + f(x.r01.variancePct, pct) + ')',
    'R04 ' + x.r04.region + ' year 1 ' + x.r04.year1 + ' against a base-year forecast of ' + x.r04.forecast + ': ' + pct(x.r04.growth) +
      ' (' + f(x.r04.growthByRegion, pct) + ')',
    'R05 ' + x.r05.region + ' pipeline ' + x.r05.pipeline + ' over ' + x.r05.stillToWin + ' still to win: ' + x.r05.coverage +
      ' (' + f(x.r05.coverageByRegion, function (c) { return c === null ? 'none' : c.toFixed(2); }) + ')',
    'R06 ' + x.r06.region + ' books value (ARR and services) ' + x.r06.booksCv3 + ' of customer value ' + x.r06.cv3 + ': ' + pct(x.r06.gapShare) + ' outside the books (' +
      f(x.r06.gapShareByRegion, pct) + ')',
    'R07 ' + x.r07.region + ' ' + x.r07.solution + ' ' + pct(x.r07.share) + ' of new business (' + f(x.r07.topByRegion, function (t) { return t.id + ' ' + pct(t.share); }) + ')',
    'R08 partners by maturity: ' + f(x.r08.maturity, String) + '; by type: ' + f(x.r08.types, String),
    'R09 no strategic plan: ' + x.r09.region + '. R10 no base year: ' + x.r10.region + '; no coverage ratio in the workbook: ' + x.r10.coverageNotGiven.join(', ')];
}

module.exports = { build: build, check: check, comment: comment };
