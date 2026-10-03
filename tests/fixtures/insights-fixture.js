/*
 * File: tests/fixtures/insights-fixture.js
 * Purpose: A small fixed list of insight objects in their final shape (ARCHITECTURE section 12), one or more per
 *          family, so pages can be built before the rules are. Figures follow the sample data's planted cases.
 * Provides: window.TEST_FIXTURES.insights
 * Depends on: nothing
 * Used by: tests/test-*.js (PAGES, OVERVIEW, PANEL), tests/test-insights.js
 * Owner: the INSIGHTS stream.
 *
 * Shape notes for pages:
 * - reportId is the report "Show me" opens; highlight is the Target to draw there (mark says how).
 * - attach lists every report the insight belongs to (the panel list filters on it); reportId is the first one.
 * - When reportId is null the data has no Phase 1 report: fallback is 'details', and "Show me" opens
 *   TAP.layers.openDetails(highlight) for the region instead.
 * - figures are {label, cell, unit, field, measureId}: cells with sources, shown on demand. unit is the measure unit
 *   ('money', 'pct', 'rating', 'score', 'count', 'tier', 'text'), field the rating field for ratings, and measureId
 *   the catalogue measure when there is one. Format with TAP.format.cell(cell, {unit, field, exact: true}).
 * - label is always 'Observation to discuss'.
 */
