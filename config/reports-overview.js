/*
 * File: config/reports-overview.js
 * Purpose: Report definitions for the Overview view.
 * Provides: adds to window.TAP_REPORTS
 * Depends on: config/reports.js (the schema)
 * Used by: js/engine/registry.js, js/views/overview.js
 */
window.TAP_REPORTS = window.TAP_REPORTS || {};

// US-1.5.2: ambition by region, split into new business and customer growth.
window.TAP_REPORTS['ov-ambition'] = {
  id: 'ov-ambition',
  view: 'overview',
  title: 'How big is each region’s plan, and where does it come from?',
  explain: {
    shows: 'Each region’s planned new ARR over the three plan years, split into new business and growth from existing customers.',
    read: 'Longer bars mean a larger plan. The darker part is new business; the lighter part is growth from existing customers.',
    lookFor: 'How plans compare in size, and whether a region leans on new customers or on the ones it already has.'
  },
  shape: 'parts',
  builder: null,
  dimension: 'entity',
  measures: [
    { id: 'amb.arr', label: 'ARR' },
    { id: 'amb.services', label: 'Services' },
    { id: 'amb.oi', label: 'Total order intake' }
  ],
  parts: {
    'amb.arr': ['nb.arr', 'cg.arr'],
    'amb.services': ['nb.services', 'cg.services'],
    'amb.oi': ['nb.arr', 'cg.arr', 'nb.services', 'cg.services']
  },
  x: 'nb.arr',      // bubble option: new business across, customer growth up, size = current ARR
  y: 'cg.arr',
  size: { options: ['base.arr'], default: 'base.arr' },
  defaultType: 'stackedBar',
  types: ['stackedBar', 'stacked100', 'treemap', 'bubble', 'table'],
  breakdowns: ['year'],
  sources: ['DER', 'PRE'],
  options: {}
};
