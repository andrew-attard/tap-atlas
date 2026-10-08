/*
 * File: tools/sample-planted-d112.js
 * Purpose: The planted cases of the D112 insight rules (docs/PLANTED-CASES.md, S01 to S04) as settings: the values
 *          the sample data must contain so industryCover, priorityVsPlan, servicesDelivery and partnerLoad have
 *          something to find. Change the doc first.
 * Provides: module.exports (the D112 settings)
 * Depends on: nothing
 * Used by: tools/sample-plant-d112.js, tools/sample-expect-d112.js
 *
 * Money is in thousands of EUR. Shares are decimals. The thresholds repeat the rules' params in
 * config/insight-rules.js, so the generator can check each case sits clearly past them.
 */
'use strict';

module.exports = {
  // S01: natural, nothing planted. Latin America's pipeline created in the last 12 months is a quarter of its
  // year-1 new business (P10), so most of its Tier 1 and 2 goals are many times that; Asia Pacific's Transportation
  // goal has no pipeline at all (P11).
  industryCover: { minGoal: 25, ratio: 5, case: { region: 'latam', industry: 'retail' }, none: { region: 'apac', industry: 'transport' } },
  // S02: Manufacturing becomes Tier 2 in two more regions, after their New Business rows are drawn, so those regions
  // plan nothing there and no random number moves.
  priorityVsPlan: { industry: 'manufacturing', toTier2: ['na', 'apac'], share: 5 / 7, maxShare: 0.05 },
  // S03: every Latin America New Business row grows 45% into year 2 and 30% into year 3, so its services order
  // intake grows well over half from year 1 to year 3, while its partners deliver half of their own services (its
  // outsourcing %, tools/sample-planted-p4.js), a small part of the region's.
  servicesDelivery: { region: 'latam', growth: { year2: 0.45, year3: 0.3 }, minGrowth: 0.5, maxPartnerShare: 0.2 },
  // S04: Southern Europe's partner staff are 15% sales instead of 40% (Q05). Each partner's total staff stays the
  // same, so partner capacity (Q05) is unchanged.
  partnerLoad: { region: 'seu', salesShare: 0.15, ratio: 2 }
};
