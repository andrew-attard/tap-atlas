#!/usr/bin/env node
/*
 * File: tools/generate-sample-data.js
 * Purpose: Builds the fictional sample data file from fixed settings, so it can be regenerated whenever the
 *          Data Contract changes instead of being edited by hand (US-1.3.3). Development only: viewers never
 *          need it, because the app folder ships with the generated file.
 * Provides: a command:  node tools/generate-sample-data.js        (run from the repository root, Node 18+)
 *           Writes data/sample-plan-data.js (window.PLAN_DATA) and tests/fixtures/sample-expected.js
 *           (window.SAMPLE_EXPECT, the figures the tests check). Add --check to compare instead of writing.
 * Depends on: Node 18+ only; tools/sample-settings.js, sample-names.js, sample-random.js, sample-build.js,
 *             sample-derive.js, sample-expect.js
 * Used by: maintainers. The same settings always give byte-identical files (seeded random numbers).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const S = require('./sample-settings');
const NAMES = require('./sample-names');
const random = require('./sample-random');
const build = require('./sample-build');
const expect = require('./sample-expect');

const ROOT = path.join(__dirname, '..');
const DATA_FILE = 'data/sample-plan-data.js';
const EXPECT_FILE = 'tests/fixtures/sample-expected.js';

const SCALES = {
  growthPotential: ['Strong dynamics, business to take', 'Healthy dynamics, large untapped base', 'Limited traction, limited pool'],
  criticality: ['Core, business critical', 'Moderate value, executive level', 'Limited value, not executive level'],
  competitiveIntensity: ['We are the recognized leader', 'Fragmented, no clear leader', 'Dominant competitor(s)'],
  references: ['Selling to top 5 local players', 'Some references', 'No or limited references'],
  expertise: ['Generalized', 'Few key experts', 'Limited'],
  productFit: ['Strong', 'Partial', 'Major gaps']
};

// The same field-to-column map as tests/fixtures/mini-data.js (docs/DATA-CONTRACT.md).
const SOURCE_MAP = {
  marketCoverage: { sheet: '1. Market Coverage', columns: { industryId: 'B', growthPotential: 'D', criticality: 'E', competitiveIntensity: 'F', currentArr: 'G', pipelineTotal: 'H', pipelineCreated12m: 'I', references: 'J', expertise: 'K', productFit: 'L', tier: 'M', commentary: 'N' } },
  newBusiness: { sheet: '2. New Business', columns: { industryId: 'B', market: 'C', subVertical: 'D', 'channelSplit.direct': 'E', 'channelSplit.partner': 'F', 'channelSplit.allianceA': 'G', 'channelSplit.allianceB': 'H', targetAccounts: 'I', hitRate: 'J', avgDealSize: 'K', 'growth.year2': 'L', 'growth.year3': 'M', successFactors: 'N', arrPotential: ['O', 'P', 'Q'], servicesPotential: ['R', 'S', 'T'], servicesRatio: 'U' } },
  customerGrowth: { sheet: '3. Customer Growth', columns: { name: 'C', industryId: 'D', country: 'E', productLine: 'F', currentArr: 'G', riskLevel: 'H', growthPct: ['I', 'J', 'K'], multiplier3y: 'L', servicesRatio: 'M', incrementalArr: ['N', 'O', 'P'], servicesOrderIntake: ['Q', 'R', 'S'], cumulativeOrderIntake: 'T', segment: 'U' },
    cells: { 'thresholds.strategicArr': 'N3', 'thresholds.scaledArr': 'N4', 'thresholds.growthArr': 'N5', 'thresholds.growthOrderIntake': 'N6' } },
  partners: { sheet: '4. Partner', columns: { name: 'B', channel: 'C', maturity: 'D', expertiseGeo: 'E', expertiseProduct: 'F', fteSales: 'G', fteConsultants: 'H', centralSupportPct: 'I', arr: ['J', 'K', 'L'], services: ['M', 'N', 'O'] } },
  recap: { sheet: '4. Partner' }
};

function lookups() {
  return {
    industries: S.industries.map(function (d) {
      return { id: d.id, name: d.name, productLine: d.pl, groupPriority: !!d.group, rated: !d.unrated };
    }),
    productLines: S.productLines,
    channels: [{ id: 'direct', name: 'Direct' }, { id: 'partner', name: 'Partner' }, { id: 'allianceA', name: 'Alliance A' }, { id: 'allianceB', name: 'Alliance B' }],
    tiers: [{ id: 1, name: 'Group priority', description: 'Set by group strategy' },
      { id: 2, name: 'Focus', description: 'A winning recipe, worth investing in' },
      { id: 3, name: 'Opportunistic', description: 'No active investment' }],
    segments: [{ id: 'strategic', name: 'Strategic', description: 'Current ARR above the strategic threshold' },
      { id: 'growth', name: 'Growth', description: 'High planned order intake and ARR above the growth threshold' },
      { id: 'core', name: 'Core', description: 'Everything else' },
      { id: 'scaled', name: 'Scaled', description: 'Current ARR below the scaled threshold' }],
    scales: Object.keys(SCALES).reduce(function (o, k) {
      o[k] = { levels: SCALES[k].map(function (label, i) { return { score: 3 - i, label: label }; }) };
      return o;
    }, {})
  };
}

// Hands out each coined name once, in a seeded order.
function namer(rnd) {
  const stems = rnd.shuffle(NAMES.stems);
  let next = 0;
  return function (kind) {
    if (next >= stems.length) throw new Error('sample-names.js: not enough stems for every account and partner');
    return stems[next++] + ' ' + kind;
  };
}

function makePlan() {
  const rnd = random.create(S.seed);
  const ctx = { S: S, rnd: rnd, name: namer(rnd) };
  const plan = {
    meta: { schemaVersion: '0.2', generatedAt: S.generatedAt, templateVersion: S.templateVersion, currency: 'EUR',
      years: S.years, isSample: true, sourceMap: SOURCE_MAP },
    lookups: lookups(),
    regions: S.regions.map(function (rs, i) { return build.region(rs, i, ctx); })
  };
  return { plan: plan, ctx: ctx };
}

// ---- writing: one item per line, in the style of tests/fixtures/mini-data.js ----

function inline(v) {
  if (Array.isArray(v)) return '[' + v.map(inline).join(', ') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).filter(function (k) { return k.charAt(0) !== '_'; })
      .map(function (k) { return JSON.stringify(k) + ': ' + inline(v[k]); }).join(', ') + '}';
  }
  if (typeof v === 'number') return String(Number(v.toFixed(6)));
  return JSON.stringify(v);
}

function list(items, indent) {
  return '[\n' + items.map(function (x) { return indent + inline(x); }).join(',\n') + '\n' + indent.slice(1) + ']';
}

function regionText(r) {
  const head = inline({ id: r.id, name: r.name, source: r.source }).slice(0, -1);
  const cg = r.customerGrowth;
  return ' ' + head + ',\n' +
    '  "marketCoverage": ' + list(r.marketCoverage, '   ') + ',\n' +
    '  "newBusiness": ' + list(r.newBusiness, '   ') + ',\n' +
    '  "partners": ' + list(r.partners, '   ') + ',\n' +
    '  "recap": ' + list(r.recap, '   ') + ',\n' +
    '  "customerGrowth": {"thresholds": ' + inline(cg.thresholds) + ', "accounts": ' +
    (cg.accounts.length ? list(cg.accounts, '   ') : '[]') + '}\n }';
}

function dataText(plan, notes) {
  const lk = plan.lookups;
  const body = [
    '"meta": ' + inline(plan.meta) + ',',
    '"lookups": {',
    ' "industries": ' + list(lk.industries, '  ') + ',',
    ' "productLines": ' + list(lk.productLines, '  ') + ',',
    ' "channels": ' + list(lk.channels, '  ') + ',',
    ' "tiers": ' + list(lk.tiers, '  ') + ',',
    ' "segments": ' + list(lk.segments, '  ') + ',',
    ' "scales": {\n' + Object.keys(lk.scales).map(function (k) { return '  ' + JSON.stringify(k) + ': ' + inline(lk.scales[k]); }).join(',\n') + '\n }',
    '},',
    '"regions": [\n' + plan.regions.map(regionText).join(',\n') + '\n]'
  ];
  return ['/*', ' * File: data/sample-plan-data.js',
    ' * Purpose: Fictional sample plan data for the public edition and the tests. Generated: do not edit by hand.',
    ' * Provides: window.PLAN_DATA (Data Contract v0.2, docs/DATA-CONTRACT.md)',
    ' * Depends on: nothing',
    ' * Used by: index-sample.html, tests.html',
    ' *',
    ' * Made by tools/generate-sample-data.js from tools/sample-settings.js: change the settings and rerun it.',
    ' * Every name and figure is invented. Money is in thousands of EUR; rates are decimals.',
    ' *',
    ' * Expectations (also in tests/fixtures/sample-expected.js, which the tests read):']
    .concat(notes.map(function (l) { return ' *   ' + l; }))
    .concat([' */', 'window.PLAN_DATA = {', body.join('\n'), '};', '']).join('\n');
}

