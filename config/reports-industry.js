/*
 * File: config/reports-industry.js
 * Purpose: Report definitions for the Industry priorities view.
 * Provides: adds to window.TAP_REPORTS
 * Depends on: config/reports.js (the schema)
 * Used by: js/engine/registry.js, js/views/industry.js
 */
window.TAP_REPORTS = window.TAP_REPORTS || {};

// US-1.5.4: the tier each region gave each industry.
window.TAP_REPORTS['ind-tiers'] = {
  id: 'ind-tiers',
  view: 'industry',
  title: 'Which industries does each region prioritize?',
  explain: {
    shows: 'The tier each leader gave each industry. Group-priority industries are set centrally as Tier 1 and marked as such.',
    read: 'Darker cells are higher priority (Tier 1 darkest). An outlined cell means the leader left the tier blank. The last column counts regions per tier.',
    lookFor: 'Rows where every region agrees, and rows where tiers spread from 1 to 3.'
  },
  shape: 'grid',
  builder: 'tierGrid',
  dimension: 'industry',
  measures: [{ id: 'ind.tier', label: 'Tier' }],
  size: { options: ['ind.pipeline', 'ind.currentArr'], default: 'ind.pipeline' },
  defaultType: 'heatmap',
  types: ['heatmap', 'bubbleGrid', 'table'],
  breakdowns: [],
  sources: ['IN', 'PRE'],
  options: { sorts: ['groupPriority', 'agreement', 'disagreement', 'productLine'] }
};

// US-1.5.5: attractiveness against ability to win, per industry.
window.TAP_REPORTS['ind-quad'] = {
  id: 'ind-quad',
  view: 'industry',
  title: 'Where do regions see attractive markets they can, or can’t yet, win?',
  explain: {
    shows: 'Each industry placed by two scores built from the leaders’ ratings: attractiveness (up) and ability to win (across).',
    read: 'Both scores run from 1 to 3, higher is better. Each score is the average of three ratings. The lines at 2.0 split the chart into four areas. Bubble size is a system figure, not a leader’s rating.',
    lookFor: 'Industries in the upper left: rated attractive, with a lower ability to win today.'
  },
  shape: 'xyz',
  builder: 'quadrant',
  dimension: 'industry',
  measures: [{ id: 'ind.attractiveness', label: 'Attractiveness' }, { id: 'ind.ability', label: 'Ability to win' }],
  x: 'ind.ability',
  y: 'ind.attractiveness',
  size: { options: ['ind.pipeline', 'ind.currentArr'], default: 'ind.pipeline' },
  defaultType: 'bubble',
  types: ['bubble', 'scatter', 'table'],
  breakdowns: [],
  sources: ['APP', 'PRE'],
  options: {}
};

// US-1.5.6: the six ratings for one industry, by region.
window.TAP_REPORTS['ind-ratings'] = {
  id: 'ind-ratings',
  view: 'industry',
  title: 'How do regions rate {industry}?',
  explain: {
    shows: 'The six ratings each leader gave the chosen industry. The first three make up attractiveness, the last three ability to win.',
    read: 'Each dot is one region, or a combined figure in dark grey. Further right is a more favourable rating, from 1 to 3.',
    lookFor: 'Ratings where regions are far apart, and where one region sits apart from the rest.'
  },
  shape: 'compare',
  builder: null,
  dimension: 'rating',
  measures: [
    { id: 'ind.growthPotential', label: 'Growth potential' },
    { id: 'ind.criticality', label: 'Criticality' },
    { id: 'ind.competitiveIntensity', label: 'Competitive intensity' },
    { id: 'ind.references', label: 'References' },
    { id: 'ind.expertise', label: 'Expertise' },
    { id: 'ind.productFit', label: 'Product fit' }
  ],
  defaultType: 'dot',
  types: ['dot', 'bar', 'radar', 'table'],
  breakdowns: [],
  sources: ['IN'],
  options: { industryPicker: true, measuresAs: 'categories' }
};
