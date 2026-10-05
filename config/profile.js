/*
 * File: config/profile.js
 * Purpose: The reports shown on a region profile, in order (US-2.4.3). Configuration, not code.
 * Provides: window.TAP_PROFILE
 * Depends on: nothing
 * Used by: js/views/regions.js
 * Owner: PROFILE stream; the Outlook row PAGES4 (US-4.6.3)
 *
 * reports: the rows of the page, each a list of one or two report ids (at most two side by side, D24). Every report
 * shows the region against the average of the other regions. A report not defined yet is left out, so the page
 * works while other views are still being built.
 */
window.TAP_PROFILE = window.TAP_PROFILE || {};
window.TAP_PROFILE.reports = [
  ['ind-tiers'],                          // how the region rates its industries: tiers (a wide grid, full width)
  ['ind-quad', 'ov-ambition'],            // attractiveness vs ability; ambition by region
  ['nb-industries'],                      // where new business comes from: industries (a wide grid, full width)
  ['nb-channels', 'nb-levers'],           // new business channels and levers
  ['cg-segments', 'pt-reliance'],         // segment mix, partner reliance
  ['ol-strategic', 'ol-revenue']          // against the strategic plan; the revenue outlook (Outlook view, US-4.6.3)
];
