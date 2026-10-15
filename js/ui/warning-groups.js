/*
 * File: js/ui/warning-groups.js
 * Purpose: One shape for the contract check's warnings and the import's notes, grouped by workbook and by kind in plain
 *          words (US-1.8.8, US-1.8.9, D161, D163). fromCheck and fromImport normalize both inputs to
 *          {region, kind, title, intro, where, cell, found, expected, tech}; groups and kindGroups arrange the items; row
 *          writes one item as text for the copied report. js/ui/warning-table.js draws the groups. Every word comes from
 *          content/text-data.js (check.plain, check.fields, check.groups) and content/text-import.js (importPanel.notePlain, importPanel.words).
 * Provides: TAP.warningGroups (fromCheck, fromImport, normalize, groups, kindGroups, row, line, title, label, fieldLabel, labelKey, render, renderKinds)
 * Depends on: js/core/content.js, js/core/data.js (the loaded plan's lookups, at call time), js/ui/warning-table.js (at call time)
 * Used by: js/ui/import-report.js, js/ui/sources-panel.js, js/import/import-write.js (all at call time)
 * Owner: NOTES2 stream (#612), after WARN (#605)
 *
 * A check warning is {path, region, item, field, kind, expected, found, vars, message}; an import note is
 * {message, sheet, cell, kind, item, found, expected}. The data path never reaches the screen: a row names the item in
 * words (ids become the lookups' names, motions and types words), the field in words and the value found.
 */
