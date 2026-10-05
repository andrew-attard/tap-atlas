#!/usr/bin/env node
/*
 * File: scripts/qa/variants.js
 * Purpose: Writes imperfect copies of the sample data (markup and very long names, blanks, zeros, negatives, empty
 *          sections, one, two and nine regions, no extra sections) and a QA page for each, so the smoke test can
 *          show how the app copes with data that is messier than the sample.
 * Provides: CLI `node scripts/qa/variants.js [name...]`; prints the names written. Pages: tests/qa-variant-<name>.html,
 *           data: tests/qa-variants/<name>.js (both ignored by git)
 * Depends on: Node 18+; data/sample-plan-data.js; tests/qa.html (made by scripts/qa/make-qa-page.js)
 * Used by: scripts/qa/variants.sh
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const out = path.join(root, 'tests', 'qa-variants');

function sample() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'data', 'sample-plan-data.js'), 'utf8'), ctx);
  return JSON.parse(JSON.stringify(ctx.window.PLAN_DATA));
}

// Markup that counts itself if it ever runs, so the watcher can tell escaped text from executed markup.
const PROBE = '<img src=x onerror="window.__qaProbe=(window.__qaProbe||0)+1">';
const LONG = 'A very long name that keeps going well past any sensible column width to see what the layout does with it';
const WORD = 'Unbrokenlongnamewithoutanyspaces'.repeat(3);

const VARIANTS = {
  // Markup and long names in every kind of name and free text; blanks, zeros and negatives; sections left empty.
  messy() {
    const p = sample(), R = p.regions;
    R[0].name = 'North & "West" ' + PROBE;
    R[1].name = LONG;
    R[2].name = WORD;
    p.lookups.industries[0].name = 'Industry <b>bold</b> & ' + PROBE;
    p.lookups.industries[1].name = LONG;
    p.lookups.productLines[0].name = 'Line ' + PROBE;
    p.lookups.channels[1].name = 'Partner <i>x</i>';
    p.lookups.segments[0].name = 'Strategic ' + PROBE;
    R[0].source.fileName = 'plan ' + PROBE + '.xlsx';
    R[0].source.notes = [{ message: 'Note ' + PROBE, sheet: '1 <b>', cell: 'A1' }];
    R[0].marketCoverage[0].commentary = 'Comment ' + PROBE + ' partners and references matter. ' + LONG;
    Object.assign(R[0].newBusiness[0], { subVertical: 'Sub ' + PROBE, market: 'Market ' + PROBE, successFactors: 'Partners and skills ' + PROBE });
    R[0].newBusiness[1].subVertical = LONG;
    Object.assign(R[0].partners[0], { name: 'Partner ' + PROBE, maturity: 'Maturity ' + PROBE, expertiseGeo: LONG });
    R[1].partners[0].name = WORD;
    const a0 = R[0].customerGrowth.accounts;
    Object.assign(a0[0], { name: 'Account ' + PROBE, country: 'Country ' + PROBE });
    a0[1].name = LONG;
    a0[2].name = null;
    (p.meta.extraSections || []).forEach((s) => { s.title = 'Section ' + PROBE; s.intro = 'Intro ' + PROBE; s.columns[0].label = 'Column ' + PROBE; });
    const ev = R[0].extra && R[0].extra[(p.meta.extraSections || [{}])[0].id];
    if (ev && ev[0]) { ev[0][Object.keys(ev[0]).filter((k) => k !== 'sourceRow')[0]] = 'Row ' + PROBE; }
    const nb = R[2].newBusiness;
    Object.assign(nb[0], { targetAccounts: null, hitRate: null, avgDealSize: null });
    Object.assign(nb[1], { arrPotential: [null, null, null], servicesPotential: [null, null, null] });
    if (nb[2]) Object.assign(nb[2], { targetAccounts: 0, hitRate: 0, arrPotential: [0, 0, 0] });
    if (nb[3]) Object.assign(nb[3], { channelSplit: { direct: null, partner: null, allianceA: null, allianceB: null }, growth: { year2: null, year3: null } });
    if (nb[4]) Object.assign(nb[4], { avgDealSize: -50, arrPotential: [-10, 5, 90000] });
    R[3].partners.forEach((x, i) => {
      if (i === 0) Object.assign(x, { fteSales: 0, fteConsultants: 0 });
      if (i === 1) Object.assign(x, { fteSales: null, fteConsultants: null });
      if (i === 2) Object.assign(x, { arr: [null, null, null], services: [null, null, null] });
    });
    const a3 = R[3].customerGrowth.accounts;
    a3[0].currentArr = 0; a3[1].currentArr = null; a3[2].incrementalArr = [null, null, null]; a3[3].growthPct = null;
    if (a3[4]) Object.assign(a3[4], { segment: null, riskLevel: 'high', cumulativeOrderIntake: null });
    if (a3[5]) Object.assign(a3[5], { incrementalArr: [-100, -200, -300], industryId: null, productLine: null });
    R[3].customerGrowth.thresholds = { strategicArr: null, scaledArr: null, growthArr: null, growthOrderIntake: null };
    R[5].marketCoverage.forEach((m, i) => {
      if (i % 2) ['growthPotential', 'references', 'tier', 'commentary', 'currentArr', 'pipelineTotal', 'pipelineCreated12m'].forEach((k) => { m[k] = null; });
    });
    R[6].newBusiness = []; R[5].partners = []; R[1].recap = []; R[2].extra = {};
    delete R[6].extra;
    return p;
  },
  // More regions than the palette has colours.
  nine() {
    const p = sample();
    ['a', 'b'].forEach((s, i) => {
      const c = JSON.parse(JSON.stringify(p.regions[i]));
      c.id = 'extra' + s; c.name = 'Extra region ' + s.toUpperCase(); c.source.fileName = 'Extra ' + s + ' plan.xlsx';
      c.customerGrowth.accounts.forEach((a) => { a.id = c.id + '-' + a.id; });
      p.regions.push(c);
    });
    return p;
  },
  one() { const p = sample(); p.regions = p.regions.slice(0, 1); return p; },
  two() { const p = sample(); p.regions = p.regions.slice(3, 5); return p; },
  // Every list section empty and every leader input blank.
  empty() {
    const p = sample();
    p.regions.forEach((r) => {
      r.newBusiness = []; r.partners = []; r.recap = []; r.customerGrowth.accounts = []; r.extra = {};
      r.customerGrowth.thresholds = { strategicArr: null, scaledArr: null, growthArr: null, growthOrderIntake: null };
      r.marketCoverage.forEach((m) => {
        ['growthPotential', 'criticality', 'competitiveIntensity', 'references', 'expertise', 'productFit', 'tier', 'commentary',
          'currentArr', 'pipelineTotal', 'pipelineCreated12m'].forEach((k) => { m[k] = null; });
      });
    });
    return p;
  },
  noextra() { const p = sample(); delete p.meta.extraSections; p.regions.forEach((r) => { delete r.extra; }); return p; }
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(VARIANTS);
const qa = fs.readFileSync(path.join(root, 'tests', 'qa.html'), 'utf8');
fs.mkdirSync(out, { recursive: true });
names.forEach((name) => {
  if (!VARIANTS[name]) throw new Error('Unknown variant: ' + name + ' (known: ' + Object.keys(VARIANTS).join(', ') + ')');
  const head = ['/*', ' * File: tests/qa-variants/' + name + '.js', ' * Purpose: Imperfect copy of the sample data (' + name + ') for the QA runs. Generated: do not edit, never committed.',
    ' * Provides: window.PLAN_DATA', ' * Depends on: nothing', ' * Used by: tests/qa-variant-' + name + '.html (scripts/qa/variants.sh)', ' */'].join('\n');
  fs.writeFileSync(path.join(out, name + '.js'), head + '\nwindow.PLAN_DATA = ' + JSON.stringify(VARIANTS[name]()) + ';\n');
  const page = qa.replace('../data/sample-plan-data.js', 'qa-variants/' + name + '.js')
    .replace('<script src="../scripts/qa/qa-run.js">', '<script src="../scripts/qa/watch.js"></script>\n  <script src="../scripts/qa/qa-run.js">');
  if (page.indexOf('qa-variants/' + name) < 0 || page.indexOf('watch.js') < 0) throw new Error('tests/qa.html has changed shape');
  fs.writeFileSync(path.join(root, 'tests', 'qa-variant-' + name + '.html'), page);
  process.stdout.write(name + '\n');
});
