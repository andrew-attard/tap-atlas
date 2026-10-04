/*
 * File: content/text-customers.js
 * Purpose: Wording for the Customer growth and Partners views.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: the matching js files
 * Owner: CGP stream. Placeholders in {braces} are filled in by the code; the organization layer can replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  // US-2.2.1: the Customer growth view
  customerView: {
    kicker: 'Customer growth',
    title: 'How will existing customers grow?',
    lead: 'How each region’s customer base is made up, the growth it assumes, and how much of that growth rests on a few accounts.',
    label: 'Customer growth reports'
  },

  // US-2.3.1: the Partners view
  partnerView: {
    kicker: 'Partners',
    title: 'Which partners carry each plan?',
    lead: 'How much each plan relies on partners and alliances, and the people the named partners have behind their planned contribution.',
    label: 'Partner reports'
  }
});
