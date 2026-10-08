/*
 * File: config/custom-topics.js
 * Purpose: The topics of the Build a chart measure picker (D122, US-3.5.1): which measures each topic holds, and the
 *          short list of key measures it shows first. A measure belongs to the topic that names it in `ids`, else
 *          to the topic whose `prefixes` hold the first part of its id (`nb` for `nb.hitRate`).
 * Provides: window.TAP_CUSTOM_TOPICS
 * Depends on: nothing
 * Used by: js/ui/custom-measure-picker.js
 *
 * Topics show in this order; their names are in content/text-custom.js (custom.topics). A topic with no measure in
 * the data is not shown. `key` lists 5 to 10 measures in the order they show, chosen for what a sales leader
 * compares across regions; a key measure the data lacks is left out. No prefix or id may sit in two topics.
 */
window.TAP_CUSTOM_TOPICS = [
  { id: 'ambition', prefixes: ['amb'], ids: ['rc.all.arr', 'rc.all.services', 'rc.all.oi'],   // the plan totals across channels
    key: ['amb.arr', 'amb.services', 'amb.oi', 'amb.nbShare', 'rc.all.oi'] },
  { id: 'coverage', prefixes: ['ind', 'focus', 'base'], ids: [],
    key: ['base.pipeline', 'base.pipeline12m', 'base.arr', 'ind.attractiveness', 'ind.ability', 'focus.tier1', 'ind.growthPotential'] },
  { id: 'newBusiness', prefixes: ['nb'], ids: [],
    key: ['nb.arr', 'nb.hitRate', 'nb.avgDealSize', 'nb.wins', 'nb.targetAccounts', 'nb.services', 'nb.oi', 'nb.servicesRatio'] },
  { id: 'customers', prefixes: ['cg'], ids: [],
    key: ['cg.arr', 'cg.growth.all', 'cg.top3Share', 'cg.riskShare', 'cg.accounts', 'cg.oi3', 'cg.services'] },
  { id: 'partners', prefixes: ['pt', 'rc', 'rt', 'bk'], ids: [],
    key: ['pt.oiPerFte', 'rc.share.partner', 'bk.gap', 'bk.gapShare', 'pt.count', 'pt.fte', 'pt.arr', 'rt.oi'] },
  { id: 'outlook', prefixes: ['sp', 'by', 'rv', 'cv', 'oi'], ids: [],
    key: ['sp.variancePct', 'sp.variance', 'by.coverage', 'by.growth', 'by.forecast', 'rv.all.oi', 'rv.share', 'cv.oi'] }
];
