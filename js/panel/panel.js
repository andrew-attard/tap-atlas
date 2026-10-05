/*
 * File: js/panel/panel.js
 * Purpose: The report panel every chart sits in: title, takeaway, chart or table, legend, source line, controls.
 *          It builds the report for the current comparison and redraws on store changes. It keeps the chart
 *          type and measure for the session (the type is also remembered in the browser), and a few choices
 *          (builder options, the selected insight) only until the shared comparison changes. List reports and
 *          builder option clicks: ARCHITECTURE 17.4. A page may fix a panel's comparison with opts.cmp (#216);
 *          opts.local keeps a panel apart from the shared highlight (presentation steps, D74).
 * Provides: TAP.panel (create)
 * Depends on: js/panel/panel-build.js, panel-expand.js, js/panel/panel-*.js, js/engine/registry.js, scope.js, js/core/store.js, storage.js, content.js, format.js,
 *             sources.js, dom.js, icons.js, data.js, js/ui/layers.js, shell.js (label), js/theme.js (all at call time)
 * Used by: js/views/overview.js, js/views/industry.js, js/ui/view-head.js (mountPanel), and through it the Phase 2
 *          views: new-business.js, customers.js, partners.js, regions.js
 */
(function (TAP) {
  'use strict';
  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }
  var REDRAW = ['cmp', 'industry', 'hiddenInsights', 'highlight', 'scopeEpoch', 'expanded'];
  // What to build (validation, comparison, industry, highlight, the builder run) lives in js/panel/panel-build.js.
  function B() { return TAP.panelBuild; }
  function build(p, s) { return B().build(p, s); }
  function cmpOf(p, s) { return B().cmpOf(p, s); }
  function highlightOf(p, s) { return B().highlightOf(p, s); }
  function tabled(p, b) { return B().tabled(p, b); }

  // Choices that last only while the shared comparison stays the same (ARCHITECTURE section 5).
  function scoped() { return { opts: {}, highlight: null, selected: null, sentence: null, custom: null, editing: false }; }
  // Choices that last until "Reset all charts".
  function lasting(id) { return { type: remembered(id), measureId: null, sizeId: null, breakdown: firstBreakdown(id), table: false, sort: null }; }

  // A report may open with a breakdown already chosen (defaultBreakdown), if it is one the report offers.
  function firstBreakdown(id) {
    var d = TAP.reports.get(id), bd = d && d.defaultBreakdown;
    return bd && (d.breakdowns || []).indexOf(bd) >= 0 ? bd : null;
  }

  // The browser may block storage, or the storage module may fail: the panel then simply uses defaults.
  function remembered(id) { try { return TAP.storage.get('chart:' + id, null); } catch (e) { return null; } }
  function remember(id, type) { try { if (type) TAP.storage.set('chart:' + id, type); else TAP.storage.remove('chart:' + id); } catch (e) { /* defaults */ } }

  // One industry named: select it. A region named too: open its details (ARCHITECTURE section 10).
  function follow(target) {
    if (!target) return;
    var inds = target.industryIds || [];
    if (inds.length === 1) TAP.bus.emit('industry:select', { industryId: inds[0] });
    if ((target.regionIds || []).length) TAP.layers.openDetails(target);
  }

  // A click: a report with drill levels opens the next level for a target naming a region (17.6); otherwise a
  // list row opens its details only, and anything else follows the usual rule.
  function go(p, b, target, row) {
    if (b.def.drill && target && (p.drill.merge(target).regionIds || []).length && p.drill.push(target, b.def)) return;
    if (row) { if (target) TAP.layers.openDetails(target); } else follow(target);
  }
  function pick(p, b, d) { go(p, b, b.res.target ? b.res.target({ data: d }) : null, d.row); }

  // A [data-tap-opt] click in builder HTML (a list's sort headings, for example): a builder option, like its controls.
  function option(p) { return function (key, value) { p.st.opts[key] = value; render(p); }; }

  /* ---------- drawing ---------- */

  // Fills the body once it is on the page, so the chart measures its real size on the first draw.
  function body(p, b, s, box) {
    var C = TAP.panelChart, res = b.res;
    if (b.errors.length || !res) { C.dispose(p.cs); C.error(box, b.errors); return box; }
    if (res.empty) { C.dispose(p.cs); C.empty(box, res.missing); return box; }
    if (b.ctx.type === 'list' && res.html) {
      C.dispose(p.cs);
      TAP.panelTable.list(box, res, { label: TAP.shell.label(), onPick: function (d) { pick(p, b, d); }, onOpt: option(p) });
      return box;
    }
    if (tabled(p, b)) {
      // The chart stays alive off the page, so going back to it is instant
      if (p.cs.el && p.cs.el.parentNode) p.cs.el.parentNode.removeChild(p.cs.el);
      TAP.panelTable.render(box, res.table, { sort: p.st.sort, label: TAP.shell.label(), onSort: function (key) {
        var s0 = p.st.sort;
        p.set({ sort: { key: key, dir: s0 && s0.key === key ? -s0.dir : 1 } });
      }, focusIds: b.ctx.entities.filter(function (e) { return e.role === 'focus'; }).map(function (e) { return e.id; }) });
      return box;
    }
    if (res.html) {
      C.dispose(p.cs);
      C.html(box, res.html, function (d) { pick(p, b, d); }, option(p));
    } else if (res.option) {
      C.render(p.cs, box, res.option, { label: b.title, tall: /bubble|scatter/.test(b.ctx.type || ''),
        scale: s.expanded === p.id ? 1.3 : 1, height: res.height || null, onClick: function (prm) { go(p, b, res.target ? res.target(prm) : null); } });
      if (res.sized) remeasure(p, b.ctx.size);
    } else C.dispose(p.cs);
    return box;
  }

  // A builder that places labels for the chart's size (res.sized) is drawn again once that size is known or changes.
  function remeasure(p, used) {
    var el0 = p.cs.el, now = el0 && el0.clientWidth ? { w: el0.clientWidth, h: el0.clientHeight } : null;
    if (!now || (used && Math.abs(used.w - now.w) < 2 && Math.abs(used.h - now.h) < 2)) return;
    p.size = now;
    if (!p.measuring) { p.measuring = true; try { render(p); } finally { p.measuring = false; } }
  }

  function render(p) {
    if (!p.live) return;
    var s = TAP.store.get(), keep = TAP.panelChart.focusKey(p.root), I = TAP.panelInsights, a0 = document.activeElement;
    // A choice made in a menu closes it: focus then goes back to the button that opened it, not the page body
    var opener = a0 && a0.closest && p.root.contains(a0) && a0.closest('.tap-panel__pop') ? POP_BUTTON[p.shownPop] : null;
    p.seen = {};   // glossary terms are marked once per panel
    var b = build(p, s), info = I.get(cmpOf(p, s), p.drill.current()), ok = !b.errors.length && b.res && !b.res.empty;
    p.drewHl = !!(b.ctx && b.ctx.highlight);
    var big = s.expanded === p.id;
    if (p.root.isConnected) p.wasConnected = true;
    TAP.dom.clear(p.root);
    p.root.setAttribute('aria-label', b.title);
    p.root.className = 'tap-panel' + (big ? ' tap-panel--expanded' : '');

    var bodyBox = el('div', { class: 'tap-panel__body' });
    var takeaway = el('p', { class: 'tap-panel__takeaway', 'aria-live': 'polite', 'data-tour': 'takeaway' });
    TAP.dom.append(p.root, [
      big ? X().strip(p, s) : null,
      el('header', { class: 'tap-panel__head' }, [
        el('div', { class: 'tap-panel__titles' }, [
          p.drill.crumbs(),
          el('h2', { class: 'tap-panel__title', tabindex: '-1', html: TAP.content.mark(b.title, p.seen) }),
          b.errors.length || tabled(p, b) ? null : p.drill.hint(b.def),   // a table doesn't drill
          I.takeaway(takeaway, ok ? info.top : null, p.seen, I.handlers(p).onHide),
          p.st.custom ? TAP.panelMenus.customBadge(p, p.st.custom) : null
        ]),
        TAP.panelMenus.tools(p, b, info)
      ]),
      p.st.editing && b.types ? TAP.panelMenus.compareEditor(p) : null,
      b.def && !b.errors.length ? TAP.panelMenus.render(TAP.panelMenus.spec(p, b)) : null,
      ok ? I.strip(p, highlightOf(p, s)) : null,
      bodyBox,
      ok && !tabled(p, b) ? TAP.panelChart.legend(b.res) : null,
      ok ? TAP.panelChart.notes(b.res) : null,
      TAP.panelChart.source(b.def),
      p.statusEl
    ]);
    X().syncScroll();   // before the chart is drawn: locking the page scroll changes the width the chart gets
    body(p, b, s, bodyBox);
    // Focus follows the change: into the expanded chart's Close button, and back to More when it closes
    if (big !== !!p.big) keep = big ? '[data-action="collapse"]' : '[data-action="more"]';
    p.big = big;
    var back = (keep && TAP.dom.qs(keep, p.root)) || (opener && TAP.dom.qs('[data-action="' + opener + '"]', p.root));
    if (back && back.focus) back.focus();
    p.shownPop = p.st.pop;
  }
  var POP_BUTTON = { ins: 'insights', type: 'type', more: 'more' };

  // The expanded view (US-1.2.8) lives in js/panel/panel-expand.js.
  function X() { return TAP.panelExpand; }

  /* ---------- life cycle ---------- */

  function onStore(p, s, changed) {
    if (!p.live) return;
    if (p.wasConnected && !p.root.isConnected) { destroy(p); return; }   // removed without destroy()
    // A report with a default breakdown returns to it too (17.4); otherwise a chosen breakdown stays, as in Phase 1
    if (changed.indexOf('scopeEpoch') >= 0) p.drill.top({ quiet: true });   // a comparison or view change: top level (17.6)
    if (changed.indexOf('scopeEpoch') >= 0) Object.assign(p.st, scoped(), firstBreakdown(p.id) ? { breakdown: firstBreakdown(p.id) } : {});
    if (changed.indexOf('industry') >= 0) p.opts.industryId = null;
    var shown = !p.opts.local && changed.indexOf('highlight') >= 0 && s.highlight && s.highlight.reportId === p.id;   // "Show me" wins over the list
    if (shown) {
      p.drill.top({ quiet: true });
      Object.assign(p.st, { highlight: null, selected: null, sentence: null });
      delete p.st.opts.theme;   // a theme clicked earlier would hide the one the "Show me" points at (#72)
      if (B().ownMeasure(p.id, s.highlight.measureId)) p.st.measureId = s.highlight.measureId;   // the insight's measure (#223)
    }
    // A highlight for another chart changes nothing here, so only the chart it was or is for redraws
    var hl = highlightOf(p, s), mine = !!hl || !!p.drewHl;
    // Another chart opening or closing changes nothing here: only the chart whose own expanded state moved redraws
    var moved = (s.expanded === p.id) !== !!p.big;
    var only = changed.filter(function (k) { return REDRAW.indexOf(k) >= 0 && (k !== 'expanded' || moved); });
    if (only.length && !(only.length === 1 && only[0] === 'highlight' && !mine)) render(p);
  }

  function destroy(p) {
    if (!p.live) return;
    p.live = false;
    clearTimeout(p.sayTimer);
    p.off.forEach(function (fn) { fn(); });
    X().remove(p);
    p.drill.destroy();
    TAP.panelChart.dispose(p.cs);
    if (p.root.parentNode) p.root.parentNode.removeChild(p.root);
  }

  // Popovers close on an outside click or Esc. Esc is marked as handled so side panels leave it alone.
  function listen(p) {
    function down(e) {
      var box = TAP.dom.qs('.tap-panel__tools', p.root);
      if (p.st.pop && !(box && box.contains(e.target))) p.toggle(null);
    }
    function key(e) {
      if (e.key !== 'Escape' || e.defaultPrevented || !p.st.pop || !TAP.panelKeys.enabled) return;
      e.preventDefault();
      p.toggle(null);
    }
    function wkey(e) { X().keys(p, e); }
    // A chart whose labels were placed for its size is drawn again when the window changes its size
    function resized() { if (p.live && p.size) remeasure(p, p.size); }
    window.addEventListener('resize', resized);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    window.addEventListener('keydown', wkey);
    p.off.push(function () {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
      window.removeEventListener('keydown', wkey);
      window.removeEventListener('resize', resized);
    });
    p.off.push(TAP.store.on(function (s, changed) { onStore(p, s, changed); }));
    // "Reset all charts" (the Guide): every chart back to its default type and settings, nothing remembered
    p.off.push(TAP.bus.on('charts:reset', function () {
      p.drill.top({ quiet: true });
      [p.id].concat(TAP.panelDrill.levels(TAP.reports.get(p.id)).ids).forEach(function (id) { remember(id, null); });
      Object.assign(p.st, lasting(p.id), scoped(), { pop: null });
      render(p);
    }));
  }

  function create(host, reportId, opts) {
    reportId = TAP.panelDrill.reportOf(reportId);   // a definition object is registered first (18.3)
    var p = { id: reportId, opts: Object.assign({}, opts || {}), cs: {}, off: [], live: true };
    if (p.opts.initial && p.opts.initial.industryId) p.opts.industryId = p.opts.initial.industryId;   // a step's industry (#363)
    p.st = Object.assign({ pop: null }, lasting(reportId), scoped(), TAP.panelDrill.initial(p.opts.initial));
    p.render = function () { render(p); };
    p.cmp = function () { return cmpOf(p, TAP.store.get()); };
    p.toggle = function (name) { p.st.pop = name && p.st.pop !== name ? name : null; render(p); };
    p.set = function (patch) { Object.assign(p.st, patch); render(p); };
    p.setType = function (type) {
      var id = p.drill.current(), def = TAP.reports.get(id);   // each drill level remembers its own type
      remember(id, def && type === def.defaultType ? null : type);   // the default needs no memory
      p.set({ type: type, pop: null });
    };
    p.expand = function (on) { if (on) TAP.store.set({ expanded: reportId }); else X().collapse(); };
    p.fullscreen = function () { X().fullscreen(reportId); };
    p.statusEl = el('p', { class: 'tap-panel__status', role: 'status' });   // kept across redraws, so a message stays
    // A status message ("Image saved", "Added as step 3") clears itself after a few seconds
    p.say = function (msg) {
      clearTimeout(p.sayTimer);
      TAP.dom.text(p.statusEl, msg || '');
      if (msg) p.sayTimer = setTimeout(function () { TAP.dom.text(p.statusEl, ''); }, TAP.panel.statusMs);
    };
    p.image = function (how) {
      p.set({ pop: null });
      TAP.panelExport[how === 'save' ? 'saveImage' : 'copyImage'](p.root).then(p.say);
    };
    // tabindex -1: a click in the panel gives it focus, so Backspace can step up a drill level (17.6)
    p.root = el('section', { class: 'tap-panel', 'data-report': reportId, 'data-tour': 'panel', tabindex: '-1' });
    p.fresh = lasting;
    p.drill = TAP.panelDrill.create(p);
    host.appendChild(p.root);
    X().add(p);
    listen(p);
    try { render(p); } catch (e) { destroy(p); throw e; }   // a panel that can't draw stops listening (#367)
    return {
      id: reportId, el: p.root,
      refresh: p.render,
      highlight: function (target) { p.set({ highlight: target || null, selected: null, sentence: null }); },
      expand: p.expand,
      destroy: function () { destroy(p); }
    };
  }

  TAP.panel = { create: create, statusMs: 6000 };   // statusMs: how long a status message stays
})(window.TAP);
