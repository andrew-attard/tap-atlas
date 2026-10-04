/*
 * File: config/reports.js
 * Purpose: Documents the one schema every report definition follows. The definitions themselves sit in one
 *          file per view (config/reports-overview.js, config/reports-industry.js).
 * Provides: window.TAP_REPORTS (empty here; the per-view files add to it)
 * Depends on: nothing
 * Used by: js/engine/registry.js, which reads and checks every definition
 *
 * To add a report for an existing data shape, add one definition to the view's file and list its id in
 * config/views.js. No chart code is needed (US-1.2.1).
 *
 * THE SCHEMA, field by field
 *
 *   id           Unique id, e.g. 'ind-tiers'. Used in config/views.js and by insight rules ("attach").
 *   view         The view it belongs to: 'overview', 'industry', ...
 *   title        The question the chart answers, e.g. 'Which industries does each region prioritize?'
 *   explain      Three short texts for the explanation panel (US-1.6.5):
 *                  { shows: 'What this shows', read: 'How to read it', lookFor: 'What to look for' }
 *   shape        The data shape (D18), which decides the chart types that make sense:
 *                  'compare' one value per region or category        bar, dot, radar (3 or fewer), table
 *                  'parts'   parts of a whole per region             stackedBar, stacked100, treemap, table,
 *                                                                    bubble (needs x, y and size; drawn by the
 *                                                                    parts builder)
 *                  'xy'      two measures per item                   scatter, table
 *                  'xyz'     two measures plus a size                bubble, scatter, table
 *                  'grid'    a value for every row and column        heatmap, bubbleGrid, table
 *                  'years'   a value per plan year                   line, groupedBar, table
 *                  'spread'  how far apart values are                dot, table
 *   builder      Optional. A dedicated chart builder by name ('tierGrid', 'quadrant'). Leave null to use
 *                the generic builder for the shape.
 *   dimension    What the categories are: 'entity' (regions or combined figures), 'industry', 'rating', 'year'.
 *   measures     The figures to show, from the measure catalogue (docs/ARCHITECTURE.md section 9).
 *                  [{ id: 'amb.arr', label: 'ARR' }, ...]  More than one gives a measure switch; the first is
 *                  the default. With options.measuresAs: 'categories', the measures become the categories
 *                  instead (e.g. the six ratings side by side) and there is no switch.
 *   parts        For 'parts': the parts that stack into each measure, e.g. { 'amb.arr': ['nb.arr', 'cg.arr'] }.
 *   x, y         For 'xy' and 'xyz': the measure ids on each axis.
 *   size         Makes a bubble type available: { options: ['ind.pipeline', 'ind.currentArr'], default: 'ind.pipeline' }.
 *   defaultType  The chart type shown first. Must be one of "types".
 *   types        The chart types offered. Must include 'table'. The panel also hides types the current
 *                comparison can't use (radar beyond 3 regions; bubble without a size).
 *   breakdowns   Allowed "break down by" options, at most one active: 'year', 'industry', 'channel', 'motion',
 *                'segment', 'risk' (TAP.reports.BREAKDOWNS). The panel offers only those the selected measure supports.
 *                Empty list for none.
 *   defaultBreakdown  Optional. The breakdown the panel starts with, e.g. 'year'. Must be one of "breakdowns".
 *   rows, columns, sort, filter   For 'list' reports and row bubbles (docs/ARCHITECTURE.md 17.4 and 17.7).
 *   drill        Optional. { next: '<reportId>', label } opens that report a level down on click (17.6).
 *   sources      Kinds of data named on the source line: 'IN' leader input, 'PRE' system figure,
 *                'DER' calculated in the workbook, 'APP' calculated by this app.
 *   options      Report-level settings. options.weights overrides the rate weights in config/settings.js for
 *                this report, e.g. { weights: { 'nb.hitRate': 'nb.targetAccounts' } }.
 */
window.TAP_REPORTS = window.TAP_REPORTS || {};
