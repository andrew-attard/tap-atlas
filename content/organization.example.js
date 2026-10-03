/*
 * File: content/organization.example.js
 * Purpose: Starter file for the organization layer: the organization's own terms, wording, Guide paragraphs,
 *          internal label and short region names, laid over the general wording (US-1.6.6, US-1.8.5).
 * Provides: window.TAP_ORG (only once copied to content/organization.js)
 * Depends on: nothing
 * Used by: js/core/content.js, in the internal edition (index.html) only. No page loads this example file.
 *
 * HOW TO USE IT
 *   1. Copy this file to content/organization.js, in the same folder. That name is ignored by git, so the
 *      organization's wording never reaches the public repository.
 *   2. Uncomment the examples you need and change them. Leave the rest commented, or delete them.
 *      Copied as it is, the file is valid and changes nothing.
 *   3. Open index.html, then open the data sources panel (click the data date in the comparison bar).
 *      It should show no message about the organization file. If it does, the message names each problem.
 *      A file with any problem is not used at all, and the app shows the general wording until it is fixed.
 *
 * RULES
 *   - Every entry here wins over the general entry with the same key or id, so you only write what changes.
 *   - Write plain text in quotes. Put a comma after every entry except the last one in a block.
 *   - Keep words short and plain, as in content/glossary.js and content/guide.js.
 *   - The five parts are text, glossary, guide, regions and settings. Any other part is reported as a problem.
 *
 * BRANDING (colours, font, logo)
 *   Branding lives in the theme file, not here. In the internal copy of the app folder (never a git clone),
 *   change the values in js/theme.js: every setting is explained in its comments. The public repository keeps
 *   the neutral theme, so never commit a branded js/theme.js.
 */
window.TAP_ORG = {

  /* TEXT: replace any on-screen wording by using the same key as the general files.
     The keys are in content/ui-text.js and content/text-*.js. {placeholders} in braces must be kept.
     Tour steps are under "tour", with the same step keys as content/text-pages.js. */
  text: {
    // scope: {
    //   org: 'Showing the whole company across all {n} regions'
    // },
    // tour: {
    //   menu: 'Use the menu to move between the views. Start with the Overview.'
    // }
  },

  /* GLOSSARY: the organization's own terms, acronyms, product lines, channel names and programmes.
     Same format as content/glossary.js: id: { term, aliases, short, why, related }.
     - term and short are required; aliases, why and related are optional but recommended.
     - Organization terms are marked on screen and in the glossary list just like general ones.
     - Using an id from content/glossary.js replaces that general entry (the second example). */
  glossary: {
    // qbr: {
    //   term: 'QBR',
    //   aliases: ['quarterly business review'],
    //   short: 'Quarterly business review: a meeting each quarter where a region reviews its plan with leadership.',
    //   why: 'Plans shown in this app are discussed again at each QBR.',
    //   related: ['tap']
    // },
    // alliance: {
    //   term: 'Alliance',
    //   aliases: ['Alliance A', 'Alliance B', 'Example Cloud Alliance'],
    //   short: 'A strategic partner we sell with. Alliance A is the Example Cloud Alliance.',
    //   why: 'Alliance shares show how much a plan depends on that relationship.',
    //   related: ['channel', 'partner']
    // }
  },

  /* GUIDE: change "How to use this app" (howTo) or "Territory account planning explained" (planning).
     Sections are matched by id; the ids are in content/guide.js.
     - paragraphs replaces a section's text; addParagraphs adds to the end of it.
     - A new id adds a section; after: '<id>' places it after that section, otherwise it goes last.
     - link: { view: 'industry' } adds a link to a view (ids in config/views.js); leave it out for none.
     - Keep each paragraph to one to three short sentences. */
  guide: {
    // planning: {
    //   sections: [
    //     { id: 'what', paragraphs: [
    //       'Every regional leader writes a territory account plan each autumn. It covers the next three years.'
    //     ] },
    //     { id: 'operational', addParagraphs: [
    //       'The agreed plans set next year’s headcount and marketing budgets in the spring planning round.'
    //     ] },
    //     { id: 'calendar', title: 'Our planning calendar', after: 'operational', paragraphs: [
    //       'Leaders submit their workbooks by the end of October. The plans are reviewed together in November.'
    //     ] }
    //   ]
    // }
  },

  /* REGIONS: short display names, by the region id in the data file (regions[].id).
     Every chart, card and label that names a region uses them. Regions not listed keep the name in the data. */
  regions: {
    // north: 'North'
  },

  /* SETTINGS: organization settings.
     internalLabel is the confidentiality label shown on every screen when real data is loaded (US-1.1.8):
     show turns it on or off, text is the wording. */
  settings: {
    // internalLabel: { show: true, text: 'Internal: regional plan data, do not forward' }
  }
};
