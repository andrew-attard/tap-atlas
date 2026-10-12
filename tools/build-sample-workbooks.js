#!/usr/bin/env node
/*
 * File: tools/build-sample-workbooks.js
 * Purpose: Writes the seven fictional sample workbooks to dist/sample-workbooks/ (ignored), so the Import button can be tried
 *          on the sample edition (D149). Each workbook is the sample data written back through the sample mapping by the
 *          workbook writer fixture, so importing the folder gives the sample data again.
 * Provides: a command:  node tools/build-sample-workbooks.js [--out dir]   (run from the repository root, Node 18+)
 *           Prints one line per file written.
 * Depends on: Node 18+, vendor/xlsx.mini.min.js, tests/fixtures/workbook-write.js, config/import-map.js (through vm), data/sample-plan-data.js
 * Used by: maintainers and the owner
 * Owner: FIXTURES stream
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DEFAULT_OUT = path.join(ROOT, 'dist', 'sample-workbooks');

// The data file and the mapping are browser scripts that set window.*: run them in a sandbox with a window object.
function loadWindow(files) {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}

function main(argv) {
  const i = argv.indexOf('--out');
  const out = i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : DEFAULT_OUT;
  const win = loadWindow(['data/sample-plan-data.js', 'config/import-map.js']);
  if (!win.PLAN_DATA || !win.IMPORT_MAP) throw new Error('data/sample-plan-data.js or config/import-map.js did not set its global');
  const W = require('../tests/fixtures/workbook-write.js');
  fs.mkdirSync(out, { recursive: true });
  W.workbooks(win.PLAN_DATA, win.IMPORT_MAP).forEach((book) => {
    const file = path.join(out, book.fileName), buf = Buffer.from(W.toArrayBuffer(book.wb));
    fs.writeFileSync(file, buf);
    process.stdout.write('wrote    ' + path.relative(process.cwd(), file) + ' (' + book.wb.SheetNames.length + ' sheets, ' + buf.length + ' bytes)\n');
  });
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { main, loadWindow };
