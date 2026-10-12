/*
 * File: js/import/import-fields.js
 * Purpose: The field kinds of every row section, in the Data Contract's order, the kinds of their fixed cells, and the
 *          units of extra sections as kinds; docs/ARCHITECTURE.md section 20.2.
 * Provides: TAP.importFields (SECTIONS, EXTRA_UNITS)
 * Depends on: js/core/namespace.js
 * Used by: js/import/import-rows.js, js/import/import-values.js, js/import/import-map.js
 * Owner: READ stream (#585)
 */
(function (TAP) {
  'use strict';

  // section: { fields: { field: kind }, key, byYear, order, cells?, derived?, noteKey? }
  //   key: the field whose blank cell marks a spare row; byYear: fields with one column per plan year;
  //   cells: the kinds of the section's fixed cells; derived: fields written even when no column maps them
  //   (filled by the reader); noteKey: the wording key for a bad value of a field, when not the usual one.
  function section(fields, key, byYear, more) {
    return Object.assign({ fields: fields, key: key, byYear: byYear, order: Object.keys(fields) }, more || {});
  }

  var SECTIONS = {
    marketCoverage: section({
      industryId: 'industry',
      growthPotential: 'rating:growthPotential', criticality: 'rating:criticality', competitiveIntensity: 'rating:competitiveIntensity',
      references: 'rating:references', expertise: 'rating:expertise', productFit: 'rating:productFit',
      currentArr: 'money', pipelineTotal: 'money', pipelineCreated12m: 'money',
      tier: 'tier', commentary: 'text'
    }, 'industryId', [], { noteKey: { industryId: 'unknownIndustry' } }),

    newBusiness: section({
      industryId: 'industry', tier: 'tier', market: 'text', subVertical: 'text',
      'channelSplit.direct': 'share', 'channelSplit.partner': 'share', 'channelSplit.allianceA': 'share', 'channelSplit.allianceB': 'share',
      targetAccounts: 'count', hitRate: 'share', avgDealSize: 'number', 'growth.year2': 'share', 'growth.year3': 'share',
      successFactors: 'text', arrPotential: 'money', servicesPotential: 'money', servicesRatio: 'share', solution: 'solution'
    }, 'industryId', ['arrPotential', 'servicesPotential'], { derived: ['tier'] }),

    customerGrowth: section({
      name: 'text', industryId: 'industry', country: 'text', productLine: 'productLine', currentArr: 'money', riskLevel: 'risk',
      growthPct: 'share', multiplier3y: 'number', servicesRatio: 'share', incrementalArr: 'money', servicesOrderIntake: 'money',
      cumulativeOrderIntake: 'money', segment: 'segment'
    }, 'name', ['growthPct', 'incrementalArr', 'servicesOrderIntake'], {
      cells: { 'thresholds.strategicArr': 'money', 'thresholds.scaledArr': 'money', 'thresholds.growthArr': 'money', 'thresholds.growthOrderIntake': 'money' }
    }),

    partners: section({
      name: 'text', channel: 'partnerChannel', maturity: 'maturity', expertiseGeo: 'text', expertiseProduct: 'text',
      fteSales: 'count', fteConsultants: 'count', centralSupportPct: 'share', arr: 'money', services: 'money',
      type: 'partnerType', supportPct: 'share', distribution: 'money', servicesFromPartners: 'money'
    }, 'name', ['arr', 'services', 'supportPct', 'distribution', 'servicesFromPartners'], { cells: { outsourcingPct: 'share' } }),

    baseYear: section({
      category: 'category', budget: 'money', forecast: 'money', actuals: 'money', pipeline: 'money', coverage: 'number'
    }, 'category', [], { cells: { year: 'year', actualsThrough: 'month' } })
  };

  // The extra-section units (js/core/extra.js UNITS) as kinds
  var EXTRA_UNITS = { money: 'money', pct: 'share', count: 'count', text: 'text' };

  TAP.importFields = { SECTIONS: SECTIONS, EXTRA_UNITS: EXTRA_UNITS };
})(window.TAP);
