/*
 * File: config/import-map.js
 * Purpose: The import mapping: where every field of the Data Contract sits in the planning workbooks (sheets, rows, columns,
 *          cells, grid axes), the region list, the lookups and the other spellings the import accepts (D147). This copy
 *          describes the fictional sample template and is written by tools/build-import-map.js: never edit it here. The
 *          organization's approved tool fills the real template's mapping in the internal copy, overwriting this file.
 * Provides: window.IMPORT_MAP
 * Depends on: nothing (data only). Shape: docs/ARCHITECTURE.md section 20
 * Used by: js/import/import-map.js
 */
window.IMPORT_MAP = {
  meta: { templateVersion: 'sample-template-1', currency: 'EUR', years: [2027, 2028, 2029], isSample: true, numberFormat: { decimal: '.', thousands: ',' } },
  regions: [
    { id: 'na', name: 'North America', file: 'North America plan.xlsx', filterName: 'North America' },
    { id: 'latam', name: 'Latin America', file: 'Latin America plan.xlsx', filterName: 'Latin America' },
    { id: 'neu', name: 'Northern Europe', file: 'Northern Europe plan.xlsx', filterName: 'Northern Europe' },
    { id: 'seu', name: 'Southern Europe', file: 'Southern Europe plan.xlsx', filterName: 'Southern Europe' },
    { id: 'ceu', name: 'Central Europe', file: 'Central Europe plan.xlsx', filterName: 'Central Europe' },
    { id: 'mea', name: 'Middle East & Africa', file: 'Middle East & Africa plan.xlsx', filterName: 'Middle East & Africa' },
    { id: 'apac', name: 'Asia Pacific', file: 'Asia Pacific plan.xlsx', filterName: 'Asia Pacific' }
  ],
  nameCell: { sheet: '1. Market Coverage', cell: 'C3' },
  lookups: {
    industries: [
      { id: 'busServices', name: 'Business Services', productLine: 'pl3', groupPriority: false, rated: true },
      { id: 'culture', name: 'Culture and Tourism', productLine: 'pl3', groupPriority: false, rated: true },
      { id: 'utilities', name: 'Utilities', productLine: 'pl2', groupPriority: false, rated: true },
      { id: 'media', name: 'Entertainment & Media', productLine: 'pl3', groupPriority: false, rated: true },
      { id: 'finance', name: 'Financial Services', productLine: 'pl1', groupPriority: false, rated: true },
      { id: 'government', name: 'Government', productLine: 'pl1', groupPriority: false, rated: true },
      { id: 'healthcare', name: 'Healthcare', productLine: 'pl1', groupPriority: true, rated: true },
      { id: 'hospitality', name: 'Hospitality', productLine: 'pl3', groupPriority: false, rated: true },
      { id: 'infotech', name: 'Information and Technology', productLine: 'pl1', groupPriority: false, rated: true },
      { id: 'ifm', name: 'Facility Services', productLine: 'pl2', groupPriority: true, rated: true },
      { id: 'manufacturing', name: 'Manufacturing', productLine: 'pl2', groupPriority: false, rated: true },
      { id: 'pharma', name: 'Pharma and Biotech', productLine: 'pl1', groupPriority: false, rated: true },
      { id: 'retail', name: 'Retail', productLine: 'pl3', groupPriority: false, rated: true },
      { id: 'transport', name: 'Transportation', productLine: 'pl2', groupPriority: false, rated: true },
      { id: 'datacenters', name: 'Data Centers', productLine: 'pl2', groupPriority: true, rated: true },
      { id: 'education', name: 'Education', productLine: 'pl1', groupPriority: false, rated: true },
      { id: 'fsm', name: 'Field Service Management', productLine: 'pl2', groupPriority: false, rated: true },
      { id: 'property', name: 'Property Management', productLine: 'pl3', groupPriority: false, rated: true },
      { id: 'other', name: 'Other', productLine: null, groupPriority: false, rated: false },
      { id: 'unapplied', name: 'Unapplied industry', productLine: null, groupPriority: false, rated: false }
    ],
    productLines: [{ id: 'pl1', name: 'Product line 1' }, { id: 'pl2', name: 'Product line 2' }, { id: 'pl3', name: 'Product line 3' }],
    channels: [{ id: 'direct', name: 'Direct' }, { id: 'partner', name: 'Partner' }, { id: 'allianceA', name: 'Alliance A' }, { id: 'allianceB', name: 'Alliance B' }],
    tiers: [
      { id: 1, name: 'Group priority', description: 'Set by group strategy' }, { id: 2, name: 'Focus', description: 'A winning recipe, worth investing in' },
      { id: 3, name: 'Opportunistic', description: 'No active investment' }
    ],
    segments: [
      { id: 'strategic', name: 'Strategic', description: 'Current ARR above the strategic threshold' },
      { id: 'growth', name: 'Growth', description: 'High planned order intake and ARR above the growth threshold' },
      { id: 'core', name: 'Core', description: 'Everything else' }, { id: 'scaled', name: 'Scaled', description: 'Current ARR below the scaled threshold' }
    ],
    scales: {
      growthPotential: {
        levels: [
          { score: 3, label: 'Strong dynamics, business to take' }, { score: 2, label: 'Healthy dynamics, large untapped base' },
          { score: 1, label: 'Limited traction, limited pool' }
        ]
      },
      criticality: {
        levels: [
          { score: 3, label: 'Core, business critical' }, { score: 2, label: 'Moderate value, executive level' },
          { score: 1, label: 'Limited value, not executive level' }
        ]
      },
      competitiveIntensity: {
        levels: [{ score: 3, label: 'We are the recognized leader' }, { score: 2, label: 'Fragmented, no clear leader' }, { score: 1, label: 'Dominant competitor(s)' }]
      },
      references: {
        levels: [{ score: 3, label: 'Selling to top 5 local players' }, { score: 2, label: 'Some references' }, { score: 1, label: 'No or limited references' }]
      },
      expertise: { levels: [{ score: 3, label: 'Generalized' }, { score: 2, label: 'Few key experts' }, { score: 1, label: 'Limited' }] },
      productFit: { levels: [{ score: 3, label: 'Strong' }, { score: 2, label: 'Partial' }, { score: 1, label: 'Major gaps' }] }
    },
    productCategories: [
      { id: 'swPerpetual', name: 'Software perpetual' }, { id: 'recurring', name: 'Recurring' }, { id: 'hardware', name: 'Hardware' },
      { id: 'services', name: 'Services' }
    ],
    solutions: [
      { id: 'sol1', name: 'Solution 1', category: 'recurring' }, { id: 'sol2', name: 'Solution 2', category: 'recurring' },
      { id: 'sol3', name: 'Solution 3', category: 'recurring' }, { id: 'sol4', name: 'Solution 4', category: 'recurring' },
      { id: 'sol5', name: 'Solution 5', category: 'swPerpetual' }, { id: 'sol6', name: 'Solution 6', category: 'hardware' }
    ],
    partnerTypes: [{ id: 'var', name: 'Value-added reseller' }, { id: 'si', name: 'System integrator' }, { id: 'referral', name: 'Referral partner' }],
    partnerMaturity: [
      { id: 'recruit', name: 'Recruit', rank: 1 }, { id: 'onboard', name: 'Onboard', rank: 2 }, { id: 'enable', name: 'Enable', rank: 3 },
      { id: 'skill', name: 'Skill', rank: 4 }, { id: 'strategic', name: 'Strategic', rank: 5 }
    ],
    routes: [
      { id: 'ownSales', name: 'Own sales force' }, { id: 'customerSuccess', name: 'Customer success' },
      { id: 'allianceBReseller', name: 'Alliance B as reseller' }, { id: 'otherResellers', name: 'Other resellers' },
      { id: 'systemIntegrators', name: 'System integrators' }, { id: 'partnerExisting', name: 'Partner existing business' }
    ]
  },
  aliases: {},
  sections: {
    marketCoverage: {
      sheet: '1. Market Coverage',
      headerRow: 9,
      headers: { industryId: 'Industry' },
      firstRow: 10,
      lastRow: null,
      key: 'industryId',
      columns: {
        industryId: 'B',
        growthPotential: 'D',
        criticality: 'E',
        competitiveIntensity: 'F',
        currentArr: 'G',
        pipelineTotal: 'H',
        pipelineCreated12m: 'I',
        references: 'J',
        expertise: 'K',
        productFit: 'L',
        tier: 'M',
        commentary: 'N'
      }
    },
    newBusiness: {
      sheet: '2. New Business',
      headerRow: 14,
      headers: { industryId: 'Industry', subVertical: 'Sub-industry' },
      firstRow: 15,
      lastRow: null,
      key: 'industryId',
      columns: {
        industryId: 'B',
        market: 'C',
        subVertical: 'D',
        'channelSplit.direct': 'E',
        'channelSplit.partner': 'F',
        'channelSplit.allianceA': 'G',
        'channelSplit.allianceB': 'H',
        targetAccounts: 'I',
        hitRate: 'J',
        avgDealSize: 'K',
        'growth.year2': 'L',
        'growth.year3': 'M',
        successFactors: 'N',
        arrPotential: ['O', 'P', 'Q'],
        servicesPotential: ['R', 'S', 'T'],
        servicesRatio: 'U',
        solution: 'V'
      }
    },
    customerGrowth: {
      sheet: '3. Customer Growth',
      headerRow: 9,
      headers: { name: 'Account' },
      firstRow: 10,
      lastRow: null,
      key: 'name',
      idPattern: '{region}-a{nn}',
      columns: {
        name: 'C',
        industryId: 'D',
        country: 'E',
        productLine: 'F',
        currentArr: 'G',
        riskLevel: 'H',
        growthPct: ['I', 'J', 'K'],
        multiplier3y: 'L',
        servicesRatio: 'M',
        incrementalArr: ['N', 'O', 'P'],
        servicesOrderIntake: ['Q', 'R', 'S'],
        cumulativeOrderIntake: 'T',
        segment: 'U'
      },
      cells: { 'thresholds.strategicArr': 'N3', 'thresholds.scaledArr': 'N4', 'thresholds.growthArr': 'N5', 'thresholds.growthOrderIntake': 'N6' }
    },
    partners: {
      sheet: '4. Partner',
      headerRow: 19,
      headers: { name: 'Partner' },
      firstRow: 20,
      lastRow: null,
      key: 'name',
      columns: {
        name: 'B',
        channel: 'C',
        maturity: 'D',
        expertiseGeo: 'E',
        expertiseProduct: 'F',
        fteSales: 'G',
        fteConsultants: 'H',
        centralSupportPct: 'I',
        arr: ['J', 'K', 'L'],
        services: ['M', 'N', 'O'],
        type: 'P',
        supportPct: ['Q', 'R', 'S'],
        distribution: ['T', 'U', 'V'],
        servicesFromPartners: ['W', 'X', 'Y']
      },
      cells: { outsourcingPct: 'I3' }
    },
    baseYear: {
      sheet: '7. Order Intake',
      firstRow: 8,
      lastRow: null,
      key: 'category',
      columns: { category: 'B', budget: 'C', forecast: 'D', actuals: 'E', pipeline: 'F', coverage: 'G' },
      cells: { year: 'C4', actualsThrough: 'C5' }
    },
    recap: {
      sheet: '4. Partner',
      blank: 'skip',
      rows: {
        first: 5,
        axes: [
          { field: 'year', values: [2027, 2028, 2029] }, { field: 'motion', values: ['newBusiness', 'customerGrowth'] },
          { field: 'type', values: ['arr', 'services'] }
        ]
      },
      cols: { first: 'E', axes: [{ field: 'channel', values: ['direct', 'partner', 'allianceA', 'allianceB'] }] }
    },
    revenue: {
      sheet: '6. Recap',
      filterCell: 'C2',
      blank: 'skip',
      rows: {
        first: 5,
        axes: [
          { field: 'year', values: [2027, 2028, 2029] }, { field: 'motion', values: ['newBusiness', 'customerGrowth'] },
          { field: 'type', values: ['arr', 'services'] }
        ]
      },
      cols: { first: 'E', axes: [{ field: 'channel', values: ['direct', 'partner', 'allianceA', 'allianceB'] }] }
    },
    booksValue: {
      sheet: '6. Recap',
      filterCell: 'C2',
      blank: 'skip',
      rows: {
        first: 20,
        axes: [
          { field: 'year', values: [2027, 2028, 2029] }, { field: 'motion', values: ['newBusiness', 'customerGrowth'] },
          { field: 'type', values: ['arr', 'services', 'swPerpetual', 'hardware'] }
        ]
      },
      cols: { first: 'E', axes: [{ field: 'channel', values: ['direct', 'partner', 'allianceA', 'allianceB'] }] }
    },
    strategicPlan: {
      sheet: '6. Recap',
      filterCell: 'C2',
      blank: 'null',
      rows: { first: 47, axes: [{ field: 'type', values: ['arr', 'services', 'swPerpetual', 'hardware'] }] },
      cols: { first: 'E', axes: [{ field: 'year', values: [2027, 2028, 2029] }] },
      variance: { cols: { first: 'I', axes: [{ field: 'year', values: [2027, 2028, 2029] }] } }
    },
    routes: {
      sheet: '6. Recap',
      filterCell: 'C2',
      blank: 'skip',
      rows: {
        first: 55,
        axes: [
          { field: 'route', values: ['ownSales', 'customerSuccess', 'allianceBReseller', 'otherResellers', 'systemIntegrators', 'partnerExisting'], stride: 8 },
          { field: 'solution', values: [null, 'sol1', 'sol2', 'sol3', 'sol4', 'sol5', 'sol6'] }
        ]
      },
      cols: { first: 'E', axes: [{ field: 'year', values: [2027, 2028, 2029] }, { field: 'type', values: ['arr', 'services', 'swPerpetual', 'hardware'] }] }
    }
  },
  extra: []
};
