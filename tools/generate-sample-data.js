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
 *             sample-derive.js, sample-plant.js and sample-planted.js (the planted cases), sample-expect.js,
 *             sample-expect-planted.js, sample-plant-p2.js, sample-planted-p2.js and sample-expect-p2.js (Phase 2),
 *             sample-extra.js (the test extra section), sample-p4.js, sample-planted-p4.js and sample-expect-p4.js (Phase 4),
 *             sample-*-d112.js (the D112 insight cases), config/comment-themes.js (read as data)
 * Used by: maintainers. The same settings always give byte-identical files (seeded random numbers).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const S = require('./sample-settings');
const NAMES = require('./sample-names');
const random = require('./sample-random');
const build = require('./sample-build');
const plant = require('./sample-plant');
const expect = require('./sample-expect');
const planted = require('./sample-expect-planted');
const planted2 = require('./sample-expect-p2');
const extra = require('./sample-extra');
const p4 = require('./sample-p4');
const planted4 = require('./sample-expect-p4');
const planted112 = require('./sample-expect-d112');

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
  plant.apply(plan, ctx);
  // No extra section in the sample (D93): tools/sample-extra.js writes the test one into the expectations instead
  p4.apply(plan);
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
    (cg.accounts.length ? list(cg.accounts, '   ') : '[]') + '}' +
    (r.extra ? ',\n  "extra": {' + Object.keys(r.extra).map(function (k) { return JSON.stringify(k) + ': ' + list(r.extra[k], '   '); }).join(', ') + '}' : '') +
    fullTemplateText(r) +
    '\n }';
}

// The Phase 4 parts, after the sections the earlier phases wrote. A part the region does not carry is left out.
function fullTemplateText(r) {
  let out = ',\n  "outsourcingPct": ' + inline(r.outsourcingPct);
  ['revenue', 'booksValue', 'strategicPlan'].forEach(function (k) { if (r[k]) out += ',\n  ' + JSON.stringify(k) + ': ' + list(r[k], '   '); });
  if (r.baseYear) {
    out += ',\n  "baseYear": {"year": ' + r.baseYear.year + ', "actualsThrough": ' + JSON.stringify(r.baseYear.actualsThrough) +
      ', "items": ' + list(r.baseYear.items, '   ') + '}';
  }
  if (r.routes) out += ',\n  "routes": ' + list(r.routes, '   ');
  return out;
}

// The extra sections one per line, after the rest of meta
function metaText(meta) {
  const rest = Object.assign({}, meta);
  delete rest.extraSections;
  if (!meta.extraSections) return inline(rest);
  return inline(rest).slice(0, -1) + ', "extraSections": ' + list(meta.extraSections, '  ') + '}';
}

function dataText(plan, notes) {
  const lk = plan.lookups;
  const body = [
    '"meta": ' + metaText(plan.meta) + ',',
    '"lookups": {',
    ' "industries": ' + list(lk.industries, '  ') + ',',
    ' "productLines": ' + list(lk.productLines, '  ') + ',',
    ' "channels": ' + list(lk.channels, '  ') + ',',
    ' "tiers": ' + list(lk.tiers, '  ') + ',',
    ' "segments": ' + list(lk.segments, '  ') + ',',
    ' "scales": {\n' + Object.keys(lk.scales).map(function (k) { return '  ' + JSON.stringify(k) + ': ' + inline(lk.scales[k]); }).join(',\n') + '\n },',
    ['productCategories', 'solutions', 'partnerTypes', 'partnerMaturity', 'routes'].map(function (k) { return ' ' + JSON.stringify(k) + ': ' + list(lk[k], '  '); }).join(',\n'),
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

// The Phase 4 figures: one key per line, and one region per line under "regions"
function blockP4(v) {
  return '{\n' + Object.keys(v).map(function (k) {
    if (k !== 'regions') return '    ' + JSON.stringify(k) + ': ' + inline(v[k]);
    return '    "regions": {\n' + Object.keys(v.regions).map(function (id) { return '      ' + JSON.stringify(id) + ': ' + inline(v.regions[id]); }).join(',\n') + '\n    }';
  }).join(',\n') + '\n  }';
}

function expectText(x) {
  return ['/*', ' * File: tests/fixtures/sample-expected.js',
    ' * Purpose: Figures the sample data generator worked out from the sample file, for the tests (docs/PLANTED-CASES.md).',
    ' * Provides: window.SAMPLE_EXPECT', ' * Depends on: nothing (generated by tools/generate-sample-data.js; do not edit by hand)',
    ' * Used by: tests/test-*.js', ' * Owner: whoever keeps the generator (INSIGHTS2 in Phase 2, EXTRA in Phase 3, DATA4 in Phase 4).', ' */', 'window.SAMPLE_EXPECT = {']
    .concat(Object.keys(x).map(function (k, i, all) { return '  ' + JSON.stringify(k) + ': ' + (k === 'p4' ? blockP4(x[k]) : block(x[k])) + (i < all.length - 1 ? ',' : ''); }))
    .concat(['};', '']).join('\n');
}

function main() {
  const made = makePlan();
  const x = expect.build(made.plan);
  // The vetted name parts, so the tests can check every account and partner name comes from them
  const kinds = [];
  Object.keys(NAMES.accountKinds).forEach(function (k) { NAMES.accountKinds[k].forEach(function (w) { if (kinds.indexOf(w) === -1) kinds.push(w); }); });
  NAMES.partnerKinds.forEach(function (w) { if (kinds.indexOf(w) === -1) kinds.push(w); });
  x.vettedNames = { stems: NAMES.stems, kinds: kinds };
  const px = Object.assign(planted.build(made.plan), planted2.build(made.plan));
  const bad = planted.check(px).concat(planted2.check(px));
  if (bad.length) throw new Error('planted cases that do not hold: ' + bad.join(', ') + '. See docs/PLANTED-CASES.md.');
  Object.keys(px).forEach(function (k) { x[k] = px[k]; });
  // The test extra section and its figures (the tests add it to a copy of the sample)
  x.extra = extra.expect(made.plan);
  // The full template (Phase 4): its figures and planted cases R01 to R10
  const px4 = planted4.build(made.plan);
  const bad4 = planted4.check(px4);
  if (bad4.length) throw new Error('Phase 4 planted cases that do not hold: ' + bad4.join('; ') + '. See docs/PLANTED-CASES.md.');
  Object.keys(px4).forEach(function (k) { x[k] = px4[k]; });
  // The D112 insight cases S01 to S04
  const px112 = planted112.build(made.plan);
  const bad112 = planted112.check(px112);
  if (bad112.length) throw new Error('D112 planted cases that do not hold: ' + bad112.join(', ') + '. See docs/PLANTED-CASES.md.');
  Object.keys(px112).forEach(function (k) { x[k] = px112[k]; });
  const out = {};
  out[DATA_FILE] = dataText(made.plan, expect.comment(x).concat(planted.comment(px), planted2.comment(px), planted4.comment(px4),
    planted112.comment(px112)));
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