(function (TAP) {
  'use strict';

  function say(key, vars) { return TAP.content.text('check.' + key, vars); }
  function word(key, vars) { return TAP.content.text('importPanel.' + key, vars); }
  // TAP.content.text gives "[key]" for a key with no wording
  function known(key) { return TAP.content.text(key).charAt(0) !== '['; }
  function str(v) { return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); }
  function tidy(s) { return s.replace(/^[\s,:]+/, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim(); }
  // A template with {name} placeholders filled from vars; a placeholder without a value disappears
  function fill(tpl, vars) { return tidy(String(tpl).replace(/\{(\w+)\}/g, function (m, n) { return vars[n] == null ? '' : String(vars[n]); })); }

  // A field in words: the key as written, else without its index (supportPct for supportPct[0]), else the key itself
  function fieldLabel(field) {
    if (field == null || field === '') return '';
    var bare = String(field).replace(/\[\d+\]$/, '');
    if (known('check.fields.' + field)) return say('fields.' + field);
    return known('check.fields.' + bare) ? say('fields.' + bare) : String(field);
  }

  // The lookups at hand: the caller's (the import's plan), else the loaded plan's
  function lookupsOf(opts) {
    if (opts && opts.lookups) return opts.lookups;
    try { return (TAP.data && TAP.data.lookups()) || {}; } catch (e) { return {}; }
  }
  function nameIn(list, id) {
    var hit = (Array.isArray(list) ? list : []).filter(function (x) { return x && x.id === id; })[0];
    return hit && hit.name ? String(hit.name) : null;
  }
  // One id as a label: a motion or recap type in words, a channel's or segment's lookup name; anything else as it is
  function labelId(part, lookups) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(part) || part in Object.prototype) return part;
    if (known('importPanel.words.motions.' + part)) return word('words.motions.' + part);
    if (known('importPanel.words.types.' + part)) return word('words.types.' + part);
    return nameIn(lookups.channels, part) || nameIn(lookups.segments, part) ||
      (known('importPanel.words.channels.' + part) ? word('words.channels.' + part) : part);
  }
  // Every id in a comma-separated text as a label: "2027, direct, customerGrowth, arr" reads "2027, Direct, existing customers, ARR"
  function labelKey(text, lookups) {
    return str(text).split(', ').map(function (p) { return labelId(p, lookups); }).join(', ');
  }

  // The value found, in words: a blank, nothing, or the value as it is (text unquoted)
  function foundText(found) {
    if (found === null) return say('plain.fallback.blank');
    if (found === undefined) return say('found.nothing');
    return str(found);
  }
  // A JSON-quoted text in the check's figures reads unquoted ("core" is core)
  function unquote(v) { var s = str(v); return /^".*"$/.test(s) ? s.slice(1, -1) : s; }
  function hasPlain(kind) { return !!kind && known('check.plain.' + kind + '.title'); }

  // Check warnings as normalized items. The kind's plain wording gives the title, the intro and the where, found and expected
  // templates (defaults: the item and field, the value found, the check's figure when it carried one); without wording the
  // expected sentence is the title and the value found the one column.
  function fromCheck(warnings, opts) {
    var lookups = lookupsOf(opts);
    return (warnings || []).map(function (w) {
      var item = labelKey(w.item == null ? '' : w.item, lookups), field = fieldLabel(w.field), plain = hasPlain(w.kind);
      var vars = Object.assign({ value: '', segment: '', tier: '', key: '' }, w.vars || {});
      Object.keys(vars).forEach(function (k) { vars[k] = labelKey(unquote(vars[k]), lookups); });
      Object.assign(vars, { item: item, field: field, where: [item, field].filter(Boolean).join(', '), found: labelKey(foundText(w.found), lookups), expected: w.expected || '' });
      function part(name, fallback) {
        var key = 'check.plain.' + w.kind + '.' + name;
        return fill(plain && known(key) ? TAP.content.text(key) : fallback, vars);
      }
      return {
        region: w.region == null || w.region === '' ? null : String(w.region), kind: w.kind || null,
        title: plain ? say('plain.' + w.kind + '.title', vars) : (w.expected || w.message || ''),
        intro: plain ? say('plain.' + w.kind + '.intro', vars) : '',
        where: part('where', '{where}'), cell: '',
        found: part('found', '{found}'), expected: part('expected', vars.value ? '{value}' : ''),
        tech: w.message || ''
      };
    });
  }

  // Import notes as normalized items: the kind's title and intro from importPanel.notePlain, the note's own item, found and
  // expected as the columns, the sheet and cell as the address. A note without a kind (an older data file) takes its message
  // as the title, with the address alone.
  function fromImport(notes, regionName) {
    return (notes || []).map(function (n) {
      var plain = !!n.kind && known('importPanel.notePlain.' + n.kind + '.title');
      return {
        region: regionName == null ? null : String(regionName), kind: n.kind || null,
        title: plain ? word('notePlain.' + n.kind + '.title') : (n.message || ''),
        intro: plain ? word('notePlain.' + n.kind + '.intro') : '',
        where: str(n.item), cell: [n.sheet, n.cell].filter(Boolean).join(TAP.content.text('sources.sep')),
        found: str(n.found), expected: str(n.expected), tech: n.message || ''
      };
    });
  }

  // A list of raw check warnings (no tech) is normalized on the way in, so callers may pass either shape
  function normalize(list, opts) {
    list = list || [];
    return list.length && list[0] && list[0].tech === undefined ? fromCheck(list, opts) : list;
  }

  // A workbook group's label: "Region A · Region A plan.xlsx", the region alone when its file is unknown
  function label(region, files) {
    if (region == null || region === '') return say('groups.wholeFile');
    var file = files && Object.prototype.hasOwnProperty.call(files, region) ? files[region] : null;
    return file ? say('groups.bookFile', { region: region, file: file }) : String(region);
  }

  // Items by kind in first-seen order: [{kind, title, intro, items, cols, hasCell}]. Items without a kind group by title.
  // cols lists the table's columns: Where always, then Found and Expected when at least one item fills them (D164).
  function kindGroups(items) {
    var out = [], index = Object.create(null);
    (items || []).forEach(function (it) {
      var key = it.kind ? 'k:' + it.kind : 't:' + it.title, g = index[key];
      if (!g) { g = index[key] = { kind: it.kind || null, title: it.title, intro: it.intro || '', items: [], cols: ['where'], hasCell: false }; out.push(g); }
      g.items.push(it);
    });
    out.forEach(function (g) {
      ['found', 'expected'].forEach(function (c) { if (g.items.some(function (it) { return it[c]; })) g.cols.push(c); });
      g.hasCell = g.items.some(function (it) { return it.cell; });
    });
    return out;
  }

  // [{region, label, n, kinds}]: regions in the order the items come, the items about the whole file (no region) last
  function groups(items, files, opts) {
    var out = [], by = Object.create(null), whole = null;
    function group(region) { return { region: region, label: label(region, files), n: 0, items: [] }; }
    normalize(items, opts).forEach(function (it) {
      var region = it.region, g;
      if (region === null) g = whole = whole || group(null);
      else { g = by[region]; if (!g) { g = by[region] = group(region); out.push(g); } }
      g.items.push(it);
      g.n++;
    });
    if (whole) out.push(whole);
    out.forEach(function (g) { g.kinds = kindGroups(g.items); delete g.items; });
    return out;
  }

  // One item as a line of text for the copied report: where, found, expected and the address, whichever exist
  function row(it) {
    return [it.where, it.found ? say('groups.rowFound', { found: it.found }) : '', it.expected ? say('groups.rowExpected', { expected: it.expected }) : '', it.cell]
      .filter(Boolean).join(say('groups.rowSep'));
  }
  // A check warning as one line, and its group title
  function line(w, opts) { return row(fromCheck([w], opts)[0]); }
  function title(w, opts) { return fromCheck([w], opts)[0].title; }

  TAP.warningGroups = {
    fromCheck: fromCheck, fromImport: fromImport, normalize: normalize, groups: groups, kindGroups: kindGroups,
    row: row, line: line, title: title, label: label, fieldLabel: fieldLabel, labelKey: labelKey,
    render: function (items, opts) { return TAP.warningTable.render(items, opts); },
    renderKinds: function (items, opts) { return TAP.warningTable.renderKinds(items, opts); }
  };
})(window.TAP);
