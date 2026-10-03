/*
 * File: js/core/check.js
 * Purpose: Checks the plan data file against the Data Contract (docs/DATA-CONTRACT.md) and lists anything wrong in plain words.
 * Provides: TAP.check (run)
 * Depends on: js/core/namespace.js, js/core/content.js and content/text-data.js (message wording)
 * Used by: js/core/data.js (on load)
 *
 * run(plan) returns {errors, warnings}. Each item is {path, region, item, expected, found, message}.
 * Errors would break views, so loading stops. Warnings load anyway and go to the data sources panel.
 * null (a blank, "not provided") is allowed for every leader input and system figure.
 * Fields and sections the contract doesn't name are ignored, so imports can add them early (D47).
 */
(function (TAP) {
  'use strict';

  var MAX_ERRORS = 200;
  var RATINGS = ['growthPotential', 'criticality', 'competitiveIntensity', 'references', 'expertise', 'productFit'];
  var CHANNELS = ['direct', 'partner', 'allianceA', 'allianceB'], SEGMENTS = ['strategic', 'growth', 'core', 'scaled'];
  var MAP_SECTIONS = ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners', 'recap'];

  function say(key, vars) { return TAP.content.text('check.' + key, vars); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  // Maps keyed by ids from the file: no prototype, so ids like "constructor" or "__proto__" are plain keys
  function map() { return Object.create(null); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function isStr(v) { return typeof v === 'string'; }
  function round2(x) { return Math.round(x * 100) / 100; }

  function orList(list, quote) {
    var items = list.map(function (x) { return quote ? JSON.stringify(x) : String(x); });
    return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + say('or') + items[items.length - 1];
  }

  function oneOf(list, quote) { return { ok: function (v) { return list.indexOf(v) !== -1; }, expect: function () { return orList(list, quote); } }; }
  function plain(ok, key) { return { ok: ok, plain: true, expect: function () { return say('expect.' + key); } }; }
  // An id that must exist in a lookup list
  function ref(envKey, key) { return { ok: function (v, env) { return isStr(v) && has(env[envKey], v); }, expect: plain(0, key).expect }; }

  // Value types used in the field specs below. A trailing "?" on a spec allows null (a blank).
  var TYPES = {
    str: plain(isStr, 'text'),
    num: plain(isNum, 'number'),
    bool: plain(function (v) { return typeof v === 'boolean'; }, 'bool'),
    list: plain(Array.isArray, 'list'),
    obj: plain(isObj, 'object'),
    years3: plain(function (v) { return Array.isArray(v) && v.length === 3; }, 'years3'),
    rating: oneOf([1, 2, 3]),
    tier: oneOf([1, 2, 3]),
    nbTier: oneOf([1, 2]),
    risk: oneOf(['high', 'medium'], true),
    segment: oneOf(SEGMENTS, true),
    channelId: oneOf(CHANNELS, true),
    partnerChannel: oneOf(['partner', 'allianceA', 'allianceB'], true),
    motion: oneOf(['newBusiness', 'customerGrowth'], true),
    recapType: oneOf(['arr', 'services'], true),
    industry: ref('industries', 'industry'),
    productLine: ref('productLines', 'productLine'),
    channel: ref('channels', 'channelKey'),
    // Skipped (always ok) when meta.years is broken: that error is reported once, not once per recap row
    year: { ok: function (v, env) { return !env.years.length || env.years.indexOf(v) !== -1; }, expect: function (env) { return orList(env.years); } }
  };

  var SPEC = {
    industryLookup: { id: 'str', name: 'str', productLine: 'productLine?', groupPriority: 'bool', rated: 'bool' },
    named: { id: 'str', name: 'str' },
    channelLookup: { id: 'channelId', name: 'str' },
    tierLookup: { id: 'tier', name: 'str' },
    segmentLookup: { id: 'segment', name: 'str' },
    level: { score: 'rating', label: 'str' },
    meta: { schemaVersion: 'str', generatedAt: 'str', templateVersion: 'str?', currency: 'str', isSample: 'bool' },
    region: { id: 'str', name: 'str', source: 'obj', marketCoverage: 'list', newBusiness: 'list', customerGrowth: 'obj', partners: 'list', recap: 'list' },
    source: { fileName: 'str', fileModified: 'str?', importedAt: 'str?', notes: 'list' },
    note: { message: 'str', sheet: 'str?', cell: 'str?' },
    marketCoverage: { industryId: 'industry', growthPotential: 'rating?', criticality: 'rating?', competitiveIntensity: 'rating?',
      references: 'rating?', expertise: 'rating?', productFit: 'rating?', currentArr: 'num?', pipelineTotal: 'num?',
      pipelineCreated12m: 'num?', tier: 'tier?', commentary: 'str?' },
    newBusiness: { industryId: 'industry', tier: 'nbTier?', market: 'str?', subVertical: 'str?', channelSplit: 'obj',
      targetAccounts: 'num?', hitRate: 'num?', avgDealSize: 'num?', growth: 'obj', successFactors: 'str?',
      arrPotential: 'years3', servicesPotential: 'years3', servicesRatio: 'num?' },
    growth: { year2: 'num?', year3: 'num?' },
    thresholds: { strategicArr: 'num?', scaledArr: 'num?', growthArr: 'num?', growthOrderIntake: 'num?' },
    customerGrowth: { thresholds: 'obj', accounts: 'list' },
    accounts: { id: 'str', name: 'str?', industryId: 'industry?', country: 'str?', productLine: 'productLine?', currentArr: 'num?',
      riskLevel: 'risk?', growthPct: 'years3?', multiplier3y: 'num?', servicesRatio: 'num?', incrementalArr: 'years3',
      servicesOrderIntake: 'years3', cumulativeOrderIntake: 'num?', segment: 'segment?' },
    partners: { name: 'str', channel: 'partnerChannel', maturity: 'str?', expertiseGeo: 'str?', expertiseProduct: 'str?',
      fteSales: 'num?', fteConsultants: 'num?', centralSupportPct: 'num?', arr: 'years3', services: 'years3' },
    recap: { year: 'year', channel: 'channel', motion: 'motion', type: 'recapType', value: 'num?' }
  };

  function expectFor(name, nullable, env) {
    return nullable && TYPES[name].plain ? say('orBlank', { what: TYPES[name].expect(env) }) : TYPES[name].expect(env);
  }

  function at(ctx, key) { return key == null ? ctx.path : ctx.path + (typeof key === 'number' ? '[' + key + ']' : (ctx.path ? '.' : '') + key); }

  function entry(ctx, key, expected, v, described) {
    var found, text;
    if (described) { found = v; text = String(v); }
    else if (v === undefined) { found = text = say('found.nothing'); }
    else if (Array.isArray(v)) { found = text = v.length ? say('found.list', { n: v.length }) : say('found.emptyList'); }
    else if (isObj(v)) { found = text = say('found.object'); }
    else { found = v; text = typeof v === 'number' && !isFinite(v) ? String(v) : JSON.stringify(v); }
    var path = at(ctx, key);
    return { path: path, region: ctx.region, item: ctx.item, expected: expected, found: found,
      message: say('message', { path: path, expected: expected, found: text }) };
  }

  function err(ctx, key, expected, v, described) {
    if (ctx.out.errors.length < MAX_ERRORS) ctx.out.errors.push(entry(ctx, key, expected, v, described)); else ctx.out.dropped++;
  }
  function warn(ctx, key, expected, v, described) { ctx.out.warnings.push(entry(ctx, key, expected, v, described)); }

  function rootCtx(out) { return { path: '', region: null, item: null, out: out }; }
  function sub(ctx, key, item) { return { path: at(ctx, key), region: ctx.region, item: item === undefined ? ctx.item : item, out: ctx.out }; }

  // Checks every field in a spec against its type
  function fields(obj, spec, ctx, env) {
    Object.keys(spec).forEach(function (k) {
      var nullable = /\?$/.test(spec[k]), name = spec[k].replace('?', ''), v = obj[k];
      if (v === undefined || (v === null && !nullable) || (v !== null && !TYPES[name].ok(v, env))) err(ctx, k, expectFor(name, nullable, env), v);
      else if (name === 'years3' && v !== null) v.forEach(function (x, i) { if (x !== null && !isNum(x)) err(sub(ctx, k), i, expectFor('num', true, env), x); });
    });
  }

  // Runs fn(item, ctx, i) over a list, reporting items that aren't objects.
  function each(list, ctx, env, fn) {
    if (!Array.isArray(list)) return;
    list.forEach(function (o, i) { if (isObj(o)) fn(o, i); else err(sub(ctx, i), null, say('expect.object'), o); });
  }

  // Meta and lookups
  function checkMeta(meta, out, env) {
    var ctx = sub(rootCtx(out), 'meta');
    if (!isObj(meta)) { err(rootCtx(out), 'meta', say('expect.object'), meta); return; }
    fields(meta, SPEC.meta, ctx, env);
    var y = meta.years;
    if (!Array.isArray(y) || y.length !== 3 || !y.every(function (x, i) { return isNum(x) && y.indexOf(x) === i; })) err(ctx, 'years', say('expect.planYears'), y);
    else env.years = y;
    if (!isObj(meta.sourceMap)) { warn(ctx, 'sourceMap', say('expect.sourceMap'), meta.sourceMap); return; }
    MAP_SECTIONS.forEach(function (s) {
      var m = meta.sourceMap[s];
      if (!isObj(m) || !isStr(m.sheet)) warn(sub(ctx, 'sourceMap'), s, say('expect.sourceMap'), m);
    });
  }

  function lookupList(lookups, key, spec, ctx, env, keep) {
    var list = lookups[key], lctx = sub(ctx, key), seen = map();
    if (!Array.isArray(list)) { err(ctx, key, say('expect.list'), list); return; }
    each(list, lctx, env, function (o, i) {
      var c = sub(lctx, i);
      fields(o, spec, c, env);
      if (o.id != null && seen[o.id]) err(c, 'id', say('expect.uniqueId'), o.id);
      seen[o.id] = true;
      if (keep && (isStr(o.id) || isNum(o.id))) keep[o.id] = o;
    });
  }

  function checkLookups(lookups, out, env) {
    var ctx = sub(rootCtx(out), 'lookups');
    if (!isObj(lookups)) { err(rootCtx(out), 'lookups', say('expect.object'), lookups); return; }
    lookupList(lookups, 'productLines', SPEC.named, ctx, env, env.productLines);
    lookupList(lookups, 'industries', SPEC.industryLookup, ctx, env, env.industries);
    lookupList(lookups, 'channels', SPEC.channelLookup, ctx, env, env.channels);
    lookupList(lookups, 'tiers', SPEC.tierLookup, ctx, env, null);
    lookupList(lookups, 'segments', SPEC.segmentLookup, ctx, env, null);
    if (!isObj(lookups.scales)) { err(ctx, 'scales', say('expect.object'), lookups.scales); return; }
    RATINGS.forEach(function (r) {
      var s = lookups.scales[r], lctx = sub(ctx, 'scales.' + r + '.levels');
      if (!isObj(s) || !Array.isArray(s.levels)) err(sub(ctx, 'scales'), r, say('expect.object'), s);
      else each(s.levels, lctx, env, function (lv, i) { fields(lv, SPEC.level, sub(lctx, i), env); });
    });
  }

  // Regions
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

  function checkSection(r, key, rctx, env, extra) {
    var name = key === 'accounts' ? 'customerGrowth.accounts' : key, lctx = sub(rctx, name), seen = map();
    var list = key === 'accounts' ? r.customerGrowth.accounts : r[key];
    if (!Array.isArray(list)) return;
    if (!list.length) warn(rctx, name, say('expect.items'), say('found.emptyList'), true);
    each(list, lctx, env, function (o, i) {
      var c = sub(lctx, i, itemName(key, o, env));
      fields(o, SPEC[key], c, env);
      if (key === 'recap') {
        if (!isStr(o.sourceCell)) warn(c, 'sourceCell', say('expect.sourceCell'), o.sourceCell);
      } else if (o.sourceRow === undefined || !(isNum(o.sourceRow) && o.sourceRow % 1 === 0)) {
        warn(c, 'sourceRow', say('expect.sourceRow'), o.sourceRow);
      }
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
    RATINGS.forEach(function (k) { if (o[k] != null) warn(c, k, say('expect.unrated'), o[k]); });
  }

  function checkNewBusinessRow(o, c, env, tiers) {
    if (isObj(o.channelSplit)) {
      var sctx = sub(c, 'channelSplit'), sum = 0, any = false;
      CHANNELS.forEach(function (k) { if (!has(o.channelSplit, k)) err(sctx, k, expectFor('num', true, env), undefined); });
      Object.keys(o.channelSplit).forEach(function (k) {
        var v = o.channelSplit[k];
        if (!has(env.channels, k)) err(sctx, k, say('expect.channelKey'), k, true);
        else if (v !== null && !isNum(v)) err(sctx, k, expectFor('num', true, env), v);
        else if (isNum(v)) { sum += v; any = true; }
      });
      if (any && Math.abs(sum - 1) > 0.01) warn(c, 'channelSplit', say('expect.splitSum'), Math.round(sum * 1000) / 10 + '%', true);
    }
    if (isObj(o.growth)) fields(o.growth, SPEC.growth, sub(c, 'growth'), env);
    if (!tiers) return arrFormula(o, c);
    if (has(tiers, o.industryId) || !has(env.industries, o.industryId)) {
      var mc = tiers[o.industryId];
      if ((o.tier === 1 || o.tier === 2) && TYPES.tier.ok(mc) && o.tier !== mc) err(c, 'tier', say('expect.mcTier', { tier: mc }), o.tier);
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
    fields(r, SPEC.region, rctx, env);
    if (isStr(r.id) && ids[r.id]) err(rctx, 'id', say('expect.uniqueRegion'), r.id);
    ids[r.id] = true;
    var nctx = sub(rctx, 'source.notes');
    if (isObj(r.source)) fields(r.source, SPEC.source, sub(rctx, 'source'), env);
    if (isObj(r.source)) each(r.source.notes, nctx, env, function (n, k) { fields(n, SPEC.note, sub(nctx, k), env); });
    var tiers = Array.isArray(r.marketCoverage) ? map() : null;
    checkSection(r, 'marketCoverage', rctx, env, function (o, c) { checkMarketRow(o, c, env, tiers); });
    checkSection(r, 'newBusiness', rctx, env, function (o, c) { checkNewBusinessRow(o, c, env, tiers); });
    checkSection(r, 'partners', rctx, env);
    checkSection(r, 'recap', rctx, env);
    if (isObj(r.customerGrowth)) {
      var cg = r.customerGrowth;
      fields(cg, SPEC.customerGrowth, sub(rctx, 'customerGrowth'), env);
      if (isObj(cg.thresholds)) fields(cg.thresholds, SPEC.thresholds, sub(rctx, 'customerGrowth.thresholds'), env);
      checkSection(r, 'accounts', rctx, env, function (acc, c) {
        var want = segmentFor(acc, cg.thresholds);
        if (want && acc.segment !== want) warn(c, 'segment', say('expect.segmentRule', { segment: JSON.stringify(want) }), acc.segment);
      });
    }
  }

  function run(plan) {
    var out = { errors: [], warnings: [], dropped: 0 };
    var env = { industries: map(), productLines: map(), channels: map(), years: [] };
    var top = rootCtx(out), ids = map();
    if (!isObj(plan)) err(top, '(whole file)', say('expect.object'), plan);
    else {
      checkMeta(plan.meta, out, env);
      checkLookups(plan.lookups, out, env);
      if (!Array.isArray(plan.regions)) err(top, 'regions', say('expect.regions'), plan.regions);
      else if (!plan.regions.length) err(top, 'regions', say('expect.someRegions'), plan.regions);
      else plan.regions.forEach(function (r, i) { checkRegion(r, i, out, env, ids); });
    }
    if (out.dropped) out.errors.push({ path: '', region: null, item: null, expected: '', found: out.dropped, message: say('more', { n: out.dropped }) });
    return { errors: out.errors, warnings: out.warnings };
  }

  TAP.check = { run: run };
})(window.TAP);
