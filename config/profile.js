/*
 * File: config/profile.js
 * Purpose: The reports shown on a region profile, in order (US-2.4.3). Configuration, not code.
 * Provides: window.TAP_PROFILE
 * Depends on: nothing
 * Used by: js/views/regions.js
 * Owner: PROFILE stream
 *
 * reports: the rows of the page, each a list of one or two report ids (at most two side by side, D24). Every report
 * shows the region against the average of the other regions. A report not defined yet is left out, so the page
 * works while other views are still being built.
 */
window.TAP_PROFILE = window.TAP_PROFILE || {};
window.TAP_PROFILE.reports = [
  ['ind-tiers', 'ind-quad'],              // how the region rates its industries: tiers, attractiveness vs ability
  ['ov-ambition', 'cg-segments'],         // ambition by region, segment mix
  ['nb-industries', 'nb-channels'],       // where new business comes from: industries and channels
  ['nb-levers', 'pt-reliance']            // the new business levers, partner reliance
];
