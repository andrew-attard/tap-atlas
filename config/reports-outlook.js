/*
 * File: config/reports-outlook.js
 * Purpose: Report definitions for the Outlook view (ids in docs/ARCHITECTURE.md section 19.3). Schema: config/reports.js.
 * Provides: adds to window.TAP_REPORTS
 * Depends on: config/reports.js, js/reports/outlook-side.js (builder olSide)
 * Used by: js/engine/registry.js, js/views/outlook.js
 * Owner: OUTLOOK stream (#441)
 */
window.TAP_REPORTS = window.TAP_REPORTS || {};

(function () {
  'use strict';

  // US-4.2.2: each plan against its strategic plan. The measure switch picks the type (the whole plan, or one
  // product category); the bars are the strategic plan and the plan on its basis, with the variance written after them.
  window.TAP_REPORTS['ol-strategic'] = {
    id: 'ol-strategic',
    view: 'outlook',
    title: 'How does each plan compare with its strategic plan?',
    explain: {
      shows: 'Each region’s planned order intake through the organization’s books next to the order intake its strategic plan sets, for the three plan years together or year by year, and the difference between the two in money and in percent.',
      read: 'Two bars per region: the lighter one is the strategic plan, the darker one the plan, and the variance is written after them, plan minus strategic plan. The plan is read on the strategic plan’s basis: the same years and product categories, so a year or category the strategic plan leaves blank is left out of the plan too. Switch between the whole plan, ARR, services, software perpetual and hardware, or break the figures down by plan year or product category. The organization total compares the sum of the plans with the sum of the strategic plans, and its table gives each region’s share of the gap.',
      lookFor: 'Plans well below or well above their strategic plan, and years or categories where the difference sits. A region without a strategic plan reads "not provided" and is left out of the combined variance, which the note under the chart says.'
    },
    shape: 'compare',
    builder: 'olSide',
    dimension: 'entity',
    measures: [
      { id: 'sp.oi', label: 'Order intake' },
      { id: 'sp.arr', label: 'ARR' },
      { id: 'sp.services', label: 'Services' },
      { id: 'sp.swPerpetual', label: 'Software perpetual' },
      { id: 'sp.hardware', label: 'Hardware' }
    ],
    defaultType: 'bar',
    types: ['bar', 'table'],
    breakdowns: ['year', 'category'],
    sources: ['PRE', 'DER', 'APP'],
    options: {
      side: {
        bars: [{ id: 'sp.oi', label: 'Strategic plan' }, { id: 'sp.plan', label: 'Plan' }],
        end: { label: 'Variance', amount: 'sp.variance', rate: 'sp.variancePct', signed: true },
        // The product category each type measure stands for; every figure of the row is read for that category
        category: { 'sp.arr': 'recurring', 'sp.services': 'services', 'sp.swPerpetual': 'swPerpetual', 'sp.hardware': 'hardware' },
        share: { of: 'sp.variance', label: 'Share of the gap' }
      }
    }
  };
})();
