/*
 * File: js/import/import-plan.js
 * Purpose: Reads every picked workbook and builds the plan (meta, lookups, regions in mapping order), then runs the app's contract check; docs/ARCHITECTURE.md section 20.
 * Provides: TAP.importPlan (run, build, finish, sheetsOf)
 * Depends on: js/import/import-map.js, js/import/xlsx-book.js, js/import/import-region.js, js/core/check.js, js/core/namespace.js,
 *             js/core/content.js (content/text-import.js wording)
 * Used by: js/ui/import-panel.js
 * Owner: PLAN stream (#586)
 *
 * run(files, map, opts) resolves {mapProblems, regions, missing, plan, check, usable}. The files are read one after
 * another, with a yield between them so the panel can show progress. finish(readings, map, now) is the synchronous
 * tail of run (duplicates, build, the contract check), so it can be tested on hand-built readings; build(readings,
 * map, now) is the plan alone. sheetsOf(map) lists every sheet name the mapping uses, for the workbook opener.
 */
(function (TAP) {
  'use strict';

  function say(key, vars) { return TAP.content.text('importPanel.check.' + key, vars); }
  function copy(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function nowIso() { return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); }
  function tick() { return new Promise(function (done) { setTimeout(done, 0); }); }
  function list(x) { return Array.isArray(x) ? x : Array.prototype.slice.call(x || []); }

  // Every sheet name the mapping names: the sections, the name cell and the extra sections
  function sheetsOf(map) {
    var out = [];
    function add(s) { if (typeof s === 'string' && out.indexOf(s) === -1) out.push(s); }
    Object.keys(map.sections || {}).forEach(function (k) { add(map.sections[k] && map.sections[k].sheet); });
    if (map.nameCell) add(map.nameCell.sheet);
    (map.extra || []).forEach(function (x) { add(x.sheet); });
    return out;
  }

  // The plan's meta, as the Data Contract lists it, from the mapping
  function meta(map, now) {
    var m = map.meta || {}, out = { schemaVersion: TAP.schemaVersion, generatedAt: now, templateVersion: m.templateVersion == null ? null : m.templateVersion,
      currency: m.currency, years: copy(m.years), isSample: !!m.isSample, sourceMap: TAP.importMap.sourceMap(map) };
    if (map.extra && map.extra.length) out.extraSections = TAP.importMap.extraSections(map);
    return out;
  }

  // Regions in mapping order, then the workbooks that matched no mapped region in file order
  function orderRegions(readings, map) {
    var ok = readings.filter(function (r) { return r.ok && r.region; }), mapped = {}, out = [];
    (map.regions || []).forEach(function (m) {
      mapped[m.id] = true;
      ok.forEach(function (r) { if (r.id === m.id) out.push(r.region); });
    });
    ok.forEach(function (r) { if (!mapped[r.id]) out.push(r.region); });
    return out;
  }

  function build(readings, map, now) {
    var regions = orderRegions(readings, map);
    if (!regions.length) return null;
    return { meta: meta(map, now), lookups: copy(map.lookups), regions: regions };
  }

  // Two workbooks for one region: neither can be used, both say why
  function duplicates(readings) {
    var byId = {};
    readings.forEach(function (r) { if (r.id != null) (byId[r.id] = byId[r.id] || []).push(r); });
    Object.keys(byId).forEach(function (id) {
      var group = byId[id];
      if (group.length < 2) return;
      var files = group.map(function (r) { return r.fileName; }).join(', ');
      group.forEach(function (r) {
        r.errors.push({ message: say('duplicateRegion', { name: r.name, files: files }), sheet: null, cell: null });
        r.ok = false;
        r.region = null;
      });
    });
  }

  function finish(readings, map, now, mapProblems) {
    duplicates(readings);
    var plan = build(readings, map, now), check = plan ? TAP.check.run(plan) : null;
    var seen = {};
    readings.forEach(function (r) { if (r.id != null) seen[r.id] = true; });
    var missing = (map.regions || []).filter(function (m) { return !seen[m.id]; }).map(function (m) { return { id: m.id, name: m.name }; });
    return { mapProblems: mapProblems || [], regions: readings, missing: missing, plan: plan, check: check, usable: !!plan && check.errors.length === 0 };
  }

  // A workbook that could not be opened at all is a reading with one error
  function failed(file, reason) {
    var name = file && file.name ? file.name : '';
    return { ok: false, id: null, name: name, fileName: name, region: null, notes: [], parts: {},
      errors: [{ message: say('unreadable', { file: name, reason: reason && reason.message ? reason.message : String(reason) }), sheet: null, cell: null }] };
  }

  function readOne(file, map, sheets, now) {
    return Promise.resolve().then(function () { return file.arrayBuffer(); }).then(function (buf) {
      var book = TAP.xlsxBook.open(buf, file.name, sheets), match = TAP.importMap.matchRegion(map, file.name);
      return TAP.importRegion.read(book, map, match, { now: now, lastModified: file.lastModified });
    }).then(null, function (e) { return failed(file, e); });
  }

  function run(files, map, opts) {
    opts = opts || {};
    var items = list(files), now = opts.now || nowIso(), problems = TAP.importMap.problems(map) || [];
    if (problems.length) return Promise.resolve({ mapProblems: problems, regions: [], missing: [], plan: null, check: null, usable: false });
    var nmap = TAP.importMap.normalize(map), sheets = sheetsOf(nmap), readings = [];
    var chain = Promise.resolve();
    items.forEach(function (file, i) {
      chain = chain.then(function () {
        if (typeof opts.onProgress === 'function') opts.onProgress(i, items.length, file.name);
        return readOne(file, nmap, sheets, now);
      }).then(function (reading) { readings.push(reading); return tick(); });
    });
    return chain.then(function () { return finish(readings, nmap, now, []); });
  }

  TAP.importPlan = { run: run, build: build, finish: finish, sheetsOf: sheetsOf };
})(window.TAP);
