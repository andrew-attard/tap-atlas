/*
 * File: js/core/check.js
 * Purpose: Checks the plan data file against the Data Contract (docs/DATA-CONTRACT.md) and lists anything wrong in plain words.
 * Provides: TAP.check (run, kit: the shared helpers for js/core/check-rows.js)
 * Depends on: js/core/namespace.js, js/core/content.js and content/text-data.js (message wording),
 *             js/core/check-rows.js (the regions, at call time)
 * Used by: js/core/data.js (on load)
 *
 * run(plan) returns {errors, warnings}. Each item is {path, region, item, expected, found, message}.
 * Errors would break views, so loading stops. Warnings load anyway and go to the data sources panel.
 * null (a blank, "not provided") is allowed for every leader input and system figure.
 * Fields and sections the contract doesn't name are ignored (D47). Extra sections are checked by js/core/extra.js, warnings only.
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
      else plan.regions.forEach(function (r, i) { TAP.checkRows.region(r, i, out, env, ids); });
    }
    if (isObj(plan) && TAP.extra) out.warnings = out.warnings.concat(TAP.extra.check(plan));
    if (out.dropped) out.errors.push({ path: '', region: null, item: null, expected: '', found: out.dropped, message: say('more', { n: out.dropped }) });
    return { errors: out.errors, warnings: out.warnings };
  }

  // The helpers js/core/check-rows.js checks the regions' sections with
  var kit = { say: say, has: has, map: map, isObj: isObj, isNum: isNum, isStr: isStr, round2: round2, at: at, sub: sub,
    rootCtx: rootCtx, err: err, warn: warn, fields: fields, each: each, expectFor: expectFor, TYPES: TYPES, SPEC: SPEC,
    RATINGS: RATINGS, CHANNELS: CHANNELS };
  TAP.check = { run: run, kit: kit };
})(window.TAP);
