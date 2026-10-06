/*
 * File: config/reports-outlook.js
 * Purpose: Report definitions for the Outlook view (ids in docs/ARCHITECTURE.md section 19.3). Schema: config/reports.js.
 * Provides: adds to window.TAP_REPORTS
 * Depends on: config/reports.js, js/reports/outlook-side.js (builder olSide), js/views/outlook.js (actualsLine, at call time)
 * Used by: js/engine/registry.js, js/views/outlook.js
 * Owner: OUTLOOK stream (#441)
 */
window.TAP_REPORTS = window.TAP_REPORTS || {};

(function () {
  'use strict';

  // US-4.2.2: each plan against its strategic plan. The measure switch picks the type (the whole plan, or one
  // product category); the bars are the strategic plan and the plan on its basis, with the variance written after them.
  window.TAP_REPORTS['ol-strategic'] = {
    id: 'ol-strategic',
    view: 'outlook',
    title: 'How does each plan compare with its strategic plan?',
    explain: {
      shows: 'Each region’s planned order intake through the organization’s books next to the order intake its strategic plan sets, for the three plan years together or year by year, and the difference between the two in money and in percent.',
      read: 'Two bars per region: the lighter one is the strategic plan, the darker one the plan, and the variance is written after them, plan minus strategic plan. The plan is read on the strategic plan’s basis: the same years and product categories, so a year or category the strategic plan leaves blank is left out of the plan too. Switch between the whole plan, ARR, services, software perpetual and hardware, or break the figures down by plan year or product category. The organization total compares the sum of the plans with the sum of the strategic plans, and its table gives each region’s share of the gap.',
      lookFor: 'Plans well below or well above their strategic plan, and years or categories where the difference sits. A region without a strategic plan reads "not provided" and is left out of the combined variance, which the note under the chart says.'
    },
    shape: 'compare',
    builder: 'olSide',
    dimension: 'entity',
    measures: [
      { id: 'sp.oi', label: 'Order intake' },
      { id: 'sp.arr', label: 'ARR' },
      { id: 'sp.services', label: 'Services' },
      { id: 'sp.swPerpetual', label: 'Software perpetual' },
      { id: 'sp.hardware', label: 'Hardware' }
    ],
    defaultType: 'bar',
    types: ['bar', 'table'],
    breakdowns: ['year', 'category'],
    sources: ['PRE', 'DER', 'APP'],
    options: {
      side: {
        bars: [{ id: 'sp.oi', label: 'Strategic plan' }, { id: 'sp.plan', label: 'Plan' }],
        end: { label: 'Variance', amount: 'sp.variance', rate: 'sp.variancePct', signed: true },
        // The product category each type measure stands for; every figure of the row is read for that category
        category: { 'sp.arr': 'recurring', 'sp.services': 'services', 'sp.swPerpetual': 'swPerpetual', 'sp.hardware': 'hardware' },
        share: { of: 'sp.variance', label: 'Share of the gap' }
      }
    }
  };

  // US-4.2.3: plan year 1 against the base year. The explanation names the month the actuals run to, read from
  // the loaded data each time it is shown, so its "read" and "lookFor" parts are getters.
  function actuals() { return TAP.outlookView ? ' ' + TAP.outlookView.actualsLine() : ''; }
  window.TAP_REPORTS['ol-baseyear'] = {
    id: 'ol-baseyear',
    view: 'outlook',
    title: 'How does year 1 of each plan compare with this year?',
    explain: {
      shows: 'Each region’s base year, the year before the plan, next to year 1 of its plan: the order intake budget, the latest forecast and the actuals so far, then plan year 1 through the organization’s books, with year 1’s growth over the forecast in percent.',
      get read() {
        return 'Four bars per region: budget, forecast, actuals so far and plan year 1, with the growth written after them. ' +
          'The growth compares plan year 1 with the latest forecast, or with the budget when the switch says so. Plan year 1 counts only the product categories the base year gives, so the two are like for like.' + actuals();
      },
      get lookFor() {
        return 'A year 1 far above the forecast: a plan that grows much faster than this year’s order intake is worth discussing. A region without a base year reads "not provided" and is left out of combined figures, which the note under the chart says.' + actuals();
      }
    },
    shape: 'compare',
    builder: 'olSide',
    dimension: 'entity',
    // One measure, so no switch: the growth, which the y1Jump insight names (D79); the bars are set in options.side
    measures: [{ id: 'by.growth', label: 'Base year' }],
    defaultType: 'bar',
    types: ['bar', 'table'],
    breakdowns: ['category'],
    sources: ['PRE', 'DER', 'APP'],
    options: {
      side: {
        bars: [{ id: 'by.budget', label: 'Budget' }, { id: 'by.forecast', label: 'Forecast' }, { id: 'by.actuals', label: 'Actuals so far' },
          { id: 'by.plan', label: 'Plan year 1' }],
        end: { label: { forecast: 'Year 1 over the forecast', budget: 'Year 1 over the budget' }, rate: 'by.growth', signed: true },
        against: { label: 'Growth against', options: [{ value: 'forecast', label: 'Forecast' }, { value: 'budget', label: 'Budget' }] }
      }
    }
  };

  // US-4.2.4: pipeline coverage. The generic compare chart with a line at 1, through a builder that adds the
  // pipeline and the amount still to win to the table (js/reports/outlook-coverage.js).
  window.TAP_REPORTS['ol-coverage'] = {
    id: 'ol-coverage',
    view: 'outlook',
    title: 'Does this year’s pipeline cover what is still to win?',
    explain: {
      shows: 'Each region’s pipeline coverage in the base year: the unweighted pipeline against the order intake still to win this year (the forecast minus the actuals so far), as a ratio, overall or by product category.',
      read: 'One bar per region, its coverage written beside it, such as 1.09×. The dashed line marks a coverage of 1, where the pipeline equals what is still to win. Where the workbook gives its own coverage ratio, that ratio is shown; where it does not, this app works it out and the note under the chart says so. Combined figures add up the pipelines and the amounts still to win before dividing.',
      lookFor: 'Regions near or below the line, whose remaining target rests on a thin pipeline, and categories where the coverage sits apart from the rest. A region without a base year reads "not provided".'
    },
    shape: 'compare',
    builder: 'olCoverage',
    dimension: 'entity',
    measures: [{ id: 'by.coverage', label: 'Pipeline coverage' }],
    defaultType: 'bar',
    types: ['bar', 'table'],
    breakdowns: ['category'],
    sources: ['PRE', 'APP'],
    get options() { return { refLines: [{ value: 1, label: TAP.content.text('olCoverage.refLine') }] }; }
  };
})();
