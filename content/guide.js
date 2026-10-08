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
 *   contents   The page's two parts: [{ id, title }], 'howTo' and 'planning'. Their titles head the contents list,
 *              which links every section (D139). There is no glossary section: definitions show where terms appear (D98).
 *   howTo      { title, intro, sections: [{ id, title, paragraphs: ['...'], link: { view: 'newBusiness' } (optional),
 *              shortcuts: true (optional: the number keys are listed under it, built from the menu order) }] }
 *              "How to use this app", with one section per view that needs explaining (each linking to its view).
 *              The "Take the tour" and "Reset all charts to default" buttons belong here; their labels live in
 *              content/text-pages.js.
 *   planning   { title, sections: [{ id, title, paragraphs: ['...'], link: { view: 'industry' } | null }] }
 *              "Territory account planning explained". link names the view that shows the section (a view id
 *              from config/views.js), or null when no single view does.
 *
 * Each section shows as a card with its first paragraph; "Read more" opens the rest (D139), so the first paragraph
 * should stand on its own. Paragraphs are plain text, one to three short sentences each. Glossary terms in them are marked by
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
        'The menu at the top has three groups: the places to start on the left (Overview, Regions), the views of the plans in the centre (Market coverage, New business, Customer growth, Partners, Outlook, Other sections when the plans hold extra template sections), and the tools on the right (Insights, Build a chart, this Guide). The view you are on is highlighted.',
        'Each view answers a few questions, one chart per question. The browser’s back button takes you to the view you came from.',
        'A one-line tip under each view’s title says where to start. "Hide tips" hides the tips until the page is reloaded.'
      ] },
      { id: 'viewOverview', title: 'The Overview', link: { view: 'overview' }, paragraphs: [
        'The Overview tells the organization’s story: a headline sentence, then the top insights, the three most significant findings that span at least three regions or the total of all regions, each with why it matters, "Show me" and "Hide for this session". Findings about one or two regions are on the other views, the region profiles and the Insights page. The region cards follow, each a snapshot of one region’s plan ending with the one finding about it most worth discussing, then the ambition chart.'
      ] },
      { id: 'viewIndustry', title: 'The Market coverage view', link: { view: 'industry' }, paragraphs: [
        'Market coverage has two parts. All industries shows the tier each region chose for every industry, then each industry placed by attractiveness against ability to win. One industry shows the six ratings behind those two scores for the industry picked, with what the leaders wrote about it.',
        'Look for industries the regions disagree on, priorities with little pipeline behind them, and attractive markets the regions rate themselves low on. Pick an industry in the One industry part, or select a row or a bubble above.'
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
        'A region profile puts one region’s whole plan on one page: its ambition, industry priorities, new business, customers and partners, and its strategic plan and revenue when the plans hold them, with the same charts as the other views. It opens with its Top insights, the three most significant findings about that region, each with why it matters, "Show me" and "Hide for this session"; the other findings that name it are listed further down, beside what its leader wrote.',
        'To open one, choose Regions in the menu and pick a region, or select "Open profile" on a region card on the Overview or in a details panel; the back button returns to where you were.'
      ] },
      { id: 'compare', title: 'The comparison bar', paragraphs: [
        'The comparison bar decides which regions every chart shows, in three modes. All regions shows each region separately. Selected regions shows only the regions you tick, one region or more, so a single region can be shown on its own.',
        'One vs the rest sets one focus region against the others.',
        'The pressed mode and the regions picked show what is compared, and screen readers announce it in plain words, for example "Showing North America only". The Overview always shows every region, so there the bar holds only its Data, Present and Tour buttons.',
        'With one focus region, the other regions can be shown one by one or as one combined figure: their average or their total. Combined figures are drawn in dark grey and say how they were made.',
        'A single chart can also compare differently for a side question. It shows a "Custom comparison" badge, and goes back to the shared setting when the bar changes.'
      ] },
      { id: 'panels', title: 'Report panels', paragraphs: [
        'Every chart sits in a panel that works the same way. The title is the question the chart answers. The chart\u2019s insights sit behind its Insights button, each with its figures one line per region.',
        'The explanation icon says what the chart shows, how to read it and what to look for. Clicking a bar, point or cell opens a side panel with everything known about that item.',
        'A panel can be expanded to fill the screen for discussion, and saved or copied as an image for slides. Esc returns to the view.',
        'Some charts open one level down when you select part of them, for example from a block of the New business industries chart to the rows behind it. A band at the top of the panel then says you are drilled in, a line under the question says what you selected and what is shown, and the \u201cBack to\u201d button returns to the chart. The trail of names above the question goes back to any earlier step.'
      ] },
      { id: 'chartTypes', title: 'Chart types', paragraphs: [
        'The chart type menu lists only the types that suit the data, such as bars, dots, bubbles or a heatmap. The default type is marked and one click goes back to it.',
        'Your choice is remembered for that chart in this browser. The "Reset all charts to default" button on this page clears every choice.',
        'Some charts can also be broken down by a second dimension, such as plan year, one at a time. A dimension with many values, such as industry or solution, needs one region: while several regions are compared it is greyed and marked \u201cOne region only\u201d. To use it, compare Selected regions with one region chosen.'
      ] },
      { id: 'table', title: 'Table view', paragraphs: [
        'Every chart can be shown as a table with the exact figures. Charts round to one decimal, for example 1.2M; tables show the full value.',
        'Columns can be sorted, and the focus region’s row is highlighted. The copy button copies the table so it pastes cleanly into a spreadsheet, an email or a slide.',
        'Some panels are lists, one row per line of a workbook, such as every account or partner. Select a heading to sort, use the filter above the list to narrow it, and select a row to see everything about it.'
      ] },
      { id: 'sources', title: 'Where figures come from', paragraphs: [
        'Every figure can be traced to its workbook, sheet and cell. Select the data icon beside a figure, in a details panel, a list, a table or a leader’s comment, to see the file, sheet and cells it was read from, and whether it is a leader’s input, a system figure or calculated in the workbook. Selecting a figure on an Overview card or a region profile opens a small box beside it with its exact value and where it comes from.',
        'The data date in the comparison bar opens the data sources panel. It lists each region’s file, when it was saved and imported, and any notes from the import.',
        'A blank in a workbook shows as "not provided", never as zero. Charts list the regions that had no data.'
      ] },
      { id: 'insights', title: 'Insights', paragraphs: [
        'Insights are short sentences the app writes when a figure stands out, such as a year-1 goal far above the pipeline behind it. They are observations to discuss, not conclusions.',
        'Each insight shows the figures and the rule behind it, with one line under it on why it matters. "Show me" highlights the data it refers to on its chart.',
        'The Insights page lists them all, ranked and grouped by family, and counts the insights to discuss apart from background facts, which point to no decision, such as several regions naming the same partner, and sit in a closed Context group at the end. The Regions and Families dropdowns at the top narrow the list, each choice showing how many insights it would list, then its background facts. Any insight can be hidden for the rest of the session.'
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
        'This section is what the Market coverage view shows, in two parts. All industries: tiers by region, then attractiveness against ability to win. One industry: the six ratings and the leaders’ comments for the industry picked at the top of that part, or chosen in the grid or on the chart.'
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
