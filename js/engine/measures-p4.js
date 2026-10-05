/*
 * File: js/engine/measures-p4.js
 * Purpose: The Phase 4 measures read from the recap-shaped lists: books value against customer value, the strategic
 *          plan and the variance to it, the revenue outlook and order intake by product category (US-4.1.4; ids in
 *          docs/ARCHITECTURE.md section 19.2). Differences and ratios keep their parts, so combined figures are the
 *          summed parts, never a mean of ratios.
 * Provides: measures registered with TAP.measures (bk.*, cv.oi, sp.*, rv.*, oi.cat); TAP.measures.available(id): false
 *           for a Phase 4 measure the loaded file has no data for; TAP.measures.kit4 (helpers for
 *           js/engine/measures-p4b.js, prepare.js and rows.js)
 * Depends on: js/engine/measures.js (define, kit), measures-p2.js (kit2, rc.all.oi), js/core/data.js, js/core/content.js
 * Used by: reports, insights, the region profile and Build a chart
 * Owner: ENGINE4 stream (#439)
 */
(function (TAP) {
  'use strict';

  var M = TAP.measures, k = M.kit, k2 = M.kit2;
  var CH = ['direct', 'partner', 'allianceA', 'allianceB'];
  var MOTION = { nb: 'newBusiness', cg: 'customerGrowth' }, BOTH = ['newBusiness', 'customerGrowth'];
  // Each product category and the item type that holds it: recurring order intake is the ARR type
  var CAT_TYPE = { swPerpetual: 'swPerpetual', recurring: 'arr', hardware: 'hardware', services: 'services' };
  var TYPES = ['arr', 'services', 'swPerpetual', 'hardware'], RV = { arr: ['arr'], services: ['services'], oi: ['arr', 'services'] };
  // Lookups whose ids the Data Contract fixes: their values stand even when a file leaves the lookup out
  var FIXED = { productCategories: ['swPerpetual', 'recurring', 'hardware', 'services'],
    routes: ['ownSales', 'customerSuccess', 'allianceBReseller', 'otherResellers', 'systemIntegrators', 'partnerExisting'] };
  var DIM = { productCategories: 'category', routes: 'route' };
  var YCM = ['year', 'channel', 'motion'], YC = ['year', 'category'];

  function region(id) { return TAP.data.region(id) || {}; }
  function norm(v) { return v == null ? '' : String(v).trim().toLowerCase(); }

  // Marks a measure as a part of the template a file may not have (meta.optional). probe names the measure whose
  // data decides, when it is not the measure itself.
  function p4(m, probe) { m.optional = probe || true; return m; }
  // False for such a measure when no region in the loaded file has a value for it. Build a chart offers only
  // available measures; a view or report can ask before showing a part the file doesn't have.
  M.available = function (id) {
    var m = M.meta(id);
    if (!m) return false;
    if (!m.optional) return true;
    var fn = M.get(m.optional === true ? id : m.optional);
    try { return !!fn && TAP.data.regions().some(function (r) { return fn(r.id, {}).state === 'value'; }); } catch (e) { return false; }
  };

  // A Phase 4 lookup in its own order; partner maturity in the order of its rank.
  function lookup(name) {
    var list = ((TAP.data.lookups() || {})[name] || []).map(function (x, i) { return { x: x, i: i }; });
    if (!list.length && FIXED[name]) {
      return FIXED[name].map(function (id) { return { id: id, name: TAP.content.text('breakdown.' + DIM[name] + '.' + id) }; });
    }
    if (name === 'partnerMaturity') {
      list.sort(function (a, b) { return (k.isNum(a.x.rank) ? a.x.rank : Infinity) - (k.isNum(b.x.rank) ? b.x.rank : Infinity) || a.i - b.i; });
    }
    return list.map(function (a) { return a.x; });
  }
  // The lookup value a row or item names, or 'none' when it names none (a blank, or an id the lookup doesn't have).
  function valueOf(name, v) { return lookup(name).some(function (x) { return x.id === v; }) ? v : 'none'; }
  // The maturity level a partner's value names: a lookup id, or a level's name in any case. Null for anything else.
  function maturity(v) {
    var key = norm(v);
    return !key ? null : lookup('partnerMaturity').filter(function (x) { return norm(x.id) === key || norm(x.name) === key; })[0] || null;
  }

  // Sums the items that pass keep, in a list with the recap item's shape (revenue, booksValue, strategicPlan, routes).
  // Item years are calendar years; ctx.year is the plan year 1 to 3. No matching item with a figure is not provided.
  function items(r, section, kind, ctx, keep) {
    var years = (TAP.data.meta() || {}).years || [], want = ctx.year ? [years[ctx.year - 1]] : years;
    var match = (region(r)[section] || []).filter(function (it) { return want.indexOf(it.year) >= 0 && keep(it); });
    var hit = match.filter(function (it) { return k.isNum(it.value); });
    var s = k.src(r, section, 'value', [], ctx.year, kind);
    s.cells = hit.map(function (it) { return it.sourceCell; }).filter(Boolean);
    s.cell = s.cells.length === 1 ? s.cells[0] : null;
    if (!hit.length) return k.blank(kind, s);
    // Partly provided: a matching item left blank, or a plan year with nothing at all
    var gap = hit.length < match.length || want.some(function (y) { return !hit.some(function (it) { return it.year === y; }); });
    return k.cell(k2.sum(hit.map(function (it) { return it.value; })), kind, s, gap ? k2.partialYears() : null);
  }
  // Keeps the items of the product category in context ('none': a type outside the four categories)
  function inCategory(ctx) {
    var c = ctx.category;
    return function (it) { return !c || (c === 'none' ? TYPES.indexOf(it.type) < 0 : it.type === CAT_TYPE[c]); };
  }

  // The source of a figure this app works out from other measures' cells
  function made(r, id, ctx, parts) {
    return { regionId: r, section: null, field: id, row: null, rows: [], year: ctx.year || null, cell: null, kind: 'APP',
      parts: parts.map(function (p) { return { measureId: p[0], src: p[1].src }; }) };
  }
  // One measure minus another: blank if either is blank, partly provided if either is. minus, when given, reads
  // the figure taken off in place of measure b's own.
  function difference(id, a, b, dims, minus) {
    M.define(id, p4(k.amount('APP', dims)), function (r, ctx) {
      ctx = ctx || {};
      var x = M.get(a)(r, ctx), y = (minus || M.get(b))(r, ctx), s = made(r, id, ctx, [[a, x], [b, y]]);
      if (x.state !== 'value' || y.state !== 'value') return k.blank('APP', s);
      return k.cell(x.v - y.v, 'APP', s, x.partial || y.partial ? { partial: true, note: x.note || y.note } : null);
    });
  }
  // One measure over another, keeping both (cell.ratio), so regions combine as a ratio of sums
  function ratio(id, num, den, dims) {
    M.define(id, p4(k2.rate('APP', den, dims)), function (r, ctx) {
      ctx = ctx || {};
      var n = M.get(num)(r, ctx), d = M.get(den)(r, ctx);
      return k2.share(n, d, made(r, id, ctx, [[num, n], [den, d]]));
    });
  }

  /* ---------- books value against customer value ---------- */

  // A channel's name from the lookup, so a renamed channel flows to legends and labels (as the recap measures do)
  function channelWords(c) {
    return function () {
      var x = ((TAP.data.lookups() || {}).channels || []).filter(function (l) { return l.id === c; })[0];
      return x && x.name ? { label: TAP.content.text('measures.bk.withChannel', { channel: x.name }), short: x.name } : null;
    };
  }
  // Order intake through the organization's books, for the types given and, when fixed, one channel
  function books(types, channel) {
    return function (r, ctx) {
      ctx = ctx || {};
      var m = MOTION[ctx.motion], c = channel || ctx.channel, cat = inCategory(ctx);
      return items(r, 'booksValue', 'DER', ctx, function (it) {
        return types.indexOf(it.type) >= 0 && (!m || it.motion === m) && (!c || it.channel === c) && cat(it);
      });
    };
  }
  M.define('bk.oi', p4(k.amount('DER', YCM)), books(TYPES));
  TYPES.forEach(function (t) { M.define('bk.' + t, p4(k.amount('DER', YCM)), books([t])); });
  CH.forEach(function (c) {
    M.define('bk.oi.' + c, p4(Object.assign(k.amount('DER', ['year', 'motion']), { words: channelWords(c) })), books(TYPES, c));
  });
  M.define('oi.cat', p4(k.amount('DER', YC)), books(TYPES));
  // Customer value is the recap: the same figure as rc.all.oi. Offered in Build a chart with the books value.
  M.define('cv.oi', p4(k.amount('DER', YCM), 'bk.oi'), function (r, ctx) { return M.get('rc.all.oi')(r, ctx || {}); });
  // Like for like: customer value holds ARR and services, so only those two types of books value are taken off.
  // Software perpetual and hardware run through the books only; they show in oi.cat and their own measures.
  difference('bk.gap', 'cv.oi', 'bk.oi', ['year', 'channel'], books(RV.oi));
  ratio('bk.gapShare', 'bk.gap', 'cv.oi', ['year', 'channel']);

  /* ---------- the strategic plan ---------- */

  function strategic(types) {
    return function (r, ctx) {
      ctx = ctx || {};
      // A one-category figure has nothing to show in another category
      if (ctx.category && types.length === 1 && CAT_TYPE[ctx.category] !== types[0]) {
        return k.notApplicable('PRE', k.src(r, 'strategicPlan', 'value', [], ctx.year, 'PRE'));
      }
      var cat = inCategory(ctx);
      return items(r, 'strategicPlan', 'PRE', ctx, function (it) { return types.indexOf(it.type) >= 0 && cat(it); });
    };
  }
  M.define('sp.oi', p4(k.amount('PRE', YC)), strategic(TYPES));
  TYPES.forEach(function (t) { M.define('sp.' + t, p4(k.amount('PRE', YC)), strategic([t])); });
  // The plan on the strategic plan's basis: the books value of each year and category the strategic plan gives a
  // figure for, so the two are compared like for like. No strategic plan: not provided.
  M.define('sp.plan', p4(k.amount('DER', YC)), function (r, ctx) {
    ctx = ctx || {};
    var given = {}, cat = inCategory(ctx);
    (region(r).strategicPlan || []).forEach(function (it) { if (k.isNum(it.value)) given[it.year + ':' + it.type] = true; });
    return items(r, 'booksValue', 'DER', ctx, function (it) { return given[it.year + ':' + it.type] === true && cat(it); });
  });
  difference('sp.variance', 'sp.plan', 'sp.oi', YC);
  ratio('sp.variancePct', 'sp.variance', 'sp.oi', YC);

  /* ---------- the revenue outlook ---------- */

  ['nb', 'cg', 'all'].forEach(function (m) {
    Object.keys(RV).forEach(function (t) {
      M.define('rv.' + m + '.' + t, p4(k.amount('DER', m === 'all' ? YCM : ['year', 'channel'])), function (r, ctx) {
        ctx = ctx || {};
        var ms = m !== 'all' ? [MOTION[m]] : MOTION[ctx.motion] ? [MOTION[ctx.motion]] : BOTH;
        return items(r, 'revenue', 'DER', ctx, function (it) {
          return ms.indexOf(it.motion) >= 0 && RV[t].indexOf(it.type) >= 0 && (!ctx.channel || it.channel === ctx.channel);
        });
      });
    });
  });
  // Revenue over the order intake of the same years (customer value)
  ratio('rv.share', 'rv.all.oi', 'rc.all.oi', ['year', 'channel']);

  // Shared with js/engine/measures-p4b.js; lookup and maturity also serve the breakdown values and the partner list
  M.kit4 = { region: region, p4: p4, lookup: lookup, valueOf: valueOf, maturity: maturity, items: items, made: made, CAT_TYPE: CAT_TYPE };
})(window.TAP);
