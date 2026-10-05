/*
 * File: js/engine/rows.js
 * Purpose: Row-level figures for lists, bubbles and details: one cell per new business row, account or partner, with its source (US-2.7.2).
 * Provides: TAP.rows (list, cell, columns, optional, matchKey, section, rowSrc)
 * Depends on: js/core/data.js, js/core/content.js, js/core/format.js, js/core/extra.js (row sources "extra:<id>"),
 *             js/engine/measures-p4.js (kit4: the partner maturity lookup) (at call time)
 * Used by: js/engine/build-list.js, js/reports/row-bubble.js, js/reports/details-rows.js, js/insights/rules-shared.js
 * Owner: ENGINE2 stream (#194)
 */
(function (TAP) {
  'use strict';

  // List sources and the plan sections they read. Details targets name the section, so both are accepted.
  var SECTION = { newBusiness: 'newBusiness', accounts: 'customerGrowth', partners: 'partners' };
  var SOURCE = { newBusiness: 'newBusiness', accounts: 'accounts', customerGrowth: 'accounts', partners: 'partners' };
  // The column that names the item, used to address a whole row ("Region A plan.xlsx › 3. Customer Growth › C13")
  var NAME_FIELD = { newBusiness: 'subVertical', accounts: 'name', partners: 'name' };
  var NA = { notApplicable: true };

  // Extra template sections (US-3.2.1) are row sources named "extra:<section id>", served by js/core/extra.js
  function extra(source) { return !!TAP.extra && TAP.extra.is(source); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function sum(list) { return list.reduce(function (t, v) { return t + v; }, 0); }
  function t(key, vars) { return TAP.content.text(key, vars); }
  function lookupName(list, id) { var x = (list || []).filter(function (l) { return l.id === id; })[0]; return x ? x.name : id; }
  function regionName(id) { return TAP.content.regionName(TAP.data.region(id)); }

  function isRow(v) { return isNum(v) && v % 1 === 0; }
  // A section's items in row order, each with its key: its worksheet row, or, when that is missing, not a whole
  // number or already used by an earlier item, "p<position in the file>", so every row stays its own (review DE-4).
  function keyed(regionId, source) {
    var r = TAP.data.region(regionId) || {}, seen = {};
    var list = source === 'newBusiness' ? r.newBusiness : source === 'accounts' ? (r.customerGrowth || {}).accounts : r.partners;
    var out = (list || []).map(function (it, i) {
      var n = it.sourceRow, own = isRow(n) && !seen[n];
      if (own) seen[n] = true;
      return { it: it, i: i, key: own ? n : 'p' + i, at: isRow(n) ? n : Infinity };
    });
    return out.sort(function (a, b) { return a.at === b.at ? a.i - b.i : a.at < b.at ? -1 : 1; });
  }
  function itemsOf(regionId, source) { return keyed(regionId, source).map(function (x) { return x.it; }); }

  // [{id, regionId, source, sourceRow, key, item}] in region file order, then source row order. id is <regionId>:<key>.
  function list(source, regionIds) {
    if (extra(source)) return TAP.extra.list(source, regionIds);
    source = SOURCE[source];
    var out = [];
    if (!source) return out;
    TAP.data.regions().forEach(function (reg) {
      if (regionIds && regionIds.indexOf(reg.id) < 0) return;
      keyed(reg.id, source).forEach(function (x) {
        out.push({ id: reg.id + ':' + x.key, regionId: reg.id, source: source, sourceRow: x.it.sourceRow, key: x.key, item: x.it });
      });
    });
    return out;
  }

  // A three-year sum: blank years are skipped (the sum is then partial); every year blank is not provided.
  function years3(list) {
    var nums = (Array.isArray(list) ? list : []).filter(isNum);
    return nums.length ? { v: sum(nums), partial: nums.length < list.length } : null;
  }
  function matchKey(text) { return text == null ? '' : String(text).trim().toLowerCase().replace(/\s+/g, ' '); }

  // The other regions with an item of the same name (US-2.1.5, US-2.3.4): {v: their names, regionIds}, or not applicable.
  function others(source, field) {
    return function (it, regionId) {
      var key = matchKey(it[field]), ids = [];
      if (!key) return NA;
      TAP.data.regions().forEach(function (reg) {
        if (reg.id === regionId || ids.indexOf(reg.id) >= 0) return;
        if (itemsOf(reg.id, source).some(function (o) { return matchKey(o[field]) === key; })) ids.push(reg.id);
      });
      return ids.length ? { v: TAP.format.list(ids.map(regionName)), regionIds: ids } : NA;
    };
  }
  function fte(p) { var v = [p.fteSales, p.fteConsultants].filter(isNum); return v.length ? sum(v) : null; }
  function riskWord(a) { return t('rows.risk.' + (a.riskLevel === 'high' || a.riskLevel === 'medium' ? a.riskLevel : 'none')); }
  function growth(y) {
    return function (a) {
      if (!Array.isArray(a.growthPct)) return isNum(a.multiplier3y) ? NA : null;
      return a.growthPct[y - 1];
    };
  }
  function field(name) { return function (it) { return it[name]; }; }
  // A partner's maturity: the lookup's name for the level, with its rank to sort by. A value the lookup doesn't
  // have reads as written and sorts after the levels; without the lookup it is plain text, as before Phase 4.
  function maturity(p) {
    var levels = TAP.measures.kit4.lookup('partnerMaturity'), m = TAP.measures.kit4.maturity(p.maturity);
    if (!levels.length || p.maturity == null || p.maturity === '') return p.maturity;
    return m ? { v: m.name, rank: levels.indexOf(m) } : { v: p.maturity, rank: levels.length };
  }
  function partnerType(p) { return p.type ? lookupName(TAP.measures.kit4.lookup('partnerTypes'), p.type) : null; }
  function region(it, regionId) { return regionName(regionId); }
  function industry(it) { return it.industryId ? (TAP.data.industry(it.industryId) || {}).name || it.industryId : null; }

  // Per source: [key, unit, kind, contract field, value]. A value is a number or text, null (not provided), NA, or
  // {v, partial} / {v, regionIds}.
  var COLS = {
    newBusiness: [
      ['region', 'text', 'PRE', 'subVertical', region], ['industry', 'text', 'IN', 'industryId', industry],
      ['tier', 'tier', 'DER', 'tier', field('tier')], ['subVertical', 'text', 'IN', 'subVertical', field('subVertical')],
      ['market', 'text', 'IN', 'market', field('market')], ['targetAccounts', 'count', 'IN', 'targetAccounts', field('targetAccounts')],
      ['hitRate', 'pct', 'IN', 'hitRate', field('hitRate')], ['avgDealSize', 'money', 'IN', 'avgDealSize', field('avgDealSize')],
      ['wins', 'count', 'APP', 'hitRate', function (r) { return isNum(r.targetAccounts) && isNum(r.hitRate) ? r.targetAccounts * r.hitRate : null; }],
      ['arr3', 'money', 'DER', 'arrPotential', function (r) { return years3(r.arrPotential); }],
      ['services3', 'money', 'DER', 'servicesPotential', function (r) { return years3(r.servicesPotential); }],
      ['successFactors', 'text', 'IN', 'successFactors', field('successFactors')],
      ['alsoTargeted', 'text', 'APP', 'subVertical', others('newBusiness', 'subVertical')]
    ],
    accounts: [
      ['region', 'text', 'PRE', 'name', region], ['name', 'text', 'PRE', 'name', field('name')],
      ['industry', 'text', 'PRE', 'industryId', industry], ['country', 'text', 'PRE', 'country', field('country')],
      ['productLine', 'text', 'PRE', 'productLine', function (a) { return a.productLine ? lookupName(TAP.data.lookups().productLines, a.productLine) : null; }],
      ['segment', 'segment', 'DER', 'segment', field('segment')], ['riskLevel', 'text', 'PRE', 'riskLevel', riskWord],
      ['currentArr', 'money', 'PRE', 'currentArr', field('currentArr')],
      ['growthY1', 'pct', 'IN', 'growthPct', growth(1)], ['growthY2', 'pct', 'IN', 'growthPct', growth(2)], ['growthY3', 'pct', 'IN', 'growthPct', growth(3)],
      ['multiplier3y', 'count', 'IN', 'multiplier3y', function (a) { return !isNum(a.multiplier3y) && Array.isArray(a.growthPct) ? NA : a.multiplier3y; }],
      ['incr3', 'money', 'DER', 'incrementalArr', function (a) { return years3(a.incrementalArr); }],
      ['oi3', 'money', 'DER', 'cumulativeOrderIntake', field('cumulativeOrderIntake')],
      ['servicesRatio', 'pct', 'IN', 'servicesRatio', field('servicesRatio')]
    ],
    partners: [
      ['region', 'text', 'PRE', 'name', region], ['name', 'text', 'IN', 'name', field('name')],
      ['channel', 'text', 'IN', 'channel', function (p) { return p.channel ? lookupName(TAP.data.lookups().channels, p.channel) : null; }],
      ['type', 'text', 'IN', 'type', partnerType],
      ['maturity', 'text', 'IN', 'maturity', maturity], ['expertiseGeo', 'text', 'IN', 'expertiseGeo', field('expertiseGeo')],
      ['expertiseProduct', 'text', 'IN', 'expertiseProduct', field('expertiseProduct')],
      ['fteSales', 'count', 'IN', 'fteSales', field('fteSales')], ['fteConsultants', 'count', 'IN', 'fteConsultants', field('fteConsultants')],
      ['fte', 'count', 'APP', 'fteSales', fte], ['centralSupportPct', 'pct', 'IN', 'centralSupportPct', field('centralSupportPct')],
      ['arr3', 'money', 'IN', 'arr', function (p) { return years3(p.arr); }],
      ['services3', 'money', 'IN', 'services', function (p) { return years3(p.services); }],
      ['distribution', 'money', 'DER', 'distribution', function (p) { return years3(p.distribution); }],
      // Three-year order intake per head (D61): only for partners with staff figures
      ['oiPerFte', 'money', 'APP', 'arr', function (p) {
        var f = fte(p), a = years3(p.arr), s = years3(p.services);
        if (f === 0) return NA;
        if (f == null || (!a && !s)) return null;
        return { v: ((a ? a.v : 0) + (s ? s.v : 0)) / f, partial: !a || !s || a.partial || s.partial };
      }],
      ['alsoNamed', 'text', 'APP', 'name', others('partners', 'name')]
    ]
  };
  // Multipliers such as 2.25 need two decimals to read as entered
  var DECIMALS = { multiplier3y: 2 };
  function spec(source, key) { return (COLS[source] || []).filter(function (c) { return c[0] === key; })[0] || null; }

  // Phase 4 columns a file may not have. A list shows one only when the file has it, so an earlier file reads as before.
  var OPTIONAL = { partners: {
    type: function () { return TAP.measures.kit4.lookup('partnerTypes').length > 0; },
    distribution: function () {
      return TAP.data.regions().some(function (r) { return (r.partners || []).some(function (p) { return Array.isArray(p.distribution); }); });
    }
  } };
  function optional(source, key) { return !!(OPTIONAL[SOURCE[source]] || {})[key]; }
  function shown(source, key) { var has = (OPTIONAL[source] || {})[key]; return !has || has(); }

  function columns(source) {
    if (extra(source)) return TAP.extra.columns(source);
    source = SOURCE[source];
    return (COLS[source] || []).filter(function (c) { return shown(source, c[0]); }).map(function (c) {
      var out = { key: c[0], unit: c[1], kind: c[2], label: t('rows.' + source + '.' + c[0]) };
      if (DECIMALS[c[0]]) out.decimals = DECIMALS[c[0]];
      return out;
    });
  }

  // The item a row reference names: a list entry, or {regionId, sourceRow} / {regionId, row} (a details item, whose
  // row is the entry's key).
  function find(source, row) {
    if (!row) return null;
    if (row.item) return row.item;
    var n = String(row.sourceRow != null ? row.sourceRow : row.row);
    return (keyed(row.regionId, source).filter(function (x) { return String(x.key) === n; })[0] || {}).it || null;
  }

  function src(source, regionId, fieldName, sourceRow, kind) {
    return { regionId: regionId, section: SECTION[source], field: fieldName, row: sourceRow, rows: [sourceRow], year: null, cell: null, kind: kind };
  }
  // The whole row's source: its name column, so the address names the file, sheet and row.
  function rowSrc(source, regionId, sourceRow) {
    if (extra(source)) return TAP.extra.rowSrc(source, regionId, sourceRow);
    source = SOURCE[source];
    return src(source, regionId, NAME_FIELD[source], sourceRow, 'IN');
  }

  // A full cell (ARCHITECTURE section 7) for one column of one row.
  function cell(source, key, row) {
    if (extra(source)) return TAP.extra.cell(source, key, row);
    source = SOURCE[source];
    var c = spec(source, key), it = find(source, row), n = it ? it.sourceRow : (row && (row.sourceRow != null ? row.sourceRow : row.row));
    var s = src(source, row && row.regionId, c ? c[3] : key, n, c ? c[2] : 'IN'), y = /^growthY(\d)$/.exec(key);
    if (y) s.year = +y[1];   // one plan year of a field held by year: its own cell (section 7)
    if (!c || !it) return { v: null, state: 'notProvided', kind: s.kind, src: s };
    var v = c[4](it, row.regionId);
    if (v === NA) return { v: null, state: 'notApplicable', kind: c[2], src: s };
    var out = { v: null, state: 'notProvided', kind: c[2], src: s };
    if (v && typeof v === 'object') {
      if (v.regionIds) out.regionIds = v.regionIds;
      if (v.rank != null) out.rank = v.rank;   // what a list sorts the column by, in place of the text
      if (v.partial) { out.partial = true; out.note = t('measures.partialYears'); }
      v = v.v;
    }
    if (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) return { v: null, state: 'notProvided', kind: c[2], src: s };
    out.v = v;
    out.state = 'value';
    return out;
  }

  TAP.rows = { list: list, cell: cell, columns: columns, optional: optional, matchKey: matchKey, section: function (s) { return extra(s) ? s : SECTION[SOURCE[s]]; }, rowSrc: rowSrc };
})(window.TAP);
