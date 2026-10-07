/*
 * File: content/text-customers.js
 * Purpose: Wording for the Customer growth and Partners views, and the customer value against books value report.
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
  },

  // US-4.5.1: customer value against books value
  ptBooks: {
    customer: 'Customer value',
    books: 'Books value',
    year: 'Plan year',
    allYears: 'Three years together',
    split: 'Split by',
    all: { channel: 'All channels', category: 'All product categories' },
    after: 'difference {gap} ({share})',
    afterGap: 'difference {gap}',
    booksOnly: 'Software perpetual and hardware appear in the books value only: the customer value figures hold ARR and services. The difference compares ARR and services.'
  },

  // US-2.2.3: the note under the growth chart
  cgGrowth: {
    multiplierOne: '1 account in {region} uses a three-year multiplier; it counts through the incremental ARR the workbook calculated.',
    multiplierMany: '{n} accounts in {region} use a three-year multiplier; they count through the incremental ARR the workbook calculated.',
    multiplierList: 'Accounts planned with a three-year multiplier count through the incremental ARR the workbook calculated: {list}.',
    multiplierIn: '{n} in {region}'
  },

  // US-2.2.5: the reference line on the exposure chart
  cgExposure: {
    refLine: 'Insight threshold: {value}'
  },

  // US-2.2.4, US-2.3.3: one bubble per account or partner
  rowBubble: {
    noName: 'Row {row}',
    left: '{name} ({region}) is not on the chart: no {measure} given.',
    sourceRow: 'Source row',
    key: '{name} ({region})',
    others: { accounts: 'The other {n} regions, account by account', partners: 'The other {n} regions, partner by partner' },
    othersOne: { accounts: 'The other region, account by account', partners: 'The other region, partner by partner' },
    noSize: '{name} ({region}) is drawn as an empty outline: no {measure} given.',
    unnamed: { accounts: '{n} more accounts are too close together to name on the chart; the table lists every one.',
      partners: '{n} more partners are too close together to name on the chart; the table lists every one.' }
  },

  // US-2.7.2 details for row targets (an account, a partner, a new business row), and US-2.2.2 segment thresholds
  detailsRows: {
    title: '{name}, {region}',
    nbTitle: '{name}, {region}',
    noName: 'No name given',
    several: '{n} rows from {regions}',
    fields: 'In the plan',
    byYear: 'By plan year',
    byYearOf: '{name}: by plan year',
    perYear: '{label}, {year}',
    year: 'Year {n}',
    yearly: { arr: 'ARR', services: 'Services', incrementalArr: 'Incremental ARR', servicesOi: 'Services order intake' },
    sourceRow: 'Source row',
    rowText: '{where} › row {row}',
    rowOnly: 'Row {row}',
    missing: 'Row {row} of {region} is not in the data',
    thresholdsHead: 'Segment thresholds: {regions}',
    thresholdsTitle: '{region}: segment thresholds',
    thresholds: {
      strategicArr: 'Strategic: current ARR above',
      scaledArr: 'Scaled: current ARR below',
      growthArr: 'Growth: current ARR above',
      growthOrderIntake: 'Growth: planned order intake above'
    }
  }
});
