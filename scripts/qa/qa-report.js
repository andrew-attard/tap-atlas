#!/usr/bin/env node
/*
 * File: scripts/qa/qa-report.js
 * Purpose: Reads one headless run (the dumped page and the browser log) and prints its findings as plain lines:
 *          console errors and exceptions, text sizes, web requests, smoke steps. Exit 1 when the run has errors.
 * Provides: CLI `node scripts/qa/qa-report.js <console|text|offline|smoke|log> <label> <dump.html> [browser.log] [--json out]`
 * Depends on: Node 18+; the QA page's #qa-result block (scripts/qa/hooks.js)
 * Used by: scripts/qa/console-check.sh, text-size.sh, offline-check.sh, smoke.sh
 */
'use strict';

const fs = require('fs');

const [kind, label, dumpPath, logPath] = process.argv.slice(2);
const jsonAt = process.argv.indexOf('--json');
const jsonOut = jsonAt > 0 ? process.argv[jsonAt + 1] : null;
let failed = false;
const lines = [];
function say(level, msg) { lines.push(level + '  [' + label + '] ' + msg); if (level === 'ERROR') failed = true; }

function unescape(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function readResult() {
  const dom = fs.existsSync(dumpPath) ? fs.readFileSync(dumpPath, 'utf8') : '';
  const m = /<pre id="qa-result"[^>]*>([\s\S]*?)<\/pre>/.exec(dom);
  if (!m) return null;
  try { return JSON.parse(unescape(m[1])); } catch (e) { return null; }
}

// Console lines from the browser log that came from the page (file://), not from the browser itself.
// Chrome prints each one twice and gives no level, so "Uncaught" marks an exception and the rest are listed.
function logLines() {
  if (!logPath || !fs.existsSync(logPath)) return [];
  const out = [];
  const seen = new Set();
  fs.readFileSync(logPath, 'utf8').split(/\r?\n/).forEach((l) => {
    const m = /:CONSOLE[:(]\d+\)?\]\s+"([\s\S]*)",\s+source:\s+(\S+)\s+\((\d+)\)/.exec(l);
    if (!m || !/^file:/.test(m[2])) return;
    const key = m[1] + '|' + m[2] + '|' + m[3];
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ text: m[1], source: m[2].split('?')[0].split('/').slice(-2).join('/'), line: +m[3], uncaught: /^Uncaught/.test(m[1]) });
  });
  return out;
}

const res = readResult();
const log = logLines();

