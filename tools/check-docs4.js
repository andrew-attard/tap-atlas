#!/usr/bin/env node
/*
 * File: tools/check-docs4.js
 * Purpose: File checks for the Phase 4 handover documents (US-4.6.4) that the browser test page can't make: every
 *          field the Data Contract adds for the full template is named in the import brief (TPV-TC-762), and the
 *          real-data checklist and the Copilot prompts carry the checks Copilot runs after the import.
 * Provides: module.exports { CHECKS, contractP4Fields, briefWords }; CLI `node tools/check-docs4.js [--root dir]`
 * Depends on: Node 18+; reads docs/DATA-CONTRACT.md, docs/IMPORT-BRIEF.md, docs/REAL-DATA-CHECKLIST.md,
 *             docs/COPILOT-PROMPTS.md
 * Used by: tools/check-docs3.js (which runs these with its own checks, in scripts/verify.sh and CI)
 * Owner: PAGES4 stream
 */
'use strict';

const fs = require('fs');
const path = require('path');

function read(root, rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

// The words in `backticks` in a text, split at dots and other separators: `partners[].type` gives partners, type.
function briefWords(text) {
  const out = new Set();
  (text.match(/`[^`\n]+`/g) || []).forEach((span) => {
    span.slice(1, -1).split(/[^A-Za-z0-9_]+/).forEach((w) => { if (w) out.add(w); });
  });
  return out;
}

// The field names the contract adds for the full template: the first cell of every table row in the "full template"
// part and in the full template's lookups table, and of any other table row marked "(Phase 4)".
function contractP4Fields(text) {
  const lines = text.split(/\r?\n/), names = new Set();
  let inPart = false, inLookups = false;
  lines.forEach((line) => {
    if (/^#{2,4} /.test(line)) {
      inPart = /^### The full template \(Phase 4\)/.test(line) ? true : /^#{2,3} /.test(line) ? false : inPart;
      inLookups = false;
    }
    if (/^Lookups for the full template/.test(line)) inLookups = true;
    // The part's list of fields added to existing sections
    if (inPart && /^- /.test(line)) (line.match(/`([A-Za-z][A-Za-z0-9_]*)/g) || []).forEach((m) => names.add(m.slice(1)));
    if (!/^\|/.test(line) || /^\|\s*-/.test(line) || /^\| Field \|/.test(line)) return;
    if (!(inPart || inLookups || /Phase 4/.test(line))) return;
    const first = line.split('|')[1] || '';
    (first.match(/`([A-Za-z][A-Za-z0-9_]*)`/g) || []).forEach((m) => names.add(m.slice(1, -1)));
  });
  // The parts themselves are named by their headings, e.g. #### `revenue[]` and `booksValue[]`
  const part = (/^### The full template \(Phase 4\)[\s\S]*?(?=^### (?!The full))/m.exec(text) || [''])[0];
  (part.match(/^#### .*$/gm) || []).forEach((h) => (h.match(/`([A-Za-z]+)/g) || []).forEach((m) => names.add(m.slice(1))));
  return Array.from(names).sort();
}

function checkBriefFields(root) {
  const fields = contractP4Fields(read(root, 'docs/DATA-CONTRACT.md'));
  const words = briefWords(read(root, 'docs/IMPORT-BRIEF.md'));
  const problems = fields.filter((f) => !words.has(f)).map((f) => 'docs/IMPORT-BRIEF.md does not name the contract field `' + f + '`');
  if (fields.length < 20) problems.push('docs/DATA-CONTRACT.md: only ' + fields.length + ' full-template fields found; has the part moved?');
  return { problems, checked: fields.length };
}

// The checks Copilot runs after the import (US-4.6.4), in the checklist and in the full-template prompt
const AFTER_IMPORT = [/variance/i, /strategic plan/i, /revenue/i, /order intake/i, /books value/i, /customer value/i, /coverage/i];
function checkAfterImport(root) {
  const problems = [];
  ['docs/REAL-DATA-CHECKLIST.md', 'docs/COPILOT-PROMPTS.md'].forEach((rel) => {
    const text = read(root, rel);
    const part = (text.match(/^#+ .*full template[\s\S]*?(?=^## |(?![\s\S]))/gim) || []).join('\n');
    if (!part) { problems.push(rel + ': no section on the full template'); return; }
    AFTER_IMPORT.filter((re) => !re.test(part)).forEach((re) => problems.push(rel + ' (full template part): nothing matches ' + re));
  });
  return { problems, checked: AFTER_IMPORT.length * 2 };
}

const CHECKS = [
  { id: 'TPV-TC-762', label: 'every field the Data Contract adds for the full template is named in docs/IMPORT-BRIEF.md', run: checkBriefFields },
  { id: 'X-p4-docs-after-import', label: 'the checklist and the prompts have a full template part with the checks to run after the import', run: checkAfterImport }
];

module.exports = { CHECKS, contractP4Fields, briefWords };

if (require.main === module) {
  const i = process.argv.indexOf('--root');
  const root = i > 0 ? path.resolve(process.argv[i + 1]) : path.join(__dirname, '..');
  let failed = 0;
  CHECKS.forEach((c) => {
    const r = c.run(root);
    if (r.problems.length) failed++;
    process.stdout.write((r.problems.length ? 'FAIL  ' : 'PASS  ') + c.id + '  ' + c.label + ' (' + r.checked + ' checked)\n' +
      r.problems.map((p) => '      ' + p + '\n').join(''));
  });
  process.exit(failed ? 1 : 0);
}
