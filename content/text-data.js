/*
 * File: content/text-data.js
 * Purpose: Wording for source addresses and the contract check: separators, "calculated" labels, combined-figure
 *          sources and the check's problem list (the Phase 4 parts included).
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/core/sources.js, js/core/check.js, js/core/check-rows.js and js/core/check-p4.js through TAP.content.text
 * Owner: the DATA stream. Placeholders in {braces} are filled in by the code; the organization layer can
 *        replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  sources: {
    sep: ' › ',
    calculated: 'calculated in the workbook',
    regionOne: '1 region',
    regionMany: '{n} regions',
    // A figure added up over rows that are not next to each other, e.g. "O20:O31 (4 rows)"
    someRows: '{range} ({n} rows)',
    combined: {
      sum: 'Combined by this app: total of {regions}',
      mean: 'Combined by this app: average of {regions}',
      wmean: 'Combined by this app: weighted average of {regions}',
      rating: 'Combined by this app: average rating of {regions}',
      count: 'Combined by this app: counted across {regions}',
      list: 'Combined by this app: listed for {regions}'
    },
    excluded: '{names} not included: not provided',
    unknownFile: 'unknown file'
  },

  // The contract check's list of problems (US-1.8.2). Technical on purpose: it is pasted into Copilot.
  check: {
    message: '{path}: expected {expected}, found {found}',
    or: ' or ',
    orBlank: '{what}, or null for a blank',
    more: '{n} more problems not listed. Fix the ones above and check again.',
    item: { row: '{name} (row {row})', cell: 'cell {cell}' },
    found: { nothing: 'nothing', list: 'a list of {n}', emptyList: 'an empty list', object: 'an object',
      repeatRecap: 'a second item with the same year, channel, motion and type', second: 'a second item for {key}' },
    expect: {
      text: 'text',
      number: 'a number',
      bool: 'true or false',
      list: 'a list',
      object: 'an object',
      region: 'a region object',
      years3: 'a list of 3 values, one per plan year',
      planYears: 'a list of 3 plan years',
      industry: 'an industry id from lookups.industries',
      productLine: 'a product line id from lookups.productLines',
      channelKey: 'a channel id from lookups.channels',
      regions: 'a list of regions',
      someRegions: 'at least one region',
      uniqueRegion: 'an id no other region uses',
      keptRegionId: 'a region id other than "rest" or "org", which the app keeps for combined figures',
      uniqueIndustry: 'an industry not already listed in this section',
      uniqueId: 'an id not already used in this list',
      mcTier: 'the Market Coverage tier for this industry ({tier})',
      mcRow: 'an industry with a row in Market Coverage',
      sourceRow: 'the worksheet row number',
      isoDate: 'a date written year first, such as "2026-10-02T09:00:00Z" or "2026-10-02"',
      share: 'a share written as a decimal, for example 0.25 for 25%',
      notNegative: 'a count of zero or more',
      uniqueRecap: 'one recap item per year, channel, motion and type',
      uniqueRow: 'a worksheet row number not already used in this section',
      sourceCell: 'the worksheet cell, for example "E5"',
      sourceMap: 'the template map: a sheet and its columns for each section',
      splitSum: 'channel shares adding up to 100%',
      arrFormula: 'target accounts × hit rate × average deal size = {value}',
      segmentRule: 'the segment the thresholds give ({segment})',
      items: 'at least one item',
      unrated: 'no rating, as this industry is not rated',
      // The full template's parts (Phase 4, US-4.1.2)
      solution: 'a solution id from lookups.solutions',
      partnerType: 'a partner type id from lookups.partnerTypes',
      maturity: 'a maturity id or name from lookups.partnerMaturity',
      yearMonth: 'a year and month, such as "2026-08"',
      oneItem: 'one item for each {what}',
      itemKeys: { revenue: 'year, channel, motion and type', booksValue: 'year, channel, motion and type', strategicPlan: 'year and type',
        baseYear: 'category', routes: 'route, year, type and solution' },
      revenueWithin: 'revenue no higher than the order intake for {key} ({value})',
      booksWithin: 'a books value no higher than the customer value for {key} ({value})',
      coverage: 'pipeline ÷ (forecast − actuals) = {value}',
      variance: 'books order intake minus the strategic plan = {value}'
    }
  }
});