window.TEST_FIXTURES = window.TEST_FIXTURES || {};
window.TEST_FIXTURES.insights = (function () {
  'use strict';

  function src(regionId, section, field, row, kind, year) {
    return { regionId: regionId, section: section, field: field, row: row, rows: row == null ? [] : [row], year: year || null,
      cell: null, kind: kind };
  }
  function cell(v, kind, s) { return { v: v, state: 'value', kind: kind, src: s }; }
  function combined(v, how, regionIds, weightBy) {
    return { v: v, state: 'value', kind: 'APP', src: { combined: true, how: how, regionIds: regionIds, excluded: [],
      notApplicable: [], weightBy: weightBy || null, weighted: !!weightBy } };
  }
  function target(reportId, mark, regionIds, industryIds, extra) {
    return Object.assign({ reportId: reportId, regionIds: regionIds || [], industryIds: industryIds || [], accountIds: [],
      quadrant: null, mark: mark }, extra || {});
  }
  function insight(o) {
    return Object.assign({ industryIds: [], accountIds: [], attach: o.reportId ? [o.reportId] : [], fallback: o.reportId ? null : 'details',
      label: 'Observation to discuss' }, o);
  }

  var ALL = ['na', 'latam', 'neu', 'seu', 'ceu', 'mea', 'apac'];
  var NAMES = { na: 'North America', latam: 'Latin America', neu: 'Northern Europe', seu: 'Southern Europe',
    ceu: 'Central Europe', mea: 'Middle East & Africa', apac: 'Asia Pacific' };
  function others(id) { return ALL.filter(function (r) { return r !== id; }); }

  return [
    insight({
      id: 'consensus:education', ruleId: 'consensus', family: 'priorities',
      sentence: 'Education is Tier 1 or 2 in 6 of 7 regions.',
      description: 'An industry placed in Tier 1 or 2 by at least 5 of every 7 regions (scaled to the number of regions).',
      regionIds: ['na', 'latam', 'neu', 'seu', 'ceu', 'mea'], industryIds: ['education'],
      figures: ALL.map(function (r) {
        return { label: 'Tier, ' + NAMES[r], cell: cell(r === 'apac' ? 3 : 2, 'IN', src(r, 'marketCoverage', 'tier', 25, 'IN')), unit: 'tier', field: null, measureId: 'ind.tier' };
      }),
      significance: 0.62, sources: ALL.map(function (r) { return src(r, 'marketCoverage', 'tier', 25, 'IN'); }),
      reportId: 'ind-tiers', highlight: target('ind-tiers', 'industryRow', ['na', 'latam', 'neu', 'seu', 'ceu', 'mea'], ['education'])
    }),
    insight({
      id: 'groupPriority:datacenters:ability', ruleId: 'groupPriority', family: 'priorities',
      sentence: 'Data Centers is a group priority, but 4 regions rate their ability to win there as low.',
      description: 'A group-priority industry (Tier 1 everywhere) that a region’s own ratings place in the less able, or less attractive, half.',
      regionIds: ['latam', 'neu', 'ceu', 'apac'], industryIds: ['datacenters'],
      figures: ['latam', 'neu', 'ceu', 'apac'].map(function (r) {
        return { label: 'Ability to win, ' + NAMES[r], cell: cell(1.333333, 'APP', src(r, 'marketCoverage', 'ability', 24, 'APP')), unit: 'score', field: null, measureId: 'ind.ability' };
      }),
      significance: 0.48, sources: ['latam', 'neu', 'ceu', 'apac'].map(function (r) { return src(r, 'marketCoverage', 'expertise', 24, 'IN'); }),
      reportId: 'ind-tiers', highlight: target('ind-tiers', 'industryRow', ['latam', 'neu', 'ceu', 'apac'], ['datacenters']),
      attach: ['ind-tiers', 'ind-quad']
    }),
    insight({
      id: 'tierVsPipeline:seu:retail', ruleId: 'tierVsPipeline', family: 'judgement',
      sentence: 'Southern Europe placed Retail in Tier 3, but it holds 18% of the region’s pipeline (€2.9M). What keeps it in Tier 3?',
      description: 'A Tier 3 industry holding at least 15% of the region’s pipeline.',
      regionIds: ['seu'], industryIds: ['retail'],
      figures: [
        { label: 'Tier, Retail', cell: cell(3, 'IN', src('seu', 'marketCoverage', 'tier', 22, 'IN')), unit: 'tier', field: null, measureId: 'ind.tier' },
        { label: 'Pipeline, Retail', cell: cell(2935, 'PRE', src('seu', 'marketCoverage', 'pipelineTotal', 22, 'PRE')), unit: 'money', field: null, measureId: 'ind.pipeline' },
        { label: 'Pipeline, all industries', cell: cell(16306, 'PRE', src('seu', 'marketCoverage', 'pipelineTotal', null, 'PRE')), unit: 'money', field: null, measureId: 'base.pipeline' }
      ],
      significance: 0.41, sources: [src('seu', 'marketCoverage', 'tier', 22, 'IN'), src('seu', 'marketCoverage', 'pipelineTotal', 22, 'PRE')],
      reportId: 'ind-tiers', highlight: target('ind-tiers', 'cell', ['seu'], ['retail']), attach: ['ind-tiers', 'ind-quad']
    }),
    insight({
      id: 'strongRating:neu:pharma', ruleId: 'strongRating', family: 'judgement',
      sentence: 'Northern Europe rates its references in Pharma and Biotech as strong, with no current ARR or pipeline there. What does the rating draw on?',
      description: 'References, expertise or product fit rated 3 where current ARR and pipeline for that industry are both zero.',
      regionIds: ['neu'], industryIds: ['pharma'],
      figures: [
        { label: 'References, Pharma and Biotech', cell: cell(3, 'IN', src('neu', 'marketCoverage', 'references', 21, 'IN')), unit: 'rating', field: 'references', measureId: 'ind.references' },
        { label: 'Current ARR, Pharma and Biotech', cell: cell(0, 'PRE', src('neu', 'marketCoverage', 'currentArr', 21, 'PRE')), unit: 'money', field: null, measureId: 'ind.currentArr' },
        { label: 'Pipeline, Pharma and Biotech', cell: cell(0, 'PRE', src('neu', 'marketCoverage', 'pipelineTotal', 21, 'PRE')), unit: 'money', field: null, measureId: 'ind.pipeline' }
      ],
      significance: 0.37, sources: [src('neu', 'marketCoverage', 'references', 21, 'IN'), src('neu', 'marketCoverage', 'currentArr', 21, 'PRE')],
      reportId: 'ind-quad', highlight: target('ind-quad', 'points', ['neu'], ['pharma']), attach: ['ind-quad', 'ind-tiers']
    }),
    insight({
      id: 'outlier:nb.hitRate:ceu', ruleId: 'outlier', family: 'assumptions',
      sentence: 'Central Europe plans a 35% hit rate, more than twice the average of the other regions (15%).',
      description: 'A planning assumption at least twice, or at most half, the weighted average of the other regions, or outside every other region’s range.',
      regionIds: ['ceu'],
      figures: [
        { label: 'Hit rate, Central Europe', cell: cell(0.35, 'IN', src('ceu', 'newBusiness', 'hitRate', null, 'IN')), unit: 'pct', field: null, measureId: 'nb.hitRate' },
        { label: 'Hit rate, average of the other 6 regions', cell: combined(0.150158, 'wmean', others('ceu'), 'nb.targetAccountsRated'), unit: 'pct', field: null, measureId: 'nb.hitRate' }
      ],
      significance: 0.66, sources: [src('ceu', 'newBusiness', 'hitRate', null, 'IN')],
      reportId: null, highlight: target(null, null, ['ceu'])
    }),
    insight({
      id: 'pipelineCover:latam', ruleId: 'pipelineCover', family: 'realism',
      sentence: 'Latin America’s year-1 new business ambition (€1.5M) is 4× the pipeline it created in the last 12 months (€363.4k).',
      description: 'Year-1 new business ARR potential at least 3 times the pipeline created in the last 12 months.',
      regionIds: ['latam'],
      figures: [
        { label: 'New business ARR potential, year 1', cell: cell(1453.6, 'DER', src('latam', 'newBusiness', 'arrPotential', null, 'DER', 1)), unit: 'money', field: null, measureId: 'nb.arr' },
        { label: 'Pipeline created in the last 12 months', cell: cell(363.4, 'PRE', src('latam', 'marketCoverage', 'pipelineCreated12m', null, 'PRE')), unit: 'money', field: null, measureId: 'base.pipeline12m' }
      ],
      significance: 0.57, sources: [src('latam', 'newBusiness', 'arrPotential', null, 'DER', 1), src('latam', 'marketCoverage', 'pipelineCreated12m', null, 'PRE')],
      reportId: 'ov-ambition', highlight: target('ov-ambition', 'bar', ['latam'])
    }),
    insight({
      id: 'concentration:na', ruleId: 'concentration', family: 'exposure',
      sentence: '60% of North America’s planned customer growth sits in 3 accounts (Masvadal Stores, Kondicombe Data Centers and Frosvacombe Labs), one of them flagged high risk.',
      description: 'At least 50% of a region’s planned customer growth (incremental ARR over three years) in its top 3 accounts.',
      regionIds: ['na'], accountIds: ['na-a01', 'na-a05', 'na-a06'],
      figures: [
        { label: 'Masvadal Stores', cell: cell(1511.7, 'DER', src('na', 'customerGrowth', 'incrementalArr', 10, 'DER')), unit: 'money', field: null, measureId: null },
        { label: 'Kondicombe Data Centers (high risk)', cell: cell(1210.5, 'DER', src('na', 'customerGrowth', 'incrementalArr', 14, 'DER')), unit: 'money', field: null, measureId: null },
        { label: 'Frosvacombe Labs', cell: cell(909.4, 'DER', src('na', 'customerGrowth', 'incrementalArr', 15, 'DER')), unit: 'money', field: null, measureId: null },
        { label: 'Planned customer growth, all accounts', cell: cell(6044.2, 'DER', src('na', 'customerGrowth', 'incrementalArr', null, 'DER')), unit: 'money', field: null, measureId: 'cg.arr' }
      ],
      significance: 0.39, sources: [src('na', 'customerGrowth', 'incrementalArr', null, 'DER'), src('na', 'customerGrowth', 'riskLevel', 14, 'PRE')],
      reportId: null, highlight: target(null, null, ['na'], [], { accountIds: ['na-a01', 'na-a05', 'na-a06'] })
    }),
    insight({
      id: 'notYetWinnable:fsm', ruleId: 'notYetWinnable', family: 'capability',
      sentence: '4 regions see Field Service Management as attractive but rate their ability to win as low.',
      description: 'An industry in the attractive, not-yet-able-to-win quadrant for at least 3 regions.',
      regionIds: ['na', 'seu', 'mea', 'apac'], industryIds: ['fsm'],
      figures: [
        { label: 'Ability to win, North America', cell: cell(1.333333, 'APP', src('na', 'marketCoverage', 'ability', 26, 'APP')), unit: 'score', field: null, measureId: 'ind.ability' },
        { label: 'Ability to win, Southern Europe', cell: cell(1.666667, 'APP', src('seu', 'marketCoverage', 'ability', 26, 'APP')), unit: 'score', field: null, measureId: 'ind.ability' },
        { label: 'Ability to win, Middle East & Africa', cell: cell(1.333333, 'APP', src('mea', 'marketCoverage', 'ability', 26, 'APP')), unit: 'score', field: null, measureId: 'ind.ability' },
        { label: 'Ability to win, Asia Pacific', cell: cell(1.333333, 'APP', src('apac', 'marketCoverage', 'ability', 26, 'APP')), unit: 'score', field: null, measureId: 'ind.ability' },
        { label: 'What North America says is needed', cell: cell('Field service references', 'IN', src('na', 'newBusiness', 'successFactors', null, 'IN')), unit: 'text', field: null, measureId: null },
        { label: 'What Middle East & Africa says is needed', cell: cell('Mobile workforce integration partner', 'IN', src('mea', 'newBusiness', 'successFactors', null, 'IN')), unit: 'text', field: null, measureId: null }
      ],
      significance: 0.53, sources: ['na', 'seu', 'mea', 'apac'].map(function (r) { return src(r, 'marketCoverage', 'ability', 26, 'APP'); }),
      reportId: 'ind-quad', highlight: target('ind-quad', 'quadrant', ['na', 'seu', 'mea', 'apac'], ['fsm'], { quadrant: 'attractiveNotYet' })
    })
  ];
})();
