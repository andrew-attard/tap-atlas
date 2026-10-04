/*
 * File: config/insight-rules.js
 * Purpose: Every insight rule in one place: what it looks for, its thresholds, its wording, where it attaches,
 *          plus the wording guide every sentence follows (US-1.7.1, US-1.7.10).
 * Provides: window.TAP_RULES (rules, wording)
 * Depends on: nothing
 * Used by: js/insights/engine.js and the rule files in js/insights/
 *
 * Rule fields (ARCHITECTURE section 12):
 *   id, family, enabled (false switches the rule off), description (the rule in plain words, shown with each
 *   insight), reads (the Data Contract fields it needs; the rule is skipped and logged if none are in the data),
 *   params (thresholds), scoring (how its strength and money at stake are worked out), template (the sentence),
 *   templates (optional wording variants a finding can pick), compare (true: a comparison between regions, so at
 *   least TAP_SETTINGS.insights.minRegions must provide the value), attach (reports it belongs to, the first one
 *   is where "Show me" goes), highlight (what to mark there), fallback ('details': with no Phase 1 report, "Show me"
 *   opens the region's details).
 * Strength runs from 0 to 1: a finding that sits twice as far past its threshold as the threshold itself scores 1.
 * Money at stake is the share of the organization's current ARR (or pipeline) the finding involves.
 * Placeholders in {braces} are filled in by the rule code.
 */
window.TAP_RULES = window.TAP_RULES || { rules: [], wording: { banned: [], guide: [] } };

