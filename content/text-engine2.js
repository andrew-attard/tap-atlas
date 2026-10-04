/*
 * File: content/text-engine2.js
 * Purpose: Wording for Phase 2 measures, lists and breakdowns.
 * Provides: adds to window.TAP_CONTENT.text (merged into the keys content/text-engine.js started)
 * Depends on: content/ui-text.js, content/text-engine.js (loads before this file)
 * Used by: the matching js files
 * Owner: ENGINE2 stream. Placeholders in {braces} are filled in by the code; the organization layer can replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
(function (T) {
  'use strict';

  // Adds keys without replacing the objects other wording files started (e.g. measures.nb).
  function merge(into, from) {
    Object.keys(from).forEach(function (key) {
      var v = from[key];
      if (v && typeof v === 'object' && !Array.isArray(v)) merge(into[key] = into[key] || {}, v);
      else into[key] = v;
    });
    return into;
  }

  // Words the measure names below are made of
  var CHANNEL = { direct: 'Direct', partner: 'Partner', allianceA: 'Alliance A', allianceB: 'Alliance B' };
  var SEGMENT = { strategic: 'Strategic', growth: 'Growth', core: 'Core', scaled: 'Scaled' };
  var RECAP = {
    nb: { arr: 'New business ARR', services: 'New business services', oi: 'New business order intake' },
    cg: { arr: 'Customer growth ARR', services: 'Customer growth services', oi: 'Customer growth order intake' },
    all: { arr: 'ARR', services: 'Services', oi: 'Order intake' }
  };
  var TIER = { arr: 'New business ARR potential', services: 'New business services potential', oi: 'New business order intake potential' };

  var rc = { share: {} };
  Object.keys(RECAP).forEach(function (m) {
    rc[m] = {};
    Object.keys(RECAP[m]).forEach(function (t) {
      var x = rc[m][t] = { label: RECAP[m][t] + ', all channels', short: RECAP[m][t] };
      Object.keys(CHANNEL).forEach(function (c) { x[c] = { label: RECAP[m][t] + ', ' + CHANNEL[c].toLowerCase(), short: CHANNEL[c] }; });
    });
  });
  Object.keys(CHANNEL).forEach(function (c) {
    rc.share[c] = { label: 'Share of order intake through ' + CHANNEL[c].toLowerCase(), short: CHANNEL[c] + ' share' };
  });
  var nb = { oi: { label: 'New business order intake potential', short: 'New business order intake' } };
  Object.keys(TIER).forEach(function (t) {
    nb[t] = nb[t] || {};
    [1, 2].forEach(function (n) { nb[t]['tier' + n] = { label: TIER[t] + ' in Tier ' + n + ' industries', short: 'Tier ' + n }; });
  });
  var seg = {}, growth = { all: { label: 'Customer growth %', short: 'Growth %' } };
  Object.keys(SEGMENT).forEach(function (s) {
    var low = SEGMENT[s].toLowerCase();
    seg[s] = { accounts: { label: SEGMENT[s] + ' accounts', short: SEGMENT[s] },
      arr: { label: 'Current ARR of ' + low + ' accounts', short: SEGMENT[s] },
      oi: { label: 'Three-year order intake of ' + low + ' accounts', short: SEGMENT[s] } };
    growth[s] = { label: 'Customer growth %, ' + low + ' accounts', short: SEGMENT[s] };
  });

  merge(T, {
    viewHead: { showMe: 'Show me' },
    measures: {
      rc: rc,
      nb: nb,
      cg: {
        accounts: { label: 'Accounts in the plan', short: 'Accounts' },
        currentArr: { label: 'Current ARR of the accounts', short: 'Account ARR' },
        oi3: { label: 'Three-year order intake from existing accounts', short: 'Order intake' },
        seg: seg,
        growth: growth,
        multiplierAccounts: { label: 'Accounts planned with a three-year multiplier', short: 'Multiplier accounts' },
        top3Share: { label: 'Share of planned growth in the top 3 accounts', short: 'Top 3 share' },
        riskShare: { label: 'Share of planned growth in high or medium risk accounts', short: 'At-risk share' }
      },
      ind: { nb: {
        services: { label: 'New business services potential', short: 'New business services' },
        oi: { label: 'New business order intake potential', short: 'New business order intake' }
      } },
      pt: {
        count: { label: 'Partners named', short: 'Partners' },
        fte: { label: 'Partner staff, sales and consultants (full-time equivalent)', short: 'Partner staff' },
        fteSales: { label: 'Partner sales staff (full-time equivalent)', short: 'Sales staff' },
        fteConsultants: { label: 'Partner consultants (full-time equivalent)', short: 'Consultants' },
        arr: { label: 'Partner ARR', short: 'Partner ARR' },
        services: { label: 'Partner services', short: 'Partner services' },
        oiPerFte: { label: 'Partner order intake per full-time equivalent', short: 'Order intake per head' }
      },
      amb: { nbShare: { label: 'Share of the 3-year ARR ambition from new business', short: 'New business share' } }
    },
    // Shares and ratios combined from their summed parts (ARCHITECTURE 17.5)
    combined: { how: { ratio: 'Calculated from the combined figures of {n} {regions}' } },
    sources: { combined: { ratio: 'Combined by this app: calculated from the combined figures of {regions}' } },
    // Menu names for the Phase 2 chart types, added to the Phase 1 list in content/text-engine.js
    chartTypes: { list: 'List' }
  });
})(window.TAP_CONTENT.text);
