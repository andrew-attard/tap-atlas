/*
 * File: content/text-overview.js
 * Purpose: Wording for the Overview: card lines and headline sentence templates.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/views/overview*.js
 * Owner: the OVERVIEW stream. Placeholders in {braces} are filled in by the code; the organization layer can
 *        replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  overview: {
    title: 'Overview',
    // Region cards (US-1.5.1)
    cards: {
      title: 'Plans at a glance',
      hint: 'Select a card for that region’s details, or a figure for its source',
      hintCombined: 'Select a figure for its source',
      ambition: '3-year ambition (ARR)',
      nb: 'New business',
      cg: 'Customer growth',
      services: 'Services',
      focus: 'Focus',
      tier: 'Tier {n}',
      pool: 'New business pool',
      targetAccounts: 'target accounts',
      customers: 'Customers',
      partial: 'Partial: {note}',
      kickerFocus: 'Focus region',
      kickerSecond: 'Compared with',
      kickerCombined: '◇ Calculated by this app',
      openDetails: '{name}: open details',
      openSources: '{name}: where each figure comes from',
      figureTitle: '{label}: {value}. {kind}. Source: {where}',
      shareLabel: 'Share of the 3-year ARR ambition'
    },
    // The side panel a figure opens
    source: {
      title: 'Where this figure comes from',
      cardTitle: 'Where these figures come from',
      combinedHow: 'How it was combined',
      regions: 'Regions included',
      note: 'Note'
    }
  }
});
