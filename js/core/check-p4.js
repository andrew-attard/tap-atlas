/*
 * File: js/core/check-p4.js
 * Purpose: Checks the Phase 4 parts of the data file against the Data Contract (US-4.1.2): the new lookups, and per
 *          region the revenue, books value, strategic plan, base year and route parts, the partner and solution
 *          fields, and the values that are likely wrong.
 * Provides: TAP.checkP4 (run, region, newBusinessRow, partner, categoryOf, TYPES, CATEGORIES, ROUTES)
 * Depends on: js/core/check.js (TAP.check.kit), js/core/content.js and content/text-data.js (all at call time)
 * Used by: js/core/check.js (run, after the lookups) and js/core/check-rows.js (the region parts and rows)
 * Owner: DATA4 stream (#437)
 *
 * Every part is optional: a part that is left out, null or an empty list is "not provided" and is never reported.
 * Wrong types and unknown ids are errors, as in the existing sections. Values that are only likely wrong
 * (revenue above its order intake, a variance or coverage that disagrees with its parts) are warnings.
 */
(function (TAP) {
  'use strict';

  // The four item types are the four product categories; "arr" is the recurring one
  var TYPES = ['arr', 'services', 'swPerpetual', 'hardware'];
  var CATEGORY_OF = { arr: 'recurring', services: 'services', swPerpetual: 'swPerpetual', hardware: 'hardware' };
  var CATEGORIES = ['swPerpetual', 'recurring', 'hardware', 'services'];
  var ROUTES = ['ownSales', 'customerSuccess', 'allianceBReseller', 'otherResellers', 'systemIntegrators', 'partnerExisting'];
  var RESELLERS = ['partner', 'allianceA', 'allianceB'];
  var LIST_PARTS = ['revenue', 'booksValue', 'strategicPlan', 'routes'];

  function K() { return TAP.check.kit; }
  function say(key, vars) { return K().say(key, vars); }
  function categoryOf(type) { return K().has(CATEGORY_OF, type) ? CATEGORY_OF[type] : null; }
  function norm(text) { return String(text).trim().toLowerCase(); }
  function near(found, want) { return Math.abs(found - want) <= Math.max(0.5, Math.abs(want) * 0.005); }
  // A share above 1.5 is most likely a whole-number percentage (30 for 30%), as in the existing sections
  function share(v, c, key) { if (K().isNum(v) && Math.abs(v) > 1.5) K().warn(c, key, say('expect.share'), v); }

  function oneOf(list, quote) {
    return { ok: function (v) { return list.indexOf(v) !== -1; }, expect: function () {
      var items = list.map(function (x) { return quote ? JSON.stringify(x) : String(x); });
      return items.slice(0, -1).join(', ') + say('or') + items[items.length - 1];
    } };
  }
  // An id that must exist in one of the Phase 4 lookups
  function ref(key) {
    return { ok: function (v, env) { return K().isStr(v) && !!env.p4 && K().has(env.p4[key], v); }, expect: function () { return say('expect.' + key); } };
  }

  // The value types the Phase 4 specs use, added to the shared set once
  function types() {
    var T = K().TYPES;
    if (T.bookType) return;
    T.bookType = oneOf(TYPES, true);
    T.category = oneOf(CATEGORIES, true);
    T.routeId = oneOf(ROUTES, true);
    T.rank = oneOf([1, 2, 3, 4, 5]);
    T.solution = ref('solution');
    T.partnerType = ref('partnerType');
  }

  var SPEC = {
    category: { id: 'category', name: 'str' },
    solution: { id: 'str', name: 'str', category: 'category' },
    maturity: { id: 'str', name: 'str', rank: 'rank' },
    route: { id: 'routeId', name: 'str' },
    booksValue: { year: 'year', channel: 'channel', motion: 'motion', type: 'bookType', value: 'num?' },
    strategicPlan: { year: 'year', type: 'bookType', value: 'num?' },
    routes: { route: 'routeId', year: 'year', type: 'bookType', value: 'num?' },
    baseYear: { year: 'num', items: 'list' },
    baseItem: { category: 'category', budget: 'num?', forecast: 'num?', actuals: 'num?', pipeline: 'num?' }
  };

  // Checks only the fields that are there: every one of them is optional
  function optional(o, spec, ctx, env) {
    var given = {};
    Object.keys(spec).forEach(function (k) { if (o[k] !== undefined) given[k] = spec[k]; });
    K().fields(o, given, ctx, env);
  }

  /* ---------- lookups and the source map ---------- */

  function lookup(lookups, key, spec, ctx, env, keep) {
    var k = K(), list = lookups[key], lctx = k.sub(ctx, key), seen = k.map();
    if (list == null) return false;
    if (!Array.isArray(list)) { k.err(ctx, key, say('expect.list'), list); return false; }
    k.each(list, lctx, env, function (o, i) {
      var c = k.sub(lctx, i);
      k.fields(o, spec, c, env);
      if (o.id != null && seen[o.id]) k.err(c, 'id', say('expect.uniqueId'), o.id);
      seen[o.id] = true;
      if (keep && k.isStr(o.id)) keep(o);
    });
    return true;
  }

  // Sets env.p4, the ids the region checks compare with, and checks the new lookups and source-map entries.
  function run(plan, out, env) {
    var k = K(), p4 = env.p4 = { solution: k.map(), partnerType: k.map(), maturity: null };
    types();
    if (!k.isObj(plan)) return;
    var lk = plan.lookups, ctx = k.sub(k.rootCtx(out), 'lookups');
    if (k.isObj(lk)) {
      lookup(lk, 'productCategories', SPEC.category, ctx, env);
      lookup(lk, 'solutions', SPEC.solution, ctx, env, function (o) { p4.solution[o.id] = true; });
      lookup(lk, 'partnerTypes', k.SPEC.named, ctx, env, function (o) { p4.partnerType[o.id] = true; });
      // Maturity is checked against its lookup only when the file has one; without it, it stays free text
      var names = k.map();
      if (lookup(lk, 'partnerMaturity', SPEC.maturity, ctx, env, function (o) { names[norm(o.id)] = true; if (k.isStr(o.name)) names[norm(o.name)] = true; })) p4.maturity = names;
      lookup(lk, 'routes', SPEC.route, ctx, env);
    }
    // A part some region carries needs its entry in the template map, as the existing sections do
    var maps = k.isObj(plan.meta) ? plan.meta.sourceMap : null, regions = Array.isArray(plan.regions) ? plan.regions.filter(k.isObj) : [];
    if (!k.isObj(maps)) return;
    LIST_PARTS.concat(['baseYear']).forEach(function (part) {
      var used = regions.some(function (r) { return Array.isArray(r[part]) ? r[part].length : k.isObj(r[part]); });
      if (used && !(k.isObj(maps[part]) && k.isStr(maps[part].sheet))) k.warn(k.sub(k.rootCtx(out), 'meta.sourceMap'), part, say('expect.sourceMap'), maps[part]);
    });
  }

  /* ---------- rows of the existing sections ---------- */

  function newBusinessRow(o, c, env) { types(); optional(o, { solution: 'solution?' }, c, env); }

  function partner(o, c, env) {
    types();
    optional(o, { type: 'partnerType?', supportPct: 'years3?', distribution: 'years3?', servicesFromPartners: 'years3?' }, c, env);
    if (Array.isArray(o.supportPct)) o.supportPct.forEach(function (v, i) { share(v, K().sub(c, 'supportPct'), i); });
    var known = env.p4 && env.p4.maturity;
    if (known && K().isStr(o.maturity) && !known[norm(o.maturity)]) K().err(c, 'maturity', say('expect.maturity'), o.maturity);
  }

  /* ---------- the new parts of a region ---------- */

  // One list part: each item's fields, its source cell, and a warning for the same item twice. Returns the usable items.
  function items(r, part, rctx, env, spec, keys) {
    var k = K(), list = r[part], lctx = k.sub(rctx, part), seen = k.map();
    if (list == null) return [];
    if (!Array.isArray(list)) { k.err(rctx, part, say('expect.list'), list); return []; }
    k.each(list, lctx, env, function (o, i) {
      var c = k.sub(lctx, i, k.isStr(o.sourceCell) ? say('item.cell', { cell: o.sourceCell }) : null);
      k.fields(o, spec, c, env);
      if (part === 'strategicPlan') optional(o, { variance: 'num?' }, c, env);
      if (part === 'routes') optional(o, { solution: 'solution?' }, c, env);
      if (!k.isStr(o.sourceCell)) k.warn(c, 'sourceCell', say('expect.sourceCell'), o.sourceCell);
      again(seen, keys.map(function (f) { return o[f]; }), c, part);
    });
    return list.filter(k.isObj);
  }

  function again(seen, values, c, part) {
    var key = values.filter(function (v) { return v != null; }).join(', ');
    if (seen[key]) K().warn(c, null, say('expect.oneItem', { what: say('expect.itemKeys.' + part) }), say('found.second', { key: key }), true);
    seen[key] = true;
  }

  function baseYear(r, rctx, env) {
    var k = K(), by = r.baseYear, c = k.sub(rctx, 'baseYear'), seen = k.map();
    if (by == null) return;
    if (!k.isObj(by)) { k.err(rctx, 'baseYear', say('expect.object'), by); return; }
    k.fields(by, SPEC.baseYear, c, env);
    optional(by, { actualsThrough: 'str?' }, c, env);
    if (k.isStr(by.actualsThrough) && !/^\d{4}-(0[1-9]|1[0-2])$/.test(by.actualsThrough)) k.warn(c, 'actualsThrough', say('expect.yearMonth'), by.actualsThrough);
    var lctx = k.sub(c, 'items');
    k.each(by.items, lctx, env, function (o, i) {
      var ic = k.sub(lctx, i, k.isNum(o.sourceRow) ? say('item.row', { name: String(o.category), row: o.sourceRow }) : String(o.category));
      k.fields(o, SPEC.baseItem, ic, env);
      optional(o, { coverage: 'num?' }, ic, env);
      if (!(k.isNum(o.sourceRow) && o.sourceRow % 1 === 0)) k.warn(ic, 'sourceRow', say('expect.sourceRow'), o.sourceRow);
      again(seen, [o.category], ic, 'baseYear');
      // The workbook's ratio against pipeline over the order intake still to win
      var left = o.forecast - o.actuals;
      if (![o.coverage, o.pipeline, o.forecast, o.actuals].every(k.isNum) || left <= 0) return;
      if (Math.abs(o.coverage - o.pipeline / left) > Math.abs(o.pipeline / left) * 0.05) k.warn(ic, 'coverage', say('expect.coverage', { value: k.round2(o.pipeline / left) }), o.coverage);
    });
  }

  // Sums a list's values by a key built from the named fields
  function totals(list, keys) {
    var k = K(), out = k.map();
    (Array.isArray(list) ? list : []).forEach(function (o) {
      if (!k.isObj(o) || !k.isNum(o.value)) return;
      var key = keys.map(function (f) { return o[f]; }).join(', ');
      out[key] = (out[key] || 0) + o.value;
    });
    return out;
  }

  // A total of one list that is above the recap's total for the same key (the order intake at customer value)
  function above(found, recap, keep, rctx, part, wording) {
    Object.keys(found).forEach(function (key) {
      if (!K().has(recap, key) || !keep(key) || found[key] <= recap[key] + 0.5) return;
      var c = K().sub(rctx, part, key);
      K().warn(c, null, say('expect.' + wording, { key: key, value: K().round2(recap[key]) }), K().round2(found[key]));
    });
  }

  function region(r, rctx, env) {
    var k = K();
    types();
    optional(r, { outsourcingPct: 'num?' }, rctx, env);
    share(r.outsourcingPct, rctx, 'outsourcingPct');
    var revenue = items(r, 'revenue', rctx, env, k.SPEC.recap, ['year', 'channel', 'motion', 'type']);
    var books = items(r, 'booksValue', rctx, env, SPEC.booksValue, ['year', 'channel', 'motion', 'type']);
    var plan = items(r, 'strategicPlan', rctx, env, SPEC.strategicPlan, ['year', 'type']);
    baseYear(r, rctx, env);
    items(r, 'routes', rctx, env, SPEC.routes, ['route', 'year', 'type', 'solution']);

    above(totals(revenue, ['year', 'channel', 'motion']), totals(r.recap, ['year', 'channel', 'motion']), function () { return true; }, rctx, 'revenue', 'revenueWithin');
    // Books value against customer value over ARR and services: the recap holds no perpetual software or hardware
    var both = books.filter(function (o) { return o.type === 'arr' || o.type === 'services'; });
    above(totals(both, ['year', 'channel']), totals(r.recap, ['year', 'channel']),
      function (key) { return RESELLERS.some(function (ch) { return key.split(', ')[1] === ch; }); }, rctx, 'booksValue', 'booksWithin');
    // The workbook's variance against the books order intake of that year and type minus the strategic plan
    var booked = totals(books, ['year', 'type']);
    plan.forEach(function (o) {
      var key = o.year + ', ' + o.type;
      if (!k.isNum(o.variance) || !k.isNum(o.value) || !k.has(booked, key) || near(o.variance, booked[key] - o.value)) return;
      var c = k.sub(k.sub(rctx, 'strategicPlan'), r.strategicPlan.indexOf(o), k.isStr(o.sourceCell) ? say('item.cell', { cell: o.sourceCell }) : null);
      k.warn(c, 'variance', say('expect.variance', { value: k.round2(booked[key] - o.value) }), o.variance);
    });
  }

  TAP.checkP4 = { run: run, region: region, newBusinessRow: newBusinessRow, partner: partner, categoryOf: categoryOf,
    TYPES: TYPES.slice(), CATEGORIES: CATEGORIES.slice(), ROUTES: ROUTES.slice() };
})(window.TAP);
