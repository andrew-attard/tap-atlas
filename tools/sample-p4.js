/*
 * File: tools/sample-p4.js
 * Purpose: Adds the Phase 4 parts to the generated sample data (US-4.1.3): the new lookups and source-map entries,
 *          solutions on New Business rows, partner types and maturity, and per region the revenue outlook, the
 *          value through the books, routes to market, the strategic plan and the base year, with their planted cases.
 * Provides: module.exports = { apply(plan) }
 * Depends on: tools/sample-planted-p4.js (the settings and planted cases), tools/sample-derive.js (rounding)
 * Used by: tools/generate-sample-data.js
 * Owner: DATA4 stream (#438)
 *
 * Runs last and draws no random numbers, so every figure the earlier phases made stays the same. Everything here
 * is worked out from the finished recap, New Business rows and partners, so the new parts add up with them:
 * - books value = customer value (the recap), less the reseller's margin on what partners distribute and less the
 *   services partners deliver themselves; never above customer value; the same as customer value when direct;
 * - the routes split the same books order intake another way, so each year's routes add up to its books value;
 * - revenue is a share of the same year's order intake, so it is never above it.
 */
'use strict';

const P = require('./sample-planted-p4');
const D = require('./sample-derive');

const TYPES = ['arr', 'services', 'swPerpetual', 'hardware'];
const TYPE_OF = { recurring: 'arr', swPerpetual: 'swPerpetual', hardware: 'hardware' };   // a solution's category as an item type
const CATEGORY_ROWS = ['recurring', 'services', 'swPerpetual', 'hardware'];               // base-year rows, in sheet order
const NONE = 'none';
const EXISTING = ['customerSuccess', 'partnerExisting'];   // the routes for existing customers

function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }
function num(v) { return typeof v === 'number' && isFinite(v); }
function col(i) { return String.fromCharCode(P.grid.firstCol.charCodeAt(0) + i); }

// Splits a total over weighted keys in tenths that add up exactly: the largest part takes the rounding.
function spread(total, weights) {
  const keys = Object.keys(weights).filter(function (k) { return weights[k] > 0; });
  const all = sum(keys.map(function (k) { return weights[k]; }));
  const out = {};
  if (!keys.length) { if (total) out[NONE] = total; return out; }
  keys.forEach(function (k) { out[k] = D.r1(total * weights[k] / all); });
  const top = keys.slice().sort(function (a, b) { return weights[b] - weights[a]; })[0];
  out[top] = D.r1(out[top] + total - sum(keys.map(function (k) { return out[k]; })));
  return out;
}

function addLookups(plan) {
  Object.keys(P.lookups).forEach(function (k) { plan.lookups[k] = P.lookups[k]; });
  const map = plan.meta.sourceMap, C = P.columns;
  ['revenue', 'booksValue', 'strategicPlan', 'routes'].forEach(function (k) { map[k] = { sheet: P.sheets.recap }; });
  map.baseYear = { sheet: P.sheets.baseYear, columns: C.baseYear, cells: C.baseYearCells };
  map.newBusiness.columns.solution = C.solution;
  ['type', 'supportPct', 'distribution', 'servicesFromPartners'].forEach(function (k) { map.partners.columns[k] = C[k]; });
  map.partners.cells = { outsourcingPct: C.outsourcingPct };
}

function oi(row) { return row.arrPotential.every(num) ? sum(row.arrPotential) + sum(row.servicesPotential) : null; }

// Hands each New Business row a solution, largest rows first, each to the solution furthest below its target share.
function solutions(r, rs) {
  const ids = P.lookups.solutions.map(function (s) { return s.id; });
  const rows = r.newBusiness.filter(function (x) { return oi(x) !== null; })
    .sort(function (a, b) { return oi(b) - oi(a) || a.sourceRow - b.sourceRow; });
  const total = sum(rows.map(oi)), got = ids.map(function () { return 0; });
  r.newBusiness.forEach(function (x) { x.solution = null; });
  rows.forEach(function (x) {
    let best = 0;
    ids.forEach(function (id, i) { if (rs.solutions[i] * total - got[i] > rs.solutions[best] * total - got[best]) best = i; });
    x.solution = ids[best];
    got[best] += oi(x);
  });
  if (P.unnamedSolution.indexOf(r.id) >= 0) rows[rows.length - 1].solution = null;
}

