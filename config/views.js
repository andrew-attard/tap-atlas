/*
 * File: config/views.js
 * Purpose: Lists the views in menu order and the reports each view shows.
 * Provides: window.TAP_VIEWS
 * Depends on: nothing
 * Used by: js/engine/registry.js (TAP.views, TAP.reports.list), js/ui/shell.js (menu)
 *
 * A view is a list of report ids (US-1.2.1). Views from later phases are added here once built.
 */
window.TAP_VIEWS = {
  order: ['overview', 'industry', 'insights', 'guide'],
  overview: { title: 'Overview', reports: ['ov-ambition'] },
  industry: { title: 'Industry priorities', reports: ['ind-tiers', 'ind-quad', 'ind-ratings'] },
  insights: { title: 'Insights', reports: [] },
  guide: { title: 'Guide', reports: [] }
};
