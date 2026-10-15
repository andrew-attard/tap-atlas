/*
 * File: content/text-data.js
 * Purpose: Wording for source addresses and the contract check: separators, "calculated" labels, combined-figure
 *          sources, the check's problem list (the Phase 4 parts included) and the plain words the warning groups use.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/core/sources.js, js/core/check.js, js/core/check-rows.js, js/core/check-p4.js and js/ui/warning-groups.js
 *          through TAP.content.text
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
      // Real-data fixes (v0.5.1): both load with a warning
      tier3Row: 'a Tier 1 or Tier 2 industry (the template has no New Business rows for Tier 3; this row is kept and counted)',
      partnerChannel: 'a channel for this partner (left blank, so it is shown under "Channel not provided")',
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
    },

    // The warnings grouped by workbook and kind (US-1.8.8, D161, js/ui/warning-groups.js): the group headings
    groups: {
      book: '{label}: {n} warnings',
      bookOne: '{label}: 1 warning',
      bookFile: '{region} · {file}',
      wholeFile: 'The whole file',
      kind: '{title} ({n})',
      expand: 'Expand all',
      collapse: 'Collapse all'
    },
    // Field names in words, for the plain lines; a key not listed here reads as it is
    fields: {
      supportPct: 'support share', centralSupportPct: 'central support share', outsourcingPct: 'outsourcing share',
      hitRate: 'hit rate', servicesRatio: 'services ratio', growthPct: 'growth rate', growth: { year2: 'growth year 2', year3: 'growth year 3' },
      channelSplit: 'channel split', 'arrPotential[0]': 'ARR potential, year 1', targetAccounts: 'target accounts',
      fteSales: 'sales staff', fteConsultants: 'consultants', segment: 'segment', channel: 'channel', tier: 'tier',
      growthPotential: 'growth potential', criticality: 'criticality', competitiveIntensity: 'competitive intensity',
      references: 'references', expertise: 'expertise', productFit: 'product fit',
      sourceRow: 'worksheet row', sourceCell: 'worksheet cell', sourceMap: 'template map', actualsThrough: 'actuals through',
      coverage: 'coverage', variance: 'variance', generatedAt: 'data date', fileModified: 'file saved date', importedAt: 'import date',
      marketCoverage: 'Market Coverage', newBusiness: 'New Business', customerGrowth: { accounts: 'Customer Growth accounts' },
      partners: 'Partners', recap: 'Recap', revenue: 'Revenue', booksValue: 'Books value', strategicPlan: 'Strategic plan',
      baseYear: 'Base year', routes: 'Routes to market'
    },
    // Plain words per kind: the group title (plural) and one line per warning. Lines may use {item} (the row or cell in
    // words), {field} (from fields above), {where} (item and field together, whichever exist), {found} and {expected}.
    // Observations, not judgements (D20): the figures speak for themselves.
    plain: {
      fallback: { found: 'found {found}', blank: 'a blank' },
      share: { title: 'Shares above 150%', line: '{where}: {found} (a share is written as a decimal, 0.25 for 25%; a value this high may be a percentage written as a whole number)' },
      partnerChannel: { title: 'Partners without a channel', line: '{item} (shown under "Channel not provided")' },
      tier3Row: { title: 'New Business rows for Tier 3 industries', line: '{item} (kept and counted)' },
      items: { title: 'Empty sections', line: '{field}: no rows' },
      revenueWithin: { title: 'Revenue above the order intake', line: '{item}: {expected}, found {found}' },
      booksWithin: { title: 'Books value above the customer value', line: '{item}: {expected}, found {found}' },
      coverage: { title: 'Coverage ratios that differ from their parts', line: '{item}: {expected}, found {found}' },
      variance: { title: 'Variances that differ from their parts', line: '{item}: {expected}, found {found}' },
      splitSum: { title: 'Channel splits not adding up to 100%', line: '{item}: {expected}, found {found}' },
      arrFormula: { title: 'ARR potential not matching its formula', line: '{item}: {expected}, found {found}' },
      segmentRule: { title: 'Segments that differ from the thresholds rule', line: '{item}: {expected}, found {found}' },
      mcTier: { title: 'New Business tiers that differ from Market Coverage', line: '{item}: {expected}, found {found}' },
      sourceRow: { title: 'Rows without a worksheet row number', line: '{where}: found {found}' },
      sourceCell: { title: 'Items without a worksheet cell', line: '{where}: found {found}' },
      uniqueRow: { title: 'Worksheet row numbers used twice', line: '{item}: row {found} is already used in this section' },
      uniqueRecap: { title: 'Recap items repeated', line: '{where}: {found}' },
      oneItem: { title: 'Items repeated', line: '{where}: {found} ({expected})' },
      yearMonth: { title: 'Months not written as year and month', line: '{where}: {expected}, found {found}' },
      isoDate: { title: 'Dates not written year first', line: '{where}: {expected}, found {found}' },
      sourceMap: { title: 'Template map entries missing', line: '{field}: found {found}' },
      unrated: { title: 'Ratings on industries that are not rated', line: '{where}: found {found}' },
      notNegative: { title: 'Counts below zero', line: '{where}: found {found}' },
      // Extra sections (US-3.2.1): the item is the section (or its row), the field the key checked
      extra: {
        list: { title: 'Extra sections not written as a list', line: '{where}: {expected}, found {found}' },
        section: { title: 'Extra sections that are not objects', line: '{where}: {expected}, found {found}' },
        id: { title: 'Extra section ids missing, repeated or with a colon', line: '{where}: {expected}, found {found}' },
        title: { title: 'Extra sections without a title', line: '{where}: {expected}, found {found}' },
        intro: { title: 'Extra section introductions that are not text', line: '{where}: {expected}, found {found}' },
        columns: { title: 'Extra sections without a usable column', line: '{where}: {expected}, found {found}' },
        column: { title: 'Extra section columns that are not objects', line: '{where}: {expected}, found {found}' },
        key: { title: 'Extra section column keys missing, repeated or reserved', line: '{where}: {expected}, found {found}' },
        label: { title: 'Extra section columns without a heading', line: '{where}: {expected}, found {found}' },
        unit: { title: 'Extra section columns with an unknown unit', line: '{where}: {expected}, found {found}' },
        kind: { title: 'Extra section columns with an unknown kind', line: '{where}: {expected}, found {found}' },
        letter: { title: 'Extra section columns with an unusable column letter', line: '{where}: {expected}, found {found}' },
        extra: { title: 'Extra sections of a region not written as an object', line: '{expected}, found {found}' },
        known: { title: 'Rows for extra sections that are not listed', line: '{item}: {expected}' },
        rows: { title: 'Extra section rows not written as a list', line: '{where}: {expected}, found {found}' },
        row: { title: 'Extra section rows that are not objects', line: '{where}: {expected}, found {found}' },
        rowKey: { title: 'Extra section rows naming a column the section does not have', line: '{where}: {expected}' },
        uniqueRow: { title: 'Extra section rows from the same worksheet row', line: '{where}: row {found} is already used in this section' },
        sourceRow: { title: 'Extra section rows without a worksheet row number', line: '{where}: found {found}' },
        number: { title: 'Text in number columns of extra sections', line: '{where}: {expected}, found {found}' },
        text: { title: 'Numbers in text columns of extra sections', line: '{where}: {expected}, found {found}' }
      }
    }
  }
});