if (kind === 'log') {
  // Page opened directly (no QA hooks): only the browser log is available.
  log.forEach((c) => say(c.uncaught ? 'ERROR' : 'NOTE', 'console' + (c.uncaught ? ' exception' : '') + ': ' + c.text + ' (' + c.source + ':' + c.line + ')'));
  if (!log.length) say('PASS', 'no console messages from the page');
} else if (!res) {
  say('ERROR', 'no QA result in the page: it did not finish loading or a script failed before the checks ran');
  log.filter((c) => c.uncaught).forEach((c) => say('ERROR', 'exception: ' + c.text + ' (' + c.source + ':' + c.line + ')'));
} else {
  const r = res.render || {};
  if (kind === 'console') {
    (res.log || []).forEach((m) => {
      const err = m.level !== 'warn';
      say(err ? 'ERROR' : 'WARN', m.level + ' during ' + m.step + ': ' + m.text);
    });
    log.filter((c) => c.uncaught && !(res.log || []).some((m) => m.text.indexOf(c.text.replace(/^Uncaught (\w+: )?/, '')) >= 0))
      .forEach((c) => say('ERROR', 'exception (browser log): ' + c.text + ' (' + c.source + ':' + c.line + ')'));
    if (r.screen) say('ERROR', 'a full-page system screen is shown instead of the app');
    if (!r.screen && r.viewChars === 0) say('ERROR', 'the view area is empty');
    (r.notBuilt || []).forEach((t) => say('ERROR', 'on screen: ' + t));
    (r.missingText || []).forEach((t) => say('ERROR', 'missing wording key on screen: ' + t));
    if ((r.banners || []).length !== 1) say('ERROR', (r.banners || []).length + ' banners on screen (expected exactly 1)');
    if (r.scrollX > 0) say('ERROR', 'page scrolls sideways by ' + r.scrollX + ' px at ' + r.width + ' px wide');
    if (!failed) say('PASS', 'no console errors; ' + r.panels + ' panels, ' + r.charts + ' charts; "' + (r.sentence || '').trim() + '"');
  } else if (kind === 'text') {
    const t = res.text || {};
    (t.body || []).forEach((x) => say('ERROR', 'body text ' + x.px + ' px (min ' + x.min + '): "' + x.text + '" at ' + x.where));
    (t.small || []).forEach((x) => say('ERROR', 'text ' + x.px + ' px (min ' + x.min + '): "' + x.text + '" at ' + x.where));
    (t.charts || []).forEach((c) => {
      c.small.forEach((x) => say('ERROR', 'chart ' + c.report + ': ' + x.path + ' = ' + x.px));
      if (c.globalFontSize != null && c.globalFontSize < 13) say('ERROR', 'chart ' + c.report + ': default textStyle.fontSize ' + c.globalFontSize);
      if (c.globalFontSize == null) say('WARN', 'chart ' + c.report + ': no default textStyle.fontSize, so unset labels fall back to the ECharts default (12)');
    });
    const sizes = Object.keys(t.sizes || {}).map(Number).sort((a, b) => a - b);
    if (!failed) say('PASS', t.checked + ' text nodes, sizes ' + sizes.join(', ') + ' px; ' + (t.charts || []).length + ' charts');
  } else if (kind === 'offline') {
    const o = res.offline || {};
    (o.web || []).forEach((u) => say('ERROR', 'web request: ' + u));
    (o.nonFileRefs || []).forEach((u) => say('ERROR', 'script or stylesheet not loaded from the folder: ' + u));
    (res.log || []).filter((m) => m.level === 'resource').forEach((m) => say('ERROR', m.text));
    if (!o.echarts) say('ERROR', 'ECharts did not load');
    const archivo = (o.fonts || []).filter((f) => /archivo/i.test(f.family));
    if (!archivo.length) say('ERROR', 'no Archivo font face declared');
    archivo.filter((f) => f.status === 'error').forEach((f) => say('ERROR', 'Archivo ' + f.weight + ' failed to load'));
    if (!o.archivo) say('ERROR', 'Archivo is not available to the page');
    if (r.screen || !r.viewChars) say('ERROR', 'the app did not draw offline (' + (r.screen ? 'system screen' : 'empty view') + ')');
    (r.notBuilt || []).forEach((t) => say('ERROR', 'on screen offline: ' + t));
    if (!failed) say('PASS', 'no web request and no failed load; ECharts ' + o.echarts + '; Archivo ' +
      archivo.map((f) => f.weight + ':' + f.status).join(' ') + '; ' + r.panels + ' panels, ' + r.charts + ' charts');
  } else if (kind === 'smoke') {
    const steps = res.smoke || [];
    if (!steps.length) say('ERROR', 'the smoke test did not run');
    steps.filter((s) => !s.ok).forEach((s) => say('ERROR', s.name + ': ' + (s.note || '') + (s.errors ? ' | ' + s.errors.join(' | ') : '')));
    (res.log || []).filter((m) => m.level !== 'warn' && m.step === 'load').forEach((m) => say('ERROR', m.level + ' at load: ' + m.text));
    if (!failed) say('PASS', steps.length + ' steps, no exceptions');
    else say('INFO', steps.filter((s) => s.ok).length + ' of ' + steps.length + ' steps passed');
  }
}

process.stdout.write(lines.join('\n') + '\n');
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ label, kind, result: res, log }, null, 1));
process.exit(failed ? 1 : 0);
