/*
 * File: config/views.js
 * Purpose: Lists the views in menu order and the reports each view shows.
 * Provides: window.TAP_VIEWS
 * Depends on: nothing
 * Used by: js/engine/registry.js (TAP.views, TAP.reports.list), js/ui/shell.js (menu)
 *
 * A view is a list of report ids (US-1.2.1). The Phase 2 views and report ids are fixed in docs/ARCHITECTURE.md
 * section 17; a view still being built may list reports that don't exist yet.
 */
window.TAP_VIEWS = {
  // 'outlook' joins the order after 'partners' when its view is built (Phase 4, section 19.3)
  order: ['overview', 'industry', 'newBusiness', 'customers', 'partners', 'other', 'regions', 'insights', 'guide'],
  overview: { title: 'Overview', reports: ['ov-ambition'] },
  industry: { title: 'Industry priorities', reports: ['ind-tiers', 'ind-quad', 'ind-ratings'] },
  newBusiness: { title: 'New business', reports: ['nb-industries', 'nb-solutions', 'nb-channels', 'nb-levers', 'nb-rows', 'nb-themes'] },
  customers: { title: 'Customer growth', reports: ['cg-segments', 'cg-growth', 'cg-exposure', 'cg-bubble', 'cg-accounts'] },
  partners: { title: 'Partners', reports: ['pt-reliance', 'pt-capacity', 'pt-books', 'pt-list'] },
  // Outlook (Phase 4, docs/ARCHITECTURE.md section 19.3): the plans against the strategic plan and the base year
  outlook: { title: 'Outlook', reports: ['ol-strategic', 'ol-baseyear', 'ol-coverage', 'ol-revenue', 'ol-revshare', 'ol-category'] },
  // The profile's reports are listed in config/profile.js; it shows existing reports for one region
  // Other sections (US-3.2.2) shows only when the data has extra sections; its lists are built from the data
  other: { title: 'Other sections', reports: [] },
  regions: { title: 'Regions', reports: [] },
  insights: { title: 'Insights', reports: [] },
  guide: { title: 'Guide', reports: [] }
};