// An object of per-region objects goes one region per line; anything else on one line.
function block(v) {
  const keys = v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v) : [];
  if (!keys.length || !keys.every(function (k) { return v[k] && typeof v[k] === 'object' && !Array.isArray(v[k]); })) return inline(v);
  return '{\n' + keys.map(function (k) { return '    ' + JSON.stringify(k) + ': ' + inline(v[k]); }).join(',\n') + '\n  }';
}

function expectText(x) {
  return ['/*', ' * File: tests/fixtures/sample-expected.js',
    ' * Purpose: Figures the sample data generator worked out from the sample file, for the tests (docs/PLANTED-CASES.md).',
    ' * Provides: window.SAMPLE_EXPECT', ' * Depends on: nothing (generated by tools/generate-sample-data.js; do not edit by hand)',
    ' * Used by: tests/test-*.js', ' * Owner: the DATA stream.', ' */', 'window.SAMPLE_EXPECT = {']
    .concat(Object.keys(x).map(function (k, i, all) { return '  ' + JSON.stringify(k) + ': ' + block(x[k]) + (i < all.length - 1 ? ',' : ''); }))
    .concat(['};', '']).join('\n');
}

function main() {
  const made = makePlan();
  const x = expect.build(made.plan);
  const out = {};
  out[DATA_FILE] = dataText(made.plan, expect.comment(x));
  out[EXPECT_FILE] = expectText(x);
  const check = process.argv.indexOf('--check') !== -1;
  let differ = 0;
  Object.keys(out).forEach(function (rel) {
    const file = path.join(ROOT, rel);
    if (check) {
      const same = fs.existsSync(file) && fs.readFileSync(file, 'utf8') === out[rel];
      if (!same) differ++;
      process.stdout.write((same ? 'same     ' : 'DIFFERS  ') + rel + '\n');
    } else {
      fs.writeFileSync(file, out[rel]);
      process.stdout.write('wrote    ' + rel + '\n');
    }
  });
  if (differ) process.exit(1);
}

if (require.main === module) main();
module.exports = { makePlan: makePlan };
