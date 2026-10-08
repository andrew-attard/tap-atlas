/*
 * File: config/reports-partners.js
 * Purpose: Report definitions for the Partners view.
 * Provides: adds to window.TAP_REPORTS (pt-reliance, pt-capacity, pt-books, pt-routes, pt-maturity, pt-list)
 * Depends on: config/reports.js (schema); builders 'rowBubble', 'list', 'ptBooks' (js/reports/pt-books.js) and
 *             'dimStack' (js/reports/dim-stack.js)
 * Used by: js/engine/registry.js, js/views/partners.js
 * Owner: CGP stream; the Phase 4 reports: NBPT stream (#453)
 */
window.TAP_REPORTS = window.TAP_REPORTS || {};

(function () {
  'use strict';
  // The four channels as stacked parts of one recap figure (t: arr, services or oi), both motions.
  function channels(t) { return ['direct', 'partner', 'allianceA', 'allianceB'].map(function (c) { return 'rc.all.' + t + '.' + c; }); }

  // US-2.3.2: how much each plan relies on partners and alliances.
  window.TAP_REPORTS['pt-reliance'] = {
    id: 'pt-reliance',
    view: 'partners',
    title: 'How much does each plan rely on partners and alliances?',
    explain: {
      shows: 'Each region’s total order intake from the recap, new business and customer growth together, split by channel: direct, partner and the two alliances.',
      read: 'One bar per region, each channel in its own colour, the same in every bar and named in the legend. Switch between Share of total and Amount above the chart. Break down by motion to see new business and customer growth apart, or by year.',
      lookFor: 'Plans that lean on partners or alliances much more or less than the others, and channels that grow from year to year.'
    },
    shape: 'parts',
    builder: null,
    dimension: 'entity',
    measures: [
      { id: 'rc.all.arr', label: 'ARR' },
      { id: 'rc.all.services', label: 'Services' },
      { id: 'rc.all.oi', label: 'Total order intake' }
    ],
    parts: { 'rc.all.arr': channels('arr'), 'rc.all.services': channels('services'), 'rc.all.oi': channels('oi') },
    defaultType: 'stacked100',
    types: ['stacked100', 'stackedBar', 'table'],
    breakdowns: ['motion', 'year'],
    sources: ['DER'],
    options: { partColors: 'channel', amountShare: true }   // D124: channel colours and the Amount / Share switch
  };

  // US-2.3.3: partner capacity against planned contribution, one bubble per partner.
  window.TAP_REPORTS['pt-capacity'] = {
    id: 'pt-capacity',
    view: 'partners',
    title: 'Do the partners have the people behind their planned contribution?',
    explain: {
      shows: 'Every named partner: its sales and consultant staff (full-time equivalent) across, the ARR it is planned to bring over three years up, and its three-year services as the bubble size.',
      read: 'With several regions, each region’s 5 partners with the most planned order intake (three-year ARR plus services), each in its region’s colour and named beside its bubble; the list below has every partner. With one region, every partner, coloured by its channel. Partners with no staff figures can’t be placed and are named below the chart. Click a bubble for the partner’s details, including order intake per person, which this app calculates.',
      lookFor: 'Partners high on the chart and far to the left: a large planned contribution from few people, worth discussing with the region.'
    },
    shape: 'xyz',
    builder: 'rowBubble',
    dimension: 'entity',
    rows: 'partners',
    measures: [],
    x: 'fte',
    y: 'arr3',
    size: { options: ['services3'], default: 'services3' },
    defaultType: 'bubble',
    types: ['bubble', 'table'],
    breakdowns: [],
    sources: ['IN', 'APP'],
    // D137: with several regions, each region's 5 partners with the largest ARR plus services, every name beside its
    // bubble (no numbered key); with one region, every partner coloured by channel (the D124 palette)
    options: { label: 'all', names: 'beside', topPerRegion: 5, topBy: ['arr3', 'services3'], oneRegionColors: 'channel' }
  };

  // US-4.5.1: order intake at customer value next to the value through the organization's books. The builder draws
  // two bars per region and offers the plan year and the split (channel or product category) as its own options.
  // Its figures are fixed (cv.oi, bk.oi, bk.gap, bk.gapShare, in js/reports/pt-books.js). The two values are listed
  // so an insight's "Show me" and Present can name them; they show together, so there is no measure switch.
  window.TAP_REPORTS['pt-books'] = {
    id: 'pt-books',
    view: 'partners',
    title: 'How much of each plan runs through the organization’s own books?',
    explain: {
      shows: 'Each region’s order intake twice: at customer value, the price the customer pays, and at books value, the part that runs through the organization’s own books. Both are split by channel, with the difference in money and as a share of customer value.',
      read: 'Two bars per region, customer value above books value, each channel in its own colour, named in the legend; split by product category, each category has its own colour instead, the same in every bar. The two differ for three reasons. Resellers keep a margin, so less than the customer price reaches the books. Some services are delivered by partners, who invoice them. And the outsourcing % a region sets moves that share of its services from its own delivery to partners. The difference compares ARR and services, the two types both values hold: software perpetual and hardware appear in the books value only. Pick one plan year or the three years together, and switch the split to product category.',
      lookFor: 'Regions where a large share of customer value does not run through the books, the channels that difference comes from, and whether it changes from year to year.'
    },
    shape: 'parts',
    builder: 'ptBooks',
    dimension: 'entity',
    measures: [{ id: 'cv.oi', label: 'Customer value' }, { id: 'bk.oi', label: 'Books value' }],
    defaultType: 'stackedBar',
    types: ['stackedBar', 'table'],
    breakdowns: [],
    sources: ['DER', 'APP'],
    options: { measuresAs: 'categories', partColors: 'channel' }   // the split in use picks its palette: channel (D124) or category (D135)
  };

  // US-4.5.2: order intake by route to market, from the recap. One part per route in the lookup's order; a route
  // the region gives no figure for has no part and reads "not provided" in the table.
  window.TAP_REPORTS['pt-routes'] = {
    id: 'pt-routes',
    view: 'partners',
    title: 'Which routes to market does each plan rely on?',
    explain: {
      shows: 'Each region’s order intake by route to market, from the recap: its own sales force, customer success, Alliance B as reseller, other resellers, system integrators and partner existing business.',
      read: 'One bar per region, each as wide as 100%, so the mix can be compared whatever the size of the plan. Each route is a part of the bar in its own colour, the same in every bar and named in the legend. Switch between Share of total and Amount above the chart; the plan year breakdown gives a bar per year. A route with no figure in a region’s recap has no part and reads “not provided” in the table.',
      lookFor: 'Plans that rely on resellers or system integrators much more than the others, and routes whose share changes from year to year.'
    },
    shape: 'parts',
    builder: 'dimStack',
    dimension: 'entity',
    measures: [{ id: 'rt.oi', label: 'Order intake' }],
    defaultType: 'stacked100',
    types: ['stacked100', 'stackedBar', 'table'],
    breakdowns: ['year'],
    sources: ['DER', 'IN'],
    options: { by: 'route', partColors: 'route', amountShare: true }   // D135: route colours and the Amount / Share switch
  };

  // US-4.5.3: the partner base by maturity level, in the lookup's order (Recruit to Strategic), counted and as the
  // order intake those partners are planned to bring; a partner without a level counts under "not provided".
  window.TAP_REPORTS['pt-maturity'] = {
    id: 'pt-maturity',
    view: 'partners',
    title: 'How established are the partners carrying each plan?',
    explain: {
      shows: 'Each region’s named partners by maturity level, from Recruit to Strategic as the template orders them: how many partners sit at each level, and the three-year order intake (ARR plus services) they are planned to bring. Partners with no level are counted under “Maturity not provided”.',
      read: 'One bar per region, the levels as parts in one colour from light to dark, Recruit lightest, named in the legend. Switch between the number of partners and their planned order intake, and between Amount and Share of total, which compares the mix whatever the size of the partner base. With one region, break down by partner type to see a bar per type.',
      lookFor: 'Plans whose order intake rests on partners still being recruited or onboarded, regions with no strategic partner, and partners named without a level or type.'
    },
    shape: 'parts',
    builder: 'dimStack',
    dimension: 'entity',
    measures: [{ id: 'pt.count.maturity', label: 'Partners' }, { id: 'pt.oi.maturity', label: 'Order intake' }],
    defaultType: 'stackedBar',
    types: ['stackedBar', 'stacked100', 'table'],
    breakdowns: ['partnerType'],
    sources: ['IN'],
    options: { by: 'maturity', partColors: 'maturity', amountShare: true }   // D135: the ordered maturity palette and the switch
  };

  // US-2.3.4: every named partner, as a sortable list.
  window.TAP_REPORTS['pt-list'] = {
    id: 'pt-list',
    view: 'partners',
    title: 'Which partners does each region name?',
    explain: {
      shows: 'Every partner the regions name, with its channel, type, maturity, expertise, people, central support, planned contribution and, where the template gives it, the distribution it carries at customer value.',
      read: 'One row per partner, sorted by three-year ARR. Filter by channel, sort by any column and click a row for the partner’s details and source row. "Also named by" lists the other regions that name a partner with the same name, ignoring case and spacing.',
      lookFor: 'Partners several regions work with, and partners carrying a large plan with few people.'
    },
    shape: 'list',
    builder: 'list',
    dimension: 'entity',
    rows: 'partners',
    columns: [
      { key: 'region' }, { key: 'name' }, { key: 'channel' }, { key: 'type' }, { key: 'maturity' }, { key: 'expertiseGeo' }, { key: 'expertiseProduct' },
      { key: 'fteSales' }, { key: 'fteConsultants' }, { key: 'centralSupportPct' }, { key: 'arr3' }, { key: 'services3' }, { key: 'distribution' },
      { key: 'oiPerFte' }, { key: 'alsoNamed' }
    ],
    sort: { key: 'arr3', dir: 'desc' },
    filter: [{ key: 'channel', label: 'Channels', multi: true }],   // D138: a dropdown with counts
    defaultType: 'list',
    types: ['list'],
    breakdowns: [],
    sources: ['IN', 'APP'],
    options: {}
  };
})();
