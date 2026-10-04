/*
 * File: tools/sample-expect-p2.js
 * Purpose: Works out every figure the Phase 2 planted cases rely on (docs/PLANTED-CASES.md, Q01 to Q06) from the
 *          finished sample data, and checks each case holds, so the generator refuses to write a file where one
 *          doesn't. The figures go to tests/fixtures/sample-expected.js for the tests.
 * Provides: module.exports ({build, check, comment})
 * Depends on: tools/sample-planted-p2.js, config/comment-themes.js (the theme keywords, read as data)
 * Used by: tools/generate-sample-data.js
 *
 * Worked out from the raw rows here, never by the app's code. "The others" is the other regions' combined figure:
 * their summed parts divided by their summed totals (D69).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Q = require('./sample-planted-p2');

const CHANNELS = ['direct', 'partner', 'allianceA', 'allianceB'];
function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }
function num(v) { return typeof v === 'number' && isFinite(v); }
function clean(x) { return num(x) ? Number(x.toFixed(6)) : x; }
function key(text) { return String(text).trim().toLowerCase().replace(/\s+/g, ' '); }

function themesConfig() {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'config', 'comment-themes.js'), 'utf8'), box);
  return box.window.TAP_COMMENT_THEMES;
}
function mentions(text, keyword) {
  const esc = keyword.trim().split(/\s+/).map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('\\s+');
  return new RegExp('(^|[^A-Za-z0-9])' + esc + '($|[^A-Za-z0-9])', 'i').test(text);
}

// Each region's share of total order intake (both motions, ARR and services) by channel, and the others' combined share.
function channels(plan) {
  const amount = function (r, ch) { return sum(r.recap.filter(function (x) { return !ch || x.channel === ch; }).map(function (x) { return x.value; })); };
  const out = {};
  plan.regions.forEach(function (r) {
    const rest = plan.regions.filter(function (o) { return o.id !== r.id && o.recap.length; });
    out[r.id] = {};
    CHANNELS.forEach(function (ch) {
      const others = sum(rest.map(function (o) { return amount(o, ch); })) / sum(rest.map(function (o) { return amount(o); }));
      const share = amount(r, ch) / amount(r);
      out[r.id][ch] = { share: clean(share), others: clean(others), gap: clean(share - others) };
    });
  });
  return out;
}

function nbArr(r) { return sum(r.newBusiness.filter(function (x) { return x.arrPotential.every(num); }).map(function (x) { return sum(x.arrPotential); })); }
function cgArr(r) { return r.customerGrowth.accounts.length ? sum(r.customerGrowth.accounts.map(function (a) { return sum(a.incrementalArr); })) : null; }

function makeup(plan) {
  const both = plan.regions.filter(function (r) { return cgArr(r) !== null && r.newBusiness.length; });
  const out = {};
  plan.regions.forEach(function (r) {
    if (both.indexOf(r) < 0) { out[r.id] = null; return; }
    const rest = both.filter(function (o) { return o !== r; });
    const others = sum(rest.map(nbArr)) / sum(rest.map(function (o) { return nbArr(o) + cgArr(o); }));
    const share = nbArr(r) / (nbArr(r) + cgArr(r));
    out[r.id] = { share: clean(share), others: clean(others), gap: clean(share - others), nb: clean(nbArr(r)), cg: clean(cgArr(r)) };
  });
  return out;
}

// Names given by more than one region, matched on trimmed, lower-case text with spaces collapsed.
function shared(plan, listOf, nameOf) {
  const by = {};
  plan.regions.forEach(function (r) {
    listOf(r).forEach(function (item) {
      const k = key(nameOf(item));
      const e = by[k] = by[k] || { key: k, names: [], regions: [], rows: [] };
      if (e.names.indexOf(nameOf(item)) < 0) e.names.push(nameOf(item));
      if (e.regions.indexOf(r.id) < 0) e.regions.push(r.id);
      e.rows.push([r.id, item.sourceRow]);
    });
  });
  return Object.keys(by).map(function (k) { return by[k]; }).filter(function (e) { return e.regions.length > 1; });
}

function partners(plan) {
  const all = [];
  plan.regions.forEach(function (r) {
    r.partners.forEach(function (p) {
      const fte = sum([p.fteSales, p.fteConsultants].filter(num));
      const oi = sum(p.arr.concat(p.services).filter(num));
      if (fte > 0) all.push({ region: r.id, row: p.sourceRow, name: p.name, oi: clean(oi), fte: fte, perFte: clean(oi / fte) });
    });
  });
  const avg = sum(all.map(function (x) { return x.oi; })) / sum(all.map(function (x) { return x.fte; }));
  all.forEach(function (x) { x.multiple = clean(x.perFte / avg); });
  return { withFte: all.length, average: clean(avg), flagged: all.filter(function (x) { return x.multiple >= Q.partnerCapacity.minMultiple; }) };
}

function themes(plan) {
  const cfg = themesConfig();
  return { minRegions: cfg.minRegions, themes: cfg.themes.map(function (t) {
    const regions = plan.regions.filter(function (r) {
      const texts = r.marketCoverage.map(function (m) { return m.commentary; }).concat(r.newBusiness.map(function (x) { return x.successFactors; }));
      return texts.some(function (s) { return s && t.keywords.some(function (k) { return mentions(s, k); }); });
    }).map(function (r) { return r.id; });
    return { id: t.id, label: t.label, regions: regions, n: regions.length };
  }).sort(function (a, b) { return b.n - a.n; }) };
}

function build(plan) {
  const ch = channels(plan), mk = makeup(plan);
  const C = Q.channelReliance, M = Q.planMakeup;
  // One finding per region: the channel furthest from the others, when that gap reaches the threshold.
  const flaggedChannels = plan.regions.map(function (r) {
    const best = CHANNELS.slice().sort(function (a, b) { return Math.abs(ch[r.id][b].gap) - Math.abs(ch[r.id][a].gap); })[0];
    return Math.abs(ch[r.id][best].gap) >= C.gap - 1e-9 ? { region: r.id, channel: best } : null;
  }).filter(Boolean);
  return {
    q01: { region: C.region, channel: C.channel, share: ch[C.region][C.channel].share, others: ch[C.region][C.channel].others,
      shares: ch, flagged: flaggedChannels },
    q02: { region: M.region, share: mk[M.region].share, others: mk[M.region].others, shares: mk,
      flagged: Object.keys(mk).filter(function (id) { return mk[id] && Math.abs(mk[id].gap) >= M.gap - 1e-9; }) },
    q03: { shared: shared(plan, function (r) { return r.newBusiness; }, function (x) { return x.subVertical; }) },
    q04: { shared: shared(plan, function (r) { return r.partners; }, function (p) { return p.name; }) },
    q05: partners(plan),
    q06: themes(plan)
  };
}

// Each Phase 2 planted case, as a check. Returns the cases that don't hold.
function check(x) {
  const bad = [];
  const ok = function (cond, what) { if (!cond) bad.push(what); };
  const S = Q.sharedSubIndustry;
  ok(x.q01.flagged.length === 1 && x.q01.flagged[0].region === Q.channelReliance.region && x.q01.flagged[0].channel === Q.channelReliance.channel, 'Q01');
  ok(x.q02.flagged.join() === Q.planMakeup.region && x.q02.shares.ceu === null, 'Q02');
  ok(x.q03.shared.length === 1 && x.q03.shared[0].regions.join() === Object.keys(S.names).join() && x.q03.shared[0].names.length === 2, 'Q03');
  ok(x.q04.shared.length === 1 && x.q04.shared[0].regions.join() === Q.sharedPartner.from + ',' + Q.sharedPartner.to, 'Q04');
  ok(x.q05.withFte >= 5 && x.q05.flagged.length === 1 && x.q05.flagged[0].region === Q.partnerCapacity.region &&
    Math.abs(x.q05.flagged[0].multiple - Q.partnerCapacity.multiple) < 0.25, 'Q05');
  const recurring = x.q06.themes.filter(function (t) { return t.n >= x.q06.minRegions; });
  const below = x.q06.themes.filter(function (t) { return t.id === Q.themes.below.id; })[0];
  ok(x.q06.themes.length >= 6 && recurring.length >= Q.themes.recurring && below && below.regions.join() === Q.themes.below.regions.join(), 'Q06');
  return bad;
}

function comment(x) {
  const pct = function (v) { return (v * 100).toFixed(1) + '%'; };
  const f = x.q05.flagged[0] || {};
  return ['Q01 ' + x.q01.region + ' ' + x.q01.channel + ' share ' + pct(x.q01.share) + ' (others ' + pct(x.q01.others) + ')',
    'Q02 ' + x.q02.region + ' new business share of ARR ambition ' + pct(x.q02.share) + ' (others ' + pct(x.q02.others) + ')',
    'Q03 shared sub-industry: ' + x.q03.shared.map(function (e) { return e.names.join(' / ') + ' [' + e.regions.join(', ') + ']'; }).join('; '),
    'Q04 shared partner: ' + x.q04.shared.map(function (e) { return e.names.join(' / ') + ' [' + e.regions.join(', ') + ']'; }).join('; '),
    'Q05 ' + f.name + ' (' + f.region + ') ' + f.perFte + ' per FTE, ' + f.multiple + 'x the average of ' + x.q05.average,
    'Q06 themes by regions: ' + x.q06.themes.map(function (t) { return t.id + ' ' + t.n; }).join(', ')];
}

module.exports = { build: build, check: check, comment: comment };
