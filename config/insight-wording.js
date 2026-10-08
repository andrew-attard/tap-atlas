/*
 * File: config/insight-wording.js
 * Purpose: The wording guide every insight sentence follows, the words it avoids, and the phrases the rule code puts
 *          into sentences and figure labels (US-1.7.10). Split from config/insight-rules.js to keep both small.
 * Provides: window.TAP_RULES.wording (guide, banned, phrases)
 * Depends on: nothing
 * Used by: js/insights/engine.js (banned words, failure messages), js/insights/util.js (phrases) and the rule files
 *          in js/insights/
 */
window.TAP_RULES = window.TAP_RULES || { rules: [], wording: { banned: [], guide: [] } };

(function (W) {
  'use strict';

  W.wording = {
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
      namedBy: 'As {region} wrote it', about: 'about {n}×', perPerson: 'Order intake per person, {partner}',
      allPartners: 'all partners with staff figures', partnerFte: 'Sales and consultant staff (full-time equivalent), {partner}',
      themeVerb: { plural: 'come', one: 'comes' },
      themeWhere: { successFactors: 'success factors', commentary: 'commentary', both: 'success factors and commentary' },
      themeRegions: 'Regions mentioning {theme} (counted by this app)', themeQuote: 'What {region} wrote',
      failed: 'The insight rule "{rule}" was skipped: {reason}', noData: 'the data has none of the fields it reads ({fields}).',
      noCode: 'it has no rule code.', banned: 'its sentence used the word "{word}", which the wording guide avoids.',
      unfilled: 'its sentence had a gap ({gap}).', notList: 'it did not return a list of findings.',
      bannedWhy: 'its line on why it matters used the word "{word}", which the wording guide avoids.',
      badFinding: 'one of its findings was incomplete (it needs a key, a list of regions and a list of figures).',
      noProvided: 'it compares regions but did not say how many provide the value.',
      cover: { named: '{industry} ({goal} against {pipeline})', namedNone: '{industry} ({goal} with no pipeline yet)', year3: 'year 3', delivered: 'Services partners deliver themselves, year 3, {where}', partnerOi: 'Year-1 order intake through partners and alliances, {where}', others: 'the other {n} regions together' },
      outlook: { below: 'below', above: 'above', together: 'the {n} regions with a strategic plan together', year1: 'Plan year 1 (books value), {where}', left: 'Order intake still to win, {where}',
        share: 'Share of new business order intake, {solution}, {where}' }
    }
  };
})(window.TAP_RULES);
