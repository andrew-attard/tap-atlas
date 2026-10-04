/*
 * File: config/reports-customers.js
 * Purpose: Report definitions for the Customer growth view.
 * Provides: adds to window.TAP_REPORTS
 * Depends on: config/reports.js (schema)
 * Used by: js/engine/registry.js, js/views/customers.js
 * Owner: CGP stream
 */
window.TAP_REPORTS = window.TAP_REPORTS || {};

(function () {
  'use strict';
  // The four segments, always in this order (US-2.2.2), as part measures for one figure: accounts, arr or oi.
  function segParts(v) { return ['strategic', 'growth', 'core', 'scaled'].map(function (s) { return 'cg.seg.' + s + '.' + v; }); }

  // US-2.2.2: how each region's customer base is segmented.
  window.TAP_REPORTS['cg-segments'] = {
    id: 'cg-segments',
    view: 'customers',
    title: 'How is each region’s customer base segmented?',
    explain: {
      shows: 'Each region’s accounts split into the four segments, Strategic, Growth, Core and Scaled, counted as accounts, current ARR or three-year order intake.',
      read: 'One bar per region, darkest for Strategic and lightest for Scaled, each segment named in the legend. Segments come from the workbook, and each region sets its own thresholds: click a bar to see them.',
      lookFor: 'Regions whose base leans on one segment, and segments whose share of order intake is far from their share of accounts.'
    },
    shape: 'parts',
    builder: 'cgSegments',
    dimension: 'entity',
    measures: [
      { id: 'cg.accounts', label: 'Accounts' },
      { id: 'cg.currentArr', label: 'Current ARR' },
      { id: 'cg.oi3', label: 'Three-year order intake' }
    ],
    parts: { 'cg.accounts': segParts('accounts'), 'cg.currentArr': segParts('arr'), 'cg.oi3': segParts('oi') },
    defaultType: 'stacked100',
    types: ['stacked100', 'stackedBar', 'table'],
    breakdowns: ['risk'],
    sources: ['DER', 'PRE'],
    options: {}
  };

  // US-2.2.3: the yearly growth each region assumes for its existing customers.
  window.TAP_REPORTS['cg-growth'] = {
    id: 'cg-growth',
    view: 'customers',
    title: 'What growth does each region assume for existing customers?',
    explain: {
      shows: 'The growth each region plans for its existing customers in each plan year: the incremental ARR the workbook calculated, divided by the accounts’ current ARR.',
      read: 'One group of bars per region, one bar per plan year. Combined figures are weighted by current ARR, so larger customer bases count for more. Accounts planned with a three-year multiplier count through their yearly increments, and a note says how many there are.',
      lookFor: 'Regions far above or below the others, years where growth steps up or down, and segments that carry most of a region’s growth.'
    },
    shape: 'compare',
    builder: 'cgGrowth',
    dimension: 'entity',
    measures: [
      { id: 'cg.growth.all', label: 'All accounts' },
      { id: 'cg.growth.strategic', label: 'Strategic accounts' },
      { id: 'cg.growth.growth', label: 'Growth accounts' },
      { id: 'cg.growth.core', label: 'Core accounts' },
      { id: 'cg.growth.scaled', label: 'Scaled accounts' }
    ],
    defaultType: 'groupedBar',
    types: ['groupedBar', 'dot', 'table'],
    breakdowns: ['year'],
    defaultBreakdown: 'year',
    sources: ['APP', 'DER', 'PRE'],
    options: {}
  };
})();
