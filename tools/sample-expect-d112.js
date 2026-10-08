/*
 * File: tools/sample-expect-d112.js
 * Purpose: Works out every figure the D112 cases rely on (docs/PLANTED-CASES.md, S01 to S04) from the finished sample
 *          data, and checks each case holds, so the generator refuses to write a file where one doesn't. The figures
 *          go to tests/fixtures/sample-expected.js for the tests.
 * Provides: module.exports ({build, check, comment})
 * Depends on: tools/sample-planted-d112.js
 * Used by: tools/generate-sample-data.js
 *
 * Worked out from the raw rows here, never by the app's code. "The others" is the other regions' combined figure:
 * their summed parts over their summed totals (D69).
 */
'use strict';

const S = require('./sample-planted-d112');

function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }
function num(v) { return typeof v === 'number' && isFinite(v); }
function clean(x) { return num(x) ? Number(x.toFixed(6)) : x; }
function rated(plan) { return plan.lookups.industries.filter(function (d) { return d.rated; }); }
function mc(r, id) { return r.marketCoverage.filter(function (m) { return m.industryId === id; })[0] || null; }
// New Business ARR for one industry (or all), in one plan year (0, 1, 2) or over three years (null); rows with a blank skipped
function nbArr(r, industryId, y) {
  const rows = r.newBusiness.filter(function (x) { return (!industryId || x.industryId === industryId) && x.arrPotential.every(num); });
  return sum(rows.map(function (x) { return y == null ? sum(x.arrPotential) : x.arrPotential[y]; }));
}

// S01: every Tier 1 or 2 industry with a year-1 goal of at least the floor, and its variant when it fires
function industryCover(plan) {
  const C = S.industryCover, out = [];
  plan.regions.forEach(function (r) {
    rated(plan).forEach(function (d) {
      const m = mc(r, d.id), goal = nbArr(r, d.id, 0);
      if (!m || (m.tier !== 1 && m.tier !== 2) || goal < C.minGoal || !num(m.pipelineTotal)) return;
      const p12 = m.pipelineCreated12m;
      const variant = m.pipelineTotal === 0 ? 'none' : goal > m.pipelineTotal ? 'above' :
        num(p12) && p12 > 0 && goal / p12 >= C.ratio ? 'created' : null;
      if (variant) out.push({ key: r.id + ':' + d.id, region: r.id, industry: d.id, variant: variant, goal: clean(goal),
        pipeline: m.pipelineTotal, pipeline12m: p12, ratio: clean(variant === 'created' ? goal / p12 : variant === 'above' ? goal / m.pipelineTotal : null) });
    });
  });
  const pick = function (c) { return out.filter(function (x) { return x.region === c.region && x.industry === c.industry; })[0] || null; };
  return { minGoal: C.minGoal, ratio: C.ratio, fired: out, case: pick(C.case), none: pick(C.none),
    byVariant: ['none', 'above', 'created'].reduce(function (o, v) { o[v] = out.filter(function (x) { return x.variant === v; }).length; return o; }, {}) };
}

// S02: per industry, the regions placing it in Tier 1 or 2 and its share of their three-year new business ARR
function priorityVsPlan(plan) {
  const P = S.priorityVsPlan, all = [];
  rated(plan).forEach(function (d) {
    const given = plan.regions.filter(function (r) { const m = mc(r, d.id); return m && [1, 2, 3].indexOf(m.tier) >= 0; });
    const hi = given.filter(function (r) { return mc(r, d.id).tier <= 2; });
    if (!d.groupPriority && hi.length < Math.ceil(P.share * given.length - 1e-9)) return;
    const amount = sum(hi.map(function (r) { return nbArr(r, d.id, null); })), total = sum(hi.map(function (r) { return nbArr(r, null, null); }));
    all.push({ industry: d.id, regions: hi.map(function (r) { return r.id; }), given: given.length, amount: clean(amount), plan: clean(total), share: clean(amount / total) });
  });
  return { maxShare: P.maxShare, candidates: all, fired: all.filter(function (x) { return x.share < P.maxShare; }) };
}

