/*
 * File: tools/build-pages.js
 * Purpose: Writes the script lists into index.html, index-sample.html and tests.html from one list, so the
 *          three pages always load the same app scripts in the same order. Development only.
 * Provides: a command: node tools/build-pages.js
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
  'content/text-overview.js', 'content/text-industry.js', 'content/text-pages.js', 'content/glossary.js', 'content/guide.js',
  'ORG',
  'js/core/content.js',
  'DATA',
  'js/core/sources.js', 'js/core/check.js', 'js/core/data.js',
  'js/engine/registry.js', 'js/engine/aggregate.js', 'js/engine/scope.js', 'js/engine/measures.js', 'js/engine/scores.js',
  'js/engine/shapes.js', 'js/engine/prepare.js',
  'js/engine/build-compare.js', 'js/engine/build-parts.js', 'js/engine/build-xy.js',
  'config/reports.js', 'config/reports-overview.js', 'config/reports-industry.js', 'config/views.js', 'config/insight-rules.js',
  'js/reports/tier-grid.js', 'js/reports/quadrant.js', 'js/reports/details.js',
  'js/insights/engine.js', 'js/insights/rules-priorities.js', 'js/insights/rules-judgement.js', 'js/insights/rules-assumptions.js',
  'js/insights/rules-realism.js', 'js/insights/rules-exposure.js', 'js/insights/rules-capability.js',
  'js/panel/panel-chart.js', 'js/panel/panel-table.js', 'js/panel/panel-menus.js', 'js/panel/panel-export.js',
  'js/panel/panel-insights.js', 'js/panel/panel.js',
  'js/ui/shell.js', 'js/ui/compare-bar.js', 'js/ui/layers.js', 'js/ui/sources-panel.js', 'js/ui/system-screens.js',
  'js/ui/glossary.js', 'js/ui/explain.js', 'js/ui/tour.js',
  'js/ui/showme.js', 'js/ui/keys.js',
  'js/views/overview-cards.js', 'js/views/overview.js', 'js/views/industry.js', 'js/views/insights.js', 'js/views/guide.js',
  'js/ui/app.js'
];

const CSS = ['css/base.css', 'css/shell.css', 'css/layers.css', 'css/glossary.css', 'css/panel.css',
  'css/overview.css', 'css/industry.css', 'css/pages.css'];

// Test files, in run order. Each registers its cases with the harness.
const TESTS = [
  'tests/test-setup.js', 'tests/test-contracts.js', 'tests/test-core.js', 'tests/test-theme.js', 'tests/test-format.js',
  'tests/test-data.js', 'tests/test-check.js', 'tests/test-sources.js',
  'tests/test-combine.js', 'tests/test-measures.js', 'tests/test-shapes.js',
  'tests/test-shell.js', 'tests/test-content.js', 'tests/test-panel.js',
  'tests/test-overview.js', 'tests/test-industry.js', 'tests/test-insights.js', 'tests/test-rules.js', 'tests/test-ranking.js', 'tests/test-guardrails.js', 'tests/test-pages.js', 'tests/test-integrator.js',
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
      'tests/fixtures/sample-expected.js', 'tests/fixtures/broken-cases.js', 'tests/fixtures/insights-fixture.js'], org: [],
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

Object.keys(PAGES).forEach(function (name) {
  fs.writeFileSync(path.join(ROOT, name), page(name, PAGES[name]));
});

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
process.stdout.write('Wrote ' + Object.keys(PAGES).join(', ') + '\n');
