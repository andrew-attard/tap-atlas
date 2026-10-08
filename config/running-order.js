/*
 * File: config/running-order.js
 * Purpose: The presentation file: the set list of charts that presentation mode shows full screen, one step at
 *          a time, each with its own comparison and highlight (US-3.1.1, D97). "Present" (beside the data date) or
 *          the P key plays it; Space or Right goes on, Left goes back, Esc leaves. To make your own, choose "Add to
 *          presentation" in a chart's More menu for each chart, in order, then "Copy as file text" in the Guide
 *          ("Your presentation") and paste it over this file, so "Present" plays it for everyone. In the code it
 *          is called the running order.
 * Provides: window.TAP_RUNNING_ORDER
 * Depends on: nothing
 * Used by: js/ui/present.js, js/ui/present-steps.js
 * Owner: PRESENT stream; the two Outlook steps PAGES4 (US-4.6.3)
 *
 * Each step names exactly one of these three:
 *   report     the id of a chart, for example 'nb-levers' (the ids are in config/reports-*.js)
 *   insight    the id of an insight, for example 'consensus:education'. The step shows the insight's chart with
 *              the insight highlighted, and the insight's sentence as its title
 *   custom     a custom chart: {measure, by, type}, or a full chart definition copied from the app
 * and may also set any of these (leave one out to get the chart's usual setting):
 *   title      a short title, shown in the progress row with "Step 3 of 11"
 *   measure    which of the chart's measures to show, for example 'nb.wins'
 *   type       the chart type, for example 'bar', 'dot', 'heatmap' or 'stacked100' (one the chart offers),
 *              or 'table' for the table view
 *   breakdown  break the chart down by 'year', 'industry', 'channel', 'motion', 'segment' or 'risk' (if offered),
 *              or 'none' for no breakdown on a chart that starts with one
 *   industry   the industry id a one-industry chart shows (the ratings, for example)
 *   cmp        what to compare, as in the comparison bar:
 *                mode     'all' (all regions), 'set' (selected regions) or 'one' (one against the rest).
 *                         An older 'pair' (one against one, with focus and second) is still read, as a
 *                         selection of its two regions, and an older 'org' as all regions
 *                focus    the region id the comparison is about ('one')
 *                set      a list of one region id or more ('set')
 *                restAgg  the rest as an 'average' or a 'total' ('one'); rest is accepted as a shorter name
 *                restAs   the rest 'combined' into one figure or shown 'individual'ly ('one')
 *              The comparison applies to that step only. Leaving presentation mode restores the screen as it was.
 *   highlight  what to outline: {regionIds: [...], industryIds: [...], mark: 'bar'}; mark is 'bar', 'points',
 *              'cell', 'industryRow', 'regionColumn', 'quadrant' or 'ratingCell' (measureIds: [...]), as the chart draws it
 * A step that names a chart, measure, region or insight this data doesn't have is left out when presentation
 * starts, and listed in the data sources panel. The rest still run.
 */
window.TAP_RUNNING_ORDER = {
  steps: [
    { title: 'The size and make-up of every plan', report: 'ov-ambition' },
    { title: 'Where the regions place each industry', report: 'ind-tiers' },
    { insight: 'consensus:education' },
    { title: 'Attractive industries and the ability to win there', report: 'ind-quad' },
    { title: 'New business by industry', report: 'nb-industries', measure: 'ind.nb.arr' },
    { title: 'New customer wins: one region against the rest', report: 'nb-levers', measure: 'nb.wins',
      cmp: { mode: 'one', focus: 'na', restAgg: 'average' }, highlight: { regionIds: ['na'], mark: 'bar' } },
    { title: 'Customer growth year by year', report: 'cg-growth', breakdown: 'year' },
    { title: 'How concentrated customer growth is', report: 'cg-exposure', measure: 'cg.top3Share' },
    { title: 'Which channels carry each plan', report: 'pt-reliance', type: 'stacked100' },
    { title: 'Partner capacity in two regions', report: 'pt-capacity', cmp: { mode: 'set', set: ['seu', 'mea'] } },
    { title: 'Each plan against its strategic plan', report: 'ol-strategic' },
    { title: 'The revenue each plan brings in, year by year', report: 'ol-revenue' },
    { title: 'The accounts behind one region’s growth', report: 'cg-accounts', cmp: { mode: 'one', focus: 'apac' } }
  ]
};
