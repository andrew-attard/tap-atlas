/*
 * File: tools/build-pages.js
 * Purpose: Writes the script lists into index.html, index-sample.html and tests.html from one list, so the
 *          three pages always load the same app scripts in the same order, and the script order section of
 *          docs/ARCHITECTURE.md from the same list. Development only.
 * Provides: a command: node tools/build-pages.js [--check] (--check writes nothing and exits 1 if a file is out of step)
 * Depends on: Node 18+, nothing else
 * Used by: the lead, whenever a script file is added or removed
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// The app scripts in load order. DATA marks where each page loads its own data (and organization) files.
const APP = [
  'vendor/echarts.min.js',
  'js/theme.js',
  'js/core/namespace.js', 'js/core/dom.js', 'js/core/icons.js', 'js/core/storage.js', 'js/core/store.js', 'js/core/format.js',
  'config/settings.js',
  'content/ui-text.js', 'content/text-shell.js', 'content/text-engine.js', 'content/text-data.js', 'content/text-panel.js',
  'content/text-overview.js', 'content/text-industry.js', 'content/text-pages.js', 'content/text-engine2.js',
  'content/text-newbusiness.js', 'content/text-customers.js', 'content/text-profile.js', 'content/text-themes.js', 'content/text-present.js', 'content/text-custom.js', 'content/text-extra.js', 'content/glossary.js', 'content/guide.js',
  'ORG',
  'js/core/content.js',
  'DATA',
  'js/core/sources.js', 'js/core/check.js', 'js/core/extra.js', 'js/core/data.js',
  'js/engine/registry.js', 'js/engine/aggregate.js', 'js/engine/scope.js', 'js/engine/measures.js', 'js/engine/scores.js',
  'js/engine/measures-p2.js', 'js/engine/rows.js',
  'js/engine/shapes.js', 'js/engine/prepare.js',
  'js/engine/build-compare.js', 'js/engine/build-parts.js', 'js/engine/build-xy.js', 'js/engine/build-list.js', 'js/engine/custom.js',
  'config/reports.js', 'config/reports-overview.js', 'config/reports-industry.js', 'config/reports-newbusiness.js',
  'config/reports-customers.js', 'config/reports-partners.js', 'config/reports-themes.js', 'config/views.js', 'config/profile.js', 'config/running-order.js',
  'config/comment-themes.js', 'config/insight-rules.js',
  'js/reports/tier-stats.js', 'js/reports/tier-grid.js', 'js/reports/quadrant-labels.js', 'js/reports/quadrant.js', 'js/reports/details.js',
  'js/reports/details-rows.js', 'js/reports/cg-builders.js', 'js/reports/nb-grid.js', 'js/reports/nb-levers.js', 'js/reports/row-bubble.js', 'js/reports/themes.js',
  'js/insights/engine.js', 'js/insights/rules-priorities.js', 'js/insights/rules-judgement.js', 'js/insights/rules-assumptions.js',
  'js/insights/rules-realism.js', 'js/insights/rules-exposure.js', 'js/insights/rules-capability.js',
  'js/insights/rules-plan.js', 'js/insights/rules-shared.js', 'js/insights/rules-themes.js',
  'js/panel/panel-chart.js', 'js/panel/panel-table.js', 'js/panel/panel-menus.js', 'js/panel/panel-export.js',
  'js/panel/panel-insights.js', 'js/panel/panel-expand.js', 'js/panel/panel-drill.js', 'js/panel/panel-build.js', 'js/panel/panel.js',
  'js/ui/shell.js', 'js/ui/compare-bar.js', 'js/ui/layers.js', 'js/ui/sources-panel.js', 'js/ui/system-screens.js',
  'js/ui/glossary.js', 'js/ui/explain.js', 'js/ui/tour.js',
  'js/ui/showme.js', 'js/ui/keys.js', 'js/ui/view-head.js', 'js/ui/present-steps.js', 'js/ui/present-record.js', 'js/ui/present.js',
  'js/views/overview-cards.js', 'js/views/overview.js', 'js/views/industry.js', 'js/views/new-business.js',
  'js/views/customers.js', 'js/views/partners.js', 'js/views/other.js', 'js/views/regions-parts.js', 'js/views/regions.js', 'js/views/insights.js', 'js/ui/custom-builder.js', 'js/views/guide.js',
  'js/ui/app.js'
];

const CSS = ['css/base.css', 'css/shell.css', 'css/layers.css', 'css/glossary.css', 'css/panel.css',
  'css/overview.css', 'css/industry.css', 'css/pages.css', 'css/view-head.css', 'css/newbusiness.css', 'css/customers.css',
  'css/profile.css', 'css/themes.css', 'css/present.css', 'css/custom.css'];

// Test files, in run order. Each registers its cases with the harness.
const TESTS = [
  'tests/test-setup.js', 'tests/test-contracts.js', 'tests/test-core.js', 'tests/test-theme.js', 'tests/test-format.js',
  'tests/test-data.js', 'tests/test-check.js', 'tests/test-sources.js',
  'tests/test-combine.js', 'tests/test-measures.js', 'tests/test-shapes.js',
  'tests/test-shell.js', 'tests/test-content.js', 'tests/test-panel.js',
  'tests/test-overview.js', 'tests/test-industry.js', 'tests/test-insights.js', 'tests/test-rules.js', 'tests/test-ranking.js', 'tests/test-guardrails.js', 'tests/test-pages.js', 'tests/test-integrator.js',
  'tests/test-measures-p2.js', 'tests/test-rows.js', 'tests/test-list.js', 'tests/test-newbusiness.js', 'tests/test-customers.js',
  'tests/test-partners.js', 'tests/test-insights-p2.js', 'tests/test-profile.js', 'tests/test-pages-p2.js', 'tests/test-present.js', 'tests/test-custom.js', 'tests/test-extra.js', 'tests/test-extra-view.js', 'tests/test-docs3.js',
  'tests/test-meta.js'
];

const PAGES = {
  'index-sample.html': {
    purpose: 'Public edition: opens the app with fictional sample data (no organization layer).',
    data: ['data/sample-plan-data.js'], org: [], title: 'TAP Atlas (sample data)'
  },
  'index.html': {
    purpose: 'Internal edition: opens the app with the real plan data and the organization layer (both kept out of the repository).',
    data: ['data/plan-data.js'], org: ['content/organization.js'], title: 'TAP Atlas'
  },
  'tests.html': {
    purpose: 'The automated test page: runs every automated test case and shows a pass or fail summary.',
    data: ['data/sample-plan-data.js', 'tests/fixtures/mini-data.js', 'tests/fixtures/mini-expected.js',
      'tests/fixtures/sample-expected.js', 'tests/fixtures/broken-cases.js', 'tests/fixtures/insights-fixture.js',
      'tests/fixtures/mini-p2.js', 'tests/fixtures/mini-p2-expected.js'], org: [],
    title: 'TAP Atlas tests', tests: true
  }
};

function tag(src) { return '  <script src="' + src + '"></script>'; }

function page(name, p) {
  const scripts = [];
  APP.forEach(function (s) {
    if (s === 'ORG') p.org.forEach(function (o) { scripts.push(tag(o)); });
    else if (s === 'DATA') p.data.forEach(function (d) { scripts.push(tag(d)); });
    else scripts.push(tag(s));
  });
  const css = CSS.map(function (c) { return '  <link rel="stylesheet" href="' + c + '">'; });
  let body = '<body>\n  <div id="app"></div>\n';
  let tail = '';
  if (p.tests) {
    css.push('  <link rel="stylesheet" href="tests/harness.css">');
    // The harness loads first so it catches errors in any app script that follows.
    body = '<body data-autostart="false">\n  <div id="t-root"></div>\n  <div id="app" hidden></div>\n' +
      tag('tests/harness.js') + '\n';
    tail = [tag('tests/cvd.js'), tag('tests/auto-cases.js')].concat(TESTS.map(tag)).join('\n') + '\n';
  }
  return '<!doctype html>\n<!--\n  File: ' + name + '\n  Purpose: ' + p.purpose +
    '\n  Provides: the page and its script order (generated by tools/build-pages.js; edit the list there)' +
    '\n  Depends on: every file listed below' +
    '\n  Used by: double-click to open in Chrome or Edge\n-->\n' +
    '<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '  <title>' + p.title + '</title>\n' + css.join('\n') + '\n</head>\n' + body +
    scripts.join('\n') + '\n' + tail + '</body>\n</html>\n';
}

// The script order section of docs/ARCHITECTURE.md (section 14), between its two marker comments: one line per
// folder run, the data and organization slots in brackets, so the document can never drift from the pages.
const ARCH = 'docs/ARCHITECTURE.md';
const MARK_START = '<!-- script-order:start (written by tools/build-pages.js) -->';
const MARK_END = '<!-- script-order:end -->';
function scriptOrder() {
  const lines = [];
  let dir = null;
  APP.forEach(function (s) {
    if (s === 'ORG') { lines.push('   [index.html only: content/organization.js]'); dir = null; return; }
    if (s === 'DATA') { lines.push('   [data file: data/plan-data.js | data/sample-plan-data.js | tests/fixtures/mini-data.js]'); dir = null; return; }
    const d = path.posix.dirname(s), f = path.posix.basename(s);
    if (d === dir) lines[lines.length - 1] += '  ' + f;
    else { lines.push(s); dir = d; }
  });
  return MARK_START + '\n```\n' + lines.join('\n') + '\n```\n' + MARK_END;
}
function withScriptOrder(text) {
  const a = text.indexOf(MARK_START), b = text.indexOf(MARK_END);
  if (a < 0 || b < a) throw new Error(ARCH + ': the script-order markers are missing');
  return text.slice(0, a) + scriptOrder() + text.slice(b + MARK_END.length);
}

const check = process.argv.indexOf('--check') >= 0;
const wanted = {};
Object.keys(PAGES).forEach(function (name) { wanted[name] = page(name, PAGES[name]); });
wanted[ARCH] = withScriptOrder(fs.readFileSync(path.join(ROOT, ARCH), 'utf8'));
if (check) {
  const stale = Object.keys(wanted).filter(function (f) {
    const at = path.join(ROOT, f);
    return !fs.existsSync(at) || fs.readFileSync(at, 'utf8') !== wanted[f];
  });
  if (stale.length) {
    process.stderr.write('Out of step with tools/build-pages.js (run it and commit the result):\n  ' + stale.join('\n  ') + '\n');
    process.exit(1);
  }
  process.stdout.write('pages and script order in step: ' + Object.keys(wanted).join(', ') + '\n');
  process.exit(0);
}
Object.keys(wanted).forEach(function (name) { fs.writeFileSync(path.join(ROOT, name), wanted[name]); });

// Every listed file must exist (except the gitignored real-data and organization files).
const optional = ['data/plan-data.js', 'content/organization.js', 'vendor/echarts.min.js',
  'tests/harness.js', 'tests/harness.css', 'tests/cvd.js'];
const missing = APP.concat(CSS, TESTS, ['tests/auto-cases.js'])
  .filter(function (f) { return f !== 'ORG' && f !== 'DATA' && optional.indexOf(f) < 0; })
  .filter(function (f) { return !fs.existsSync(path.join(ROOT, f)); });
if (missing.length) {
  process.stderr.write('Listed but missing:\n  ' + missing.join('\n  ') + '\n');
  process.exit(1);
}
process.stdout.write('Wrote ' + Object.keys(wanted).join(', ') + '\n');
// The QA page is generated from index-sample.html; keep it in step whenever the pages change.
const qa = path.join(ROOT, 'scripts', 'qa', 'make-qa-page.js');
if (fs.existsSync(qa)) require('child_process').execFileSync(process.execPath, [qa], { stdio: 'inherit' });