function partners(r, rs) {
  r.outsourcingPct = rs.outsourcing;
  r.partners.forEach(function (p, i) {
    const type = rs.types[i], level = rs.maturity[i];
    p.type = type;
    p.maturity = level;
    p._share = P.distributes[type || 'si'];
    // Every second partner needs a little more support than its level's usual
    p.supportPct = P.support[level || 'enable'].map(function (v) { return D.r2(v + (i % 2 ? 0.05 : 0)); });
    p.distribution = p.arr.map(function (v) { return D.r1(v * p._share); });
    p.servicesFromPartners = p.services.map(function (v) { return rs.outsourcing === null ? null : D.r1(v * rs.outsourcing); });
  });
}

function recapValue(r, year, channel, motion, type) {
  const it = r.recap.filter(function (x) { return x.year === year && x.channel === channel && x.motion === motion && x.type === type; })[0];
  return it ? it.value : 0;
}

// The revenue outlook: the recap grid on its own sheet, each cell a share of its order intake.
function revenue(r, rs, years) {
  return r.recap.map(function (it) {
    const rate = P.release[it.type][years.indexOf(it.year)] * rs.release;
    return { year: it.year, sourceCell: it.sourceCell, channel: it.channel, motion: it.motion, type: it.type, value: D.r1(it.value * rate) };
  });
}

// Books value by channel and solution for one year of new business: {arr: {solution: v}, services: {solution: v}}.
function booksBySolution(r, rs, y, year, channel) {
  const w = { arr: {}, services: {} };
  r.newBusiness.forEach(function (x) {
    if (!x.arrPotential.every(num)) return;
    const k = x.solution || NONE, share = x.channelSplit[channel];
    w.arr[k] = (w.arr[k] || 0) + x.arrPotential[y] * share;
    w.services[k] = (w.services[k] || 0) + x.servicesPotential[y] * share;
  });
  const mine = channel === 'direct' ? [] : r.partners.filter(function (p) { return p.channel === channel; });
  const cv = { arr: recapValue(r, year, channel, 'newBusiness', 'arr'), services: recapValue(r, year, channel, 'newBusiness', 'services') };
  const margin = D.r1(rs.margin * sum(mine.map(function (p) { return p.distribution[y]; })));
  const delivered = D.r1(sum(mine.map(function (p) { return p.servicesFromPartners[y] || 0; })));
  return { arr: spread(D.r1(cv.arr - Math.min(margin, cv.arr)), w.arr), services: spread(D.r1(cv.services - Math.min(delivered, cv.services)), w.services) };
}

// The share of a channel's partner business that comes from system integrators.
function integratorShare(r, channel) {
  const mine = r.partners.filter(function (p) { return p.channel === channel; });
  const amount = function (list) { return sum(list.map(function (p) { return sum(p.arr) + sum(p.services); })); };
  const all = amount(mine);
  return all ? amount(mine.filter(function (p) { return p.type === 'si'; })) / all : 0;
}

function typeOf(solution) {
  const s = P.lookups.solutions.filter(function (x) { return x.id === solution; })[0];
  return s ? TYPE_OF[s.category] : 'arr';
}

