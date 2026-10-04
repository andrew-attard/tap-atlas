/*
 * File: config/reports-newbusiness.js
 * Purpose: Report definitions for the New business view (Epic 2.1). The recurring themes report (nb-themes) is
 *          defined in config/reports-themes.js.
 * Provides: adds to window.TAP_REPORTS (nb-industries)
 * Depends on: config/reports.js (schema), js/engine/measures.js and measures-p2.js (loaded before, see below)
 * Used by: js/engine/registry.js, js/views/new-business.js
 * Owner: NB stream
 */
window.TAP_REPORTS = window.TAP_REPORTS || {};

(function () {
  // Until the Phase 2 measures are on main (#196), the definitions offer only what the catalogue already has.
  // The measure files load before this one, so this reads the catalogue as it is. Remove once #196 lands.
  var M = window.TAP && window.TAP.measures;
  function known(id) { return !M || !M.meta || !!M.meta(id); }

  // US-2.1.2: new business by region and industry, with each region's tier.
  window.TAP_REPORTS['nb-industries'] = {
    id: 'nb-industries',
    view: 'newBusiness',
    title: 'Which industries does each region’s new business rest on?',
    explain: {
      shows: 'Each region’s new business potential by industry, from the rows leaders filled in. Only industries with new business in at least one region are listed.',
      read: 'Regions run across and industries down. Each cell shows the value, shaded stronger for larger values, and the region’s tier for that industry (T1 or T2). A dashed cell means rows were filled in without a usable figure.',
      lookFor: 'Whether the money sits in the industries each region calls Tier 1, and industries that carry several regions’ plans.'
    },
    shape: 'grid',
    builder: 'nbGrid',
    dimension: 'industry',
    measures: [{ id: 'ind.nb.arr', label: 'ARR' }, { id: 'ind.nb.services', label: 'Services' }, { id: 'ind.nb.oi', label: 'Total order intake' }]
      .filter(function (m) { return known(m.id); }),
    defaultType: 'heatmap',
    types: ['heatmap'].concat(known('nb.arr.tier1') ? ['stackedBar'] : []).concat(['table']),
    breakdowns: ['year'],
    sources: ['DER', 'IN'],
    options: {}
  };
})();
