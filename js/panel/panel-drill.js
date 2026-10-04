/*
 * File: js/panel/panel-drill.js
 * Purpose: Multi-level drill-down inside one report panel: the level stack, the breadcrumb and stepping back up (US-2.7.1).
 *          A definition with drill: {next, label} opens `next` in the same panel when a mark naming a region is
 *          clicked; the clicked target becomes ctx.drill. Each level keeps its own chart type, table and options.
 * Provides: TAP.panelDrill (create, levels, keys), TAP.panelKeys ({enabled}: one switch for the panel's own keys)
 * Depends on: js/engine/registry.js, js/engine/scope.js, js/core/dom.js, js/core/data.js, js/core/content.js,
 *             js/core/format.js, js/core/store.js (all at call time)
 * Used by: js/panel/panel.js, which passes its panel object p (p.id, p.root, p.st, p.render, p.fresh)
 * Owner: PANEL2 stream (#75)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }
  var KEEP = ['type', 'measureId', 'sizeId', 'breakdown', 'table', 'sort'];   // choices each level keeps for itself

  // The panel's own keys (drill steps, Esc for popovers and the expanded chart) can be switched off together, so a
  // later presentation mode can own them (D70). Read at key time by panel.js and panel-expand.js too.
  TAP.panelKeys = { enabled: true };
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

  function lower(s) { return !s ? '' : /^[A-Z][A-Z0-9]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); }

  /*
   * The drill state of panel p: {push(target, def), up(), top(opts), to(level, opts), path(), depth(), current(),
   * target(), merge(target), crumbs(), hint(def), destroy()}. opts.quiet: change the level without drawing (the caller
   * draws); opts.keyed: a keyboard step, so focus moves to the breadcrumb.
   */
  function create(p) {
    var stack = [];   // the levels below the top: {reportId, target, label, saved (the level above's choices)}

    function save() {
      var o = { opts: Object.assign({}, p.st.opts) };
      KEEP.forEach(function (k) { o[k] = p.st[k]; });
      return o;
    }
    function draw(opts) { if (!(opts && opts.quiet)) { p.render(); keepFocus(opts && opts.keyed); } }
    // Focus stays in the panel after a step, so Backspace keeps working; after a keyboard step it always moves to
    // the last breadcrumb button, else the title. Never the panel itself, whose ring would wrap the whole panel (D24).
    function keepFocus(keyed) {
      var a = document.activeElement;
      if (!p.root || !p.root.isConnected || (!keyed && a && a !== p.root && p.root.contains(a))) return;
      var btns = TAP.dom.qsa('.tap-panel__crumbs button', p.root), to = btns[btns.length - 1] || TAP.dom.qs('.tap-panel__title', p.root);
      if (to && to.focus) to.focus({ preventScroll: true });
    }

    // A deeper target keeps the regions and industries chosen above it when it names none itself.
    function merge(target) {
      var up = stack.length ? stack[stack.length - 1].target : null, out = Object.assign({}, target);
      ['regionIds', 'industryIds'].forEach(function (k) {
        if (!(out[k] || []).length && up && (up[k] || []).length) out[k] = up[k].slice();
      });
      return out;
    }

    function push(target, def) {
      var next = def && def.drill && def.drill.next;
      if (!next || !TAP.reports.get(next)) return false;
      target = merge(target);
      stack.push({ reportId: next, target: target, label: nameOf(target, def), saved: save() });
      Object.assign(p.st, p.fresh ? p.fresh(next) : {}, { opts: {}, pop: null, highlight: null, selected: null, sentence: null });
      draw();
      return true;
    }

    // Back to a level (0 is the top), restoring the choices that level had.
    function to(level, opts) {
      if (level < 0 || level >= stack.length) return false;
      while (stack.length > level) Object.assign(p.st, stack.pop().saved, { pop: null, highlight: null, selected: null, sentence: null });
      draw(opts);
      return true;
    }

    function current() { return stack.length ? stack[stack.length - 1].reportId : p.id; }

    function path() {
      var cmp = p.cmp ? p.cmp() : TAP.store.get().cmp;
      return [{ level: 0, reportId: p.id, label: TAP.scope.sentence(cmp), target: null }].concat(stack.map(function (e, i) {
        return { level: i + 1, reportId: e.reportId, label: e.label, target: e.target };
      }));
    }

    // The breadcrumb ("Showing all 7 regions side by side › Healthcare › Hospitals"), each earlier step a button, and how to go back up.
    // Null at the top level.
    function crumbs() {
      if (!stack.length) return null;
      var nav = el('nav', { class: 'tap-panel__crumbs', 'aria-label': t('drillPath') }), list = path();
      list.forEach(function (l, i) {
        if (i) nav.appendChild(el('span', { class: 'tap-panel__crumb-sep', 'aria-hidden': 'true' }, '›'));
        nav.appendChild(i === list.length - 1 ? el('span', { class: 'tap-panel__crumb', 'aria-current': 'location' }, l.label) :
          el('button', { type: 'button', class: 'tap-panel__crumb', 'data-drill-level': String(i), onclick: function () { to(i); } }, l.label));
      });
      nav.appendChild(el('span', { class: 'tap-panel__crumb-keys' }, t('drillKeys')));
      return nav;
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
      to(stack.length - 1, { keyed: true });
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
      destroy: function () { document.removeEventListener('keydown', onKey); stack = []; }
    };
  }

  TAP.panelDrill = { create: create, levels: levels, keys: keys };
})(window.TAP);
