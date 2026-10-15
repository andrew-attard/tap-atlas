/*
 * File: content/text-data.js
 * Purpose: Wording for source addresses and the contract check: separators, "calculated" labels, combined-figure
 *          sources, the check's problem list (the Phase 4 parts included) and the plain words the warning groups and their
 *          tables use (D161, D164).
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

    // The warnings grouped by workbook and kind (US-1.8.8, D161, js/ui/warning-groups.js): the group headings, the table's
    // column headings (D164) and the words of a row in the copied report
    groups: {
      book: '{label}: {n} warnings',
      bookOne: '{label}: 1 warning',
      bookFile: '{region} · {file}',
      wholeFile: 'The whole file',
      kind: '{title} ({n})',
      expand: 'Expand all',
      collapse: 'Collapse all',
      colWhere: 'Where',
      colFound: 'Found',
      colExpected: 'Expected',
      colCell: 'Sheet and cell',
      rowFound: 'found {found}',
      rowExpected: 'expected {expected}',
      rowSep: ', '
    },
    // Field names in words, for the plain rows; a key not listed here reads as it is
    fields: {
      supportPct: 'support share', centralSupportPct: 'central support share', outsourcingPct: 'outsourcing share',
      hitRate: 'hit rate', servicesRatio: 'services ratio', growthPct: 'growth rate', growth: { year2: 'growth year 2', year3: 'growth year 3' },
      channelSplit: 'channel split', 'arrPotential[0]': 'ARR potential, year 1', arrPotential: 'ARR potential', servicesPotential: 'services potential',
      targetAccounts: 'target accounts', avgDealSize: 'average deal size',
      fteSales: 'sales staff', fteConsultants: 'consultants', segment: 'segment', channel: 'channel', tier: 'tier',
      growthPotential: 'growth potential', criticality: 'criticality', competitiveIntensity: 'competitive intensity',
      references: 'references', expertise: 'expertise', productFit: 'product fit',
      industryId: 'industry', productLine: 'product line', currentArr: 'current ARR', pipelineTotal: 'pipeline', pipelineCreated12m: 'pipeline created, 12 months',
      commentary: 'commentary', market: 'market', subVertical: 'sub-vertical', successFactors: 'success factors', solution: 'solution',
      name: 'name', country: 'country', riskLevel: 'risk level', multiplier3y: '3-year multiplier', incrementalArr: 'incremental ARR',
      servicesOrderIntake: 'services order intake', cumulativeOrderIntake: 'cumulative order intake',
      thresholds: { strategicArr: 'strategic ARR threshold', scaledArr: 'scaled ARR threshold', growthArr: 'growth ARR threshold', growthOrderIntake: 'growth order intake threshold' },
      maturity: 'maturity', type: 'type', expertiseGeo: 'geographic expertise', expertiseProduct: 'product expertise', arr: 'ARR', services: 'services',
      distribution: 'distribution', servicesFromPartners: 'services from partners',
      category: 'category', budget: 'budget', forecast: 'forecast', actuals: 'actuals', pipeline: 'pipeline', year: 'year', value: 'value',
      sourceRow: 'worksheet row', sourceCell: 'worksheet cell', sourceMap: 'template map', actualsThrough: 'actuals through',
      coverage: 'coverage', variance: 'variance', generatedAt: 'data date', fileModified: 'file saved date', importedAt: 'import date',
      marketCoverage: 'Market Coverage', newBusiness: 'New Business', customerGrowth: { accounts: 'Customer Growth accounts' },
      partners: 'Partners', recap: 'Recap', revenue: 'Revenue', booksValue: 'Books value', strategicPlan: 'Strategic plan',
      baseYear: 'Base year', routes: 'Routes to market'
    },
    // Plain words per kind (D161, D164): the group title (plural), the intro (the one sentence that explains the kind, said
    // once under the heading) and, where the defaults do not fit, templates for the table's columns: where (default
    // {where}: the row or cell in words and the field), found (default {found}) and expected (default {value} when the check
    // carried a figure, else nothing). Templates may use {item}, {field}, {where}, {found}, {expected} (the technical
    // sentence) and the check's own figures ({value}, {segment}, {tier}, {key}). An empty template leaves the column out.
    // Observations, not judgements (D20): the figures speak for themselves.
    plain: {
      fallback: { found: 'found {found}', blank: 'a blank' },
      share: { title: 'Shares above 150%', intro: 'A share is written as a decimal, 0.25 for 25%. A value this high may be a percentage written as a whole number.' },
      partnerChannel: { title: 'Partners without a channel', intro: 'The partner is kept and shown under "Channel not provided".', where: '{item}', found: '' },
      tier3Row: { title: 'New Business rows for Tier 3 industries', intro: 'The template plans new business for Tier 1 and Tier 2 industries. The row is kept and counted.', where: '{item}', found: '' },
      items: { title: 'Empty sections', intro: 'The section is in the file but holds no rows.', where: '{field}', found: '' },
      revenueWithin: { title: 'Revenue above the order intake', intro: 'Revenue is expected to be no higher than the order intake for the same year, channel and motion.', where: '{item}', expected: '{value}' },
      booksWithin: { title: 'Books value above the customer value', intro: 'For Partner, Alliance A and Alliance B, the books value of ARR and services is expected to be no higher than the customer value for the same year.', where: '{item}', expected: '{value}' },
      coverage: { title: 'Coverage ratios that differ from their parts', intro: 'The coverage ratio is expected to equal pipeline divided by forecast minus actuals.', where: '{item}', expected: '{value}' },
      variance: { title: 'Variances that differ from their parts', intro: 'The variance is expected to equal the books order intake minus the strategic plan for the same year and type.', where: '{item}', expected: '{value}' },
      splitSum: { title: 'Channel splits not adding up to 100%', intro: 'The four channel shares of a row are expected to add up to 100%.', where: '{item}', expected: '100%' },
      arrFormula: { title: 'ARR potential not matching its formula', intro: 'ARR potential for year 1 is expected to equal target accounts × hit rate × average deal size.', where: '{item}', expected: '{value}' },
      segmentRule: { title: 'Segments that differ from the thresholds rule', intro: 'The segment is expected to follow the thresholds: current ARR above the strategic threshold is Strategic, below the scaled threshold is Scaled, order intake and ARR above the growth thresholds is Growth, otherwise Core.', where: '{item}', expected: '{segment}' },
      mcTier: { title: 'New Business tiers that differ from Market Coverage', intro: 'A New Business row is expected to carry the tier Market Coverage gives its industry.', where: '{item}', expected: '{tier}' },
      sourceRow: { title: 'Rows without a worksheet row number', intro: 'Every row is expected to carry the worksheet row it was read from.' },
      sourceCell: { title: 'Items without a worksheet cell', intro: 'Every grid item is expected to carry the worksheet cell it was read from.' },
      uniqueRow: { title: 'Worksheet row numbers used twice', intro: 'A worksheet row number is expected to be used once per section.', where: '{item}' },
      uniqueRecap: { title: 'Recap items repeated', intro: 'One recap item is expected per year, channel, motion and type.' },
      oneItem: { title: 'Items repeated', intro: 'One item is expected for each combination of a list\'s keys.', expected: '{expected}' },
      yearMonth: { title: 'Months not written as year and month', intro: 'A month is written as year and month, such as "2026-08".' },
      isoDate: { title: 'Dates not written year first', intro: 'A date is written year first, such as "2026-10-02T09:00:00Z" or "2026-10-02".' },
      sourceMap: { title: 'Template map entries missing', intro: 'The template map names a sheet and its columns for every section the file carries.', where: '{field}' },
      unrated: { title: 'Ratings on industries that are not rated', intro: 'An industry the template does not rate carries no ratings.' },
      notNegative: { title: 'Counts below zero', intro: 'A count is zero or more.' },
      // Extra sections (US-3.2.1): the item is the section (or its row), the field the key checked
      extra: {
        list: { title: 'Extra sections not written as a list', intro: 'meta.extraSections is expected to be a list of sections.', expected: '{expected}' },
        section: { title: 'Extra sections that are not objects', intro: 'Each extra section is expected to be an object.', expected: '{expected}' },
        id: { title: 'Extra section ids missing, repeated or with a colon', intro: 'Each extra section is expected to carry an id of its own, without a colon.', expected: '{expected}' },
        title: { title: 'Extra sections without a title', intro: 'Each extra section is expected to carry a title.', expected: '{expected}' },
        intro: { title: 'Extra section introductions that are not text', intro: 'An extra section\'s introduction is expected to be text.', expected: '{expected}' },
        columns: { title: 'Extra sections without a usable column', intro: 'Each extra section is expected to list at least one usable column.', expected: '{expected}' },
        column: { title: 'Extra section columns that are not objects', intro: 'Each column of an extra section is expected to be an object.', expected: '{expected}' },
        key: { title: 'Extra section column keys missing, repeated or reserved', intro: 'Each column is expected to carry a key of its own that the app does not reserve.', expected: '{expected}' },
        label: { title: 'Extra section columns without a heading', intro: 'Each column is expected to carry a heading.', expected: '{expected}' },
        unit: { title: 'Extra section columns with an unknown unit', intro: 'A column\'s unit is expected to be one the app knows.', expected: '{expected}' },
        kind: { title: 'Extra section columns with an unknown kind', intro: 'A column\'s kind is expected to be one the app knows.', expected: '{expected}' },
        letter: { title: 'Extra section columns with an unusable column letter', intro: 'A column\'s letter is expected to be a worksheet column such as B or AC.', expected: '{expected}' },
        extra: { title: 'Extra sections of a region not written as an object', intro: 'A region\'s extra is expected to be an object keyed by section id.', expected: '{expected}' },
        known: { title: 'Rows for extra sections that are not listed', intro: 'A region\'s extra rows are expected to belong to a section meta.extraSections lists.', where: '{item}', found: '' },
        rows: { title: 'Extra section rows not written as a list', intro: 'A section\'s rows are expected to be a list.', expected: '{expected}' },
        row: { title: 'Extra section rows that are not objects', intro: 'Each row is expected to be an object.', expected: '{expected}' },
        rowKey: { title: 'Extra section rows naming a column the section does not have', intro: 'A row is expected to name only the section\'s columns.', found: '' },
        uniqueRow: { title: 'Extra section rows from the same worksheet row', intro: 'A worksheet row number is expected to be used once per section.' },
        sourceRow: { title: 'Extra section rows without a worksheet row number', intro: 'Every row is expected to carry the worksheet row it was read from.' },
        number: { title: 'Text in number columns of extra sections', intro: 'A number column is expected to hold numbers or blanks.', expected: '{expected}' },
        text: { title: 'Numbers in text columns of extra sections', intro: 'A text column is expected to hold text or blanks.', expected: '{expected}' }
      }
    }
  }
});