// S03: services order intake (the recap, both motions) in years 1 and 3, and the services partners deliver in year 3
function servicesDelivery(plan) {
  const G = S.servicesDelivery, years = plan.meta.years, out = {};
  const services = function (r, year) { return sum(r.recap.filter(function (x) { return x.type === 'services' && x.year === year; }).map(function (x) { return x.value; })); };
  plan.regions.forEach(function (r) {
    const given = r.partners.filter(function (p) { return Array.isArray(p.servicesFromPartners) && num(p.servicesFromPartners[2]); });
    const y1 = services(r, years[0]), y3 = services(r, years[2]), delivered = given.length ? sum(given.map(function (p) { return p.servicesFromPartners[2]; })) : null;
    out[r.id] = { y1: clean(y1), y3: clean(y3), growth: clean(y3 / y1 - 1), delivered: clean(delivered), share: delivered === null ? null : clean(delivered / y3),
      partners: given.length };
  });
  return { region: G.region, minGrowth: G.minGrowth, maxPartnerShare: G.maxPartnerShare, regions: out,
    fired: Object.keys(out).filter(function (id) { const x = out[id]; return x.share !== null && x.growth >= G.minGrowth && x.share < G.maxPartnerShare; }) };
}

// S04: year-1 order intake through every partner channel (the recap) per partner salesperson, against the others together
function partnerLoad(plan) {
  const L = S.partnerLoad, y = plan.meta.years[0], out = {};
  const oi = function (r) { return sum(r.recap.filter(function (x) { return x.year === y && x.channel !== 'direct'; }).map(function (x) { return x.value; })); };
  const fte = function (r) { return sum(r.partners.map(function (p) { return p.fteSales; }).filter(num)); };
  const given = plan.regions.filter(function (r) { return oi(r) > 0 && fte(r) > 0; });
  given.forEach(function (r) {
    const rest = given.filter(function (o) { return o !== r; });
    const others = sum(rest.map(oi)) / sum(rest.map(fte));
    out[r.id] = { oi: clean(oi(r)), fteSales: fte(r), perPerson: clean(oi(r) / fte(r)), others: clean(others), ratio: clean(oi(r) / fte(r) / others) };
  });
  return { region: L.region, ratio: L.ratio, regions: out, fired: Object.keys(out).filter(function (id) { return out[id].ratio >= L.ratio - 1e-9; }) };
}

function build(plan) {
  return { s01: industryCover(plan), s02: priorityVsPlan(plan), s03: servicesDelivery(plan), s04: partnerLoad(plan) };
}

// Each case, clearly past its threshold, and only where planted. Returns the cases that don't hold.
function check(x) {
  const bad = [];
  const ok = function (cond, what) { if (!cond) bad.push(what); };
  const c = x.s01.case, n = x.s01.none;
  ok(c && c.variant === 'created' && c.ratio >= 2 * S.industryCover.ratio && n && n.variant === 'none', 'S01');
  const s02 = x.s02.fired;
  ok(s02.length === 1 && s02[0].industry === S.priorityVsPlan.industry && s02[0].share < 0.8 * S.priorityVsPlan.maxShare, 'S02');
  const s03 = x.s03.regions[S.servicesDelivery.region];
  ok(x.s03.fired.join() === S.servicesDelivery.region && s03.growth >= S.servicesDelivery.minGrowth + 0.05 &&
    s03.share < S.servicesDelivery.maxPartnerShare / 2, 'S03');
  const s04 = x.s04.regions[S.partnerLoad.region];
  ok(x.s04.fired.join() === S.partnerLoad.region && s04.ratio >= S.partnerLoad.ratio + 0.25 &&
    Object.keys(x.s04.regions).every(function (id) { return id === S.partnerLoad.region || x.s04.regions[id].ratio < 1.75; }), 'S04');
  return bad;
}

function comment(x) {
  const pct = function (v) { return (v * 100).toFixed(1) + '%'; };
  const c = x.s01.case, p = x.s02.fired[0] || {}, g = x.s03.regions[x.s03.region], l = x.s04.regions[x.s04.region];
  return ['S01 industryCover fires ' + x.s01.fired.length + ' times (none ' + x.s01.byVariant.none + ', above ' + x.s01.byVariant.above +
      ', created ' + x.s01.byVariant.created + '); ' + c.region + ' ' + c.industry + ' goal ' + c.goal + ' is ' + c.ratio.toFixed(1) + 'x ' + c.pipeline12m,
    'S02 ' + p.industry + ' Tier 1 or 2 in ' + p.regions.length + ' of ' + p.given + ', ' + pct(p.share) + ' of their new business (' + p.amount + ' of ' + p.plan + ')',
    'S03 ' + x.s03.region + ' services ' + g.y1 + ' to ' + g.y3 + ' (+' + pct(g.growth) + '), partners deliver ' + g.delivered + ' (' + pct(g.share) + ')',
    'S04 ' + x.s04.region + ' ' + l.oi + ' through partners over ' + l.fteSales + ' partner sales staff, ' + l.perPerson.toFixed(1) + ' each, ' +
      l.ratio.toFixed(2) + 'x the others (' + l.others.toFixed(1) + ')'];
}

module.exports = { build: build, check: check, comment: comment };
