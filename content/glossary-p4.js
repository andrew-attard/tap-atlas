/*
 * File: content/glossary-p4.js
 * Purpose: The glossary terms for the parts of the full template (US-4.6.1): the strategic plan, the base year,
 *          the revenue outlook, solutions and product categories, customer value against books value, routes to
 *          market, partner types and the partner maturity levels.
 * Provides: adds to window.TAP_CONTENT.glossary
 * Depends on: content/glossary.js (the entry format and the rules for aliases are described there)
 * Used by: js/core/content.js, js/ui/glossary.js, js/views/guide.js
 *
 * The maturity levels are everyday words (enable, skill), so their terms carry the word "level" and no alias
 * is the bare word: that would mark every use of it on screen.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.glossary = Object.assign(window.TAP_CONTENT.glossary || {}, {
  // The plan against the strategic plan and the base year
  strategicPlan: { term: 'Strategic plan', aliases: ['strategic plan order intake'],
    short: 'The order intake the organization’s longer-term strategy sets for each region, by plan year and product category. It comes from company systems.',
    why: 'The Outlook view sets each plan beside it, on the same basis, so the gap between the two can be discussed.', related: ['variance', 'booksValue', 'productCategory'] },
  variance: { term: 'Variance', aliases: ['variance against the strategic plan', 'plan minus strategic plan'],
    short: 'The plan’s order intake minus the strategic plan’s, in money or as a percentage of the strategic plan. Above zero, the plan is higher.',
    why: 'It shows how far a plan sits from the strategic plan. The app works it out from the two figures.', related: ['strategicPlan'] },
  baseYear: { term: 'Base year', aliases: ['base-year', 'year before the plan'],
    short: 'The year before the first plan year, still running while the plan is written. The template gives its budget, forecast, actuals and pipeline.',
    why: 'It is the starting point: plan year 1 can be read against what the region expects to close this year.', related: ['budget', 'forecast', 'actuals', 'pipelineCoverage'] },
  budget: { term: 'Budget', aliases: ['base year budget', 'order intake budget'],
    short: 'The order intake a region was set as its target for a year. Here it is the target for the base year.',
    why: 'Plan year 1 can be compared with it, as well as with the forecast.', related: ['baseYear', 'forecast'] },
  forecast: { term: 'Forecast', aliases: ['base year forecast', 'full-year forecast'],
    short: 'The order intake a region currently expects for the whole of a year, won so far plus still to come. Here it is the base year’s forecast.',
    why: 'Growth from the base year to plan year 1 is measured against it unless the chart says budget.', related: ['baseYear', 'actuals', 'budget'] },
  actuals: { term: 'Actuals', aliases: ['base year actuals', 'actuals so far', 'base year actuals so far'],
    short: 'The order intake already won in the base year, up to the last month the figures cover.',
    why: 'Forecast minus actuals is what is still to win this year, which pipeline coverage is measured against.', related: ['forecast', 'pipelineCoverage'] },
  pipelineCoverage: { term: 'Pipeline coverage', aliases: ['coverage ratio', 'pipeline coverage ratio'],
    short: 'Open pipeline divided by the order intake still to win this year (forecast minus actuals). A coverage of 2 means twice as much pipeline as is still needed.',
    why: 'It shows how much open business stands behind the rest of the base year. The workbook’s own ratio is used when it gives one.', related: ['pipeline', 'forecast', 'actuals'] },

  // The revenue outlook
  revenueOutlook: { term: 'Revenue outlook', aliases: ['revenue', 'revenue at customer value'],
    short: 'The revenue the plan’s order intake brings in each plan year, at customer value. The template works it out from the order intake.',
    why: 'Order intake is signed in a year, but much of it turns into revenue later. The outlook shows how much counts in each year.', related: ['revenueRelease', 'orderIntake'] },
  revenueRelease: { term: 'Revenue release', aliases: ['release share', 'revenue released'],
    short: 'How order intake turns into revenue over time: the share of a year’s order intake that becomes revenue in that same year, set centrally in the template.',
    why: 'It explains why revenue in a year is lower than the order intake of that year.', related: ['revenueOutlook', 'orderIntake'] },

  // Customer value and books value
  customerValue: { term: 'Customer value', aliases: ['order intake at customer value', 'value at customer prices'],
    short: 'Order intake counted at what the customer pays, whoever sells or delivers it. The recap and most charts use it.',
    why: 'It is the plan’s full size in the market. Books value shows how much of it runs through the organization itself.', related: ['booksValue', 'orderIntake'] },
  booksValue: { term: 'Books value', aliases: ['value through the organization’s books', 'order intake through the organization’s books'],
    short: 'Order intake as it runs through the organization’s own books. A reseller keeps a margin and a partner may deliver services itself, so it can be lower than customer value.',
    why: 'The difference shows how much of a plan’s value stays with partners. The two are compared over ARR and services, which both hold.', related: ['customerValue', 'partner', 'productCategory'] },
  routeToMarket: { term: 'Route to market', aliases: ['routes to market', 'order intake by route to market'],
    short: 'The way a sale is made: the own sales force, customer success, Alliance B as reseller, other resellers, system integrators, or partners’ existing business.',
    why: 'It is a finer split than the channel, so it shows which kind of partner a plan relies on.', related: ['channel', 'partnerType'] },

  // Solutions and product categories
  solution: { term: 'Solution', aliases: [],
    short: 'An offer the organization sells, such as Solution 1. Each new business row can name one, and each solution belongs to a product category.',
    why: 'It shows which offers a region’s new business rests on, and where several regions count on the same one.', related: ['productCategory', 'newBusiness'] },
  productCategory: { term: 'Product category', aliases: ['product categories'],
    short: 'One of four kinds of order intake: software perpetual, recurring (ARR), hardware and services.',
    why: 'The strategic plan, the base year and the books value are all given by product category, so they can be compared line by line.', related: ['swPerpetual', 'solution', 'arr', 'services'] },
  swPerpetual: { term: 'Software perpetual', aliases: ['perpetual software', 'perpetual licence'],
    short: 'Software sold once, for a single payment, rather than as a subscription. It is one of the four product categories.',
    why: 'It appears only in the books value and the strategic plan, not in the recap, which holds ARR and services.', related: ['productCategory', 'arr'] },
  hardware: { term: 'Hardware', aliases: ['hardware order intake'],
    short: 'Physical equipment the organization sells. It is one of the four product categories.',
    why: 'Like software perpetual, it appears only in the books value and the strategic plan, not in the recap.', related: ['productCategory', 'swPerpetual'] },

  // Partner types and maturity
  partnerType: { term: 'Partner type', aliases: ['value-added reseller', 'system integrator', 'referral partner'],
    short: 'What kind of firm a partner is, from a fixed list, such as a value-added reseller, a system integrator or a referral partner.',
    why: 'Different types sell and deliver in different ways, so the mix of types shapes how a plan reaches customers.', related: ['partner', 'partnerMaturity', 'routeToMarket'] },
  maturityRecruit: { term: 'Recruit level', aliases: ['Recruit maturity'],
    short: 'The first of the five partner maturity levels: a partner being recruited, with no business together yet.',
    why: 'Order intake planned with partners at this level depends on a relationship that is only starting.', related: ['partnerMaturity', 'maturityOnboard'] },
  maturityOnboard: { term: 'Onboard level', aliases: ['Onboard maturity'],
    short: 'The second of the five partner maturity levels: a signed partner being set up and trained.',
    why: 'A partner at this level is not yet selling on its own.', related: ['partnerMaturity', 'maturityRecruit', 'maturityEnable'] },
  maturityEnable: { term: 'Enable level', aliases: ['Enable maturity'],
    short: 'The third of the five partner maturity levels: a partner starting to sell, with support from the organization.',
    why: 'It is the middle of the scale: business has begun and still leans on central help.', related: ['partnerMaturity', 'maturityOnboard', 'maturitySkill'] },
  maturitySkill: { term: 'Skill level', aliases: ['Skill maturity'],
    short: 'The fourth of the five partner maturity levels: a partner that sells and delivers on its own.',
    why: 'Partners at this level can carry a share of the plan with little central support.', related: ['partnerMaturity', 'maturityEnable', 'maturityStrategic'] },
  maturityStrategic: { term: 'Strategic level', aliases: ['Strategic maturity'],
    short: 'The fifth and highest of the partner maturity levels: a long-standing partner that plans jointly with the region.',
    why: 'Plans often lean most on partners at this level, so it is worth seeing how much rests on them.', related: ['partnerMaturity', 'maturitySkill'] }
});
