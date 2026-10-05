/*
 * File: js/core/check-rows.js
 * Purpose: The contract check for each region (docs/DATA-CONTRACT.md): its fields, source, and the rows of its
 *          Market Coverage, New Business, Customer Growth, Partner and Recap sections, with the template's rules.
 * Provides: TAP.checkRows (region)
 * Depends on: js/core/check.js (TAP.check.kit), js/core/content.js and content/text-data.js (all at call time)
 * Used by: js/core/check.js (run)
 */
(function (TAP) {
  'use strict';

  // The shared helpers from js/core/check.js, read at call time
  function K() { return TAP.check.kit; }
  function say() { return K().say.apply(null, arguments); }
  function has() { return K().has.apply(null, arguments); }
  function map() { return K().map.apply(null, arguments); }
  function isObj() { return K().isObj.apply(null, arguments); }
  function isNum() { return K().isNum.apply(null, arguments); }
  function isStr() { return K().isStr.apply(null, arguments); }
  function round2() { return K().round2.apply(null, arguments); }
  function at() { return K().at.apply(null, arguments); }
  function sub() { return K().sub.apply(null, arguments); }
  function rootCtx() { return K().rootCtx.apply(null, arguments); }
  function err() { return K().err.apply(null, arguments); }
  function warn() { return K().warn.apply(null, arguments); }
  function fields() { return K().fields.apply(null, arguments); }
  function each() { return K().each.apply(null, arguments); }
  function expectFor() { return K().expectFor.apply(null, arguments); }
  function TYPES() { return K().TYPES; }
  function SPEC() { return K().SPEC; }
  function RATINGS() { return K().RATINGS; }
  function CHANNELS() { return K().CHANNELS; }

  function itemName(section, o, env) {
    var name;
    if (section === 'marketCoverage' || section === 'newBusiness') {
      var ind = has(env.industries, o.industryId) ? env.industries[o.industryId] : null;
      name = ind && isStr(ind.name) ? ind.name : String(o.industryId);
    } else if (section === 'recap') {
      return isStr(o.sourceCell) ? say('item.cell', { cell: o.sourceCell }) : null;
    } else {
      name = isStr(o.name) && o.name ? o.name : String(o.id);
    }
    return isNum(o.sourceRow) ? say('item.row', { name: name, row: o.sourceRow }) : name;
  }

  // Fields held as decimals (0.25 for 25%), and counts, per section: a share above 1.5 is most likely a whole-number
  // percentage, and a negative count a slip (review DE-12). Both only warn.
  var SHARES = { newBusiness: ['hitRate', 'servicesRatio', 'growth.year2', 'growth.year3'], accounts: ['servicesRatio', 'growthPct'],
    partners: ['centralSupportPct'] };
  var COUNTS = { newBusiness: ['targetAccounts'], partners: ['fteSales', 'fteConsultants'] };
  function figures(key, o, c) {
    (SHARES[key] || []).forEach(function (f) {
      var path = f.split('.'), v = path.length > 1 ? (isObj(o[path[0]]) ? o[path[0]][path[1]] : null) : o[f];
      if (Array.isArray(v)) v.forEach(function (x, i) { if (isNum(x) && Math.abs(x) > 1.5) warn(sub(c, f), i, say('expect.share'), x); });
      else if (isNum(v) && Math.abs(v) > 1.5) warn(c, f, say('expect.share'), v);
    });
    (COUNTS[key] || []).forEach(function (f) { if (isNum(o[f]) && o[f] < 0) warn(c, f, say('expect.notNegative'), o[f]); });
  }
  // A recap item repeats when another has the same year, channel, motion and type: both would be added up.
  function recapKey(o) { return [o.year, o.channel, o.motion, o.type].join('|'); }

  function checkSection(r, key, rctx, env, extra) {
    var name = key === 'accounts' ? 'customerGrowth.accounts' : key, lctx = sub(rctx, name), seen = map(), rows = map();
    var list = key === 'accounts' ? r.customerGrowth.accounts : r[key];
    if (!Array.isArray(list)) return;
    if (!list.length) warn(rctx, name, say('expect.items'), say('found.emptyList'), true);
    each(list, lctx, env, function (o, i) {
      var c = sub(lctx, i, itemName(key, o, env));
      fields(o, SPEC()[key], c, env);
      figures(key, o, c);
      if (key === 'recap') {
        if (!isStr(o.sourceCell)) warn(c, 'sourceCell', say('expect.sourceCell'), o.sourceCell);
        if (seen[recapKey(o)]) warn(c, null, say('expect.uniqueRecap'), say('found.repeatRecap'), true);
        seen[recapKey(o)] = true;
      } else if (o.sourceRow === undefined || !(isNum(o.sourceRow) && o.sourceRow % 1 === 0)) {
        warn(c, 'sourceRow', say('expect.sourceRow'), o.sourceRow);
      } else if (rows[o.sourceRow]) {
        warn(c, 'sourceRow', say('expect.uniqueRow'), o.sourceRow);   // lists tell rows apart by their number
      }
      if (key !== 'recap' && isNum(o.sourceRow)) rows[o.sourceRow] = true;
      var id = key === 'accounts' ? o.id : key === 'marketCoverage' ? o.industryId : null;
      if (id != null && seen[id]) err(c, key === 'accounts' ? 'id' : 'industryId', say(key === 'accounts' ? 'expect.uniqueId' : 'expect.uniqueIndustry'), id);
      seen[id] = true;
      if (extra) extra(o, c);
    });
  }

  function checkMarketRow(o, c, env, tiers) {
    if (!has(env.industries, o.industryId)) return;
    tiers[o.industryId] = o.tier;
    if (env.industries[o.industryId].rated !== false) return;
    RATINGS().forEach(function (k) { if (o[k] != null) warn(c, k, say('expect.unrated'), o[k]); });
  }

  function checkNewBusinessRow(o, c, env, tiers) {
    if (isObj(o.channelSplit)) {
      var sctx = sub(c, 'channelSplit'), sum = 0, any = false;
      CHANNELS().forEach(function (k) { if (!has(o.channelSplit, k)) err(sctx, k, expectFor('num', true, env), undefined); });
      Object.keys(o.channelSplit).forEach(function (k) {
        var v = o.channelSplit[k];
        if (!has(env.channels, k)) err(sctx, k, say('expect.channelKey'), k, true);
        else if (v !== null && !isNum(v)) err(sctx, k, expectFor('num', true, env), v);
        else if (isNum(v)) { sum += v; any = true; }
      });
      if (any && Math.abs(sum - 1) > 0.01) warn(c, 'channelSplit', say('expect.splitSum'), Math.round(sum * 1000) / 10 + '%', true);
    }
    if (isObj(o.growth)) fields(o.growth, SPEC().growth, sub(c, 'growth'), env);
    if (!tiers) return arrFormula(o, c);
    if (has(tiers, o.industryId) || !has(env.industries, o.industryId)) {
      var mc = tiers[o.industryId];
      if ((o.tier === 1 || o.tier === 2) && TYPES().tier.ok(mc) && o.tier !== mc) err(c, 'tier', say('expect.mcTier', { tier: mc }), o.tier);
    } else {
      err(c, 'industryId', say('expect.mcRow'), o.industryId);
    }
    arrFormula(o, c);
  }

  function arrFormula(o, c) {
    var a = Array.isArray(o.arrPotential) ? o.arrPotential[0] : null, want = o.targetAccounts * o.hitRate * o.avgDealSize;
    if (![o.targetAccounts, o.hitRate, o.avgDealSize, a].every(isNum) || Math.abs(a - want) <= Math.max(0.5, Math.abs(want) * 0.005)) return;
    warn(c, 'arrPotential[0]', say('expect.arrFormula', { value: round2(want) }), a);
  }

  // The template's segment rule (Planning Template Structure, section 3), or null if it can't be decided.
  function segmentFor(acc, t) {
    if (!isObj(t) || ![acc.currentArr, t.strategicArr, t.scaledArr, t.growthArr, t.growthOrderIntake].every(isNum)) return null;
    if (acc.currentArr > t.strategicArr) return 'strategic';
    if (acc.currentArr < t.scaledArr) return 'scaled';
    if (!isNum(acc.cumulativeOrderIntake)) return null;
    return acc.cumulativeOrderIntake > t.growthOrderIntake && acc.currentArr > t.growthArr ? 'growth' : 'core';
  }

  function checkRegion(r, i, out, env, ids) {
    var root = sub(rootCtx(out), 'regions');
    if (!isObj(r)) { err(root, i, say('expect.region'), r); return; }
    var rctx = { path: at(root, i), region: isStr(r.name) ? r.name : isStr(r.id) ? r.id : null, item: null, out: out };
    fields(r, SPEC().region, rctx, env);
    if (isStr(r.id) && ids[r.id]) err(rctx, 'id', say('expect.uniqueRegion'), r.id);
    // The combined figures use these ids (js/engine/scope.js), so a region with one would share it
    if (r.id === 'rest' || r.id === 'org') err(rctx, 'id', say('expect.keptRegionId'), r.id);
    ids[r.id] = true;
    var nctx = sub(rctx, 'source.notes');
    if (isObj(r.source)) fields(r.source, SPEC().source, sub(rctx, 'source'), env);
    if (isObj(r.source)) ['fileModified', 'importedAt'].forEach(function (k) { K().dateField(r.source, k, sub(rctx, 'source')); });
    if (isObj(r.source)) each(r.source.notes, nctx, env, function (n, k) { fields(n, SPEC().note, sub(nctx, k), env); });
    var tiers = Array.isArray(r.marketCoverage) ? map() : null;
    checkSection(r, 'marketCoverage', rctx, env, function (o, c) { checkMarketRow(o, c, env, tiers); });
    checkSection(r, 'newBusiness', rctx, env, function (o, c) { checkNewBusinessRow(o, c, env, tiers); });
    checkSection(r, 'partners', rctx, env);
    checkSection(r, 'recap', rctx, env);
    if (isObj(r.customerGrowth)) {
      var cg = r.customerGrowth;
      fields(cg, SPEC().customerGrowth, sub(rctx, 'customerGrowth'), env);
      if (isObj(cg.thresholds)) fields(cg.thresholds, SPEC().thresholds, sub(rctx, 'customerGrowth.thresholds'), env);
      checkSection(r, 'accounts', rctx, env, function (acc, c) {
        var want = segmentFor(acc, cg.thresholds);
        if (want && acc.segment !== want) warn(c, 'segment', say('expect.segmentRule', { segment: JSON.stringify(want) }), acc.segment);
      });
    }
  }

  TAP.checkRows = { region: checkRegion };
})(window.TAP);
