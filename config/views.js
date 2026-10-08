/*
 * File: config/views.js
 * Purpose: Lists the views in the menu's three groups, the menu order that follows from them, and the reports each
 *          view shows.
 * Provides: window.TAP_VIEWS
 * Depends on: nothing
 * Used by: js/engine/registry.js (TAP.views, TAP.reports.list), js/ui/shell.js (menu)
 *
 * A view is a list of report ids (US-1.2.1). The Phase 2 views and report ids are fixed in docs/ARCHITECTURE.md
 * section 17; a view still being built may list reports that don't exist yet.
 */
window.TAP_VIEWS = {
  // The menu in three groups, left to right (D115): start points, the plan's data views, then tools. Every view
  // is in exactly one group; `order` below is made from them, so the number keys follow the screen too.
  groups: {
    start: ['overview', 'regions'],
    data: ['industry', 'newBusiness', 'customers', 'partners', 'outlook', 'other'],
    tools: ['insights', 'build', 'guide']
  },
  // broadOnly: the Overview shows only insights for the organization as a whole (D119)
  overview: { title: 'Overview', reports: ['ov-ambition'], broadOnly: true },
  industry: { title: 'Market coverage', reports: ['ind-tiers', 'ind-quad', 'ind-ratings'] },
  newBusiness: { title: 'New business', reports: ['nb-industries', 'nb-solutions', 'nb-channels', 'nb-levers', 'nb-rows', 'nb-themes'] },
  customers: { title: 'Customer growth', reports: ['cg-segments', 'cg-growth', 'cg-exposure', 'cg-bubble', 'cg-accounts'] },
  partners: { title: 'Partners', reports: ['pt-reliance', 'pt-capacity', 'pt-books', 'pt-routes', 'pt-maturity', 'pt-list'] },
  // Outlook (Phase 4, docs/ARCHITECTURE.md section 19.3): the plans against the strategic plan and the base year
  outlook: { title: 'Outlook', reports: ['ol-strategic', 'ol-baseyear', 'ol-coverage', 'ol-revenue', 'ol-revshare', 'ol-category'] },
  // The profile's reports are listed in config/profile.js; it shows existing reports for one region
  // Other sections (US-3.2.2) shows only when the data has extra sections; its lists are built from the data
  other: { title: 'Other sections', reports: [] },
  regions: { title: 'Regions', reports: [] },
  insights: { title: 'Insights', reports: [] },
  // Build a chart (US-3.5.1) has its own menu item beside the Guide (D96); its charts are built at run time
  build: { title: 'Build a chart', reports: [] },
  guide: { title: 'Guide', reports: [] }
};
// The menu order: the groups one after the other, in the order they are listed. Tests may change this list in
// place and put it back.
window.TAP_VIEWS.order = Object.keys(window.TAP_VIEWS.groups).reduce(function (all, g) {
  return all.concat(window.TAP_VIEWS.groups[g]);
}, []);
