/*
 * File: config/reports-newbusiness.js
 * Purpose: Report definitions for the New business view (Epic 2.1). The recurring themes report (nb-themes) is
 *          defined in config/reports-themes.js.
 * Provides: adds to window.TAP_REPORTS (nb-industries, nb-solutions, nb-channels, nb-rows, nb-levers)
 * Depends on: config/reports.js (schema); measure ids from js/engine/measures.js, scores.js, measures-p2.js and
 *             measures-p4b.js; builder 'dimStack' (js/reports/dim-stack.js)
 * Used by: js/engine/registry.js, js/views/new-business.js
 * Owner: NB stream; nb-solutions: NBPT stream (#449)
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
    // A cell opens that region's rows for the industry in the same panel (US-2.7.1); without drill-down, its details
    drill: { next: 'nb-rows', label: 'Sub-industries and markets', rootLabel: 'Industries by region' },
    options: {}
  };

  // US-4.4.1: new business by solution, from the solution each row names. Rows that name none are counted under
  // "No solution named" (the engine's "none" value), so the parts always add up to the region's new business.
  window.TAP_REPORTS['nb-solutions'] = {
    id: 'nb-solutions',
    view: 'newBusiness',
    title: 'Which solutions does each region’s new business rest on?',
    explain: {
      shows: 'Each region’s new business potential by solution, from the solution each row of the New Business sheet names. Rows that name no solution are counted under “No solution named”, so the solutions always add up to the region’s new business.',
      read: 'Solutions run down and regions across. Each cell shows the value, shaded stronger for larger values, and the last line is each region’s total. The stacked bars show the same figures as one bar per region, each part numbered as in the key. Select a cell or a part to see that region’s rows for the solution. A region that has not filled in the solution column reads “not provided”.',
      lookFor: 'Plans that rest mostly on one solution, solutions that carry several regions’ plans, and how much is planned with no solution named.'
    },
    shape: 'grid',
    builder: 'dimStack',
    dimension: 'entity',
    measures: [{ id: 'nb.arr.sol', label: 'ARR' }, { id: 'nb.services.sol', label: 'Services' }, { id: 'nb.oi.sol', label: 'Total order intake' }],
    defaultType: 'heatmap',
    types: ['heatmap', 'stackedBar', 'table'],
    breakdowns: ['year'],
    sources: ['DER', 'IN'],
    // A cell or a part opens that region's rows for the solution in the same panel (US-2.7.1)
    drill: { next: 'nb-rows', label: 'Sub-industries and markets', rootLabel: 'Solutions by region' },
    options: { by: 'solution' }
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

  // US-2.1.5: every sub-industry and market each region is targeting, one row per new business row (17.4).
  // "Also targeted by" matches sub-industry names on exact text, ignoring case and spacing only.
  window.TAP_REPORTS['nb-rows'] = {
    id: 'nb-rows',
    view: 'newBusiness',
    title: 'Where exactly is each region looking?',
    explain: {
      shows: 'Every sub-industry and market each region targets, with its industry, tier, target accounts and three-year ARR potential, one row per line of the New Business sheet.',
      read: 'Sorted by industry, then by ARR potential, highest first; click a heading to sort by it, and pick an industry to keep only its rows. “Also targeted by” names the other regions that wrote the same sub-industry, matched on the exact words, ignoring case and spacing, so near-duplicates are not matched. The last column gives the row each line comes from.',
      lookFor: 'Where regions hunt in the same sub-industry, and where one region looks somewhere no other region does.'
    },
    shape: 'list',
    builder: null,
    defaultType: 'list',
    types: ['list'],
    rows: 'newBusiness',
    columns: [{ key: 'region' }, { key: 'industry' }, { key: 'tier' }, { key: 'subVertical' }, { key: 'market' },
      { key: 'targetAccounts' }, { key: 'arr3' }, { key: 'alsoTargeted' }],
    sort: [{ key: 'industry', dir: 'asc' }, { key: 'arr3', dir: 'desc' }],
    filter: [{ key: 'industry' }],
    sources: ['IN', 'DER', 'APP'],
    breakdowns: [],
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
    breakdowns: ['industry', 'solution'],   // solution: Phase 4 (US-4.4.3); offered once rows name one
    sources: ['IN', 'APP'],
    options: {}
  };
})();
