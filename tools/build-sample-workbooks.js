#!/usr/bin/env node
/*
 * File: tools/build-sample-workbooks.js
 * Purpose: Writes the seven fictional sample workbooks to dist/sample-workbooks/ (ignored), so the Import button can be tried on the sample edition (D149). Placeholder until the FIXTURES stream builds it (#584).
 * Provides: a command:  node tools/build-sample-workbooks.js [--out dir]
 * Depends on: Node 18+, vendor/xlsx.mini.min.js, tests/fixtures/workbook-write.js, config/import-map.js (through vm), data/sample-plan-data.js
 * Used by: maintainers and the owner
 * Owner: FIXTURES stream
 */
'use strict';

console.error('Not built yet (#584).');
process.exit(1);
