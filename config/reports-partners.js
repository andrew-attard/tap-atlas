/*
 * File: config/reports-partners.js
 * Purpose: Report definitions for the Partners view.
 * Provides: adds to window.TAP_REPORTS
 * Depends on: config/reports.js (schema)
 * Used by: js/engine/registry.js, js/views/partners.js
 * Owner: CGP stream
 */
window.TAP_REPORTS = window.TAP_REPORTS || {};

(function () {
  'use strict';
  // The four channels as stacked parts of one recap figure (t: arr, services or oi), both motions.
  function channels(t) { return ['direct', 'partner', 'allianceA', 'allianceB'].map(function (c) { return 'rc.all.' + t + '.' + c; }); }

  // US-2.3.2: how much each plan relies on partners and alliances.
  window.TAP_REPORTS['pt-reliance'] = {
    id: 'pt-reliance',
    view: 'partners',
    title: 'How much does each plan rely on partners and alliances?',
    explain: {
      shows: 'Each region’s total order intake from the recap, new business and customer growth together, split by channel: direct, partner and the two alliances.',
      read: 'One bar per region. The channels are shades of the region’s colour, darkest for direct, each named in the legend. Break down by motion to see new business and customer growth apart, or by year.',
      lookFor: 'Plans that lean on partners or alliances much more or less than the others, and channels that grow from year to year.'
    },
    shape: 'parts',
    builder: null,
    dimension: 'entity',
    measures: [
      { id: 'rc.all.arr', label: 'ARR' },
      { id: 'rc.all.services', label: 'Services' },
      { id: 'rc.all.oi', label: 'Total order intake' }
    ],
    parts: { 'rc.all.arr': channels('arr'), 'rc.all.services': channels('services'), 'rc.all.oi': channels('oi') },
    defaultType: 'stacked100',
    types: ['stacked100', 'stackedBar', 'table'],
    breakdowns: ['motion', 'year'],
    sources: ['DER'],
    options: {}
  };
})();
