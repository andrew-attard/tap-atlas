/*
 * File: content/text-profile.js
 * Purpose: Wording for the Regions view (region picker and region profile).
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/views/regions.js, and the "Open profile" links in js/views/overview-cards.js and js/reports/details.js
 * Owner: PROFILE stream. Placeholders in {braces} are filled in by the code; the organization layer can replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  // US-2.4.1: the Regions view and its region picker
  profile: {
    openProfile: 'Open profile',
    openProfileFor: 'Open profile: {name}',
    pick: {
      kicker: 'Regions',
      title: 'Which region’s plan do you want to open?',
      lead: 'Each profile puts one region’s plan next to the average of the other regions, on one page.',
      label: 'Regions to pick from'
    },
    kicker: 'Region profile',
    lead: '{sentence}, on this page only.',
    picker: 'Region',
    reports: 'Reports for {name} against the average of the other regions'
  }
});
