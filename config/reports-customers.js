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
      read: 'One bar per region, each segment in its own colour, the same in every bar and named in the legend; Amount or Share of total switches between the figures and each segment’s share. Segments come from the workbook, and each region sets its own thresholds: click a bar to see them. With one region, break it down by risk level to see how much of each segment is flagged.',
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
    options: { partColors: 'segment', amountShare: true }   // D131: segment colours and the Amount / Share switch
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

  // US-2.2.4: which accounts carry the planned growth, one bubble per account.
  window.TAP_REPORTS['cg-bubble'] = {
    id: 'cg-bubble',
    view: 'customers',
    title: 'Which accounts carry each region’s planned growth?',
    explain: {
      shows: 'The accounts that carry the planned growth: current ARR across, the incremental ARR planned over three years up, and three-year order intake as the bubble size.',
      read: 'With several regions, each region’s 5 accounts with the most planned growth, in its colour; the list below has every account. With one region, every account, coloured by its risk level. The accounts with the largest planned growth are named with the name the data holds. Click a bubble for the account’s details and source row.',
      lookFor: 'Growth that rests on a few large accounts growing a little, or on small accounts growing a lot.'
    },
    shape: 'xyz',
    builder: 'rowBubble',
    dimension: 'entity',
    rows: 'accounts',
    measures: [],
    x: 'currentArr',
    y: 'incr3',
    size: { options: ['oi3'], default: 'oi3' },
    defaultType: 'bubble',
    types: ['bubble', 'table'],
    breakdowns: [],
    sources: ['PRE', 'DER'],
    // D133: topPerRegion accounts per region (or combined group) with several regions; with one, every account by risk level
    options: { label: 'top', labelBy: 'incr3', topPerRegion: 5, oneRegionColors: 'risk' }
  };

  // US-2.2.6: every account in the plans, as a sortable list.
  window.TAP_REPORTS['cg-accounts'] = {
    id: 'cg-accounts',
    view: 'customers',
    title: 'Which accounts are in each region’s plan?',
    explain: {
      shows: 'Every account in the customer growth plans, with its segment, risk flag, current ARR, planned growth and order intake.',
      read: 'One row per account, with the name the data holds. Sort by any column, filter by segment or risk level, and click a row for the account’s details and source row. Accounts planned with a three-year multiplier show it in place of growth per year.',
      lookFor: 'The accounts behind a chart: the largest planned increments, flagged accounts and multiplier accounts.'
    },
    shape: 'list',
    builder: 'list',
    dimension: 'entity',
    rows: 'accounts',
    columns: [
      { key: 'region' }, { key: 'name' }, { key: 'industry' }, { key: 'country' }, { key: 'productLine' }, { key: 'segment' },
      { key: 'riskLevel' }, { key: 'currentArr' }, { key: 'growthY1' }, { key: 'growthY2' }, { key: 'growthY3' },
      { key: 'multiplier3y' }, { key: 'incr3' }, { key: 'oi3' }
    ],
    sort: { key: 'incr3', dir: 'desc' },
    filter: [{ key: 'segment', label: 'Segments', multi: true }, { key: 'riskLevel', label: 'Risk', multi: true }],   // D134: dropdowns
    defaultType: 'list',
    types: ['list'],
    breakdowns: [],
    sources: ['IN', 'PRE', 'DER'],
    options: {}
  };

  // US-2.2.5: how much of the planned growth sits in a few accounts, or in accounts flagged at risk.
  window.TAP_REPORTS['cg-exposure'] = {
    id: 'cg-exposure',
    view: 'customers',
    title: 'How concentrated or exposed is planned customer growth?',
    explain: {
      shows: 'The share of each region’s three-year incremental ARR that sits in its three largest growth accounts, or in accounts flagged high or medium risk.',
      read: 'One bar per region, with the share written on it. The line marks the level at which an insight is raised. Combined figures are worked out over the combined accounts, so the organization’s top 3 are the three largest across all regions. Click a bar to list the accounts behind it.',
      lookFor: 'Regions where a few accounts or flagged accounts carry much of the planned growth, worth discussing before the plan is final.'
    },
    shape: 'compare',
    builder: 'cgExposure',
    dimension: 'entity',
    measures: [
      { id: 'cg.top3Share', label: 'Share in top 3 accounts' },
      { id: 'cg.riskShare', label: 'Share in high or medium risk accounts' }
    ],
    defaultType: 'bar',
    types: ['bar', 'dot', 'table'],
    breakdowns: [],
    sources: ['APP', 'DER', 'PRE'],
    // The reference line for each measure is the threshold of its insight rule (US-1.7.8), read when drawn
    options: { thresholds: { 'cg.top3Share': { rule: 'concentration', param: 'share' }, 'cg.riskShare': { rule: 'atRisk', param: 'share' } } }
  };
})();