// Books value and routes together, from the same amounts, so they add up to each other.
function booksAndRoutes(r, rs, years) {
  const books = [], routeSum = {}, hasCg = r.customerGrowth.accounts.length > 0, G = P.grid;
  const toRoute = function (route, y, type, solution, v) {
    const k = [route, y, type, solution].join('|');
    routeSum[k] = (routeSum[k] || 0) + v;
  };
  years.forEach(function (year, y) {
    const byType = {};
    D.CHANNELS.forEach(function (ch) {
      const b = booksBySolution(r, rs, y, year, ch), si = ch === 'partner' || ch === 'allianceA' ? integratorShare(r, ch) : 0;
      byType[ch] = { arr: 0, services: 0, swPerpetual: 0, hardware: 0 };
      ['arr', 'services'].forEach(function (kind) {
        Object.keys(b[kind]).forEach(function (sol) {
          const v = b[kind][sol], type = kind === 'services' ? 'services' : typeOf(sol);
          byType[ch][type] += v;
          if (ch === 'direct') toRoute('ownSales', y, type, sol, v);
          else if (ch === 'allianceB') toRoute('allianceBReseller', y, type, sol, v);
          else { const part = D.r1(v * si); toRoute('systemIntegrators', y, type, sol, part); toRoute('otherResellers', y, type, sol, D.r1(v - part)); }
        });
      });
    });
    ['newBusiness', 'customerGrowth'].forEach(function (motion, m) {
      if (motion === 'customerGrowth' && !hasCg) return;
      TYPES.slice(0, motion === 'newBusiness' ? 4 : 2).forEach(function (type, t) {
        D.CHANNELS.forEach(function (ch, c) {
          const v = motion === 'newBusiness' ? byType[ch][type] : recapValue(r, year, ch, motion, type);
          books.push({ year: year, sourceCell: col(c) + (G.booksValue + y * 8 + m * 4 + t), channel: ch, motion: motion, type: type, value: D.r1(v) });
          if (motion === 'customerGrowth' && ch === 'direct') {
            const via = D.r1(v * rs.viaPartners);
            toRoute('partnerExisting', y, type, NONE, via);
            toRoute('customerSuccess', y, type, NONE, D.r1(v - via));
          }
        });
      });
    });
  });
  r.booksValue = books;
  // One route item per year, type and solution that has a value; a route with nothing in a year shows one zero.
  // A region with no Customer Growth section has no items for the two existing-customer routes: not provided, as in its recap.
  const sols = [NONE].concat(P.lookups.solutions.map(function (s) { return s.id; }));
  r.routes = [];
  P.lookups.routes.forEach(function (route, ri) {
    if (!hasCg && EXISTING.indexOf(route.id) >= 0) return;
    years.forEach(function (year, y) {
      const before = r.routes.length;
      sols.forEach(function (sol, si) {
        TYPES.forEach(function (type, t) {
          const v = D.r1(routeSum[[route.id, y, type, sol].join('|')] || 0);
          if (v) r.routes.push({ route: route.id, year: year, sourceCell: col(y * 4 + t) + (G.routes + ri * 8 + si), type: type, value: v, solution: sol === NONE ? null : sol });
        });
      });
      if (r.routes.length === before) r.routes.push({ route: route.id, year: year, sourceCell: col(y * 4) + (G.routes + ri * 8), type: 'arr', value: 0, solution: null });
    });
  });
}

function booked(r, year, type) {
  return sum(r.booksValue.filter(function (x) { return x.year === year && x.type === type; }).map(function (x) { return x.value; }));
}

// The strategic plan: the plan's books order intake, moved by the region's planted distance from it.
function strategicPlan(r, rs, years) {
  if (rs.plan === null) return;
  r.strategicPlan = [];
  years.forEach(function (year, y) {
    TYPES.forEach(function (type, t) {
      const plan = booked(r, year, type), value = Math.round(plan / (1 + rs.plan) * P.categoryMix.strategicPlan[type]);
      r.strategicPlan.push({ year: year, sourceCell: col(y) + (P.grid.strategicPlan + t), type: type, value: value, variance: D.r1(plan - value) });
    });
  });
}

// The base year: a forecast that plan year 1 grows from, with budget, actuals so far, pipeline and coverage.
function baseYear(r, rs, years) {
  if (rs.base === null) return;
  const B = rs.base, M = P.categoryMix;
  r.baseYear = { year: P.baseYear, actualsThrough: P.actualsThrough, items: CATEGORY_ROWS.map(function (cat, i) {
    const y1 = booked(r, years[0], cat === 'recurring' ? 'arr' : cat);
    const forecast = Math.round(y1 / (1 + B.growth) * M.forecast[cat]), actuals = Math.round(forecast * B.actuals);
    const pipeline = Math.round((forecast - actuals) * B.coverage * M.coverage[cat]);
    return { sourceRow: P.grid.baseYear + i, category: cat, budget: Math.round(forecast * B.budget), forecast: forecast, actuals: actuals,
      pipeline: pipeline, coverage: B.given && forecast > actuals ? D.r2(pipeline / (forecast - actuals)) : null };
  }) };
}

function apply(plan) {
  addLookups(plan);
  const years = plan.meta.years;
  plan.regions.forEach(function (r) {
    const rs = P.regions[r.id];
    if (!rs) throw new Error('sample-planted-p4.js has no settings for region ' + r.id);
    if (rs.types.length !== r.partners.length || rs.maturity.length !== r.partners.length) throw new Error('sample-planted-p4.js: one type and maturity per partner for ' + r.id);
    solutions(r, rs);
    partners(r, rs);
    r.revenue = revenue(r, rs, years);
    booksAndRoutes(r, rs, years);
    strategicPlan(r, rs, years);
    baseYear(r, rs, years);
  });
  return plan;
}

module.exports = { apply: apply };
