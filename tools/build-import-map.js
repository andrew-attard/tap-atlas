#!/usr/bin/env node
/*
 * File: tools/build-import-map.js
 * Purpose: Builds the fictional sample's import mapping, config/import-map.js, from the sample generator's settings,
 *          so the mapping, the sample data and the sample workbooks always describe one layout (D150). The real
 *          template's mapping overwrites that file in the internal copy and is never committed.
 * Provides: a command:  node tools/build-import-map.js        (run from the repository root, Node 18+)
 *           Writes config/import-map.js (window.IMPORT_MAP). Add --check to compare instead of writing.
 * Depends on: tools/generate-sample-data.js (makePlan), tools/sample-settings.js, tools/sample-planted-p4.js
 * Used by: maintainers, scripts/verify.sh and CI (--check). The mapping's shape: docs/ARCHITECTURE.md section 20.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const S = require('./sample-settings');
const P = require('./sample-planted-p4');
const gen = require('./generate-sample-data');

const ROOT = path.join(__dirname, '..');
const OUT = 'config/import-map.js';
const CHANNELS = ['direct', 'partner', 'allianceA', 'allianceB'];
const TYPES = ['arr', 'services', 'swPerpetual', 'hardware'];

function axis(field, values, stride) {
  const a = { field: field, values: values };
  if (stride) a.stride = stride;
  return a;
}

function build() {
  const plan = gen.makePlan().plan, map = plan.meta.sourceMap, years = S.years;
  const channelAxis = { first: P.grid.firstCol, axes: [axis('channel', CHANNELS)] };
  const recapRows = function (first, types) {
    return { first: first, axes: [axis('year', years), axis('motion', ['newBusiness', 'customerGrowth']), axis('type', types)] };
  };
  return {
    meta: { templateVersion: S.templateVersion, currency: 'EUR', years: years, isSample: true, numberFormat: { decimal: '.', thousands: ',' } },
    regions: S.regions.map(function (r) { return { id: r.id, name: r.name, file: r.name + ' plan.xlsx', filterName: r.name }; }),
    nameCell: { sheet: map.marketCoverage.sheet, cell: 'C3' },
    lookups: plan.lookups,
    aliases: {},
    sections: {
      marketCoverage: { sheet: map.marketCoverage.sheet, headerRow: S.firstRow.marketCoverage - 1, headers: { industryId: 'Industry' },
        firstRow: S.firstRow.marketCoverage, lastRow: null, key: 'industryId', columns: map.marketCoverage.columns },
      newBusiness: { sheet: map.newBusiness.sheet, headerRow: S.firstRow.newBusiness - 1, headers: { industryId: 'Industry', subVertical: 'Sub-industry' },
        firstRow: S.firstRow.newBusiness, lastRow: null, key: 'industryId', columns: map.newBusiness.columns },
      customerGrowth: { sheet: map.customerGrowth.sheet, headerRow: S.firstRow.accounts - 1, headers: { name: 'Account' },
        firstRow: S.firstRow.accounts, lastRow: null, key: 'name', idPattern: '{region}-a{nn}', columns: map.customerGrowth.columns, cells: map.customerGrowth.cells },
      partners: { sheet: map.partners.sheet, headerRow: S.firstRow.partners - 1, headers: { name: 'Partner' },
        firstRow: S.firstRow.partners, lastRow: null, key: 'name', columns: map.partners.columns, cells: map.partners.cells },
      baseYear: { sheet: map.baseYear.sheet, firstRow: P.grid.baseYear, lastRow: null, key: 'category', columns: map.baseYear.columns, cells: map.baseYear.cells },
      recap: { sheet: map.recap.sheet, blank: 'skip', rows: recapRows(S.recapGrid.firstRow, TYPES.slice(0, 2)), cols: channelAxis },
      revenue: { sheet: map.revenue.sheet, filterCell: 'C2', blank: 'skip', rows: recapRows(P.grid.revenue, TYPES.slice(0, 2)), cols: channelAxis },
      booksValue: { sheet: map.booksValue.sheet, filterCell: 'C2', blank: 'skip', rows: recapRows(P.grid.booksValue, TYPES), cols: channelAxis },
      strategicPlan: { sheet: map.strategicPlan.sheet, filterCell: 'C2', blank: 'null',
        rows: { first: P.grid.strategicPlan, axes: [axis('type', TYPES)] },
        cols: { first: P.grid.firstCol, axes: [axis('year', years)] },
        variance: { cols: { first: String.fromCharCode(P.grid.firstCol.charCodeAt(0) + 4), axes: [axis('year', years)] } } },
      routes: { sheet: map.routes.sheet, filterCell: 'C2', blank: 'skip',
        rows: { first: P.grid.routes, axes: [axis('route', plan.lookups.routes.map(function (r) { return r.id; }), 8),
          axis('solution', [null].concat(plan.lookups.solutions.map(function (s) { return s.id; })))] },
        cols: { first: P.grid.firstCol, axes: [axis('year', years), axis('type', TYPES)] } }
    },
    extra: []
  };
}

// ---- writing: compact, one lookup entry, one column map or one axis per line ----

const WIDTH = 160;
function quote(str) { return "'" + str.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
function key(k) { return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : quote(k); }
// One line, JavaScript style: unquoted keys, single-quoted strings.
function one(v) {
  if (v === null || typeof v !== 'object') return typeof v === 'string' ? quote(v) : String(v);
  if (Array.isArray(v)) return '[' + v.map(one).join(', ') + ']';
  const keys = Object.keys(v);
  return keys.length ? '{ ' + keys.map(function (k) { return key(k) + ': ' + one(v[k]); }).join(', ') + ' }' : '{}';
}
// Many lines when the one-line form is too wide: a list's items packed onto lines, an object one key per line.
function write(v, indent) {
  const line = one(v);
  if (line.length + indent <= WIDTH || v === null || typeof v !== 'object') return line;
  const pad = ' '.repeat(indent), inner = ' '.repeat(indent + 2);
  if (Array.isArray(v)) {
    const lines = [];
    v.forEach(function (x) {
      const item = write(x, indent + 2), last = lines.length - 1;
      if (lines.length && item.indexOf('\n') < 0 && lines[last].indexOf('\n') < 0 && (lines[last] + ', ' + item).length + indent + 2 <= WIDTH) lines[last] += ', ' + item;
      else lines.push(item);
    });
    return '[\n' + lines.map(function (l) { return inner + l; }).join(',\n') + '\n' + pad + ']';
  }
  return '{\n' + Object.keys(v).map(function (k) { return inner + key(k) + ': ' + write(v[k], indent + 2); }).join(',\n') + '\n' + pad + '}';
}

function text(map) {
  return [
    '/*',
    ' * File: config/import-map.js',
    " * Purpose: The import mapping: where every field of the Data Contract sits in the planning workbooks (sheets, rows, columns,",
    " *          cells, grid axes), the region list, the lookups and the other spellings the import accepts (D147). This copy",
    " *          describes the fictional sample template and is written by tools/build-import-map.js: never edit it here. The",
    " *          organization's approved tool fills the real template's mapping in the internal copy, overwriting this file.",
    ' * Provides: window.IMPORT_MAP',
    ' * Depends on: nothing (data only). Shape: docs/ARCHITECTURE.md section 20',
    ' * Used by: js/import/import-map.js',
    ' */',
    'window.IMPORT_MAP = ' + write(map, 0) + ';',
    ''
  ].join('\n');
}

function main() {
  const out = text(build()), file = path.join(ROOT, OUT);
  if (process.argv.indexOf('--check') !== -1) {
    const same = fs.existsSync(file) && fs.readFileSync(file, 'utf8') === out;
    process.stdout.write((same ? 'same     ' : 'DIFFERS  ') + OUT + '\n');
    if (!same) process.exit(1);
  } else {
    fs.writeFileSync(file, out);
    process.stdout.write('wrote    ' + OUT + ' (' + out.split('\n').length + ' lines)\n');
  }
}

if (require.main === module) main();
module.exports = { build: build, text: text };
