/*
 * File: js/core/data.js
 * Purpose: Checks the plan data file when the app opens, then gives every other part simple ways to read it.
 * Provides: TAP.data (load, plan, meta, lookups, regions, region, regionIndex, industries, industry, scale, row)
 * Depends on: js/core/namespace.js, js/core/check.js (the contract check), the data file (window.PLAN_DATA)
 * Used by: js/ui/app.js and every module that reads plan data: measures, scope, sources, format, insights, reports,
 *          panels, views
 */
(function (TAP) {
  'use strict';

  var plan = null;
  var index = {};   // region id -> position in file order (which also sets the region's colour)

  // Checks and installs a plan. Returns {ok, reason, errors, warnings}.
  // reason: 'missing' (no data file), 'version' (contract version differs), 'invalid' (errors that break views).
  function load(p) {
    p = p === undefined ? window.PLAN_DATA : p;
    plan = null;
    index = {};
    if (!p || typeof p !== 'object') return result(false, 'missing', [], []);

    var found = p.meta && p.meta.schemaVersion;
    if (String(found) !== TAP.schemaVersion) {
      return result(false, 'version', [{ path: 'meta.schemaVersion', expected: TAP.schemaVersion, found: found == null ? 'nothing' : found,
        message: 'meta.schemaVersion: expected "' + TAP.schemaVersion + '", found ' + JSON.stringify(found == null ? null : found) }], []);
    }

    var checked = { errors: [], warnings: [] };
    if (TAP.check && !TAP.check.__stub) {
      try {
        checked = TAP.check.run(p);
      } catch (e) {
        // A data file malformed enough to break the check itself still gets the error screen, not a blank page
        return result(false, 'invalid', [{ path: '(whole file)', expected: 'a file the check can read', found: e.message,
          message: 'The contract check could not read the data file: ' + e.message }], []);
      }
    }
    if (checked.errors.length) return result(false, 'invalid', checked.errors, checked.warnings);

    plan = p;
    (p.regions || []).forEach(function (r, i) { index[r.id] = i; });
    return result(true, null, [], checked.warnings);
  }

  function result(ok, reason, errors, warnings) {
    return { ok: ok, reason: reason, errors: errors || [], warnings: warnings || [] };
  }

  function need() {
    if (!plan) throw new Error('No plan data loaded. Call TAP.data.load() first.');
    return plan;
  }

  function regions() { return need().regions || []; }
  function region(id) { var i = regionIndex(id); return i < 0 ? null : regions()[i]; }
  function regionIndex(id) { return Object.prototype.hasOwnProperty.call(index, id) ? index[id] : -1; }

  // Industries from the lookups. {rated: true} leaves out rows the template never rates ("Other", "Unapplied industry").
  function industries(opts) {
    var list = (need().lookups && need().lookups.industries) || [];
    if (opts && opts.rated) list = list.filter(function (d) { return d.rated !== false; });
    return list;
  }
  function industry(id) {
    return industries().filter(function (d) { return d.id === id; })[0] || null;
  }

  // The three-level rating scale for a rating field, e.g. scale('expertise').
  function scale(field) {
    var s = need().lookups && need().lookups.scales;
    return (s && s[field]) || null;
  }

  // First row in a region's section matching the predicate (sections: marketCoverage, newBusiness, partners, recap,
  // and 'accounts' for customerGrowth.accounts).
  function row(regionId, section, pred) {
    var r = region(regionId);
    if (!r) return null;
    var list = section === 'accounts' ? (r.customerGrowth && r.customerGrowth.accounts) : r[section];
    return (list || []).filter(pred)[0] || null;
  }

  TAP.data = {
    load: load,
    plan: function () { return plan; },
    meta: function () { return need().meta; },
    lookups: function () { return need().lookups; },
    regions: regions, region: region, regionIndex: regionIndex,
    industries: industries, industry: industry, scale: scale, row: row
  };
})(window.TAP);