(function (R) {
  'use strict';

  var TIERS = ['ind-tiers'], QUAD = ['ind-quad', 'ind-tiers'], GRID = ['ind-tiers', 'ind-quad'];
  function rule(o) { R.rules.push(Object.assign({ enabled: true, compare: false, templates: {}, fallback: 'details' }, o)); }

  /* ---------- priorities (US-1.7.4) ---------- */
  rule({ id: 'consensus', family: 'priorities',
    description: 'An industry placed in Tier 1 or 2 by at least 5 of every 7 regions that gave it a tier (scaled to the number of regions). Group priorities are left out: group strategy already fixes them at Tier 1.',
    reads: ['marketCoverage.tier'], params: { share: 5 / 7, skipGroupPriority: true }, compare: true,
    scoring: 'Strength: the share of regions placing it in Tier 1 or 2, against twice the threshold share. Money: its pipeline or current ARR in those regions (the larger share of the organization\u2019s).',
    template: '{industry} is Tier 1 or 2 in {n} of {total} regions.',
    templates: { all: '{industry} is Tier 1 or 2 in all {total} regions.',
      gaps: '{industry} is Tier 1 or 2 in {n} of the {total} regions that gave it a tier.' },
    attach: TIERS, highlight: 'industryRow' });
  rule({ id: 'split', family: 'priorities',
    description: 'An industry whose tiers spread across all three tiers, or split almost evenly between two (the two groups differ by at most one region).',
    reads: ['marketCoverage.tier'], params: { evenGap: 1 }, compare: true,
    scoring: 'Strength: 1 across all three tiers; half of how even the split is across two. Money: its pipeline or current ARR across the regions (the larger share of the organization\u2019s). Breadth: only the regions that depart from the most common tier.',
    template: 'Regions are split on {industry}: {parts}.',
    attach: TIERS, highlight: 'industryRow' });
  rule({ id: 'groupPriority', family: 'priorities',
    description: 'A group-priority industry (Tier 1 by group strategy) that a region’s own ratings place in the less able half (ability to win below the midpoint), or the less attractive half.',
    reads: ['marketCoverage.references', 'marketCoverage.growthPotential'], params: { minRegions: 1 },
    scoring: 'Strength: half the share of regions involved, half how far below the midpoint their scores sit. Money: its pipeline or current ARR in those regions (the larger share of the organization\u2019s).',
    template: '{industry} is a group priority, but {n} regions rate their ability to win there as low.',
    templates: { abilityOne: '{industry} is a group priority, but {region} rates its ability to win there as low.',
      attractiveness: '{industry} is a group priority, but {n} regions see it as less attractive.',
      attractivenessOne: '{industry} is a group priority, but {region} sees it as less attractive.' },
    attach: GRID, highlight: 'industryRow' });

  /* ---------- judgement (US-1.7.5) ---------- */
  rule({ id: 'strongRating', family: 'judgement',
    description: 'References, expertise or product fit rated 3 (the favourable end) where the industry’s current ARR and pipeline are both at or below the threshold (zero by default).',
    reads: ['marketCoverage.references', 'marketCoverage.currentArr'], params: { maxAmount: 0 },
    scoring: 'Strength: grows with the number of ratings at 3. Money: none, as nothing is in the system yet.',
    template: '{region} rates its {ratings} in {industry} as strong, with no current ARR or pipeline there. Worth discussing what the rating draws on.',
    templates: { little: '{region} rates its {ratings} in {industry} as strong, with little current ARR or pipeline there ({arr} and {pipeline}). Worth discussing what the rating draws on.' },
    attach: QUAD, highlight: 'points' });
  rule({ id: 'weakRating', family: 'judgement',
    description: 'References, expertise or product fit rated 1 (the unfavourable end) where the industry holds one of the region’s three largest current ARR or pipeline figures.',
    reads: ['marketCoverage.expertise', 'marketCoverage.currentArr'], params: { rank: 1 },
    scoring: 'Strength: grows with the number of ratings at 1, and falls for the second or third largest figure. Money: the figure involved.',
    template: '{region} rates its {ratings} in {industry} at 1 of 3, yet {industry} holds {rank} {what} ({amount}). Worth discussing what sits behind the rating.',
    attach: QUAD, highlight: 'points' });
  rule({ id: 'tierVsPipeline', family: 'judgement',
    description: 'A Tier 3 industry holding at least 15% of the region’s pipeline (every industry row counted).',
    reads: ['marketCoverage.tier', 'marketCoverage.pipelineTotal'], params: { share: 0.15 },
    scoring: 'Strength: the pipeline share against twice the threshold. Money: its pipeline as a share of the organization’s.',
    template: '{region} placed {industry} in Tier 3, but it holds {share} of the region’s pipeline ({amount}). Worth discussing what keeps it in Tier 3.',
    attach: GRID, highlight: 'cell' });
  rule({ id: 'priorityNoPipeline', family: 'judgement',
    description: 'A Tier 1 or Tier 2 industry with no pipeline at all.',
    reads: ['marketCoverage.tier', 'marketCoverage.pipelineTotal'], params: {},
    scoring: 'Strength: fixed (higher for Tier 1). Money: any new business planned there.',
    template: '{region} placed {industry} in Tier {tier}, with no pipeline there yet. Worth discussing how that pipeline will be built.',
    attach: GRID, highlight: 'cell' });

  /* ---------- assumptions (US-1.7.6) ---------- */
  rule({ id: 'outlier', family: 'assumptions',
    description: 'A planning assumption at least twice, or at most half, the average of the other regions (weighted as on the charts), or outside every other region’s range by at least 15% of that average. For growth by year, only the year that stands out most is raised.',
    reads: ['newBusiness.hitRate', 'customerGrowth.accounts.incrementalArr'], compare: true,
    params: { measures: ['nb.hitRate', 'nb.avgDealSize', 'nb.growthY2', 'nb.growthY3', 'nb.servicesRatio', 'cg.growthY1', 'cg.growthY2', 'cg.growthY3'],
      high: 2, low: 0.5, rangeGap: 0.15 },
    scoring: 'Strength: how far the ratio to the others’ average is past 1, against twice the 2× threshold. Money: the region’s planned ARR in that motion.',
    template: '{region} plans {what}, more than {times} the average of the other regions ({avg}).',
    templates: { low: '{region} plans {what}, less than half the average of the other regions ({avg}).',
      above: '{region} plans {what}, higher than any other region (the others average {avg}).',
      below: '{region} plans {what}, lower than any other region (the others average {avg}).' },
    attach: [], highlight: null });

  /* ---------- realism (US-1.7.7) ---------- */
  rule({ id: 'pipelineCover', family: 'realism',
    description: 'Year-1 new business ARR potential at least 3 times the pipeline created in the last 12 months.',
    reads: ['newBusiness.arrPotential', 'marketCoverage.pipelineCreated12m'], params: { ratio: 3 },
    scoring: 'Strength: how far the ratio is past 1, against twice the threshold’s distance. Money: the year-1 ambition.',
    template: '{region}’s year-1 new business ambition ({nb}) is {ratio} the pipeline it created in the last 12 months ({pipeline}).',
    templates: { none: '{region} plans {nb} of year-1 new business, with no pipeline created in the last 12 months.' },
    attach: ['ov-ambition'], highlight: 'bar' });
  rule({ id: 'noPipeline', family: 'realism',
    description: 'New business planned in an industry where the region has no pipeline at all.',
    reads: ['newBusiness.arrPotential', 'marketCoverage.pipelineTotal'], params: {},
    scoring: 'Strength: grows with the industry’s share of the region’s new business. Money: the new business planned there.',
    template: '{region} plans new business in {industry} ({nb} over three years), where it has no pipeline yet.',
    attach: [], highlight: null });
  rule({ id: 'winsVsPeers', family: 'realism',
    description: 'Implied new customer wins (target accounts × hit rate) at least twice the simple average of the other regions.',
    reads: ['newBusiness.targetAccounts', 'newBusiness.hitRate'], params: { ratio: 2 }, compare: true,
    scoring: 'Strength: how far the ratio is past 1, against twice the threshold’s distance. Money: the region’s new business ambition.',
    template: '{region}’s plan needs about {ratio} as many new customer wins as the average of the other regions ({wins} against {avg}).',
    attach: [], highlight: null });

  /* ---------- exposure (US-1.7.8) ---------- */
  rule({ id: 'concentration', family: 'exposure',
    description: 'At least 50% of a region’s planned customer growth (incremental ARR over three years) in its top 3 accounts.',
    reads: ['customerGrowth.accounts.incrementalArr'], params: { share: 0.5, top: 3, minAccounts: 5 },
    scoring: 'Strength: the share against twice the threshold. Money: the growth in those accounts.',
    template: '{share} of {region}’s planned customer growth sits in {n} accounts ({accounts}){risk}.',
    attach: ['cg-exposure'], highlight: 'bar' });
  rule({ id: 'atRisk', family: 'exposure',
    description: 'At least 25% of a region’s planned customer growth in accounts flagged high or medium risk.',
    reads: ['customerGrowth.accounts.riskLevel'], params: { share: 0.25, levels: ['high', 'medium'] },
    scoring: 'Strength: the share against twice the threshold. Money: the growth in those accounts.',
    template: '{share} of {region}’s planned customer growth is in accounts flagged at risk ({amount} across {n} accounts).',
    attach: ['cg-exposure'], highlight: 'bar' });
  rule({ id: 'segmentMix', family: 'exposure',
    description: 'A region drawing at least 60% of its planned customer growth from one segment, at least 20 points above every other region’s share for that segment.',
    reads: ['customerGrowth.accounts.segment'], params: { share: 0.6, gap: 0.2 }, compare: true,
    scoring: 'Strength: the gap to the highest other region against twice the threshold. Money: the growth in that segment.',
    template: '{region}’s planned customer growth relies mostly on {segment} accounts ({share}, against {min} to {max} in the other regions).',
    attach: ['cg-segments'], highlight: 'bar' });

  /* ---------- capability (US-1.7.9) ---------- */
  rule({ id: 'notYetWinnable', family: 'capability',
    description: 'An industry in the attractive, not-yet-able-to-win quadrant (attractiveness at or above the midpoint, ability to win below it) for at least 3 regions.',
    reads: ['marketCoverage.growthPotential', 'marketCoverage.references'], params: { minRegions: 3 },
    scoring: 'Strength: the share of regions involved, against twice the threshold share. Money: its current ARR in those regions.',
    template: '{n} regions see {industry} as attractive but rate their ability to win as low.',
    attach: ['ind-quad'], highlight: 'quadrant' });
  rule({ id: 'notYetList', family: 'capability',
    description: 'Each region’s own list of industries in the attractive, not-yet-able-to-win quadrant.',
    reads: ['marketCoverage.growthPotential', 'marketCoverage.references'], params: { minIndustries: 1 },
    scoring: 'Strength: the share of the region’s rated industries on the list, halved so shared gaps rank first. Money: their current ARR.',
    template: '{region} sees {n} industries as attractive but rates its ability to win there as low: {industries}.',
    templates: { one: '{region} sees {industries} as attractive but rates its ability to win there as low.' },
    attach: ['ind-quad'], highlight: 'points' });

  /* ---------- plan (US-2.5.2, US-2.5.5) ---------- */
  rule({ id: 'channelReliance', family: 'plan',
    description: 'A region whose share of total order intake (both motions, ARR and services, from the recap) through one channel is at least 20 points above or below the other regions’ combined share. Only the channel furthest from the others is raised.',
    reads: ['recap.value'], params: { gap: 0.2 }, compare: true,
    scoring: 'Strength: the gap against twice the threshold. Money: the region’s order intake through that channel.',
    template: '{region} plans {share} of its order intake through {channel}, against {avg} on average elsewhere. Worth discussing.',
    attach: ['pt-reliance', 'nb-channels'], highlight: 'bar' });
  rule({ id: 'planMakeup', family: 'plan',
    description: 'A region whose share of three-year ARR ambition from new business is at least 20 points above or below the other regions’ combined share. Regions without both new business and customer growth are left out.',
    reads: ['newBusiness.arrPotential', 'customerGrowth.accounts.incrementalArr'], params: { gap: 0.2 }, compare: true,
    scoring: 'Strength: the gap against twice the threshold. Money: the region’s three-year ARR ambition.',
    template: '{share} of {region}’s ARR ambition comes from new business, against {avg} on average elsewhere.',
    attach: ['ov-ambition'], highlight: 'bar' });

  /* ---------- themes (US-2.5.1) ---------- */
  rule({ id: 'recurringTheme', family: 'themes',
    description: 'A theme from the keyword lists in config/comment-themes.js that comes up (whole words, any case) in the success factors or commentary of at least 3 regions (TAP_COMMENT_THEMES.minRegions). Counted by this app, not tagged in the workbooks.',
    reads: ['newBusiness.successFactors', 'marketCoverage.commentary'], params: {},
    scoring: 'Strength: grows from the threshold to every region, up to 0.4, so themes rank below the rules that compare figures. Money: none.',
    template: '{theme} {verb} up in the {where} of {n} regions.',
    attach: ['nb-themes'], highlight: 'bar' });

  /* ---------- wording guide (US-1.7.10) ---------- */
  R.wording = {
    guide: [
      'Observations, not judgements: say what the figures show, never what the leader got wrong.',
      'Always give the comparison figures, so anyone can check the sentence.',
      'Name regions plainly and use the same figures as the charts.',
      'Frame mismatches between ratings and system figures as questions worth discussing.',
      'Never draw an insight from a value that was not provided: a blank is not low and not zero.',
      'Avoid loaded words such as unrealistic, wrong, poor or inconsistent.'
    ],
    banned: ['unrealistic', 'unrealistically', 'wrong', 'wrongly', 'poor', 'poorly', 'poorer', 'poorest', 'inconsistent',
      'inconsistently', 'inconsistency', 'inconsistencies', 'incorrect', 'incorrectly', 'mistake', 'mistakes', 'mistaken',
      'error', 'errors', 'erroneous', 'bad', 'badly', 'unreasonable', 'unreasonably', 'implausible', 'implausibly',
      'overambitious', 'over-ambitious', 'naive', 'careless', 'fail', 'fails', 'failed', 'failing', 'failure', 'failures',
      'questionable', 'doubtful', 'flaw', 'flaws', 'flawed'],
    phrases: {
      label: 'Observation to discuss',
      times: { 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times', n: '{n} times' },
      rank: { 1: 'its largest', 2: 'its second-largest', 3: 'its third-largest' },
      what: { arr: 'current ARR', pipeline: 'pipeline' },
      ratings: { references: 'references', expertise: 'expertise', productFit: 'product fit' },
      splitFirst: '{n} place it in Tier {tier}', splitNext: '{n} in Tier {tier}',
      risk: { high: ', one of them flagged high risk', highN: ', {n} of them flagged high risk',
        any: ', one of them flagged at risk', anyN: ', {n} of them flagged at risk' },
      measures: { 'nb.hitRate': 'a {value} hit rate', 'nb.avgDealSize': 'an average deal size of {value}',
        'nb.growthY2': 'new business growth of {value} in year 2', 'nb.growthY3': 'new business growth of {value} in year 3',
        'nb.servicesRatio': 'a services ratio of {value}', 'cg.growthY1': 'customer growth of {value} in year 1',
        'cg.growthY2': 'customer growth of {value} in year 2', 'cg.growthY3': 'customer growth of {value} in year 3' },
      year1: 'year 1', figure: '{what}, {where}', othersAvg: 'average of the other {n} regions', successFactors: 'What {region} says is needed',
      allAccounts: 'Planned customer growth, all accounts', allIndustries: 'all industries', highRisk: '{name} (high risk)',
      mediumRisk: '{name} (medium risk)',
      // Channel words in a sentence; any other channel uses its name from the data
      channel: { direct: 'direct sales', partner: 'partners' },
      themeVerb: { plural: 'come', one: 'comes' },
      themeWhere: { successFactors: 'success factors', commentary: 'commentary', both: 'success factors and commentary' },
      themeRegions: 'Regions mentioning {theme} (counted by this app)', themeQuote: 'What {region} wrote',
      failed: 'The insight rule "{rule}" was skipped: {reason}', noData: 'the data has none of the fields it reads ({fields}).',
      noCode: 'it has no rule code.', banned: 'its sentence used the word "{word}", which the wording guide avoids.',
      unfilled: 'its sentence had a gap ({gap}).', notList: 'it did not return a list of findings.',
      badFinding: 'one of its findings was incomplete (it needs a key, a list of regions and a list of figures).',
      noProvided: 'it compares regions but did not say how many provide the value.'
    }
  };
})(window.TAP_RULES);
