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
    noTierParts: 'The Tier 1 and Tier 2 figures are not available yet.',
    drillLabel: '{industry}, {region}'
  },

  // US-2.1.6: the success factors panel. Only entries that exist are listed; blanks are never called out.
  nbFactors: {
    label: 'What leaders say they need to win',
    title: 'What leaders say they need to win in {industry}',
    titleNone: 'What leaders say they need to win',
    intro: 'Each region’s key success factors for the selected industry, by sub-industry and market, focus region first.',
    listLabel: 'Success factors, by region and sub-industry',
    ask: 'Select an industry in the grid above, or in the list’s industry filter, to read what each region wrote.',
    none: 'None of the regions shown wrote success factors for {industry}. Pick another industry, or compare other regions.',
    focus: 'Focus region',
    foot: '(success factors, as written)'
  }
});
