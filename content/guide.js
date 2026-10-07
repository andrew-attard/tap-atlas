/*
 * File: content/guide.js
 * Purpose: Text for the Guide page: how to use the app and territory account planning explained (US-1.6.1, US-1.6.2).
 * Provides: window.TAP_CONTENT.guide
 * Depends on: nothing
 * Used by: js/core/content.js (TAP.content.guide), js/views/guide.js
 *
 * THE SHAPE (js/views/guide.js renders it; read it through TAP.content.guide(), which lays the organization
 * layer over it)
 *
 *   contents   The short contents list at the top: [{ id, title }]. The ids are the page's two sections:
 *              'howTo' and 'planning'. There is no glossary section: definitions show where terms appear (D98).
 *   howTo      { title, intro, sections: [{ id, title, paragraphs: ['...'], link: { view: 'newBusiness' } (optional),
 *              shortcuts: true (optional: the number keys are listed under it, built from the menu order) }] }
 *              "How to use this app", with one section per view that needs explaining (each linking to its view).
 *              The "Take the tour" and "Reset all charts to default" buttons belong here; their labels live in
 *              content/text-pages.js.
 *   planning   { title, sections: [{ id, title, paragraphs: ['...'], link: { view: 'industry' } | null }] }
 *              "Territory account planning explained". link names the view that shows the section (a view id
 *              from config/views.js), or null when no single view does.
 *
 * Paragraphs are plain text, one to three short sentences each. Glossary terms in them are marked by
 * TAP.content.mark(). The organization layer can replace a section's paragraphs, add paragraphs or add sections
 * by id (see content/organization.example.js); sections it touched carry layer: 'organization'.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.guide = {
  contents: [
    { id: 'howTo', title: 'How to use this app' },
    { id: 'planning', title: 'Territory account planning explained' }
  ],

  howTo: {
    title: 'How to use this app',
    intro: 'This app puts every region’s territory account plan side by side. It reads the finished workbooks and never changes them.',
    sections: [
      { id: 'menu', title: 'The menu', paragraphs: [
        'The menu at the top lists the views: Overview, Market coverage, New business, Customer growth, Partners, Outlook, Other sections (when the plans hold extra template sections), Regions and Insights. Build a chart and this Guide sit at the right end. The view you are on is highlighted.',
        'Each view answers a few questions, one chart per question. The browser’s back button takes you to the view you came from.',
        'A one-line tip under each view’s title says where to start. "Hide tips" hides the tips until the page is reloaded.'
      ] },
      { id: 'viewNewBusiness', title: 'The New business view', link: { view: 'newBusiness' }, paragraphs: [
        'New business shows where each region expects new customers to come from: the industries, solutions and channels its new business rests on, and the assumptions behind the number.',
        'Start with the industry grid and the solution chart, then compare levers such as target accounts and hit rate. The list below names every sub-industry and market each region targets, and which other regions target the same one.'
      ] },
      { id: 'viewCustomers', title: 'The Customer growth view', link: { view: 'customers' }, paragraphs: [
        'Customer growth shows how each region plans to grow its existing customers: how the customer base is segmented and the growth each region assumes.',
        'It also shows how much of that growth rests on the three largest accounts or on accounts flagged at risk. The account list names every account in the plan; select a row to see its figures by plan year.'
      ] },
      { id: 'viewPartners', title: 'The Partners view', link: { view: 'partners' }, paragraphs: [
        'Partners shows how much each plan relies on partners and alliances, and what the named partners bring: their staff, planned order intake and order intake per FTE.',
        'Three charts compare customer value with the value through the organization’s books, show order intake by route to market, and count partners by maturity level. The partner list names every partner, with its type, its maturity and the other regions that named the same one.'
      ] },
      { id: 'viewOutlook', title: 'The Outlook view', link: { view: 'outlook' }, paragraphs: [
        'Outlook sets each plan against the organization’s strategic plan, and plan year 1 against the base year: the budget, forecast, actuals and pipeline coverage of the year before the plan.',
        'It also shows the revenue each plan brings in year by year, and order intake by product category. When the plans hold none of these parts, the view says so in one line.'
      ] },
      { id: 'viewRegions', title: 'Region profiles', link: { view: 'regions' }, paragraphs: [
        'A region profile puts one region’s whole plan on one page: its ambition, industry priorities, new business, customers and partners, and its strategic plan and revenue when the plans hold them, with the same charts as the other views.',
        'To open one, choose Regions in the menu and pick a region, or select "Open profile" on a region card on the Overview or in a details panel. The back button returns to where you were.'
      ] },
      { id: 'compare', title: 'The comparison bar', paragraphs: [
        'The comparison bar decides which regions every chart shows, in four modes. All regions shows each region separately. Selected regions shows only the regions you tick, one region or more, so a single region can be shown on its own.',
        'One vs the rest sets one focus region against the others. All regions combined adds every region together into one figure, as if they were one region.',
        'The sentence under the bar always says in plain words what is on screen, for example "Showing North America only".',
        'With one focus region, the other regions can be shown one by one or as one combined figure: their average or their total. Combined figures are drawn in dark grey and say how they were made.',
        'A single chart can also compare differently for a side question. It shows a "Custom comparison" badge, and goes back to the shared setting when the bar changes.'
      ] },
      { id: 'panels', title: 'Report panels', paragraphs: [
        'Every chart sits in a panel that works the same way. The title is the question the chart answers, and the line below it gives the main takeaway.',
        'The explanation icon says what the chart shows, how to read it and what to look for. Clicking a bar, point or cell opens a side panel with everything known about that item.',
        'A panel can be expanded to fill the screen for discussion, and saved or copied as an image for slides. Esc returns to the view.',
        'Some charts open one level down when you select a bar, for example from a region to its industries. The trail of names above the chart goes back up.'
      ] },
      { id: 'chartTypes', title: 'Chart types', paragraphs: [
        'The chart type menu lists only the types that suit the data, such as bars, dots, bubbles or a heatmap. The default type is marked and one click goes back to it.',
        'Your choice is remembered for that chart in this browser. The "Reset all charts to default" button on this page clears every choice.',
        'Some charts can also be broken down by a second dimension, such as plan year. Only one breakdown is shown at a time.'
      ] },
      { id: 'table', title: 'Table view', paragraphs: [
        'Every chart can be shown as a table with the exact figures. Charts round to one decimal, for example 1.2M; tables show the full value.',
        'Columns can be sorted, and the focus region’s row is highlighted. The copy button copies the table so it pastes cleanly into a spreadsheet, an email or a slide.',
        'Some panels are lists, one row per line of a workbook, such as every account or partner. Select a heading to sort, use the filter above the list to narrow it, and select a row to see everything about it.'
      ] },
      { id: 'sources', title: 'Where figures come from', paragraphs: [
        'Every figure can be traced to its workbook, sheet and cell. Tooltips and table rows show the address, and say what kind of data it is.',
        'The data date in the comparison bar opens the data sources panel. It lists each region’s file, when it was saved and imported, and any notes from the import.',
        'A blank in a workbook shows as "not provided", never as zero. Charts list the regions that had no data.'
      ] },
      { id: 'insights', title: 'Insights', paragraphs: [
        'Insights are short sentences the app writes when a figure stands out, such as regions that disagree on an industry. They are observations to discuss, not conclusions.',
        'Each insight shows the figures and the rule behind it. "Show me" highlights the data it refers to on its chart.',
        'The Insights page lists them all, ranked and grouped by family. Any insight can be hidden for the rest of the session.'
      ] },
      { id: 'keys', title: 'Keyboard shortcuts', shortcuts: true, paragraphs: [
        'When presenting, a number key opens the view at that place in the menu, as listed below: 1 to 9 for the first nine, and 0 for the tenth. P plays the saved presentation: a set list of charts, full screen, one step at a time. The Guide section "Your presentation" explains it and how to make your own.',
        'Esc closes one thing at a time: an open list or definition first, then a side panel, then an expanded chart. In an expanded chart the arrow keys move between the charts, and Backspace goes up a level after a drill-down.'
      ] }
    ]
  },

  planning: {
    title: 'Territory account planning explained',
    sections: [
      { id: 'what', title: 'What territory account planning is', link: null, paragraphs: [
        'A territory account plan is each regional leader’s plan for the next three years. It says where to focus, which customers to grow, and how to sell and with whom.',
        'Organizations do it to agree on these choices before they commit people and money. Writing the plan in one shared template makes the regions’ choices comparable.',
        'This app does not judge the plans. It shows them side by side so leaders can learn from each other and discuss the differences.'
      ] },
      { id: 'operational', title: 'How it feeds operational planning', link: null, paragraphs: [
        'The plans feed the yearly operational planning that follows. That is where headcount, marketing spend, partner programmes and product requests are decided.',
        'For example, an industry many regions put in Tier 2 may justify specialist hires or marketing material. Product gaps rated in many regions may shape product plans.'
      ] },
      { id: 'template', title: 'The template', link: null, paragraphs: [
        'Every leader fills in the same workbook, one per region. It covers three plan years, with money in thousands of one currency.',
        'It has four main sections, each on its own sheet: market coverage, new business, customer growth, and partners with a recap. Each section asks the leader to decide something different.',
        'The full template adds a recap sheet of its own, with the revenue outlook, the value through the organization’s books and the strategic plan, and an order intake sheet for the year before the plan. The Outlook and Partners views show them.',
        'A template can also carry extra sections, such as planned events. The app lists each one on the Other sections view, which the menu shows only when the plans hold one.'
      ] },
      { id: 'marketCoverage', title: '1. Market coverage', link: { view: 'industry' }, paragraphs: [
        'The leader rates a fixed list of industries and chooses which to prioritize. For each industry they give six ratings, a tier and a comment.',
        'System figures sit next to the ratings: current ARR, pipeline and pipeline created in the last 12 months. They show where the region already does business.',
        'This section is what the Market coverage view shows: tiers by region, attractiveness against ability to win, and the six ratings for one industry.'
      ] },
      { id: 'newBusiness', title: '2. New business', link: { view: 'newBusiness' }, paragraphs: [
        'For Tier 1 and Tier 2 industries only, the leader breaks each industry into sub-verticals in a geographic market. Each row says how many accounts to target, the expected hit rate and the average deal size.',
        'The workbook multiplies these into ARR potential and adds services using the services ratio. Each row also splits its value across channels, lists key success factors and, in the full template, names a solution.',
        'The New business view shows these rows by industry, channel and lever, and lists every sub-industry each region targets.'
      ] },
      { id: 'customerGrowth', title: '3. Customer growth', link: { view: 'customers' }, paragraphs: [
        'Here the leader works through the region’s existing customers, which come from company systems. For each one they set the expected yearly growth and a services ratio.',
        'The workbook calculates the extra ARR and services per year, and puts each customer in a segment using the segmentation rule.',
        'The Customer growth view shows the segments, the growth each region assumes and how concentrated it is, account by account.'
      ] },
      { id: 'partners', title: '4. Partners and recap', link: { view: 'partners' }, paragraphs: [
        'The recap adds up the plan by plan year and by channel, split into new business and customer growth, ARR and services. Most of it is calculated from the two sections before.',
        'The leader also lists the partners who will carry the plan, with their channel, type, maturity level, expertise and sales capacity.',
        'The Overview shows the totals. The Partners view shows the channel split and every partner named.'
      ] },
      { id: 'outlook', title: '5. Strategic plan, base year and outlook', link: { view: 'outlook' }, paragraphs: [
        'The full template sets each plan against the strategic plan, the order intake the organization’s strategy expects of the region, by product category. The variance is the plan minus the strategic plan.',
        'The base year is the year before the plan. Its budget, forecast and actuals so far come from company systems, with the open pipeline; pipeline coverage divides that pipeline by the order intake still to win.',
        'The revenue outlook is the revenue the order intake brings in each plan year. Only part of a year’s order intake becomes revenue in that same year, so a year’s revenue is normally below its order intake.'
      ] },
      { id: 'sheets', title: 'Where each sheet of the workbook shows', link: null, paragraphs: [
        'Market coverage: the Market coverage view (tiers, attractiveness against ability to win, the six ratings and the leaders’ comments). New business: the New business view.',
        'Customer growth: the Customer growth view. Partner: the Partners view, from "Do the partners have the people behind their planned contribution?" on, with the partner list.',
        'Recap, order intake at customer value: the Overview ("How big is each region’s plan, and where does it come from?"), the New business view ("Which channels carry each region’s new business?") and the Partners view ("How much does each plan rely on partners and alliances?").',
        'Recap, the rest of the sheet: the strategic plan comparison is the first chart of the Outlook view ("How does each plan compare with its strategic plan?"); the revenue outlook is "How much revenue do the plans release each year?" and "How much of each year’s order intake turns into revenue that year?" on the Outlook view; the value through the organization’s books is "How much of each plan runs through the organization’s own books?" on the Partners view and "What mix of products does each plan rest on?" on the Outlook view; order intake by route to market is "Which routes to market does each plan rely on?" on the Partners view.',
        'Order intake (the year before the plan): "How does year 1 of each plan compare with this year?" and "Does this year’s pipeline cover what is still to win?" on the Outlook view. The month-by-month figures and the splits by team are not shown: the app reads the year’s totals by product category.',
        'Any figure in the app names its sheet and cell: select it, or open "Data" next to the comparison bar.'
      ] },
      { id: 'books', title: 'How to read customer value and books value', link: { view: 'partners' }, paragraphs: [
        'Customer value is what the customer pays. Books value is the part that runs through the organization’s own books: a reseller keeps a margin, and a partner may deliver some services itself.',
        'The two are compared over ARR and services, which both hold. Software perpetual and hardware run through the books only, so they show in the product category figures.'
      ] },
      { id: 'tiers', title: 'How to read tiers', link: { view: 'industry' }, paragraphs: [
        'Every industry gets one of three tiers. Tier 1 is group priority: set centrally for all regions, not chosen by the leader.',
        'Tier 2 is focus: an industry where the region has a winning recipe and will invest. Tier 3 is opportunistic: the region sells there when a chance comes up, with no active investment.',
        'When regions agree on tiers, plans line up. When the same industry is Tier 2 in one region and Tier 3 in another, the difference is worth discussing.'
      ] },
      { id: 'ratings', title: 'How to read the six ratings', link: { view: 'industry' }, paragraphs: [
        'Each rating is a three-step scale with the template’s own wording, scored 1 to 3. A score of 3 is always the favourable end, so higher is better on every chart.',
        'Three ratings describe the market: growth potential, criticality of the offer to the customer, and competitive intensity. For competitive intensity, 3 means the region is the recognized leader.',
        'Three ratings describe the region: references, in-house expertise and product fit. A blank rating shows as "not provided" and is never counted as low.'
      ] },
      { id: 'scores', title: 'How to read the two scores', link: { view: 'industry' }, paragraphs: [
        'The app builds two scores from the ratings. Attractiveness is the average of the three market ratings; ability to win is the average of the three region ratings.',
        'Both run from 1 to 3. The attractiveness chart splits at 2.0 into four areas, and a score of exactly 2.0 counts as high.',
        'An industry rated attractive with a low ability to win shows where help may be needed. If any rating behind a score is blank, the score is not provided.'
      ] },
      { id: 'segments', title: 'How to read segments', link: { view: 'customers' }, paragraphs: [
        'Existing customers are put in four segments: strategic, growth, core and scaled. The workbook does this with a fixed rule, using limits each leader sets.',
        'The rule runs in order. Current ARR above the strategic limit makes a customer strategic; below the scaled limit makes it scaled.',
        'Of the rest, a customer with high planned order intake and ARR above the growth limit is growth. Everyone else is core. Because each region sets its own limits, compare segments with care.'
      ] },
      { id: 'channels', title: 'How to read channels', link: { view: 'partners' }, paragraphs: [
        'A channel is the route to the customer. The template has four: direct, partner, and two alliances, Alliance A and Alliance B.',
        'Each new business row splits its value across the channels, adding up to 100%. The split shows how much a plan depends on partners and alliances.'
      ] },
      { id: 'dataKinds', title: 'The three kinds of data', link: null, paragraphs: [
        'Every value is one of three kinds. A leader input is the leader’s own judgement, such as a tier, a rating or a hit rate. A system figure comes from company systems, such as current ARR or pipeline.',
        'A calculated figure is worked out from the other two, either by the workbook or by this app. Totals and averages across regions are always calculated by this app.',
        'The app labels every figure with its kind, so you can tell what a leader believes from what the systems show. The source line on each panel names the kinds used.'
      ] }
    ]
  }
};
