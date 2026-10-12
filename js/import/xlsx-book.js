/*
 * File: js/import/xlsx-book.js
 * Purpose: Opens a workbook (an ArrayBuffer) through the vendored SheetJS library and gives sheets, cells and stored values;
 *          docs/ARCHITECTURE.md section 20. Only stored results are read (D5): a formula with no saved result is marked, never calculated.
 * Provides: TAP.xlsxBook (available, open, colIndex, colLetter, addr, split, serialToDate, iso)
 * Depends on: vendor/xlsx.mini.min.js, js/core/namespace.js
 * Used by: js/import/import-rows.js, js/import/import-grid.js, js/import/import-region.js
 * Owner: READ stream (#585)
 */
(function (TAP) {
  'use strict';

  // The error texts behind SheetJS error codes (the cells are read without formatted text)
  var ERRORS = { 0: '#NULL!', 7: '#DIV/0!', 15: '#VALUE!', 23: '#REF!', 29: '#NAME?', 36: '#NUM!', 42: '#N/A', 43: '#GETTING_DATA' };
  var DAY = 86400000;

  function available() { return typeof XLSX !== 'undefined'; }

  // 'E' -> 5, 'AA' -> 27
  function colIndex(letters) {
    var s = String(letters || '').toUpperCase(), n = 0;
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n;
  }
  // 5 -> 'E', 27 -> 'AA'
  function colLetter(n) {
    var s = '';
    while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  function addr(col, row) { return (typeof col === 'number' ? colLetter(col) : String(col).toUpperCase()) + row; }
  // 'E5' -> { col: 'E', row: 5 }, or null
  function split(a) {
    var m = /^([A-Za-z]{1,3})(\d+)$/.exec(String(a || '').trim());
    return m ? { col: m[1].toUpperCase(), row: +m[2] } : null;
  }
  // The 1900 date system: day 25569 is 1970-01-01 (UTC)
  function serialToDate(n) { return new Date(Math.round((n - 25569) * DAY)); }
  // An ISO date-time at seconds precision in UTC, or null for anything that is not a date
  function iso(date) {
    var d = date instanceof Date ? date : new Date(date);
    return isNaN(d.getTime()) ? null : d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function blankText(v) { return typeof v === 'string' && v.trim() === ''; }

  // One worksheet: its stored values by address
  function wrap(name, ws, loose) {
    var ref = ws['!ref'], end = ref ? split(String(ref).split(':').pop()) : null;
    function cell(a) { return ws[String(a).toUpperCase()] || null; }
    // null for a missing or blank cell or empty text; { error: true, found } for an error cell;
    // { error: true, formula: true } for a formula with no stored result; else the stored value
    function value(a) {
      var c = cell(a);
      if (!c) return null;
      if (c.v === undefined) return c.f ? { error: true, formula: true } : null;
      if (c.t === 'e') return { error: true, found: c.w || ERRORS[c.v] || String(c.v) };
      return blankText(c.v) ? null : c.v;
    }
    return { name: name, lastRow: end ? end.row : 0, loose: !!loose, cell: cell, value: value };
  }

  // sheets (optional): the only sheets to load, matched loosely against the workbook's names
  function open(arrayBuffer, fileName, sheets) {
    var opts = { type: 'array', cellDates: false, cellHTML: false, cellText: false }, wb;
    if (sheets && sheets.length) {
      var names = XLSX.read(arrayBuffer, { type: 'array', bookSheets: true }).SheetNames || [];
      var wanted = sheets.map(norm);
      var picked = names.filter(function (n) { return wanted.indexOf(norm(n)) >= 0; });
      wb = XLSX.read(arrayBuffer, Object.assign({ sheets: picked }, opts));
    } else {
      wb = XLSX.read(arrayBuffer, opts);
    }
    var all = wb.Sheets || {}, list = (wb.SheetNames || []).slice();
    var when = wb.Props && wb.Props.ModifiedDate;
    // Exact name first, else the one name that matches in any case or spacing (flagged), else null
    function sheet(name) {
      if (all[name]) return wrap(name, all[name], false);
      var want = norm(name);
      var hit = list.filter(function (n) { return all[n] && norm(n) === want; })[0];
      return hit ? wrap(hit, all[hit], true) : null;
    }
    return { fileName: fileName, sheetNames: list, modified: when ? iso(when) : null, sheet: sheet };
  }

  TAP.xlsxBook = { available: available, open: open, colIndex: colIndex, colLetter: colLetter, addr: addr, split: split,
    serialToDate: serialToDate, iso: iso };
})(window.TAP);
