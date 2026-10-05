/*
 * File: tools/sample-planted-p2.js
 * Purpose: The Phase 2 planted cases of docs/PLANTED-CASES.md (Q01 to Q06) as settings: the values the sample data
 *          must contain so the Phase 2 insight rules and reports have something to find. Change the doc first.
 * Provides: module.exports (the Phase 2 planted settings)
 * Depends on: nothing
 * Used by: tools/sample-plant-p2.js, tools/sample-expect-p2.js
 *
 * Money is in thousands of EUR. Shares and gaps are decimals (0.2 is 20 points).
 */
'use strict';

module.exports = {
  // Q01: Southern Europe sells most of its new business through partners. Channel split per row, in
  // [direct, partner, allianceA, allianceB] order; customer growth stays direct, as in every region.
  channelReliance: { region: 'seu', channel: 'partner', split: [0.2, 0.65, 0.1, 0.05], gap: 0.2 },
  // Q02: Asia Pacific targets fewer new accounts, so its ARR ambition leans on existing customers. Applied
  // before the Phase 1 calibrations (P09, P12), which then settle on the changed figures.
  planMakeup: { region: 'apac', targetAccounts: 0.4, gap: 0.2 },
  // Q03: one sub-industry named by two regions, typed with a different capital letter.
  sharedSubIndustry: { industry: 'healthcare', names: { na: 'Acute care hospitals', apac: 'Acute care Hospitals' } },
  // Q04: one partner named by two regions: the first Alliance A partner of each.
  sharedPartner: { from: 'na', to: 'latam', channel: 'allianceA' },
  // Q05: every partner's FTE follows its planned order intake (between perFte[0] and perFte[1] per person),
  // except one partner planned at about `multiple` times the average across partners.
  partnerCapacity: { perFte: [55, 105], salesShare: 0.4, region: 'mea', channel: 'partner', multiple: 3, minMultiple: 2.5 },
  // Q06: the "pricing" theme in two regions only (one below the default threshold of 3), on rows with no success factor.
  themes: { below: { id: 'pricing', text: 'Competitive pricing for multi-site deals', regions: ['latam', 'ceu'] },
    minRegions: 3, recurring: 2 }
};
