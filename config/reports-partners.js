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

  // US-2.3.3: partner capacity against planned contribution, one bubble per partner.
  window.TAP_REPORTS['pt-capacity'] = {
    id: 'pt-capacity',
    view: 'partners',
    title: 'Do the partners have the people behind their planned contribution?',
    explain: {
      shows: 'Every named partner: its sales and consultant staff (full-time equivalent) across, the ARR it is planned to bring over three years up, and its three-year services as the bubble size.',
      read: 'Each bubble is one partner in its region’s colour, named beside it or numbered in the key. Partners with no staff figures can’t be placed and are named below the chart. Click a bubble for the partner’s details, including order intake per person, which this app calculates.',
      lookFor: 'Partners high on the chart and far to the left: a large planned contribution from few people, worth discussing with the region.'
    },
    shape: 'xyz',
    builder: 'rowBubble',
    dimension: 'entity',
    rows: 'partners',
    measures: [],
    x: 'fte',
    y: 'arr3',
    size: { options: ['services3'], default: 'services3' },
    defaultType: 'bubble',
    types: ['bubble', 'table'],
    breakdowns: [],
    sources: ['IN', 'APP'],
    options: { label: 'all' }
  };
})();
