/*
 * File: js/panel/panel-drill.js
 * Purpose: Multi-level drill-down inside one report panel: the level stack, the breadcrumb and stepping back up (US-2.7.1).
 *          A definition with drill: {next, label, rootLabel} opens `next` in the same panel when a mark naming a region
 *          is clicked; the clicked target becomes ctx.drill. Each level keeps its own chart type, table and options.
 *          While drilled the panel shows a back button, a level heading and a band, and a step never moves the
 *          panel's top on screen (D123).
 * Provides: TAP.panelDrill (create, levels, keys), TAP.panelKeys ({enabled}: one switch for the panel's own keys; typing(el))
 * Depends on: js/engine/registry.js, js/engine/scope.js, js/core/dom.js, js/core/data.js, js/core/content.js,
 *             js/core/format.js, js/core/store.js, js/engine/shapes.js (kit.lower) (all at call time)
 * Used by: js/panel/panel.js, which passes its panel object p (p.id, p.root, p.st, p.render, p.fresh, p.big)
 * Owner: PANEL2 stream (#75)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }
  var KEEP = ['type', 'measureId', 'sizeId', 'breakdown', 'table', 'sort'];   // choices each level keeps for itself

  // The panel's own keys (drill steps, Esc for popovers and the expanded chart) can be switched off together, so a
  // later presentation mode can own them (D70). Read at key time by panel.js and panel-expand.js too.
  TAP.panelKeys = { enabled: true, typing: typing };
  function keys(on) { if (typeof on === 'boolean') TAP.panelKeys.enabled = on; return TAP.panelKeys.enabled; }

  // Typing in a field or editable text: the keys belong to the text.
  function typing(a) { return !!a && (/^(input|select|textarea)$/i.test(a.tagName || '') || !!a.isContentEditable); }

  // The report ids a definition drills through, in order, and any problem: an unknown level or a loop.
  function levels(def) {
    var ids = [], errors = [], d = def || null;
    while (d) {
      if (ids.indexOf(d.id) >= 0) { errors.push(t('drillLoop', { id: d.id })); break; }
      ids.push(d.id);
      var next = d.drill && d.drill.next;
      if (!next) break;
      d = TAP.reports.get(next);
      if (!d) errors.push(t('drillUnknown', { id: next }));
    }
    return { ids: ids, errors: errors };
  }

  // What a level is called in the breadcrumb: the builder's own label, else the one industry, else the regions.
  function nameOf(target, def) {
    if (target.label) return String(target.label);
    var inds = target.industryIds || [], ind = inds.length === 1 ? TAP.data.industry(inds[0]) : null;
    if (ind) return ind.name;
    var regs = (target.regionIds || []).map(function (id) { var r = TAP.data.region(id); return r ? TAP.content.regionName(r) : id; });
    return regs.length ? TAP.format.list(regs) : def.drill.label || '';
  }

  function lower(s) { return TAP.shapes.kit.lower(s); }   // mid-sentence lower case, acronyms kept (one copy, in the kit)

  // The chart's own short name, the breadcrumb's first step (D123): drill.rootLabel, else its title.
  function rootName(def) { return (def && def.drill && def.drill.rootLabel) || (def && def.title) || ''; }

  // What was selected, in plain words for the level heading: the regions, then the industry, solution or the
  // builder's own label ("North America · Healthcare"). A label that holds the industry's name is the builder's
  // "industry, region" form, so the industry alone is used; any other label names a level below it (a sub-industry).
  function whatOf(target) {
    var regs = (target.regionIds || []).map(function (id) { var r = TAP.data.region(id); return r ? TAP.content.regionName(r) : id; });
    var inds = target.industryIds || [], ind = inds.length === 1 ? TAP.data.industry(inds[0]) : null, label = target.label ? String(target.label) : '';
    var subject = target.solution != null ? solutionName(target.solution) :
      ind && (!label || label.indexOf(ind.name) >= 0) ? ind.name : label;
    var where = regs.length > 3 ? t('drillRegions', { n: regs.length }) : TAP.format.list(regs);
    return where && subject ? t('drillWhat', { regions: where, subject: subject }) : where || subject;
  }
  function solutionName(id) {
    var s = ((TAP.data.lookups() || {}).solutions || []).filter(function (x) { return x.id === id; })[0];
    return s ? s.name : TAP.content.text('breakdown.solution.none');
  }

  // Just under the sticky bar (or the window's top on a short window, where the bar scrolls away).
  function barBottom() {
    var bar = document.querySelector('.tap-stack');
    return bar && getComputedStyle(bar).position === 'sticky' ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
  }
  function fixed(n) {
    for (; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true;
    return false;
  }

  /*
   * The drill state of panel p: {push(target, def, from), up(), top(opts), to(level, opts), path(), depth(), current(),
   * target(), merge(target), crumbs(), hint(def), back(), band(), heading(def, res), destroy()}. opts.quiet: change the
   * level without drawing (the caller draws).
   */
  function create(p) {
    var stack = [];   // the levels below the top: {reportId, target, label, saved (the level above's choices)}

    function save() {
      var o = { opts: Object.assign({}, p.st.opts) };
      KEEP.forEach(function (k) { o[k] = p.st[k]; });
      return o;
    }
    // A step draws the level, then puts focus where the step leads and the panel's top back where it was (D123):
    // the back button after a step down (from === true); after a step up the element that was selected (from, a
    // selector), else the title. Never the panel itself, whose ring would wrap the whole panel (D24).
    function draw(opts, from) {
      if (opts && opts.quiet) return;
      var top0 = p.root && p.root.isConnected && !p.big ? p.root.getBoundingClientRect().top : null;
      p.render();
      if (!p.root || !p.root.isConnected) return;
      var to = from === true ? TAP.dom.qs('.tap-panel__back', p.root) : null;
      if (!to && typeof from === 'string') { try { to = TAP.dom.qs('.tap-panel__body ' + from, p.root); } catch (e) { to = null; } }
      to = to || TAP.dom.qs('.tap-panel__title', p.root);
      if (to && to.focus) to.focus({ preventScroll: true });   // the scroll is ours, below (D110)
      if (top0 == null || p.big || fixed(p.root)) return;   // in a layer (presenting) the page scroll moves nothing
      // A top that was under the sticky bar or above the window comes to just under the bar; otherwise it stays put
      var bar = barBottom(), want = top0 < bar ? bar + 16 : top0, now = p.root.getBoundingClientRect().top;
      if (Math.abs(now - want) > 1) window.scrollBy(0, now - want);
    }

    // A deeper target keeps the regions and industries chosen above it when it names none itself.
    function merge(target) {
      var up = stack.length ? stack[stack.length - 1].target : null, out = Object.assign({}, target);
      ['regionIds', 'industryIds'].forEach(function (k) {
        if (!(out[k] || []).length && up && (up[k] || []).length) out[k] = up[k].slice();
      });
      return out;
    }

    // from: a selector for the element that was selected, so a step back up can return focus to it
    function push(target, def, from) {
      var next = def && def.drill && def.drill.next;
      if (!next || !TAP.reports.get(next)) return false;
      target = merge(target);
      stack.push({ reportId: next, target: target, label: nameOf(target, def), what: whatOf(target),
        level: lower(def.drill.label || TAP.reports.get(next).title), from: from || null, saved: save() });
      Object.assign(p.st, p.fresh ? p.fresh(next) : {}, { opts: {}, pop: null, highlight: null, selected: null, sentence: null });
      draw(null, true);
      return true;
    }

    // Back to a level (0 is the top), restoring the choices that level had.
    function to(level, opts) {
      if (level < 0 || level >= stack.length) return false;
      var from = stack[level].from;
      while (stack.length > level) Object.assign(p.st, stack.pop().saved, { pop: null, highlight: null, selected: null, sentence: null });
      draw(opts, from);
      return true;
    }

    function current() { return stack.length ? stack[stack.length - 1].reportId : p.id; }

    function path() {
      return [{ level: 0, reportId: p.id, label: rootName(TAP.reports.get(p.id)), target: null }].concat(stack.map(function (e, i) {
        return { level: i + 1, reportId: e.reportId, label: e.label, target: e.target };
      }));
    }

    // The breadcrumb ("Industries by region › Healthcare › Hospitals"), each earlier step a button, and how to go back up.
    // Null at the top level.
    function crumbs() {
      if (!stack.length) return null;
      var nav = el('nav', { class: 'tap-panel__crumbs', 'aria-label': t('drillPath') }), list = path();
      list.forEach(function (l, i) {
        if (i) nav.appendChild(el('span', { class: 'tap-panel__crumb-sep', 'aria-hidden': 'true' }, '›'));
        nav.appendChild(i === list.length - 1 ? el('span', { class: 'tap-panel__crumb', 'aria-current': 'location' }, l.label) :
          el('button', { type: 'button', class: 'tap-panel__crumb', 'data-drill-level': String(i), onclick: function () { to(i); } }, l.label));
      });
      if (keys()) nav.appendChild(el('span', { class: 'tap-panel__crumb-keys' }, t('drillKeys')));   // not while presenting owns them
      return nav;
    }

    // While drilled (D123): the back button to the level above, the band saying so and the level heading. Null at the top.
    function back() {
      if (!stack.length) return null;
      var up = stack.length > 1 ? stack[stack.length - 2].label : lower(rootName(TAP.reports.get(p.id)));
      return el('div', { class: 'tap-panel__backrow' }, el('button', { type: 'button', class: 'tap-btn tap-panel__back',
        'data-drill-back': String(stack.length - 1), onclick: function () { to(stack.length - 1); } }, t('drillBack', { level: up })));
    }
    function band() {
      if (!stack.length) return null;
      var total = Math.max(levels(TAP.reports.get(p.id)).ids.length, stack.length + 1);
      return el('p', { class: 'tap-panel__band' }, t('drillBand', { n: stack.length + 1, total: total }));
    }
    // "North America · Healthcare: the 3 new business rows behind it"; a level that is not a list names the level.
    function heading(def, res) {
      if (!stack.length) return null;
      var e = stack[stack.length - 1], rows = def && def.shape === 'list' && res && !res.empty && res.table ? res.table.rows.length : null;
      var kind = rows != null ? t('drillKinds.' + def.rows) : '';
      if (kind.charAt(0) === '[') kind = '';   // a list of rows with no word for its kind: "the 4 rows"
      var key = rows == null ? 'drillLevel' : rows === 1 ? 'drillRow' : 'drillRows';
      return el('p', { class: 'tap-panel__level' }, t(key, { what: e.what, n: rows, kind: kind, level: e.level }).replace(/\s+/g, ' '));
    }

    // Under the title of a level that drills further: a line saying a click steps down. Null otherwise.
    function hint(def) {
      var next = def && def.drill && TAP.reports.get(def.drill.next);
      var key = def.shape === 'list' ? 'drillHintList' : 'drillHint';
      return next ? el('p', { class: 'tap-panel__drill-hint' }, t(key, { level: lower(def.drill.label || next.title) })) : null;
    }

    // Backspace or Alt + Left goes up one level while the panel has focus (not while typing in a field).
    function onKey(e) {
      if (!keys() || !stack.length || e.defaultPrevented || e.ctrlKey || e.metaKey) return;
      var a = document.activeElement;
      if (!a || !p.root || !p.root.contains(a) || typing(a)) return;
      var back = (e.key === 'Backspace' && !e.altKey) || (e.key === 'ArrowLeft' && e.altKey);
      if (!back) return;
      e.preventDefault();
      to(stack.length - 1);
    }
    document.addEventListener('keydown', onKey);

    return {
      push: push,
      up: function (opts) { return to(stack.length - 1, opts); },
      top: function (opts) { return to(0, opts); },
      to: to,
      path: path,
      depth: function () { return stack.length; },
      current: current,
      target: function () { return stack.length ? stack[stack.length - 1].target : null; },
      merge: merge,
      crumbs: crumbs,
      hint: hint,
      back: back,
      band: band,
      heading: heading,
      destroy: function () { document.removeEventListener('keydown', onKey); stack = []; }
    };
  }

  // Phase 3 helpers for TAP.panel.create (ARCHITECTURE 18.3, 18.2): a custom chart arrives as a definition object
  // and is registered under its id; opts.initial {type, measureId, breakdown} sets a panel's starting choices.
  // Type 'table' is the table view (a switch, not a chart type); breakdown 'none' is no breakdown, over the
  // report's default one (#363).
  function reportOf(r) { if (r && typeof r === 'object') { window.TAP_REPORTS[r.id] = r; return r.id; } return r; }
  function initial(o) {
    var out = {};
    ['type', 'measureId', 'breakdown'].forEach(function (k) { if (o && o[k] != null) out[k] = o[k]; });
    if (out.type === 'table') { delete out.type; out.table = true; }
    if (out.breakdown === 'none') out.breakdown = null;
    return out;
  }

  TAP.panelDrill = { create: create, levels: levels, keys: keys, reportOf: reportOf, initial: initial };
})(window.TAP);
