/*
 * File: config/reports-newbusiness.js
 * Purpose: Report definitions for the New business view (Epic 2.1). The recurring themes report (nb-themes) is
 *          defined in config/reports-themes.js.
 * Provides: adds to window.TAP_REPORTS (nb-industries, nb-channels, nb-levers)
 * Depends on: config/reports.js (schema); measure ids from js/engine/measures.js, scores.js and measures-p2.js
 * Used by: js/engine/registry.js, js/views/new-business.js
 * Owner: NB stream
 */
window.TAP_REPORTS = window.TAP_REPORTS || {};

(function () {
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
    measures: [{ id: 'ind.nb.arr', label: 'ARR' }, { id: 'ind.nb.services', label: 'Services' }, { id: 'ind.nb.oi', label: 'Total order intake' }],
    defaultType: 'heatmap',
    types: ['heatmap', 'stackedBar', 'table'],
    breakdowns: ['year'],
    sources: ['DER', 'IN'],
    options: {}
  };

  // US-2.1.3: new business order intake by channel, from the template's own recap (D55), never from the row splits.
  var CH = ['direct', 'partner', 'allianceA', 'allianceB'];
  function byChannel(id) { return CH.map(function (c) { return id + '.' + c; }); }
  window.TAP_REPORTS['nb-channels'] = {
    id: 'nb-channels',
    view: 'newBusiness',
    title: 'Which channels carry each region’s new business?',
    explain: {
      shows: 'Each region’s new business order intake by channel (direct, partner and the two alliances), as the template’s recap adds it up. Customer growth is left out.',
      read: 'One bar per region, its channels as shades of the region’s colour and named in the legend. The 100% view compares the mix. Services by channel can differ slightly from services potential elsewhere: the recap moves part of direct services to partners, by the template’s outsourcing percentage.',
      lookFor: 'How much each plan relies on direct sales, partners and alliances, and regions whose mix sits apart from the others.'
    },
    shape: 'parts',
    builder: null,
    dimension: 'entity',
    measures: [{ id: 'rc.nb.arr', label: 'ARR' }, { id: 'rc.nb.services', label: 'Services' }, { id: 'rc.nb.oi', label: 'Total order intake' }],
    parts: { 'rc.nb.arr': byChannel('rc.nb.arr'), 'rc.nb.services': byChannel('rc.nb.services'), 'rc.nb.oi': byChannel('rc.nb.oi') },
    defaultType: 'stackedBar',
    types: ['stackedBar', 'stacked100', 'table'],
    breakdowns: ['year'],
    sources: ['DER'],
    options: {}
  };

  // US-2.1.4: the assumptions each region's new business number is built from. Rates combine with the catalogue
  // weights (config/settings.js), so the figures match the insights.
  window.TAP_REPORTS['nb-levers'] = {
    id: 'nb-levers',
    view: 'newBusiness',
    title: 'How does each region build its new business number?',
    explain: {
      shows: 'The assumptions behind each region’s new business number: how many target accounts, the hit rate, the average deal size, the wins they imply, and the growth planned for years 2 and 3.',
      read: 'One bar per region in its own colour; switch the lever above the chart. Expected wins are target accounts times hit rate. Combined figures add up counts and weight rates: hit rate by target accounts, deal size by expected wins, growth by new business ARR potential. The bubble view places regions by target accounts (across) and hit rate (up), sized by average deal size.',
      lookFor: 'Whether a plan rests on many targets, a high hit rate, large deals or steep growth, and regions that sit apart from the others on one lever.'
    },
    shape: 'compare',
    builder: 'nbLevers',
    dimension: 'entity',
    measures: [
      { id: 'nb.targetAccounts', label: 'Target accounts' },
      { id: 'nb.hitRate', label: 'Hit rate' },
      { id: 'nb.avgDealSize', label: 'Average deal size' },
      { id: 'nb.wins', label: 'Expected wins' },
      { id: 'nb.growthY2', label: 'Year 2 growth' },
      { id: 'nb.growthY3', label: 'Year 3 growth' }
    ],
    x: 'nb.targetAccounts',
    y: 'nb.hitRate',
    size: { options: ['nb.avgDealSize'], default: 'nb.avgDealSize' },
    defaultType: 'bar',
    types: ['bar', 'dot', 'bubble', 'table'],
    breakdowns: ['industry'],
    sources: ['IN', 'APP'],
    options: {}
  };
})();
