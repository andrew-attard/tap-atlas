/*
 * File: tools/sample-planted.js
 * Purpose: The planted cases of docs/PLANTED-CASES.md as settings: the exact values the sample data must contain
 *          so every insight rule fires and every missing-data state shows. Change docs/PLANTED-CASES.md first.
 * Provides: module.exports (the planted settings)
 * Depends on: nothing
 * Used by: tools/sample-plant.js
 *
 * Ratings lists are [growthPotential, criticality, competitiveIntensity, references, expertise, productFit]:
 * attractiveness is the mean of the first three, ability to win the mean of the last three.
 */
'use strict';

module.exports = {
  ratings: {
    // P03: Data Centers, ability 1.33 and attractiveness 1.67 in B, C, E and G; ability 2.0 or more in A, D and F.
    datacenters: { latam: [2, 1, 2, 1, 1, 2], neu: [2, 1, 2, 1, 1, 2], ceu: [2, 1, 2, 1, 1, 2], apac: [2, 1, 2, 1, 1, 2],
      na: [3, 3, 2, 2, 2, 3], seu: [2, 3, 3, 3, 2, 2], mea: [3, 2, 2, 2, 3, 2] },
    // P16: Field Service Management attractive (2.33 or more) but ability 1.67 or less in A, D, F and G; able elsewhere.
    fsm: { na: [3, 2, 2, 1, 2, 1], seu: [3, 3, 2, 2, 1, 2], mea: [3, 2, 3, 1, 1, 2], apac: [3, 3, 2, 1, 2, 1],
      latam: [2, 2, 2, 2, 2, 3], neu: [2, 3, 2, 3, 2, 2], ceu: [3, 2, 2, 2, 3, 2] }
  },
  single: [
    { region: 'neu', industry: 'pharma', field: 'references', value: 3 },           // P04
    { region: 'ceu', industry: 'manufacturing', field: 'expertise', value: 1 }      // P05
  ],
  nothingInSystem: { region: 'neu', industry: 'pharma' },                            // P04
  largestArr: { region: 'ceu', industry: 'manufacturing', value: 2400, othersMax: 2200 }, // P05
  pipelineShare: { region: 'seu', industry: 'retail', share: 0.18 },               // P06
  noPipeline: [{ region: 'mea', industry: 'hospitality' }, { region: 'apac', industry: 'transport' }], // P07, P11
  // P07 and P11 stay apart: Middle East & Africa has no New Business rows in Hospitality.
  nbMoveAway: { region: 'mea', industry: 'hospitality', to: 'utilities' },
  nbRequired: [{ region: 'apac', industry: 'transport' }, { region: 'na', industry: 'fsm' }, { region: 'mea', industry: 'fsm' }],
  winsRatio: { region: 'na', ratio: 3 },                                             // P12
  dealSizeRatio: { region: 'latam', ratio: 1.6 },                                    // P09
  pipelineRatio: { region: 'latam', ratio: 4 },                                      // P10
  successFactors: { na: 'Field service references', mea: 'Mobile workforce integration partner' }, // P16
  // Customer growth shares (P13, P14, P15). Groups share out each region's three-year growth.
  concentration: { region: 'na', top: [0.25, 0.2, 0.15], otherStrategic: 0.13 },  // 60% in 3 accounts; Strategic 38%
  atRisk: { region: 'mea', strategicRisk: 0.15, otherRisk: 0.25, strategic: 0.4 },   // 40% at risk; Strategic 40%
  strategicHeavy: { region: 'apac', share: 0.8 },
  // G1 blanks, G2 empty section, G3 import notes, G4 zero vs blank
  blanks: [{ region: 'neu', industry: 'finance', field: 'criticality' }, { region: 'neu', industry: 'property', field: 'productFit' }],
  nullHitRate: { region: 'seu' },
  zeroArr: { region: 'na', industry: 'culture' },
  blankArr: { region: 'neu', industry: 'culture' },
  notes: {
    neu: [{ message: 'A rating cell held text that is not an allowed option; imported as not provided.', sheet: '1. Market Coverage', cell: 'E14' }],
    ceu: [{ message: 'The Customer Growth section is empty.', sheet: '3. Customer Growth', cell: 'A10' }]
  }
};
