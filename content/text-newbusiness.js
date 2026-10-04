/*
 * File: content/text-newbusiness.js
 * Purpose: Wording for the New business view: its header, the industry grid and the success factors panel.
 * Provides: adds to window.TAP_CONTENT.text (keys nbView, nbGrid, nbFactors)
 * Depends on: content/ui-text.js
 * Used by: js/views/new-business.js, js/reports/nb-grid.js
 * Owner: NB stream. Placeholders in {braces} are filled in by the code; the organization layer can replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  // US-2.1.1: the view header
  nbView: {
    kicker: 'New business',
    title: 'Where will new business come from?',
    lead: 'The industries and channels each region’s new business rests on, the assumptions behind the number, and where exactly each region is looking.'
  },

  // US-2.1.2: the industry grid
  nbGrid: {
    corner: 'Industry',
    tierColumn: 'Tier',
    tierShort: 'T{tier}',
    tierPart: 'Tier {tier} industries',
    notApplicable: 'not applicable',
    cellAria: '{region}, {industry}: {value}',
    legendShade: 'Shade shows the size of the figure; colour shows the region.',
    legendTier: '{short} = {tier}',
    legendNp: 'Dashed: rows filled in without a usable figure',
    combinedNoTier: 'A tier is one region’s choice, so combined figures show the amount without a tier.',
    noTierParts: 'The Tier 1 and Tier 2 figures are not available yet.'
  }
});
