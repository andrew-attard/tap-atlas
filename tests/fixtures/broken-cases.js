/*
 * File: tests/fixtures/broken-cases.js
 * Purpose: Deliberately broken data files for the contract check tests (TPV-TC-206): each case breaks one thing.
 * Provides: window.TEST_FIXTURES.broken (cases: [{id, level, change(plan), expect}], extras(plan))
 * Depends on: tests/fixtures/mini-data.js (every case starts from a fresh copy of the mini fixture)
 * Used by: tests/test-check.js
 * Owner: the DATA stream.
 *
 * level is 'errors' (stops loading) or 'warnings' (loads, listed in the data sources panel).
 * expect names the one item the check must report. found is the raw value, or 'nothing' for a missing field.
 */
window.TEST_FIXTURES = window.TEST_FIXTURES || {};
window.TEST_FIXTURES.broken = {
  cases: [
    // The four cases the Test Plan names
    { id: 'missing-field', level: 'errors',
      change: function (p) { delete p.regions[1].marketCoverage[2].tier; },
      expect: { path: 'regions[1].marketCoverage[2].tier', region: 'Region B', item: 'Retail (row 12)',
        expected: '1, 2 or 3', found: 'nothing' } },
    { id: 'wrong-type', level: 'errors',
      change: function (p) { p.regions[0].newBusiness[0].targetAccounts = '20'; },
      expect: { path: 'regions[0].newBusiness[0].targetAccounts', region: 'Region A', item: 'Healthcare (row 20)',
        expected: 'a number, or null for a blank', found: '20' } },
    { id: 'tier-as-text', level: 'errors',
      change: function (p) { p.regions[2].marketCoverage[3].tier = 'Tier 2'; },
      expect: { path: 'regions[2].marketCoverage[3].tier', region: 'Region C', item: 'Utilities (row 13)',
        expected: '1, 2 or 3', found: 'Tier 2',
        message: 'regions[2].marketCoverage[3].tier: expected 1, 2 or 3, found "Tier 2"' } },
    { id: 'unknown-industry', level: 'errors',
      change: function (p) { p.regions[3].marketCoverage[1].industryId = 'ind9'; },
      expect: { path: 'regions[3].marketCoverage[1].industryId', region: 'Region D', item: 'ind9 (row 11)',
        expected: 'an industry id from lookups.industries', found: 'ind9' } },

    // More errors: allowed values, references between sections, plan years
    { id: 'rating-out-of-range', level: 'errors',
      change: function (p) { p.regions[0].marketCoverage[0].expertise = 4; },
      expect: { path: 'regions[0].marketCoverage[0].expertise', region: 'Region A', item: 'Healthcare (row 10)',
        expected: '1, 2 or 3', found: 4 } },
    { id: 'nb-tier-mismatch', level: 'errors',
      change: function (p) { p.regions[0].newBusiness[1].tier = 1; },
      expect: { path: 'regions[0].newBusiness[1].tier', region: 'Region A', item: 'Utilities (row 21)',
        expected: 'the Market Coverage tier for this industry (2)', found: 1 } },
    { id: 'unknown-segment', level: 'errors',
      change: function (p) { p.regions[3].customerGrowth.accounts[0].segment = 'platinum'; },
      expect: { path: 'regions[3].customerGrowth.accounts[0].segment', region: 'Region D', item: 'Fictional Account D1 (row 10)',
        expected: '"strategic", "growth", "core" or "scaled"', found: 'platinum' } },
    { id: 'unknown-channel', level: 'errors',
      change: function (p) { p.regions[1].partners[0].channel = 'reseller'; },
      expect: { path: 'regions[1].partners[0].channel', region: 'Region B', item: 'Fictional Partner B1 (row 10)',
        expected: '"partner", "allianceA" or "allianceB"', found: 'reseller' } },
    { id: 'unknown-risk', level: 'errors',
      change: function (p) { p.regions[0].customerGrowth.accounts[1].riskLevel = 'low'; },
      expect: { path: 'regions[0].customerGrowth.accounts[1].riskLevel', region: 'Region A', item: 'Fictional Account A2 (row 11)',
        expected: '"high" or "medium"', found: 'low' } },
    { id: 'two-plan-years', level: 'errors',
      change: function (p) { p.meta.years = [2027, 2028]; },
      expect: { path: 'meta.years', region: null, item: null, expected: 'a list of 3 plan years', found: 'a list of 2' } },
    { id: 'short-year-list', level: 'errors',
      change: function (p) { p.regions[1].newBusiness[0].arrPotential = [1000, 1200]; },
      expect: { path: 'regions[1].newBusiness[0].arrPotential', region: 'Region B', item: 'Healthcare (row 20)',
        expected: 'a list of 3 values, one per plan year', found: 'a list of 2' } },
    { id: 'missing-section', level: 'errors',
      change: function (p) { delete p.regions[3].partners; },
      expect: { path: 'regions[3].partners', region: 'Region D', item: null, expected: 'a list', found: 'nothing' } },

    { id: 'nb-without-mc-row', level: 'errors',
      change: function (p) { p.regions[0].marketCoverage.splice(3, 1); },
      expect: { path: 'regions[0].newBusiness[1].industryId', region: 'Region A', item: 'Utilities (row 21)',
        expected: 'an industry with a row in Market Coverage', found: 'ind4' } },
    { id: 'unknown-product-line', level: 'errors',
      change: function (p) { p.regions[0].customerGrowth.accounts[0].productLine = 'pl9'; },
      expect: { path: 'regions[0].customerGrowth.accounts[0].productLine', region: 'Region A', item: 'Fictional Account A1 (row 10)',
        expected: 'a product line id from lookups.productLines', found: 'pl9' } },
    { id: 'recap-year', level: 'errors',
      change: function (p) { p.regions[0].recap[0].year = 2030; },
      expect: { path: 'regions[0].recap[0].year', region: 'Region A', item: 'cell E5', expected: '2027, 2028 or 2029', found: 2030 } },
    { id: 'recap-motion', level: 'errors',
      change: function (p) { p.regions[0].recap[1].motion = 'renewal'; },
      expect: { path: 'regions[0].recap[1].motion', region: 'Region A', item: 'cell F5',
        expected: '"newBusiness" or "customerGrowth"', found: 'renewal' } },
    { id: 'recap-type', level: 'errors',
      change: function (p) { p.regions[1].recap[0].type = 'licence'; },
      expect: { path: 'regions[1].recap[0].type', region: 'Region B', item: 'cell E5', expected: '"arr" or "services"', found: 'licence' } },
    { id: 'recap-channel', level: 'errors',
      change: function (p) { p.regions[3].recap[0].channel = 'reseller'; },
      expect: { path: 'regions[3].recap[0].channel', region: 'Region D', item: 'cell E5',
        expected: 'a channel id from lookups.channels', found: 'reseller' } },
    { id: 'duplicate-account-id', level: 'errors',
      change: function (p) { p.regions[0].customerGrowth.accounts[1].id = 'a1'; },
      expect: { path: 'regions[0].customerGrowth.accounts[1].id', region: 'Region A', item: 'Fictional Account A2 (row 11)',
        expected: 'an id not already used in this list', found: 'a1' } },
    { id: 'missing-channel', level: 'errors',
      change: function (p) { delete p.regions[0].newBusiness[0].channelSplit.allianceB; },
      expect: { path: 'regions[0].newBusiness[0].channelSplit.allianceB', region: 'Region A', item: 'Healthcare (row 20)',
        expected: 'a number, or null for a blank', found: 'nothing' } },
    { id: 'year-list-element', level: 'errors',
      change: function (p) { p.regions[1].newBusiness[0].arrPotential = [1000, '1200', 1200]; },
      expect: { path: 'regions[1].newBusiness[0].arrPotential[1]', region: 'Region B', item: 'Healthcare (row 20)',
        expected: 'a number, or null for a blank', found: '1200' } },
    { id: 'duplicate-plan-years', level: 'errors',
      change: function (p) { p.meta.years = [2027, 2027, 2029]; },
      expect: { path: 'meta.years', region: null, item: null, expected: 'a list of 3 plan years', found: 'a list of 3' } },

    // Warnings: the file still loads
    { id: 'rating-on-unrated', level: 'warnings',
      change: function (p) { p.regions[0].marketCoverage[4].growthPotential = 2; },
      expect: { path: 'regions[0].marketCoverage[4].growthPotential', region: 'Region A', item: 'Other (row 14)',
        expected: 'no rating, as this industry is not rated', found: 2 } },
    { id: 'no-source-map', level: 'warnings',
      change: function (p) { delete p.meta.sourceMap; },
      expect: { path: 'meta.sourceMap', region: null, item: null,
        expected: 'the template map: a sheet and its columns for each section', found: 'nothing' } },
    { id: 'source-map-section-missing', level: 'warnings',
      change: function (p) { delete p.meta.sourceMap.partners; },
      expect: { path: 'meta.sourceMap.partners', region: null, item: null,
        expected: 'the template map: a sheet and its columns for each section', found: 'nothing' } },
    { id: 'no-source-cell', level: 'warnings',
      change: function (p) { delete p.regions[0].recap[0].sourceCell; },
      expect: { path: 'regions[0].recap[0].sourceCell', region: 'Region A', item: null,
        expected: 'the worksheet cell, for example "E5"', found: 'nothing' } },
    { id: 'split-not-100', level: 'warnings',
      change: function (p) { p.regions[0].newBusiness[0].channelSplit.partner = 0.45; },
      expect: { path: 'regions[0].newBusiness[0].channelSplit', region: 'Region A', item: 'Healthcare (row 20)',
        expected: 'channel shares adding up to 100%', found: '95%' } },
    { id: 'arr-not-recalculated', level: 'warnings',
      change: function (p) { p.regions[0].newBusiness[0].arrPotential[0] = 450; },
      expect: { path: 'regions[0].newBusiness[0].arrPotential[0]', region: 'Region A', item: 'Healthcare (row 20)',
        expected: 'target accounts × hit rate × average deal size = 500', found: 450 } },
    { id: 'segment-off-thresholds', level: 'warnings',
      change: function (p) { p.regions[0].customerGrowth.accounts[1].segment = 'strategic'; },
      expect: { path: 'regions[0].customerGrowth.accounts[1].segment', region: 'Region A', item: 'Fictional Account A2 (row 11)',
        expected: 'the segment the thresholds give ("core")', found: 'strategic' } },
    { id: 'no-source-row', level: 'warnings',
      change: function (p) { delete p.regions[1].newBusiness[1].sourceRow; },
      expect: { path: 'regions[1].newBusiness[1].sourceRow', region: 'Region B', item: 'Education',
        expected: 'the worksheet row number', found: 'nothing' } },
    { id: 'empty-section', level: 'warnings',
      change: function (p) { p.regions[0].partners = []; },
      expect: { path: 'regions[0].partners', region: 'Region A', item: null,
        expected: 'at least one item', found: 'an empty list' } }
  ],

  // Not broken: fields and sections the contract doesn't name are ignored (D47), so an import can add
  // the real template's extra sheets before the contract covers them. Must add no errors and no warnings.
  extras: function (p) {
    p.meta.importTool = 'Copilot import, draft 3';
    p.lookups.markets = [{ id: 'm1', name: 'Market 1' }];
    p.regions[0].marketCoverage[0].localNote = 'An extra column';
    p.regions[0].customerGrowth.accounts[0].accountType = 'Key account';
    p.regions[1].pricing = [{ sourceRow: 5, item: 'Price adjustment', value: 0.03 }];
    p.regions[1].customerGrowth.summary = { accounts: 2 };
  }
};
