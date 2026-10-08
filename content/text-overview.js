/*
 * File: content/text-overview.js
 * Purpose: Wording for the Overview: card lines, headline sentence templates and the top insights block (D119).
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
    // Region cards (US-1.5.1, D127; the split's swatches from D117). focus, tier, pool and customers are also the
    // profile's glance lines (US-2.4.2).
    cards: {
      title: 'Plans at a glance',
      hint: 'Select a card for that region’s details, or a figure for its source',
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
      figureTitle: '{label}: {value}. {kind}. Select to see where it comes from'
    },
    // Headline (US-1.5.3). {amb}, {nbShare}, {cgShare} and {n} in the Tier 2 sentence are figures, shown in
    // bold and listed with their sources behind the Sources button.
    // Tier 1 is set by group strategy, so the headline names the industry most often placed in Tier 2 instead.
    headline: {
      group: '{n} {regions} plan {amb} of new ARR over three years: {nbShare} from new business and {cgShare} from existing customers.',
      region: '{name} plans {amb} of new ARR over three years: {nbShare} from new business and {cgShare} from existing customers.',
      groupNbOnly: '{n} {regions} plan {amb} of new ARR over three years from new business; customer growth is not provided.',
      regionNbOnly: '{name} plans {amb} of new ARR over three years from new business; customer growth is not provided.',
      groupCgOnly: '{n} {regions} plan {amb} of new ARR over three years from existing customers; new business is not provided.',
      regionCgOnly: '{name} plans {amb} of new ARR over three years from existing customers; new business is not provided.',
      none: 'No ARR ambition is provided for the regions shown.',
      regionNone: 'No ARR ambition is provided for {name}.',
      cgMissing: 'Customer growth is not provided for {names}.',
      tier2: '{n} {regions} make {industry} a focus industry (Tier 2).',
      ambLabel: '3-year ARR ambition',
      nbShareLabel: 'Share from new business',
      cgShareLabel: 'Share from existing customers',
      tier2Label: 'Regions with {industry} in Tier 2',
      tierOf: 'Tier, {name}',
      sources: 'Sources',
      sourcesLabel: 'Where the figures in this sentence come from',
      sourcesTitle: 'Where the headline figures come from'
    },
    // Top insights for the organization as a whole (US-1.5.3, D119): insights naming 3 or more regions, or from a broad rule
    insights: {
      title: 'Top insights',
      intro: 'Findings that span the organization; region findings are on each view.',
      showMe: 'Show me',
      hide: 'Hide for this session'
    },
    // The side panel a figure opens
    source: {
      title: 'Where this figure comes from',
      combinedHow: 'How it was combined',
      regions: 'Regions included',
      note: 'Note'
    }
  }
});

